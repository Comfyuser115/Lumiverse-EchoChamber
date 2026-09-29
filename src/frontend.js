import jQuery from 'jquery'
import DOMPurify from 'dompurify'
import { styles } from '../dist/styles.js'
import { startEchoChamber } from '../build/upstream-entry.js'
import upstreamCss from '../upstream/style.css'
import settingsHtml from '../upstream/settings.html'
import iconsCss from '../build/icons.css'

const placementCss = `
:root{--SmartThemeBlurTintColor:var(--lumiverse-fill,var(--background-primary,#202127));--SmartThemeBodyBackground:var(--lumiverse-fill,var(--background-primary,#202127));--SmartThemeBodyColor:var(--lumiverse-text,var(--text-primary,#e8e8ec));--SmartThemeBorderColor:var(--lumiverse-border,var(--border-color,#565965));--SmartThemeQuoteColor:var(--lumiverse-accent,var(--accent-color,#73c9d9));--SmartThemeEmColor:var(--lumiverse-accent,var(--accent-color,#73c9d9))}
.ec-lumiverse-mount{min-width:0;min-height:0;width:100%;height:100%;overflow:hidden}
.ec-lumiverse-mount #discordBar{position:relative!important;inset:auto!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;transform:none!important;width:100%!important;max-width:none!important;height:100%!important;max-height:none!important;margin:0!important}
.ec-lumiverse-mount #discordContent{min-height:80px;flex:1;overflow:auto}
.ec-lumiverse-mount.ec-drawer #discordBar{height:auto!important;min-height:260px}
.ec-lumiverse-mount.ec-drawer #discordContent{height:250px}
#extensions_settings .ec-s-section-body[hidden]{display:none!important}
`

function safeOptions(settings) {
  return {
    includePersona: settings?.includePersona === true,
    includeAuthorsNote: settings?.includeAuthorsNote === true,
    includeCharacterDescription: settings?.includeCharacterDescription === true,
    includeSummary: settings?.includeSummary === true,
    includeWorldInfo: settings?.includeWorldInfo === true,
    wiBudget: Number(settings?.wiBudget) || 0,
  }
}

