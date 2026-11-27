// Demand and the Opportunity Exchange. Every organization, requirement and opportunity here is DEMO and
// fictional. An opportunity's requirements are compiled from its organization's own words, so when an
// organization changes what it needs, every opportunity and every learner path changes with it.
import { compileRequirement, fullText, type Requirement } from './compiler.ts'
import { stateOf, type EvidenceMap } from './evidence.ts'
import { CAP } from './taxonomy.ts'

export const CLUSTERS: { id: string; title: string; detail: string }[] = [
  { id: 'backend', title: 'Backend & payments engineering', detail: 'Three employers, one shared foundation, live in CodeLab' },
  { id: 'cloud', title: 'Cloud infrastructure support', detail: 'Three employers; InfraLab is planned, so proof is awaiting validation' },
  { id: 'energy', title: 'Solar & electrical trades', detail: 'The FLUX course, Solar Forge and the Practical Arena' },
  { id: 'ops', title: 'Operations & analytics', detail: 'Payout reconciliation and data cleaning in DataLab' },
]

const req = (id: string, orgId: string, org: string, role: string, cluster: string, text: string): Requirement =>
  ({ id, orgId, org: `${org} (DEMO)`, role, cluster, text, at: 0 })

export const SEED_REQUIREMENTS: Requirement[] = [
  req('r-paylane', 'paylane', 'Paylane Fintech', 'Junior Backend Engineer', 'backend',
    'Our junior backend developers should be capable of investigating failed payment transactions, identifying API errors, fixing bugs without introducing regressions and writing an incident report. We work in JavaScript with REST APIs and SQL.'),
  req('r-kirana', 'kiranacart', 'KiranaCart', 'Backend Developer Intern', 'backend',
    'Build and consume REST APIs in Node.js. Write unit tests that catch edge cases. Debug production issues from logs. Use Git and pull requests.'),
  req('r-metro', 'metroledger', 'Metro Ledger', 'Payments Support Engineer', 'backend',
    'Troubleshoot webhooks and duplicate charges, read logs, handle retries and timeouts, reconcile settlements in spreadsheets, and explain fixes to customers.'),
  req('r-northwind', 'northwind', 'Northwind Cloud', 'Cloud Support Engineer', 'cloud',
    'Linux administration, networking, cloud infrastructure, incident troubleshooting and technical documentation.'),
  req('r-helix', 'helix', 'Helix Systems', 'Infrastructure Support Engineer', 'cloud',
    'Linux, networking, virtualization and system monitoring.'),
  req('r-orbit', 'orbit', 'Orbit Compute', 'Junior Cloud Engineer', 'cloud',
    'Linux, networking, containers, scripting and cloud services.'),
  req('r-suryodaya', 'emp-suryodaya', 'Suryodaya Rooftop Solar', 'Solar installation apprentice', 'energy',
    'Size solar strings for cold mornings, check the inverter MPPT window, design a safe rooftop array and follow site safety.'),
  req('r-voltfix', 'voltfix', 'VoltFix Services', 'Electrical maintenance trainee', 'energy',
    'Diagnose wiring faults with a multimeter, isolate circuits safely before any repair, and follow site safety with PPE.'),
  req('r-dabba', 'dabbadrop', 'DabbaDrop Logistics', 'Operations analyst', 'ops',
    'Reconcile rider payout ledgers, clean messy data exports, calculate commissions and build a weekly KPI dashboard.'),
]

/** The live "the industry changes" moment for the demo. */
export const CHANGE_PRESET = { reqId: 'r-kirana', text: 'From next quarter interns also ship the service in Docker containers through a CI/CD pipeline.' }

export type Commitment = 'open-vacancy' | 'guaranteed-interview' | 'sponsored-cohort' | 'exploratory' | 'challenge' | 'paid-project'
export const COMMITMENT: Record<Commitment, { label: string; detail: string }> = {
  'open-vacancy': { label: 'Open vacancy', detail: 'The employer is hiring for this role now.' },
  'guaranteed-interview': { label: 'Interview if eligible', detail: 'Evidence for every listed requirement earns an interview. Not a job offer.' },
  'sponsored-cohort': { label: 'Sponsored cohort', detail: 'Employers fund learning places. Interviews follow; hiring is not promised.' },
  exploratory: { label: 'Exploratory requirement', detail: 'No vacancy yet. The employer is telling learners what it will need.' },
  challenge: { label: 'Challenge', detail: 'Submissions are reviewed by the organizer. Every entrant keeps their evidence.' },
  'paid-project': { label: 'Paid project', detail: 'A fixed-fee piece of work. Illustrative fee.' },
}

