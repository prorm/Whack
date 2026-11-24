// FLUX Learn: the primary learning experience. A narrated, cinematic lesson you take part in:
// Teach (scenes + voice + karaoke captions) → Predict → Experiment (live sliders with a goal) → Explain (rule trace)
// → Test (checks with hints) → Train (fresh problems) → Project → Proof. Reels only revise what you learned here.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { routeParam } from '../../router'
import { isMuted, setMuted, sfx } from '../fx'
import { useFlux } from '../store'
import { usePassport } from '../passportStore'
import { statusOf } from '../passport'
import { ROOFTOP, makeTask } from '../assess'
import { workOrder } from '../physics'
import { COURSE, GOALS, LESSONS, LINES, lessonOf, near, trainSet, type GoalId, type Lesson, type SceneSpec, type Step } from './course'
import { useCourse } from './courseStore'
import VO from './vo.json'
import { Hook, Pipe, Roof, StringScene, Thermo, TicketScene, Trace, Window, Glass, Vars } from './scenes'
import './learn.css'

const DUR = (VO as { durations: Record<string, number> }).durations
const vo = (id: string) => `/media/learn/vo_${id}.m4a`
/** QA only: localStorage 'learn:speed' speeds up muted narration timing (walkthrough scripts). */
const SPEED = Number(localStorage.getItem('learn:speed') ?? 1) || 1

// ---------------------------------------------------------------- narration: voice + karaoke progress
let bed: HTMLAudioElement | null = null
function music(on: boolean) {
  if (!on || isMuted()) { bed?.pause(); return }
  if (!bed) { bed = new Audio('/media/learn/bed.m4a'); bed.loop = true; bed.volume = 0.07 }
  void bed.play().catch(() => {})
}

/** Plays one narration line. Muted / blocked audio falls back to a timer of the line's real length, so captions still run. */
function useNarration(line: string | undefined, paused: boolean, onEnd: () => void) {
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(!line)
  const end = useRef(onEnd); end.current = onEnd
  const audio = useRef<HTMLAudioElement | null>(null)
  const clock = useRef({ t: 0, last: 0 })
  useEffect(() => {
    setProgress(0); setDone(!line); clock.current = { t: 0, last: 0 }
    if (!line) return
    const a = new Audio(vo(line)); a.preload = 'auto'; audio.current = a
    // QA/recording hook: lets the demo recorder lay the real narration under a silent screen capture
    const log = (window as unknown as { __narr?: { id: string; at: number; end?: number }[] }).__narr
    const entry = { id: line, at: Date.now() } as { id: string; at: number; end?: number }
    log?.push(entry)
    return () => { a.pause(); audio.current = null; entry.end = Date.now() }
  }, [line])
  useEffect(() => {
    if (!line || done) return
    const a = audio.current!
    const total = DUR[line] ?? 5
    let usingAudio = !isMuted()
    if (!paused && usingAudio) void a.play().catch(() => { usingAudio = false })
    if (paused) a.pause()
    let id = 0
    clock.current.last = performance.now()
    const tick = (now: number) => {
      if (!paused) clock.current.t += ((now - clock.current.last) / 1000) * SPEED
      clock.current.last = now
      const t = usingAudio && !a.paused ? a.currentTime : clock.current.t
      if (usingAudio && !a.paused) clock.current.t = a.currentTime
      const p = Math.min(1, t / total)
      setProgress(p)
      if (p >= 1 || (usingAudio && a.ended)) { setDone(true); end.current(); return }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(id); a.pause() }
  }, [line, paused, done])
  const replay = useCallback(() => { if (audio.current) audio.current.currentTime = 0; clock.current.t = 0; setDone(false); setProgress(0) }, [])
  return { progress, done, replay }
}

