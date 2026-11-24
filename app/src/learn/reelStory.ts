import { compute } from '../engine/graph.ts'
import type { Twin } from '../engine/learner.ts'
import type { ReelKey, ReelPublic } from '../engine/remix.ts'
import type { Story } from './reelTimeline'

export type ReelPlan = { pub: ReelPublic; key: ReelKey }
const amount = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })
const n = (number: number) => amount.format(number)
const formula = (change: boolean, a: number, b: number) =>
  change ? `(${n(b)} − ${n(a)}) ÷ ${n(a)} × 100` : `₹${n(b)} × ${n(a)} ÷ 100`

export function makeStory(plan: ReelPlan, history: Twin['history'], kn: boolean): Story {
  const { pub, key } = plan
  const attempt = history.find((event) => event.id === pub.learning_event)
  const change = key.op === 'pct_change'
  const canQuote = pub.kind === 'misconception_repair' && attempt?.op === key.op && attempt.args && attempt.answer != null
  const [a, b] = canQuote ? attempt.args! : change ? [250, 300] : [20, 350]
  const result = compute(change ? 'pct_change' : 'pct_of', [a, b])
  const [r1, r2] = key.args
  return {
    subject: change ? `${n(a)} → ${n(b)}` : kn ? `₹${n(b)} ರಲ್ಲಿ ${n(a)}%` : `${n(a)}% of ₹${n(b)}`,
    wrong: canQuote ? (change ? `${n(attempt.answer!)}%` : `₹${n(attempt.answer!)}`) : null,
    result: change ? `${n(result)}%` : `₹${n(result)}`,
    formula: formula(change, a, b),
    percent: change ? Math.min(100, Math.abs(result)) : a,
    change, kn,
    hook: kn ? 'ಶೇರು ಲೆಕ್ಕ ನೋಡುತ್ತಾನೆ' : canQuote ? 'Sheru checks your maths.' : 'Sheru checks the till.',
    reaction: kn ? 'ಲೆಕ್ಕವನ್ನು ಮತ್ತೆ ನೋಡೋಣ.' : canQuote
      ? pub.misconception_id === 'pct_add_instead_of_multiply' ? 'The calculator filed a complaint.' : 'The till wants a recount.'
      : 'The calculator wants a receipt.',
    question: kn ? (change ? `${n(r1)} ರಿಂದ ${n(r2)}ಕ್ಕೆ ಬದಲಾವಣೆ ಎಷ್ಟು ಶೇಕಡಾ?` : `₹${n(r2)} ರಲ್ಲಿ ${n(r1)}% ಎಷ್ಟು?`) : key.op === 'pct_of'
      ? `What is ${n(r1)}% of ₹${n(r2)}?` : key.op === 'pct_change'
        ? `What is the percent change from ${n(r1)} to ${n(r2)}?` : pub.recall_question,
    answer: change ? `${n(key.correct_answer)}%` : `₹${n(key.correct_answer)}`,
    answerFormula: formula(change, r1, r2),
  }
}

