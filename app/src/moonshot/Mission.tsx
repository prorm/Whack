import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Screen, StatusPill, useDelivery } from '../Chrome'
import { INVENTORY_SAMPLE_ID } from '../careers/opportunities'
import { GRAPH } from '../engine/graph.ts'
import { deleteBlob, getBlob, putBlob } from '../mediaDb'
import { request } from '../learn/sync'
import { useStored } from '../learn/useStored'
import { useTwin } from '../learn/twinStore'
import { routeParam } from '../router'
import { InventoryReel } from './InventoryReel'
import {
  approve, answerSource, DEMO, DEMO_PROPOSAL, gradeInventory, initialSteps, inventoryAnswer, inventoryPrerequisites, propose,
  redact, SOURCE, stockResult, variant, type Attempt, type Contribution, type ExperienceTrace, type LocalMedia,
  type Permissions, type Playbook, type Receipt, type Step, type Stock,
} from './domain.ts'
import './mission.css'

const TITLES = ['Submit a problem', 'Confirm the facts', 'Review the demonstration', 'Mission playbook', 'Learn the method',
  'Recall the stock rule', 'Try an unseen worksheet', 'Skill evidence', 'Add to the mission']
const PERMISSIONS = { capture: false, derivatives: false, publicShare: false }
const SAMPLE_TRACE: ExperienceTrace = {
  ...propose(DEMO.sourceText, true, { ...PERMISSIONS, capture: true, derivatives: true }),
  experienceId: INVENTORY_SAMPLE_ID,
  reviewStatus: 'demo-reviewed',
}
const SAMPLE_PLAYBOOK = approve(SAMPLE_TRACE, SAMPLE_TRACE.actions.map((action) => ({
  id: action.id, span: action.id, instruction: action.action, status: 'checked',
})), 1, DEMO.followup.answer, Date.UTC(2026, 10, 24))
const MIME = /^image\/(png|jpeg|webp)$|^application\/pdf$|^video\/(mp4|webm|quicktime)$|^audio\/(mpeg|mp4|wav|webm|ogg)$/
const emptySeed = () => crypto.getRandomValues(new Uint32Array(1))[0] || 1
const timecode = (at: number) => `0:${String(at).padStart(2, '0')}`
type Draft = { text: string; demo: boolean; permissions: Permissions; media?: LocalMedia }
type Mistake = { submitted: number; kind: string; reference: Stock }
type Intent = { attemptId: string; state: 'send' | 'withdrawn'; synced: boolean; receipt?: Receipt | null }
type EvidenceLog = { latest: string; attempts: Record<string, Attempt>; intents: Record<string, Intent> }
const EMPTY_LOG: EvidenceLog = { latest: '', attempts: {}, intents: {} }

function Jump({ children, onClick, secondary = false }: { children: ReactNode; onClick: () => void; secondary?: boolean }) {
  return <button type="button" className={secondary ? 'btn ghost' : 'btn big'} onClick={onClick}>{children}</button>
}

function permissionLabel(value: boolean, onChange: (value: boolean) => void, label: string, description?: string) {
  return <label className="choice-row"><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    <span><b>{label}</b>{description && <small>{description}</small>}</span></label>
}

function SourcePlayer({ trace, media, cue, onAt }: { trace: ExperienceTrace; media?: LocalMedia; cue?: { at: number }; onAt?: (at: number) => void }) {
  const { mode } = useDelivery()
  const [url, setUrl] = useState('')
  const [missing, setMissing] = useState(false)
  const [retry, tryAgain] = useState(0)
  const [play, setPlay] = useState(mode === 'rich')
  const video = useRef<HTMLVideoElement>(null)
  const local = trace.sourceMedia === 'private'
  useEffect(() => {
    if (!media) return
    let cancelled = false
    let objectURL = ''
    getBlob(media.id).then((blob) => {
      if (cancelled) return
      if (!blob) { setMissing(true); return }
      objectURL = URL.createObjectURL(blob)
      setUrl(objectURL)
    }).catch(() => { if (!cancelled) setMissing(true) })
    return () => { cancelled = true; if (objectURL) URL.revokeObjectURL(objectURL) }
  }, [media, retry])
  useEffect(() => {
    if (cue && video.current && video.current.readyState) video.current.currentTime = cue.at
  }, [cue, play])
  if (missing) return <div className="mission-media">
    <p className="hint" role="status">Recording unavailable. Read the transcript or the cited source text below.</p>
    <button className="btn ghost" onClick={() => { setMissing(false); tryAgain(retry + 1) }}>Retry the recording</button>
  </div>
  const src = local ? url : SOURCE.video
  if (local && !url) return <p className="fine">{media ? 'Opening the private file…' : 'Written source only'}</p>
  if (local && media?.mime.startsWith('image/')) return <img className="mission-source-img" src={url} alt="Private source document preview" onError={() => setMissing(true)} />
  if (local && media?.mime === 'application/pdf') return <a className="btn ghost" href={url} download={media.name}>Open saved PDF</a>
  if (local && media?.mime.startsWith('audio/')) return <audio controls src={url} onError={() => setMissing(true)} />
  if (!local && (mode === 'offline' || !play)) return <div className="mission-media">
    {mode !== 'offline' && <img className="mission-source-img" src={SOURCE.still} alt="Synthetic stock worksheet with the corrected formula" onError={() => setMissing(true)} />}
    {mode === 'offline' ? <p className="hint">Offline transcript and worksheet values are available below.</p>
      : <button className="btn ghost" onClick={() => setPlay(true)}>Load the source video</button>}
  </div>
  return <video className="mission-source-img" ref={video} src={src} poster={local ? undefined : SOURCE.still}
    controls playsInline preload="metadata" aria-label="Contributor demonstration" onError={() => setMissing(true)}
    onLoadedMetadata={() => { if (cue && video.current) video.current.currentTime = cue.at }}
    onTimeUpdate={(event) => onAt?.(event.currentTarget.currentTime)}>
    {!local && <track src={SOURCE.captions} kind="captions" srcLang="en" label="English" default />}
  </video>
}

