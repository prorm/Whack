// FLUX browser walkthrough. Needs `vite preview --port 4173` running and Playwright (PLAYWRIGHT_MODULE).
// Plays both episodes end to end, walks the reels, time-warps, checks the callback rule, saves screenshots.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
const out = resolve(root, 'outputs/flux_qa')
await mkdir(out, { recursive: true })
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2, hasTouch: true })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|play\(\)/.test(m.text())) errors.push(m.text()) })
const BASE = process.env.FLUX_URL || 'http://localhost:4173'
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` })
const click = async (text, opts = {}) => { await page.getByRole('button', { name: text, ...opts }).first().click(); await page.waitForTimeout(250) }

await page.goto(`${BASE}/#/flux`)
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('flux:mute', '1') })
await page.reload()
await page.waitForSelector('.fx-hub')
await shot('01_hub')
await page.setViewportSize({ width: 1280, height: 860 }); await shot('01b_hub_desktop'); await page.setViewportSize({ width: 400, height: 860 })

// ---- Episode 1
await page.click('.fx-ep >> nth=0')
await page.waitForSelector('.fx-plate')
await page.waitForTimeout(3000); await shot('02_cold_open')
await page.waitForSelector('.fx-cta.in', { timeout: 15000 })
await click(/Investigate/)
await click(/Scorching noon/); await click('90%'); await shot('03_bet'); await click('Lock my bet')
await page.waitForSelector('.fx-lab', { timeout: 5000 })
// mission kill: Jan sunrise with 12 locked panels
await click(/January/)
await page.locator('.fx-slider input').evaluate((el) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(83 / 12))
  el.dispatchEvent(new Event('input', { bubbles: true }))
})
await page.waitForSelector('.fx-mission.won', { timeout: 4000 })
await shot('04_lab_kill')
await click(/Next sabotage/)
// mission max: set to 12, run day -> dies; then 11 -> wins
for (let i = 0; i < 4; i++) await click('Add a panel')
await click(/Run the January day/); await page.waitForTimeout(7800)
await shot('05_lab_max_dead')
assert.match(await page.textContent('.fx-note'), /died/)
await click('Remove a panel'); await click(/Run the January day/); await page.waitForTimeout(7800)
await page.waitForSelector('.fx-mission.won'); await click(/X-ray/); await shot('06_lab_max_win')
await click(/Next sabotage/)
for (let i = 0; i < 5; i++) await click('Remove a panel')
await page.waitForSelector('.fx-mission.won', { timeout: 4000 })
await click(/Settle my bet/)
await page.waitForSelector('.fx-verdict.bad'); await shot('07_settle')
await click(/Forge the rule/)
await click(/Inverter max 600/); await click(/Voc at 25/); await click(/round DOWN/); await click('Forge it')
await page.waitForSelector('.fx-repair'); await shot('08_forge_wrong')
await click(/Voc at 8/); await click('Forge it'); await page.waitForSelector('.fx-formula.ok'); await shot('09_forge_ok')
await click(/Chotu needs you/)
await page.waitForTimeout(6500)
await click(/One panel Voc/); await page.waitForTimeout(800); await shot('10_chotu')
await click(/A customer is waiting/)
for (let r = 0; r < 3; r++) {
  await page.locator('.fx-reply').filter({ hasText: r === 0 ? 'On the coldest morning' : r === 1 ? "It doesn't need to freeze" : 'You lose one panel' }).click()
  if (r === 0) await shot('11_boss')
  await click(/Next|Hear his verdict/)
}
await page.waitForSelector('text=Take a real work order'); await shot('12_boss_win')
await click(/Take a real work order/)
const key = await page.evaluate(() => {
  const dd = [...document.querySelectorAll('.fx-ticket dd')].map((d) => d.textContent)
  return dd
})
// solve with the rule, from the ticket text
const num = (s, re) => +s.match(re)[1]
const tMin = num(key[0], /coldest dawn (-?[\d.]+)/), tHot = num(key[0], /hottest cell (-?[\d.]+)/)
const voc = num(key[1], /Voc ([\d.]+)/), bV = num(key[1], /Voc [\d.]+ V \((-?[\d.]+)/), vmp = num(key[1], /Vmp ([\d.]+)/), bM = num(key[1], /Vmp [\d.]+ V \((-?[\d.]+)/)
const vmax = num(key[2], /max (\d+)/), mpMin = num(key[2], /MPPT (\d+)/)
const mx = Math.floor(vmax / (voc * (1 + bV / 100 * (tMin - 25))) + 1e-9), mn = Math.ceil(mpMin / (vmp * (1 + bM / 100 * (tHot - 25))) - 1e-9)
const inputs = page.locator('.fx-inputs input')
await inputs.nth(0).fill(String(mx + 1)); await inputs.nth(1).fill(String(mn)); await click('Check by code')
await shot('13_work_wrong')
await click('New work order')
const key2 = await page.evaluate(() => [...document.querySelectorAll('.fx-ticket dd')].map((d) => d.textContent))
const t2 = num(key2[0], /coldest dawn (-?[\d.]+)/), h2 = num(key2[0], /hottest cell (-?[\d.]+)/)
const v2 = num(key2[1], /Voc ([\d.]+)/), bv2 = num(key2[1], /Voc [\d.]+ V \((-?[\d.]+)/), m2 = num(key2[1], /Vmp ([\d.]+)/), bm2 = num(key2[1], /Vmp [\d.]+ V \((-?[\d.]+)/)
const vx2 = num(key2[2], /max (\d+)/), mm2 = num(key2[2], /MPPT (\d+)/)
await inputs.nth(0).fill(String(Math.floor(vx2 / (v2 * (1 + bv2 / 100 * (t2 - 25))) + 1e-9)))
await inputs.nth(1).fill(String(Math.ceil(mm2 / (m2 * (1 + bm2 / 100 * (h2 - 25))) - 1e-9)))
await click('Check by code'); await page.waitForSelector('.fx-result.ok'); await shot('14_work_ok')
await click(/Finish episode/); await page.waitForSelector('.fx-wrap'); await page.waitForTimeout(1500); await shot('15_wrap')

// ---- Episode 2
await page.goto(`${BASE}/#/flux-pay`); await page.waitForSelector('.fx-plate')
await page.waitForTimeout(2500); await shot('20_pay_open')
await page.waitForSelector('.fx-cta.in', { timeout: 15000 }); await click(/Investigate/)
await click(/bank made an error/); await click('Lock my bet')
await page.waitForSelector('.fx-net', { timeout: 5000 })
await click('✂ Reply'); await click(/Pay ₹499/)
await page.waitForTimeout(1300); await shot('21_pay_inflight')
await page.waitForSelector('.fx-mission.won', { timeout: 12000 }); await shot('22_pay_twice')
await click(/^Next/)
await click('✂ Request'); await click(/Pay ₹499/); await page.waitForSelector('.fx-mission.won', { timeout: 12000 })
await click(/^Next/)
await click('✂ Reply'); await click(/Pay ₹499/); await page.waitForSelector('.fx-mission.won', { timeout: 12000 }); await shot('23_pay_once')
await click(/Settle my bet/); await click(/Forge the rule/)
await page.locator('.fx-code').nth(1).click(); await page.waitForTimeout(400); await shot('24_pay_fix')
await click(/Finish episode/); await page.waitForSelector('.fx-wrap')

// ---- Reels: answer the first reels wrong on purpose, then warp and expect callbacks first
await page.goto(`${BASE}/#/flux-reels`); await page.waitForSelector('.fx-reel')
// the seven motion (intuition) reels lead the authored feed; slot 0 is a motion reel whose options appear after its intro
// Revise shows only concepts learned in the episodes above; find reels by kind instead of by position
const findSlot = async (sel) => {
  for (let i = 0; i < 24; i++) {
    await page.locator('.fx-feed').evaluate((el, i) => el.scrollTo(0, el.clientHeight * i), i); await page.waitForTimeout(500)
    if (await page.locator(`.fx-reel-slot[data-i="${i}"] ${sel}`).count()) return i
  }
  throw new Error('no reel matching ' + sel)
}
await page.waitForTimeout(5800); await shot('30_reel_motion')
const wrongOpt = page.locator('.fx-reel-slot').first().locator('.fx-reel-opts button').nth(1)
await wrongOpt.click(); await page.waitForTimeout(700); await shot('31_reel_wrong')
const feedOrder = async () => page.$$eval('.fx-reel-slot', (els) => els.map((e) => e.querySelector('.fx-chip')?.textContent ?? ''))
const before = await feedOrder()
// the hot/cold split reel: tap the wrong half
const sp = await findSlot('.fx-split-half'); await shot('32_reel_split')
await page.locator(`.fx-reel-slot[data-i="${sp}"] .fx-split-half`).nth(1).click(); await page.waitForTimeout(700); await shot('33_reel_split_result')
await findSlot('.fx-bubbles'); await page.waitForTimeout(1000); await shot('35_reel_bubbles')
// same session: no rematch
assert.equal((await feedOrder()).filter((c) => c === 'REMATCH').length, 0, 'no callbacks in the same session')
await page.goto(`${BASE}/#/flux`); await page.waitForSelector('.fx-hub')
await page.getByRole('button', { name: '+1d' }).click(); await page.waitForTimeout(300)
await shot('36_hub_after_warp')
await page.goto(`${BASE}/#/flux-reels`); await page.waitForSelector('.fx-reel')
const after = await feedOrder()
assert.equal(after[0], 'REMATCH', `callback first in a later session, got ${after.slice(0, 3)}`)
await page.waitForTimeout(1200); await shot('37_reel_rematch')
console.log(JSON.stringify({ before: before.slice(0, 5), after: after.slice(0, 5), errors }, null, 1))
assert.deepEqual(errors, [])
await browser.close()
console.log('FLUX walkthrough OK ->', out)
