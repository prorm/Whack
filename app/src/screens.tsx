import { useEffect, useState } from 'react'
import { LangToggle, Screen, StatusPill, useDelivery } from './Chrome'
import {
  CHECK_OPTIONS, DEMO_REVIEWER, STOCK, WORK_ORDER, currentAttempt, currentEvidence, currentReview,
  hasReviewedSkill, matchListings, reviewStatus, simStatus, type CheckId, type Checklist, type Evidence,
} from './domain'
import { tr, type Key } from './i18n'
import { getBlob, putBlob } from './mediaDb'
import { go } from './router'
import { request } from './learn/sync'
import { useStore } from './store'

const MAX_VIDEO = 60 * 1024 * 1024

// =============================================================== work order (unseen)
export function WorkOrder() {
  const { state, ensureOrder, submitAttempt } = useStore()
  const lang = state.lang
  const [sku, setSku] = useState<string | null>(null)
  const [checks, setChecks] = useState<CheckId[]>([])
  const [passedId, setPassedId] = useState<string | null>(null)
  useEffect(() => { ensureOrder() }, [ensureOrder])
  const order = state.pendingOrder ?? []
  const T = WORK_ORDER.target

  if (passedId) {
    return (
      <Screen title={tr(lang, 'simPassed')}>
        <div className="panel ok" role="status">
          <StatusPill kind="ok">✓ {tr(lang, 'simPassed')}</StatusPill>
          <p>{tr(lang, 'simPassedBody')}</p>
        </div>
        <button className="btn big" onClick={() => go('evidence')}>{tr(lang, 'addEvidence')} →</button>
      </Screen>
    )
  }

  const toggle = (c: CheckId) => setChecks((xs) => (xs.includes(c) ? xs.filter((x) => x !== c) : [...xs, c]))
  const ready = !!sku && checks.length > 0
  const submit = () => {
    if (!sku) return
    const a = submitAttempt(sku, checks, order)
    if (a.result.passed) setPassedId(a.id)
    else go('practice')
  }

  return (
    <Screen title={tr(lang, 'woTitle')} kicker={<p className="kicker">{WORK_ORDER.code} · DEMO</p>}>
      <section className="panel">
        <p>{tr(lang, 'woJob')}</p>
        <h2 className="spec-h">{tr(lang, 'woSpec')}</h2>
        <div className="spec">
          <div><span>ID</span><b>{T.id} mm</b></div>
          <div><span>OD</span><b>{T.od} mm</b></div>
          <div><span>{tr(lang, 'dim_t')}</span><b>{T.t} mm</b></div>
        </div>
      </section>

      <fieldset className="block">
        <legend>{tr(lang, 'woStep1')}</legend>
        <div className="parts">
          {order.map((s, i) => {
            const item = STOCK.find((x) => x.sku === s)!
            return (
              <label key={s} className={`part ${sku === s ? 'sel' : ''}`}>
                <input type="radio" name="part" value={s} checked={sku === s} onChange={() => setSku(s)} />
                <span className="part-name">{tr(lang, 'woPart')} {String.fromCharCode(65 + i)}</span>
                <span className="part-dims">ID {item.dims.id} · OD {item.dims.od} · {tr(lang, 'dim_t')} {item.dims.t} <small>mm</small></span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="block">
        <legend>{tr(lang, 'woStep2')}</legend>
        <div className="checks">
          {CHECK_OPTIONS.map((c) => (
            <label key={c} className={`check ${checks.includes(c) ? 'sel' : ''}`}>
              <input type="checkbox" checked={checks.includes(c)} onChange={() => toggle(c)} />
              <span>{tr(lang, `chk_${c}` as Key)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {!ready && <p className="hint">{tr(lang, 'woNeedAll')}</p>}
      <button className="btn big" disabled={!ready} onClick={submit}>{tr(lang, 'woSubmit')}</button>
    </Screen>
  )
}

// =============================================================== practice (after a wrong answer)
export function Practice() {
  const { state } = useStore()
  const lang = state.lang
  const a = currentAttempt(state)
  if (!a || a.result.passed) {
    return <Screen title={tr(lang, 'practiceTitle')}><button className="btn" onClick={() => go('work-order')}>{tr(lang, 'pr_retry')}</button></Screen>
  }
  const r = a.result
  const item = STOCK.find((s) => s.sku === a.selectedSku)
  const dimName = { id: tr(lang, 'dim_id'), od: tr(lang, 'dim_od'), t: tr(lang, 'dim_t') }
  return (
    <Screen title={tr(lang, 'practiceTitle')}>
      <div className="panel bad" role="status">
        <StatusPill kind="bad">{tr(lang, 'st_failed')}</StatusPill>
        <p><b>{tr(lang, 'practiceNoProof')}</b></p>
      </div>
      <ul className="feedback">
        {item && (r.partCorrect
          ? <li className="good">{tr(lang, 'pr_partOk')}</li>
          : <li>{tr(lang, 'pr_part', { dims: r.mismatched.map((m) => `${dimName[m]} ${m === 't' ? item.dims.t : item.dims[m]} ≠ ${m === 't' ? WORK_ORDER.target.t : WORK_ORDER.target[m]} mm`).join(', ') })}</li>)}
        {r.missingChecks.length > 0 && <li>{tr(lang, 'pr_missing', { list: r.missingChecks.map((c) => tr(lang, `chk_${c}` as Key)).join(', ') })}</li>}
        {r.extraChecks.length > 0 && <li>{tr(lang, 'pr_extra', { list: r.extraChecks.map((c) => tr(lang, `chk_${c}` as Key)).join(', ') })}</li>}
        <li className="rule">{tr(lang, 'pr_rule')}</li>
      </ul>
      <div className="stack">
        <button className="btn big" onClick={() => go('work-order')}>{tr(lang, 'pr_retry')}</button>
        <button className="btn ghost" onClick={() => go('feed')}>{tr(lang, 'pr_rewatch')}</button>
      </div>
    </Screen>
  )
}

// =============================================================== evidence
export function EvidencePlayer({ ev }: { ev: Evidence }) {
  const [url, setUrl] = useState<string | null>(ev.kind === 'fixture' ? '/fixtures/sample-evidence.mp4' : null)
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    if (ev.kind !== 'video' || !ev.mediaKey) return
    let u: string | null = null
    getBlob(ev.mediaKey).then((b) => {
      if (!b) { setMissing(true); return }
      u = URL.createObjectURL(b)
      setUrl(u)
    }).catch(() => setMissing(true))
    return () => { if (u) URL.revokeObjectURL(u) }
  }, [ev])
  return (
    <figure className="evidence">
      {ev.kind === 'fixture' && <p className="demo-badge">DEMO FIXTURE · sample evidence, not learner work</p>}
      {missing ? <p className="hint">Video not found on this device.</p>
        : url && <video src={url} controls playsInline preload="metadata" onError={() => setMissing(true)} />}
      <figcaption>{ev.kind === 'fixture' ? 'sample-evidence.mp4 (fixture)' : `${ev.fileName} · ${(ev.sizeBytes ?? 0) < 1e6 ? `${Math.max(1, Math.round((ev.sizeBytes ?? 0) / 1024))} KB` : `${((ev.sizeBytes ?? 0) / 1e6).toFixed(1)} MB`}`} · {ev.id}</figcaption>
    </figure>
  )
}

export function EvidenceScreen() {
  const { state, attachEvidence } = useStore()
  const lang = state.lang
  const ev = currentEvidence(state)
  const [err, setErr] = useState('')
  const [replacing, setReplacing] = useState(false)
  if (simStatus(state) !== 'passed') {
    return (
      <Screen title={tr(lang, 'evTitle')}>
        <p className="panel">{tr(lang, 'evNeedsPass')}</p>
        <button className="btn big" onClick={() => go('work-order')}>{tr(lang, 'openWorkOrder')}</button>
      </Screen>
    )
  }
  const onFile = async (f: File | undefined) => {
    setErr('')
    if (!f) return
    if (f.size > MAX_VIDEO) { setErr(tr(lang, 'evTooBig')); return }
    const key = `vid-${Date.now()}`
    await putBlob(key, f)
    attachEvidence({ kind: 'video', mediaKey: key, fileName: f.name, sizeBytes: f.size })
    setReplacing(false)
  }
  const picker = (
    <div className="stack">
      <p>{tr(lang, 'evBody')}</p>
      <label className="btn big file">
        {tr(lang, 'evPick')}
        <input type="file" accept="video/*" capture="environment" onChange={(e) => void onFile(e.target.files?.[0])} />
      </label>
      <button className="btn ghost demo" onClick={() => { attachEvidence({ kind: 'fixture' }); setReplacing(false) }}>{tr(lang, 'evFixture')}</button>
      <p className="fine">{tr(lang, 'evFixtureNote')}</p>
      {err && <p className="err" role="alert">{err}</p>}
    </div>
  )
  return (
    <Screen title={tr(lang, 'evTitle')}>
      <div className="statusrow">
        <StatusPill kind="ok">✓ {tr(lang, 'st_passed')}</StatusPill>
        <ReviewPill />
      </div>
      {ev && !replacing ? (
        <>
          <EvidencePlayer ev={ev} />
          <p className="panel" role="status">{tr(lang, 'evAttached')}</p>
          <div className="stack">
            <button className="btn big" onClick={() => go('passport')}>{tr(lang, 'viewPassport')}</button>
            <button className="btn ghost trainer-link" onClick={() => go('trainer')}>{tr(lang, 'openTrainer')}</button>
            <button className="btn ghost" onClick={() => setReplacing(true)}>{tr(lang, 'evReplace')}</button>
            <p className="fine">{tr(lang, 'evReplaceNote')}</p>
          </div>
        </>
      ) : picker}
    </Screen>
  )
}

function ReviewPill() {
  const { state } = useStore()
  const rs = reviewStatus(state)
  const kind = rs === 'approved' ? 'ok' : rs === 'needs_another_attempt' ? 'bad' : rs === 'awaiting_review' ? 'warn' : 'neutral'
  return <StatusPill kind={kind}>{tr(state.lang, `st_${rs}` as Key)}</StatusPill>
}

// =============================================================== trainer demo view
const REASONS = [
  'Thickness was not measured on camera',
  'Inner diameter measurement not visible',
  'Outer diameter measurement not visible',
  'Selected part does not match the work order',
  'Video too short or unclear',
]

export function Trainer() {
  const { state, addReview } = useStore()
  const { online } = useDelivery()
  const a = currentAttempt(state)
  const ev = currentEvidence(state)
  const review = currentReview(state)
  const [cl, setCl] = useState<Checklist>({ id: false, od: false, thickness: false, part: false })
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { setCl({ id: false, od: false, thickness: false, part: false }); setReason(''); setNote(''); setErr('') }, [ev?.id])

  const kicker = (
    <div className="demo-banner" role="note">
      TRAINER DEMO VIEW · demo reviewer “{DEMO_REVIEWER}” · same device, nothing is sent
    </div>
  )
  if (!a || !ev || simStatus(state) !== 'passed') {
    return <Screen tone="trainer" title="Practical review" kicker={kicker}><p className="panel">Nothing to review: the learner has no evidence attached to a passed attempt.</p></Screen>
  }
  const item = STOCK.find((s) => s.sku === a.selectedSku)!
  const all = cl.id && cl.od && cl.thickness && cl.part
  const T = WORK_ORDER.target
  const approve = async () => {
    if (!all) { setErr('Tick all four checklist items to approve.'); return }
    if (!online || busy) return
    setBusy(true)
    setErr('')
    try {
      await request('/api/review-config', {})
      addReview({ attemptId: a.id, evidenceId: ev.id, reviewer: DEMO_REVIEWER, decision: 'approved', checklist: cl })
    } catch { setErr('The review service is unavailable. Evidence is saved for later review.') }
    finally { setBusy(false) }
  }
  const reject = () => {
    const why = [reason, note.trim()].filter(Boolean).join(': ')
    if (!why) { setErr('Give a reason for “Needs another attempt”.'); return }
    addReview({ attemptId: a.id, evidenceId: ev.id, reviewer: DEMO_REVIEWER, decision: 'needs_another_attempt', reason: why, checklist: cl })
  }
  const item_ = (k: keyof Checklist, label: string) => (
    <label className={`check ${cl[k] ? 'sel' : ''}`}>
      <input type="checkbox" checked={cl[k]} onChange={() => setCl({ ...cl, [k]: !cl[k] })} /> <span>{label}</span>
    </label>
  )
  return (
    <Screen tone="trainer" title="Practical review" kicker={kicker}>
      <section className="panel">
        <h2>Work order {WORK_ORDER.code}</h2>
        <p>Required: ID {T.id} mm · OD {T.od} mm · thickness {T.t} mm</p>
        <p>Learner selected: ID {item.dims.id} · OD {item.dims.od} · thickness {item.dims.t} mm ({item.sku})</p>
        <p className="mono">attempt {a.id} · simulation: passed</p>
      </section>
      <EvidencePlayer ev={ev} />
      {review ? (
        <div className={`panel ${review.decision === 'approved' ? 'ok' : 'bad'}`} role="status">
          <b>{review.decision === 'approved' ? 'Approved' : 'Needs another attempt'}</b>
          {review.reason && <p>Reason: {review.reason}</p>}
          <p className="mono">bound to attempt {review.attemptId} + evidence {review.evidenceId}</p>
          <p className="fine">A new attempt or replaced evidence will need a fresh review.</p>
        </div>
      ) : (
        <>
          <fieldset className="block">
            <legend>Checklist: what the video shows</legend>
            <div className="checks one">
              {item_('id', 'Measured inner diameter (ID)')}
              {item_('od', 'Measured outer diameter (OD)')}
              {item_('thickness', 'Measured thickness')}
              {item_('part', 'Selected and fitted the matching part')}
            </div>
          </fieldset>
          <button className="btn big" onClick={() => void approve()} disabled={!online || !all || busy}>Approve demo evidence</button>
          {!online && <p className="hint" role="status">Evidence saved. Reconnect to record a demo approval.</p>}
          <fieldset className="block">
            <legend>Or: needs another attempt</legend>
            <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason">
              <option value="">Choose a reason…</option>
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            <textarea aria-label="Note to learner" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional if a reason is chosen" rows={2} />
            <button className="btn ghost danger" onClick={reject}>Needs another attempt</button>
          </fieldset>
          {err && <p className="err" role="alert">{err}</p>}
        </>
      )}
      <button className="btn ghost" onClick={() => go('passport')}>Back to learner passport</button>
    </Screen>
  )
}

// =============================================================== passport
export function Passport() {
  const { state, setConsent, resetDemo } = useStore()
  const lang = state.lang
  const a = currentAttempt(state)
  const ev = currentEvidence(state)
  const r = currentReview(state)
  const sim = simStatus(state)
  const verified = hasReviewedSkill(state)
  const yes = (b: boolean) => (b ? '✓' : '✗')
  return (
    <Screen title={tr(lang, 'ppTitle')}>
      <section className={`passport ${verified ? 'verified' : ''}`}>
        <p className="pp-badge">{verified ? `✓ ${tr(lang, 'ppVerified')}` : tr(lang, 'ppNotYet')}</p>
        <dl>
          <div><dt>{tr(lang, 'ppSkill')}</dt><dd>{tr(lang, 'ppSkillName')}</dd></div>
          <div><dt>{tr(lang, 'ppSim')}</dt><dd><StatusPill kind={sim === 'passed' ? 'ok' : sim === 'failed' ? 'bad' : 'neutral'}>{tr(lang, `st_${sim}` as Key)}</StatusPill></dd></div>
          <div><dt>{tr(lang, 'ppReview')}</dt><dd><ReviewPill /></dd></div>
          <div><dt>{tr(lang, 'ppArtifact')}</dt><dd>{a ? `${WORK_ORDER.code} · ${a.id}` : '—'}{ev ? ` · ${ev.kind === 'fixture' ? 'DEMO FIXTURE evidence' : ev.fileName}` : ''}</dd></div>
          <div><dt>{tr(lang, 'ppChecklist')}</dt><dd>{r ? `ID ${yes(r.checklist.id)} · OD ${yes(r.checklist.od)} · ${tr(lang, 'dim_t')} ${yes(r.checklist.thickness)} · ${tr(lang, 'woPart')} ${yes(r.checklist.part)}` : '—'}</dd></div>
          <div><dt>{tr(lang, 'ppReviewer')}</dt><dd>{r ? <>{r.reviewer} <span className="demo-badge inline">DEMO</span></> : '—'}</dd></div>
          {r?.reason && <div><dt>{tr(lang, 'ppReason')}</dt><dd>{r.reason}</dd></div>}
        </dl>
      </section>
      {ev && <EvidencePlayer ev={ev} />}
      <label className="consent">
        <input type="checkbox" checked={state.consentShowEvidence} onChange={(e) => setConsent(e.target.checked)} />
        <span>{tr(lang, 'ppConsent')}<small>{tr(lang, 'ppConsentNote')}</small></span>
      </label>
      <div className="stack">
        {sim === 'passed' && !ev && <button className="btn big" onClick={() => go('evidence')}>{tr(lang, 'addEvidence')}</button>}
        {sim === 'passed' && ev && !r && <button className="btn ghost trainer-link" onClick={() => go('trainer')}>{tr(lang, 'openTrainer')}</button>}
        {(sim !== 'passed' || r?.decision === 'needs_another_attempt') && <button className="btn big" onClick={() => go('work-order')}>{tr(lang, 'ppRetry')}</button>}
        {r?.decision === 'needs_another_attempt' && <button className="btn ghost" onClick={() => go('evidence')}>{tr(lang, 'evReplace')}</button>}
        <button className="btn ghost" onClick={() => go('contractor')}>{tr(lang, 'openContractor')}</button>
        <button className="btn ghost danger" onClick={() => void resetDemo().then(() => go('feed'))}>{tr(lang, 'reset')}</button>
      </div>
    </Screen>
  )
}

// =============================================================== contractor preview (same device)
export function Contractor() {
  const { state, requestInterview } = useStore()
  const ev = currentEvidence(state)
  const verified = hasReviewedSkill(state)
  const results = matchListings(state)
  return (
    <Screen tone="contractor" title="Contractor preview" kicker={
      <div className="demo-banner" role="note">SAME-DEVICE PREVIEW · what a contractor would see · no messages are sent, nothing leaves this phone</div>}>
      <div className="row end"><LangToggle /></div>
      <section className="panel">
        <h2>Learner proof (demo learner)</h2>
        <p>Washer matching: ID, OD and thickness: <b>{verified ? 'trainer-reviewed ✓' : 'not reviewed'}</b></p>
        <p className="fine">Simulation: {simStatus(state)} · Review: {reviewStatus(state).replace(/_/g, ' ')}</p>
        {ev && (state.consentShowEvidence
          ? <EvidencePlayer ev={ev} />
          : <p className="hint">Evidence video hidden: the learner has not opted in.</p>)}
      </section>
      {results.map(({ listing: l, eligible, reason }) => {
        const requested = state.interviewRequests[l.id]
        return (
          <article key={l.id} className={`listing ${eligible ? 'match' : 'nomatch'}`}>
            <p className="demo-badge">DEMO LISTING</p>
            <h2>{l.contractor}</h2>
            <p>{l.locality} · {l.pay} · {l.shift}</p>
            <p>Requires: {l.requiredSkill.en}</p>
            <p className={`reason ${eligible ? 'ok' : 'bad'}`}><b>{eligible ? 'Match' : 'No match'}</b>: {reason.replace(/^(Match|Not a match|Not eligible yet): /, '')}</p>
            {requested && eligible ? (
              <p className="panel ok" role="status"><b>Interview requested</b> · Demo request saved.</p>
            ) : (
              <button className="btn" disabled={!eligible} onClick={() => requestInterview(l.id)}>
                {eligible ? 'Request interview (simulated)' : 'Not eligible to request'}
              </button>
            )}
            {requested && !eligible && <p className="hint">An earlier demo request is on hold: the proof is no longer current.</p>}
          </article>
        )
      })}
    </Screen>
  )
}
