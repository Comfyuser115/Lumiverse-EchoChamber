import { styles } from './styles.js'

// EchoChamber's source prompts are bundled at build time. Optional context
// APIs are queried only when the user enables their respective settings.
const defaults = {
  enabled: true, auto: false, style: 'discordtwitch', count: 5, depth: 4, maxTokens: 700,
  source: 'lumiverse', connectionId: '', ollamaUrl: 'http://localhost:11434', ollamaModel: '',
  openaiUrl: 'http://localhost:1234/v1', openaiModel: 'local-model', position: 'bottom',
  livestream: false, livestreamBatchSize: 20, livestreamMinWait: 5, livestreamMaxWait: 60,
  customStyles: {}, styleOverrides: {}, deletedStyles: [], styleOrder: [],
  panelWidth: 350, panelHeight: 250, panelOpacity: 85, fontSize: 15,
  collapsed: false, messageOrder: 'oldest-first', livestreamAutoScroll: true,
  livestreamMode: 'manual', markdown: true, chatUsername: 'Streamer (You)',
  includePersona: false, includeAuthorsNote: false, includeCharacterDescription: false,
  includeSummary: false, includeWorldInfo: false, wiBudget: 0,
  includePastEchoChambers: false,
  paused: false, autoUpdateOnMessages: true, includeUserInput: false,
  chatEnabled: true, chatAvatarColor: '#3b82f6', chatReplyCount: 3,
  floatX: 100, floatY: 100,
}
const userSettings = new Map()
const activeChats = new Map()
const busyUsers = new Set()
const generationJobs = new Map()
const cache = new Map()
const API_KEY_NAME = 'echochamber-api-key'

