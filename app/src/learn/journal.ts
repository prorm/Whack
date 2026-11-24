import { useSyncExternalStore } from 'react'
import type { LearnerEvent } from '../engine/learner.ts'

export interface Submission {
  id: string
  at: number
  seed: number
  cells: Record<string, string>
}

export interface ReviewReceipt {
  submissionId: string
  attemptId: string
  evidenceId: string
  reviewer: string
  decision: 'approved' | 'needs_another_attempt'
  reason?: string
  demo: boolean
  at: number
}

const PREFIX = 'scrollproof:journal:'
const DEVICE = 'scrollproof:device:v1'
const LEGACY = 'scrollproof:twin-events:v1'
const listeners = new Set<() => void>()
const types = ['learning', 'submission', 'receipt', 'ack'] as const
type JournalType = typeof types[number]

function all<T>(type: JournalType): T[] {
  const start = PREFIX + type + ':'
  const items: T[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(start)) continue
    try { items.push(JSON.parse(localStorage.getItem(key)!)) } catch { /* unreadable entry */ }
  }
  return items
}

function read() {
  let legacy: LearnerEvent[] = []
  try {
    const value: unknown = JSON.parse(localStorage.getItem(LEGACY) ?? '[]')
    if (Array.isArray(value)) legacy = value
  } catch { /* unreadable legacy log */ }
  const events = new Map(legacy.map((event) => [event.id, event]))
  for (const event of all<LearnerEvent>('learning')) events.set(event.id, event)
  const submissions = all<Submission>('submission').sort((a, b) => b.at - a.at || b.id.localeCompare(a.id))
  const receipts = Object.fromEntries(all<ReviewReceipt>('receipt').map((receipt) => [receipt.submissionId, receipt]))
  const ack = new Set(all<string>('ack'))
  return { events: [...events.values()], submissions, receipts, ack }
}

let snapshot = read()
function publish() {
  snapshot = read()
  listeners.forEach((listener) => listener())
}
addEventListener('storage', (event) => {
  if (!event.key || event.key.startsWith(PREFIX) || event.key === LEGACY) publish()
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function useJournal() {
  return useSyncExternalStore(subscribe, getJournal)
}
export function getJournal() { return snapshot }

export function deviceToken() {
  const existing = localStorage.getItem(DEVICE)
  if (existing) return existing
  const token = crypto.randomUUID()
  localStorage.setItem(DEVICE, token)
  return token
}

function write(type: JournalType, id: string, value: unknown) {
  const key = PREFIX + type + ':' + id
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value))
}

export function saveLearning(events: LearnerEvent[]) {
  for (const event of events) write('learning', event.id, event)
  publish()
}
export function saveSubmission(submission: Submission) {
  write('submission', submission.id, submission)
  publish()
}
export function recordSync(ids: string[], receipts: ReviewReceipt[]) {
  for (const id of ids) write('ack', id, id)
  for (const receipt of receipts) write('receipt', receipt.submissionId, receipt)
  publish()
}
