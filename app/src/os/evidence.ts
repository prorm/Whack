// One evidence view over every proof source the platform has: FLUX graded attempts, signed lab receipts
// (TradeLab Arena and Solar Forge, CodeLab, DataLab, AI Pair) and human review. Watching, streaks and reel answers
// are not inputs here, so they can never become evidence.
import type { CompetencyId } from '../flux/skills.ts'
import { CAPABILITIES, CAP } from './taxonomy.ts'

export type EvState = 'evidenced' | 'failed' | 'review' | 'none'
export interface Ev { state: EvState; level?: string; source?: string; at?: number }
export type EvidenceMap = Record<string, Ev>

/** The receipt fields evidence needs; matches the server's signed lab records. */
export interface ReceiptLike { kind: string; passed: boolean; at: number; variant?: string; report?: string }

/** Which capabilities a passed signed receipt demonstrates. */
export const RECEIPT_COVERS: Record<string, string[]> = {
  arena: ['safe-isolation', 'fault-diagnosis'],
  solar: ['cold-string'],
  code: ['programming', 'http-apis', 'log-analysis', 'api-debugging', 'regression-testing', 'incident-response'],
  data: ['spreadsheets', 'reconciliation', 'data-cleaning'],
  aicode: ['ai-assisted-debugging', 'ai-data-hygiene'],
  aitrade: ['ai-fault-triage', 'ai-data-hygiene'],
}
const LAB_NAME: Record<string, string> = { arena: 'Practical Arena', solar: 'Solar Forge', code: 'CodeLab', data: 'DataLab', aicode: 'AI Pair · CodeLab', aitrade: 'AI Pair · TradeLab' }

export function evidenceFrom(flux: (id: CompetencyId) => { state: 'evidenced' | 'failed' | 'not_started'; level?: string },
  receipts: ReceiptLike[]): EvidenceMap {
  const map: EvidenceMap = {}
  const put = (id: string, ev: Ev) => {
    const cur = map[id]
    if (!cur || cur.state !== 'evidenced') map[id] = ev
  }
  for (const c of CAPABILITIES) {
    if (c.proof.kind !== 'flux' || !c.proof.flux) continue
    const s = flux(c.proof.flux)
    if (s.state === 'evidenced') put(c.id, { state: 'evidenced', level: s.level === 'trainer_reviewed' ? 'Trainer-reviewed' : 'System-assessed', source: 'FLUX unseen check' })
    else if (s.state === 'failed') put(c.id, { state: 'failed', source: 'FLUX unseen check' })
  }
  // newest first, so the latest attempt decides a failed state
  for (const r of [...receipts].sort((a, b) => b.at - a.at)) {
    const covers = [...(RECEIPT_COVERS[r.kind] ?? []), ...(r.kind === 'code' && r.variant === 'duplicate' ? ['payments-idempotency'] : [])]
    for (const id of covers) {
      if (r.passed) put(id, { state: 'evidenced', level: CAP[id]?.hazardous ? 'System-assessed · simulation only' : 'System-assessed', source: `${LAB_NAME[r.kind]} signed receipt`, at: r.at })
      else if (!map[id]) map[id] = { state: 'failed', source: `${LAB_NAME[r.kind]} signed receipt`, at: r.at }
    }
    if (r.kind === 'code' && r.passed && r.report?.trim() && !map['incident-report']) map['incident-report'] = { state: 'review', source: 'Incident report awaiting trainer review', at: r.at }
  }
  return map
}

export const stateOf = (ev: EvidenceMap, id: string): EvState => ev[id]?.state ?? 'none'
