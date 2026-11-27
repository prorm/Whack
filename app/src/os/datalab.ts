// DataLab: reconcile a messy payout export against the payment gateway. The learner flags each row that must
// not be paid and says why. Rows and planted problems come from the seed; the answer key is computed by the
// solver below, and the server grades with the same module.

export const DATA_VERSION = 1
export type DataVariant = 'payout' | 'settlement'
export const DATA_VARIANTS: DataVariant[] = ['payout', 'settlement']
export const DATA_PRACTICE: DataVariant = 'payout'
export type Reason = 'duplicate' | 'reversed' | 'mismatch' | 'missing'
export const REASON_LABEL: Record<Reason, string> = {
  duplicate: 'Duplicate of an earlier row', reversed: 'Reversed by the gateway', mismatch: 'Amount differs from gateway', missing: 'No gateway record',
}
export const REASONS_FOR: Record<DataVariant, Reason[]> = { payout: ['duplicate', 'reversed'], settlement: ['duplicate', 'reversed', 'mismatch', 'missing'] }

export interface Row { id: string; rider: string; orderId: string; kind: 'Delivery' | 'Bonus' | 'Tip'; ledger: number; gateway: number | null; status: 'settled' | 'reversed' }
export interface DataAnswer { flagged: Record<string, Reason> }

const RIDERS = ['Asha K.', 'Ravi M.', 'Imran S.', 'Deepa N.', 'Karthik P.']
const rng = (seed: number) => () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 2 ** 32 }

export function ledgerFor(v: DataVariant, seed: number): Row[] {
  const r = rng(seed ^ (v === 'payout' ? 0x5a5a : 0xa5a5))
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1))
  const base: Row[] = Array.from({ length: 12 }, (_, i) => {
    const kind: Row['kind'] = i % 5 === 4 ? 'Bonus' : i % 7 === 6 ? 'Tip' : 'Delivery'
    const amount = kind === 'Bonus' ? int(4, 12) * 25 : kind === 'Tip' ? int(2, 8) * 10 : int(35, 95)
    return { id: '', rider: RIDERS[int(0, RIDERS.length - 1)], orderId: `DD-${int(41000, 48999)}`, kind, ledger: amount, gateway: amount, status: 'settled' }
  })
  // plant problems at seeded positions
  const at = (k: number) => base[(int(0, 11) + k * 5) % base.length]
  const rows = [...base]
  const dup = at(0)
  rows.splice(int(6, 11), 0, { ...dup })
  at(1).status = 'reversed'
  if (v === 'settlement') {
    const m = at(2); if (m.status === 'settled') m.gateway = m.ledger + int(1, 4) * 10
    const miss = at(3); if (miss.status === 'settled' && miss !== m) miss.gateway = null
    if (int(0, 1)) rows.splice(int(2, 8), 0, { ...rows[int(0, 4)] })
  }
  return rows.map((row, i) => ({ ...row, id: `R${String(i + 1).padStart(2, '0')}` }))
}

export function solveData(v: DataVariant, seed: number): DataAnswer {
  const flagged: Record<string, Reason> = {}
  const seen = new Set<string>()
  for (const row of ledgerFor(v, seed)) {
    const key = `${row.orderId}|${row.kind}|${row.ledger}`
    if (seen.has(key)) { flagged[row.id] = 'duplicate'; continue }
    seen.add(key)
    if (row.status === 'reversed') flagged[row.id] = 'reversed'
    else if (v === 'settlement' && row.gateway === null) flagged[row.id] = 'missing'
    else if (v === 'settlement' && row.gateway !== row.ledger) flagged[row.id] = 'mismatch'
  }
  return { flagged }
}

export const payable = (rows: Row[], flagged: Record<string, Reason>) => rows.filter((r) => !flagged[r.id]).reduce((n, r) => n + r.ledger, 0)

export function gradeData(v: DataVariant, seed: number, answer: DataAnswer) {
  const key = solveData(v, seed).flagged
  const given = answer.flagged ?? {}
  const missed = Object.keys(key).filter((id) => !given[id])
  const wrong = Object.keys(given).filter((id) => !key[id])
  const misreason = Object.keys(key).filter((id) => given[id] && given[id] !== key[id])
  const rows = ledgerFor(v, seed)
  return { passed: !missed.length && !wrong.length && !misreason.length, missed: missed.length, wrong: wrong.length, misreason: misreason.length,
    payable: payable(rows, given), correctPayable: payable(rows, key) }
}

export const validDataAnswer = (a: unknown): a is DataAnswer => {
  if (!a || typeof a !== 'object' || !('flagged' in a)) return false
  const f = (a as DataAnswer).flagged
  return !!f && typeof f === 'object' && Object.keys(f).length <= 40 &&
    Object.entries(f).every(([k, r]) => /^R\d{2}$/.test(k) && ['duplicate', 'reversed', 'mismatch', 'missing'].includes(r))
}
/** Verified trials use the harder settlement export the practice never showed. */
export const DATA_VERIFIED: DataVariant = 'settlement'
