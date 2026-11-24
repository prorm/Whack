// FLUX solar rules. Pure and deterministic: every number a learner sees is computed here, never by a model.
// Datasheets and sites below are DEMO values for practice, labelled as such in the UI.

export interface Panel { id: string; name: string; voc: number; vmp: number; isc: number; imp: number; pmax: number; betaVoc: number; betaVmp: number }
export interface Inverter { id: string; name: string; vmax: number; mpptMin: number; mpptMax: number }
export interface Site { id: string; city: string; tMin: number; tCellHot: number }

/** Temperature coefficients are in % per °C and negative: colder cells give higher voltage. STC is 25 °C. */
export const STC_C = 25

export const PANELS: Panel[] = [
  { id: 'sv540', name: 'SunVolt 540', voc: 49.6, vmp: 41.6, isc: 13.9, imp: 13.0, pmax: 540, betaVoc: -0.27, betaVmp: -0.35 },
  { id: 'sk445', name: 'Surya 445', voc: 49.2, vmp: 41.0, isc: 11.5, imp: 10.9, pmax: 445, betaVoc: -0.29, betaVmp: -0.37 },
  { id: 'kr600', name: 'Kiran 600 bifacial', voc: 41.7, vmp: 34.9, isc: 18.4, imp: 17.2, pmax: 600, betaVoc: -0.25, betaVmp: -0.32 },
]
export const INVERTERS: Inverter[] = [
  { id: 'gm5', name: 'GridMitra 5K single-phase', vmax: 600, mpptMin: 120, mpptMax: 550 },
  { id: 'gm10', name: 'GridMitra 10K three-phase', vmax: 1000, mpptMin: 200, mpptMax: 850 },
  { id: 'gm15', name: 'GridMitra 15K three-phase', vmax: 1100, mpptMin: 180, mpptMax: 1000 },
]
export const SITES: Site[] = [
  { id: 'blr', city: 'Bengaluru', tMin: 8, tCellHot: 70 },
  { id: 'shimla', city: 'Shimla', tMin: -4, tCellHot: 60 },
  { id: 'jaipur', city: 'Jaipur', tMin: 0, tCellHot: 78 },
  { id: 'leh', city: 'Leh', tMin: -25, tCellHot: 55 },
  { id: 'chennai', city: 'Chennai', tMin: 14, tCellHot: 75 },
  { id: 'delhi', city: 'Delhi', tMin: -2, tCellHot: 75 },
]
export const HOME = { panel: PANELS[0], inverter: INVERTERS[0], site: SITES[0] }

const r2 = (x: number) => Math.round(x * 100) / 100
const EPS = 1e-9

/** Voltage of one panel at cell temperature t (°C). */
export function vAt(v25: number, betaPct: number, t: number) { return v25 * (1 + (betaPct / 100) * (t - STC_C)) }
export const vocAt = (p: Panel, t: number) => vAt(p.voc, p.betaVoc, t)
export const vmpAt = (p: Panel, t: number) => vAt(p.vmp, p.betaVmp, t)

/** Series: volts add, current stays. Parallel: current adds, volts stay. */
export function series(n: number, v: number, i: number) { return { v: n * v, i } }
export function parallel(n: number, v: number, i: number) { return { v, i: n * i } }

/** Most panels in one string that stay below the inverter maximum on the coldest morning. Always rounds DOWN. */
export function maxPanels(inv: Inverter, p: Panel, tMin: number) { return Math.floor(inv.vmax / vocAt(p, tMin) + EPS) }
/** Fewest panels that keep the working voltage inside the MPPT window on the hottest afternoon. Rounds UP. */
export function minPanels(inv: Inverter, p: Panel, tHot: number) { return Math.ceil(inv.mpptMin / vmpAt(p, tHot) - EPS) }

export type Zone = 'dark' | 'asleep' | 'tracking' | 'clipping' | 'damage'
/** What the inverter does with a string: wake-up voltage (Voc) checks damage, working voltage (Vmp) checks the window. */
export function zone(inv: Inverter, voc: number, vmp: number, sunUp: boolean): Zone {
  if (!sunUp) return 'dark'
  if (voc > inv.vmax + EPS) return 'damage'
  if (vmp < inv.mpptMin) return 'asleep'
  if (vmp > inv.mpptMax) return 'clipping'
  return 'tracking'
}

