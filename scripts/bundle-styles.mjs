import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'chat-styles')
const destination = join(root, 'dist', 'styles.js')
const files = readdirSync(source).filter(name => name.endsWith('.md')).sort()
const styles = Object.fromEntries(files.map(name => [
  basename(name, '.md'), readFileSync(join(source, name), 'utf8').replace(/^\uFEFF/, ''),
]))

writeFileSync(destination, `export const styles = ${JSON.stringify(styles)};\n`, 'utf8')
console.log(`Bundled ${files.length} styles.`)
