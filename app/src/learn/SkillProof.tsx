import { useEffect, useState, type FormEvent } from 'react'
import { Screen, StatusPill, useDelivery } from '../Chrome'
import { grade, payoutTask, type PayoutTask } from '../engine/proof.ts'
import { go } from '../router'
import { useJournal, saveSubmission, type ReviewReceipt, type Submission } from './journal'
import { SyncNotice } from './Journey'
import { request, saveReceipt, useSync } from './sync'
import { useTwin } from './twinStore'
import { useStored } from './useStored'

function newSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0] || 1
}
type PayoutDraft = { seed: number; cells: Record<string, string> }
function usePayoutDraft() { return useStored<PayoutDraft | null>('payout-draft', null) }
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
const explain: Record<string, string> = {
  ambiguous: 'Use one exact amount.',
  'misconception:sheet_percent_no_divide': 'Divide the percentage portion by 100.',
  missed_per_order_bonus: 'Include the bonus for each completed order.',
}

function Worksheet({ task, values, onChange }: {
  task: PayoutTask; values: Record<string, string>; onChange?: (cell: string, value: string) => void
}) {
  const field = (cell: string, label: string) => onChange
    ? <label className="field-label sheet-field">{label}
      <input className="text-input" inputMode="decimal" maxLength={48} required value={values[cell] ?? ''}
        onChange={(event) => onChange(cell, event.target.value)} />
    </label>
    : <div className="sheet-field"><span>{label}</span><b>{values[cell]}</b></div>

  return <div className="payout-worksheet">
    {task.rows.map((rider, i) => <div className="payout-row" key={rider.rider}>
      <div><b>{rider.rider}</b><small>{money.format(rider.orderValue)} · {rider.orders} orders</small></div>
      {field(task.cells[i], `Payout for ${rider.rider}`)}
    </div>)}
    <div className="payout-row payout-total"><b>All three riders</b>{field('D5', 'Total payout')}</div>
  </div>
}

function GradeFeedback({ submission }: { submission: Submission }) {
  const { task, key } = payoutTask(submission.seed)
  const report = grade(task, key, submission.cells)
  const correct = Object.values(report.perCell).filter((cell) => cell.ok).length
  return <section className="feedback-panel" aria-label="Assessment feedback">
    <h2>{correct} of {task.cells.length} amounts correct</h2>
    <ul>
      {task.cells.map((cell, index) => {
        const result = report.perCell[cell]
        return <li key={cell}>
          <b>{index < task.rows.length ? task.rows[index].rider : 'Total'}</b>
          <span>{result.ok ? 'Correct' : `Expected ${money.format(result.expected)}. ${explain[result.note ?? ''] ?? ''}`}</span>
        </li>
      })}
    </ul>
  </section>
}

