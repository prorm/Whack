// Capture Studio: turn one real failure into playable cards. No essays, no lectures: a photo, a marked fault,
// the rule, and the wrong belief juniors hold. The sieve runs live; two masters decide.
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import { go } from '../router'
import { CONCEPT_NAMES } from './Episode'
import { blobToDataUrl, fingerprint, knownHashes, loadImage, render, type Blur } from './capture'
import { canPost, mastersFor, type Domain, type Submission } from './community'
import { sfx } from './fx'
import { ReelView, type Reel } from './Reels'
import { imageChecks, nearestHash, readMeta, textChecks, verdict, type Check } from './sieve'
import { useFlux, useScars } from './store'

const CONCEPTS: Record<Domain, string[]> = { trades: ['safety', 'evload', 'cold', 'series', 'maxstring'], tech: ['idem', 'retry', 'ambiguous'] }
const ICON = { ok: '✓', warn: '!', block: '✕' }

function Gate({ domain }: { domain: Domain }) {
  const { vouch } = useFlux()
  const m = mastersFor(domain)[0]
  return <section className="fx-card fx-gate">
    <span className="fx-kicker">Prove it to post it</span>
    <h2>Beat an unseen work order in {domain === 'trades' ? 'the trades' : 'tech'} first.</h2>
    <p className="fx-sub">Uploading is earned. It keeps spam farms and self-made gurus out before anything reaches a reviewer.</p>
    <div className="fx-row">
      {domain === 'trades' ? <>
        <button className="fx-btn" onClick={() => go('flux-solar')}>Play The Cold Morning Killer</button>
        <button className="fx-btn" onClick={() => go('flux-ev')}>Play The 9 PM Blackout</button>
      </> : <button className="fx-btn" onClick={() => go('flux-pay')}>Play Charged Twice</button>}
      <button className="fx-btn ghost" onClick={() => vouch(domain, m.id)}>DEMO: get a vouch from {m.name}</button>
    </div>
  </section>
}

