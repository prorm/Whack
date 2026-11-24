// Pure domain logic: no React, no storage. Everything here is deterministic.

export type Lang = 'en' | 'kn'
export type CheckId = 'id' | 'od' | 'thickness' | 'colour' | 'brand' | 'weight'

export const SKILL_ID = 'washer-match'

export interface Dims { id: number; od: number; t: number }
export interface StockItem { sku: string; dims: Dims }

/** The unseen work order. Different numbers from every feed example (15/24/3, 19/27/2). */
export const WORK_ORDER = {
  code: 'WO-DEMO-0417',
  target: { id: 12, od: 20, t: 2 } as Dims,
}

export const STOCK: StockItem[] = [
  { sku: 'WS-1220-2', dims: { id: 12, od: 20, t: 2 } },
  { sku: 'WS-1020-2', dims: { id: 10, od: 20, t: 2 } },
  { sku: 'WS-1220-3', dims: { id: 12, od: 20, t: 3 } },
]

export const CHECK_OPTIONS: CheckId[] = ['id', 'colour', 'od', 'brand', 'thickness', 'weight']
export const REQUIRED_CHECKS: CheckId[] = ['id', 'od', 'thickness']

export function sameDims(a: Dims, b: Dims) {
  return a.id === b.id && a.od === b.od && a.t === b.t
}

