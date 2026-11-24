import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Screen, useDelivery } from '../Chrome'
import { GRAPH, type DiagnosticItem } from '../engine/graph.ts'
import { learningPath, runDiagnostic, type Responder } from '../engine/learner.ts'
import { parseCell } from '../engine/proof.ts'
import { go, routeParam } from '../router'
import { useStore } from '../store'
import { saveLearning } from './journal'
import { useSync } from './sync'
import { useTwin } from './twinStore'
import { useStored } from './useStored'

type Skill = 'commission_calc' | 'percent_basic' | 'percent_change'
type Goal = { kind: 'school' | 'job'; text: string; skill: Skill; confirmed: boolean; diagnosticId?: string }
const INITIAL: Goal = { kind: 'job', text: '', skill: 'commission_calc', confirmed: false }
const JOB_EXAMPLE = 'Inventory and dispatch assistant. Reconcile stock counts and work out rider payouts in Excel: commission percentage plus a fixed bonus per delivery.'
const PAYOUT_GOAL: Goal = { ...INITIAL, text: 'Calculate rider payouts using commission and per-order bonuses.' }
const SKILLS: Record<Skill, string> = {
  commission_calc: 'Calculate commission and payouts',
  percent_basic: 'Find a percentage of a quantity',
  percent_change: 'Calculate stock variance percentages',
}

const LESSONS: Record<string, { title: string; topic: string; minutes: number }> = {
  add_sub: { title: 'Add and subtract stock counts', topic: 'add_sub', minutes: 2 },
  mult_div: { title: 'Multiply quantities and split amounts', topic: 'mult_div', minutes: 2 },
  fractions_decimals: { title: 'Convert fractions to decimals', topic: 'fractions_decimals', minutes: 2 },
  percent_basic: { title: 'Find a percentage of a quantity', topic: 'basic', minutes: 3 },
  percent_change: { title: 'Calculate stock variance', topic: 'change', minutes: 3 },
  commission_calc: { title: 'Calculate commission and bonuses', topic: 'commission', minutes: 4 },
}

function inferSkill(text: string): Skill | null {
  if (/payout|pay.out|commission|incentive|per.order|bonus|rider/i.test(text)) return 'commission_calc'
  if (/varian|stock|inventor|reconcil/i.test(text)) return 'percent_change'
  if (/percent|%|discount/i.test(text)) return 'percent_basic'
  return null
}

export function SyncNotice() {
  const { pending, status, sync } = useSync()
  const { online } = useDelivery()
  if (!online) return <p className="fine" role="status">Offline · {pending ? `${pending} updates saved on this device` : 'Progress saved on this device'}</p>
  if (!pending) return <p className="fine" role="status">{status === 'synced' ? 'Progress synced' : 'Progress is saved as you go'}</p>
  return <div className="sync-line">
    <p className="fine" role="status">{status === 'syncing' ? 'Syncing progress…' : `${pending} updates saved on this device · sync pending`}</p>
    {status === 'unavailable' && <button className="btn ghost" onClick={() => void sync()}>Retry sync</button>}
  </div>
}

