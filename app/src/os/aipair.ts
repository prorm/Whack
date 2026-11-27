// AI Pair: every lab has a mode where you work WITH an AI assistant and are graded on judgement, not typing.
// Three things are checked, the same way in software and in the trades:
//   1. Brief: what you hand the assistant (the evidence it needs; never secrets or customer data).
//   2. Review: the assistant is fluent and confident, and in every trial one of its calls is wrong. Do you catch it?
//   3. Prove: a test it has not seen (CodeLab) or a meter reading (TradeLab) settles it, not the assistant's word.
// No model is called. The assistant is a scripted simulation, labelled as such, so a trial is reproducible from its
// seed. Whether a suggestion is right is never hand-typed: CodeLab suggestions are executed against the reference
// handler, and TradeLab readings come from the Practical Arena circuit solver.
import { PARTS, PART_LABEL, TEST_POINTS, faultFor, replayArena, type Action, type Part } from '../capable/arena.ts'
import { VARIANTS, incidentLog, referenceCode, runSuite, starterCode, testCases, type Loader, type Summary, type VariantId, type WebhookEvent } from './codelab.ts'

export const AI_VERSION = 1

// ------------------------------------------------------------------ shared: the brief
export type CtxKind = 'need' | 'noise' | 'secret'
export interface Ctx { id: string; label: string; detail: string; kind: CtxKind }

export const CODE_CONTEXT: Ctx[] = [
  { id: 'ticket', label: 'The ticket', detail: 'What finance reported', kind: 'need' },
  { id: 'log', label: 'Production log', detail: 'The lines around the alert', kind: 'need' },
  { id: 'handler', label: 'payments.js', detail: 'The handler that misbehaves', kind: 'need' },
  { id: 'rules', label: 'The handler’s contract', detail: 'Retries repeat · whole paise · status codes are promises', kind: 'need' },
  { id: 'deploy', label: 'Yesterday’s deploy notes', detail: 'A CSS change on the checkout page', kind: 'noise' },
  { id: 'env', label: '.env (production)', detail: 'GATEWAY_SECRET=sk_live_…', kind: 'secret' },
  { id: 'customers', label: 'customers.csv', detail: 'Names, phone numbers, card last-4', kind: 'secret' },
]
export const TRADE_CONTEXT: Ctx[] = [
  { id: 'photo', label: 'Photo of the open board', detail: 'Fuse, switch, neutral joint and lamp holder in frame', kind: 'need' },
  { id: 'symptom', label: 'Symptom', detail: 'Lamp dark · breaker not tripped · no smell of burning', kind: 'need' },
  { id: 'rating', label: 'Circuit rating label', detail: '230 V lighting circuit · 6 A', kind: 'need' },
  { id: 'voice', label: 'Customer’s voice note', detail: '“It just stopped, please come fast”', kind: 'noise' },
  { id: 'address', label: 'Address & gate code', detail: 'Flat 4B · gate 7741', kind: 'secret' },
  { id: 'aadhaar', label: 'Customer’s Aadhaar photo', detail: 'Taken for the invoice', kind: 'secret' },
]

const rng = (seed: number) => () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 2 ** 32 }
export function shuffled<T>(xs: T[], seed: number): T[] {
  const r = rng(seed ^ 0x9e37), out = [...xs]
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j]!, out[i]!] }
  return out
}

export interface BriefGrade { passed: boolean; missing: string[]; leaked: string[]; noise: string[] }
export function gradeBrief(cards: Ctx[], chosen: string[]): BriefGrade {
  const picked = new Set(chosen)
  const missing = cards.filter((c) => c.kind === 'need' && !picked.has(c.id)).map((c) => c.id)
  const leaked = cards.filter((c) => c.kind === 'secret' && picked.has(c.id)).map((c) => c.id)
  const noise = cards.filter((c) => c.kind === 'noise' && picked.has(c.id)).map((c) => c.id)
  return { passed: !missing.length && !leaked.length, missing, leaked, noise }
}

