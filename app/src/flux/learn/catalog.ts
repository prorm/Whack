// The career catalog on the homepage. Each track says honestly how deep its learning content is today.
import type { CompetencyId } from '../skills.ts'

export type Field = 'Trades' | 'Tech' | 'Operations'
export interface Track {
  id: string
  title: string
  field: Field
  from: string
  mood: string
  img: string
  /** What exists today, said plainly. */
  depth: string
  level: 'course' | 'episode' | 'path'
  minutes: number
  learn: string[]
  /** Where "start" goes. */
  start: string
  /** Proof checks that already exist for this track (competency ids), if any. */
  proofs: CompetencyId[]
  job?: string
  pay: string
}

export const TRACKS: Track[] = [
  { id: 'solar', title: 'Rooftop Solar Technician', field: 'Trades', from: 'For electricians, ITI students, wiremen', mood: '#FFD43B', img: '/media/flux/dawn.webp',
    depth: 'Full course · 5 lessons + project', level: 'course', minutes: 35, start: '#/fl-course',
    learn: ['Volts, amps and watts from zero', 'Series and parallel strings', 'Why cold mornings kill inverters', 'Sizing a real string, round down / round up', 'Designing a customer’s roof'],
    proofs: ['solar.series', 'solar.cold-max', 'solar.mppt-min', 'solar.design'], job: 'job-solar-apprentice', pay: '₹14–18k/month apprentice stipend (illustrative)' },
  { id: 'ev', title: 'EV Charger Installer', field: 'Trades', from: 'For electricians moving into EV', mood: '#16c47f', img: '/media/flux/ev_night.webp',
    depth: 'Story lesson · 6 min + unseen work order', level: 'episode', minutes: 6, start: '#/flux-ev',
    learn: ['Why a new charger trips the whole flat at 9 PM', 'Adding up loads that run together', 'Safe fixed charger current', 'Load balancing'],
    proofs: ['ev.load'], job: 'job-ev-helper', pay: '₹15–19k/month (illustrative)' },
  { id: 'pay', title: 'Payments Support Engineer', field: 'Tech', from: 'For freshers and self-taught developers', mood: '#5ce1ff', img: '/media/flux/pay.webp',
    depth: 'Story lesson · 5 min + 2 unseen checks', level: 'episode', minutes: 5, start: '#/flux-pay',
    learn: ['Why a customer got charged twice', 'The lost reply problem', 'Idempotency keys', 'Retries, backoff and jitter'],
    proofs: ['pay.idempotency', 'pay.backoff'], job: 'job-payments-support', pay: '₹28–35k/month (illustrative)' },
  { id: 'inventory', title: 'Inventory & Stock Assistant', field: 'Operations', from: 'For first-time job seekers', mood: '#ff8a1f', img: '/media/careers/inventory-counter.webp',
    depth: 'Lesson + work sample + trainer review', level: 'path', minutes: 10, start: '#/opportunity?role=inventory',
    learn: ['Expected vs physical stock', 'Spreadsheet formulas that go wrong', 'Explaining a signed difference'],
    proofs: [], pay: 'Retail entry roles (no listings in this demo)' },
  { id: 'dispatch', title: 'Dispatch & Payout Assistant', field: 'Operations', from: 'For first-time job seekers', mood: '#9b6bff', img: '',
    depth: 'Diagnostic + adaptive lessons + worksheet', level: 'path', minutes: 12, start: '#/opportunity?role=payouts',
    learn: ['Percentage commissions', 'Per-order bonuses', 'Totalling rider payouts'],
    proofs: [], pay: 'Delivery operations roles (no listings in this demo)' },
]
