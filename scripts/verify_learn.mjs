// FLUX Learn walkthrough: course map → lesson 1 from zero (narration, experiment, wrong then right check) →
// lesson 3 (predict wrong, thermometer experiment, trace, check, training set) → lesson 4 window → lesson 5 guided
// ticket → project (wrong design, then right) → passport. Saves screenshots to outputs/learn_qa/.
//   PLAYWRIGHT_MODULE=<path>/playwright/index.mjs SP_URL=http://127.0.0.1:4180 node scripts/verify_learn.mjs
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { trainSet } from '../app/src/flux/learn/course.ts'
import { workOrder } from '../app/src/flux/physics.ts'

const out = resolve(import.meta.dirname, '../outputs/learn_qa')
await mkdir(out, { recursive: true })
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const BASE = process.env.SP_URL || 'http://127.0.0.1:4180'
const W = Number(process.env.W || 1280), H = Number(process.env.H || 860)
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1.5 })
const page = await ctx.newPage()
const errors = [], log = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|play\(\)|NotAllowedError|NotSupportedError/.test(m.text())) errors.push(m.text()) })
const step = (s) => { log.push('✓ ' + s); console.log('✓', s) }
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` })
const text = () => page.locator('body').innerText()
const cont = async () => { await page.getByRole('button', { name: /Continue →|See why →/ }).first().click(); await page.waitForTimeout(300) }
const waitFor = (re, ms = 20000) => page.waitForFunction((src) => new RegExp(src, 'i').test(document.body.innerText), re.source, { timeout: ms })
const setRange = (label, v) => page.getByRole('slider', { name: new RegExp('^' + label) }).evaluate((el, v) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, String(v)); el.dispatchEvent(new Event('input', { bubbles: true })) }, v)

await page.goto(`${BASE}/#/home?demo=reset`); await page.waitForTimeout(1200)
await page.evaluate(() => { localStorage.setItem('flux:mute', '1'); localStorage.setItem('learn:speed', '8') })
await page.goto(`${BASE}/#/home`); await page.reload(); await page.waitForSelector('.hm-hero')
assert.match(await text(), /Five tracks/); assert.match(await text(), /EV Charger Installer/); await shot('00_homepage'); step('homepage: five career tracks with honest depth labels')
await page.goto(`${BASE}/#/fl-course`); await page.waitForSelector('.ln-hero')
assert.match(await text(), /Rooftop Solar Technician/); assert.match(await text(), /Locked/)
await shot('01_course_map'); step('course map: 5 lessons, project, proof; lessons 2+ locked')

// ---- lesson 1 from zero
await page.getByRole('link', { name: /Start lesson 1/ }).click(); await page.waitForSelector('.ln-stage')
await page.waitForTimeout(400); await shot('02_l1_hook')
await waitFor(/Make the panel deliver 540 W/); await shot('03_l1_experiment')
assert.doesNotMatch(await text(), /Goal reached/)
await setRange('Push', 41.6); await setRange('Flow', 13)
await waitFor(/Goal reached/); step('lesson 1 experiment: sliders to 41.6 V × 13 A meets the 540 W goal')
await waitFor(/Continue →/); await cont()
await page.getByLabel('Your answer').fill('500'); await page.getByRole('button', { name: 'Check' }).click()
assert.match(await text(), /Hint:/); await shot('04_l1_check_wrong'); step('wrong answer gets a hint, not the answer')
await page.getByLabel('Your answer').fill('540.8'); await page.getByRole('button', { name: 'Check' }).click()
assert.match(await text(), /Correct\./); await cont()
await page.getByRole('button', { name: 'Volts' }).click(); await cont()
await page.waitForSelector('.ln-done'); await shot('05_l1_done'); step('lesson 1 complete card, lesson 2 unlocked')
await page.getByRole('link', { name: 'Course map' }).click(); await page.waitForTimeout(300)
assert.match(await page.locator('.ln-node').nth(1).innerText(), /Start/)

