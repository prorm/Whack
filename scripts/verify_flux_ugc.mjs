// FLUX Field Scars + Lab Blueprint walkthrough. Needs `vite preview --port 4173` and Playwright (PLAYWRIGHT_MODULE).
// Gate → sieve catches a recycled image → real-looking capture passes → 2-of-3 review → card in feed →
// challenge → patch. Then the EV episode, compiled from JSON, end to end.
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
const out = resolve(root, 'outputs/flux_qa')
const fx = resolve(out, 'fixtures')
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2 })).newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|play\(\)/.test(m.text())) errors.push(m.text()) })
const BASE = process.env.FLUX_URL || 'http://localhost:4173'
const shot = (n) => page.screenshot({ path: `${out}/${n}.png`, fullPage: n.endsWith('_full') })
const click = async (name) => { await page.getByRole('button', { name }).first().click(); await page.waitForTimeout(250) }
const setRange = (loc, v) => loc.evaluate((el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(v)); el.dispatchEvent(new Event('input', { bubbles: true })) }, v)

await page.goto(`${BASE}/#/flux`)
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('flux:mute', '1') })
await page.reload(); await page.waitForSelector('.fx-scars')
await page.locator('.fx-scars:not(.fuel)').scrollIntoViewIfNeeded(); await shot('40_hub_scars')

// ---- prove it to post it
await page.goto(`${BASE}/#/flux-studio`); await page.waitForSelector('.fx-gate')
await shot('41_studio_locked')
await click(/DEMO: get a vouch/)
await page.waitForSelector('.fx-file')

// ---- recycled image is blocked
await page.setInputFiles('.fx-file input', resolve(fx, 'dup_mc4.jpg'))
await page.waitForSelector('.fx-checks')
const dupText = await page.textContent('.fx-checks')
assert.match(dupText, /Duplicate of an existing card/)
await page.locator('.fx-checks').scrollIntoViewIfNeeded(); await shot('42_sieve_duplicate')

// ---- a fresh capture passes
await page.setInputFiles('.fx-file input', resolve(fx, 'fresh.jpg'))
await page.waitForFunction(() => !document.querySelector('.fx-checks')?.textContent?.includes('Duplicate'))
const mark = page.locator('.fx-mark'); const box = await mark.boundingBox()
await mark.click({ position: { x: box.width * 0.62, y: box.height * 0.4 } })
await page.getByPlaceholder(/Two different MC4/).fill('Two different MC4 brands were mated; the joint heated up under load and melted.')
await page.getByPlaceholder('Any MC4 fits any MC4').fill('Any MC4 fits any MC4')
await page.getByPlaceholder(/Only mate connectors/).fill('Only mate connectors of the same type, crimped with the right tool.')
await page.locator('.fx-inputs.three input').nth(0).fill('Manjunath K.')
await page.locator('.fx-inputs.three input').nth(1).fill('Solar installer')
for (const c of await page.locator('.fx-check input').all()) await c.check()
await page.locator('.fx-preview').scrollIntoViewIfNeeded(); await shot('43_studio_preview')
const submit = page.getByRole('button', { name: /Send to 2-of-3 master review/ })
assert.equal(await submit.isEnabled(), true, await page.textContent('.fx-checks'))
await submit.click()

// ---- 2-of-3 review
await page.waitForSelector('.fx-qitem.pending')
await shot('44_queue_pending')
await page.locator('.fx-master').nth(0).getByRole('button', { name: 'Approve' }).click()
await page.locator('.fx-master').nth(1).getByRole('button', { name: 'Approve' }).click()
await page.waitForSelector('.fx-qitem.live')
await shot('45_queue_live')

