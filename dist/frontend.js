const STYLE_LABELS = {
  ao3wattpad: 'AO3 / Wattpad', breakingnews: 'Breaking News', darkroast: 'Dark Roast',
  discordtwitch: 'Discord / Twitch', doomscrollers: 'Doomscrollers', dumbanddumber: 'Dumb & Dumber',
  hypebot: 'HypeBot', mst3k: 'MST3K', nsfwava: 'Ava', nsfwkai: 'Kai',
  sillytavern_story: 'Story cast', sillytavern: 'Roleplay cast', thoughtfulverbose: 'Thoughtful', twitterx: 'Twitter / X',
}
const POSITIONS = ['drawer', 'bottom', 'top', 'left', 'right', 'float']
const DEFAULTS = {
  enabled: true, auto: false, style: 'discordtwitch', count: 5, depth: 4, maxTokens: 700,
  position: 'bottom', source: 'lumiverse', livestream: false, livestreamBatchSize: 20,
  livestreamMinWait: 5, livestreamMaxWait: 60, livestreamAutoScroll: true,
  livestreamMode: 'manual', customStyles: {}, styleOverrides: {}, styleOrder: [],
  panelWidth: 350, panelHeight: 250, panelOpacity: 85, fontSize: 15,
  collapsed: false, messageOrder: 'oldest-first', deletedStyles: [],
  chatEnabled: true, chatUsername: 'Streamer (You)', chatAvatarColor: '#3b82f6', chatReplyCount: 3,
  autoUpdateOnMessages: true, includeUserInput: false, includePastEchoChambers: false,
}
const css = `
.ec-shell{--ec-border:var(--lumiverse-border,var(--border-color,#454856));--ec-bg:var(--lumiverse-fill,var(--background-primary,#1b1d25));--ec-surface:var(--lumiverse-fill-subtle,var(--background-secondary,#292c36));--ec-text:var(--lumiverse-text,var(--text-primary,#eee));--ec-muted:var(--lumiverse-text-muted,var(--text-muted,#a5a8b2));--ec-accent:var(--lumiverse-accent,var(--accent-color,#73c9d9));display:flex;flex-direction:column;min-height:0;height:100%;background:var(--ec-bg);color:var(--ec-text);font:var(--ec-font-size,13px)/1.4 system-ui,sans-serif;opacity:var(--ec-opacity,1)}
.ec-head,.ec-quick,.ec-foot,.ec-actions{display:flex;align-items:center;gap:6px}.ec-head{padding:8px;border-bottom:1px solid var(--ec-border);flex-wrap:wrap}.ec-title{font-size:15px;font-weight:750;margin-right:auto}.ec-quick{padding:6px 8px;border-bottom:1px solid var(--ec-border);flex-wrap:wrap}.ec-quick label{display:flex;align-items:center;gap:4px}.ec-quick input[type=number]{width:48px}
.ec-shell button,.ec-shell select,.ec-shell input,.ec-shell textarea{font:inherit}.ec-shell button{border:1px solid var(--ec-border);border-radius:6px;background:var(--ec-surface);color:inherit;padding:5px 7px;cursor:pointer}.ec-shell button:hover{filter:brightness(1.15)}.ec-shell button:disabled{opacity:.45;cursor:default}.ec-shell button[aria-pressed=true]{border-color:var(--ec-accent);color:var(--ec-accent)}
.ec-shell input,.ec-shell select,.ec-shell textarea{min-width:0;border:1px solid var(--ec-border);border-radius:6px;background:var(--ec-surface);color:inherit;padding:5px 7px}.ec-shell textarea{resize:vertical;width:100%;box-sizing:border-box}.ec-shell :is(button,input,select,textarea):focus-visible{outline:2px solid var(--ec-accent);outline-offset:2px}.ec-quick select{max-width:150px}
.ec-status{min-height:18px;padding:2px 10px;color:var(--ec-muted);font-size:11px}.ec-status[data-error=true]{color:#ef727a}.ec-list{flex:1;min-height:90px;overflow:auto;padding:4px 10px;overscroll-behavior:contain}.ec-empty{color:var(--ec-muted);padding:18px 4px;text-align:center}
.ec-row{display:flex;gap:8px;align-items:flex-start;padding:7px 2px;border-bottom:1px solid var(--ec-border)}.ec-avatar{flex:none;width:27px;height:27px;display:grid;place-items:center;border-radius:50%;font-weight:700;font-size:11px;color:white}.ec-copy{min-width:0;overflow-wrap:anywhere;white-space:pre-wrap}.ec-name{padding:0!important;background:transparent!important;border:0!important;font-weight:700;color:var(--ec-accent)!important;margin-right:5px}.ec-row[data-mine=true] .ec-name{color:var(--ec-user-color,#3b82f6)!important}.ec-message code{background:var(--ec-surface);border-radius:3px;padding:1px 3px}.ec-message u{text-decoration:underline}.ec-message .ec-mention{color:var(--ec-accent);font-weight:600}
.ec-foot{padding:8px;border-top:1px solid var(--ec-border)}.ec-compose{display:flex;gap:6px;width:100%;position:relative}.ec-compose input{flex:1}.ec-mentions{position:absolute;bottom:100%;left:0;right:0;max-height:160px;overflow:auto;background:var(--ec-surface);border:1px solid var(--ec-border);border-radius:6px;z-index:2}.ec-mentions[hidden]{display:none}.ec-mentions button{display:block;width:100%;text-align:left;border:0;border-radius:0}
.ec-options{display:none;overflow:auto;min-height:0;max-height:48%;padding:8px;border-top:1px solid var(--ec-border);gap:8px;grid-template-columns:repeat(2,minmax(0,1fr))}.ec-options[data-open=true]{display:grid}.ec-options label{display:flex;flex-direction:column;gap:3px}.ec-options label.ec-inline{flex-direction:row;align-items:center}.ec-options input[type=number]{width:100%;box-sizing:border-box}.ec-wide{grid-column:1/-1}.ec-actions{flex-wrap:wrap}.ec-style-list{display:flex;flex-direction:column;gap:5px;max-height:145px;overflow:auto}.ec-style-row{display:flex;align-items:center;gap:5px}.ec-style-row span{flex:1}.ec-style-editor{display:none;gap:6px}.ec-style-editor[data-open=true]{display:grid}.ec-style-editor textarea{min-height:105px}.ec-shell[data-collapsed=true] .ec-list,.ec-shell[data-collapsed=true] .ec-foot,.ec-shell[data-collapsed=true] .ec-options,.ec-shell[data-collapsed=true] .ec-status{display:none!important}.ec-dock .ec-shell{min-height:240px}.ec-float .ec-shell{min-height:240px;border:1px solid var(--ec-border);border-radius:8px;overflow:hidden}
.ec-sidebar .ec-options{display:grid;max-height:none;flex:1;border-top:0}.ec-sidebar .ec-head{flex:none}
`

