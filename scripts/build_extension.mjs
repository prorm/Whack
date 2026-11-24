// Pack the FLUX app into a Chrome/Edge MV3 extension: extension/dist = built app + manifest + content script.
//   node scripts/build_extension.mjs          production (Instagram, YouTube Shorts, Reddit, X)
//   node scripts/build_extension.mjs --dev    also gates http://localhost/fake-feed* for automated tests
import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dev = process.argv.includes('--dev')
const out = join(root, 'extension', 'dist')
if (!process.argv.includes('--no-build')) execSync('npm run build', { cwd: join(root, 'app'), stdio: 'inherit' })
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
cpSync(join(root, 'app', 'dist'), out, { recursive: true })
// the extension has no service worker for the app: files are local already
for (const f of ['sw.js', 'precache-manifest.json']) rmSync(join(out, f), { force: true })

const sites = ['https://*.instagram.com/*', 'https://*.youtube.com/*', 'https://*.reddit.com/*', 'https://x.com/*', 'https://twitter.com/*']
if (dev) sites.push('http://localhost/*', 'http://127.0.0.1/*')
let content = readFileSync(join(root, 'extension', 'src', 'content.js'), 'utf8')
content = content.replace('/*DEV_SITES*/', dev ? "['demo', (u) => /^(localhost|127\\.0\\.0\\.1)$/.test(u.hostname) && u.pathname.startsWith('/fake-feed')]," : '')
if (dev) content = content.replace("const DEFAULT_ENABLED = ['instagram', 'youtube-shorts']", "const DEFAULT_ENABLED = ['instagram', 'youtube-shorts', 'demo']")
writeFileSync(join(out, 'content.js'), content)
writeFileSync(join(out, 'popup.html'), '<!doctype html><meta charset="utf-8"><title>Scroll Fuel</title><script src="popup.js"></script>')
writeFileSync(join(out, 'popup.js'), "location.replace('index.html#/flux-fuel')")

const manifest = {
  manifest_version: 3,
  name: 'ScrollProof · Scroll Fuel' + (dev ? ' (dev)' : ''),
  version: '0.1.0',
  description: 'Keep your feed. The toll is one 8-second recall card. Runs offline; nothing leaves your device.',
  permissions: ['storage'],
  action: { default_popup: 'popup.html', default_title: 'Scroll Fuel' },
  content_scripts: [{ matches: sites, js: ['content.js'], run_at: 'document_idle' }],
  web_accessible_resources: [{ resources: ['index.html', 'assets/*', 'media/*', 'favicon.svg'], matches: sites }],
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`extension ${dev ? '(dev) ' : ''}-> ${out}`)
