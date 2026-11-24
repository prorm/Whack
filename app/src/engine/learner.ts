// Personal Learning Twin: event-sourced learner model (works offline; merges by event id).
import { GRAPH, closure, detectMisconception, type Op } from './graph.ts'

export type Modality = 'text' | 'audio' | 'interactive' | 'worked_example' | 'reel'
export type Lang = 'en' | 'kn' | 'kn-en'
export type Source = 'diagnostic' | 'practice' | 'recall' | 'transfer' | 'feed'

export interface LearnerEventBase { id: string; learnerId: string; at: number }
export type LearnerEvent =
  | (LearnerEventBase & { type: 'answer'; conceptId: string; itemId: string; op?: Op; args?: number[]; answer: number | null;
      correct: boolean; latencyMs?: number; source: Source; modality?: Modality })
  | (LearnerEventBase & { type: 'preference'; language?: Lang; modalities?: Modality[] })
  | (LearnerEventBase & { type: 'progress'; conceptId: string; step: number; modality: Modality })
  | (LearnerEventBase & { type: 'exposure'; conceptId: string; modality: Modality; seconds: number })

export interface TwinProfile {
  learnerId: string
  synthetic: boolean // fictional test persona?
  label: string
  goal: { conceptId: string; why: string }
  constraints: { minutesPerSession: number; connectivity: 'good' | 'poor' }
  preferences: { language: Lang; modalities: Modality[] } // configurable, never a fixed "learning style"
}

export interface Mastery { a: number; b: number; n: number; lastAt?: number; lastCorrect?: boolean; lastLatencyMs?: number; inferred?: boolean; provisional?: boolean }
export interface Recall { dueAt: number; intervalDays: number; ease: number; reps: number }

export interface Twin extends TwinProfile {
  mastery: Record<string, Mastery>
  misconceptions: Record<string, { count: number; lastAt: number; conceptId: string }>
  history: Extract<LearnerEvent, { type: 'answer' }>[]
  recall: Record<string, Recall>
  exposure: Record<string, number> // modality -> seconds (exposure is NOT evidence of learning)
  progress: Record<string, { step: number; modality: Modality }> // shared across all modes
  appliedEventIds: string[]
}

const DAY = 86_400_000
export const SLOW_MS = 45_000

export function newTwin(p: TwinProfile): Twin {
  return { ...p, mastery: {}, misconceptions: {}, history: [], recall: {}, exposure: {}, progress: {}, appliedEventIds: [] }
}

export function masteryMean(m?: Mastery) { return m ? m.a / (m.a + m.b) : 0.5 }
export function masterySd(m?: Mastery) {
  if (!m) return 0.29
  const n = m.a + m.b
  return Math.sqrt((m.a * m.b) / (n * n * (n + 1)))
}
/**
 * Mastered = high mean AND (>= 2 direct observations, OR a correct diagnostic (provisional), OR inferred from a
 * correctly answered dependent concept). Provisional / inferred mastery allows skipping but is re-checked by retrieval.
 */
export function isMastered(m?: Mastery) { return !!m && masteryMean(m) >= 0.75 && (m.n >= 2 || !!m.inferred || !!m.provisional) }

