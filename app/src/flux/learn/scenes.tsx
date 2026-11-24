// Stage scenes for FLUX Learn, in the house style: deep navy, glass panels, mono numbers that roll, one accent per moment.
// Every scene is parametric. Values come from the lesson state, and every number is computed by physics.ts.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { media } from '../fx'
import { vmpAt, vocAt, workOrder } from '../physics'
import { checkRoof, ROOFTOP } from '../assess'
import { INVERTER as INV, PANEL as P, SITE } from './course'

const r2 = (x: number) => Math.round(x * 100) / 100

/** A number that rolls to its new value (≈450 ms, ease-out). Reduced motion: jumps. */
export function useRoll(target: number, ms = 450) {
  const [v, setV] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); return }
    const a = from.current, t0 = performance.now()
    let id = 0
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms), e = 1 - (1 - k) ** 3
      const x = a + (target - a) * e
      setV(x); from.current = x
      if (k < 1) id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [target, ms])
  return v
}
export function Num({ v, dp = 1, unit = '', tone }: { v: number; dp?: number; unit?: string; tone?: string }) {
  const x = useRoll(v)
  return <b className={`ln-num ${tone ?? ''}`}>{x.toFixed(dp)}{unit && <small> {unit}</small>}</b>
}

export function Glass({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return <section className={`ln-glass ${className}`}><h4>{title}</h4>{children}</section>
}
export function Vars({ rows }: { rows: { k: string; v: ReactNode; tone?: string; hot?: boolean }[] }) {
  return <dl className="ln-vars">{rows.map((r) => <div key={r.k} className={r.hot ? 'hot' : ''}><dt>{r.k}</dt><dd className={r.tone}>{r.v}</dd></div>)}</dl>
}

// ---------------------------------------------------------------- 0 · cold open
export function Hook() {
  return <div className="ln-hook">
    <img src={media('dawn.webp')} alt="" />
    <div className="ln-hook-copy">
      <p className="ln-mono">BENGALURU · 14 JAN</p>
      <h2 className="ln-clock">06:47</h2>
      <p className="ln-mono frost">{SITE.tMin} °C · first sun</p>
      <div className="ln-fault"><i /> INVERTER FAULT · DC OVERVOLTAGE</div>
    </div>
  </div>
}

// ---------------------------------------------------------------- 1 · water pipe: push, flow, power
export function Pipe({ v, i, focus }: { v: number; i: number; focus?: string }) {
  const h = 40 + (v / 60) * 230
  const dur = i > 0.2 ? Math.max(0.25, 3 / i) : 0
  const p = v * i
  return <div className="ln-split">
    <svg viewBox="0 0 640 520" className="ln-svg" role="img" aria-label={`Water analogy: push ${v.toFixed(1)} volts, flow ${i.toFixed(1)} amps`}>
      <defs><linearGradient id="water" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#5ce1ff" /><stop offset="1" stopColor="#1f6fd1" /></linearGradient></defs>
      <line x1="40" x2="600" y1="470" y2="470" stroke="#ffffff22" strokeWidth="2" />
      {/* tower + tank: higher tank = more push */}
      <rect x="92" y={470 - h} width="16" height={h} fill="#ffffff18" style={{ transition: 'all .5s cubic-bezier(.2,.8,.2,1)' }} />
      <g style={{ transform: `translateY(${-h}px)`, transition: 'transform .5s cubic-bezier(.2,.8,.2,1)' }}>
        <rect x="40" y="380" width="120" height="90" rx="10" fill="url(#water)" opacity=".9" stroke={focus === 'push' ? '#FFD43B' : '#ffffff40'} strokeWidth={focus === 'push' ? 4 : 2} />
        <text x="100" y="432" textAnchor="middle" className="ln-svg-label">PUSH</text>
      </g>
      {/* pipe down and across to the load */}
      <path d={`M 108 ${470 - h + 90} L 108 440 Q 108 460 128 460 L 470 460`} stroke="#ffffff30" strokeWidth="22" fill="none" strokeLinecap="round" style={{ transition: 'd .5s' }} />
      <path d={`M 108 ${470 - h + 90} L 108 440 Q 108 460 128 460 L 470 460`} stroke="#5ce1ff" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray="10 22"
        className={dur ? 'ln-flow' : ''} style={{ animationDuration: `${dur}s`, opacity: i > 0.2 ? 1 : 0.15 }} />
      {/* load: a bulb whose glow is power */}
      <g transform="translate(520 400)">
        <circle r={36 + Math.min(1, p / 540) * 50} fill="#FFD43B" opacity={0.08 + Math.min(1, p / 540) * 0.32} style={{ transition: 'all .4s' }} />
        <circle r="34" fill="#1a2238" stroke={focus === 'power' ? '#FFD43B' : '#ffffff40'} strokeWidth={focus === 'power' ? 4 : 2} />
        <path d="M -12 8 Q 0 -22 12 8" stroke="#FFD43B" strokeWidth="4" fill="none" opacity={0.3 + Math.min(1, p / 540) * 0.7} />
      </g>
      <g transform="translate(330 438)"><text textAnchor="middle" className={`ln-svg-label ${focus === 'flow' ? 'on' : ''}`}>FLOW →</text></g>
    </svg>
    <div className="ln-side">
      <Glass title="Variables">
        <Vars rows={[
          { k: 'push (voltage)', v: <Num v={v} unit="V" />, tone: 'y', hot: focus === 'push' },
          { k: 'flow (current)', v: <Num v={i} unit="A" />, tone: 'c', hot: focus === 'flow' },
          { k: 'power = V × I', v: <Num v={p} dp={0} unit="W" />, tone: 'g', hot: focus === 'power' },
        ]} />
      </Glass>
      <div className="ln-eq">P = V × I</div>
    </div>
  </div>
}

// ---------------------------------------------------------------- 2 · series / parallel string
export function StringScene({ n, mode }: { n: number; mode: 'series' | 'parallel' }) {
  const V = mode === 'series' ? n * P.vmp : P.vmp
  const I = mode === 'series' ? P.imp : n * P.imp
  const tiles = Array.from({ length: n })
  return <div className="ln-split">
    <div className={`ln-string ${mode}`} aria-label={`${n} panels in ${mode}`}>
      {tiles.map((_, k) => <div key={k} className="ln-tile" style={{ animationDelay: `${Math.min(k, 8) * 45}ms` }}>
        <span>{P.vmp}<small>V</small></span>{mode === 'series' && k < n - 1 && <i className="ln-plus">+</i>}
      </div>)}
    </div>
    <div className="ln-side">
      <Glass title={mode === 'series' ? 'Series · end to end' : 'Parallel · side by side'}>
        <Vars rows={[
          { k: 'panels', v: <Num v={n} dp={0} /> },
          { k: 'string push', v: <Num v={V} unit="V" />, tone: 'y', hot: mode === 'series' },
          { k: 'current', v: <Num v={I} unit="A" />, tone: 'c', hot: mode === 'parallel' },
          { k: 'power', v: <Num v={V * I} dp={0} unit="W" />, tone: 'g' },
        ]} />
      </Glass>
      <div className="ln-eq">{mode === 'series' ? 'volts ADD · current SAME' : 'current ADDS · volts SAME'}</div>
    </div>
  </div>
}

// ---------------------------------------------------------------- 3 · thermometer: cold makes volts
export function Thermo({ t }: { t: number }) {
  const voc = vocAt(P, t), str = 12 * voc
  const frost = Math.max(0, Math.min(1, (10 - t) / 20))
  const f = (t + 10) / 80
  return <div className="ln-split">
    <svg viewBox="0 0 640 520" className="ln-svg" role="img" aria-label={`Cell at ${t} degrees: one panel ${voc.toFixed(1)} volts, twelve panels ${str.toFixed(0)} volts`}>
      <g transform="translate(70 40)">
        <rect x="-16" y="0" width="32" height="250" rx="16" fill="#ffffff10" stroke="#ffffff35" />
        <rect x="-8" y={250 - f * 235} width="16" height={f * 235} rx="8" fill={t < 15 ? '#5ce1ff' : '#ff8a1f'} style={{ transition: 'all .3s' }} />
        <circle cy="272" r="26" fill={t < 15 ? '#5ce1ff' : '#ff8a1f'} />
        <text y="340" textAnchor="middle" className="ln-svg-big" fill={t < 15 ? '#5ce1ff' : '#ff8a1f'}>{t}°C</text>
      </g>
      <g transform="translate(170 50)">
        <rect width="200" height="290" rx="6" fill="#0d2350" stroke="#cfd6e6" strokeWidth="5" />
        {Array.from({ length: 60 }, (_, k) => <rect key={k} x={8 + (k % 6) * 31.5} y={8 + Math.floor(k / 6) * 27.5} width="28" height="24" fill="#173a7a" />)}
        {Array.from({ length: 24 }, (_, k) => { const x = 20 + ((k * 73) % 170), y = 20 + ((k * 131) % 260), L = 6 + (k % 4) * 4; return <g key={k} stroke="#eafcff" strokeWidth="1.6" opacity={frost * 0.9}><line x1={x - L} x2={x + L} y1={y} y2={y} /><line x1={x - L / 2} x2={x + L / 2} y1={y - L * 0.86} y2={y + L * 0.86} /><line x1={x - L / 2} x2={x + L / 2} y1={y + L * 0.86} y2={y - L * 0.86} /></g> })}
      </g>
      <g transform="translate(400 200)">
        <text className="ln-svg-label">ONE PANEL · Voc</text>
        <text y="58" className="ln-svg-huge" fill="#FFD43B">{voc.toFixed(1)}<tspan fontSize="28"> V</tspan></text>
      </g>
      <g transform="translate(40 450)">
        <text y="-14" className="ln-svg-label">12 PANELS IN SERIES</text>
        <rect width="560" height="30" rx="15" fill="#ffffff10" />
        <rect width={Math.min(560, (str / 700) * 560)} height="30" rx="15" fill={str > INV.vmax ? '#ff3d63' : '#FFD43B'} style={{ transition: 'all .3s' }} />
        <line x1={(INV.vmax / 700) * 560} x2={(INV.vmax / 700) * 560} y1="-8" y2="40" stroke="#ff3d63" strokeWidth="3" />
        <text x={(INV.vmax / 700) * 560 - 6} y="62" textAnchor="end" className="ln-svg-label red">INVERTER MAX {INV.vmax} V</text>
        <text x="0" y="62" className="ln-svg-label">{str.toFixed(0)} V</text>
      </g>
    </svg>
    <div className="ln-side">
      <Glass title="Variables">
        <Vars rows={[
          { k: 'cell temperature', v: <Num v={t} dp={0} unit="°C" />, tone: t < 15 ? 'c' : 'o' },
          { k: 'ΔT from 25 °C', v: <Num v={t - 25} dp={0} unit="°C" /> },
          { k: 'one panel Voc', v: <Num v={voc} dp={2} unit="V" />, tone: 'y', hot: true },
          { k: '12 in series', v: <Num v={str} dp={0} unit="V" />, tone: str > INV.vmax ? 'r' : 'g' },
        ]} />
      </Glass>
      {str > INV.vmax && <div className="ln-alert">OVER {INV.vmax} V · INVERTER TRIPS</div>}
    </div>
  </div>
}

// ---------------------------------------------------------------- 4 · trace: the rule, line by line (like a code trace)
const TRACES = {
  voc: { file: 'datasheet_rule', lines: [
    ['Voc_25', `= ${P.voc} V`, 'GIVEN'], ['β', `= ${P.betaVoc} %/°C`, 'GIVEN'], ['T', `= ${SITE.tMin} °C`, 'SITE'],
    ['ΔT', `= T − 25 = ${SITE.tMin - 25}`, 'COLDER'], ['factor', `= 1 + β·ΔT = ${(1 + (P.betaVoc / 100) * (SITE.tMin - 25)).toFixed(4)}`, 'MINUS × MINUS = PLUS'],
    ['Voc(T)', `= ${P.voc} × factor = ${r2(vocAt(P, SITE.tMin))} V`, 'RESULT'],
  ] },
  max: { file: 'max_string', lines: [
    ['V_max', `= ${INV.vmax} V`, 'INVERTER'], ['Voc_cold', `= ${r2(vocAt(P, SITE.tMin))} V`, 'COLDEST DAWN'],
    ['ratio', `= ${INV.vmax} ÷ ${r2(vocAt(P, SITE.tMin))} = ${r2(INV.vmax / vocAt(P, SITE.tMin))}`, 'DIVIDE'], ['max', `= floor(ratio) = ${Math.floor(INV.vmax / vocAt(P, SITE.tMin))}`, 'ROUND DOWN'],
  ] },
  min: { file: 'min_string', lines: [
    ['MPPT_min', `= ${INV.mpptMin} V`, 'WAKE-UP'], ['Vmp_hot', `= ${r2(vmpAt(P, SITE.tCellHot))} V`, `HOTTEST CELL ${SITE.tCellHot} °C`],
    ['ratio', `= ${INV.mpptMin} ÷ ${r2(vmpAt(P, SITE.tCellHot))} = ${r2(INV.mpptMin / vmpAt(P, SITE.tCellHot))}`, 'DIVIDE'], ['min', `= ceil(ratio) = ${Math.ceil(INV.mpptMin / vmpAt(P, SITE.tCellHot))}`, 'ROUND UP'],
  ] },
}
export function Trace({ trace, progress }: { trace: keyof typeof TRACES; progress: number }) {
  const T = TRACES[trace]
  const shown = Math.max(1, Math.ceil(progress * T.lines.length + 0.001))
  return <div className="ln-trace-wrap">
    <div className="ln-code">
      <header><i /><i /><i /><span>{T.file}.txt</span></header>
      <ol>{T.lines.map(([k, v, tag], idx) => <li key={k} className={`${idx < shown ? 'in' : ''} ${idx === shown - 1 ? 'cur' : ''}`}>
        <span className="k">{k}</span><span className="v">{v}</span><span className={`tag ${/DOWN|UP|RESULT/.test(tag) ? 'hot' : ''}`}># {tag}</span></li>)}</ol>
    </div>
    <div className="ln-eq big">{trace === 'voc' ? 'Voc(T) = Voc₂₅ × (1 + β × (T − 25))' : trace === 'max' ? 'max = ⌊ V_max ÷ Voc_cold ⌋' : 'min = ⌈ MPPT_min ÷ Vmp_hot ⌉'}</div>
  </div>
}

// ---------------------------------------------------------------- 5 · the inverter window
export function Window({ n, moment }: { n: number; moment: 'dawn' | 'noon' | 'both' }) {
  const W = 1000, max = 800, x = (v: number) => (v / max) * W
  const dawn = n * vocAt(P, SITE.tMin), noon = n * vmpAt(P, SITE.tCellHot)
  const zones = [[0, INV.mpptMin, '#64708a', 'ASLEEP'], [INV.mpptMin, INV.mpptMax, '#16c47f', 'WORKING'], [INV.mpptMax, INV.vmax, '#ffb020', 'CLIPS'], [INV.vmax, max, '#ff3d63', 'DAMAGE']] as const
  const safe = dawn < INV.vmax, awake = noon >= INV.mpptMin
  return <div className="ln-window">
    <svg viewBox="0 0 1040 360" className="ln-svg" role="img" aria-label={`${n} panels: ${dawn.toFixed(0)} volts at dawn, ${noon.toFixed(0)} volts on a hot afternoon`}>
      <g transform="translate(20 150)">
        {zones.map(([a, b, c, l]) => <g key={l}><rect x={x(a)} width={x(b) - x(a)} height="56" fill={c} opacity=".22" /><rect x={x(a)} width={x(b) - x(a)} height="6" fill={c} />
          <text x={(x(a) + x(b)) / 2} y="36" textAnchor="middle" className="ln-svg-label" fill={c}>{l}</text></g>)}
        {[0, INV.mpptMin, INV.mpptMax, INV.vmax].map((v) => <text key={v} x={x(v)} y="84" textAnchor="middle" className="ln-svg-small">{v} V</text>)}
        {(moment === 'dawn' || moment === 'both') && <g style={{ transform: `translateX(${x(Math.min(dawn, max))}px)`, transition: 'transform .45s cubic-bezier(.2,.8,.2,1)' }}>
          <line y1="-60" y2="60" stroke="#5ce1ff" strokeWidth="4" /><circle cy="-66" r="8" fill="#5ce1ff" />
          <text y="-84" textAnchor="middle" className="ln-svg-label" fill="#5ce1ff">DAWN {dawn.toFixed(0)} V</text></g>}
        {(moment === 'noon' || moment === 'both') && <g style={{ transform: `translateX(${x(Math.min(noon, max))}px)`, transition: 'transform .45s cubic-bezier(.2,.8,.2,1)' }}>
          <line y1="0" y2="120" stroke="#ff8a1f" strokeWidth="4" /><circle cy="126" r="8" fill="#ff8a1f" />
          <text y="156" textAnchor="middle" className="ln-svg-label" fill="#ff8a1f">HOT AFTERNOON {noon.toFixed(0)} V</text></g>}
      </g>
    </svg>
    <div className="ln-window-vars">
      <Glass title="This string">
        <Vars rows={[
          { k: 'panels per string', v: <Num v={n} dp={0} />, hot: true },
          { k: `dawn · ${SITE.tMin} °C · Voc`, v: <Num v={dawn} dp={0} unit="V" />, tone: safe ? 'c' : 'r' },
          { k: `afternoon · ${SITE.tCellHot} °C · Vmp`, v: <Num v={noon} dp={0} unit="V" />, tone: awake ? 'o' : 'r' },
        ]} />
      </Glass>
      <div className={`ln-verdict ${safe && awake ? 'ok' : 'bad'}`}>{!safe ? 'DAMAGED AT DAWN' : !awake ? 'ASLEEP ALL AFTERNOON' : 'SAFE AND AWAKE'}</div>
    </div>
  </div>
}

// ---------------------------------------------------------------- 5b · a job ticket and the four-step method
export function TicketScene({ step = -1 }: { step?: number }) {
  const { order: o } = workOrder(2468)
  const method = [['Coldest dawn → Voc_cold', 'datasheet rule'], ['max = ⌊ V_max ÷ Voc_cold ⌋', 'ROUND DOWN'], ['Hottest cell → Vmp_hot', 'datasheet rule'], ['min = ⌈ MPPT_min ÷ Vmp_hot ⌉', 'ROUND UP']]
  return <div className="ln-split">
    <div className="ln-ticket-paper big">
      <header><b>{o.id}</b><span>DEMO job ticket</span></header>
      <dl><dt>Site</dt><dd>{o.site.city} · coldest dawn {o.site.tMin} °C · hottest cell {o.site.tCellHot} °C</dd>
        <dt>Panel</dt><dd>{o.panel.name} · Voc {o.panel.voc} V ({o.panel.betaVoc}%/°C) · Vmp {o.panel.vmp} V ({o.panel.betaVmp}%/°C)</dd>
        <dt>Inverter</dt><dd>{o.inverter.name} · max {o.inverter.vmax} V · MPPT {o.inverter.mpptMin}–{o.inverter.mpptMax} V</dd>
        <dt>Asked</dt><dd>Max and min panels per string</dd></dl>
    </div>
    <div className="ln-side">
      <Glass title="The method">
        <ol className="ln-method">{method.map(([m, tag], k) => <li key={m} className={k === Math.floor(step) ? 'cur' : k < step ? 'done' : ''}><b>{k + 1}</b><span>{m}</span><em>{tag}</em></li>)}</ol>
      </Glass>
    </div>
  </div>
}

// ---------------------------------------------------------------- 6 · the roof (project)
export function Roof({ inv, strings, per }: { inv: number; strings: number; per: number }) {
  const checks = checkRoof(inv, strings, per)
  const I = ROOFTOP.inverters[inv]
  return <div className="ln-split">
    <div className="ln-roof" aria-label={`Roof with ${ROOFTOP.panels} panels`}>
      <div className="ln-roof-grid">{Array.from({ length: ROOFTOP.panels }, (_, k) => {
        const s = Math.floor(k / Math.max(1, per))
        const used = k < strings * per
        return <div key={k} className={`ln-rp ${used ? `s${Math.min(s, 2)}` : 'off'}`}><span>{used ? String.fromCharCode(65 + s) : ''}</span></div>
      })}</div>
      <div className="ln-inv"><b>{I?.name ?? 'Choose an inverter'}</b>{I && <span>{I.acKw} kW · {I.vmax} V max · MPPT {I.mpptMin}–{I.mpptMax} V</span>}</div>
    </div>
    <div className="ln-side">
      <Glass title="Design checks">
        <ul className="ln-checks">{checks.map((c) => <li key={c.id} className={c.ok ? 'ok' : 'bad'}><b>{c.ok ? '✓' : '✗'}</b><span>{c.label}<small>{c.detail}</small></span></li>)}</ul>
      </Glass>
    </div>
  </div>
}
