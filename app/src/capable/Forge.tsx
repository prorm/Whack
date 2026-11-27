import { useEffect, useState } from 'react'
import { useDelivery } from '../Chrome'
import { useFlux } from '../flux/store'
import ridge from './ridge.jpg'
import ridgeCovered from './ridge-covered.jpg'
import summit from './summit.jpg'
import summitCovered from './summit-covered.jpg'
import { FIELDS, FIELD_IDS, LABELS, SOLAR_VERSION, gradeSolar, nextIntervention, observedProfile, readProfile, sampleObservations, solarVariant, voltage,
  type Confidence, type LabelId, type MentorTool, type Observations, type Prediction, type Profile, type SolarAnswer } from './solar'
import { base64, capableRequest, errorText, newSeed, normalizedPhoto, rememberReceipt, useLocal } from './client'
import { Mentor } from './Mentor'
import type { Receipt, SolarTicket } from './proof'

const PHOTOS = { ridge: [ridge, ridgeCovered], summit: [summit, summitCovered] }
const PREDICTIONS: Record<Prediction, string> = { rises: 'Voltage rises', same: 'It stays the same', falls: 'Voltage falls' }
const CONFIDENCE: Record<Confidence, string> = { guess: 'Guessing', unsure: 'Unsure', sure: 'Very sure' }
type SolarTrial = { ticket: SolarTicket; answer?: SolarAnswer; receipt?: Receipt }