/** Apply one event. Idempotent: replaying the same event id is a no-op (safe offline sync). */
export function apply(t: Twin, e: LearnerEvent): Twin {
  if (e.learnerId !== t.learnerId) throw new Error('event belongs to another learner')
  if (t.appliedEventIds.includes(e.id)) return t
  const n: Twin = structuredClone(t)
  n.appliedEventIds.push(e.id)
  if (e.type === 'preference') {
    if (e.language) n.preferences.language = e.language
    if (e.modalities) n.preferences.modalities = e.modalities
  } else if (e.type === 'progress') {
    n.progress[e.conceptId] = { step: Math.max(n.progress[e.conceptId]?.step ?? 0, e.step), modality: e.modality }
  } else if (e.type === 'exposure') {
    n.exposure[e.modality] = (n.exposure[e.modality] ?? 0) + e.seconds
  } else if (e.type === 'answer') {
    n.history.push(e)
    if (e.source === 'feed') return n // feed answers never move mastery or credentials
    const m = n.mastery[e.conceptId] ?? { a: 1, b: 1, n: 0 }
    // a correct diagnostic item is construct-level evidence (weight 2, provisional); transfer tasks weigh 1.5
    const w = e.source === 'transfer' ? 1.5 : e.source === 'diagnostic' && e.correct ? 2 : 1
    if (e.correct) m.a += w; else m.b += w
    m.n += 1; m.lastAt = e.at; m.lastCorrect = e.correct; m.lastLatencyMs = e.latencyMs; m.inferred = false
    m.provisional = e.source === 'diagnostic' ? e.correct : false
    n.mastery[e.conceptId] = m
    if (m.provisional) {
      for (const p of closure(e.conceptId)) {
        n.mastery[p] ??= { a: 3, b: 1, n: 0, inferred: true }
      }
    }
    if (!e.correct && e.op && e.args && e.answer != null) {
      const mis = detectMisconception(e.op, e.args, e.answer)
      if (mis) {
        const c = n.misconceptions[mis] ?? { count: 0, lastAt: 0, conceptId: e.conceptId }
        n.misconceptions[mis] = { ...c, count: c.count + 1, lastAt: e.at }
      }
    }
    if (e.correct && e.op && n.misconceptions) {
      // a correct answer on the same concept after repair decays the misconception
      for (const [k, v] of Object.entries(n.misconceptions)) if (v.conceptId === e.conceptId && v.count > 0) n.misconceptions[k] = { ...v, count: v.count - 1 }
    }
    // spaced recall schedule (SM-2 style) for practice / recall / transfer evidence
    const r = n.recall[e.conceptId] ?? { dueAt: e.at, intervalDays: 0, ease: 2.5, reps: 0 }
    if (e.correct) {
      r.reps += 1
      r.intervalDays = r.reps === 1 ? 1 : r.reps === 2 ? 3 : Math.round(r.intervalDays * r.ease)
      r.ease = Math.min(2.8, r.ease + 0.05)
    } else {
      r.reps = 0; r.intervalDays = 0.25; r.ease = Math.max(1.3, r.ease - 0.2)
    }
    r.dueAt = e.at + r.intervalDays * DAY
    n.recall[e.conceptId] = r
  }
  return n
}

export function replay(t: Twin, events: LearnerEvent[]): Twin {
  return [...events].sort((x, y) => x.at - y.at || x.id.localeCompare(y.id)).reduce(apply, t)
}

/** Merge an offline device log with a server log: union by event id, deterministic order. */
export function mergeLogs(a: LearnerEvent[], b: LearnerEvent[]): LearnerEvent[] {
  const byId = new Map<string, LearnerEvent>()
  for (const e of [...a, ...b]) if (!byId.has(e.id)) byId.set(e.id, e)
  return [...byId.values()].sort((x, y) => x.at - y.at || x.id.localeCompare(y.id))
}

// ------------------------------------------------------------------ diagnostic
export type Responder = (conceptId: string, item: { id: string; q: string; answer: number }) => { answer: number | null; latencyMs: number }

/**
 * Adaptive diagnostic: test the goal; on failure descend into prerequisites.
 * A correct answer marks the concept's prerequisites as inferred-mastered (not directly evidenced).
 */
export function runDiagnostic(t: Twin, respond: Responder, now: number, runId = 'diag'): { twin: Twin; asked: string[] } {
  let twin = t
  const asked: string[] = []
  let k = 0
  const visit = (cid: string) => {
    if (asked.includes(cid) || isMastered(twin.mastery[cid])) return
    const item = GRAPH.diagnostics[cid]?.[0]
    if (!item) { GRAPH.nodes[cid]?.prereqs.forEach(visit); return }
    asked.push(cid)
    const r = respond(cid, item)
    const correct = r.answer !== null && Math.abs(r.answer - item.answer) < 0.011
    const op: Op | undefined = cid === 'percent_basic' && item.id === 'd_pct_1' ? 'pct_of' : cid === 'percent_change' ? 'pct_change' : undefined
    const args = item.id === 'd_pct_1' ? [15, 400] : item.id === 'd_chg_1' ? [250, 300] : undefined
    twin = apply(twin, { id: `${twin.learnerId}-${runId}-${k++}`, learnerId: twin.learnerId, at: now + k, type: 'answer', conceptId: cid,
      itemId: item.id, op, args, answer: r.answer, correct, latencyMs: r.latencyMs, source: 'diagnostic' })
    if (!correct) GRAPH.nodes[cid]?.prereqs.forEach(visit)
  }
  visit(t.goal.conceptId)
  return { twin, asked }
}

/** Ordered learning sequence: unmastered prerequisites of the goal (dependency order), then the goal. */
export function learningPath(t: Twin): string[] {
  return [...closure(t.goal.conceptId), t.goal.conceptId].filter((c) => !isMastered(t.mastery[c]))
}
