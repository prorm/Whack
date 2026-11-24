// Build the app first. Provide Playwright through PLAYWRIGHT_MODULE or normal Node resolution.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { pathToFileURL } from 'node:url'
import { payoutTask } from '../app/src/engine/proof.ts'

const root = resolve(import.meta.dirname, '..')
const captures = resolve(root, process.env.SCROLLPROOF_QA_OUTPUT || 'outputs/experience_sprint')
const data = await mkdtemp(join(tmpdir(), 'scrollproof-qa-'))
await mkdir(captures, { recursive: true })
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined })
const serverScript = join(root, 'scripts/scrollproof_server.mjs')
const axePath = join(root, 'app/node_modules/axe-core/axe.min.js')
const evidence = { browser: browser.version(), checks: [], access: [], loads: {}, cache: {} }
const errors = []
const processes = new Set()
const wait = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms))

async function start(port, options = [], trainerCode = '') {
  const log = []
  const processHandle = spawn(process.execPath, [serverScript, '--port', String(port),
    '--data', join(data, `qa-${port}.sqlite`), '--metrics', ...options], {
    windowsHide: true, env: { ...process.env, SCROLLPROOF_TRAINER_CODE: trainerCode },
  })
  processes.add(processHandle)
  const lines = createInterface({ input: processHandle.stdout })
  lines.on('line', (line) => {
    if (line.startsWith('{')) log.push(JSON.parse(line))
  })
  const address = `http://127.0.0.1:${port}`
  for (let i = 0; i < 80; i++) {
    if (processHandle.exitCode !== null) break
    const ready = await fetch(address + '/favicon.svg', { method: 'HEAD' }).catch(() => null)
    if (ready?.ok) return { processHandle, address, log }
    await wait(50)
  }
  throw new Error(`Server failed to start on port ${port}`)
}

async function stop(server) {
  const child = server.processHandle
  if (child.exitCode !== null || child.signalCode !== null) return
  const ended = new Promise((done) => child.once('exit', done))
  child.kill()
  await ended
  processes.delete(child)
}

const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }
const desktop = { viewport: { width: 1280, height: 900 } }

function observe(page) {
  page.setDefaultTimeout(14_000)
  page.on('pageerror', (error) => errors.push(error.message))
  return page
}
const button = (page, name) => page.getByRole('button', { name, exact: true })
const heading = (page, name) => page.getByRole('heading', { name, exact: true })
const saved = (page) => page.getByTestId('offline-status').filter({ hasText: 'Offline ready' }).waitFor()
async function snap(page, name) {
  await page.screenshot({ path: join(captures, `${name}.png`), fullPage: true })
}

async function audit(page, name, zoom = false) {
  if (!await page.evaluate(() => Boolean(window.axe))) await page.addScriptTag({ path: axePath })
  const data = await page.evaluate(async () => {
    const results = await window.axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })
    const badTargets = [...document.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea, select, summary')].flatMap((element) => {
      if (element.closest('[inert]')) return []
      const target = element.matches('input[type="radio"], input[type="checkbox"], input[type="file"]') && element.labels?.length ? element.labels[0] : element
      const rect = target.getBoundingClientRect()
      return (rect.width || rect.height) && (rect.width < 44 || rect.height < 44) ? [element.getAttribute('aria-label') || element.textContent.trim() || element.outerHTML.slice(0, 95)] : []
    })
    return {
      violations: results.violations.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => node.target) })),
      badTargets, overflow: document.documentElement.scrollWidth - innerWidth,
    }
  })
  evidence.access.push({ name, zoom, ...data })
}

async function checkReelFits(page, selector) {
  const fits = await page.locator(selector).evaluate((element) => {
    const button = element.getBoundingClientRect()
    const frame = element.closest('.premium-frame').getBoundingClientRect()
    return button.top >= frame.top && button.bottom <= frame.bottom && button.right <= frame.right
  })
  assert(fits, `${selector} fits inside the reel at the current text size`)
}

