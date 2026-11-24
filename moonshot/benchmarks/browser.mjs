import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { stockResult, variant } from '../../app/src/moonshot/domain.ts'

const root = resolve(import.meta.dirname, '../..')
const output = resolve(root, process.env.CAPABLE_MISSION_QA_OUTPUT || process.env.SCROLLPROOF_MISSION_QA_OUTPUT || 'moonshot/benchmarks')
const artifacts = join(output, 'captures')
const work = await mkdtemp(join(tmpdir(), 'spx-browser-'))
await mkdir(artifacts, { recursive: true })
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: [
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--enable-precise-memory-info',
] })
const base = 'http://127.0.0.1:4194'
const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }
const measured = { browser: browser.version(), metrics: {}, audits: [], checks: [], errors: [], snapshots: [] }
const http = []
const wait = (ms) => new Promise((done) => setTimeout(done, ms))
let server

async function start() {
  server = spawn(process.execPath, [join(root, 'scripts', 'capable_server.mjs'), '--port', '4194',
    '--data', join(work, 'browser.sqlite'), '--metrics'], { windowsHide: true, env: { ...process.env, CAPABLE_TRAINER_CODE: 'spx-browser-review' } })
  createInterface({ input: server.stdout }).on('line', (line) => { if (line.startsWith('{')) http.push(JSON.parse(line)) })
  server.stderr.resume()
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw new Error('Moonshot test server stopped during start')
    const response = await fetch(base, { method: 'HEAD' }).catch(() => null)
    if (response?.ok) return
    await wait(50)
  }
  throw new Error('Moonshot test server did not start')
}

async function stop() {
  if (!server || server.exitCode !== null || server.signalCode !== null) return
  await new Promise((done) => { server.once('exit', done); server.kill() })
}

const button = (page, caption) => page.getByRole('button', { name: caption, exact: true })
const title = (page, name) => page.getByRole('heading', { name, exact: true, level: 1 })
async function snapshot(page, name) {
  await page.screenshot({ path: join(artifacts, name + '.png'), fullPage: true })
  measured.snapshots.push(name + '.png')
}
async function inspect(page, name) {
  if (!await page.evaluate(() => !!window.axe)) await page.addScriptTag({ path: join(root, 'app/node_modules/axe-core/axe.min.js') })
  measured.audits.push(await page.evaluate(async (name) => {
    const audit = await window.axe.run({ runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] } })
    const clipped = [...document.querySelectorAll('.mission-screen button:not([disabled]), .mission-screen summary, .mission-screen input, .mission-screen textarea, .mission-screen select')].flatMap((node) => {
      const box = (node.matches('input[type=checkbox]') ? node.labels[0] : node).getBoundingClientRect()
      return box.width && box.height && (box.width < 44 || box.height < 44) ? [node.textContent || node.getAttribute('name') || node.outerHTML.slice(0, 90)] : []
    })
    return { name, violations: audit.violations.map((problem) => ({ rule: problem.id, targets: problem.nodes.map((node) => node.target) })),
      viewport_overflow: document.documentElement.scrollWidth - innerWidth, clippedTargets: clipped }
  }, name))
}

