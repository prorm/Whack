// Generic player for a Threshold & Gauge Lab Blueprint. Everything episode-specific comes from JSON;
// the blueprint's own tests must pass before a learner can open it (the code gate).
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { go } from '../router'
import { compute, lintBlueprint, missionWon, runTests, sweep, workVariant, zoneOf, type Blueprint, type Mission } from './blueprint'
import { BetScreen, Plate, Settle, Shell, Typer, Wrap } from './Episode'
import { haptic, media, sfx, stopVoice, voice } from './fx'
import { clock } from './physics'
import { useFlux } from './store'
import { usePassport } from './passportStore'
import { evTask } from './assess'

const fmt = (bp: Blueprint, id: string, v: number) => bp.inputs.find((i) => i.id === id)?.kind === 'clock' ? clock(v) : bp.inputs.find((i) => i.id === id)?.kind === 'toggle' ? (v ? 'ON' : 'OFF') : String(+v.toFixed(2))

function GateBanner({ bp }: { bp: Blueprint }) {
  const tests = useMemo(() => runTests(bp), [bp])
  const ok = tests.every((t) => t.ok)
  return <details className={`fx-gatebar ${ok ? 'ok' : 'bad'}`}>
    <summary>{ok ? '✓' : '✕'} Blueprint code gate · {tests.filter((t) => t.ok).length}/{tests.length} assertions pass · by {bp.author.name}{bp.author.demo ? ' (DEMO)' : ''}</summary>
    <ul>{tests.map((t) => <li key={t.name}>{t.ok ? '✓' : '✕'} {t.name}{t.detail && ` · ${t.detail}`}</li>)}</ul>
    <p className="fx-fine">This whole episode is a JSON blueprint (inputs, expressions, missions, tests). No episode-specific code.</p>
  </details>
}

function Gauge({ bp, value, limit }: { bp: Blueprint; value: number; limit: number }) {
  const M = bp.gauge.max
  const a = (v: number) => Math.PI * (1 - Math.min(Math.max(v, 0), M) / M)
  const pt = (v: number, r: number) => [110 + r * Math.cos(a(v)), 110 - r * Math.sin(a(v))]
  const arc = (v0: number, v1: number, r: number) => { const [x0, y0] = pt(v0, r), [x1, y1] = pt(v1, r); return `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}` }
  const [nx, ny] = pt(value, 88)
  const bands = bp.zones.map((z, i) => ({ z, from: i === 0 ? 0 : (bp.zones[i - 1].upTo ?? 1) * limit, to: z.upTo === null ? M : z.upTo * limit }))
  return <svg viewBox="0 0 220 128" className="fx-gauge" role="img" aria-label={`${bp.gauge.label}: ${value.toFixed(1)} ${bp.gauge.unit}, limit ${limit}`}>
    {bands.map(({ z, from, to }) => <path key={z.id} d={arc(from, Math.min(to, M), 92)} className={`band ${z.tone === 'ok' ? 'ok' : z.tone === 'warn' ? 'warn' : z.tone === 'bad' ? 'dead' : 'sleep'}`} />)}
    {[0, 0.25, 0.5, 0.75, 1].map((f) => { const [x, y] = pt(f * M, 74); return <text key={f} x={x} y={y + 3} className="tick">{Math.round(f * M)}</text> })}
    <line x1="110" y1="110" x2={nx} y2={ny} className="needle voc" />
    <circle cx="110" cy="110" r="5" className="hub" />
  </svg>
}

function SweepCurve({ bp, inputs, at }: { bp: Blueprint; inputs: Record<string, number>; at: number }) {
  const { from, to, step, input } = bp.sweep
  const W = 300, H = 80, M = bp.gauge.max
  const x = (v: number) => ((v - from) / (to - from)) * W, y = (v: number) => H - (Math.min(v, M) / M) * H
  let d = ''
  for (let v = from; v <= to + 1e-9; v += step / 2) d += `${d ? 'L' : 'M'}${x(v).toFixed(1)},${y(compute(bp, { ...inputs, [input]: v }).gauge).toFixed(1)}`
  const limit = compute(bp, inputs).limit
  const pk = sweep(bp, inputs)
  return <svg viewBox={`0 0 ${W} ${H + 12}`} className="fx-curve" aria-label="Load across the evening">
    <line x1="0" x2={W} y1={y(limit)} y2={y(limit)} className="limit" />
    <text x={W - 2} y={y(limit) - 3} className="lbl hot" textAnchor="end">{limit} {bp.gauge.unit} limit</text>
    <path d={d} className="curve may" />
    <g className={`peak ${pk.peak > limit ? 'over' : ''}`}><circle cx={x(pk.at)} cy={y(pk.peak)} r="3.5" /><text x={x(pk.at) + 6} y={y(pk.peak) - 5} className="lbl pk">peak {pk.peak.toFixed(1)} {bp.gauge.unit} · {fmt(bp, input, pk.at)}</text></g>
    <line x1={x(at)} x2={x(at)} y1="0" y2={H} className="now" />
    {Array.from({ length: 5 }, (_, i) => from + (i * (to - from)) / 4).map((v, i) => <text key={v} x={x(v)} y={H + 10} className="lbl" textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}>{fmt(bp, input, v)}</text>)}
  </svg>
}

