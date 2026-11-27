import { createServer } from 'node:http'
import { createHash, randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { dirname, extname, resolve, sep } from 'node:path'
import { loadEnvFile } from 'node:process'
import { DatabaseSync } from 'node:sqlite'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
import { makeTask } from '../app/src/flux/assess.ts'
import { makeRecord } from '../app/src/flux/passport.ts'
import { createGemini, makeBudget } from './capable_gemini.mjs'
import { capableUpgrade } from './capable_upgrade.mjs'
import EV_BLUEPRINT from '../app/src/flux/blueprints/ev_charger.json' with { type: 'json' }

const root = resolve(import.meta.dirname, '../app/dist')
try { loadEnvFile(resolve(import.meta.dirname, '../.env')) } catch (error) { if (error.code !== 'ENOENT') throw error }
const args = process.argv.slice(2)
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback
const port = Number(option('--port', process.env.PORT || 4173))
const host = option('--host', '127.0.0.1')
const data = option('--data', resolve(import.meta.dirname, '../app/.data/progress.sqlite'))
const latency = Number(option('--latency', '0'))
const metrics = args.includes('--metrics')
const failMedia = args.includes('--fail-media')
if (data !== ':memory:') await mkdir(dirname(data), { recursive: true })
const db = new DatabaseSync(data)
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = FULL;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS proof_share (
    token TEXT PRIMARY KEY, device TEXT NOT NULL, payload TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL
  );
`)
const modelData = resolve(import.meta.dirname, '../app/.data/capable-gemini.sqlite')
await mkdir(dirname(modelData), { recursive: true })
const modelDb = new DatabaseSync(modelData)
modelDb.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 5000;')
const upgrade = capableUpgrade(db, createGemini({ budget: makeBudget(modelDb, Number(process.env.CAPABLE_GEMINI_BUDGET_USD ?? process.env.MAX_TEST_BUDGET_USD ?? 4.75)) }))

const id = (value) => typeof value === 'string' && /^[a-z0-9:_-]{1,120}$/i.test(value)
const tokenPattern = /^Bearer ([a-f0-9-]{36})$/i
const hash = (value) => createHash('sha256').update(value).digest()
const addShare = db.prepare('INSERT INTO proof_share (token, device, payload, at) VALUES (?, ?, ?, ?)')
const revokeShare = db.prepare('UPDATE proof_share SET revoked = 1 WHERE token = ? AND device = ?')
const readShare = db.prepare('SELECT payload, revoked, at FROM proof_share WHERE token = ?')
const ASSESSMENTS = new Set(['quick.series', 'wo.solar-string', 'wo.ev-load', 'quick.idempotency', 'quick.backoff'])
/** Re-grade a learner's record from its seed and raw answers. The client's grade is never trusted. */
function regrade(record) {
  if (!record || typeof record !== 'object' || !ASSESSMENTS.has(record.assessmentId) || !id(record.id) ||
      !Number.isSafeInteger(record.seed) || record.seed < 1 || !Number.isSafeInteger(record.at) ||
      !record.response || typeof record.response !== 'object' || !['live', 'demo_seed'].includes(record.source)) return null
  const response = {}
  for (const [k, v] of Object.entries(record.response)) {
    if (typeof v !== 'string' || v.length > 48 || !/^[a-z]{1,12}$/i.test(k)) return null
    response[k] = v
  }
  const task = makeTask(record.assessmentId, record.seed, EV_BLUEPRINT)
  if (task.version !== record.version) return null
  return makeRecord(task, response, record.at, record.id, record.source)
}
function json(response, status, body) {
  const encoded = JSON.stringify(body)
  response.setHeader('Content-Length', Buffer.byteLength(encoded))
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(encoded)
}

async function readJson(request, limit = 128_000) {
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > limit) throw new Error('Request too large')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

async function api(request, response, pathname) {
  if (request.method !== 'POST' || !request.headers['content-type']?.startsWith('application/json')) {
    return json(response, 405, { error: 'Use a JSON POST request.' })
  }
  const token = tokenPattern.exec(request.headers.authorization ?? '')?.[1]
  if (!token) return json(response, 401, { error: 'This learner session is missing.' })
  const device = hash(token).toString('hex')
  let body
  const mediaLimit = /^\/api\/capable\/(lens|mentor)$/.test(pathname) ? 700_000 : 128_000
  try { body = await readJson(request, mediaLimit) } catch { return json(response, 400, { error: 'Invalid or oversized request.' }) }
  if (!body || typeof body !== 'object') return json(response, 400, { error: 'Invalid request.' })

  if (pathname.startsWith('/api/capable/')) {
    const [status, payload] = await upgrade.handle(pathname.slice('/api/capable/'.length), device, body)
    return json(response, status, payload)
  }

  if (pathname === '/api/proof/share') {
    const server = regrade(body.record)
    if (!server) return json(response, 400, { error: 'Invalid evidence record.' })
    if (JSON.stringify(server.outcomes) !== JSON.stringify(body.record.outcomes)) {
      return json(response, 422, { error: 'The grade on this record does not match a fresh grade of its answers.' })
    }
    const token = randomUUID()
    addShare.run(token, device, JSON.stringify(server), Date.now())
    return json(response, 200, { token, regraded: true })
  }
  if (pathname === '/api/proof/revoke') {
    const { token: shareToken } = body
    if (typeof shareToken !== 'string' || !/^[a-f0-9-]{36}$/.test(shareToken)) return json(response, 400, { error: 'Invalid link.' })
    const result = revokeShare.run(shareToken, device)
    return result.changes ? json(response, 200, { revoked: true }) : json(response, 404, { error: 'Only the learner who created a link can revoke it.' })
  }
  return json(response, 404, { error: 'Endpoint not found.' })
}

const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary',
  '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.vtt': 'text/vtt; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2',
}
const compressedFiles = new Map()
async function file(request, response, pathname) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return json(response, 405, { error: 'Method unavailable.' })
  const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname))
  if (!path.startsWith(root + sep)) return json(response, 404, { error: 'File not found.' })
  const info = await stat(path).catch(() => null)
  if (!info?.isFile()) return json(response, 404, { error: 'File not found.' })
  const headers = {
    'Content-Type': contentTypes[extname(path)] ?? 'application/octet-stream',
    'Cache-Control': /^\/assets\//.test(pathname) ? 'public, max-age=31536000, immutable'
      : /^\/media\//.test(pathname) ? 'public, max-age=14400' : 'no-cache',
    'Accept-Ranges': 'bytes',
  }
  let start = 0, end = info.size - 1
  const range = request.headers.range
  if (!range && /\.(html|css|js|json|svg)$/.test(path)) {
    headers.Vary = 'Accept-Encoding'
    const accepts = request.headers['accept-encoding'] ?? ''
    const encoding = /\bbr\b/.test(accepts) ? 'br' : /\bgzip\b/.test(accepts) ? 'gzip' : null
    if (encoding) {
      const key = `${encoding}:${info.mtimeMs}:${path}`
      if (!compressedFiles.has(key)) {
        const raw = await readFile(path)
        const compressed = encoding === 'br'
          ? brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 4 } }) : gzipSync(raw)
        compressedFiles.set(key, compressed)
      }
      const body = compressedFiles.get(key)
      response.setHeader('Content-Length', body.length)
      response.writeHead(200, { ...headers, 'Content-Encoding': encoding })
      return response.end(request.method === 'HEAD' ? undefined : body)
    }
  }
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    start = match?.[1] ? Number(match[1]) : Math.max(0, info.size - Number(match?.[2]))
    if (match?.[1] && match[2]) end = Math.min(end, Number(match[2]))
    if (!match || (!match[1] && !match[2]) || start > end || start >= info.size) {
      response.writeHead(416, { 'Content-Range': `bytes */${info.size}` })
      return response.end()
    }
    headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`
  }
  response.setHeader('Content-Length', Math.max(0, end - start + 1))
  response.writeHead(range ? 206 : 200, headers)
  if (request.method === 'HEAD' || info.size === 0) return response.end()
  const stream = createReadStream(path, { start, end })
  response.on('close', () => stream.destroy())
  stream.on('error', () => response.destroy())
  stream.pipe(response)
}

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    if (metrics && request.method !== 'HEAD') response.once('finish', () => console.log(JSON.stringify({
      path: pathname, status: response.statusCode, bytes: Number(response.getHeader('Content-Length')) || 0,
    })))
    if (latency > 0) await new Promise((resolveDelay) => setTimeout(resolveDelay, latency))
    if (failMedia && /^\/(media|fixtures)\//.test(pathname)) return json(response, 404, { error: 'Media unavailable.' })
    if (request.method === 'GET' && (pathname === '/api/capable/key' || pathname.startsWith('/api/capable/public/'))) {
      const [status, payload] = upgrade.public(pathname)
      return json(response, status, payload)
    }
    const shared = /^\/api\/proof\/public\/([a-f0-9-]{36})$/.exec(pathname)
    if (shared && request.method === 'GET') {
      const row = readShare.get(shared[1])
      if (!row) return json(response, 404, { error: 'No record at this link.' })
      if (row.revoked) return json(response, 410, { error: 'The learner revoked this link.' })
      return json(response, 200, { record: JSON.parse(row.payload), regraded: true, at: row.at })
    }
    if (pathname.startsWith('/api/')) await api(request, response, pathname)
    else await file(request, response, pathname)
  } catch (error) {
    console.error(error.message)
    if (!response.headersSent) json(response, 500, { error: 'The service could not finish the request.' })
    else response.destroy()
  }
}).listen(port, host, () => console.log(`CAPABLE at http://${host}:${port}`))
