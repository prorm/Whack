import { useEffect, useRef, useState } from 'react'
import { useDelivery } from '../Chrome'
import { routeParam } from '../router'
import { PART_LABEL, TERMINAL_LABEL, type Measurement } from './arena'
import { capableRequest, errorText, RECORDS_KEY, useLocal, type ProofItem } from './client'
import { verifySignature, type Receipt, type SharedProof } from './proof'

type Issuer = { publicKey: string; keyId: string }
const titleOf = (record: Receipt['record']) => record.kind === 'aicode' ? `AI Pair · CodeLab · ${record.title}` : record.kind === 'aitrade' ? 'AI Pair · TradeLab · AI-assisted fault diagnosis (simulation)' : record.kind === 'arena' ? 'TradeLab · Simulated electrical practical' : record.kind === 'code' ? `CodeLab · ${record.title}` : record.kind === 'data' ? 'DataLab · Settlement reconciliation' : 'TradeLab · Counterfactual solar work order'
const linkOf = (token: string) => `${location.origin}${location.pathname}#/capable-public?t=${token}`
const measure = (m: Measurement) => m.result === 'blocked' ? 'Blocked' : m.value === null ? 'OL' : `${m.value} ${m.mode === 'ac' ? 'V AC' : 'Ω'}`

function Record({ receipt, issuer }: { receipt: Receipt; issuer: Issuer | null }) {
  const [valid, setValid] = useState<boolean | null>(null)
  const { record } = receipt
  useEffect(() => {
    let active = true
    if (issuer) void verifySignature(receipt, issuer.publicKey).then((value) => { if (active) setValid(value) })
    return () => { active = false }
  }, [issuer, receipt])
  return <>
    <header className="c2-section-heading"><div><h2>{titleOf(record)}</h2><p className="c2-small">{new Date(record.at).toLocaleString()} · Case {record.seed.toString(16).toUpperCase()}</p></div><span className={`c2-result ${record.passed ? 'pass' : 'fail'}`}>{record.passed ? 'Passed' : 'Retake'}</span></header>
    {record.kind === 'arena' ? <>
      <dl className="c2-specs"><div><dt>Injected fault</dt><dd>{PART_LABEL[record.fault]}</dd></div><div><dt>Safety gate</dt><dd>{record.violations ? `${record.violations} violations` : record.isolationProven ? 'Passed' : 'Incomplete'}</dd></div><div><dt>Unverified part changes</dt><dd>{record.guesses}</dd></div><div><dt>Load test</dt><dd>{record.tested ? 'Passed' : 'Incomplete'}</dd></div></dl>
      <details><summary>Server-replayed trace · {record.trace.length} actions · {record.readings.length} measurements</summary>
        <ol>{record.trace.map((action, index) => <li key={index}>{action.kind === 'probe' ? `${TERMINAL_LABEL[action.a]} to ${TERMINAL_LABEL[action.b]}` : action.kind === 'repair' ? `Repair ${PART_LABEL[action.part]}` : action.kind}</li>)}</ol>
        <ul className="c2-measure-list">{record.readings.map((reading, index) => <li key={index}><span>{TERMINAL_LABEL[reading.a]} to {TERMINAL_LABEL[reading.b]}</span><b>{measure(reading)}</b></li>)}</ul>
      </details>
    </> : record.kind === 'code' ? <>
      <dl className="c2-specs"><div><dt>Incident</dt><dd>{record.title}</dd></div><div><dt>Tests passed</dt><dd>{record.tests.filter((t) => t.pass).length} of {record.tests.length} ({record.contract.hidden} hidden)</dd></div>
        <div><dt>Sandbox</dt><dd>{record.contract.timeLimitMs / 1000} s limit · {record.contract.network}</dd></div><div><dt>Incident report</dt><dd>{record.report ? 'Submitted · awaiting trainer review' : 'Not submitted'}</dd></div></dl>
      <details><summary>Submitted source and test results</summary>
        <ul className="c2-measure-list">{record.tests.map((t) => <li key={t.name}><span>{t.hidden ? 'Hidden · ' : ''}{t.name}</span><b>{t.pass ? 'Pass' : 'Fail'}</b></li>)}</ul>
        <pre className="os-pre">{record.code}</pre>{record.report && <p className="c2-small">Report: {record.report}</p>}
      </details>
    </> : record.kind === 'aicode' ? <dl className="c2-specs"><div><dt>Brief</dt><dd>{record.brief.leaked.length ? 'Leaked sensitive data' : record.brief.missing.length ? 'Missing evidence' : 'Evidence only'}</dd></div>
      <div><dt>Copilot patch</dt><dd>{record.shipCorrect ? 'Shipped the correct one' : 'Shipped the trap'}</dd></div><div><dt>Proof test</dt><dd>{record.exposeCorrect ? 'Exposes the trap' : 'Proves nothing'}</dd></div><div><dt>AI in grading</dt><dd>None</dd></div></dl>
    : record.kind === 'aitrade' ? <dl className="c2-specs"><div><dt>Assistant’s call</dt><dd>{PART_LABEL[record.claim as keyof typeof PART_LABEL]} · {record.aiWasRight ? 'right' : 'wrong'}</dd></div>
      <div><dt>Unsafe step</dt><dd>{record.unsafeCorrect ? 'Caught' : 'Missed'}</dd></div><div><dt>Claim tested</dt><dd>{record.claimTested ? 'Measured first' : 'Not measured'}</dd></div><div><dt>Verdict</dt><dd>{record.verdictCorrect && record.evidenced ? 'Correct, with a reading' : 'Incorrect or unmeasured'}</dd></div></dl>
    : record.kind === 'data' ? <dl className="c2-specs"><div><dt>Rows flagged</dt><dd>{Object.keys(record.answer.flagged).length}</dd></div>
      <div><dt>Missed problems</dt><dd>{record.missed}</dd></div><div><dt>Wrongly flagged</dt><dd>{record.wrong}</dd></div><div><dt>Wrong reason</dt><dd>{record.misreason}</dd></div>
      <div><dt>Payable total</dt><dd>₹{record.payable.toLocaleString('en-IN')}</dd></div></dl>
    : <dl className="c2-specs"><div><dt>Maximum module count</dt><dd>{record.panelCount ? 'Correct' : 'Incorrect'}</dd></div><div><dt>Changed-constraint decision</dt><dd>{record.decision ? 'Correct' : 'Incorrect'}</dd></div><div><dt>Source profile</dt><dd>{record.profile.moduleVoc} V · {record.profile.betaVoc}%/°C · {record.profile.maxInputVoltage} V</dd></div></dl>}
    <p className="c2-small">{valid === true ? 'Ed25519 signature verified' : valid === false ? 'Signature verification unavailable or invalid' : 'Server-issued receipt'} · Digest {record.digest.slice(0, 16)}</p>
  </>
}

