// Opportunity-driven feed: pick a job, and the reel feed is rebuilt around the skills that job still needs.
// Pure and deterministic. Built on memory.ts (callbacks and due dates) and passport.ts (what is already proven).
// Order:
//  1. REMATCH    callback reels for concepts missed in an EARLIER session (the original one personalisation rule)
//  2. REPAIR     reels that fix a misconception named in your latest failed assessment
//  3. GAP        reels for each unproven competency, foundations first, intuition (motion) reels before drills,
//                each block followed by a PROOF slot that opens the unseen assessment
//  4. PREPARE    reels for in-person requirements (e.g. site safety): practice only, never evidence
//  5. KEEP       due recall for competencies already proven
// Nothing here awards anything.
import { battery, isDue, type Memory, type ReelRef } from './memory.ts'
import { openMisconceptions, statusOf, type EvidenceRecord } from './passport.ts'
import { byId, depth, type CompetencyId, type Job } from './skills.ts'

export interface GoalReel extends ReelRef { kind?: string; fixes?: string[] }
export type Tag = 'rematch' | 'repair' | 'gap' | 'proof' | 'prepare' | 'keep'
export type Slot<T> = { type: 'reel'; reel: T; why: string; tag: Tag; competency?: CompetencyId } | { type: 'proof'; competency: CompetencyId; why: string; tag: 'proof' }

export function rankForGoal<T extends GoalReel>(reels: T[], job: Pick<Job, 'title' | 'requires'>, records: EvidenceRecord[], m: Memory, sessionId: string, now: number): Slot<T>[] {
  const out: Slot<T>[] = []
  const used = new Set<string>()
  const add = (r: T, why: string, tag: Tag, competency?: CompetencyId) => { if (!used.has(r.id)) { used.add(r.id); out.push({ type: 'reel', reel: r, why, tag, competency }) } }
  const compOf = (concept: string) => job.requires.find((c) => byId(c).concepts.includes(concept))
  const inApp = job.requires.filter((c) => byId(c).assessment)
  const missing = inApp.filter((c) => statusOf(records, c).state !== 'evidenced').sort((a, b) => depth(a) - depth(b) || inApp.indexOf(a) - inApp.indexOf(b))
  const missingSet = new Set(missing)

  // 1. rematch: earlier-session misses only
  const open = new Set(m.misses.filter((x) => !x.resolvedAt && x.sessionId !== sessionId).map((x) => x.concept))
  for (const r of reels) if (r.callback && open.has(r.concept) && compOf(r.concept)) add(r, 'Rematch · you missed this last session', 'rematch', compOf(r.concept))

  // 2. repair: misconceptions from the latest failed attempt
  for (const mc of openMisconceptions(records, missing)) {
    for (const r of reels) if (!r.callback && r.fixes?.includes(mc.misconception)) add(r, `Fixes your mistake on ${mc.taskLabel}`, 'repair', mc.competency)
  }

  // 3. gaps, foundations first; intuition reels lead each block
  for (const c of missing) {
    const comp = byId(c)
    const dependent = missing.find((d) => d !== c && byId(d).prereqs.includes(c))
    const why = dependent ? `Foundation for ${byId(dependent).title}` : `Needed for ${job.title} · not proven yet`
    const block = reels.filter((r) => !r.callback && comp.concepts.includes(r.concept))
      .sort((a, b) => Number(b.kind === 'motion') - Number(a.kind === 'motion'))
    for (const r of block) add(r, why, 'gap', c)
    out.push({ type: 'proof', competency: c, why: `Ready? Prove ${comp.title} on an unseen task`, tag: 'proof' })
  }

  // 4. in-person requirements: practice that prepares, labelled as such
  for (const c of job.requires.filter((x) => !byId(x).assessment)) {
    for (const r of reels) if (!r.callback && byId(c).concepts.includes(r.concept)) add(r, 'Prepares you for the in-person practical', 'prepare', c)
  }

  // 5. keep: proven competencies that are due, weakest first
  const keep = reels.filter((r) => !r.callback && !used.has(r.id)) .filter((r) => { const c = compOf(r.concept); return c && !missingSet.has(c) && isDue(m.cards[r.concept], now) })
    .sort((a, b) => battery(m.cards[a.concept], now) - battery(m.cards[b.concept], now))
  for (const r of keep) add(r, 'Keep it · due for recall', 'keep', compOf(r.concept))
  return out
}
