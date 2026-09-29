import assert from 'node:assert/strict'
import { test } from 'node:test'

const sent = []
const storage = new Map()
const secrets = new Map()
const corsCalls = []
const generationCalls = []
const contextReads = []
let frontendHandler
let generationText = 'Viewer: hello from the audience'
let corsResponse = { status: 200, body: JSON.stringify({ choices: [{ message: { content: generationText } }] }) }
let generationGate = null
let generationFailures = []
const messages = [{ role: 'user', content: 'What happened?' }, { role: 'assistant', content: 'A scene unfolded.' }]
globalThis.spindle = {
  sendToFrontend: (value, userId) => sent.push({ ...value, userId }),
  onFrontendMessage: handler => { frontendHandler = handler },
  permissions: { has: () => true },
  userStorage: {
    getJson: async (path, { fallback, userId }) => storage.get(`${userId}:${path}`) ?? fallback,
    setJson: async (path, value, { userId }) => storage.set(`${userId}:${path}`, structuredClone(value)),
  },
  enclave: {
    has: async (key, userId) => secrets.has(`${userId}:${key}`),
    get: async (key, userId) => secrets.get(`${userId}:${key}`) ?? null,
    put: async (key, value, userId) => { secrets.set(`${userId}:${key}`, value) },
    delete: async (key, userId) => { secrets.delete(`${userId}:${key}`) },
  },
  chats: { getActive: async () => ({ id: 'chat1' }), get: async () => { contextReads.push('chat'); return { id: 'chat1', character_id: 'char1', metadata: { authors_note: { content: 'A note' }, summary: 'Past summary' } } } },
  chat: { getMessages: async () => messages },
  connections: { list: async () => [
    { id: 'conn1', name: 'Main RP', model: 'expensive-model', provider: 'openai', is_default: true },
    { id: 'conn2', name: 'Audience', model: 'cheap-model', provider: 'openai', is_default: false },
  ], get: async id => ['conn1', 'conn2'].includes(id) ? { id } : null },
  generate: { quiet: async input => { generationCalls.push(input); if (generationGate) await generationGate.promise; if (generationFailures.length) throw generationFailures.shift(); return { content: generationText } } },
  cors: async (url, options) => { corsCalls.push({ url, options }); return corsResponse },
  tokens: { countText: async text => ({ total_tokens: Math.ceil(text.length / 4) }) },
  personas: { getActive: async () => { contextReads.push('persona'); return { name: 'Persona', description: 'Persona text' } } },
  characters: { get: async () => { contextReads.push('character'); return { name: 'Character', description: 'Character text' } } },
  world_books: {
    getActivated: async () => { contextReads.push('world-activation'); return [{ id: 'entry1' }] },
    entries: { get: async () => { contextReads.push('world-entry'); return { content: 'World text' } } },
  },
  log: { info: () => {} },
}
await import('../dist/backend.js')
const message = (payload, userId = 'alice') => frontendHandler(payload, userId)
const last = type => [...sent].reverse().find(item => item.type === type)

test('hydrate returns per-user state and connection profiles without reading optional context', async () => {
  await message({ type: 'hydrate' })
  assert.equal(last('state').chatId, 'chat1')
  assert.equal(last('state').connections[0].id, 'conn1')
  assert.equal(last('state').connections[1].model, 'cheap-model')
  assert.equal(last('state').settings.hasApiKey, false)
})

test('refresh discovers profiles and selected cheaper profile routes generation independently', async () => {
  await message({ type: 'connections_refresh' })
  assert.equal(last('connections').connections[1].name, 'Audience')
  await message({ type: 'settings', settings: { source: 'lumiverse', connectionId: 'conn2' } })
  await message({ type: 'generate' })
  assert.equal(generationCalls.at(-1).connection_id, 'conn2')
})

test('settings preserve fields, custom styles, built-in override and visibility', async () => {
  await message({ type: 'settings', settings: {
    customStyles: { custom: { name: 'Custom', prompt: 'Custom prompt' }, discordtwitch: { name: 'Edited', prompt: 'Edited prompt' } },
    style: 'custom', deletedStyles: ['twitterx'], panelOpacity: 75, chatReplyCount: 4,
  } })
  assert.equal(last('settings').settings.style, 'custom')
  assert.equal(last('settings').settings.customStyles.discordtwitch.prompt, 'Edited prompt')
  assert.deepEqual(last('settings').settings.deletedStyles, ['twitterx'])
  await message({ type: 'get_style', id: 'custom' })
  assert.equal(last('style_definition').prompt, 'Custom prompt')
})