function Facts({ data }: { data: Stock }) {
  return <dl className="mission-facts">
    {(Object.entries(data) as [keyof Stock, number][]).map(([key, value]) => <div key={key}>
      <dt>{({ opening: 'Opening', received: 'Received', sold: 'Sold', counted: 'Counted' })[key]}</dt><dd>{value}</dd>
    </div>)}
  </dl>
}

function Inputs({ onSubmit, caption = 'Check worksheet' }: { onSubmit: (expected: number, variance: number) => void; caption?: string }) {
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const expected = inventoryAnswer(String(fields.get('expected')))
    const variance = inventoryAnswer(String(fields.get('variance')))
    if (expected === null || expected < 0 || variance === null) { setError('Enter two whole numbers. A shortage has a negative sign.'); return }
    setError('')
    onSubmit(expected, variance)
  }
  return <form className="mission-fields" onSubmit={submit}>
    <label className="field-label">Expected closing stock<input className="text-input" name="expected" inputMode="numeric" maxLength={12} required /></label>
    <label className="field-label">Signed stock difference<input className="text-input" name="variance" maxLength={12} required /></label>
    {error && <p className="err" role="alert">{error}</p>}
    <button className="btn big">{caption}</button>
  </form>
}

function RecordExplanation({ onFile, onError }: { onFile: (file: File) => void; onError: (error: string) => void }) {
  const [state, setState] = useState<'idle' | 'opening' | 'recording'>('idle')
  const recorder = useRef<MediaRecorder>(null)
  const timeout = useRef<ReturnType<typeof setTimeout>>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (timeout.current) clearTimeout(timeout.current)
      if (recorder.current?.state === 'recording') recorder.current.stop()
      recorder.current?.stream.getTracks().forEach((track) => track.stop())
    }
  }, [])
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return null
  async function record() {
    setState('opening')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!mounted.current) { stream.getTracks().forEach((track) => track.stop()); return }
      const next = new MediaRecorder(stream)
      recorder.current = next
      const chunks: Blob[] = []
      next.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
      next.onstop = () => {
        if (timeout.current) clearTimeout(timeout.current)
        stream.getTracks().forEach((track) => track.stop())
        if (!mounted.current) return
        setState('idle')
        if (chunks.length) {
          const contentType = next.mimeType.split(';')[0] || 'audio/webm'
          const extension = contentType === 'audio/mp4' ? 'm4a' : contentType === 'audio/ogg' ? 'ogg' : 'webm'
          onFile(new File(chunks, `private-explanation.${extension}`, { type: contentType }))
        }
      }
      next.start()
      setState('recording')
      timeout.current = setTimeout(() => { if (next.state === 'recording') next.stop() }, 30_000)
    } catch {
      if (mounted.current) { onError('Microphone unavailable. Attach a saved audio file instead.'); setState('idle') }
    }
  }
  return <button type="button" className="btn ghost" disabled={state === 'opening'} onClick={() => {
    if (state === 'recording') recorder.current?.stop()
    else void record()
  }}>{state === 'recording' ? 'Stop and save private recording' : state === 'opening' ? 'Opening microphone…' : 'Record a private explanation'}</button>
}

