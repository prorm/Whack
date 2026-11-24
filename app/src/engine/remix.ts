// Experiment 5: Memory Remix reel planner. Cached media templates + dynamic, learner-specific overlays.
// No AI call at runtime: content comes from the hand-authored ConceptSpec + seeded variants with computed answers.
import { compute, detectMisconception, percentVariant, PERCENT, type Op } from './graph.ts'
import { apply, type LearnerEvent, type Twin } from './learner.ts'

export type ReelKind = 'memory_recall' | 'misconception_repair' | 'context_remix' | 'opportunity_application'

/** Cached media templates (existing assets: generated once, reused for every learner). */
export const TEMPLATES = {
  sheru_repair: { kind: 'misconception_repair', video: '/media/remix/sheru_aviators.mp4', poster: '/media/sheru-washers.jpg', persona: 'Sheru Bhai' },
  huss_recall: { kind: 'memory_recall', video: '/media/remix/huss_chase.mp4', poster: '/media/huss-chase.jpg', persona: 'Huss chase' },
  sheru_remix: { kind: 'context_remix', video: '/media/remix/sheru_walk.mp4', poster: '/media/sheru-boss.jpg', persona: 'Sheru Bhai' },
  job_card: { kind: 'opportunity_application', video: null, poster: '/media/sheru-boss.jpg', persona: 'Demo job' },
} as const
export type TemplateId = keyof typeof TEMPLATES

/** What the UI may show BEFORE the learner answers. Contains no answer. */
export interface ReelPublic {
  reel_id: string
  learner_id: string
  concept_id: string
  kind: ReelKind
  template_id: TemplateId
  locale: 'en' | 'kn' | 'kn-en'
  hook: string
  recall_question: string
  input: 'number'
  review_due_at: number | null
  learning_event: string | null // id of the answer event that triggered this reel
  misconception_id: string | null
}
/** Kept separately; only used by answerReel() after the attempt. */
export interface ReelKey { reel_id: string; op: Op; args: number[]; correct_answer: number; explanation: string; example_signature: string }
export interface ReelResult { reel_id: string; answer: number | null; correct: boolean; feedback: string; event: LearnerEvent }

const subtopicOfMis: Record<string, { op: Op; repair: string }> = Object.fromEntries(
  PERCENT.misconceptions.map((m) => [m.id, { op: m.subtopic === 'change' ? 'pct_change' : 'pct_of', repair: m.repair }]),
)

function hashSeed(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0 }
const sig = (op: Op, args: number[]) => `${op}:${args.join(',')}`

/**
 * Plan the next revision reel for ONE learner, using only that learner's twin.
 * Priority: misconception repair > due recall > context remix (transfer) > opportunity application.
 */
