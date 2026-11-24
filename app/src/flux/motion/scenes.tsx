// Seven intuition reels. Each one: a 5-second kinetic setup, a forced prediction, then a payoff that shows WHY.
// Numbers come from physics.ts and the EV blueprint. Layout keeps the payoff above y≈380 so the result card never hides it.
import { compute, type Blueprint } from '../blueprint'
import EV_JSON from '../blueprints/ev_charger.json'
import { HOME, maxPanels, minPanels, vmpAt, vocAt } from '../physics'
import { C, Flash, KText, Stamp, Tick, clamp, eio, eo, hash01, k, lerp, shake, type Scene, type SceneProps } from './engine'

const { panel: P, inverter: INV, site: SITE } = HOME
const r1 = (x: number) => Math.round(x * 10) / 10
export const N = {
  voc25: P.voc, vocCold: r1(vocAt(P, SITE.tMin)), tMin: SITE.tMin, vmax: INV.vmax, n: 12,
  max: maxPanels(INV, P, SITE.tMin), ratio: INV.vmax / vocAt(P, SITE.tMin),
  vmpHot: r1(vmpAt(P, SITE.tCellHot)), minRatio: INV.mpptMin / vmpAt(P, SITE.tCellHot), tHot: SITE.tCellHot, mppt: INV.mpptMin, min: minPanels(INV, P, SITE.tCellHot), imp: P.imp,
}
const EVB = EV_JSON as unknown as Blueprint
const ev = compute(EVB, { hour: 21 })
const EVC = EVB.constants as Record<string, number>
export const E = {
  main: ev.mainLimit, V: EVC.V, baseA: (EVC.base * 1000) / EVC.V, acA: (EVC.ac * 1000) / EVC.V, cookA: (EVC.cook * 1000) / EVC.V,
  house: ev.peakHouseA, charger: 32, safe: ev.safeFixed, balanced: Math.floor(ev.mainLimit - ev.peakHouseA - EVC.margin),
}

// ---------------------------------------------------------------- shared pieces
function SolarPanel({ x, y, w, h, frost = 0, dark = 0, glow = 0 }: { x: number; y: number; w: number; h: number; frost?: number; dark?: number; glow?: number }) {
  const cols = 6, rows = 10, cw = w / cols, ch = h / rows
  return <g transform={`translate(${x} ${y})`}>
    <rect x={-3} y={-3} width={w + 6} height={h + 6} rx="4" fill="#cfd6e6" opacity=".9" />
    <rect width={w} height={h} fill="#0d2350" />
    {Array.from({ length: cols * rows }, (_, i) => <rect key={i} x={(i % cols) * cw + 1} y={Math.floor(i / cols) * ch + 1} width={cw - 2} height={ch - 2} fill="#173a7a" opacity={0.9 - dark * 0.6} />)}
    {glow > 0 && <rect width={w} height={h} fill={C.volt} opacity={glow * 0.25} />}
    {frost > 0 && Array.from({ length: 26 }, (_, i) => {
      const fx = hash01(i) * w, fy = hash01(i + 9) * h, L = 6 + hash01(i + 3) * 14 * frost
      return <g key={i} stroke="#e8fbff" strokeWidth="1.2" opacity={frost * 0.85}>
        <line x1={fx - L} y1={fy} x2={fx + L} y2={fy} /><line x1={fx - L / 2} y1={fy - L * 0.86} x2={fx + L / 2} y2={fy + L * 0.86} /><line x1={fx - L / 2} y1={fy + L * 0.86} x2={fx + L / 2} y2={fy - L * 0.86} />
      </g>
    })}
    {dark > 0 && <rect width={w} height={h} fill="#000" opacity={dark * 0.55} />}
  </g>
}

/** Vertical bar meter with a limit line. */
function Meter({ x, y, w, h, value, max, limit, color, limitLabel, over }: { x: number; y: number; w: number; h: number; value: number; max: number; limit: number; color: string; limitLabel: string; over?: boolean }) {
  const vh = (clamp(value / max, 0, 1.08)) * h
  const ly = y + h - (limit / max) * h
  return <g>
    <rect x={x} y={y} width={w} height={h} rx="8" fill="#ffffff0d" stroke="#ffffff22" />
    <rect x={x + 4} y={y + h - vh} width={w - 8} height={Math.max(0, vh - 4)} rx="5" fill={over ? C.danger : color} opacity=".92" />
    <line x1={x - 14} x2={x + w + 14} y1={ly} y2={ly} stroke={C.danger} strokeWidth="3" strokeDasharray="7 5" />
    <text x={x + w + 16} y={ly - 6} fill={C.danger} fontSize="12" fontWeight="800">{limitLabel}</text>
  </g>
}

function Thermo({ x, y, temp, t0 = 25, t1 = 0 }: { x: number; y: number; temp: number; t0?: number; t1?: number }) {
  const h = 200, f = (temp - t1) / (t0 - t1)
  return <g transform={`translate(${x} ${y})`}>
    <rect x="-11" y="0" width="22" height={h} rx="11" fill="#ffffff12" stroke="#ffffff40" />
    <rect x="-5" y={h - f * (h - 10)} width="10" height={f * (h - 10)} rx="5" fill={temp < 15 ? C.frost : C.sun} />
    <circle cy={h + 14} r="20" fill={temp < 15 ? C.frost : C.sun} />
  </g>
}

