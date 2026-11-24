// Experiment 3 vertical slice: ONE verified concept in five modes sharing ONE mastery/progress record.
import { useMemo, useState } from 'react'
import { Screen, StatusPill, useDelivery } from '../Chrome'
import { compute, detectMisconception, PERCENT, type Op } from '../engine/graph.ts'
import { masteryMean, masterySd, type Modality } from '../engine/learner.ts'
import { nextAction } from '../engine/policy.ts'
import { grade, parseCell, payoutTask } from '../engine/proof.ts'
import { go, routeParam } from '../router'
import { useStore } from '../store'
import lesson from './lesson.json'
import { useTwin } from './twinStore'
import { useStored } from './useStored'

type Item = { id: string; question: string; op: Op; args: number[]; answer: number }
type Mode = 'course' | 'read' | 'audio' | 'visual' | 'practice'
const MODES: { id: Mode; en: string; kn: string; modality: Modality }[] = [
  { id: 'course', en: 'Course', kn: 'ಕೋರ್ಸ್', modality: 'text' },
  { id: 'read', en: 'Read', kn: 'ಓದು', modality: 'text' },
  { id: 'audio', en: 'Audio', kn: 'ಆಡಿಯೋ', modality: 'audio' },
  { id: 'visual', en: 'Visual', kn: 'ಚಿತ್ರ', modality: 'interactive' },
  { id: 'practice', en: 'Practice', kn: 'ಅಭ್ಯಾಸ', modality: 'worked_example' },
]
const L = lesson as unknown as {
  model: string
  course: { prerequisite_recap: string; modules: { title: string; objective: string; lessons: { title: string; explanation: string }[]; checkpoint: Item }[] }
  reading: Record<string, { steps: { text: string }[]; practice: Item[] }>
  audio: Record<string, { en_turns: { text: string; pause_question?: Item | null }[]; kn_turns: { text: string; pause_question?: Item | null }[] }>
  audio_sample?: string
}
const SUBS = ['basic', 'commission', 'change', 'sheet'] as const
const conceptOf = (op: Op) => (op === 'pct_change' ? 'percent_change' : op === 'pct_of_plus_fixed' ? 'commission_calc' : 'percent_basic')
const PREREQUISITES: Record<string, { title: string; explanation: string; example: string; concept: string; question: string; answer: number }> = {
  add_sub: { title: 'Add and subtract stock counts', explanation: 'Subtract items that leave and add items that return.', example: 'Start with 240 packets, ship 85 and receive 30 back. 240 − 85 + 30 = 185 packets.', concept: 'add_sub', question: 'Start with 150 packets. Ship 35 and receive 8 back. How many remain?', answer: 123 },
  mult_div: { title: 'Multiply quantities and split amounts', explanation: 'Multiply the number of groups by the items in each group. Divide the total by the group size to find the number of groups.', example: '15 cartons × 24 bottles = 360 bottles. 360 ÷ 24 = 15 cartons.', concept: 'mult_div', question: 'How many bottles are in 8 cartons of 12?', answer: 96 },
  fractions_decimals: { title: 'Convert fractions to decimals', explanation: 'Divide the top number by the bottom number. A percentage uses 100 as the bottom number.', example: '3 ÷ 4 = 0.75. That is also 75 out of 100, or 75%.', concept: 'fractions_decimals', question: 'Write 2/5 as a decimal.', answer: 0.4 },
}

function Ask({ item, modality, concept }: { item: Omit<Item, 'op' | 'args'> & Partial<Pick<Item, 'op' | 'args'>>; modality: Modality; concept?: string }) {
  const { add, twin } = useTwin()
  const [v, setV] = useState('')
  const [retry, setRetry] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const previous = !retry && twin.history.findLast((e) => e.itemId === item.id && e.modality === modality)
  const expected = item.op && item.args ? compute(item.op, item.args) : item.answer
  const mis = previous && !previous.correct && previous.answer !== null && item.op && item.args
    ? detectMisconception(item.op, item.args, previous.answer) : undefined
  const check = () => {
    const n = parseCell(v).value
    if (n === null || !Number.isFinite(n)) { setInvalid(true); return }
    const ok = Math.abs(n - expected) < 0.011
    add({ type: 'answer', conceptId: concept ?? conceptOf(item.op ?? 'pct_of'), itemId: item.id, op: item.op, args: item.args, answer: n, correct: ok, source: 'practice', modality })
    setInvalid(false)
    setRetry(false)
  }
  const repair = mis ? PERCENT.misconceptions.find((m) => m.id === mis)?.repair : undefined
  return (
    <form className="ask" onSubmit={(e) => { e.preventDefault(); check() }}>
      <p className="ask-q">{item.question}</p>
      {previous ? <>
        <p className={previous.correct ? 'fb-ok' : 'fb-bad'} role="status">
          {previous.correct ? `Correct: ${expected}.` : `The answer is ${expected}.`} {repair ?? ''}
        </p>
        <button type="button" className="btn ghost sample-btn" onClick={() => { setRetry(true); setV('') }}>Try again</button>
      </> : <div className="row">
        <input inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} aria-label={`Answer: ${item.question}`} aria-invalid={invalid} />
        <button className="btn">Check</button>
      </div>}
      {invalid && <p className="err" role="alert">Enter one number.</p>}
    </form>
  )
}

