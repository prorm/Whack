// The FLUX Tollbooth: when the Scroll Fuel tank is empty, one thumb-native recall card refuels it.
// Rendered inside the extension's overlay iframe (#/flux-gate) or inline in the in-app simulator.
import { useEffect, useMemo, useRef, useState } from 'react'
import { routeParam } from '../router'
import { CONCEPT_NAMES } from './Episode'
import { RULES, afterAnswer, canEscape, nextEscapeIn, thumbNative, type Next } from './fuel'
import { useFuel } from './fuelStore'
import { battery, orderFeed } from './memory'
import { REELS, ReelView, scarReels, type Reel } from './Reels'
import { haptic, sfx } from './fx'
import { useFlux, useScars } from './store'

export const APP_LABEL: Record<string, string> = { instagram: 'Instagram', 'youtube-shorts': 'YouTube Shorts', reddit: 'Reddit', x: 'X', sim: 'your feed', demo: 'the demo page' }

/** Pick the toll card: due/callback first (same order as the recall feed), thumb-native only, never one already used in this toll. */
export function pickCard(pool: Reel[], memory: Parameters<typeof orderFeed>[1], sessionId: string, now: number, used: string[], bounty: boolean, concept?: string) {
  const ok = pool.filter((r) => thumbNative(r as { kind: string; options?: unknown[] }) && !used.includes(r.id))
  if (bounty) { const b = ok.find((r) => r.prov?.origin === 'company_bounty'); if (b) return { reel: b, why: 'Sponsored live problem (DEMO)' } }
  const ordered = orderFeed(ok.filter((r) => r.prov?.origin !== 'company_bounty'), memory, sessionId, now)
  if (concept) { const same = ordered.find((x) => x.reel.concept === concept); if (same) return { ...same, why: 'Follow-up on what you just missed' } }
  return ordered[0] ?? { reel: ok[0], why: '' }
}

