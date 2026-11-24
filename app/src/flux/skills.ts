// The unified competency graph: one typed map from FLUX concepts (reels, episodes) to assessments and job requirements.
// Pure and deterministic. A competency is only ever "evidenced" by an assessment record (passport.ts), never by
// reel answers, watch time or memory meters.

export type CompetencyId = 'solar.series' | 'solar.cold-max' | 'solar.mppt-min' | 'solar.design' | 'ev.load' | 'pay.idempotency' | 'pay.backoff' | 'site.safety'
export type Domain = 'solar' | 'ev' | 'payments' | 'site'
export type ReviewNeed = 'system' | 'trainer_recommended' | 'in_person_only'

export interface Assessment {
  id: string
  version: number
  label: string
  /** Shown on the passport: exactly what was checked. */
  rubric: string[]
  minutes: number
  /** Unseen: every attempt is generated from a new seed. */
  unseen: boolean
}

export interface Competency {
  id: CompetencyId
  domain: Domain
  title: string
  /** "I can …" statement an employer reads. */
  can: string
  prereqs: CompetencyId[]
  /** memory.ts concepts trained by reels and episodes. */
  concepts: string[]
  lessons: { label: string; route: string }[]
  /** null = cannot be proven in an app (checked in person). */
  assessment: Assessment | null
  review: ReviewNeed
  hazardous: boolean
  inPerson?: string
}

export const ASSESSMENTS = {
  series: { id: 'quick.series', version: 1, label: 'Series & parallel check', minutes: 2, unseen: true,
    rubric: ['String voltage in series within ±0.05 V', 'Bank current in parallel within ±0.05 A', 'Both parts correct to pass'] },
  solarWo: { id: 'wo.solar-string', version: 1, label: 'Unseen solar string work order', minutes: 4, unseen: true,
    rubric: ['Max panels: coldest-dawn Voc, rounded down', 'Min panels: hottest-cell Vmp vs MPPT minimum, rounded up', 'Each part graded separately; known wrong methods are named'] },
  ev: { id: 'wo.ev-load', version: 1, label: 'Unseen EV charger load work order', minutes: 4, unseen: true,
    rubric: ['Highest fixed charger current that never trips the main breaker', 'Current the car gets at dinner with load balancing (2 A margin)', 'Both parts within ±0.01 A to pass'] },
  rooftop: { id: 'proj.rooftop', version: 1, label: 'Project: design a 14-panel rooftop', minutes: 8, unseen: false,
    rubric: ['Uses every panel the customer wants', 'Each string survives the coldest dawn and stays awake on the hottest afternoon', 'Fits the inverter inputs, MPPT window and the DEMO 1.3 DC/AC limit', 'Written explanation for the customer is kept for trainer review'] },
  idem: { id: 'quick.idempotency', version: 1, label: 'Duplicate webhook ledger check', minutes: 2, unseen: true,
    rubric: ['Credits applied = unique event IDs', 'Total credited counts each event once', 'Both parts correct to pass'] },
  backoff: { id: 'quick.backoff', version: 1, label: 'Retry backoff schedule check', minutes: 2, unseen: true,
    rubric: ['Exponential delay before an early retry', 'Delay respects the cap on a late retry', 'Both parts correct to pass'] },
} satisfies Record<string, Assessment>

export const COMPETENCIES: Competency[] = [
  { id: 'solar.series', domain: 'solar', title: 'Series & parallel wiring', can: 'I can predict string voltage and current for series and parallel panels.',
    prereqs: [], concepts: ['series'], lessons: [{ label: 'FLUX Learn: lesson 2', route: 'home' }],
    assessment: ASSESSMENTS.series, review: 'system', hazardous: false },
  { id: 'solar.cold-max', domain: 'solar', title: 'Cold-morning string sizing', can: 'I can size the longest safe string from the coldest-dawn voltage.',
    prereqs: ['solar.series'], concepts: ['cold', 'maxstring'], lessons: [{ label: 'FLUX Learn: lessons 3–5', route: 'home' }],
    assessment: ASSESSMENTS.solarWo, review: 'trainer_recommended', hazardous: true },
  { id: 'solar.mppt-min', domain: 'solar', title: 'MPPT window (minimum string)', can: 'I can find the fewest panels that keep the inverter awake on the hottest afternoon.',
    prereqs: ['solar.series'], concepts: ['minstring'], lessons: [{ label: 'Episode: The Cold Morning Killer', route: 'flux-solar' }],
    assessment: ASSESSMENTS.solarWo, review: 'trainer_recommended', hazardous: true },
  { id: 'solar.design', domain: 'solar', title: 'Rooftop string design (project)', can: 'I can choose an inverter and lay out strings that pass every voltage and sizing check.',
    prereqs: ['solar.cold-max', 'solar.mppt-min'], concepts: ['explain'], lessons: [{ label: 'FLUX Learn: project', route: 'fl-project' }],
    assessment: ASSESSMENTS.rooftop, review: 'trainer_recommended', hazardous: true },
  { id: 'ev.load', domain: 'ev', title: 'EV charger load & breaker headroom', can: 'I can set a charger current that never trips the main breaker at dinner time.',
    prereqs: [], concepts: ['evload'], lessons: [{ label: 'Episode: The 9 PM Blackout', route: 'flux-ev' }],
    assessment: ASSESSMENTS.ev, review: 'trainer_recommended', hazardous: true },
  { id: 'pay.idempotency', domain: 'payments', title: 'Idempotent payments', can: 'I can stop retries and duplicate webhooks from charging twice.',
    prereqs: [], concepts: ['ambiguous', 'idem'], lessons: [{ label: 'Episode: Charged Twice', route: 'flux-pay' }],
    assessment: ASSESSMENTS.idem, review: 'system', hazardous: false },
  { id: 'pay.backoff', domain: 'payments', title: 'Retries with backoff & jitter', can: 'I can design a retry schedule that does not cause a retry storm.',
    prereqs: ['pay.idempotency'], concepts: ['retry'], lessons: [{ label: 'Reels: the thundering herd', route: 'flux-reels' }],
    assessment: ASSESSMENTS.backoff, review: 'system', hazardous: false },
  { id: 'site.safety', domain: 'site', title: 'Site electrical safety (practical)', can: 'I work safely on a live site: isolation, PPE, earthing, connectors.',
    prereqs: [], concepts: ['safety'], lessons: [{ label: 'Reels: spot the fault', route: 'flux-reels' }],
    assessment: null, review: 'in_person_only', hazardous: true,
    inPerson: 'Checked in person by the employer’s supervisor. An app cannot prove safe hands, so ScrollProof never marks this as evidenced.' },
]

