// Career GPS: the shortest credible path from what a learner has demonstrated to what a role requires.
// Evidence skips a step. A learner who says they already know something skips the lesson and goes
// straight to the unseen assessment; saying so never counts as evidence.
import { CAP, closure } from './taxonomy.ts'
import { stateOf, type EvidenceMap } from './evidence.ts'
import type { Opportunity } from './market.ts'

export type StepState = 'proven' | 'prove' | 'learn' | 'review' | 'in_person' | 'pending'
export interface Step { id: string; state: StepState; hours: number; required: boolean }
export interface Plan { steps: Step[]; remainingHours: number; proven: number; total: number }

export function planPath(targets: string[], ev: EvidenceMap, declared: ReadonlySet<string> = new Set()): Plan {
  const steps = closure(targets).map((id): Step => {
    const c = CAP[id]
    const s = stateOf(ev, id)
    const state: StepState = s === 'evidenced' ? 'proven' : s === 'review' ? 'review' : c.proof.kind === 'in_person' ? 'in_person'
      : c.proof.kind === 'pending' ? 'pending' : declared.has(id) ? 'prove' : 'learn'
    const hours = state === 'learn' ? c.hours : state === 'prove' ? 0.5 : 0
    return { id, state, hours, required: targets.includes(id) }
  })
  return { steps, remainingHours: steps.reduce((n, s) => n + s.hours, 0), proven: steps.filter((s) => s.state === 'proven').length, total: steps.length }
}

/** Which missing capabilities would open the most opportunities, and which single step would complete one. */
export function unlocks(opps: Opportunity[], ev: EvidenceMap) {
  const score = new Map<string, { opens: number; completes: string[] }>()
  for (const o of opps) {
    const missing = o.requires.filter((id) => stateOf(ev, id) !== 'evidenced' && CAP[id].proof.kind !== 'in_person')
    for (const id of missing) {
      const s = score.get(id) ?? { opens: 0, completes: [] }
      s.opens += 1
      if (missing.length === 1) s.completes.push(o.title)
      score.set(id, s)
    }
  }
  return [...score.entries()].map(([id, s]) => ({ id, ...s })).sort((a, b) => b.completes.length - a.completes.length || b.opens - a.opens)
}

export type Intent = 'start' | 'role' | 'skills' | 'switch' | 'earn'
export const INTENTS: { id: Intent; title: string; detail: string }[] = [
  { id: 'start', title: 'I don’t know where to start', detail: 'See which capabilities employers ask for most, and begin with a foundation.' },
  { id: 'role', title: 'I want a specific job', detail: 'Reverse-engineer a path from a role’s real requirements.' },
  { id: 'skills', title: 'I already have skills', detail: 'Skip the lessons and prove it on an unseen task.' },
  { id: 'switch', title: 'I want to switch careers', detail: 'Keep the evidence you have; learn only what the new role adds.' },
  { id: 'earn', title: 'I want to start earning', detail: 'Paid projects and roles you are closest to qualifying for.' },
]