// ------------------------------------------------------------------ CodeLab: review the copilot's patch
/** One plausible, over-eager change per incident. Each fixes the reported bug and passes every visible test. */
const TRAPS: Record<VariantId, { apply: (code: string) => string; claim: string; mistake: string }> = {
  duplicate: {
    apply: (c) => c.replaceAll('db.processed.has(event.id)', 'db.processed.has(event.orderId)').replaceAll('db.processed.add(event.id)', 'db.processed.add(event.orderId)'),
    claim: 'Deduplicate by order id. An order can only be paid once, so a second event for it is a duplicate.',
    mistake: 'It keys deduplication on the order, so a refund for that order is swallowed as a “duplicate”.',
  },
  units: {
    apply: (c) => c.replace("if (event.type === 'payment.captured') {", "if (event.type !== 'refund.requested') {"),
    claim: 'Round to whole paise, and I simplified the branching: every payment event credits the ledger, refunds are handled below.',
    mistake: 'The “simplified” branch credits declined payments again, which is a different production incident.',
  },
  failed: {
    apply: (c) => c.replace("  if (event.type === 'payment.captured') {",
      "  if (event.type !== 'payment.captured') {\n    db.processed.add(event.id)\n    return { status: 200, body: 'ignored' }\n  }\n  if (event.type === 'payment.captured') {"),
    claim: 'Only a captured payment is money, so return early for every other event type.',
    mistake: 'Refund requests are “other events” too: nothing is refunded, and an impossible refund now gets 200 instead of 422.',
  },
  refund: {
    apply: (c) => c.replace('if (paise > captured - refunded)', 'if (paise > captured)'),
    claim: 'Refuse any refund larger than the captured amount, with 422.',
    mistake: 'It ignores what was already refunded, so two partial refunds can add up to more than the payment.',
  },
}
const FIX_CLAIM: Record<VariantId, string> = {
  duplicate: 'Skip an event id the ledger has already processed, before crediting anything.',
  units: 'Convert rupees to paise with Math.round, so ₹0.29 becomes exactly 29 paise.',
  failed: 'Credit only payment.captured; payment.failed falls through to “ignored”.',
  refund: 'Refuse a refund above what is left to refund (captured minus already refunded) with 422.',
}

export type DiffLine = { op: ' ' | '+' | '-'; text: string }
/** A minimal line diff (LCS), enough to show what a suggestion changes. */
export function lineDiff(a: string, b: string): DiffLine[] {
  const x = a.split('\n'), y = b.split('\n')
  const L = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0))
  for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--) L[i]![j] = x[i] === y[j] ? L[i + 1]![j + 1]! + 1 : Math.max(L[i + 1]![j]!, L[i]![j + 1]!)
  const out: DiffLine[] = []
  let i = 0, j = 0
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) { out.push({ op: ' ', text: x[i]! }); i++; j++ }
    else if (L[i + 1]![j]! >= L[i]![j + 1]!) out.push({ op: '-', text: x[i++]! })
    else out.push({ op: '+', text: y[j++]! })
  }
  while (i < x.length) out.push({ op: '-', text: x[i++]! })
  while (j < y.length) out.push({ op: '+', text: y[j++]! })
  return out
}

/** The tests a reviewer could write before merging. Events are fresh per seed. */
export const SCENARIOS = ['retry', 'partial', 'declined', 'orders', 'unknown-refund', 'awkward'] as const
export type ScenarioId = typeof SCENARIOS[number]
export const SCENARIO_LABEL: Record<ScenarioId, string> = {
  retry: 'The same delivery arrives twice',
  partial: '₹640 captured, then refunds of ₹200 and ₹500',
  declined: 'A declined card, then a real payment',
  orders: 'Three different orders, one payment each',
  'unknown-refund': 'A refund for an order we never saw',
  awkward: 'A payment of ₹0.29',
}
export function scenarioEvents(id: ScenarioId, seed: number): WebhookEvent[] {
  const r = rng(seed ^ 0x51ed)
  let n = Math.floor(r() * 9000) + 1000
  const order = () => `ORD-${Math.floor(r() * 9000) + 1000}`
  const evt = (type: WebhookEvent['type'], orderId: string, amount: string): WebhookEvent => ({ id: `evt_${(n++).toString(36)}`, type, orderId, amount })
  const o = order()
  if (id === 'retry') { const e = evt('payment.captured', o, '499.00'); return [e, { ...e }] }
  if (id === 'partial') return [evt('payment.captured', o, '640.00'), evt('refund.requested', o, '200.00'), evt('refund.requested', o, '500.00')]
  if (id === 'declined') return [evt('payment.failed', o, '1250.00'), evt('payment.captured', order(), '89.00')]
  if (id === 'orders') return [evt('payment.captured', o, '499.00'), evt('payment.captured', order(), '1250.00'), evt('payment.captured', order(), '89.00')]
  if (id === 'unknown-refund') return [evt('refund.requested', o, '10.00')]
  return [evt('payment.captured', o, '0.29')]
}