export function Forge() {
  const [profile, setProfile] = useLocal<Profile | null>('capable:v2:solar-profile', null)
  const [trial, setTrial] = useLocal<SolarTrial | null>('capable:v2:solar-trial', null)
  const [source, setSource] = useState<LabelId>('ridge')
  const [covered, setCovered] = useState(false)
  const [fileUrl, setFileUrl] = useState('')
  const [observations, setObservations] = useState<Observations>(() => sampleObservations('ridge', false))
  const [sourceLabel, setSourceLabel] = useState('Prepared sample')
  const [edits, setEdits] = useState<Partial<Record<keyof Profile, string>>>({})
  const [focused, setFocused] = useState<keyof Profile | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [stage, setStage] = useState<'source' | 'lab' | 'challenge'>(() => trial ? 'challenge' : 'source')
  const { online } = useDelivery()
  const photo = fileUrl || PHOTOS[source][covered ? 1 : 0]!
  const proposed = readProfile(Object.fromEntries(FIELD_IDS.map((key) => [key, (edits[key] ?? String(observations[key].value ?? '')).trim() !== ''
    ? Number(edits[key] ?? observations[key].value) : NaN])))
  const box = focused && observations[focused].box

  function fixture(next: LabelId, hide: boolean) {
    setSource(next); setCovered(hide); setFileUrl(''); setObservations(sampleObservations(next, hide)); setSourceLabel('Prepared sample'); setEdits({}); setMessage('')
  }
  async function upload(file: File | undefined) {
    if (!file) return
    setBusy(true); setMessage('')
    try {
      setFileUrl(await normalizedPhoto(file)); setSourceLabel('Uploaded photo')
      setObservations(Object.fromEntries(FIELD_IDS.map((field) => [field, { value: null, unit: FIELDS[field].unit, evidence: '' }])) as Observations); setEdits({})
    } catch (error) { setMessage(errorText(error)) }
    finally { setBusy(false) }
  }
  async function scan() {
    setBusy(true); setMessage(''); setEdits({})
    try {
      const data = fileUrl ? fileUrl.split(',')[1]! : await base64(await (await fetch(photo)).blob())
      const result = await capableRequest<{ observations: Observations; model: string }>('lens', { media: { mimeType: 'image/jpeg', data } })
      setObservations(result.observations); setSourceLabel('Live · Robotics ER 2')
      setMessage(observedProfile(result.observations) ? 'Review the three values against the image before opening the lab.' : 'A field is missing or uncertain. Reveal it, upload a clearer photo, or enter the visible value yourself.')
    } catch (error) { setMessage(`${errorText(error)} You can review the sample or enter values from the photo.`) }
    finally { setBusy(false) }
  }
  async function challenge(verified: boolean) {
    if (!profile) return
    setBusy(true); setMessage('')
    try {
      const ticket = verified ? await capableRequest<SolarTicket>('start', { kind: 'solar', profile }) : { id: null, seed: newSeed(), version: SOLAR_VERSION, profile }
      setTrial({ ticket }); setStage('challenge')
    } catch (error) { setMessage(`${errorText(error)} An offline practice challenge is available.`) }
    finally { setBusy(false) }
  }
  useEffect(() => { window.scrollTo(0, 0) }, [stage])

  if (stage === 'challenge' && trial) return <SolarChallenge key={trial.ticket.seed} trial={trial} onTrial={setTrial} onRetry={() => void challenge(Boolean(trial.ticket.id && online))} onBack={() => setStage(profile ? 'lab' : 'source')} busy={busy} notice={message} />
  if (stage === 'lab' && profile) return <>
    <div className="c2-intro"><div><h1>Cold-morning solar lab</h1><p>Keep the number of modules fixed. See how changing cell temperature moves string voltage against the inverter limit.</p></div><button className="c2-secondary" onClick={() => setStage('source')}>Back to Lens</button></div>
    <SolarLab profile={profile} />
    <section className="c2-challenge-entry"><div><h2>Unseen work order</h2><p>Apply the same rule at a colder site with a fresh constraint.</p></div><div className="c2-actions">
      <button className="c2-secondary" disabled={busy} onClick={() => void challenge(false)}>Practice offline</button>
      <button className="c2-primary" disabled={busy || !online} onClick={() => void challenge(true)}>{busy ? 'Opening…' : 'Start verified work order'}</button></div></section>
    {message && <p className="c2-notice" role="status">{message}</p>}
  </>
  return <>
    <div className="c2-intro"><div><h1>Solar Forge</h1><p>Read an equipment label, confirm the evidence, and turn it into an interactive solar lab.</p></div>
      {trial && <button className="c2-secondary" onClick={() => setStage('challenge')}>Resume work order</button>}
    </div>
    <div className="c2-forge-grid">
      <section className="c2-source" aria-label="Nameplate source">
        <div className="c2-source-toolbar"><div className="c2-segment" aria-label="Prepared labels">{(Object.keys(LABELS) as LabelId[]).map((id) => <button key={id} disabled={busy} aria-pressed={!fileUrl && source === id} onClick={() => fixture(id, covered)}>{LABELS[id].title}</button>)}</div>
          <label className="c2-check"><input type="checkbox" checked={covered && !fileUrl} disabled={busy || Boolean(fileUrl)} onChange={(event) => fixture(source, event.target.checked)} /> Cover one value</label></div>
        <div className="c2-photo"><img src={photo} alt={fileUrl ? 'Uploaded equipment label' : `${LABELS[source].title} fictional training label${covered ? ' with maximum input voltage covered' : ''}`} />
          {box && <span className="c2-bbox" aria-hidden="true" style={{ top: `${box[0] / 10}%`, left: `${box[1] / 10}%`, height: `${(box[2] - box[0]) / 10}%`, width: `${(box[3] - box[1]) / 10}%` }} />}
        </div>
        <div className="c2-source-toolbar c2-source-bottom">
          <label className="c2-file">Upload a label<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = '' }} /></label>
          <button className="c2-primary" disabled={busy || !online} onClick={() => void scan()}>{busy ? 'Reading…' : 'Scan with Robotics ER 2'}</button>
        </div>
      </section>
      <section className="c2-review" aria-label="Confirm label readings">
        <div className="c2-section-heading"><h2>Confirm readings</h2><span className="c2-small">{sourceLabel}</span></div>
        {FIELD_IDS.map((key) => <label className="c2-field" key={key}>
          <span>{FIELDS[key].label}</span>
          <div><input type="number" step="any" min={FIELDS[key].min} max={FIELDS[key].max} placeholder="Unconfirmed" disabled={busy}
            value={edits[key] ?? observations[key].value ?? ''} onFocus={() => setFocused(key)} onBlur={() => setFocused(null)} onChange={(event) => setEdits({ ...edits, [key]: event.target.value })} /><b>{FIELDS[key].unit}</b></div>
          <small>{observations[key].evidence ? `Observed: ${observations[key].evidence}` : 'No readable evidence for this field.'}</small>
        </label>)}
        <p className="c2-small">Confirm the numbers and units against the image. These parameters drive an educational simulation.</p>
        <button className="c2-primary" disabled={busy || !proposed} onClick={() => { if (proposed) { setProfile(proposed); setStage('lab'); setMessage('') } }}>Confirm and open lab</button>
        {message && <p className="c2-notice" role="status">{message}</p>}
      </section>
    </div>
  </>
}

