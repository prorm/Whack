// Device-local store for the Proof Passport, shares, the learner's goal and the DEMO employer workspace.
// Rules live in passport.ts / skills.ts; this file only persists.
import { useCallback, useSyncExternalStore } from 'react'
import EV_JSON from './blueprints/ev_charger.json'
import type { Blueprint } from './blueprint'
import { makeTask, type Task } from './assess'
import { attachReview, grant, makeRecord, revoke, type EvidenceRecord, type Review, type Share } from './passport'
import { SEED_JOBS, type CompetencyId, type Job } from './skills'
import { DAY, emptyMemory, review } from './memory'

export const EV_BP = EV_JSON as unknown as Blueprint
export const taskFor = (assessmentId: string, seed: number): Task => makeTask(assessmentId, seed, EV_BP)

export interface Invite { id: string; jobId: string; candidateId: string; slot: string; note: string; at: number; status: 'sent' | 'accepted' | 'declined' }
export interface PassportState {
  records: EvidenceRecord[]
  shares: Share[]
  goal?: string
  jobs: Job[]
  shortlist: Record<string, string[]>
  invites: Invite[]
  learnerName: string
}
const KEY = 'scrollproof:passport:v1'
const blank = (): PassportState => ({ records: [], shares: [], jobs: [], shortlist: {}, invites: [], learnerName: 'You (this device)' })
let state: PassportState = load()
const subs = new Set<() => void>()
function load(): PassportState { try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return blank() } }
function set(next: PassportState) { state = next; localStorage.setItem(KEY, JSON.stringify(next)); subs.forEach((f) => f()) }
addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); subs.forEach((f) => f()) } })

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
export const allJobs = (s: PassportState) => [...s.jobs, ...SEED_JOBS]

export function usePassport() {
  const s = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => state)
  /** Grade + seal + store. Returns the record. */
  const submit = useCallback((task: Task, response: Record<string, string>, note?: string) => {
    const r = makeRecord(task, response, Date.now(), uid('att'), 'live', note)
    set({ ...state, records: [...state.records, r] })
    return r
  }, [])
  const review = useCallback((recordId: string, v: Omit<Review, 'attemptId' | 'fingerprint'>) => {
    const r = state.records.find((x) => x.id === recordId)
    if (!r) throw new Error('Record not found')
    const next = attachReview(r, v)
    set({ ...state, records: state.records.map((x) => x.id === recordId ? next : x) })
  }, [])
  const share = useCallback((employerId: string, recordIds: string[], token?: string) => {
    set({ ...state, shares: grant(state.shares, { id: uid('sh'), employerId, recordIds, at: Date.now(), token }) })
  }, [])
  const unshare = useCallback((id: string) => set({ ...state, shares: revoke(state.shares, id, Date.now()) }), [])
  const setGoal = useCallback((goal?: string) => set({ ...state, goal }), [])
  const addJob = useCallback((j: Omit<Job, 'id' | 'demo' | 'createdBy'>) => { const job: Job = { ...j, id: uid('job'), demo: true, createdBy: 'employer' }; set({ ...state, jobs: [job, ...state.jobs] }); return job }, [])
  const toggleShortlist = useCallback((jobId: string, cand: string) => {
    const cur = state.shortlist[jobId] ?? []
    set({ ...state, shortlist: { ...state.shortlist, [jobId]: cur.includes(cand) ? cur.filter((x) => x !== cand) : [...cur, cand] } })
  }, [])
  const invite = useCallback((i: Omit<Invite, 'id' | 'at' | 'status'>) => set({ ...state, invites: [...state.invites.filter((x) => !(x.jobId === i.jobId && x.candidateId === i.candidateId)), { ...i, id: uid('inv'), at: Date.now(), status: 'sent' }] }), [])
  const answerInvite = useCallback((id: string, status: Invite['status']) => set({ ...state, invites: state.invites.map((x) => x.id === id ? { ...x, status } : x) }), [])
  const reset = useCallback(() => set(blank()), [])
  return { s, submit, review, share, unshare, setGoal, addJob, toggleShortlist, invite, answerInvite, reset }
}

// ---------------------------------------------------------------- demo seed (reproducible)
/**
 * Demo learner: two attempts produced by the REAL grader from scripted answers, marked source 'demo_seed' and shown as
 * DEMO SEED everywhere. One passes (series), one fails the cold-morning max with the rounded-up mistake, so the
 * goal feed has a repair to show. Nothing is trainer-reviewed or shared.
 */
export function seedDemo(now = Date.now()) {
  const series = taskFor('quick.series', 4242)
  const solar = taskFor('wo.solar-string', 777)
  const records = [
    makeRecord(series, { aV: String(series.key.aV), bI: String(series.key.bI) }, now - 2 * 86_400_000, 'att-demo-series', 'demo_seed'),
    makeRecord(solar, { max: String(solar.key.max + 1), min: String(solar.key.min) }, now - 86_400_000, 'att-demo-solar', 'demo_seed'),
  ]
  set({ ...blank(), records, goal: 'job-solar-apprentice' })
  // lessons 1-4 done, and the concepts they taught are in revision memory (yesterday, so some are due)
  localStorage.setItem('scrollproof:learn:v1', JSON.stringify({ at: {}, done: { l1: now - 3 * DAY, l2: now - 3 * DAY, l3: now - 2 * DAY, l4: now - 2 * DAY }, checks: {} }))
  let m = emptyMemory()
  for (const [c, ok, ago] of [['series', true, 3], ['cold', true, 2], ['maxstring', false, 2], ['minstring', true, 2]] as const) m = review(m, c, ok, now - ago * DAY, 'seed', ok ? undefined : 'mo-cliff')
  localStorage.setItem('scrollproof:flux:v1', JSON.stringify({ memory: m, warpMs: 0, bets: [], episodes: {}, answered: {}, proofs: {}, vouches: {}, teamFlags: [] }))
}
export const resetPassport = () => set(blank())

export type { CompetencyId }