test('API keys stay in enclave and are never exposed to frontend or storage', async () => {
  await message({ type: 'api_key', key: 'private-key' })
  assert.equal(last('settings').settings.hasApiKey, true)
  assert.equal(JSON.stringify(last('settings')).includes('private-key'), false)
  assert.equal(JSON.stringify([...storage.values()]).includes('private-key'), false)
})

test('OpenAI-compatible and Ollama routes use the requested per-user endpoint', async () => {
  await message({ type: 'settings', settings: { source: 'openai', openaiUrl: 'http://127.0.0.1:1234/v1', openaiModel: 'local' } })
  await message({ type: 'generate' })
  assert.equal(corsCalls.at(-1).url, 'http://127.0.0.1:1234/v1/chat/completions')
  assert.equal(corsCalls.at(-1).options.headers.authorization, 'Bearer private-key')
  assert.equal(last('reactions').items.at(-1).name, 'Viewer')
  await message({ type: 'settings', settings: { source: 'ollama', ollamaUrl: 'http://localhost:11434', ollamaModel: 'llama' } })
  corsResponse = { status: 200, body: JSON.stringify({ message: { content: 'OllamaViewer: hey' } }) }
  await message({ type: 'generate' })
  assert.equal(corsCalls.at(-1).url, 'http://localhost:11434/api/chat')
  assert.equal(corsCalls.at(-1).options.headers.authorization, undefined)
})

test('Lumiverse profile, reply target and custom prompt are passed into generation', async () => {
  await message({ type: 'settings', settings: { source: 'lumiverse', connectionId: 'conn1', style: 'custom' } })
  await message({ type: 'reply', text: 'Hi @Viewer', target: 'Viewer' })
  assert.equal(generationCalls.at(-1).connection_id, 'conn1')
  assert.deepEqual(generationCalls.at(-1).reasoning, { source: 'off' })
  assert.match(generationCalls.at(-1).messages.at(-1).content, /Custom prompt/)
  assert.match(generationCalls.at(-1).messages.at(-1).content, /@Viewer/)
  assert.equal(last('reactions').items.at(-2).target, 'Viewer')
})

test('users get isolated settings and feed', async () => {
  await message({ type: 'hydrate' }, 'bob')
  assert.equal(last('state').settings.style, 'discordtwitch')
  assert.equal(last('state').settings.hasApiKey, false)
  assert.deepEqual(last('state').items, [])
})

test('optional context is read only when enabled and appears in the prompt', async () => {
  assert.deepEqual(contextReads, [])
  await message({ type: 'settings', settings: {
    source: 'lumiverse', includePersona: true, includeAuthorsNote: true,
    includeCharacterDescription: true, includeSummary: true, includeWorldInfo: true,
  } })
  await message({ type: 'generate' })
  const system = generationCalls.at(-1).messages[0].content
  for (const content of ['Persona text', 'A note', 'Character text', 'Past summary', 'World text']) {
    assert.ok(system.includes(content), content)
  }
  assert.deepEqual(contextReads, ['persona', 'chat', 'character', 'world-activation', 'world-entry'])
  await message({ type: 'settings', settings: {
    includePersona: false, includeAuthorsNote: false, includeCharacterDescription: false,
    includeSummary: false, includeWorldInfo: false,
  } })
})

test('positive world-info budget uses tokenizer and limits inserted text', async () => {
  await message({ type: 'settings', settings: { includeWorldInfo: true, wiBudget: 1 } })
  await message({ type: 'generate' })
  const system = generationCalls.at(-1).messages[0].content
  assert.ok(!system.includes('World text'))
  assert.ok(system.includes('<world_info>'))
  await message({ type: 'settings', settings: { includeWorldInfo: false, wiBudget: 0 } })
})

