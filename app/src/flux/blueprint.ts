// Lab Blueprints: a practitioner fills a JSON blueprint, FLUX compiles a full playable episode.
// Maths lives in a tiny whitelisted expression language (no eval). A blueprint cannot publish until its own
// test cases pass: the code gate.

// ---------------------------------------------------------------- expressions
type Tok = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string }
const FNS: Record<string, (...a: number[]) => number> = {
  floor: Math.floor, ceil: Math.ceil, round: Math.round, abs: Math.abs, min: Math.min, max: Math.max,
  r2: (x) => Math.round(x * 100) / 100,
}
function lex(src: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) { i++; continue }
    if (/[0-9.]/.test(c)) { let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++; out.push({ t: 'num', v: parseFloat(src.slice(i, j)) }); i = j; continue }
    if (/[A-Za-z_]/.test(c)) { let j = i; while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++; out.push({ t: 'id', v: src.slice(i, j) }); i = j; continue }
    const two = src.slice(i, i + 2)
    if (['<=', '>=', '==', '!=', '&&', '||'].includes(two)) { out.push({ t: 'op', v: two }); i += 2; continue }
    if ('+-*/()<>,!?:'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue }
    throw new Error(`Unexpected "${c}" in expression`)
  }
  return out
}
/** Evaluate with precedence: ?: < || < && < comparisons < + - < * / < unary. Booleans are 1 / 0. */
export function evaluate(src: string, vars: Record<string, number>): number {
  const tk = lex(src)
  let p = 0
  const peek = () => tk[p], eat = (v?: string) => { const t = tk[p++]; if (!t || (v && t.v !== v)) throw new Error(`Expected ${v ?? 'token'} in "${src}"`); return t }
  const isOp = (v: string) => peek()?.t === 'op' && peek()!.v === v
  const ternary = (): number => { const c = or(); if (isOp('?')) { eat('?'); const a = ternary(); eat(':'); const b = ternary(); return c ? a : b } return c }
  const or = (): number => { let v = and(); while (isOp('||')) { eat(); const r = and(); v = v || r ? 1 : 0 } return v }
  const and = (): number => { let v = cmp(); while (isOp('&&')) { eat(); const r = cmp(); v = v && r ? 1 : 0 } return v }
  const cmp = (): number => {
    let v = add()
    while (peek()?.t === 'op' && ['<', '>', '<=', '>=', '==', '!='].includes(peek()!.v as string)) {
      const o = eat().v, r = add()
      v = (o === '<' ? v < r : o === '>' ? v > r : o === '<=' ? v <= r : o === '>=' ? v >= r : o === '==' ? Math.abs(v - r) < 1e-9 : Math.abs(v - r) >= 1e-9) ? 1 : 0
    }
    return v
  }
  const add = (): number => { let v = mul(); while (isOp('+') || isOp('-')) { const o = eat().v; const r = mul(); v = o === '+' ? v + r : v - r } return v }
  const mul = (): number => { let v = un(); while (isOp('*') || isOp('/')) { const o = eat().v; const r = un(); v = o === '*' ? v * r : v / r } return v }
  const un = (): number => { if (isOp('-')) { eat(); return -un() } if (isOp('!')) { eat(); return un() ? 0 : 1 } return atom() }
  const atom = (): number => {
    const t = eat()
    if (t.t === 'num') return t.v
    if (t.t === 'op' && t.v === '(') { const v = ternary(); eat(')'); return v }
    if (t.t === 'id') {
      if (isOp('(')) {
        const fn = Object.hasOwn(FNS, t.v) ? FNS[t.v] : undefined; if (!fn) throw new Error(`Unknown function ${t.v}`)
        eat('('); const args = [ternary()]; while (isOp(',')) { eat(); args.push(ternary()) } eat(')')
        return fn(...args)
      }
      if (!Object.hasOwn(vars, t.v)) throw new Error(`Unknown name "${t.v}"`)
      return vars[t.v]
    }
    throw new Error(`Unexpected "${t.v}"`)
  }
  const v = ternary()
  if (p !== tk.length) throw new Error(`Trailing tokens in "${src}"`)
  return v
}

// ---------------------------------------------------------------- the Threshold & Gauge blueprint
export interface Input { id: string; label: string; min: number; max: number; step: number; start: number; kind?: 'slider' | 'toggle' | 'clock'; unit?: string; lock?: boolean }
export interface Zone { id: string; upTo: number | null; label: string; tone: 'idle' | 'ok' | 'warn' | 'bad' }
export interface Mission { id: string; title: string; goal: string; hint: string; win: string; when: string; sweep?: boolean; start?: Record<string, number>; lock?: string[] }
export interface Blueprint {
  id: string; template: 'threshold_gauge'; title: string; track: string; minutes: number; concept: string
  author: { name: string; role: string; demo: boolean }
  media: { poster: string; video?: string; voOpen?: string; voRule?: string; voWin?: string }
  open: { stamp: string; sub: string; lines: string[] }
  bet: { q: string; options: { id: string; label: string; icon: string }[]; answer: string; explain: string[] }
  constants: Record<string, number>
  inputs: Input[]
  derived: { id: string; expr: string; label?: string; unit?: string; show?: boolean }[]
  gauge: { value: string; limit: string; max: number; unit: string; label: string; stack?: { id: string; label: string }[] }
  zones: Zone[]
  sweep: { input: string; from: number; to: number; step: number }
  sweepLabel?: string
  missions: Mission[]
  rule: { q: string; options: { t: string; ok?: boolean; why?: string }[]; explain: string }
  work: { vary: Record<string, number[]>; givens: { id: string; label: string; unit: string }[]; ask: { id: string; label: string; expr: string; unit: string }[]; valid: string; story: string }
  tests: { name: string; inputs: Record<string, number>; expect: Record<string, number> }[]
}

