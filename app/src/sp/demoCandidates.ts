// DEMO candidates for the employer seat. Their records are produced by the real graders from scripted answers and
// carry source 'demo_seed'. They are fictional people and every surface labels them DEMO.
import { makeRecord, type EvidenceRecord } from '../flux/passport'
import { taskFor } from '../flux/passportStore'

export interface DemoCandidate { id: string; name: string; city: string; note: string; consentTo: string[]; records: EvidenceRecord[] }

const T = Date.UTC(2026, 10, 20, 9)
const right = (id: string, seed: number, recId: string, at: number) => { const t = taskFor(id, seed); return makeRecord(t, Object.fromEntries(t.asks.map((a) => [a.id, String(t.key[a.id])])), at, recId, 'demo_seed') }
const wrongFirst = (id: string, seed: number, recId: string, at: number) => { const t = taskFor(id, seed); return makeRecord(t, Object.fromEntries(t.asks.map((a, i) => [a.id, String(i === 0 ? t.key[a.id] + 1 : t.key[a.id])])), at, recId, 'demo_seed') }

export const DEMO_CANDIDATES: DemoCandidate[] = [
  { id: 'cand-meera', name: 'Meera K. (DEMO)', city: 'Tumakuru', note: 'ITI electrician, final year', consentTo: ['emp-suryodaya', 'emp-chargegrid'],
    records: [right('quick.series', 11, 'demo-meera-1', T), right('wo.solar-string', 4012, 'demo-meera-2', T + 3600e3), right('wo.ev-load', 88, 'demo-meera-3', T + 7200e3)] },
  { id: 'cand-arjun', name: 'Arjun S. (DEMO)', city: 'Bengaluru', note: 'Wireman, 3 years on residential sites', consentTo: ['emp-suryodaya'],
    records: [right('quick.series', 12, 'demo-arjun-1', T), wrongFirst('wo.solar-string', 5150, 'demo-arjun-2', T + 3600e3)] },
  { id: 'cand-farah', name: 'Farah N. (DEMO)', city: 'Mysuru', note: 'B.Sc. graduate, self-taught backend', consentTo: ['emp-paylane'],
    records: [right('quick.idempotency', 31, 'demo-farah-1', T), right('quick.backoff', 32, 'demo-farah-2', T + 3600e3)] },
]
