const STYLE_LABELS = {
  ao3wattpad: 'AO3 / Wattpad', breakingnews: 'Breaking News', darkroast: 'Dark Roast',
  discordtwitch: 'Discord / Twitch', doomscrollers: 'Doomscrollers', dumbanddumber: 'Dumb & Dumber',
  hypebot: 'HypeBot', mst3k: 'MST3K', nsfwava: 'Ava', nsfwkai: 'Kai',
  sillytavern_story: 'Story cast', sillytavern: 'Roleplay cast', thoughtfulverbose: 'Thoughtful', twitterx: 'Twitter / X',
}
const css = `
.ec-shell{display:flex;flex-direction:column;min-height:0;height:100%;background:var(--lumiverse-fill,#171923);color:var(--lumiverse-text,#eee);font:13px/1.4 system-ui,sans-serif}
.ec-head{display:flex;align-items:center;gap:6px;padding:10px;border-bottom:1px solid var(--lumiverse-border,#3a3e49);flex-wrap:wrap}
.ec-title{font-weight:750;font-size:15px;margin-right:auto}.ec-head button,.ec-foot button,.ec-options button{border:1px solid var(--lumiverse-border,#555);border-radius:7px;background:var(--lumiverse-fill-subtle,#282b36);color:inherit;padding:5px 8px;cursor:pointer}
.ec-head button:hover,.ec-foot button:hover{filter:brightness(1.18)}.ec-head button:disabled,.ec-foot button:disabled{opacity:.45;cursor:default}
.ec-status{min-height:20px;padding:3px 10px;color:var(--lumiverse-text-muted,#aaa);font-size:11px}.ec-status[data-error=true]{color:#ef727a}
.ec-list{flex:1;min-height:120px;overflow:auto;padding:6px 10px}.ec-empty{color:var(--lumiverse-text-muted,#aaa);padding:18px 4px;text-align:center}
.ec-row{display:flex;gap:9px;align-items:flex-start;padding:7px 3px;border-bottom:1px solid var(--lumiverse-border,#353944)}.ec-avatar{flex:none;width:27px;height:27px;display:grid;place-items:center;border-radius:50%;font-weight:700;font-size:11px;background:#356c80;color:white}.ec-copy{min-width:0;overflow-wrap:anywhere}.ec-name{font-weight:700;color:#73c9d9;margin-right:5px}.ec-row[data-mine=true] .ec-name{color:#e9ad66}.ec-time{font-size:10px;color:var(--lumiverse-text-muted,#aaa);margin-left:4px}
.ec-foot{padding:9px 10px;border-top:1px solid var(--lumiverse-border,#3a3e49)}.ec-compose{display:flex;gap:6px}.ec-compose input,.ec-options input,.ec-options select,.ec-head select{min-width:0;border:1px solid var(--lumiverse-border,#555);border-radius:7px;background:var(--lumiverse-fill-subtle,#282b36);color:inherit;padding:5px 7px}.ec-compose input{flex:1}.ec-options{display:none;gap:8px;grid-template-columns:1fr 1fr;padding:9px 10px;border-top:1px solid var(--lumiverse-border,#3a3e49)}.ec-options[data-open=true]{display:grid}.ec-options label{display:flex;align-items:center;gap:6px}.ec-options label input[type=number]{width:62px}.ec-options .ec-wide{grid-column:1/-1}.ec-dock .ec-shell{min-height:300px}.ec-shell button:focus-visible,.ec-shell input:focus-visible,.ec-shell select:focus-visible{outline:2px solid #75cbd9;outline-offset:2px}
`

