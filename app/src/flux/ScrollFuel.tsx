// Scroll Fuel home (#/flux-fuel): the tank, the doomscroll-to-proof mirror, a safe in-app simulator, and the
// browser extension's settings when this page runs inside it.
import { useEffect, useRef, useState } from 'react'
import { go } from '../router'
import { CONCEPT_NAMES } from './Episode'
import { GATED_SITES, MIN, RULES, drain, stats } from './fuel'
import { inExtension, useExtensionState, useFuel } from './fuelStore'
import { APP_LABEL, Tollbooth } from './Gate'
import { sfx } from './fx'

const fmt = (ms: number) => `${Math.floor(ms / MIN)}:${String(Math.floor((ms % MIN) / 1000)).padStart(2, '0')}`
const POSTS = [
  ['#ff6b6b', 'Street food in 15 seconds'], ['#4dabf7', 'Cricket: the last over'], ['#ffd43b', 'Dog vs. cucumber'], ['#69db7c', 'Bike mod you won\'t believe'],
  ['#da77f2', 'Lo-fi beats to procrastinate to'], ['#ff922b', 'Comedy skit #412'], ['#38d9a9', 'Monsoon timelapse'], ['#f783ac', 'Dance trend, again'],
  ['#74c0fc', 'Phone unboxing'], ['#ffa94d', 'Movie recap in 60s'], ['#8ce99a', 'Gym fail compilation'], ['#e599f7', 'Another dance trend'],
]

function Tank({ ms, big }: { ms: number; big?: boolean }) {
  const pct = Math.min(1, ms / (RULES.tankMax * MIN))
  return <div className={`fx-tank ${big ? 'big' : ''} ${ms <= 0 ? 'empty' : ms < 2 * MIN ? 'low' : ''}`} role="img" aria-label={`Scroll Fuel ${fmt(ms)} left`}><i style={{ height: `${Math.max(3, pct * 100)}%` }} /><b>{fmt(ms)}</b></div>
}

/** A generic, clearly simulated short-video feed. It imitates no real app. */
function Simulator() {
  const { fuel, setTank, add } = useFuel()
  const [speed, setSpeed] = useState(60)
  const [toll, setToll] = useState(false)
  const [idx, setIdx] = useState(0)
  const [swipes, setSwipes] = useState(0)
  const local = useRef({ tankMs: fuel.tankMs, lastDrainAt: Date.now() })
  const [tank, setLocal] = useState(fuel.tankMs)
  useEffect(() => {
    if (toll) return
    local.current = { tankMs: fuel.tankMs, lastDrainAt: Date.now() }
    const t = setInterval(() => {
      const visible = document.visibilityState === 'visible'
      const now = Date.now()
      const next = drain({ ...local.current, escapes: [], log: [] }, now, visible)
      const used = (local.current.tankMs - next.tankMs) * (speed - 1)
      local.current = { tankMs: Math.max(0, next.tankMs - used), lastDrainAt: now }
      setLocal(local.current.tankMs)
      if (local.current.tankMs <= 0) { setTank(0); setToll(true); sfx('buzz', 0.4) }
    }, 250)
    return () => { clearInterval(t); setTank(local.current.tankMs) }
  }, [toll, speed]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="fx-sim">
      <div className="fx-sim-head">
        <div><p className="fx-kicker">Try it here · simulated feed</p><h2>Scroll. When the tank hits zero, the toll slides in.</h2></div>
        <div className="fx-seg" role="group" aria-label="Demo speed">{[1, 60].map((s) => <button key={s} aria-pressed={speed === s} onClick={() => setSpeed(s)}>{s === 1 ? 'Real time' : 'Demo ×60'}</button>)}</div>
      </div>
      <div className="fx-phone">
        <div className="fx-phone-bar"><span>Any short-video app (SIMULATED)</span><span className="fx-phone-fuel">⛽ {fmt(toll ? 0 : tank)} <Tank ms={toll ? 0 : tank} /></span></div>
        <div className="fx-sim-feed" onScroll={(e) => { const i = Math.round(e.currentTarget.scrollTop / e.currentTarget.clientHeight); if (i !== idx) { setIdx(i); setSwipes(swipes + 1) } }}>
          {POSTS.concat(POSTS).map(([c, t], i) => <div key={i} className="fx-sim-post" style={{ background: `linear-gradient(160deg, ${c}, #111 85%)` }}><b>{t}</b><span>@random_creator_{(i * 37) % 97} · {i + 1}/24</span></div>)}
        </div>
        {toll && <div className="fx-sim-toll"><Tollbooth app="sim" swipes={swipes} onDone={(m) => { add(m); setSwipes(0); setToll(false) }} /></div>}
      </div>
      <p className="fx-fine">You land back on post {idx + 1}, where you left off. Demo ×60 drains one minute of fuel per second.</p>
    </section>
  )
}