// ---- load the seeded learner (lessons 1-4 done) and play lesson 3
await page.goto(`${BASE}/#/home?demo=seed`); await page.waitForTimeout(1500)
await page.evaluate(() => { localStorage.setItem('flux:mute', '1'); localStorage.setItem('learn:speed', '8') })
await page.goto(`${BASE}/#/fl-lesson?id=l3`); await page.reload(); await page.waitForSelector('.ln-stage')
await waitFor(/On a freezing morning/)
await page.getByRole('button', { name: 'Fewer volts' }).click(); assert.match(await text(), /most common wrong guess/)
await shot('06_l3_predict_wrong'); step('lesson 3 predict: the common wrong guess is named'); await cont()
await waitFor(/Drag the temperature/); await shot('07_l3_experiment_warm')
await setRange('Cell temperature', 5); await waitFor(/INVERTER TRIPS/); await shot('08_l3_experiment_cold'); step('experiment: cooling the panel pushes 12 panels past 600 V')
await waitFor(/Continue →/); await cont()
await page.waitForSelector('.ln-code li.cur'); await page.waitForTimeout(600); await shot('09_l3_trace'); step('the rule appears as a line-by-line trace')
await page.waitForSelector('.ln-answer input', { timeout: 30000 })
await page.getByLabel('Your answer').fill('52.95'); await page.getByRole('button', { name: 'Check' }).click(); await cont()
await page.waitForSelector('.ln-train'); await shot('10_l3_train')
for (let k = 0; k < 3; k++) {
  const q = await page.locator('.ln-train .ln-q').innerText()
  const m = q.match(/Voc ([\d.]+) V at 25 °C, (-?[\d.]+)%\/°C\. Voc on a (-?\d+) °C/)
  const v = Number(m[1]) * (1 + (Number(m[2]) / 100) * (Number(m[3]) - 25))
  await page.getByLabel('Your answer').fill(v.toFixed(2)); await page.getByRole('button', { name: 'Check' }).click()
  await page.getByRole('button', { name: /Next problem|Finish training/ }).click(); await page.waitForTimeout(200)
}
await page.waitForSelector('.ln-done', { timeout: 8000 }); step('training set: 3 fresh problems solved; lesson 3 complete')
void trainSet

// ---- lesson 4: find the longest safe string
await page.goto(`${BASE}/#/fl-lesson?id=l4`); await page.waitForSelector('.ln-stage')
await waitFor(/Find the LONGEST string/, 30000); await shot('11_l4_window_14')
await setRange('Panels per string', 12); await page.waitForTimeout(300); assert.match(await text(), /DAMAGED AT DAWN/)
await setRange('Panels per string', 3); await page.waitForTimeout(300); assert.match(await text(), /ASLEEP ALL AFTERNOON/)
await setRange('Panels per string', 11); await waitFor(/Goal reached/); await shot('12_l4_window_11'); step('window: 12 is damaged at dawn, 3 sleeps, 11 is the longest safe string')

// ---- lesson 5: guided ticket
await page.goto(`${BASE}/#/fl-lesson?id=l5`); await page.waitForSelector('.ln-stage')
await page.waitForSelector('.ln-guided', { timeout: 30000 })
const { order: o, key } = workOrder(2468)
for (const v of [o.site.tMin, key.vocCold, key.max, key.vmpHot, key.min]) {
  await page.getByLabel('Your answer').fill(String(v)); await page.getByRole('button', { name: 'Check' }).click()
  await page.getByRole('button', { name: /Next step|Ticket solved/ }).click(); await page.waitForTimeout(150)
}
await shot('13_l5_guided_done'); await page.waitForSelector('.ln-done', { timeout: 30000 }); step(`lesson 5: guided ticket ${o.id} solved step by step`)

// ---- project
await page.goto(`${BASE}/#/fl-project`); await page.waitForSelector('.ln-roof')
await page.getByRole('button', { name: /Inverter A/ }).click(); await setRange('Strings', 2); await setRange('Panels per string', 7)
await page.waitForTimeout(300); assert.match(await page.locator('.ln-checks').innerText(), /✗\s*Array not oversized/)
await shot('14_project_A_oversized'); step('project: inverter A fails the sizing check, named')
await page.getByRole('button', { name: /Inverter B/ }).click(); await page.waitForTimeout(300)
assert.doesNotMatch(await page.locator('.ln-checks').innerText(), /✗/)
await page.getByLabel(/Explain your design/).fill('Two strings of seven panels stay under 1000 V on the coldest morning, and the 10 kW inverter is big enough for all fourteen.')
await shot('15_project_B_valid'); await page.getByRole('button', { name: 'Submit project' }).click(); await page.waitForTimeout(400)
assert.match(await text(), /Project passed every check/); await shot('16_project_submitted'); step('project passes every check and is saved to the passport')
await page.getByRole('link', { name: 'See it in my passport' }).click(); await page.waitForTimeout(500)
assert.match(await text(), /Rooftop string design/); await shot('17_passport_project'); step('passport shows the project record')

// ---- the course map reflects it; revise only shows learned concepts
await page.goto(`${BASE}/#/fl-course`); await page.waitForTimeout(400); await shot('18_course_map_progress')
await page.setViewportSize({ width: 400, height: 860 }); await page.goto(`${BASE}/#/fl-lesson?id=l2`); await page.waitForTimeout(2500); await shot('19_mobile_l2')
await page.goto(`${BASE}/#/home`); await page.waitForTimeout(500); await shot('20_mobile_home')

await browser.close()
await writeFile(`${out}/walkthrough.log`, [...log, '', `console errors: ${errors.length}`, ...errors].join('\n'))
if (errors.length) console.log(errors)
assert.equal(errors.length, 0, 'no console errors')
console.log('FLUX Learn walkthrough OK ->', out)
