// CodeLab: a payment webhook handler with one injected bug per incident. The learner reads the ticket and
// logs, repairs the code, and runs tests. Expected results come from the reference handler below, so no
// expected value is hand-typed. The same module grades in the browser (practice) and on the server
// (verified, inside a sandboxed child process), so the two can never disagree.

export const CODE_VERSION = 1
export type VariantId = 'duplicate' | 'units' | 'failed' | 'refund'
export const PRACTICE_VARIANT: VariantId = 'duplicate'
/** Verified trials draw an incident the guided practice never showed. */
export const VERIFIED_VARIANTS: VariantId[] = ['units', 'failed', 'refund']
export const verifiedVariant = (seed: number): VariantId => VERIFIED_VARIANTS[seed % VERIFIED_VARIANTS.length]

export interface WebhookEvent { id: string; type: 'payment.captured' | 'payment.failed' | 'refund.requested'; orderId: string; amount: string }
export interface Summary { statuses: number[]; ledgerCount: number; ledgerPaise: number; refundedPaise: number }
export interface TestCase { name: string; hidden: boolean; events: WebhookEvent[]; expect: Summary }
export interface TestResult { name: string; hidden: boolean; pass: boolean; got?: Summary; expect?: Summary; error?: string }
type Db = { ledger: { orderId: string; paise: number }[]; processed: Set<string>; refunds: { orderId: string; paise: number }[] }
type Handler = (event: WebhookEvent, db: Db) => { status: number; body?: string } | undefined

// ------------------------------------------------------------------ the reference handler (the spec)
const REFERENCE = `function handleWebhook(event, db) {
  // The gateway retries a delivery until it gets a 200, so the same event can arrive more than once.
  if (db.processed.has(event.id)) return { status: 200, body: 'duplicate ignored' }

  if (event.type === 'payment.captured') {
    // The gateway sends rupees as a string, e.g. "499.90". The ledger stores whole paise.
    const paise = Math.round(Number(event.amount) * 100)
    db.ledger.push({ orderId: event.orderId, paise })
  } else if (event.type === 'refund.requested') {
    const paise = Math.round(Number(event.amount) * 100)
    const captured = db.ledger.filter((e) => e.orderId === event.orderId).reduce((n, e) => n + e.paise, 0)
    const refunded = db.refunds.filter((e) => e.orderId === event.orderId).reduce((n, e) => n + e.paise, 0)
    if (paise > captured - refunded) return { status: 422, body: 'refund exceeds captured amount' }
    db.refunds.push({ orderId: event.orderId, paise })
  } else {
    db.processed.add(event.id)
    return { status: 200, body: 'ignored' }
  }

  db.processed.add(event.id)
  return { status: 200, body: 'ok' }
}`

const BUGS: Record<VariantId, [string, string]> = {
  duplicate: ["  if (db.processed.has(event.id)) return { status: 200, body: 'duplicate ignored' }\n", ''],
  units: ['const paise = Math.round(Number(event.amount) * 100)\n    db.ledger', 'const paise = Number(event.amount) * 100\n    db.ledger'],
  failed: ["if (event.type === 'payment.captured') {", "if (event.type.startsWith('payment.')) {"],
  refund: ["    if (paise > captured - refunded) return { status: 422, body: 'refund exceeds captured amount' }\n", ''],
}

/** The reference handler without its teaching comment: the behaviour every test expects. */
export const referenceCode = () => REFERENCE.replace(/\n\s*\/\/ The gateway retries[^\n]*/, '').replace('{\n\n', '{\n')

export const starterCode = (v: VariantId) => {
  const [find, replace] = BUGS[v]
  return REFERENCE.replace(find, replace).replace(/\n\s*\/\/ The gateway retries[^\n]*/, '').replace('{\n\n', '{\n')
}

