const VERSION = '__VERSION__'
const SHELL = `scrollproof-${VERSION}`
const MEDIA = `${SHELL}-media`
const URLS = __URLS__
const MAX_MEDIA_ITEMS = 12
const inflight = new Map()

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL)
    .then((cache) => cache.addAll(URLS))
    .then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('scrollproof-') && name !== SHELL && name !== MEDIA) await caches.delete(name)
    }
    await self.clients.claim()
  })())
})

async function rangeResponse(request, response) {
  const buf = await response.arrayBuffer()
  const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '')
  const length = buf.byteLength
  const start = match?.[1] ? Number(match[1]) : Math.max(0, length - Number(match?.[2]))
  const end = match?.[1] && match[2] ? Math.min(length - 1, Number(match[2])) : length - 1
  if (!match || (!match[1] && !match[2]) || start > end || start >= length) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${length}` } })
  }
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Range': `bytes ${start}-${end}/${length}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  })
}

async function cacheMedia(url, cache) {
  const response = await fetch(url)
  if (response.ok && response.status === 200 && Number(response.headers.get('content-length')) <= 600_000) {
    try {
      await cache.put(url, response.clone())
      const keys = await cache.keys()
      await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_MEDIA_ITEMS)).map((key) => cache.delete(key)))
    } catch { /* If storage is full, still deliver the response. */ }
  }
  return response
}

async function media(request) {
  const url = request.url
  const cache = await caches.open(MEDIA)
  let response = await cache.match(url)
  if (!response) {
    if (!inflight.has(url)) {
      inflight.set(url, cacheMedia(url, cache).finally(() => inflight.delete(url)))
    }
    response = (await inflight.get(url)).clone()
  }
  return response.ok && request.headers.has('range') ? rangeResponse(request, response) : response
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return
  if (request.mode === 'navigate') {
    event.respondWith(caches.open(SHELL).then(async (cache) => (await cache.match('/index.html')) ?? fetch(request)))
  } else if (URLS.includes(url.pathname)) {
    event.respondWith(caches.open(SHELL).then(async (cache) => (await cache.match(url.pathname)) ?? fetch(request)))
  } else if (/^\/(media|fixtures)\//.test(url.pathname)) {
    event.respondWith(media(request))
  }
})
