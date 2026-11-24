// Motion reel engine: code-driven motion graphics, rendered as SVG from a clock. Every number on screen is passed in
// from physics.ts / the EV blueprint at runtime, so nothing is baked into media. Veo plates (if any) sit underneath
// as atmosphere only.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { haptic, isMuted, sfx, type Sfx } from '../fx'
import './motion.css'

export type Phase = 'intro' | 'ask' | 'payoff'
/** g: seconds since the reel became active (ambient loops). t: intro seconds, clamped. p: payoff seconds. */
export interface SceneProps { g: number; t: number; p: number; phase: Phase; ok: boolean | null; pick: number | null }
export interface Scene {
  intro: number
  payoff: number
  alt: string
  plate?: string
  tint?: string
  beats?: { at: number; phase: 'intro' | 'payoff'; sfx?: Sfx; buzz?: number | number[]; vol?: number }[]
  render: (s: SceneProps) => ReactNode
}

// ---------------------------------------------------------------- maths helpers
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export const k = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x
export const eo = (x: number) => 1 - (1 - x) ** 3
export const eio = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2)
export const back = (x: number) => { const c = 1.9; return x <= 0 ? 0 : x >= 1 ? 1 : 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2 }
/** Damped shake after a hit at time `at`. */
export const shake = (t: number, at: number, amp = 6) => (t < at ? 0 : Math.sin((t - at) * 70) * amp * Math.exp(-(t - at) * 6))
/** Deterministic pseudo-random in [0,1) for particle i. */
export const hash01 = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }

// ---------------------------------------------------------------- primitives
export const C = { volt: '#d7ff3a', frost: '#5ce1ff', sun: '#ff8a1f', danger: '#ff2e55', ok: '#3dffa8', violet: '#9b6bff', text: '#f3f4f8', dim: '#7e8499' }

/** Kinetic word: pops in with overshoot at `at`, optional slam (scale from big). */
export function KText({ t, at, x, y, size = 34, fill = C.text, children, anchor = 'middle', slam, out, weight = 800 }: {
  t: number; at: number; x: number; y: number; size?: number; fill?: string; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; slam?: boolean; out?: number; weight?: number
}) {
  const a = k(t, at, at + (slam ? 0.22 : 0.38))
  const o = out !== undefined ? 1 - k(t, out, out + 0.25) : 1
  if (a <= 0 || o <= 0) return null
  const s = slam ? lerp(2.4, 1, eo(a)) : 0.6 + 0.4 * back(a)
  return <g transform={`translate(${x} ${y + (slam ? 0 : (1 - eo(a)) * 14)}) scale(${s})`} opacity={Math.min(a * 1.6, 1) * o}>
    <text textAnchor={anchor} fontSize={size} fontWeight={weight} fill={fill} letterSpacing={-size * 0.03} style={{ paintOrder: 'stroke', stroke: '#000a', strokeWidth: size * 0.12 }}>{children}</text>
  </g>
}

/** Number that rolls from a to b between t0 and t1. */
export function Tick({ t, t0, t1, a, b, x, y, size = 40, fill = C.text, unit = '', dp = 1, anchor = 'middle' }: {
  t: number; t0: number; t1: number; a: number; b: number; x: number; y: number; size?: number; fill?: string; unit?: string; dp?: number; anchor?: 'start' | 'middle' | 'end'
}) {
  const v = lerp(a, b, eio(k(t, t0, t1)))
  return <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={800} fill={fill} style={{ fontVariantNumeric: 'tabular-nums', paintOrder: 'stroke', stroke: '#000a', strokeWidth: size * 0.1 }}>
    {v.toFixed(dp)}<tspan fontSize={size * 0.5} dx="3">{unit}</tspan></text>
}

/** Full-screen flash. */
export const Flash = ({ t, at, color = '#fff', len = 0.35 }: { t: number; at: number; color?: string; len?: number }) => {
  const a = t >= at ? 1 - k(t, at, at + len) : 0
  return a > 0 ? <rect x="-20" y="-20" width="400" height="680" fill={color} opacity={a * 0.55} /> : null
}

