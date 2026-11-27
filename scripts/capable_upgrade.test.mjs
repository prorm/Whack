import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { arenaPassed, faultFor, PARTS, replayArena, solveArena, supplyFor, TEST_POINTS } from '../app/src/capable/arena.ts'
import { FIELD_IDS, LABELS, gradeSolar, observedProfile, readProfile, sampleObservations, sanitizeObservations, solarVariant, voltage } from '../app/src/capable/solar.ts'
import { verifySignature } from '../app/src/capable/proof.ts'
import { cloudConfig, createGemini, makeBudget, readMedia } from './capable_gemini.mjs'
import { capableUpgrade } from './capable_upgrade.mjs'
import { CODE_CONTEXT, SCENARIOS, TRADE_CONTEXT, exposes, trapCode } from '../app/src/os/aipair.ts'

test('server issues AI Pair trials without their seed and signs only what it re-graded', async () => {
  const db = new DatabaseSync(':memory:')
  const api = capableUpgrade(db, {})
  const [status, code] = await api.handle('start', 'learner', { kind: 'aicode' })
  assert.equal(status, 201)
  assert.equal(code.seed, 0)
  const t = code.ticket
  assert.equal(t.suggestions.length, 2)
  const trap = t.suggestions.find((s) => s.code === trapCode(t.variant))
  const expose = SCENARIOS.find((s) => exposes(trapCode(t.variant), s, 1))
  const need = CODE_CONTEXT.filter((c) => c.kind === 'need').map((c) => c.id)
  assert.equal((await api.handle('grade', 'learner', { id: code.id, answer: { context: need, ship: 'C', expose } }))[0], 400)
  const [, receipt] = await api.handle('grade', 'learner', { id: code.id, answer: { context: need, ship: trap.slot === 'A' ? 'B' : 'A', expose }, passed: false })
  assert.equal(receipt.record.kind, 'aicode')
  assert.equal(receipt.record.passed, true)
  const [, key] = api.public('/api/capable/key')
  assert.equal(await verifySignature(receipt, key.publicKey), true)

  const [, trade] = await api.handle('start', 'learner', { kind: 'aitrade' })
  assert.equal(trade.seed, 0)
  const fault = PARTS.find((p) => trade.ticket.readings[p] === null)
  const unsafe = trade.ticket.plan.findIndex((s) => /Skip the dead test|breaker still on|Bridge/.test(s))
  const tneed = TRADE_CONTEXT.filter((c) => c.kind === 'need').map((c) => c.id)
  const [, signed] = await api.handle('grade', 'learner', { id: trade.id, answer: { context: tneed, unsafe, measured: [trade.ticket.claim, fault], verdict: fault } })
  assert.equal(signed.record.kind, 'aitrade')
  assert.equal(signed.record.passed, true)
  const [, again] = await api.handle('start', 'learner', { kind: 'aitrade' })
  const wrongPart = PARTS.find((p) => again.ticket.readings[p] !== null)
  const [, failed] = await api.handle('grade', 'learner', { id: again.id, answer: { context: tneed, unsafe: 0, measured: [wrongPart], verdict: wrongPart } })
  assert.equal(failed.record.passed, false)
  db.close()
})

const probe = (mode, a, b) => ({ kind: 'probe', mode, a, b })
const isolate = [{ kind: 'cover' }, { kind: 'breaker' }, probe('ac', 'fuse-in', 'neutral')]
const close = [{ kind: 'cover' }, { kind: 'breaker' }, { kind: 'test' }]
const clearTrace = (part) => [...isolate, probe('ohm', ...TEST_POINTS[part]), { kind: 'repair', part }, ...close]
const { title: ignored, ...ridge } = LABELS.ridge

test('all four seeded faults change the computed circuit and can be diagnosed, isolated and repaired', () => {
  PARTS.forEach((part, i) => {
    const seed = 20 + i
    const broken = replayArena(seed, [])
    const { lit, volts } = solveArena(seed, broken)
    assert.equal(lit, false)
    assert.ok(Math.abs(volts.line - supplyFor(seed)) < .01)
    if (part === 'fuse') assert.ok(Math.abs(volts['fuse-out']) < .01)
    if (part === 'neutral') assert.ok(Math.abs(volts['switch-out'] - volts['lamp-n']) < .01)
    if (part === 'lamp') assert.ok(volts['switch-out'] - volts['lamp-n'] > 220)
    const stage = replayArena(seed, clearTrace(part))
    assert.equal(stage.readings[0].value, 0)
    assert.equal(stage.readings[1].result, 'open')
    assert.ok(solveArena(seed, stage).lampWatts > 45)
    assert.equal(arenaPassed(stage), true)
  })
})

