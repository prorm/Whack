// CodeLab and DataLab: two reusable workplace environments on the same trust infrastructure as the
// Practical Arena. Practice is graded on the device; a verified trial is issued, re-run and signed by the server.
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useDelivery } from '../../Chrome'
import { capableRequest, errorText, useLocal } from '../../capable/client'
import type { Receipt } from '../../capable/proof'
import { PRACTICE_VARIANT, VARIANTS, incidentLog, starterCode, testCases, type Summary, type TestCase, type TestResult, type VariantId } from '../codelab'
import { DATA_PRACTICE, REASONS_FOR, REASON_LABEL, gradeData, ledgerFor, payable, type DataAnswer, type Reason, type Row } from '../datalab'
import { addReceipt } from '../store'

const PRACTICE_SEED = 4271

function runInWorker(code: string, cases: TestCase[]): Promise<TestResult[] | 'timeout'> {
  return new Promise((done) => {
    const w = new Worker(new URL('./codelab.worker.ts', import.meta.url), { type: 'module' })
    const timer = window.setTimeout(() => { w.terminate(); done('timeout') }, 3000)
    w.onmessage = (e) => { window.clearTimeout(timer); w.terminate(); done(e.data) }
    w.onerror = () => { window.clearTimeout(timer); w.terminate(); done('timeout') }
    w.postMessage({ code, cases })
  })
}

const describe = (s: Summary) => `${s.ledgerCount} ledger credit${s.ledgerCount === 1 ? '' : 's'}, ${s.ledgerPaise} paise${s.refundedPaise ? `, ${s.refundedPaise} refunded` : ''}, responses ${s.statuses.join(' / ')}`