export function ThresholdLab({ bp, mission, onWin }: { bp: Blueprint; mission: Mission; onWin: () => void }) {
  const start = Object.fromEntries(bp.inputs.map((i) => [i.id, mission.start?.[i.id] ?? i.start]))
  const [inp, setInp] = useState<Record<string, number>>(start)
  const [tripped, setTripped] = useState<null | number>(null)
  const [won, setWon] = useState(false)
  const [note, setNote] = useState('')
  const [running, setRunning] = useState(false)
  const [hint, setHint] = useState(false)
  const raf = useRef(0)
  const v = useMemo(() => compute(bp, inp), [bp, inp])
  const z = zoneOf(bp, v.gauge, v.limit)
  useEffect(() => { const t = setTimeout(() => setHint(true), 18000); return () => { clearTimeout(t); cancelAnimationFrame(raf.current) } }, [])
  const win = () => { if (won) return; setWon(true); sfx('combo'); haptic([30, 40, 80]); onWin() }
  useEffect(() => {
    if (z.tone === 'bad' && tripped === null) { setTripped(v.gauge); sfx('zap', 0.8); setTimeout(() => sfx('boom', 0.4), 150); haptic([80, 50, 160]) }
    if (!mission.sweep && missionWon(bp, mission, inp)) win()
  }, [v]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (id: string, val: number) => setInp({ ...inp, [id]: val })
  const run = () => {
    if (running) return
    setTripped(null); setNote(''); setRunning(true); sfx('whoosh')
    const { from, to, input } = bp.sweep, t0 = performance.now(), dur = 6000
    const step = (t: number) => {
      const val = from + (to - from) * Math.min(1, (t - t0) / dur)
      const now = { ...inp, [input]: val }
      setInp(now)
      const g = compute(bp, now)
      if (val < to && g.gauge <= g.limit) raf.current = requestAnimationFrame(step)
      else {
        setRunning(false)
        const sw = sweep(bp, inp)
        if (missionWon(bp, mission, inp, sw)) win()
        else setNote(g.gauge > g.limit ? `Tripped at ${fmt(bp, input, val)}: ${g.gauge.toFixed(1)} ${bp.gauge.unit} > ${g.limit} ${bp.gauge.unit}.` : `Survived the whole range (peak ${sw.peak.toFixed(1)} ${bp.gauge.unit}). Is that the best setting?`)
      }
    }
    raf.current = requestAnimationFrame(step)
  }
  const dead = tripped !== null
  return (
    <section className={`fx-lab ${dead ? 'is-dead' : ''}`} aria-label="Blueprint lab">
      <header className={`fx-mission ${won ? 'won' : ''}`}>
        <span className="fx-kicker">{mission.title}</span>
        <p className="fx-goal">{won ? '✓ ' : ''}{mission.goal}</p>
        {won ? <p className="fx-win" role="status">{mission.win}</p> : hint && <p className="fx-hint">{mission.hint}</p>}
        {note && !won && <p className="fx-note" role="status">{note}</p>}
      </header>
      <div className={`fx-stage fx-bp-stage ${dead ? 'dark' : ''}`}>
        <img src={media(bp.media.poster)} alt="" />
        <div className="fx-clock"><b>{fmt(bp, bp.sweep.input, inp[bp.sweep.input])}</b><span>{bp.derived.filter((d) => d.show).map((d) => `${d.label} ${+v[d.id].toFixed(1)} ${d.unit}`).join(' · ')}</span></div>
        {bp.gauge.stack && <div className="fx-stack" aria-label="What is drawing current">
          {bp.gauge.stack.map((s, i) => <i key={s.id} className={`seg s${i}`} style={{ width: `${(v[s.id] / bp.gauge.max) * 100}%` }}><span>{s.label} {v[s.id].toFixed(1)}</span></i>)}
          <b className="lim" style={{ left: `${(v.limit / bp.gauge.max) * 100}%` }}>main {v.limit} {bp.gauge.unit}</b>
        </div>}
        {dead && <div className="fx-blackout" role="status"><b>TRIPPED</b><span>{tripped!.toFixed(1)} {bp.gauge.unit} through a {v.limit} {bp.gauge.unit} main breaker</span></div>}
      </div>
      <div className={`fx-readout ${z.tone === 'bad' ? 'damage' : z.tone === 'ok' ? 'tracking' : ''}`}>
        <Gauge bp={bp} value={v.gauge} limit={v.limit} />
        <div className="fx-digits">
          <span className="fx-big" aria-live="polite">{v.gauge.toFixed(1)}<small>{bp.gauge.unit}</small></span>
          <span className={`fx-zone ${z.tone}`}>{z.label}</span>
          <span className="fx-legend"><span>{bp.gauge.label}</span></span>
        </div>
      </div>
      <SweepCurve bp={bp} inputs={inp} at={inp[bp.sweep.input]} />
      <div className="fx-controls">
        {bp.inputs.map((i) => {
          const locked = mission.lock?.includes(i.id)
          if (i.kind === 'toggle') return <button key={i.id} className={`fx-btn ${inp[i.id] ? '' : 'ghost'}`} aria-pressed={!!inp[i.id]} disabled={locked || running} onClick={() => { set(i.id, inp[i.id] ? 0 : 1); sfx('powerup', 0.3) }}>{i.label}: {inp[i.id] ? 'ON' : 'OFF'}{locked ? ' 🔒' : ''}</button>
          return <label key={i.id} className="fx-slider"><span>{i.label} <b>{fmt(bp, i.id, inp[i.id])}{i.unit ? ` ${i.unit}` : ''}</b>{locked ? ' 🔒' : ''}</span>
            <input type="range" min={i.min} max={i.max} step={i.step} value={inp[i.id]} disabled={locked || running} onChange={(e) => set(i.id, +e.target.value)} /></label>
        })}
        <div className="fx-row">
          <button className="fx-btn" onClick={run} disabled={running}>{running ? 'Running…' : bp.sweepLabel ?? '▶ Run it'}</button>
          {dead && <button className="fx-btn hot" onClick={() => { setTripped(null); sfx('powerup', 0.4) }}>⟲ Reset main breaker</button>}
        </div>
      </div>
    </section>
  )
}

function Rule({ bp, next }: { bp: Blueprint; next: () => void }) {
  const { grade } = useFlux()
  const [pick, setPick] = useState<number | null>(null)
  const o = pick !== null ? bp.rule.options[pick] : null
  return <section className="fx-forge">
    <span className="fx-kicker">Rule check</span>
    <h1 className="fx-h1">{bp.rule.q}</h1>
    <div className="fx-reel-opts big">{bp.rule.options.map((x, i) => <button key={x.t} disabled={pick !== null && !!o?.ok} className={pick === null ? '' : x.ok && o?.ok ? 'right' : pick === i ? 'wrong' : 'dim'}
      onClick={() => { setPick(i); grade(bp.concept, !!x.ok); sfx(x.ok ? 'powerup' : 'wrong'); if (x.ok) voice(bp.media.voRule ?? '') }}>{x.t}</button>)}</div>
    {o && <p className={o.ok ? 'fx-win' : 'fx-repair'} role="status">{o.why}</p>}
    {o?.ok && <><div className="fx-card"><p>{bp.rule.explain}</p></div><button className="fx-cta in" onClick={next}>Take a real work order →</button></>}
  </section>
}

function Work({ bp, next }: { bp: Blueprint; next: () => void }) {
  const { grade, prove } = useFlux()
  const pp = usePassport()
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 9999))
  const w = useMemo(() => workVariant(bp, seed), [bp, seed])
  const [ans, setAns] = useState<Record<string, string>>({})
  const [res, setRes] = useState<Record<string, boolean> | null>(null)
  const check = () => {
    const r = Object.fromEntries(bp.work.ask.map((a) => [a.id, Math.abs(parseFloat(ans[a.id]) - w.key[a.id]) < 0.011]))
    setRes(r)
    if (bp.id === 'ev') pp.submit(evTask(bp, seed), ans)
    const all = Object.values(r).every(Boolean)
    grade(bp.concept, all); sfx(all ? 'combo' : 'wrong'); haptic(all ? [30, 30, 90] : 140)
    if (all) { prove('trades'); voice(bp.media.voWin ?? '') }
  }
  const all = res && Object.values(res).every(Boolean)
  return <section className="fx-work">
    <span className="fx-kicker">Unseen work order · generated from the blueprint</span>
    <div className="fx-ticket"><header><b>{w.id}</b><span>DEMO job ticket</span></header>
      <p className="fx-ticket-story">{bp.work.story}</p>
      <dl>{bp.work.givens.map((g) => <Fragment key={g.id}><dt>{g.label}</dt><dd>{w.givens[g.id]} {g.unit}</dd></Fragment>)}</dl></div>
    <div className="fx-inputs">{bp.work.ask.map((a) => <label key={a.id}>{a.label} ({a.unit})<input inputMode="decimal" value={ans[a.id] ?? ''} onChange={(e) => { setAns({ ...ans, [a.id]: e.target.value }); setRes(null) }} /></label>)}</div>
    {!res && <button className="fx-cta in" onClick={check} disabled={bp.work.ask.some((a) => !ans[a.id])}>Check by code</button>}
    {res && <div className={`fx-result ${all ? 'ok' : 'bad'}`} role="status">
      {bp.work.ask.map((a) => <p key={a.id}><b>{a.label}: {res[a.id] ? '✓' : `✗ → ${w.key[a.id]}`}</b><span className="fx-mis">{a.expr}</span></p>)}
      <div className="fx-row"><button className="fx-btn ghost" onClick={() => { setSeed(seed + 1); setAns({}); setRes(null) }}>New work order</button>
        {all && <button className="fx-cta in" onClick={next}>Finish episode →</button>}</div>
    </div>}
    <p className="fx-fine">Checked by the blueprint's expressions, not AI. Practice never issues a credential.</p>
  </section>
}