export function planReel(t: Twin, now: number, opts: { seenSignatures?: string[]; opportunity?: { title: string; pay: string } } = {}):
  { pub: ReelPublic; key: ReelKey } | null {
  const seen = new Set(opts.seenSignatures ?? t.history.filter((h) => h.op && h.args).map((h) => sig(h.op!, h.args!)))
  const lastMiss = [...t.history].reverse().find((h) => !h.correct && h.source !== 'feed' && h.conceptId.startsWith('percent'))
  const activeMis = Object.entries(t.misconceptions).filter(([, v]) => v.count > 0).sort((a, b) => b[1].lastAt - a[1].lastAt)[0]
  const locale = t.preferences.language
  // fresh example: never reuse numbers this learner has already seen (tests transfer, avoids answer memorisation)
  const fresh = (op: Op, salt: string) => {
    for (let i = 0; i < 50; i++) {
      const v = percentVariant(hashSeed(`${t.learnerId}|${salt}|${i}`), op)
      if (!seen.has(sig(v.op, v.args))) return v
    }
    return percentVariant(hashSeed(`${t.learnerId}|${salt}|x`), op)
  }
  let kind: ReelKind, template: TemplateId, misId: string | null = null, op: Op = 'pct_of', hook: string, explanation: string
  let learningEvent = lastMiss?.id ?? null
  const due = Object.entries(t.recall).filter(([c, r]) => c.startsWith('percent') && r.dueAt <= now).sort((a, b) => a[1].dueAt - b[1].dueAt)[0]
  if (activeMis) {
    misId = activeMis[0]
    kind = 'misconception_repair'; template = 'sheru_repair'
    op = subtopicOfMis[misId]?.op ?? 'pct_of'
    const wrong = PERCENT.misconceptions.find((m) => m.id === misId)
    // quote the learner's OWN wrong answer when we have it (stronger personalisation than a textbook example)
    const own = [...t.history].reverse().find((h) => !h.correct && h.op && h.args && h.answer != null && h.source !== 'feed' && detectMisconception(h.op, h.args, h.answer) === misId)
    learningEvent = own?.id ?? learningEvent
    const ownText = own?.op === 'pct_of' ? `${own.args![0]}% of ${own.args![1]} = ${own.answer}`
      : own?.op === 'pct_change' ? `${own.args![0]} → ${own.args![1]} is ${own.answer}%` : undefined
    hook = `Guru, last time you said "${ownText ?? wrong?.example_wrong}". Scene beda.`
    explanation = subtopicOfMis[misId]?.repair ?? ''
  } else if (due) {
    kind = 'memory_recall'; template = 'huss_recall'
    op = due[0] === 'percent_change' ? 'pct_change' : 'pct_of'
    hook = 'HUSS HUSS HUSS! Recall check before it leaks out.'
    explanation = 'x% of N = N × x / 100. Percent change = (new − old) / old × 100.'
  } else if (lastMiss || t.history.some((h) => h.conceptId.startsWith('percent'))) {
    kind = 'context_remix'; template = 'sheru_remix'
    hook = 'Same skill, new situation.'
    explanation = 'Percent of a quantity is always N × x / 100, whatever the context.'
  } else if (opts.opportunity) {
    kind = 'opportunity_application'; template = 'job_card'
    hook = `This skill shows up in: ${opts.opportunity.title} (${opts.opportunity.pay}, demo listing).`
    explanation = 'Incentive = order value × rate / 100.'
  } else return null
  const v = fresh(op, `${kind}|${misId}|${now}`)
  const reel_id = `reel-${t.learnerId}-${hashSeed(`${kind}${v.id}${now}`).toString(36)}`
  const answer = compute(v.op, v.args)
  return {
    pub: { reel_id, learner_id: t.learnerId, concept_id: op === 'pct_change' ? 'percent_change' : 'percent_basic', kind, template_id: template,
      locale, hook, recall_question: v.q, input: 'number', review_due_at: t.recall[op === 'pct_change' ? 'percent_change' : 'percent_basic']?.dueAt ?? null,
      learning_event: learningEvent, misconception_id: misId },
    key: { reel_id, op: v.op, args: v.args, correct_answer: answer, explanation, example_signature: sig(v.op, v.args) },
  }
}

/** Grade a reel attempt deterministically and produce the learner event (source 'recall' -> updates the schedule). */
export function answerReel(t: Twin, pub: ReelPublic, key: ReelKey, answer: number | null, now: number): { twin: Twin; result: ReelResult } {
  if (pub.learner_id !== t.learnerId || key.reel_id !== pub.reel_id) throw new Error('reel does not belong to this learner')
  const correct = answer !== null && Math.abs(answer - key.correct_answer) < 0.011
  const feedback = correct
    ? `Correct: ${key.correct_answer}. ${key.explanation}`
    : `Not quite${answer === null ? '' : ` (${answer})`}. The answer is ${key.correct_answer}. ${key.explanation}`
  const event: LearnerEvent = { id: `${pub.reel_id}-ans`, learnerId: t.learnerId, at: now, type: 'answer', conceptId: pub.concept_id,
    itemId: key.example_signature, op: key.op, args: key.args, answer, correct, source: 'recall', modality: 'reel' }
  return { twin: apply(t, event), result: { reel_id: pub.reel_id, answer, correct, feedback, event } }
}

/** Watching a reel is exposure only: it never creates answer evidence. */
export function viewReel(t: Twin, pub: ReelPublic, seconds: number, now: number): Twin {
  return apply(t, { id: `${pub.reel_id}-view-${now}`, learnerId: t.learnerId, at: now, type: 'exposure', conceptId: pub.concept_id, modality: 'reel', seconds })
}