export function Challenge() {
  const { submissions, receipts } = useJournal()
  const current = submissions[0]
  const [draft, saveDraft] = usePayoutDraft()
  const [fresh] = useState(newSeed)
  const saved = current && !draft ? current : null
  const seed = saved?.seed ?? draft?.seed ?? fresh
  const cells = saved?.cells ?? draft?.cells ?? {}
  const { task, key } = payoutTask(seed)
  const { twin, add } = useTwin()
  const [error, setError] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (saved || task.cells.some((cell) => !cells[cell]?.trim())) return
    const at = Date.now()
    const submission = { id: crypto.randomUUID(), seed, cells, at }
    const previousKeys = submissions.map((s) => payoutTask(s.seed).key)
    try {
      saveSubmission(submission)
      saveDraft(null)
      add({ id: `transfer-${submission.id}`, type: 'answer', conceptId: 'commission_calc', itemId: task.variantId,
        answer: null, correct: grade(task, key, cells, previousKeys).status === 'correct', source: 'transfer', modality: 'worked_example' })
    } catch {
      setError('Device storage is unavailable. Leave this worksheet open while you free space and retry.')
    }
  }
  const report = saved && grade(task, key, saved.cells, submissions.slice(1).map((item) => payoutTask(item.seed).key))

  return <Screen title="Payout skill challenge" className="journey" contentLang="en" careerFlow>
    <p>A dispatch coordinator needs the exact payout for three riders. Work out each amount and the total.</p>
    <div className="payout-rate"><b>{task.ratePct}%</b> of order value <b>+ {money.format(task.perOrder)}</b> per order</div>
    <form className="stack" onSubmit={submit}>
      <Worksheet task={task} values={cells} onChange={saved ? undefined : (cell, value) => saveDraft({ seed, cells: { ...cells, [cell]: value } })} />
      {!saved && <button className="btn big">Submit worksheet</button>}
      {error && <p className="err" role="alert">{error}</p>}
    </form>
    {saved && <>
      <GradeFeedback submission={saved} />
      {report && report.flags.includes('suspected_copy') && <p className="hint">These amounts match a previous worksheet. Use the values for this attempt.</p>}
      <div className="path-actions">
        <button className="btn big" onClick={() => go(receipts[saved.id] ? 'skill-passport' : 'skill-review')}>
          {receipts[saved.id] ? 'Open Skill Passport' : 'Continue to trainer review'}
        </button>
        <button className="btn ghost" onClick={() => saveDraft({ seed: newSeed(), cells: {} })}>Try a new worksheet</button>
      </div>
    </>}
    {twin.recall.percent_basic && <p className="fine">You can revisit your percentage recall from My path.</p>}
    <SyncNotice />
  </Screen>
}

export function SkillReview() {
  const { submissions, receipts, ack } = useJournal()
  const [draft] = usePayoutDraft()
  const submission = draft ? undefined : submissions[0]
  const receipt = submission && receipts[submission.id]
  const { online } = useDelivery()
  const { sync } = useSync()
  const [demo, setDemo] = useState<boolean | null>(null)
  const [rows, setRows] = useState(false)
  const [total, setTotal] = useState(false)
  const [code, setCode] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!online || !submission || receipt) return
    let live = true
    void request<{ demo: boolean }>('/api/review-config', {}).then((config) => {
      if (live) setDemo(config.demo)
    }).catch(() => { if (live) setDemo(null) })
    return () => { live = false }
  }, [online, retry, submission, receipt])

  if (!submission) return <Screen title="Trainer review" className="journey" contentLang="en" careerFlow>
    <p>Submit a payout worksheet to request a review.</p>
    <button className="btn big" onClick={() => go('challenge')}>Open the skill challenge</button>
  </Screen>

  const { task, key } = payoutTask(submission.seed)
  const report = grade(task, key, submission.cells)
  async function review(decision: ReviewReceipt['decision']) {
    if (!submission || !online || busy) return
    setBusy(true)
    setError('')
    try {
      if (!await sync()) throw new Error('Sync is pending. Your worksheet is saved on this device.')
      const receipt = await request<ReviewReceipt>('/api/review', {
        submissionId: submission.id, decision, verifyRows: rows, verifyTotal: total, reason, trainerCode: code,
      })
      saveReceipt(receipt)
      go('skill-passport')
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'The review could not be saved. Try again.')
    } finally { setBusy(false) }
  }

  return <Screen title={demo ? 'Trainer review · Demo' : 'Trainer review'} className="journey" contentLang="en" careerFlow>
    <p>{demo ? 'Use the demo trainer controls to review this exact worksheet.' : 'A trainer checks the worksheet and records a decision.'}</p>
    <div className="statusrow">
      <StatusPill kind={report.status === 'correct' ? 'ok' : 'warn'}>{report.status === 'correct' ? 'Auto-check passed' : 'Auto-check needs attention'}</StatusPill>
      <StatusPill kind={receipt?.decision === 'approved' ? 'ok' : 'warn'}>{receipt ? 'Review recorded' : ack.has(submission.id) ? 'Review pending' : 'Worksheet sync pending'}</StatusPill>
    </div>
    <Worksheet task={task} values={submission.cells} />
    {receipt ? <button className="btn big" onClick={() => go('skill-passport')}>View Skill Passport</button>
      : !online ? <p className="hint">Review is pending. Reconnect to send the saved worksheet to the review server.</p>
      : demo === null ? <>
        <p className="hint">Review service unavailable. Your worksheet remains saved.</p>
        <button className="btn ghost" onClick={() => setRetry(retry + 1)}>Retry review service</button>
      </> : <div className="stack">
        {demo === false && <label className="field-label">Trainer code<input type="password" className="text-input" value={code} onChange={(e) => setCode(e.target.value)} /></label>}
        <label className="choice-row"><input type="checkbox" checked={rows} onChange={(e) => setRows(e.target.checked)} /> I checked all three rider payouts</label>
        <label className="choice-row"><input type="checkbox" checked={total} onChange={(e) => setTotal(e.target.checked)} /> I checked the total payout</label>
        <button className="btn big" disabled={!rows || !total || report.status !== 'correct' || busy} onClick={() => void review('approved')}>{demo ? 'Approve as demo trainer' : 'Approve this worksheet'}</button>
        <label className="field-label">Reason for another attempt<textarea rows={2} maxLength={240} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        <button className="btn ghost" disabled={!reason.trim() || busy} onClick={() => void review('needs_another_attempt')}>Request another attempt</button>
        {error && <p className="err" role="alert">{error}</p>}
      </div>}
    <SyncNotice />
  </Screen>
}

