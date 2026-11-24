import { useState } from 'react'
import { statusOf } from '../passport'
import { usePassport } from '../passportStore'
import { vocAt } from '../physics'
import { useFlux } from '../store'
import { INVERTER, LESSONS, PANEL } from './course'
import { useCourse } from './courseStore'
import { TRACKS, type Field } from './catalog'
import './learn.css'
import './home.css'

const LAB_MIN_TEMP = 4
const LAB_MAX_TEMP = 45
const LAB_PANELS = 12
const METER_MIN_VOLTS = 540
const METER_MAX_VOLTS = 640
const meterPosition = (volts: number) => 100 * (volts - METER_MIN_VOLTS) / (METER_MAX_VOLTS - METER_MIN_VOLTS)

function SolarLab() {
  const [temperature, setTemperature] = useState(LAB_MAX_TEMP)
  const voltage = LAB_PANELS * vocAt(PANEL, temperature)
  const overLimit = voltage > INVERTER.vmax
  return <section className={`hm-lab${overLimit ? ' is-tripped' : ''}`} aria-labelledby="hm-lab-title">
    <div className="hm-lab-scene">
      <img className="hm-lab-image" src="/media/flux/dawn.webp" alt="" fetchPriority="high" />
      <h2 id="hm-lab-title">The cold morning fault</h2>
      <div className="hm-lab-reading">
        <div className="hm-lab-metrics">
          <p><span>String voltage</span><strong>{voltage.toFixed(1)} <small>V</small></strong></p>
          <span className="hm-lab-status" role="status">{overLimit ? 'Inverter trips' : 'Below limit'}</span>
        </div>
        <div className="hm-lab-meter" aria-hidden="true">
          <span className="hm-lab-fill" style={{ width: `${meterPosition(voltage)}%` }} />
          <span className="hm-lab-limit" style={{ left: `${meterPosition(INVERTER.vmax)}%` }} />
        </div>
        <p className="hm-lab-spec"><span>{LAB_PANELS} panels in series</span><span>{INVERTER.vmax} V inverter limit</span></p>
      </div>
    </div>
    <div className="hm-lab-controls">
      <label className="hm-lab-slider">
        <span>Cell temperature</span>
        <span className="hm-lab-temperature" aria-hidden="true">{temperature} °C</span>
        <input type="range" min={LAB_MIN_TEMP} max={LAB_MAX_TEMP} value={temperature}
          aria-valuetext={`${temperature} degrees Celsius, ${voltage.toFixed(1)} volts across the string`} aria-describedby="hm-lab-hint"
          onChange={(e) => setTemperature(e.target.valueAsNumber)} />
      </label>
      <div className="hm-lab-footer">
        <p id="hm-lab-hint">Cool the panels. Watch what happens.</p>
        <a href="#/fl-lesson?id=l3">Open full lesson <span aria-hidden="true">→</span></a>
      </div>
    </div>
  </section>
}

const journey = [
  { title: 'Learn', detail: 'Experiment with real work scenarios.', href: '#/fl-course' },
  { title: 'Revise', detail: 'Revisit what you missed in short reels.', href: '#/flux-reels' },
  { title: 'Prove', detail: 'Solve a new task and keep the evidence.', href: '#/sp-passport' },
  { title: 'Connect', detail: 'Share your work for roles that need it.', href: '#/sp-jobs' },
]

