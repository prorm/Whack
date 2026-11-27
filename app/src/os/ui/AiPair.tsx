// AI Pair: every lab has a mode where you work WITH an assistant and are graded on judgement. The assistant is a
// scripted simulation (no model call), labelled as such; in every trial one of its calls is confidently wrong.
// Practice is graded on this device; an unseen trial is issued, re-graded and signed by the server.
import { useMemo, useState, type ReactNode } from 'react'
import { useDelivery } from '../../Chrome'
import { PARTS, PART_LABEL, TERMINAL_LABEL, TEST_POINTS, type Part } from '../../capable/arena'
import { capableRequest, errorText, useLocal } from '../../capable/client'
import type { Receipt } from '../../capable/proof'
import { routeParam } from '../../router'
import { PRACTICE_VARIANT, referenceCode, runSuite, type Summary } from '../codelab'
import { AI_RULES, CODE_CONTEXT, SCENARIO_LABEL, TRADE_CONTEXT, aiCodeTicket, aiTradeTicket, gradeAiCode, gradeAiTrade, gradeBrief, scenarioEvents,
  type AiCodeTicket, type AiTradeTicket, type BriefGrade, type Ctx, type ScenarioId, type Slot } from '../aipair'
import { addReceipt } from '../store'

const PRACTICE_SEED = 4271
type Track = 'code' | 'trade'
type Check = { ok: boolean; label: string; detail: string }

const ctxLabel = (cards: Ctx[], ids: string[]) => ids.map((id) => cards.find((c) => c.id === id)?.label ?? id).join(', ')
const briefCheck = (cards: Ctx[], b: Pick<BriefGrade, 'missing' | 'leaked' | 'noise'>): Check => ({
  ok: !b.missing.length && !b.leaked.length, label: 'Brief',
  detail: b.leaked.length ? `You pasted ${ctxLabel(cards, b.leaked)} into the prompt. That never goes to an assistant.`
    : b.missing.length ? `The assistant was missing ${ctxLabel(cards, b.missing)}. Without evidence it can only guess.`
      : `Evidence only, nothing sensitive.${b.noise.length ? ` (${ctxLabel(cards, b.noise)} was noise, not harmful.)` : ''}`,
})
const describe = (s: Summary | null | undefined) => !s ? 'does not run'
  : `${s.ledgerCount} credit${s.ledgerCount === 1 ? '' : 's'}, ${s.ledgerPaise} paise${s.refundedPaise ? `, ${s.refundedPaise} refunded` : ''}, replies ${s.statuses.join('/')}`
const behaviour = (code: string, id: ScenarioId, seed: number) =>
  runSuite(code, [{ name: id, hidden: false, events: scenarioEvents(id, seed), expect: { statuses: [], ledgerCount: -1, ledgerPaise: -1, refundedPaise: -1 } }])[0]?.got

function Brief({ cards, chosen, onToggle, locked }: { cards: Ctx[]; chosen: string[]; onToggle: (id: string) => void; locked: boolean }) {
  return <div className="ai-ctx" role="group" aria-label="Context to give the assistant">{cards.map((c) =>
    <button key={c.id} className="ai-chip" aria-pressed={chosen.includes(c.id)} disabled={locked} onClick={() => onToggle(c.id)}>
      <b>{c.label}</b><small>{c.detail}</small></button>)}</div>
}

function Verdict({ checks, passed, practice, children }: { checks: Check[]; passed: boolean; practice: boolean; children?: ReactNode }) {
  return <div className={`os-verdict ${passed ? 'pass' : 'fail'}`} role="status">
    <b>{passed ? (practice ? 'Good judgement. Every check passed.' : 'Passed. Signed receipt recorded.') : (practice ? 'Not yet. Here is what the assistant got past you.' : 'Not passed. The receipt records this attempt honestly.')}</b>
    <ul className="ai-checks">{checks.map((c) => <li key={c.label} className={c.ok ? 'pass' : 'fail'}><span className="os-badge">{c.ok ? 'Pass' : 'Miss'}</span><div><b>{c.label}</b><small>{c.detail}</small></div></li>)}</ul>
    {children}
  </div>
}

