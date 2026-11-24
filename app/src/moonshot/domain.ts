import fixture from '../../../moonshot/datasets/tin-24.json' with { type: 'json' }
import proposal from '../../../moonshot/datasets/demo-proposal.json' with { type: 'json' }
import { closure, rng } from '../engine/graph.ts'
import { parseCell } from '../engine/proof.ts'

export const DEMO = fixture
export const DEMO_PROPOSAL = proposal
export const SOURCE = { video: '/media/moonshot/inventory-demo.mp4', still: '/media/moonshot/inventory-poster.webp',
  audio: '/media/moonshot/inventory-en.m4a', audioKn: '/media/moonshot/inventory-kn.mp3', captions: '/media/moonshot/inventory-en.vtt' }
export type Stock = { opening: number; received: number; sold: number; counted: number }
export type Permissions = { capture: boolean; derivatives: boolean; publicShare: boolean }
export type SourceSpan = typeof DEMO.spans[number]
export type Step = { id: string; span: string; instruction: string; status: 'proposed' | 'checked' | 'uncertain' | 'rejected' | 'unsafe' }
export type LocalMedia = { id: string; name: string; mime: string; size: number }
export interface ExperienceTrace {
  experienceId: string
  sourceOwner: string
  sourceMedia: 'synthetic' | 'private'
  attachment?: LocalMedia
  permissions: Permissions
  problemDescription: string
  statedGoal: string
  facts: Stock | null
  actions: SourceSpan[]
  spokenExplanations: string[]
  observedOutcomes: string[]
  inferredReasoning: string[]
  confidence: 'source-aligned' | 'limited'
  unsupportedClaims: string[]
  missingSteps: string[]
  safetyFlags: string[]
  skills: string[]
  assessmentCandidates: string[]
  reviewStatus: 'draft' | 'demo-reviewed' | 'withdrawn'
}
export interface Playbook {
  experienceId: string; version: number; generatedAt: number; locale: 'en'; review: 'demo-reviewed'
  scope: 'same-device'; source: 'synthetic fixture' | 'private user text'; steps: Step[]
  facts: Stock; skill: 'inventory_reconciliation'; contributorReason: string
}
export interface Attempt {
  id: string; seed: number; source: string; version: number; expected: number; variance: number; at: number; explanation?: LocalMedia
}
export interface Receipt {
  attemptId: string; evidenceId: string; decision: 'reviewed' | 'needs_revision'; demo: boolean; at: number
}
export type Contribution = { id: string; type: 'question' | 'correction' | 'example'; text: string; source: string; version: number; status: 'pending' | 'accepted-for-draft'; at: number }

export const inventoryPrerequisites = closure('inventory_reconciliation')
export function stockResult(stock: Stock) {
  const expected = stock.opening + stock.received - stock.sold
  return { expected, variance: stock.counted - expected }
}

const redactions: [{ type: string; pattern: RegExp }, ...{ type: string; pattern: RegExp }[]] = [
  { type: 'PAYMENT', pattern: /\b[a-z0-9._-]+@(?:upi|okaxis|okhdfcbank|oksbi|okicici|ybl|paytm)\b/gi },
  { type: 'EMAIL', pattern: /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi },
  { type: 'PHONE', pattern: /(?:\+91[ -]?)?\b[6-9]\d{4}[ -]?\d{5}\b/g },
  { type: 'ID', pattern: /\b[2-9]\d{3}[ -]+\d{4}[ -]+\d{4}\b|\b[A-Z]{5}\d{4}[A-Z]\b/g },
]

export function redact(text: string) {
  return redactions.reduce((current, { type, pattern }) => current.replace(pattern, `[${type}]`), text)
}

export function parseStock(text: string): Stock | null {
  const values = ['opening', 'received', 'sold', 'counted'].map((field) => {
    const amount = new RegExp(`\\b${field}\\s*[:=]\\s*(\\d{1,5})\\b(?![.,]\\d)`, 'gi')
    const matches = [...text.matchAll(amount)]
    return matches.length === 1 ? Number(matches[0][1]) : NaN
  })
  if (!values.every(Number.isSafeInteger) || values[2] > values[0] + values[1]) return null
  return { opening: values[0], received: values[1], sold: values[2], counted: values[3] }
}