function Share({ item, onShare }: { item: ProofItem; onShare: (token: string | null) => void }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [qr, setQr] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const url = item.token ? linkOf(item.token) : ''
  useEffect(() => {
    if (!url) return
    let active = true
    void import('qrcode').then((module) => module.toDataURL(url, { width: 168, margin: 2 })).then((data) => { if (active) setQr(data) }, () => {})
    return () => { active = false }
  }, [url])
  async function change(revoke: boolean) {
    setBusy(true); setMessage('')
    try {
      const result = await capableRequest<{ token?: string }>(revoke ? 'revoke' : 'share', { id: item.receipt.record.id })
      onShare(revoke ? null : result.token ?? null)
      if (revoke) { setQr(''); setMessage('The link has been revoked.') }
    } catch (error) { setMessage(errorText(error)) }
    finally { setBusy(false) }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage('Link copied.') }
    catch { input.current?.select(); setMessage('Select and copy the link from the field.') }
  }
  return <div className="c2-share">
    {url ? <>
      <label className="c2-field"><span>Verification link</span><input ref={input} readOnly value={url} /></label>
      {qr && <img src={qr} width="168" height="168" alt="QR code for the verification link" />}
      <div className="c2-actions"><button className="c2-secondary" onClick={() => void copy()}>Copy link</button><a className="c2-secondary" href={url} target="_blank" rel="noreferrer">Open verifier</a><button className="c2-secondary" disabled={busy} onClick={() => void change(true)}>Revoke link</button></div>
    </> : <button className="c2-secondary" disabled={busy} onClick={() => void change(false)}>Create share link</button>}
    {message && <p className="c2-small" role="status">{message}</p>}
  </div>
}

