// Device-local course progress. Lessons unlock in order; finishing a lesson unlocks its concepts in Revise.
import { useCallback, useSyncExternalStore } from 'react'

export interface CourseState {
  /** step index reached per lesson */
  at: Record<string, number>
  done: Record<string, number>
  /** first-try results on checks: key = lessonId:stepIndex[:problem] */
  checks: Record<string, boolean>
  project?: { recordId: string; at: number; note: string }
}
const KEY = 'scrollproof:learn:v1'
const blank = (): CourseState => ({ at: {}, done: {}, checks: {} })
let state: CourseState = load()
const subs = new Set<() => void>()
function load(): CourseState { try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return blank() } }
function set(next: CourseState) { state = next; localStorage.setItem(KEY, JSON.stringify(next)); subs.forEach((f) => f()) }
addEventListener('storage', (e) => { if (e.key === KEY) { state = load(); subs.forEach((f) => f()) } })

export function useCourse() {
  const s = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => state)
  const reach = useCallback((lesson: string, step: number) => { if ((state.at[lesson] ?? 0) < step) set({ ...state, at: { ...state.at, [lesson]: step } }) }, [])
  const finish = useCallback((lesson: string) => set({ ...state, done: { ...state.done, [lesson]: state.done[lesson] ?? Date.now() } }), [])
  const check = useCallback((key: string, ok: boolean) => { if (!(key in state.checks)) set({ ...state, checks: { ...state.checks, [key]: ok } }) }, [])
  const saveProject = useCallback((p: CourseState['project']) => set({ ...state, project: p }), [])
  const reset = useCallback(() => set(blank()), [])
  return { s, reach, finish, check, saveProject, reset }
}
export const resetCourse = () => set(blank())
export function completeAllForDemo(ids: string[]) { set({ ...state, done: Object.fromEntries(ids.map((id) => [id, Date.now()])) }) }