function element(tag, className, text) {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}
function button(label, title) {
  const node = element('button', '', label)
  node.type = 'button'
  node.title = title || label
  return node
}
function avatarColor(name) {
  let hash = 0
  for (const char of name) hash = ((hash << 5) - hash + char.codePointAt(0)) | 0
  return `hsl(${Math.abs(hash) % 360} 44% 36%)`
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
  const head = element('div', 'ec-head')
  const title = element('strong', 'ec-title', 'EchoChamber')
  const styleSelect = element('select')
  styleSelect.setAttribute('aria-label', 'Audience style')
  const generateButton = button('↻', 'Generate reactions')
  generateButton.setAttribute('aria-label', 'Generate reactions')
  const autoButton = button('Auto off', 'Toggle reactions after replies')
  const dockButton = button('Dock', 'Move EchoChamber to the right side')
  const optionsButton = button('⚙', 'Settings')
  optionsButton.setAttribute('aria-label', 'EchoChamber settings')
  head.append(title, styleSelect, generateButton, autoButton, dockButton, optionsButton)
  const status = element('div', 'ec-status', 'Loading…')
  status.setAttribute('role', 'status')
  const list = element('div', 'ec-list')
  list.setAttribute('role', 'log')
  list.setAttribute('aria-label', 'Audience reactions')
  const options = element('div', 'ec-options')
  const count = element('input'); count.type = 'number'; count.min = '1'; count.max = '20'
  const depth = element('input'); depth.type = 'number'; depth.min = '1'; depth.max = '30'
  const tokens = element('input'); tokens.type = 'number'; tokens.min = '100'; tokens.max = '3000'
  for (const [label, input] of [['Audience size', count], ['Chat turns', depth], ['Max tokens', tokens]]) {
    const row = element('label', '', label); row.append(input); options.append(row)
  }
  const clearButton = button('Clear this feed')
  clearButton.className = 'ec-wide'
  options.append(clearButton)
  const foot = element('div', 'ec-foot')
  const compose = element('div', 'ec-compose')
  const replyInput = element('input')
  replyInput.placeholder = 'Message the audience…'
  replyInput.setAttribute('aria-label', 'Message the audience')
  const sendButton = button('Send')
  compose.append(replyInput, sendButton)
  foot.append(compose)
  shell.append(head, status, list, options, foot)
  tab.root.append(shell)

  let dock = null
  let chatId = null
  let busy = false
  let settings = { enabled: true, auto: false, style: 'discordtwitch', count: 5, depth: 6, maxTokens: 700 }
  let items = []
  let alive = true
  let lastGenerationId = null
  function setStatus(message, error = false) { status.textContent = message; status.dataset.error = String(error) }
  function render() {
    list.replaceChildren()
    if (!items.length) list.append(element('p', 'ec-empty', chatId ? 'No reactions yet. Press ↻ to generate.' : 'Open a chat to start.'))
    for (const item of items) {
      const row = element('div', 'ec-row'); row.dataset.mine = String(item.mine === true)
      const avatar = element('span', 'ec-avatar', String(item.name || '?').slice(0, 1).toUpperCase())
      avatar.style.background = avatarColor(String(item.name || '?'))
      const copy = element('div', 'ec-copy')
      copy.append(element('span', 'ec-name', String(item.name || 'Viewer')), element('span', '', String(item.text || '')))
      row.append(avatar, copy); list.append(row)
    }
    list.scrollTop = list.scrollHeight
    generateButton.disabled = busy || !chatId
    sendButton.disabled = busy || !chatId
    replyInput.disabled = busy || !chatId
    autoButton.textContent = settings.auto ? '● Auto on' : 'Auto off'
    autoButton.setAttribute('aria-pressed', String(settings.auto))
    styleSelect.value = settings.style
    count.value = String(settings.count)
    depth.value = String(settings.depth)
    tokens.value = String(settings.maxTokens)
    dockButton.textContent = dock ? 'Undock' : 'Dock'
  }
  function updateSettings(changes) {
    settings = { ...settings, ...changes }
    render()
    ctx.sendToBackend({ type: 'settings', settings })
  }
  function sendReply() {
    const text = replyInput.value.trim()
    if (!text || busy || !chatId) return
    replyInput.value = ''
    ctx.sendToBackend({ type: 'reply', text })
  }
  generateButton.addEventListener('click', () => ctx.sendToBackend({ type: 'generate' }))
  sendButton.addEventListener('click', sendReply)
  replyInput.addEventListener('keydown', event => { if (event.key === 'Enter') sendReply() })
  autoButton.addEventListener('click', () => updateSettings({ auto: !settings.auto }))
  styleSelect.addEventListener('change', () => updateSettings({ style: styleSelect.value }))
  count.addEventListener('change', () => updateSettings({ count: Number(count.value) }))
  depth.addEventListener('change', () => updateSettings({ depth: Number(depth.value) }))
  tokens.addEventListener('change', () => updateSettings({ maxTokens: Number(tokens.value) }))
  optionsButton.addEventListener('click', () => { options.dataset.open = String(options.dataset.open !== 'true') })
  clearButton.addEventListener('click', () => ctx.sendToBackend({ type: 'clear' }))
  dockButton.addEventListener('click', () => {
    if (dock) { dock.destroy(); dock = null; tab.root.append(shell) }
    else {
      dock = ctx.ui.requestDockPanel({ edge: 'right', title: 'EchoChamber', size: 350, minSize: 270, maxSize: 600, resizable: true })
      dock.root.classList.add('ec-dock')
      dock.root.append(shell)
    }
    render()
  })

  const unsub = ctx.onBackendMessage(payload => {
    if (!alive || !payload || typeof payload !== 'object') return
    if (payload.type === 'state') {
      chatId = payload.chatId || null
      settings = payload.settings || settings
      items = Array.isArray(payload.items) ? payload.items : []
      styleSelect.replaceChildren()
      for (const key of payload.styles || []) {
        const option = element('option', '', STYLE_LABELS[key] || key); option.value = key; styleSelect.append(option)
      }
      setStatus(chatId ? 'Ready' : 'Open a chat')
      render()
    } else if (payload.type === 'chat') {
      chatId = payload.chatId || null; items = Array.isArray(payload.items) ? payload.items : []
      setStatus(chatId ? 'Ready' : 'Open a chat'); render()
    } else if (payload.type === 'reactions' && payload.chatId === chatId) {
      items = Array.isArray(payload.items) ? payload.items : []; setStatus('Ready'); render()
    } else if (payload.type === 'busy' && payload.chatId === chatId) {
      busy = !!payload.value; setStatus(busy ? 'Generating reactions…' : 'Ready'); render()
    } else if (payload.type === 'settings') { settings = payload.settings || settings; render() }
    else if (payload.type === 'error') setStatus(String(payload.message || 'Generation failed'), true)
  })
  const unChat = ctx.events.on('CHAT_SWITCHED', payload => {
    lastGenerationId = null
    ctx.sendToBackend({ type: 'chat', chatId: payload?.chatId || null })
  })
  const unGeneration = ctx.events.on('GENERATION_ENDED', payload => {
    if (!settings.auto || !settings.enabled || busy || !chatId || payload?.chatId !== chatId || payload?.error) return
    if (!payload?.messageId || payload.messageId === lastGenerationId) return
    lastGenerationId = payload.messageId
    ctx.sendToBackend({ type: 'generate' })
  })
  ctx.sendToBackend({ type: 'hydrate' })
  return () => {
    alive = false; unsub(); unChat(); unGeneration(); if (dock) dock.destroy(); tab.destroy(); removeStyle(); shell.remove()
  }
}