function Visual() {
  const [pct, setPct] = useState(15)
  const [base, setBase] = useState(400)
  const val = compute('pct_of', [pct, base])
  return (
    <section className="panel" aria-label="Interactive percent model">
      <div className="grid100" role="img" aria-label={`${pct} of 100 squares filled`}>
        {Array.from({ length: 100 }, (_, i) => <i key={i} className={i < pct ? 'on' : ''} />)}
      </div>
      <label className="slider">Percent: <b>{pct}%</b>
        <input type="range" min={0} max={100} value={pct} onChange={(e) => setPct(+e.target.value)} />
      </label>
      <label className="slider">Of: <b>₹{base}</b>
        <input type="range" min={100} max={5000} step={50} value={base} onChange={(e) => setBase(+e.target.value)} />
      </label>
      <p className="calc" aria-live="polite">{pct}% of ₹{base} = ₹{base} × {pct} ÷ 100 = <b>₹{val}</b></p>
      <p className="fine">{pct} of every 100 squares are filled. Each square stands for ₹{base / 100}, so {pct} squares = ₹{val}.</p>
    </section>
  )
}

function Practice() {
  const { add } = useTwin()
  const [seed, setSeed] = useState(() => Math.floor(Date.now() / 1000))
  const { task, key } = useMemo(() => payoutTask(seed), [seed])
  const [cells, setCells] = useState<Record<string, string>>({})
  const [result, setResult] = useState<ReturnType<typeof grade> | null>(null)
  const submit = () => {
    const g = grade(task, key, cells)
    setResult(g)
    add({ type: 'answer', conceptId: 'commission_calc', itemId: task.variantId, answer: null, correct: g.status === 'correct', source: 'practice', modality: 'worked_example' })
  }
  return (
    <section className="panel">
      <p><b>Payout sheet (unseen variant {task.variantId}).</b> Incentive = {task.ratePct}% of order value + ₹{task.perOrder} per order.</p>
      <div className="sheet-wrap" tabIndex={0} role="region" aria-label="Payout practice table"><table className="sheet">
        <thead><tr><th>Rider</th><th>Order value</th><th>Orders</th><th>Payout (D)</th></tr></thead>
        <tbody>
          {task.rows.map((r, i) => (
            <tr key={r.rider}><td>{r.rider}</td><td>₹{r.orderValue}</td><td>{r.orders}</td>
              <td><input aria-label={`Payout ${r.rider}`} inputMode="decimal" value={cells[`D${i + 2}`] ?? ''} onChange={(e) => setCells({ ...cells, [`D${i + 2}`]: e.target.value })} />
                {result && <span className={result.perCell[`D${i + 2}`].ok ? 'ok' : 'bad'}>{result.perCell[`D${i + 2}`].ok ? ' ✓' : ` ✗ ${result.perCell[`D${i + 2}`].note ?? ''}`}</span>}</td></tr>
          ))}
          <tr><td colSpan={3}><b>Total (D5)</b></td><td><input aria-label="Total payout" inputMode="decimal" value={cells.D5 ?? ''} onChange={(e) => setCells({ ...cells, D5: e.target.value })} /></td></tr>
        </tbody>
      </table></div>
      {result ? (
        <div className="stack" role="status">
          <StatusPill kind={result.status === 'correct' ? 'ok' : result.status === 'partial' || result.status === 'needs_human_review' ? 'warn' : 'bad'}>Auto-check: {result.status}</StatusPill>
          <p className="fine">Checked by deterministic code, not AI. Practice results never issue a credential.</p>
          <button className="btn ghost" onClick={() => { setSeed(seed + 1); setCells({}); setResult(null) }}>New variant</button>
        </div>
      ) : <button className="btn big" onClick={submit}>Check my sheet</button>}
    </section>
  )
}

