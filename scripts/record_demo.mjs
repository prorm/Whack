// Records a real, paced walkthrough of the running app (phone viewport) to outputs/demo_video/scrollproof_demo.mp4.
// No mockups: every frame is the working build. Audio is not captured; narrate over it (see reports/final/DEMO_SCRIPT.md).
//   node scripts/scrollproof_server.mjs --port 4180 --data app/.data/demo.sqlite   (after npm run build)
//   PLAYWRIGHT_MODULE=<path>/playwright/index.mjs SP_URL=http://127.0.0.1:4180 node scripts/record_demo.mjs
import { mkdir, readdir, rename } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { makeTask } from '../app/src/flux/assess.ts'

const root = resolve(import.meta.dirname, '..')
const out = resolve(root, 'outputs/demo_video')
await mkdir(out, { recursive: true })
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const BASE = process.env.SP_URL || 'http://127.0.0.1:4180'
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
const ctx = await browser.newContext({ viewport: { width: 432, height: 936 }, hasTouch: true, recordVideo: { dir: out, size: { width: 432, height: 936 } } })
const page = await ctx.newPage()
const wait = (ms) => page.waitForTimeout(ms)
const feed = (i) => page.locator('.fx-feed').evaluate((el, i) => el.scrollTo({ top: el.clientHeight * i, behavior: 'smooth' }), i)
const smooth = (y) => page.evaluate((y) => scrollTo({ top: y, behavior: 'smooth' }), y)
const marks = []
const mark = (label) => marks.push(`${((Date.now() - t0) / 1000).toFixed(1)}s  ${label}`)

await page.goto(`${BASE}/#/home`)
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('flux:mute', '1') })
await page.reload(); await page.waitForSelector('.sp-hero')
const t0 = Date.now()
mark('Home: pick a job'); await wait(3500); await smooth(520); await wait(2500); await smooth(0); await wait(800)
await page.getByRole('button', { name: 'Load demo learner' }).click(); await wait(400); await smooth(0)
mark('Goal: solar apprentice, 2 of 3 proven'); await wait(3500); await smooth(380); await wait(2500); await smooth(0); await wait(600)

await page.getByRole('link', { name: /Open my feed/ }).click(); await page.waitForSelector('.fx-reel')
mark('Goal feed opens on a repair reel: the cliff'); await page.waitForSelector('.mo-q', { timeout: 10000 }); await wait(1800)
await page.locator('.mo-q button', { hasText: /^12$/ }).click(); mark('Wrong prediction → overflow payoff'); await wait(5200)
await feed(1); await wait(1500)
mark('Next repair reel'); await page.locator('.fx-reel-slot[data-i="1"] .fx-bubbles button').first().waitFor({ timeout: 4000 }).catch(() => {})
await wait(2200); await page.locator('.fx-reel-slot[data-i="1"] .fx-bubbles button', { hasText: /^18$/ }).click({ timeout: 4000, force: true }).catch(() => {}); await wait(3500)
// go to the first proof slot
for (let i = 2; i < 14; i++) { await feed(i); await wait(900); if (await page.locator(`.fx-reel-slot[data-i="${i}"] .sp-proofslot`).count()) break }
mark('Proof slot in the feed'); await wait(2500)
await page.getByRole('button', { name: 'Prove it now →' }).click(); await page.waitForSelector('.fx-ticket')
mark('Unseen work order'); await wait(3000)
const seed = Number((await page.locator('body').innerText()).match(/generated from seed (\d+)/)[1])
const task = makeTask('wo.solar-string', seed)
await page.getByLabel(/Max panels/).click(); await page.keyboard.type(String(task.key.max), { delay: 250 }); await wait(400)
await page.getByLabel(/Min panels/).click(); await page.keyboard.type(String(task.key.min), { delay: 250 }); await wait(700)
await page.getByRole('button', { name: 'Submit for grading' }).click(); mark('Graded by code: proven'); await wait(1000); await smooth(500); await wait(3500)
await page.getByRole('link', { name: 'See my job match →' }).click(); await wait(500)
mark('Match: eligible for a SUPERVISED practical'); await wait(3500); await smooth(700); await wait(2500); await smooth(1500); await wait(1500)
await page.locator('.sp-picks input[type=checkbox]').evaluateAll((els) => els.forEach((e) => e.click())); await wait(800)
await page.locator('.sp-agree input').check(); await wait(800)
await page.getByRole('button', { name: /^Share \d+ record/ }).click(); mark('Consent: share chosen records'); await wait(2500)

