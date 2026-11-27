// Builds on the full regression in verify_capable.mjs with GLB, camera and raycast coverage.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PARTS, PART_LABEL, TERMINALS, TERMINAL_LABEL, TEST_POINTS } from '../app/src/capable/arena.ts'

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, 'outputs/capable-qa')
const assets = resolve(root, 'app/src/capable/assets/practical-arena')
const manifest = JSON.parse(await readFile(resolve(assets, 'manifest.json'), 'utf8'))
const bytes = await readFile(resolve(assets, 'practical-arena.glb'))
const glb = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString('utf8'))
const names = new Set(glb.nodes.map((n) => n.name))
assert.equal(bytes.readUInt32LE(4), 2)
assert.equal(bytes.length, manifest.stats.bytes)
assert.ok(manifest.stats.bytes < 6_000_000 && manifest.stats.triangles < 80_000)
assert.deepEqual(Object.keys(manifest.terminals), TERMINALS)
assert.deepEqual(Object.keys(manifest.faults), PARTS)
for (const name of [manifest.root, ...Object.values(manifest.nodes), ...Object.values(manifest.terminals),
  ...Object.values(manifest.faults), ...Object.values(manifest.controls), ...Object.values(manifest.probes).flatMap(Object.values),
  ...Object.values(manifest.cameras).map((cam) => cam.anchor)]) assert.ok(names.has(name), `Missing ${name}`)
const tris = glb.meshes.flatMap((mesh) => mesh.primitives).reduce((n,p) => n + glb.accessors[p.indices].count / 3, 0)
assert.equal(tris, manifest.stats.triangles)
assert.ok(glb.images.every((image) => image.bufferView !== undefined && !image.uri))
console.log(`PASS production GLB nodes, ${bytes.length} bytes, ${tris} triangles, ${glb.images.length} embedded images`)

