// Experiment 6: Proof Lab. Deterministic grading of unseen spreadsheet tasks + strict evidence levels + audit log.
import { rng } from './graph.ts'

// ------------------------------------------------------------------ task variants (unseen: fresh numbers per attempt)
export interface PayoutRow { rider: string; orderValue: number; orders: number }
export interface PayoutTask { variantId: string; ratePct: number; perOrder: number; rows: PayoutRow[]; cells: string[] }
export interface AnswerKey { variantId: string; values: Record<string, number> }

export function payoutTask(seed: number): { task: PayoutTask; key: AnswerKey } {
  const r = rng(seed)
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)]
  const ratePct = pick([2, 3, 4, 5])
  const perOrder = pick([5, 8, 10, 12])
  const rows = ['R-101', 'R-102', 'R-103'].map((rider) => ({ rider, orderValue: pick([2400, 3150, 4800, 5200, 6750, 7300]), orders: pick([9, 12, 15, 18, 21]) }))
  const values: Record<string, number> = {}
  rows.forEach((row, i) => { values[`D${i + 2}`] = Math.round(((row.orderValue * ratePct) / 100 + row.orders * perOrder) * 100) / 100 })
  values.D5 = Math.round(Object.values(values).reduce((a, b) => a + b, 0) * 100) / 100
  return { task: { variantId: `pay-${seed}`, ratePct, perOrder, rows, cells: Object.keys(values) }, key: { variantId: `pay-${seed}`, values } }
}

// ------------------------------------------------------------------ deterministic grading
export type AutoStatus = 'correct' | 'partial' | 'incorrect' | 'needs_human_review' | 'missing'
export interface AutoCheck {
  checker: 'deterministic-v1'
  status: AutoStatus
  score: number // 0..1 share of cells correct
  perCell: Record<string, { submitted: string | null; parsed: number | null; expected: number; ok: boolean; note?: string }>
  flags: string[] // e.g. suspected_copy, ambiguous_input
}

const AMBIGUOUS = /(approx|around|about|~|roughly|-\s*\d|to\s+\d|\?)/i
export function parseCell(s: string | undefined | null): { value: number | null; ambiguous: boolean } {
  if (s == null || String(s).trim() === '') return { value: null, ambiguous: false }
  const raw = String(s).trim()
  if (AMBIGUOUS.test(raw.replace(/^-/, ''))) return { value: null, ambiguous: true }
  const cleaned = raw.replace(/[₹,\s]|rs\.?|inr/gi, '')
  return /^-?\d+(\.\d+)?$/.test(cleaned) ? { value: Number(cleaned), ambiguous: false } : { value: null, ambiguous: true }
}

export function grade(task: PayoutTask, key: AnswerKey, submission: Record<string, string> | null, otherKeys: AnswerKey[] = []): AutoCheck {
  if (!submission || Object.keys(submission).length === 0) return { checker: 'deterministic-v1', status: 'missing', score: 0, perCell: {}, flags: [] }
  const perCell: AutoCheck['perCell'] = {}
  const flags: string[] = []
  let ok = 0
  for (const cell of task.cells) {
    const { value, ambiguous } = parseCell(submission[cell])
    const expected = key.values[cell]
    const good = value !== null && Math.abs(value - expected) < 0.011
    let note: string | undefined
    if (ambiguous) { note = 'ambiguous'; if (!flags.includes('ambiguous_input')) flags.push('ambiguous_input') }
    else if (!good && value !== null && cell !== 'D5') {
      const row = task.rows[Number(cell.slice(1)) - 2]
      if (Math.abs(value - (row.orderValue * task.ratePct + row.orders * task.perOrder)) < 0.011) note = 'misconception:sheet_percent_no_divide'
      else if (Math.abs(value - (row.orderValue * task.ratePct) / 100) < 0.011) note = 'missed_per_order_bonus'
    }
    perCell[cell] = { submitted: submission[cell] ?? null, parsed: value, expected, ok: good, note }
    if (good) ok++
  }
  // copied answer: identical to another variant's key while wrong for this one
  for (const other of otherKeys) {
    if (other.variantId === key.variantId) continue
    const same = task.cells.filter((c) => other.values[c] !== undefined && perCell[c].parsed !== null && Math.abs((perCell[c].parsed ?? NaN) - other.values[c]) < 0.011).length
    if (same >= Math.min(3, task.cells.length) && ok < task.cells.length) { flags.push('suspected_copy'); break }
  }
  const score = ok / task.cells.length
  const status: AutoStatus = flags.includes('ambiguous_input') ? 'needs_human_review'
    : score === 1 ? 'correct' : score >= 0.5 ? 'partial' : 'incorrect'
  return { checker: 'deterministic-v1', status, score, perCell, flags }
}