// ---------------------------------------------------------------- 1. cold → more volts
const cold: Scene = {
  intro: 5.4, payoff: 4.6, tint: C.frost, alt: 'A thermometer falls from 25 to 8 degrees while frost grows on a solar panel. Then the panel voltage rises and a 12-panel string crosses the inverter limit.',
  beats: [{ at: 0.1, phase: 'intro', sfx: 'whoosh' }, { at: 0.9, phase: 'intro', sfx: 'frost', vol: 0.5 }, { at: 0.2, phase: 'payoff', sfx: 'tick' }, { at: 2.35, phase: 'payoff', sfx: 'zap', buzz: [60, 40, 120] }, { at: 3.3, phase: 'payoff', sfx: 'boom', vol: 0.3 }],
  render: ({ g, t, p, phase }: SceneProps) => {
    const temp = lerp(25, N.tMin, eio(k(t, 1.2, 4)))
    const frost = k(t, 1.6, 4.4)
    const needle = phase === 'payoff' ? lerp(0, 1, eo(k(p, 0.1, 1.3))) : Math.sin(g * 9) * 0.25
    const vPanel = lerp(N.voc25, N.vocCold, eo(k(p, 0.1, 1.3)))
    const str = lerp(0, N.n * N.vocCold, eio(k(p, 1.2, 2.4)))
    const sx = shake(p, 2.35, 7)
    return <g>
      <KText t={t} at={0} x={180} y={70} size={30} out={phase === 'intro' ? 3.6 : 0.01}>SAME 12 PANELS.</KText>
      <KText t={t} at={0.85} x={180} y={112} size={34} fill={C.frost} slam out={phase === 'intro' ? 3.6 : 0.01}>COLDER MORNING.</KText>
      <KText t={t} at={3.8} x={180} y={86} size={22} out={phase === 'payoff' ? 0 : undefined}>{phase === 'payoff' ? '' : 'ONE PANEL’S VOLTAGE…'}</KText>
      <g transform={`translate(${sx} 0)`}>
        <Thermo x={58} y={150} temp={temp} />
        <text x={58} y={400} textAnchor="middle" fontSize="26" fontWeight="800" fill={temp < 15 ? C.frost : C.sun}>{temp.toFixed(0)}°C</text>
        <SolarPanel x={112} y={140} w={130} h={200} frost={frost} />
        {/* gauge */}
        <g transform="translate(300 250)">
          <path d="M -42 0 A 42 42 0 0 1 42 0" fill="none" stroke="#ffffff30" strokeWidth="8" />
          <path d="M -42 0 A 42 42 0 0 1 42 0" fill="none" stroke={C.volt} strokeWidth="8" strokeDasharray={`${132 * clamp(0.5 + needle * 0.5, 0, 1)} 200`} />
          <line x1="0" y1="0" x2={Math.cos(Math.PI * (1 - (0.5 + needle * 0.45))) * 38} y2={-Math.sin(Math.PI * (1 - (0.5 + needle * 0.45))) * 38} stroke="#fff" strokeWidth="3" />
          {phase === 'payoff' ? <Tick t={p} t0={0.1} t1={1.3} a={N.voc25} b={N.vocCold} x={0} y={34} size={20} unit="V" fill={C.volt} />
            : <text y="34" textAnchor="middle" fontSize="24" fontWeight="800" fill="#fff">? V</text>}
        </g>
      </g>
      {phase === 'payoff' && <g transform={`translate(${sx} 0)`}>
        <KText t={p} at={0.3} x={300} y={330} size={15} fill={C.volt}>{`+${((vPanel / N.voc25 - 1) * 100).toFixed(1)}%`}</KText>
        <rect x="20" y="420" width="320" height="26" rx="13" fill="#ffffff10" />
        <rect x="20" y="420" width={Math.min(330, (str / 700) * 320)} height="26" rx="13" fill={str > N.vmax ? C.danger : C.volt} />
        <line x1={20 + (N.vmax / 700) * 320} x2={20 + (N.vmax / 700) * 320} y1="410" y2="456" stroke={C.danger} strokeWidth="3" />
        <text x={20 + (N.vmax / 700) * 320} y="404" textAnchor="middle" fontSize="12" fontWeight="800" fill={C.danger}>INVERTER MAX {N.vmax} V</text>
        <Tick t={p} t0={1.2} t1={2.4} a={0} b={N.n * N.vocCold} x={24} y={480} size={22} unit="V ×12 string" anchor="start" fill={str > N.vmax ? C.danger : C.text} dp={0} />
        <Stamp t={p} at={2.35} x={180} y={64} size={30}>TRIP!</Stamp>
        <KText t={p} at={3.1} x={180} y={128} size={30} fill={C.frost} slam>COLD = MORE VOLTS</KText>
      </g>}
      <Flash t={p} at={2.35} color={C.danger} />
    </g>
  },
}

