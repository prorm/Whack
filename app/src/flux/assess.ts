// Assessment graders. Pure, seeded, and importable by both the app and the server (scripts/capable_server.mjs),
// so a shared proof link carries a grade the server recomputed from the seed and the learner's raw response.
import { MISCONCEPTIONS, PANELS, diagnoseMax, diagnoseMin, vmpAt, vocAt, workOrder, type Panel } from './physics.ts'
import { workVariant, type Blueprint } from './blueprint.ts'

export interface Given { label: string; value: string }
export interface Ask { id: string; label: string; unit: string }
export interface Task {
  assessmentId: string
  version: number
  seed: number
  label: string
  story: string
  givens: Given[]
  asks: Ask[]
  key: Record<string, number>
  /** The worked solution, shown after grading. */
  working: string[]
  tolerance: number
}
export interface Graded {
  pass: boolean
  perAsk: Record<string, boolean>
  /** Named wrong methods, keyed by ask id. */
  misconceptions: Record<string, string>
}

/** Spread nearby seeds apart (consecutive seeds must not give near-identical tasks). */
export const mix = (seed: number) => { let h = Math.imul((seed >>> 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; return (h ^ (h >>> 16)) >>> 0 || 1 }
function rng(seed: number) {
  let x = mix(seed)
  return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296 }
}
const r2 = (x: number) => Math.round(x * 100) / 100
const pick = <T,>(r: () => number, xs: readonly T[]) => xs[Math.floor(r() * xs.length)]
const num = (s: string | undefined) => { const n = parseFloat(String(s ?? '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : NaN }

export const MISCONCEPTION_TEXT: Record<string, { title: string; repair: string }> = {
  swapped_rule: { title: 'Swapped the series and parallel rules', repair: 'Series: volts add, current stays. Parallel: current adds, volts stay.' },
  added_both: { title: 'Added both voltage and current', repair: 'Only one of them adds. Power can grow, but not both volts and amps from the same wiring.' },
  no_dedupe: { title: 'Counted every delivery, including retries', repair: 'Webhooks arrive at least once. Each event ID is credited once; repeats are skipped.' },
  linear: { title: 'Grew the delay linearly', repair: 'Exponential backoff doubles each time: base × 2^(attempt − 1).' },
  ignored_cap: { title: 'Ignored the cap', repair: 'Backoff stops growing at the cap, so late retries wait exactly the cap.' },
  off_by_one: { title: 'Doubled once too often', repair: 'The first retry waits the base delay: base × 2^0.' },
}

// ---------------------------------------------------------------- quick.series
function seriesTask(seed: number): Task {
  const r = rng(seed)
  const p: Panel = pick(r, PANELS)
  const n = 3 + Math.floor(r() * 6), m = 2 + Math.floor(r() * 4)
  return {
    assessmentId: 'quick.series', version: 1, seed, label: `SP-${(seed % 9000) + 1000}`,
    story: 'A crew is wiring two arrays on the same roof. Use the working-point values from the datasheet (DEMO).',
    givens: [{ label: 'Panel', value: `${p.name} · Vmp ${p.vmp} V · Imp ${p.imp} A` }, { label: 'String A', value: `${n} panels in SERIES` }, { label: 'Bank B', value: `${m} panels in PARALLEL` }],
    asks: [{ id: 'aV', label: 'String A voltage', unit: 'V' }, { id: 'bI', label: 'Bank B current', unit: 'A' }],
    key: { aV: r2(n * p.vmp), bI: r2(m * p.imp), _aWrong: r2(p.vmp), _bWrong: r2(p.imp), _n: n, _m: m },
    working: [`Series adds volts: ${n} × ${p.vmp} = ${r2(n * p.vmp)} V (current stays ${p.imp} A)`, `Parallel adds current: ${m} × ${p.imp} = ${r2(m * p.imp)} A (voltage stays ${p.vmp} V)`],
    tolerance: 0.05,
  }
}

// ---------------------------------------------------------------- quick.idempotency
function idemTask(seed: number): Task {
  const r = rng(seed)
  const uniq = 3 + Math.floor(r() * 3)
  const events = Array.from({ length: uniq }, (_, i) => ({ id: `evt_${(Math.floor(r() * 0xfffff) + i).toString(16)}`, amt: pick(r, [99, 149, 199, 249, 499, 999]) }))
  const log = [...events]
  const dupes = 2 + Math.floor(r() * 3)
  for (let i = 0; i < dupes; i++) log.splice(1 + Math.floor(r() * log.length), 0, pick(r, events))
  const total = events.reduce((s, e) => s + e.amt, 0), naive = log.reduce((s, e) => s + e.amt, 0)
  return {
    assessmentId: 'quick.idempotency', version: 1, seed, label: `WH-${(seed % 9000) + 1000}`,
    story: 'The provider retried some "payment.succeeded" webhooks after timeouts. This is the delivery log in arrival order (DEMO).',
    givens: log.map((e, i) => ({ label: `#${i + 1}`, value: `${e.id} · ₹${e.amt}` })),
    asks: [{ id: 'credits', label: 'Wallet credits to apply', unit: 'credits' }, { id: 'total', label: 'Total to credit', unit: '₹' }],
    key: { credits: uniq, total, _naiveCredits: log.length, _naiveTotal: naive },
    working: [`${log.length} deliveries, ${uniq} unique event IDs → ${uniq} credits`, `Sum each unique event once: ₹${total} (not ₹${naive})`],
    tolerance: 0.001,
  }
}

// ---------------------------------------------------------------- quick.backoff
function backoffTask(seed: number): Task {
  const r = rng(seed)
  const base = pick(r, [0.5, 1, 2]), cap = pick(r, [16, 30, 60])
  const k1 = 3 + Math.floor(r() * 2)
  let k2 = k1 + 3
  while (base * 2 ** (k2 - 1) <= cap) k2++
  const d = (k: number) => Math.min(cap, base * 2 ** (k - 1))
  return {
    assessmentId: 'quick.backoff', version: 1, seed, label: `RB-${(seed % 9000) + 1000}`,
    story: 'Design the client retry schedule for the payment API. Ignore jitter for this check: give the maximum delay (DEMO).',
    givens: [{ label: 'Base delay', value: `${base} s before retry #1` }, { label: 'Growth', value: 'doubles each retry' }, { label: 'Cap', value: `${cap} s` }],
    asks: [{ id: 'early', label: `Delay before retry #${k1}`, unit: 's' }, { id: 'late', label: `Delay before retry #${k2}`, unit: 's' }],
    key: { early: d(k1), late: d(k2), _k1: k1, _k2: k2, _base: base, _cap: cap },
    working: [`Retry #${k1}: ${base} × 2^${k1 - 1} = ${d(k1)} s`, `Retry #${k2}: ${base} × 2^${k2 - 1} = ${base * 2 ** (k2 - 1)} s → capped at ${cap} s`],
    tolerance: 0.001,
  }
}

// ---------------------------------------------------------------- wo.solar-string (wraps physics.ts; raw seed = the episode's own work order)
function solarTask(seed: number): Task {
  const { order: o, key } = workOrder(seed)
  return {
    assessmentId: 'wo.solar-string', version: 1, seed, label: o.id,
    story: 'Residential rooftop, one string per MPPT. Datasheets and site data are DEMO values.',
    givens: [
      { label: 'Site', value: `${o.site.city} · coldest dawn ${o.site.tMin} °C · hottest cell ${o.site.tCellHot} °C` },
      { label: 'Panel', value: `${o.panel.name} · Voc ${o.panel.voc} V (${o.panel.betaVoc}%/°C) · Vmp ${o.panel.vmp} V (${o.panel.betaVmp}%/°C)` },
      { label: 'Inverter', value: `${o.inverter.name} · max ${o.inverter.vmax} V · MPPT ${o.inverter.mpptMin}–${o.inverter.mpptMax} V` },
    ],
    asks: [{ id: 'max', label: 'Max panels per string', unit: 'panels' }, { id: 'min', label: 'Min panels per string', unit: 'panels' }],
    key: { max: key.max, min: key.min },
    working: [
      `Voc at ${o.site.tMin} °C = ${o.panel.voc} × (1 + ${Math.abs(o.panel.betaVoc)}% × ${25 - o.site.tMin}) = ${key.vocCold} V → ⌊${o.inverter.vmax} ÷ ${key.vocCold}⌋ = ${key.max}`,
      `Vmp at ${o.site.tCellHot} °C = ${o.panel.vmp} × (1 − ${Math.abs(o.panel.betaVmp)}% × ${o.site.tCellHot - 25}) = ${key.vmpHot} V → ⌈${o.inverter.mpptMin} ÷ ${key.vmpHot}⌉ = ${key.min}`,
    ],
    tolerance: 0,
  }
}

// ---------------------------------------------------------------- wo.ev-load (wraps the EV blueprint)
export function evTask(bp: Blueprint, seed: number): Task {
  const w = workVariant(bp, seed)
  return {
    assessmentId: 'wo.ev-load', version: 1, seed, label: w.id, story: bp.work.story,
    givens: bp.work.givens.map((g) => ({ label: g.label, value: `${w.givens[g.id]} ${g.unit}` })),
    asks: bp.work.ask.map((a) => ({ id: a.id, label: a.label, unit: a.unit })),
    key: Object.fromEntries(bp.work.ask.map((a) => [a.id, w.key[a.id]])),
    working: bp.work.ask.map((a) => `${a.label}: ${a.expr} = ${w.key[a.id]} ${a.unit}`),
    tolerance: 0.011,
  }
}


// ---------------------------------------------------------------- proj.rooftop (design project, many valid answers)
/** The DEMO project: one roof, one panel, two inverter options. Pure; the server re-grades with the same function. */
export const ROOFTOP = {
  customer: 'Mr. Sharma (DEMO customer)', city: 'Bengaluru', panels: 14, tMin: 8, tCellHot: 70,
  panel: PANELS[0],
  /** dcAcMax: this DEMO project's array-to-inverter sizing limit. */
  inverters: [
    { id: 'A', name: 'GridMitra 5K', acKw: 5, vmax: 600, mpptMin: 120, mpptMax: 550, maxStrings: 2 },
    { id: 'B', name: 'GridMitra 10K', acKw: 10, vmax: 1000, mpptMin: 200, mpptMax: 850, maxStrings: 2 },
  ],
  dcAcMax: 1.3,
}
export interface RoofCheck { id: string; label: string; ok: boolean; detail: string }
/** Every constraint of a design, with the numbers behind it. A design passes when all are true. */
export function checkRoof(inv: number, strings: number, per: number): RoofCheck[] {
  const I = ROOFTOP.inverters[inv]
  const p = ROOFTOP.panel
  if (!I || !Number.isInteger(strings) || !Number.isInteger(per) || strings < 1 || per < 1) return [{ id: 'valid', label: 'A complete design', ok: false, detail: 'Pick an inverter, strings and panels per string.' }]
  const vocCold = vocAt(p, ROOFTOP.tMin), vmpHot = vmpAt(p, ROOFTOP.tCellHot), vmpCold = vmpAt(p, ROOFTOP.tMin)
  const dc = (strings * per * p.pmax) / 1000
  return [
    { id: 'count', label: `Uses all ${ROOFTOP.panels} panels`, ok: strings * per === ROOFTOP.panels, detail: `${strings} × ${per} = ${strings * per} panels` },
    { id: 'inputs', label: `Fits the inverter's ${I.maxStrings} string inputs`, ok: strings <= I.maxStrings, detail: `${strings} string${strings > 1 ? 's' : ''}` },
    { id: 'cold', label: 'Coldest dawn stays below the maximum', ok: per * vocCold < I.vmax, detail: `${per} × ${r2(vocCold)} = ${r2(per * vocCold)} V vs ${I.vmax} V` },
    { id: 'hot', label: 'Hottest afternoon stays awake', ok: per * vmpHot >= I.mpptMin, detail: `${per} × ${r2(vmpHot)} = ${r2(per * vmpHot)} V vs ${I.mpptMin} V` },
    { id: 'window', label: 'Working voltage inside the MPPT window', ok: per * vmpCold <= I.mpptMax, detail: `${per} × ${r2(vmpCold)} = ${r2(per * vmpCold)} V vs ${I.mpptMax} V` },
    { id: 'size', label: `Array not oversized (DC/AC ≤ ${ROOFTOP.dcAcMax}, DEMO rule)`, ok: dc / I.acKw <= ROOFTOP.dcAcMax + 1e-9, detail: `${r2(dc)} kW ÷ ${I.acKw} kW = ${r2(dc / I.acKw)}` },
  ]
}
function roofTask(seed: number): Task {
  const p = ROOFTOP.panel
  return {
    assessmentId: 'proj.rooftop', version: 1, seed, label: 'PRJ-SHARMA-14',
    story: `${ROOFTOP.customer} wants all ${ROOFTOP.panels} panels on his roof in ${ROOFTOP.city}. Choose the inverter and design the strings. Values are DEMO.`,
    givens: [
      { label: 'Panel', value: `${p.name} · ${p.pmax} W · Voc ${p.voc} V (${p.betaVoc}%/°C) · Vmp ${p.vmp} V (${p.betaVmp}%/°C)` },
      { label: 'Site', value: `coldest dawn ${ROOFTOP.tMin} °C · hottest cell ${ROOFTOP.tCellHot} °C` },
      ...ROOFTOP.inverters.map((i) => ({ label: `Inverter ${i.id}`, value: `${i.name} · ${i.acKw} kW · max ${i.vmax} V · MPPT ${i.mpptMin}–${i.mpptMax} V · ${i.maxStrings} strings` })),
    ],
    asks: [{ id: 'inv', label: 'Inverter (0 = A, 1 = B)', unit: '' }, { id: 'strings', label: 'Strings', unit: '' }, { id: 'per', label: 'Panels per string', unit: 'panels' }],
    key: { inv: 1, strings: 1, per: 14 },
    working: ['Inverter A is too small: 14 × 540 W = 7.56 kW is 1.51 × its 5 kW.', 'Inverter B: 1 × 14 or 2 × 7 both pass every check. Max per string at 8 °C = ⌊1000 ÷ 51.88⌋ = 19; min at 70 °C = ⌈200 ÷ 35.05⌉ = 6.'],
    tolerance: 0,
  }
}

const QUICK: Record<string, (seed: number) => Task> = {
  'proj.rooftop': roofTask,
  'quick.series': seriesTask, 'quick.idempotency': idemTask, 'quick.backoff': backoffTask, 'wo.solar-string': solarTask,
}
/** Every non-blueprint task. EV needs its blueprint: use evTask. */
export function makeTask(assessmentId: string, seed: number, bp?: Blueprint): Task {
  if (assessmentId === 'wo.ev-load') { if (!bp) throw new Error('EV task needs its blueprint'); return evTask(bp, seed) }
  const f = QUICK[assessmentId]
  if (!f) throw new Error(`Unknown assessment ${assessmentId}`)
  return f(seed)
}

/** Grade raw text answers. Deterministic. Names a known wrong method when one reproduces the answer. */
export function grade(task: Task, answers: Record<string, string>): Graded {
  const perAsk: Record<string, boolean> = {}
  const misconceptions: Record<string, string> = {}
  for (const a of task.asks) {
    const v = num(answers[a.id])
    perAsk[a.id] = Number.isFinite(v) && Math.abs(v - task.key[a.id]) <= task.tolerance + 1e-9
  }
  if (task.assessmentId === 'proj.rooftop') {
    // a design project has many right answers: every constraint must hold
    const ok = checkRoof(num(answers.inv), num(answers.strings), num(answers.per)).every((c) => c.ok)
    for (const a of task.asks) perAsk[a.id] = ok
    return { pass: ok, perAsk, misconceptions }
  }
  const k = task.key
  const near = (a: string, x: number) => Math.abs(num(answers[a]) - x) <= Math.max(task.tolerance, 0.05)
  if (task.assessmentId === 'quick.series') {
    if (!perAsk.aV && near('aV', k._aWrong)) misconceptions.aV = 'swapped_rule'
    if (!perAsk.bI && near('bI', k._bWrong)) misconceptions.bI = 'swapped_rule'
  }
  if (task.assessmentId === 'quick.idempotency') {
    if (!perAsk.credits && near('credits', k._naiveCredits)) misconceptions.credits = 'no_dedupe'
    if (!perAsk.total && near('total', k._naiveTotal)) misconceptions.total = 'no_dedupe'
  }
  if (task.assessmentId === 'quick.backoff') {
    if (!perAsk.early && near('early', k._base * k._k1)) misconceptions.early = 'linear'
    if (!perAsk.early && near('early', k._base * 2 ** k._k1)) misconceptions.early = 'off_by_one'
    if (!perAsk.late && near('late', k._base * 2 ** (k._k2 - 1))) misconceptions.late = 'ignored_cap'
  }
  if (task.assessmentId === 'wo.solar-string') {
    const { order } = workOrder(task.seed)
    const mx = diagnoseMax(order, num(answers.max)), mn = diagnoseMin(order, num(answers.min))
    if (!perAsk.max && mx) misconceptions.max = mx
    if (!perAsk.min && mn) misconceptions.min = mn
  }
  return { pass: task.asks.every((a) => perAsk[a.id]), perAsk, misconceptions }
}

/** Which competency each ask of an assessment evidences. Multi-competency tasks are graded per part. */
export const ASK_COMPETENCY: Record<string, Record<string, string>> = {
  'quick.series': { aV: 'solar.series', bI: 'solar.series' },
  'proj.rooftop': { inv: 'solar.design', strings: 'solar.design', per: 'solar.design' },
  'wo.solar-string': { max: 'solar.cold-max', min: 'solar.mppt-min' },
  'wo.ev-load': { fixed: 'ev.load', dinner: 'ev.load' },
  'quick.idempotency': { credits: 'pay.idempotency', total: 'pay.idempotency' },
  'quick.backoff': { early: 'pay.backoff', late: 'pay.backoff' },
}

/** Per-competency outcome of one graded attempt: a competency passes only if every ask mapped to it passed. */
export function outcomes(task: Task, g: Graded): Record<string, { pass: boolean; misconceptions: string[] }> {
  const map = ASK_COMPETENCY[task.assessmentId] ?? {}
  const out: Record<string, { pass: boolean; misconceptions: string[] }> = {}
  for (const a of task.asks) {
    const c = map[a.id]
    if (!c) continue
    const o = out[c] ?? { pass: true, misconceptions: [] }
    o.pass = o.pass && g.perAsk[a.id]
    if (g.misconceptions[a.id] && !o.misconceptions.includes(g.misconceptions[a.id])) o.misconceptions.push(g.misconceptions[a.id])
    out[c] = o
  }
  return out
}

/** Title and repair for any named wrong method, from either graders here or physics.ts. */
export function misconception(id: string) {
  return MISCONCEPTION_TEXT[id] ?? (MISCONCEPTIONS as Record<string, { title: string; repair: string }>)[id] ?? { title: id, repair: '' }
}
