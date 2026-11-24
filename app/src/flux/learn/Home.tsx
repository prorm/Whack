// The ScrollProof homepage: what it is, a live lesson preview, every career track (and how deep each one is today),
// how the journey works, and the doors for experienced workers and employers.
import { useEffect, useState } from 'react'
import { statusOf } from '../passport'
import { usePassport } from '../passportStore'
import { useFlux } from '../store'
import { LESSONS } from './course'
import { useCourse } from './courseStore'
import { TRACKS, type Field } from './catalog'
import { Thermo } from './scenes'
import './learn.css'

/** The hero's live lesson: the thermometer sweeps on its own, like a learner dragging it. */
function LivePreview() {
  const [t, setT] = useState(8)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let k = 0
    const id = setInterval(() => { k += 1; setT(Math.round(26 + 30 * Math.cos(k / 18))) }, 120)
    return () => clearInterval(id)
  }, [])
  return <div className="hm-preview" aria-label="A live FLUX Learn lesson: cooling a solar panel raises its voltage until a 12-panel string trips the inverter">
    <div className="ln-stage hm-stage" style={{ ['--mood' as string]: '#22c8f0' }}>
      <div className="ln-bg" aria-hidden="true"><i className="ln-floor" /></div>
      <div className="ln-chip left"><i />03 <b>Cold makes volts</b></div>
      <div className="ln-scene hm-scene"><Thermo t={t} /></div>
      <p className="ln-caption"><span>Drag</span> <span>the</span> <span className="on">thermometer.</span> <span>Watch</span> <span>the</span> <span>string.</span></p>
    </div>
    <p className="hm-preview-note">A real lesson, running live. Every number is computed by tested code.</p>
  </div>
}

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
        <p className="ln-kick">Upskilling for real work · free for learners</p>
        <h1>Learn by doing.<br /><span className="hm-y">Remember</span> by scrolling.<br />Get hired through <span className="hm-g">proof</span>.</h1>
        <p className="ln-lead">Hands-on, narrated lessons that start from absolute basics. Short reels that bring it back before you forget. Unseen tasks that prove you can do the work, and employers who see exactly what you proved.</p>
        <div className="ln-row">
          {done > 0 && nextL ? <a className="ln-btn primary big" href={`#/fl-lesson?id=${nextL.id}`}>Continue · Lesson {nextL.n}: {nextL.title} →</a>
            : <button className="ln-btn primary big" onClick={() => document.getElementById('careers')?.scrollIntoView({ behavior: 'smooth' })}>Choose a career →</button>}
          {done > 0 ? <a className="ln-btn big" href="#/flux-reels">Revise{due ? ` · ${due} due` : ''}</a> : <a className="ln-btn big" href="#/fl-lesson?id=l1">Try lesson 1 free</a>}
        </div>
        <ul className="hm-facts">
          <li><b>5</b> career tracks</li><li><b>0</b> AI calls while you learn</li><li><b>Offline</b> once loaded</li>{due > 0 && <li><a href="#/flux-reels"><b>{due}</b> reels due</a></li>}
        </ul>
      </div>
      <LivePreview />
    </section>

    <section className="hm-steps" aria-label="How it works">
      {[
        ['01', 'Learn', 'Narrated lessons you take part in: predict, experiment with live sliders, see the rule appear, practise on fresh problems.', '#FFD43B'],
        ['02', 'Revise', 'Short reels for what you already learned, on a 1 · 3 · 7 · 21-day rhythm. Misses come back first.', '#5ce1ff'],
        ['03', 'Prove', 'A task you have never seen, and a real project. Graded by code, kept in your Proof Passport.', '#3ddc97'],
        ['04', 'Get hired', 'Employers see the exact skills you proved, only if you share them. Hazardous trades start supervised.', '#9b6bff'],
      ].map(([n, t, d, c]) => <div key={n} className="hm-step" style={{ ['--c' as string]: c }}><span>{n}</span><h3>{t}</h3><p>{d}</p></div>)}
    </section>

    <section id="careers" className="hm-careers" aria-labelledby="careers-h">
      <div className="hm-head">
        <div><p className="ln-kick">Choose a career</p><h2 id="careers-h">Five tracks. Start from zero in any of them.</h2></div>
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
      <p className="ln-muted hm-honest">Depth today, said plainly: one full course (solar), two story lessons with unseen proof tasks (EV, payments), and two work-sample paths (inventory, dispatch). Every listing and pay figure is DEMO / illustrative.</p>
    </section>

    <section className="hm-proofband">
      <div>
        <p className="ln-kick">Proof, not certificates</p>
        <h2>Watching never earns anything here.</h2>
        <p className="ln-lead">Only a graded attempt counts: the exact task, its version, your answers, the mistake the code named, and whether a trainer reviewed it. You choose who sees it, and you can take it back.</p>
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
