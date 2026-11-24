// Regression tests for the EXISTING washer work-order + passport rules (src/domain.ts), previously verified only by hand.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { grade, hasReviewedSkill, matchListings, reviewStatus, simStatus, type Attempt, type Evidence, type ProofState, type Review } from '../domain.ts'

const att = (id: string, sku: string, checks: Attempt['checks']): Attempt => ({ id, at: 1, displayOrder: [], selectedSku: sku, checks, result: grade(sku, checks) })
const ev = (id: string, attemptId: string): Evidence => ({ id, attemptId, kind: 'fixture', at: 2 })
const rv = (attemptId: string, evidenceId: string, decision: Review['decision']): Review =>
  ({ id: `r-${evidenceId}`, attemptId, evidenceId, reviewer: 'demo', decision, checklist: { id: true, od: true, thickness: true, part: true }, at: 3, reason: decision === 'approved' ? undefined : 'x' })

test('deterministic grading of the washer work order', () => {
  assert.equal(grade('WS-1220-2', ['id', 'od', 'thickness']).passed, true)
  assert.equal(grade('WS-1220-3', ['id', 'od', 'thickness']).passed, false)
  assert.equal(grade('WS-1220-2', ['id', 'od', 'thickness', 'colour']).passed, false)
  assert.equal(grade('WS-1220-2', ['id', 'od']).passed, false)
})

test('simulation pass alone is not a credential and does not match the job', () => {
  const s: ProofState = { attempts: [att('a1', 'WS-1220-2', ['id', 'od', 'thickness'])], currentAttemptId: 'a1', evidence: [], reviews: [] }
  assert.equal(simStatus(s), 'passed')
  assert.equal(hasReviewedSkill(s), false)
  assert.equal(matchListings(s)[0].eligible, false)
})

test('approval is bound to attempt + evidence: replacement or new attempt drops it', () => {
  let s: ProofState = { attempts: [att('a1', 'WS-1220-2', ['id', 'od', 'thickness'])], currentAttemptId: 'a1', evidence: [ev('e1', 'a1')], currentEvidenceId: 'e1', reviews: [rv('a1', 'e1', 'approved')] }
  assert.equal(hasReviewedSkill(s), true)
  assert.equal(matchListings(s)[0].eligible, true)
  assert.equal(matchListings(s)[1].eligible, false)
  s = { ...s, evidence: [...s.evidence, ev('e2', 'a1')], currentEvidenceId: 'e2' }
  assert.equal(reviewStatus(s), 'awaiting_review')
  assert.equal(hasReviewedSkill(s), false)
  s = { ...s, attempts: [...s.attempts, att('a2', 'WS-1220-2', ['id', 'od', 'thickness'])], currentAttemptId: 'a2' }
  assert.equal(reviewStatus(s), 'no_evidence')
})

test('rejected evidence is ineligible', () => {
  const s: ProofState = { attempts: [att('a1', 'WS-1220-2', ['id', 'od', 'thickness'])], currentAttemptId: 'a1', evidence: [ev('e1', 'a1')], currentEvidenceId: 'e1', reviews: [rv('a1', 'e1', 'needs_another_attempt')] }
  assert.equal(hasReviewedSkill(s), false)
  assert.match(matchListings(s)[0].reason, /another attempt/)
})