const outcome = (code: string, events: WebhookEvent[], load?: Loader): Summary | null => {
  const blank: Summary = { statuses: [], ledgerCount: -1, ledgerPaise: -1, refundedPaise: -1 }
  const [res] = runSuite(code, [{ name: 'probe', hidden: false, events, expect: blank }], load)
  return res?.got ?? null
}
const sameSummary = (a: Summary | null, b: Summary | null) => !!a && !!b && JSON.stringify(a) === JSON.stringify(b)

/** True when the scenario makes the code behave differently from the reference handler. */
export const exposes = (code: string, id: ScenarioId, seed: number, load?: Loader) =>
  !sameSummary(outcome(code, scenarioEvents(id, seed), load), outcome(referenceCode(), scenarioEvents(id, seed), load))

export type Slot = 'A' | 'B'
export interface Suggestion { slot: Slot; claim: string; code: string; diff: DiffLine[]; visible: { passed: number; total: number } }
export interface AiCodeTicket { variant: VariantId; title: string; ticket: string; logs: string[]; starter: string; context: Ctx[]; suggestions: Suggestion[]; scenarios: ScenarioId[] }

export const trapSlot = (seed: number): Slot => (seed >>> 1) % 2 ? 'A' : 'B'
export const trapCode = (v: VariantId) => TRAPS[v].apply(referenceCode())
export const trapMistake = (v: VariantId) => TRAPS[v].mistake

export function aiCodeTicket(v: VariantId, seed: number, load?: Loader): AiCodeTicket {
  const starter = starterCode(v)
  const visible = testCases(v, seed, load).filter((c) => !c.hidden)
  const make = (slot: Slot, code: string, claim: string): Suggestion => {
    const res = runSuite(code, visible, load)
    return { slot, claim, code, diff: lineDiff(starter, code), visible: { passed: res.filter((t) => t.pass).length, total: res.length } }
  }
  const trapIsA = trapSlot(seed) === 'A'
  const fix = referenceCode(), trap = trapCode(v)
  return {
    variant: v, title: VARIANTS[v].title, ticket: VARIANTS[v].ticket, logs: incidentLog(v, seed), starter,
    context: shuffled(CODE_CONTEXT, seed),
    suggestions: [make('A', trapIsA ? trap : fix, trapIsA ? TRAPS[v].claim : FIX_CLAIM[v]), make('B', trapIsA ? fix : trap, trapIsA ? FIX_CLAIM[v] : TRAPS[v].claim)],
    scenarios: shuffled([...SCENARIOS], seed + 7),
  }
}

export interface AiCodeAnswer { context: string[]; ship: Slot; expose: ScenarioId }
export function gradeAiCode(v: VariantId, seed: number, a: AiCodeAnswer, load?: Loader) {
  const brief = gradeBrief(CODE_CONTEXT, a.context)
  const shipCorrect = a.ship !== trapSlot(seed)
  const exposeCorrect = exposes(trapCode(v), a.expose, seed, load)
  const exposing = SCENARIOS.filter((s) => exposes(trapCode(v), s, seed, load))
  return { passed: brief.passed && shipCorrect && exposeCorrect, brief, shipCorrect, exposeCorrect, exposing, trap: trapSlot(seed), mistake: TRAPS[v].mistake }
}
export const validAiCodeAnswer = (a: unknown): a is AiCodeAnswer => {
  if (!a || typeof a !== 'object') return false
  const x = a as AiCodeAnswer
  return Array.isArray(x.context) && x.context.length <= CODE_CONTEXT.length && x.context.every((c) => CODE_CONTEXT.some((k) => k.id === c)) &&
    (x.ship === 'A' || x.ship === 'B') && (SCENARIOS as readonly string[]).includes(x.expose)
}