function Lesson({ playbook, trace, onTry }: {
  playbook: Playbook; trace: ExperienceTrace; onTry: (stock: Stock, calculated: number, signed: number) => void
}) {
  const { mode } = useDelivery()
  const [type, setType] = useStored<'Read' | 'Audio' | 'Visual' | 'Practice' | 'Expert replay'>('moonshot-lesson-mode', 'Read')
  const [locale, setLocale] = useStored<'en' | 'kn'>('moonshot-lesson-locale', 'en')
  const [step, setStep] = useStored(`moonshot-step-${playbook.experienceId}-${playbook.version}`, 0)
  const [question, setQuestion] = useState('')
  const [reply, setReply] = useState<ReturnType<typeof answerSource> | undefined>()
  const [cue, setCue] = useState<{ at: number }>()
  const [at, setAt] = useState(0)
  const [audio, setAudio] = useState<'idle' | 'playing' | 'unavailable'>('idle')
  const current = playbook.steps[Math.min(step, playbook.steps.length - 1)]
  const source = trace.actions.find((item) => item.id === current.span)!
  const output = stockResult(playbook.facts)
  return <div className="mission-stage">
    <div className="mission-mode tabs" role="group" aria-label="Learning format">{(['Read','Audio','Visual','Practice','Expert replay'] as const)
      .map((label) => <button key={label} className={`tab ${type === label ? 'on' : ''}`} aria-pressed={type === label} onClick={() => setType(label)}>{label}</button>)}</div>
    <p className="fine">Playbook v{playbook.version} · {playbook.source}</p>
    <div className="mission-pager">
      <div><b>Step {Math.min(step + 1, playbook.steps.length)} of {playbook.steps.length}</b><p>{current.instruction}</p></div>
      <div className="row">
        <button className="btn ghost" disabled={!step} onClick={() => setStep(step - 1)}>Previous step</button>
        <button className="btn ghost" disabled={step >= playbook.steps.length - 1} onClick={() => setStep(step + 1)}>Next step</button>
      </div>
    </div>
    {type === 'Read' && <>
      {trace.sourceMedia === 'synthetic' && <label className="field-label">Reading language<select value={locale} onChange={(e) => setLocale(e.target.value === 'kn' ? 'kn' : 'en')}>
        <option value="en">English</option><option value="kn">Kannada · draft</option></select></label>}
      {locale === 'kn' && trace.sourceMedia === 'synthetic' ? <section lang="kn" className="stack">
        <p className="hint" lang="en">Kannada reference translation · fluent review pending</p>
        <ol>{DEMO.learning.kn.map((line) => <li key={line}>{line}</li>)}</ol><p lang="en">{source.speech}</p>
      </section> : <p>{source.speech || source.seen}</p>}
    </>}
    {type === 'Audio' && <>
      {trace.sourceMedia === 'synthetic' && <label className="field-label">Narration language<select value={locale} onChange={(e) => {
        setLocale(e.target.value === 'kn' ? 'kn' : 'en'); setAudio('idle')
      }}><option value="en">English</option><option value="kn">Kannada · draft</option></select></label>}
      {trace.sourceMedia === 'synthetic' && mode !== 'offline' && audio === 'idle' && <Jump secondary onClick={() => setAudio('playing')}>
        {locale === 'kn' ? 'Load synthetic Kannada sample' : 'Load synthetic English narration'}
      </Jump>}
      {locale === 'kn' && <p className="fine">The Kannada sample summarizes the calculation. Pronunciation and cadence await fluent review.</p>}
      {audio === 'playing' && mode !== 'offline' && <audio controls src={locale === 'kn' ? SOURCE.audioKn : SOURCE.audio} onError={() => setAudio('unavailable')} />}
      {audio === 'unavailable' && <p className="hint" role="status">Audio unavailable. Use the transcript.</p>}
      <p><b>Source transcript</b> {source.speech || source.seen}</p>
    </>}
    {type === 'Visual' && <section className="mission-calculation" aria-label="Stock calculation">
      <Facts data={playbook.facts} />
      <p>Expected stock <strong>{playbook.facts.opening} + {playbook.facts.received} − {playbook.facts.sold} = {output.expected}</strong></p>
      <p>Signed difference <strong>{playbook.facts.counted} − {output.expected} = {output.variance}</strong></p>
    </section>}
    {type === 'Practice' && <><Facts data={playbook.facts} /><Inputs onSubmit={(calculated, signed) => onTry(playbook.facts, calculated, signed)} caption="Use this answer for revision" /></>}
    {type === 'Expert replay' && <>
      <SourcePlayer key={trace.experienceId} trace={trace} media={trace.attachment} cue={cue} onAt={setAt} />
      <Jump secondary onClick={() => setCue({ at: source.at })}>Jump to {timecode(source.at)}</Jump>
      <p>{source.seen}</p>
      <form className="mission-fields" onSubmit={(event) => { event.preventDefault(); setReply(answerSource(playbook, trace, question, at)) }}>
        <label className="field-label">Ask about the source<input className="text-input" spellCheck={false} autoComplete="off" value={question} onChange={(event) => setQuestion(event.target.value)} required maxLength={250}
          placeholder="Why C4 instead of C5?" /></label>
        <button className="btn">Find an answer in the source</button>
      </form>
      {reply === null && <p className="hint" role="status">The reviewed material does not answer this. You can leave a question for the contributor.</p>}
      {reply && <section className="mission-citation" role="status">
        <p>{reply.text}</p><Jump secondary onClick={() => setCue({ at: reply.at })}>Go to source {timecode(reply.at)}</Jump>
      </section>}
    </>}
  </div>
}