test('unsafe actions, parts-cannon guessing and a solver-driven breaker trip fail the practical', () => {
  const { violations } = replayArena(4, [{ kind: 'cover' }, { kind: 'repair', part: 'fuse' }])
  assert.equal(violations, 1)
  const bypassed = replayArena(4, [...isolate, { kind: 'repair', part: 'fuse' }, ...close])
  assert.equal(bypassed.tested, true)
  assert.equal(bypassed.guesses, 1)
  assert.equal(arenaPassed(bypassed), false)
  const openSwitch = replayArena(6, [...isolate, { kind: 'switch' }, probe('ohm', ...TEST_POINTS.switch)])
  assert.equal(openSwitch.diagnosed, false)
  const short = replayArena(4, [...isolate, { kind: 'bridge' }, { kind: 'breaker' }])
  assert.equal(short.breaker, false)
  assert.match(short.message, /tripped at \d+\.\d A/)
  assert.equal(short.violations, 1)
})

test('covered, wrong-unit and invalid label fields cannot compile a lab', () => {
  assert.equal(observedProfile(sampleObservations('ridge', true)), null)
  assert.deepEqual(observedProfile(sampleObservations('ridge', false)), ridge)
  const fields = sampleObservations('ridge', false)
  fields.moduleVoc.unit = 'kV'; fields.betaVoc.value = 0.28
  assert.equal(observedProfile(sanitizeObservations(fields)), null)
  assert.equal(readProfile({ ...ridge, moduleVoc: '49' }), null)
  assert.ok(voltage(ridge, 10, -10) > voltage(ridge, 10, 25))
})

test('counterfactual has two independently graded checks and both decision outcomes', () => {
  const answers = new Set()
  for (const seed of [2, 320, 1030, 1750]) {
    const task = solarVariant(ridge, seed)
    const max = Math.floor(task.ceiling / voltage(ridge, 1, task.temp))
    const proposal = task.proposed > max ? 'exceeds' : 'within'
    answers.add(proposal)
    assert.equal(gradeSolar(ridge, seed, { panels: max, proposal }).passed, true)
    assert.equal(gradeSolar(ridge, seed, { panels: max + 1, proposal }).passed, false)
  }
  assert.equal(answers.size, 2)
})

test('server binds a trial to its device and signs only what it replayed', async () => {
  const db = new DatabaseSync(':memory:')
  const api = capableUpgrade(db, {})
  const [, ticket] = await api.handle('start', 'learner', { kind: 'arena' })
  const [, next] = await api.handle('start', 'learner', { kind: 'arena' })
  assert.notEqual(faultFor(ticket.seed), faultFor(next.seed))
  const trace = clearTrace(faultFor(ticket.seed))
  assert.equal((await api.handle('grade', 'other', { id: ticket.id, trace }))[0], 404)
  assert.equal((await api.handle('grade', 'learner', { id: ticket.id, trace: [{ kind: 'cover', passes: true }] }))[0], 400)
  const [, receipt] = await api.handle('grade', 'learner', { id: ticket.id, trace, passed: false, seed: 5 })
  assert.equal(receipt.record.passed, true)
  assert.deepEqual(receipt.record.trace, trace)
  const [, key] = api.public('/api/capable/key')
  assert.equal(await verifySignature(receipt, key.publicKey), true)
  assert.equal(await verifySignature({ ...receipt, record: { ...receipt.record, passed: false } }, key.publicKey), false)
  const [, retry] = await api.handle('grade', 'learner', { id: ticket.id, trace: [{ kind: 'cover' }] })
  assert.deepEqual(retry, receipt)
  const [, failed] = await api.handle('grade', 'learner', { id: next.id, trace: [{ kind: 'cover' }] })
  assert.equal(failed.record.passed, false)
  assert.equal(failed.record.isolationProven, false)
  assert.equal((await api.handle('share', 'learner', { id: next.id }))[0], 409)
  const [, first] = await api.handle('share', 'learner', { id: ticket.id })
  assert.deepEqual(api.public(`/api/capable/public/${first.token}`)[1].receipt, receipt)
  await api.handle('revoke', 'learner', { id: ticket.id })
  const [, second] = await api.handle('share', 'learner', { id: ticket.id })
  assert.notEqual(second.token, first.token)
  assert.equal(api.public(`/api/capable/public/${first.token}`)[0], 410)
  assert.equal(api.public(`/api/capable/public/${second.token}`)[0], 200)
  db.close()
})

