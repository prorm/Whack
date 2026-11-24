// UnlockED walkthrough: learner → goal feed → motion reel → failed proof → passed proof → match → consent → employer
// shortlist + invite → learner inbox → trainer review → server share link → revoke → employer posts a mission.
// Also plays all seven motion reels and saves screenshots. Needs the ScrollProof server running (it serves app/dist):
//   cd app && npm run build && cd .. && node scripts/scrollproof_server.mjs --port 4180 --data app/.data/demo.sqlite
//   PLAYWRIGHT_MODULE=<path>/playwright/index.mjs SP_URL=http://127.0.0.1:4180 node scripts/verify_unlocked.mjs
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { makeTask } from '../app/src/flux/assess.ts'
import { makeRecord } from '../app/src/flux/passport.ts'

const root = resolve(import.meta.dirname, '..')
const out = resolve(root, 'outputs/unlocked_qa')
await mkdir(out, { recursive: true })
const EV = JSON.parse(readFileSync(resolve(root, 'app/src/flux/blueprints/ev_charger.json'), 'utf8'))
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const BASE = process.env.SP_URL || 'http://127.0.0.1:4180'
const log = []
const step = (msg) => { log.push(`✓ ${msg}`); console.log('✓', msg) }

// ---------------------------------------------------------------- API: server re-grade, forged grades, revoke
{
  const tok = '11111111-2222-4333-8444-555555555555', other = '99999999-2222-4333-8444-555555555555'
  const post = (path, body, t = tok) => fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(body) })
  const t = makeTask('quick.series', 31337, EV)
  const good = makeRecord(t, { aV: String(t.key.aV), bI: String(t.key.bI) }, Date.now(), 'att-api-1')
  const forged = { ...makeRecord(t, { aV: '1', bI: '1' }, Date.now(), 'att-api-2'), outcomes: { 'solar.series': { pass: true, misconceptions: [] } } }
  assert.equal((await post('/api/proof/share', { record: forged })).status, 422); step('server refuses a record whose grade does not match a fresh re-grade')
  const r = await post('/api/proof/share', { record: good }); assert.equal(r.status, 200)
  const { token } = await r.json()
  assert.equal((await fetch(`${BASE}/api/proof/public/${token}`)).status, 200); step('share link serves the server-regraded record')
  assert.equal((await post('/api/proof/revoke', { token }, other)).status, 404); step('another device cannot revoke a learner’s link')
  assert.equal((await post('/api/proof/revoke', { token })).status, 200)
  assert.equal((await fetch(`${BASE}/api/proof/public/${token}`)).status, 410); step('revoked link returns 410, enforced server-side')
}

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
const ctx = await browser.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2, hasTouch: true })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|play\(\)|NotAllowedError/.test(m.text())) errors.push(m.text()) })
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` })
const text = () => page.locator('body').innerText()
const go = async (hash) => { await page.goto(`${BASE}/#/${hash}`); await page.waitForTimeout(500) }
const feed = (i) => page.locator('.fx-feed').evaluate((el, i) => el.scrollTo(0, el.clientHeight * i), i)
const seedOf = async () => Number((await text()).match(/generated from seed (\d+)/)[1])

await go('home')
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('flux:mute', '1') })
await page.reload(); await page.waitForSelector('.hm-hero')
await shot('01_home_pick_goal'); step('home opens on the FLUX Learn course')
await page.setViewportSize({ width: 1280, height: 860 }); await shot('01b_home_desktop'); await page.setViewportSize({ width: 400, height: 860 })

// demo learner
await page.getByRole('button', { name: 'Load demo learner' }).click(); await page.waitForTimeout(1500)
await page.evaluate(() => localStorage.setItem('flux:mute', '1'))
await go('sp-jobs')
let body = await text()
assert.match(body, /Solar installation apprentice/); assert.match(body, /2\/4/)
await shot('02_jobs_goal_2_of_4'); step('seeded learner: 2 of 4 in-app skills proven for the solar apprentice goal')