function element(tag, className = '', text = null) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}
function button(label, title = label) {
  const node = element('button', '', label)
  node.type = 'button'; node.title = title
  return node
}
function input(type, value = '') {
  const node = element('input'); node.type = type; node.value = value
  return node
}
function option(value, label) {
  const node = element('option', '', label); node.value = value; return node
}
function field(label, control, wide = false) {
  const row = element('label', wide ? 'ec-wide' : '', label)
  row.append(control)
  return row
}
function clamp(value, fallback, min, max) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback
}
function avatarColor(name) {
  let hash = 0
  for (const char of name) hash = ((hash << 5) - hash + char.codePointAt(0)) | 0
  return `hsl(${Math.abs(hash) % 360} 44% 36%)`
}
function namesFrom(items) {
  return [...new Set(items.map(item => String(item.name || '').trim()).filter(Boolean))].slice(-80)
}
export function appendFormatted(parent, raw) {
  const text = String(raw || '').slice(0, 5000)
  // Build DOM nodes from text; generated content is never interpreted as HTML.
  const append = (target, value, depth = 0) => {
    if (depth > 5) { target.append(document.createTextNode(value)); return }
    const expression = /(\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|_([^_\n]+)_|\`([^\`\n]+)\`|<u>([^\n]*?)<\/u>|@[\w.-]{1,40})/g
    let index = 0, match
    while ((match = expression.exec(value))) {
      if (match.index > index) target.append(document.createTextNode(value.slice(index, match.index)))
      const token = match[0]
      if (token.startsWith('@')) target.append(element('span', 'ec-mention', token))
      else {
        const tag = token.startsWith('**') ? 'strong' : token.startsWith('__') || token.startsWith('<u>') ? 'u' : token.startsWith('`') ? 'code' : 'em'
        const content = token.startsWith('<u>') ? match[7] : token.startsWith('**') ? match[2] : token.startsWith('__') ? match[3] : token.startsWith('`') ? match[6] : token.slice(1, -1)
        const node = element(tag)
        if (tag === 'code') node.textContent = content
        else append(node, content, depth + 1)
        target.append(node)
      }
      index = match.index + token.length
    }
    if (index < value.length) target.append(document.createTextNode(value.slice(index)))
  }
  append(parent, text)
}
function validStyleId(value) { return /^[a-z][a-z0-9_-]{0,47}$/.test(value) }
function normalizedStyle(value) {
  if (!value || typeof value !== 'object') return null
  const name = String(value.name || '').trim().slice(0, 80)
  const prompt = String(value.prompt || '').trim().slice(0, 20000)
  return name && prompt ? { name, prompt } : null
}