// ------------------------------------------------------------------ TradeLab: check the AI's diagnosis
const CUE: Record<Part, string> = {
  fuse: 'The fuse carrier looks scorched in the photo. The fuse has blown. Replace the fuse.',
  neutral: 'The neutral joint looks loose and discoloured. Re-terminate the neutral.',
  switch: 'The switch rocker looks cracked. Replace the wall switch.',
  lamp: 'The lamp looks blackened inside. Replace the lamp.',
}
/** Half of all trials, the assistant names the wrong part, just as confidently. */
export const claimFor = (seed: number): Part => {
  const fault = faultFor(seed)
  if ((seed >>> 2) % 2 === 0) return fault
  return PARTS[(PARTS.indexOf(fault) + 1 + ((seed >>> 3) % 3)) % PARTS.length]!
}
const UNSAFE = [
  { at: 1, text: 'Skip the dead test. The breaker is off, so the circuit is safe to touch.' },
  { at: 2, text: 'Measure resistance across it with the breaker still on. It’s quicker.' },
  { at: 2, text: 'Bridge it with a short piece of wire and see if the lamp lights.' },
] as const
export const unsafeFor = (seed: number) => UNSAFE[(seed >>> 4) % UNSAFE.length]!

export function planFor(seed: number): string[] {
  const part = PART_LABEL[claimFor(seed)].toLowerCase()
  const steps = ['Open the breaker and lock it off.', 'Prove dead: Fuse in to Neutral rail should read 0 V.', `Measure resistance across the ${part}.`, `Replace the ${part} and run the load test.`]
  const u = unsafeFor(seed)
  steps[u.at] = u.text.replace('across it', `across the ${part}`).replace('Bridge it', `Bridge the ${part}`)
  return steps
}

/** Ohm readings at each part's test points after a proper isolation, from the Practical Arena solver. null = OL (open). */
export function tradeReadings(seed: number): Record<Part, number | null> {
  const trace: Action[] = [{ kind: 'cover' }, { kind: 'breaker' }, { kind: 'probe', mode: 'ac', a: 'fuse-in', b: 'neutral' },
    ...PARTS.map((p) => ({ kind: 'probe' as const, mode: 'ohm' as const, a: TEST_POINTS[p][0], b: TEST_POINTS[p][1] }))]
  const r = replayArena(seed, trace).readings.slice(1)
  return Object.fromEntries(PARTS.map((p, i) => [p, r[i]!.value])) as Record<Part, number | null>
}

export interface AiTradeTicket { context: Ctx[]; claim: Part; message: string; confidence: number; plan: string[]; readings: Record<Part, number | null> }
export const aiTradeTicket = (seed: number): AiTradeTicket => ({
  context: shuffled(TRADE_CONTEXT, seed), claim: claimFor(seed), message: CUE[claimFor(seed)], confidence: 88 + (seed >>> 5) % 10,
  plan: planFor(seed), readings: tradeReadings(seed),
})

export interface AiTradeAnswer { context: string[]; unsafe: number; measured: Part[]; verdict: Part }
export function gradeAiTrade(seed: number, a: AiTradeAnswer) {
  const brief = gradeBrief(TRADE_CONTEXT, a.context)
  const claim = claimFor(seed), fault = faultFor(seed)
  const unsafeCorrect = a.unsafe === unsafeFor(seed).at
  const claimTested = a.measured.includes(claim)
  const verdictCorrect = a.verdict === fault
  const evidenced = a.measured.includes(a.verdict)
  return { passed: brief.passed && unsafeCorrect && claimTested && verdictCorrect && evidenced, brief, unsafeCorrect, claimTested, verdictCorrect, evidenced,
    aiWasRight: claim === fault, claim, fault }
}
export const validAiTradeAnswer = (a: unknown): a is AiTradeAnswer => {
  if (!a || typeof a !== 'object') return false
  const x = a as AiTradeAnswer
  return Array.isArray(x.context) && x.context.length <= TRADE_CONTEXT.length && x.context.every((c) => TRADE_CONTEXT.some((k) => k.id === c)) &&
    Number.isInteger(x.unsafe) && x.unsafe >= 0 && x.unsafe < 4 && Array.isArray(x.measured) && x.measured.length <= 8 &&
    x.measured.every((p) => PARTS.includes(p)) && PARTS.includes(x.verdict)
}

/** The four rules the lab teaches before it tests them. */
export const AI_RULES = [
  { title: 'Brief with evidence, not vibes', text: 'Give the assistant what a colleague would need: the ticket, the logs or photo, the code or the board, and the rules it must keep.' },
  { title: 'Never paste secrets or customer data', text: 'Keys, phone numbers, addresses and ID documents never go into a prompt. The fix doesn’t need them.' },
  { title: '“All tests pass” is a claim', text: 'Make it prove itself on something it hasn’t seen: a test you write, or a reading from your own meter.' },
  { title: 'You sign off', text: 'Safety steps and the final call stay human. An assistant that says “skip the dead test” is wrong, however confident.' },
]
