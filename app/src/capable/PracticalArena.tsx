import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useFlux } from '../flux/store'
import { useDelivery } from '../Chrome'
import { routeParam } from '../router'
import { ARENA_VERSION, PARTS, PART_LABEL, TERMINALS, TERMINAL_LABEL, TRACE_LIMIT,
  applyAction, arenaPassed, faultFor, replayArena, solveArena, type Action, type Measurement, type Mode, type Terminal } from './arena'
import { capableRequest, errorText, newSeed, rememberReceipt, useLocal } from './client'
import type { Receipt, Ticket } from './proof'

const Workbench = lazy(() => import('./Workbench'))
type Trial = { ticket: Ticket; trace: Action[]; receipt?: Receipt; submitted?: boolean }
const practice = (seed = newSeed()): Trial => ({ ticket: { id: null, seed, version: ARENA_VERSION }, trace: [] })
const mediaValue = (m: Measurement | undefined) => !m ? '—' : m.result === 'blocked' ? 'LOCK' : m.value === null ? 'OL' : m.value.toFixed(m.mode === 'ac' ? 1 : 2)
const meterUnit = (mode: Mode) => mode === 'ac' ? 'V AC' : 'Ω'

export function PracticalArena() {
  const { online } = useDelivery()
  const flux = useFlux()
  const selectedCase = Number(routeParam('practice'))
  const hasCase = Number.isSafeInteger(selectedCase) && selectedCase > 0 && selectedCase <= 0xffffffff
  const [trial, setTrial] = useLocal<Trial>(hasCase ? `capable:v2:scar:${selectedCase}` : 'capable:v2:arena', practice(hasCase ? selectedCase : undefined))
  const [tool, setTool] = useState<'meter' | 'repair'>('meter')
  const [mode, setMode] = useState<Mode>('ac')
  const [selected, setSelected] = useState<Terminal | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [arc, setArc] = useState(0)
  const seed = trial.ticket.seed
  const state = useMemo(() => replayArena(seed, trial.trace), [seed, trial.trace])
  const result = useMemo(() => solveArena(seed, state), [seed, state])
  const last = state.readings.at(-1)
  const diagnosed = state.diagnosed && !state.fixed ? faultFor(seed) : null
  const locked = busy || Boolean(trial.receipt || trial.submitted) || trial.trace.length >= TRACE_LIMIT
  useEffect(() => { if (arc > 0) { const id = window.setTimeout(() => setArc(0), 320); return () => window.clearTimeout(id) } }, [arc])

  function act(action: Action) {
    if (locked) return
    const next = applyAction(seed, state, action)
    if (next.violations > state.violations) {
      flux.grade('safety', false)
      flux.placeBet({ episode: 'arena-isolation', choice: action.kind, confidence: 1, correct: false, at: Date.now() })
      if (action.kind === 'repair' && state.breaker) setArc((n) => n + 1)
    }
    if (action.kind !== 'probe') setSelected(null)
    setTrial({ ...trial, trace: [...trial.trace, action] })
  }

  function tap(terminal: Terminal) {
    if (locked || !state.cover || tool !== 'meter') return
    if (!selected || selected === terminal) { setSelected(selected === terminal ? null : terminal); return }
    act({ kind: 'probe', mode, a: selected, b: terminal })
    setSelected(null)
  }

  function reset(setup: Trial) {
    setTrial(setup); setSelected(null); setNotice(''); setMode('ac'); setTool('meter'); setArc(0)
  }

  async function verified() {
    setBusy(true); setNotice('')
    try { reset({ ticket: await capableRequest<Ticket>('start', { kind: 'arena' }), trace: [] }) }
    catch (error) { setNotice(errorText(error) + ' The practice case is still available.') }
    finally { setBusy(false) }
  }

  async function submit() {
    if (!trial.ticket.id || !trial.trace.length) return
    const pending = { ...trial, submitted: true }
    setTrial(pending)
    if (!online) { setNotice('Saved on this device. Reconnect to verify the trace.'); return }
    setBusy(true); setNotice('')
    try {
      const receipt = await capableRequest<Receipt>('grade', { id: trial.ticket.id, trace: trial.trace })
      rememberReceipt(receipt); setTrial({ ...pending, receipt })
    }
    catch (error) { setNotice(`${errorText(error)} Your trace is saved for retry.`) }
    finally { setBusy(false) }
  }

  function newPractice() {
    let next = newSeed()
    while (faultFor(next) === faultFor(seed)) next = newSeed()
    reset(practice(next))
  }

  const ready = arenaPassed(state)
  const repair = (part: typeof PARTS[number]) => act({ kind: 'repair', part })
  const setMeter = (value: Mode) => { setMode(value); setSelected(null) }
  return <>
    <div className="c2-intro">
      <div><h1>Practical Arena</h1><p>Find the fault in a dark lamp circuit. Diagnose it with the multimeter, prove isolation, and test your repair under load.</p></div>
      <div className="c2-actions"><button className="c2-secondary" disabled={busy} onClick={newPractice}>New practice case</button><button className="c2-primary" disabled={busy || !online} onClick={() => void verified()}>{busy && !trial.submitted ? 'Opening…' : 'Start verified trial'}</button></div>
    </div>
    <div className="c2-work-grid">
      <section className="c2-work" aria-label="3D lamp circuit workbench">
        <div className="c2-viewport">
          <div className="c2-overlay"><span className={result.lit ? 'c2-live' : ''}>{result.lit ? 'Lamp on' : 'Lamp off'}</span><span>{trial.ticket.id ? 'Verified trial' : 'Practice case'}</span></div>
          {arc > 0 && <div key={arc} className="c2-arc" aria-hidden="true" />}
          <Suspense fallback={<p className="c2-viewport-fallback">Loading the workbench…</p>}>
            <Workbench state={state} watts={result.lampWatts} selected={selected} tool={tool} mode={mode} reading={last}
              probesAttached={trial.trace.at(-1)?.kind === 'probe'} diagnosed={diagnosed} locked={locked} onMode={setMeter}
              onTerminal={tap} onCover={() => act({ kind: 'cover' })} onBreaker={() => act({ kind: 'breaker' })}
              onSwitch={() => act({ kind: 'switch' })} onRepair={repair} />
          </Suspense>
          <p className="c2-orbit">Drag to look around</p>
        </div>
        <div className="c2-tool-tray" aria-label="Workbench controls">
          <button disabled={locked} onClick={() => act({ kind: 'cover' })}>{state.cover ? 'Close cover' : 'Unscrew cover'}</button>
          <button disabled={locked} onClick={() => act({ kind: 'breaker' })}>Breaker <b>{state.breaker ? 'ON' : 'OFF'}</b></button>
          <button disabled={locked} onClick={() => act({ kind: 'switch' })}>Wall switch <b>{state.switchOn ? 'ON' : 'OFF'}</b></button>
          <button disabled={locked} onClick={() => act({ kind: 'test' })}>Run load test</button>
        </div>
      </section>
      <section className="c2-tools" aria-label="Tools and measurements">
        <div className="c2-segment" aria-label="Tool">
          <button disabled={locked} aria-pressed={tool === 'meter'} onClick={() => { setTool('meter'); setSelected(null) }}>Multimeter</button>
          <button disabled={locked} aria-pressed={tool === 'repair'} onClick={() => { setTool('repair'); setSelected(null) }}>Repair</button>
        </div>
        {tool === 'meter' ? <>
          <div className="c2-meter"><span className="c2-meter-screen"><strong>{mediaValue(last)}</strong><span>{last?.result === 'blocked' ? 'BLOCKED' : meterUnit(last?.mode ?? mode)}</span></span></div>
          <div className="c2-segment" aria-label="Meter mode">{(['ac', 'ohm'] as const).map((value) => <button key={value} disabled={locked} aria-pressed={mode === value} onClick={() => setMeter(value)}>{value === 'ac' ? 'AC volts' : 'Resistance Ω'}</button>)}</div>
          <p className="c2-small">{!state.cover ? 'Remove the cover to reach the test points.' : selected ? `Red probe at ${TERMINAL_LABEL[selected]}. Select the black probe point.` : 'Place the red probe on a test point, then place the black probe.'}</p>
          <div className="c2-terminal-grid">{TERMINALS.map((terminal) => <button key={terminal} aria-pressed={selected === terminal} disabled={locked || !state.cover} onClick={() => tap(terminal)}>{TERMINAL_LABEL[terminal]}</button>)}</div>
        </> : <>
          <p className="c2-small">Use a resistance reading to diagnose the part. The isolation gate checks the breaker and voltage measurement before repair.</p>
          <div className="c2-terminal-grid">{PARTS.map((part) => <button key={part} disabled={locked || !state.cover} onClick={() => repair(part)}>Repair {PART_LABEL[part].toLowerCase()}</button>)}</div>
          {!trial.ticket.id && <button disabled={locked || !state.cover} onClick={() => act({ kind: 'bridge' })}>{state.bridged ? 'Remove simulated short' : 'Try a simulated short'}</button>}
        </>}
      </section>
    </div>
    <div className="c2-bench-feedback">
      <div><b>{state.violations ? `${state.violations} safety violation${state.violations === 1 ? '' : 's'}` : state.isolated ? 'Isolation verified' : 'Workbench status'}</b>
        <p role="status">{state.message}</p></div>
      <div className="c2-actions">
        {trial.ticket.id && trial.trace.length > 0 && !trial.receipt && <button className="c2-primary" disabled={busy} onClick={() => void submit()}>{busy ? 'Working…' : trial.submitted ? 'Verify saved trace' : ready ? 'Verify practical' : 'Submit trace'}</button>}
        {trial.receipt && <a className="c2-primary" href="#/capable-proof">Open Proof Passport</a>}
      </div>
    </div>
    {notice && <p className="c2-notice" role="status">{notice}</p>}
    {trial.receipt && <p className="c2-notice" role="status">{trial.receipt.record.passed ? 'Server replay passed. L4 Simulated Practical recorded.' : 'Server replay did not pass. Start a new trial to try a different fault.'}</p>}
    {!trial.ticket.id && ready && <p className="c2-notice" role="status">Practice passed. Start a verified trial for an unseen fault and a server receipt.</p>}
    {trial.trace.length >= TRACE_LIMIT && <p className="c2-notice">Trace limit reached. Submit the assessment or open another case.</p>}
    <div className="c2-arena-footer">
      <details><summary>Action trace · {trial.trace.length} events</summary><ol>{trial.trace.map((a, i) => <li key={i}>{a.kind === 'probe' ? `${meterUnit(a.mode)} · ${TERMINAL_LABEL[a.a]} to ${TERMINAL_LABEL[a.b]}` : a.kind === 'repair' ? `Repair ${PART_LABEL[a.part]}` : a.kind}</li>)}</ol></details>
      <span>Educational simulation · Supervised field check required</span>
    </div>
  </>
}