function Caption({ text, progress }: { text: string; progress: number }) {
  const words = text.split(' ')
  const weights = words.map((w) => w.length + 2)
  const total = weights.reduce((a, b) => a + b, 0)
  let acc = 0, cur = 0
  for (let k = 0; k < words.length; k++) { acc += weights[k]; if (acc / total >= progress) { cur = k; break } cur = k }
  // show a ~12-word window around the current word, like broadcast captions
  const start = Math.max(0, Math.floor(cur / 12) * 12), view = words.slice(start, start + 12)
  return <p className="ln-caption" aria-hidden="true">{view.map((w, k) => <span key={k + start} className={k + start === cur ? 'on' : k + start < cur ? 'past' : ''}>{w} </span>)}</p>
}

// ---------------------------------------------------------------- the stage
function Stage({ lesson, step, chapter, children, caption, progress, idx }: { lesson: Lesson; step: number; chapter: string; children: ReactNode; caption?: string; progress: number; idx: number }) {
  return <div className="ln-stage" style={{ ['--mood' as string]: lesson.mood }}>
    <div className="ln-bg" aria-hidden="true"><i className="ln-floor" /></div>
    <div className="ln-chip left"><i />{String(lesson.n).padStart(2, '0')} <b>{chapter}</b></div>
    <div className="ln-chip right">LESSON {lesson.n} · {lesson.title.toUpperCase()}</div>
    <div className="ln-scene" key={idx}>{children}</div>
    {caption && <Caption text={caption} progress={progress} />}
    <div className="ln-progress" aria-hidden="true">{lesson.steps.map((_, k) => <i key={k} className={k < step ? 'done' : k === step ? 'cur' : ''} style={k === step ? { ['--p' as string]: progress } : undefined} />)}</div>
  </div>
}

function SceneView({ view, live, progress }: { view: SceneSpec; live: Record<string, number>; progress: number }) {
  switch (view.scene) {
    case 'hook': return <Hook />
    case 'pipe': return <Pipe v={live.v ?? view.v ?? 0} i={live.i ?? view.i ?? 0} focus={view.focus} />
    case 'string': return <StringScene n={live.n ?? (view.grow ? Math.max(1, Math.ceil(progress * (view.n ?? 1))) : view.n ?? 1)} mode={view.mode ?? 'series'} />
    case 'thermo': return <Thermo t={live.t ?? view.t ?? 25} />
    case 'trace': return <Trace trace={view.trace} progress={progress} />
    case 'window': return <Window n={live.n ?? view.n ?? 8} moment={view.moment ?? 'both'} />
    case 'ticket': return <TicketScene step={live.g ?? -1} />
    default: return null
  }
}

// ---------------------------------------------------------------- docks: what the learner does under the stage
function CheckDock({ q, answer, tol, unit, hint, explain, onDone, k }: { q: string; answer: number; tol: number; unit: string; hint: string; explain: string; onDone: (firstTry: boolean) => void; k: string }) {
  const [val, setVal] = useState('')
  const [tries, setTries] = useState(0)
  const [state, setState] = useState<'idle' | 'right' | 'wrong' | 'shown'>('idle')
  const submit = () => {
    if (!val.trim() || state === 'right' || state === 'shown') return
    const ok = near(val, answer, tol)
    setTries(tries + 1)
    setState(ok ? 'right' : 'wrong'); sfx(ok ? 'ding' : 'wrong', 0.4)
    if (ok) onDone(tries === 0)
  }
  return <div className="ln-dock" key={k}>
    <p className="ln-q">{q}</p>
    <form className="ln-answer" onSubmit={(e) => { e.preventDefault(); submit() }}>
      <input inputMode="decimal" value={val} onChange={(e) => { setVal(e.target.value); if (state === 'wrong') setState('idle') }} aria-label="Your answer" disabled={state === 'right' || state === 'shown'} autoFocus />
      <span className="ln-unit">{unit}</span>
      <button className="ln-btn" disabled={!val.trim() || state === 'right' || state === 'shown'}>Check</button>
    </form>
    {state === 'wrong' && <p className="ln-fb bad" role="status">Not yet. <b>Hint:</b> {hint} {tries >= 2 && <button className="ln-link" onClick={() => { setState('shown'); onDone(false) }}>Show me the answer</button>}</p>}
    {(state === 'right' || state === 'shown') && <p className={`ln-fb ${state === 'right' ? 'ok' : 'show'}`} role="status"><b>{state === 'right' ? (tries === 1 ? 'Correct, first try.' : 'Correct.') : 'Here it is:'}</b> {explain}</p>}
  </div>
}