// goal feed: first slot repairs the named mistake with the cliff motion reel
await go('flux-reels?goal=job-solar-apprentice'); await page.waitForSelector('.fx-reel'); await page.waitForTimeout(1200)
body = await text()
assert.match(body, /Rematch · you missed this last session/i); assert.match(body, /2\/4 proven/i)
step('revision feed for the goal opens on a REMATCH of the concept missed in an earlier session')
await feed(1); await page.waitForTimeout(2600)
assert.match(await text(), /Fixes your mistake on WO-/i)
await shot('03_goalfeed_repair_motion_intro'); step('next: a REPAIR reel for the learner’s named mistake (rounded up)')
await page.waitForSelector('.fx-reel-slot[data-i="1"] .mo-q', { timeout: 9000 }); await shot('04_motion_cliff_question')
await page.locator('.fx-reel-slot[data-i="1"] .mo-q button', { hasText: /^12$/ }).click(); await page.waitForTimeout(1800)
await shot('05_motion_cliff_payoff_wrong'); step('motion reel: wrong prediction → overflow payoff + explanation')
// proof slot appears in the feed
let foundProof = false
for (let i = 1; i < 12 && !foundProof; i++) { await feed(i); await page.waitForTimeout(700); if (await page.locator(`.fx-reel-slot[data-i="${i}"] .sp-proofslot`).count()) foundProof = true }
assert.ok(foundProof); await shot('06_goalfeed_proof_slot'); step('proof slot follows the gap reels in the goal feed')

// pause: timers stop, nothing lost
await feed(0); await page.waitForTimeout(600)
await page.getByRole('button', { name: 'Pause' }).click(); assert.match(await text(), /Paused/); await page.getByRole('button', { name: 'Resume' }).first().click(); step('pause / resume works with no penalty')

// proof check: fail first, then pass a new unseen variant
await go('sp-assess?c=solar.cold-max&back=job-solar-apprentice'); await page.waitForSelector('.fx-ticket')
let seed = await seedOf(); let task = makeTask('wo.solar-string', seed)
await page.getByLabel(/Max panels/).fill(String(task.key.max + 1)); await page.getByLabel(/Min panels/).fill(String(task.key.min))
await page.getByRole('button', { name: 'Submit for grading' }).click(); await page.waitForTimeout(400)
body = await text(); assert.match(body, /not yet/); await shot('07_proof_fail_named_mistake'); step(`unseen work order ${task.label}: wrong max graded as not proven`)
await page.getByRole('button', { name: 'New unseen task' }).click(); await page.waitForTimeout(300)
seed = await seedOf(); task = makeTask('wo.solar-string', seed)
await page.getByLabel(/Max panels/).fill(String(task.key.max)); await page.getByLabel(/Min panels/).fill(String(task.key.min))
await page.getByRole('button', { name: 'Submit for grading' }).click(); await page.waitForTimeout(400)
assert.match(await text(), /PROVEN · system-assessed/); await shot('08_proof_pass'); step(`new unseen variant ${task.label}: passed`)

// the project is the last gap
await go('sp-job?id=job-solar-apprentice'); assert.match(await text(), /1 skill left to prove/); step('after the work order: 3/4, the project is the last gap')
await go('fl-project'); await page.waitForSelector('.ln-roof')
await page.getByRole('button', { name: /Inverter B/ }).click()
await page.getByLabel(/Explain your design/).fill('One string of fourteen stays under 1000 V on the coldest morning and above 200 V in the afternoon.')
await page.getByRole('button', { name: 'Submit project' }).click(); await page.waitForTimeout(400)
assert.match(await text(), /Project passed every check/); step('project submitted from FLUX Learn: passes every check')
// match flips; hazardous → supervised outcome
await go('sp-job?id=job-solar-apprentice')
body = await text(); assert.match(body, /Eligible for a supervised practical assessment/); assert.match(body, /4\/4/)
await shot('09_job_eligible_supervised'); step('match refreshed: eligible for a SUPERVISED practical (not a licence)')

// consent: share with the employer
await page.locator('.sp-picks input[type=checkbox]').evaluateAll((els) => els.forEach((e) => e.click()))
await page.locator('.sp-agree input').check()
await page.getByRole('button', { name: /^Share \d+ record/ }).click(); await page.waitForTimeout(300)
assert.match(await text(), /Revoke/); await shot('10_consent_shared'); step('learner shared chosen records with the DEMO employer')