// ------------------------------------------------------------------ evidence levels + audit
export interface AuditEvent { at: number; actor: string; type: string; detail: Record<string, unknown> }
export interface ProofAttempt { attemptId: string; learnerId: string; task: PayoutTask; key: AnswerKey; auto?: AutoCheck }
export interface EvidenceFile { evidenceId: string; attemptId: string; kind: 'video' | 'fixture'; demo: boolean }
export interface HumanReview { reviewer: string; demoReviewer: boolean; attemptId: string; evidenceId: string; decision: 'approved' | 'needs_another_attempt'; reason?: string; at: number }
export interface AiFeedback { model: string; text: string; at: number } // advisory text only, never a grade

export interface ProofState {
  learnerId: string
  attempts: ProofAttempt[]
  currentAttemptId?: string
  evidence: EvidenceFile[]
  currentEvidenceId?: string
  reviews: HumanReview[]
  aiFeedback: Record<string, AiFeedback> // attemptId -> advisory feedback
  consents: Record<string, { evidenceVideo: boolean; profile: boolean }> // employerId -> what the learner allowed
  audit: AuditEvent[]
}

export const newProof = (learnerId: string): ProofState => ({ learnerId, attempts: [], evidence: [], reviews: [], aiFeedback: {}, consents: {}, audit: [] })
const log = (s: ProofState, at: number, actor: string, type: string, detail: Record<string, unknown> = {}): ProofState =>
  ({ ...s, audit: [...s.audit, { at, actor, type, detail }] })

export function startAttempt(s: ProofState, seed: number, at: number): ProofState {
  const { task, key } = payoutTask(seed)
  const attemptId = `att-${s.learnerId}-${seed}-${at}`
  const prev = s.currentAttemptId
  let n: ProofState = { ...s, attempts: [...s.attempts, { attemptId, learnerId: s.learnerId, task, key }], currentAttemptId: attemptId, currentEvidenceId: undefined }
  n = log(n, at, s.learnerId, 'attempt_started', { attemptId, variantId: task.variantId, supersedes: prev ?? null })
  return n
}

export function submit(s: ProofState, submission: Record<string, string> | null, at: number, otherKeys: AnswerKey[] = []): ProofState {
  const a = s.attempts.find((x) => x.attemptId === s.currentAttemptId)
  if (!a) throw new Error('no current attempt')
  const auto = grade(a.task, a.key, submission, otherKeys)
  const n = { ...s, attempts: s.attempts.map((x) => (x.attemptId === a.attemptId ? { ...x, auto } : x)) }
  return log(n, at, 'deterministic-grader', 'auto_graded', { attemptId: a.attemptId, status: auto.status, score: auto.score, flags: auto.flags })
}

/** AI feedback is stored as advice. Any claimed verdict in it is ignored by design. */
export function addAiFeedback(s: ProofState, model: string, text: string, at: number): ProofState {
  if (!s.currentAttemptId) return s
  const n = { ...s, aiFeedback: { ...s.aiFeedback, [s.currentAttemptId]: { model, text, at } } }
  return log(n, at, model, 'ai_feedback_added', { attemptId: s.currentAttemptId, note: 'advisory only; cannot change auto-check or review' })
}

export function attachEvidence(s: ProofState, kind: 'video' | 'fixture', at: number): ProofState {
  if (!s.currentAttemptId) throw new Error('no current attempt')
  const evidenceId = `ev-${s.learnerId}-${at}`
  const replaced = s.currentEvidenceId
  const hadApproval = !!replaced && s.reviews.some((r) => r.evidenceId === replaced && r.decision === 'approved')
  let n: ProofState = { ...s, evidence: [...s.evidence, { evidenceId, attemptId: s.currentAttemptId, kind, demo: kind === 'fixture' }], currentEvidenceId: evidenceId }
  n = log(n, at, s.learnerId, replaced ? 'evidence_replaced' : 'evidence_attached', { evidenceId, replaced: replaced ?? null, demo: kind === 'fixture' })
  if (hadApproval) n = log(n, at, 'system', 'approval_revoked', { evidenceId: replaced, reason: 'evidence replaced' })
  return n
}