function Train({ gen, count, concept, onDone, k }: { gen: 'series' | 'voc' | 'window'; count: number; concept: string; onDone: () => void; k: string }) {
  const [seed] = useState(() => 1 + Math.floor(Math.random() * 1e6))
  const set = useMemo(() => trainSet(gen, seed, count), [gen, seed, count])
  const [i, setI] = useState(0)
  const [first, setFirst] = useState<boolean[]>([])
  const [ready, setReady] = useState(false)
  const { grade } = useFlux()
  const course = useCourse()
  if (i >= set.length) return <div className="ln-dock"><p className="ln-q">Training set done: <b>{first.filter(Boolean).length}/{set.length}</b> right on the first try.</p>
    <p className="ln-muted">Each problem was new: different panel, city and numbers. Misses come back in your revision reels.</p></div>
  const pr = set[i]
  return <div className="ln-train">
    <div className="ln-train-head"><span className="ln-kick">Train · problem {i + 1} of {set.length}</span><span className="ln-dots">{set.map((_, j) => <i key={j} className={j < i ? (first[j] ? 'ok' : 'bad') : j === i ? 'cur' : ''} />)}</span></div>
    <CheckDock key={`${k}-${i}`} k={`${k}-${i}`} q={pr.q} answer={pr.answer} tol={pr.tol} unit={pr.unit} hint={pr.hint} explain={pr.explain}
      onDone={(ok) => { setFirst([...first, ok]); grade(concept, ok); course.check(`${k}:${i}`, ok); setReady(true) }} />
    {ready && <button className="ln-btn primary" onClick={() => { setReady(false); const n = i + 1; setI(n); if (n >= set.length) onDone() }}>{i + 1 < set.length ? 'Next problem →' : 'Finish training →'}</button>}
  </div>
}

/** Lesson 5: a real job ticket, scaffolded step by step. The trace fills as each step is right. */
function Guided({ onDone, onStep }: { onDone: () => void; onStep: (methodStep: number) => void }) {
  const { order: o, key } = useMemo(() => workOrder(2468), [])
  const steps = [
    { id: 't', q: `Coldest dawn on record in ${o.site.city}?`, answer: o.site.tMin, tol: 0, unit: '°C', hint: 'Read it off the site line of the ticket.', explain: `${o.site.tMin} °C: the worst case for the maximum.`, name: 'T_cold' },
    { id: 'voc', q: `Voc of one ${o.panel.name} at ${o.site.tMin} °C?`, answer: key.vocCold, tol: 0.15, unit: 'V', hint: `Voc × (1 + ${Math.abs(o.panel.betaVoc)}% × ${25 - o.site.tMin}).`, explain: `${o.panel.voc} × (1 + ${Math.abs(o.panel.betaVoc) / 100} × ${25 - o.site.tMin}) = ${key.vocCold} V`, name: 'Voc_cold' },
    { id: 'max', q: `Max panels per string on the ${o.inverter.vmax} V inverter?`, answer: key.max, tol: 0, unit: 'panels', hint: 'Divide, then round DOWN.', explain: `⌊${o.inverter.vmax} ÷ ${key.vocCold}⌋ = ${key.max}`, name: 'max' },
    { id: 'vmp', q: `Vmp at the hottest cell, ${o.site.tCellHot} °C?`, answer: key.vmpHot, tol: 0.15, unit: 'V', hint: `Vmp × (1 − ${Math.abs(o.panel.betaVmp)}% × ${o.site.tCellHot - 25}).`, explain: `${o.panel.vmp} × (1 − ${Math.abs(o.panel.betaVmp) / 100} × ${o.site.tCellHot - 25}) = ${key.vmpHot} V`, name: 'Vmp_hot' },
    { id: 'min', q: `Fewest panels to stay above ${o.inverter.mpptMin} V?`, answer: key.min, tol: 0, unit: 'panels', hint: 'Divide, then round UP.', explain: `⌈${o.inverter.mpptMin} ÷ ${key.vmpHot}⌉ = ${key.min}`, name: 'min' },
  ]
  const [i, setI] = useState(0)
  const [ok, setOk] = useState(false)
  const { grade } = useFlux()
  return <div className="ln-guided">
    <Glass title="Your working" className="ln-work">
      <Vars rows={steps.map((s, j) => ({ k: s.name, v: j < i || (j === i && ok) ? <b className="ln-num">{s.answer}<small> {s.unit}</small></b> : <span className="ln-muted">—</span>, hot: j === i }))} />
    </Glass>
    {i < steps.length && <>
      <CheckDock key={`g-${i}`} k={`g-${i}`} {...steps[i]} onDone={(first) => { setOk(true); grade(i < 3 ? 'maxstring' : 'minstring', first) }} />
      {ok && <button className="ln-btn primary" onClick={() => { setOk(false); const n = i + 1; setI(n); onStep([0, 0.5, 1, 2, 3, 4][n]); if (n >= steps.length) onDone() }}>{i + 1 < steps.length ? 'Next step →' : 'Ticket solved →'}</button>}
    </>}
  </div>
}

