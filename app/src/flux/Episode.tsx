// FLUX Episode 1 · "The Cold Morning Killer". A lesson you play, not a lecture you watch.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { go } from '../router'
import { haptic, media, sfx, stopVoice, voice } from './fx'
import { HOME, MISCONCEPTIONS, brier, diagnoseMax, diagnoseMin, maxPanels, vocAt, workOrder, type Misconception } from './physics'
import { Rooftop, type MissionId } from './Rooftop'
import { useFlux } from './store'
import { taskFor, usePassport } from './passportStore'

const { panel: P, inverter: INV, site: SITE } = HOME
const NOON_V = Math.round(12 * vocAt(P, SITE.tCellHot))
const COLD_V = Math.round(12 * vocAt(P, SITE.tMin))
const VOC_COLD = +vocAt(P, SITE.tMin).toFixed(2)
const MAX = maxPanels(INV, P, SITE.tMin)

export function Shell({ steps, step, onExit, children, tone = '' }: { steps: string[]; step: number; onExit: () => void; children: ReactNode; tone?: string }) {
  return (
    <div className={`fx-shell ${tone}`}>
      <div className="fx-stories" aria-label={`Step ${step + 1} of ${steps.length}: ${steps[step]}`}>
        {steps.map((s, i) => <i key={s} className={i < step ? 'done' : i === step ? 'now' : ''} />)}
      </div>
      <button className="fx-x" onClick={() => { stopVoice(); onExit() }} aria-label="Leave episode">✕</button>
      <main className="fx-main">{children}</main>
    </div>
  )
}

export function Typer({ lines, onDone, speed = 28 }: { lines: { t: string; cls?: string; at: number }[]; onDone?: () => void; speed?: number }) {
  const [ms, setMs] = useState(0)
  useEffect(() => {
    const t0 = performance.now()
    let id = 0
    const tick = () => { setMs(performance.now() - t0); id = requestAnimationFrame(tick) }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [])
  const last = lines[lines.length - 1]
  const done = ms > last.at + last.t.length * speed + 400
  useEffect(() => { if (done) onDone?.() }, [done]) // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="fx-typer">{lines.map((l) => {
    const n = Math.max(0, Math.floor((ms - l.at) / speed))
    return ms >= l.at ? <p key={l.t} className={l.cls}>{l.t.slice(0, n)}{n < l.t.length && <span className="fx-caret" />}</p> : null
  })}</div>
}

/** Try to play with sound (the learner just tapped), fall back to muted autoplay. */
export function autoplay(v: HTMLVideoElement | null) {
  if (!v || v.dataset.started) return
  v.dataset.started = '1'
  v.volume = 0.5
  v.play().catch(() => { v.muted = true; void v.play().catch(() => {}) })
}