export function Journey() {
  const fromRole = routeParam('from') === 'payouts'
  const [savedGoal, save] = useStored('goal', INITIAL)
  const goal = fromRole && !savedGoal.text && !savedGoal.confirmed ? PAYOUT_GOAL : savedGoal
  const [editing, setEditing] = useState(!goal.confirmed)
  const [confirm, setConfirm] = useState(fromRole && !savedGoal.text && !savedGoal.confirmed)
  const [suggestion, setSuggestion] = useState<Skill | null>(null)
  const [photo, setPhoto] = useState(true)
  const { mode } = useDelivery()
  const { twin, events } = useTwin()
  const plan = learningPath({ ...twin, goal: { conceptId: goal.skill, why: goal.text } })
  const diagnostics = twin.history.filter((e) => goal.diagnosticId && e.id.startsWith(`${twin.learnerId}-${goal.diagnosticId}-`))
  const recall = twin.history.findLast((e) => e.source === 'recall')
  const started = !!goal.diagnosticId && !editing
  const firstLesson = LESSONS[plan[0]] ?? LESSONS[goal.skill]
  const heading = started ? 'Your learning path' : 'What do you want to learn?'
  const confirmation = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (confirm) confirmation.current?.focus() }, [confirm])

  function prepare(event: FormEvent) {
    event.preventDefault()
    const suggested = inferSkill(goal.text)
    if (suggested) save({ ...goal, skill: suggested })
    setSuggestion(suggested)
    setConfirm(true)
  }

  if (fromRole && (savedGoal.confirmed ? savedGoal.skill !== 'commission_calc' : !!savedGoal.text && inferSkill(savedGoal.text) !== 'commission_calc')) {
    return <Screen title="Prepare for dispatch and payouts" className="journey" contentLang="en" careerFlow>
      <p>Practice percentage-based commission and per-order bonuses, then calculate payouts on an unseen worksheet.</p>
      <div className="path-actions">
        <button className="btn big" onClick={() => go('learn', { topic: 'commission' })}>Open the payout lesson</button>
        <button className="btn ghost" onClick={() => go('challenge')}>Open the payout worksheet</button>
      </div>
      <button className="btn ghost" onClick={() => go('path')}>Return to my existing path</button>
    </Screen>
  }

  return <Screen title={fromRole && !started ? 'Prepare for dispatch and payouts' : heading} contentLang="en" careerFlow
    className={started ? 'journey path-screen' : fromRole ? 'journey' : 'journey start-screen'} kicker={!started && !fromRole && (
    <div className="journey-hero" aria-hidden="true">
      {mode !== 'offline' && photo && <img src="/media/sheru-boss.webp" onError={() => setPhoto(false)} alt="" />}
      <div className="hero-equation"><span>20% of ₹350</span><b>₹70</b></div>
    </div>
  )}>
    {editing ? (
      confirm ? <form className="journey-form" onSubmit={(e) => {
        e.preventDefault()
        save({ ...goal, text: goal.text.trim(), confirmed: true, diagnosticId: undefined })
        go('diagnostic')
      }}>
        <div className="stack">
          <h2 ref={confirmation} tabIndex={-1}>Confirm your skill</h2>
          <p>{suggestion ? `Suggested: ${SKILLS[suggestion]}. Change it if the wording means something else.` : 'Choose the supported skill that best matches your goal.'}</p>
          <blockquote>{goal.text}</blockquote>
        </div>
        <fieldset className="block">
          <legend>Skill to learn</legend>
          {Object.entries(SKILLS).map(([id, label]) => <label key={id} className="choice-row">
            <input type="radio" name="skill" checked={goal.skill === id} onChange={() => save({ ...goal, skill: id as Skill })} />
            <span>{label}</span>
          </label>)}
        </fieldset>
        <button className="btn big" type="submit">Start the diagnostic</button>
        <button className="btn ghost" type="button" onClick={() => setConfirm(false)}>Edit my goal</button>
      </form> : <form className="journey-form" onSubmit={prepare}>
        <p className="journey-intro">Build confidence with percentages, stock counts and payouts. A quick diagnostic shows you where to start.</p>
        <fieldset className="block">
          <legend>I’m learning for</legend>
          <div className="choice-group">
            {(['school', 'job'] as const).map((kind) => <label key={kind} className="choice-row">
              <input type="radio" name="goal-type" checked={goal.kind === kind} onChange={() => save({ ...goal, kind })} />
              <span>{kind === 'school' ? 'Learn for school' : 'Learn for a job'}</span>
            </label>)}
          </div>
        </fieldset>
        <label className="field-label">{goal.kind === 'job' ? 'Your goal or job description' : 'Your learning goal'}
          <textarea className="goal-input" required maxLength={1500} rows={3} value={goal.text}
            onChange={(e) => save({ ...goal, text: e.target.value })}
            placeholder={goal.kind === 'job' ? 'Paste the job requirements or describe your goal' : 'For example, understand percentage changes'} />
        </label>
        <button className="btn big" disabled={!goal.text.trim()}>Find my starting point <span aria-hidden="true">→</span></button>
        <button className="btn ghost sample-btn" type="button" onClick={() => save({ ...goal, kind: 'job', text: JOB_EXAMPLE })}>Use the sample job</button>
      </form>
    ) : !started ? <div className="journey-form">
      <p>Start with a short check on {SKILLS[goal.skill].toLowerCase()}.</p>
      <button className="btn big" onClick={() => go('diagnostic')}>Continue diagnostic</button>
      <button className="btn ghost" onClick={() => setEditing(true)}>Edit my goal</button>
    </div> : <>
      <div className="path-lead">
        <h2>{SKILLS[goal.skill]}</h2>
        <p>{diagnostics.length ? `You answered ${diagnostics.filter((e) => e.correct).length} of ${diagnostics.length} diagnostic questions correctly.` : 'Your earlier answers provided enough evidence for this skill.'}
          {' '}{plan.length ? `Your first lesson is “${firstLesson.title}.” Your path follows the skills each lesson builds on.` : 'Your current evidence supports moving on to revision.'}</p>
      </div>
      <div className="path-actions">
        <button className="btn big" onClick={() => plan.length ? go('learn', { topic: firstLesson.topic }) : go('revision')}>
          {plan.length ? 'Start recommended lesson' : 'Start my revision reel'}
        </button>
        <button className="btn ghost" onClick={() => setEditing(true)}>Edit my goal</button>
      </div>
      <ol className="path-list">
        {plan.map((skill, i) => {
          const lesson = LESSONS[skill]
          return <li key={skill}>
            <div><b>{lesson.title}</b><small>{lesson.minutes} min{GRAPH.nodes[skill].prereqs.length ? ` · Builds on ${LESSONS[GRAPH.nodes[skill].prereqs[0]].title.toLowerCase()}` : ''}</small></div>
            <button className="btn ghost" onClick={() => go('learn', { topic: lesson.topic })} aria-label={`${i === 0 ? 'Start' : 'Open'} lesson: ${lesson.title}`}>{i === 0 ? 'Start' : 'Open'}</button>
          </li>
        })}
        <li><div><b>Recall on a new example</b><small>{recall ? 'Recall attempted · revisit when ready' : '1 min · Interactive revision reel'}</small></div><button className="btn ghost" onClick={() => go('revision')}>Watch</button></li>
        <li><div><b>Complete a payout worksheet</b><small>4 min · New numbers for each attempt</small></div><button className="btn ghost" onClick={() => go('challenge')}>Open</button></li>
        <li><div><b>Review and share evidence</b><small>Skill Passport · Consent required</small></div><button className="btn ghost" onClick={() => go('skill-passport')}>Open</button></li>
      </ol>
      {events.some((e) => e.type === 'progress') && <p className="fine">Lesson activity is saved across delivery modes.</p>}
    </>}
    <SyncNotice />
  </Screen>
}

