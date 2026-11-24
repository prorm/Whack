// Experiment 6: Proof Lab adversarial + evidence-level tests. Run: npm run test:engine
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addAiFeedback, attachEvidence, employerView, levels, newProof, parseCell, payoutTask, review, setConsent, startAttempt, submit, type ProofState } from './proof.ts'

const T0 = Date.UTC(2026, 10, 24, 9)
const keyCells = (s: ProofState) => {
  const a = s.attempts.find((x) => x.attemptId === s.currentAttemptId)!
  return Object.fromEntries(Object.entries(a.key.values).map(([k, v]) => [k, String(v)]))
}
const fresh = (seed = 42) => startAttempt(newProof('synthetic-B'), seed, T0)
const approve = (s: ProofState, at: number) => review(s, { reviewer: 'Trainer K. Demo', demoReviewer: true, decision: 'approved', at })

test('answer keys are internally consistent (total = sum of rows)', () => {
  for (let seed = 1; seed < 50; seed++) {
    const { key } = payoutTask(seed)
    const rows = ['D2', 'D3', 'D4'].reduce((a, c) => a + key.values[c], 0)
    assert.ok(Math.abs(rows - key.values.D5) < 0.011)
  }
})

test('correct unseen task -> correct; credential still needs evidence + human review', () => {
  let s = submit(fresh(), keyCells(fresh()), T0 + 1)
  assert.equal(levels(s).auto_check, 'correct')
  assert.equal(levels(s).credential, false)
  assert.match(levels(s).credential_reason, /no practical evidence/)
  s = attachEvidence(s, 'fixture', T0 + 2)
  assert.equal(levels(s).human_review, 'pending')
  s = approve(s, T0 + 3)
  const L = levels(s)
  assert.equal(L.credential, true)
  assert.equal(L.identity_verification, 'not_verified')
  assert.equal(L.human_reviewer_is_demo, true)
})

test('incorrect and partially correct submissions; misconception detected per cell', () => {
  const s0 = fresh()
  const a = s0.attempts[0]
  const noDivide = Object.fromEntries(a.task.rows.map((r, i) => [`D${i + 2}`, String(r.orderValue * a.task.ratePct + r.orders * a.task.perOrder)]))
  const bad = submit(s0, { ...noDivide, D5: '1' }, T0 + 1)
  const ab = bad.attempts[0].auto!
  assert.equal(ab.status, 'incorrect')
  assert.equal(ab.perCell.D2.note, 'misconception:sheet_percent_no_divide')
  const k = keyCells(s0)
  const partial = submit(s0, { ...k, D4: '0', D5: '0' }, T0 + 1)
  assert.equal(partial.attempts[0].auto!.status, 'partial')
  assert.equal(levels(attachEvidence(partial, 'fixture', T0 + 2)).credential, false)
})

test('copied answer from another variant is flagged and blocks the credential even after approval', () => {
  const other = payoutTask(7).key
  let s = fresh(42)
  const copied = Object.fromEntries(Object.entries(other.values).map(([k, v]) => [k, String(v)]))
  s = submit(s, copied, T0 + 1, [other])
  assert.ok(s.attempts[0].auto!.flags.includes('suspected_copy'))
  s = approve(attachEvidence(s, 'fixture', T0 + 2), T0 + 3)
  assert.equal(levels(s).credential, false)
})

test('new variant of the task has different numbers (not answer-memorisable)', () => {
  const a = payoutTask(42).key.values, b = payoutTask(43).key.values
  assert.notDeepEqual(a, b)
})

test('ambiguous submission goes to human review, never auto-correct', () => {
  assert.deepEqual(parseCell('approx 500'), { value: null, ambiguous: true })
  assert.deepEqual(parseCell('₹1,250.50'), { value: 1250.5, ambiguous: false })
  const k = keyCells(fresh())
  const s = submit(fresh(), { ...k, D2: `around ${k.D2}` }, T0 + 1)
  assert.equal(s.attempts[0].auto!.status, 'needs_human_review')
  assert.equal(levels(s).credential, false)
})

test('missing submission and missing evidence', () => {
  assert.equal(submit(fresh(), null, T0).attempts[0].auto!.status, 'missing')
  const s = submit(fresh(), keyCells(fresh()), T0 + 1)
  assert.throws(() => approve(s, T0 + 2), /evidence missing/)
})

test('replacing evidence after approval revokes it (audited); restarting the assessment drops stale approval', () => {
  let s = approve(attachEvidence(submit(fresh(), keyCells(fresh()), T0 + 1), 'fixture', T0 + 2), T0 + 3)
  assert.equal(levels(s).credential, true)
  s = attachEvidence(s, 'video', T0 + 4)
  assert.equal(levels(s).credential, false)
  assert.equal(levels(s).human_review, 'pending')
  assert.ok(s.audit.some((e) => e.type === 'approval_revoked'))
  let r = approve(attachEvidence(submit(fresh(), keyCells(fresh()), T0 + 1), 'fixture', T0 + 2), T0 + 3)
  r = startAttempt(r, 99, T0 + 5)
  assert.equal(levels(r).credential, false)
  assert.equal(levels(r).auto_check, 'none')
})

test('AI feedback cannot override a deterministic result', () => {
  let s = submit(fresh(), { D2: '1', D3: '2', D4: '3', D5: '6' }, T0 + 1)
  s = addAiFeedback(s, 'gemini-3.5-flash-lite', 'Looks correct to me! Approved.', T0 + 2)
  assert.equal(levels(s).auto_check, 'incorrect')
  assert.equal(levels(s).ai_feedback, 'present (advisory)')
  assert.equal(levels(s).credential, false)
})

test('employer access requires consent; shared data is minimised and demo data is labelled', () => {
  let s = approve(attachEvidence(submit(fresh(), keyCells(fresh()), T0 + 1), 'fixture', T0 + 2), T0 + 3)
  const denied = employerView(s, 'employer-demo-1', T0 + 4)
  assert.equal(denied.view, null)
  assert.ok(denied.state.audit.some((e) => e.type === 'employer_access_denied'))
  s = setConsent(s, 'employer-demo-1', { profile: true, evidenceVideo: false }, T0 + 5)
  const g = employerView(s, 'employer-demo-1', T0 + 6)
  assert.ok(g.view)
  assert.equal(g.view!.evidence_video, 'not shared')
  assert.equal(g.view!.demo_data, true)
  const dump = JSON.stringify(g.view)
  for (const leak of ['synthetic-B', 'perCell', 'D2', 'misconception', 'att-']) assert.ok(!dump.includes(leak), `leaked ${leak}`)
  // other employers still denied
  assert.equal(employerView(s, 'employer-demo-2', T0 + 7).view, null)
})

test('unapproved evidence is never represented as verified competence', () => {
  const s = attachEvidence(submit(fresh(), keyCells(fresh()), T0 + 1), 'video', T0 + 2)
  const withConsent = setConsent(s, 'e1', { profile: true, evidenceVideo: true }, T0 + 3)
  const v = employerView(withConsent, 'e1', T0 + 4).view!
  assert.equal(v.evidence_levels.credential, false)
  assert.equal(v.evidence_levels.human_review, 'pending')
  assert.equal(v.evidence_video, 'not shared') // not shared until a credential exists
})