export interface Opportunity {
  id: string; reqId: string; org: string; title: string; kind: string; commitment: Commitment; pay: string; place: string
  requires: string[]; supervised: boolean
}

const OPP_META: Omit<Opportunity, 'requires' | 'supervised' | 'org'>[] = [
  { id: 'o-paylane', reqId: 'r-paylane', title: 'Junior Backend Engineer', kind: 'Job', commitment: 'open-vacancy', pay: '₹6–8 LPA (illustrative)', place: 'Bengaluru' },
  { id: 'o-kirana', reqId: 'r-kirana', title: 'Backend Developer Intern', kind: 'Internship', commitment: 'guaranteed-interview', pay: '₹25k/month (illustrative)', place: 'Remote' },
  { id: 'o-metro', reqId: 'r-metro', title: 'Payments Support Engineer', kind: 'Job', commitment: 'exploratory', pay: '₹4–6 LPA (illustrative)', place: 'Mysuru' },
  { id: 'o-cloud', reqId: 'r-northwind', title: 'Cloud support cohort · 30 funded places', kind: 'Sponsored cohort', commitment: 'sponsored-cohort', pay: 'Free for learners', place: 'Hybrid' },
  { id: 'o-suryodaya', reqId: 'r-suryodaya', title: 'Solar installation apprentice', kind: 'Apprenticeship', commitment: 'open-vacancy', pay: '₹14–18k/month stipend (illustrative)', place: 'Bengaluru' },
  { id: 'o-voltfix', reqId: 'r-voltfix', title: 'Electrical maintenance trainee', kind: 'Apprenticeship', commitment: 'guaranteed-interview', pay: '₹15k/month (illustrative)', place: 'Tumakuru' },
  { id: 'o-dabba', reqId: 'r-dabba', title: 'Automate weekly payout reconciliation', kind: 'Paid project', commitment: 'paid-project', pay: '₹8,000 fixed (illustrative)', place: 'Remote' },
]

/** An organizer's challenge: its requirements are its own rubric, not an employer's. */
export const CHALLENGE: Opportunity = {
  id: 'o-fixit', reqId: '', org: 'FixIt Hack 2026 (DEMO organizer)', title: 'Repair-a-broken-API challenge', kind: 'Hackathon', commitment: 'challenge',
  pay: 'Prizes + every entrant keeps their evidence', place: 'Online', requires: ['api-debugging', 'regression-testing', 'incident-report'], supervised: false,
}

export function opportunitiesFrom(reqs: Requirement[]): Opportunity[] {
  const byId = new Map(reqs.map((r) => [r.id, r]))
  const out: Opportunity[] = []
  for (const m of OPP_META) {
    const r = byId.get(m.reqId)
    if (!r) continue
    const sources = m.commitment === 'sponsored-cohort' ? reqs.filter((x) => x.cluster === r.cluster) : [r]
    const requires = [...new Set(sources.flatMap((x) => compileRequirement(fullText(x)).matched.map((c) => c.id)))]
    out.push({ ...m, org: m.commitment === 'sponsored-cohort' ? sources.map((x) => x.org.replace(' (DEMO)', '')).join(', ') + ' (DEMO)' : r.org, requires,
      supervised: requires.some((id) => CAP[id].hazardous) })
  }
  return [...out, CHALLENGE]
}

export type CoverState = 'evidenced' | 'review' | 'failed' | 'missing' | 'in_person' | 'pending'
export function coverage(o: Opportunity, ev: EvidenceMap) {
  const rows = o.requires.map((id) => {
    const s = stateOf(ev, id)
    const state: CoverState = s === 'evidenced' ? 'evidenced' : CAP[id].proof.kind === 'in_person' ? 'in_person' : s === 'review' ? 'review'
      : s === 'failed' ? 'failed' : CAP[id].proof.kind === 'pending' ? 'pending' : 'missing'
    return { id, state }
  })
  const assessable = rows.filter((r) => r.state !== 'in_person')
  return { rows, covered: rows.filter((r) => r.state === 'evidenced').length, total: assessable.length }
}