function SolarLab({ profile }: { profile: Profile }) {
  const flux = useFlux()
  const [count, setCount] = useState(() => Math.min(16, Math.floor(profile.maxInputVoltage / profile.moduleVoc)))
  const [temp, setTemp] = useState(25)
  const [answer, setAnswer] = useState<Prediction | ''>('')
  const [confidence, setConfidence] = useState<Confidence>('unsure')
  const [intervention, setIntervention] = useState<ReturnType<typeof nextIntervention> | null>(null)
  const [reel, setReel] = useState(0)
  const [recall, setRecall] = useState('')
  const current = voltage(profile, count, temp)
  const ceiling = profile.maxInputVoltage
  const exceeds = current > ceiling + 1e-9
  const compare = (tool: MentorTool) => { if (tool === 'compare-cold') setTemp(-10); if (tool === 'compare-warm') setTemp(40) }
  function predict() {
    if (!answer) return
    const correct = answer === 'rises'
    flux.placeBet({ episode: 'capable-forge', choice: answer, confidence: confidence === 'sure' ? 1 : confidence === 'unsure' ? .5 : .2, correct, at: Date.now() })
    flux.grade('cold', correct)
    setIntervention(nextIntervention(answer, confidence)); setReel(0); setRecall('')
  }
  return <>
    <div className="c2-lab-grid">
      <section className="c2-lab" aria-label="Solar simulator">
        <div className="c2-section-heading"><h2>String voltage</h2><span className="c2-small">Limit {ceiling} V</span></div>
        <div className="c2-pv-array" aria-label={`${count} solar modules`}>{Array.from({ length: count }, (_, i) => <span key={i} aria-hidden="true" />)}</div>
        <div className="c2-voltage"><strong>{current.toFixed(1)} <small>V</small></strong><span className={exceeds ? 'c2-exceeded' : ''}>{exceeds ? 'Above limit' : 'Within limit'}</span></div>
        <div className="c2-scale" aria-hidden="true"><span style={{ width: `${Math.min(100, current / ceiling * 80)}%` }} /><i /></div>
        <div className="c2-sliders">
          <label>Cell temperature <output>{temp}°C</output><input type="range" min="-25" max="65" value={temp} onChange={(event) => setTemp(Number(event.target.value))} /></label>
          <label>Module count <output>{count}</output><input type="range" min="1" max="20" value={count} onChange={(event) => setCount(Number(event.target.value))} /></label>
        </div>
      </section>
      <section className="c2-review" aria-label="FLUX prediction">
        <h2>Make a prediction</h2><p>What happens to the open-circuit voltage as the cells get colder?</p>
        <fieldset><legend>Your prediction</legend>{(Object.keys(PREDICTIONS) as Prediction[]).map((choice) => <label className="c2-check" key={choice}><input name="forecast" type="radio" checked={answer === choice} onChange={() => setAnswer(choice)} /> {PREDICTIONS[choice]}</label>)}</fieldset>
        <label className="c2-field"><span>How confident are you?</span><select value={confidence} onChange={(event) => setConfidence(event.target.value as Confidence)}>{Object.entries(CONFIDENCE).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button className="c2-primary" disabled={!answer} onClick={predict}>Check prediction</button>
        {intervention && <div className="c2-flux" aria-live="polite">
          <div className="c2-section-heading"><h3>{intervention === 'contrast' ? 'FLUX · Contrast reel' : intervention === 'worked-example' ? 'FLUX · Worked example' : intervention === 'retrieval' ? 'FLUX · Retrieval reel' : 'FLUX · Transfer ready'}</h3></div>
          {reel === 0 && <><p>{intervention === 'contrast' ? 'You predicted a different direction with high confidence. Compare one string at two temperatures.' : intervention === 'worked-example' ? 'Start with the same module count and compare the two readings.' : 'Try recalling the direction before moving on.'}</p>
            <button className="c2-secondary" onClick={() => { setTemp(-10); setReel(1) }}>Compare 25°C and −10°C</button></>}
          {reel === 1 && <><p>Same string · {voltage(profile, count, 25).toFixed(1)} V at 25°C → {voltage(profile, count, -10).toFixed(1)} V at −10°C.</p><button className="c2-secondary" onClick={() => setReel(2)}>Try a recall check</button></>}
          {reel === 2 && <><p>Which direction does Voc move when the same modules warm up?</p><div className="c2-actions">{(['Rises', 'Falls'] as const).map((choice) => <button className="c2-secondary" key={choice} onClick={() => { setRecall(choice === 'Falls' ? 'Correct. Your retrieval attempt was saved to FLUX.' : 'Try again. Look at the comparison and reverse the temperature change.'); if (!recall.startsWith('Correct')) flux.grade('cold', choice === 'Falls') }}>{choice}</button>)}</div>{recall && <small>{recall}</small>}</>}
        </div>}
      </section>
    </div>
    <Mentor onTool={compare} />
  </>
}

function SolarChallenge({ trial, onTrial, onRetry, onBack, busy: starting, notice }: { trial: SolarTrial; onTrial: (trial: SolarTrial) => void; onRetry: () => void; onBack: () => void; busy: boolean; notice: string }) {
  const { online } = useDelivery()
  const [count, setCount] = useState(String(trial.answer?.panels ?? ''))
  const [proposal, setProposal] = useState<SolarAnswer['proposal'] | ''>(trial.answer?.proposal ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const { ticket, receipt } = trial
  const test = solarVariant(ticket.profile, ticket.seed)
  const grade = trial.answer ? gradeSolar(ticket.profile, ticket.seed, trial.answer) : null
  const value = Number(count)
  const available = !!proposal && Number.isSafeInteger(value) && value >= 1 && value <= 120

  async function submit() {
    if (!available || !proposal) return
    const answer = trial.answer ?? { panels: value, proposal }
    const pending = { ...trial, answer }
    onTrial(pending)
    if (!ticket.id) return
    if (!online) { setMessage('Answer saved on this device. Reconnect to get a signed receipt.'); return }
    setBusy(true); setMessage('')
    try {
      const receipt = await capableRequest<Receipt>('grade', { id: ticket.id, answer })
      rememberReceipt(receipt); onTrial({ ...pending, receipt })
    }
    catch (error) { setMessage(`${errorText(error)} Your answer is available for retry.`) }
    finally { setBusy(false) }
  }

  return <>
    <div className="c2-intro"><div><h1>Unseen work order</h1><p>{test.change}</p></div><button className="c2-secondary" onClick={onBack}>Back to lab</button></div>
    <div className="c2-challenge-grid">
      <section className="c2-review"><h2>Site and equipment</h2><dl className="c2-specs">
        <div><dt>Coldest cell temperature</dt><dd>{test.temp}°C</dd></div><div><dt>Inverter maximum input</dt><dd>{test.ceiling} V</dd></div>
        <div><dt>Module Voc at 25°C</dt><dd>{ticket.profile.moduleVoc} V</dd></div><div><dt>Voc temperature coefficient</dt><dd>{ticket.profile.betaVoc} %/°C</dd></div>
      </dl><p className="c2-small">{ticket.id ? 'Server-issued variant · Can be completed offline' : 'Practice variant'} · Use unrounded values to make your decision.</p></section>
      <section className="c2-review"><h2>Submit your decision</h2>
        <label className="c2-field"><span>Maximum modules within the voltage limit</span><input inputMode="numeric" type="number" step="1" min="1" max="120" value={count} disabled={Boolean(trial.answer) || busy} onChange={(e) => setCount(e.target.value)} /></label>
        <label className="c2-field"><span>A coworker proposes {test.proposed} modules</span><select disabled={Boolean(trial.answer) || busy} value={proposal} onChange={(e) => setProposal(e.target.value as SolarAnswer['proposal'])}><option value="">Choose an outcome</option><option value="within">Within the voltage limit</option><option value="exceeds">Exceeds the voltage limit</option></select></label>
        <div className="c2-actions">{(!trial.answer || (ticket.id && !receipt)) && <button className="c2-primary" disabled={busy || !available} onClick={() => void submit()}>{busy ? 'Verifying…' : trial.answer ? 'Verify saved answer' : 'Submit work order'}</button>}
          {trial.answer && <button className="c2-secondary" disabled={busy || starting} onClick={onRetry}>Try a new variant</button>}
          {receipt && <a className="c2-primary" href="#/capable-proof">Open Proof Passport</a>}</div>
        {grade && <p className="c2-notice" role="status">{receipt ? 'Server regraded' : 'Local grade'} · {grade.passed ? 'Passed' : 'Try another variant'}. Panel count {grade.panelCount ? 'correct' : 'incorrect'}. Proposal check {grade.decision ? 'correct' : 'incorrect'}.</p>}
        {(message || notice) && <p className="c2-notice" role="status">{message || notice}</p>}
      </section>
    </div>
  </>
}
