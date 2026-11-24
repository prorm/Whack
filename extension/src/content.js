// ScrollProof Scroll Fuel: content script. Drains the tank while a gated feed is on screen; when it is empty,
// slides the FLUX tollbooth (an extension page, so the whole deck runs offline) over the feed.
// Nothing is read from the page except its URL. Nothing is sent anywhere.
(() => {
  const MIN = 60_000
  const TANK_MAX = 30 * MIN
  const DEFAULT_ENABLED = ['instagram', 'youtube-shorts']
  const SITES = [
    ['instagram', (u) => /(^|\.)instagram\.com$/.test(u.hostname)],
    ['youtube-shorts', (u) => /(^|\.)youtube\.com$/.test(u.hostname) && u.pathname.startsWith('/shorts')],
    ['reddit', (u) => /(^|\.)reddit\.com$/.test(u.hostname)],
    ['x', (u) => /(^|\.)(x|twitter)\.com$/.test(u.hostname)],
    /*DEV_SITES*/
  ]
  const siteOf = (href, enabled) => {
    try { const u = new URL(href); const hit = SITES.find(([id, m]) => enabled.includes(id) && m(u)); return hit ? hit[0] : null } catch { return null }
  }
  const isShortVideo = (href) => /\/(reels?|shorts)\//.test(href) || /[?&]v=/.test(href)

  let overlay = null, frame = null, nonce = '', pauseTimer = 0, lastHref = location.href
  const store = chrome.storage.local

  function blockKeys(e) { if (overlay && !overlay.contains(e.target)) { e.stopImmediatePropagation(); e.preventDefault() } }
  function pauseMedia() { document.querySelectorAll('video, audio').forEach((m) => { try { m.pause() } catch { /* ignore */ } }) }

  function show(site, swipes) {
    if (overlay?.isConnected) return
    nonce = Math.random().toString(36).slice(2)
    overlay = document.createElement('div')
    overlay.id = 'scrollproof-tollbooth'
    overlay.setAttribute('style', 'position:fixed;inset:0;z-index:2147483647;background:rgba(6,7,12,.96);display:block;animation:spIn .45s cubic-bezier(.2,1.1,.3,1) both')
    const style = document.createElement('style')
    style.textContent = '@keyframes spIn{from{transform:translateY(100%)}}'
    overlay.appendChild(style)
    frame = document.createElement('iframe')
    frame.src = chrome.runtime.getURL(`index.html#/flux-gate?app=${site}&swipes=${swipes}&n=${nonce}`)
    frame.setAttribute('allow', 'autoplay')
    frame.setAttribute('title', 'ScrollProof tollbooth')
    frame.setAttribute('style', 'border:0;width:100%;height:100%;display:block;background:#06070c')
    overlay.appendChild(frame)
    document.documentElement.appendChild(overlay)
    document.documentElement.style.setProperty('overflow', 'hidden', 'important')
    pauseMedia()
    pauseTimer = setInterval(pauseMedia, 400) // feeds autoplay the next video; keep it quiet behind the toll
    addEventListener('keydown', blockKeys, true)
    frame.focus()
  }

  function hide() {
    clearInterval(pauseTimer)
    removeEventListener('keydown', blockKeys, true)
    overlay?.remove()
    overlay = frame = null
    document.documentElement.style.removeProperty('overflow')
  }

  addEventListener('message', (e) => {
    // only the tollbooth iframe we created can refuel; the page's own scripts cannot forge it
    if (!frame || e.source !== frame.contentWindow) return
    const d = e.data || {}
    if ((d.type !== 'FLUX_UNLOCKED' && d.type !== 'FLUX_ESCAPE') || d.nonce !== nonce) return
    const minutes = Math.max(0, Math.min(30, Number(d.minutes) || 0))
    store.set({ fuelMs: Math.min(TANK_MAX, minutes * MIN), lastDrainAt: Date.now(), swipes: 0 }).then(hide)
  })

  async function tick() {
    const s = await store.get(['fuelMs', 'lastDrainAt', 'enabled', 'swipes'])
    const enabled = Array.isArray(s.enabled) ? s.enabled : DEFAULT_ENABLED
    const site = siteOf(location.href, enabled)
    if (!site) { if (overlay) hide(); return }
    let fuel = typeof s.fuelMs === 'number' ? s.fuelMs : 10 * MIN
    let swipes = s.swipes || 0
    if (location.href !== lastHref) { if (isShortVideo(location.href)) swipes++; lastHref = location.href }
    const now = Date.now()
    if (fuel <= 0) { show(site, swipes); return }
    const active = document.visibilityState === 'visible' && document.hasFocus()
    const gap = now - (s.lastDrainAt || now)
    if (active && gap > 0 && gap <= 1500) fuel = Math.max(0, fuel - gap)
    await store.set({ fuelMs: fuel, lastDrainAt: now, swipes })
    if (fuel <= 0) show(site, swipes)
  }
  setInterval(() => { tick().catch(() => {}) }, 500)
})()