// ---------------------------------------------------------------- the lesson player
export function LessonPlayer() {
  const lesson = lessonOf(routeParam('id') ?? 'l1')
  const course = useCourse()
  const { grade } = useFlux()
  const [idx, setIdx] = useState(0)
  const [live, setLive] = useState<Record<string, number>>({})
  const [paused, setPaused] = useState(false)
  const [muted, setMute] = useState(isMuted())
  const [stage, setStage] = useState<'main' | 'success' | 'ready'>('main') // play steps: main narration → goal → success line
  const [picked, setPicked] = useState<number | null>(null)
  const [complete, setComplete] = useState(false)
  const step: Step = lesson.steps[idx]
  const lineNow = step.kind === 'say' || step.kind === 'predict' ? step.line : step.kind === 'play' ? (stage === 'main' ? step.line : step.success) : undefined
  const next = useCallback(() => {
    const n = idx + 1
    course.reach(lesson.id, n)
    if (n >= lesson.steps.length) { course.finish(lesson.id); setComplete(true); sfx('powerup', 0.4); return }
    setIdx(n); setStage('main'); setPicked(null)
    const nx = lesson.steps[n]
    if (nx.kind === 'play') setLive(Object.fromEntries(nx.control.kind === 'sliders' ? nx.control.sliders.map((s) => [s.id, s.start]) : []))
    else setLive({})
  }, [idx, lesson, course])
  const narr = useNarration(lineNow, paused, () => {
    if (step.kind === 'say') setTimeout(next, 650)
    if (step.kind === 'play' && stage === 'success') setStage('ready')
  })
  useEffect(() => { music(!muted && !complete); return () => music(false) }, [muted, complete])
  useEffect(() => { const on = () => setMute(isMuted()); addEventListener('flux:mute', on); return () => removeEventListener('flux:mute', on) }, [])
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') { e.preventDefault(); setPaused((p) => !p) } }
    addEventListener('keydown', on); return () => removeEventListener('keydown', on)
  }, [])
  // goal reached in a play step → success narration
  const goalMet = step.kind === 'play' && step.control.kind === 'sliders' && GOALS[step.control.goal as GoalId](live)
  useEffect(() => { if (goalMet && stage === 'main') { setStage('success'); sfx('combo', 0.4) } }, [goalMet, stage])

  const chapter = [...lesson.steps.slice(0, idx + 1)].reverse().find((s) => s.kind === 'say' && s.chapter) as { chapter?: string } | undefined
  const view = step.view
  if (complete) return <LessonDone lesson={lesson} />
  return <div className="ln-root">
    <header className="ln-top">
      <a href="#/home" className="ln-back" aria-label="Back to the course">← {COURSE.title}</a>
      <div className="ln-tools">
        <button onClick={() => setPaused(!paused)} aria-label={paused ? 'Play' : 'Pause'} aria-pressed={paused}>{paused ? '▶' : '❚❚'}</button>
        {lineNow && <button onClick={narr.replay} aria-label="Replay this line">↺</button>}
        <button onClick={() => setMuted(!muted)} aria-label={muted ? 'Sound on' : 'Mute'}>{muted ? '🔇' : '🔊'}</button>
      </div>
    </header>
    <Stage lesson={lesson} step={idx} idx={idx} chapter={chapter?.chapter ?? lesson.kicker} caption={lineNow ? LINES[lineNow] : undefined} progress={lineNow ? narr.progress : 1}>
      <SceneView view={view} live={live} progress={lineNow ? narr.progress : 1} />
    </Stage>
    {lineNow && <p className="sr-only" aria-live="polite">{LINES[lineNow]}</p>}

    <div className="ln-dockwrap">
      {step.kind === 'say' && <div className="ln-dock quiet"><span className="ln-muted">{paused ? 'Paused · press space or ▶' : 'Listening…'}</span><button className="ln-link" onClick={next}>Skip →</button></div>}
      {step.kind === 'predict' && <div className="ln-dock">
        <p className="ln-kick">Predict first</p><p className="ln-q">{step.q}</p>
        <div className="ln-opts">{step.options.map((o, k) => <button key={o.t} className={`ln-opt ${picked === null ? '' : o.ok ? 'ok' : picked === k ? 'bad' : 'dim'}`} disabled={picked !== null}
          onClick={() => { setPicked(k); sfx(o.ok ? 'ding' : 'wrong', 0.4); grade(lesson.concepts[0], !!o.ok) }}>{o.t}</button>)}</div>
        {picked !== null && <><p className={`ln-fb ${step.options[picked].ok ? 'ok' : 'bad'}`} role="status">{step.options[picked].why}</p>
          <button className="ln-btn primary" onClick={next}>{step.options[picked].ok ? 'Continue →' : 'See why →'}</button></>}
      </div>}
      {step.kind === 'play' && <div className="ln-dock">
        <p className="ln-kick">{stage === 'main' ? 'Your turn' : 'Goal reached'}</p><p className="ln-q">{step.prompt}</p>
        {step.control.kind === 'sliders' && step.control.sliders.map((s) => <label key={s.id} className="ln-slider">
          <span>{s.label}</span>
          <input type="range" min={s.min} max={s.max} step={s.step} value={live[s.id] ?? s.start} disabled={stage !== 'main'}
            onChange={(e) => setLive({ ...live, [s.id]: +e.target.value })} aria-valuetext={`${live[s.id] ?? s.start} ${s.unit}`} />
          <b className="ln-num">{(live[s.id] ?? s.start).toFixed(s.step < 1 ? 1 : 0)}<small> {s.unit}</small></b>
        </label>)}
        {stage !== 'main' && <p className="ln-fb ok" role="status">✓ {LINES[step.success]}</p>}
        {stage === 'ready' && <button className="ln-btn primary" onClick={next}>Continue →</button>}
        {stage === 'success' && <button className="ln-link" onClick={next}>Skip →</button>}
      </div>}
      {step.kind === 'check' && <div><CheckDock key={`${lesson.id}-${idx}`} k={`${lesson.id}-${idx}`} {...step} onDone={(ok) => { course.check(`${lesson.id}:${idx}`, ok); grade(step.concept, ok) }} />
        {course.s.checks[`${lesson.id}:${idx}`] !== undefined && <button className="ln-btn primary" onClick={next}>Continue →</button>}</div>}
      {step.kind === 'choice' && <div className="ln-dock">
        <p className="ln-kick">Test</p><p className="ln-q">{step.q}</p>
        <div className="ln-opts">{step.options.map((o, k) => <button key={o.t} className={`ln-opt ${picked === null ? '' : o.ok ? 'ok' : picked === k ? 'bad' : 'dim'}`} disabled={picked !== null && !!step.options[picked].ok}
          onClick={() => { setPicked(k); sfx(o.ok ? 'ding' : 'wrong', 0.4); course.check(`${lesson.id}:${idx}`, !!o.ok); grade(step.concept, !!o.ok) }}>{o.t}</button>)}</div>
        {picked !== null && <p className={`ln-fb ${step.options[picked].ok ? 'ok' : 'bad'}`} role="status">{step.options[picked].ok ? step.explain : 'Not that one. Try again.'}</p>}
        {picked !== null && step.options[picked].ok && <button className="ln-btn primary" onClick={next}>Continue →</button>}
      </div>}
      {step.kind === 'train' && <Train k={`${lesson.id}-${idx}`} gen={step.gen} count={step.count} concept={step.concept} onDone={() => setTimeout(next, 900)} />}
      {step.kind === 'guided' && <Guided onDone={next} onStep={(g) => setLive({ g })} />}
    </div>
  </div>
}

