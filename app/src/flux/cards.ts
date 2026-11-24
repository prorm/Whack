// Card provenance and the "No Passive Scroll" law. Pure: shared by the feed, the studio and the review queue.

export type Origin = 'flux_original' | 'community_verified' | 'company_bounty'
export type MediaSource = 'ai_generated' | 'real_capture' | 'code_rendered' | 'motion_ai_plate' | 'none'
export type TruthGate = 'tested_code' | 'team_authored' | 'master_review'
export interface Contributor { name: string; role: string; city: string; verifiedCount: number; demo: boolean }
export interface Provenance {
  origin: Origin
  mediaSource: MediaSource
  truth: TruthGate
  isDemo: boolean
  contributor?: Contributor
  verifiedBy?: string[]
  changelog?: { at: number; note: string }[]
  challenged?: boolean
}

export const ACTIVE_KINDS = ['freeze', 'split', 'spot', 'choice', 'bubbles', 'motion'] as const
export type CardKind = (typeof ACTIVE_KINDS)[number]
type Opt = { t: string; ok?: boolean }
export interface CardShape {
  id: string; concept: string; kind: string; explain: string
  options?: Opt[]; hot?: { x: number; y: number; r: number }; answer?: string
  prov?: Provenance
}

/** The badge a card wears in the feed. Never hides that a photo is AI-made or that a person is DEMO. */
export function badges(p: Provenance): { label: string; tone: 'lab' | 'field' | 'bounty' | 'warn' }[] {
  const out: { label: string; tone: 'lab' | 'field' | 'bounty' | 'warn' }[] = []
  if (p.origin === 'flux_original') out.push({ label: p.truth === 'tested_code' ? 'FLUX LAB • TESTED PHYSICS / CODE' : 'FLUX LAB • TEAM-AUTHORED', tone: 'lab' })
  if (p.origin === 'community_verified') out.push({ label: `REAL SITE CAPTURE • VERIFIED BY ${p.verifiedBy?.length ?? 0} MASTERS`, tone: 'field' })
  if (p.origin === 'company_bounty') out.push({ label: 'LIVE INDUSTRY PROBLEM • HIRING', tone: 'bounty' })
  if (p.mediaSource === 'ai_generated') out.push({ label: 'AI-GENERATED DEMO PHOTO', tone: 'warn' })
  if (p.mediaSource === 'motion_ai_plate') out.push({ label: 'AI VIDEO BACKDROP (VEO) • NUMBERS DRAWN BY CODE', tone: 'warn' })
  if (p.isDemo) out.push({ label: p.origin === 'community_verified' ? 'DEMO REVIEWERS' : 'DEMO', tone: 'warn' })
  if (p.challenged) out.push({ label: 'UNDER CHALLENGE', tone: 'warn' })
  return out
}

/**
 * The feed only accepts cards that force a decision. Returns the reasons a card is refused (empty = accepted).
 * Community cards additionally need a contributor, real capture media and two distinct verifiers.
 */
export function validateCard(c: CardShape): string[] {
  const e: string[] = []
  if (!(ACTIVE_KINDS as readonly string[]).includes(c.kind)) e.push(`"${c.kind}" is not an interactive card type. Passive clips are not allowed.`)
  if (!c.explain?.trim()) e.push('Every card needs an explanation shown after the decision.')
  if (c.explain && c.explain.length > 420) e.push('Explanation is longer than 420 characters. Keep one idea per card.')
  if (c.kind === 'choice' || c.kind === 'bubbles' || c.kind === 'freeze' || c.kind === 'motion') {
    const o = c.options ?? []
    if (o.length < 2) e.push('A decision needs at least two options.')
    if (o.filter((x) => x.ok).length !== 1) e.push('Exactly one option must be correct.')
    if (new Set(o.map((x) => x.t.trim().toLowerCase())).size !== o.length) e.push('Options must be different.')
  }
  if (c.kind === 'spot') {
    const h = c.hot
    if (!h) e.push('Spot-the-fault needs a marked hotspot.')
    else if (h.x < 0 || h.x > 100 || h.y < 0 || h.y > 100 || h.r < 4 || h.r > 35) e.push('Hotspot must sit on the photo and cover 4–35% of its width.')
  }
  if (c.prov?.origin === 'community_verified') {
    if (!c.prov.contributor) e.push('Community cards carry their contributor.')
    if (c.prov.mediaSource !== 'real_capture') e.push('Community cards must use a real capture, not generated media.')
    if (new Set(c.prov.verifiedBy ?? []).size < 2) e.push('Community cards go live only after two different masters verify them.')
  }
  return e
}
