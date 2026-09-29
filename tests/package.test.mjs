import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')

test('Spindle manifest declares the extension entries and required API permissions', () => {
  const manifest = JSON.parse(read('spindle.json'))
  assert.equal(manifest.identifier, 'echochamber_lumiverse')
  assert.equal(manifest.entry_backend, 'dist/backend.js')
  assert.equal(manifest.entry_frontend, 'dist/frontend.js')
  for (const permission of ['generation', 'chats', 'chat_mutation', 'ui_panels', 'cors_proxy', 'characters', 'personas', 'world_books']) {
    assert.ok(manifest.permissions.includes(permission), permission)
  }
})

test('all upstream style prompts are shipped', () => {
  const prompts = readdirSync(new URL('chat-styles/', root)).filter(name => name.endsWith('.md'))
  assert.equal(prompts.length, 14)
  const bundled = read('dist/styles.js')
  for (const name of prompts) assert.ok(bundled.includes(name.slice(0, -3)), name)
})

test('frontend entry has no relative imports because Lumiverse loads it as a Blob URL', () => {
  const frontend = read('dist/frontend.js')
  assert.doesNotMatch(frontend, /\b(?:import|export)\s+[^;\n]*?\bfrom\s*['"]\./)
  assert.doesNotMatch(frontend, /\bimport\s*\(\s*['"]\./)
})