await page.getByRole('link', { name: 'Employer' }).click(); await page.waitForSelector('.sp-cands')
mark('Employer seat (DEMO)'); await wait(3000); await smooth(650); await wait(2500)
const me = page.locator('.sp-cands > li').filter({ hasText: 'Learner on this device' })
await me.scrollIntoViewIfNeeded(); await wait(1200)
await me.getByRole('button', { name: 'inspect' }).first().click(); mark('Employer inspects exact answers'); await wait(4000)
await page.getByRole('button', { name: 'Close' }).click(); await wait(600)
await me.getByRole('button', { name: /Shortlist/ }).click(); await wait(900)
await me.getByRole('button', { name: /Invite to supervised practical/ }).click(); await wait(1500)
await page.getByRole('button', { name: 'Send invite (DEMO)' }).click(); mark('Shortlist + invite (DEMO)'); await wait(2200)
await page.getByRole('link', { name: 'Learn' }).click(); await wait(400); await smooth(0)
mark('Learner inbox: invite, not a job offer'); await wait(3500)
await page.getByRole('link', { name: 'Passport' }).click(); await wait(400)
mark('Proof Passport'); await wait(2500); await smooth(600); await wait(2000)
await page.locator('.sp-skills li').filter({ hasText: 'Cold-morning string sizing' }).getByRole('link', { name: 'inspect' }).click(); await wait(400)
mark('Inspectable evidence record'); await smooth(400); await wait(2500); await smooth(1100); await wait(2500)
await page.getByRole('link', { name: 'Teach' }).click(); await wait(400)
mark('Teach: Field Scars + impact'); await wait(3500)

// motion reel montage
await page.goto(`${BASE}/#/flux-reels`); await page.evaluate(() => { sessionStorage.clear(); localStorage.removeItem('scrollproof:flux:v1') }); await page.reload(); await page.waitForSelector('.fx-reel')
const right = [/UP/, /^11$/, /^4$/, /About half/, /Main trips/, /Replay/, /backoff/]
const names = ['Cold → more volts', 'The cliff', 'Heat sags volts', 'One hose', 'The 9 PM blackout', 'Same key, one charge', 'The thundering herd']
for (const i of [0, 3, 4, 6]) {
  await feed(i); await wait(900); mark(`Motion reel: ${names[i]}`)
  await page.waitForSelector(`.fx-reel-slot[data-i="${i}"] .mo-q`, { timeout: 10000 }); await wait(1500)
  await page.locator(`.fx-reel-slot[data-i="${i}"] .mo-q button`, { hasText: right[i] }).click(); await wait(4800)
}
mark('end')
const video = page.video()
await ctx.close(); await browser.close()
const webm = await video.path()
const mp4 = resolve(out, 'scrollproof_demo.mp4')
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-vf', 'fps=30,scale=720:-2:flags=lanczos', '-c:v', 'libx264', '-crf', '24', '-preset', 'medium', '-movflags', '+faststart', mp4])
await rename(webm, resolve(out, 'raw.webm'))
const { writeFile } = await import('node:fs/promises')
await writeFile(resolve(out, 'chapters.txt'), marks.join('\n') + '\n')
console.log(marks.join('\n')); console.log('->', mp4, (await readdir(out)).join(', '))
