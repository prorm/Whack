// FLUX device-local state. Memory, bets and episode progress live only on this device.
import { useCallback, useSyncExternalStore } from 'react'
import type { Domain, Submission } from './community.ts'
import { DAY, emptyMemory, review, type Memory } from './memory.ts'

export interface Bet { episode: string; choice: string; confidence: number; correct?: boolean; at: number }
export interface FluxState {
  memory: Memory
  warpMs: number
  bets: Bet[]
  episodes: Record<string, { step: number; done?: boolean }>
  answered: Record<string, { correct: boolean; at: number; sessionId: string }> // reel answers, for the "why" rail
  proofs: Partial<Record<Domain, number>> // when an unseen work order was beaten in this domain
  vouches: Partial<Record<Domain, string>> // master id that vouched (DEMO)
  teamFlags: { reelId: string; claim: string; evidence: string; at: number }[] // challenges on FLUX originals
}
const KEY = 'scrollproof:flux:v1'
const blank = (): FluxState => ({ memory: emptyMemory(), warpMs: 0, bets: [], episodes: {}, answered: {}, proofs: {}, vouches: {}, teamFlags: [] })

let state: FluxState = load()
const subs = new Set<() => void>()
function load(): FluxState {
  try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return blank() }
}
function set(next: FluxState) {
  state = next
  localStorage.setItem(KEY, JSON.stringify(next))
  subs.forEach((f) => f())
}
addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); subs.forEach((f) => f()) } })

/** One "session" = one app load. Time warp starts a new session too, so callback reels can surface in the demo. */
function sessionId() {
  let s = sessionStorage.getItem('flux:session')
  if (!s) { s = 's-' + Math.random().toString(36).slice(2, 8); sessionStorage.setItem('flux:session', s) }
  return s
}

export function useFlux() {
  const s = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => state)
  const now = useCallback(() => Date.now() + state.warpMs, [])
  const grade = useCallback((concept: string, correct: boolean, reelId?: string) => {
    const t = Date.now() + state.warpMs
    const sid = sessionId()
    set({
      ...state, memory: review(state.memory, concept, correct, t, sid, reelId),
      answered: reelId ? { ...state.answered, [reelId]: { correct, at: t, sessionId: sid } } : state.answered,
    })
  }, [])
  const warp = useCallback((days: number) => {
    sessionStorage.setItem('flux:session', 's-' + Math.random().toString(36).slice(2, 8))
    set({ ...state, warpMs: state.warpMs + days * DAY })
  }, [])
  const placeBet = useCallback((b: Bet) => set({ ...state, bets: [...state.bets.filter((x) => x.episode !== b.episode), b] }), [])
  const settleBet = useCallback((episode: string, correct: boolean) =>
    set({ ...state, bets: state.bets.map((b) => b.episode === episode ? { ...b, correct } : b) }), [])
  const setStep = useCallback((episode: string, step: number, done?: boolean) =>
    set({ ...state, episodes: { ...state.episodes, [episode]: { step, done: done || state.episodes[episode]?.done } } }), [])
  const reset = useCallback(() => { sessionStorage.removeItem('flux:session'); set(blank()); setScars([]) }, [])
  const prove = useCallback((d: Domain) => set({ ...state, proofs: { ...state.proofs, [d]: state.proofs[d] ?? Date.now() } }), [])
  const vouch = useCallback((d: Domain, master: string) => set({ ...state, vouches: { ...state.vouches, [d]: master } }), [])
  const flagOriginal = useCallback((f: FluxState['teamFlags'][number]) => set({ ...state, teamFlags: [...state.teamFlags, f] }), [])
  return { s, now, grade, warp, placeBet, settleBet, setStep, reset, prove, vouch, flagOriginal, sessionId: sessionId() }
}

// ---------------------------------------------------------------- Field Scars (photos are data URLs: own key, own quota)
const SCARS = 'scrollproof:flux:scars:v1'
let scars: Submission[] = loadScars()
const scarSubs = new Set<() => void>()
function loadScars(): Submission[] { try { return JSON.parse(localStorage.getItem(SCARS) ?? '[]') } catch { return [] } }
/** Returns false when the device is out of storage. */
export function setScars(next: Submission[]): boolean {
  try { localStorage.setItem(SCARS, JSON.stringify(next)) } catch { return false }
  scars = next
  scarSubs.forEach((f) => f())
  return true
}
addEventListener('storage', (e) => { if (e.key === SCARS) { scars = loadScars(); scarSubs.forEach((f) => f()) } })
export function useScars() {
  const list = useSyncExternalStore((f) => { scarSubs.add(f); return () => scarSubs.delete(f) }, () => scars)
  const update = useCallback((id: string, fn: (s: Submission) => Submission) => setScars(scars.map((x) => x.id === id ? fn(x) : x)), [])
  const add = useCallback((s: Submission) => setScars([s, ...scars]), [])
  return { scars: list, update, add }
}