// employer seat
await go('sp-employer'); await page.waitForSelector('.sp-cands')
body = await text(); assert.match(body, /Learner on this device/); assert.match(body, /Meera K\. \(DEMO\)/)
await shot('11_employer_candidates'); step('employer sees the consenting learner and DEMO candidates, ranked by explicit requirements')
await page.locator('.sp-cands > li').filter({ hasText: 'Learner on this device' }).getByRole('button', { name: 'inspect' }).first().click(); await page.waitForTimeout(300)
await shot('12_employer_inspect_evidence'); await page.getByRole('button', { name: 'Close' }).click(); step('employer inspects the exact answers behind a claim')
const me = page.locator('.sp-cands > li').filter({ hasText: 'Learner on this device' })
await me.getByRole('button', { name: /Shortlist/ }).click(); await me.getByRole('button', { name: /Invite to supervised practical/ }).click()
await page.getByRole('button', { name: 'Send invite (DEMO)' }).click(); await page.waitForTimeout(300)
assert.match(await me.innerText(), /Invited ✓/); await shot('13_employer_invited'); step('employer shortlisted and invited (DEMO, same device, no outbound message)')

// learner inbox
await go('home'); assert.match(await text(), /Interview invite · Suryodaya/); await shot('14_learner_invite'); step('invite appears in the learner’s inbox, labelled not a job offer')

// revoke consent → employer loses access
await go('sp-job?id=job-solar-apprentice'); await page.getByRole('button', { name: 'Revoke' }).first().click(); await page.waitForTimeout(200)
await go('sp-employer'); assert.doesNotMatch(await text(), /Learner on this device/); step('after revoking, the employer no longer sees the learner')

// passport: trainer review + server share link
await go('sp-passport'); await page.waitForSelector('.sp-skills')
await shot('15_passport'); step('passport lists skills with evidence levels')
await page.locator('.sp-skills li').filter({ hasText: 'Cold-morning string sizing' }).getByRole('link', { name: 'inspect' }).click(); await page.waitForTimeout(300)
await page.getByRole('button', { name: 'Approve' }).click(); assert.match(await text(), /all four checklist items/); step('approval without all four checklist items is refused')
for (const c of await page.locator('.sp-review input[type=checkbox]').all()) await c.check()
await page.getByRole('button', { name: 'Approve' }).click(); await page.waitForTimeout(200)
assert.match(await text(), /Approved by Demo trainer/); await shot('16_record_trainer_reviewed'); step('trainer review bound to attempt id + fingerprint')
await page.getByRole('button', { name: 'Create share link' }).click(); await page.waitForSelector('.sp-linkbox code')
const url = await page.locator('.sp-linkbox code').innerText()
const viewer = await ctx.newPage(); await viewer.goto(url); await viewer.waitForTimeout(800)
assert.match(await viewer.locator('body').innerText(), /Re-graded by the server/); await viewer.screenshot({ path: `${out}/17_share_link_view.png` }); step('public share link renders the server-regraded record')
await page.getByRole('button', { name: 'Revoke' }).first().click(); await page.waitForTimeout(500)
await viewer.reload(); await viewer.waitForTimeout(800)
assert.match(await viewer.locator('body').innerText(), /revoked this link/); await viewer.screenshot({ path: `${out}/18_share_link_revoked.png` }); step('revoked share link stops serving')
await viewer.close()

// a new attempt detaches the review
await go('sp-assess?c=solar.cold-max'); seed = await seedOf(); task = makeTask('wo.solar-string', seed)
await page.getByLabel(/Max panels/).fill(String(task.key.max)); await page.getByLabel(/Min panels/).fill(String(task.key.min))
await page.getByRole('button', { name: 'Submit for grading' }).click(); await page.waitForTimeout(300)
await go('sp-passport'); assert.match(await page.locator('.sp-skills li').filter({ hasText: 'Cold-morning' }).innerText(), /System-assessed/i); step('a new attempt detaches the earlier trainer review')

// employer posts a mission; hazardous forces supervision; learner sees it
await go('sp-employer'); await page.getByRole('button', { name: '+ Post a skill mission' }).click()
await page.getByLabel('Role title').fill('Rooftop solar helper (weekend)')
await page.locator('.sp-mission .sp-check').filter({ hasText: 'Series & parallel wiring' }).locator('input').check()
await page.locator('.sp-mission .sp-check').filter({ hasText: 'Cold-morning string sizing' }).locator('input').check()
assert.ok(await page.locator('.sp-mission .sp-check').filter({ hasText: 'Supervised start' }).locator('input').isDisabled())
await shot('19_employer_post_mission'); await page.getByRole('button', { name: 'Publish mission (DEMO)' }).click(); await page.waitForTimeout(300)
await go('sp-jobs'); assert.match(await text(), /Rooftop solar helper \(weekend\)/); step('employer mission appears in the learner job list; hazardous skills force a supervised start')

