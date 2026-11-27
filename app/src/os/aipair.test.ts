import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PARTS, faultFor } from '../capable/arena.ts'
import { runSuite, testCases, type VariantId } from './codelab.ts'
import { CODE_CONTEXT, SCENARIOS, TRADE_CONTEXT, aiCodeTicket, aiTradeTicket, claimFor, exposes, gradeAiCode, gradeAiTrade, gradeBrief,
  lineDiff, trapCode, trapSlot, unsafeFor, validAiCodeAnswer, validAiTradeAnswer, type Ctx } from './aipair.ts'
import { CAP } from './taxonomy.ts'
import { evidenceFrom } from './evidence.ts'

const VARIANTS: VariantId[] = ['duplicate', 'units', 'failed', 'refund']
const SEEDS = [1, 42, 4271, 99991, 123456789, 2 ** 31 + 5]
const needs = (cards: Ctx[]) => cards.filter((c) => c.kind === 'need').map((c) => c.id)

test('AI Pair code: every copilot trap fixes the reported bug, passes every visible test and still breaks a hidden contract', () => {
  for (const v of VARIANTS) for (const seed of SEEDS) {
    const all = runSuite(trapCode(v), testCases(v, seed))
    assert.ok(all.filter((t) => !t.hidden).every((t) => t.pass), `${v}/${seed}: the trap must look right on visible tests`)
    assert.ok(all.filter((t) => t.hidden).some((t) => !t.pass), `${v}/${seed}: the trap must fail a hidden contract`)
    const t = aiCodeTicket(v, seed)
    assert.ok(t.suggestions.every((s) => s.visible.passed === s.visible.total), 'both suggestions honestly report all visible tests passing')
    const fix = t.suggestions.find((s) => s.slot !== trapSlot(seed))!
    assert.ok(runSuite(fix.code, testCases(v, seed)).every((r) => r.pass), 'the other suggestion is genuinely correct')
    const exposing = SCENARIOS.filter((s) => exposes(trapCode(v), s, seed))
    assert.ok(exposing.length >= 1 && exposing.length < SCENARIOS.length, `${v}: some reviewer tests catch the trap and some do not`)
    assert.ok(t.suggestions.every((s) => s.diff.some((d) => d.op !== ' ')), 'suggestions show a real diff')
  }
})

test('AI Pair code: passing needs the right brief, the right patch and a test that actually exposes the trap', () => {
  const v: VariantId = 'refund', seed = 42
  const good = SCENARIOS.find((s) => exposes(trapCode(v), s, seed))!
  const bad = SCENARIOS.find((s) => !exposes(trapCode(v), s, seed))!
  const ship = trapSlot(seed) === 'A' ? 'B' : 'A'
  const answer = { context: needs(CODE_CONTEXT), ship, expose: good } as const
  assert.equal(gradeAiCode(v, seed, answer).passed, true)
  assert.equal(gradeAiCode(v, seed, { ...answer, context: [...answer.context, 'env'] }).passed, false, 'pasting the production secret fails')
  assert.equal(gradeAiCode(v, seed, { ...answer, context: answer.context.slice(1) }).passed, false, 'a brief without evidence fails')
  assert.equal(gradeAiCode(v, seed, { ...answer, context: [...answer.context, 'deploy'] }).passed, true, 'noise is reported, not failed')
  assert.equal(gradeAiCode(v, seed, { ...answer, ship: trapSlot(seed) }).passed, false, 'shipping the confident trap fails')
  assert.equal(gradeAiCode(v, seed, { ...answer, expose: bad }).passed, false, 'a test that cannot tell the patches apart fails')
  assert.equal(validAiCodeAnswer({ ...answer, expose: 'rm -rf' }), false)
  assert.equal(validAiCodeAnswer({ ...answer, context: ['ticket', '__proto__'] }), false)
})

test('AI Pair trades: the assistant is wrong about half the time, readings come from the circuit, and the plan hides one unsafe step', () => {
  let wrong = 0
  for (let seed = 1; seed <= 400; seed++) {
    const t = aiTradeTicket(seed), fault = faultFor(seed)
    if (t.claim !== fault) wrong++
    assert.equal(t.readings[fault], null, 'the faulty part reads open')
    PARTS.filter((p) => p !== fault).forEach((p) => assert.notEqual(t.readings[p], null))
    assert.equal(t.plan.length, 4)
    assert.equal(t.plan[unsafeFor(seed).at]!.split(' ')[0], unsafeFor(seed).text.split(' ')[0])
    assert.equal(claimFor(seed), t.claim)
  }
  assert.ok(wrong > 150 && wrong < 250, `the assistant should be wrong about half the time, got ${wrong}/400`)
})

test('AI Pair trades: agreeing with a wrong AI, or skipping the meter, never passes', () => {
  const seed = [...Array(200).keys()].map((i) => i + 1).find((s) => claimFor(s) !== faultFor(s))!
  const fault = faultFor(seed), claim = claimFor(seed)
  const ok = { context: needs(TRADE_CONTEXT), unsafe: unsafeFor(seed).at, measured: [claim, fault], verdict: fault }
  assert.equal(gradeAiTrade(seed, ok).passed, true)
  assert.equal(gradeAiTrade(seed, { ...ok, verdict: claim }).passed, false, 'repeating the AI’s wrong call fails')
  assert.equal(gradeAiTrade(seed, { ...ok, measured: [fault] }).passed, false, 'not testing the AI’s claim fails')
  assert.equal(gradeAiTrade(seed, { ...ok, measured: [claim] }).passed, false, 'a verdict without a reading fails')
  assert.equal(gradeAiTrade(seed, { ...ok, unsafe: (ok.unsafe + 1) % 4 }).passed, false, 'missing the unsafe step fails')
  assert.equal(gradeAiTrade(seed, { ...ok, context: [...ok.context, 'aadhaar'] }).passed, false, 'sharing an ID document fails')
  assert.equal(validAiTradeAnswer({ ...ok, verdict: 'breaker' }), false)
})

test('AI Pair: the brief, the graph and the evidence agree; AI skills on hazardous work stay simulation-only', () => {
  assert.deepEqual(gradeBrief(CODE_CONTEXT, ['ticket', 'customers']).leaked, ['customers'])
  assert.equal(CAP['ai-fault-triage']!.hazardous, true)
  assert.equal(CAP['ai-fault-triage']!.proof.kind, 'arena')
  const ev = evidenceFrom(() => ({ state: 'not_started' }), [{ kind: 'aitrade', passed: true, at: 1 }, { kind: 'aicode', passed: true, at: 2 }])
  assert.equal(ev['ai-fault-triage']!.level, 'System-assessed · simulation only')
  assert.equal(ev['ai-assisted-debugging']!.state, 'evidenced')
  assert.equal(ev['ai-data-hygiene']!.state, 'evidenced')
  assert.deepEqual(lineDiff('a\nb\nc', 'a\nx\nc').map((l) => l.op).join(''), ' -+ ')
})