type DiagnosticSession = { id: string; at: number; skill: Skill; answers: Record<string, ReturnType<Responder>> }
const WAITING = Symbol('unanswered diagnostic item')

function diagnosticStep(twin: ReturnType<typeof useTwin>['twin'], goal: Goal, session: DiagnosticSession) {
  let question: DiagnosticItem | undefined
  try {
    const result = runDiagnostic({ ...twin, goal: { conceptId: goal.skill, why: goal.text } }, (_concept, item) => {
      const answer = session.answers[item.id]
      if (answer) return answer
      question = item
      throw WAITING
    }, session.at, session.id)
    return { result, question: undefined }
  } catch (problem) {
    if (problem !== WAITING) throw problem
    return { question, result: undefined }
  }
}

export function Diagnostic() {
  const [goal, saveGoal] = useStored('goal', INITIAL)
  const [previous, saveSession] = useStored<DiagnosticSession | null>('diagnostic', null)
  const [fresh] = useState<DiagnosticSession>(() => ({ id: crypto.randomUUID(), at: Date.now(), skill: goal.skill, answers: {} }))
  const session = previous?.skill === goal.skill && !goal.diagnosticId ? previous : fresh
  const { twin } = useTwin()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [answered, setAnswered] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const entered = useRef(session.at)
  const { question, result } = diagnosticStep(twin, goal, session)

  useEffect(() => {
    entered.current = Date.now()
    if (answered) heading.current?.focus()
  }, [question?.id, answered])

  function respond(skip: boolean) {
    if (!question) return
    const answer = skip ? null : parseCell(value).value
    if (!skip && (answer === null || !Number.isFinite(answer))) {
      setError('Enter a number, or choose “I’m not sure”.')
      return
    }
    saveSession({ ...session, answers: { ...session.answers, [question.id]: { answer, latencyMs: Date.now() - entered.current } } })
    setValue('')
    setError('')
    setAnswered(true)
  }

  function finish() {
    if (!result) return
    try {
      saveLearning(result.twin.history.filter((event) => event.id.startsWith(`${twin.learnerId}-${session.id}-`)))
      saveGoal({ ...goal, diagnosticId: session.id })
      saveSession(null)
      go('path')
    } catch { setError('Device storage is unavailable. Free space and try again.') }
  }

  return <Screen title="Quick diagnostic" className="journey" contentLang="en" careerFlow>
    {!goal.confirmed || goal.diagnosticId ? <button className="btn big" onClick={() => go('path')}>Go to my learning path</button> : question ? (
      <form className="diagnostic-panel" onSubmit={(e) => { e.preventDefault(); respond(false) }}>
        <p className="fine">Question {Object.keys(session.answers).length + 1} · About 1 minute overall</p>
        <h2 ref={heading} tabIndex={-1}>{question.q}</h2>
        <label className="field-label">Your answer<input className="text-input" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={!!error} /></label>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn big">Continue <span aria-hidden="true">→</span></button>
        <button className="btn ghost" type="button" onClick={() => respond(true)}>I’m not sure</button>
      </form>
    ) : <div className="diagnostic-panel">
      <h2 ref={heading} tabIndex={-1}>Your path is ready</h2>
      <p>{result?.asked.length ? 'See which skills to review and where to start.' : 'Your previous answers already give us a starting point.'}</p>
      <button className="btn big" onClick={finish}>Show my learning path</button>
      {error && <p className="err" role="alert">{error}</p>}
    </div>}
  </Screen>
}

