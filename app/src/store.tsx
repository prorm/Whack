import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Attempt, CheckId, Evidence, Lang, ProofState, Review } from './domain'
import { SKILL_ID, STOCK, grade, shuffle, uid } from './domain'
import { clearBlobs, deleteBlob } from './mediaDb'
import type { DeliveryMode } from './offline'

const KEY = 'scrollproof:v1'

export interface FeedState {
  /** skill id -> the session in which it was missed */
  missed: Record<string, { sessionId: string; at: number }>
  quizAnswer?: string
  lastIndex: number
}

export interface AppState extends ProofState {
  lang: Lang
  captions: boolean
  delivery: DeliveryMode | 'auto'
  dataSaver: boolean
  feed: FeedState
  pendingOrder?: string[] // shuffled display order for the next work-order attempt
  consentShowEvidence: boolean
  interviewRequests: Record<string, number>
}

const initial = (): AppState => ({
  lang: 'en',
  captions: true,
  delivery: 'auto',
  dataSaver: false,
  feed: { missed: {}, lastIndex: 0 },
  attempts: [],
  evidence: [],
  reviews: [],
  consentShowEvidence: false,
  interviewRequests: {},
})

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...initial(), ...JSON.parse(raw) }
  } catch { /* corrupted storage: start fresh */ }
  return initial()
}

/** A "session" is one tab lifetime. The callback rule only fires in a LATER session. */
export const SESSION_ID: string = (() => {
  const k = 'scrollproof:session'
  let s = sessionStorage.getItem(k)
  if (!s) { s = uid('sess'); sessionStorage.setItem(k, s) }
  return s
})()

function useStoreValue() {
  const [state, setState] = useState<AppState>(load)
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(state)) }, [state])

  const set = useCallback((fn: (s: AppState) => AppState) => setState(fn), [])

  const actions = useMemo(() => ({
    setLang: (lang: Lang) => set((s) => ({ ...s, lang })),
    toggleCaptions: () => set((s) => ({ ...s, captions: !s.captions })),
    setDelivery: (delivery: AppState['delivery']) => set((s) => ({ ...s, delivery })),
    setDataSaver: (dataSaver: boolean) => set((s) => ({ ...s, dataSaver })),
    setFeedIndex: (i: number) => set((s) => (s.feed.lastIndex === i ? s : { ...s, feed: { ...s.feed, lastIndex: i } })),

    answerQuiz: (choice: string, correct: boolean) => set((s) => {
      const missed = { ...s.feed.missed }
      if (correct) delete missed[SKILL_ID]
      else missed[SKILL_ID] = { sessionId: SESSION_ID, at: Date.now() }
      return { ...s, feed: { ...s.feed, quizAnswer: choice, missed } }
    }),
    resetQuiz: () => set((s) => ({ ...s, feed: { ...s.feed, quizAnswer: undefined } })),

    /** Fresh, shuffled bin for the next work order (shuffle happens once per attempt, not per render). */
    ensureOrder: () => set((s) => (s.pendingOrder ? s : { ...s, pendingOrder: shuffle(STOCK.map((x) => x.sku)) })),

    submitAttempt: (selectedSku: string, checks: CheckId[], displayOrder: string[]): Attempt => {
      const a: Attempt = { id: uid('att'), at: Date.now(), displayOrder, selectedSku, checks, result: grade(selectedSku, checks) }
      // A new attempt detaches any previous evidence: proof never carries over between attempts.
      set((s) => ({ ...s, attempts: [...s.attempts, a], currentAttemptId: a.id, currentEvidenceId: undefined, pendingOrder: undefined }))
      return a
    },

    attachEvidence: (ev: Omit<Evidence, 'id' | 'at' | 'attemptId'>) => set((s) => {
      if (!s.currentAttemptId) return s
      const old = s.evidence.find((e) => e.id === s.currentEvidenceId)
      if (old?.mediaKey) void deleteBlob(old.mediaKey)
      const e: Evidence = { ...ev, id: uid('ev'), at: Date.now(), attemptId: s.currentAttemptId }
      return { ...s, evidence: [...s.evidence, e], currentEvidenceId: e.id }
    }),

    addReview: (r: Omit<Review, 'id' | 'at'>) => set((s) => ({ ...s, reviews: [...s.reviews, { ...r, id: uid('rev'), at: Date.now() }] })),
    setConsent: (v: boolean) => set((s) => ({ ...s, consentShowEvidence: v })),
    requestInterview: (listingId: string) => set((s) => ({ ...s, interviewRequests: { ...s.interviewRequests, [listingId]: Date.now() } })),

    resetDemo: async () => {
      localStorage.removeItem(KEY)
      await clearBlobs().catch(() => undefined)
      setState(initial())
    },
  }), [set])

  return { state, ...actions }
}

type Store = ReturnType<typeof useStoreValue>
const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const v = useStoreValue()
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider missing')
  return v
}
