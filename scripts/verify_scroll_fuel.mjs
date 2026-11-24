// Scroll Fuel end to end: in-app simulator + the real MV3 extension gating a local fake feed page.
// Needs: `node scripts/build_extension.mjs --dev`, `vite preview --port 4173`, Playwright (PLAYWRIGHT_MODULE).
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
const out = resolve(root, 'outputs/flux_qa')
const ext = resolve(root, 'extension/dist')
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const BASE = process.env.FLUX_URL || 'http://localhost:4173'
const errors = []
const watch = (p) => { p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|play\(\)|ERR_/.test(m.text())) errors.push(m.text()) }) }

// a generic, unbranded fake feed (stands in for a gated site in tests only)
const server = createServer((req, res) => {
  res.setHeader('content-type', 'text/html')
  res.end(`<!doctype html><title>fake feed</title><body style="margin:0;font:20px system-ui;background:#111;color:#fff">
  ${Array.from({ length: 20 }, (_, i) => `<section style="height:100vh;display:grid;place-items:center;background:hsl(${i * 37},60%,30%)">Fake post ${i + 1}<video muted loop></video></section>`).join('')}</body>`)
}).listen(4180)

const ctx = await chromium.launchPersistentContext(await mkdtemp(join(tmpdir(), 'sp-ext-')), {
  channel: 'chromium', headless: true, viewport: { width: 420, height: 860 },
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
})
let [sw] = ctx.serviceWorkers()
const extId = await (async () => {
  // MV3 without a background worker: read the id from the extensions page instead
  const p = await ctx.newPage()
  await p.goto('chrome://extensions')
  const id = await p.evaluate(() => document.querySelector('extensions-manager')?.shadowRoot?.querySelector('extensions-item-list')?.shadowRoot?.querySelector('extensions-item')?.id)
  await p.close()
  return id
})()
void sw
assert.ok(extId, 'extension loaded')

// ---- 1. in-app simulator (open web, no extension APIs)
const page = await ctx.newPage(); watch(page)
await page.goto(`${BASE}/#/flux-fuel`)
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('flux:mute', '1') })
await page.reload(); await page.waitForSelector('.fx-phone')
await page.locator('.fx-phone').scrollIntoViewIfNeeded()
await page.screenshot({ path: `${out}/60_fuel_page.png` })
await page.waitForSelector('.fx-sim-toll .fx-toll', { timeout: 20000 }) // ×60 demo speed: 10 min of fuel in ~10 s
await page.waitForTimeout(1600)
await page.locator('.fx-phone').screenshot({ path: `${out}/61_sim_tollbooth.png` })
await page.locator('.fx-sim-toll').getByRole('button', { name: /DM/ }).click()
await page.waitForFunction(() => !document.querySelector('.fx-sim-toll'))

// ---- 2. the real extension on a gated (fake) feed
const feed = await ctx.newPage(); watch(feed)
await feed.goto(`chrome-extension://${extId}/index.html#/flux-fuel`)
await feed.evaluate(() => chrome.storage.local.set({ fuelMs: 4000, lastDrainAt: Date.now(), enabled: ['demo'], swipes: 0 }))
await feed.goto('http://localhost:4180/fake-feed')
await feed.bringToFront()
await feed.mouse.wheel(0, 900); await feed.waitForTimeout(400); await feed.mouse.wheel(0, 900)
await feed.waitForSelector('#capable-tollbooth', { timeout: 15000 })
const toll = feed.frameLocator('#capable-tollbooth iframe')
await toll.locator('.fx-toll').waitFor({ timeout: 10000 })
await feed.waitForTimeout(1500)
await feed.screenshot({ path: `${out}/62_ext_tollbooth.png` })
// page scripts cannot forge an unlock
await feed.evaluate(() => window.postMessage({ type: 'FLUX_UNLOCKED', minutes: 30, nonce: 'x' }, '*'))
await feed.waitForTimeout(800)
assert.equal(await feed.locator('#capable-tollbooth').count(), 1, 'forged unlock was ignored')
// solve: tap options until the card resolves, then take whatever the toll grants
const opts = toll.locator('.fx-reel-opts button, .fx-split-half, .fx-bubbles button')
await toll.locator('.fx-reel-opts button, .fx-split-half, .fx-bubbles button, .fx-spot').first().waitFor({ timeout: 8000 })
await feed.waitForTimeout(1400) // the "look first" lock
await feed.screenshot({ path: `${out}/62b_ext_question.png` })
if (await opts.count()) await opts.first().click()
else await toll.locator('.fx-spot').click({ position: { x: 150, y: 300 } })
await feed.waitForTimeout(900)
await feed.screenshot({ path: `${out}/63_ext_answered.png` })
const unlock = toll.getByRole('button', { name: /back to|Take a breath/ })
if (await unlock.count()) await unlock.click()
else {
  await toll.getByRole('button', { name: /Follow-up card/ }).waitFor({ timeout: 8000 })
  await feed.waitForTimeout(500)
  await toll.getByRole('button', { name: /Follow-up card/ }).click()
  await feed.waitForTimeout(1500)
  await toll.getByRole('button', { name: /DM|back to|breath/ }).first().click().catch(async () => {
    const o = toll.locator('.fx-reel-opts button, .fx-split-half, .fx-bubbles button'); if (await o.count()) await o.first().click(); else await toll.locator('.fx-spot').click()
    await feed.waitForTimeout(900)
    await toll.getByRole('button', { name: /back to|breath|Follow-up/ }).first().click()
  })
}
await feed.waitForFunction(() => !document.getElementById('capable-tollbooth'), null, { timeout: 15000 })
const tank = await (await ctx.newPage()).evaluate(() => 0).catch(() => 0)
void tank
console.log(JSON.stringify({ extId, errors }, null, 1))
assert.deepEqual(errors, [])
await ctx.close(); server.close()
console.log('Scroll Fuel OK ->', out)
