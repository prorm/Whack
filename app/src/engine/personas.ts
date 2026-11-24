// FICTIONAL TEST PERSONAS (synthetic). Not real people. Used only to exercise the learner engine.
import type { Responder, TwinProfile } from './learner.ts'

export const PERSONA_A: TwinProfile = {
  learnerId: 'synthetic-A', synthetic: true, label: 'Persona A (fictional): school student, Kannada-first, weak connectivity',
  goal: { conceptId: 'percent_basic', why: 'School percentages and fractions; struggles with word problems' },
  constraints: { minutesPerSession: 8, connectivity: 'poor' },
  preferences: { language: 'kn', modalities: ['text', 'interactive'] },
}
export const PERSONA_B: TwinProfile = {
  learnerId: 'synthetic-B', synthetic: true, label: 'Persona B (fictional): gig worker, commissions and payouts',
  goal: { conceptId: 'commission_calc', why: 'Check delivery incentives and payouts' },
  constraints: { minutesPerSession: 10, connectivity: 'good' },
  preferences: { language: 'kn-en', modalities: ['audio', 'worked_example'] },
}
export const PERSONA_C: TwinProfile = {
  learnerId: 'synthetic-C', synthetic: true, label: 'Persona C (fictional): career transition to spreadsheet work',
  goal: { conceptId: 'sheet_percent_formula', why: 'Spreadsheet proficiency for an office role' },
  constraints: { minutesPerSession: 25, connectivity: 'good' },
  preferences: { language: 'en', modalities: ['interactive', 'text'] },
}

/** Simulated ground-truth knowledge for each persona (what they would actually answer). */
const knows = (set: string[], wrong: Record<string, number> = {}): Responder => (cid, item) =>
  set.includes(cid) ? { answer: item.answer, latencyMs: 20_000 } : { answer: wrong[item.id] ?? null, latencyMs: 60_000 }

export const RESPOND_A = knows(['add_sub', 'mult_div', 'read_table'], { d_frac_1: 0.34, d_pct_1: 26.67 })
export const RESPOND_B = knows(['add_sub', 'mult_div', 'fractions_decimals', 'read_table'], { d_pct_1: 415, d_com_1: 12502 })
export const RESPOND_C = knows(['add_sub', 'mult_div', 'fractions_decimals', 'percent_basic', 'read_table', 'sheet_navigation'],
  { d_sum_1: 120, d_spf_1: 4000 })
