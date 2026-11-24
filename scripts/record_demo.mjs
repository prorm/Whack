// Records the real app (1280×720) through the whole journey, then lays the app's own narration lines and music bed
// under the capture at the exact moments they played (from the lesson player's timeline hook). No mockups.
//   node scripts/scrollproof_server.mjs --port 4180 --data app/.data/demo.sqlite   (after npm run build)
//   PLAYWRIGHT_MODULE=<path>/playwright/index.mjs SP_URL=http://127.0.0.1:4180 node scripts/record_demo.mjs
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { makeTask } from '../app/src/flux/assess.ts'

const root = resolve(import.meta.dirname, '..')
const out = resolve(root, 'outputs/demo_video')
await mkdir(out, { recursive: true })
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const BASE = process.env.SP_URL || 'http://127.0.0.1:4180'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: out, size: { width: 1280, height: 720 } } })
await ctx.addInitScript(() => { window.__narr = []; localStorage.setItem('flux:mute', '1') })
const page = await ctx.newPage()
const tVideo = Date.now()
const wait = (ms) => page.waitForTimeout(ms)
const marks = []
const mark = (label) => { marks.push(`${((Date.now() - tVideo) / 1000).toFixed(1)}s  ${label}`); console.log(marks.at(-1)) }
const narr = []
const collect = async () => { try { narr.push(...await page.evaluate(() => window.__narr.splice(0))) } catch { /* navigating */ } }
const text = () => page.locator('body').innerText()
const until = async (re, ms = 30000) => page.waitForFunction((src) => new RegExp(src, 'i').test(document.body.innerText), re.source, { timeout: ms })
const slide = async (label, from, to, steps = 12, gap = 90) => {
  const el = page.getByRole('slider', { name: new RegExp('^' + label) })
  for (let k = 0; k <= steps; k++) {
    const v = from + ((to - from) * k) / steps
    await el.evaluate((e, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, String(v)); e.dispatchEvent(new Event('input', { bubbles: true })) }, Math.round(v * 10) / 10)
    await wait(gap)
  }
}
const scroll = (y) => page.evaluate((y) => scrollTo({ top: y, behavior: 'smooth' }), y)
const go = async (hash) => { await collect(); await page.goto(`${BASE}/#/${hash}`); await wait(500) }

// fresh device
await page.goto(`${BASE}/#/home?demo=reset`); await wait(1500)
await page.goto(`${BASE}/#/home`); await page.waitForSelector('.ln-hero'); await wait(600)
mark('Learn: the course map (0/5)'); await wait(3200); await scroll(380); await wait(2200); await scroll(0); await wait(600)

// lesson 1 from absolute zero
await page.getByRole('link', { name: /Start lesson 1/ }).click(); await page.waitForSelector('.ln-stage')
mark('Lesson 1 cold open (narrated)'); await until(/Electricity is water/i, 20000); mark('Absolute basics: electricity is water')
await until(/Voltage is the push/i, 15000); await wait(2500)
await page.getByRole('button', { name: 'Skip →' }).click()
await until(/Make the panel deliver 540 W/); mark('Experiment: make 540 W')
await wait(2200); await slide('Push', 20, 41.6, 14); await slide('Flow', 5, 13, 14)
await until(/Goal reached/); mark('Goal reached'); await until(/Continue →/, 20000); await wait(400)
await page.getByRole('button', { name: 'Continue →' }).click(); await wait(500)
await page.getByLabel('Your answer').pressSequentially('500', { delay: 120 }); await page.getByRole('button', { name: 'Check' }).click(); mark('Test: wrong → hint'); await wait(2200)
await page.getByLabel('Your answer').fill(''); await page.getByLabel('Your answer').pressSequentially('540.8', { delay: 120 }); await page.getByRole('button', { name: 'Check' }).click(); await wait(1800)

// a learner who has done lessons 1-4: the cold-morning lesson
await go('home?demo=seed'); await wait(1500)
await go('fl-lesson?id=l3'); await page.waitForSelector('.ln-stage')
mark('Lesson 3: cold makes volts'); await until(/On a freezing morning/, 20000); await wait(1500)
await page.getByRole('button', { name: 'Fewer volts' }).click(); mark('Predict: the common wrong guess'); await wait(2800)
await page.getByRole('button', { name: /See why|Continue/ }).click()
await until(/Drag the temperature/); mark('Experiment: the thermometer'); await wait(3000)
await slide('Cell temperature', 45, 4, 20, 110); await until(/Goal reached/); mark('12 panels cross 600 V'); await wait(4500)
await page.getByRole('button', { name: 'Skip →' }).click(); await page.waitForSelector('.ln-code'); mark('The rule as a line-by-line trace'); await wait(7000)
await page.getByRole('button', { name: 'Skip →' }).click(); await wait(5200)

