// FLUX Learn: the course. Pure data + generators, so the curriculum is testable.
// Teach (narrated scenes) → Test (checks) → Train (fresh generated problems) → Project → Proof.
// Every number a learner sees is computed from physics.ts; narration text is checked against it in course.test.ts.
import { HOME, PANELS, SITES, maxPanels, minPanels, vmpAt, vocAt } from '../physics.ts'
import SCRIPT from './script.json' with { type: 'json' }

const P = HOME.panel, INV = HOME.inverter, SITE = HOME.site
const r1 = (x: number) => Math.round(x * 10) / 10
const r2 = (x: number) => Math.round(x * 100) / 100
export const LINES: Record<string, string> = Object.fromEntries(SCRIPT.lines.map((l) => [l.id, l.text]))

/** What the stage draws. Scenes are parametric: the lesson state fills in the live values. */
export type SceneSpec =
  | { scene: 'hook' }
  | { scene: 'pipe'; v?: number; i?: number; focus?: 'push' | 'flow' | 'power' }
  | { scene: 'string'; n?: number; mode?: 'series' | 'parallel'; grow?: boolean }
  | { scene: 'thermo'; t?: number }
  | { scene: 'trace'; trace: 'voc' | 'max' | 'min' }
  | { scene: 'window'; n?: number; moment?: 'dawn' | 'noon' | 'both' }
  | { scene: 'ticket' }
  | { scene: 'roof' }

export type Control =
  | { kind: 'sliders'; sliders: { id: string; label: string; min: number; max: number; step: number; start: number; unit: string }[]; goal: string }
  | { kind: 'toggle-n'; start: number; goal: string }

export type Step =
  | { kind: 'say'; line: string; view: SceneSpec; chapter?: string }
  | { kind: 'predict'; line: string; view: SceneSpec; q: string; options: { t: string; ok?: boolean; why: string }[] }
  | { kind: 'play'; line: string; view: SceneSpec; control: Control; prompt: string; success: string }
  | { kind: 'check'; view: SceneSpec; q: string; answer: number; tol: number; unit: string; hint: string; explain: string; concept: string }
  | { kind: 'choice'; view: SceneSpec; q: string; options: { t: string; ok?: boolean }[]; explain: string; concept: string }
  | { kind: 'train'; view: SceneSpec; gen: 'series' | 'voc' | 'window'; count: number; concept: string }
  | { kind: 'guided'; view: SceneSpec }

export interface Lesson {
  id: string
  n: number
  title: string
  kicker: string
  mood: string
  minutes: number
  /** Memory concepts this lesson unlocks for revision reels. */
  concepts: string[]
  steps: Step[]
}

// ---------------------------------------------------------------- live goals (pure, tested)
export const GOALS = {
  power540: (s: Record<string, number>) => Math.abs(s.v * s.i - 540) <= 12,
  series300: (s: Record<string, number>) => s.n * P.vmp > 300,
  cross600: (s: Record<string, number>) => 12 * vocAt(P, s.t) > INV.vmax,
  bestString: (s: Record<string, number>) => s.n === maxPanels(INV, P, SITE.tMin),
}
export type GoalId = keyof typeof GOALS

/** Numbers the narration speaks. course.test.ts checks every one against physics.ts. */
export const SPOKEN = {
  panelWatts: r1(P.vmp * P.imp), eightSeries: r1(8 * P.vmp), threeSeries: r1(3 * P.vmp),
  crossTemp: r1(25 + (INV.vmax / 12 / P.voc - 1) / (P.betaVoc / 100)),
  riseBy: r1((vocAt(P, SITE.tMin) / P.voc - 1) * 100), vocCold: r1(vocAt(P, SITE.tMin)),
  ratio: r2(INV.vmax / vocAt(P, SITE.tMin)), max: maxPanels(INV, P, SITE.tMin),
  vmpHot: r1(vmpAt(P, SITE.tCellHot)), minRatio: r1(INV.mpptMin / vmpAt(P, SITE.tCellHot)), min: minPanels(INV, P, SITE.tCellHot),
}

