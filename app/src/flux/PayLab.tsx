// FLUX Episode 2 · "Charged Twice". Cut the network with your own scissors and watch money move.
import { useEffect, useRef, useState } from 'react'
import { go } from '../router'
import { BetScreen, Plate, Settle, Shell, Typer, Wrap } from './Episode'
import { haptic, sfx, stopVoice, voice } from './fx'
import { useFlux } from './store'

type Cut = 'none' | 'in' | 'out'
type Pkt = { id: number; dir: 'req' | 'res'; attempt: number; doomed: boolean; replay?: boolean }
type Row = { pay: string; key: string; attempt: number; replay?: boolean }
type MissionId = 'twice' | 'once' | 'inbound'
const MISSIONS: Record<MissionId, { title: string; goal: string; hint: string }> = {
  twice: { title: 'Sabotage #1', goal: 'Make Rahul pay twice for ONE tap.', hint: 'Pick where the scissors cut. A request that never arrives is not the same as a reply that never comes back.' },
  once: { title: 'Fix #1', goal: 'Cut the reply again, but Rahul must pay only once.', hint: 'Turn the idempotency key on, then cut the reply.' },
  inbound: { title: 'Experiment', goal: 'Key OFF. Cut the REQUEST on the way in. Does he pay twice?', hint: 'Set the scissors to "request" and switch the key off.' },
}
const STEP_MS = 900

function useLater() {
  const ids = useRef<number[]>([])
  useEffect(() => () => ids.current.forEach(clearTimeout), [])
  return (fn: () => void, ms: number) => { ids.current.push(window.setTimeout(fn, ms)) }
}