function Editor({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const gutter = useRef<HTMLDivElement>(null)
  const lines = value.split('\n').length
  const key = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab' || e.shiftKey) return
    e.preventDefault()
    const t = e.currentTarget, a = t.selectionStart, b = t.selectionEnd
    onChange(value.slice(0, a) + '  ' + value.slice(b))
    requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = a + 2 })
  }
  return <div className="os-editor">
    <div className="os-gutter" ref={gutter} aria-hidden="true">{Array.from({ length: lines }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
    <textarea ref={ref} aria-label="payments.js source" spellCheck={false} autoCapitalize="off" autoCorrect="off" value={value} disabled={disabled}
      onChange={(e) => onChange(e.target.value)} onKeyDown={key} onScroll={(e) => { if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop }} />
  </div>
}

function Results({ results }: { results: TestResult[] | 'timeout' | null }) {
  if (!results) return <p className="os-muted">Run the tests to see what the handler does.</p>
  if (results === 'timeout') return <p className="os-bad" role="status">The run was stopped after 3 seconds. Look for a loop that never ends.</p>
  const passed = results.filter((r) => r.pass).length
  return <div role="status">
    <p className={passed === results.length ? 'os-good' : 'os-bad'}><b>{passed} of {results.length} tests pass</b></p>
    <ul className="os-tests">{results.map((r) => <li key={r.name} className={r.pass ? 'pass' : 'fail'}>
      <span className="os-badge">{r.pass ? 'Pass' : 'Fail'}</span>
      <div><b>{r.hidden ? 'Hidden · ' : ''}{r.name}</b>
        {r.error && <small>{r.error}</small>}
        {!r.pass && r.got && r.expect && <small>Got {describe(r.got)}. Expected {describe(r.expect)}.</small>}</div>
    </li>)}</ul>
  </div>
}

type CodeTrial = { id: string; variant: VariantId; starter: string; logs: string[]; visible: TestCase[]; hidden: number; code: string; report: string; receipt?: Receipt }

export function CodeLab() {
  const { online } = useDelivery()
  const [mode, setMode] = useLocal<'practice' | 'verified'>('capable:os:code:mode', 'practice')
  const [practice, setPractice] = useLocal('capable:os:code:practice', starterCode(PRACTICE_VARIANT))
  const [trial, setTrial] = useLocal<CodeTrial | null>('capable:os:code:trial', null)
  const [results, setResults] = useState<TestResult[] | 'timeout' | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const practiceCases = useMemo(() => testCases(PRACTICE_VARIANT, PRACTICE_SEED), [])
  const verified = mode === 'verified' && trial
  const variant = verified ? trial.variant : PRACTICE_VARIANT
  const code = verified ? trial.code : practice
  const setCode = (v: string) => verified ? setTrial({ ...trial, code: v }) : setPractice(v)
  const logs = verified ? trial.logs : incidentLog(PRACTICE_VARIANT, PRACTICE_SEED)
  const locked = Boolean(verified && trial.receipt)

  async function run(all: boolean) {
    setBusy(true); setNotice('')
    const cases = verified ? trial.visible : all ? practiceCases : practiceCases.filter((c) => !c.hidden)
    setResults(await runInWorker(code, cases))
    setBusy(false)
  }
  async function start() {
    setBusy(true); setNotice(''); setResults(null)
    try {
      const t = await capableRequest<Omit<CodeTrial, 'code' | 'report'>>('start', { kind: 'code' })
      setTrial({ ...t, code: t.starter, report: '' }); setMode('verified')
    } catch (e) { setNotice(`${errorText(e)} Practice still works offline.`) } finally { setBusy(false) }
  }
  async function submit() {
    if (!trial) return
    setBusy(true); setNotice('')
    try {
      const receipt = await capableRequest<Receipt>('grade', { id: trial.id, code: trial.code, report: trial.report })
      addReceipt({ receipt, token: null }); setTrial({ ...trial, receipt })
      if (receipt.record.kind === 'code') setResults(receipt.record.tests.map((t) => ({ ...t })))
    } catch (e) { setNotice(errorText(e)) } finally { setBusy(false) }
  }

  const record = verified && trial.receipt?.record.kind === 'code' ? trial.receipt.record : null
  return <div className="os">
    <header className="os-intro">
      <div>
        <h1>A payment API is failing in production.</h1>
        <p>Read the ticket and the logs, repair the webhook handler, and prove the fix on tests you cannot see. The same assessment contract runs in your browser for practice and on the server for proof.</p></div>
      <div className="c2-segment os-mode" aria-label="Mode">
        <button aria-pressed={mode === 'practice'} onClick={() => { setMode('practice'); setResults(null) }}>Guided incident</button>
        <button aria-pressed={mode === 'verified'} disabled={!trial && busy} onClick={() => { if (trial) { setMode('verified'); setResults(null) } else void start() }}>Unseen incident</button>
      </div>
    </header>
    {notice && <p className="c2-notice" role="status">{notice}</p>}
    <div className="os-ide">
      <section className="os-ticket" aria-label="Incident">
        <span className={`os-tag ${verified ? 'live' : ''}`}>{verified ? 'Verified trial · server graded' : 'Practice · graded on this device'}</span>
        <h2>{VARIANTS[variant].title}</h2>
        <p>{VARIANTS[variant].ticket}</p>
        <h3>Production log</h3>
        <pre className="os-log">{logs.join('\n')}</pre>
        <details className="os-brief" open={!verified}>
          <summary>Briefing: three rules this handler must keep</summary>
          <ol>
            <li><b>Deliveries repeat.</b> The gateway retries until it hears 200, so one payment can arrive several times. Credit each event id once.</li>
            <li><b>Money is whole paise.</b> The gateway sends rupees as text (“499.90”). Multiply by 100 and round: floating point cannot store 0.29 × 100 exactly.</li>
            <li><b>Status codes are promises.</b> Only a captured payment is money. Refuse an impossible refund with 422 so the console shows the error.</li>
          </ol>
        </details>
      </section>
      <section className="os-code" aria-label="Editor and tests">
        <div className="os-file"><span>payments.js</span><button className="os-link" disabled={locked} onClick={() => setCode(verified ? trial.starter : starterCode(PRACTICE_VARIANT))}>Reset file</button></div>
        <Editor value={code} onChange={setCode} disabled={locked} />
        <div className="os-runbar">
          <button className="c2-secondary" disabled={busy} onClick={() => void run(false)}>{busy ? 'Running…' : `Run visible tests (${verified ? trial.visible.length : practiceCases.filter((c) => !c.hidden).length})`}</button>
          {!verified && <button className="c2-primary" disabled={busy} onClick={() => void run(true)}>Run the full practice check</button>}
        </div>
        <div className="os-output"><Results results={results} /></div>
        {verified && !locked && <div className="os-submit">
          <label className="c2-field"><span>Incident report <small>(root cause, fix, how you know nothing else broke) · reviewed by a trainer, not by code</small></span>
            <textarea rows={3} maxLength={2000} value={trial.report} onChange={(e) => setTrial({ ...trial, report: e.target.value })} /></label>
          <button className="c2-primary" disabled={busy || !online} onClick={() => void submit()}>{busy ? 'Grading in the sandbox…' : 'Submit for server grading'}</button>
          {!online && <p className="c2-small">Reconnect to submit. Your code is saved on this device.</p>}
        </div>}
        {record && <div className={`os-verdict ${record.passed ? 'pass' : 'fail'}`} role="status">
          <b>{record.passed ? 'Passed. Signed receipt recorded.' : 'Not passed. The receipt records this attempt honestly.'}</b>
          <span>{record.tests.filter((t) => t.pass).length} of {record.tests.length} tests, including {record.contract.hidden} hidden, re-run on the server in a sandbox.</span>
          <div className="c2-actions"><a className="c2-primary" href="#/capable-proof">Open signed receipts</a><a className="c2-secondary" href="#/exchange">See what it unlocks</a>
            <button className="c2-secondary" disabled={busy} onClick={() => void start()}>Take another unseen incident</button></div>
        </div>}
      </section>
      <aside className="os-contract" aria-label="Assessment contract">
        <h2>Assessment contract</h2>
        <dl className="c2-specs">
          <div><dt>Task</dt><dd>Repair a webhook handler</dd></div>
          <div><dt>Visible tests</dt><dd>{verified ? trial.visible.length : 2}</dd></div>
          <div><dt>Hidden tests</dt><dd>{verified ? trial.hidden : 6}, fresh values</dd></div>
          <div><dt>Pass rule</dt><dd>Every test, no regressions</dd></div>
          <div><dt>Sandbox</dt><dd>4 s · no files, network or eval</dd></div>
          <div><dt>Graded by</dt><dd>Server re-run, Ed25519 signed</dd></div>
          <div><dt>Human review</dt><dd>Incident report only</dd></div>
          <div><dt>AI in grading</dt><dd>None</dd></div>
        </dl>
        <p className="c2-small">The unseen incident is a different bug from the guided one, drawn by the server. Its seed never leaves the server.</p>
      </aside>
    </div>
  </div>
}

// ---------------------------------------------------------------- DataLab
type DataTrial = { id: string; rows: Row[]; flagged: Record<string, Reason>; receipt?: Receipt }

export function DataLab() {
  const { online } = useDelivery()
  const [mode, setMode] = useLocal<'practice' | 'verified'>('capable:os:data:mode', 'practice')
  const [practice, setPractice] = useLocal<Record<string, Reason>>('capable:os:data:practice', {})
  const [trial, setTrial] = useLocal<DataTrial | null>('capable:os:data:trial', null)
  const [sort, setSort] = useState<'row' | 'order'>('row')
  const [check, setCheck] = useState<ReturnType<typeof gradeData> | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const verified = mode === 'verified' && trial
  const rows = verified ? trial.rows : ledgerFor(DATA_PRACTICE, PRACTICE_SEED)
  const flagged = verified ? trial.flagged : practice
  const reasons = REASONS_FOR[verified ? 'settlement' : DATA_PRACTICE]
  const locked = Boolean(verified && trial.receipt)
  const setFlag = (id: string, r: Reason | '') => {
    const next = { ...flagged }
    if (r) next[id] = r; else delete next[id]
    if (verified) setTrial({ ...trial, flagged: next }); else setPractice(next)
    setCheck(null)
  }
  const shown = [...rows].sort((a, b) => sort === 'order' ? a.orderId.localeCompare(b.orderId) || a.id.localeCompare(b.id) : a.id.localeCompare(b.id))

  async function start() {
    setBusy(true); setNotice('')
    try { const t = await capableRequest<{ id: string; rows: Row[] }>('start', { kind: 'data' }); setTrial({ id: t.id, rows: t.rows, flagged: {} }); setMode('verified') }
    catch (e) { setNotice(`${errorText(e)} Practice still works offline.`) } finally { setBusy(false) }
  }
  async function submit() {
    if (!trial) return
    setBusy(true); setNotice('')
    try {
      const answer: DataAnswer = { flagged: trial.flagged }
      const receipt = await capableRequest<Receipt>('grade', { id: trial.id, answer })
      addReceipt({ receipt, token: null }); setTrial({ ...trial, receipt })
    } catch (e) { setNotice(errorText(e)) } finally { setBusy(false) }
  }
  const record = verified && trial.receipt?.record.kind === 'data' ? trial.receipt.record : null
  return <div className="os">
    <header className="os-intro">
      <div>
        <h1>This week’s rider payouts don’t match the bank.</h1>
        <p>Flag every row that must not be paid and say why. The payable total updates as you work. Practice is checked on this device; the unseen settlement export is graded and signed by the server.</p></div>
      <div className="c2-segment os-mode" aria-label="Mode">
        <button aria-pressed={mode === 'practice'} onClick={() => { setMode('practice'); setCheck(null) }}>Practice export</button>
        <button aria-pressed={mode === 'verified'} disabled={busy} onClick={() => { if (trial) setMode('verified'); else void start() }}>Unseen settlement</button>
      </div>
    </header>
    {notice && <p className="c2-notice" role="status">{notice}</p>}
    <div className="os-sheet-bar">
      <span className={`os-tag ${verified ? 'live' : ''}`}>{verified ? 'Verified trial · server graded' : 'Practice · checked on this device'}</span>
      <div className="c2-segment" aria-label="Sort rows"><button aria-pressed={sort === 'row'} onClick={() => setSort('row')}>Export order</button><button aria-pressed={sort === 'order'} onClick={() => setSort('order')}>Sort by order id</button></div>
      <p className="os-total">Payable <b>₹{payable(rows, flagged).toLocaleString('en-IN')}</b> <span>{Object.keys(flagged).length} rows held back</span></p>
    </div>
    <div className="os-sheet" role="region" aria-label="Payout export" tabIndex={0}>
      <table>
        <thead><tr><th>Row</th><th>Rider</th><th>Order</th><th>Type</th><th className="num">Ledger ₹</th>{verified && <th className="num">Gateway ₹</th>}<th>Gateway status</th><th>Hold back because…</th></tr></thead>
        <tbody>{shown.map((r) => <tr key={r.id} className={flagged[r.id] ? 'held' : ''}>
          <td className="mono">{r.id}</td><td>{r.rider}</td><td className="mono">{r.orderId}</td><td>{r.kind}</td><td className="num">{r.ledger}</td>
          {verified && <td className="num">{r.gateway ?? '—'}</td>}<td>{r.status === 'reversed' ? <span className="os-warn-chip">Reversed</span> : 'Settled'}</td>
          <td><select aria-label={`Reason to hold ${r.id}`} disabled={locked} value={flagged[r.id] ?? ''} onChange={(e) => setFlag(r.id, e.target.value as Reason | '')}>
            <option value="">Pay</option>{reasons.map((x) => <option key={x} value={x}>{REASON_LABEL[x]}</option>)}</select></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="os-runbar">
      {!verified ? <button className="c2-primary" onClick={() => setCheck(gradeData(DATA_PRACTICE, PRACTICE_SEED, { flagged }))}>Check my reconciliation</button>
        : !locked && <button className="c2-primary" disabled={busy || !online} onClick={() => void submit()}>{busy ? 'Grading…' : 'Submit for server grading'}</button>}
      {check && <p className={check.passed ? 'os-good' : 'os-bad'} role="status">{check.passed ? 'Every problem row found, with the right reason. Now try the unseen settlement.'
        : `${check.missed} problem row${check.missed === 1 ? '' : 's'} still paid · ${check.wrong} good row${check.wrong === 1 ? '' : 's'} held back · ${check.misreason} wrong reason${check.misreason === 1 ? '' : 's'}.`}</p>}
    </div>
    {record && <div className={`os-verdict ${record.passed ? 'pass' : 'fail'}`} role="status">
      <b>{record.passed ? 'Passed. Signed receipt recorded.' : 'Not passed. The receipt records this attempt honestly.'}</b>
      <span>{record.missed} missed · {record.wrong} wrongly held · {record.misreason} wrong reason · payable ₹{record.payable.toLocaleString('en-IN')}</span>
      <div className="c2-actions"><a className="c2-primary" href="#/capable-proof">Open signed receipts</a><a className="c2-secondary" href="#/exchange">See what it unlocks</a>
        <button className="c2-secondary" disabled={busy} onClick={() => void start()}>Take another settlement</button></div>
    </div>}
  </div>
}