function LessonDone({ lesson }: { lesson: Lesson }) {
  const course = useCourse()
  const nextL = LESSONS.find((l) => l.n === lesson.n + 1)
  const checks = Object.entries(course.s.checks).filter(([k]) => k.startsWith(lesson.id + ':') || k.startsWith(lesson.id + '-'))
  const first = checks.filter(([, v]) => v).length
  return <div className="ln-root"><div className="ln-done" style={{ ['--mood' as string]: lesson.mood }}>
    <p className="ln-kick">Lesson {lesson.n} complete</p>
    <h1>{lesson.title}</h1>
    {checks.length > 0 && <p className="ln-score"><b>{first}/{checks.length}</b> checks right on the first try</p>}
    <div className="ln-unlock"><b>Unlocked in Revise</b><span>Short reels for {lesson.concepts.length > 1 ? 'these ideas' : 'this idea'} now come back on a 1 · 3 · 7 · 21-day schedule, so you keep it.</span></div>
    <div className="ln-row">
      {nextL ? <a className="ln-btn primary big" href={`#/fl-lesson?id=${nextL.id}`}>Lesson {nextL.n}: {nextL.title} →</a> : <a className="ln-btn primary big" href="#/fl-project">Start the project →</a>}
      <a className="ln-btn" href="#/home">Course map</a>
    </div>
    <p className="ln-muted">Lessons and checks never award a credential. Only the unseen proof task and the project go on your Proof Passport.</p>
  </div></div>
}

