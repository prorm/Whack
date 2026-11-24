import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useDelivery } from '../Chrome'
import { deviceToken, getJournal, recordSync, useJournal, type ReviewReceipt } from './journal'

type SyncState = 'idle' | 'syncing' | 'unavailable' | 'synced'
const Ctx = createContext<{ status: SyncState; pending: number; sync: () => Promise<boolean> }>({
  status: 'idle', pending: 0, sync: async () => false,
})

export async function request<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + deviceToken() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    throw new Error(detail?.error ?? 'The server is unavailable. Your work is saved on this device.')
  }
  return response.json()
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { online } = useDelivery()
  const { events, submissions, ack } = useJournal()
  const pending = events.filter((e) => !ack.has(e.id)).length + submissions.filter((s) => !ack.has(s.id)).length
  const [status, setStatus] = useState<SyncState>('idle')
  const active = useRef<Promise<boolean> | null>(null)
  const sync = useCallback(() => {
    if (active.current) return active.current
    if (!navigator.onLine) return Promise.resolve(false)
    const work = async () => {
      setStatus('syncing')
      while (true) {
        const latest = getJournal()
        const learning = latest.events.filter((event) => !latest.ack.has(event.id)).slice(0, 50)
        const submissions = latest.submissions.filter((item) => !latest.ack.has(item.id)).slice(0, 25)
        if (learning.length === 0 && submissions.length === 0) {
          setStatus('synced')
          return true
        }
        const result = await request<{ ack: string[] }>('/api/sync', { learning, submissions })
        if (!Array.isArray(result.ack) || result.ack.length !== learning.length + submissions.length) throw new Error('Incomplete sync')
        recordSync(result.ack, [])
      }
    }
    active.current = work().catch(() => { setStatus('unavailable'); return false }).finally(() => { active.current = null })
    return active.current
  }, [])

  useEffect(() => {
    if (!online || !pending) return
    const initial = setTimeout(() => void sync(), 350)
    const retry = setInterval(() => void sync(), 15_000)
    const onFocus = () => { if (document.visibilityState === 'visible') void sync() }
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      clearTimeout(initial)
      clearInterval(retry)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [online, pending, sync])

  return <Ctx.Provider value={{ status, pending, sync }}>{children}</Ctx.Provider>
}

export function useSync() { return useContext(Ctx) }
export function saveReceipt(receipt: ReviewReceipt) { recordSync([], [receipt]) }
