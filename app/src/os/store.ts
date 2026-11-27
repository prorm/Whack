// Device-local state for the capability layer: published demand, live requirement changes, skills a learner
// says they already have, and which organizations a learner chose to share evidence with. All DEMO, all on
// this device; nothing here is sent anywhere.
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { statusOf } from '../flux/passport.ts'
import { usePassport } from '../flux/passportStore.ts'
import { RECORDS_KEY, capableRequest, type ProofItem } from '../capable/client.ts'
import type { Requirement } from './compiler.ts'
import { SEED_REQUIREMENTS } from './market.ts'
import { evidenceFrom, type ReceiptLike } from './evidence.ts'

interface OsState { added: Requirement[]; changes: Record<string, string>; declared: string[]; shared: Record<string, number> }
const KEY = 'capable:os:v1'
const empty: OsState = { added: [], changes: {}, declared: [], shared: {} }
let state: OsState = (() => { try { return { ...empty, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return empty } })()
const subs = new Set<() => void>()
function set(next: Partial<OsState>) {
  state = { ...state, ...next }
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* private mode: keep the session usable */ }
  subs.forEach((f) => f())
}
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }

export function useOs() {
  const s = useSyncExternalStore(subscribe, () => state)
  const reqs = useMemo(() => [...SEED_REQUIREMENTS, ...s.added].map((r) => s.changes[r.id] ? { ...r, change: s.changes[r.id] } : r), [s.added, s.changes])
  return {
    s, reqs,
    publish: (r: Requirement) => set({ added: [...state.added.filter((x) => x.id !== r.id), r] }),
    remove: (id: string) => set({ added: state.added.filter((x) => x.id !== id) }),
    change: (reqId: string, text: string | null) => {
      const changes = { ...state.changes }
      if (text) changes[reqId] = text; else delete changes[reqId]
      set({ changes })
    },
    declare: (id: string, on: boolean) => set({ declared: on ? [...new Set([...state.declared, id])] : state.declared.filter((x) => x !== id) }),
    share: (orgId: string, on: boolean) => {
      const shared = { ...state.shared }
      if (on) shared[orgId] = Date.now(); else delete shared[orgId]
      set({ shared })
    },
    reset: () => set(empty),
  }
}

/** Signed lab receipts: the server is the source of truth, the device keeps a copy for offline use. */
let receipts: ProofItem[] = (() => { try { return JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]') } catch { return [] } })()
const rsubs = new Set<() => void>()
export function setReceipts(items: ProofItem[]) {
  receipts = items
  try { localStorage.setItem(RECORDS_KEY, JSON.stringify(items.slice(0, 40))) } catch { /* ignore */ }
  rsubs.forEach((f) => f())
}
export function addReceipt(item: ProofItem) {
  if (!receipts.some((x) => x.receipt.record.id === item.receipt.record.id)) setReceipts([item, ...receipts])
}
let synced = false
export function useReceipts() {
  const items = useSyncExternalStore((f) => { rsubs.add(f); return () => { rsubs.delete(f) } }, () => receipts)
  useEffect(() => {
    if (synced || !navigator.onLine) return
    synced = true
    capableRequest<{ records: ProofItem[] }>('records', {}).then((r) => { if (r.records.length || !receipts.length) setReceipts(r.records) }, () => { synced = false })
  }, [])
  return items
}

const asLike = (i: ProofItem): ReceiptLike => {
  const r = i.receipt.record as unknown as ReceiptLike & { variant?: string; report?: string }
  return { kind: r.kind, passed: r.passed, at: r.at, variant: r.variant, report: r.report }
}

/** Every proof source, folded into one capability evidence map. */
export function useEvidence() {
  const pp = usePassport()
  const items = useReceipts()
  return useMemo(() => evidenceFrom((id) => statusOf(pp.s.records, id), items.map(asLike)), [pp.s.records, items])
}