export function Mission({ learner = false }: { learner?: boolean }) {
  const [stage, setStage] = useStored(learner ? 'career-inventory-stage' : 'moonshot-stage', learner ? 4 : 0)
  const [draft, setDraft] = useStored<Draft>('moonshot-draft', { text: '', demo: false, permissions: PERMISSIONS })
  const [storedTrace, setTrace] = useStored<ExperienceTrace | null>('moonshot-trace', null)
  const trace = learner ? SAMPLE_TRACE : storedTrace
  const [steps, setSteps] = useStored<Step[]>('moonshot-draft-steps', [])
  const [history, setHistory] = useStored<Playbook[]>('moonshot-playbook-history', [])
  const [reason, setReason] = useStored('moonshot-expert-reason', '')
  const current = learner ? SAMPLE_PLAYBOOK : history.findLast((entry) => entry.experienceId === trace?.experienceId)
  const [miss, setMiss] = useStored<Mistake | null>(learner ? 'career-inventory-miss' : 'moonshot-miss', null)
  const [seed, setSeed] = useStored(learner ? 'career-inventory-seed' : 'moonshot-seed', 0)
  const [evidence, saveEvidence] = useStored('moonshot-evidence-v1', EMPTY_LOG)
  const evidenceRef = useRef(evidence)
  useEffect(() => { evidenceRef.current = evidence }, [evidence])
  const updateEvidence = useCallback((update: (value: EvidenceLog) => EvidenceLog) => {
    const next = update(evidenceRef.current)
    evidenceRef.current = next
    saveEvidence(next)
  }, [saveEvidence])
  const attempt = Object.values(evidence.attempts).filter((entry) => entry.source === current?.experienceId)
    .sort((a, b) => b.at - a.at)[0]
  const intent: Intent | undefined = attempt ? evidence.intents[attempt.id] : undefined
  const pending = Object.values(evidence.intents).find((item) => !item.synced)
  const pendingAttempt = pending && evidence.attempts[pending.attemptId]
  const setAttempt = (next: Attempt) => updateEvidence((value) => ({ ...value, latest: next.id, attempts: { ...value.attempts, [next.id]: next } }))
  const setIntent = (next: Intent) => updateEvidence((value) => ({ ...value, intents: { ...value.intents, [next.attemptId]: next } }))
  const [sharing, setSharing] = useStored('moonshot-employer-preview', '')
  const [contributions, setContributions] = useStored<Contribution[]>('moonshot-contributions', [])
  const [type, setType] = useState<Contribution['type']>('question')
  const [contribution, setContribution] = useState('')
  const [cue, setCue] = useState<{ at: number }>()
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [trainerCode, setTrainerCode] = useState('')
  const [reviewCheck, setReviewCheck] = useState(false)
  const [syncRetry, setSyncRetry] = useState(0)
  const busy = useRef(false)
  const heading = useRef<HTMLDivElement>(null)
  const { online, mode, status: cached } = useDelivery()
  const { add, twin } = useTwin()

  const attemptId = attempt?.id
  const receipt = intent?.attemptId === attemptId && intent?.state === 'send' ? intent.receipt : null
  useEffect(() => {
    if (!online || !pending) return
    let active = true
    const run = () => {
      const body = pending.state === 'send' && pendingAttempt ? {
        action: 'submit', attemptId: pending.attemptId, seed: pendingAttempt.seed, source: pendingAttempt.source,
        version: pendingAttempt.version, expected: pendingAttempt.expected, variance: pendingAttempt.variance, at: pendingAttempt.at,
      } : { action: 'withdraw', attemptId: pending.attemptId }
      return request<{ receipt?: Receipt | null }>('/api/mission', body).then((response) => {
        if (active) updateEvidence((value) => {
          if (value.intents[pending.attemptId]?.state !== pending.state) return value
          return { ...value, intents: { ...value.intents, [pending.attemptId]: { ...pending, synced: true, receipt: response.receipt } } }
        })
      }).catch(() => { if (active) setStatus('Review sync is pending. Retry when the connection returns.') })
    }
    void run()
    const timer = setInterval(() => { if (active) void run() }, 20_000)
    return () => { active = false; clearInterval(timer) }
  }, [online, pending, pendingAttempt, updateEvidence, syncRetry])

  function navigate(step: number) {
    setError('')
    setStatus('')
    setStage(step)
    if (learner && routeParam('view')) window.history.replaceState(null, '', '#/inventory-learning')
    requestAnimationFrame(() => { document.querySelector<HTMLElement>('main h1')?.focus(); window.scrollTo({ top: 0 }) })
  }

  async function attach(file: File | undefined, target: 'source' | 'explanation') {
    if (!file) return
    if (target === 'source' && !draft.permissions.capture) { setError('Confirm permission to keep the file on this device.'); return }
    if (!MIME.test(file.type) || !file.size || file.size > 12 * 1024 * 1024 ||
        (target === 'explanation' && !/^(audio|video)\//.test(file.type))) {
      setError('Choose a supported file up to 12 MB.')
      return
    }
    const media = { id: crypto.randomUUID(), name: file.name.slice(0, 120), mime: file.type, size: file.size }
    try {
      await putBlob(media.id, file)
      if (target === 'source') {
        if (draft.media) await deleteBlob(draft.media.id)
        setDraft({ ...draft, media, demo: false, permissions: { ...draft.permissions, derivatives: false, publicShare: false } })
      } else if (attempt) {
        if (attempt.explanation) await deleteBlob(attempt.explanation.id)
        setAttempt({ ...attempt, explanation: media })
      }
      setError('')
    } catch { setError('The file could not be kept on this device.') }
  }

  function start(event: FormEvent) {
    event.preventDefault()
    if (!draft.permissions.capture || !draft.text.trim()) { setError('Add the problem and confirm permission to keep it.'); return }
    const next = propose(draft.text, draft.demo, draft.permissions, draft.media)
    const previous = history.findLast((entry) => entry.experienceId === next.experienceId)
    setTrace(next)
    setSteps(previous?.steps ?? initialSteps(next))
    setReason(previous?.contributorReason ?? '')
    setMiss(null)
    navigate(1)
  }

  function editStep(stepId: string, change: Partial<Step>) {
    setSteps(steps.map((step) => step.id === stepId ? { ...step, ...change } : step))
  }

  function publish() {
    if (!trace) return
    try {
      const released = approve(trace, steps, (current?.version ?? 0) + 1, reason, Date.now())
      setHistory([...history, released])
      setTrace({ ...trace, reviewStatus: 'demo-reviewed' })
      navigate(3)
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Review could not be saved.') }
  }

  function assess(stock: Stock, expected: number, variance: number, isChallenge: boolean) {
    const result = gradeInventory(stock, expected, variance)
    if (!current) return
    const id = crypto.randomUUID()
    if (!isChallenge && !result.correct) {
      const added = result.misconception === 'added-sales' || !result.expectedOK
      setMiss({ kind: result.misconception ?? (added ? 'closing-stock' : 'stock-difference'), submitted: added ? expected : variance, reference: stock })
    } else if (!isChallenge) {
      setMiss(null)
    }
    add({ id, type: 'answer', conceptId: 'inventory_reconciliation', itemId: `moonshot-${current.version}-${id}`, answer: null,
      correct: result.correct, source: isChallenge ? 'transfer' : 'practice', modality: 'worked_example' })
    if (isChallenge) {
      setAttempt({ id, seed, source: current.experienceId, version: current.version, expected, variance, at: Date.now() })
      setSharing('')
      setReviewCheck(false)
      navigate(7)
    } else navigate(5)
  }

  async function recordReview() {
    if (!online || !attempt || !reviewCheck || busy.current) return
    busy.current = true
    try {
      setStatus('Recording review…')
      const next = await request<Receipt>('/api/mission', { action: 'review', attemptId: attempt.id, confirmed: true, code: trainerCode })
      updateEvidence((value) => value.intents[attempt.id]?.state !== 'send' ? value : ({
        ...value, intents: { ...value.intents, [attempt.id]: { attemptId: attempt.id, state: 'send', synced: true, receipt: next } },
      }))
      setTrainerCode('')
      setStatus('Review recorded on the server.')
    } catch (problem) { setStatus(problem instanceof Error ? problem.message : 'Review unavailable.') }
    finally { busy.current = false }
  }

  async function removeSource() {
    if (trace?.attachment) await deleteBlob(trace.attachment.id)
    if (draft.media && draft.media.id !== trace?.attachment?.id) await deleteBlob(draft.media.id)
    const related = Object.values(evidence.attempts).filter((entry) => entry.source === trace?.experienceId)
    for (const entry of related) if (entry.explanation) await deleteBlob(entry.explanation.id)
    updateEvidence((value) => {
      const { attempts, intents } = structuredClone(value)
      for (const entry of related) {
        delete attempts[entry.id]
        if (intents[entry.id]) intents[entry.id] = { attemptId: entry.id, state: 'withdrawn', synced: false }
      }
      return { latest: attempts[value.latest] ? value.latest : '', attempts, intents }
    })
    setTrace(null)
    setDraft({ text: '', demo: false, permissions: PERMISSIONS })
    setSteps([])
    setReason('')
    setHistory(history.filter((entry) => entry.experienceId !== trace?.experienceId))
    setContributions(contributions.filter((item) => item.source !== trace?.experienceId))
    setSharing('')
    setMiss(null)
    navigate(0)
    setStatus('Source and its drafts removed from this device.')
  }

  const isCurrent = !!current && trace?.reviewStatus !== 'withdrawn'
  const canSee = (step: number) => step === 0 || (step <= 2 && !!trace) || (step <= 8 && isCurrent && (step !== 7 || attempt?.source === current?.experienceId))
  const evidenceView = learner && routeParam('view') === 'evidence' && !!attempt
  const active = evidenceView ? 7 : canSee(stage) ? stage : learner ? 4 : 0
  const progress = twin.mastery.inventory_reconciliation?.n ?? 0
  function startChallenge() { setSeed(emptySeed()); navigate(6) }
  let body: ReactNode
  switch (active) {
    case 1:
      body = trace && <div className="mission-stage">
        <h2>Problem and uncertainties</h2>
        <p>{trace.problemDescription}</p>
        <p className="fine">{trace.attachment ? 'Private file retained on this device. Verify its contents yourself.'
          : trace.sourceMedia === 'synthetic' ? `Cached extraction from ${DEMO_PROPOSAL.model}, using the synthetic source video. Confirm the readings below.`
          : 'Parsed locally from the written labels. Confirm each reading.'}</p>
        {!trace.facts && <p className="hint">Add or correct the four labelled counts to proceed with a numerical worksheet.</p>}
        <form className="mission-fields" onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const fields = Object.fromEntries(['opening','received','sold','counted'].map((key) => [key, Number(data.get(key))])) as Stock
          if (!(Object.values(fields).every((item) => Number.isSafeInteger(item) && item >= 0 && item <= 99999) && fields.sold <= fields.opening + fields.received)) {
            setError('Check the counts. Sales cannot exceed stock available.'); return
          }
          if (trace.sourceMedia === 'synthetic' && JSON.stringify(fields) !== JSON.stringify(DEMO.facts)) {
            setError('The synthetic recording has fixed counts. Use a private text problem to test different counts.'); return
          }
          setTrace({ ...trace, facts: fields })
          navigate(2)
        }}>
          <div className="mission-fact-fields">{(['opening','received','sold','counted'] as const).map((key) => <label key={key} className="field-label">{key}
            <input name={key} type="number" inputMode="numeric" min={0} max={99999} required defaultValue={trace.facts?.[key]} /></label>)}</div>
          <p>The worksheet can show a difference. Its cause needs independent evidence.</p>
          <p className="fine">Skills: stock reconciliation, reading a table and checking a spreadsheet formula.</p>
          <button className="btn big">Confirm facts and review the source</button>
        </form>
      </div>
      break
    case 2:
      body = trace && <div className="mission-stage">
        <SourcePlayer key={trace.experienceId} trace={trace} media={trace.attachment} cue={cue} />
        <div className="mission-status">
          <StatusPill kind="warn">{trace.sourceMedia === 'synthetic' ? 'Synthetic review exercise' : 'Private source'}</StatusPill>
          {current && <span className="fine">Published on this device v{current.version}</span>}
        </div>
        {trace.sourceMedia === 'synthetic' && <p>The editable rehearsal draft contains one planted error. Compare it with the recording and the cached model observations.</p>}
        <ol className="mission-timeline">{steps.map((step, index) => {
          const span = trace.actions.find((item) => item.id === step.span)
          return <li key={step.id}>
            <div className="mission-trace-title">
              <button className="btn ghost" onClick={() => setCue({ at: span?.at ?? 0 })}>{trace.sourceMedia === 'synthetic' ? timecode(span?.at ?? 0) : 'Text span'}</button>
              <h2>{span?.action}</h2>
            </div>
            <p>{span?.seen}</p>
            {span?.speech && <p className="fine">Narration: {span.speech}</p>}
            {trace.sourceMedia === 'synthetic' && index < DEMO_PROPOSAL.actions.length && <p className="fine">Model observation · {DEMO_PROPOSAL.actions[index].observation}</p>}
            <div className="mission-edit">
              <label className="field-label">Instruction {index + 1}<textarea rows={2} maxLength={440} value={step.instruction}
                aria-label={`Instruction ${index + 1}`}
                spellCheck={false} autoCorrect="off"
                onChange={(event) => editStep(step.id, { instruction: event.target.value, status: 'proposed' })} /></label>
              <label className="field-label">Review step {index + 1}<select value={step.status} onChange={(event) => editStep(step.id, { status: event.target.value as Step['status'] })}>
                <option value="proposed">Needs review</option><option value="checked">Checked</option><option value="uncertain">Uncertain</option>
                <option value="unsafe">Unsafe</option><option value="rejected">Rejected</option>
              </select></label>
            </div>
          </li>
        })}</ol>
        <Jump secondary onClick={() => setSteps([...steps, { id: crypto.randomUUID(), span: trace.actions.at(-1)!.id, instruction: '', status: 'proposed' }])}>Add a cited step</Jump>
        <section className="mission-citation">
          <h2>Ask the contributor</h2>
          <p>{DEMO.followup.question}</p>
          <label className="field-label">Contributor explanation<textarea aria-label="Contributor explanation" rows={3} maxLength={480} spellCheck={false} autoCorrect="off" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          {trace.sourceMedia === 'synthetic' && <Jump secondary onClick={() => setReason(DEMO.followup.answer)}>Use the scripted contributor answer</Jump>}
        </section>
        {permissionLabel(trace.permissions.derivatives, (derivatives) => setTrace({ ...trace, permissions: { ...trace.permissions, derivatives } }),
          'Allow educational derivatives on this device')}
        <Jump onClick={publish}>Approve the demo playbook</Jump>
      </div>
      break
    case 3:
      body = current && trace && <div className="mission-stage">
        <div className="mission-status"><StatusPill kind="ok">Demo reviewed</StatusPill><b>Version {current.version}</b></div>
        <p>Source {current.experienceId} · {current.source}</p>
        <ol className="mission-playbook">{current.steps.map((step) => <li key={step.id}>
          <span className="mission-time">{trace.sourceMedia === 'synthetic' ? timecode(trace.actions.find((span) => span.id === step.span)!.at) : 'Text'}</span>
          <b>{step.instruction}</b>
        </li>)}</ol>
        {current.contributorReason && <p className="mission-citation"><b>Contributor reasoning</b><br />{current.contributorReason}</p>}
        <p>Common mistake: reversing counted and expected stock reverses the sign of the variance.</p>
        <p className="fine">Source revisions saved: {history.filter((entry) => entry.experienceId === current.experienceId).length}. Each approval retains its own steps.</p>
        <Jump onClick={() => navigate(4)}>Learn from this playbook</Jump>
      </div>
      break
    case 4:
      body = current && trace && <div className="mission-stage">
        <p>{learner ? 'Use one row to work out how much stock should be left. Compare that result with the physical count.' : progress ? `Inventory practice attempts saved: ${progress}.` : 'Recommended starting point: read the same item row, then compare expected and counted stock.'}</p>
        <details><summary>Prerequisite skills</summary><p>{inventoryPrerequisites.map((key) => GRAPH.nodes[key]?.label).filter(Boolean).join(' · ')}</p></details>
        <Lesson key={`${current.experienceId}:${current.version}`} playbook={current} trace={trace} onTry={(stock, expected, variance) => assess(stock,expected,variance,false)} />
        {learner
          ? <Jump onClick={startChallenge}>Try the work sample</Jump>
          : <Jump secondary onClick={() => navigate(5)}>Open the inventory revision</Jump>}
      </div>
      break
    case 5:
      body = current && <InventoryReel playbook={current} mistake={miss} onNext={startChallenge} />
      break
    case 6:
      body = seed ? <div className="mission-stage">
        <p>Reconcile a new item. Report expected closing stock and the signed difference. A calculator or any valid method is allowed.</p>
        <Facts data={variant(seed)} /><Inputs onSubmit={(expected, variance) => assess(variant(seed),expected,variance,true)} caption="Submit the unseen worksheet" />
      </div> : <Jump onClick={startChallenge}>Generate an unseen worksheet</Jump>
      break
    case 7: {
      const result = attempt && gradeInventory(variant(attempt.seed), attempt.expected, attempt.variance)
      const sent = intent?.attemptId === attemptId && intent?.state === 'send'
      const withdrawn = intent?.attemptId === attemptId && intent?.state === 'withdrawn'
      body = attempt && result && <div className="mission-stage">
        <div className="mission-status"><StatusPill kind={result.correct ? 'ok' : 'warn'}>{result.correct ? 'Both checks correct' : 'Worksheet needs practice'}</StatusPill>
          <StatusPill kind="neutral">{receipt ? receipt.decision === 'reviewed' ? 'Reviewed' : 'Needs revision' : sent ? 'Review pending' : 'Private worksheet'}</StatusPill>
        </div>
        <dl className="mission-rubric">
          <div><dt>Expected closing stock</dt><dd>{attempt.expected} submitted · {result.key.expected} correct</dd></div>
          <div><dt>Signed difference</dt><dd>{attempt.variance} submitted · {result.key.variance} correct</dd></div>
          <div><dt>Source provenance</dt><dd>{attempt.source} · Playbook v{attempt.version} · worksheet {attempt.id.slice(0, 8)}</dd></div>
          <div><dt>Method and identity</dt><dd>Method and identity unverified</dd></div>
          {receipt && <div><dt>Review receipt</dt><dd>{receipt.demo ? 'Demo trainer' : 'Trainer'} · Evidence {receipt.evidenceId.slice(0, 12)}</dd></div>}
        </dl>
        {result.misconception && <p className="hint">{result.misconception === 'reversed-variance' ? 'Subtract expected stock from counted stock.' : 'Sales reduce stock.'}</p>}
        <label className="field-label">Attach an explanation you have permission to keep (private, optional)
          <input type="file" accept="audio/*,video/*" onChange={(event) => void attach(event.target.files?.[0], 'explanation')} />
        </label>
        <RecordExplanation onFile={(file) => void attach(file, 'explanation')} onError={setError} />
        {attempt.explanation && <p className="fine">Explanation saved privately · {Math.ceil(attempt.explanation.size / 1024)} KB</p>}
        {!sent && !withdrawn && <Jump onClick={() => setIntent({ attemptId: attempt.id, state: 'send', synced: false })}>Send worksheet values for trainer review</Jump>}
        {sent && !intent?.synced && <><p className="hint" role="status">Worksheet saved on this device. It will sync when the review service is reachable.</p>
          {online && <Jump secondary onClick={() => setSyncRetry(syncRetry + 1)}>Retry review sync</Jump>}</>}
        {sent && intent?.synced && !receipt && online && <section className="mission-citation">
          <h2>Trainer demonstration</h2>
          {permissionLabel(reviewCheck, setReviewCheck, 'I checked the two rubric values and source version')}
          <label className="field-label">Trainer code, if the server requires one<input type="password" className="text-input" value={trainerCode} onChange={(event) => setTrainerCode(event.target.value)} /></label>
          <button className="btn big" disabled={!reviewCheck} onClick={() => void recordReview()}>Record trainer review</button>
        </section>}
        {receipt?.decision === 'reviewed' && permissionLabel(sharing === attempt.id, (allowed) => setSharing(allowed ? attempt.id : ''),
          'Allow a same-device opportunity preview', 'Includes the skill and review status.')}
        {receipt?.decision === 'reviewed' && sharing === attempt.id && <section className="mission-citation">
          <h2>Demo opportunity preview</h2><p>Inventory reconciliation · Reviewed worksheet · Identity unverified</p>
          <p className="fine">Illustrative opportunity. No listing, pay or placement is represented.</p>
        </section>}
        {sent && <Jump secondary onClick={() => { setSharing(''); setIntent({ attemptId: attempt.id, state: 'withdrawn', synced: false }) }}>Withdraw review access</Jump>}
        {withdrawn && <p role="status">{intent?.synced ? 'Review access withdrawn.' : 'Review hidden here. Server withdrawal pending.'}</p>}
        {learner && <div className="row"><Jump secondary onClick={startChallenge}>Try another worksheet</Jump><a className="btn ghost" href="#/workspace">Back to my workspace</a></div>}
        <Jump secondary={learner} onClick={() => navigate(8)}>Contribute to the mission</Jump>
      </div>
      break
    }
    case 8:
      body = current && <div className="mission-stage">
        <p>Contributions stay in a moderated draft queue on this device. A new playbook version needs another review.</p>
        <form className="mission-fields" onSubmit={(event) => {
          event.preventDefault()
          if (!contribution.trim()) return
          setContributions([...contributions,{ id: crypto.randomUUID(), type, text: redact(contribution.trim()), source: current.experienceId, version: current.version, status:'pending',at:Date.now() }])
          setContribution('')
        }}>
          <label className="field-label">Contribution type<select value={type} onChange={(event) => setType(event.target.value as Contribution['type'])}>
            <option value="question">Ask a question</option><option value="correction">Suggest a correction</option><option value="example">Submit another example</option>
          </select></label>
          <label className="field-label">Your contribution<textarea rows={3} value={contribution} maxLength={650} required spellCheck={false} autoCorrect="off" onChange={(event) => setContribution(event.target.value)} /></label>
          <button className="btn big">Save for moderation</button>
        </form>
        <ul className="mission-contributions">{contributions.filter((item) => item.source === current.experienceId).map((item) => <li key={item.id}>
          <p>{item.text}</p><small>{item.type} · v{item.version} · {item.status === 'pending' ? 'Awaiting moderation' : 'Added to review draft'}</small>
          {item.type !== 'question' && item.status === 'pending' && <Jump secondary onClick={() => {
            setContributions(contributions.map((entry) => entry.id === item.id ? { ...entry, status: 'accepted-for-draft' } : entry))
            setSteps([...current.steps, { id: item.id, span: current.steps.at(-1)!.span, instruction: item.text, status: 'uncertain' }])
            navigate(2)
          }}>Send to review draft</Jump>}
        </li>)}</ul>
        <a className="btn ghost" download={`capable-${current.experienceId}-v${current.version}.json`}
          href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify({
            playbook: current, type: 'educational simulation', compensation: 'none', provenance: trace?.sourceOwner,
            transcript: trace?.actions.filter((span) => current.steps.some((step) => step.span === span.id)).map((span) => ({
              id: span.id, at: span.at, quote: redact(span.speech || span.seen),
            })), key: stockResult(current.facts), skills: inventoryPrerequisites,
          }, null, 2))}`}>Download reviewed text pack</a>
        <p className="fine">{cached === 'ready' ? 'This browser can reopen the mission offline.' : 'Offline browser access is preparing.'}</p>
      </div>
      break
    default:
      body = <div className="mission-start">
        <section className="mission-entry">
          <h2>Turn a stock discrepancy into a teaching mission.</h2>
          <p>Start with a synthetic shop case or write down a problem you have permission to use.</p>
          <Jump onClick={() => {
            if (draft.media) void deleteBlob(draft.media.id).catch(() => {})
            setDraft({ text: DEMO.sourceText, demo: true, permissions: { ...PERMISSIONS, capture: true } })
            setStatus('Synthetic case loaded.')
          }}>Load the stock-count demo</Jump>
          {mode !== 'offline' && <img className="mission-source-img" src={SOURCE.still} alt="Illustrative stock worksheet for SKU TIN-24" />}
        </section>
        <form className="mission-fields" autoComplete="off" translate="no" onSubmit={start}>
          <label className="field-label">Problem and available counts<textarea rows={4} required maxLength={1600} value={draft.text}
            spellCheck={false} autoCorrect="off"
            placeholder="Opening: 120. Received: 30. Sold: 18. Counted: 128."
            onChange={(event) => setDraft({ ...draft, text: redact(event.target.value), demo: false })} /></label>
          {permissionLabel(draft.permissions.capture, (capture) => setDraft({ ...draft, permissions: { ...draft.permissions, capture } }),
            'I have permission to keep this source on this device')}
          <label className="field-label">Private source attachment
            <input type="file" disabled={!draft.permissions.capture} accept="image/png,image/jpeg,image/webp,application/pdf,audio/*,video/*"
              onChange={(event) => void attach(event.target.files?.[0], 'source')} />
          </label>
          {draft.media && <div className="row"><p className="fine">Attachment saved · {Math.ceil(draft.media.size / 1024)} KB</p>
            <Jump secondary onClick={() => { void deleteBlob(draft.media!.id).then(() => setDraft({ ...draft, media: undefined })).catch(() => setError('Unable to remove attachment.')) }}>Remove attachment</Jump></div>}
          <button className="btn big">Extract worksheet facts</button>
        </form>
      </div>
  }
  return <Screen title={learner && active === 4 ? 'Learn to reconcile stock' : TITLES[active]} contentLang="en" className="journey mission-screen" careerFlow>
    {learner ? <nav className="career-learning-steps" aria-label="Work sample progress">
      {([[4, 'Learn'], [6, 'Work sample'], [7, 'Evidence']] as const).map(([step, label]) =>
        <button key={step} className="btn ghost" type="button"
          aria-current={(active === 5 ? 4 : active === 8 ? 7 : active) === step ? 'step' : undefined}
          disabled={step === 7 && !attempt} onClick={() => step === 6 && !seed ? startChallenge() : navigate(step)}>{label}</button>)}
    </nav> : <div ref={heading} className="mission-rail" aria-label="Mission workflow">
      <span>CAPABLE X</span><span aria-current="step">Step {active + 1} of {TITLES.length}</span>
    </div>}
    {body}
    {error && <p className="err" role="alert">{error}</p>}
    {status && <p role="status" className="fine">{status}</p>}
    {!learner && active > 0 && <div className="row mission-nav">
      <Jump secondary onClick={() => navigate(active - 1)}>Previous stage</Jump>
      {isCurrent && active !== 3 && <Jump secondary onClick={() => navigate(3)}>Open current playbook</Jump>}
      {trace && <details><summary>Manage this source</summary>
        <p className="fine">Deletion removes this source and its derivatives from this device.</p>
        <button className="btn ghost danger" onClick={() => void removeSource().catch(() => setError('Deletion could not finish. Try again.'))}>Delete source and withdraw access</button>
      </details>}
    </div>}
  </Screen>
}
