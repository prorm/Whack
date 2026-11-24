// Scroll Fuel: the toll on a doomscroll is one FLUX recall card. Pure rules, shared by the gate page,
// the browser extension and the tests. Nothing here awards a credential: fuel is minutes, not proof.

export const MIN = 60_000
export const RULES = {
  firstTry: 10, // minutes for a first-try correct card
  followUp: 5, // minutes for a correct follow-up after a miss
  bounty: 15, // sponsored live problem, first try
  tankMax: 30, // you cannot bank hours
  explainMs: 5_000, // a miss shows its explanation for at least this long
  lookMs: 1_200, // options unlock after this, so blind mashing is impossible
  escapeMin: 2, // "checking a DM"
  escapeEveryMs: 60 * MIN,
  maxCardsPerToll: 3, // after this many cards in one toll, mercy fuel ends the toll (never trap anyone)
  mercy: 3,
}

export interface Fuel { tankMs: number; lastDrainAt: number; escapes: number[]; log: TollEntry[] }
export interface TollEntry { at: number; app: string; reelId: string; concept: string; correct: boolean; attempt: number; minutes: number; bounty?: boolean }
export const emptyFuel = (now = 0): Fuel => ({ tankMs: RULES.firstTry * MIN, lastDrainAt: now, escapes: [], log: [] })

/** Drain while a gated app is in front. Gaps over `maxGapMs` (tab hidden, device asleep) never drain. */
export function drain(f: Fuel, now: number, active: boolean, maxGapMs = 1_500): Fuel {
  const gap = now - f.lastDrainAt
  const used = active && gap > 0 && gap <= maxGapMs ? gap : 0
  return { ...f, tankMs: Math.max(0, f.tankMs - used), lastDrainAt: now }
}
export const empty = (f: Fuel) => f.tankMs <= 0

/** Minutes a card earns. attempt 1 = first card of this toll; 2+ = follow-ups after a miss. */
export function earn(correct: boolean, attempt: number, bounty = false) {
  if (!correct) return 0
  if (attempt === 1) return bounty ? RULES.bounty : RULES.firstTry
  return RULES.followUp
}

/** What happens after an answer inside one toll. */
export type Next = { kind: 'unlock'; minutes: number } | { kind: 'explain-then-followup'; waitMs: number } | { kind: 'mercy'; minutes: number }
export function afterAnswer(correct: boolean, attempt: number, bounty = false): Next {
  if (correct) return { kind: 'unlock', minutes: earn(true, attempt, bounty) }
  if (attempt >= RULES.maxCardsPerToll) return { kind: 'mercy', minutes: RULES.mercy }
  return { kind: 'explain-then-followup', waitMs: RULES.explainMs }
}

export function refuel(f: Fuel, minutes: number, now: number): Fuel {
  return { ...f, tankMs: Math.min(RULES.tankMax * MIN, f.tankMs + minutes * MIN), lastDrainAt: now }
}
export function record(f: Fuel, e: TollEntry): Fuel { return { ...f, log: [...f.log, e].slice(-2000) } }

export function canEscape(f: Fuel, now: number) { return !f.escapes.some((t) => now - t < RULES.escapeEveryMs) }
export function escape(f: Fuel, now: number): Fuel {
  if (!canEscape(f, now)) throw new Error('The free DM break is used. It comes back within the hour.')
  return { ...refuel(f, RULES.escapeMin, now), escapes: [...f.escapes, now].slice(-24) }
}
export function nextEscapeIn(f: Fuel, now: number) {
  const last = Math.max(0, ...f.escapes)
  return Math.max(0, last + RULES.escapeEveryMs - now)
}

/** Doomscroll-to-proof mirror for one period: breaks (tolls), recalls (cards), first-try rate. Practice only. */
export function stats(f: Fuel, from: number, to: number) {
  const l = f.log.filter((e) => e.at >= from && e.at < to)
  const tolls = l.filter((e) => e.attempt === 1)
  const firstTry = tolls.filter((e) => e.correct).length
  const concepts = new Map<string, { n: number; ok: number }>()
  for (const e of l) { const c = concepts.get(e.concept) ?? { n: 0, ok: 0 }; c.n++; if (e.correct) c.ok++; concepts.set(e.concept, c) }
  return {
    breaks: tolls.length, recalls: l.length, correct: l.filter((e) => e.correct).length,
    firstTryRate: tolls.length ? firstTry / tolls.length : 0,
    minutesEarned: l.reduce((a, e) => a + e.minutes, 0),
    byApp: Object.fromEntries([...new Set(l.map((e) => e.app))].map((a) => [a, l.filter((e) => e.app === a && e.attempt === 1).length])),
    concepts: [...concepts].map(([concept, c]) => ({ concept, ...c })).sort((a, b) => b.n - a.n),
  }
}

/** Cards that work with one thumb in a few seconds: no typing, no long video. */
export const THUMB_KINDS = new Set(['spot', 'split', 'choice', 'bubbles', 'freeze'])
export function thumbNative(r: { kind: string; options?: unknown[] }) {
  return THUMB_KINDS.has(r.kind) && (!r.options || r.options.length <= 3)
}

/** Sites the browser extension can gate. Instagram is whole-site; YouTube only on Shorts. */
export const GATED_SITES = [
  { id: 'instagram', label: 'Instagram', match: (u: URL) => /(^|\.)instagram\.com$/.test(u.hostname) },
  { id: 'youtube-shorts', label: 'YouTube Shorts', match: (u: URL) => /(^|\.)youtube\.com$/.test(u.hostname) && u.pathname.startsWith('/shorts') },
  { id: 'reddit', label: 'Reddit', match: (u: URL) => /(^|\.)reddit\.com$/.test(u.hostname) },
  { id: 'x', label: 'X', match: (u: URL) => /(^|\.)(x|twitter)\.com$/.test(u.hostname) },
]
export function gatedSite(url: string, enabled: string[]) {
  try { const u = new URL(url); return GATED_SITES.find((s) => enabled.includes(s.id) && s.match(u))?.id ?? null } catch { return null }
}