// ---------------------------------------------------------------- software
type CodeState = { context: string[]; sent: boolean; ship: Slot | null; expose: ScenarioId | null }
const freshCode: CodeState = { context: [], sent: false, ship: null, expose: null }

function CodePair({ ticket, seed, state, set, locked, children }: { ticket: AiCodeTicket; seed: number | null; state: CodeState; set: (s: CodeState) => void; locked: boolean; children?: ReactNode }) {
  const toggle = (id: string) => set({ ...state, context: state.context.includes(id) ? state.context.filter((x) => x !== id) : [...state.context, id] })
  const early = seed !== null && state.sent ? gradeBrief(CODE_CONTEXT, state.context) : null
  return <>
    <section className="os-panel ai-step">
      <span className="ai-num">1</span><h2>Brief the copilot</h2>
      <p className="os-muted"><b>{ticket.title}.</b> {ticket.ticket}</p>
      <pre className="os-log">{ticket.logs.join('\n')}</pre>
      <p className="os-muted">Choose what goes into the prompt. A colleague would need evidence. Nobody needs the keys.</p>
      <Brief cards={ticket.context} chosen={state.context} onToggle={toggle} locked={locked || state.sent} />
      {!state.sent ? <button className="c2-primary" disabled={!state.context.length} onClick={() => set({ ...state, sent: true })}>Send to copilot</button>
        : early && <p className={early.passed ? 'os-good' : 'os-bad'}>{briefCheck(CODE_CONTEXT, early).detail}</p>}
    </section>
    {state.sent && <section className="os-panel ai-step">
      <span className="ai-num">2</span><h2>The copilot answers. Which patch ships?</h2>
      <div className="ai-sugs">{ticket.suggestions.map((s) => <article key={s.slot} className="ai-sug" aria-current={state.ship === s.slot ? 'true' : undefined}>
        <header><span className="ai-bot">Copilot · suggestion {s.slot}</span></header>
        <p>{s.claim}</p>
        <pre className="ai-diff">{s.diff.filter((d, i, all) => d.op !== ' ' || all.slice(Math.max(0, i - 1), i + 2).some((n) => n.op !== ' ')).map((d, i) =>
          <span key={i} className={d.op === '+' ? 'add' : d.op === '-' ? 'del' : ''}>{d.op} {d.text}{'\n'}</span>)}</pre>
        <p className="ai-claim">✓ I ran your visible tests: {s.visible.passed}/{s.visible.total} pass. Safe to merge.</p>
        <button className="os-pick" aria-pressed={state.ship === s.slot} disabled={locked} onClick={() => set({ ...state, ship: s.slot })}>Ship {s.slot}</button>
      </article>)}</div>
      <p className="os-fine">Both claims are true: both patches pass every visible test. That is the point.</p>
    </section>}
    {state.sent && state.ship && <section className="os-panel ai-step">
      <span className="ai-num">3</span><h2>Prove it. Which test would you write before merging?</h2>
      <p className="os-muted">Pick the one test that would show the patch you did <b>not</b> ship is wrong.</p>
      <div className="ai-opts" role="radiogroup">{ticket.scenarios.map((id) =>
        <button key={id} role="radio" aria-checked={state.expose === id} className="os-pick" disabled={locked} onClick={() => set({ ...state, expose: id })}>{SCENARIO_LABEL[id]}</button>)}</div>
      {children}
    </section>}
  </>
}