// ---------------------------------------------------------------- the project
export function Project() {
  const pp = usePassport()
  const course = useCourse()
  const [inv, setInv] = useState(-1)
  const [strings, setStrings] = useState(1)
  const [per, setPer] = useState(14)
  const [note, setNote] = useState('')
  const [rec, setRec] = useState<string | null>(course.s.project?.recordId ?? null)
  const narr = useNarration(rec ? 'p_02' : 'p_01', false, () => {})
  const [muted] = useState(isMuted())
  useEffect(() => { music(!muted); return () => music(false) }, [muted])
  const lesson: Lesson = { id: 'proj', n: 6, title: 'Project · Sharma’s rooftop', kicker: 'Project', mood: '#FFD43B', minutes: 8, concepts: ['explain'], steps: [{ kind: 'say', line: 'p_01', view: { scene: 'roof' } }] }
  const task = makeTask('proj.rooftop', 1)
  const submit = () => {
    const r = pp.submit(task, { inv: String(inv), strings: String(strings), per: String(per) }, note.trim())
    course.saveProject({ recordId: r.id, at: r.at, note: note.trim() }); setRec(r.id); sfx('powerup', 0.5)
  }
  const passed = rec && pp.s.records.find((r) => r.id === rec)?.outcomes['solar.design']?.pass
  return <div className="ln-root">
    <header className="ln-top"><a href="#/home" className="ln-back">← {COURSE.title}</a></header>
    <Stage lesson={lesson} step={0} idx={0} chapter="Design it yourself" caption={LINES[rec ? 'p_02' : 'p_01']} progress={narr.progress}>
      <Roof inv={Math.max(0, inv)} strings={strings} per={per} />
    </Stage>
    <div className="ln-dockwrap"><div className="ln-dock">
      <p className="ln-kick">Project · {ROOFTOP.customer} · {ROOFTOP.panels} panels · {ROOFTOP.city} <span className="ln-demo">DEMO</span></p>
      <div className="ln-invs">{ROOFTOP.inverters.map((I, k) => <button key={I.id} className={`ln-inv-card ${inv === k ? 'on' : ''}`} onClick={() => setInv(k)} aria-pressed={inv === k} disabled={!!rec}>
        <b>Inverter {I.id} · {I.name}</b><span>{I.acKw} kW · max {I.vmax} V · MPPT {I.mpptMin}–{I.mpptMax} V · {I.maxStrings} inputs</span></button>)}</div>
      <label className="ln-slider"><span>Strings</span><input type="range" min={1} max={3} step={1} value={strings} disabled={!!rec} onChange={(e) => setStrings(+e.target.value)} /><b className="ln-num">{strings}</b></label>
      <label className="ln-slider"><span>Panels per string</span><input type="range" min={1} max={16} step={1} value={per} disabled={!!rec} onChange={(e) => setPer(+e.target.value)} /><b className="ln-num">{per}</b></label>
      <label className="ln-note"><span>Explain your design to Mr. Sharma (kept for trainer review)</span>
        <textarea rows={3} value={note} disabled={!!rec} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Two strings of 7 keep the voltage safe on the coldest morning, and the 10 kW inverter is big enough for all 14 panels." /></label>
      {!rec ? <button className="ln-btn primary big" disabled={inv < 0 || note.trim().length < 40} onClick={submit}>Submit project</button>
        : <div className={`ln-fb ${passed ? 'ok' : 'bad'}`} role="status"><b>{passed ? 'Project passed every check.' : 'Saved, but some checks fail. Adjust and resubmit from the course map.'}</b> Saved to your Proof Passport as {rec}.
          <div className="ln-row"><a className="ln-btn primary" href={`#/sp-passport?r=${rec}`}>See it in my passport</a><a className="ln-btn" href="#/sp-assess?c=solar.cold-max&back=job-solar-apprentice">Prove string sizing alone →</a>
            {!passed && <button className="ln-btn" onClick={() => { setRec(null); course.saveProject(undefined) }}>Redesign</button>}</div></div>}
      {inv >= 0 && note.trim().length < 40 && !rec && <p className="ln-muted">Write at least a sentence for the customer ({40 - note.trim().length} more characters).</p>}
    </div></div>
  </div>
}