export function setup(ctx) {
  const removeCss = ctx.dom.addStyle(`${iconsCss}\n${upstreamCss}\n${placementCss}`)
  const drawer = ctx.ui.registerDrawerTab({
    id: 'echochamber', title: 'EchoChamber', shortName: 'Echo',
    description: 'Original EchoChamber adapted for Lumiverse',
  })
  const settingsTab = ctx.ui.registerSettingsTab({ id: 'echochamber', title: 'EchoChamber' })
  const settingsContainer = document.createElement('div')
  settingsContainer.id = 'extensions_settings'
  settingsTab.root.append(settingsContainer)
  const settingsParking = document.createElement('div')
  settingsParking.hidden = true
  document.body.append(settingsParking)
  settingsParking.append(settingsTab.root)
  const drawerMount = document.createElement('div')
  drawerMount.id = 'form_sheld'
  drawerMount.className = 'ec-lumiverse-mount ec-drawer'
  drawer.root.append(drawerMount)
  const panelParking = document.createElement('div')
  panelParking.hidden = true
  panelParking.className = 'ec-lumiverse-mount ec-drawer'
  document.body.append(panelParking)
  const pending = new Map()
  const events = new Map()
  let requestNumber = 0
  let placement = null
  let currentPlacement = 'drawer'
  let saveTimer = null
  let alive = true
  let panelElement = null
  const rootObserver = new MutationObserver(() => {
    if (!alive) return
    if (!settingsTab.root.isConnected) settingsParking.append(settingsTab.root)
    if (placement?.root.isConnected && panelElement && panelElement.parentElement !== placement.root) {
      placement.root.append(panelElement)
    }
  })
  rootObserver.observe(document.body, { childList: true, subtree: true })

  const context = {
    chatId: null, chat: [], chatMetadata: {}, extensionSettings: { discord_chat: {}, connectionManager: { profiles: [] } },
    characterId: undefined, characters: [], groups: [], groupId: null,
    name1: 'User', name2: 'Character', characterName: 'Character',
    main: { context_size: 8192 }, powerUser: {}, activatedWorldInfo: [],
    eventTypes: { MESSAGE_RECEIVED: 'MESSAGE_RECEIVED', CHAT_CHANGED: 'CHAT_CHANGED',
      GENERATION_STOPPED: 'GENERATION_STOPPED', SETTINGS_UPDATED: 'SETTINGS_UPDATED' },
    eventSource: { on(name, handler) { const set = events.get(name) || new Set(); set.add(handler); events.set(name, set) } },
    async renderExtensionTemplateAsync() { return settingsHtml.replaceAll('SillyTavern', 'Lumiverse').replaceAll('ST credentials', 'Lumiverse credentials') },
    saveSettingsDebounced() {
      clearTimeout(saveTimer)
      saveTimer = setTimeout(() => {
        request('save_settings', { settings: context.extensionSettings.discord_chat }).catch(error => console.error('[EchoChamber] Settings save failed:', error))
      }, 180)
    },
    substituteParams(value) {
      return String(value || '').replaceAll('{{user}}', context.name1).replaceAll('{{char}}', context.characterName)
        .replaceAll('{{authorsNote}}', context._details?.authorsNote || '')
    },
    async getWorldInfoPrompt() { return { worldInfoString: context._details?.worldInfo || '' } },
    async generateRaw({ prompt, maxTokens, signal }) { return (await request('generate', { messages: prompt, maxTokens: maxTokens || 1400 }, signal)).content },
    ConnectionManagerRequestService: {
      async sendRequest(connectionId, messages, maxTokens, options = {}) {
        return request('generate', { connectionId, messages, maxTokens }, options.signal)
      },
    },
  }

  function emit(name) {
    for (const handler of events.get(name) || []) {
      try { handler() } catch (error) { console.error('[EchoChamber] Event handler failed:', error) }
    }
  }

  function request(action, values = {}, signal) {
    if (!alive) return Promise.reject(new Error('EchoChamber was unloaded'))
    const id = `ec-${++requestNumber}`
    return new Promise((resolve, reject) => {
      if (signal?.aborted) { reject(new DOMException('Generation aborted', 'AbortError')); return }
      const onAbort = () => {
        ctx.sendToBackend({ type: 'bridge_cancel', id })
        pending.delete(id)
        reject(new DOMException('Generation aborted', 'AbortError'))
      }
      signal?.addEventListener('abort', onAbort, { once: true })
      pending.set(id, { resolve, reject, signal, onAbort })
      ctx.sendToBackend({ type: 'bridge_request', id, action, ...values })
    })
  }

  function applySnapshot(data) {
    context.chatId = data.chatId || null
    context.chat = data.chat || []
    context.name1 = data.personaName || 'User'
    context.name2 = data.characterName || 'Character'
    context.characterName = context.name2
    context.characterId = data.characterId ? 0 : undefined
    context.characters = data.characterId ? [{ name: context.name2,
      description: data.details?.characterDescription || '', avatar: data.characterId }] : []
    context.extensionSettings.connectionManager.profiles = data.profiles || []
    context._details = data.details || {}
    context.activatedWorldInfo = context._details.worldInfo ? [{ content: context._details.worldInfo }] : []
    context.extensionSettings.memory = context._details.summary ? { summary: context._details.summary } : null
  }

  async function refresh() {
    const data = await request('snapshot', { options: safeOptions(context.extensionSettings.discord_chat) })
    applySnapshot(data)
    emit('SETTINGS_UPDATED')
  }

  async function bridgeFetch(url, options = {}) {
    const path = new URL(String(url), window.location.href).pathname
    const styleMatch = path.match(/\/chat-styles\/([a-z0-9_-]+)\.md$/i)
    if (styleMatch) {
      const content = styles[styleMatch[1]]
      return new Response(content || '', { status: content ? 200 : 404 })
    }
    const response = await request('external', {
      url: String(url), method: options.method || 'GET', body: options.body || '',
    }, options.signal)
    return new Response(response.body, { status: response.status })
  }

  function placePanel(element, settings) {
    panelElement = element
    const position = ['top', 'bottom', 'left', 'right'].includes(settings.position) ? settings.position : 'bottom'
    if (placement && currentPlacement !== position) {
      panelParking.append(element)
      placement.destroy()
      placement = null
    }
    if (currentPlacement !== position || !placement) {
      try {
        placement = ctx.ui.requestDockPanel({
          edge: position, title: 'EchoChamber', resizable: true, respectRequestedEdge: true,
          size: position === 'left' || position === 'right' ? Number(settings.panelWidth) || 350 : Number(settings.chatHeight) || 250,
          minSize: position === 'left' || position === 'right' ? 240 : 180,
          maxSize: 1000, persistGeometry: `echochamber-upstream-${position}`,
        })
        placement.root.classList.add('ec-lumiverse-mount')
        currentPlacement = position
      } catch (error) {
        console.error('[EchoChamber] Dock placement failed:', error)
        currentPlacement = 'drawer'
      }
    }
    ;(placement?.root?.isConnected ? placement.root : panelParking).append(element)
  }

  const unsub = ctx.onBackendMessage(payload => {
    if (payload?.type !== 'bridge_response') return
    const entry = pending.get(payload.id)
    if (!entry) return
    pending.delete(payload.id)
    entry.signal?.removeEventListener('abort', entry.onAbort)
    if (payload.error) entry.reject(new Error(payload.error))
    else entry.resolve(payload.result)
  })

  globalThis.jQuery = jQuery
  globalThis.$ = jQuery
  globalThis.SillyTavern = { getContext: () => context, libs: { DOMPurify } }
  globalThis.echoBridgeRefresh = refresh
  globalThis.echoBridgeFetch = bridgeFetch
  globalThis.echoBridgePlacePanel = placePanel

  const ready = request('hydrate').then(data => {
    context.extensionSettings.discord_chat = data.settings || {}
    applySnapshot(data.snapshot)
    startEchoChamber()
  }).catch(error => console.error('[EchoChamber] Initialization failed:', error))

  const unChat = ctx.events.on('CHAT_SWITCHED', () => {
    void ready.then(refresh).then(() => emit('CHAT_CHANGED')).catch(error => console.error('[EchoChamber] Chat switch failed:', error))
  })
  const unGeneration = ctx.events.on('GENERATION_ENDED', () => {
    void ready.then(refresh).then(() => emit('MESSAGE_RECEIVED')).catch(error => console.error('[EchoChamber] Chat update failed:', error))
  })

  return () => {
    alive = false
    rootObserver.disconnect()
    clearTimeout(saveTimer)
    unChat?.(); unGeneration?.(); unsub?.()
    for (const entry of pending.values()) entry.reject(new Error('EchoChamber unloaded'))
    pending.clear()
    placement?.destroy(); settingsTab.destroy(); drawer.destroy(); removeCss?.()
    settingsParking.remove(); panelParking.remove()
    document.querySelectorAll('#ec_floating_panel,#ec_settings_modal,#ec_style_editor_modal,#ec_template_creator_modal,#ec_style_menu_body,#ec_overflow_menu_body').forEach(node => node.remove())
    delete globalThis.SillyTavern
    delete globalThis.echoBridgeRefresh
    delete globalThis.echoBridgeFetch
    delete globalThis.echoBridgePlacePanel
  }
}