export function BlueprintEpisode({ bp }: { bp: Blueprint }) {
  const { s, setStep, grade } = useFlux()
  const STEPS = ['Cold open', 'Bet', 'Lab', 'Settle', 'Rule', 'Work order', 'Wrap']
  const step = Math.min(s.episodes[bp.id]?.step ?? 0, STEPS.length - 1)
  const [mi, setMi] = useState(0)
  const [won, setWon] = useState(false)
  const [ready, setReady] = useState(false)
  const lint = useMemo(() => lintBlueprint(bp), [bp])
  const gateOk = useMemo(() => runTests(bp).every((t) => t.ok), [bp])
  useEffect(() => { if (step === 0) { const t = setTimeout(() => voice(bp.media.voOpen ?? ''), 500); return () => { clearTimeout(t); stopVoice() } } }, [step, bp])
  const next = () => { stopVoice(); setStep(bp.id, step + 1, step + 1 === STEPS.length - 1); scrollTo(0, 0) }
  if (lint.length || !gateOk) return <Shell steps={['Blocked']} step={0} onExit={() => go('flux')}>
    <section className="fx-card"><h1 className="fx-h1">This blueprint cannot be played.</h1><GateBanner bp={bp} /><ul>{lint.map((l) => <li key={l}>{l}</li>)}</ul></section></Shell>
  const labels = Object.fromEntries(bp.bet.options.map((o) => [o.id, o.label]))
  return (
    <Shell steps={STEPS} step={step} onExit={() => go('flux')} tone={step === 0 ? 'bleed' : ''}>
      {step === 0 && <Plate video={bp.media.video} poster={bp.media.poster}>
        <div className="fx-stamp-time"><b>{bp.open.stamp}</b><span>{bp.open.sub}</span></div>
        <Typer onDone={() => setReady(true)} lines={bp.open.lines.map((t, i) => ({ t, at: 900 + i * 1900, cls: i === 0 ? 'fx-h1' : i === bp.open.lines.length - 1 ? 'fx-h1 hot' : undefined }))} />
        <button className={`fx-cta ${ready ? 'in' : ''}`} onClick={() => { sfx('whoosh'); next() }}>Investigate →</button>
      </Plate>}
      {step === 1 && <BetScreen bet={{ id: bp.id, q: bp.bet.q, options: bp.bet.options, answer: bp.bet.answer }} next={next} />}
      {step === 2 && <section className="fx-labwrap">
        <GateBanner bp={bp} />
        <ThresholdLab key={bp.missions[mi].id} bp={bp} mission={bp.missions[mi]} onWin={() => { setWon(true); grade(bp.concept, true); if (mi === 0) voice(bp.media.voRule ?? '') }} />
        {won && <button className="fx-cta in sticky" onClick={() => { setWon(false); stopVoice(); if (mi < bp.missions.length - 1) setMi(mi + 1); else next() }}>{mi < bp.missions.length - 1 ? 'Next mission →' : 'Settle my bet →'}</button>}
      </section>}
      {step === 3 && <Settle episode={bp.id} answer={bp.bet.answer} labels={labels} next={next} explain={<><h2>What actually happened</h2>{bp.bet.explain.map((e) => <p key={e}>{e}</p>)}</>} />}
      {step === 4 && <Rule bp={bp} next={next} />}
      {step === 5 && <Work bp={bp} next={next} />}
      {step === 6 && <Wrap title={`${bp.title}: solved.`} concepts={[bp.concept]} />}
    </Shell>
  )
}
