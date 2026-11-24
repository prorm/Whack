// The Living Rooftop: a deterministic solar-string simulator the learner breaks with their own hands.
import { useEffect, useMemo, useRef, useState } from 'react'
import { haptic, hum, sfx } from './fx'
import { HOME, SEASONS, clock, maxPanels, peakOfDay, reading, type Reading, type Season, type Zone } from './physics'

const { panel: P, inverter: INV } = HOME
const SCALE = 700

export type MissionId = 'kill' | 'max' | 'sleep' | 'free'
export const MISSIONS: Record<Exclude<MissionId, 'free'>, { title: string; goal: string; hint: string; start: { n: number; season: Season; hour: number }; lockN?: boolean }> = {
  kill: { title: 'Sabotage #1', goal: 'Kill the inverter. You may NOT add a panel.', hint: 'Panels are locked at 12. What else can you change? Try the other season, and try early morning.', start: { n: 12, season: 'may', hour: 13 }, lockN: true },
  max: { title: 'Sabotage #2', goal: 'Find the BIGGEST string that survives a full January day. Then press Run the day.', hint: 'Watch the curve under the gauge. The spike is at sunrise. Keep the whole curve under the red line.', start: { n: 8, season: 'jan', hour: 9 } },
  sleep: { title: 'Sabotage #3', goal: 'Put the inverter to sleep on a sunny May afternoon.', hint: 'Heat drags the working voltage down. Fewer panels means less voltage.', start: { n: 8, season: 'may', hour: 14 } },
}

const ZONE_TEXT: Record<Zone, string> = { dark: 'NO SUN', asleep: 'TOO LOW · SLEEPING', tracking: 'TRACKING ✓', clipping: 'ABOVE WINDOW', damage: 'OVERVOLTAGE' }

function sky(season: Season, h: number, sun: number) {
  const { sunrise, sunset } = SEASONS[season]
  const night = h < sunrise - 0.4 || h > sunset + 0.4
  if (night) return 'linear-gradient(180deg,#05060f 0%,#0b1030 60%,#151a3a 100%)'
  const edge = Math.min(Math.abs(h - sunrise), Math.abs(h - sunset))
  if (edge < 1.2) return `linear-gradient(180deg,#1a1e48 0%,#5b3a6e 35%,#ff8a3d ${70 + edge * 10}%,#ffd27a 100%)`
  const hot = season === 'may'
  return hot ? `linear-gradient(180deg,#7fb7ff 0%,#cfe6ff ${40 + sun * 30}%,#fff6d8 100%)` : `linear-gradient(180deg,#3d6fb8 0%,#8db8e8 60%,#d8e8f5 100%)`
}

function Gauge({ r }: { r: Reading }) {
  const a = (v: number) => Math.PI * (1 - Math.min(v, SCALE) / SCALE)
  const pt = (v: number, rad: number) => `${110 + rad * Math.cos(a(v))},${110 - rad * Math.sin(a(v))}`
  const arc = (v0: number, v1: number, rad: number) => `M${pt(v0, rad)} A${rad},${rad} 0 0 1 ${pt(v1, rad)}`
  const needle = (v: number, len: number) => { const [x, y] = pt(v, len).split(',').map(Number); return { x2: x, y2: y } }
  return (
    <svg viewBox="0 0 220 128" className="fx-gauge" role="img" aria-label={`String voltage ${r.voc.toFixed(0)} volts, limit ${INV.vmax} volts`}>
      <path d={arc(0, INV.mpptMin, 92)} className="band sleep" />
      <path d={arc(INV.mpptMin, INV.mpptMax, 92)} className="band ok" />
      <path d={arc(INV.mpptMax, INV.vmax, 92)} className="band warn" />
      <path d={arc(INV.vmax, SCALE, 92)} className="band dead" />
      {[0, 100, 200, 300, 400, 500, 600, 700].map((v) => <text key={v} x={pt(v, 74).split(',')[0]} y={+pt(v, 74).split(',')[1] + 3} className="tick">{v}</text>)}
      <line x1="110" y1="110" {...needle(r.vmp, 80)} className="needle vmp" />
      <line x1="110" y1="110" {...needle(r.voc, 88)} className="needle voc" />
      <circle cx="110" cy="110" r="5" className="hub" />
    </svg>
  )
}

