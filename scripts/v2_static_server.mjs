// Test server for app/dist with fault injection. Usage: node scripts/v2_static_server.mjs [--port 4174] [--latency 1500] [--fail-media]
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
const args = process.argv.slice(2)
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const PORT = Number(opt('--port', 4174)), LAT = Number(opt('--latency', 0)), FAIL_MEDIA = args.includes('--fail-media')
const ROOT = join(import.meta.dirname, '..', 'app', 'dist')
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.m4a': 'audio/mp4', '.wav': 'audio/wav' }
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  if (LAT) await new Promise((r) => setTimeout(r, LAT))
  if (FAIL_MEDIA && /^\/(media|fixtures)\//.test(url.pathname)) { res.writeHead(404); return res.end('media disabled for test') }
  let p = normalize(join(ROOT, decodeURIComponent(url.pathname)))
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end() }
  try { if ((await stat(p)).isDirectory()) p = join(p, 'index.html') } catch { p = join(ROOT, 'index.html') }
  try {
    const body = await readFile(p)
    res.writeHead(200, { 'Content-Type': TYPES[extname(p)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' })
    res.end(body)
  } catch { res.writeHead(404); res.end() }
}).listen(PORT, () => console.log(`serving ${ROOT} on :${PORT} latency=${LAT} failMedia=${FAIL_MEDIA}`))
