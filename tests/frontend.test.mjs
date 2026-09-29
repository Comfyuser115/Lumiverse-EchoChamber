import test from 'node:test'
import assert from 'node:assert/strict'
import { appendFormatted, setup } from '../dist/frontend.js'

class Node {
  constructor(tag = '#text', value = '') {
    this.tagName = tag
    this.children = []
    this.value = value
    this.dataset = {}
    this.style = { setProperty() {} }
    this.classList = { add() {} }
    this.listeners = new Map()
    this.attributes = {}
    this.scrollHeight = 0
    this.scrollTop = 0
    this.clientHeight = 0
  }
  set textContent(value) { this.children = [new Node('#text', String(value))] }
  get textContent() { return this.tagName === '#text' ? this.value : this.children.map(x => x.textContent).join('') }
  append(...nodes) { for (const node of nodes) { node.remove(); node.parent = this; this.children.push(node) } }
  replaceChildren(...nodes) { for (const node of this.children) node.parent = null; this.children = []; this.append(...nodes) }
  prepend(...nodes) { for (const node of nodes.reverse()) { node.remove(); node.parent = this; this.children.unshift(node) } }
  remove() { if (this.parent) { this.parent.children = this.parent.children.filter(node => node !== this); this.parent = null } }
  setAttribute(name, value) { this.attributes[name] = value }
  addEventListener(name, handler) { this.listeners.set(name, handler) }
  click() { this.listeners.get('click')?.({ preventDefault() {} }) }
  focus() {}
  setSelectionRange() {}
}
globalThis.document = {
  createElement: tag => new Node(tag),
  createTextNode: value => new Node('#text', value),
}
function walk(node, predicate, result = []) {
  if (predicate(node)) result.push(node)
  for (const child of node.children) walk(child, predicate, result)
  return result
}
function harness() {
  let receive
  const sent = [], docks = [], floats = []
  const events = new Map()
  const root = new Node('root')
  const ctx = {
    dom: { addStyle: () => () => {} },
    ui: {
      registerDrawerTab: () => ({ root, activate() {}, destroy() {} }),
      requestDockPanel(options) {
        const panel = { options, root: new Node('dock'), destroy() {} }
        docks.push(panel); return panel
      },
      createFloatWidget(options) {
        const panel = { options, root: new Node('float'), destroy() {} }
        floats.push(panel); return panel
      },
    },
    sendToBackend: message => sent.push(message),
    onBackendMessage: callback => { receive = callback; return () => {} },
    events: { on: (name, callback) => { events.set(name, callback); return () => {} } },
  }
  const dispose = setup(ctx)
  return { sent, docks, floats, root, events, receive: message => receive(message), dispose }
}

test('reaction markdown renders formatting as nodes without interpreting HTML', () => {
  const root = new Node('root')
  const code = String.fromCharCode(96)
  appendFormatted(root, '**bold** *italic* __underline__ ' + code + 'code' + code + ' <u>under</u> <script>alert(1)</script> @viewer')
  assert.deepEqual(walk(root, n => ['strong', 'em', 'u', 'code'].includes(n.tagName)).map(n => n.tagName),
    ['strong', 'em', 'u', 'code', 'u'])
  assert.equal(walk(root, n => n.tagName === 'script').length, 0)
  assert.match(root.textContent, /<script>alert\(1\)<\/script>/)
  assert.equal(walk(root, n => n.className === 'ec-mention').length, 1)
})

test('Spindle placement requests each edge and a floating widget', () => {
  const app = harness()
  assert.deepEqual(app.sent[0], { type: 'hydrate' })
  app.receive({ type: 'state', chatId: 'chat-1', settings: { position: 'drawer' }, styles: ['discordtwitch'], items: [] })
  for (const edge of ['top', 'bottom', 'left', 'right']) {
    app.receive({ type: 'settings', settings: { position: edge } })
    assert.equal(app.docks.at(-1).options.edge, edge)
    assert.equal(app.docks.at(-1).options.respectRequestedEdge, true)
    assert.equal(walk(app.root, node => node.className?.split(' ').includes('ec-sidebar')).length, 1)
    assert.equal(walk(app.root, node => node.tagName === 'label' && node.textContent.startsWith('Backend')).length > 0, true)
    assert.equal(walk(app.root, node => node.className === 'ec-row').length, 0)
  }
  app.receive({ type: 'settings', settings: { position: 'float' } })
  assert.equal(app.floats.length, 1)
  assert.equal(app.floats[0].options.resizable, true)
  walk(app.root, node => node.tagName === 'button' && node.textContent === 'Show feed here')[0].click()
  assert.equal(app.sent.at(-1).settings.position, 'drawer')
  assert.equal(walk(app.root, node => node.className?.split(' ').includes('ec-sidebar')).length, 0)
  assert.equal(walk(app.root, node => node.className === 'ec-shell').length, 1)
  app.dispose()
})

