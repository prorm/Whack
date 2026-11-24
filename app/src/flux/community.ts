// Field Scars: real-world failures submitted by practitioners, reviewed 2-of-3 by masters, compiled into feed cards,
// and open to challenge forever after. Pure reducer: the UI and the tests share it.
import type { Check } from './sieve.ts'

export type Domain = 'trades' | 'tech'
export type Status = 'pending' | 'live' | 'rejected' | 'retired'
export interface Master { id: string; name: string; role: string; domain: Domain; passport: number; demo: true }
export interface Review { reviewer: string; verdict: 'approve' | 'reject'; note: string; at: number }
export interface Challenge { id: string; by: string; claim: string; evidence: string; at: number; state: 'open' | 'patched' | 'retired' | 'dismissed'; resolvedBy?: string }
export interface Submission {
  id: string; createdAt: number; domain: Domain; concept: string
  contributor: { name: string; role: string; city: string }
  photo: string; hash: string; hot: { x: number; y: number; r: number }
  question: string; rule: string; wrongBelief: string; why: string
  voiceNote?: string; checks: Check[]
  status: Status; reviews: Review[]; challenges: Challenge[]; changelog: { at: number; note: string }[]
}

/** Same-device DEMO reviewers. In production these are people with high Proof Passport scores in the domain. */
export const MASTERS: Master[] = [
  { id: 'm-lakshmi', name: 'Lakshmi R.', role: 'Master electrician · 16 yrs', domain: 'trades', passport: 94, demo: true },
  { id: 'm-imran', name: 'Imran S.', role: 'Solar EPC site lead · 11 yrs', domain: 'trades', passport: 91, demo: true },
  { id: 'm-gowda', name: 'Ramesh Gowda', role: 'ITI instructor · 22 yrs', domain: 'trades', passport: 97, demo: true },
  { id: 'm-ananya', name: 'Ananya K.', role: 'Payments SRE · 8 yrs', domain: 'tech', passport: 93, demo: true },
  { id: 'm-vikram', name: 'Vikram P.', role: 'Backend lead · 12 yrs', domain: 'tech', passport: 90, demo: true },
  { id: 'm-farah', name: 'Farah M.', role: 'Staff engineer · 15 yrs', domain: 'tech', passport: 96, demo: true },
]
export const mastersFor = (d: Domain) => MASTERS.filter((m) => m.domain === d)
export const NEEDED = 2

/** "Prove it to post it": a domain unlocks after beating its unseen work order, or a vouch from a master. */
export function canPost(proofs: Partial<Record<Domain, number>>, vouches: Partial<Record<Domain, string>>, d: Domain) {
  return !!proofs[d] || !!vouches[d]
}

export function review(s: Submission, reviewer: string, verdict: Review['verdict'], note: string, at: number): Submission {
  const m = MASTERS.find((x) => x.id === reviewer)
  if (!m || m.domain !== s.domain) throw new Error('Only a master in this domain can review')
  if (s.status !== 'pending') throw new Error(`Cannot review a ${s.status} card`)
  if (s.reviews.some((r) => r.reviewer === reviewer)) throw new Error('Each master reviews once')
  if (verdict === 'reject' && !note.trim()) throw new Error('A rejection needs a reason the contributor can act on')
  if (s.checks.some((c) => c.level === 'block') && verdict === 'approve') throw new Error('The sieve blocked this card; it cannot be approved')
  const reviews = [...s.reviews, { reviewer, verdict, note, at }]
  const yes = reviews.filter((r) => r.verdict === 'approve'), no = reviews.filter((r) => r.verdict === 'reject')
  let status: Status = s.status, changelog = s.changelog
  if (yes.length >= NEEDED) { status = 'live'; changelog = [...changelog, { at, note: `Verified by ${yes.map((r) => name(r.reviewer)).join(' + ')}` }] }
  else if (no.length >= NEEDED) { status = 'rejected'; changelog = [...changelog, { at, note: `Rejected: ${no.map((r) => r.note).join(' / ')}` }] }
  return { ...s, reviews, status, changelog }
}

export function challenge(s: Submission, by: string, claim: string, evidence: string, at: number): Submission {
  if (s.status !== 'live') throw new Error('Only live cards can be challenged')
  if (claim.trim().length < 15 || evidence.trim().length < 10) throw new Error('A challenge needs a specific claim and evidence (a standard, a measurement or a counter-example)')
  return { ...s, challenges: [...s.challenges, { id: `c${s.challenges.length + 1}`, by, claim, evidence, at, state: 'open' }] }
}

/** A master resolves a challenge: patch the rule (card stays live), retire the card, or dismiss the challenge. */
export function resolve(s: Submission, challengeId: string, master: string, outcome: 'patched' | 'retired' | 'dismissed', at: number, patch?: string): Submission {
  const m = MASTERS.find((x) => x.id === master)
  if (!m || m.domain !== s.domain) throw new Error('Only a master in this domain can resolve')
  const c = s.challenges.find((x) => x.id === challengeId)
  if (!c || c.state !== 'open') throw new Error('No open challenge with that id')
  if (outcome === 'patched' && !patch?.trim()) throw new Error('A patch needs the corrected rule')
  const challenges = s.challenges.map((x) => x.id === challengeId ? { ...x, state: outcome, resolvedBy: master } : x)
  const note = outcome === 'patched' ? `Patched after challenge by ${c.by}: “${patch}”` : outcome === 'retired' ? `Retired after challenge by ${c.by}: ${c.claim}` : `Challenge by ${c.by} dismissed by ${m.name}`
  return { ...s, challenges, why: outcome === 'patched' ? patch! : s.why, status: outcome === 'retired' ? 'retired' : s.status, changelog: [...s.changelog, { at, note }] }
}

export const openChallenges = (s: Submission) => s.challenges.filter((c) => c.state === 'open')
export const verifiers = (s: Submission) => s.reviews.filter((r) => r.verdict === 'approve').map((r) => name(r.reviewer))
function name(id: string) { return MASTERS.find((m) => m.id === id)?.name ?? id }