function DayCurve({ n, season, hour }: { n: number; season: Season; hour: number }) {
  const W = 300, H = 84, LO = 470, HI = 650
  const x = (h: number) => ((h - 5) / 14) * W
  const y = (v: number) => H - (Math.max(LO, Math.min(HI, v)) - LO) / (HI - LO) * H
  const path = (s: Season) => {
    let d = ''
    for (let h = 5; h <= 19.001; h += 0.05) {
      const v = reading(n, s, h).voc
      if (v <= 0) continue
      d += `${d ? 'L' : 'M'}${x(h).toFixed(1)},${y(v).toFixed(1)}`
    }
    return d
  }
  const other: Season = season === 'jan' ? 'may' : 'jan'
  const pk = peakOfDay(n, season)
  return (
    <svg viewBox={`0 0 ${W} ${H + 12}`} className="fx-curve" aria-label={`Wake-up voltage across the day. Peak ${pk.voc.toFixed(0)} volts at ${clock(pk.hour)}`}>
      {[500, 550].map((v) => <line key={v} x1="0" x2={W} y1={y(v)} y2={y(v)} className="grid" />)}
      {[500, 550].map((v) => <text key={'t' + v} x="2" y={y(v) - 2} className="lbl">{v} V</text>)}
      <line x1="0" x2={W} y1={y(INV.vmax)} y2={y(INV.vmax)} className="limit" />
      <text x={W - 2} y={y(INV.vmax) - 3} className="lbl hot" textAnchor="end">{INV.vmax} V limit</text>
      <path d={path(other)} className={`curve ghost ${other}`} />
      <path d={path(season)} className={`curve ${season}`} />
      {pk.voc > 0 && <g className={`peak ${pk.voc > INV.vmax ? 'over' : ''}`}>
        <circle cx={x(pk.hour)} cy={y(pk.voc)} r="3.5" />
        <text x={x(pk.hour) + (pk.hour > 15 ? -6 : 6)} y={y(pk.voc) + 11} textAnchor={pk.hour > 15 ? 'end' : 'start'} className="lbl pk">peak {pk.voc.toFixed(0)} V · {clock(pk.hour)}</text>
      </g>}
      <line x1={x(hour)} x2={x(hour)} y1="0" y2={H} className="now" />
      {[6, 9, 12, 15, 18].map((h) => <text key={h} x={x(h)} y={H + 10} className="lbl" textAnchor="middle">{h}:00</text>)}
    </svg>
  )
}

function Roof({ n, r, season, xray, dead }: { n: number; r: Reading; season: Season; xray: boolean; dead: boolean }) {
  const frost = Math.max(0, Math.min(1, (14 - r.cell) / 8))
  const live = r.sun > 0.02
  const pos = (i: number) => { const row = i < 7 ? 0 : 1; const col = row === 0 ? i : 13 - i; return { x: 14 + col * 40, y: 26 + row * 46 } }
  const wire = Array.from({ length: n }, (_, i) => pos(i)).map((p, i) => `${i ? 'L' : 'M'}${p.x + 17},${p.y + 20}`).join(' ') + (n ? ` L300,${pos(n - 1).y + 20} L300,70 L318,70` : '')
  const speed = Math.max(0.25, 2.2 - r.voc / 350)
  return (
    <svg viewBox="0 0 360 130" className={`fx-roof ${r.zone} ${dead ? 'dead' : ''}`} role="img" aria-label={`${n} panels in series on the roof`}>
      <defs>
        <linearGradient id="pv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1d3a8a" /><stop offset="1" stopColor="#0a1640" /></linearGradient>
      </defs>
      <path d={wire} className="wire" style={{ animationDuration: `${speed}s`, opacity: live ? 1 : 0.35 }} />
      {Array.from({ length: 14 }, (_, i) => {
        const p = pos(i)
        const on = i < n
        return <g key={i} transform={`translate(${p.x},${p.y})`} className={`pv ${on ? 'on' : 'off'}`}>
          <rect width="34" height="40" rx="2" fill={on ? 'url(#pv)' : 'none'} className="pv-body" />
          {on && <>
            <path d="M0,13H34M0,27H34M11,0V40M23,0V40" className="pv-grid" />
            <rect width="34" height="40" rx="2" className="pv-frost" style={{ opacity: frost * 0.75 }} />
            <rect width="34" height="40" rx="2" className="pv-glow" style={{ opacity: live ? 0.15 + r.sun * 0.45 : 0 }} />
            {xray && live && <text x="17" y="-3" className="pv-v" textAnchor="middle">{r.vocPanel.toFixed(1)}</text>}
          </>}
        </g>
      })}
      <g transform="translate(316,48)" className={`inv ${r.zone}`}>
        <rect width="36" height="46" rx="4" className="inv-body" />
        <rect x="5" y="7" width="26" height="12" rx="1.5" className="inv-screen" />
        <circle cx="18" cy="32" r="4" className="inv-led" />
      </g>
      <text x="334" y="108" textAnchor="middle" className="inv-name">INVERTER</text>
      <text x="8" y="124" className="season-tag">{season === 'jan' ? '❄' : '☀'} {r.cell.toFixed(0)} °C cell</text>
    </svg>
  )
}