test('server grades solar against the issued profile and returns the same receipt on retry', async () => {
  const db = new DatabaseSync(':memory:')
  const api = capableUpgrade(db, {})
  assert.equal((await api.handle('start', 'learner', { kind: 'solar', profile: { moduleVoc: 49 } }))[0], 400)
  const [, ticket] = await api.handle('start', 'learner', { kind: 'solar', profile: ridge })
  const task = solarVariant(ridge, ticket.seed)
  const max = Math.floor(task.ceiling / voltage(ridge, 1, task.temp))
  const answer = { panels: max, proposal: task.proposed > max ? 'exceeds' : 'within' }
  const [, receipt] = await api.handle('grade', 'learner', { id: ticket.id, profile: { ...ridge, moduleVoc: 80 }, answer })
  assert.equal(receipt.record.passed, true)
  assert.deepEqual(receipt.record.profile, ridge)
  const [, items] = await api.handle('records', 'learner', {})
  assert.deepEqual(items.records, [{ receipt, token: null }])
  db.close()
})

test('Gemini requests are bounded, routed, validated and blocked before exceeding budget', async () => {
  const db = new DatabaseSync(':memory:')
  const budget = makeBudget(db, .75)
  const calls = []
  const ai = createGemini({ config: cloudConfig({ CAPABLE_VERTEX_API_KEY: 'vertex-mock', CAPABLE_DECISIONS_API_KEY: 'decisions-mock' }), budget,
    fetcher: async (url, request) => {
      calls.push([url, request.headers, JSON.parse(request.body)])
      if (url.includes('/decisions')) return Response.json({ answers: { route: { type: 'choice', choice: 'fuse', confidence: .6 } }, usage: { total_input_tokens: 84 } })
      const data = url.includes('robotics') ? sampleObservations('ridge', true) : { note: 'Compare two cases.', transcript: '', tool: 'compare-cold' }
      return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 70, thoughtsTokenCount: 20 } })
    },
  })
  const photo = await readFile(new URL('../app/src/capable/ridge-covered.jpg', import.meta.url))
  const media = { mimeType: 'image/jpeg', data: photo.toString('base64') }
  assert.throws(() => readMedia({ ...media, data: 'aGVsbG8=' }, 'image'), /JPG/)
  const lens = await ai.lens(media)
  assert.equal(lens.observations[FIELD_IDS[2]].value, null)
  assert.equal((await ai.decision('Possible loose fuse', 'scar')).choice, 'unclear')
  assert.equal((await ai.mentor({ text: 'Why?', lang: 'en' })).tool, 'compare-cold')
  await assert.rejects(ai.mentor({ text: 'Why?', lang: 'en' }), /budget is exhausted/)
  assert.equal(calls.length, 3)
  assert.ok(calls[0][0].match(/^https:\/\/aiplatform\.googleapis\.com/))
  assert.equal(calls[0][1]['x-goog-api-key'], 'vertex-mock')
  assert.equal(calls[0][2].generationConfig.maxOutputTokens, 1024)
  assert.equal(calls[1][0], 'https://generativelanguage.googleapis.com/v1beta/decisions')
  assert.equal(calls[1][1]['x-goog-api-key'], 'decisions-mock')
  assert.equal(calls[2][2].generationConfig.responseSchema.properties.tool.enum.length, 3)
  assert.deepEqual(budget.summary(), { cents: 75, calls: 3, cap: 75 })
  const productionCap = makeBudget(db, 99)
  assert.equal(productionCap.summary().cap, 475)
  db.close()
})
