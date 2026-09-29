import assert from 'node:assert/strict'
import { test } from 'node:test'

const sent = []
const stored = new Map()
const secrets = new Map()
const calls = []
const reads = []
let handler
globalThis.spindle = {
  sendToFrontend: value => sent.push(value),
  onFrontendMessage: value => { handler = value },
  permissions: { has: () => true },
  userStorage: {
    getJson: async (path, { fallback }) => stored.get(path) ?? fallback,
    setJson: async (path, value) => stored.set(path, structuredClone(value)),
  },
  enclave: {
    put: async (key, value) => secrets.set(key, value),
    get: async key => secrets.get(key) || null,
  },
  chats: {
    getActive: async () => ({ id: 'synthetic-chat' }),
    get: async () => ({ id: 'synthetic-chat', character_id: 'synthetic-character', metadata: { authors_note: { content: 'A synthetic note' } } }),
  },
  chat: { getMessages: async () => [{ role: 'assistant', content: 'A synthetic scene.' }] },
  personas: { getActive: async () => { reads.push('persona'); return { name: 'User', description: 'Synthetic persona' } } },
  characters: { get: async () => { reads.push('character'); return { name: 'Character', description: 'Synthetic character' } } },
  world_books: {
    getActivated: async () => { reads.push('world'); return [{ id: 'synthetic-entry' }] },
    entries: { get: async () => ({ content: 'Synthetic lore' }) },
  },
  tokens: { countText: async () => ({ total_tokens: 2 }) },
  connections: {
    list: async () => [{ id: 'cheap', name: 'Cheaper model', model: 'small-model', provider: 'openrouter' }],
    get: async id => id === 'cheap' ? { id } : null,
  },
  generate: { quiet: async input => { calls.push(input); return { content: 'Viewer: a synthetic reaction' } } },
  cors: async () => ({ status: 200, body: '{"ok":true}' }),
  log: { info() {} },
}
await import('../dist/backend.js')

async function request(action, values = {}) {
  const id = `test-${sent.length}`
  await handler({ type: 'bridge_request', id, action, ...values }, 'synthetic-user')
  const response = sent.at(-1)
  assert.equal(response.id, id)
  if (response.error) throw new Error(response.error)
  return response.result
}

test('Lumiverse bridge routes original EchoChamber prompts through selected profile', async () => {
  const state = await request('hydrate')
  assert.equal(state.snapshot.chatId, 'synthetic-chat')
  assert.equal(state.snapshot.profiles[0].id, 'cheap')
  assert.equal(state.snapshot.chat[0].mes, 'A synthetic scene.')
  assert.ok(!reads.includes('world'))

  const result = await request('generate', { connectionId: 'cheap', maxTokens: 1200,
    messages: [{ role: 'system', content: 'Synthetic style' }, { role: 'user', content: 'React to the scene' }] })
  assert.equal(result.content, 'Viewer: a synthetic reaction')
  assert.equal(calls.at(-1).connection_id, 'cheap')
  assert.equal(calls.at(-1).parameters.max_tokens, 1200)
  assert.equal(calls.at(-1).messages.at(-1).content, 'React to the scene')
})

test('settings persist while external API keys stay in the enclave', async () => {
  await request('save_settings', { settings: { source: 'openai', openai_key: 'synthetic-secret', style: 'twitch' } })
  assert.equal(secrets.get('echochamber-openai-key'), 'synthetic-secret')
  assert.equal(stored.get('upstream-settings.json').openai_key, undefined)
  const state = await request('hydrate')
  assert.equal(state.settings.style, 'twitch')
})

test('optional lore data is requested only after the corresponding setting is enabled', async () => {
  assert.ok(!reads.includes('world'))
  const state = await request('snapshot', { options: { includeWorldInfo: true, wiBudget: 10 } })
  assert.equal(state.details.worldInfo, 'Synthetic lore')
  assert.ok(reads.includes('world'))
})