function Sparks() {
  return <div className="fx-sparks" aria-hidden="true">{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ ['--a' as string]: `${(i * 360) / 22}deg`, ['--d' as string]: `${40 + ((i * 37) % 70)}px`, animationDelay: `${(i % 5) * 0.03}s` }} />)}</div>
}

export function Rooftop({ mission = 'free', onWin }: { mission?: MissionId; onWin?: (detail: string) => void }) {
  const m = mission === 'free' ? undefined : MISSIONS[mission]
  const [n, setN] = useState(m?.start.n ?? 10)
  const [season, setSeason] = useState<Season>(m?.start.season ?? 'jan')
  const [hour, setHour] = useState(m?.start.hour ?? 9)
  const [xray, setXray] = useState(false)
  const [dead, setDead] = useState<null | Reading>(null)
  const [playing, setPlaying] = useState(false)
  const [hint, setHint] = useState(false)
  const [won, setWon] = useState('')
  const [note, setNote] = useState('')
  const raf = useRef(0)
  const peakRef = useRef(0)
  const r = useMemo(() => reading(n, season, hour), [n, season, hour])

  useEffect(() => { hum(r.sun > 0.02 && !dead, 0.06 + Math.min(r.voc, 700) / 700 * 0.12); return () => hum(false) }, [r.sun, r.voc, dead])
  useEffect(() => { const t = setTimeout(() => setHint(true), 20000); return () => clearTimeout(t) }, [mission])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const win = (detail: string) => { if (won) return; setWon(detail); sfx('combo'); haptic([30, 40, 60]); onWin?.(detail) }

  // damage is latched: a real inverter does not heal itself
  useEffect(() => {
    if (r.zone === 'damage' && !dead) {
      setDead(r)
      sfx('zap', 0.8); setTimeout(() => sfx('alarm', 0.5), 120); haptic([80, 50, 160])
      if (mission === 'kill') win(`${n} panels at ${clock(hour)} in ${season === 'jan' ? 'January' : 'May'}: ${r.voc.toFixed(0)} V > ${INV.vmax} V`)
    }
    if (mission === 'sleep' && r.zone === 'asleep' && season === 'may' && r.sun > 0.5) win(`${n} panels at ${r.cell.toFixed(0)} °C: working voltage ${r.vmp.toFixed(0)} V < ${INV.mpptMin} V`)
  }, [r]) // eslint-disable-line react-hooks/exhaustive-deps

  const playDay = () => {
    if (playing) return
    setDead(null); setPlaying(true); setNote(''); peakRef.current = 0
    sfx('whoosh')
    const t0 = performance.now(), dur = 7000
    const step = (t: number) => {
      const h = 5 + 14 * Math.min(1, (t - t0) / dur)
      setHour(h)
      const v = reading(n, season, h).voc
      peakRef.current = Math.max(peakRef.current, v)
      if (h < 19 && v <= INV.vmax) raf.current = requestAnimationFrame(step)
      else {
        setPlaying(false)
        if (mission === 'max' && season === 'jan') {
          const best = maxPanels(INV, P, SEASONS.jan.tMin)
          if (v > INV.vmax) setNote(`💥 ${n} panels died at ${clock(h)}. The cold sunrise got it.`)
          else if (n === best) win(`${n} panels survived. Peak ${peakRef.current.toFixed(0)} V at sunrise, just under ${INV.vmax} V.`)
          else setNote(`Survived, peak ${peakRef.current.toFixed(0)} V. But you're leaving power on the roof. Can you fit one more?`)
        }
      }
    }
    raf.current = requestAnimationFrame(step)
  }

  const reset = () => { setDead(null); sfx('powerup', 0.4) }
  const shown = dead ?? r
  return (
    <section className={`fx-lab ${dead ? 'is-dead' : ''} ${shown.zone}`} aria-label="Living rooftop simulator">
      {m && <header className={`fx-mission ${won ? 'won' : ''}`}>
        <span className="fx-kicker">{m.title}</span>
        <p className="fx-goal">{won ? '✓ ' + m.goal : m.goal}</p>
        {won ? <p className="fx-win" role="status">{won}</p> : hint && <p className="fx-hint">{m.hint}</p>}
        {note && !won && <p className="fx-note" role="status">{note}</p>}
      </header>}
      <div className="fx-stage" style={{ background: sky(season, hour, r.sun) }}>
        <div className="fx-sun" style={{ left: `${((hour - 5) / 14) * 100}%`, bottom: `${8 + r.sun * 62}%`, opacity: r.sun > 0.01 ? 1 : 0 }} />
        {r.cell < 12 && r.sun > 0 && <div className="fx-frost-overlay" style={{ opacity: Math.min(1, (12 - r.cell) / 6) }} />}
        {r.cell > 55 && <div className="fx-heat-overlay" style={{ opacity: Math.min(1, (r.cell - 55) / 12) }} />}
        <div className="fx-clock"><b>{clock(hour)}</b><span>{SEASONS[season].label}</span><span>air {r.air.toFixed(0)} °C</span></div>
        <Roof n={n} r={shown} season={season} xray={xray} dead={!!dead} />
        {dead && <><Sparks /><div className="fx-smoke" aria-hidden="true" /></>}
      </div>
      <div className={`fx-readout ${shown.zone}`}>
        <Gauge r={shown} />
        <div className="fx-digits">
          <span className="fx-big" aria-live="polite">{shown.voc.toFixed(0)}<small>V</small></span>
          <span className="fx-zone">{dead ? `☠ DEAD · ${shown.voc.toFixed(0)} V > ${INV.vmax} V` : ZONE_TEXT[shown.zone]}</span>
          <span className="fx-legend"><span><i className="voc" /> wake-up (Voc)</span><span><i className="vmp" /> working (Vmp) {shown.vmp.toFixed(0)} V</span></span>
        </div>
      </div>
      <DayCurve n={n} season={season} hour={hour} />
      {xray && <p className="fx-xray" aria-live="polite">{r.sun <= 0.02 ? <>No sun on the panels: <b>0 V</b>. Drag the clock into daylight.</> : <>
        <b>{n}</b> × {P.voc} V × (1 {P.betaVoc < 0 ? '−' : '+'} {Math.abs(P.betaVoc)}% × ({r.cell.toFixed(1)} − 25) °C) = <b>{r.voc.toFixed(1)} V</b>
        <span>Wake-up voltage: at sunrise the inverter has not started yet, so it sees the full open-circuit voltage.</span></>}
      </p>}
      <div className="fx-controls">
        <div className="fx-stepper" role="group" aria-label="Panels in the string">
          <button onClick={() => { setN(Math.max(1, n - 1)); setDead(null); sfx('tick', 0.4) }} disabled={m?.lockN || n <= 1} aria-label="Remove a panel">−</button>
          <span><b>{n}</b> panels{m?.lockN && <em> 🔒</em>}</span>
          <button onClick={() => { setN(Math.min(14, n + 1)); sfx('tick', 0.4) }} disabled={m?.lockN || n >= 14} aria-label="Add a panel">+</button>
        </div>
        <div className="fx-seg" role="group" aria-label="Season">
          {(['jan', 'may'] as Season[]).map((s) => <button key={s} aria-pressed={season === s} onClick={() => { setSeason(s); setDead(null); sfx(s === 'jan' ? 'frost' : 'whoosh', 0.5) }}>{s === 'jan' ? '❄ January' : '☀ May'}</button>)}
        </div>
        <label className="fx-slider">
          <span>Clock</span>
          <input type="range" min={5} max={19} step={1 / 12} value={hour} onChange={(e) => { setHour(+e.target.value) }} aria-valuetext={clock(hour)} />
        </label>
        <div className="fx-row">
          <button className="fx-btn ghost" aria-pressed={xray} onClick={() => setXray(!xray)}>{xray ? '◉ X-ray on' : '○ X-ray the maths'}</button>
          <button className="fx-btn" onClick={playDay} disabled={playing}>{playing ? 'Running…' : `▶ Run the ${season === 'jan' ? 'January' : 'May'} day`}</button>
          {dead && <button className="fx-btn hot" onClick={reset}>⟲ New inverter</button>}
        </div>
      </div>
      <p className="fx-fine">DEMO datasheet: {P.name}, Voc {P.voc} V, {P.betaVoc}%/°C · {INV.name}, max {INV.vmax} V, MPPT {INV.mpptMin}–{INV.mpptMax} V. Simplified model: full Voc once the sun is up.</p>
    </section>
  )
}