export function Studio() {
  const { s } = useFlux()
  const { scars, add } = useScars()
  const [domain, setDomain] = useState<Domain>('trades')
  const [raw, setRaw] = useState<{ img: HTMLImageElement; checks: Check[]; name: string } | null>(null)
  const [blurs, setBlurs] = useState<Blur[]>([])
  const [tool, setTool] = useState<'fault' | 'blur'>('fault')
  const [hot, setHot] = useState<{ x: number; y: number; r: number } | null>(null)
  const [f, setF] = useState({ question: 'Something here will fail. Tap it.', rule: '', wrongBelief: '', why: '', concept: 'safety', name: '', role: '', city: 'Bengaluru' })
  const [ack, setAck] = useState({ isolated: false, hazard: false, privacy: false })
  const [voiceNote, setVoiceNote] = useState<string>('')
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState('')
  const rec = useRef<MediaRecorder | null>(null)
  const allowed = canPost(s.proofs, s.vouches, domain)

  useEffect(() => { setF((x) => ({ ...x, concept: CONCEPTS[domain][0] })) }, [domain])
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setHot(null); setBlurs([])
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const meta = readMeta(bytes)
      const url = URL.createObjectURL(file)
      const img = await loadImage(url)
      const mine = fingerprint(img)
      const known = [...await knownHashes(), ...scars.map((x) => ({ id: `field scar ${x.id}`, hash: x.hash }))]
      let checks = imageChecks(meta, { w: img.naturalWidth, h: img.naturalHeight }, nearestHash(mine, known))
      if (domain === 'tech') checks = checks.map((c) => c.id === 'no-camera' ? { ...c, level: 'ok' as const, label: 'Screenshot', detail: 'Expected for a trace or a config bug.' } : c)
      setRaw({ img, checks, name: file.name })
      sfx('powerup', 0.3)
    } catch (x) { setError((x as Error).message) }
  }
  const tapPhoto = (e: MouseEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - b.left) / b.width) * 100, y = ((e.clientY - b.top) / b.height) * 100
    if (tool === 'fault') setHot({ x, y, r: hot?.r ?? 12 })
    else setBlurs([...blurs, { x, y, r: 8 }])
    sfx('tick', 0.3)
  }
  const recordVoice = async () => {
    if (recording) { rec.current?.stop(); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const r = new MediaRecorder(stream); const parts: Blob[] = []
      r.ondataavailable = (e) => parts.push(e.data)
      r.onstop = async () => { stream.getTracks().forEach((t) => t.stop()); setRecording(false); setVoiceNote(await blobToDataUrl(new Blob(parts, { type: r.mimeType }))) }
      rec.current = r; r.start(); setRecording(true)
      setTimeout(() => { if (r.state === 'recording') r.stop() }, 20000)
    } catch { setError('Microphone not available. The voice note is optional.') }
  }

  const words = useMemo(() => textChecks(f), [f])
  const consent: Check[] = [
    ...(domain === 'trades' ? [{ id: 'iso', level: ack.isolated ? 'ok' : 'block', label: 'Isolation before touching', detail: 'The circuit was isolated and locked out before anyone touched it.' } as Check] : []),
    { id: 'haz', level: ack.hazard ? 'ok' : 'block', label: 'Hazard to spot, not a procedure to copy', detail: 'The card teaches recognising the fault.' },
    { id: 'priv', level: ack.privacy ? 'ok' : 'block', label: 'No faces, names, numbers or plates visible', detail: 'Blur them with the privacy tool.' },
  ]
  const checks = [...(raw?.checks ?? []), ...words, ...consent, ...(hot ? [] : [{ id: 'hot', level: 'block', label: 'Fault not marked', detail: 'Tap the exact fault on the photo.' } as Check])]
  const v = raw ? verdict(checks) : 'block'
  const photo = useMemo(() => raw ? render(raw.img, blurs) : '', [raw, blurs])
  const preview: Reel[] = raw && hot ? [
    { id: 'preview-spot', concept: f.concept, track: domain === 'trades' ? 'solar' : 'pay', kind: 'spot', img: photo, hot, q: f.question, kicker: 'Field Scar · preview', explain: f.why || f.rule,
      prov: { origin: 'community_verified', mediaSource: 'real_capture', truth: 'master_review', isDemo: true, verifiedBy: [], contributor: { name: f.name || 'You', role: f.role, city: f.city, verifiedCount: 0, demo: false } } },
  ] : []
  const submit = () => {
    if (!raw || !hot || v === 'block') return
    const id = Math.random().toString(36).slice(2, 8)
    const sub: Submission = {
      id, createdAt: Date.now(), domain, concept: f.concept, contributor: { name: f.name.trim() || 'Anonymous', role: f.role.trim() || (domain === 'trades' ? 'Electrician' : 'Engineer'), city: f.city.trim() },
      photo, hash: fingerprint(raw.img), hot, question: f.question, rule: f.rule.trim(), wrongBelief: f.wrongBelief.trim(), why: (f.why || f.rule).trim(),
      voiceNote: voiceNote || undefined, checks, status: 'pending', reviews: [], challenges: [], changelog: [{ at: Date.now(), note: 'Submitted; passed the automated sieve' }],
    }
    if (!add(sub)) { setError('This device is out of storage for photos. Remove an old Field Scar in the queue.'); return }
    sfx('combo'); go('flux-queue')
  }

  return (
    <div className="fx-hub fx-studio">
      <header className="fx-top"><button className="fx-back" onClick={() => go('home')} aria-label="Back home">←</button><span className="fx-logo"><b>FLUX</b><i>capture studio</i></span></header>
      <section className="fx-hero">
        <p className="fx-kicker">Upload a Field Scar, not a lecture</p>
        <h1 className="fx-h1">One real failure → two playable cards.</h1>
        <p className="fx-sub">Photo of a real fault + the exact spot + the rule + the wrong belief juniors hold. No essays, no talking heads. A sieve screens it; two masters verify it; then it joins the recall feed with your name on it.</p>
      </section>
      <div className="fx-seg" role="group" aria-label="Domain">{(['trades', 'tech'] as Domain[]).map((d) => <button key={d} aria-pressed={domain === d} onClick={() => { setDomain(d); setRaw(null); setHot(null) }}>{d === 'trades' ? '⚡ Trades / field' : '₹ Tech / code'}</button>)}</div>
      {!allowed ? <Gate domain={domain} /> : <>
        <section className="fx-card">
          <span className="fx-kicker">1 · Evidence</span>
          <p className="fx-sub">{domain === 'trades' ? 'A photo you took of a real fault on site.' : 'A screenshot of a real failing trace, log or config (sanitised).'} Text-only posts are not accepted.</p>
          <label className="fx-file">📷 {raw ? `Replace · ${raw.name}` : domain === 'trades' ? 'Take or choose a photo' : 'Choose a screenshot'}<input type="file" accept="image/*" capture="environment" onChange={onFile} /></label>
          <button className="fx-btn ghost" onClick={recordVoice}>{recording ? '■ Stop (max 20 s)' : voiceNote ? '🎙 Re-record voice note' : '🎙 Add a 20 s voice note (any language, optional)'}</button>
          {voiceNote && <audio controls src={voiceNote} />}
        </section>
        {raw && <section className="fx-card">
          <span className="fx-kicker">2 · Mark it</span>
          <div className="fx-seg" role="group" aria-label="Tool">
            <button aria-pressed={tool === 'fault'} onClick={() => setTool('fault')}>◎ Mark the fault</button>
            <button aria-pressed={tool === 'blur'} onClick={() => setTool('blur')}>▒ Blur private stuff</button>
          </div>
          <div className="fx-mark" onClick={tapPhoto} style={{ aspectRatio: `${raw.img.naturalWidth} / ${raw.img.naturalHeight}` }}>
            <img src={photo} alt="Your capture" />
            {hot && <i className="fx-hotspot edit" style={{ left: `${hot.x}%`, top: `${hot.y}%`, width: `${hot.r * 2}%` }} />}
          </div>
          {hot && <label className="fx-slider"><span>Hotspot size</span><input type="range" min={5} max={30} value={hot.r} onChange={(e) => setHot({ ...hot, r: +e.target.value })} /></label>}
          {blurs.length > 0 && <button className="fx-btn ghost" onClick={() => setBlurs(blurs.slice(0, -1))}>Undo last blur</button>}
        </section>}
        {raw && <section className="fx-card fx-form">
          <span className="fx-kicker">3 · The rule and the wrong belief</span>
          <label>Card question<input value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} /></label>
          <label>What failed, and why (one sentence)<textarea rows={2} value={f.rule} onChange={(e) => setF({ ...f, rule: e.target.value })} placeholder="Two different MC4 brands were mated; the joint heated up under load and melted." /></label>
          <label>What juniors believe that causes this<input value={f.wrongBelief} onChange={(e) => setF({ ...f, wrongBelief: e.target.value })} placeholder="Any MC4 fits any MC4" /></label>
          <label>Shown after the answer (optional)<textarea rows={2} value={f.why} onChange={(e) => setF({ ...f, why: e.target.value })} placeholder="Only mate connectors of the same type, crimped with the right tool." /></label>
          <label>Skill<select value={f.concept} onChange={(e) => setF({ ...f, concept: e.target.value })}>{CONCEPTS[domain].map((c) => <option key={c} value={c}>{CONCEPT_NAMES[c] ?? c}</option>)}</select></label>
          <div className="fx-inputs three">
            <label>Your name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
            <label>Trade / role<input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} /></label>
            <label>City<input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></label>
          </div>
          {domain === 'trades' && <label className="fx-check"><input type="checkbox" checked={ack.isolated} onChange={(e) => setAck({ ...ack, isolated: e.target.checked })} /> The circuit was isolated and locked out before anyone touched it.</label>}
          <label className="fx-check"><input type="checkbox" checked={ack.hazard} onChange={(e) => setAck({ ...ack, hazard: e.target.checked })} /> This shows a hazard to spot, not a procedure to copy.</label>
          <label className="fx-check"><input type="checkbox" checked={ack.privacy} onChange={(e) => setAck({ ...ack, privacy: e.target.checked })} /> No faces, names, phone numbers or number plates are visible.</label>
        </section>}
        {raw && <section className="fx-card">
          <span className="fx-kicker">4 · Automated sieve · {v === 'block' ? 'blocked' : v === 'warn' ? 'passes with notes for reviewers' : 'clean'}</span>
          <ul className="fx-checks">{checks.map((c, i) => <li key={c.id + i} className={c.level}><b>{ICON[c.level]}</b><span><strong>{c.label}</strong> {c.detail}</span></li>)}</ul>
          <p className="fx-fine">Signals, not proof. Re-encoding the photo also strips location and camera data before it is stored.</p>
        </section>}
        {preview.length > 0 && <section className="fx-card">
          <span className="fx-kicker">5 · Play it before you submit</span>
          <div className="fx-preview">{preview.map((r) => <ReelView key={r.id + photo.length + hot!.x + hot!.r} reel={r} active={false} why="" combo={1} batt={0} onAnswer={() => {}} />)}</div>
          <p className="fx-sub">Your wrong-belief line also becomes a Cap-or-Fact card.</p>
        </section>}
        {error && <p className="fx-repair" role="alert">{error}</p>}
        {raw && <button className="fx-cta in" disabled={v === 'block'} onClick={submit}>{v === 'block' ? 'Fix the ✕ items to submit' : 'Send to 2-of-3 master review'}</button>}
      </>}
      <button className="fx-btn ghost" onClick={() => go('flux-queue')}>Open the verification queue →</button>
    </div>
  )
}