function send(payload, userId) { spindle.sendToFrontend(payload, userId) }
function safeChatId(value) { return typeof value === 'string' && /^[\w-]{1,100}$/.test(value) ? value : null }
function cachePath(chatId) { return `chats/${chatId}.json` }
function clamp(value, fallback, min, max) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback
}
function str(value, fallback, limit) { return typeof value === 'string' ? value.trim().slice(0, limit) : fallback }
function choice(value, allowed, fallback) { return allowed.includes(value) ? value : fallback }
function cleanStyles(value, builtinsAllowed = false) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const output = Object.create(null)
  for (const [id, entry] of Object.entries(value).slice(0, 100)) {
    if (!/^[\w-]{1,64}$/.test(id)) continue
    if (builtinsAllowed && !Object.hasOwn(styles, id)) continue
    if (builtinsAllowed) {
      const prompt = str(entry, '', 30000)
      if (prompt) output[id] = prompt
    } else if (entry && typeof entry === 'object') {
      const name = str(entry.name, id, 100)
      const prompt = str(entry.prompt, '', 30000)
      if (name && prompt) output[id] = { name, prompt }
    }
  }
  return output
}
function cleanSettings(value) {
  const customStyles = cleanStyles(value?.customStyles)
  const styleOverrides = cleanStyles(value?.styleOverrides, true)
  const allStyles = new Set([...Object.keys(styles), ...Object.keys(customStyles)])
  return {
    enabled: value?.enabled !== false,
    auto: value?.auto === true,
    style: allStyles.has(value?.style) ? value.style : defaults.style,
    count: clamp(value?.count, defaults.count, 1, 30),
    depth: clamp(value?.depth, defaults.depth, 1, 50),
    maxTokens: clamp(value?.maxTokens, defaults.maxTokens, 100, 8000),
    source: choice(value?.source, ['lumiverse', 'ollama', 'openai'], defaults.source),
    connectionId: str(value?.connectionId, '', 100),
    ollamaUrl: str(value?.ollamaUrl, defaults.ollamaUrl, 500),
    ollamaModel: str(value?.ollamaModel, '', 200),
    openaiUrl: str(value?.openaiUrl, defaults.openaiUrl, 500),
    openaiModel: str(value?.openaiModel, '', 200),
    position: choice(value?.position, ['drawer', 'top', 'bottom', 'left', 'right', 'float'], defaults.position),
    livestream: value?.livestream === true,
    livestreamBatchSize: clamp(value?.livestreamBatchSize, defaults.livestreamBatchSize, 1, 20),
    livestreamMinWait: clamp(value?.livestreamMinWait, defaults.livestreamMinWait, 0, 120),
    livestreamMaxWait: clamp(value?.livestreamMaxWait, defaults.livestreamMaxWait, 0, 120),
    customStyles, styleOverrides,
    deletedStyles: Array.isArray(value?.deletedStyles) ? [...new Set(value.deletedStyles.filter(id => allStyles.has(id)))].slice(0, 100) : [],
    styleOrder: Array.isArray(value?.styleOrder) ? [...new Set(value.styleOrder.filter(id => allStyles.has(id)))].slice(0, 100) : [],
    panelWidth: clamp(value?.panelWidth, defaults.panelWidth, 220, 1200),
    panelHeight: clamp(value?.panelHeight, defaults.panelHeight, 180, 1000),
    panelOpacity: clamp(value?.panelOpacity, defaults.panelOpacity, 20, 100),
    fontSize: clamp(value?.fontSize, defaults.fontSize, 10, 28),
    collapsed: value?.collapsed === true,
    messageOrder: choice(value?.messageOrder, ['oldest', 'newest', 'oldest-first', 'newest-first', 'ascending', 'descending'], defaults.messageOrder),
    livestreamAutoScroll: value?.livestreamAutoScroll !== false,
    livestreamMode: choice(value?.livestreamMode, ['manual', 'onMessage', 'onComplete'], defaults.livestreamMode),
    markdown: value?.markdown !== false,
    chatUsername: str(value?.chatUsername, defaults.chatUsername, 80),
    includePersona: value?.includePersona === true,
    includeAuthorsNote: value?.includeAuthorsNote === true,
    includeCharacterDescription: value?.includeCharacterDescription === true,
    includeSummary: value?.includeSummary === true,
    includeWorldInfo: value?.includeWorldInfo === true,
    wiBudget: clamp(value?.wiBudget, defaults.wiBudget, 0, 16000),
    includePastEchoChambers: value?.includePastEchoChambers === true,
    paused: value?.paused === true,
    autoUpdateOnMessages: value?.autoUpdateOnMessages !== false,
    includeUserInput: value?.includeUserInput === true,
    chatEnabled: value?.chatEnabled !== false,
    chatAvatarColor: /^#[0-9a-fA-F]{6}$/.test(value?.chatAvatarColor) ? value.chatAvatarColor : defaults.chatAvatarColor,
    chatReplyCount: clamp(value?.chatReplyCount, defaults.chatReplyCount, 1, 12),
    floatX: clamp(value?.floatX, defaults.floatX, 0, 10000),
    floatY: clamp(value?.floatY, defaults.floatY, 0, 10000),
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
  const source = String(content || '')
    .replace(/<(thinking|think|thought|reasoning|reason)>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?discordchat>/gi, '').trim()
  if (!source) return []
  if (/^[\[{]/.test(source)) {
    try {
      const parsed = JSON.parse(source)
      const rows = Array.isArray(parsed) ? parsed :
        parsed.reactions || parsed.messages || parsed.comments || parsed.chat
      if (Array.isArray(rows)) {
        const structured = rows.map(row => {
          if (!row || typeof row !== 'object') return null
          const name = limited(row.username || row.name || row.user || row.speaker, 80)
          const text = limited(row.message || row.text || row.content, 2000)
          return name && text ? { name, text } : null
        }).filter(Boolean).slice(0, limit)
        if (structured.length) return structured
      }
      if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
        const name = limited(parsed.username || parsed.name || parsed.user || parsed.speaker, 80)
        const text = limited(parsed.message || parsed.text, 2000)
        if (name && text) return [{ name, text }]
      }
      const nested = parsed?.choices?.[0]?.message?.content || parsed?.output || parsed?.content
      if (typeof nested === 'string' && nested !== source) return parseReactions(nested, limit)
      return []
    } catch {
      if (/^[\[{]\s*["{]/.test(source)) return []
    }
  }
  const output = []
  const lines = source.split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.trim().replace(/^```[^`]*$/, '').trim()
    if (!line || /^[-_.…]{3,}$/.test(line) || /^\s*(?:here (?:are|is)|reactions?:|comments?:|chat:)/i.test(line)) continue
    const cleaned = line.replace(/^(?:[-*]\s+|\d+[.)]\s+)/, '')
    const match = cleaned.match(/^(.{1,80}?):\s*(.+)$/) ||
      cleaned.match(/^\[([^\]]{1,80})\]\s+(.+)$/) ||
      cleaned.match(/^([^–—-]{1,80}?)\s+[–—-]\s+(.+)$/)
    if (match) {
      const name = match[1].trim().replace(/^[*_`"']+|[*_`"']+$/g, '')
      const text = match[2].trim()
      if (name && text && !/^[\[{"']/.test(name)) output.push({ name, text: text.slice(0, 2000) })
    } else if (output.length && !/^[\[{]/.test(cleaned)) {
      const previous = output.at(-1)
      previous.text = `${previous.text} ${cleaned}`.slice(0, 2000)
    }
    if (output.length >= limit) break
  }
  return output
}
function endpoint(base, path) {
  let url
  try { url = new URL(base) } catch { throw new Error('Enter a valid provider URL.') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Provider URL must be an http(s) URL without credentials, query, or fragment.')
  }
  url.pathname = `${url.pathname.replace(/\/$/, '').replace(/\/v1$/, '')}${path}`
  return url.toString()
}
async function providerPost(url, body, apiKey) {
  if (!spindle.permissions.has('cors_proxy')) throw new Error('Grant CORS Proxy permission for external model backends.')
  const headers = { 'content-type': 'application/json' }
  if (apiKey) headers.authorization = `Bearer ${apiKey}`
  const response = await spindle.cors(url, { method: 'POST', headers, body: JSON.stringify(body) })
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Model backend returned HTTP ${response.status}. Check the URL, model, and API key.`)
  }
  try { return JSON.parse(response.body) } catch { throw new Error('Model backend returned invalid JSON.') }
}
async function modelText(messages, settings, userId, signal) {
  if (settings.source === 'lumiverse') {
    if (!spindle.permissions.has('generation')) throw new Error('Grant Generation permission to EchoChamber.')
    const input = { userId, messages, parameters: { max_tokens: settings.maxTokens }, reasoning: { source: 'off' }, signal }
    if (settings.connectionId) {
      const profile = await spindle.connections.get(settings.connectionId, userId)
      if (!profile) throw new Error('Selected Lumiverse connection profile was not found.')
      input.connection_id = settings.connectionId
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await spindle.generate.quiet(input)
        return result?.content || ''
      } catch (error) {
        const emptyProviderResponse = /OpenRouter generate failed \(502\): Provider returned an empty response/i.test(String(error?.message || error))
        if (!emptyProviderResponse) throw error
        if (signal?.aborted) throw error
        if (attempt === 1) {
          throw new Error('OpenRouter returned an empty provider response twice (HTTP 502). Try another provider in this Lumiverse connection, enable provider fallbacks, or select a different EchoChamber connection profile.')
        }
      }
    }
  }
  if (settings.source === 'ollama') {
    if (!settings.ollamaModel) throw new Error('Select an Ollama model first.')
    const result = await providerPost(endpoint(settings.ollamaUrl, '/api/chat'), {
      model: settings.ollamaModel, messages, stream: false,
      options: { num_predict: settings.maxTokens },
    })
    return result?.message?.content || ''
  }
  if (!settings.openaiModel) throw new Error('Enter a model name for the OpenAI-compatible backend.')
  const apiKey = await spindle.enclave.get(API_KEY_NAME, userId)
  const result = await providerPost(endpoint(settings.openaiUrl, '/v1/chat/completions'), {
    model: settings.openaiModel, messages, stream: false, max_tokens: settings.maxTokens,
  }, apiKey)
  const content = result?.choices?.[0]?.message?.content
  return typeof content === 'string' ? content
    : Array.isArray(content) ? content.filter(part => part?.type === 'text').map(part => part.text).join('') : ''
}
function limited(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : '' }
function cleanMessage(value) {
  return limited(value, 12000)
    .replace(/<(thinking|think|thought|reasoning|reason)>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, '').trim()
}
async function resolveStyleMacros(style, chatId, userId) {
  if (!/\{\{(?:user|char|characters|story_characters_block)\}\}/i.test(style)) return style
  let personaName = 'User'
  let characterName = 'Character'
  if (/\{\{user\}\}/i.test(style)) {
    const persona = await spindle.personas.getActive(userId)
    personaName = limited(persona?.name, 80) || personaName
  }
  if (/\{\{(?:char|characters|story_characters_block)\}\}/i.test(style)) {
    const chat = await spindle.chats.get(chatId, userId)
    if (chat?.character_id) {
      const character = await spindle.characters.get(chat.character_id, userId)
      characterName = limited(character?.name, 80) || characterName
    }
  }
  const storyBlock = `<characters>\nIdentify the speaking characters from the story content itself — do NOT use "${characterName}" as a username if it is a story or world title. Use names of characters who actually appear in the narrative and write in their established voices.\n</characters>`
  return style.replace(/\{\{user\}\}/gi, personaName)
    .replace(/\{\{char\}\}/gi, characterName)
    .replace(/\{\{characters\}\}/gi, `- ${characterName}`)
    .replace(/\{\{story_characters_block\}\}/gi, storyBlock)
}
async function optionalContext(chatId, userId, settings, all) {
  const parts = []
  if (settings.includePersona) {
    const persona = await spindle.personas.getActive(userId)
    if (persona) {
      const body = [persona.description, ...(persona.addons || []).filter(x => x.enabled).map(x => x.content)]
        .map(x => limited(x, 4000)).filter(Boolean).join('\n')
      if (body) parts.push(`<user_persona name="${limited(persona.name, 80)}">\n${body}\n</user_persona>`)
    }
  }
  let chat
  if (settings.includeAuthorsNote || settings.includeCharacterDescription || settings.includeSummary) {
    chat = await spindle.chats.get(chatId, userId)
  }
  if (settings.includeAuthorsNote) {
    const rawNote = chat?.metadata?.authors_note
    const note = limited(typeof rawNote === 'string' ? rawNote : rawNote?.content, 6000)
    if (note) parts.push(`<authors_note>\n${note}\n</authors_note>`)
  }
  if (settings.includeCharacterDescription && chat?.character_id) {
    const character = await spindle.characters.get(chat.character_id, userId)
    const body = limited(character?.description, 8000)
    if (body) parts.push(`<character name="${limited(character.name, 80)}">\n${body}\n</character>`)
  }
  if (settings.includeSummary) {
    const summary = limited(chat?.metadata?.summary, 8000) ||
      [...all].reverse().map(m => limited(m?.metadata?.memory || m?.extra?.memory, 8000)).find(Boolean)
    if (summary) parts.push(`<summary>\n${summary}\n</summary>`)
  }
  if (settings.includeWorldInfo) {
    const entries = await spindle.world_books.getActivated(chatId, userId)
    // getActivated already applies Lumiverse's normal activation pipeline.
    // Zero uses that host selection unchanged; a positive override adds a cap.
    let budget = settings.wiBudget
    const selected = []
    for (const activated of entries || []) {
      if (budget === 0 && settings.wiBudget > 0) break
      if (!activated?.id) continue
      // getActivated intentionally returns identifiers and activation metadata;
      // the entry body requires a second, permission-gated lookup.
      const entry = await spindle.world_books.entries.get(activated.id, userId)
      let content = typeof entry?.content === 'string' ? entry.content.trim() : ''
      if (!content) continue
      if (settings.wiBudget > 0) {
        let tokens = (await spindle.tokens.countText(content, { userId })).total_tokens
        if (tokens > budget) {
          content = content.slice(0, Math.max(1, Math.floor(content.length * budget / tokens * 0.9)))
          tokens = (await spindle.tokens.countText(content, { userId })).total_tokens
        }
        if (tokens > budget) continue
        budget -= tokens
      }
      selected.push(content)
    }
    if (selected.length) parts.push(`<world_info>\n${selected.join('\n\n')}\n</world_info>`)
  }
  return parts.length ? `\n\n<lore>\n${parts.join('\n\n')}\n</lore>` : ''
}
async function generate(chatId, userId, replyTo = null, overrideCount = null, manual = false) {
  const settings = await settingsFor(userId)
  if (busyUsers.has(userId) || !settings.enabled || settings.paused) return
  if (!spindle.permissions.has('chat_mutation')) {
    send({ type: 'error', message: 'Grant Chat Mutation permission to EchoChamber.' }, userId)
    return
  }
  const job = { canceled: false, controller: new AbortController() }
  generationJobs.set(userId, job)
  busyUsers.add(userId)
  send({ type: 'busy', value: true, chatId }, userId)
  try {
    const narrator = ['nsfwava', 'nsfwkai', 'hypebot'].includes(settings.style)
    const count = overrideCount == null
      ? (replyTo ? settings.chatReplyCount : settings.livestream && !manual ? settings.livestreamBatchSize : narrator ? 1 : settings.count)
      : clamp(overrideCount, settings.count, 1, 30)
    const all = await spindle.chat.getMessages(chatId)
    const visible = all.filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    const recent = settings.includeUserInput ? visible.slice(-settings.depth) : visible.slice(-1)
    if (!recent.length) throw new Error('This chat has no messages yet.')
    const prior = await loadChat(chatId, userId)
    const context = await optionalContext(chatId, userId, settings, all)
    const past = settings.includePastEchoChambers && prior.length
      ? `\n<recent_chatroom_history>\n${prior.slice(-20).map(x => `${x.name}: ${x.text}`).join('\n')}\n</recent_chatroom_history>` : ''
    const rawStyle = settings.customStyles[settings.style]?.prompt || settings.styleOverrides[settings.style] || styles[settings.style] || styles[defaults.style]
    const style = await resolveStyleMacros(rawStyle, chatId, userId)
    const task = replyTo
      ? `The streamer ${replyTo.name}${replyTo.target ? ` addresses @${replyTo.target}` : ''}: ${replyTo.text}\nWrite exactly ${count} short replies from audience members to this message.`
      : narrator && settings.livestream && !manual
        ? `Write exactly ${count} short live chat messages from the same narrator reacting to the most recent chat turn.`
      : settings.livestream && !manual && !narrator
        ? `Write exactly ${count} short live chat messages from about ${settings.count} distinct audience members reacting to the most recent chat turn.`
        : `Write exactly ${count} short audience reaction${count === 1 ? '' : 's'} to the most recent chat turn.`
    const messages = [
      { role: 'system', content: `You create a fake live audience feed that reacts to the conversation. Do not continue the story or roleplay as the assistant.${context}` },
      ...recent.map(m => ({ role: m.role, content: cleanMessage(m.content).slice(0, 6000) })),
      { role: 'user', content: `<instructions>\n${style}\n</instructions>${past}\n<task>\n${task}\nOutput only lines formatted username: message. Do not include a preamble, JSON, reasoning, or the chat transcript.\n</task>` },
    ]
    const content = await modelText(messages, settings, userId, job.controller.signal)
    if (job.canceled || activeChats.get(userId) !== chatId) return
    const reactions = parseReactions(content, count)
    if (!reactions.length) throw new Error(typeof content === 'string' && content.trim() ? 'The model returned text that could not be used as audience reactions. Try another model or style.' : 'The model returned an empty reply. Try another connection profile or increase the token limit.')
    if (replyTo) reactions.unshift({ name: replyTo.name, text: replyTo.text, mine: true, target: replyTo.target || undefined })
    const next = manual && !replyTo ? reactions : [...prior, ...reactions]
    await saveChat(chatId, next, userId)
    if (!job.canceled) send({ type: 'reactions', chatId, items: next, animate: settings.livestream && !manual && !replyTo }, userId)
  } catch (error) {
    if (!job.canceled) send({ type: 'error', message: String(error?.message || error) }, userId)
  } finally {
    if (generationJobs.get(userId) === job) {
      generationJobs.delete(userId)
      busyUsers.delete(userId)
      send({ type: 'busy', value: false, chatId }, userId)
    }
  }
}
async function hydrate(userId) {
  const settings = await publicSettings(userId)
  const active = spindle.permissions.has('chats') ? await spindle.chats.getActive(userId) : null
  const chatId = safeChatId(active?.id)
  activeChats.set(userId, chatId)
  send({ type: 'state', chatId, settings, styles: Object.keys(styles), connections: await listConnections(userId),
    items: chatId ? await loadChat(chatId, userId) : [] }, userId)
}
async function listConnections(userId) {
  if (!spindle.permissions.has('generation')) return []
  const profiles = await spindle.connections.list(userId)
  return profiles.map(profile => ({
    id: profile.id, name: profile.name, model: profile.model,
    provider: profile.provider, isDefault: profile.is_default === true,
  }))
}
async function settingsFor(userId) {
  if (userSettings.has(userId)) return userSettings.get(userId)
  const settings = cleanSettings(await spindle.userStorage.getJson('settings.json', { fallback: defaults, userId }))
  userSettings.set(userId, settings)
  return settings
}
async function publicSettings(userId) {
  return { ...await settingsFor(userId), hasApiKey: await spindle.enclave.has(API_KEY_NAME, userId) }
}

spindle.onFrontendMessage(async (payload, userId) => {
  try {
    if (payload?.type === 'hydrate') return await hydrate(userId)
    if (payload?.type === 'connections_refresh') {
      return send({ type: 'connections', connections: await listConnections(userId) }, userId)
    }
    if (payload?.type === 'settings') {
      const settings = cleanSettings({ ...await settingsFor(userId), ...payload.settings })
      userSettings.set(userId, settings)
      await spindle.userStorage.setJson('settings.json', settings, { userId })
      return send({ type: 'settings', settings: await publicSettings(userId) }, userId)
    }
    if (payload?.type === 'api_key') {
      const key = limited(payload.key, 1000)
      if (key) await spindle.enclave.put(API_KEY_NAME, key, userId)
      return send({ type: 'settings', settings: await publicSettings(userId) }, userId)
    }
    if (payload?.type === 'api_key_clear') {
      await spindle.enclave.delete(API_KEY_NAME, userId)
      return send({ type: 'settings', settings: await publicSettings(userId) }, userId)
    }
    if (payload?.type === 'get_style') {
      const id = str(payload.id, '', 64)
      const settings = await settingsFor(userId)
      const prompt = settings.customStyles[id]?.prompt || settings.styleOverrides[id] || styles[id]
      if (prompt) return send({ type: 'style_definition', id,
        name: settings.customStyles[id]?.name || id, prompt }, userId)
      return
    }
    if (payload?.type === 'cancel') {
      const job = generationJobs.get(userId)
      if (job) {
        job.canceled = true
        job.controller.abort()
        generationJobs.delete(userId)
        busyUsers.delete(userId)
        send({ type: 'busy', value: false, chatId: activeChats.get(userId) }, userId)
      }
      return
    }
    if (payload?.type === 'chat') {
      const chatId = safeChatId(payload.chatId)
      activeChats.set(userId, chatId)
      return send({ type: 'chat', chatId, items: chatId ? await loadChat(chatId, userId) : [] }, userId)
    }
    if (payload?.type === 'generate' || payload?.type === 'reply') {
      const chatId = activeChats.get(userId)
      if (!chatId) return send({ type: 'error', message: 'Open a chat first.' }, userId)
      const settings = await settingsFor(userId)
      const reply = payload.type === 'reply' && typeof payload.text === 'string'
        ? { name: settings.chatUsername, text: payload.text.trim().slice(0, 1000),
            target: limited(payload.target || payload.targetName, 80).replace(/^@/, '') } : null
      if (payload.type === 'reply' && !reply?.text) return
      return await generate(chatId, userId, reply, payload.count, payload.manual === true || payload.type === 'reply')
    }
    if (payload?.type === 'clear' && activeChats.get(userId)) {
      const chatId = activeChats.get(userId)
      await saveChat(chatId, [], userId)
      return send({ type: 'reactions', chatId, items: [] }, userId)
    }
  } catch (error) { send({ type: 'error', message: String(error?.message || error) }, userId) }
})

spindle.log.info('EchoChamber for Lumiverse ready')
