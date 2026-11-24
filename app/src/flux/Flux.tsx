// FLUX hub: episodes you play, a brain map that drains like a battery, and recall reels that fight forgetting.
import { useEffect, useState } from 'react'
import { go } from '../router'
import { CONCEPT_NAMES, SolarEpisode } from './Episode'
import { isMuted, media, setMuted, sfx } from './fx'
import { DAY, battery, orderFeed } from './memory'
import { PayEpisode } from './PayLab'
import { BlueprintEpisode } from './BlueprintEpisode'
import type { Blueprint } from './blueprint'
import EV from './blueprints/ev_charger.json'
import { canPost } from './community'
import { Queue } from './Queue'
import { REELS, Reels, scarReels } from './Reels'
import { Studio } from './Studio'
import { FuelPage } from './ScrollFuel'
import { GateRoute } from './Gate'
import { useFlux, useScars } from './store'
import './flux.css'

const NODES: { id: string; x: number; y: number; track: 'solar' | 'pay' }[] = [
  { id: 'series', x: 56, y: 58, track: 'solar' }, { id: 'cold', x: 150, y: 40, track: 'solar' },
  { id: 'maxstring', x: 120, y: 132, track: 'solar' }, { id: 'minstring', x: 40, y: 160, track: 'solar' },
  { id: 'explain', x: 168, y: 214, track: 'solar' }, { id: 'safety', x: 56, y: 252, track: 'solar' },
  { id: 'evload', x: 200, y: 120, track: 'solar' },
  { id: 'ambiguous', x: 270, y: 70, track: 'pay' }, { id: 'idem', x: 300, y: 160, track: 'pay' }, { id: 'retry', x: 262, y: 246, track: 'pay' },
]
const EDGES = [['series', 'evload'], ['explain', 'evload'], ['series', 'maxstring'], ['cold', 'maxstring'], ['cold', 'minstring'], ['maxstring', 'explain'], ['maxstring', 'minstring'], ['ambiguous', 'idem'], ['idem', 'retry']]

function BrainMap() {
  const { s, now } = useFlux()
  const t = now()
  const at = (id: string) => NODES.find((n) => n.id === id)!
  return (
    <svg viewBox="0 0 340 290" className="fx-brain" role="img" aria-label="Your brain map: each skill glows as bright as your memory of it">
      <defs>
        <radialGradient id="glow-solar"><stop offset="0" stopColor="#d7ff3a" stopOpacity=".9" /><stop offset="1" stopColor="#d7ff3a" stopOpacity="0" /></radialGradient>
        <radialGradient id="glow-pay"><stop offset="0" stopColor="#5ce1ff" stopOpacity=".9" /><stop offset="1" stopColor="#5ce1ff" stopOpacity="0" /></radialGradient>
      </defs>
      {EDGES.map(([a, b]) => { const A = at(a), B = at(b); const lit = Math.min(battery(s.memory.cards[a], t), battery(s.memory.cards[b], t)); return <line key={a + b} x1={A.x} y1={A.y} x2={B.x} y2={B.y} className="edge" style={{ opacity: 0.15 + lit * 0.7 }} /> })}
      {NODES.map((n) => {
        const b = battery(s.memory.cards[n.id], t)
        const c = 2 * Math.PI * 16
        return <g key={n.id} transform={`translate(${n.x},${n.y})`} className={`node ${n.track} ${b > 0 ? 'lit' : ''} ${b > 0 && b < 0.72 ? 'fading' : ''}`}>
          <circle r={18 + b * 22} fill={`url(#glow-${n.track})`} style={{ opacity: b }} />
          <circle r="16" className="ring-bg" />
          <circle r="16" className="ring" strokeDasharray={`${c * b} ${c}`} transform="rotate(-90)" />
          <circle r="6" className="core" />
          <text y="31" textAnchor="middle">{CONCEPT_NAMES[n.id]}</text>
          <text y="42" textAnchor="middle" className="pct">{b ? `${Math.round(b * 100)}%` : '—'}</text>
        </g>
      })}
    </svg>
  )
}