export const COURSE = {
  id: 'solar-101',
  title: 'Rooftop Solar Technician',
  subtitle: 'From “what is a volt?” to sizing a real string, in 5 lessons and a project',
  job: 'job-solar-apprentice',
}

export const LESSONS: Lesson[] = [
  { id: 'l1', n: 1, title: 'Push, flow and power', kicker: 'Absolute basics', mood: '#3b6cff', minutes: 4, concepts: ['series'],
    steps: [
      { kind: 'say', line: 'l1_01', view: { scene: 'hook' }, chapter: 'The cold open' },
      { kind: 'say', line: 'l1_02', view: { scene: 'pipe', v: 0, i: 0 }, chapter: 'Electricity is water' },
      { kind: 'say', line: 'l1_03', view: { scene: 'pipe', v: 36, i: 0, focus: 'push' } },
      { kind: 'say', line: 'l1_04', view: { scene: 'pipe', v: 36, i: 9, focus: 'flow' } },
      { kind: 'play', line: 'l1_05', view: { scene: 'pipe', focus: 'power' }, prompt: 'Make the panel deliver 540 W', success: 'l1_06',
        control: { kind: 'sliders', goal: 'power540', sliders: [{ id: 'v', label: 'Push', min: 0, max: 60, step: 0.2, start: 20, unit: 'V' }, { id: 'i', label: 'Flow', min: 0, max: 20, step: 0.1, start: 5, unit: 'A' }] } },
      { kind: 'check', view: { scene: 'pipe', v: P.vmp, i: P.imp, focus: 'power' }, q: `A panel works at ${P.vmp} V and ${P.imp} A. How many watts does it deliver?`, answer: r1(P.vmp * P.imp), tol: 3, unit: 'W',
        hint: 'Power = volts × amps.', explain: `${P.vmp} × ${P.imp} = ${r1(P.vmp * P.imp)} W. That is the “540 W” on the label.`, concept: 'series' },
      { kind: 'choice', view: { scene: 'pipe', v: P.vmp, i: P.imp, focus: 'push' }, q: 'Which number is the push?', options: [{ t: 'Volts', ok: true }, { t: 'Amps' }, { t: 'Watts' }],
        explain: 'Volts are the push (pressure). Amps are the flow. Watts are push × flow.', concept: 'series' },
    ] },
  { id: 'l2', n: 2, title: 'Series and parallel', kicker: 'Build a string', mood: '#16c47f', minutes: 5, concepts: ['series'],
    steps: [
      { kind: 'say', line: 'l2_01', view: { scene: 'string', n: 1, mode: 'series' }, chapter: 'One panel is not enough' },
      { kind: 'say', line: 'l2_02', view: { scene: 'string', n: 4, mode: 'series', grow: true }, chapter: 'Series' },
      { kind: 'predict', line: 'l2_03', view: { scene: 'string', n: 3, mode: 'series' }, q: `3 panels in series, each ${P.vmp} V at ${P.imp} A. The string pushes…`,
        options: [{ t: `${P.vmp} V`, why: 'That is one panel. In series the pushes stack up.' }, { t: `${r1(3 * P.vmp)} V`, ok: true, why: 'Volts add in series.' }, { t: `${r1(3 * P.imp)} A`, why: 'That would be parallel, and it is a current, not a push.' }] },
      { kind: 'say', line: 'l2_04', view: { scene: 'string', n: 3, mode: 'series' } },
      { kind: 'say', line: 'l2_05', view: { scene: 'string', n: 3, mode: 'parallel' }, chapter: 'Parallel' },
      { kind: 'play', line: 'l2_06', view: { scene: 'string', mode: 'series' }, prompt: 'Build a series string above 300 V', success: 'l2_07',
        control: { kind: 'sliders', goal: 'series300', sliders: [{ id: 'n', label: 'Panels in series', min: 1, max: 14, step: 1, start: 2, unit: '' }] } },
      { kind: 'train', view: { scene: 'string', n: 3, mode: 'series' }, gen: 'series', count: 3, concept: 'series' },
    ] },
  { id: 'l3', n: 3, title: 'Cold makes volts', kicker: 'The surprise', mood: '#22c8f0', minutes: 6, concepts: ['cold'],
    steps: [
      { kind: 'say', line: 'l3_01', view: { scene: 'thermo', t: 25 }, chapter: 'Voltage is not fixed' },
      { kind: 'predict', line: 'l3_02', view: { scene: 'thermo', t: 25 }, q: 'On a freezing morning, one panel pushes…',
        options: [{ t: 'More volts', ok: true, why: 'Cold cells push harder. The coefficient is negative, so below 25 °C the voltage rises.' }, { t: 'Fewer volts', why: 'That is the most common wrong guess. Try it on the thermometer.' }, { t: 'The same', why: 'Voltage changes with temperature, every degree.' }] },
      { kind: 'play', line: 'l3_03', view: { scene: 'thermo' }, prompt: 'Drag the temperature until 12 panels cross 600 V', success: 'l3_04',
        control: { kind: 'sliders', goal: 'cross600', sliders: [{ id: 't', label: 'Cell temperature', min: -10, max: 70, step: 1, start: 45, unit: '°C' }] } },
      { kind: 'say', line: 'l3_05', view: { scene: 'trace', trace: 'voc' }, chapter: 'The datasheet rule' },
      { kind: 'say', line: 'l3_06', view: { scene: 'trace', trace: 'voc' } },
      { kind: 'check', view: { scene: 'trace', trace: 'voc' }, q: `Same panel (Voc ${P.voc} V, ${P.betaVoc}%/°C). What is its Voc at 0 °C?`, answer: r2(vocAt(P, 0)), tol: 0.15, unit: 'V',
        hint: '0 °C is 25 degrees colder than 25 °C. Multiply the voltage by (1 + 0.27% × 25).', explain: `${P.voc} × (1 + 0.0027 × 25) = ${r2(vocAt(P, 0))} V`, concept: 'cold' },
      { kind: 'train', view: { scene: 'trace', trace: 'voc' }, gen: 'voc', count: 3, concept: 'cold' },
    ] },
  { id: 'l4', n: 4, title: 'The inverter’s window', kicker: 'Max and min', mood: '#9b6bff', minutes: 6, concepts: ['maxstring', 'minstring'],
    steps: [
      { kind: 'say', line: 'l4_01', view: { scene: 'window', n: 12, moment: 'dawn' }, chapter: 'Damage and sleep' },
      { kind: 'say', line: 'l4_02', view: { scene: 'window', n: 8, moment: 'both' } },
      { kind: 'say', line: 'l4_03', view: { scene: 'window', n: 8, moment: 'both' } },
      { kind: 'play', line: 'l4_04', view: { scene: 'window', moment: 'both' }, prompt: 'Find the LONGEST string that is safe at dawn and awake in the afternoon', success: 'l4_05',
        control: { kind: 'sliders', goal: 'bestString', sliders: [{ id: 'n', label: 'Panels per string', min: 1, max: 16, step: 1, start: 14, unit: '' }] } },
      { kind: 'say', line: 'l4_06', view: { scene: 'trace', trace: 'min' }, chapter: 'Round down, round up' },
      { kind: 'check', view: { scene: 'trace', trace: 'max' }, q: `Same panel on a 1000 V inverter, coldest dawn ${SITE.tMin} °C (Voc ${r2(vocAt(P, SITE.tMin))} V). Max panels per string?`,
        answer: Math.floor(1000 / vocAt(P, SITE.tMin)), tol: 0, unit: 'panels', hint: 'Divide the inverter maximum by the cold Voc, then round DOWN.', explain: `1000 ÷ ${r2(vocAt(P, SITE.tMin))} = ${r2(1000 / vocAt(P, SITE.tMin))} → ${Math.floor(1000 / vocAt(P, SITE.tMin))}`, concept: 'maxstring' },
      { kind: 'check', view: { scene: 'trace', trace: 'min' }, q: `That inverter wakes at 200 V. Hot Vmp is ${r2(vmpAt(P, SITE.tCellHot))} V. Fewest panels?`,
        answer: Math.ceil(200 / vmpAt(P, SITE.tCellHot)), tol: 0, unit: 'panels', hint: 'Divide the wake-up voltage by the HOT working voltage, then round UP.', explain: `200 ÷ ${r2(vmpAt(P, SITE.tCellHot))} = ${r2(200 / vmpAt(P, SITE.tCellHot))} → ${Math.ceil(200 / vmpAt(P, SITE.tCellHot))}`, concept: 'minstring' },
      { kind: 'train', view: { scene: 'window', n: 8, moment: 'both' }, gen: 'window', count: 3, concept: 'maxstring' },
    ] },
  { id: 'l5', n: 5, title: 'Your first job ticket', kicker: 'Guided work order', mood: '#ffb020', minutes: 6, concepts: ['maxstring', 'minstring'],
    steps: [
      { kind: 'say', line: 'l5_01', view: { scene: 'ticket' }, chapter: 'A real ticket' },
      { kind: 'guided', view: { scene: 'ticket' } },
      { kind: 'say', line: 'l5_02', view: { scene: 'ticket' }, chapter: 'The method' },
    ] },
]

