import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const upstreamPath = join(root, 'upstream', 'index.js')
let code = readFileSync(upstreamPath, 'utf8').replace(/\r\n/g, '\n')
const opening = '(function () {'
const closing = '})();'
if (!code.includes(opening) || !code.trimEnd().endsWith(closing)) throw new Error('Upstream entry shape changed')
code = code.replace(opening, 'export function startEchoChamber() {')
code = code.replace(/\}\);\(\);\s*$/, '}')
if (code.trimEnd().endsWith(closing)) code = code.slice(0, code.lastIndexOf(closing)) + '}'

// Keep the upstream implementation intact apart from its SillyTavern host edges.
code = code.replace(/(?<![.\w])fetch\(/g, 'globalThis.echoBridgeFetch(')
code = code.replace('async function generateDiscordChat(showOverlay = false) {',
  'async function generateDiscordChat(showOverlay = false) {\n        await globalThis.echoBridgeRefresh();')
code = code.replace('async function generateSingleReply(replyText, targetUsername) {',
  'async function generateSingleReply(replyText, targetUsername) {\n        await globalThis.echoBridgeRefresh();')
code = code.replaceAll('quietToLoud: false', 'signal: abortController?.signal, quietToLoud: false')
code = code.replace('prompt: messagesPayload,\n                        signal:', 'prompt: messagesPayload, maxTokens: maxTok,\n                        signal:')

const layoutStart = code.indexOf('    function updateApplyLayout() {')
const layoutEnd = code.indexOf('    function updatePanelIcons() {', layoutStart)
if (layoutStart < 0 || layoutEnd < 0) throw new Error('Upstream layout function changed')
code = code.slice(0, layoutStart) + `    function updateApplyLayout() {
        if (!discordBar) return;
        discordBar.toggle(settings.enabled !== false);
        discordBar.removeClass('ec_top ec_bottom ec_left ec_right ec_collapsed');
        discordBar.addClass('ec_' + (settings.position || 'bottom'));
        discordBar.toggleClass('ec_collapsed', !!settings.collapsed);
        discordBar.toggleClass('ec_disabled', !!settings.paused);
        globalThis.echoBridgePlacePanel(discordBar[0], settings);
        discordContent.css('height', (settings.chatHeight || 250) + 'px');
        updatePanelIcons();
    }

` + code.slice(layoutEnd)

const captureStart = code.indexOf('                    // Temporarily intercept fetch to capture the raw API response.')
const captureEnd = code.indexOf('                } else {\n                    throw new Error(\'generateRaw not available in context\');', captureStart)
if (captureStart < 0 || captureEnd < 0) throw new Error('Upstream generateRaw block changed')
code = code.slice(0, captureStart) + `                    result = await generateRaw({ prompt: messages, maxTokens: calculatedMaxTokens, signal: abortController?.signal, quietToLoud: false });
` + code.slice(captureEnd)

mkdirSync(join(root, 'build'), { recursive: true })
writeFileSync(join(root, 'build', 'upstream-entry.js'), code)

let icons = ['fontawesome.min.css', 'solid.min.css']
  .map(name => readFileSync(join(root, 'node_modules', '@fortawesome', 'fontawesome-free', 'css', name), 'utf8'))
  .join('\n')
icons = icons.replace(/,url\([^)]*\.ttf\)\s*format\("truetype"\)/g, '')
icons = icons.replace(/url\((['"]?)(\.\.\/webfonts\/[^)'"?#]+)\1\)/g, (_, _quote, url) => {
  const file = join(root, 'node_modules', '@fortawesome', 'fontawesome-free', 'webfonts', url.split('/').at(-1))
  const bytes = readFileSync(file)
  const mime = url.endsWith('.woff2') ? 'font/woff2' : 'font/woff'
  return `url(data:${mime};base64,${bytes.toString('base64')})`
})
writeFileSync(join(root, 'build', 'icons.css'), icons)

await build({
  entryPoints: [join(root, 'src', 'frontend.js')], outfile: join(root, 'dist', 'frontend.js'),
  bundle: true, format: 'esm', target: 'es2022', platform: 'browser',
  loader: { '.css': 'text', '.html': 'text' }, legalComments: 'none',
})
await build({
  entryPoints: [join(root, 'src', 'backend.js')], outfile: join(root, 'dist', 'backend.js'),
  bundle: true, format: 'esm', target: 'es2022', platform: 'browser', legalComments: 'none',
})
console.log('Built upstream EchoChamber with Lumiverse bridges.')