async function measure(base, label, mode, delay = false, fail = false) {
  const index = base.log.length
  const context = await browser.newContext(mobile)
  const page = observe(await context.newPage())
  if (delay) {
    const session = await context.newCDPSession(page)
    await session.send('Network.enable')
    await session.send('Network.emulateNetworkConditions', {
      offline: false, latency: 150, downloadThroughput: 125_000, uploadThroughput: 50_000, connectionType: 'cellular3g',
    })
  }
  await page.addInitScript((delivery) => {
    if (localStorage.getItem('scrollproof:bench')) return
    localStorage.setItem('scrollproof:bench', '1')
    localStorage.setItem('scrollproof:v1', JSON.stringify({ delivery }))
    localStorage.setItem('scrollproof:twin-events:v1', JSON.stringify([{
      id: 'sample-miss', learnerId: 'demo-learner', at: Date.now(), type: 'answer', conceptId: 'percent_basic',
      itemId: 'p_b1', op: 'pct_of', args: [20, 350], answer: 370, correct: false, source: 'practice', modality: 'text',
    }]))
  }, mode)
  const began = performance.now()
  await page.goto(base.address + '/#/revision', { waitUntil: 'commit' })
  await heading(page, 'Your revision reel').waitFor()
  const headingMs = Math.round(performance.now() - began)
  await saved(page)
  const offlineMs = Math.round(performance.now() - began)
  const player = page.getByTestId('remix-reel')
  assert.equal(await player.getAttribute('data-delivery'), mode)
  let videoMs = null
  if (mode === 'rich' && !fail) {
    await page.locator('video.video-ready').waitFor()
    videoMs = Math.round(performance.now() - began)
  }
  if (fail) {
    await page.waitForFunction(() => !document.querySelector('.premium-media video, .premium-media img'))
    await button(page, 'Sound').click()
    await page.getByText('Sound unavailable. Captions are on.').waitFor()
    await button(page, 'Go to question').click()
    await page.getByLabel('Your answer').waitFor()
    evidence.checks.push('Missing media and failed audio still allow answering the reel')
  }
  const cache = await page.evaluate(async () => {
    const result = {}
    for (const key of await caches.keys()) {
      const store = await caches.open(key)
      result[key.endsWith('-media') ? 'media' : 'shell'] = await Promise.all((await store.keys()).map(async (request) => ({
        path: new URL(request.url).pathname,
        decodedBytes: (await (await store.match(request)).arrayBuffer()).byteLength,
      })))
    }
    return result
  })
  await wait(180)
  const requests = base.log.slice(index)
  const media = requests.filter((request) => request.path.startsWith('/media/') && request.status < 400)
  evidence.loads[label] = {
    headingMs, offlineMs, videoMs, payloadBytes: requests.reduce((bytes, request) => bytes + request.bytes, 0),
    mediaBytes: media.reduce((bytes, request) => bytes + request.bytes, 0), media, requests,
  }
  evidence.cache[label] = cache
  if (mode === 'rich' && !fail) {
    assert(cache.media.some((entry) => entry.path.includes('/media/remix/')))
    const beforeReload = base.log.length
    await page.reload({ waitUntil: 'commit' })
    await page.locator('video.video-ready').waitFor()
    await wait(150)
    const warmMedia = base.log.slice(beforeReload).filter((entry) => entry.path.startsWith('/media/'))
    assert.equal(warmMedia.length, 0)
    evidence.loads[label].warmMediaBytes = 0
  }
  if (mode !== 'rich') assert(!media.some((request) => request.path.endsWith('.mp4')))
  if (mode === 'offline') assert.equal(media.length, 0)
  await context.close()
}

