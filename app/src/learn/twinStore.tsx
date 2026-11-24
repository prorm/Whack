import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { newTwin, replay, type LearnerEvent, type Twin, type TwinProfile } from '../engine/learner.ts'
import { useStore } from '../store'
import { saveLearning, useJournal } from './journal'

export const DEMO_PROFILE: TwinProfile = {
  learnerId: 'demo-learner', synthetic: true, label: 'Learner on this device',
  goal: { conceptId: 'commission_calc', why: 'Check delivery incentives' },
  constraints: { minutesPerSession: 10, connectivity: 'poor' },
  preferences: { language: 'en', modalities: ['worked_example', 'text', 'interactive', 'audio'] },
}

export type NewEvent = LearnerEvent extends infer E ? (E extends LearnerEvent ? Omit<E, 'learnerId' | 'id' | 'at'> & { id?: string; at?: number } : never) : never
interface TwinCtx { twin: Twin; events: LearnerEvent[]; add: (e: NewEvent) => LearnerEvent }
const Ctx = createContext<TwinCtx | null>(null)

export function TwinProvider({ children }: { children: ReactNode }) {
  const { events } = useJournal()
  const { state } = useStore()
  const twin = useMemo(() => {
    const base = replay(newTwin(DEMO_PROFILE), events)
    return { ...base, preferences: { ...base.preferences, language: state.lang } }
  }, [events, state.lang])
  const add = useCallback((e: NewEvent) => {
    const event = { ...e, id: e.id ?? crypto.randomUUID(), at: e.at ?? Date.now(), learnerId: DEMO_PROFILE.learnerId } as LearnerEvent
    saveLearning([event])
    return event
  }, [])
  return <Ctx.Provider value={{ twin, events, add }}>{children}</Ctx.Provider>
}

export function useTwin() {
  const value = useContext(Ctx)
  if (!value) throw new Error('TwinProvider missing')
  return value
}
