import { styles } from './styles.js'

// EchoChamber's source prompts are bundled at build time. No filesystem access
// or access to character, persona, or world-book APIs is used at runtime.
const defaults = { enabled: true, auto: false, style: 'discordtwitch', count: 5, depth: 6, maxTokens: 700 }
const userSettings = new Map()
const activeChats = new Map()
const busyUsers = new Set()
const cache = new Map()

function send(payload, userId) { spindle.sendToFrontend(payload, userId) }
function safeChatId(value) { return typeof value === 'string' && /^[\w-]{1,100}$/.test(value) ? value : null }
function cachePath(chatId) { return `chats/${chatId}.json` }
function clamp(value, fallback, min, max) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback
}
function cleanSettings(value) {
  return {
    enabled: value?.enabled !== false,
    auto: value?.auto === true,
    style: Object.hasOwn(styles, value?.style) ? value.style : defaults.style,
    count: clamp(value?.count, defaults.count, 1, 20),
    depth: clamp(value?.depth, defaults.depth, 1, 30),
    maxTokens: clamp(value?.maxTokens, defaults.maxTokens, 100, 3000),
  }
}
async function loadChat(chatId, userId) {
  const key = `${userId}:${chatId}`
  if (cache.has(key)) return cache.get(key)
  const saved = await spindle.userStorage.getJson(cachePath(chatId), { fallback: [], userId })
  const items = Array.isArray(saved) ? saved.slice(-200) : []
  cache.set(key, items)
  return items
}
async function saveChat(chatId, items, userId) {
  const trimmed = items.slice(-200)
  cache.set(`${userId}:${chatId}`, trimmed)
  await spindle.userStorage.setJson(cachePath(chatId), trimmed, { userId })
}
function parseReactions(content, limit) {
  return String(content || '').split(/\r?\n/).map(line => line.replace(/^\s*[-*\d.)]+\s*/, '').trim())
    .filter(Boolean).map(line => {
      const match = line.match(/^([^:]{1,48}):\s*(.{1,1000})$/)
      return match ? { name: match[1].trim(), text: match[2].trim() } : null
    }).filter(Boolean).slice(0, limit)
}
async function generate(chatId, userId, replyTo = null) {
  const settings = await settingsFor(userId)
  if (busyUsers.has(userId) || !settings.enabled) return
  if (!spindle.permissions.has('generation') || !spindle.permissions.has('chat_mutation')) {
    send({ type: 'error', message: 'Grant Generation and Chat Mutation permissions to EchoChamber.' }, userId)
    return
  }
  busyUsers.add(userId)
  send({ type: 'busy', value: true, chatId }, userId)
  try {
    const all = await spindle.chat.getMessages(chatId)
    const recent = all.filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-settings.depth).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 6000)}`).join('\n\n')
    if (!recent) throw new Error('This chat has no messages yet.')
    const prior = await loadChat(chatId, userId)
    const prompt = replyTo
      ? `Recent audience reactions:\n${prior.slice(-12).map(x => `${x.name}: ${x.text}`).join('\n')}\n\nThe streamer ${replyTo.name} says: ${replyTo.text}\nWrite ${Math.min(settings.count, 8)} audience replies. Address the streamer or other audience members naturally.`
      : `Write ${settings.count} brief, varied audience reactions to the latest events. React to the most recent message, with occasional interaction between audience members.`
    const result = await spindle.generate.quiet({
      userId,
      messages: [
        { role: 'system', content: `${styles[settings.style]}\n\nOutput only lines in this exact format: username: message. Do not include numbering, headings, or chat transcript text.` },
        { role: 'user', content: `Conversation:\n${recent}\n\n${prompt}` },
      ],
      parameters: { max_tokens: settings.maxTokens },
    })
    const reactions = parseReactions(result.content, settings.count)
    if (!reactions.length) throw new Error('The model did not return any “username: message” lines. Try regenerating.')
    if (replyTo) reactions.unshift({ name: replyTo.name, text: replyTo.text, mine: true })
    const next = [...prior, ...reactions]
    await saveChat(chatId, next, userId)
    send({ type: 'reactions', chatId, items: next }, userId)
  } catch (error) {
    send({ type: 'error', message: String(error?.message || error) }, userId)
  } finally {
    busyUsers.delete(userId)
    send({ type: 'busy', value: false, chatId }, userId)
  }
}
async function hydrate(userId) {
  const settings = await settingsFor(userId)
  const active = spindle.permissions.has('chats') ? await spindle.chats.getActive(userId) : null
  const chatId = safeChatId(active?.id)
  activeChats.set(userId, chatId)
  send({ type: 'state', chatId, settings, styles: Object.keys(styles), items: chatId ? await loadChat(chatId, userId) : [] }, userId)
}
async function settingsFor(userId) {
  if (userSettings.has(userId)) return userSettings.get(userId)
  const settings = cleanSettings(await spindle.userStorage.getJson('settings.json', { fallback: defaults, userId }))
  userSettings.set(userId, settings)
  return settings
}

spindle.onFrontendMessage(async (payload, userId) => {
  try {
    if (payload?.type === 'hydrate') return await hydrate(userId)
    if (payload?.type === 'settings') {
      const settings = cleanSettings(payload.settings)
      userSettings.set(userId, settings)
      await spindle.userStorage.setJson('settings.json', settings, { userId })
      return send({ type: 'settings', settings }, userId)
    }
    if (payload?.type === 'chat') {
      const chatId = safeChatId(payload.chatId)
      activeChats.set(userId, chatId)
      return send({ type: 'chat', chatId, items: chatId ? await loadChat(chatId, userId) : [] }, userId)
    }
    if (payload?.type === 'generate' || payload?.type === 'reply') {
      const chatId = activeChats.get(userId)
      if (!chatId) return send({ type: 'error', message: 'Open a chat first.' }, userId)
      const reply = payload.type === 'reply' && typeof payload.text === 'string'
        ? { name: 'You', text: payload.text.trim().slice(0, 1000) } : null
      if (payload.type === 'reply' && !reply?.text) return
      return await generate(chatId, userId, reply)
    }
    if (payload?.type === 'clear' && activeChats.get(userId)) {
      const chatId = activeChats.get(userId)
      await saveChat(chatId, [], userId)
      return send({ type: 'reactions', chatId, items: [] }, userId)
    }
  } catch (error) { send({ type: 'error', message: String(error?.message || error) }, userId) }
})

spindle.log.info('EchoChamber for Lumiverse ready')
