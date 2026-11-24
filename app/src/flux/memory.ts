// FLUX memory: spaced recall on a fixed day-1/3/7/21 ladder, a visible "memory battery", and the one
// personalisation rule: a missed in-feed question moves that skill's callback reel to the top in a LATER session.
// Nothing here awards anything. It only decides what to show next.

export const DAY = 86_400_000
export const LADDER_DAYS = [1, 3, 7, 21, 60]
/** Retrievability falls to this value on the due date. */
export const DUE_AT = 0.7

export interface Card { reps: number; lapses: number; lastAt: number; dueAt: number; intervalDays: number }
export interface Miss { reelId: string; concept: string; sessionId: string; at: number; resolvedAt?: number }
export interface Memory { cards: Record<string, Card>; misses: Miss[] }

export const emptyMemory = (): Memory => ({ cards: {}, misses: [] })

/** One graded retrieval. `reelId` marks it as an in-feed question. */
export function review(m: Memory, concept: string, correct: boolean, now: number, sessionId: string, reelId?: string): Memory {
  const prev = m.cards[concept]
  const reps = correct ? Math.min((prev?.reps ?? 0) + 1, LADDER_DAYS.length) : 0
  const intervalDays = correct ? LADDER_DAYS[reps - 1] : LADDER_DAYS[0]
  const card: Card = { reps, lapses: (prev?.lapses ?? 0) + (correct ? 0 : 1), lastAt: now, dueAt: now + intervalDays * DAY, intervalDays }
  let misses = m.misses
  if (!correct && reelId) misses = [...misses, { reelId, concept, sessionId, at: now }]
  // A later-session correct answer on the same concept clears its earlier misses.
  if (correct) misses = misses.map((x) => x.concept === concept && !x.resolvedAt && x.sessionId !== sessionId ? { ...x, resolvedAt: now } : x)
  return { cards: { ...m.cards, [concept]: card }, misses }
}

/** 0..1. 1 right after a review, DUE_AT on the due date, decaying exponentially. Unseen concepts read 0. */
export function battery(c: Card | undefined, now: number) {
  if (!c) return 0
  const t = Math.max(0, now - c.lastAt) / (c.intervalDays * DAY)
  return Math.exp(Math.log(DUE_AT) * t)
}
export const isDue = (c: Card | undefined, now: number) => !!c && now >= c.dueAt

export interface ReelRef { id: string; concept: string; callback?: boolean }
/**
 * Feed order. 1) callback reels for concepts missed in an EARLIER session and not yet resolved,
 * 2) due concepts, weakest battery first, 3) everything else in authored order.
 * Misses from the current session never reorder the current feed.
 */
export function orderFeed<T extends ReelRef>(reels: T[], m: Memory, sessionId: string, now: number): { reel: T; why: string }[] {
  const open = m.misses.filter((x) => !x.resolvedAt && x.sessionId !== sessionId)
  const missed = new Set(open.map((x) => x.concept))
  const used = new Set<string>()
  const out: { reel: T; why: string }[] = []
  for (const r of reels) if (r.callback && missed.has(r.concept)) { out.push({ reel: r, why: 'Missed last session' }); used.add(r.id) }
  const due = reels.filter((r) => !used.has(r.id) && !r.callback && isDue(m.cards[r.concept], now))
    .sort((a, b) => battery(m.cards[a.concept], now) - battery(m.cards[b.concept], now))
  for (const r of due) { out.push({ reel: r, why: 'Due today' }); used.add(r.id) }
  for (const r of reels) if (!used.has(r.id) && !r.callback) out.push({ reel: r, why: '' })
  return out
}

/** Days until each concept is due; negative = overdue. */
export function schedule(m: Memory, now: number) {
  return Object.entries(m.cards).map(([concept, c]) => ({ concept, inDays: (c.dueAt - now) / DAY, battery: battery(c, now), reps: c.reps }))
}
