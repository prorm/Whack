// Proof Passport: inspectable evidence records, evidence levels, trainer review binding and consent-scoped sharing.
// Pure. The rules:
//  - A competency is evidenced only by the LATEST graded attempt that covers it, and only if that attempt passed it.
//  - A new attempt replaces the current one; any review stays bound to the old attempt and stops counting.
//  - Trainer-reviewed needs an approved review bound to this attempt id AND this fingerprint, all checklist items ticked.
//  - identity_verified is never set in this prototype.
//  - An employer sees only records the learner shared with that employer and has not revoked.
import { grade, outcomes, type Task } from './assess.ts'
import { COMPETENCIES, byId, type CompetencyId } from './skills.ts'

export type Level = 'practice' | 'system_assessed' | 'trainer_reviewed' | 'identity_verified'
export const LEVELS: { id: Level; label: string; meaning: string }[] = [
  { id: 'practice', label: 'Practice', meaning: 'Reels, episodes and memory meters. Never shown as a skill.' },
  { id: 'system_assessed', label: 'System-assessed', meaning: 'An unseen task graded by deterministic code.' },
  { id: 'trainer_reviewed', label: 'Trainer-reviewed', meaning: 'A trainer checked this exact attempt against the rubric.' },
  { id: 'identity_verified', label: 'Identity-verified', meaning: 'Not available in this prototype. Nothing here proves who took the task.' },
]

export const CHECKLIST = [
  { id: 'version', label: 'Task and rubric version match the record' },
  { id: 'response', label: 'Submitted answers match the graded result' },
  { id: 'working', label: 'Learner explained the method in their own words' },
  { id: 'conditions', label: 'Attempt conditions acceptable (no outside help observed)' },
] as const
export type CheckId = (typeof CHECKLIST)[number]['id']

export interface Review {
  attemptId: string
  fingerprint: string
  reviewer: string
  demo: boolean
  checklist: Record<CheckId, boolean>
  decision: 'approved' | 'needs_another_attempt'
  reason?: string
  at: number
}

export interface EvidenceRecord {
  id: string
  assessmentId: string
  version: number
  seed: number
  taskLabel: string
  story: string
  givens: { label: string; value: string }[]
  rubric: string[]
  asks: { id: string; label: string; unit: string }[]
  response: Record<string, string>
  key: Record<string, number>
  perAsk: Record<string, boolean>
  outcomes: Partial<Record<CompetencyId, { pass: boolean; misconceptions: string[] }>>
  working: string[]
  at: number
  /** 'demo_seed' records were produced by the real grader from scripted answers by the demo seed. */
  source: 'live' | 'demo_seed'
  fingerprint: string
  review?: Review
}

// ---------------------------------------------------------------- fingerprint
/** Canonical JSON: sorted keys, so the same record always hashes the same. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`
  return JSON.stringify(v)
}
/** Two FNV-1a passes → 64-bit hex. Detects edits to a record. It does not prove identity or stop cheating. */
export function fingerprintOf(r: Omit<EvidenceRecord, 'fingerprint' | 'review'>): string {
  const s = canonical({ ...r, fingerprint: undefined, review: undefined })
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    a = Math.imul(a ^ c, 0x01000193) >>> 0
    b = Math.imul(b ^ c, 0x5bd1e995) >>> 0
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0')
}
export function seal(r: Omit<EvidenceRecord, 'fingerprint' | 'review'>): EvidenceRecord {
  return { ...r, fingerprint: fingerprintOf(r) }
}
export const intact = (r: EvidenceRecord) => r.fingerprint === fingerprintOf(r)

/** Grade a raw response with the deterministic grader and seal it as an evidence record. */
export function makeRecord(task: Task, response: Record<string, string>, at: number, id: string, source: EvidenceRecord['source'] = 'live'): EvidenceRecord {
  const g = grade(task, response)
  const rubric = COMPETENCIES.find((c) => c.assessment?.id === task.assessmentId)?.assessment?.rubric ?? []
  return seal({
    id, assessmentId: task.assessmentId, version: task.version, seed: task.seed, taskLabel: task.label, story: task.story,
    givens: task.givens, rubric, asks: task.asks, response: Object.fromEntries(task.asks.map((a) => [a.id, String(response[a.id] ?? '')])),
    key: Object.fromEntries(task.asks.map((a) => [a.id, task.key[a.id]])), perAsk: g.perAsk,
    outcomes: outcomes(task, g) as EvidenceRecord['outcomes'], working: task.working, at, source,
  })
}