// ------------------------------------------------------------------ incidents
export const VARIANTS: Record<VariantId, { title: string; ticket: string; symptom: string }> = {
  duplicate: { title: 'Orders credited twice', symptom: 'duplicate ledger credits',
    ticket: 'Finance reconciliation failed overnight: some orders appear twice in our ledger even though each customer was charged once. Find out why and fix the webhook handler without breaking anything else.' },
  units: { title: 'Ledger totals off by fractions of a paisa', symptom: 'non-integer paise',
    ticket: 'The settlement export rejects our ledger: some amounts are not whole paise, so totals never match the gateway. Find the cause in the handler and fix it.' },
  failed: { title: 'Failed payments marked as paid', symptom: 'failed payments credited',
    ticket: 'Customers whose card was declined are receiving their orders. Our ledger shows these orders as paid. Find the cause and fix the handler.' },
  refund: { title: 'Refunds larger than the payment', symptom: 'over-refunds accepted',
    ticket: 'An order of ₹299 was refunded ₹2,990 after a typo in the support console. The handler accepted it. Make the handler refuse any refund above what is left to refund, with HTTP 422.' },
}

const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32 }
// amounts whose rupees × 100 is not exact in floating point
const AWKWARD = ['0.29', '4.35', '19.99', '1.15', '8.20', '0.57', '16.08', '2.05', '9.95', '1.13']
const CLEAN = ['499.00', '1250.00', '89.00', '2300.00', '640.00']

function events(seed: number) {
  const r = rng(seed)
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)]
  let n = Math.floor(r() * 9000) + 1000
  const evt = (type: WebhookEvent['type'], orderId: string, amount: string): WebhookEvent => ({ id: `evt_${(n++).toString(36)}`, type, orderId, amount })
  const order = () => `ORD-${Math.floor(r() * 9000) + 1000}`
  return { pick, evt, order, clean: () => pick(CLEAN), awkward: () => pick(AWKWARD) }
}

/** Visible tests reproduce the incident; hidden tests check the whole contract with fresh values. */
export function testCases(v: VariantId, seed: number, load: Loader = loadDefault): TestCase[] {
  const g = events(seed)
  const tc = (name: string, hidden: boolean, evs: WebhookEvent[]): TestCase => ({ name, hidden, events: evs, expect: expectFor(evs, load) })
  const o1 = g.order(), o2 = g.order(), o3 = g.order(), o4 = g.order()
  const capture = g.evt('payment.captured', o1, g.clean())
  const awk = g.evt('payment.captured', o2, g.awkward())
  const declined = g.evt('payment.failed', o3, g.clean())
  const paid = g.evt('payment.captured', o4, '299.00')
  const repro: Record<VariantId, TestCase> = {
    duplicate: tc('A retried delivery is credited once', false, [capture, { ...capture }]),
    units: tc('Rupee amounts become whole paise', false, [awk]),
    failed: tc('A declined card is not credited', false, [declined]),
    refund: tc('A refund above the payment is refused', false, [paid, g.evt('refund.requested', o4, '2990.00')]),
  }
  const visible = [tc('A captured payment is credited once', false, [g.evt('payment.captured', g.order(), g.clean())]), repro[v]]
  const h1 = g.evt('payment.captured', g.order(), g.clean())
  const h2 = g.evt('payment.captured', g.order(), g.awkward())
  const h3 = g.evt('payment.captured', g.order(), '640.00')
  const hidden = [
    tc('Regression: three different orders are each credited', true, [g.evt('payment.captured', g.order(), g.clean()), g.evt('payment.captured', g.order(), g.awkward()), g.evt('payment.captured', g.order(), g.clean())]),
    tc('Contract: a delivery retried three times is credited once', true, [h1, { ...h1 }, { ...h1 }]),
    tc('Contract: awkward amounts stay whole paise', true, [h2, g.evt('payment.captured', g.order(), g.awkward())]),
    tc('Contract: declined and failed payments never credit', true, [g.evt('payment.failed', g.order(), g.clean()), g.evt('payment.captured', g.order(), g.clean())]),
    tc('Contract: a partial refund is accepted, the rest is protected', true, [h3, g.evt('refund.requested', h3.orderId, '200.00'), g.evt('refund.requested', h3.orderId, '500.00')]),
    tc('Contract: a refund for an unknown order is refused', true, [g.evt('refund.requested', g.order(), '10.00')]),
  ]
  return [...visible, ...hidden]
}

