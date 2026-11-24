import { createServer } from 'node:http'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { dirname, extname, resolve, sep } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
import { grade, payoutTask } from '../app/src/engine/proof.ts'
import { gradeInventory, variant } from '../app/src/moonshot/domain.ts'
import { makeTask } from '../app/src/flux/assess.ts'
import { makeRecord } from '../app/src/flux/passport.ts'
import EV_BLUEPRINT from '../app/src/flux/blueprints/ev_charger.json' with { type: 'json' }

const root = resolve(import.meta.dirname, '../app/dist')
const args = process.argv.slice(2)
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback
const port = Number(option('--port', process.env.PORT || 4173))
const host = option('--host', '127.0.0.1')
const data = option('--data', resolve(import.meta.dirname, '../app/.data/progress.sqlite'))
const latency = Number(option('--latency', '0'))
const metrics = args.includes('--metrics')
const failMedia = args.includes('--fail-media')
const trainerSecret = process.env.CAPABLE_TRAINER_CODE ?? process.env.SCROLLPROOF_TRAINER_CODE
if (data !== ':memory:') await mkdir(dirname(data), { recursive: true })
const db = new DatabaseSync(data)
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = FULL;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS journal (
    device TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL,
    PRIMARY KEY (device, kind, id)
  );
  CREATE TABLE IF NOT EXISTS review (
    device TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL,
    PRIMARY KEY (device, id)
  );
  CREATE TABLE IF NOT EXISTS proof_share (
    token TEXT PRIMARY KEY, device TEXT NOT NULL, payload TEXT NOT NULL, revoked INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS mission_evidence (
    device TEXT NOT NULL, id TEXT NOT NULL, payload TEXT, receipt TEXT, withdrawn INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (device, id)
  );
`)

const insert = db.prepare('INSERT OR IGNORE INTO journal VALUES (?, ?, ?, ?)')
const find = db.prepare("SELECT payload FROM journal WHERE device = ? AND kind = 'submission' AND id = ?")
const findReceipt = db.prepare('SELECT payload FROM review WHERE device = ? AND id = ?')
const insertReceipt = db.prepare('INSERT OR IGNORE INTO review VALUES (?, ?, ?)')
const id = (value) => typeof value === 'string' && /^[a-z0-9:_-]{1,120}$/i.test(value)
const tokenPattern = /^Bearer ([a-f0-9-]{36})$/i
const cells = ['D2', 'D3', 'D4', 'D5']
const eventTypes = new Set(['answer', 'preference', 'progress', 'exposure'])
const validEvent = (event) => event && id(event.id) && event.learnerId === 'demo-learner' &&
  Number.isSafeInteger(event.at) && eventTypes.has(event.type) && JSON.stringify(event).length < 2400
const validSubmission = (item) => item && id(item.id) && Number.isSafeInteger(item.at) &&
  Number.isInteger(item.seed) && item.seed > 0 && item.seed <= 0xffffffff &&
  item.cells && Object.keys(item.cells).length === cells.length &&
  cells.every((cell) => typeof item.cells[cell] === 'string' && item.cells[cell].length <= 48)
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
const findMission = db.prepare('SELECT * FROM mission_evidence WHERE device = ? AND id = ?')
const addMission = db.prepare('INSERT OR IGNORE INTO mission_evidence (device,id,payload) VALUES (?,?,?)')
const hideMission = db.prepare(`INSERT INTO mission_evidence (device,id,withdrawn) VALUES (?,?,1)
  ON CONFLICT(device,id) DO UPDATE SET payload=NULL,receipt=NULL,withdrawn=1`)
const reviewMission = db.prepare('UPDATE mission_evidence SET receipt = ? WHERE device = ? AND id = ? AND withdrawn = 0')

function json(response, status, body) {
  const encoded = JSON.stringify(body)
  response.setHeader('Content-Length', Buffer.byteLength(encoded))
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(encoded)
}

async function readJson(request) {
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > 128_000) throw new Error('Request too large')
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
  try { body = await readJson(request) } catch { return json(response, 400, { error: 'Invalid request.' }) }
  if (!body || typeof body !== 'object') return json(response, 400, { error: 'Invalid request.' })

  if (pathname === '/api/sync') {
    const { learning, submissions } = body
    if (!Array.isArray(learning) || learning.length > 50 || !learning.every(validEvent) ||
        !Array.isArray(submissions) || submissions.length > 25 || !submissions.every(validSubmission)) {
      return json(response, 400, { error: 'Invalid progress batch.' })
    }
    db.exec('BEGIN IMMEDIATE')
    try {
      for (const event of learning) insert.run(device, 'learning', event.id, JSON.stringify(event))
      for (const item of submissions) insert.run(device, 'submission', item.id, JSON.stringify(item))
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
    return json(response, 200, { ack: [...learning, ...submissions].map((entry) => entry.id) })
  }

  if (pathname === '/api/review') {
    const { submissionId, verifyRows, verifyTotal, decision, reason, trainerCode } = body
    const stored = id(submissionId) && find.get(device, submissionId)
    if (!stored) return json(response, 409, { error: 'Sync this worksheet before requesting review.' })
    const existing = findReceipt.get(device, submissionId)
    if (existing) return json(response, 200, JSON.parse(existing.payload))
    const demo = !trainerSecret
    if (!demo && (typeof trainerCode !== 'string' || !timingSafeEqual(hash(trainerCode), hash(trainerSecret)))) {
      return json(response, 403, { error: 'A valid trainer code is required.' })
    }
    const submission = JSON.parse(stored.payload)
    const { task, key } = payoutTask(submission.seed)
    const assessment = grade(task, key, submission.cells)
    if (decision === 'approved') {
      if (verifyRows !== true || verifyTotal !== true || assessment.status !== 'correct') {
        return json(response, 422, { error: 'Approval requires a correct worksheet and both review checks.' })
      }
    } else if (decision !== 'needs_another_attempt' || typeof reason !== 'string' || !reason.trim() || reason.length > 240) {
      return json(response, 422, { error: 'Provide a reason for requesting another attempt.' })
    }
    const receipt = {
      submissionId, attemptId: task.variantId + ':' + submissionId,
      evidenceId: hash(stored.payload).toString('hex'),
      reviewer: demo ? 'Demo trainer' : 'CAPABLE trainer',
      decision, reason: decision === 'needs_another_attempt' ? reason.trim() : undefined,
      demo, at: Date.now(),
    }
    insertReceipt.run(device, submissionId, JSON.stringify(receipt))
    return json(response, 200, receipt)
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
  if (pathname === '/api/review-config') {
    return json(response, 200, { demo: !trainerSecret })
  }
  if (pathname === '/api/mission') {
    const { action, attemptId } = body
    if (!id(attemptId)) return json(response, 400, { error: 'Invalid worksheet reference.' })
    if (action === 'withdraw') {
      hideMission.run(device, attemptId)
      return json(response, 200, { withdrawn: true })
    }
    if (action === 'submit') {
      const { seed, source, version, expected, variance, at } = body
      if (![seed, version, expected, variance, at].every(Number.isSafeInteger) || seed < 1 || seed > 0xffffffff ||
          version < 1 || version > 10000 || Math.abs(expected) > 300000 || Math.abs(variance) > 300000 || !id(source)) {
        return json(response, 400, { error: 'Invalid worksheet values.' })
      }
      const payload = JSON.stringify({ seed, source, version, expected, variance, at })
      addMission.run(device, attemptId, payload)
      const saved = findMission.get(device, attemptId)
      if (saved?.withdrawn || saved?.payload !== payload) return json(response, 409, { error: 'This worksheet was withdrawn or already saved with different values.' })
      return json(response, 200, { saved: true, receipt: saved.receipt ? JSON.parse(saved.receipt) : null })
    }
    const saved = findMission.get(device, attemptId)
    if (!saved || saved.withdrawn) return json(response, 404, { error: 'Worksheet unavailable for this device.' })
    if (action === 'read') return json(response, 200, { saved: true, receipt: saved.receipt ? JSON.parse(saved.receipt) : null })
    if (action === 'review') {
      if (trainerSecret && (typeof body.code !== 'string' || !timingSafeEqual(hash(body.code), hash(trainerSecret)))) {
        return json(response, 403, { error: 'A valid trainer code is required.' })
      }
      if (saved.receipt) return json(response, 200, JSON.parse(saved.receipt))
      if (body.confirmed !== true) return json(response, 422, { error: 'Confirm the rubric and source version.' })
      const attempt = JSON.parse(saved.payload)
      const grade = gradeInventory(variant(attempt.seed), attempt.expected, attempt.variance)
      const receipt = { attemptId, evidenceId: hash(saved.payload).toString('hex'),
        decision: grade.correct ? 'reviewed' : 'needs_revision', demo: !trainerSecret, at: Date.now() }
      reviewMission.run(JSON.stringify(receipt), device, attemptId)
      return json(response, 200, receipt)
    }
  }
  return json(response, 404, { error: 'Endpoint not found.' })
}

const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp',
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