export const byId = (id: CompetencyId) => COMPETENCIES.find((c) => c.id === id)!
export const competencyOfConcept = (concept: string) => COMPETENCIES.find((c) => c.concepts.includes(concept))?.id
export const assessmentCovers = (assessmentId: string) => COMPETENCIES.filter((c) => c.assessment?.id === assessmentId).map((c) => c.id)

/** Depth in the prerequisite graph: foundations first. Throws on a cycle so a bad edit fails the tests. */
export function depth(id: CompetencyId, seen: CompetencyId[] = []): number {
  if (seen.includes(id)) throw new Error(`Prerequisite cycle through ${id}`)
  const c = byId(id)
  return c.prereqs.length ? 1 + Math.max(...c.prereqs.map((p) => depth(p, [...seen, id]))) : 0
}

// ---------------------------------------------------------------- jobs (all DEMO)
export interface Job {
  id: string
  title: string
  employer: string
  employerId: string
  city: string
  /** Illustrative only, never a real offer. */
  pay: string
  requires: CompetencyId[]
  /** Hazardous trades: a simulation can only earn a supervised next step. */
  supervised: boolean
  summary: string
  demo: true
  createdBy: 'seed' | 'employer'
}

export const SEED_JOBS: Job[] = [
  { id: 'job-solar-apprentice', title: 'Solar installation apprentice', employer: 'Suryodaya Rooftop Solar (DEMO)', employerId: 'emp-suryodaya', city: 'Bengaluru',
    pay: '₹14,000–18,000 / month stipend (illustrative)', requires: ['solar.series', 'solar.cold-max', 'solar.mppt-min', 'solar.design', 'site.safety'],
    supervised: true, summary: 'Size strings on residential rooftops under a senior technician. Supervised from day one.', demo: true, createdBy: 'seed' },
  { id: 'job-ev-helper', title: 'EV charger installation helper', employer: 'ChargeGrid Services (DEMO)', employerId: 'emp-chargegrid', city: 'Mysuru',
    pay: '₹15,000–19,000 / month (illustrative)', requires: ['ev.load', 'site.safety'],
    supervised: true, summary: 'Survey flats for home chargers and set safe charger currents with a licensed electrician.', demo: true, createdBy: 'seed' },
  { id: 'job-payments-support', title: 'Junior payments support engineer', employer: 'Paylane Fintech (DEMO)', employerId: 'emp-paylane', city: 'Bengaluru',
    pay: '₹28,000–35,000 / month (illustrative)', requires: ['pay.idempotency', 'pay.backoff'],
    supervised: false, summary: 'Investigate double charges and retry storms, and patch webhook consumers.', demo: true, createdBy: 'seed' },
]

/** Anything hazardous in the requirement list forces a supervised outcome, whatever the employer ticked. */
export const needsSupervision = (j: Pick<Job, 'requires' | 'supervised'>) => j.supervised || j.requires.some((c) => byId(c).hazardous)

export type ReqState = 'evidenced' | 'failed' | 'not_started' | 'in_person'
export interface MatchRow { id: CompetencyId; state: ReqState; level?: string; recordId?: string }
export interface Match { rows: MatchRow[]; have: number; need: number; eligible: boolean; outcome: string; next?: CompetencyId }

/**
 * Explainable match: one row per requirement, no hidden score. `statusOf` comes from passport.ts so this file stays free
 * of record logic. In-person requirements never count as evidenced; they become the supervised next step.
 */
export function matchJob(job: Pick<Job, 'requires' | 'supervised'>, statusOf: (c: CompetencyId) => { state: 'evidenced' | 'failed' | 'not_started'; level?: string; recordId?: string }): Match {
  const rows: MatchRow[] = job.requires.map((id) => byId(id).assessment ? { id, ...statusOf(id) } : { id, state: 'in_person' })
  const inApp = rows.filter((r) => r.state !== 'in_person')
  const have = inApp.filter((r) => r.state === 'evidenced').length
  const eligible = inApp.length > 0 && have === inApp.length
  const supervised = needsSupervision(job)
  const outcome = !eligible
    ? `${inApp.length - have} skill${inApp.length - have === 1 ? '' : 's'} left to prove`
    : supervised
      ? 'Eligible for a supervised practical assessment. Not a licence to work unsupervised.'
      : 'Eligible for the interview shortlist.'
  const missing = inApp.filter((r) => r.state !== 'evidenced').map((r) => r.id).sort((a, b) => depth(a) - depth(b))
  return { rows, have, need: inApp.length, eligible, outcome, next: missing[0] }
}