export function Learn() {
  const { state } = useStore()
  const { twin, add } = useTwin()
  const { mode: delivery } = useDelivery()
  const lang = state.lang
  const saved = twin.progress.percentages
  const topic = routeParam('topic')
  const prerequisite = topic ? PREREQUISITES[topic] : undefined
  const [mode, setMode] = useStored<Mode>('lesson-mode', MODES.find((m) => m.modality === saved?.modality)?.id ?? 'course')
  const [sub, setSub] = useState<(typeof SUBS)[number]>(() => SUBS.find((id) => id === topic) ?? SUBS[Math.min(3, saved?.step ?? 0)])
  const [audioState, setAudioState] = useState<'ready' | 'playing' | 'error'>('ready')
  const switchMode = (m: Mode) => {
    setMode(m)
    setAudioState('ready')
    add({ type: 'progress', conceptId: 'percentages', step: SUBS.indexOf(sub), modality: MODES.find((x) => x.id === m)!.modality })
  }
  const switchSub = (s: (typeof SUBS)[number]) => {
    setSub(s)
    setAudioState('ready')
    add({ type: 'progress', conceptId: 'percentages', step: SUBS.indexOf(s), modality: MODES.find((x) => x.id === mode)!.modality })
  }
  const [openedAt] = useState(Date.now)
  const act = nextAction(twin, openedAt)
  const m = twin.mastery.percent_basic
  const audio = L.audio[sub]
  const turns = lang === 'kn' ? audio?.kn_turns : audio?.en_turns
  const audioSrc = lang === 'kn' ? sub === 'basic' ? L.audio_sample : undefined
    : sub !== 'sheet' ? `/media/audio/en_${sub}.m4a` : undefined
  const actualTopic = L.course.modules[SUBS.indexOf(sub)]
  const continueActions = <div className="path-actions">
    <button className="btn big" onClick={() => go('revision')}>Open my revision reel</button>
    <button className="btn ghost" onClick={() => go('path')}>Back to my path</button>
  </div>
  if (prerequisite) {
    return <Screen title={prerequisite.title} className="journey" contentLang="en" careerFlow>
      <section className="panel"><p>{prerequisite.explanation}</p><p>{prerequisite.example}</p></section>
      <Ask concept={prerequisite.concept} item={{ id: `foundation-${prerequisite.concept}`, question: prerequisite.question, answer: prerequisite.answer }} modality="text" />
      <button className="btn big" onClick={() => go('path')}>Back to my learning path</button>
    </Screen>
  }
  return (
    <Screen title={topic ? actualTopic.title : lang === 'kn' ? 'ಶೇಕಡಾ' : 'Percentages'} className="journey" contentLang={topic ? 'en' : lang} careerFlow>
      <div className="tabs" role="group" aria-label="Learning mode">
        {MODES.map((x) => <button key={x.id} lang={lang} aria-pressed={mode === x.id} className={`tab ${mode === x.id ? 'on' : ''}`} onClick={() => switchMode(x.id)}>{lang === 'kn' ? x.kn : x.en}</button>)}
      </div>
      {mode !== 'visual' && mode !== 'practice' && (
        <div className="tabs small" role="group" aria-label="Subtopic">
          {SUBS.map((s, i) => <button key={s} aria-pressed={sub === s} className={`tab ${sub === s ? 'on' : ''}`} onClick={() => switchSub(s)}>{['Basics', 'Commission', 'Change', 'Formulas'][i]}</button>)}
        </div>
      )}
      {mode === 'course' && (
        <section className="stack">
          <section className="panel" lang="en">
            <h2>{actualTopic.title}</h2><p>{actualTopic.objective}</p>
            {actualTopic.lessons.map((l) => <div key={l.title}><h3>{l.title}</h3><p>{l.explanation}</p></div>)}
            <Ask key={actualTopic.checkpoint.id} item={actualTopic.checkpoint} modality="text" concept={sub === 'sheet' ? 'sheet_percent_formula' : undefined} />
          </section>
        </section>
      )}
      {mode === 'read' && (
        <section className="stack">
          {L.reading[sub].steps.map((s, i) => <p key={s.text} className="panel" lang="en"><b>{i + 1}.</b> {s.text}</p>)}
          {L.reading[sub].practice.map((it) => <Ask key={it.id} item={it} modality="text" concept={sub === 'sheet' ? 'sheet_percent_formula' : undefined} />)}
        </section>
      )}
      {mode === 'audio' && (
        <section className="stack">
          {audioSrc && delivery !== 'offline' && audioState === 'ready' && <button className="btn" onClick={() => setAudioState('playing')}>Load lesson audio</button>}
          {audioSrc && delivery !== 'offline' && audioState === 'playing' && <audio controls autoPlay src={audioSrc} onError={() => setAudioState('error')} />}
          {(!audioSrc || delivery === 'offline' || audioState === 'error') && <p className="hint" role="status">Audio unavailable here. Read the transcript below.</p>}
          {lang === 'kn' && <p className="fine">Kannada script is machine-generated and UNVERIFIED by a fluent reviewer.</p>}
          {turns?.map((t, i) => (
            <div key={i} className="panel" lang={lang === 'kn' ? 'kn' : 'en'}>
              <p>{t.text}</p>
              {t.pause_question && <Ask item={t.pause_question} modality="audio" />}
            </div>
          ))}
        </section>
      )}
      {mode === 'visual' && <Visual />}
      {mode === 'practice' && <Practice />}
      {continueActions}
      <details className="panel">
        <summary>Learning progress and lesson sources</summary>
        <p className="fine">Percentages: {m ? `${masteryMean(m).toFixed(2)} ± ${masterySd(m).toFixed(2)} (${m.n} answers)` : 'no answers yet'}.</p>
        <p className="fine">{act.reason}</p>
        <p className="fine">Lesson source: {L.model}.</p>
      </details>
    </Screen>
  )
}