export function Home() {
  const course = useCourse()
  const pp = usePassport()
  const { s: fx, now } = useFlux()
  const [field, setField] = useState<Field | 'All'>('All')
  const done = LESSONS.filter((l) => course.s.done[l.id]).length
  const nextL = LESSONS.find((l) => !course.s.done[l.id])
  const due = Object.values(fx.memory.cards).filter((c) => now() >= c.dueAt).length
  const proven = (ids: Parameters<typeof statusOf>[1][]) => ids.filter((c) => statusOf(pp.s.records, c).state === 'evidenced').length
  const tracks = TRACKS.filter((t) => field === 'All' || t.field === field)
  return <div className="ln-map hm">
    <section className="hm-hero">
      <div className="hm-copy">
        <h1>Build skills.<br /><em>Prove you can<br className="hm-title-break" /> do the work.</em></h1>
        <p className="ln-lead">Practice real work in interactive labs, revisit what you learn in short reels, and build a Proof Passport employers can inspect.</p>
        <div className="ln-row">
          {done > 0 && nextL ? <a className="ln-btn primary big" href={`#/fl-lesson?id=${nextL.id}`}>Continue · Lesson {nextL.n}: {nextL.title} →</a>
            : <button className="ln-btn primary big" onClick={() => document.getElementById('careers-h')?.focus()}>Explore career tracks →</button>}
          {done > 0 && due > 0 && <a className="hm-text-link" href="#/flux-reels">Revise · {due} due</a>}
        </div>
      </div>
      <SolarLab />
    </section>

    <ol className="hm-steps" aria-label="The ScrollProof journey">
      {journey.map(({ title, detail, href }) => <li key={title}>
        <a href={href}><strong>{title}</strong><span>{detail}</span></a>
      </li>)}
    </ol>

    <section id="careers" className="hm-careers" aria-labelledby="careers-h">
      <div className="hm-head">
        <h2 id="careers-h" tabIndex={-1}>What work do you want to learn?</h2>
        <div className="hm-filter" role="group" aria-label="Filter by field">{(['All', 'Trades', 'Tech', 'Operations'] as const).map((f) =>
          <button key={f} aria-pressed={field === f} onClick={() => setField(f)}>{f}</button>)}</div>
      </div>
      <div className="hm-grid">
        {tracks.map((t) => {
          const p = proven(t.proofs)
          const prog = t.id === 'solar' ? `${done}/${LESSONS.length} lessons` : ''
          return <article key={t.id} className={`hm-card ${t.level}`} style={{ ['--mood' as string]: t.mood }}>
            <div className="hm-art">{t.img ? <img src={t.img} alt="" loading="lazy" /> : <div className="hm-art-fallback" aria-hidden="true"><b>₹</b><i /><i /><i /></div>}
              <span className={`hm-depth ${t.level}`}>{t.depth}</span></div>
            <div className="hm-body">
              <span className="hm-field">{t.field} · {t.from}</span>
              <h3>{t.title}</h3>
              <ul>{t.learn.map((l) => <li key={l}>{l}</li>)}</ul>
              <div className="hm-meta">
                <span>{t.pay}</span>
                {t.proofs.length > 0 && <span className="hm-proof">{p}/{t.proofs.length} skills proven</span>}
                {prog && <span className="hm-proof">{prog}</span>}
              </div>
              <div className="ln-row">
                <a className="ln-btn primary" href={t.start}>{t.level === 'course' ? (done ? 'Continue course' : 'Start the course') : t.level === 'episode' ? 'Play the lesson' : 'Open the path'} →</a>
                {t.job && <a className="ln-btn" href={`#/sp-job?id=${t.job}`}>See the role</a>}
              </div>
            </div>
          </article>
        })}
      </div>
      <p className="ln-muted hm-honest">Solar is a full course. EV and payments each have a lesson and an assessment. Inventory and dispatch are work-sample paths. Listings and pay are illustrative.</p>
    </section>

    <section className="hm-proofband">
      <div>
        <h2>Open the work behind the skill.</h2>
        <p className="ln-lead">Your Proof Passport keeps the task, your answers, how they were graded, and any trainer review. You choose who sees each record and can revoke access.</p>
        <p className="ln-muted">AI helps create lesson media. FLUX grades work against explicit rules.</p>
        <a className="ln-btn" href="#/sp-passport">Open my Proof Passport →</a>
      </div>
      <ol className="hm-levels">
        <li><b>Practice</b><span>lessons, reels, streaks · never shown as a skill</span></li>
        <li className="g"><b>System-assessed</b><span>an unseen task graded by code</span></li>
        <li className="y"><b>Trainer-reviewed</b><span>a trainer checked this exact attempt</span></li>
        <li className="off"><b>Identity-verified</b><span>not available yet, and we say so</span></li>
      </ol>
    </section>

    <section className="hm-doors">
      <a href="#/sp-teach" className="hm-door"><span className="ln-kick">Experienced worker?</span><b>Turn the mistake you made on site into the lesson that saves an apprentice.</b><small>Upload a Field Scar → safety check → two master reviews → it goes live with your name on it.</small></a>
      <a href="#/sp-employer" className="hm-door"><span className="ln-kick">Hiring? (DEMO)</span><b>Post the skills the work needs. See candidates who proved them.</b><small>Inspect the actual answers, shortlist, invite to a supervised practical.</small></a>
    </section>
  </div>
}