test('quick controls send settings, stop, and audience reply with a mention', () => {
  const app = harness()
  app.receive({ type: 'state', chatId: 'chat-1', settings: { position: 'drawer' }, styles: ['discordtwitch'], items: [{ name: 'Alice', text: 'Hello' }] })
  const buttons = walk(app.root, node => node.tagName === 'button')
  buttons.find(node => node.textContent === '↻ Regenerate').click()
  assert.deepEqual(app.sent.at(-1), { type: 'generate' })
  app.receive({ type: 'busy', chatId: 'chat-1', value: true })
  buttons.find(node => node.textContent === '■ Stop').click()
  assert.deepEqual(app.sent.at(-1), { type: 'cancel' })
  app.receive({ type: 'busy', chatId: 'chat-1', value: false })
  const name = walk(app.root, node => node.className === 'ec-name')[0]
  name.click()
  const reply = walk(app.root, node => node.attributes['aria-label'] === 'Message the audience')[0]
  assert.equal(reply.value, '@Alice ')
  reply.value += 'hi'
  buttons.find(node => node.textContent === 'Send').click()
  assert.deepEqual(app.sent.at(-1), { type: 'reply', text: '@Alice hi' })
  app.dispose()
})

test('model selector switches EchoChamber to a chosen Lumiverse profile and can refresh profiles', () => {
  const app = harness()
  app.receive({ type: 'state', chatId: 'chat-1', settings: { position: 'drawer', source: 'lumiverse' },
    connections: [
      { id: 'main', name: 'Main RP', model: 'expensive-model', provider: 'openai', isDefault: true },
      { id: 'audience', name: 'Audience', model: 'cheap-model', provider: 'openai' },
    ], items: [] })
  const selector = walk(app.root, node => node.attributes['aria-label'] === 'EchoChamber Lumiverse connection')[0]
  assert.match(selector.children[2].textContent, /cheap-model/)
  selector.value = 'audience'
  selector.listeners.get('change')()
  assert.equal(app.sent.at(-1).settings.connectionId, 'audience')
  assert.equal(app.sent.at(-1).settings.source, 'lumiverse')
  walk(app.root, node => node.tagName === 'button' && node.textContent === 'Refresh connections')[0].click()
  assert.deepEqual(app.sent.at(-1), { type: 'connections_refresh' })
  app.dispose()
})

test('built-in style editing requests its prompt and saves an override', () => {
  const app = harness()
  app.receive({ type: 'state', chatId: 'chat-1', settings: { position: 'drawer' }, styles: ['discordtwitch'], items: [] })
  const edit = walk(app.root, node => node.tagName === 'button' && node.textContent === 'Edit')[0]
  edit.click()
  assert.deepEqual(app.sent.at(-1), { type: 'get_style', id: 'ao3wattpad' })
  app.receive({ type: 'style_definition', id: 'ao3wattpad', prompt: 'Original prompt' })
  const prompt = walk(app.root, node => node.attributes['aria-label'] === 'Style prompt')[0]
  assert.equal(prompt.value, 'Original prompt')
  prompt.value = 'New audience prompt'
  walk(app.root, node => node.tagName === 'button' && node.textContent === 'Save style')[0].click()
  assert.equal(app.sent.at(-1).settings.styleOverrides.ao3wattpad, 'New audience prompt')
  app.dispose()
})

test('on-message live mode reacts to user messages and manual mode stays idle', () => {
  const app = harness()
  app.receive({ type: 'state', chatId: 'chat-1', settings: {
    livestream: true, livestreamMode: 'manual', includeUserInput: true,
  }, items: [] })
  const initial = app.sent.length
  app.events.get('MESSAGE_SENT')({ chatId: 'chat-1', message: { is_user: true } })
  assert.equal(app.sent.length, initial)
  app.receive({ type: 'settings', settings: {
    livestream: true, livestreamMode: 'onMessage', includeUserInput: true,
  } })
  app.events.get('MESSAGE_SENT')({ chatId: 'chat-1', message: { is_user: true } })
  assert.deepEqual(app.sent.at(-1), { type: 'generate' })
  app.dispose()
})

test('chat switch cancels generation before loading the new feed', () => {
  const app = harness()
  app.receive({ type: 'state', chatId: 'chat-1', settings: { position: 'drawer' }, items: [] })
  app.receive({ type: 'busy', chatId: 'chat-1', value: true })
  app.events.get('CHAT_SWITCHED')({ chatId: 'chat-2' })
  assert.deepEqual(app.sent.slice(-2), [{ type: 'cancel' }, { type: 'chat', chatId: 'chat-2' }])
  app.receive({ type: 'chat', chatId: 'chat-2', items: [] })
  const generate = walk(app.root, node => node.tagName === 'button' && node.textContent === '↻ Regenerate')[0]
  assert.ok(generate)
  app.dispose()
})