export function SkillPassport() {
  const { submissions, receipts } = useJournal()
  const [draft] = usePayoutDraft()
  const current = draft ? undefined : submissions[0]
  const receipt = current && receipts[current.id]
  const [consent, saveConsent] = useStored('payout-consent', '')
  const [preview, setPreview] = useState(false)
  const approved = receipt?.decision === 'approved'
  const shared = approved && consent === current?.id
  const status = !current ? 'Awaiting a worksheet' : !receipt ? 'Awaiting review' : approved ? receipt.demo ? 'Reviewed in demo' : 'Trainer reviewed' : 'Another attempt needed'

  return <Screen title="Skill Passport" className="journey" contentLang="en" careerFlow>
    <section className="passport-proof">
      <StatusPill kind={approved ? 'ok' : 'warn'}>{status}</StatusPill>
      <h2>Calculate rider payouts</h2>
      <dl>
        <div><dt>Practical evidence</dt><dd>{current ? 'Submitted payout worksheet' : 'No worksheet submitted'}</dd></div>
        <div><dt>Review</dt><dd>{receipt ? `${receipt.reviewer} · ${new Date(receipt.at).toLocaleDateString()}` : 'Pending'}</dd></div>
        <div><dt>Identity</dt><dd>Unverified</dd></div>
      </dl>
      {receipt?.reason && <p>{receipt.reason}</p>}
      {receipt?.demo && <p className="fine">Demo evidence for preview purposes. Employment credential unavailable.</p>}
    </section>
    {approved && <>
      <label className="choice-row consent-control">
        <input type="checkbox" checked={shared} onChange={(e) => { saveConsent(e.target.checked ? receipt.submissionId : ''); setPreview(false) }} />
        <span><b>Show this reviewed skill in the employer preview</b><small>The preview stays on this device. It includes the skill and review status.</small></span>
      </label>
      <button className="btn big" disabled={!shared} onClick={() => setPreview(!preview)} aria-expanded={preview}>{preview ? 'Close employer preview' : 'Open employer preview'}</button>
      {shared && preview && <section className="panel" aria-label="Employer preview">
        <h2>Employer preview</h2>
        <p>Calculate rider payouts · {status}</p>
        <p className="fine">Identity unverified</p>
      </section>}
    </>}
    {!approved && <button className="btn big" onClick={() => go(current && !receipt ? 'skill-review' : 'challenge')}>
      {current && !receipt ? 'Open trainer review' : 'Open the skill challenge'}
    </button>}
    <button className="btn ghost" onClick={() => go('path')}>Back to my path</button>
  </Screen>
}