function Network({ mission, onWin }: { mission: MissionId; onWin: (d: string) => void }) {
  const [keyOn, setKeyOn] = useState(mission === 'once')
  const [cut, setCut] = useState<Cut>(mission === 'inbound' ? 'none' : 'none')
  const [phone, setPhone] = useState<'idle' | 'sending' | 'waiting' | 'retrying' | 'paid'>('idle')
  const [pkts, setPkts] = useState<Pkt[]>([])
  const [ledger, setLedger] = useState<Row[]>([])
  const [log, setLog] = useState<string[]>([])
  const [won, setWon] = useState('')
  const seen = useRef(new Map<string, string>())
  const later = useLater()
  const busy = phone !== 'idle' && phone !== 'paid'

  const say = (s: string) => setLog((l) => [s, ...l].slice(0, 6))
  const pay = () => {
    if (busy) return
    const payId = 'P' + Math.floor(1000 + Math.random() * 9000)
    const key = 'k_' + Math.random().toString(16).slice(2, 6)
    const charges: Row[] = []
    let pid = 0
    const sendReq = (attempt: number) => {
      const doomed = attempt === 1 && cut === 'in'
      setPhone(attempt === 1 ? 'sending' : 'retrying')
      say(`📱 attempt ${attempt}: POST /pay ₹499${keyOn ? ` · Idempotency-Key ${key}` : ''}`)
      const p = { id: ++pid, dir: 'req' as const, attempt, doomed }
      setPkts((x) => [...x, p]); sfx('whoosh', 0.3)
      if (doomed) {
        later(() => { setPkts((x) => x.filter((y) => y.id !== p.id)); sfx('zap', 0.5); haptic(60); say('✂ request lost in the network'); setPhone('waiting') }, STEP_MS * 0.55)
        later(() => { say('⏱ no reply after 3 s → retry'); sendReq(attempt + 1) }, STEP_MS * 2.2)
        return
      }
      later(() => {
        setPkts((x) => x.filter((y) => y.id !== p.id))
        let replay = false
        if (keyOn && seen.current.has(key)) { replay = true; say(`🗄 server: key ${key} seen → replay saved reply, no charge`) }
        else {
          const row = { pay: payId, key: keyOn ? key : '—', attempt }
          charges.push(row); setLedger((l) => [row, ...l]); sfx('buzz', 0.5)
          if (keyOn) seen.current.set(key, payId)
          say(`🗄 server: charged ₹499 (${payId}${charges.length > 1 ? ` · CHARGE #${charges.length}` : ''})`)
        }
        const doomedRes = attempt === 1 && cut === 'out'
        const r = { id: ++pid, dir: 'res' as const, attempt, doomed: doomedRes, replay }
        setPkts((x) => [...x, r])
        if (doomedRes) {
          later(() => { setPkts((x) => x.filter((y) => y.id !== r.id)); sfx('zap', 0.5); haptic(60); say('✂ reply lost on the way back'); setPhone('waiting') }, STEP_MS * 0.55)
          later(() => { say('⏱ no reply after 3 s → retry'); sendReq(attempt + 1) }, STEP_MS * 2.2)
          return
        }
        later(() => {
          setPkts((x) => x.filter((y) => y.id !== r.id)); setPhone('paid'); sfx('ding', 0.5)
          say(`📱 “Payment successful” · Rahul was charged ${charges.length}×`)
          judge(charges.length, attempt)
        }, STEP_MS)
      }, STEP_MS)
    }
    const judge = (n: number, attempts: number) => {
      if (won) return
      const w = (d: string) => { setWon(d); sfx('combo'); haptic([30, 40, 80]); onWin(d) }
      if (mission === 'twice' && n >= 2) w(`Cut the reply → app retried → server charged again. ₹${499 * n} for one tap.`)
      if (mission === 'once' && keyOn && cut === 'out' && n === 1 && attempts > 1) w('Reply lost, app retried with the same key, server replayed the saved reply. ₹499 once.')
      if (mission === 'inbound' && !keyOn && cut === 'in' && n === 1) w('A lost REQUEST is safe to retry: the server never saw it. Only a lost REPLY is ambiguous.')
    }
    sendReq(1)
  }

  const m = MISSIONS[mission]
  const charged = ledger.length
  return (
    <section className="fx-net" aria-label="Payment network simulator">
      <header className={`fx-mission ${won ? 'won' : ''}`}>
        <span className="fx-kicker">{m.title}</span><p className="fx-goal">{m.goal}</p>
        {won ? <p className="fx-win" role="status">{won}</p> : <p className="fx-hint">{m.hint}</p>}
      </header>
      <div className="fx-lanes">
        <div className={`fx-node phone ${phone}`}><span className="ic">📱</span><b>Rahul's app</b><small>{phone === 'paid' ? '✓ paid' : phone === 'waiting' ? 'waiting…' : phone === 'retrying' ? 'retrying' : phone === 'sending' ? 'sending' : 'ready'}</small></div>
        <div className={`fx-wire ${cut}`}>
          {cut !== 'none' && <span className={`fx-scissors ${cut}`} aria-hidden="true">✂</span>}
          {pkts.map((p) => <i key={p.id} className={`fx-pkt ${p.dir} ${p.doomed ? 'doomed' : ''} ${p.replay ? 'replay' : ''}`} style={{ animationDuration: `${STEP_MS}ms` }}>{p.dir === 'req' ? `₹ #${p.attempt}` : p.replay ? '↺ OK' : 'OK'}</i>)}
        </div>
        <div className="fx-node server"><span className="ic">🗄</span><b>Payment server</b><small>{keyOn ? `remembers ${seen.current.size} key${seen.current.size === 1 ? '' : 's'}` : 'no memory of keys'}</small></div>
      </div>
      <div className={`fx-ledger ${charged > 1 ? 'hot' : ''}`}>
        <span>Rahul's bank statement</span>
        {ledger.length === 0 ? <p className="fx-fine">No charges yet.</p> : ledger.slice(0, 4).map((r, i) => <p key={i}><b>−₹499</b> {r.pay} · attempt {r.attempt} · key {r.key}</p>)}
      </div>
      <ol className="fx-log" aria-live="polite">{log.map((l, i) => <li key={i + l}>{l}</li>)}</ol>
      <div className="fx-controls">
        <div className="fx-seg" role="group" aria-label="Scissors">
          {(['none', 'in', 'out'] as Cut[]).map((c) => <button key={c} aria-pressed={cut === c} disabled={busy} onClick={() => { setCut(c); sfx('tick', 0.4) }}>{c === 'none' ? 'No cut' : c === 'in' ? '✂ Request' : '✂ Reply'}</button>)}
        </div>
        <button className={`fx-btn ${keyOn ? '' : 'ghost'}`} aria-pressed={keyOn} disabled={busy} onClick={() => { setKeyOn(!keyOn); seen.current.clear(); sfx('powerup', 0.3) }}>{keyOn ? '🔑 Idempotency key ON' : '🔑 Key OFF'}</button>
        <button className="fx-cta in" disabled={busy} onClick={() => { setLedger([]); setLog([]); pay() }}>Pay ₹499 (one tap)</button>
      </div>
      <p className="fx-fine">Deterministic simulation. The cut only hits the first attempt, like a real flaky network.</p>
    </section>
  )
}

const CODE = [
  { id: 'a', ok: false, code: 'def charge(req):\n    ledger.add(req.user, req.amount)\n    return OK', why: 'Every retry is a new charge. This is Rahul’s bank statement.' },
  { id: 'b', ok: true, code: 'def charge(req):\n    if saved := replies.get(req.key):\n        return saved          # replay, no charge\n    reply = ledger.add(req.user, req.amount)\n    replies.put(req.key, reply)\n    return reply', why: 'Same key → same reply. Production version: claim the key atomically BEFORE charging, so two retries racing in parallel cannot both charge.' },
  { id: 'c', ok: false, code: 'def charge(req):\n    if charged_recently(req.user, minutes=5):\n        return ERROR\n    ledger.add(req.user, req.amount)\n    return OK', why: 'Blocks a real second purchase (two tickets!) and still returns ERROR to a retry that actually succeeded. Guessing by time is not identity.' },
]
function FixCode({ next }: { next: () => void }) {
  const { grade, prove } = useFlux()
  const [pick, setPick] = useState('')
  const chosen = CODE.find((c) => c.id === pick)
  useEffect(() => () => stopVoice(), [])
  return (
    <section className="fx-forge">
      <span className="fx-kicker">Ship the fix</span>
      <h1 className="fx-h1">Which server code stops the double charge?</h1>
      <div className="fx-code-list">{CODE.map((c) => <button key={c.id} disabled={!!pick} onClick={() => { setPick(c.id); grade('idem', c.ok); sfx(c.ok ? 'powerup' : 'wrong'); haptic(c.ok ? [20, 30, 60] : 120); if (c.ok) { voice('pay_rule'); prove('tech') } }}
        className={`fx-code ${pick ? (c.ok ? 'right' : pick === c.id ? 'wrong' : 'dim') : ''}`}><pre>{c.code}</pre></button>)}</div>
      {chosen && <p className={chosen.ok ? 'fx-win' : 'fx-repair'} role="status">{chosen.why}</p>}
      {chosen && !chosen.ok && <button className="fx-btn ghost" onClick={() => setPick('')}>Try again</button>}
      {chosen?.ok && <button className="fx-cta in" onClick={next}>Finish episode →</button>}
    </section>
  )
}

const BET = { id: 'pay', q: 'Rahul tapped Pay once. Who charged him twice?', options: [
  { id: 'bank', label: 'The bank made an error', icon: '🏦' },
  { id: 'retry', label: 'The app retried, and the server charged again', icon: '↻' },
  { id: 'tap', label: 'He secretly tapped twice', icon: '👆' },
], answer: 'retry' }

function Lab({ next }: { next: () => void }) {
  const { grade } = useFlux()
  const order: MissionId[] = ['twice', 'inbound', 'once']
  const [i, setI] = useState(0)
  const [won, setWon] = useState(false)
  return (
    <section className="fx-labwrap">
      <Network key={order[i]} mission={order[i]} onWin={() => { setWon(true); grade(order[i] === 'once' ? 'idem' : 'ambiguous', true) }} />
      {won && <button className="fx-cta in sticky" onClick={() => { setWon(false); if (i < 2) setI(i + 1); else next() }}>{i < 2 ? 'Next →' : 'Settle my bet →'}</button>}
    </section>
  )
}

function Open({ next }: { next: () => void }) {
  const [ready, setReady] = useState(false)
  useEffect(() => { const t = setTimeout(() => voice('pay_open'), 500); return () => { clearTimeout(t); stopVoice() } }, [])
  return (
    <Plate video="v_pay.mp4" poster="pay.webp">
      <div className="fx-stamp-time"><b>23:41</b><span>RAILWAY TICKET · ₹499 · ONE TAP</span></div>
      <Typer onDone={() => setReady(true)} lines={[
        { t: 'Rahul paid once.', cls: 'fx-h1', at: 900 },
        { t: 'His bank charged him twice.', cls: 'fx-h1 hot', at: 2300 },
        { t: 'Millions of payments a day. Nobody hacked anything.', at: 4200 },
      ]} />
      <button className={`fx-cta ${ready ? 'in' : ''}`} onClick={() => { stopVoice(); next() }}>Investigate →</button>
    </Plate>
  )
}

const STEPS = ['Cold open', 'Bet', 'Lab', 'Settle', 'Fix', 'Wrap']
export function PayEpisode() {
  const { s, setStep } = useFlux()
  const step = Math.min(s.episodes.pay?.step ?? 0, STEPS.length - 1)
  const next = () => { stopVoice(); setStep('pay', step + 1, step + 1 === STEPS.length - 1); scrollTo(0, 0) }
  return (
    <Shell steps={STEPS} step={step} onExit={() => go('flux')} tone={`pay ${step === 0 ? 'bleed' : ''}`}>
      {step === 0 && <Open next={next} />}
      {step === 1 && <BetScreen bet={BET} next={next} />}
      {step === 2 && <Lab next={next} />}
      {step === 3 && <Settle episode="pay" answer="retry" labels={Object.fromEntries(BET.options.map((o) => [o.id, o.label]))} next={next} explain={<>
        <h2>The lost reply is the villain</h2>
        <p><b>A lost request</b> is safe to retry: the server never saw it.</p>
        <p><b>A lost reply</b> is ambiguous. The charge already happened, but the app cannot know that. It retries, and a server with no memory charges again.</p>
        <p className="fx-sub">The fix is not “retry less”. It is one idempotency key per payment intent, remembered by the server.</p>
      </>} />}
      {step === 4 && <FixCode next={next} />}
      {step === 5 && <Wrap title="You just fixed a bug that costs real companies real money." concepts={['ambiguous', 'idem', 'retry']} />}
    </Shell>
  )
}