function CodeTrack() {
  const { online } = useDelivery()
  const [mode, setMode] = useLocal<'practice' | 'verified'>('capable:ai:code:mode', 'practice')
  const [practice, setPractice] = useLocal<CodeState>('capable:ai:code:practice', freshCode)
  const [trial, setTrial] = useLocal<{ id: string; ticket: AiCodeTicket; state: CodeState; receipt?: Receipt } | null>('capable:ai:code:trial', null)
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const practiceTicket = useMemo(() => aiCodeTicket(PRACTICE_VARIANT, PRACTICE_SEED), [])
  const verified = mode === 'verified' && trial
  const ticket = verified ? trial.ticket : practiceTicket
  const state = verified ? trial.state : practice
  const set = (s: CodeState) => { setChecked(false); if (verified) setTrial({ ...trial, state: s }); else setPractice(s) }
  const locked = Boolean(verified && trial.receipt) || (!verified && checked)
  const ready = state.sent && state.ship && state.expose

  async function start() {
    setBusy(true); setNotice('')
    try { const t = await capableRequest<{ id: string; ticket: AiCodeTicket }>('start', { kind: 'aicode' }); setTrial({ id: t.id, ticket: t.ticket, state: freshCode }); setMode('verified') }
    catch (e) { setNotice(`${errorText(e)} Practice still works offline.`) } finally { setBusy(false) }
  }
  async function submit() {
    if (!trial || !ready) return
    setBusy(true); setNotice('')
    try {
      const receipt = await capableRequest<Receipt>('grade', { id: trial.id, answer: { context: state.context, ship: state.ship, expose: state.expose } })
      addReceipt({ receipt, token: null }); setTrial({ ...trial, receipt })
    } catch (e) { setNotice(errorText(e)) } finally { setBusy(false) }
  }

  const g = !verified && checked && ready ? gradeAiCode(PRACTICE_VARIANT, PRACTICE_SEED, { context: state.context, ship: state.ship!, expose: state.expose! }) : null
  const record = verified && trial.receipt?.record.kind === 'aicode' ? trial.receipt.record : null
  const checks: Check[] | null = g ? [
    briefCheck(CODE_CONTEXT, g.brief),
    { ok: g.shipCorrect, label: 'Patch', detail: g.shipCorrect ? `Right call. Suggestion ${g.trap} was the trap: ${g.mistake}` : `Suggestion ${g.trap} was the trap: ${g.mistake}` },
    { ok: g.exposeCorrect, label: 'Proof', detail: g.exposeCorrect ? `“${SCENARIO_LABEL[state.expose!]}” makes the trap misbehave.` : `“${SCENARIO_LABEL[state.expose!]}” behaves the same on both patches, so it proves nothing. Tests that catch it: ${g.exposing.map((s) => `“${SCENARIO_LABEL[s]}”`).join(', ')}.` },
  ] : record ? [
    briefCheck(CODE_CONTEXT, record.brief),
    { ok: record.shipCorrect, label: 'Patch', detail: record.shipCorrect ? 'You shipped the correct patch.' : 'You shipped the patch that breaks a hidden contract.' },
    { ok: record.exposeCorrect, label: 'Proof', detail: record.exposeCorrect ? 'Your test exposes the trap.' : 'Your test cannot tell the two patches apart.' },
  ] : null

  return <div className="ai-grid">
    <div className="ai-main">
      <div className="ai-modebar">
        <span className={`os-tag ${verified ? 'live' : ''}`}>{verified ? 'Unseen trial · server graded' : 'Guided practice · graded on this device'}</span>
        <div className="c2-segment" aria-label="Mode">
          <button aria-pressed={mode === 'practice'} onClick={() => setMode('practice')}>Guided</button>
          <button aria-pressed={mode === 'verified'} disabled={busy} onClick={() => { if (trial) setMode('verified'); else void start() }}>Unseen trial</button>
        </div>
      </div>
      {notice && <p className="c2-notice" role="status">{notice}</p>}
      <CodePair ticket={ticket} seed={verified ? null : PRACTICE_SEED} state={state} set={set} locked={locked}>
        {ready && !verified && !checked && <button className="c2-primary" onClick={() => setChecked(true)}>Check my judgement</button>}
        {ready && verified && !trial.receipt && <button className="c2-primary" disabled={busy || !online} onClick={() => void submit()}>{busy ? 'Grading…' : 'Submit for server grading'}</button>}
      </CodePair>
      {checks && <Verdict checks={checks} passed={g ? g.passed : record!.passed} practice={!verified}>
        {g && <details open><summary>What each test does to the two patches</summary>
          <ul className="c2-measure-list">{ticket.scenarios.map((id) => { const trap = ticket.suggestions.find((s) => s.slot === g.trap)!.code
            const right = describe(behaviour(referenceCode(), id, PRACTICE_SEED)), wrong = describe(behaviour(trap, id, PRACTICE_SEED))
            return <li key={id}><span>{SCENARIO_LABEL[id]}</span><b className={right === wrong ? '' : 'os-bad'}>{right === wrong ? 'Same on both' : `Trap: ${wrong} · correct: ${right}`}</b></li> })}</ul>
        </details>}
        <div className="c2-actions">
          {!verified ? <button className="c2-secondary" onClick={() => { setPractice(freshCode); setChecked(false) }}>Try again</button>
            : <><a className="c2-primary" href="#/capable-proof">Open signed receipts</a><button className="c2-secondary" disabled={busy} onClick={() => void start()}>Take another unseen trial</button></>}
        </div>
      </Verdict>}
    </div>
  </div>
}