export function propose(text: string, demo: boolean, permissions: Permissions, attachment?: LocalMedia): ExperienceTrace {
  const clean = redact(text.trim())
  const facts = demo ? DEMO_PROPOSAL.facts : parseStock(clean)
  const sourceMedia = demo ? 'synthetic' : 'private'
  const actions = demo ? DEMO.spans : [{ id: 'text', at: 0, end: 0, action: 'Review the written source', seen: clean, speech: '' }]
  const verifiedCalculation = facts ? stockResult(facts) : null
  return {
    experienceId: demo ? DEMO.id : `local-${crypto.randomUUID()}`, sourceOwner: demo ? DEMO.sourceOwner : 'Private contributor on this device',
    sourceMedia, attachment, permissions, facts, actions, spokenExplanations: demo ? DEMO.spans.map((span) => span.speech) : [],
    problemDescription: demo ? DEMO.issue : clean, statedGoal: DEMO.goal,
    observedOutcomes: demo ? ['Corrected closing stock is 132.', 'The worksheet logs a shortage of four.'] : [],
    inferredReasoning: ['The cause of a discrepancy requires separate evidence.'],
    confidence: demo ? 'source-aligned' : 'limited',
    unsupportedClaims: ['Who caused the discrepancy', 'Whether the stock was stolen', 'Whether a second count took place'],
    missingSteps: demo ? ['Ask why a second person needs the original count and formula.'] : ['Confirm the written facts and enter any missing values.'],
    safetyFlags: /\b(electrical|medical|structural|hazardous|high voltage)\b/i.test(clean) ? ['Outside inventory training scope'] : [],
    skills: DEMO.skills, assessmentCandidates: verifiedCalculation ? ['Recalculate closing stock', 'Find the signed stock variance'] : [],
    reviewStatus: 'draft',
  }
}

export function initialSteps(trace: ExperienceTrace): Step[] {
  return trace.actions.map((source) => ({ id: source.id, span: source.id,
    instruction: trace.sourceMedia === 'synthetic' && source.id === 'fix'
      ? 'Use receipts from C5 for TIN-24.'
      : source.action,
    status: 'proposed' }))
}

export function approve(trace: ExperienceTrace, steps: Step[], nextVersion: number, contributorReason: string, at: number): Playbook {
  if (!trace.permissions.capture || !trace.permissions.derivatives || !trace.facts || trace.safetyFlags.length || trace.reviewStatus === 'withdrawn') {
    throw new Error('Confirm source permission, all four stock facts and scope before approving.')
  }
  if (steps.some((step) => step.status === 'proposed' || step.status === 'uncertain' || step.status === 'unsafe')) {
    throw new Error('Check, correct or reject each step. Resolve any uncertain or unsafe entries.')
  }
  const kept = steps.filter((step) => step.status === 'checked')
  if (!kept.length || kept.some((step) => step.instruction.trim().length < 3 || !trace.actions.some((span) => span.id === step.span))) {
    throw new Error('Each accepted step needs instructions and a source reference.')
  }
  if (kept.some((step) => step.span === 'fix' && /\bC5\b/i.test(step.instruction))) {
    throw new Error('The approved source shows C4 for TIN-24. Correct or reject the C5 step.')
  }
  return { experienceId: trace.experienceId, version: nextVersion, generatedAt: at, locale: 'en', review: 'demo-reviewed', scope: 'same-device',
    source: trace.sourceMedia === 'synthetic' ? 'synthetic fixture' : 'private user text', steps: kept.map((step) => ({...step, instruction: redact(step.instruction)})),
    facts: trace.facts, skill: 'inventory_reconciliation', contributorReason: redact(contributorReason.trim()) }
}