// the project
await go('fl-project'); await page.waitForSelector('.ln-roof'); mark('Project: Mr. Sharma’s 14-panel roof')
await wait(1800); await page.getByRole('button', { name: /Inverter A/ }).click(); await wait(600)
await slide('Strings', 1, 2, 1, 300); await slide('Panels per string', 14, 7, 7, 120); mark('Inverter A: oversized, named'); await wait(2600)
await page.getByRole('button', { name: /Inverter B/ }).click(); mark('Inverter B: every check passes'); await wait(1800)
await page.getByLabel(/Explain your design/).pressSequentially('Two strings of seven stay under 1000 V on the coldest morning, and the 10 kW inverter can carry all fourteen panels.', { delay: 14 })
await page.getByRole('button', { name: 'Submit project' }).click(); mark('Project saved to the Proof Passport'); await wait(4200)

// prove alone: unseen work order
await go('sp-assess?c=solar.cold-max&back=job-solar-apprentice'); await page.waitForSelector('.fx-ticket'); mark('Prove it alone: unseen work order')
await wait(1500)
const seed = Number((await text()).match(/generated from seed (\d+)/)[1]); const task = makeTask('wo.solar-string', seed)
await page.getByLabel(/Max panels/).pressSequentially(String(task.key.max), { delay: 160 }); await page.getByLabel(/Min panels/).pressSequentially(String(task.key.min), { delay: 160 })
await page.getByRole('button', { name: 'Submit for grading' }).click(); await wait(800); await scroll(420); mark('Graded by code: proven'); await wait(2800)

// match → consent → employer
await go('sp-job?id=job-solar-apprentice'); mark('Match: 4/4, eligible for a SUPERVISED practical'); await wait(3500); await scroll(1400); await wait(1500)
await page.locator('.sp-picks input[type=checkbox]').evaluateAll((els) => els.forEach((e) => e.click())); await wait(600)
await page.locator('.sp-agree input').check(); await wait(500)
await page.getByRole('button', { name: /^Share \d+ record/ }).click(); mark('Consent: share chosen records'); await wait(1800)
await go('sp-employer'); await page.waitForSelector('.sp-cands'); mark('Employer seat (DEMO)'); await wait(2200)
const me = page.locator('.sp-cands > li').filter({ hasText: 'Learner on this device' })
await me.scrollIntoViewIfNeeded(); await wait(900)
await me.getByRole('button', { name: 'inspect' }).last().click(); mark('Employer inspects the evidence'); await wait(3200)
await page.getByRole('button', { name: 'Close' }).click(); await wait(400)
await me.getByRole('button', { name: /Shortlist/ }).click(); await wait(600)
await me.getByRole('button', { name: /Invite to supervised practical/ }).click(); await wait(900)
await page.getByRole('button', { name: 'Send invite (DEMO)' }).click(); mark('Invite to a supervised practical (DEMO)'); await wait(1800)
await go('home'); mark('Learner: invite, not a job offer'); await wait(2800)

// revise: reels for what you already learned
await go('flux-reels'); await page.waitForSelector('.fx-reel'); mark('Revise: reels for what you learned')
await wait(3500)
await page.locator('.fx-feed').evaluate((el) => el.scrollTo({ top: el.clientHeight, behavior: 'smooth' })); await wait(6400)
const reveal = page.locator('.fx-reel-slot[data-i="1"] .mo-reveal')
if (await reveal.count()) { await reveal.click(); mark('Optional quiz: just show me why'); await wait(5000) } else await wait(3000)
await go('home'); await wait(2500); mark('end')
await collect()

const video = page.video()
await ctx.close(); await browser.close()
const webm = await video.path()
await rename(webm, resolve(out, 'raw.webm'))

// soundtrack: each narration line at the moment it started, cut where the learner skipped it, over the music bed
const lines = narr.filter((n) => existsSync(resolve(root, `app/public/media/learn/vo_${n.id}.m4a`)))
const total = (Date.now() - tVideo) / 1000
const inputs = ['-i', resolve(root, 'app/public/media/learn/bed.m4a')]
const filters = [`[0:a]aloop=loop=-1:size=2e9,atrim=0:${total.toFixed(2)},volume=0.22[bed]`]
lines.forEach((n, k) => {
  inputs.push('-i', resolve(root, `app/public/media/learn/vo_${n.id}.m4a`))
  const start = Math.max(0, (n.at - tVideo) / 1000), len = n.end ? Math.max(0.3, (n.end - n.at) / 1000) : 60
  filters.push(`[${k + 1}:a]atrim=0:${len.toFixed(2)},afade=t=out:st=${Math.max(0, len - 0.15).toFixed(2)}:d=0.15,adelay=${Math.round(start * 1000)}|${Math.round(start * 1000)}[v${k}]`)
})
filters.push(`[bed]${lines.map((_, k) => `[v${k}]`).join('')}amix=inputs=${lines.length + 1}:normalize=0:duration=first[mix]`)
const wav = resolve(out, 'soundtrack.wav')
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filters.join(';'), '-map', '[mix]', '-ar', '48000', wav])
const mp4 = resolve(out, 'scrollproof_demo.mp4')
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', resolve(out, 'raw.webm'), '-i', wav, '-map', '0:v', '-map', '1:a', '-vf', 'fps=30', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', mp4])
await writeFile(resolve(out, 'chapters.txt'), marks.join('\n') + '\n\nnarration lines: ' + lines.map((n) => n.id).join(', ') + '\n')
console.log('->', mp4, `${lines.length} narration lines mixed`)
