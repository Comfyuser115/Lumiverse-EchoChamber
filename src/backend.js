// Lumiverse transport for the original EchoChamber frontend. The frontend owns
// its prompts, parser, live queue, settings UI, and rendering as upstream does.
const SETTINGS_PATH = 'upstream-settings.json'
const EXTERNAL_KEY = 'echochamber-openai-key'
const jobs = new Map()

function respond(userId, id, result, error) {
  spindle.sendToFrontend({ type: 'bridge_response', id, result, error: error ? String(error.message || error) : undefined }, userId)
}

function text(value, max = 12000) {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

function idOf(value) {
  return typeof value === 'string' && /^[\w-]{1,128}$/.test(value) ? value : null
}

async function profileList(userId) {
  if (!spindle.permissions.has('generation')) return []
  return (await spindle.connections.list(userId)).map(profile => ({
    id: profile.id, name: profile.name, model: profile.model,
    provider: profile.provider, is_default: profile.is_default === true,
  }))
}

async function snapshot(userId, options = {}) {
  const active = spindle.permissions.has('chats') ? await spindle.chats.getActive(userId) : null
  const chatId = idOf(active?.id)
  const all = chatId ? await spindle.chat.getMessages(chatId) : []
  const chat = chatId ? await spindle.chats.get(chatId, userId) : null
  const persona = spindle.permissions.has('personas') ? await spindle.personas.getActive(userId) : null
  const character = chat?.character_id && spindle.permissions.has('characters')
    ? await spindle.characters.get(chat.character_id, userId) : null
  const mapped = all.slice(-500).map(message => ({
    mes: text(message.content), message: text(message.content),
    is_user: message.role === 'user', is_system: message.role === 'system',
    name: text(message.name, 100) || (message.role === 'user' ? text(persona?.name, 100) || 'User' : text(character?.name, 100) || 'Character'),
    extra: options.includeSummary ? { memory: text(message?.metadata?.memory || message?.extra?.memory, 8000) } : {},
  }))
  const details = {}
  if (options.includePersona && persona) {
    details.persona = { name: text(persona.name, 100), description: text(persona.description, 8000) }
  }
  if (options.includeAuthorsNote) {
    const note = chat?.metadata?.authors_note
    details.authorsNote = text(typeof note === 'string' ? note : note?.content, 8000)
  }
  if (options.includeSummary) details.summary = text(chat?.metadata?.summary, 8000)
  if (options.includeCharacterDescription && character) {
    details.characterDescription = text(character.description, 10000)
  }
  if (options.includeWorldInfo && chatId && spindle.permissions.has('world_books')) {
    const selected = await spindle.world_books.getActivated(chatId, userId)
    const contents = []
    let budget = Number(options.wiBudget) || 0
    for (const item of selected || []) {
      if (!item?.id) continue
      const entry = await spindle.world_books.entries.get(item.id, userId)
      const content = text(entry?.content, 12000).trim()
      if (!content) continue
      if (budget > 0) {
        const count = (await spindle.tokens.countText(content, { userId })).total_tokens
        if (count > budget) continue
        budget -= count
      }
      contents.push(content)
      if (contents.length >= 30) break
    }
    details.worldInfo = contents.join('\n\n')
  }
  return {
    chatId, chat: mapped, personaName: text(persona?.name, 100) || 'User',
    characterName: text(character?.name, 100) || 'Character', characterId: chat?.character_id || null,
    profiles: await profileList(userId), details,
  }
}

async function saveSettings(userId, incoming) {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) throw new Error('Invalid settings')
  const settings = structuredClone(incoming)
  const key = text(settings.openai_key, 2048)
  if (key) await spindle.enclave.put(EXTERNAL_KEY, key, userId)
  delete settings.openai_key
  await spindle.userStorage.setJson(SETTINGS_PATH, settings, { userId })
  return true
}