// ------------------------------------------------------------------ harness
const summarize = (db: Db, statuses: number[]): Summary => ({
  statuses, ledgerCount: db.ledger.length,
  ledgerPaise: db.ledger.reduce((n, e) => n + e.paise, 0), refundedPaise: db.refunds.reduce((n, e) => n + e.paise, 0),
})
const same = (a: Summary, b: Summary) => a.ledgerCount === b.ledgerCount && a.ledgerPaise === b.ledgerPaise && a.refundedPaise === b.refundedPaise
  && a.statuses.length === b.statuses.length && a.statuses.every((s, i) => s === b.statuses[i])

export type Loader = (code: string) => Handler | null
const loadDefault: Loader = (code) =>
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function(`"use strict";\n${code}\n;return typeof handleWebhook === 'function' ? handleWebhook : null`)() as Handler | null

const references = new WeakMap<Loader, Handler>()
function expectFor(evs: WebhookEvent[], load: Loader): Summary {
  if (!references.has(load)) references.set(load, load(REFERENCE)!)
  const reference = references.get(load)
  const db: Db = { ledger: [], processed: new Set(), refunds: [] }
  return summarize(db, evs.map((e) => reference!({ ...e }, db)!.status))
}

/** Run learner code against cases. `load` lets the server compile inside an isolated context. */
export function runSuite(code: string, cases: TestCase[], load: Loader = loadDefault): TestResult[] {
  let fn: Handler | null
  try { fn = load(code) } catch (e) {
    return cases.map((c) => ({ name: c.name, hidden: c.hidden, pass: false, error: `The code does not run: ${(e as Error).message}` }))
  }
  if (typeof fn !== 'function') return cases.map((c) => ({ name: c.name, hidden: c.hidden, pass: false, error: 'Keep a function named handleWebhook(event, db).' }))
  return cases.map((c) => {
    const db: Db = { ledger: [], processed: new Set(), refunds: [] }
    try {
      const statuses = c.events.map((e) => Number(fn!({ ...e }, db)?.status))
      const got = summarize(db, statuses)
      const pass = same(got, c.expect)
      return c.hidden ? { name: c.name, hidden: true, pass } : { name: c.name, hidden: false, pass, got, expect: c.expect }
    } catch (e) {
      return { name: c.name, hidden: c.hidden, pass: false, error: c.hidden ? 'Threw an error' : `Threw: ${(e as Error).message}` }
    }
  })
}

export function incidentLog(v: VariantId, seed: number): string[] {
  const c = testCases(v, seed).find((t) => !t.hidden && t.name !== 'A captured payment is credited once')!
  const e = c.events
  const t = (s: number) => `12:${String(4 + s).padStart(2, '0')}:${String((seed + s * 7) % 60).padStart(2, '0')}`
  const post = (ev: WebhookEvent, s: number, note = '') => `${t(s)} POST /webhooks/gateway ${ev.id} ${ev.type} order=${ev.orderId} amount=${ev.amount} → 200${note}`
  if (v === 'duplicate') return [post(e[0], 0), `${t(0)} ledger credit ${e[0].orderId} ${Math.round(Number(e[0].amount) * 100)}`,
    post(e[1], 1, '  (gateway retry: earlier response timed out)'), `${t(1)} ledger credit ${e[1].orderId} ${Math.round(Number(e[1].amount) * 100)}`,
    `${t(9)} ALERT reconciliation: ${e[0].orderId} credited 2× vs 1 capture at the gateway`]
  if (v === 'units') return [post(e[0], 0), `${t(0)} ledger credit ${e[0].orderId} ${Number(e[0].amount) * 100}`,
    `${t(9)} ALERT settlement export: ledger amount for ${e[0].orderId} is not a whole number of paise`]
  if (v === 'failed') return [post(e[0], 0), `${t(0)} ledger credit ${e[0].orderId} ${Math.round(Number(e[0].amount) * 100)}`,
    `${t(3)} warehouse: ${e[0].orderId} released for dispatch (status PAID)`, `${t(9)} ALERT gateway reports ${e[0].orderId} as DECLINED`]
  return [post(e[0], 0), `${t(0)} ledger credit ${e[0].orderId} 29900`, post(e[1], 2), `${t(2)} refund recorded ${e[1].orderId} 299000`,
    `${t(9)} ALERT ${e[1].orderId} refunded ₹2,990.00 against a ₹299.00 capture`]
}

export const validCode = (code: unknown): code is string => typeof code === 'string' && code.length > 20 && code.length < 12_000