// ---- the card is in the feed with its provenance; challenge it
await page.goto(`${BASE}/#/flux-reels`); await page.waitForSelector('.fx-reel')
const idx = await page.$$eval('.fx-reel-slot', (els) => els.findIndex((e) => e.textContent?.includes('Field Scar') || e.querySelector('[data-scar]')))
const slots = await page.locator('.fx-reel-slot').count()
let found = -1
for (let i = 0; i < slots; i++) {
  await page.locator('.fx-feed').evaluate((el, i) => el.scrollTo(0, el.clientHeight * i), i); await page.waitForTimeout(450)
  if (await page.locator('.fx-reel-slot').nth(i).locator('.fx-badge.field').count()) { found = i; break }
}
assert.ok(found >= 0, `community card not in feed (${idx})`)
await shot('46_feed_field_scar')
const slot = page.locator('.fx-reel-slot').nth(found)
await slot.locator('.fx-spot').click({ position: { x: 240, y: 330 } }); await page.waitForTimeout(600)
await slot.getByRole('button', { name: /Challenge this rule/ }).click()
await slot.locator('textarea').nth(0).fill('Crimp tool matters as much as the connector brand here')
await slot.locator('textarea').nth(1).fill('Manufacturer instructions: use the specified crimp tool')
await slot.getByRole('button', { name: 'File challenge' }).click()
await page.waitForSelector('.fx-chal-done'); await shot('47_feed_challenged')

await page.goto(`${BASE}/#/flux-queue`); await page.waitForSelector('.fx-challenge')
await page.getByPlaceholder(/Corrected explanation/).fill('Mate only same-type connectors and crimp them with the specified tool.')
await click('Patch'); await page.waitForTimeout(300)
assert.match(await page.textContent('.fx-changelog'), /Patched after challenge/)
await shot('48_queue_patched_full')

// ---- EV episode from a JSON blueprint
await page.goto(`${BASE}/#/flux-ev`); await page.waitForSelector('.fx-plate')
await page.waitForTimeout(2500); await shot('50_ev_open')
await page.waitForSelector('.fx-cta.in', { timeout: 15000 }); await click(/Investigate/)
await click(/plugged in/); await click('Lock my bet')
await page.waitForSelector('.fx-gatebar.ok', { timeout: 5000 })
const clockInput = () => page.locator('.fx-slider input').nth(1)
await setRange(clockInput(), 21)
await page.waitForSelector('.fx-mission.won'); await shot('51_ev_tripped')
await click(/Next mission/)
await setRange(page.locator('.fx-slider input').nth(0), 26)
await click(/Run the evening/); await page.waitForTimeout(6800)
assert.match(await page.textContent('.fx-note'), /Tripped/)
await setRange(page.locator('.fx-slider input').nth(0), 23)
await page.getByRole('button', { name: /Reset main breaker/ }).click().catch(() => {})
await click(/Run the evening/); await page.waitForTimeout(6800)
await page.waitForSelector('.fx-mission.won'); await shot('52_ev_fixed')
await click(/Next mission/)
await click(/Load balancing: OFF/)
await page.waitForSelector('.fx-mission.won'); await shot('53_ev_balanced')
await click(/Settle my bet/); await page.waitForSelector('.fx-verdict'); await click(/Forge the rule/)
await click('40 A'); await page.waitForTimeout(300); await shot('54_ev_rule')
await click(/Take a real work order/)
const g = await page.$$eval('.fx-ticket dd', (d) => d.map((x) => parseFloat(x.textContent)))
const [main, base, ac, cook] = g
const fixed = Math.min(32, Math.floor(main - (base + ac + cook) * 1000 / 230)), dinner = Math.min(32, Math.floor(main - (base + ac + cook) * 1000 / 230 - 2))
await page.locator('.fx-inputs input').nth(0).fill(String(fixed)); await page.locator('.fx-inputs input').nth(1).fill(String(dinner))
await click('Check by code'); await page.waitForSelector('.fx-result.ok'); await shot('55_ev_work')
await click(/Finish episode/); await page.waitForSelector('.fx-wrap')

console.log(JSON.stringify({ errors }, null, 1))
assert.deepEqual(errors, [])
await browser.close()
console.log('FLUX UGC + blueprint walkthrough OK ->', out)
