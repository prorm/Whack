// Experiment 4: explainable adaptation policy.
// Deterministic rules decide WHAT to do next. A guarded bandit may only choose HOW (modality) for
// instruction, and only after enough logged outcomes; otherwise a safe default is used.
import { GRAPH } from './graph.ts'
import { SLOW_MS, isMastered, learningPath, masteryMean, masterySd, type Modality, type Twin } from './learner.ts'

export type ActionType =
  | 'retrieval' | 'misconception_repair' | 'prerequisite_instruction' | 'instruction'
  | 'practice' | 'increase_difficulty' | 'transfer_task' | 'advance'

export interface Action {
  type: ActionType
  conceptId: string
  modality: Modality
  difficulty: 1 | 2 | 3
  misconceptionId?: string
  reason: string // human-readable, logged
  rule: string
  modalitySource: 'preference_default' | 'constraint' | 'bandit' | 'fallback'
}

const INSTRUCTION_MODALITIES: Modality[] = ['text', 'audio', 'interactive', 'worked_example']

/** Modality default from (changeable) preferences filtered by constraints. Never a fixed learning-style label. */
export function defaultModality(t: Twin): { modality: Modality; source: Action['modalitySource'] } {
  const allowed = INSTRUCTION_MODALITIES.filter((m) => !(t.constraints.connectivity === 'poor' && m === 'reel'))
  const pref = t.preferences.modalities.find((m) => allowed.includes(m))
  return pref ? { modality: pref, source: 'preference_default' } : { modality: 'worked_example', source: 'fallback' }
}

export function nextAction(t: Twin, now: number, bandit?: Bandit): Action {
  const mod = defaultModality(t)
  const base = { modality: mod.modality, modalitySource: mod.source, difficulty: 1 as const }
  // R1 overdue review of something already learned -> retrieval practice
  const due = Object.entries(t.recall)
    .filter(([c, r]) => r.dueAt <= now && isMastered(t.mastery[c]))
    .sort((a, b) => a[1].dueAt - b[1].dueAt)[0]
  if (due) {
    return { ...base, type: 'retrieval', conceptId: due[0], modality: 'reel', rule: 'R1',
      reason: `Review of ${due[0]} was due ${Math.round((now - due[1].dueAt) / 3_600_000)}h ago; retrieval beats re-reading.` }
  }
  const path = learningPath(t)
  if (path.length === 0) {
    return { ...base, type: 'transfer_task', conceptId: t.goal.conceptId, difficulty: 3, rule: 'R7',
      reason: `Goal ${t.goal.conceptId} mastered with evidence; prove it on an unseen task.` }
  }
  const c = path[0]
  const m = t.mastery[c]
  // R2 repeated misconception on this concept -> targeted repair
  const mis = Object.entries(t.misconceptions).filter(([, v]) => v.conceptId === c && v.count >= 2).sort((a, b) => b[1].count - a[1].count)[0]
  if (mis) {
    return { ...base, type: 'misconception_repair', conceptId: c, misconceptionId: mis[0], modality: 'worked_example', rule: 'R2',
      reason: `Same error "${GRAPH.misconceptions[mis[0]]?.label ?? mis[0]}" seen ${mis[1].count}x on ${c}; repair it with a contrasting worked example.` }
  }
  // R3 concept is not the goal and the learner has no evidence -> prerequisite instruction (simpler)
  if (!m || m.n === 0) {
    const pick = bandit ? bandit.choose(t, c) : undefined
    const chosen = pick ?? mod
    return { ...base, modality: chosen.modality, modalitySource: chosen.source,
      type: c === t.goal.conceptId ? 'instruction' : 'prerequisite_instruction', conceptId: c, rule: 'R3',
      reason: c === t.goal.conceptId ? `No evidence yet on goal concept ${c}.` : `Prerequisite ${c} of goal ${t.goal.conceptId} is not mastered; teach it first (simpler explanation).` }
  }
  // R4 correct but slow -> more practice at the same level
  if (m.lastCorrect && (m.lastLatencyMs ?? 0) > SLOW_MS) {
    return { ...base, type: 'practice', conceptId: c, rule: 'R4', reason: `Last answer on ${c} was correct but slow (${Math.round((m.lastLatencyMs ?? 0) / 1000)}s); build fluency.` }
  }
  // R5 strong but not yet enough evidence -> harder item
  if (masteryMean(m) >= 0.7) {
    return { ...base, type: 'increase_difficulty', conceptId: c, difficulty: 2, rule: 'R5',
      reason: `${c} mastery ${masteryMean(m).toFixed(2)}±${masterySd(m).toFixed(2)}; confirm with a harder item.` }
  }
  // R6 otherwise practise
  return { ...base, type: 'practice', conceptId: c, rule: 'R6', reason: `${c} mastery ${masteryMean(m).toFixed(2)}; needs more practice evidence.` }
}

// ------------------------------------------------------------------ guarded contextual bandit (experimental)
/**
 * Thompson sampling over instruction modalities, per context (concept kind x mastery band).
 * Reward = correctness on a LATER equivalent assessment (not watch time, not the immediate quiz).
 * Safety: needs >= minPulls logged outcomes per arm in the context before it may override the default,
 * and never picks a modality the learner's constraints disallow.
 */
export interface Arm { s: number; f: number }
export class Bandit {
  arms: Record<string, Record<string, Arm>> = {}
  log: { context: string; modality: Modality; reward: number | null; learnerId: string; at: number }[] = []
  minPulls: number
  random: () => number
  constructor(minPulls = 30, random: () => number = Math.random) {
    this.minPulls = minPulls
    this.random = random
  }

  context(t: Twin, conceptId: string) {
    const band = masteryMean(t.mastery[conceptId]) < 0.4 ? 'low' : masteryMean(t.mastery[conceptId]) < 0.7 ? 'mid' : 'high'
    return `${GRAPH.nodes[conceptId]?.kind ?? 'x'}:${band}`
  }

  choose(t: Twin, conceptId: string): { modality: Modality; source: Action['modalitySource'] } | undefined {
    const ctx = this.context(t, conceptId)
    const arms = this.arms[ctx]
    const allowed = INSTRUCTION_MODALITIES
    if (!arms || allowed.some((m) => (arms[m]?.s ?? 0) + (arms[m]?.f ?? 0) < this.minPulls)) return undefined // safe fallback
    let best: Modality = allowed[0], bestDraw = -1
    for (const m of allowed) {
      const d = betaSample(1 + arms[m].s, 1 + arms[m].f, this.random)
      if (d > bestDraw) { bestDraw = d; best = m }
    }
    return { modality: best, source: 'bandit' }
  }

  record(ctx: string, modality: Modality, reward: 0 | 1, learnerId: string, at: number) {
    this.arms[ctx] ??= {}
    const a = (this.arms[ctx][modality] ??= { s: 0, f: 0 })
    if (reward) a.s++; else a.f++
    this.log.push({ context: ctx, modality, reward, learnerId, at })
  }
}

function gammaSample(k: number, rnd: () => number): number {
  // Marsaglia-Tsang (k >= 1) with boost for k < 1
  if (k < 1) return gammaSample(k + 1, rnd) * Math.pow(rnd(), 1 / k)
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d)
  for (;;) {
    let x: number, v: number
    do {
      const u1 = rnd() || 1e-12, u2 = rnd()
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      v = 1 + c * x
    } while (v <= 0)
    v = v * v * v
    const u = rnd()
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}
export function betaSample(a: number, b: number, rnd: () => number) {
  const x = gammaSample(a, rnd), y = gammaSample(b, rnd)
  return x / (x + y)
}