test('style macros use active Lumiverse names and story prompts resolve their cast block', async () => {
  await message({ type: 'settings', settings: { style: 'sillytavern' } })
  await message({ type: 'generate' })
  const roleplay = generationCalls.at(-1).messages.at(-1).content
  assert.match(roleplay, /- Character/)
  assert.ok(!roleplay.includes('{{characters}}'))

  await message({ type: 'settings', settings: { style: 'sillytavern_story' } })
  await message({ type: 'generate' })
  const story = generationCalls.at(-1).messages.at(-1).content
  assert.match(story, /Identify the speaking characters/)
  assert.ok(!story.includes('{{story_characters_block}}'))

  await message({ type: 'settings', settings: {
    style: 'custom', customStyles: { custom: { name: 'Custom', prompt: 'Speak as {{user}} with {{char}}.' } },
  } })
  await message({ type: 'generate' })
  assert.match(generationCalls.at(-1).messages.at(-1).content, /Speak as Persona with Character\./)
})

test('reaction parser accepts markdown, structured replies, prose, and strips reasoning', async () => {
  await message({ type: 'settings', settings: { source: 'lumiverse', style: 'discordtwitch' } })
  for (const [reply, expectedName] of [
    ['**River**: Big moment!\n2. @Dax: I saw that too.', '@Dax'],
    [JSON.stringify({ reactions: [{ username: 'JSONFan', message: 'That twist!' }] }), 'JSONFan'],
    [JSON.stringify({ username: 'SoloFan', message: 'Amazing scene!' }), 'SoloFan'],
    ['DashFan — I loved that twist.', 'DashFan'],
    ['<think>Private reasoning</think>\nSage: What a scene.', 'Sage'],
  ]) {
    generationText = reply
    await message({ type: 'generate' })
    assert.equal(last('reactions').items.at(-1).name, expectedName)
    assert.ok(!last('reactions').items.at(-1).text.includes('Private reasoning'))
  }
  generationText = ''
  await message({ type: 'generate' })
  assert.match(last('error').message, /empty reply/)
  const before = last('reactions')
  generationText = 'The crowd gasps at the surprise.'
  await message({ type: 'generate' })
  assert.equal(last('reactions'), before)
  assert.match(last('error').message, /could not be used/)
  generationText = 'Viewer: hello from the audience'
})

test('manual regeneration uses latest turn and displays immediately even in livestream', async () => {
  messages.push({ role: 'user', content: 'A synthetic latest turn.' })
  await message({ type: 'settings', settings: { source: 'lumiverse', livestream: true,
    livestreamBatchSize: 20, count: 5, includeUserInput: false, style: 'discordtwitch' } })
  await message({ type: 'generate', manual: true })
  const manual = generationCalls.at(-1).messages
  assert.equal(manual.length, 3)
  assert.equal(manual[1].role, 'user')
  assert.equal(manual[1].content, 'A synthetic latest turn.')
  assert.match(manual.at(-1).content, /exactly 5 short audience reactions/)
  assert.equal(last('reactions').animate, false)
  assert.equal(last('reactions').items.length, 1)
  await message({ type: 'generate' })
  assert.match(generationCalls.at(-1).messages.at(-1).content, /exactly 20 short live chat messages/)
  assert.equal(last('reactions').animate, true)
  messages.pop()
  await message({ type: 'settings', settings: { livestream: false } })
})

test('cancel ignores a pending generation result', async () => {
  let release
  generationGate = { promise: new Promise(resolve => { release = resolve }) }
  const before = last('reactions')
  const callCount = generationCalls.length
  const pending = message({ type: 'generate' })
  for (let i = 0; i < 100 && generationCalls.length === callCount; i++) await Promise.resolve()
  assert.equal(generationCalls.length, callCount + 1)
  await message({ type: 'cancel' })
  release()
  await pending
  generationGate = null
  assert.equal(last('reactions'), before)
  assert.equal(last('busy').value, false)
})

test('retries one upstream empty OpenRouter 502 and reports persistent failure', async () => {
  await message({ type: 'settings', settings: { source: 'lumiverse', connectionId: 'conn2' } })
  const providerError = 'OpenRouter generate failed (502): Provider returned an empty response'
  const before = generationCalls.length
  generationFailures = [new Error(providerError)]
  await message({ type: 'generate' })
  assert.equal(generationCalls.length, before + 2)
  assert.equal(generationCalls.at(-1).connection_id, 'conn2')
  const afterSuccess = last('reactions')

  generationFailures = [new Error(providerError), new Error(providerError)]
  await message({ type: 'generate' })
  assert.match(last('error').message, /empty provider response twice/)
  assert.match(last('error').message, /different EchoChamber connection profile/)
  assert.equal(last('reactions'), afterSuccess)
})