// ---------------------------------------------------------------- 2. the cliff: round a maximum down
const cliff: Scene = {
  intro: 5.8, payoff: 4.8, tint: C.frost, plate: 'p_overflow', alt: 'Panels drop into a glass marked 600 volts. Eleven fit. The twelfth makes it overflow.',
  beats: [{ at: 0.1, phase: 'intro', sfx: 'whoosh' }, ...Array.from({ length: 11 }, (_, i) => ({ at: 1.7 + i * 0.3, phase: 'intro' as const, sfx: 'tick' as const, vol: 0.25 })), { at: 0.55, phase: 'payoff', sfx: 'zap', buzz: 120 }, { at: 2.0, phase: 'payoff', sfx: 'whoosh' }, { at: 3.0, phase: 'payoff', sfx: 'ding' }],
  render: ({ g, t, p, phase }: SceneProps) => {
    const H = 260, top = 130, bottom = top + H, slab = (N.vocCold / N.vmax) * H
    const shown = phase === 'intro' ? Math.min(N.max, Math.floor(k(t, 1.6, 1.6 + N.max * 0.3) * N.max + (t > 1.6 ? 1 : 0))) : N.max
    const drop12 = phase === 'payoff' ? eo(k(p, 0.1, 0.55)) * (1 - eio(k(p, 1.9, 2.5))) : 0
    const over = drop12 > 0.95
    const total = shown * N.vocCold + drop12 * N.vocCold
    const sx = shake(p, 0.55, 6)
    return <g>
      <KText t={t} at={0} x={180} y={62} size={22} out={5.0}>THE INVERTER IS A GLASS.</KText>
      <KText t={t} at={0.7} x={180} y={100} size={32} fill={C.frost} slam out={5.0}>{`IT HOLDS ${N.vmax} V.`}</KText>
      <g transform={`translate(${sx} 0)`}>
        <path d={`M 110 ${top - 10} L 118 ${bottom} Q 120 ${bottom + 10} 130 ${bottom + 10} L 230 ${bottom + 10} Q 240 ${bottom + 10} 242 ${bottom} L 250 ${top - 10}`} fill="#5ce1ff10" stroke="#bfefff" strokeWidth="3" />
        <line x1="96" x2="264" y1={top} y2={top} stroke={C.danger} strokeWidth="3" strokeDasharray="7 5" />
        <text x="268" y={top + 4} fontSize="12" fontWeight="800" fill={C.danger}>{N.vmax} V</text>
        {Array.from({ length: shown }, (_, i) => {
          const a = phase === 'intro' ? eo(k(t, 1.6 + i * 0.3, 1.6 + i * 0.3 + 0.28)) : 1
          const yy = bottom - (i + 1) * slab
          return <rect key={i} x={124} y={lerp(-40, yy, a)} width={112} height={slab - 2} rx="3" fill={i % 2 ? '#2b62c9' : '#1f4fae'} stroke={C.frost} strokeOpacity=".5" />
        })}
        {phase !== 'intro' && <rect x={124} y={lerp(top - 70 + Math.sin(g * 4) * 4, bottom - (N.max + 1) * slab, drop12)} width={112} height={slab - 2} rx="3"
          fill={over ? C.danger : '#2b62c9'} stroke="#fff" strokeDasharray={phase === 'ask' ? '5 4' : undefined} opacity={phase === 'ask' ? 0.6 + Math.sin(g * 5) * 0.2 : 1} />}
        {phase === 'ask' && <text x="180" y={top - 48 + Math.sin(g * 4) * 4} textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff">+1 ?</text>}
        {over && Array.from({ length: 14 }, (_, i) => {
          const a = k(p, 0.55, 1.6), side = i % 2 ? 1 : -1
          return <circle key={i} cx={180 + side * (60 + a * (20 + hash01(i) * 40))} cy={top + a * a * (80 + hash01(i + 3) * 160)} r={3 + hash01(i + 5) * 3} fill={C.danger} opacity={1 - a} />
        })}
      </g>
      <text x="180" y={bottom + 44} textAnchor="middle" fontSize="22" fontWeight="800" fill={total > N.vmax ? C.danger : C.text} style={{ fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(shown + drop12 * (drop12 > 0.95 ? 1 : 0))} panels · {total.toFixed(0)} V</text>
      {phase === 'payoff' && <g>
        <Stamp t={p} at={0.55} x={180} y={64} size={26} out={2.1}>OVERFLOW</Stamp>
        <KText t={p} at={2.3} x={180} y={64} size={22} fill={C.ok}>{`${N.vmax} ÷ ${N.vocCold} = ${N.ratio.toFixed(2)} → ${N.max}`}</KText>
        <KText t={p} at={2.6} x={180} y={104} size={32} fill={C.volt} slam>ROUND DOWN.</KText>
      </g>}
      <Flash t={p} at={0.55} color={C.danger} />
    </g>
  },
}

// ---------------------------------------------------------------- 3. heat sags volts: a minimum rounds up
const heat: Scene = {
  intro: 5.6, payoff: 4.4, tint: C.sun, alt: 'A hot afternoon sags each panel to 35 volts. Three panels stay under the inverter wake-up line and it sleeps. A fourth panel wakes it.',
  beats: [{ at: 0.1, phase: 'intro', sfx: 'whoosh' }, { at: 0.2, phase: 'payoff', sfx: 'whoosh' }, { at: 1.2, phase: 'payoff', sfx: 'powerup', buzz: [20, 30, 60] }],
  render: ({ g, t, p, phase }: SceneProps) => {
    const vp = lerp(P.vmp, N.vmpHot, eio(k(t, 1.4, 3.2)))
    const n = phase === 'payoff' ? 3 + eo(k(p, 0.2, 0.9)) : 3
    const vStr = n * N.vmpHot
    const awake = phase === 'payoff' && p > 1.15
    const H = 240, top = 150, max = 180
    const ly = top + H - (N.mppt / max) * H
    return <g>
      <circle cx={330} cy={24} r={20 + Math.sin(g * 3) * 2} fill={C.sun} opacity=".9" />
      {Array.from({ length: 5 }, (_, i) => <path key={i} d={`M 10 ${120 + i * 9} ${Array.from({ length: 12 }, (_, j) => `Q ${15 + j * 30} ${120 + i * 9 + Math.sin(g * 6 + j + i) * 4} ${30 + j * 30} ${120 + i * 9}`).join(' ')}`} stroke={C.sun} strokeOpacity=".18" fill="none" />)}
      <KText t={t} at={0} x={24} y={62} size={30} anchor="start" out={phase === 'payoff' ? 0 : undefined}>{phase === 'payoff' ? '' : '2:30 PM · MAY'}</KText>
      <KText t={t} at={0.7} x={24} y={92} size={30} fill={C.sun} slam anchor="start" out={phase === 'payoff' ? 0 : undefined}>{phase === 'payoff' ? '' : `CELLS AT ${N.tHot}°C`}</KText>
      {/* panels in the string */}
      {Array.from({ length: 4 }, (_, i) => {
        const vis = i < 3 ? (phase === 'intro' ? eo(k(t, 3.2 + i * 0.25, 3.5 + i * 0.25)) : 1) : (phase === 'payoff' ? eo(k(p, 0.2, 0.9)) : 0)
        if (!vis) return null
        return <g key={i} transform={`translate(${24 + i * 52} ${lerp(470, 160, vis)})`} opacity={vis}><SolarPanel x={0} y={0} w={42} h={64} glow={awake ? 0.6 + Math.sin(g * 8 + i) * 0.3 : 0} /></g>
      })}
      <g opacity={phase === 'intro' ? k(t, 1.2, 1.6) : 1}>
        <text x={24} y={262} fontSize="13" fontWeight="800" fill={C.dim}>ONE PANEL WORKS AT</text>
        <text x={24} y={296} fontSize="34" fontWeight="800" fill={C.sun} style={{ fontVariantNumeric: 'tabular-nums' }}>{vp.toFixed(1)}<tspan fontSize="16"> V</tspan></text>
        <text x={24} y={318} fontSize="12" fontWeight="700" fill={C.dim}>heat sags voltage (was {P.vmp} V at 25 °C)</text>
      </g>
      <g opacity={phase === 'intro' ? k(t, 3.4, 3.9) : 1}>
        <Meter x={232} y={top} w={46} h={H} value={vStr} max={max} limit={N.mppt} color={awake ? C.ok : C.sun} limitLabel="" />
        <text x={286} y={ly - 8} fontSize="11" fontWeight="800" fill={C.danger}>WAKE {N.mppt} V</text>
        <text x={255} y={top + H + 26} textAnchor="middle" fontSize="18" fontWeight="800" fill={awake ? C.ok : C.text} style={{ fontVariantNumeric: 'tabular-nums' }}>{vStr.toFixed(0)} V</text>
        <g transform="translate(255 118)">
          <rect x="-34" y="-20" width="68" height="34" rx="8" fill={awake ? C.ok : '#22263a'} />
          <text textAnchor="middle" y="3" fontSize="12" fontWeight="900" fill={awake ? '#04210f' : '#aab'}>{awake ? 'TRACKING' : 'ASLEEP'}</text>
          {!awake && <text x="30" y={-22 - (g * 12) % 20} fontSize="14" fontWeight="900" fill="#aab" opacity={1 - ((g * 12) % 20) / 20}>z</text>}
        </g>
      </g>
      {phase === 'payoff' && <g>
        <KText t={p} at={1.5} x={24} y={58} size={22} anchor="start" fill={C.ok}>{`${N.mppt} ÷ ${N.vmpHot.toFixed(1)} = ${N.minRatio.toFixed(2)} → ${N.min}`}</KText>
        <KText t={p} at={2.1} x={24} y={90} size={24} anchor="start" fill={C.volt} slam>A MINIMUM ROUNDS UP.</KText>
      </g>}
      <Flash t={p} at={1.15} color={C.ok} />
    </g>
  },
}

// ---------------------------------------------------------------- 4. a string is one hose
const hose: Scene = {
  intro: 5.6, payoff: 5.2, tint: C.volt, plate: 'p_hose', alt: 'Current flows like water through one hose that runs through six panels. One panel is shaded and the flow through every panel halves. A bypass path lets the flow skip the shaded panel.',
  beats: [{ at: 0.1, phase: 'intro', sfx: 'whoosh' }, { at: 3.1, phase: 'intro', sfx: 'whoosh', vol: 0.3 }, { at: 0.3, phase: 'payoff', sfx: 'wrong', vol: 0.25 }, { at: 3.0, phase: 'payoff', sfx: 'powerup' }],
  render: ({ g, t, p, phase }: SceneProps) => {
    const pts = [[40, 170], [320, 170], [320, 290], [40, 290], [40, 410], [320, 410]]
    const segs = pts.slice(1).map((b, i) => [pts[i], b] as const)
    const L = segs.reduce((s, [a, b]) => s + Math.hypot(b[0] - a[0], b[1] - a[1]), 0)
    const at = (d: number) => { let r = ((d % L) + L) % L; for (const [a, b] of segs) { const l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (r <= l) return [a[0] + ((b[0] - a[0]) * r) / l, a[1] + ((b[1] - a[1]) * r) / l]; r -= l } return pts[0] }
    const v0 = 140
    const bypass = phase === 'payoff' && p > 3
    // distance travelled: full speed, then half speed once shaded, then full again through the bypass
    const phaseDist = phase === 'payoff' ? v0 * (g - p) + v0 * (0.5 * p + 0.5 * Math.min(p, 0.6) + 0.5 * Math.max(0, p - 3.3)) : v0 * g
    const shade = phase === 'intro' ? eo(k(t, 3, 4)) : 1
    const amps = phase === 'payoff' ? (bypass ? lerp(N.imp / 2, N.imp, eio(k(p, 3, 3.6))) : lerp(N.imp, N.imp / 2, eio(k(p, 0.2, 1)))) : N.imp
    const panels = [[70, 140], [200, 140], [200, 260], [70, 260], [70, 380], [200, 380]]
    return <g>
      <KText t={t} at={0} x={180} y={64} size={30} out={phase === 'payoff' ? 0 : undefined}>{phase === 'payoff' ? '' : 'A STRING IS'}</KText>
      <KText t={t} at={0.6} x={180} y={106} size={44} fill={C.volt} slam out={phase === 'payoff' ? 0 : undefined}>{phase === 'payoff' ? '' : 'ONE HOSE.'}</KText>
      {panels.map(([x, y], i) => <g key={i} transform={`translate(${x} ${y})`}><SolarPanel x={0} y={0} w={86} h={58} dark={i === 3 ? shade * 0.9 : 0} /></g>)}
      {/* cloud */}
      <g transform={`translate(${lerp(-120, 72, eo(phase === 'intro' ? k(t, 2.8, 3.8) : 1))} 236)`} opacity=".85">
        <ellipse cx="44" cy="10" rx="50" ry="20" fill="#cfd6e6" /><ellipse cx="20" cy="0" rx="26" ry="20" fill="#e6ebf5" /><ellipse cx="62" cy="-4" rx="28" ry="22" fill="#e6ebf5" />
      </g>
      {segs.map(([a, b], i) => <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#ffffff30" strokeWidth="10" strokeLinecap="round" />)}
      {bypass && <path d="M 150 290 C 150 340, 20 340, 20 290 C 20 250, 150 250, 150 290" fill="none" stroke={C.ok} strokeWidth="4" strokeDasharray="6 5" opacity={k(p, 3, 3.4)} />}
      {Array.from({ length: 34 }, (_, i) => { const [x, y] = at(phaseDist + (i * L) / 34); return <circle key={i} cx={x} cy={y} r="4" fill={amps < N.imp * 0.75 ? C.sun : C.volt} /> })}
      <g transform="translate(180 476)">
        <text textAnchor="middle" fontSize="13" fontWeight="800" fill={C.dim}>CURRENT THROUGH EVERY PANEL</text>
        <text textAnchor="middle" y="40" fontSize="38" fontWeight="800" fill={amps < N.imp * 0.75 ? C.sun : C.volt} style={{ fontVariantNumeric: 'tabular-nums' }}>{amps.toFixed(1)}<tspan fontSize="18"> A</tspan></text>
      </g>
      {phase !== 'payoff' && shade > 0.5 && <text x="113" y="338" textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff">HALF SUN</text>}
      {phase === 'payoff' && <g>
        <KText t={p} at={1.0} x={180} y={64} size={20} fill={C.sun}>SERIES SHARES ONE CURRENT</KText>
        <KText t={p} at={3.4} x={180} y={100} size={20} fill={C.ok} slam>BYPASS DIODES LET IT SKIP</KText>
      </g>}
    </g>
  },
}

// ---------------------------------------------------------------- 5. the 9 PM blackout
const dinner: Scene = {
  intro: 5.8, payoff: 5.4, tint: C.violet, alt: 'House loads stack up through the evening to about 16 amps. A 32 amp car charger takes the total past the 40 amp main breaker and the flat goes dark. Load balancing shrinks the charger to fit.',
  beats: [{ at: 0.1, phase: 'intro', sfx: 'whoosh' }, { at: 1.6, phase: 'intro', sfx: 'tick' }, { at: 2.4, phase: 'intro', sfx: 'tick' }, { at: 3.2, phase: 'intro', sfx: 'tick' }, { at: 0.6, phase: 'payoff', sfx: 'zap', buzz: [80, 40, 160] }, { at: 2.6, phase: 'payoff', sfx: 'powerup' }],
  render: ({ g, t, p, phase }: SceneProps) => {
    const H = 300, top = 120, max = 50, x = 210, w = 64
    const segsA = [{ a: E.baseA, c: '#6b7bff', l: 'Lights · fridge', at: 1.6 }, { a: E.acA, c: C.frost, l: 'AC', at: 2.4 }, { a: E.cookA, c: C.sun, l: 'Induction', at: 3.2 }]
    const clockH = lerp(18, 21 + 4 / 60, eio(k(t, 0.8, 4)))
    const evA = phase === 'payoff' ? (p < 2.6 ? E.charger * eo(k(p, 0.2, 0.6)) : lerp(E.charger, E.balanced, eio(k(p, 2.6, 3.4)))) : 0
    const total = E.house + evA
    const dark = phase === 'payoff' ? k(p, 0.7, 0.9) * (1 - k(p, 2.2, 2.6)) : 0
    const y = (a: number) => top + H - (a / max) * H
    let acc = 0
    const hh = Math.floor(clockH + 1e-9), mm = Math.floor((clockH - hh) * 60 + 1e-6)
    return <g>
      <text x="24" y="70" fontSize="40" fontWeight="800" fill="#fff" style={{ fontVariantNumeric: 'tabular-nums' }}>{`${hh}:${String(mm).padStart(2, '0')}`}</text>
      <KText t={t} at={0.3} x={24} y={104} size={26} anchor="start" fill={C.violet} slam out={phase === 'payoff' ? 0 : undefined}>{phase === 'payoff' ? '' : 'DINNER RUSH'}</KText>
      <rect x={x} y={top} width={w} height={H} rx="8" fill="#ffffff0d" stroke="#ffffff22" />
      {segsA.map((s) => {
        const a = phase === 'intro' ? eo(k(t, s.at, s.at + 0.4)) : 1
        const y0 = y(acc + s.a * a), hgt = (s.a * a / max) * H
        const el = <g key={s.l}>
          <rect x={x + 4} y={y0} width={w - 8} height={Math.max(0, hgt - 2)} rx="4" fill={s.c} />
          <text x={x - 10} y={y(acc + s.a / 2) + 4} textAnchor="end" fontSize="13" fontWeight="800" fill={s.c} opacity={a}>{s.l} {s.a.toFixed(1)} A</text>
        </g>
        acc += s.a * a
        return el
      })}
      {(phase !== 'intro' || t > 4.3) && <g transform={`translate(0 ${phase === 'payoff' ? 0 : Math.sin(g * 4) * 4})`}>
        <rect x={x + 4} y={phase === 'payoff' ? y(E.house + evA) : y(E.house) - 70} width={w - 8} height={phase === 'payoff' ? Math.max(0, (evA / max) * H - 2) : 60} rx="4"
          fill={total > E.main + 0.01 ? C.danger : C.ok} opacity={phase === 'payoff' ? 1 : 0.55} strokeDasharray={phase === 'payoff' ? undefined : '5 4'} stroke="#fff" />
        <text x={x + w + 10} y={phase === 'payoff' ? y(E.house + evA / 2) : y(E.house) - 36} fontSize="13" fontWeight="900" fill={total > E.main + 0.01 ? C.danger : C.ok}>EV {evA ? evA.toFixed(0) : E.charger} A</text>
      </g>}
      <line x1={x - 16} x2={x + w + 16} y1={y(E.main)} y2={y(E.main)} stroke={C.danger} strokeWidth="3" strokeDasharray="7 5" />
      <text x={x + w + 10} y={y(E.main) - 8} fontSize="12" fontWeight="800" fill={C.danger}>MAIN {E.main} A</text>
      <text x={x + w / 2} y={top + H + 30} textAnchor="middle" fontSize="20" fontWeight="800" fill={total > E.main ? C.danger : C.text} style={{ fontVariantNumeric: 'tabular-nums' }}>{(phase === 'intro' ? acc : total).toFixed(1)} A</text>
      {phase === 'payoff' && <g>
        <rect x="-20" y="-20" width="400" height="680" fill="#000" opacity={dark * 0.92} />
        {dark > 0.5 && <text x="180" y="300" textAnchor="middle" fontSize="40" fontWeight="900" fill="#fff" opacity={dark}>*click*</text>}
        <KText t={p} at={2.7} x={24} y={100} size={16} anchor="start" fill={C.ok}>{`LOAD BALANCING: CAR GETS ${E.balanced} A`}</KText>
        <KText t={p} at={3.4} x={24} y={150} size={22} anchor="start" fill={C.volt} slam>DINNER FIRST.</KText>
        <KText t={p} at={3.7} x={24} y={178} size={22} anchor="start" fill={C.volt} slam>CAR SECOND.</KText>
      </g>}
    </g>
  },
}

// ---------------------------------------------------------------- 6. same key, one charge
const idem: Scene = {
  intro: 5.6, payoff: 4.8, tint: C.frost, alt: 'A phone sends a 499 rupee payment with key K7F2. The server charges it, but the reply is cut on the way back. The phone retries with the same key.',
  beats: [{ at: 0.6, phase: 'intro', sfx: 'whoosh' }, { at: 1.6, phase: 'intro', sfx: 'ding', vol: 0.3 }, { at: 2.6, phase: 'intro', sfx: 'zap', vol: 0.35 }, { at: 3.9, phase: 'intro', sfx: 'whoosh' }, { at: 0.2, phase: 'payoff', sfx: 'tick' }, { at: 2.4, phase: 'payoff', sfx: 'combo' }],
  render: ({ g, t, p, phase, ok }: SceneProps) => {
    const PX = 60, SX = 290, Y = 250
    const pkt = (x: number, y: number, label: string, color: string, op = 1) => <g transform={`translate(${x} ${y})`} opacity={op}>
      <rect x="-46" y="-16" width="92" height="32" rx="16" fill={color} /><text textAnchor="middle" y="5" fontSize="12" fontWeight="900" fill="#05070c">{label}</text></g>
    const f1 = eio(k(t, 0.6, 1.5)), rep = eio(k(t, 1.8, 2.6)), retry = eio(k(t, 3.9, 4.8))
    const showWrong = ok === false && p < 1.6
    const back = phase === 'payoff' ? eio(k(p, showWrong ? 1.6 : 0.3, showWrong ? 2.4 : 1.2)) : 0
    return <g>
      <KText t={t} at={0} x={180} y={70} size={30} slam out={phase === 'payoff' ? 0 : undefined}>{phase === 'payoff' ? '' : 'TAP PAY. ONCE.'}</KText>
      {/* phone */}
      <g transform={`translate(${PX} ${Y})`}><rect x="-28" y="-52" width="56" height="104" rx="10" fill="#111829" stroke="#ffffff50" strokeWidth="2" />
        <text textAnchor="middle" y="-14" fontSize="11" fontWeight="800" fill="#fff">₹499</text>
        {phase !== 'payoff' && t > 2.8 && t < 3.9 && <circle r="10" cy="16" fill="none" stroke={C.frost} strokeWidth="3" strokeDasharray="20 40" transform={`rotate(${g * 400} 0 16)`} />}
        {phase === 'payoff' && back > 0.95 && <text textAnchor="middle" y="22" fontSize="20" fill={C.ok}>✓</text>}</g>
      {/* server */}
      <g transform={`translate(${SX} ${Y})`}><rect x="-36" y="-58" width="72" height="116" rx="8" fill="#151a2e" stroke="#ffffff50" strokeWidth="2" />
        {[0, 1, 2].map((i) => <rect key={i} x="-26" y={-46 + i * 22} width="52" height="14" rx="3" fill="#ffffff14" />)}
        <circle cx="22" cy="40" r="4" fill={C.ok} /></g>
      {/* ledger */}
      <g transform="translate(24 340)">
        <text fontSize="12" fontWeight="800" fill={C.dim}>LEDGER</text>
        {t > 1.5 && <text y="24" fontSize="16" fontWeight="800" fill="#fff">K7F2 · ₹499 charged</text>}
        {showWrong && p > 0.4 && <text y="48" fontSize="16" fontWeight="800" fill={C.danger}>????? · ₹499 charged</text>}
      </g>
      {t < 1.6 && pkt(lerp(PX, SX, f1), Y - 70, 'PAY · K7F2', C.volt, f1 > 0 ? 1 : 0)}
      {t > 1.8 && t < 3.0 && <g>{pkt(lerp(SX, PX, Math.min(rep, 0.5)), Y + 70, rep > 0.48 ? '✂ LOST' : 'OK ₹499', rep > 0.48 ? C.danger : C.ok, 1 - k(t, 2.6, 3))}</g>}
      {t > 2.5 && t < 3.2 && <text x={175} y={Y + 110} textAnchor="middle" fontSize="40">✂️</text>}
      {phase !== 'payoff' && t > 3.9 && pkt(lerp(PX, SX - 80, retry), Y - 70, 'RETRY · K7F2', C.frost)}
      {phase === 'ask' && <text x={SX - 80} y={Y - 104} textAnchor="middle" fontSize="22" fontWeight="900" fill="#fff" opacity={0.6 + Math.sin(g * 6) * 0.4}>?</text>}
      {phase === 'payoff' && <g>
        {showWrong && <Stamp t={p} at={0.4} x={180} y={120} size={20} out={2.4}>CHARGED TWICE</Stamp>}
        {pkt(lerp(SX - 80, SX, eio(k(p, showWrong ? 1.4 : 0.1, showWrong ? 1.6 : 0.3))), Y - 70, 'RETRY · K7F2', C.frost, 1 - k(p, 0.3, 0.4) * (showWrong ? 0 : 1))}
        <g opacity={k(p, showWrong ? 1.6 : 0.3, showWrong ? 1.8 : 0.5)}><rect x={SX - 60} y={Y - 30} width="120" height="26" rx="6" fill={C.volt} />
          <text x={SX} y={Y - 12} textAnchor="middle" fontSize="11" fontWeight="900" fill="#05070c">K7F2 → saved reply</text></g>
        {back > 0 && back < 1 && pkt(lerp(SX, PX, back), Y + 70, 'REPLAY ✓', C.ok)}
        <KText t={p} at={showWrong ? 2.6 : 1.4} x={180} y={70} size={24} fill={C.ok} slam>SAME KEY = SAME REPLY</KText>
        <KText t={p} at={showWrong ? 3.2 : 2.2} x={24} y={415} size={16} anchor="start" fill={C.dim}>Without the key: ₹998.</KText>
      </g>}
    </g>
  },
}

// ---------------------------------------------------------------- 7. the thundering herd
const herd: Scene = {
  intro: 5.8, payoff: 5.0, tint: C.danger, alt: 'Thousands of phones retry in sync every second and keep a recovering server down. With backoff and random jitter, retries spread out and the server recovers.',
  beats: [{ at: 0.1, phase: 'intro', sfx: 'whoosh' }, ...[2, 3, 4, 5].map((at) => ({ at, phase: 'intro' as const, sfx: 'boom' as const, vol: 0.22, buzz: 40 })), { at: 2.6, phase: 'payoff', sfx: 'powerup' }],
  render: ({ g, t, p, phase }: SceneProps) => {
    const dots = Array.from({ length: 42 }, (_, i) => ({ x: 34 + (i % 6) * 22, y: 170 + Math.floor(i / 6) * 34 }))
    const SX = 300, SY = 280
    const sync = [2, 3, 4, 5]
    const fires = (i: number) => phase === 'payoff'
      ? [0, 1, 2, 3].map((j) => 0.2 + (2 ** j - 1) * 0.45 + hash01(i * 7 + j) * (0.4 + j * 0.5))
      : sync
    const clock = phase === 'payoff' ? p : phase === 'ask' ? 2 + (g % 4) : t
    const flying: { x: number; y: number }[] = []
    let load = 0
    dots.forEach((d, i) => fires(i).forEach((f) => {
      const age = clock - f
      if (age >= 0 && age <= 0.5) { const a = age / 0.5; flying.push({ x: lerp(d.x, SX - 30, a), y: lerp(d.y, SY, a) }); if (a > 0.7) load++ }
    }))
    const cap = 10
    const recovered = phase === 'payoff' && p > 2.6
    const down = phase !== 'payoff' ? t > 1 : !recovered
    return <g>
      <KText t={t} at={0} x={180} y={62} size={26} out={phase === 'payoff' ? 0 : undefined}>{phase === 'payoff' ? '' : 'SERVER BLINKS.'}</KText>
      <KText t={t} at={1.2} x={180} y={98} size={21} fill={C.danger} slam out={phase === 'payoff' ? 0 : undefined}>{phase === 'payoff' ? '' : 'EVERY PHONE RETRIES AT ONCE.'}</KText>
      {dots.map((d, i) => <rect key={i} x={d.x - 6} y={d.y - 10} width="12" height="20" rx="3" fill="#2a3150" stroke="#ffffff40" />)}
      {flying.map((f, i) => <circle key={i} cx={f.x} cy={f.y} r="3.5" fill={phase === 'payoff' ? C.frost : C.danger} />)}
      <g transform={`translate(${SX + shake(phase === 'payoff' ? 0 : clock % 1, 0, load > cap ? 5 : 0)} ${SY})`}>
        <rect x="-30" y="-56" width="60" height="112" rx="8" fill="#151a2e" stroke={down ? C.danger : C.ok} strokeWidth="3" />
        <text textAnchor="middle" y="5" fontSize="12" fontWeight="900" fill={down ? C.danger : C.ok}>{down ? 'DOWN' : 'UP ✓'}</text>
      </g>
      <g transform="translate(24 470)">
        <text fontSize="12" fontWeight="800" fill={C.dim}>LOAD ON SERVER</text>
        <rect y="10" width="312" height="18" rx="9" fill="#ffffff10" />
        <rect y="10" width={Math.min(312, (load / 40) * 312)} height="18" rx="9" fill={load > cap ? C.danger : C.ok} />
        <line x1={(cap / 40) * 312} x2={(cap / 40) * 312} y1="4" y2="34" stroke="#fff" strokeWidth="2" />
        <text x={(cap / 40) * 312 + 4} y="46" fontSize="11" fontWeight="800" fill="#fff">capacity</text>
      </g>
      {phase === 'payoff' && <g>
        <KText t={p} at={0.2} x={180} y={62} size={18} fill={C.frost}>1 s · 2 s · 4 s · 8 s + JITTER</KText>
        <KText t={p} at={2.8} x={180} y={100} size={24} fill={C.ok} slam>SPREAD OUT. RECOVERED.</KText>
      </g>}
    </g>
  },
}

export const SCENES = { cold, cliff, heat, hose, dinner, idem, herd }
export type SceneId = keyof typeof SCENES