async function loadSettings(userId) {
  const saved = await spindle.userStorage.getJson(SETTINGS_PATH, { fallback: null, userId })
  if (saved) return saved
  const old = await spindle.userStorage.getJson('settings.json', { fallback: null, userId })
  if (!old || typeof old !== 'object') return null
  const styleIds = {
    discordtwitch: 'twitch', thoughtfulverbose: 'verbose', twitterx: 'twitter', breakingnews: 'news',
    nsfwava: 'nsfw_ava', nsfwkai: 'nsfw_kai',
  }
  const styleId = id => styleIds[id] || id
  const custom_styles = {}
  for (const [id, entry] of Object.entries(old.customStyles || {})) {
    if (entry?.prompt) custom_styles[styleId(id)] = { name: text(entry.name, 100) || id, prompt: text(entry.prompt, 30000) }
  }
  for (const [id, prompt] of Object.entries(old.styleOverrides || {})) {
    if (typeof prompt === 'string' && prompt) custom_styles[styleId(id)] = { name: styleId(id), prompt: text(prompt, 30000) }
  }
  const migrated = {
    enabled: old.enabled !== false, paused: old.paused === true,
    source: old.source === 'lumiverse' ? (old.connectionId ? 'profile' : 'default') : old.source,
    preset: text(old.connectionId, 128),
    url: text(old.ollamaUrl, 500) || 'http://localhost:11434', model: text(old.ollamaModel, 200),
    openai_url: text(old.openaiUrl, 500) || 'http://localhost:1234/v1',
    openai_model: text(old.openaiModel, 200) || 'local-model',
    style: styleId(old.style || 'twitch'), userCount: old.count || 5,
    contextDepth: old.depth || 4, position: ['top', 'bottom', 'left', 'right'].includes(old.position) ? old.position : 'bottom',
    floatOpen: old.position === 'float', chatHeight: old.panelHeight || 250,
    panelWidth: old.panelWidth || 350, opacity: old.panelOpacity || 85, fontSize: old.fontSize || 15,
    collapsed: old.collapsed === true, autoUpdateOnMessages: old.autoUpdateOnMessages !== false,
    includeUserInput: old.includeUserInput === true, includePastEchoChambers: old.includePastEchoChambers === true,
    includePersona: old.includePersona === true, includeAuthorsNote: old.includeAuthorsNote === true,
    includeCharacterDescription: old.includeCharacterDescription === true, includeSummary: old.includeSummary === true,
    includeWorldInfo: old.includeWorldInfo === true, wiBudget: old.wiBudget || 0,
    livestream: old.livestream === true, livestreamBatchSize: old.livestreamBatchSize || 20,
    livestreamMinWait: old.livestreamMinWait || 5, livestreamMaxWait: old.livestreamMaxWait || 60,
    livestreamMode: old.livestreamMode || 'manual', livestreamAutoScroll: old.livestreamAutoScroll !== false,
    chatEnabled: old.chatEnabled !== false, chatUsername: text(old.chatUsername, 100) || 'Streamer (You)',
    chatAvatarColor: old.chatAvatarColor || '#3b82f6', chatReplyCount: old.chatReplyCount || 3,
    messageOrder: old.messageOrder || 'oldest-first', custom_styles,
    deleted_styles: (old.deletedStyles || []).map(styleId),
    style_order: (old.styleOrder || []).map(styleId),
  }
  await spindle.userStorage.setJson(SETTINGS_PATH, migrated, { userId })
  return migrated
}

async function generate(userId, payload, id) {
  if (!spindle.permissions.has('generation')) throw new Error('Grant Generation permission to EchoChamber.')
  const controller = new AbortController()
  jobs.set(`${userId}:${id}`, controller)
  try {
    const messages = Array.isArray(payload.messages) ? payload.messages.slice(-520).map(row => ({
      role: ['system', 'user', 'assistant'].includes(row?.role) ? row.role : 'user',
      content: text(row?.content, 30000),
    })) : []
    if (!messages.length) throw new Error('No messages to generate from.')
    const maxTokens = Math.max(100, Math.min(8000, Number(payload.maxTokens) || 700))
    const input = { userId, messages, parameters: { max_tokens: maxTokens }, signal: controller.signal }
    if (payload.connectionId) {
      const profile = await spindle.connections.get(payload.connectionId, userId)
      if (!profile) throw new Error('Selected Lumiverse connection profile was not found.')
      input.connection_id = payload.connectionId
    }
    const response = await spindle.generate.quiet(input)
    return { content: response?.content || '' }
  } finally {
    jobs.delete(`${userId}:${id}`)
  }
}

function checkedUrl(raw) {
  const url = new URL(raw)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) {
    throw new Error('External model URL must be an http(s) URL without credentials or fragment.')
  }
  if (!/\/(api\/chat|chat\/completions|api\/tags)$/.test(url.pathname)) throw new Error('Unsupported model endpoint.')
  return url.toString()
}

async function externalRequest(userId, payload) {
  if (!spindle.permissions.has('cors_proxy')) throw new Error('Grant CORS Proxy permission to EchoChamber.')
  const url = checkedUrl(payload.url)
  const headers = { 'content-type': 'application/json' }
  if (url.endsWith('/chat/completions')) {
    const key = await spindle.enclave.get(EXTERNAL_KEY, userId)
    if (key) headers.authorization = `Bearer ${key}`
  }
  const response = await spindle.cors(url, {
    method: payload.method === 'GET' ? 'GET' : 'POST', headers,
    ...(payload.method === 'GET' ? {} : { body: text(payload.body, 200000) }),
  })
  return { status: response.status, body: text(response.body, 300000) }
}

spindle.onFrontendMessage(async (payload, userId) => {
  if (payload?.type === 'bridge_cancel') {
    jobs.get(`${userId}:${payload.id}`)?.abort()
    return
  }
  if (payload?.type !== 'bridge_request' || typeof payload.id !== 'string') return
  try {
    let result
    switch (payload.action) {
      case 'hydrate':
        result = { settings: await loadSettings(userId),
          snapshot: await snapshot(userId, payload.options) }
        break
      case 'snapshot': result = await snapshot(userId, payload.options); break
      case 'save_settings': result = await saveSettings(userId, payload.settings); break
      case 'generate': result = await generate(userId, payload, payload.id); break
      case 'external': result = await externalRequest(userId, payload); break
      default: throw new Error('Unknown EchoChamber request')
    }
    respond(userId, payload.id, result)
  } catch (error) {
    respond(userId, payload.id, null, error)
  }
})

spindle.log.info('Upstream EchoChamber bridge ready')