export function Tollbooth({ app, swipes = 0, onDone }: { app: string; swipes?: number; onDone: (minutes: number, kind: 'card' | 'escape') => void }) {
  const { s, now, grade, sessionId } = useFlux()
  const { scars } = useScars()
  const { fuel, log, escape } = useFuel()
  const tolls = fuel.log.filter((e) => e.attempt === 1).length
  const bounty = tolls % 5 === 4
  const [used, setUsed] = useState<string[]>([])
  const [attempt, setAttempt] = useState(1)
  const [missed, setMissed] = useState<string | undefined>()
  const [next, setNext] = useState<Next | null>(null)
  const [wait, setWait] = useState(0)
  const [look, setLook] = useState(true)
  const pool = useMemo(() => [...scarReels(scars), ...REELS], [scars])
  const pick = useMemo(() => pickCard(pool, s.memory, sessionId, now(), used, bounty && attempt === 1, missed), [attempt]) // eslint-disable-line react-hooks/exhaustive-deps
  const reel = pick.reel
  const isBounty = reel?.prov?.origin === 'company_bounty'
  const timer = useRef(0)

  useEffect(() => { setLook(true); const t = setTimeout(() => setLook(false), RULES.lookMs); return () => clearTimeout(t) }, [attempt])
  useEffect(() => () => clearInterval(timer.current), [])

  const answered = (ok: boolean) => {
    grade(reel.concept, ok, reel.id) // a miss here schedules this skill's REMATCH for a later session
    const n = afterAnswer(ok, attempt, isBounty)
    log({ at: Date.now(), app, reelId: reel.id, concept: reel.concept, correct: ok, attempt, minutes: n.kind === 'explain-then-followup' ? 0 : n.minutes, bounty: isBounty })
    setNext(n)
    if (n.kind === 'explain-then-followup') {
      setMissed(reel.concept)
      let left = Math.ceil(n.waitMs / 1000); setWait(left)
      timer.current = window.setInterval(() => { left--; setWait(left); if (left <= 0) clearInterval(timer.current) }, 1000)
    } else { sfx(n.kind === 'unlock' ? 'powerup' : 'ding', 0.5); haptic([20, 30, 60]) }
  }
  const followUp = () => { setUsed([...used, reel.id]); setAttempt(attempt + 1); setNext(null) }
  const escOk = canEscape(fuel, Date.now())
  if (!reel) return <p className="fx-sub">No cards available.</p>
  return (
    <div className="fx-toll">
      <header className="fx-toll-top">
        <div className="fx-tank empty" aria-label="Fuel tank empty"><i style={{ height: '4%' }} /></div>
        <div>
          <p className="fx-kicker">{isBounty ? 'Sponsored tollbooth · DEMO partner' : 'Scroll Fuel · tank empty'}</p>
          <h1>{attempt === 1 ? <>One card refuels {APP_LABEL[app] ?? app}. <span>+{isBounty ? RULES.bounty : RULES.firstTry} min</span></> : <>Follow-up · <span>+{RULES.followUp} min</span></>}</h1>
          {swipes > 0 && attempt === 1 && <p className="fx-sub">You swiped {swipes} short videos this tank. The toll is one card.</p>}
          <p className="fx-toll-why">{CONCEPT_NAMES[reel.concept] ?? reel.concept}{pick.why ? ` · ${pick.why}` : ''} · memory {Math.round(battery(s.memory.cards[reel.concept], now()) * 100)}%</p>
        </div>
      </header>
      <div className={`fx-toll-card ${look ? 'look' : ''}`}>
        <ReelView key={reel.id + attempt} reel={reel} active why="" combo={1} batt={battery(s.memory.cards[reel.concept], now())} onAnswer={answered} />
        {look && <span className="fx-look">Look first…</span>}
      </div>
      <footer className="fx-toll-foot">
        {next?.kind === 'unlock' && <button className="fx-cta in" onClick={() => onDone(next.minutes, 'card')}>+{next.minutes} min · back to {APP_LABEL[app] ?? app} →</button>}
        {next?.kind === 'mercy' && <button className="fx-cta in" onClick={() => onDone(next.minutes, 'card')}>Take a breath · +{next.minutes} min →</button>}
        {next?.kind === 'explain-then-followup' && <button className="fx-cta in" disabled={wait > 0} onClick={followUp}>{wait > 0 ? `Read the why · ${wait}s` : `Follow-up card for +${RULES.followUp} min →`}</button>}
        {!next && <button className="fx-btn ghost" disabled={!escOk} onClick={() => { escape(); onDone(RULES.escapeMin, 'escape') }}>
          {escOk ? `Checking a DM? ${RULES.escapeMin} min free (once an hour)` : `DM break back in ${Math.ceil(nextEscapeIn(fuel, Date.now()) / 60000)} min`}</button>}
        <p className="fx-fine">Fuel is minutes, not proof. Toll answers never award a credential. Misses come back as a REMATCH next session.</p>
      </footer>
    </div>
  )
}

/** Route #/flux-gate: inside the extension overlay it messages the parent page; opened directly it refuels the local tank. */
export function GateRoute() {
  const app = routeParam('app') ?? 'demo'
  const swipes = Number(routeParam('swipes') ?? 0)
  const nonce = routeParam('n') ?? ''
  const { add } = useFuel()
  const [done, setDone] = useState<number | null>(null)
  const framed = window.parent !== window
  const android = (window as { ScrollProofAndroid?: { unlock(minutes: number, kind: string): void } }).ScrollProofAndroid
  const finish = (minutes: number, kind: 'card' | 'escape') => {
    if (android) { add(minutes); android.unlock(minutes, kind); return } // native overlay wrapper (android-gate/)
    if (framed) {
      const origin = location.ancestorOrigins?.[0] ?? '*'
      window.parent.postMessage({ type: kind === 'escape' ? 'FLUX_ESCAPE' : 'FLUX_UNLOCKED', minutes, nonce }, origin)
    } else { add(minutes); setDone(minutes) }
  }
  if (done !== null) return <div className="fx-toll done"><h1>+{done} min in the tank.</h1><p className="fx-sub">Close this tab and keep scrolling.</p></div>
  return <Tollbooth app={app} swipes={swipes} onDone={finish} />
}