// ---------------------------------------------------------------- trades
type TradeState = { context: string[]; sent: boolean; unsafe: number | null; measured: Part[]; verdict: Part | null }
const freshTrade: TradeState = { context: [], sent: false, unsafe: null, measured: [], verdict: null }
const unsafeAt = (plan: string[]) => plan.findIndex((p) => /Skip the dead test|breaker still on|Bridge the/.test(p))
const reading = (v: number | null) => v === null ? 'OL · open path' : `${v.toFixed(2)} Ω · continuous`

function TradeTrack() {
  const { online } = useDelivery()
  const [mode, setMode] = useLocal<'practice' | 'verified'>('capable:ai:trade:mode', 'practice')
  const [practice, setPractice] = useLocal<TradeState>('capable:ai:trade:practice', freshTrade)
  const [trial, setTrial] = useLocal<{ id: string; ticket: AiTradeTicket; state: TradeState; receipt?: Receipt } | null>('capable:ai:trade:trial', null)
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const practiceTicket = useMemo(() => aiTradeTicket(PRACTICE_SEED), [])
  const verified = mode === 'verified' && trial
  const t = verified ? trial.ticket : practiceTicket
  const s = verified ? trial.state : practice
  const set = (n: TradeState) => { setChecked(false); if (verified) setTrial({ ...trial, state: n }); else setPractice(n) }
  const locked = Boolean(verified && trial.receipt) || (!verified && checked)
  const ready = s.sent && s.unsafe !== null && s.verdict !== null
  const toggle = (id: string) => set({ ...s, context: s.context.includes(id) ? s.context.filter((x) => x !== id) : [...s.context, id] })
  const early = !verified && s.sent ? gradeBrief(TRADE_CONTEXT, s.context) : null

  async function start() {
    setBusy(true); setNotice('')
    try { const r = await capableRequest<{ id: string; ticket: AiTradeTicket }>('start', { kind: 'aitrade' }); setTrial({ id: r.id, ticket: r.ticket, state: freshTrade }); setMode('verified') }
    catch (e) { setNotice(`${errorText(e)} Practice still works offline.`) } finally { setBusy(false) }
  }
  async function submit() {
    if (!trial || !ready) return
    setBusy(true); setNotice('')
    try {
      const receipt = await capableRequest<Receipt>('grade', { id: trial.id, answer: { context: s.context, unsafe: s.unsafe, measured: s.measured, verdict: s.verdict } })
      addReceipt({ receipt, token: null }); setTrial({ ...trial, receipt })
    } catch (e) { setNotice(errorText(e)) } finally { setBusy(false) }
  }

  const g = !verified && checked && ready ? gradeAiTrade(PRACTICE_SEED, { context: s.context, unsafe: s.unsafe!, measured: s.measured, verdict: s.verdict! }) : null
  const rec = verified && trial.receipt?.record.kind === 'aitrade' ? trial.receipt.record : null
  const r = g ?? rec
  const checks: Check[] | null = r ? [
    briefCheck(TRADE_CONTEXT, r.brief),
    { ok: r.unsafeCorrect, label: 'Unsafe step', detail: r.unsafeCorrect ? 'You caught the unsafe step. Isolation and the dead test are never optional.' : `The unsafe step was step ${unsafeAt(t.plan) + 1}: “${t.plan[unsafeAt(t.plan)]}”` },
    { ok: r.claimTested, label: 'Tested the AI’s claim', detail: r.claimTested ? `You measured the ${PART_LABEL[r.claim as Part].toLowerCase()} before acting on it.` : `You never measured the ${PART_LABEL[r.claim as Part].toLowerCase()} the assistant blamed.` },
    { ok: r.verdictCorrect && r.evidenced, label: 'Your call', detail: `${r.aiWasRight ? 'The assistant was right this time' : `The assistant was wrong, at ${t.confidence}% confidence`}. The fault was the ${PART_LABEL[r.fault as Part].toLowerCase()}.${r.verdictCorrect && !r.evidenced ? ' You named it without measuring it, which is a guess.' : ''}` },
  ] : null

  return <div className="ai-grid"><div className="ai-main">
    <div className="ai-modebar">
      <span className={`os-tag ${verified ? 'live' : ''}`}>{verified ? 'Unseen trial · server graded' : 'Guided practice · graded on this device'}</span>
      <div className="c2-segment" aria-label="Mode">
        <button aria-pressed={mode === 'practice'} onClick={() => setMode('practice')}>Guided</button>
        <button aria-pressed={mode === 'verified'} disabled={busy} onClick={() => { if (trial) setMode('verified'); else void start() }}>Unseen trial</button>
      </div>
    </div>
    {notice && <p className="c2-notice" role="status">{notice}</p>}
    <section className="os-panel ai-step">
      <span className="ai-num">1</span><h2>Brief the assistant</h2>
      <p className="os-muted"><b>Call-out: a lighting circuit is dead.</b> The lamp is dark and the breaker has not tripped. You open the board and ask an AI vision assistant for a second opinion.</p>
      <Brief cards={t.context} chosen={s.context} onToggle={toggle} locked={locked || s.sent} />
      {!s.sent ? <button className="c2-primary" disabled={!s.context.length} onClick={() => set({ ...s, sent: true })}>Send to assistant</button>
        : early && <p className={early.passed ? 'os-good' : 'os-bad'}>{briefCheck(TRADE_CONTEXT, early).detail}</p>}
    </section>
    {s.sent && <section className="os-panel ai-step">
      <span className="ai-num">2</span><h2>The assistant answers. One step in its plan is unsafe.</h2>
      <article className="ai-sug"><header><span className="ai-bot">Vision assistant</span><span className="ai-conf">Confidence {t.confidence}%</span></header>
        <p>{t.message}</p>
        <ol className="ai-plan">{t.plan.map((p, i) => <li key={i}><span>{p}</span>
          <button className="os-pick" aria-pressed={s.unsafe === i} disabled={locked} onClick={() => set({ ...s, unsafe: i })}>Unsafe</button></li>)}</ol>
      </article>
    </section>}
    {s.sent && s.unsafe !== null && <section className="os-panel ai-step">
      <span className="ai-num">3</span><h2>Check it with your meter, then make the call</h2>
      <p className="os-muted">Breaker off, proven dead. Resistance across each part: a working part is continuous; <b>OL</b> means an open path.</p>
      <ul className="ai-meter">{PARTS.map((p) => <li key={p}>
        <button className="c2-secondary" disabled={locked || s.measured.includes(p)} onClick={() => set({ ...s, measured: [...s.measured, p] })}>Measure {PART_LABEL[p].toLowerCase()}</button>
        <small>{TERMINAL_LABEL[TEST_POINTS[p][0]]} ↔ {TERMINAL_LABEL[TEST_POINTS[p][1]]}</small>
        <b className={s.measured.includes(p) && t.readings[p] === null ? 'os-bad' : ''}>{s.measured.includes(p) ? reading(t.readings[p]) : '—'}</b></li>)}</ul>
      <h3>Repair which part?</h3>
      <div className="ai-opts" role="radiogroup">{PARTS.map((p) => <button key={p} role="radio" aria-checked={s.verdict === p} className="os-pick" disabled={locked} onClick={() => set({ ...s, verdict: p })}>{PART_LABEL[p]}</button>)}</div>
      {ready && !verified && !checked && <button className="c2-primary" onClick={() => setChecked(true)}>Check my judgement</button>}
      {ready && verified && !trial.receipt && <button className="c2-primary" disabled={busy || !online} onClick={() => void submit()}>{busy ? 'Grading…' : 'Submit for server grading'}</button>}
    </section>}
    {checks && <Verdict checks={checks} passed={r!.passed} practice={!verified}>
      <p className="os-fine">Simulation only. Real electrical work still needs a supervised, in-person check.</p>
      <div className="c2-actions">
        {!verified ? <button className="c2-secondary" onClick={() => { setPractice(freshTrade); setChecked(false) }}>Try again</button>
          : <><a className="c2-primary" href="#/capable-proof">Open signed receipts</a><button className="c2-secondary" disabled={busy} onClick={() => void start()}>Take another unseen trial</button></>}
      </div>
    </Verdict>}
  </div></div>
}

