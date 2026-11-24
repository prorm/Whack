// Experiment 2 (Learning Twin) + Experiment 4 (adaptation policy). Run: npm run test:engine
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { closure, compute, detectMisconception, PERCENT } from './graph.ts'
import { apply, isMastered, learningPath, mergeLogs, newTwin, replay, runDiagnostic, type LearnerEvent, type Twin } from './learner.ts'
import { PERSONA_A, PERSONA_B, PERSONA_C, RESPOND_A, RESPOND_B, RESPOND_C } from './personas.ts'
import { Bandit, nextAction } from './policy.ts'

const T0 = Date.UTC(2026, 10, 24, 9)
const H = 3_600_000, DAY = 24 * H
let seq = 0
const ans = (t: Twin, conceptId: string, correct: boolean, extra: Partial<Extract<LearnerEvent, { type: 'answer' }>> = {}, at = T0 + ++seq * 1000) =>
  apply(t, { id: `${t.learnerId}-e${seq}`, learnerId: t.learnerId, at, type: 'answer', conceptId, itemId: 'x', answer: null,
    correct, source: 'practice', ...extra } as LearnerEvent)

const diag = (p: typeof PERSONA_A, r: typeof RESPOND_A) => runDiagnostic(newTwin(p), r, T0)

test('reference answers in the ConceptSpec match the deterministic calculator', () => {
  for (const st of Object.values(PERCENT.subtopics)) for (const p of st.practice) assert.equal(compute(p.op, p.args), p.answer, p.id)
})

test('misconception detector classifies the authored wrong answers', () => {
  assert.equal(detectMisconception('pct_of', [15, 400], 415), 'pct_add_instead_of_multiply')
  assert.equal(detectMisconception('pct_of', [15, 400], 26.67), 'pct_divide_by_percent')
  assert.equal(detectMisconception('pct_change', [250, 300], 16.67), 'pct_change_wrong_base')
  assert.equal(detectMisconception('pct_of', [5, 800], 4000), 'sheet_percent_no_divide')
  assert.equal(detectMisconception('pct_of', [15, 400], 61), undefined)
})

test('E2: three personas with the same concept family get materially different paths, for evidence-based reasons', () => {
  const A = diag(PERSONA_A, RESPOND_A), B = diag(PERSONA_B, RESPOND_B), C = diag(PERSONA_C, RESPOND_C)
  const pA = learningPath(A.twin), pB = learningPath(B.twin), pC = learningPath(C.twin)
  // A: novice -> fractions prerequisite before percentages
  assert.deepEqual(pA, ['fractions_decimals', 'percent_basic'])
  // B: knows fractions (diagnosed), so starts at percentages, then commission
  assert.deepEqual(pB, ['percent_basic', 'commission_calc'])
  // C: already understands percentages (diagnosed correct) -> skips them entirely, starts at spreadsheet formulas
  assert.deepEqual(pC, ['sheet_formulas_basic', 'sheet_percent_formula'])
  assert.ok(!pC.includes('percent_basic') && isMastered(C.twin.mastery.percent_basic))
  // diagnostics were adaptive (different items asked), not a fixed quiz
  assert.notDeepEqual(A.asked, C.asked)
  // B's wrong 415 was classified as a specific misconception
  assert.equal(B.twin.misconceptions.pct_add_instead_of_multiply?.count, 1)
  // First actions differ in type AND the reasons cite evidence
  const a = nextAction(A.twin, T0 + H), b = nextAction(B.twin, T0 + H), c = nextAction(C.twin, T0 + H)
  assert.equal(a.type, 'practice'); assert.equal(a.conceptId, 'fractions_decimals')
  assert.equal(b.conceptId, 'percent_basic')
  assert.equal(c.conceptId, 'sheet_formulas_basic')
  assert.equal(a.modality, 'text') // A's chosen preference, filtered by poor connectivity
  assert.equal(b.modality, 'audio') // B's chosen preference
  for (const x of [a, b, c]) assert.match(x.reason, /mastery|evidence|Prerequisite|due|error/)
})

test('novice with no evidence on a prerequisite receives prerequisite instruction', () => {
  const t = newTwin({ ...PERSONA_A, learnerId: 'synthetic-A2' })
  const act = nextAction(t, T0)
  assert.equal(act.type, 'prerequisite_instruction')
  assert.equal(act.conceptId, 'add_sub') // the first prerequisite in the curated graph
})

test('repeated misconception triggers targeted repair (not generic re-teaching)', () => {
  let t = diag(PERSONA_B, RESPOND_B).twin
  t = ans(t, 'percent_basic', false, { op: 'pct_of', args: [20, 350], answer: 370 })
  const act = nextAction(t, T0 + H)
  assert.equal(act.type, 'misconception_repair')
  assert.equal(act.misconceptionId, 'pct_add_instead_of_multiply')
  assert.equal(act.modality, 'worked_example')
})