// payments goal: a different job builds a different feed
await go('sp-jobs'); await page.locator('.sp-job').filter({ hasText: 'Junior payments support engineer' }).getByRole('button', { name: 'Make this my goal' }).click()
await go('flux-reels?goal=job-payments-support'); await page.waitForTimeout(1200)
assert.match(await text(), /Foundation for Retries with backoff/i); step('payments goal feed starts with idempotency as the foundation for backoff')

// ---------------------------------------------------------------- all seven motion reels
// revision shows learned concepts only: mark all seven as learned (not due), so the authored motion reels lead
await go('home'); await page.evaluate(() => {
  sessionStorage.clear()
  const now = Date.now(), card = { reps: 1, lapses: 0, lastAt: now, dueAt: now + 86400000, intervalDays: 1 }
  const cards = Object.fromEntries(['cold', 'maxstring', 'minstring', 'series', 'evload', 'idem', 'retry'].map((c) => [c, card]))
  localStorage.setItem('scrollproof:flux:v1', JSON.stringify({ memory: { cards, misses: [] }, warpMs: 0, bets: [], episodes: {}, answered: {}, proofs: {}, vouches: {}, teamFlags: [] }))
})
await go('flux-reels'); await page.reload(); await page.waitForSelector('.fx-reel')
const scenes = ['cold', 'cliff', 'heat', 'hose', 'dinner', 'idem', 'herd']
for (let i = 0; i < scenes.length; i++) {
  await feed(i); await page.waitForTimeout(2600)
  await shot(`m${i + 1}_${scenes[i]}_intro`)
  await page.waitForSelector(`.fx-reel-slot[data-i="${i}"] .mo-q`, { timeout: 9000 })
  await shot(`m${i + 1}_${scenes[i]}_question`)
  const slot = page.locator(`.fx-reel-slot[data-i="${i}"]`)
  // answer correctly: find the ok option via the reel data is not exposed, so pick by known labels
  const right = { cold: /UP/, cliff: /^11$/, heat: /^4$/, hose: /About half/, dinner: /Main trips/, idem: /Replay/, herd: /backoff/ }[scenes[i]]
  await slot.locator('.mo-q button', { hasText: right }).click(); await page.waitForTimeout(2600)
  assert.match(await slot.innerText(), /NAILED IT|COMBO/i)
  await shot(`m${i + 1}_${scenes[i]}_payoff`)
}
step('all seven motion reels play: intro → forced prediction → payoff, correct answers graded right')

// reduced motion: static final frames, question still forced
const rm = await browser.newContext({ viewport: { width: 400, height: 860 }, reducedMotion: 'reduce' })
const rp = await rm.newPage(); await rp.goto(`${BASE}/#/flux-reels`); await rp.evaluate((v) => localStorage.setItem('scrollproof:flux:v1', v), await page.evaluate(() => localStorage.getItem('scrollproof:flux:v1'))); await rp.reload(); await rp.waitForSelector('.mo-q', { timeout: 4000 })
await rp.screenshot({ path: `${out}/20_reduced_motion.png` }); await rm.close(); step('reduced motion: motion reels jump to the question with a static frame')

// offline: the service worker serves the app and the feed
await go('home'); await page.waitForTimeout(2500)
await ctx.setOffline(true)
await page.goto(`${BASE}/#/flux-reels`).catch(() => {}); await page.waitForTimeout(1500)
const offOk = await page.locator('.fx-reel').count() > 0
await ctx.setOffline(false)
step(offOk ? 'offline: reel feed renders from the service worker cache' : 'offline: feed did NOT render (see FINAL_QA)')

await browser.close()
if (errors.length) console.log('console errors:', errors)
await writeFile(`${out}/walkthrough.log`, [...log, '', `console errors: ${errors.length}`, ...errors].join('\n'))
assert.equal(errors.length, 0, 'no console errors')
console.log(`\nAll steps passed. Screenshots in ${out}`)