/** Fisher-Yates with an injectable RNG so tests can be deterministic. */
export function shuffle<T>(xs: T[], rnd: () => number = Math.random): T[] {
  const a = xs.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface GradeResult {
  passed: boolean
  partCorrect: boolean
  checksCorrect: boolean
  missingChecks: CheckId[]
  extraChecks: CheckId[]
  mismatched: ('id' | 'od' | 't')[]
}

/** Explicit, deterministic grading: the right part AND exactly the three dimension checks. */
export function grade(selectedSku: string | null, checks: CheckId[]): GradeResult {
  const item = STOCK.find((s) => s.sku === selectedSku)
  const mismatched: ('id' | 'od' | 't')[] = []
  if (item) {
    if (item.dims.id !== WORK_ORDER.target.id) mismatched.push('id')
    if (item.dims.od !== WORK_ORDER.target.od) mismatched.push('od')
    if (item.dims.t !== WORK_ORDER.target.t) mismatched.push('t')
  }
  const partCorrect = !!item && mismatched.length === 0
  const missingChecks = REQUIRED_CHECKS.filter((c) => !checks.includes(c))
  const extraChecks = checks.filter((c) => !REQUIRED_CHECKS.includes(c))
  const checksCorrect = missingChecks.length === 0 && extraChecks.length === 0
  return { passed: partCorrect && checksCorrect, partCorrect, checksCorrect, missingChecks, extraChecks, mismatched }
}

// ---------------------------------------------------------------- records
export interface Attempt {
  id: string
  at: number
  displayOrder: string[]
  selectedSku: string | null
  checks: CheckId[]
  result: GradeResult
}

export interface Evidence {
  id: string
  attemptId: string
  kind: 'video' | 'fixture'
  mediaKey?: string // IndexedDB key for learner video
  fileName?: string
  sizeBytes?: number
  at: number
}

export interface Checklist { id: boolean; od: boolean; thickness: boolean; part: boolean }

export interface Review {
  id: string
  attemptId: string
  evidenceId: string
  reviewer: string
  decision: 'approved' | 'needs_another_attempt'
  reason?: string
  checklist: Checklist
  at: number
}

export const DEMO_REVIEWER = 'Trainer K. Demo (fictional demo reviewer)'

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export type SimStatus = 'not_started' | 'failed' | 'passed'
export type ReviewStatus = 'no_evidence' | 'awaiting_review' | 'approved' | 'needs_another_attempt'

export interface ProofState {
  attempts: Attempt[]
  currentAttemptId?: string
  evidence: Evidence[]
  currentEvidenceId?: string
  reviews: Review[]
}

export function currentAttempt(s: ProofState) {
  return s.attempts.find((a) => a.id === s.currentAttemptId)
}

/** Evidence only counts if it is bound to the CURRENT attempt. */
export function currentEvidence(s: ProofState) {
  const a = currentAttempt(s)
  const e = s.evidence.find((x) => x.id === s.currentEvidenceId)
  return a && e && e.attemptId === a.id ? e : undefined
}

/** A review only counts if it names exactly the current attempt AND the current evidence. */
export function currentReview(s: ProofState) {
  const a = currentAttempt(s)
  const e = currentEvidence(s)
  if (!a || !e) return undefined
  const bound = s.reviews.filter((r) => r.attemptId === a.id && r.evidenceId === e.id)
  return bound.sort((x, y) => y.at - x.at)[0]
}

export function simStatus(s: ProofState): SimStatus {
  const a = currentAttempt(s)
  if (!a) return 'not_started'
  return a.result.passed ? 'passed' : 'failed'
}

export function reviewStatus(s: ProofState): ReviewStatus {
  if (!currentEvidence(s)) return 'no_evidence'
  const r = currentReview(s)
  if (!r) return 'awaiting_review'
  return r.decision
}

/** The only path to a credential: passed simulation + approved review bound to that attempt and evidence. */
export function hasReviewedSkill(s: ProofState) {
  const r = currentReview(s)
  return simStatus(s) === 'passed' && !!r && r.decision === 'approved' &&
    r.checklist.id && r.checklist.od && r.checklist.thickness && r.checklist.part
}

// ---------------------------------------------------------------- contractor listings (fictional)
export interface Listing {
  id: string
  contractor: string
  locality: string
  pay: string
  shift: string
  requiredSkillId: string
  requiredSkill: { en: string; kn: string }
}

export const LISTINGS: Listing[] = [
  {
    id: 'L-NALLI',
    contractor: 'Nalli Fix Contractors (DEMO, fictional)',
    locality: 'Rajajinagar, Bengaluru (~2 km)',
    pay: '₹700 / day (sample)',
    shift: 'Morning, 8:00–14:00',
    requiredSkillId: SKILL_ID,
    requiredSkill: { en: 'Washer matching: ID, OD and thickness (trainer-reviewed)', kn: 'ವಾಷರ್ ಹೊಂದಿಸುವಿಕೆ: ID, OD ಮತ್ತು ದಪ್ಪ (ತರಬೇತುದಾರರಿಂದ ಪರಿಶೀಲಿತ)' },
  },
  {
    id: 'L-PIPELINE',
    contractor: 'Kaveri Pipeline Works (DEMO, fictional)',
    locality: 'Malleshwaram, Bengaluru (~4 km)',
    pay: '₹850 / day (sample)',
    shift: 'Day, 9:00–17:00',
    requiredSkillId: 'ppr-heat-fusion',
    requiredSkill: { en: 'PPR pipe heat-fusion jointing (trainer-reviewed)', kn: 'PPR ಪೈಪ್ ಹೀಟ್-ಫ್ಯೂಷನ್ ಜೋಡಣೆ (ತರಬೇತುದಾರರಿಂದ ಪರಿಶೀಲಿತ)' },
  },
]

export interface MatchResult { listing: Listing; eligible: boolean; reason: string }

export function matchListings(s: ProofState): MatchResult[] {
  const reviewed = hasReviewedSkill(s)
  const rs = reviewStatus(s)
  const sim = simStatus(s)
  return LISTINGS.map((l) => {
    if (l.requiredSkillId !== SKILL_ID) {
      return { listing: l, eligible: false, reason: `Not a match: this job needs "${l.requiredSkill.en}". The learner has no reviewed evidence for that skill.` }
    }
    if (reviewed) {
      return { listing: l, eligible: true, reason: 'Match: the required skill is trainer-approved, bound to the passed work-order attempt and its evidence.' }
    }
    const why =
      sim !== 'passed' ? 'the work-order simulation has not been passed'
      : rs === 'no_evidence' ? 'no practical evidence is attached to the passed attempt'
      : rs === 'awaiting_review' ? 'the evidence is not reviewed yet'
      : rs === 'needs_another_attempt' ? 'the trainer asked for another attempt'
      : 'the review is incomplete'
    return { listing: l, eligible: false, reason: `Not eligible yet: ${why}. A simulation pass alone never counts.` }
  })
}