try {
  let live = await start(4186)
  await measure(live, 'coldRich', 'rich')
  await measure(live, 'coldLite', 'lite')
  await measure(live, 'coldOfflineProfile', 'offline')
  const slow = await start(4187, ['--latency', '800'])
  await measure(slow, 'slowLite', 'lite', true)
  await stop(slow)
  const degraded = await start(4188, ['--fail-media'])
  await measure(degraded, 'failedMedia', 'rich', false, true)
  await stop(degraded)

  const desktopPage = observe(await browser.newPage(desktop))
  await desktopPage.goto(live.address + '/#/path')
  await saved(desktopPage)
  await snap(desktopPage, 'desktop-onboarding')
  await audit(desktopPage, 'Desktop onboarding')
  await desktopPage.close()

  const context = await browser.newContext(mobile)
  const page = observe(await context.newPage())
  await page.goto(live.address + '/#/path')
  await saved(page)
  await snap(page, 'mobile-onboarding')
  await audit(page, 'Mobile onboarding')
  await button(page, 'Use the sample job').click()
  await button(page, 'Find my starting point').click()
  await page.getByRole('radio', { name: 'Calculate stock variance percentages' }).check()
  await page.getByRole('radio', { name: 'Calculate commission and payouts' }).check()
  await snap(page, 'mobile-skill-confirmation')
  await button(page, 'Start the diagnostic').click()
  await heading(page, 'Quick diagnostic').waitFor()
  await snap(page, 'mobile-diagnostic')
  await audit(page, 'Diagnostic')
  for (const value of ['100', '415', '0.75']) {
    await page.getByLabel('Your answer').fill(value)
    await page.getByLabel('Your answer').press('Enter')
  }
  await button(page, 'Show my learning path').click()
  await page.getByText(/You answered 1 of 3/).waitFor()
  await page.getByText('Progress synced').waitFor()
  await snap(page, 'mobile-path')
  await audit(page, 'Learning path')
  await button(page, 'Start recommended lesson').click()
  await button(page, 'Read').click()
  const example = page.getByLabel('Answer: What is 20% of 350?', { exact: true })
  await example.fill('370')
  await example.press('Enter')
  await page.getByText(/The answer is 70/).waitFor()
  await button(page, 'Visual').click()
  await page.getByRole('slider').first().fill('20')
  await button(page, 'Read').click()
  await page.getByText(/The answer is 70/).waitFor()
  await snap(page, 'mobile-lesson')
  await audit(page, 'Reading lesson')
  await button(page, 'Audio').click()
  assert.equal(await page.locator('audio').count(), 0)
  await button(page, 'Load lesson audio').click()
  await page.waitForFunction(() => document.querySelector('audio')?.readyState >= 2)
  await button(page, 'Open my revision reel').click()
  await page.locator('video.video-ready').waitFor()
  await page.locator('.reel-wrong').filter({ hasText: '₹370' }).waitFor()
  await snap(page, 'mobile-reel-hook')
  await page.locator('[data-beat="2"]').waitFor()
  await page.locator('.reel-math').filter({ hasText: '₹70' }).waitFor()
  await snap(page, 'mobile-reel-explanation')
  const input = page.getByLabel('Your answer')
  await input.waitFor({ timeout: 16_000 })
  await wait(1350)
  assert.equal(await page.locator('.reel-answer').count(), 0)
  await snap(page, 'mobile-reel-recall')
  await audit(page, 'Recall gate')
  const question = await page.locator('.reel-question').innerText()
  const [, rate, value] = /([\d.]+)% of ₹([\d,.]+)/.exec(question)
  await input.fill(String(Number(rate) * Number(value.replaceAll(',', '')) / 100))
  await input.press('Enter')
  await page.locator('.reel-answer').waitFor()
  assert((await page.locator('.reel-feedback').innerText()).includes(`₹${value} × ${rate} ÷ 100`))
  await snap(page, 'mobile-reel-result')
  await button(page, 'Start the skill challenge').click()
  await heading(page, 'Payout skill challenge').waitFor()
  evidence.checks.push('Job confirmation, adaptive diagnostic, shared lesson modes, audio, timed personalized recall and answer feedback')

  await stop(live)
  assert.equal(await fetch(live.address).catch(() => 'stopped'), 'stopped')
  await context.setOffline(true)
  const offlineAt = performance.now()
  await page.reload({ waitUntil: 'commit' })
  await heading(page, 'Payout skill challenge').waitFor()
  evidence.loads.serverKilledOfflineReload = { headingsMs: Math.round(performance.now() - offlineAt), payloadBytes: 0 }
  await page.getByLabel('Payout for R-101').fill('42')
  await page.reload()
  assert.equal(await page.getByLabel('Payout for R-101').inputValue(), '42')
  const { seed } = await page.evaluate(() => JSON.parse(localStorage.getItem('scrollproof:journey:payout-draft')))
  const { key } = payoutTask(seed)
  for (const [index, label] of ['Payout for R-101', 'Payout for R-102', 'Payout for R-103', 'Total payout'].entries()) {
    await page.getByLabel(label, { exact: true }).fill(String(key.values[`D${index + 2}`]))
  }
  await button(page, 'Submit worksheet').click()
  await heading(page, '4 of 4 amounts correct').waitFor()
  await snap(page, 'mobile-challenge')
  await audit(page, 'Submitted worksheet offline')
  await button(page, 'Continue to trainer review').click()
  await page.getByText(/Review is pending. Reconnect/).waitFor()
  assert.equal(await button(page, 'Approve as demo trainer').count(), 0)
  await snap(page, 'mobile-review-pending')
  await page.reload()
  await page.getByText(/Review is pending. Reconnect/).waitFor()
  evidence.checks.push('Server stopped, shell and draft reload offline, submission persists, review stays pending')
  live = await start(4186)
  await context.setOffline(false)
  await page.getByText('Progress synced', { exact: true }).waitFor()
  await heading(page, 'Trainer review · Demo').waitFor()
  await page.getByRole('checkbox', { name: 'I checked all three rider payouts' }).check()
  await page.getByRole('checkbox', { name: 'I checked the total payout' }).check()
  await audit(page, 'Demo trainer review')
  await button(page, 'Approve as demo trainer').click()
  await heading(page, 'Skill Passport').waitFor()
  assert(await button(page, 'Open employer preview').isDisabled())
  await page.getByRole('checkbox', { name: /Show this reviewed skill/ }).check()
  await button(page, 'Open employer preview').click()
  await heading(page, 'Employer preview').waitFor()
  await snap(page, 'mobile-passport')
  await audit(page, 'Consented Skill Passport')
  await page.getByRole('checkbox', { name: /Show this reviewed skill/ }).uncheck()
  assert.equal(await heading(page, 'Employer preview').count(), 0)
  await page.goto(live.address + '/#/challenge')
  await button(page, 'Try a new worksheet').click()
  await page.goto(live.address + '/#/skill-passport')
  await page.getByText('Awaiting a worksheet').waitFor()
  assert.equal(await button(page, 'Open employer preview').count(), 0)
  evidence.checks.push('Reconnection auto-sync, demo receipt, consent granted/revoked, new draft detaches prior review')

  await page.goto(live.address + '/#/delivery')
  await page.getByRole('radio', { name: /^Rich/ }).check()
  await page.getByRole('checkbox', { name: /^Data Saver/ }).check()
  await page.getByText('Playing in Lite mode').waitFor()
  await snap(page, 'mobile-delivery')
  await audit(page, 'Adaptive delivery')
  await page.goto(live.address + '/#/revision')
  assert.equal(await page.locator('video').count(), 0)
  await page.locator('.reel-answer').waitFor()
  await page.locator('.career-task-menu summary').click()
  await page.getByRole('button', { name: /ಕನ್ನಡ/ }).click()
  await page.locator('.reel-player[lang="kn"]').waitFor()
  await snap(page, 'mobile-kannada-reel')
  evidence.checks.push('Data Saver overrides Rich, saved recall persists, Kannada glyphs render in desktop Chromium')
  await context.close()

  const compact = observe(await browser.newPage({ ...mobile, viewport: { width: 320, height: 640 }, reducedMotion: 'reduce' }))
  for (const [route, name] of [['#/path', 'Onboarding'], ['#/diagnostic', 'Diagnostic entry'], ['#/learn', 'Lesson'], ['#/delivery', 'Delivery'], ['#/revision', 'Revision'], ['#/challenge', 'Challenge'], ['#/feed', 'Legacy feed'], ['#/work-order', 'Legacy work order'], ['#/passport', 'Legacy passport']]) {
    await compact.goto(live.address + '/' + route)
    await compact.locator('main').waitFor()
    await compact.addStyleTag({ content: 'html { font-size: 200% }' })
    await audit(compact, name + ' at 320 px', true)
    if (route === '#/revision') {
      assert.equal(await compact.locator('video').count(), 0)
      for (let step = 0; step < 4; step++) await button(compact, 'Next scene').click()
      await compact.getByLabel('Your answer').waitFor()
      await checkReelFits(compact, '.reel-gate button')
      await audit(compact, 'Recall gate at 320 px', true)
      await snap(compact, 'mobile-320-text-200-recall')
      await compact.getByLabel('Your answer').fill('20')
      await compact.getByLabel('Your answer').press('Enter')
      await checkReelFits(compact, '.reel-feedback button')
    }
  }
  await compact.close()
  await stop(live)

  const trainer = await start(4189, [], 'qa-trainer-pin')
  const token = crypto.randomUUID()
  const post = (path, body, bearer = token) => fetch(trainer.address + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + bearer }, body: JSON.stringify(body),
  })
  const sample = { id: crypto.randomUUID(), seed: 42, at: Date.now(),
    cells: Object.fromEntries(Object.entries(payoutTask(42).key.values).map(([cell, value]) => [cell, String(value)])) }
  const approval = { submissionId: sample.id, verifyRows: true, verifyTotal: true, decision: 'approved' }
  assert.equal((await post('/api/review', approval)).status, 409)
  const both = await Promise.all([post('/api/sync', { learning: [], submissions: [sample] }), post('/api/sync', { learning: [], submissions: [sample] })])
  for (const response of both) assert.deepEqual((await response.json()).ack, [sample.id])
  assert.equal((await post('/api/review', approval)).status, 403)
  assert.equal((await post('/api/review', { ...approval, trainerCode: 'qa-trainer-pin' }, crypto.randomUUID())).status, 409)
  const verified = await post('/api/review', { ...approval, trainerCode: 'qa-trainer-pin' })
  assert.equal(verified.status, 200)
  const receipt = await verified.json()
  assert.equal(receipt.demo, false)
  assert(receipt.attemptId.endsWith(sample.id) && receipt.evidenceId.length === 64)
  evidence.checks.push('Parallel duplicate sync is idempotent, review requires prior upload, trainer code and matching learner')
  await stop(trainer)
  assert.deepEqual(errors, [], 'Uncaught browser errors')
  assert.deepEqual(evidence.access.filter((row) => row.violations.length || row.badTargets.length || row.overflow > 0), [])
} finally {
  await browser.close()
  for (const child of processes) await stop({ processHandle: child })
  await rm(data, { recursive: true, force: true })
  await writeFile(join(captures, 'browser-measurements.json'), JSON.stringify({ ...evidence, errors }, null, 2) + '\n')
}
console.log(JSON.stringify({ checks: evidence.checks, access: evidence.access, loads: Object.fromEntries(
  Object.entries(evidence.loads).map(([name, { requests, media, ...result }]) => [name, result]),
) }, null, 2))