/** Rubber stamp (e.g. TRIP, ROUND DOWN). */
export function Stamp({ t, at, x, y, children, color = C.danger, rot = -8, size = 30, out }: { t: number; at: number; x: number; y: number; children: ReactNode; color?: string; rot?: number; size?: number; out?: number }) {
  const a = k(t, at, at + 0.18) * (out !== undefined ? 1 - k(t, out, out + 0.25) : 1)
  if (a <= 0) return null
  const s = lerp(2.2, 1, eo(a))
  return <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={a}>
    <rect x={-size * 3.2} y={-size * 0.95} width={size * 6.4} height={size * 1.4} rx="6" fill="none" stroke={color} strokeWidth="4" />
    <text textAnchor="middle" y={size * 0.12} fontSize={size} fontWeight={900} fill={color} letterSpacing="2">{children}</text>
  </g>
}

/** Ambient animated backdrop: perspective grid + drifting motes. */
export function Backdrop({ g, tint = C.volt }: { g: number; tint?: string }) {
  const lines = []
  for (let i = 0; i < 9; i++) {
    const z = ((i / 9 + g * 0.08) % 1)
    const y = 470 + z * z * 290
    lines.push(<line key={'h' + i} x1="0" x2="360" y1={y} y2={y} stroke={tint} strokeOpacity={0.05 + z * 0.18} />)
  }
  for (let i = -6; i <= 6; i++) lines.push(<line key={'v' + i} x1={180 + i * 14} y1="470" x2={180 + i * 90} y2="760" stroke={tint} strokeOpacity="0.1" />)
  const motes = Array.from({ length: 18 }, (_, i) => {
    const x = hash01(i) * 360, sp = 6 + hash01(i + 40) * 14
    const y = 640 - ((g * sp + hash01(i + 90) * 640) % 640)
    return <circle key={'m' + i} cx={x + Math.sin(g + i) * 6} cy={y} r={0.8 + hash01(i + 7) * 1.6} fill={tint} opacity={0.25} />
  })
  return <g>{lines}{motes}</g>
}

// ---------------------------------------------------------------- clock + stage
function useRaf(active: boolean) {
  const [now, setNow] = useState(0)
  const t0 = useRef<number | null>(null)
  useEffect(() => {
    if (!active) return
    let id = 0
    const loop = (ts: number) => { if (t0.current === null) t0.current = ts; setNow((ts - t0.current) / 1000); id = requestAnimationFrame(loop) }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [active])
  return now
}

export function MotionStage({ scene, active, asking, ok, pick, onAsk, plateSrc }: {
  scene: Scene; active: boolean; asking: boolean; ok: boolean | null; pick: number | null; onAsk: () => void; plateSrc?: string
}) {
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const g = useRaf(active && !reduce)
  const skip = useRef<number | null>(null) // global time the learner skipped the intro at
  const payStart = useRef<number | null>(null)
  if (ok !== null && payStart.current === null) payStart.current = g
  const introT = reduce ? scene.intro : skip.current !== null ? scene.intro : Math.min(g, scene.intro)
  const p = ok === null ? 0 : reduce ? scene.payoff : g - (payStart.current ?? g)
  const phase: Phase = ok !== null ? 'payoff' : introT >= scene.intro ? 'ask' : 'intro'
  // move to the question when the intro ends
  useEffect(() => { if (active && phase === 'ask' && !asking) onAsk() }, [phase, active]) // eslint-disable-line react-hooks/exhaustive-deps
  // sound + haptic beats
  const last = useRef({ intro: -1, payoff: -1 })
  useEffect(() => {
    if (!active || reduce) return
    for (const b of scene.beats ?? []) {
      const cur = b.phase === 'intro' ? introT : p
      const prev = last.current[b.phase]
      if (b.phase === 'payoff' && ok === null) continue
      if (prev < b.at && cur >= b.at) { if (b.sfx && !isMuted()) sfx(b.sfx, b.vol ?? 0.45); if (b.buzz) haptic(b.buzz) }
    }
    last.current = { intro: introT, payoff: ok === null ? -1 : p }
  })
  return <div className="mo-stage" onClick={() => { if (phase === 'intro') { skip.current = g; onAsk() } }}>
    {plateSrc && <video className="mo-plate" src={plateSrc} muted loop playsInline autoPlay={active} preload="metadata" aria-hidden="true" />}
    <svg viewBox="0 0 360 640" preserveAspectRatio="xMidYMid meet" overflow="visible" role="img" aria-label={scene.alt}>
      <Backdrop g={g} tint={scene.tint} />
      {/* clear the reel chips at the top */}
      <g transform="translate(0 38)">{scene.render({ g, t: introT, p, phase, ok, pick })}</g>
    </svg>
    {phase === 'intro' && <span className="mo-skip" aria-hidden="true">tap to skip ›</span>}
  </div>
}