export function Plate({ video, poster, children, dim = 0.45, onEnded }: { video?: string; poster: string; children?: ReactNode; dim?: number; onEnded?: () => void }) {
  const [ok, setOk] = useState(true)
  const reduced = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  return (
    <div className="fx-plate">
      {video && ok && !reduced
        ? <video src={media(video)} poster={media(poster)} playsInline onError={() => setOk(false)} onEnded={onEnded} ref={autoplay} />
        : <img src={media(poster)} alt="" />}
      <div className="fx-plate-dim" style={{ background: `linear-gradient(180deg, rgba(5,6,12,${dim * 0.6}) 0%, rgba(5,6,12,${dim * 0.2}) 40%, rgba(5,6,12,${Math.min(0.95, dim + 0.4)}) 100%)` }} />
      <div className="fx-plate-body">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------- 1 cold open
function ColdOpen({ next }: { next: () => void }) {
  const [ready, setReady] = useState(false)
  useEffect(() => { const t = setTimeout(() => voice('cold_open'), 600); return () => { clearTimeout(t); stopVoice() } }, [])
  return (
    <Plate video="v_dawn.mp4" poster="dawn.webp">
      <div className="fx-stamp-time"><b>06:47</b><span>14 JAN · BENGALURU · {SITE.tMin} °C</span></div>
      <Typer onDone={() => setReady(true)} lines={[
        { t: 'A brand-new inverter just died.', cls: 'fx-h1', at: 900 },
        { t: `Installed in May. Noon test: ${NOON_V} V.`, at: 2600 },
        { t: `Limit: ${INV.vmax} V. "Totally safe," said the installer.`, at: 4200 },
        { t: 'So what killed it?', cls: 'fx-h1 hot', at: 6400 },
      ]} />
      <button className={`fx-cta ${ready ? 'in' : ''}`} onClick={() => { stopVoice(); sfx('whoosh'); next() }}>Investigate →</button>
    </Plate>
  )
}

// ---------------------------------------------------------------- 2 bet
const BET = { id: 'solar', q: 'When does a solar string push its HIGHEST voltage?', options: [
  { id: 'noon', label: 'Scorching noon in May', icon: '☀' },
  { id: 'dawn', label: 'Freezing sunrise in January', icon: '❄' },
  { id: 'same', label: 'Same all day. Panels are panels.', icon: '≈' },
], answer: 'dawn' }

export function BetScreen({ bet, next }: { bet: typeof BET; next: () => void }) {
  const { placeBet } = useFlux()
  const [choice, setChoice] = useState('')
  const [conf, setConf] = useState(0.7)
  const [locked, setLocked] = useState(false)
  const lock = () => {
    placeBet({ episode: bet.id, choice, confidence: conf, at: Date.now() })
    setLocked(true); sfx('boom', 0.5); haptic(60); voice('bet_lock')
    setTimeout(next, 1700)
  }
  return (
    <section className="fx-bet">
      <span className="fx-kicker">Place your bet first</span>
      <h1 className="fx-h1">{bet.q}</h1>
      <p className="fx-sub">Guessing before you learn makes the answer stick. Wrong bets are welcome here.</p>
      <div className="fx-options">
        {bet.options.map((o) => <button key={o.id} className={`fx-option ${choice === o.id ? 'on' : ''}`} onClick={() => { setChoice(o.id); sfx('tick', 0.4) }} disabled={locked} aria-pressed={choice === o.id}>
          <span className="ic" aria-hidden="true">{o.icon}</span>{o.label}</button>)}
      </div>
      <div className="fx-conf" role="group" aria-label="How sure are you?">
        <span>How sure?</span>
        {[0.5, 0.7, 0.9, 0.99].map((c) => <button key={c} aria-pressed={conf === c} className={conf === c ? 'on' : ''} onClick={() => setConf(c)} disabled={locked}>{Math.round(c * 100)}%</button>)}
      </div>
      <button className="fx-cta in" disabled={!choice || locked} onClick={lock}>{locked ? 'BET LOCKED' : 'Lock my bet'}</button>
      {locked && <div className="fx-locked" aria-hidden="true">LOCKED</div>}
    </section>
  )
}

// ---------------------------------------------------------------- 3 lab
const LAB_ORDER: MissionId[] = ['kill', 'max', 'sleep']
function Lab({ next }: { next: () => void }) {
  const { grade } = useFlux()
  const [i, setI] = useState(0)
  const [won, setWon] = useState(false)
  const mission = LAB_ORDER[i]
  const onWin = () => {
    setWon(true)
    grade(mission === 'sleep' ? 'minstring' : mission === 'max' ? 'maxstring' : 'cold', true)
    if (mission === 'kill') voice('akka_intro')
    if (mission === 'sleep') voice('akka_heat')
  }
  return (
    <section className="fx-labwrap">
      <div className="fx-akka-strip"><img src={media('akka.webp')} alt="" /><p>{
        mission === 'kill' ? <>Akka: <b>“Don't read about it. Break it.”</b> Drag the clock, flip the season, watch the needle.</>
          : mission === 'max' ? <>Akka: <b>“Now be the engineer.”</b> The most panels that survive every hour of January.</>
            : <>Akka: <b>“Last one. The opposite problem.”</b></>}</p></div>
      <Rooftop key={mission} mission={mission} onWin={onWin} />
      {won && <button className="fx-cta in sticky" onClick={() => { setWon(false); stopVoice(); if (i < 2) setI(i + 1); else next() }}>{i < 2 ? 'Next sabotage →' : 'Settle my bet →'}</button>}
    </section>
  )
}

// ---------------------------------------------------------------- 4 settle
export function Settle({ episode, answer, labels, explain, next }: { episode: string; answer: string; labels: Record<string, string>; explain: ReactNode; next: () => void }) {
  const { s, settleBet } = useFlux()
  const bet = s.bets.find((b) => b.episode === episode)
  const correct = bet?.choice === answer
  useEffect(() => { if (bet && bet.correct === undefined) settleBet(episode, correct); sfx(correct ? 'combo' : 'wrong'); haptic(correct ? [30, 30, 30] : 120) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const settled = s.bets.filter((b) => b.correct !== undefined)
  const calib = settled.length ? settled.reduce((a, b) => a + brier(b.confidence, !!b.correct), 0) / settled.length : 0
  const verdict = !bet ? '' : correct ? (bet.confidence >= 0.9 ? 'Called it, and you knew it.' : 'Right, and humble about it. Trust that instinct more.')
    : bet.confidence >= 0.9 ? 'Confidently wrong. That exact instinct is what kills inverters. Good thing it happened here.' : 'Wrong, but you hedged. Good scientists do.'
  return (
    <section className="fx-settle">
      <span className="fx-kicker">Bet settled</span>
      <div className={`fx-verdict ${correct ? 'ok' : 'bad'}`}>
        <span className="big">{correct ? 'YOU WIN' : 'PLOT TWIST'}</span>
        <p>You bet <b>{bet ? labels[bet.choice] : 'nothing'}</b> at <b>{bet ? Math.round(bet.confidence * 100) : 0}%</b>. Answer: <b>{labels[answer]}</b>.</p>
        <p className="fx-sub">{verdict}</p>
      </div>
      <div className="fx-card">{explain}</div>
      <div className="fx-calib"><span>Your calibration across {settled.length} bet{settled.length === 1 ? '' : 's'}</span><meter min={0} max={1} value={1 - calib} /><b>{Math.round((1 - calib) * 100)}</b>
        <small>100 = your confidence matches your accuracy. It is a mirror for you, never a score anyone else sees.</small></div>
      <button className="fx-cta in" onClick={next}>Forge the rule →</button>
    </section>
  )
}

// ---------------------------------------------------------------- 5 rule forge
type Tile = { id: string; label: string; slot: 'top' | 'bottom' | 'round'; good?: boolean; why?: string }
const TILES: Tile[] = [
  { id: 'vmax', label: `Inverter max ${INV.vmax} V`, slot: 'top', good: true },
  { id: 'mppt', label: `MPPT max ${INV.mpptMax} V`, slot: 'top', why: 'The MPPT window is where it works best, not where it breaks. The cliff edge is the absolute maximum input voltage.' },
  { id: 'cold', label: `Voc at ${SITE.tMin} °C = ${VOC_COLD} V`, slot: 'bottom', good: true },
  { id: 'stc', label: `Voc at 25 °C = ${P.voc} V`, slot: 'bottom', why: MISCONCEPTIONS.used_stc.repair },
  { id: 'hot', label: `Voc at ${SITE.tCellHot} °C = ${vocAt(P, SITE.tCellHot).toFixed(2)} V`, slot: 'bottom', why: MISCONCEPTIONS.used_hot.repair },
  { id: 'down', label: '⌊ round DOWN ⌋', slot: 'round', good: true },
  { id: 'near', label: '≈ round to nearest', slot: 'round', why: MISCONCEPTIONS.rounded_up.repair },
]
function Forge({ next }: { next: () => void }) {
  const { grade } = useFlux()
  const [pick, setPick] = useState<Record<string, Tile | undefined>>({})
  const [checked, setChecked] = useState(false)
  const ok = pick.top?.good && pick.bottom?.good && pick.round?.good
  const shuffled = useMemo(() => [...TILES].sort((a, b) => a.id.localeCompare(b.id)), [])
  const check = () => {
    setChecked(true); grade('maxstring', !!ok)
    if (ok) { sfx('powerup'); haptic([20, 30, 80]); voice('akka_rule') } else { sfx('wrong'); haptic(120) }
  }
  const ratio = pick.top && pick.bottom ? (pick.top.id === 'vmax' ? INV.vmax : INV.mpptMax) / (pick.bottom.id === 'cold' ? VOC_COLD : pick.bottom.id === 'stc' ? P.voc : vocAt(P, SITE.tCellHot)) : null
  return (
    <section className="fx-forge">
      <span className="fx-kicker">Rule forge</span>
      <h1 className="fx-h1">Build the rule you just discovered.</h1>
      <p className="fx-sub">Tap a tile, it snaps into its slot. Three slots, one rule that keeps every inverter alive.</p>
      <div className={`fx-formula ${checked ? (ok ? 'ok' : 'bad') : ''}`}>
        <span className="slot r">{pick.round?.label.split(' ')[0] ?? '?'}</span>
        <span className="frac"><span className="slot">{pick.top?.label ?? 'limit'}</span><i /><span className="slot">{pick.bottom?.label ?? 'one panel'}</span></span>
        <span className="eq">= {ratio ? (pick.round?.id === 'near' ? Math.round(ratio) : Math.floor(ratio)) : '?'} panels{ratio ? <small> ({ratio.toFixed(2)})</small> : null}</span>
      </div>
      <div className="fx-tiles">
        {shuffled.map((t) => <button key={t.id} className={`fx-tile ${pick[t.slot]?.id === t.id ? 'on' : ''}`} onClick={() => { setPick({ ...pick, [t.slot]: t }); setChecked(false); sfx('tick', 0.4) }}>{t.label}</button>)}
      </div>
      {checked && !ok && <div className="fx-repair" role="alert">{[pick.top, pick.bottom, pick.round].filter((t) => t && !t.good).map((t) => <p key={t!.id}><b>{t!.label}:</b> {t!.why}</p>)}{!pick.top || !pick.bottom || !pick.round ? <p>Fill all three slots.</p> : null}</div>}
      {checked && ok && <p className="fx-win" role="status">{INV.vmax} ÷ {VOC_COLD} = {(INV.vmax / VOC_COLD).toFixed(2)} → <b>{MAX} panels</b>. The coldest morning sets the limit. Round down, always.</p>}
      {checked && ok ? <button className="fx-cta in" onClick={() => { stopVoice(); next() }}>Chotu needs you →</button>
        : <button className="fx-cta in" onClick={check}>Forge it</button>}
    </section>
  )
}

// ---------------------------------------------------------------- 6 protégé: fix Chotu's notebook
const NOTE = [
  { t: `Inverter max = ${INV.vmax} V`, ok: true },
  { t: `One panel Voc = ${P.voc} V (datasheet)`, bug: true },
  { t: `${INV.vmax} ÷ ${P.voc} = ${(INV.vmax / P.voc).toFixed(2)}`, ok: true, why: 'The division is fine. The number going into it is the problem.' },
  { t: `→ ${Math.floor(INV.vmax / P.voc)} panels. Done boss!`, ok: true, why: 'Rounding 12.10 down to 12 is correct rounding. Look earlier in his working.' },
]
function Chotu({ next }: { next: () => void }) {
  const { grade } = useFlux()
  const [phase, setPhase] = useState<'brag' | 'hunt' | 'caught'>('brag')
  const [miss, setMiss] = useState('')
  const tries = useRef(0)
  useEffect(() => { voice('chotu_brag', () => setPhase('hunt')); const t = setTimeout(() => setPhase((p) => p === 'brag' ? 'hunt' : p), 6000); return () => { clearTimeout(t); stopVoice() } }, [])
  const tap = (i: number) => {
    if (phase !== 'hunt') return
    tries.current++
    if (NOTE[i].bug) {
      setPhase('caught'); setMiss(''); grade('cold', tries.current === 1); sfx('boom', 0.5); haptic([40, 40, 120])
      setTimeout(() => voice('chotu_oops', () => voice('chotu_thanks')), 300)
    } else { setMiss(NOTE[i].why ?? 'That line is right.'); sfx('wrong', 0.4) }
  }
  return (
    <section className="fx-chotu">
      <div className="fx-chotu-pic">
        {phase === 'caught' ? <video src={media('v_chotu.mp4')} poster={media('chotu_shock.webp')} autoPlay muted playsInline /> : <img src={media('chotu.webp')} alt="Chotu, a DEMO apprentice character, giving a thumbs up" />}
        <span className="fx-demo">DEMO character</span>
        <p className="fx-bubble">{phase === 'caught' ? `“Arre! On an ${SITE.tMin} °C morning that's ${COLD_V} V. Eleven panels. Round down.”` : '“Boss, easy calculation! Twelve panels. Done!”'}</p>
      </div>
      <span className="fx-kicker">Teach to learn</span>
      <h1 className="fx-h1">{phase === 'caught' ? 'You just saved his customer’s inverter.' : 'Chotu wrote this for a Bengaluru roof. Tap the line that will kill the inverter.'}</h1>
      <ol className={`fx-notebook ${phase}`}>
        {NOTE.map((l, i) => <li key={l.t}><button onClick={() => tap(i)} className={phase === 'caught' && l.bug ? 'bug' : ''} disabled={phase === 'caught'}>{l.t}</button>
          {phase === 'caught' && l.bug && <span className="fx-fix">✎ Voc at {SITE.tMin} °C = {VOC_COLD} V → {INV.vmax} ÷ {VOC_COLD} = {(INV.vmax / VOC_COLD).toFixed(2)} → <b>{MAX}</b></span>}</li>)}
      </ol>
      {miss && <p className="fx-hint" role="alert">{miss}</p>}
      {phase === 'caught' && <button className="fx-cta in" onClick={() => { stopVoice(); next() }}>A customer is waiting →</button>}
    </section>
  )
}

// ---------------------------------------------------------------- 7 boss fight: explain it to a real customer
const ROUNDS = [
  { vo: 'sharma_1', line: `My neighbour put 12 panels on one string. Why are you giving me only ${MAX}? Are you cheating me?`, replies: [
    { t: `On the coldest morning each panel gives more voltage. Twelve would push your inverter past its ${INV.vmax}-volt limit and damage it. ${MAX} keeps it safe every day of the year.`, d: 30, r: 'Clear, true, about HIS inverter. Trust up.' },
    { t: `Voc temperature coefficient is ${P.betaVoc}%/°C, so the derated string Voc exceeds the inverter's Vdc max.`, d: 5, r: 'Correct, but he heard noise. Jargon does not build trust.' },
    { t: 'Company policy, sir.', d: -25, r: 'He now thinks you are hiding something.' },
  ] },
  { vo: 'sharma_2', line: 'But it is Bengaluru. It never gets cold here!', replies: [
    { t: `It doesn't need to freeze. At ${SITE.tMin} °C, which Bengaluru has recorded, twelve panels reach about ${COLD_V} volts. I design for the worst morning, not the average one.`, d: 30, r: 'A number from his own city. Very convincing.' },
    { t: 'You are right, sir. I will put twelve.', d: -40, r: 'His inverter dies next January. So does your reputation.' },
    { t: 'Cold is relative, sir.', d: -10, r: 'Philosophy is not an answer.' },
  ] },
  { vo: 'sharma_3', line: 'So will I lose power because of this?', replies: [
    { t: 'You lose one panel on this string. In return the inverter, the costliest part after the panels, survives its first winter.', d: 30, r: 'Honest about the trade-off. That is what pros sound like.' },
    { t: 'No sir, zero difference at all.', d: -20, r: 'Not true. One less panel is less peak power. He will find out.' },
    { t: 'Inverters are cheap to replace anyway.', d: -30, r: 'They are not, and now he knows you think so.' },
  ] },
]
function Boss({ next }: { next: () => void }) {
  const { grade } = useFlux()
  const [round, setRound] = useState(0)
  const [trust, setTrust] = useState(40)
  const [said, setSaid] = useState<{ t: string; d: number; r: string } | null>(null)
  const [end, setEnd] = useState<'' | 'win' | 'lose'>('')
  const order = useMemo(() => ROUNDS.map((r, i) => [[1, 0, 2], [2, 0, 1], [0, 2, 1]][i].map((j) => r.replies[j])), [])
  useEffect(() => { if (!end) voice(ROUNDS[round].vo) }, [round, end])
  useEffect(() => () => stopVoice(), [])
  const reply = (x: { t: string; d: number; r: string }) => {
    if (said) return
    setSaid(x)
    const t = Math.max(0, Math.min(100, trust + x.d))
    setTrust(t)
    sfx(x.d > 20 ? 'combo' : x.d > 0 ? 'tick' : 'wrong'); haptic(x.d > 0 ? 30 : [60, 40, 60])
  }
  const cont = () => {
    setSaid(null)
    if (round < 2) setRound(round + 1)
    else {
      const win = trust >= 85
      setEnd(win ? 'win' : 'lose'); grade('explain', win); voice(win ? 'sharma_win' : 'sharma_lose')
    }
  }
  return (
    <section className="fx-boss">
      <div className="fx-boss-top">
        <img src={media(end === 'win' ? 'sharma_happy.webp' : 'sharma.webp')} alt="" />
        <span className="fx-demo">DEMO customer</span>
        <div className="fx-trust"><span>TRUST</span><div><i style={{ width: `${trust}%` }} className={trust >= 80 ? 'hi' : trust < 30 ? 'lo' : ''} /></div><b>{trust}</b></div>
      </div>
      <span className="fx-kicker">Boss fight · Mr. Sharma · round {Math.min(3, round + 1)}/3</span>
      {!end && <p className="fx-speech">“{ROUNDS[round].line}”</p>}
      {!end && !said && <div className="fx-replies">{order[round].map((x) => <button key={x.t} onClick={() => reply(x)} className="fx-reply">{x.t}</button>)}</div>}
      {said && <div className={`fx-react ${said.d > 20 ? 'ok' : said.d > 0 ? 'meh' : 'bad'}`} role="status"><b>{said.d > 0 ? '+' : ''}{said.d} trust</b> {said.r}
        <button className="fx-cta in" onClick={cont}>{round < 2 ? 'Next →' : 'Hear his verdict →'}</button></div>}
      {end === 'win' && <div className="fx-react ok"><b>“Hmm. Nobody explained it like that before. Okay, {MAX} it is.”</b><p>Explaining a safety limit in plain words is a paid skill. It is also how you avoid callbacks.</p><button className="fx-cta in" onClick={() => { stopVoice(); next() }}>Take a real work order →</button></div>}
      {end === 'lose' && <div className="fx-react bad"><b>“I think I will ask somebody else.”</b><p>Trust {trust}/100. Plain words + a number from his city + honesty about the trade-off win this.</p><button className="fx-cta in" onClick={() => { setRound(0); setTrust(40); setEnd('') }}>Rematch</button></div>}
    </section>
  )
}

// ---------------------------------------------------------------- 8 unseen work order (transfer)
export function Work({ next }: { next: () => void }) {
  const { grade, prove } = useFlux()
  const pp = usePassport()
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 9999))
  const { order, key } = useMemo(() => workOrder(seed), [seed])
  const [mx, setMx] = useState('')
  const [mn, setMn] = useState('')
  const [res, setRes] = useState<null | { max: boolean; min: boolean; dMax?: Misconception; dMin?: Misconception }>(null)
  const check = () => {
    const a = parseInt(mx, 10), b = parseInt(mn, 10)
    if (!Number.isFinite(a) || !Number.isFinite(b)) return
    const r = { max: a === key.max, min: b === key.min, dMax: diagnoseMax(order, a), dMin: diagnoseMin(order, b) }
    setRes(r); grade('maxstring', r.max); grade('minstring', r.min)
    pp.submit(taskFor('wo.solar-string', seed), { max: mx, min: mn })
    sfx(r.max && r.min ? 'combo' : 'wrong'); haptic(r.max && r.min ? [30, 30, 90] : 140)
    if (r.max && r.min) { voice('akka_win'); prove('trades') }
  }
  const o = order
  return (
    <section className="fx-work">
      <span className="fx-kicker">Unseen work order · new city, new kit</span>
      <div className="fx-ticket">
        <header><b>{o.id}</b><span>DEMO job ticket</span></header>
        <dl>
          <dt>Site</dt><dd>{o.site.city} · coldest dawn {o.site.tMin} °C · hottest cell {o.site.tCellHot} °C</dd>
          <dt>Panel</dt><dd>{o.panel.name} · Voc {o.panel.voc} V ({o.panel.betaVoc}%/°C) · Vmp {o.panel.vmp} V ({o.panel.betaVmp}%/°C)</dd>
          <dt>Inverter</dt><dd>{o.inverter.name} · max {o.inverter.vmax} V · MPPT {o.inverter.mpptMin}–{o.inverter.mpptMax} V</dd>
        </dl>
      </div>
      <div className="fx-inputs">
        <label>Max panels per string<input inputMode="numeric" value={mx} onChange={(e) => { setMx(e.target.value); setRes(null) }} /></label>
        <label>Min panels per string<input inputMode="numeric" value={mn} onChange={(e) => { setMn(e.target.value); setRes(null) }} /></label>
      </div>
      {!res && <button className="fx-cta in" onClick={check} disabled={!mx || !mn}>Check by code</button>}
      {res && <div className={`fx-result ${res.max && res.min ? 'ok' : 'bad'}`} role="status">
        <p><b>Max {res.max ? '✓' : `✗ → ${key.max}`}</b> {res.dMax && <span className="fx-mis">{MISCONCEPTIONS[res.dMax].title}. {MISCONCEPTIONS[res.dMax].repair}</span>}</p>
        <p><b>Min {res.min ? '✓' : `✗ → ${key.min}`}</b> {res.dMin && <span className="fx-mis">{MISCONCEPTIONS[res.dMin].title}. {MISCONCEPTIONS[res.dMin].repair}</span>}</p>
        <details><summary>Worked solution</summary>
          <p>Voc at {o.site.tMin} °C = {o.panel.voc} × (1 + {Math.abs(o.panel.betaVoc)}% × {25 - o.site.tMin}) = {key.vocCold} V → ⌊{o.inverter.vmax} ÷ {key.vocCold}⌋ = <b>{key.max}</b> (string {key.stringVocCold} V)</p>
          <p>Vmp at {o.site.tCellHot} °C = {o.panel.vmp} × (1 − {Math.abs(o.panel.betaVmp)}% × {o.site.tCellHot - 25}) = {key.vmpHot} V → ⌈{o.inverter.mpptMin} ÷ {key.vmpHot}⌉ = <b>{key.min}</b></p>
        </details>
        <div className="fx-row"><button className="fx-btn ghost" onClick={() => { setSeed(seed + 1); setMx(''); setMn(''); setRes(null) }}>New work order</button>
          {res.max && res.min && <button className="fx-cta in" onClick={next}>Finish episode →</button>}</div>
      </div>}
      <p className="fx-fine">Checked by deterministic code, not AI. Every attempt is saved to your <a href="#/sp-passport">Proof Passport</a> with your exact answers; for this hazardous trade a pass earns a supervised practical, not a licence.</p>
    </section>
  )
}

// ---------------------------------------------------------------- 9 wrap
export function Wrap({ title, concepts }: { title: string; concepts: string[] }) {
  const { s, now } = useFlux()
  useEffect(() => { sfx('powerup') }, [])
  return (
    <section className="fx-wrap">
      <span className="fx-kicker">Episode complete</span>
      <h1 className="fx-h1">{title}</h1>
      <div className="fx-batteries">{concepts.map((c) => {
        const card = s.memory.cards[c]
        return <div key={c} className="fx-batt"><span>{CONCEPT_NAMES[c] ?? c}</span><div><i style={{ width: `${card ? 100 : 0}%` }} /></div>
          <small>{card ? `recall in ${Math.max(0, Math.round((card.dueAt - now()) / 86400000))} d` : 'not practised'}</small></div>
      })}</div>
      <div className="fx-ladder"><span>Day 1</span><span>Day 3</span><span>Day 7</span><span>Day 21</span></div>
      <p className="fx-sub">Your memory drains like a battery. Recall reels recharge it right before it gets weak, and anything you miss comes back first next time.</p>
      <div className="fx-row"><button className="fx-cta in" onClick={() => go('flux-reels')}>Open recall reels</button>
        <button className="fx-btn ghost" onClick={() => go('home')}>Back home</button></div>
    </section>
  )
}
export const CONCEPT_NAMES: Record<string, string> = {
  series: 'Series vs parallel', cold: 'Cold → higher volts', maxstring: 'Max string length', minstring: 'Min string length',
  explain: 'Explain it to a customer', safety: 'Site safety', idem: 'Idempotency keys', evload: 'EV load & breakers', retry: 'Retries & backoff', ambiguous: 'The lost reply',
}

const STEPS = ['Cold open', 'Bet', 'Lab', 'Settle', 'Forge', 'Teach', 'Boss', 'Work order', 'Wrap']
export function SolarEpisode() {
  const { s, setStep } = useFlux()
  const step = Math.min(s.episodes.solar?.step ?? 0, STEPS.length - 1)
  const next = () => { stopVoice(); setStep('solar', step + 1, step + 1 === STEPS.length - 1); scrollTo(0, 0) }
  const labels = Object.fromEntries(BET.options.map((o) => [o.id, o.label]))
  return (
    <Shell steps={STEPS} step={step} onExit={() => go('home')} tone={step === 0 ? 'bleed' : ''}>
      {step === 0 && <ColdOpen next={next} />}
      {step === 1 && <BetScreen bet={BET} next={next} />}
      {step === 2 && <Lab next={next} />}
      {step === 3 && <Settle episode="solar" answer="dawn" labels={labels} next={next} explain={<>
        <h2>Two reasons the sunrise is the killer</h2>
        <p><b>1 · Cold panels push higher voltage.</b> The coefficient is {P.betaVoc}% per °C below 25 °C. At {SITE.tMin} °C each panel gives {VOC_COLD} V instead of {P.voc} V.</p>
        <p><b>2 · At sunrise the inverter is still asleep.</b> Nothing draws current yet, so it sees the full open-circuit voltage: 12 × {VOC_COLD} = <b>{COLD_V} V</b> against a {INV.vmax} V limit.</p>
        <p className="fx-sub">Noon in May is the SAFE case: hot cells sag to {NOON_V} V. That is why the noon test fooled the installer.</p>
      </>} />}
      {step === 4 && <Forge next={next} />}
      {step === 5 && <Chotu next={next} />}
      {step === 6 && <Boss next={next} />}
      {step === 7 && <Work next={next} />}
      {step === 8 && <Wrap title="You think like a solar technician now." concepts={['cold', 'maxstring', 'minstring', 'explain']} />}
    </Shell>
  )
}