export function compute(bp: Blueprint, inputs: Record<string, number>, overrides: Record<string, number> = {}) {
  const vars: Record<string, number> = { ...bp.constants, ...overrides }
  for (const i of bp.inputs) vars[i.id] = inputs[i.id] ?? i.start
  for (const d of bp.derived) vars[d.id] = evaluate(d.expr, vars)
  vars.gauge = evaluate(bp.gauge.value, vars)
  vars.limit = evaluate(bp.gauge.limit, vars)
  return vars
}
export function zoneOf(bp: Blueprint, v: number, limit: number): Zone {
  for (const z of bp.zones) if (z.upTo === null || v <= z.upTo * limit + 1e-9) return z
  return bp.zones[bp.zones.length - 1]
}
/** Sweep one input (the clock) across its range; returns the peak gauge value and when it happened. */
export function sweep(bp: Blueprint, inputs: Record<string, number>) {
  let peak = -Infinity, at = bp.sweep.from
  for (let x = bp.sweep.from; x <= bp.sweep.to + 1e-9; x += bp.sweep.step) {
    const v = compute(bp, { ...inputs, [bp.sweep.input]: x }).gauge
    if (v > peak) { peak = v; at = x }
  }
  return { peak, at }
}
export function missionWon(bp: Blueprint, m: Mission, inputs: Record<string, number>, swept?: { peak: number; at: number }) {
  if (m.sweep && !swept) return false
  const vars = compute(bp, inputs)
  return !!evaluate(m.when, { ...vars, peak: swept?.peak ?? vars.gauge, peakAt: swept?.at ?? 0 })
}

/** The code gate: every assertion must hold (to 2 decimals) before the blueprint can be played. */
export function runTests(bp: Blueprint) {
  return bp.tests.map((t) => {
    try {
      const v = compute(bp, t.inputs)
      const fails = Object.entries(t.expect).filter(([k, e]) => Math.abs(Math.round(v[k] * 100) / 100 - e) > 1e-9).map(([k, e]) => `${k}: expected ${e}, got ${Math.round(v[k] * 100) / 100}`)
      return { name: t.name, ok: fails.length === 0, detail: fails.join('; ') }
    } catch (e) { return { name: t.name, ok: false, detail: String(e) } }
  })
}
/** Static checks a blueprint must pass to be accepted at all. */
export function lintBlueprint(bp: Blueprint): string[] {
  const e: string[] = []
  if (bp.template !== 'threshold_gauge') e.push('Unknown template')
  if (bp.tests.length < 3) e.push('At least three test cases')
  if (bp.rule.options.filter((o) => o.ok).length !== 1) e.push('Rule check needs exactly one correct option')
  if (!bp.bet.options.some((o) => o.id === bp.bet.answer)) e.push('Bet answer is not an option')
  if (bp.missions.length < 2) e.push('At least two missions')
  try { compute(bp, {}) } catch (x) { e.push(`Expressions: ${String(x)}`) }
  for (const m of bp.missions) { try { evaluate(m.when, { ...compute(bp, {}), peak: 0, peakAt: 0 }) } catch (x) { e.push(`Mission ${m.id}: ${String(x)}`) } }
  return e
}

function rng(seed: number) { let x = (seed ^ 0x2545f491) >>> 0; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296 } }
/** An unseen variant: pick values from `vary` until the blueprint's `valid` expression holds. */
export function workVariant(bp: Blueprint, seed: number) {
  const r = rng(seed)
  for (let tries = 0; tries < 200; tries++) {
    const o: Record<string, number> = {}
    for (const [k, vals] of Object.entries(bp.work.vary)) o[k] = vals[Math.floor(r() * vals.length)]
    const vars = { ...bp.constants, ...o }
    const isHome = Object.entries(o).every(([k, v]) => bp.constants[k] === v)
    if (!isHome && evaluate(bp.work.valid, vars)) {
      const key = Object.fromEntries(bp.work.ask.map((a) => [a.id, evaluate(a.expr, vars)]))
      return { givens: o, key, id: `WO-${bp.id.toUpperCase()}-${1000 + (seed % 9000)}` }
    }
  }
  throw new Error('No valid variant: widen work.vary')
}