export function setup(ctx) {
  const removeStyle = ctx.dom.addStyle(css)
  const tab = ctx.ui.registerDrawerTab({
    id: 'echochamber', title: 'EchoChamber', shortName: 'Echo', headerTitle: 'EchoChamber',
    description: 'AI audience reactions to the current chat', keywords: ['audience', 'reactions', 'chat'],
    iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12h5"/></svg>',
  })
  const shell = element('section', 'ec-shell')
  shell.setAttribute('aria-label', 'EchoChamber audience')
  const sidebar = element('section', 'ec-shell ec-sidebar')
  sidebar.setAttribute('aria-label', 'EchoChamber settings')
  const sidebarHead = element('div', 'ec-head')
  sidebarHead.append(element('strong', 'ec-title', 'EchoChamber settings'))
  const showInSidebar = button('Show feed here')
  sidebarHead.append(showInSidebar)
  sidebar.append(sidebarHead)
  const head = element('div', 'ec-head')
  const title = element('strong', 'ec-title', 'EchoChamber')
  const powerButton = button('●', 'Enable or disable EchoChamber')
  const liveButton = button('Go live', 'Start or stop livestream')
  const pauseButton = button('Pause', 'Pause livestream')
  const collapseButton = button('▾', 'Collapse EchoChamber')
  const optionsButton = button('⚙', 'Settings')
  head.append(title, powerButton, liveButton, pauseButton, collapseButton, optionsButton)
  const quick = element('div', 'ec-quick')
  const styleSelect = element('select'); styleSelect.setAttribute('aria-label', 'Audience style')
  const count = input('number'); count.min = '1'; count.max = '20'; count.setAttribute('aria-label', 'Audience size')
  const countLabel = element('label', '', 'Viewers'); countLabel.append(count)
  const generateButton = button('↻ Regenerate', 'Generate reactions')
  const autoButton = button('Auto off', 'Toggle reactions after replies')
  const quickPosition = element('select'); quickPosition.setAttribute('aria-label', 'Panel position')
  for (const place of POSITIONS) quickPosition.append(option(place, place[0].toUpperCase() + place.slice(1)))
  const fontDown = button('A−', 'Decrease font size')
  const fontUp = button('A+', 'Increase font size')
  const quickClear = button('Clear', 'Clear reactions in this chat')
  quick.append(styleSelect, countLabel, generateButton, autoButton, quickPosition, fontDown, fontUp, quickClear)
  const status = element('div', 'ec-status', 'Loading…'); status.setAttribute('role', 'status')
  const list = element('div', 'ec-list'); list.setAttribute('role', 'log'); list.setAttribute('aria-label', 'Audience reactions')
  const foot = element('div', 'ec-foot')
  const compose = element('div', 'ec-compose')
  const replyInput = input('text'); replyInput.placeholder = 'Message the audience… use @name'; replyInput.setAttribute('aria-label', 'Message the audience')
  const mentions = element('div', 'ec-mentions'); mentions.hidden = true
  const sendButton = button('Send')
  compose.append(replyInput, sendButton, mentions); foot.append(compose)
  const options = element('div', 'ec-options')
  const position = element('select')
  for (const place of POSITIONS) position.append(option(place, place[0].toUpperCase() + place.slice(1)))
  const source = element('select')
  for (const [id, label] of [['lumiverse', 'Lumiverse connection'], ['ollama', 'Ollama'], ['openai', 'OpenAI-compatible']]) source.append(option(id, label))
  const connection = element('select'); connection.append(option('', 'Current connection'))
  const ollamaUrl = input('url'); ollamaUrl.placeholder = 'http://localhost:11434'
  const ollamaModel = input('text'); ollamaModel.placeholder = 'Model name'
  const openaiUrl = input('url'); openaiUrl.placeholder = 'http://localhost:1234/v1'
  const openaiModel = input('text'); openaiModel.placeholder = 'Model name'
  const openaiPreset = element('select')
  openaiPreset.append(option('', 'Custom endpoint'), option('http://localhost:1234/v1', 'LM Studio'),
    option('http://localhost:5001/v1', 'KoboldCPP'), option('http://localhost:8000/v1', 'vLLM'))
  const apiKey = input('password'); apiKey.placeholder = 'API key (stored by backend)'
  const saveKeyButton = button('Save key')
  const clearKeyButton = button('Clear key')
  const keyRow = element('div', 'ec-wide ec-actions'); keyRow.append(apiKey, saveKeyButton, clearKeyButton)
  const depth = input('number'); depth.min = '1'; depth.max = '30'
  const tokens = input('number'); tokens.min = '100'; tokens.max = '3000'
  const batch = input('number'); batch.min = '1'; batch.max = '20'
  const minWait = input('number'); minWait.min = '1'; minWait.max = '300'
  const maxWait = input('number'); maxWait.min = '1'; maxWait.max = '300'
  const width = input('number'); width.min = '240'; width.max = '1000'
  const height = input('number'); height.min = '180'; height.max = '1000'
  const opacity = input('number'); opacity.min = '20'; opacity.max = '100'
  const fontSize = input('number'); fontSize.min = '10'; fontSize.max = '24'
  const messageOrder = element('select'); messageOrder.append(option('oldest-first', 'Oldest first'), option('newest-first', 'Newest first'))
  const liveMode = element('select'); liveMode.append(option('manual', 'Manual refresh'), option('onMessage', 'On chat message'), option('onComplete', 'Continuous'))
  const autoScroll = input('checkbox')
  const autoScrollLabel = element('label', 'ec-inline ec-wide', 'Auto-scroll live feed'); autoScrollLabel.prepend(autoScroll)
  const autoUpdate = input('checkbox')
  const autoUpdateLabel = element('label', 'ec-inline ec-wide', 'Update after assistant messages'); autoUpdateLabel.prepend(autoUpdate)
  const includeUser = input('checkbox')
  const includeUserLabel = element('label', 'ec-inline ec-wide', 'Include user messages'); includeUserLabel.prepend(includeUser)
  const includePast = input('checkbox')
  const includePastLabel = element('label', 'ec-inline ec-wide', 'Include prior audience feed in prompt'); includePastLabel.prepend(includePast)
  const markdown = input('checkbox')
  const markdownLabel = element('label', 'ec-inline ec-wide', 'Render Markdown reactions'); markdownLabel.prepend(markdown)
  const contextOptions = [
    ['includePersona', 'Include persona'], ['includeAuthorsNote', 'Include author note'],
    ['includeCharacterDescription', 'Include character description'],
    ['includeSummary', 'Include summary'], ['includeWorldInfo', 'Include world info'],
  ].map(([key, label]) => {
    const control = input('checkbox')
    const row = element('label', 'ec-inline ec-wide', label); row.prepend(control)
    return { key, control, row }
  })
  const wiBudget = input('number'); wiBudget.min = '0'; wiBudget.max = '16000'
  const chatEnabled = input('checkbox')
  const chatEnabledLabel = element('label', 'ec-inline ec-wide', 'Allow audience chat'); chatEnabledLabel.prepend(chatEnabled)
  const chatUsername = input('text'); chatUsername.maxLength = 48
  const chatAvatarColor = input('color')
  const chatReplyCount = input('number'); chatReplyCount.min = '1'; chatReplyCount.max = '20'
  options.append(
    field('Panel position', position), field('Backend', source), field('Lumiverse connection', connection),
    field('Ollama URL', ollamaUrl), field('Ollama model', ollamaModel),
    field('OpenAI-compatible preset', openaiPreset), field('OpenAI-compatible URL', openaiUrl),
    field('OpenAI-compatible model', openaiModel),
    field('API key', apiKey, true), keyRow,
    field('Chat turns', depth), field('Max tokens', tokens),
    field('Live batch size', batch), field('Live mode', liveMode),
    field('Min wait (seconds)', minWait), field('Max wait (seconds)', maxWait),
    autoScrollLabel, autoUpdateLabel, includeUserLabel, includePastLabel, markdownLabel,
    ...contextOptions.map(item => item.row), field('World info token budget', wiBudget),
    chatEnabledLabel, field('Your chat name', chatUsername),
    field('Your avatar color', chatAvatarColor), field('Audience replies', chatReplyCount),
    field('Message order', messageOrder),
    field('Panel width', width), field('Panel height', height),
    field('Opacity %', opacity), field('Font size', fontSize),
  )
  const styleHeading = element('strong', 'ec-wide', 'Style manager')
  const styleList = element('div', 'ec-style-list ec-wide')
  const styleActions = element('div', 'ec-actions ec-wide')
  const newStyleButton = button('New style')
  const importStyleButton = button('Import JSON')
  const exportStyleButton = button('Export JSON')
  const exportMarkdownButton = button('Export selected .md')
  const importFile = input('file'); importFile.accept = 'application/json,.json,text/markdown,.md'; importFile.hidden = true
  styleActions.append(newStyleButton, importStyleButton, exportStyleButton, exportMarkdownButton, importFile)
  const editor = element('div', 'ec-style-editor ec-wide')
  const styleId = input('text'); styleId.placeholder = 'style-id'; styleId.setAttribute('aria-label', 'Style ID')
  const styleName = input('text'); styleName.placeholder = 'Style name'; styleName.setAttribute('aria-label', 'Style name')
  const styleMode = element('select'); styleMode.append(option('easy', 'Easy mode'), option('advanced', 'Advanced prompt'))
  const styleAudience = element('textarea'); styleAudience.placeholder = 'Who is in this audience?'; styleAudience.setAttribute('aria-label', 'Audience description')
  const styleTone = input('text'); styleTone.placeholder = 'Tone (for example: witty and supportive)'; styleTone.setAttribute('aria-label', 'Audience tone')
  const stylePrompt = element('textarea'); stylePrompt.placeholder = 'Describe the audience and reaction format…'; stylePrompt.setAttribute('aria-label', 'Style prompt')
  const editorActions = element('div', 'ec-actions')
  const saveStyleButton = button('Save style')
  const cancelStyleButton = button('Cancel')
  editorActions.append(saveStyleButton, cancelStyleButton)
  editor.append(styleId, styleName, styleMode, styleAudience, styleTone, stylePrompt, editorActions)
  const clearButton = button('Clear this feed')
  clearButton.className = 'ec-wide'
  options.append(styleHeading, styleList, styleActions, editor, clearButton)
  shell.append(head, quick, status, list, options, foot)
  tab.root.append(shell)

  let placement = null
  let chatId = null
  let busy = false
  let settings = { ...DEFAULTS }
  let items = []
  let shown = 0
  let styles = Object.keys(STYLE_LABELS)
  let connections = []
  let alive = true
  let paused = false
  let timer = null
  let revealTimer = null
  let lastGenerationId = null
  let editorId = null
  let pendingExportId = null
  const clearTimer = () => { if (timer != null) clearTimeout(timer); timer = null }
  const clearReveal = () => { if (revealTimer != null) clearTimeout(revealTimer); revealTimer = null }
  function setStatus(message, error = false) { status.textContent = message; status.dataset.error = String(error) }
  function orderedStyles() {
    const hidden = new Set(settings.deletedStyles || [])
    const available = [...new Set([...Object.keys(STYLE_LABELS), ...styles, ...Object.keys(settings.customStyles || {})])].filter(id => !hidden.has(id))
    const order = Array.isArray(settings.styleOrder) ? settings.styleOrder : []
    return [...new Set([...order.filter(id => available.includes(id)), ...available])]
  }
  function styleLabel(id) { return settings.customStyles?.[id]?.name || STYLE_LABELS[id] || id }
  function renderStyles() {
    const ids = orderedStyles()
    styleSelect.replaceChildren(...ids.map(id => option(id, styleLabel(id))))
    styleSelect.value = settings.style
    styleList.replaceChildren()
    const all = [...new Set([...ids, ...Object.keys(STYLE_LABELS), ...Object.keys(settings.customStyles || {})])]
    for (const [index, id] of all.entries()) {
      const row = element('div', 'ec-style-row')
      row.draggable = true
      row.addEventListener('dragstart', event => event.dataTransfer?.setData('text/plain', id))
      row.addEventListener('dragover', event => event.preventDefault())
      row.addEventListener('drop', event => { event.preventDefault(); const from = event.dataTransfer?.getData('text/plain'); if (from) moveStyleTo(from, id) })
      const hidden = (settings.deletedStyles || []).includes(id)
      row.append(element('span', '', hidden ? `${styleLabel(id)} (hidden)` : styleLabel(id)))
      const up = button('↑', 'Move style up'); up.disabled = index === 0 || hidden
      const down = button('↓', 'Move style down'); down.disabled = index === ids.length - 1 || hidden
      up.addEventListener('click', () => moveStyle(id, -1))
      down.addEventListener('click', () => moveStyle(id, 1))
      row.append(up, down)
      const edit = button('Edit'); edit.addEventListener('click', () => openEditor(id)); row.append(edit)
      const hide = button(hidden ? 'Show' : 'Hide'); hide.addEventListener('click', () => toggleStyle(id)); row.append(hide)
      if (settings.customStyles?.[id] && !Object.hasOwn(STYLE_LABELS, id)) {
        const remove = button('Delete'); remove.addEventListener('click', () => deleteStyle(id))
        row.append(remove)
      }
      styleList.append(row)
    }
  }
  function moveStyleTo(from, to) {
    const ordered = orderedStyles(), fromIndex = ordered.indexOf(from), toIndex = ordered.indexOf(to)
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return
    ordered.splice(fromIndex, 1); ordered.splice(toIndex, 0, from)
    updateSettings({ styleOrder: ordered })
  }
  function toggleStyle(id) {
    const hidden = new Set(settings.deletedStyles || [])
    if (hidden.has(id)) hidden.delete(id)
    else hidden.add(id)
    const next = { deletedStyles: [...hidden] }
    if (hidden.has(settings.style)) next.style = orderedStyles().find(key => key !== id && !hidden.has(key)) || 'discordtwitch'
    updateSettings(next)
  }
  function moveStyle(id, offset) {
    const ordered = orderedStyles(), index = ordered.indexOf(id), target = index + offset
    if (target < 0 || target >= ordered.length) return
    ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
    updateSettings({ styleOrder: ordered })
  }
  function renderRows() {
    const wasNearEnd = list.scrollHeight - list.scrollTop - list.clientHeight < 45
    list.replaceChildren()
    if (!shown) list.append(element('p', 'ec-empty', chatId ? 'No reactions yet. Press ↻ to generate.' : 'Open a chat to start.'))
    const visible = items.slice(0, shown)
    if (settings.messageOrder === 'newest-first') visible.reverse()
    for (const item of visible) {
      const name = String(item.name || 'Viewer')
      const row = element('div', 'ec-row'); row.dataset.mine = String(item.mine === true)
      const avatar = element('span', 'ec-avatar', name.slice(0, 1).toUpperCase()); avatar.style.background = item.mine ? settings.chatAvatarColor : avatarColor(name)
      const copy = element('div', 'ec-copy')
      const nameButton = button(name, `Reply to ${name}`); nameButton.className = 'ec-name'
      nameButton.addEventListener('click', () => insertMention(name))
      const message = element('span', 'ec-message')
      if (settings.markdown === false) message.textContent = String(item.text || '')
      else appendFormatted(message, item.text)
      copy.append(nameButton, message); row.append(avatar, copy); list.append(row)
    }
    if ((settings.livestream && settings.livestreamAutoScroll && wasNearEnd) || !settings.livestream) {
      list.scrollTop = settings.messageOrder === 'newest-first' ? 0 : list.scrollHeight
    }
  }
  function renderControls() {
    shell.dataset.collapsed = String(settings.collapsed === true)
    shell.style.setProperty('--ec-opacity', String(clamp(settings.panelOpacity, 85, 20, 100) / 100))
    shell.style.setProperty('--ec-font-size', `${clamp(settings.fontSize, 15, 10, 28)}px`)
    shell.style.setProperty('--ec-user-color', /^#[0-9a-f]{6}$/i.test(settings.chatAvatarColor || '') ? settings.chatAvatarColor : '#3b82f6')
    generateButton.disabled = !chatId
    generateButton.textContent = busy ? '■ Stop' : '↻ Regenerate'
    sendButton.disabled = busy || !chatId || settings.chatEnabled === false || settings.enabled === false
    replyInput.disabled = busy || !chatId || settings.chatEnabled === false || settings.enabled === false
    powerButton.textContent = settings.enabled ? '● On' : '○ Off'
    powerButton.setAttribute('aria-pressed', String(settings.enabled))
    autoButton.textContent = settings.auto ? '● Auto on' : 'Auto off'
    autoButton.setAttribute('aria-pressed', String(settings.auto))
    liveButton.textContent = settings.livestream ? '🔴 Live' : 'Go live'
    liveButton.setAttribute('aria-pressed', String(settings.livestream))
    pauseButton.hidden = !settings.livestream
    pauseButton.textContent = paused ? 'Resume' : 'Pause'
    pauseButton.setAttribute('aria-pressed', String(paused))
    collapseButton.textContent = settings.collapsed ? '▸' : '▾'
    count.value = String(settings.count)
    quickPosition.value = settings.position || 'bottom'
    depth.value = String(settings.depth)
    tokens.value = String(settings.maxTokens)
    batch.value = String(settings.livestreamBatchSize)
    minWait.value = String(settings.livestreamMinWait)
    maxWait.value = String(settings.livestreamMaxWait)
    width.value = String(settings.panelWidth)
    height.value = String(settings.panelHeight)
    opacity.value = String(settings.panelOpacity)
    fontSize.value = String(settings.fontSize)
    ollamaUrl.value = settings.ollamaUrl || ''
    ollamaModel.value = settings.ollamaModel || ''
    openaiUrl.value = settings.openaiUrl || ''
    openaiPreset.value = [...openaiPreset.children].some(item => item.value === settings.openaiUrl) ? settings.openaiUrl : ''
    openaiModel.value = settings.openaiModel || ''
    clearKeyButton.disabled = !settings.hasApiKey
    connection.replaceChildren(option('', 'Current connection'), ...connections.map(entry => option(String(entry.id), String(entry.name || entry.model || entry.id))))
    connection.value = settings.connectionId || ''
    source.value = settings.source || 'lumiverse'
    position.value = settings.position || 'bottom'
    liveMode.value = settings.livestreamMode || 'manual'
    messageOrder.value = settings.messageOrder || 'oldest-first'
    autoScroll.checked = settings.livestreamAutoScroll !== false
    autoUpdate.checked = settings.autoUpdateOnMessages !== false
    includeUser.checked = settings.includeUserInput === true
    includePast.checked = settings.includePastEchoChambers === true
    markdown.checked = settings.markdown !== false
    for (const item of contextOptions) item.control.checked = settings[item.key] === true
    wiBudget.value = String(settings.wiBudget ?? 0)
    chatEnabled.checked = settings.chatEnabled !== false
    chatUsername.value = settings.chatUsername || 'Streamer (You)'
    chatAvatarColor.value = /^#[0-9a-f]{6}$/i.test(settings.chatAvatarColor || '') ? settings.chatAvatarColor : '#3b82f6'
    chatReplyCount.value = String(settings.chatReplyCount ?? 3)
    renderStyles()
  }
  function render() { renderControls(); renderRows() }
  function updateSettings(changes) {
    settings = { ...settings, ...changes }
    if ('livestream' in changes || 'livestreamMode' in changes || changes.paused === true || changes.enabled === false) clearTimer()
    if (changes.livestream === false) { clearReveal(); shown = items.length }
    if (changes.position != null || changes.panelWidth != null || changes.panelHeight != null) place()
    render()
    ctx.sendToBackend({ type: 'settings', settings })
  }
  function place() {
    const where = POSITIONS.includes(settings.position) ? settings.position : 'drawer'
    if (placement) { tab.root.append(shell); placement.destroy(); placement = null }
    if (where === 'drawer') {
      shell.append(options)
      sidebar.remove()
      return
    }
    try {
      const panelWidth = clamp(settings.panelWidth, 350, 240, 1000)
      const panelHeight = clamp(settings.panelHeight, 250, 180, 1000)
      if (where === 'float') {
        placement = ctx.ui.createFloatWidget({
          width: panelWidth, height: panelHeight, resizable: true,
          bounds: { minWidth: 240, minHeight: 180 },
          persistGeometry: 'echochamber-float', mobileClamp: true,
          tooltip: 'EchoChamber', chromeless: true,
        })
        placement.root.classList.add('ec-float')
      } else {
        placement = ctx.ui.requestDockPanel({
          edge: where, title: 'EchoChamber',
          size: where === 'top' || where === 'bottom' ? panelHeight : panelWidth,
          minSize: where === 'top' || where === 'bottom' ? 180 : 240,
          maxSize: 1000, resizable: true, respectRequestedEdge: true,
          persistGeometry: `echochamber-${where}`,
        })
        placement.root.classList.add('ec-dock')
      }
      placement.root.append(shell)
      sidebar.append(options)
      tab.root.append(sidebar)
    } catch (error) {
      if (placement) { try { placement.destroy() } catch {} placement = null }
      tab.root.append(shell)
      shell.append(options)
      sidebar.remove()
      setStatus(`Panel unavailable: ${String(error?.message || error)}`, true)
    }
  }
  function revealNext() {
    clearReveal()
    if (!alive || !chatId || !settings.livestream || paused) return
    if (shown < items.length) {
      shown++
      renderRows()
      if (shown < items.length) {
        const low = clamp(settings.livestreamMinWait, 2, 0, 120)
        const high = Math.max(low, clamp(settings.livestreamMaxWait, 5, 0, 120))
        revealTimer = setTimeout(revealNext, (low + Math.random() * (high - low)) * 1000)
      } else scheduleLive()
    } else scheduleLive()
  }
  function scheduleLive() {
    clearTimer()
    if (!alive || !chatId || !settings.enabled || !settings.livestream || settings.livestreamMode !== 'onComplete' || paused || busy || shown < items.length) return
    timer = setTimeout(() => {
      timer = null
      if (!alive || !chatId || busy || !settings.livestream || paused) return
      ctx.sendToBackend({ type: 'generate' })
    }, 0)
  }
  function receiveItems(next, animate = false) {
    const old = items
    items = Array.isArray(next) ? next : []
    const isAppend = items.length >= old.length && old.every((item, index) => JSON.stringify(item) === JSON.stringify(items[index]))
    if (!animate || !settings.livestream || !isAppend) {
      clearReveal(); shown = items.length; renderRows(); scheduleLive()
    } else {
      shown = Math.min(shown, old.length)
      revealNext()
    }
  }
  function sendReply() {
    const text = replyInput.value.trim()
    if (!text || busy || !chatId) return
    replyInput.value = ''; mentions.hidden = true
    clearTimer()
    ctx.sendToBackend({ type: 'reply', text })
  }
  function mentionQuery() {
    const left = replyInput.value.slice(0, replyInput.selectionStart)
    return left.match(/(?:^|\s)@([\w.-]*)$/)?.[1] ?? null
  }
  function insertMention(name) {
    const cursor = replyInput.selectionStart ?? replyInput.value.length
    const before = replyInput.value.slice(0, cursor)
    const match = before.match(/(?:^|\s)@[\w.-]*$/)
    const start = match ? cursor - match[0].length + (match[0].startsWith(' ') ? 1 : 0) : cursor
    const prefix = match ? '' : (before && !/\s$/.test(before) ? ' ' : '')
    const next = `${replyInput.value.slice(0, start)}${prefix}@${name} ${replyInput.value.slice(cursor)}`
    replyInput.value = next
    const position = start + prefix.length + name.length + 2
    replyInput.focus(); replyInput.setSelectionRange(position, position); mentions.hidden = true
  }
  function showMentions() {
    const query = mentionQuery()
    mentions.replaceChildren()
    if (query == null) { mentions.hidden = true; return }
    const matches = namesFrom(items).filter(name => name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    for (const name of matches) {
      const suggestion = button(`@${name}`)
      suggestion.addEventListener('mousedown', event => event.preventDefault())
      suggestion.addEventListener('click', () => insertMention(name))
      mentions.append(suggestion)
    }
    mentions.hidden = !matches.length
  }
  function openEditor(id = null) {
    editorId = id
    const existing = id && settings.customStyles?.[id]
    styleId.value = id || ''; styleId.disabled = !!id
    styleName.value = existing?.name || (id ? styleLabel(id) : '')
    stylePrompt.value = existing?.prompt || settings.styleOverrides?.[id] || ''
    styleAudience.value = ''; styleTone.value = ''
    styleMode.value = id ? 'advanced' : 'easy'; updateStyleEditorMode()
    editor.dataset.open = 'true'; styleName.focus()
    if (id && !existing && !settings.styleOverrides?.[id]) ctx.sendToBackend({ type: 'get_style', id })
  }
  function updateStyleEditorMode() {
    const advanced = styleMode.value === 'advanced'
    stylePrompt.hidden = !advanced
    styleAudience.hidden = advanced
    styleTone.hidden = advanced
  }
  function closeEditor() { editorId = null; editor.dataset.open = 'false' }
  function saveStyle() {
    const id = styleId.value.trim().toLowerCase()
    const prompt = styleMode.value === 'advanced' ? stylePrompt.value :
      `You are a live audience reacting to a conversation. Audience: ${styleAudience.value.trim()}. Tone: ${styleTone.value.trim() || 'natural and varied'}. Give distinct usernames and concise, context-aware reactions. Output only lines formatted username: message.`
    const value = normalizedStyle({ name: styleName.value, prompt })
    if (!validStyleId(id) || !value || (!editorId && orderedStyles().includes(id)) || (styleMode.value === 'easy' && !styleAudience.value.trim())) {
      setStatus('Enter a unique style ID (letters, numbers, dash), name and prompt.', true); return
    }
    const reveal = { deletedStyles: (settings.deletedStyles || []).filter(key => key !== id), style: id }
    if (Object.hasOwn(STYLE_LABELS, id)) updateSettings({ ...reveal, styleOverrides: { ...(settings.styleOverrides || {}), [id]: value.prompt } })
    else updateSettings({ ...reveal, customStyles: { ...(settings.customStyles || {}), [id]: value } })
    closeEditor(); setStatus('Style saved')
  }
  function deleteStyle(id) {
    if (!window.confirm(`Delete custom style “${styleLabel(id)}”?`)) return
    const customStyles = { ...(settings.customStyles || {}) }
    delete customStyles[id]
    updateSettings({ customStyles, style: settings.style === id ? 'discordtwitch' : settings.style, styleOrder: orderedStyles().filter(key => key !== id) })
  }
  function exportStyles() {
    const data = JSON.stringify({ version: 1, styles: settings.customStyles || {}, styleOverrides: settings.styleOverrides || {} }, null, 2)
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    const link = element('a'); link.href = url; link.download = 'echochamber-styles.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  function exportMarkdown() {
    const id = settings.style
    const prompt = settings.customStyles?.[id]?.prompt || settings.styleOverrides?.[id]
    if (!prompt) { pendingExportId = id; ctx.sendToBackend({ type: 'get_style', id }); return }
    downloadMarkdown(id, prompt)
  }
  function downloadMarkdown(id, prompt) {
    const url = URL.createObjectURL(new Blob([prompt], { type: 'text/markdown' }))
    const link = element('a'); link.href = url; link.download = `${id}.md`; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  async function importStyles(file) {
    try {
      if (!file || file.size > 2_000_000) throw new Error('Choose a JSON file smaller than 2 MB.')
      if (file.name?.toLowerCase().endsWith('.md')) {
        const id = file.name.replace(/\.md$/i, '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+/, '').slice(0, 48)
        const value = normalizedStyle({ name: file.name.replace(/\.md$/i, ''), prompt: await file.text() })
        if (!validStyleId(id) || !value) throw new Error('Invalid Markdown style file.')
        if (Object.hasOwn(STYLE_LABELS, id)) updateSettings({ styleOverrides: { ...(settings.styleOverrides || {}), [id]: value.prompt }, style: id })
        else updateSettings({ customStyles: { ...(settings.customStyles || {}), [id]: value }, style: id })
        setStatus(`Imported ${value.name}`); return
      }
      const parsed = JSON.parse(await file.text())
      const sourceStyles = parsed?.styles || parsed
      if (!sourceStyles || typeof sourceStyles !== 'object' || Array.isArray(sourceStyles)) throw new Error('Invalid style file.')
      const imported = {}
      for (const [id, value] of Object.entries(sourceStyles)) {
        const normalized = normalizedStyle(value)
        if (validStyleId(id) && normalized) imported[id] = normalized
      }
      const overrides = {}
      for (const [id, prompt] of Object.entries(parsed?.styleOverrides || {})) {
        if (Object.hasOwn(STYLE_LABELS, id) && typeof prompt === 'string' && prompt.trim()) overrides[id] = prompt.trim().slice(0, 30000)
      }
      if (!Object.keys(imported).length && !Object.keys(overrides).length) throw new Error('No valid styles found.')
      updateSettings({ customStyles: { ...(settings.customStyles || {}), ...imported }, styleOverrides: { ...(settings.styleOverrides || {}), ...overrides } })
      setStatus(`Imported ${Object.keys(imported).length + Object.keys(overrides).length} styles`)
    } catch (error) { setStatus(String(error?.message || error), true) }
    finally { importFile.value = '' }
  }
  function bind(control, fieldName, numeric = false) {
    control.addEventListener('change', () => updateSettings({ [fieldName]: numeric ? Number(control.value) : control.value }))
  }
  generateButton.addEventListener('click', () => { clearTimer(); ctx.sendToBackend({ type: busy ? 'cancel' : 'generate' }) })
  powerButton.addEventListener('click', () => updateSettings({ enabled: !settings.enabled }))
  autoButton.addEventListener('click', () => updateSettings({ auto: !settings.auto }))
  styleSelect.addEventListener('change', () => updateSettings({ style: styleSelect.value }))
  quickPosition.addEventListener('change', () => updateSettings({ position: quickPosition.value }))
  fontDown.addEventListener('click', () => updateSettings({ fontSize: clamp(settings.fontSize, 13, 10, 24) - 1 }))
  fontUp.addEventListener('click', () => updateSettings({ fontSize: clamp(settings.fontSize, 13, 10, 24) + 1 }))
  quickClear.addEventListener('click', () => ctx.sendToBackend({ type: 'clear' }))
  liveButton.addEventListener('click', () => { paused = false; updateSettings({ livestream: !settings.livestream, paused: false }) })
  pauseButton.addEventListener('click', () => {
    paused = !paused
    if (paused) { clearTimer(); clearReveal(); setStatus('Livestream paused') }
    else { setStatus('Live'); revealNext(); scheduleLive() }
    updateSettings({ paused })
  })
  collapseButton.addEventListener('click', () => updateSettings({ collapsed: !settings.collapsed }))
  optionsButton.addEventListener('click', () => {
    if (placement) tab.activate()
    else options.dataset.open = String(options.dataset.open !== 'true')
  })
  showInSidebar.addEventListener('click', () => updateSettings({ position: 'drawer' }))
  sendButton.addEventListener('click', sendReply)
  replyInput.addEventListener('input', showMentions)
  replyInput.addEventListener('keydown', event => {
    if (event.key === 'Escape') { mentions.hidden = true; return }
    if (event.key === 'Enter') {
      if (!mentions.hidden && mentions.firstChild) { event.preventDefault(); mentions.firstChild.click() }
      else sendReply()
    }
  })
  for (const [control, name, numeric] of [
    [count, 'count', true], [depth, 'depth', true], [tokens, 'maxTokens', true],
    [position, 'position'], [source, 'source'], [connection, 'connectionId'], [ollamaUrl, 'ollamaUrl'], [ollamaModel, 'ollamaModel'],
    [openaiUrl, 'openaiUrl'], [openaiModel, 'openaiModel'], [batch, 'livestreamBatchSize', true],
    [minWait, 'livestreamMinWait', true], [maxWait, 'livestreamMaxWait', true],
    [width, 'panelWidth', true], [height, 'panelHeight', true],
    [opacity, 'panelOpacity', true], [fontSize, 'fontSize', true],
    [chatUsername, 'chatUsername'], [chatAvatarColor, 'chatAvatarColor'], [chatReplyCount, 'chatReplyCount', true],
    [messageOrder, 'messageOrder'], [liveMode, 'livestreamMode'],
    [wiBudget, 'wiBudget', true],
  ]) bind(control, name, numeric)
  openaiPreset.addEventListener('change', () => {
    if (openaiPreset.value) updateSettings({ source: 'openai', openaiUrl: openaiPreset.value })
  })
  autoScroll.addEventListener('change', () => updateSettings({ livestreamAutoScroll: autoScroll.checked }))
  autoUpdate.addEventListener('change', () => updateSettings({ autoUpdateOnMessages: autoUpdate.checked }))
  includeUser.addEventListener('change', () => updateSettings({ includeUserInput: includeUser.checked }))
  includePast.addEventListener('change', () => updateSettings({ includePastEchoChambers: includePast.checked }))
  markdown.addEventListener('change', () => updateSettings({ markdown: markdown.checked }))
  for (const item of contextOptions) item.control.addEventListener('change', () => updateSettings({ [item.key]: item.control.checked }))
  chatEnabled.addEventListener('change', () => updateSettings({ chatEnabled: chatEnabled.checked }))
  saveKeyButton.addEventListener('click', () => {
    const key = apiKey.value.trim()
    if (!key) return
    ctx.sendToBackend({ type: 'api_key', key }); apiKey.value = ''; setStatus('API key sent to backend')
  })
  clearKeyButton.addEventListener('click', () => ctx.sendToBackend({ type: 'api_key_clear' }))
  newStyleButton.addEventListener('click', () => openEditor())
  styleMode.addEventListener('change', updateStyleEditorMode)
  saveStyleButton.addEventListener('click', saveStyle)
  cancelStyleButton.addEventListener('click', closeEditor)
  importStyleButton.addEventListener('click', () => importFile.click())
  importFile.addEventListener('change', () => importStyles(importFile.files?.[0]))
  exportStyleButton.addEventListener('click', exportStyles)
  exportMarkdownButton.addEventListener('click', exportMarkdown)
  clearButton.addEventListener('click', () => ctx.sendToBackend({ type: 'clear' }))

  const unsub = ctx.onBackendMessage(payload => {
    if (!alive || !payload || typeof payload !== 'object') return
    if (payload.type === 'state') {
      chatId = payload.chatId || null
      settings = { ...DEFAULTS, ...(payload.settings || {}) }
      styles = Array.isArray(payload.styles) ? payload.styles : styles
      connections = Array.isArray(payload.connections) ? payload.connections : []
      paused = settings.paused === true; clearTimer(); clearReveal(); items = []; shown = 0
      receiveItems(payload.items, false); place()
      setStatus(chatId ? 'Ready' : 'Open a chat'); render()
    } else if (payload.type === 'chat') {
      chatId = payload.chatId || null; busy = false; paused = settings.paused === true; clearTimer(); clearReveal()
      items = []; shown = 0; receiveItems(payload.items, false)
      setStatus(chatId ? 'Ready' : 'Open a chat'); render()
    } else if (payload.type === 'reactions' && payload.chatId === chatId) {
      receiveItems(payload.items, true); setStatus(settings.livestream ? 'Live' : 'Ready'); renderControls()
    } else if (payload.type === 'busy' && payload.chatId === chatId) {
      busy = !!payload.value
      if (busy) clearTimer()
      setStatus(busy ? 'Generating reactions…' : settings.livestream ? 'Live' : 'Ready')
      renderControls(); if (!busy) scheduleLive()
    } else if (payload.type === 'settings') {
      const previousPosition = settings.position
      settings = { ...DEFAULTS, ...(payload.settings || {}) }
      if (settings.position !== previousPosition) place()
      render(); scheduleLive()
    } else if (payload.type === 'style_definition') {
      if (payload.id === editorId && !settings.customStyles?.[editorId]) {
        stylePrompt.value = String(payload.prompt || '')
        styleName.value = styleLabel(editorId)
      }
      if (payload.id === pendingExportId) {
        pendingExportId = null
        downloadMarkdown(payload.id, String(payload.prompt || ''))
      }
    } else if (payload.type === 'error') {
      clearTimer(); setStatus(String(payload.message || 'Generation failed'), true)
      if (settings.livestream) timer = setTimeout(scheduleLive, 3000)
    }
  })
  const unChat = ctx.events.on('CHAT_SWITCHED', payload => {
    lastGenerationId = null; clearTimer(); clearReveal()
    if (busy) { ctx.sendToBackend({ type: 'cancel' }); busy = false }
    ctx.sendToBackend({ type: 'chat', chatId: payload?.chatId || null })
  })
  const unGeneration = ctx.events.on('GENERATION_ENDED', payload => {
    if (!settings.enabled || busy || !chatId || payload?.chatId !== chatId || payload?.error) return
    if (!payload?.messageId || payload.messageId === lastGenerationId) return
    lastGenerationId = payload.messageId
    if ((settings.auto && settings.autoUpdateOnMessages !== false) || (settings.livestream && settings.livestreamMode === 'onMessage' && !paused)) {
      clearTimer(); ctx.sendToBackend({ type: 'generate' })
    }
  })
  const unMessage = ctx.events.on('MESSAGE_SENT', payload => {
    if (!settings.enabled || busy || !chatId || payload?.chatId !== chatId || payload?.message?.is_user !== true) return
    if (!settings.includeUserInput) return
    if ((settings.auto && settings.autoUpdateOnMessages !== false) || (settings.livestream && settings.livestreamMode === 'onMessage' && !paused)) {
      clearTimer(); ctx.sendToBackend({ type: 'generate' })
    }
  })
  ctx.sendToBackend({ type: 'hydrate' })
  return () => {
    alive = false; clearTimer(); clearReveal(); unsub(); unChat(); unGeneration(); unMessage()
    if (placement) placement.destroy()
    tab.destroy(); removeStyle(); shell.remove(); sidebar.remove()
  }
}