test('correct but slow -> practice; strong -> harder item; mastered goal -> transfer task', () => {
  let t = diag(PERSONA_C, RESPOND_C).twin
  t = ans(t, 'sheet_formulas_basic', true, { latencyMs: 90_000 })
  assert.equal(nextAction(t, T0 + H).type, 'practice')
  assert.equal(nextAction(t, T0 + H).rule, 'R4')
  // After one wrong diagnostic (Beta(1,2)), mastery (mean >= 0.75) needs 5 correct answers in total: Beta(6,2) = 0.75.
  let correctSoFar = 1
  while (!isMastered(t.mastery.sheet_formulas_basic)) { t = ans(t, 'sheet_formulas_basic', true, { latencyMs: 10_000 }); correctSoFar++ }
  assert.equal(correctSoFar, 5)
  // Goal concept: answer correctly until the policy escalates difficulty, then until the goal is mastered.
  const seen: string[] = []
  for (let i = 0; i < 8 && !isMastered(t.mastery.sheet_percent_formula); i++) {
    t = ans(t, 'sheet_percent_formula', true, { latencyMs: 10_000 })
    seen.push(nextAction(t, T0 + H).type)
  }
  assert.ok(seen.includes('increase_difficulty'), `expected a harder item before mastery, saw ${seen}`)
  assert.equal(nextAction(t, T0 + H).type, 'transfer_task')
})

test('changing language mid-lesson keeps progress and mastery', () => {
  let t = diag(PERSONA_A, RESPOND_A).twin
  t = apply(t, { id: 'p1', learnerId: t.learnerId, at: T0 + 10, type: 'progress', conceptId: 'fractions_decimals', step: 3, modality: 'text' })
  const before = structuredClone(t.mastery)
  t = apply(t, { id: 'l1', learnerId: t.learnerId, at: T0 + 11, type: 'preference', language: 'en' })
  assert.equal(t.preferences.language, 'en')
  assert.deepEqual(t.mastery, before)
  assert.equal(t.progress.fractions_decimals.step, 3)
})

test('switching delivery format keeps the shared progress record', () => {
  let t = diag(PERSONA_B, RESPOND_B).twin
  t = apply(t, { id: 'p1', learnerId: t.learnerId, at: T0 + 10, type: 'progress', conceptId: 'percent_basic', step: 4, modality: 'audio' })
  t = apply(t, { id: 'p2', learnerId: t.learnerId, at: T0 + 11, type: 'progress', conceptId: 'percent_basic', step: 2, modality: 'interactive' })
  assert.equal(t.progress.percent_basic.step, 4) // never goes backwards
  assert.equal(t.progress.percent_basic.modality, 'interactive')
})

test('returning after a gap schedules retrieval of learned concepts', () => {
  let t = diag(PERSONA_C, RESPOND_C).twin
  for (let i = 0; i < 4; i++) t = ans(t, 'sheet_formulas_basic', true, { latencyMs: 10_000 })
  const now = T0 + 30 * DAY
  const a = nextAction(t, now)
  assert.equal(a.type, 'retrieval'); assert.equal(a.rule, 'R1')
})

test('poor connectivity: offline log merges with server log without loss or double counting', () => {
  const base = diag(PERSONA_A, RESPOND_A).twin
  const mk = (id: string, at: number, correct: boolean): LearnerEvent =>
    ({ id, learnerId: base.learnerId, at, type: 'answer', conceptId: 'fractions_decimals', itemId: 'p', answer: null, correct, source: 'practice' })
  const device = [mk('d1', T0 + 100, true), mk('d2', T0 + 200, true)]
  const server = [mk('d1', T0 + 100, true), mk('s1', T0 + 150, false)] // d1 already synced once
  const merged = mergeLogs(device, server)
  assert.equal(merged.length, 3)
  const t1 = replay(base, merged), t2 = replay(base, [...merged, ...merged]) // replaying twice is a no-op
  assert.deepEqual(t1.mastery, t2.mastery)
  assert.equal(t1.mastery.fractions_decimals.n, base.mastery.fractions_decimals.n + 3)
})

test('feed answers never move mastery; other learners events are rejected', () => {
  const t = diag(PERSONA_B, RESPOND_B).twin
  const after = ans(t, 'percent_basic', true, { source: 'feed' })
  assert.deepEqual(after.mastery, t.mastery)
  assert.throws(() => apply(t, { id: 'x', learnerId: 'synthetic-A', at: T0, type: 'answer', conceptId: 'percent_basic', itemId: 'x',
    answer: 60, correct: true, source: 'practice' }), /another learner/)
})

test('E4: bandit never overrides the safe default until it has enough logged outcomes', () => {
  const t = newTwin({ ...PERSONA_A, learnerId: 'synthetic-A3' })
  const bandit = new Bandit(30)
  const ctx = bandit.context(t, 'add_sub')
  for (let i = 0; i < 29; i++) for (const m of ['text', 'audio', 'interactive', 'worked_example'] as const) bandit.record(ctx, m, i % 2 ? 1 : 0, 'synthetic', T0)
  assert.equal(nextAction(t, T0, bandit).modalitySource, 'preference_default')
  for (const m of ['text', 'audio', 'interactive', 'worked_example'] as const) bandit.record(ctx, m, 1, 'synthetic', T0)
  assert.equal(nextAction(t, T0, bandit).modalitySource, 'bandit')
})

test('graph closure is acyclic and ordered (prerequisites before dependents)', () => {
  const c = closure('inventory_reconciliation')
  assert.ok(c.indexOf('add_sub') < c.indexOf('percent_change'))
  assert.ok(c.indexOf('fractions_decimals') < c.indexOf('percent_basic'))
})