// ---------------------------------------------------------------- page
export function AiPair() {
  const [track, setTrack] = useState<Track>(routeParam('track') === 'trade' ? 'trade' : 'code')
  return <div className="os ai">
    <header className="os-intro">
      <div>
        <span className="os-tag live">AI Pair · in every lab</span>
        <h1>Work with AI. Stay the one who’s right.</h1>
        <p>Vibe-coding gets you a demo. Production, and a live wire, need judgement. Here the assistant is fast, fluent and confident, and in every trial one of its calls is wrong. You are graded on what you tell it, whether you catch it, and how you prove it.</p>
      </div>
      <div className="c2-segment os-mode" aria-label="Track">
        <button aria-pressed={track === 'code'} onClick={() => setTrack('code')}>Software · production incident</button>
        <button aria-pressed={track === 'trade'} onClick={() => setTrack('trade')}>Trades · electrical fault</button>
      </div>
    </header>
    <div className="ai-layout">
      {track === 'code' ? <CodeTrack key="code" /> : <TradeTrack key="trade" />}
      <aside className="os-contract" aria-label="AI Pair rules and contract">
        <h2>The four rules</h2>
        <ol className="ai-rules">{AI_RULES.map((r) => <li key={r.title}><b>{r.title}</b><span>{r.text}</span></li>)}</ol>
        <h2>Assessment contract</h2>
        <dl className="c2-specs">
          <div><dt>Assistant</dt><dd>Scripted simulation · no model call</dd></div>
          <div><dt>Its mistakes</dt><dd>{track === 'code' ? 'One patch passes visible tests, breaks a hidden contract' : 'Wrong part about half the time · one unsafe step, always'}</dd></div>
          <div><dt>Truth comes from</dt><dd>{track === 'code' ? 'Running both patches against the reference handler' : 'The Practical Arena circuit solver'}</dd></div>
          <div><dt>Graded by</dt><dd>Server re-grade, Ed25519 signed</dd></div>
          <div><dt>AI in grading</dt><dd>None</dd></div>
        </dl>
      </aside>
    </div>
  </div>
}