// ---------------------------------------------------------------- a day on the roof
export type Season = 'jan' | 'may'
export const SEASONS: Record<Season, { label: string; sunrise: number; sunset: number; tMin: number; tMax: number; peakSun: number }> = {
  jan: { label: '14 January · coldest dawn on record', sunrise: 6.75, sunset: 18.25, tMin: 8, tMax: 27, peakSun: 0.85 },
  may: { label: '2 May · hottest afternoon', sunrise: 5.9, sunset: 18.6, tMin: 22, tMax: 38, peakSun: 1 },
}

/** Sun strength 0..1 (a simple sine arc). */
export function sunAt(s: Season, h: number) {
  const { sunrise, sunset, peakSun } = SEASONS[s]
  if (h <= sunrise || h >= sunset) return 0
  return peakSun * Math.sin(Math.PI * (h - sunrise) / (sunset - sunrise))
}
/** Air temperature: coldest at sunrise, warmest at 14:30. */
export function airAt(s: Season, h: number) {
  const { sunrise, tMin, tMax } = SEASONS[s]
  const peak = 14.5
  if (h <= sunrise) return tMin + (tMax - tMin) * 0.25 * (sunrise - h) / sunrise // cooling through the night, floor at sunrise
  if (h <= peak) return tMin + (tMax - tMin) * (1 - Math.cos(Math.PI * (h - sunrise) / (peak - sunrise))) / 2
  return tMax - (tMax - tMin) * 0.55 * (h - peak) / (24 - peak)
}
/** Cell temperature: air plus heating from the sun (~30 °C at full sun). */
export function cellAt(s: Season, h: number) { return airAt(s, h) + 30 * sunAt(s, h) }

export interface Reading { hour: number; sun: number; air: number; cell: number; vocPanel: number; vmpPanel: number; voc: number; vmp: number; zone: Zone }
/**
 * The string at one moment. Sim simplification, shown in the UI: once the sun is up we use full open-circuit
 * voltage at the cell temperature (Voc barely depends on light level), which is how designers check the limit.
 */