export function Passport2() {
  const [items, setItems] = useLocal<ProofItem[]>(RECORDS_KEY, [])
  const [issuer, setIssuer] = useLocal<Issuer | null>('capable:v2:issuer', null)
  const [message, setMessage] = useState('')
  const { online } = useDelivery()
  useEffect(() => {
    if (!online) return
    let active = true
    void capableRequest<{ records: ProofItem[] }>('records', {}).then((result) => { if (active) { setItems(result.records); setMessage('') } }, (error) => { if (active) setMessage(errorText(error)) })
    void fetch('/api/capable/key').then((response) => response.ok ? response.json() : null).then((key) => { if (active && key?.publicKey) setIssuer(key) }, () => {})
    return () => { active = false }
  }, [online, setItems, setIssuer])
  const passedSolar = items.some(({ receipt: { record } }) => record.kind === 'solar' && record.passed)
  return <>
    <div className="c2-intro"><div><h1>Signed lab receipts</h1><p>Inspect your signed work samples and decide which ones to share.</p></div></div>
    {message && <p className="c2-notice" role="status">{message}</p>}
    <div className="c2-records">
      {!items.length && <section className="c2-review"><h2>Start a verified trial</h2><p>Finish a server-issued assessment to earn a receipt here. A preloaded trial can be completed offline, then verified when you reconnect.</p><div className="c2-actions"><a href="#/capable" className="c2-primary">Open Practical Arena</a><a href="#/capable-forge" className="c2-secondary">Open Solar Forge</a></div></section>}
      {items.map((item) => <section className="c2-review" key={item.receipt.record.id}><Record receipt={item.receipt} issuer={issuer} />
        {item.receipt.record.passed && <Share item={item} onShare={(token) => setItems((current) => current.map((entry) => entry.receipt.record.id === item.receipt.record.id ? { ...entry, token } : entry))} />}</section>)}
    </div>
    <section className="c2-opportunity"><div className="c2-section-heading"><h2>Solar installation apprentice</h2><span className="c2-small">Demo opportunity</span></div>
      <dl className="c2-specs"><div><dt>Cold-morning string sizing</dt><dd>{passedSolar ? 'Demonstrated in simulation' : 'Evidence pending'}</dd></div><div><dt>Remaining role requirements</dt><dd>See the role’s competency checklist</dd></div><div><dt>Site electrical safety</dt><dd>Supervisor check in person</dd></div></dl>
      <a className="c2-secondary" href="#/sp-job?id=job-solar-apprentice">Explore role requirements</a>
    </section>
  </>
}

export function PublicProof2() {
  const token = routeParam('t') ?? ''
  const [shared, setShared] = useState<SharedProof | null>(null)
  const [issuer, setIssuer] = useState<Issuer | null>(null)
  const validToken = /^[a-f0-9-]{36}$/.test(token)
  const [state, setState] = useState(validToken ? 'Checking the share link…' : 'Invalid proof link.')
  useEffect(() => {
    let active = true
    if (!validToken) return
    void Promise.all([fetch(`/api/capable/public/${token}`), fetch('/api/capable/key')]).then(async ([proof, key]) => {
      const result = await proof.json()
      if (!proof.ok) throw new Error(result.error || 'Proof unavailable.')
      if (!key.ok) throw new Error('The issuing key is unavailable.')
      const signingKey: Issuer = await key.json()
      if (!await verifySignature(result.receipt, signingKey.publicKey)) throw new Error('The signature could not be verified.')
      if (active) { setShared(result); setIssuer(signingKey); setState('') }
    }).catch((error) => { if (active) setState(errorText(error)) })
    return () => { active = false }
  }, [token, validToken])
  return <><div className="c2-intro"><div><h1>Verify CAPABLE proof</h1><p>Server-graded simulation evidence shared by the learner.</p></div></div>
    {state && <p className="c2-notice" role="status">{state}</p>}
    {shared && <section className="c2-review c2-public-proof"><Record receipt={shared.receipt} issuer={issuer} /><p>Real-world electrical work requires an in-person supervised assessment.</p></section>}
  </>
}