export function FuelPage() {
  const { fuel, reset } = useFuel()
  const [armed, setArmed] = useState(false)
  const { ext, setEnabled, setTank } = useExtensionState()
  const now = Date.now()
  const month = new Date(now); month.setDate(1); month.setHours(0, 0, 0, 0)
  const st = stats(fuel, month.getTime(), now + 1)
  return (
    <div className="fx-hub fx-fuel">
      <header className="fx-top"><button className="fx-back" onClick={() => go('flux')} aria-label="Back to FLUX">←</button><span className="fx-logo"><b>FLUX</b><i>scroll fuel</i></span></header>
      <section className="fx-hero">
        <p className="fx-kicker">The toll on a doomscroll is one 8-second card</p>
        <h1>Keep scrolling.<br /><span>Pay in recall.</span></h1>
        <p className="fx-sub">Pick the apps to gate. Solving one due FLUX card adds {RULES.firstTry} minutes of Scroll Fuel. When the tank empties, a tollbooth slides over the feed: one thumb tap, then you're back on the exact video you were watching.</p>
      </section>

      <section className="fx-fuel-stats">
        <Tank ms={ext ? ext.fuelMs : fuel.tankMs} big />
        <div>
          <p className="fx-kicker">This month · practice mirror, not a credential</p>
          <h2>{st.breaks ? <>You turned <b>{st.breaks}</b> scroll breaks into <b>{st.recalls}</b> recalls.</> : 'No tolls paid yet this month.'}</h2>
          {st.breaks > 0 && <p className="fx-sub">{Math.round(st.firstTryRate * 100)}% right on the first try · {st.minutesEarned} min earned · {Object.entries(st.byApp).map(([a, n]) => `${APP_LABEL[a] ?? a} ${n}`).join(' · ')}</p>}
          {st.concepts.length > 0 && <div className="fx-prov static">{st.concepts.slice(0, 4).map((c) => <span key={c.concept} className="fx-badge lab">{CONCEPT_NAMES[c.concept] ?? c.concept} · {c.ok}/{c.n}</span>)}</div>}
        </div>
      </section>

      <section className="fx-card fx-rules">
        <h2>The rules</h2>
        <ul>
          <li><b>+{RULES.firstTry} min</b> for a first-try correct card. Sponsored live problems pay <b>+{RULES.bounty}</b>.</li>
          <li><b>No mashing.</b> Options unlock after {RULES.lookMs / 1000}s. A miss shows the explanation for {RULES.explainMs / 1000}s, then one follow-up card for <b>+{RULES.followUp}</b>. The missed skill comes back as a REMATCH next session.</li>
          <li><b>Never trapped.</b> A free {RULES.escapeMin}-minute DM break once an hour, and after {RULES.maxCardsPerToll} cards the toll lets you through anyway.</li>
          <li>The tank caps at {RULES.tankMax} minutes and drains only while a gated app is on screen.</li>
        </ul>
      </section>

      <Simulator />

      <section className="fx-card">
        <p className="fx-kicker">Gate the real thing · Chrome / Edge extension</p>
        {inExtension && ext ? <>
          <h2>Gated on this browser</h2>
          {GATED_SITES.map((g) => <label key={g.id} className="fx-check"><input type="checkbox" checked={ext.enabled.includes(g.id)} onChange={(e) => setEnabled(e.target.checked ? [...ext.enabled, g.id] : ext.enabled.filter((x) => x !== g.id))} /> {g.label}</label>)}
          <p className="fx-sub">{ext.swipes} short videos swiped in this tank.</p>
          <div className="fx-row"><button className="fx-btn ghost" onClick={() => setTank(0)}>Empty the tank now (demo)</button><button className="fx-btn ghost" onClick={() => setTank(RULES.firstTry * MIN)}>Reset to {RULES.firstTry} min</button></div>
        </> : <>
          <h2>Load the extension</h2>
          <ol className="fx-steps-list">
            <li><code>node scripts/build_extension.mjs</code> (builds the app and packs it into <code>extension/dist</code>)</li>
            <li>Open <code>chrome://extensions</code>, switch on Developer mode, then <b>Load unpacked</b> → <code>extension/dist</code></li>
            <li>Open Instagram or YouTube Shorts and scroll. The whole FLUX deck runs inside the extension, offline. Nothing is sent anywhere.</li>
          </ol>
        </>}
      </section>

      <section className="fx-card">
        <p className="fx-kicker">Phones</p>
        <p className="fx-sub"><b>Android:</b> a thin wrapper (UsageStatsManager + “display over other apps”) opens this same tollbooth in a WebView. A reference skeleton is in <code>android-gate/</code>; it has not been compiled yet. <b>iPhone:</b> Screen Time APIs show a shield screen instead of an overlay; tapping it would open ScrollProof for one card. Both need store review.</p>
      </section>
      <button className="fx-reset" onClick={() => { if (armed) { reset(); setArmed(false) } else setArmed(true) }}>{armed ? 'Tap again to erase Scroll Fuel history' : 'Reset Scroll Fuel history on this device'}</button>
    </div>
  )
}