function Hub() {
  const { s, now, warp, reset, sessionId } = useFlux()
  const [muted, setM] = useState(isMuted())
  const [armed, setArmed] = useState(false)
  useEffect(() => { const on = () => setM(isMuted()); addEventListener('flux:mute', on); return () => removeEventListener('flux:mute', on) }, [])
  const { scars } = useScars()
  const feed = orderFeed([...scarReels(scars), ...REELS], s.memory, sessionId, now())
  const pending = scars.filter((x) => x.status === 'pending').length, live = scars.filter((x) => x.status === 'live').length
  const unlocked = canPost(s.proofs, s.vouches, 'trades') || canPost(s.proofs, s.vouches, 'tech')
  const due = feed.filter((f) => f.why).length
  const callbacks = feed.filter((f) => f.reel.callback).length
  const date = new Date(now()).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  const ep = (id: string, steps: number) => { const e = s.episodes[id]; return e?.done ? 'Replay' : e?.step ? `Resume · ${Math.round((e.step / steps) * 100)}%` : 'Play' }
  return (
    <div className="fx-hub">
      <header className="fx-top">
        <a href="#/home" className="fx-back" aria-label="CAPABLE home">←</a>
        <span className="fx-logo" aria-label="FLUX"><b>FLUX</b><i>learning engine</i></span>
        <button className="fx-icon" onClick={() => setMuted(!muted)} aria-label={muted ? 'Sound on' : 'Mute'}>{muted ? '🔇' : '🔊'}</button>
      </header>

      <section className="fx-hero">
        <p className="fx-kicker">CAPABLE · Learn</p>
        <h1>Don't watch the lesson.<br /><span>Break it.</span></h1>
        <p className="fx-sub">Every concept is a live machine you can sabotage. Bet before you learn, break it with your hands, fix an apprentice's mistake, win over a customer, then prove it on a job you've never seen.</p>
      </section>

      <section className="fx-eps" aria-label="Episodes">
        <button className="fx-ep" onClick={() => { sfx('whoosh'); go('flux-solar') }}>
          <img src={media('dawn.webp')} alt="" />
          <span className="fx-ep-tag">☀ Electrician → Solar technician</span>
          <b>The Cold Morning Killer</b>
          <small>Why inverters die at sunrise, not at noon · 8 min</small>
          <span className="fx-ep-go">{ep('solar', 8)} ▶</span>
        </button>
        <button className="fx-ep pay" onClick={() => { sfx('whoosh'); go('flux-pay') }}>
          <img src={media('pay.webp')} alt="" />
          <span className="fx-ep-tag">₹ Fresher → Payments engineer</span>
          <b>Charged Twice</b>
          <small>Cut the network with scissors and stop a double charge · 5 min</small>
          <span className="fx-ep-go">{ep('pay', 5)} ▶</span>
        </button>
        <button className="fx-ep ev" onClick={() => { sfx('whoosh'); go('flux-ev') }}>
          <img src={media('ev_night.webp')} alt="" />
          <span className="fx-ep-tag">⚡ Electrician → EV charger installer · JSON blueprint</span>
          <b>The 9 PM Blackout</b>
          <small>Why a new car charger trips the whole flat at dinner · 6 min</small>
          <span className="fx-ep-go">{ep('ev', 6)} ▶</span>
        </button>
      </section>

      <section className="fx-scars fuel">
        <div>
          <p className="fx-kicker">Scroll Fuel · gate Instagram & Shorts with recall</p>
          <h2>Keep your doomscroll. The toll is one card.</h2>
          <p className="fx-sub">Solve one due card for +10 minutes of feed. When the tank empties, a tollbooth slides over Instagram or YouTube Shorts and drops you back on the same video. Runs as a browser extension today.</p>
        </div>
        <div className="fx-row"><button className="fx-cta in" onClick={() => go('flux-fuel')}>⛽ Open Scroll Fuel</button></div>
      </section>

      <section className="fx-scars">
        <div>
          <p className="fx-kicker">Field Scars · real failures from real sites</p>
          <h2>Don't upload lectures. Upload the scar.</h2>
          <p className="fx-sub">A photo of a real fault, the exact spot, the rule and the wrong belief juniors hold. It becomes two playable cards after a slop & safety sieve and two master sign-offs. Your name stays on it.</p>
          <p className="fx-fine">{unlocked ? 'Uploading unlocked on this device.' : 'Locked until you beat an unseen work order: prove it to post it.'} {pending} pending · {live} live</p>
        </div>
        <div className="fx-row">
          <button className="fx-cta in" onClick={() => go('flux-studio')}>{unlocked ? '📷 Capture a Field Scar' : '🔒 Capture a Field Scar'}</button>
          <button className="fx-btn ghost" onClick={() => go('flux-queue')}>Verification queue{pending ? ` (${pending})` : ''}</button>
        </div>
      </section>

      <section className="fx-recall">
        <div>
          <p className="fx-kicker">Recall reels</p>
          <h2>{callbacks ? `${callbacks} rematch${callbacks > 1 ? 'es' : ''} waiting` : due ? `${due} reels due today` : 'Your memory is charged'}</h2>
          <p className="fx-sub">Swipe through 10-second games. Misses come back first next session. Day 1 · 3 · 7 · 21.</p>
        </div>
        <button className="fx-cta in" onClick={() => go('flux-reels')}>Open reels ↑</button>
      </section>

      <section className="fx-mapwrap">
        <div className="fx-maphead">
          <div><p className="fx-kicker">Your brain map · {date}</p><h2>Memories drain like a battery</h2></div>
          <div className="fx-warp" role="group" aria-label="Demo time warp">
            <span>Demo time-warp</span>
            {[1, 3, 7].map((d) => <button key={d} onClick={() => { warp(d); sfx('whoosh', 0.4) }}>+{d}d</button>)}
            {s.warpMs > 0 && <button onClick={() => warp(-s.warpMs / DAY)}>now</button>}
          </div>
        </div>
        <BrainMap />
        <p className="fx-fine">The map lives on this device. It is a mirror for you, not a score: only a trainer-reviewed proof becomes a credential.</p>
      </section>

      <section className="fx-why">
        <h2>Why this beats a video lecture</h2>
        <ol>
          <li><b>Bet first.</b> A wrong guess you made yourself sticks harder than a right answer you were told. Your calibration is tracked.</li>
          <li><b>Break it.</b> Missions say “kill the inverter”, not “read section 3”. You discover the rule with your hands.</li>
          <li><b>Teach it.</b> Fixing Chotu's notebook and convincing Mr. Sharma are the job, not trivia about the job.</li>
          <li><b>Transfer it.</b> Every work order is a new city, panel and inverter. Code checks the numbers and names your exact mistake.</li>
          <li><b>Keep it.</b> Recall reels are 10-second games scheduled against your forgetting curve.</li>
        </ol>
        <p className="fx-fine">No model runs while you learn. Every number is computed by tested code; images, video and voices were generated once, reviewed and cached. Characters, customers and job tickets are DEMO.</p>
      </section>

      <section className="fx-ladder-card">
        <p className="fx-kicker">Earning ladder · example figures from the pitch, unverified</p>
        <div className="fx-steps"><span>Wireman<b>₹18k/mo</b></span><i>→</i><span>Solar install helper<b>verify</b></span><i>→</i><span className="hot">Solar / EV technician<b>₹38k+/mo</b></span></div>
      </section>
      <button className="fx-reset" onClick={() => { if (armed) { reset(); setArmed(false) } else setArmed(true) }}>{armed ? 'Tap again to erase FLUX progress on this device' : 'Reset FLUX on this device'}</button>
    </div>
  )
}

const VIEWS = { solar: SolarEpisode, pay: PayEpisode, reels: Reels, studio: Studio, queue: Queue, ev: () => <BlueprintEpisode bp={EV as unknown as Blueprint} />, fuel: FuelPage, gate: GateRoute, hub: Hub }
export function Flux({ view = 'hub' }: { view?: keyof typeof VIEWS }) {
  const View = VIEWS[view]
  return <div className="fx-root"><View /><div className="fx-grain" aria-hidden="true" /></div>
}