await mkdir(output, { recursive: true })
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const port = Number(process.env.CAPABLE_ARENA_QA_PORT ?? 4398)
const origin = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, ['scripts/capable_server.mjs', '--port', String(port), '--data', ':memory:'], {
  env: { ...process.env, CAPABLE_GEMINI_ENABLED: '0' }, cwd: root, stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true,
})
let browser
try {
  await new Promise((done, fail) => {
    const timeout = setTimeout(() => fail(new Error('Arena QA server did not start')), 15_000)
    server.stdout.on('data', (chunk) => { if (chunk.includes('CAPABLE at')) { clearTimeout(timeout); done() } })
    server.once('error', (error) => { clearTimeout(timeout); fail(error) })
  })
  browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' })
  await context.route((url) => /^https?:/.test(url.protocol) && url.origin !== origin, (route) => route.abort())
  const page = await context.newPage()
  const messages = [], remote = new Set()
  page.on('pageerror', (error) => messages.push(error.stack))
  page.on('request', (request) => {
    const url = new URL(request.url())
    // The host's browser security product injects this script outside the application bundle.
    if (/^https?:/.test(url.protocol) && url.origin !== origin && !url.hostname.endsWith('.scr.kaspersky-labs.com')) remote.add(url.hostname)
  })
  const button = (name) => page.getByRole('button', { name, exact: true })
  const shot = (name) => page.screenshot({ path: resolve(output, `${name}.png`), fullPage: true })
  const ready = (screen = page) => screen.locator('[data-point="fixture"][data-hit-x]').waitFor({ state: 'attached', timeout: 30_000 })
  const view = async (name, id) => {
    await button(`${name} view`).click()
    assert.equal(await button(`${name} view`).getAttribute('aria-pressed'), 'true')
    assert.equal(await page.locator('.c2-canvas-root').getAttribute('data-bench-view'), id)
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))))
  }
  async function raycast(key, screen = page, touch = false) {
    const point = screen.locator(`[data-point="point-${key}"][data-hit-x]`)
    await point.waitFor({ state: 'visible' })
    await screen.locator('.c2-viewport').scrollIntoViewIfNeeded()
    const viewport = await screen.locator('.c2-viewport').boundingBox()
    const [x, y] = await point.evaluate(({ dataset }) => [Number(dataset.hitX), Number(dataset.hitY)])
    if (touch) await screen.touchscreen.tap(viewport.x + x, viewport.y + y)
    else await screen.mouse.click(viewport.x + x, viewport.y + y)
  }

  const started = Date.now()
  await page.goto(`${origin}/#/capable`)
  await ready()
  console.log(`Overview ready in ${Date.now()-started} ms in desktop Chrome (software WebGL)`)
  await shot('arena-desktop')
  await button('Unscrew cover').click()
  await view('Circuit', 'circuit')
  await button('Breaker ON').click()
  await raycast('fuse-in')
  await page.getByText(/Red probe at Fuse in/).waitFor()
  await raycast('neutral')
  assert.match(await page.locator('.c2-meter-screen').innerText(), /0\.0\s+V AC/)
  await shot('arena-circuit-desktop')
  await view('Multimeter', 'multimeter')
  await shot('arena-multimeter-desktop')
  console.log('PASS all three camera presets, terminal raycasts and physical meter context')

  const pack = await (await page.request.get(`${origin}/precache-manifest.json`)).json()
  const glbPath = pack.urls.find((path) => /practical-arena-.+\.glb$/.test(path))
  const studioPath = pack.urls.find((path) => /studio-.+\.png$/.test(path))
  assert.ok(glbPath && studioPath)
  await page.waitForFunction(async ([model, studio]) => navigator.serviceWorker.controller && (await caches.match(model)) && (await caches.match(studio)), [glbPath, studioPath])
  const modelResponse = await page.request.head(`${origin}${glbPath}`)
  assert.equal(modelResponse.headers()['content-type'], 'model/gltf-binary')
  assert.equal(Number(modelResponse.headers()['content-length']), bytes.length)
  await context.setOffline(true)
  for (const [index, part] of PARTS.entries()) {
    await page.goto(`${origin}/#/capable?practice=${20 + index}`)
    await ready()
    await button('Unscrew cover').click()
    await button('Breaker ON').click()
    for (const key of ['fuse-in', 'neutral']) await button(TERMINAL_LABEL[key]).click()
    assert.match(await page.locator('.c2-meter-screen').innerText(), /0\.0/)
    await button('Resistance Ω').click()
    for (const key of TEST_POINTS[part]) await button(TERMINAL_LABEL[key]).click()
    assert.match(await page.locator('.c2-meter-screen').innerText(), /OL/)
    await button('Repair').click()
    await button(`Repair ${PART_LABEL[part].toLowerCase()}`).click()
    await button('Close cover').click()
    await button('Breaker OFF').click()
    await button('Run load test').click()
    await page.getByText('Lamp on', { exact:true }).waitFor()
    await page.getByText(/Practice passed/).waitFor()
    if (index === 3) await shot('arena-restored-desktop')
    console.log(`PASS offline GLB and ${part} isolation, reading, repair and load test`)
  }
  await context.setOffline(false)
  assert.equal(remote.size, 0, `Unexpected external requests: ${[...remote]}`)
  assert.deepEqual(messages, [])

  for (const [name, width, height] of [['portrait',390,844],['landscape',844,390]]) {
    const touch = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
    await touch.goto(`${origin}/#/capable`)
    await ready(touch)
    assert.equal(await touch.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await touch.screenshot({ path: resolve(output, `arena-mobile-${name}.png`), fullPage: true })
    await touch.getByRole('button', { name: 'Circuit view', exact: true }).tap()
    await touch.getByRole('button', { name: 'Unscrew cover', exact: true }).tap()
    assert.equal(await touch.getByRole('button', { name: 'Circuit view', exact: true }).getAttribute('aria-pressed'), 'true')
    await raycast('fuse-in', touch, true)
    await touch.getByText(/Red probe at Fuse in/).waitFor()
    await touch.close()
    console.log(`PASS mobile ${name} touch and layout`)
  }
  const fallbackBrowser = await chromium.launch({ channel: 'chrome', args: ['--disable-webgl'] })
  try {
    const fallback = await fallbackBrowser.newPage()
    await fallback.goto(`${origin}/#/capable`)
    await fallback.getByText(/3D is unavailable/).waitFor()
    for (const name of ['Unscrew cover', 'Breaker ON', 'Fuse in', 'Neutral rail']) await fallback.getByRole('button', { name, exact: true }).click()
    assert.match(await fallback.locator('.c2-meter-screen').innerText(), /0\.0/)
    console.log('PASS diagnosis without WebGL')
  } finally { await fallbackBrowser.close() }
} finally {
  try { if (browser) await browser.close() } finally { server.kill() }
}