export function review(s: ProofState, r: Omit<HumanReview, 'attemptId' | 'evidenceId'>): ProofState {
  if (!s.currentAttemptId || !s.currentEvidenceId) throw new Error('nothing to review: evidence missing')
  if (r.decision === 'needs_another_attempt' && !r.reason) throw new Error('a reason is required')
  const rec: HumanReview = { ...r, attemptId: s.currentAttemptId, evidenceId: s.currentEvidenceId }
  return log({ ...s, reviews: [...s.reviews, rec] }, r.at, r.reviewer, 'human_review', { decision: r.decision, attemptId: rec.attemptId, evidenceId: rec.evidenceId, demo: r.demoReviewer })
}

/** Evidence levels are reported separately and never collapsed into one "verified" flag. */
export interface EvidenceLevels {
  auto_check: AutoStatus | 'none'
  auto_flags: string[]
  ai_feedback: 'present (advisory)' | 'none'
  human_review: 'approved' | 'needs_another_attempt' | 'pending' | 'none'
  human_reviewer_is_demo: boolean | null
  identity_verification: 'not_verified' // not implemented in this prototype
  credential: boolean
  credential_reason: string
}

export function levels(s: ProofState): EvidenceLevels {
  const a = s.attempts.find((x) => x.attemptId === s.currentAttemptId)
  const ev = s.evidence.find((e) => e.evidenceId === s.currentEvidenceId && e.attemptId === s.currentAttemptId)
  const rv = ev ? [...s.reviews].reverse().find((r) => r.attemptId === a?.attemptId && r.evidenceId === ev.evidenceId) : undefined
  const auto = a?.auto?.status ?? 'none'
  const flags = a?.auto?.flags ?? []
  let credential = false, why = ''
  if (!a) why = 'no attempt'
  else if (auto !== 'correct') why = `auto-check is ${auto}`
  else if (flags.includes('suspected_copy')) why = 'suspected copied answer'
  else if (!ev) why = 'no practical evidence attached'
  else if (!rv) why = 'evidence not human-reviewed yet'
  else if (rv.decision !== 'approved') why = 'trainer asked for another attempt'
  else { credential = true; why = 'auto-check correct + human approval bound to this attempt and evidence (identity NOT verified)' }
  return { auto_check: auto, auto_flags: flags, ai_feedback: a && s.aiFeedback[a.attemptId] ? 'present (advisory)' : 'none',
    human_review: rv ? rv.decision : ev ? 'pending' : 'none', human_reviewer_is_demo: rv ? rv.demoReviewer : null,
    identity_verification: 'not_verified', credential, credential_reason: why }
}

// ------------------------------------------------------------------ consent-gated, minimised employer view
export function setConsent(s: ProofState, employerId: string, c: { evidenceVideo: boolean; profile: boolean }, at: number): ProofState {
  return log({ ...s, consents: { ...s.consents, [employerId]: c } }, at, s.learnerId, 'consent_changed', { employerId, ...c })
}

export interface EmployerView { skill: string; evidence_levels: Omit<EvidenceLevels, 'auto_flags'>; evidence_video: 'shared' | 'not shared'; demo_data: boolean }
export function employerView(s: ProofState, employerId: string, at: number): { state: ProofState; view: EmployerView | null } {
  const c = s.consents[employerId]
  if (!c?.profile) return { state: log(s, at, employerId, 'employer_access_denied', { reason: 'no learner consent' }), view: null }
  const L = levels(s)
  const ev = s.evidence.find((e) => e.evidenceId === s.currentEvidenceId)
  // minimisation: no learner id, no answers, no misconceptions, no history, no other attempts
  const { auto_flags: _omit, ...rest } = L
  void _omit
  const view: EmployerView = { skill: 'Payout sheet: commission % + per-order bonus', evidence_levels: rest,
    evidence_video: c.evidenceVideo && L.credential ? 'shared' : 'not shared', demo_data: !!ev?.demo || !!L.human_reviewer_is_demo }
  return { state: log(s, at, employerId, 'employer_access_granted', { fields: Object.keys(view) }), view }
}
