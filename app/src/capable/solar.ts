import { PANELS, series, vocAt } from '../flux/physics.ts'

export const SOLAR_VERSION = 1
export const FIELDS = {
  moduleVoc: { label: 'Module open-circuit voltage', unit: 'V', min: 20, max: 80 },
  betaVoc: { label: 'Voc temperature coefficient', unit: '%/°C', min: -0.6, max: -0.1 },
  maxInputVoltage: { label: 'Inverter maximum input', unit: 'V', min: 200, max: 1200 },
} as const
export type Field = keyof typeof FIELDS
export const FIELD_IDS = Object.keys(FIELDS) as Field[]
export type Profile = Record<Field, number>
export type Observation = { value: number | null; unit: string; evidence: string; box?: [number, number, number, number] }
export type Observations = Record<Field, Observation>
export type Confidence = 'guess' | 'unsure' | 'sure'
export type Prediction = 'rises' | 'same' | 'falls'

export const LABELS = {
  ridge: { title: 'Ridge 49', moduleVoc: 49, betaVoc: -0.3, maxInputVoltage: 500 },
  summit: { title: 'Summit 54', moduleVoc: 54, betaVoc: -0.28, maxInputVoltage: 600 },
} satisfies Record<string, Profile & { title: string }>
export type LabelId = keyof typeof LABELS

export function observedProfile(observations: Observations) {
  const values = FIELD_IDS.map((key) => observations[key].value)
  if (values.some((v) => v === null)) return null
  return readProfile(Object.fromEntries(FIELD_IDS.map((key, i) => [key, values[i]])))
}

export function readProfile(value: unknown): Profile | null {
  if (!value || typeof value !== 'object' || Object.keys(value).length !== FIELD_IDS.length) return null
  const values = value as Profile
  if (!FIELD_IDS.every((key) => Number.isFinite(values[key]) && values[key] >= FIELDS[key].min && values[key] <= FIELDS[key].max)) return null
  return { moduleVoc: values.moduleVoc, betaVoc: values.betaVoc, maxInputVoltage: values.maxInputVoltage }
}

export function sanitizeObservations(raw: unknown): Observations {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<Field, Observation>>
  return Object.fromEntries(FIELD_IDS.map((key) => {
    const field = FIELDS[key], item = source[key]
    const evidence = typeof item?.evidence === 'string' ? item.evidence.trim().slice(0, 130) : ''
    const value = item?.unit === field.unit && evidence && typeof item.value === 'number' && Number.isFinite(item.value) &&
      item.value >= field.min && item.value <= field.max ? item.value : null
    const box = item?.box
    const validBox = Array.isArray(box) && box.length === 4 && box.every((n) => Number.isInteger(n) && n >= 0 && n <= 1000) &&
      box[0] < box[2] && box[1] < box[3]
    return [key, { value, unit: field.unit, evidence: value === null ? '' : evidence, ...(value !== null && validBox ? { box } : {}) }]
  })) as Observations
}

export function sampleObservations(label: LabelId, covered: boolean): Observations {
  return sanitizeObservations(Object.fromEntries(FIELD_IDS.map((field) => [field, {
    value: covered && field === 'maxInputVoltage' ? null : LABELS[label][field], unit: FIELDS[field].unit,
    evidence: `${LABELS[label][field]} ${FIELDS[field].unit}`,
  }])))
}

export function voltage(profile: Profile, count: number, temp: number) {
  return series(count, vocAt({ ...PANELS[0]!, voc: profile.moduleVoc, betaVoc: profile.betaVoc }, temp), 0).v
}

export function nextIntervention(prediction: Prediction, confidence: Confidence) {
  if (prediction === 'rises') return confidence === 'sure' ? 'transfer' : 'retrieval'
  return confidence === 'sure' ? 'contrast' : 'worked-example'
}

export type SolarVariant = { temp: number; ceiling: number; proposed: number; change: string }
export function solarVariant(profile: Profile, seed: number): SolarVariant {
  const temp = -22 + (seed % 13)
  const delta = 24 + Math.floor(seed / 13) % 27
  const alternate = Math.floor(seed / (13 * 27)) % 2 === 0
  const ceiling = alternate ? profile.maxInputVoltage : profile.maxInputVoltage - delta
  const max = Math.floor(ceiling / voltage(profile, 1, temp) + 1e-9)
  const proposed = Math.floor(seed / (13 * 27 * 2)) % 2 === 0 ? max : max + 1
  return { temp, ceiling, proposed, change: alternate ? 'A colder site uses the same inverter.' : 'A colder site needs a replacement inverter with a lower voltage limit.' }
}

export type SolarAnswer = { panels: number; proposal: 'within' | 'exceeds' }
export function gradeSolar(profile: Profile, seed: number, answer: SolarAnswer) {
  const { temp, ceiling, proposed } = solarVariant(profile, seed)
  const max = Math.floor(ceiling / voltage(profile, 1, temp) + 1e-9)
  const panelCount = answer.panels === max
  const decision = answer.proposal === (proposed <= max ? 'within' : 'exceeds')
  return { passed: panelCount && decision, panelCount, decision, max, atMax: voltage(profile, max, temp), atNext: voltage(profile, max + 1, temp) }
}

export function validSolarAnswer(value: unknown): value is SolarAnswer {
  if (!value || typeof value !== 'object' || Object.keys(value).length !== 2) return false
  const answer = value as SolarAnswer
  return Number.isInteger(answer.panels) && answer.panels >= 1 && answer.panels <= 120 && ['within', 'exceeds'].includes(answer.proposal)
}

export const MENTOR_TOOLS = ['explain', 'compare-cold', 'compare-warm'] as const
export type MentorTool = typeof MENTOR_TOOLS[number]
export type MentorOutput = { transcript: string; note: string; tool: MentorTool }
export const MENTOR_COPY = {
  en: 'A negative temperature coefficient means the module voltage rises as the cells cool. Compare the same string at 25°C and on a cold morning. Keep the module count fixed.',
  kn: 'ತಾಪಮಾನ ಗುಣಾಂಕ ಋಣಾತ್ಮಕವಾಗಿದ್ದರೆ ಸೌರ ಘಟಕ ತಣ್ಣಗಾದಾಗ ಅದರ ವೋಲ್ಟೇಜ್ ಹೆಚ್ಚುತ್ತದೆ. ಘಟಕಗಳ ಸಂಖ್ಯೆಯನ್ನು ಬದಲಾಯಿಸದೆ 25 ಡಿಗ್ರಿ ಮತ್ತು ತಂಪಾದ ಬೆಳಗಿನ ವೋಲ್ಟೇಜ್ ಹೋಲಿಸಿ.',
}