export function reading(n: number, s: Season, h: number, p: Panel = HOME.panel, inv: Inverter = HOME.inverter): Reading {
  const sun = sunAt(s, h)
  const cell = cellAt(s, h)
  const up = sun > 0.02
  const vocPanel = up ? vocAt(p, cell) : 0
  const vmpPanel = up ? vmpAt(p, cell) : 0
  return { hour: h, sun, air: airAt(s, h), cell, vocPanel, vmpPanel, voc: n * vocPanel, vmp: n * vmpPanel, zone: zone(inv, n * vocPanel, n * vmpPanel, up) }
}
/** Highest wake-up voltage across the day, and when it happens. */
export function peakOfDay(n: number, s: Season, p: Panel = HOME.panel) {
  let best = { hour: 0, voc: 0 }
  for (let h = 5; h <= 19; h += 1 / 60) {
    const r = reading(n, s, h, p)
    if (r.voc > best.voc) best = { hour: h, voc: r.voc }
  }
  return best
}
export function clock(h: number) {
  const hh = Math.floor(h)
  const mm = Math.floor((h - hh) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

// ---------------------------------------------------------------- unseen work orders
export interface WorkOrder { seed: number; id: string; panel: Panel; inverter: Inverter; site: Site }
export interface WorkKey { max: number; min: number; vocCold: number; vmpHot: number; stringVocCold: number }

function rng(seed: number) {
  let x = (seed ^ 0x9e3779b9) >>> 0
  return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296 }
}
/** A practice variant that is never the Bengaluru / SunVolt / 600 V home example. */
export function workOrder(seed: number): { order: WorkOrder; key: WorkKey } {
  const r = rng(seed)
  let panel = PANELS[Math.floor(r() * PANELS.length)]
  let inverter = INVERTERS[Math.floor(r() * INVERTERS.length)]
  const site = SITES[1 + Math.floor(r() * (SITES.length - 1))]
  if (panel.id === HOME.panel.id && inverter.id === HOME.inverter.id) inverter = INVERTERS[1 + Math.floor(r() * 2)]
  if (!panel) panel = PANELS[1]
  const order = { seed, id: `WO-${site.id.toUpperCase()}-${(seed % 9000) + 1000}`, panel, inverter, site }
  return { order, key: keyFor(order) }
}
export function keyFor(o: Pick<WorkOrder, 'panel' | 'inverter' | 'site'>): WorkKey {
  const max = maxPanels(o.inverter, o.panel, o.site.tMin)
  return {
    max, min: minPanels(o.inverter, o.panel, o.site.tCellHot),
    vocCold: r2(vocAt(o.panel, o.site.tMin)), vmpHot: r2(vmpAt(o.panel, o.site.tCellHot)),
    stringVocCold: r2(max * vocAt(o.panel, o.site.tMin)),
  }
}

export type Misconception = 'used_stc' | 'rounded_up' | 'sign_flip' | 'used_hot' | 'min_rounded_down' | 'used_voc_for_min'
export const MISCONCEPTIONS: Record<Misconception, { title: string; repair: string }> = {
  used_stc: { title: 'Used the 25 °C datasheet voltage', repair: 'The datasheet Voc is measured at 25 °C. On the coldest dawn every panel gives more. Correct Voc for the coldest temperature first.' },
  rounded_up: { title: 'Rounded a safety limit up', repair: 'A maximum is a cliff edge. 11.6 panels means 11. Always round a maximum down.' },
  sign_flip: { title: 'Made cold LOWER the voltage', repair: 'The coefficient is negative, and cold is below 25 °C. Minus times minus: the voltage goes UP when it is cold.' },
  used_hot: { title: 'Checked the hot afternoon for the maximum', repair: 'Heat lowers voltage, so the hot afternoon is the safe case. The maximum comes from the coldest morning.' },
  min_rounded_down: { title: 'Rounded the minimum down', repair: 'A minimum must be reached. 3.4 panels means 4, otherwise the inverter falls asleep.' },
  used_voc_for_min: { title: 'Used Voc for the working window', repair: 'While the inverter runs it holds the string near Vmp, not Voc. Use hot Vmp for the minimum.' },
}

/** Which known wrong method reproduces this answer? Deterministic; undefined when none matches. */
export function diagnoseMax(o: Pick<WorkOrder, 'panel' | 'inverter' | 'site'>, answer: number): Misconception | undefined {
  const k = keyFor(o)
  if (answer === k.max) return undefined
  const ratio = o.inverter.vmax / vocAt(o.panel, o.site.tMin)
  const candidates: [Misconception, number][] = [
    ['used_stc', Math.floor(o.inverter.vmax / o.panel.voc + EPS)],
    ['sign_flip', Math.floor(o.inverter.vmax / vAt(o.panel.voc, -o.panel.betaVoc, o.site.tMin) + EPS)],
    ['used_hot', Math.floor(o.inverter.vmax / vocAt(o.panel, o.site.tCellHot) + EPS)],
    ['rounded_up', Math.ceil(ratio)],
  ]
  return candidates.find(([, v]) => v === answer && v !== k.max)?.[0]
}
export function diagnoseMin(o: Pick<WorkOrder, 'panel' | 'inverter' | 'site'>, answer: number): Misconception | undefined {
  const k = keyFor(o)
  if (answer === k.min) return undefined
  const candidates: [Misconception, number][] = [
    ['min_rounded_down', Math.floor(o.inverter.mpptMin / vmpAt(o.panel, o.site.tCellHot))],
    ['used_voc_for_min', Math.ceil(o.inverter.mpptMin / vocAt(o.panel, o.site.tCellHot) - EPS)],
  ]
  return candidates.find(([, v]) => v === answer && v !== k.min)?.[0]
}

/** Bet calibration: Brier score of one confident prediction (0 = perfect, 1 = confidently wrong). */
export function brier(confidence: number, correct: boolean) { return (confidence - (correct ? 1 : 0)) ** 2 }