export function Delivery() {
  const { state, setDelivery, setDataSaver } = useStore()
  const { mode, status } = useDelivery()
  return <Screen title="Adaptive delivery" className="journey" contentLang="en" careerFlow>
    <p>Choose how media loads. Your lessons, answers and progress stay together.</p>
    <fieldset className="block">
      <legend>Delivery mode</legend>
      {([
        ['auto', 'Automatic', 'Uses the browser’s network hints.'],
        ['rich', 'Rich', 'Cached video, motion, captions and recall.'],
        ['lite', 'Lite', 'Compressed stills, motion and recall. Audio loads on request.'],
        ['offline', 'Offline', 'Saved text, illustrations and exercises.'],
      ] as const).map(([id, label, text]) => (
        <label key={id} className="choice-row delivery-choice">
          <input type="radio" name="delivery" checked={state.delivery === id} onChange={() => setDelivery(id)} />
          <span><b>{label}</b><small>{text}</small></span>
        </label>
      ))}
    </fieldset>
    <label className="choice-row">
      <input type="checkbox" checked={state.dataSaver} onChange={(e) => setDataSaver(e.target.checked)} />
      <span><b>Data Saver</b><small>Uses stills and turns off prefetching, even when Rich is selected.</small></span>
    </label>
    <section className="panel">
      <h2>Percentages and payouts pack</h2>
      <p>{status === 'ready' ? 'Saved for offline use on this device.' : status === 'caching' ? 'Saving the lessons and exercises…' : 'Offline packs are available from the production app in a supported browser.'}</p>
      <p className="fine" role="status">Playing in {mode === 'rich' ? 'Rich' : mode === 'lite' ? 'Lite' : 'Offline'} mode</p>
    </section>
    <SyncNotice />
    <button className="btn big" onClick={() => history.length > 1 ? history.back() : go('path')}>Back to learning</button>
  </Screen>
}