// ---------------------------------------------------------------- training problems (seeded, fresh each set)
export interface Problem { q: string; answer: number; tol: number; unit: string; hint: string; explain: string }
function rng(seed: number) {
  let x = (Math.imul(seed >>> 0 ^ 0x9e3779b9, 0x85ebca6b) >>> 0) || 1
  return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296 }
}
export function trainSet(gen: 'series' | 'voc' | 'window', seed: number, count: number): Problem[] {
  const r = rng(seed)
  const out: Problem[] = []
  for (let k = 0; k < count; k++) {
    const p = PANELS[Math.floor(r() * PANELS.length)]
    if (gen === 'series') {
      const n = 2 + Math.floor(r() * 9), series = r() < 0.5
      out.push(series
        ? { q: `${n} × ${p.name} (Vmp ${p.vmp} V, Imp ${p.imp} A) in SERIES. String voltage?`, answer: r2(n * p.vmp), tol: 0.1, unit: 'V', hint: 'In series the pushes add.', explain: `${n} × ${p.vmp} = ${r2(n * p.vmp)} V. The current stays ${p.imp} A.` }
        : { q: `${n} × ${p.name} (Vmp ${p.vmp} V, Imp ${p.imp} A) in PARALLEL. Total current?`, answer: r2(n * p.imp), tol: 0.1, unit: 'A', hint: 'In parallel the flows add.', explain: `${n} × ${p.imp} = ${r2(n * p.imp)} A. The voltage stays ${p.vmp} V.` })
    }
    if (gen === 'voc') {
      const site = SITES[Math.floor(r() * SITES.length)]
      out.push({ q: `${p.name}: Voc ${p.voc} V at 25 °C, ${p.betaVoc}%/°C. Voc on a ${site.tMin} °C dawn in ${site.city}?`, answer: r2(vocAt(p, site.tMin)), tol: 0.15, unit: 'V',
        hint: `${site.tMin} °C is ${25 - site.tMin} degrees colder than 25 °C, so the voltage goes UP by ${Math.abs(p.betaVoc)}% per degree.`,
        explain: `${p.voc} × (1 + ${Math.abs(p.betaVoc) / 100} × ${25 - site.tMin}) = ${r2(vocAt(p, site.tMin))} V` })
    }
    if (gen === 'window') {
      const site = SITES[Math.floor(r() * SITES.length)]
      const vmax = [600, 1000, 1100][Math.floor(r() * 3)]
      const v = vocAt(p, site.tMin)
      out.push({ q: `${p.name} in ${site.city} (coldest ${site.tMin} °C → Voc ${r2(v)} V). Inverter max ${vmax} V. Max panels per string?`, answer: Math.floor(vmax / v + 1e-9), tol: 0, unit: 'panels',
        hint: 'Inverter maximum ÷ cold Voc, then round DOWN.', explain: `${vmax} ÷ ${r2(v)} = ${r2(vmax / v)} → ${Math.floor(vmax / v + 1e-9)}` })
    }
  }
  return out
}

export const near = (given: string, answer: number, tol: number) => { const v = parseFloat(given.replace(',', '.')); return Number.isFinite(v) && Math.abs(v - answer) <= tol + 1e-9 }

export const lessonOf = (id: string) => LESSONS.find((l) => l.id === id)!
export { P as PANEL, INV as INVERTER, SITE }