try {
  await start()
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await desktop.goto(base + '/#/mission')
  await snapshot(desktop, 'desktop-mission')
  await inspect(desktop, 'Desktop entry')
  await desktop.close()

  const context = await browser.newContext({ ...mobile, reducedMotion: 'reduce', permissions: ['microphone'] })
  await context.addInitScript(() => {
    if (!localStorage.getItem('scrollproof:v1')) localStorage.setItem('scrollproof:v1', JSON.stringify({ delivery: 'lite' }))
  })
  const page = await context.newPage()
  page.setDefaultTimeout(13_000)
  page.on('pageerror', (error) => measured.errors.push(error.message))
  const begin = performance.now()
  const coldIndex = http.length
  await page.goto(base + '/#/mission', { waitUntil: 'commit' })
  await button(page, 'Load the stock-count demo').waitFor()
  measured.metrics.firstUsefulMs = Math.round(performance.now() - begin)
  await page.getByTestId('offline-status').filter({ hasText: 'Offline ready' }).waitFor()
  measured.metrics.offlineReadyMs = Math.round(performance.now() - begin)
  await wait(120)
  const initial = http.slice(coldIndex)
  measured.metrics.coldLiteBodyBytes = initial.reduce((bytes, item) => bytes + item.bytes, 0)
  measured.metrics.coldMedia = initial.filter((item) => item.path.startsWith('/media/'))
  measured.metrics.heapBytes = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null)
  assert(!initial.some((item) => item.path.endsWith('.mp4')))
  await snapshot(page, 'mobile-capture')
  await inspect(page, 'Lite capture')
  assert(await page.getByLabel('Private source attachment').isDisabled())
  await button(page, 'Load the stock-count demo').click()
  await button(page, 'Extract worksheet facts').click()
  await title(page, 'Confirm the facts').waitFor()
  await snapshot(page, 'mobile-facts')
  await page.getByLabel('counted', { exact: true }).fill('129')
  await button(page, 'Confirm facts and review the source').click()
  await page.getByRole('alert').getByText(/fixed counts/).waitFor()
  await page.getByLabel('counted', { exact: true }).fill('128')
  await button(page, 'Confirm facts and review the source').click()
  await title(page, 'Review the demonstration').waitFor()
  await inspect(page, 'Expert review')
  const videoStart = performance.now()
  await button(page, 'Load the source video').click()
  await page.locator('video').waitFor()
  await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2)
  measured.metrics.explicitVideoReadyMs = Math.round(performance.now() - videoStart)
  await button(page, '0:08').click()
  await page.waitForFunction(() => Math.abs(document.querySelector('video').currentTime - 8) < .12)
  await page.getByRole('checkbox', { name: 'Allow educational derivatives on this device' }).check()
  for (let i = 1; i <= 5; i++) await page.getByLabel('Review step ' + i).selectOption('checked')
  await button(page, 'Approve the demo playbook').click()
  await page.getByRole('alert').getByText(/shows C4/).waitFor()
  await page.getByLabel('Instruction 3', { exact: true }).fill('Use C4 for receipts on the same item row.')
  await page.getByLabel('Review step 3').selectOption('checked')
  await button(page, 'Use the scripted contributor answer').click()
  await snapshot(page, 'mobile-expert-review')
  await button(page, 'Approve the demo playbook').click()
  await title(page, 'Mission playbook').waitFor()
  await page.getByText('Version 1', { exact: true }).waitFor()
  await snapshot(page, 'mobile-playbook')
  await inspect(page, 'Approved playbook')
  await button(page, 'Learn from this playbook').click()
  await button(page, 'Next step').click()
  await button(page, 'Expert replay').click()
  await page.getByText('Step 2 of 5').waitFor()
  await page.getByLabel('Ask about the source').fill('What is the phone number?')
  await button(page, 'Find an answer in the source').click()
  await page.getByText(/does not answer this/).waitFor()
  await page.getByLabel('Ask about the source').fill('Why C4 instead of C5?')
  await button(page, 'Find an answer in the source').click()
  await button(page, 'Go to source 0:04').waitFor()
  await snapshot(page, 'mobile-source-answer')
  await button(page, 'Audio').click()
  await button(page, 'Load synthetic English narration').click()
  await page.waitForFunction(() => document.querySelector('audio')?.readyState >= 2)
  await button(page, 'Visual').click()
  await page.getByText('128 − 132 = -4').waitFor()
  await button(page, 'Practice').click()
  await page.getByLabel('Expected closing stock').fill('132')
  await page.getByLabel('Signed stock difference').fill('4')
  await page.getByLabel('Signed stock difference').press('Enter')
  await title(page, 'Recall the stock rule').waitFor()
  await page.getByText('Stock difference', { exact: true }).waitFor()
  await button(page, 'Next scene').click()
  await button(page, 'Next scene').click()
  await page.getByText('128 − 132', { exact: true }).waitFor()
  await page.addStyleTag({ content: 'html { font-size: 200% }' })
  await page.setViewportSize({ width: 320, height: 650 })
  await button(page, 'Go to recall question').click()
  const fits = await button(page, 'Check my recall').evaluate((node) => {
    const rect = node.getBoundingClientRect(), frame = node.closest('.premium-frame').getBoundingClientRect()
    return rect.bottom <= frame.bottom && rect.right <= frame.right
  })
  assert(fits)
  await inspect(page, 'Reduced motion recall, 320px and 200% text')
  await snapshot(page, 'mobile-big-text-recall')
  await page.addStyleTag({ content: 'html { font-size: 100% }' })
  await page.setViewportSize(mobile.viewport)
  const prompt = await page.locator('.reel-question').innerText()
  const [, counted, expected] = /Counted (\d+), expected (\d+)/.exec(prompt)
  await page.getByLabel('Your recall answer').fill(String(Number(counted) - Number(expected)))
  await page.getByLabel('Your recall answer').press('Enter')
  await button(page, 'Start an unseen worksheet').click()
  await title(page, 'Try an unseen worksheet').waitFor()
  await stop()
  assert.equal(await fetch(base).catch(() => 'stopped'), 'stopped')
  await context.setOffline(true)
  const offline = performance.now()
  await page.reload({ waitUntil: 'commit' })
  await title(page, 'Try an unseen worksheet').waitFor()
  measured.metrics.offlineWorksheetMs = Math.round(performance.now() - offline)
  const seed = await page.evaluate(() => JSON.parse(localStorage.getItem('scrollproof:journey:moonshot-seed')))
  const key = stockResult(variant(seed))
  await page.getByLabel('Expected closing stock').fill(String(key.expected))
  await page.getByLabel('Signed stock difference').fill(String(key.variance))
  await button(page, 'Submit the unseen worksheet').click()
  await page.getByText('Both checks correct').waitFor()
  await button(page, 'Record a private explanation').click()
  await button(page, 'Stop and save private recording').waitFor()
  await wait(300)
  await button(page, 'Stop and save private recording').click()
  await page.getByText(/Explanation saved privately/).waitFor()
  await button(page, 'Send worksheet values for trainer review').click()
  await page.getByText(/will sync when/).waitFor()
  assert.equal(await button(page, 'Record trainer review').count(), 0)
  await page.reload()
  await page.getByText(/Explanation saved privately/).waitFor()
  await snapshot(page, 'mobile-offline-proof')
  await inspect(page, 'Offline evidence')
  await start()
  await context.setOffline(false)
  await page.getByRole('checkbox', { name: 'I checked the two rubric values and source version' }).check()
  await button(page, 'Record trainer review').click()
  await page.getByText('A valid trainer code is required.').waitFor()
  await page.getByLabel('Trainer code, if the server requires one').fill('spx-browser-review')
  await button(page, 'Record trainer review').click()
  await page.getByText('Review recorded on the server.').waitFor()
  const view = page.getByText('Demo opportunity preview', { exact: true })
  assert.equal(await view.count(), 0)
  await page.getByRole('checkbox', { name: /Allow a same-device opportunity preview/ }).check()
  await view.waitFor()
  await snapshot(page, 'mobile-reviewed-proof')
  await page.getByRole('checkbox', { name: /Allow a same-device opportunity preview/ }).uncheck()
  assert.equal(await view.count(), 0)
  const tokens = await page.evaluate(() => {
    const log = JSON.parse(localStorage.getItem('scrollproof:journey:moonshot-evidence-v1'))
    return { token: localStorage.getItem('scrollproof:device:v1'), attemptId: log.latest, evidence: log.attempts[log.latest] }
  })
  const api = (body, bearer = tokens.token) => fetch(base + '/api/mission', { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + bearer }, body: JSON.stringify({ attemptId: tokens.attemptId, ...body }) })
  assert.equal((await api({ action:'read' }, crypto.randomUUID())).status, 404)
  await button(page, 'Withdraw review access').click()
  await page.getByText('Review access withdrawn.').waitFor()
  assert.equal((await api({ action:'read' })).status, 404)
  assert.equal((await api({ ...tokens.evidence, action:'submit' })).status, 409)
  await button(page, 'Contribute to the mission').click()
  await page.getByLabel('Contribution type').selectOption('correction')
  await page.getByLabel('Your contribution').fill('Add a repeat count led by a second team member.')
  await button(page, 'Save for moderation').click()
  await page.getByText('Awaiting moderation', { exact: false }).waitFor()
  const downloadReady = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Download reviewed text pack' }).click()
  const download = await downloadReady
  const packed = await download.path()
  const { stat } = await import('node:fs/promises')
  measured.metrics.textPackBytes = (await stat(packed)).size
  await snapshot(page, 'mobile-community')
  await button(page, 'Send to review draft').click()
  await page.getByLabel('Review step 6').selectOption('checked')
  await button(page, 'Approve the demo playbook').click()
  await page.getByText('Version 2', { exact: true }).waitFor()
  const revisions = await page.evaluate(() => JSON.parse(localStorage.getItem('scrollproof:journey:moonshot-playbook-history')))
  assert.equal(revisions[0].steps.length, 5)
  assert.equal(revisions[1].steps.length, 6)
  const cache = await page.evaluate(async () => {
    const names = await caches.keys()
    const records = []
    for (const name of names) for (const item of await (await caches.open(name)).keys()) records.push(new URL(item.url).pathname)
    return records
  })
  measured.metrics.cachePaths = cache
  measured.checks.push('Scoped capture and fixed-fact validation', 'Cited step correction and versioned moderation', 'Five mode workflow and sourced Q&A abstention',
    'Reduced-motion recall and keyboard response', 'Server-killed reload, browser-controlled microphone and persisted explanation', 'Ordered reconnect sync',
    'Wrong trainer code and cross-token lookup refused', 'Preview consent reversible, server withdrawal beats stale retransmit', 'Downloaded reviewed text pack')
  await context.close()
  const fallback = await browser.newContext({ ...mobile, serviceWorkers:'block' })
  await fallback.route('**/media/moonshot/inventory-demo.mp4', (route) => route.abort())
  const failure = await fallback.newPage()
  await failure.goto(base + '/#/mission')
  await button(failure, 'Load the stock-count demo').click()
  await button(failure, 'Extract worksheet facts').click()
  await button(failure, 'Confirm facts and review the source').click()
  const load = button(failure, 'Load the source video')
  if (await load.isVisible()) await load.click()
  await failure.getByText(/Recording unavailable/).waitFor()
  await failure.getByText(/formula changes to/).first().waitFor()
  measured.checks.push('Missing video preserves source text and timestamped review')
  await fallback.close()

  const privateContext = await browser.newContext(mobile)
  const privatePage = await privateContext.newPage()
  const privateUploads = []
  privatePage.on('request', (entry) => {
    if (entry.method() === 'POST') privateUploads.push({ url: entry.url(), body: entry.postData() ?? '' })
  })
  await privatePage.goto(base + '/#/mission')
  await privatePage.getByLabel('Problem and available counts').fill('SKU LOCAL-3. Opening: 89. Received: 21. Sold: 16. Counted: 80. Contact a@example.com')
  await privatePage.getByRole('checkbox', { name:'I have permission to keep this source on this device' }).check()
  await privatePage.getByLabel('Private source attachment').setInputFiles(join(root, 'moonshot/media/worksheet.png'))
  await privatePage.getByText(/Attachment saved/).waitFor()
  await privatePage.reload()
  await privatePage.getByText(/Attachment saved/).waitFor()
  await button(privatePage, 'Extract worksheet facts').click()
  await privatePage.getByText(/Contact \[EMAIL\]/).waitFor()
  await button(privatePage, 'Confirm facts and review the source').click()
  await privatePage.getByRole('img', { name:'Private source document preview' }).waitFor()
  const ownRequests = privateUploads.filter((entry) => new URL(entry.url).origin === base)
  assert.equal(ownRequests.length, 0, JSON.stringify(ownRequests.map((entry) => new URL(entry.url).pathname)))
  const markers = { syntheticSku: /LOCAL-3/, syntheticEmail: /a@example\.com/, redactedText: /Contact \[EMAIL\]/, pngSignature: /iVBORw0KGgo/ }
  measured.metrics.captureNetwork = {
    firstPartyPosts: ownRequests.length,
    environmentObservations: privateUploads.flatMap((entry) => {
      const matches = Object.entries(markers).filter(([, pattern]) => pattern.test(entry.body)).map(([key]) => key)
      return matches.length ? [{ hostname: new URL(entry.url).hostname, matches }] : []
    }),
  }
  await privatePage.getByText('Manage this source', { exact:true }).click()
  await button(privatePage, 'Delete source and withdraw access').click()
  await privatePage.getByText(/Source and its drafts removed/).waitFor()
  assert.equal(await privatePage.getByText(/Attachment saved/).count(), 0)
  measured.checks.push('App issued no capture upload. Private worksheet attachment persists after reload and can be deleted.')
  await privateContext.close()
  assert.deepEqual(measured.errors, [])
  assert.deepEqual(measured.audits.filter((row) => row.violations.length || row.viewport_overflow > 0 || row.clippedTargets.length), [])
} finally {
  await browser.close()
  await stop()
  await rm(work, { recursive: true, force: true })
  await writeFile(join(output, 'browser-results.json'), JSON.stringify(measured, null, 2) + '\n')
}
console.log(JSON.stringify(measured, null, 2))
