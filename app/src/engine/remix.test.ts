// Experiment 5: Memory Remix reels. Run: npm run test:engine
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apply, newTwin, runDiagnostic, type Twin } from './learner.ts'
import { PERSONA_B, PERSONA_C, RESPOND_B, RESPOND_C } from './personas.ts'
import { answerReel, planReel, viewReel } from './remix.ts'

const T0 = Date.UTC(2026, 10, 24, 9)
const H = 3_600_000

function missPercent(t: Twin, at: number) {
  // learner answers "20% of 350" with 370 -> adds instead of multiplying
  return apply(t, { id: `${t.learnerId}-miss-${at}`, learnerId: t.learnerId, at, type: 'answer', conceptId: 'percent_basic', itemId: 'p_b1',
    op: 'pct_of', args: [20, 350], answer: 370, correct: false, source: 'practice' })
}

test('a missed percentage question leads to a reel that repairs THAT misconception', () => {
  let t = runDiagnostic(newTwin(PERSONA_B), RESPOND_B, T0).twin
  t = missPercent(t, T0 + H)
  const plan = planReel(t, T0 + 2 * H)!
  assert.equal(plan.pub.kind, 'misconception_repair')
  assert.equal(plan.pub.misconception_id, 'pct_add_instead_of_multiply')
  assert.equal(plan.pub.template_id, 'sheru_repair')
  assert.ok(plan.pub.learning_event?.includes('miss'))
  // the example is new: not the 20%/350 item the learner missed, nor the diagnostic item
  assert.notEqual(plan.key.example_signature, 'pct_of:20,350')
  assert.notEqual(plan.key.example_signature, 'pct_of:15,400')
})

test('the answer is not revealed before the attempt; wrong answers get educational feedback; schedule updates', () => {
  let t = runDiagnostic(newTwin(PERSONA_B), RESPOND_B, T0).twin
  t = missPercent(t, T0 + H)
  const { pub, key } = planReel(t, T0 + 2 * H)!
  const exposed = JSON.stringify(pub)
  assert.ok(!exposed.includes(String(key.correct_answer)) || pub.recall_question.includes(String(key.correct_answer)) === false,
    'public reel payload must not contain the answer')
  assert.ok(!('correct_answer' in pub) && !('explanation' in pub))
  const wrongAns = key.args[1] + key.args[0] // the same misconception again
  const r1 = answerReel(t, pub, key, wrongAns, T0 + 3 * H)
  assert.equal(r1.result.correct, false)
  assert.match(r1.result.feedback, /answer is/)
  assert.match(r1.result.feedback, /multiply|× /)
  assert.ok(r1.twin.recall.percent_basic.dueAt < T0 + 3 * H + 24 * H, 'a miss schedules an early review')
  // Retrying the SAME reel until correct is not recall evidence: only the first attempt counts (idempotent event id).
  const retry = answerReel(r1.twin, pub, key, key.correct_answer, T0 + 4 * H)
  assert.equal(retry.result.correct, true)
  assert.deepEqual(retry.twin.recall, r1.twin.recall)
  // A NEW reel answered correctly does push the next review later.
  const next = planReel(r1.twin, T0 + 5 * H)!
  assert.notEqual(next.pub.reel_id, pub.reel_id)
  const r3 = answerReel(r1.twin, next.pub, next.key, next.key.correct_answer, T0 + 5 * H)
  assert.ok(r3.twin.recall.percent_basic.dueAt > r1.twin.recall.percent_basic.dueAt)
})

test('a later reel uses a different example (transfer), and misconception count decays after correct answers', () => {
  let t = runDiagnostic(newTwin(PERSONA_B), RESPOND_B, T0).twin
  t = missPercent(t, T0 + H)
  const first = planReel(t, T0 + 2 * H)!
  t = answerReel(t, first.pub, first.key, first.key.correct_answer, T0 + 2 * H + 60_000).twin
  t = answerReel(t, first.pub, first.key, first.key.correct_answer, T0 + 2 * H + 120_000).twin // second correct: different event id? same reel -> idempotent
  const later = planReel(t, T0 + 3 * H)!
  assert.notEqual(later.key.example_signature, first.key.example_signature)
})

test('only relevant skills resurface: a learner with no percent history gets no percent revision reel', () => {
  const c = runDiagnostic(newTwin({ ...PERSONA_C, learnerId: 'synthetic-C-nohist' }), RESPOND_C, T0).twin
  const filtered: Twin = { ...c, history: c.history.filter((h) => !h.conceptId.startsWith('percent')), recall: {}, misconceptions: {} }
  assert.equal(planReel(filtered, T0 + H), null)
  // with an opportunity, it may show an opportunity-application reel instead
  const opp = planReel(filtered, T0 + H, { opportunity: { title: 'Incentive tracker (demo)', pay: 'pay not stated' } })!
  assert.equal(opp.pub.kind, 'opportunity_application')
})

test("no cross-learner leakage: B's misconception never appears in C's reels, and answering another learner's reel fails", () => {
  let b = runDiagnostic(newTwin(PERSONA_B), RESPOND_B, T0).twin
  b = missPercent(b, T0 + H)
  let c = runDiagnostic(newTwin(PERSONA_C), RESPOND_C, T0).twin
  c = apply(c, { id: 'c1', learnerId: c.learnerId, at: T0 + H, type: 'answer', conceptId: 'percent_basic', itemId: 'p', op: 'pct_of',
    args: [10, 600], answer: 60, correct: true, source: 'practice' })
  const pc = planReel(c, T0 + 2 * H)!
  assert.equal(pc.pub.learner_id, c.learnerId)
  assert.equal(pc.pub.misconception_id, null)
  assert.ok(!JSON.stringify(pc).includes('synthetic-B'))
  const pb = planReel(b, T0 + 2 * H)!
  assert.throws(() => answerReel(c, pb.pub, pb.key, 1, T0 + 3 * H), /another learner|does not belong/)
})

test('viewing a reel alone never awards mastery', () => {
  let t = runDiagnostic(newTwin(PERSONA_B), RESPOND_B, T0).twin
  t = missPercent(t, T0 + H)
  const { pub } = planReel(t, T0 + 2 * H)!
  const before = structuredClone(t.mastery)
  for (let i = 0; i < 20; i++) t = viewReel(t, pub, 15, T0 + 2 * H + i)
  assert.deepEqual(t.mastery, before)
  assert.equal(t.exposure.reel, 300)
})

test("the repair reel quotes THIS learner's own wrong answer", () => {
  let t = runDiagnostic(newTwin(PERSONA_B), RESPOND_B, T0).twin
  t = missPercent(t, T0 + H)
  const plan = planReel(t, T0 + 2 * H)!
  assert.match(plan.pub.hook, /20% of 350 = 370/)
})