// ---------------------------------------------------------------- the course map (Learn home)
export function CourseMap() {
  const course = useCourse()
  const pp = usePassport()
  const { s: fx, now } = useFlux()
  const done = LESSONS.filter((l) => course.s.done[l.id]).length
  const nextL = LESSONS.find((l) => !course.s.done[l.id])
  const st = (c: Parameters<typeof statusOf>[1]) => statusOf(pp.s.records, c).state
  const due = Object.values(fx.memory.cards).filter((c) => now() >= c.dueAt).length
  const learned = Object.keys(fx.memory.cards).length
  const unlocked = (l: Lesson) => l.n === 1 || !!course.s.done[`l${l.n - 1}`]
  const ring = 2 * Math.PI * 34
  return <div className="ln-map">
    <section className="ln-hero">
      <div>
        <p className="ln-kick">FLUX Learn · course 1</p>
        <h1>{COURSE.title}</h1>
        <p className="ln-lead">{COURSE.subtitle}. Narrated, hands-on lessons: you predict, experiment, get tested and train on fresh problems. Then a real project, then proof.</p>
        <div className="ln-row">
          <a className="ln-btn primary big" href={nextL ? `#/fl-lesson?id=${nextL.id}` : course.s.project ? '#/sp-passport' : '#/fl-project'}>
            {nextL ? (done ? `Continue · Lesson ${nextL.n}` : 'Start lesson 1') : course.s.project ? 'See my passport' : 'Start the project'} →</a>
          <a className="ln-btn" href="#/flux-reels">Revise{due ? ` · ${due} due` : learned ? '' : ''}</a>
        </div>
      </div>
      <svg className="ln-ring" viewBox="0 0 80 80" role="img" aria-label={`${done} of ${LESSONS.length} lessons done`}>
        <circle cx="40" cy="40" r="34" className="bg" /><circle cx="40" cy="40" r="34" className="fg" strokeDasharray={`${(done / LESSONS.length) * ring} ${ring}`} transform="rotate(-90 40 40)" />
        <text x="40" y="44" textAnchor="middle">{done}/{LESSONS.length}</text></svg>
    </section>

    <ol className="ln-path">
      {LESSONS.map((l) => {
        const isDone = !!course.s.done[l.id], open = unlocked(l)
        return <li key={l.id} className={`ln-node ${isDone ? 'done' : open ? 'open' : 'locked'}`} style={{ ['--mood' as string]: l.mood }}>
          <span className="ln-dot">{isDone ? '✓' : l.n}</span>
          <a className="ln-card" href={open ? `#/fl-lesson?id=${l.id}` : undefined} aria-disabled={!open}>
            <span className="ln-kick">{l.kicker} · {l.minutes} min</span>
            <b>{l.title}</b>
            <span className="ln-pills">{['Teach', l.steps.some((s) => s.kind === 'predict') ? 'Predict' : '', l.steps.some((s) => s.kind === 'play') ? 'Experiment' : '', l.steps.some((s) => s.kind === 'check' || s.kind === 'choice') ? 'Test' : '', l.steps.some((s) => s.kind === 'train') ? 'Train' : '', l.steps.some((s) => s.kind === 'guided') ? 'Job ticket' : ''].filter(Boolean).map((p) => <i key={p}>{p}</i>)}</span>
            <em>{isDone ? 'Done · replay' : open ? 'Start' : 'Locked: finish the lesson before'}</em>
          </a>
        </li>
      })}
      <li className={`ln-node ${course.s.project ? 'done' : done === LESSONS.length ? 'open' : 'locked'} project`} style={{ ['--mood' as string]: '#FFD43B' }}>
        <span className="ln-dot">★</span>
        <a className="ln-card" href={done === LESSONS.length || course.s.project ? '#/fl-project' : undefined} aria-disabled={done < LESSONS.length && !course.s.project}>
          <span className="ln-kick">Project · 8 min</span><b>Design Mr. Sharma’s 14-panel rooftop</b>
          <span className="ln-pills"><i>Choose inverter</i><i>Design strings</i><i>Explain to customer</i></span>
          <em>{course.s.project ? 'Submitted · on your passport' : 'Goes on your Proof Passport'}</em>
        </a>
      </li>
      <li className="ln-node proof" style={{ ['--mood' as string]: '#16c47f' }}>
        <span className="ln-dot">◆</span>
        <div className="ln-card">
          <span className="ln-kick">Prove it alone · unseen tasks · graded by code</span><b>Earn evidence employers can inspect</b>
          <ul className="ln-proofs">
            {([['solar.series', 'Series & parallel check'], ['solar.cold-max', 'Unseen string work order'], ['solar.design', 'Rooftop project']] as const).map(([c, label]) =>
              <li key={c} className={st(c)}><a href={c === 'solar.design' ? '#/fl-project' : `#/sp-assess?c=${c}&back=job-solar-apprentice`}>{label}</a><span>{st(c) === 'evidenced' ? 'proven' : st(c) === 'failed' ? 'retake' : 'not yet'}</span></li>)}
          </ul>
          <a className="ln-link" href="#/sp-job?id=job-solar-apprentice">→ Solar installation apprentice (DEMO): see my match</a>
        </div>
      </li>
    </ol>

    <section className="ln-more">
      <h2>More to learn</h2>
      <div className="ln-more-grid">
        <a href="#/flux-solar" className="ln-more-card"><span className="ln-kick">Story episode · 8 min</span><b>The Cold Morning Killer</b><small>The whole solar course as one interactive story</small></a>
        <a href="#/flux-ev" className="ln-more-card"><span className="ln-kick">Story episode · 6 min</span><b>The 9 PM Blackout</b><small>EV charger load and breakers</small></a>
        <a href="#/flux-pay" className="ln-more-card"><span className="ln-kick">Story episode · 5 min</span><b>Charged Twice</b><small>Payments: retries and idempotency</small></a>
      </div>
    </section>
  </div>
}

