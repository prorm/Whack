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
import solarLabel from '../../capable/summit.jpg'

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
  { title: 'Discover', detail: 'See what employers actually ask for.', href: '#/gps?intent=start' },
  { title: 'Learn', detail: 'Only the gap between you and the role.', href: '#/gps?intent=role' },
  { title: 'Practice', detail: 'Real work in CodeLab, DataLab and TradeLab.', href: '#/codelab' },
  { title: 'Prove', detail: 'Unseen tasks, graded by code, signed.', href: '#/sp-passport' },
  { title: 'Earn', detail: 'Jobs, internships and paid projects.', href: '#/exchange' },
]

const INTENTS = [
  { title: 'I don’t know where to start', href: '#/gps?intent=start' },
  { title: 'I want a specific job', href: '#/gps?intent=role' },
  { title: 'I already have skills', href: '#/gps?intent=skills' },
  { title: 'I want to switch careers', href: '#/gps?intent=switch' },
  { title: 'I want to start earning', href: '#/gps?intent=earn' },
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
        <h1>Learn the work.<br /><em>Prove the work.</em><br />Find opportunity.</h1>
        <p className="ln-lead">CAPABLE turns what employers actually need into a learning path, a workplace simulation and evidence you control, across software, data, energy and the trades.</p>
        <div className="ln-row">
          {done > 0 && nextL ? <a className="ln-btn primary big" href={`#/fl-lesson?id=${nextL.id}`}>Continue · Lesson {nextL.n}: {nextL.title} →</a>
            : <a className="ln-btn primary big" href="#/gps">Plan my path →</a>}
          {done > 0 && due > 0 ? <a className="hm-text-link" href="#/flux-reels">Revise · {due} due</a>
            : <a className="hm-text-link" href="#/demand">For organizations: describe the work</a>}
        </div>
      </div>
      <SolarLab />
    </section>

    <ol className="hm-steps" aria-label="The CAPABLE journey">
      {journey.map(({ title, detail, href }) => <li key={title}>
        <a href={href}><strong>{title}</strong><span>{detail}</span></a>
      </li>)}
    </ol>

    <section className="hm-gps" aria-labelledby="gps-h">
      <h2 id="gps-h">What do you want to achieve?</h2>
      <div className="hm-intents">{INTENTS.map((i) => <a key={i.href} href={i.href}>{i.title} <span aria-hidden="true">→</span></a>)}</div>
    </section>

    <section className="hm-labs" aria-labelledby="labs-h">
      <div className="hm-labs-head">
        <h2 id="labs-h">Hands-on labs</h2>
        <p className="ln-lead">Reusable workplace simulations. Practice is graded on your device; a verified run is re-graded on the server and signed into your Proof Passport.</p>
      </div>
      <div className="hm-labs-grid">
        <a className="hm-lab-entry" href="#/codelab">
          <img src="/media/labs/codelab.webp" alt="" loading="lazy" width="803" height="559" />
          <div><span className="hm-field">Software · CodeLab</span><h3>Fix a failing payment API</h3>
            <p>Read the incident log, repair the webhook handler and pass hidden tests in a server sandbox. Then write the incident report.</p>
            <span className="hm-lab-go">Open CodeLab <span aria-hidden="true">→</span></span></div>
        </a>
        <a className="hm-lab-entry" href="#/datalab">
          <img src="/media/labs/datalab.webp" alt="" loading="lazy" width="803" height="559" />
          <div><span className="hm-field">Data & operations · DataLab</span><h3>Reconcile a payout export</h3>
            <p>Find duplicates, reversals and amounts that don’t match the gateway, and hold back every row that must not be paid.</p>
            <span className="hm-lab-go">Open DataLab <span aria-hidden="true">→</span></span></div>
        </a>
        <a className="hm-lab-entry" href="#/capable">
          <img src="/media/labs/arena.webp" alt="" loading="lazy" width="803" height="559" />
          <div><span className="hm-field">Electrical · TradeLab</span><h3>Practical Arena</h3>
            <p>Find the fault in a dark lamp circuit. Measure with a multimeter, prove isolation, repair, then test under load.</p>
            <span className="hm-lab-go">Open the lab <span aria-hidden="true">→</span></span></div>
        </a>
        <a className="hm-lab-entry" href="#/capable-forge">
          <img className="is-label" src={solarLabel} alt="" loading="lazy" width="956" height="590" />
          <div><span className="hm-field">Solar · TradeLab</span><h3>Solar Forge</h3>
            <p>Read a solar nameplate, confirm each value, then size a string for a cold morning on an unseen work order.</p>
            <span className="hm-lab-go">Open the lab <span aria-hidden="true">→</span></span></div>
        </a>
        <a className="hm-lab-entry hm-lab-wide" href="#/ailab">
          <img src="/media/labs/aipair.webp" alt="" loading="lazy" width="803" height="559" />
          <div><span className="hm-field">Every field · AI Pair</span><h3>Catch the AI when it’s wrong</h3>
            <p>Brief an assistant without leaking secrets, spot the confident patch or diagnosis that is wrong, and prove it with a test or a meter reading.</p>
            <span className="hm-lab-go">Open AI Pair <span aria-hidden="true">→</span></span></div>
        </a>
      </div>
      <p className="ln-muted hm-honest">Educational simulations. Real electrical work still needs an in-person supervised check.</p>
    </section>

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