const queryRules: [RegExp, string][] = [
  [/\b(why|instead|wrong row|original|c5)\b.*\b(c4|c5|row|wrong|instead)\b|\b(c4|c5)\b.*\b(c4|c5|instead)\b|wrong row/, 'error'],
  [/\b(formula|expected)\b.*\b(corrects?|fix(?:es)?|computes?|calculates?)\b|\b(corrects?|fix(?:es)?|computes?|calculates?)\b.*\b(formula|expected)\b/, 'fix'],
  [/verify|recount|receipt|adjust|keep.*(visible|formula)/, 'check'],
  [/minus four|variance|compare|negative|shortage mean/, 'count'],
  [/\bsku\b|which item|item was counted/, 'row'],
]

export function answerSource(playbook: Playbook, trace: ExperienceTrace, question: string, at: number) {
  if (trace.reviewStatus === 'withdrawn' || playbook.experienceId !== trace.experienceId || /steal|stole|phone|who |actually|salary|wage|address/i.test(question)) return null
  const query = question.toLowerCase()
  const matched = queryRules.find(([rule]) => rule.test(query))?.[1]
  const atSpan = trace.actions.find((source) => source.at <= at && at < source.end)
  const address = matched ?? (/^(why did (the |they |you )?(do this|do that)|what happened here)\??$/.test(query.trim()) ? atSpan?.id : undefined)
  const span = trace.actions.find((source) => source.id === address && playbook.steps.some((step) => step.span === address))
  if (!span) return null
  const reason = span.id === 'check' && playbook.contributorReason ? ` ${playbook.contributorReason}` : ''
  return { text: span.seen + reason, at: span.at, span: span.id }
}

export function variant(seed: number): Stock {
  const next = rng(seed)
  const integer = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  const opening = integer(60, 180)
  const received = integer(10, 45)
  const sold = integer(13, 38)
  return { opening, received, sold, counted: opening + received - sold + integer(-9, 5) }
}

export function gradeInventory(stock: Stock, expected: number, variance: number) {
  const key = stockResult(stock)
  const expectedOK = expected === key.expected
  const varianceOK = variance === key.variance
  const misconception = !varianceOK && key.variance && variance === -key.variance ? 'reversed-variance'
    : !expectedOK && expected === stock.opening + stock.received + stock.sold ? 'added-sales' : undefined
  return { key, expectedOK, varianceOK, correct: expectedOK && varianceOK, misconception }
}

export function inventoryAnswer(value: string) {
  const parsed = parseCell(value.replaceAll('−', '-')).value
  return parsed !== null && Number.isSafeInteger(parsed) && Math.abs(parsed) <= 300_000 ? parsed : null
}

export const checksClosingStock = (misconception: string | undefined) => misconception === 'added-sales' || misconception === 'closing-stock'

export function stockStory(stock: Stock, submitted: number, misconception: string | undefined, challenge: Stock, kn: boolean) {
  const tutorial = stockResult(stock)
  const transfer = stockResult(challenge)
  const closing = checksClosingStock(misconception)
  const numberLabel = (value: number) => String(value).replace('-', '−')
  return {
    subject: closing ? 'Closing stock' : 'Stock difference', wrong: numberLabel(submitted), result: numberLabel(closing ? tutorial.expected : tutorial.variance),
    formula: closing ? `${stock.opening} + ${stock.received} − ${stock.sold}` : `${stock.counted} − ${tutorial.expected}`,
    question: closing ? `Opening ${challenge.opening}, received ${challenge.received}, sold ${challenge.sold}. Expected closing stock?`
      : `Counted ${challenge.counted}, expected ${transfer.expected}. Signed difference?`,
    answer: numberLabel(closing ? transfer.expected : transfer.variance),
    answerFormula: closing ? `${challenge.opening} + ${challenge.received} − ${challenge.sold}` : `${challenge.counted} − ${transfer.expected}`,
    percent: 0, change: true, kn: false, theme: 'stock' as const,
    hook: closing ? 'Sales leave the shelf.' : 'Which way did the stock go?',
    reaction: closing ? 'Add receipts. Subtract sales.' : 'Counted minus expected keeps the sign.',
    instruction: kn ? 'ಈ ಉದಾಹರಣೆಗೆ ಇಂಗ್ಲಿಷ್ ವಿವರಣೆ ಲಭ್ಯವಿದೆ.' : closing ? 'Opening plus received, then minus sold.' : 'A negative difference means a shortage.',
  }
}
