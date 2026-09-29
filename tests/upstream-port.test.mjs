import assert from 'node:assert/strict'
import { test } from 'node:test'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:7860/' })
globalThis.window = dom.window
globalThis.document = dom.window.document
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator })
globalThis.HTMLElement = dom.window.HTMLElement
dom.window.HTMLElement.prototype.scrollTo = () => {}
globalThis.MutationObserver = dom.window.MutationObserver
globalThis.DOMException = dom.window.DOMException
globalThis.Response = Response
dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
dom.window.requestAnimationFrame = callback => setTimeout(callback, 0)
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame

const { setup } = await import('../dist/frontend.js')
const backendCalls = []
const eventHandlers = new Map()
let backendHandler
let generated = 0
const dockEdges = []
const activeSnapshot = {
  chatId: 'synthetic-chat',
  chat: [{ mes: 'A synthetic scene unfolds.', message: 'A synthetic scene unfolds.', is_user: false, is_system: false, name: 'Character', extra: {} }],
  personaName: 'User', characterName: 'Character', characterId: 'synthetic-character',
  profiles: [{ id: 'conn2', name: 'Cheaper model', model: 'small-model', provider: 'openrouter' }],
  details: {},
}
const ctx = {
  dom: { addStyle: () => () => {} },
  ui: {
    registerDrawerTab() { const root = document.createElement('div'); document.body.append(root); return { root, destroy() { root.remove() } } },
    registerSettingsTab() { const root = document.createElement('div'); return { root, destroy() { root.remove() } } },
    requestDockPanel(options) { dockEdges.push(options.edge); const root = document.createElement('div'); queueMicrotask(() => document.body.append(root)); return { root, destroy() { root.remove() } } },
  },
  onBackendMessage(handler) { backendHandler = handler; return () => { backendHandler = null } },
  sendToBackend(payload) {
    backendCalls.push(payload)
    if (payload.type !== 'bridge_request') return
    let result
    if (payload.action === 'hydrate') result = { settings: { source: 'profile', preset: 'conn2' }, snapshot: activeSnapshot }
    else if (payload.action === 'snapshot') result = activeSnapshot
    else if (payload.action === 'generate') { generated++; result = { content: 'Viewer: That was a moment.' } }
    else if (payload.action === 'save_settings') result = true
    else throw new Error(`Unexpected action: ${payload.action}`)
    queueMicrotask(() => backendHandler?.({ type: 'bridge_response', id: payload.id, result }))
  },
  events: { on(name, handler) { eventHandlers.set(name, handler); return () => eventHandlers.delete(name) } },
}

async function settle() { await new Promise(resolve => setTimeout(resolve, 60)) }

test('upstream EchoChamber initializes its settings, panel, profiles, and regeneration in Lumiverse', async () => {
  const teardown = setup(ctx)
  await settle()
  assert.ok(document.querySelector('#discordBar'), 'upstream panel mounted')
  assert.ok(document.querySelector('#discord_source'), 'upstream settings mounted')
  assert.equal(document.querySelector('#discord_source').value, 'profile')
  assert.ok([...document.querySelectorAll('#discord_preset_select option')].some(option => option.value === 'conn2'))
  assert.ok(document.querySelector('#discordContent'), 'upstream feed mounted')

  const regenerate = document.querySelector('.ec_btn[title="Regenerate Chat"]')
  assert.ok(regenerate, 'upstream regenerate control mounted')
  regenerate.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  await settle()
  assert.equal(generated, 1)
  assert.ok(document.querySelector('#discordContent').textContent.includes('Viewer'))

  document.querySelector('.ec_btn[title="Settings"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  assert.ok(document.querySelector('#ec_settings_modal'), 'upstream settings modal opens')
  document.querySelector('#discord_open_style_editor').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  assert.ok(document.querySelector('#ec_style_editor_modal'), 'upstream style manager opens')

  document.querySelector('#ec_live_indicator').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  await settle()
  assert.equal(document.querySelector('#discord_livestream').checked, true, 'upstream live control works')
  document.querySelector('#ec_live_indicator').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  await settle()
  assert.equal(document.querySelector('#discord_livestream').checked, false, 'live control turns off')

  const reply = document.querySelector('#ec_reply_field')
  const beforeReply = generated
  reply.value = 'Hello @Viewer'
  document.querySelector('#ec_reply_submit').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  await settle()
  assert.equal(generated, beforeReply + 1, 'upstream chat participation calls selected model')

  for (const edge of ['top', 'left', 'right', 'bottom']) {
    const position = document.querySelector('#discord_position')
    position.value = edge
    position.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
    await settle()
    assert.equal(dockEdges.at(-1), edge)
  }
  const popout = document.querySelector('.ec_layout_menu .ec_menu_item[data-val="popout"]')
  assert.ok(popout, 'upstream pop-out control is present')
  popout.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  assert.ok(document.querySelector('#ec_floating_panel'), 'upstream floating panel opens')
  teardown()
})