// ---------------------------------------------------------------- review
export function reviewIsValid(r: EvidenceRecord) {
  const v = r.review
  return !!v && v.decision === 'approved' && v.attemptId === r.id && v.fingerprint === r.fingerprint && intact(r)
    && CHECKLIST.every((c) => v.checklist[c.id] === true)
}
/** Attach a trainer review. Approval requires every outcome passed and every checklist item ticked. */
export function attachReview(r: EvidenceRecord, v: Omit<Review, 'attemptId' | 'fingerprint'>): EvidenceRecord {
  if (v.decision === 'approved') {
    if (!Object.values(r.outcomes).every((o) => o?.pass)) throw new Error('Only a passed attempt can be approved.')
    if (!CHECKLIST.every((c) => v.checklist[c.id])) throw new Error('Approval needs all four checklist items.')
  } else if (!v.reason?.trim()) throw new Error('Say what the learner should redo.')
  return { ...r, review: { ...v, attemptId: r.id, fingerprint: r.fingerprint } }
}

// ---------------------------------------------------------------- status
export const latestFor = (records: EvidenceRecord[], c: CompetencyId) =>
  records.filter((r) => r.outcomes[c]).sort((a, b) => b.at - a.at)[0]

export function levelOf(r: EvidenceRecord, c: CompetencyId): Level {
  if (!r.outcomes[c]?.pass) return 'practice'
  return reviewIsValid(r) ? 'trainer_reviewed' : 'system_assessed'
}

/** True when the record was graded against an older task/rubric version than the one live now. */
export const stale = (r: EvidenceRecord, c: CompetencyId) => { const a = byId(c).assessment; return !a || a.id !== r.assessmentId || a.version !== r.version }

export function statusOf(records: EvidenceRecord[], c: CompetencyId): { state: 'evidenced' | 'failed' | 'not_started'; level?: Level; recordId?: string; note?: string } {
  const r = latestFor(records, c)
  if (!r) return { state: 'not_started' }
  if (!intact(r)) return { state: 'failed', recordId: r.id, note: 'Record was edited after grading' }
  if (stale(r, c)) return { state: 'failed', recordId: r.id, note: 'Task version changed: retake the current version' }
  return r.outcomes[c]!.pass ? { state: 'evidenced', level: levelOf(r, c), recordId: r.id } : { state: 'failed', recordId: r.id }
}

/** Misconceptions from the latest failed attempt on each competency: what the feed should repair. */
export function openMisconceptions(records: EvidenceRecord[], comps: CompetencyId[]) {
  const out: { competency: CompetencyId; misconception: string; taskLabel: string }[] = []
  for (const c of comps) {
    const r = latestFor(records, c)
    if (r && !r.outcomes[c]!.pass) for (const m of r.outcomes[c]!.misconceptions) out.push({ competency: c, misconception: m, taskLabel: r.taskLabel })
  }
  return out
}

// ---------------------------------------------------------------- consent
export interface Share { id: string; employerId: string; recordIds: string[]; at: number; revokedAt?: number; token?: string }

export function grant(shares: Share[], s: Omit<Share, 'revokedAt'>): Share[] {
  if (!s.recordIds.length) throw new Error('Pick at least one record to share.')
  return [...shares, s]
}
export const revoke = (shares: Share[], id: string, now: number) => shares.map((s) => s.id === id && !s.revokedAt ? { ...s, revokedAt: now } : s)
export const activeShares = (shares: Share[], employerId: string) => shares.filter((s) => s.employerId === employerId && !s.revokedAt)

/** The ONLY way an employer view gets records: shared with that employer and not revoked. */
export function visibleTo(employerId: string, records: EvidenceRecord[], shares: Share[]): EvidenceRecord[] {
  const ids = new Set(activeShares(shares, employerId).flatMap((s) => s.recordIds))
  return records.filter((r) => ids.has(r.id))
}
