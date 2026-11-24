// FLUX recall reels: every reel is a 5–15 second game, never a passive clip.
// Order follows memory.ts: earlier-session misses first (callback), then due concepts, then the rest.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { go, routeParam } from '../router'
import { CONCEPT_NAMES, autoplay } from './Episode'
import { haptic, isMuted, media, setMuted, sfx, stopVoice, voice } from './fx'
import { compute, type Blueprint } from './blueprint'
import EV_JSON from './blueprints/ev_charger.json'
import { badges, type Provenance } from './cards'
import { challenge, openChallenges, verifiers, type Submission } from './community'
import { battery, orderFeed } from './memory'
import { HOME, INVERTERS, SITES, maxPanels, vocAt } from './physics'
import { useFlux, useScars } from './store'
import { MotionStage } from './motion/engine'
import { E, N, SCENES, type SceneId } from './motion/scenes'
import { rankForGoal, type Slot } from './goal'
import { allJobs, usePassport } from './passportStore'
import { byId, type CompetencyId } from './skills'

const { panel: P, inverter: INV, site: SITE } = HOME
type Opt = { t: string; ok?: boolean }
type Base = { id: string; concept: string; track: 'solar' | 'pay'; callback?: boolean; kicker: string; explain: string; vo?: string; prov?: Provenance; communityId?: string; fixes?: string[] }
export type Reel = Base & (
  | { kind: 'freeze'; video: string; poster: string; freezeAt: number; q: string; options: Opt[] }
  | { kind: 'split'; q: string; left: { img: string; label: string; v: number }; right: { img: string; label: string; v: number }; answer: 'left' | 'right'; seconds: number }
  | { kind: 'spot'; img: string; q: string; hot: { x: number; y: number; r: number }; reward?: string }
  | { kind: 'choice'; q: string; bg?: string; who?: { img: string; name: string; line: string }; options: Opt[]; seconds?: number }
  | { kind: 'bubbles'; q: string; options: Opt[]; seconds: number }
  | { kind: 'motion'; scene: SceneId; q: string; options: Opt[]; seconds: number }
)

const v = (n: number, t: number) => Math.round(n * vocAt(P, t))
const delhi = SITES.find((s) => s.id === 'delhi')!
const shimla = SITES.find((s) => s.id === 'shimla')!
const gm10 = INVERTERS[1], gm15 = INVERTERS[2]
const bubble = (site: typeof shimla, inv: typeof gm10) => {
  const vc = vocAt(P, site.tMin), max = maxPanels(inv, P, site.tMin)
  return { inv, vc, max, near: Math.round(inv.vmax / vc), stc: Math.floor(inv.vmax / P.voc) }
}
const uniq = (opts: Opt[]) => opts.filter((o, i) => opts.findIndex((x) => x.t === o.t) === i)
const B1 = bubble(shimla, gm10), B2 = bubble(delhi, gm15)
const EV = compute(EV_JSON as unknown as Blueprint, { hour: 21 })
const EV_SAFE = EV.safeFixed, EV_NEAR = Math.round(EV.mainLimit - EV.peakHouseA)
/** Images from the app's media pack, or a learner's own capture (data URL). */
export const src = (x: string) => /^(data:|blob:|\/)/.test(x) ? x : media(x)
const TESTED = new Set(['cold', 'maxstring', 'series', 'minstring', 'evload'])
/** Provenance for authored cards: numeric cards are checked by tested code; every AI picture says so. */
export function provOf(r: Reel): Provenance {
  if (r.prov) return r.prov
  const pictured = r.kind === 'spot' || r.kind === 'freeze' || r.kind === 'split' || (r.kind === 'choice' && !!(r.bg || r.who))
  if (r.kind === 'motion') return { origin: 'flux_original', mediaSource: SCENES[r.scene].plate ? 'motion_ai_plate' : 'code_rendered', truth: TESTED.has(r.concept) ? 'tested_code' : 'team_authored', isDemo: false }
  return { origin: 'flux_original', mediaSource: pictured ? 'ai_generated' : 'code_rendered', truth: TESTED.has(r.concept) && r.kind !== 'spot' ? 'tested_code' : 'team_authored', isDemo: false }
}
/** Live Field Scars become two cards each: spot the fault on the real photo, then cap-or-fact on the junior's belief. */
export function scarReels(list: Submission[]): Reel[] {
  return list.filter((s) => s.status === 'live').flatMap((s): Reel[] => {
    const track = s.domain === 'trades' ? 'solar' as const : 'pay' as const
    const prov: Provenance = {
      origin: 'community_verified', mediaSource: 'real_capture', truth: 'master_review', isDemo: true, verifiedBy: verifiers(s), changelog: s.changelog,
      challenged: openChallenges(s).length > 0,
      contributor: { ...s.contributor, verifiedCount: list.filter((x) => x.contributor.name === s.contributor.name && x.status === 'live').length, demo: false },
    }
    return [
      { id: `scar-${s.id}`, communityId: s.id, concept: s.concept, track, kind: 'spot', img: s.photo, hot: s.hot, q: s.question, kicker: 'Field Scar', explain: s.why, prov },
      { id: `scar-${s.id}-cap`, communityId: s.id, concept: s.concept, track, kind: 'choice', kicker: 'Cap or fact', bg: s.photo, seconds: 8, q: `“${s.wrongBelief}”`, options: [{ t: 'CAP', ok: true }, { t: 'FACT' }], explain: `${s.rule} ${s.why}`, prov },
    ]
  })
}

/** Intuition reels: code-driven motion graphics. Setup → forced prediction → payoff that shows why. */
export const MOTION_REELS: Reel[] = [
  { id: 'mo-cold', concept: 'cold', track: 'solar', kind: 'motion', scene: 'cold', kicker: 'Intuition', seconds: 9, fixes: ['sign_flip', 'used_hot'],
    q: `25 °C → ${N.tMin} °C. One panel’s voltage…`, options: [{ t: '⬆ Goes UP', ok: true }, { t: '⬇ Goes DOWN' }, { t: '= Stays the same' }],
    explain: `The coefficient is negative (${P.betaVoc}%/°C) and the morning is ${25 - N.tMin} °C below 25 °C: minus × minus = up. ${N.vocCold} V per panel × 12 = ${Math.round(12 * vocAt(P, N.tMin))} V, past the ${N.vmax} V limit.` },
  { id: 'mo-cliff', concept: 'maxstring', track: 'solar', kind: 'motion', scene: 'cliff', kicker: 'Intuition', seconds: 8, fixes: ['rounded_up', 'used_stc'],
    q: `${N.vmax} ÷ ${N.vocCold} = ${N.ratio.toFixed(2)}. How many panels go in the string?`, options: [{ t: String(N.max), ok: true }, { t: String(N.max + 1) }],
    explain: `A maximum is a brim. ${N.max} panels = ${Math.round(N.max * vocAt(P, N.tMin))} V fits; ${N.max + 1} = ${Math.round((N.max + 1) * vocAt(P, N.tMin))} V spills over ${N.vmax} V on the coldest dawn. Round a maximum DOWN.` },
  { id: 'mo-heat', concept: 'minstring', track: 'solar', kind: 'motion', scene: 'heat', kicker: 'Intuition', seconds: 9, fixes: ['min_rounded_down', 'used_voc_for_min'],
    q: `Each panel works at ${N.vmpHot.toFixed(1)} V. The inverter wakes at ${N.mppt} V. Fewest panels?`, options: uniq([{ t: String(N.min - 1) }, { t: String(N.min), ok: true }, { t: '12' }]),
    explain: `${N.mppt} ÷ ${N.vmpHot.toFixed(1)} = ${N.minRatio.toFixed(2)}. ${N.min - 1} panels sit below the wake-up line on a hot afternoon, so a minimum rounds UP to ${N.min}. Use the HOT working voltage (Vmp), not Voc.` },
  { id: 'mo-hose', concept: 'series', track: 'solar', kind: 'motion', scene: 'hose', kicker: 'Intuition', seconds: 10, fixes: ['swapped_rule', 'added_both'],
    q: 'One panel gets half the sun. With no bypass diodes, every panel in the string now carries…', options: [{ t: `About half: ~${(N.imp / 2).toFixed(1)} A`, ok: true }, { t: `Still ${N.imp} A` }, { t: `${N.imp} A minus one sixth` }],
    explain: 'Series panels share ONE current, like water in one hose: a kink anywhere slows all of it. Volts add along the string; current does not. Bypass diodes give the current a way around a shaded panel.' },
  { id: 'mo-dinner', concept: 'evload', track: 'solar', kind: 'motion', scene: 'dinner', kicker: 'Intuition', seconds: 10,
    q: `Dinner: the flat draws ${E.house.toFixed(1)} A. Main breaker ${E.main} A. The ${E.charger} A charger (no load balancing) switches on…`, options: [{ t: 'Main trips. Flat goes dark.', ok: true }, { t: 'Charger slows itself down' }, { t: 'Nothing happens' }],
    explain: `${E.house.toFixed(1)} + ${E.charger} = ${(E.house + E.charger).toFixed(1)} A > ${E.main} A. Fix it with a fixed setting of ${E.safe} A, or load balancing that gives the car only what is left (${E.balanced} A at dinner with a 2 A margin).` },
  { id: 'mo-idem', concept: 'idem', track: 'pay', kind: 'motion', scene: 'idem', kicker: 'Intuition', seconds: 9, fixes: ['no_dedupe'],
    q: 'The server sees key K7F2 again. It already charged it. It should…', options: [{ t: 'Replay the saved reply', ok: true }, { t: 'Charge again: it is a new request' }, { t: 'Return an error' }],
    explain: 'Same key = same intent. Store the reply with the key and replay it, so the app gets its answer and the customer pays once. Duplicate webhooks work the same way: one credit per event ID.' },
  { id: 'mo-herd', concept: 'retry', track: 'pay', kind: 'motion', scene: 'herd', kicker: 'Intuition', seconds: 9, fixes: ['linear', 'ignored_cap'],
    q: 'How do you stop the retry storm?', options: [{ t: 'Exponential backoff + random jitter', ok: true }, { t: 'Retry faster' }, { t: 'Retry every 1 s, forever' }],
    explain: 'Synchronised retries hit like a wave and keep a recovering server down. Double the wait each time (1 s, 2 s, 4 s…, up to a cap) and add random jitter so the phones spread out.' },
]

export const REELS: Reel[] = [
  ...MOTION_REELS,
  { id: 'freeze-dawn', concept: 'cold', track: 'solar', kind: 'freeze', video: 'v_dawn.mp4', poster: 'dawn.webp', freezeAt: 4.2, kicker: 'Freeze frame',
    q: `06:47, ${SITE.tMin} °C, 12 panels, ${INV.vmax} V inverter. What happens next?`,
    options: [{ t: 'Inverter trips on overvoltage', ok: true }, { t: 'Panels overheat' }, { t: 'Nothing. It is just dew.' }],
    explain: `Cold cells + an inverter that has not started yet = full open-circuit voltage: 12 × ${vocAt(P, SITE.tMin).toFixed(2)} = ${v(12, SITE.tMin)} V > ${INV.vmax} V.` },
  { id: 'split-hotcold', concept: 'cold', track: 'solar', kind: 'split', seconds: 6, fixes: ['used_hot'], kicker: 'Hot or cold',
    q: 'Same 12 panels. Tap the moment with the HIGHER voltage.',
    left: { img: 'dawn.webp', label: `Sunrise · ${SITE.tMin} °C`, v: v(12, SITE.tMin) }, right: { img: 'noon.webp', label: `Noon · ${SITE.tCellHot} °C cell`, v: v(12, SITE.tCellHot) }, answer: 'left',
    explain: `Cold raises voltage. ${v(12, SITE.tMin)} V at sunrise vs ${v(12, SITE.tCellHot)} V at a hot noon.` },
  { id: 'spot-mc4', concept: 'safety', track: 'solar', kind: 'spot', img: 'fault_mc4.webp', hot: { x: 52, y: 57.5, r: 17 }, reward: 'v_mc4.mp4', kicker: 'Spot the fault',
    q: 'Something on this roof will start a fire. Tap it.',
    explain: 'A burnt MC4 connector. A loose crimp or mismatched connector heats up under string current for hours until it melts or arcs. DC arcs do not go out by themselves: isolate the string before touching it.' },
  { id: 'choice-series', concept: 'series', track: 'solar', kind: 'choice', fixes: ['swapped_rule', 'added_both'], vo: 'reel_series', kicker: 'Wire it in your head', bg: 'akka.webp', seconds: 10,
    q: `3 panels, each ${P.vmp} V and ${P.imp} A, wired in SERIES. The string gives…`,
    options: [{ t: `${(3 * P.vmp).toFixed(1)} V · ${P.imp} A`, ok: true }, { t: `${P.vmp} V · ${(3 * P.imp).toFixed(1)} A` }, { t: `${(3 * P.vmp).toFixed(1)} V · ${(3 * P.imp).toFixed(1)} A` }],
    explain: 'Series: volts add, current stays. Parallel: current adds, volts stay. Power is volts × amps either way.' },
  { id: 'bubbles-shimla', concept: 'maxstring', track: 'solar', kind: 'bubbles', seconds: 9, fixes: ['used_stc', 'rounded_up'], kicker: 'Catch the right bubble',
    q: `Shimla. ${gm10.vmax} V inverter. Voc at ${shimla.tMin} °C = ${B1.vc.toFixed(2)} V. Max panels?`,
    options: uniq([{ t: String(B1.max), ok: true }, { t: String(B1.near === B1.max ? B1.max + 1 : B1.near) }, { t: String(B1.stc) }]),
    explain: `${gm10.vmax} ÷ ${B1.vc.toFixed(2)} = ${(gm10.vmax / B1.vc).toFixed(2)} → round DOWN → ${B1.max}. ${B1.stc} is what you get if you forget the cold.` },
  { id: 'spot-shade', concept: 'safety', track: 'solar', kind: 'spot', img: 'fault_shade.webp', hot: { x: 33, y: 62, r: 19 }, kicker: 'Spot the fault',
    q: 'This array makes far less power than it should every afternoon. Tap the reason.',
    explain: 'The water tank shades two panels. Panels in a string share one current, so a shaded panel chokes the whole string like a kink in a hose. Bypass diodes limit the loss. Better: never design panels into a shadow.' },
  { id: 'cap-chotu', concept: 'cold', track: 'solar', kind: 'choice', fixes: ['used_hot', 'used_stc'], kicker: 'Cap or fact', seconds: 7,
    who: { img: 'chotu.webp', name: 'Chotu (DEMO)', line: '“If 12 panels were fine at noon, they will be fine at sunrise also, boss.”' },
    q: 'Cap or fact?', options: [{ t: 'CAP', ok: true }, { t: 'FACT' }],
    explain: `Noon is the SAFE case: hot panels sag to ${v(12, SITE.tCellHot)} V. Sunrise is the dangerous one: ${v(12, SITE.tMin)} V.` },
  { id: 'choice-round', concept: 'maxstring', track: 'solar', kind: 'choice', fixes: ['rounded_up'], vo: 'reel_round', bg: 'akka.webp', kicker: 'One rule, no exceptions', seconds: 8,
    q: `${INV.vmax} ÷ ${vocAt(P, SITE.tMin).toFixed(2)} = ${(INV.vmax / vocAt(P, SITE.tMin)).toFixed(2)}. How many panels go in the string?`,
    options: [{ t: String(maxPanels(INV, P, SITE.tMin)), ok: true }, { t: String(maxPanels(INV, P, SITE.tMin) + 1) }],
    explain: 'A maximum is a cliff edge. Round it down, always.' },
  { id: 'voice-akka', concept: 'cold', track: 'solar', kind: 'choice', fixes: ['sign_flip'], vo: 'reel_cold', bg: 'akka.webp', kicker: 'Say it with Akka',
    q: 'Cold panel → voltage goes…', options: [{ t: '⬆ UP', ok: true }, { t: '⬇ DOWN' }],
    explain: `The coefficient is negative (${P.betaVoc}%/°C) and cold is below 25 °C. Minus times minus: up.` },
  // EV track (numbers from the EV blueprint's own tested expressions)
  { id: 'spot-ev-panel', concept: 'evload', track: 'solar', kind: 'spot', img: 'ev_panel.webp', hot: { x: 40, y: 49, r: 13 }, kicker: 'Spot the fault',
    q: '21:04. The flat is dark. Tap the breaker that tripped.',
    explain: 'The wide main breaker is down. Nothing in the car is broken: the whole flat’s load crossed the main breaker’s rating at dinner time.' },
  { id: 'bubbles-ev', concept: 'evload', track: 'solar', kind: 'bubbles', seconds: 9, kicker: 'Catch the right bubble',
    q: `Main breaker ${EV.mainLimit} A. House at dinner = ${EV.peakHouseA.toFixed(1)} A. No load balancing. Highest safe charger setting?`,
    options: uniq([{ t: `${EV_SAFE} A`, ok: true }, { t: `${EV_NEAR === EV_SAFE ? EV_SAFE + 1 : EV_NEAR} A` }, { t: '32 A' }]),
    explain: `${EV.mainLimit} − ${EV.peakHouseA.toFixed(2)} = ${(EV.mainLimit - EV.peakHouseA).toFixed(2)} → round DOWN → ${EV_SAFE} A. Or fit load balancing and let the charger back off only at dinner.` },
  { id: 'choice-ev-mcb', concept: 'evload', track: 'solar', kind: 'choice', kicker: 'Size the circuit', seconds: 9,
    q: 'A 32 A charger gets its own circuit. Which breaker?', options: [{ t: '32 A' }, { t: '40 A', ok: true }, { t: '63 A' }],
    explain: 'A charger draws full current for hours, so common practice sizes its circuit for 125%: 32 × 1.25 = 40 A, with cable rated for 40 A. A 63 A breaker would let the cable overheat first.' },
  // company bounty (DEMO: no real company, no real job)
  { id: 'bounty-webhook', concept: 'idem', track: 'pay', kind: 'choice', fixes: ['no_dedupe'], kicker: 'Bounty', seconds: 12,
    q: 'Our webhook consumer credits a wallet twice when the provider retries “payment.succeeded”. Best fix?',
    options: [{ t: 'Store each event ID; skip IDs already processed', ok: true }, { t: 'Return 500 so the provider stops retrying' }, { t: 'Sleep 5 s before processing' }],
    explain: 'Webhooks arrive at-least-once. Record the event ID in the same transaction as the credit, and skip any ID you have already processed. A 500 makes the provider retry MORE.',
    prov: { origin: 'company_bounty', mediaSource: 'none', truth: 'team_authored', isDemo: true, contributor: { name: 'DEMO partner · Bengaluru fintech', role: 'Bounty sponsor', city: 'Bengaluru', verifiedCount: 0, demo: true } } },
  // payments track
  { id: 'freeze-pay', concept: 'ambiguous', track: 'pay', kind: 'freeze', video: 'v_pay.mp4', poster: 'pay.webp', freezeAt: 3, kicker: 'Freeze frame',
    q: 'Rahul tapped Pay ONCE. The reply got lost on a bad network. Why two charges?',
    options: [{ t: 'The app retried and the server charged again', ok: true }, { t: 'The bank got hacked' }, { t: 'UPI always charges twice' }],
    explain: 'A lost reply is ambiguous: the app cannot tell "never arrived" from "arrived, reply lost". So it retries, and a server without idempotency charges twice.' },
  { id: 'choice-idem', concept: 'idem', track: 'pay', kind: 'choice', bg: 'pay.webp', kicker: 'Be the server', seconds: 9,
    q: 'Retry #2 arrives with the SAME idempotency key as a payment you already completed. You…',
    options: [{ t: 'Return the saved result. No new charge.', ok: true }, { t: 'Charge again. It is a new request.' }, { t: 'Reject it with an error' }],
    explain: 'Same key = same intent. Replay the stored response so the app gets its answer and the customer pays once.' },
  { id: 'choice-backoff', concept: 'retry', track: 'pay', kind: 'choice', fixes: ['linear'], bg: 'pay.webp', kicker: 'Thundering herd', seconds: 9,
    q: 'The payment server blinks for 2 seconds. 50,000 phones retry every 1 second, all in sync. What happens?',
    options: [{ t: 'A retry storm keeps it down', ok: true }, { t: 'It recovers instantly' }, { t: 'Nothing, retries are free' }],
    explain: 'Synchronised retries hit like a wave. Use exponential backoff (1 s, 2 s, 4 s…) plus random jitter so the phones spread out.' },
  // callbacks: shown first in a LATER session after a miss on that concept
  { id: 'cb-cold', concept: 'cold', track: 'solar', callback: true, kind: 'split', seconds: 7, kicker: 'REMATCH', vo: 'reel_callback',
    q: 'Same string. Which moment pushes more voltage?',
    left: { img: 'noon.webp', label: '1:00 PM · 60 °C cell', v: v(12, 60) }, right: { img: 'dawn.webp', label: '7:00 AM · 5 °C cell', v: v(12, 5) }, answer: 'right',
    explain: `Cold wins every time: ${v(12, 5)} V at 5 °C vs ${v(12, 60)} V at 60 °C.` },
  { id: 'cb-maxstring', concept: 'maxstring', track: 'solar', callback: true, kind: 'bubbles', seconds: 10, kicker: 'REMATCH', vo: 'reel_callback',
    q: `Delhi. ${B2.inv.vmax} V inverter. Voc at ${delhi.tMin} °C = ${B2.vc.toFixed(2)} V. Max panels?`,
    options: uniq([{ t: String(B2.max), ok: true }, { t: String(B2.near === B2.max ? B2.max + 1 : B2.near) }, { t: String(B2.stc) }]),
    explain: `${B2.inv.vmax} ÷ ${B2.vc.toFixed(2)} = ${(B2.inv.vmax / B2.vc).toFixed(2)} → ${B2.max}. Cold first, then round down.` },
  { id: 'cb-series', concept: 'series', track: 'solar', callback: true, kind: 'choice', kicker: 'REMATCH', vo: 'reel_callback', seconds: 10,
    q: `4 panels, ${P.vmp} V and ${P.imp} A each, in PARALLEL. Output?`,
    options: [{ t: `${P.vmp} V · ${(4 * P.imp).toFixed(1)} A`, ok: true }, { t: `${(4 * P.vmp).toFixed(1)} V · ${P.imp} A` }, { t: `${(4 * P.vmp).toFixed(1)} V · ${(4 * P.imp).toFixed(1)} A` }],
    explain: 'Parallel: currents add, voltage stays the same.' },
  { id: 'cb-safety', concept: 'safety', track: 'solar', callback: true, kind: 'spot', img: 'fault_cable.webp', hot: { x: 47, y: 71, r: 19 }, kicker: 'REMATCH', vo: 'reel_callback',
    q: 'After the rain. Tap the hazard.',
    explain: 'A taped DC joint lying in water. Moisture gets in, current leaks to earth, and it can trip or shock. Use proper connectors, clip cables up, run them in conduit.' },
  { id: 'cb-idem', concept: 'idem', track: 'pay', callback: true, kind: 'choice', bg: 'pay.webp', kicker: 'REMATCH', vo: 'reel_callback', seconds: 10,
    q: 'A retry arrives with a key you have seen, but the FIRST request is still processing. You…',
    options: [{ t: 'Answer "in progress". Never start a second charge.', ok: true }, { t: 'Start a second charge to be safe' }, { t: 'Delete the key and retry' }],
    explain: 'Lock the key when work starts. A duplicate during processing must wait or get "in progress", never a second charge.' },
  { id: 'cb-ambiguous', concept: 'ambiguous', track: 'pay', callback: true, kind: 'choice', bg: 'pay.webp', kicker: 'REMATCH', vo: 'reel_callback', seconds: 9,
    q: 'Which lost message makes a retry DANGEROUS without an idempotency key?',
    options: [{ t: 'The reply, after the server already charged', ok: true }, { t: 'The request, before the server saw it' }],
    explain: 'If the request never arrived, a retry is the first charge. If the reply was lost, the charge already happened.' },
]

// ---------------------------------------------------------------- pieces
function Timer({ seconds, running, onEnd }: { seconds?: number; running: boolean; onEnd: () => void }) {
  const [left, setLeft] = useState(seconds ?? 0)
  const fired = useRef(false)
  useEffect(() => {
    if (!seconds || !running) return
    const t0 = performance.now() - ((seconds - left) * 1000)
    const id = setInterval(() => {
      const l = Math.max(0, seconds - (performance.now() - t0) / 1000)
      setLeft(l)
      if (l <= 3 && l > 0 && Math.abs(l - Math.round(l)) < 0.06) sfx('tick', 0.25)
      if (l === 0 && !fired.current) { fired.current = true; onEnd() }
    }, 60)
    return () => clearInterval(id)
  }, [running, seconds]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!seconds) return null
  return <div className="fx-timer" aria-hidden="true"><i style={{ transform: `scaleX(${left / seconds})` }} className={left < 3 ? 'low' : ''} /></div>
}

function Options({ options, picked, onPick, big }: { options: Opt[]; picked: number | null; onPick: (i: number) => void; big?: boolean }) {
  return <div className={`fx-reel-opts ${big ? 'big' : ''}`}>{options.map((o, i) => (
    <button key={o.t} disabled={picked !== null} onClick={() => onPick(i)}
      className={picked === null ? '' : o.ok ? 'right' : picked === i ? 'wrong' : 'dim'}>{o.t}</button>))}</div>
}

function ChallengeForm({ reel }: { reel: Reel }) {
  const { flagOriginal } = useFlux()
  const { scars, update } = useScars()
  const [open, setOpen] = useState(false)
  const [claim, setClaim] = useState('')
  const [evidence, setEvidence] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  if (msg) return <p className="fx-chal-done" role="status">{msg}</p>
  if (!open) return <button className="fx-chal-btn" onClick={() => setOpen(true)}>⚑ Challenge this rule</button>
  const send = () => {
    try {
      if (reel.communityId) {
        const s = scars.find((x) => x.id === reel.communityId)!
        const next = challenge(s, 'You (this device)', claim, evidence, Date.now())
        update(s.id, () => next)
        setMsg('Challenge filed. Domain masters will patch, retire or dismiss it, and every outcome goes in the card’s changelog.')
      } else {
        if (claim.trim().length < 15 || evidence.trim().length < 10) throw new Error('A challenge needs a specific claim and evidence (a standard, a measurement or a counter-example)')
        flagOriginal({ reelId: reel.id, claim, evidence, at: Date.now() })
        setMsg('Sent to the FLUX team review queue. Tested-code cards change only with a new passing test.')
      }
    } catch (e) { setErr((e as Error).message) }
  }
  return <div className="fx-chal" onClick={(e) => e.stopPropagation()}>
    <label>What is wrong or out of date?<textarea value={claim} onChange={(e) => setClaim(e.target.value)} rows={2} placeholder="e.g. The 2027 guideline changed the earthing rule for chargers" /></label>
    <label>Evidence<textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={2} placeholder="Standard + clause, a measurement, or a counter-example" /></label>
    {err && <p className="fx-mis" role="alert">{err}</p>}
    <div className="fx-row"><button className="fx-btn" onClick={send}>File challenge</button><button className="fx-btn ghost" onClick={() => setOpen(false)}>Cancel</button></div>
  </div>
}

function Result({ ok, explain, combo, batt, timeout, reel, reveal }: { ok: boolean; explain: string; combo: number; batt: number; timeout?: boolean; reel: Reel; reveal?: boolean }) {
  const p = provOf(reel)
  return <div className={`fx-reel-result ${ok ? 'ok' : 'bad'}`} role="status">
    <span className="stamp">{reveal ? 'HERE’S WHY' : ok ? (combo >= 3 ? `×${combo} COMBO` : 'NAILED IT') : timeout ? 'TOO SLOW' : 'NOT QUITE'}</span>
    <p>{explain}</p>
    {p.contributor && <p className="fx-credit">{p.origin === 'company_bounty' ? 'Sponsored by' : 'Field Scar by'} <b>{p.contributor.name}</b> · {p.contributor.role}, {p.contributor.city}{p.verifiedBy?.length ? <> · verified by {p.verifiedBy.join(' + ')} (DEMO reviewers)</> : null}</p>}
    {p.changelog && p.changelog.length > 1 && <p className="fx-credit">Changelog: {p.changelog.at(-1)!.note}</p>}
    <div className="fx-recharge"><span>{ok ? 'Memory recharged' : 'Coming back in a later session'}</span><div><i style={{ width: `${Math.round(batt * 100)}%` }} /></div></div>
    <ChallengeForm reel={reel} />
  </div>
}

export function Badges({ p }: { p: Provenance }) {
  return <div className="fx-prov">{badges(p).map((b) => <span key={b.label} className={`fx-badge ${b.tone}`}>{b.label}</span>)}</div>
}

export function ReelView({ reel, active, why, onAnswer, combo, batt, paused }: { reel: Reel; active: boolean; why: string; onAnswer: (ok: boolean) => void; combo: number; batt: number; paused?: boolean }) {
  const [picked, setPicked] = useState<number | null>(null)
  const [result, setResult] = useState<null | { ok: boolean; timeout?: boolean; reveal?: boolean }>(null)
  const [frozen, setFrozen] = useState(false)
  const [tap, setTap] = useState<{ x: number; y: number } | null>(null)
  const [reward, setReward] = useState(false)
  const [asking, setAsking] = useState(false)
  const vid = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!active) { vid.current?.pause(); return }
    if (reel.vo) { const t = setTimeout(() => voice(reel.vo!), 350); return () => { clearTimeout(t); stopVoice() } }
  }, [active]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (reel.kind !== 'freeze' || !active || result) return
    const v = vid.current
    if (!v || matchMedia('(prefers-reduced-motion: reduce)').matches) { setFrozen(true); return }
    v.currentTime = 0
    v.muted = isMuted()
    void v.play().catch(() => { v.muted = true; void v.play().catch(() => setFrozen(true)) })
    const on = () => { if (v.currentTime >= reel.freezeAt) { v.pause(); setFrozen(true); sfx('zap', 0.4); haptic(40) } }
    v.addEventListener('timeupdate', on)
    v.addEventListener('error', () => setFrozen(true))
    // video that cannot start (codec, data saver, slow phone) must never block the decision
    const stall = setTimeout(() => { if (v.currentTime < 0.2) { v.pause(); setFrozen(true) } }, 2500)
    return () => { clearTimeout(stall); v.removeEventListener('timeupdate', on) }
  }, [active]) // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (ok: boolean, timeout = false) => {
    if (result) return
    setResult({ ok, timeout }); onAnswer(ok)
    sfx(ok ? (combo >= 2 ? 'combo' : 'ding') : 'wrong', 0.6); haptic(ok ? [20, 30, 40] : [90, 40, 90])
    if (reel.kind === 'freeze' && vid.current) void vid.current.play().catch(() => {})
    if (reel.kind === 'spot' && reel.reward) setTimeout(() => setReward(true), 500)
  }
  const pick = (i: number, opts: Opt[]) => { setPicked(i); finish(!!opts[i].ok) }
  const running = active && !paused && !result && (reel.kind !== 'freeze' || frozen) && (reel.kind !== 'motion' || asking)
  const seconds = reel.kind === 'motion' ? undefined : reel.kind === 'freeze' ? 8 : reel.kind === 'spot' ? 10 : reel.seconds

  let body: ReactNode = null
  if (reel.kind === 'freeze') body = <>
    <video ref={vid} className="fx-reel-bg" src={media(reel.video)} poster={media(reel.poster)} playsInline preload="metadata" />
    {frozen && !result && <div className="fx-glitch" aria-hidden="true" />}
    <div className="fx-reel-q">{frozen || result ? <><h2>{reel.q}</h2><Options options={reel.options} picked={picked} onPick={(i) => pick(i, reel.options)} /></> : <p className="fx-watch">● Watch closely…</p>}</div>
  </>
  if (reel.kind === 'split') {
    const side = (k: 'left' | 'right') => {
      const s = reel[k]
      const isAns = reel.answer === k
      return <button className={`fx-split-half ${result ? (isAns ? 'right' : 'dim') : ''}`} disabled={!!result} onClick={() => { setPicked(k === 'left' ? 0 : 1); finish(isAns) }}>
        <img src={src(s.img)} alt="" /><span className="lbl">{s.label}</span>{result && <b className="volts">{s.v} V</b>}</button>
    }
    body = <><div className="fx-split">{side('left')}{side('right')}</div><div className="fx-reel-q top"><h2>{reel.q}</h2></div></>
  }
  if (reel.kind === 'spot') body = <>
    <div className="fx-spot" onClick={(e) => {
      if (result) return
      const b = e.currentTarget.getBoundingClientRect()
      const x = ((e.clientX - b.left) / b.width) * 100, y = ((e.clientY - b.top) / b.height) * 100
      setTap({ x, y })
      const dx = x - reel.hot.x, dy = (y - reel.hot.y) * (b.height / b.width)
      finish(Math.hypot(dx, dy) <= reel.hot.r)
    }}>
      {reward && reel.reward ? <video src={media(reel.reward)} poster={src(reel.img)} playsInline muted={isMuted()} ref={autoplay} /> : <img src={src(reel.img)} alt="Photo. Find the hazard." />}
      {tap && <i className="fx-tap" style={{ left: `${tap.x}%`, top: `${tap.y}%` }} />}
      {result && <i className="fx-hotspot" style={{ left: `${reel.hot.x}%`, top: `${reel.hot.y}%`, width: `${reel.hot.r * 2}%` }} />}
    </div>
    <div className="fx-reel-q top"><h2>{reel.q}</h2></div>
  </>
  if (reel.kind === 'choice') body = <>
    {(reel.bg || reel.who) && <img className="fx-reel-bg" src={src(reel.who?.img ?? reel.bg!)} alt="" />}
    <div className="fx-reel-q">
      {reel.who && <p className="fx-bubble"><b>{reel.who.name}</b> {reel.who.line}</p>}
      <h2>{reel.q}</h2><Options options={reel.options} picked={picked} onPick={(i) => pick(i, reel.options)} big={reel.options.length === 2} />
    </div>
  </>
  if (reel.kind === 'motion') {
    const plate = SCENES[reel.scene].plate
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    body = <>
      <MotionStage scene={SCENES[reel.scene]} active={active && !paused} asking={asking} ok={result ? result.ok : null} pick={picked} onAsk={() => setAsking(true)}
        plateSrc={plate && !saveData ? `/media/motion/${plate}.mp4` : undefined} />
      {asking && !result && <div className="fx-reel-q mo-q"><h2>{reel.q}</h2><Options options={reel.options} picked={picked} onPick={(i) => pick(i, reel.options)} big={reel.options.length === 2} />
        <button className="mo-reveal" onClick={() => { setResult({ ok: true, reveal: true }); sfx('whoosh', 0.3) }}>Just show me why ›</button></div>}
    </>
  }
  if (reel.kind === 'bubbles') body = <>
    <div className="fx-reel-q top"><h2>{reel.q}</h2></div>
    <div className="fx-bubbles">{reel.options.map((o, i) => <button key={o.t} disabled={!!result} style={{ left: `${14 + i * 30}%`, animationDelay: `${i * -2.3}s`, animationPlayState: running ? 'running' : 'paused' }}
      className={result ? (o.ok ? 'right' : picked === i ? 'wrong' : 'dim') : ''} onClick={() => pick(i, reel.options)}>{o.t}</button>)}</div>
  </>
  return (
    <article className={`fx-reel ${reel.kind} ${reel.callback ? 'callback' : ''} ${result ? (result.ok ? 'is-ok' : 'is-bad') : ''}`} aria-label={`${reel.kicker}: ${reel.q}`}>
      {body}
      <Timer seconds={seconds} running={running} onEnd={() => finish(false, true)} />
      <div className="fx-reel-meta">
        <span className={`fx-chip ${reel.callback ? 'hot' : ''}`}>{reel.kicker}</span>
        <span className="fx-chip">{CONCEPT_NAMES[reel.concept]}</span>
        {why && <span className="fx-chip why">↻ {why}</span>}
      </div>
      <Badges p={provOf(reel)} />
      {result && <Result ok={result.ok} timeout={result.timeout} reveal={result.reveal} explain={reel.explain} combo={combo} batt={batt} reel={reel} />}
    </article>
  )
}

/** A proof slot in the goal feed: the reels above trained the skill; this opens the unseen assessment. */
function ProofSlot({ competency, why, goal }: { competency: CompetencyId; why: string; goal: string }) {
  const c = byId(competency)
  return <div className="fx-reel end sp-proofslot">
    <span className="fx-kicker">Proof check · {c.assessment?.minutes ?? 3} min · unseen</span>
    <h2 className="fx-h1">{c.title}</h2>
    <p className="fx-sub">{why}. A new task you have not seen, graded by code. Pass it and it goes on your Proof Passport.</p>
    <ul className="sp-rubric">{c.assessment?.rubric.map((r) => <li key={r}>{r}</li>)}</ul>
    <button className="fx-cta in" onClick={() => go('sp-assess', { c: competency, back: goal })}>Prove it now →</button>
    <p className="fx-fine">Or keep swiping and come back later. Skipping costs nothing.</p>
  </div>
}

export function Reels() {
  const { s, now, grade, warp, sessionId } = useFlux()
  const { scars } = useScars()
  const pp = usePassport()
  const goalId = routeParam('goal')
  const job = goalId ? allJobs(pp.s).find((j) => j.id === goalId) : undefined
  const [track, setTrack] = useState<'all' | 'solar' | 'pay'>('all')
  const [active, setActive] = useState(0)
  const [combo, setCombo] = useState(0)
  const [muted, setMute] = useState(isMuted())
  const [paused, setPaused] = useState(false)
  const [gen, setGen] = useState(0)
  const feed: Slot<Reel>[] = useMemo(() => {
    const all = [...scarReels(scars), ...REELS]
    if (job) return rankForGoal(all, job, pp.s.records, s.memory, sessionId, now())
    const learned = new Set(Object.keys(s.memory.cards))
    return orderFeed(all.filter((r) => (track === 'all' || r.track === track) && (r.communityId || learned.has(r.concept))), s.memory, sessionId, now()).map(({ reel, why }) => ({ type: 'reel' as const, reel, why: why || 'You learned this', tag: 'gap' as const }))
  }, [track, gen, sessionId, scars.length, job?.id, pp.s.records.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const els = box.current?.querySelectorAll('[data-i]')
    if (!els) return
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { setActive(+(e.target as HTMLElement).dataset.i!); sfx('whoosh', 0.15) } }), { root: box.current, threshold: 0.6 })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [feed])
  useEffect(() => { const on = () => setMute(isMuted()); addEventListener('flux:mute', on); return () => removeEventListener('flux:mute', on) }, [])
  useEffect(() => () => stopVoice(), [])
  const gaps = job ? job.requires.filter((c) => byId(c).assessment).length : 0
  const left = job ? new Set(feed.filter((f) => f.type === 'proof').map((f) => f.type === 'proof' && f.competency)).size : 0
  return (
    <div className="fx-feed-wrap">
      <header className="fx-hud">
        <button onClick={() => go(job ? 'sp-job' : 'home', job ? { id: job.id } : undefined)} aria-label="Back">←</button>
        {job ? <a className="sp-goalchip" href={`#/sp-job?id=${encodeURIComponent(job.id)}`} aria-label={`Goal: ${job.title}. ${gaps - left} of ${gaps} skills proven.`}>
          <span>🎯 {job.title}</span><b>{gaps - left}/{gaps} proven</b></a>
          : <div className="fx-tracks" role="group" aria-label="Track">{(['all', 'solar', 'pay'] as const).map((t) => <button key={t} aria-pressed={track === t} onClick={() => { setTrack(t); box.current?.scrollTo(0, 0) }}>{t === 'all' ? 'All' : t === 'solar' ? '⚡ Trades' : '₹ Tech'}</button>)}</div>}
        <span className={`fx-combo ${combo >= 3 ? 'hot' : ''}`} aria-label={`Streak ${combo}`}>🔥{combo}</span>
        <button onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume' : 'Pause'} aria-pressed={paused}>{paused ? '▶' : '⏸'}</button>
        <button onClick={() => setMuted(!muted)} aria-label={muted ? 'Sound on' : 'Mute'}>{muted ? '🔇' : '🔊'}</button>
      </header>
      {paused && <div className="sp-paused" role="status"><b>Paused</b><span>Timers are stopped. Nothing is lost: skip, leave or resume any time.</span><button className="fx-cta in" onClick={() => setPaused(false)}>Resume</button></div>}
      <div className="fx-feed" ref={box} key={`${track}-${gen}-${job?.id ?? ''}`}>
        {feed.map((slot, i) => <section className="fx-reel-slot" data-i={i} key={slot.type === 'reel' ? slot.reel.id : `proof-${slot.competency}`}>
          {Math.abs(i - active) > 1 ? <div className="fx-reel placeholder" />
            : slot.type === 'proof' ? <ProofSlot competency={slot.competency} why={slot.why} goal={job!.id} />
              : <ReelView reel={slot.reel} active={i === active} why={slot.why} combo={combo + 1} paused={paused}
                batt={battery(s.memory.cards[slot.reel.concept], now())}
                onAnswer={(ok) => { grade(slot.reel.concept, ok, slot.reel.id); setCombo(ok ? combo + 1 : 0) }} />}
          {i === active && i < feed.length - 1 && <span className="fx-swipe" aria-hidden="true">swipe ↑</span>}
        </section>)}
        {feed.length === 0 && <section className="fx-reel-slot" data-i={0}><div className="fx-reel end">
          <span className="fx-kicker">Revise</span>
          <h2 className="fx-h1">Nothing to revise yet.</h2>
          <p className="fx-sub">Reels bring back what you learned in FLUX Learn, right before you forget it. Finish a lesson and its reels appear here.</p>
          <button className="fx-cta in" onClick={() => go('home')}>Go to my course →</button>
        </div></section>}
        <section className="fx-reel-slot" data-i={Math.max(1, feed.length)}>
          <div className="fx-reel end">
            <span className="fx-kicker">{job ? 'Goal feed cleared' : 'Feed cleared'}</span>
            <h2 className="fx-h1">{job ? (left ? `${left} proof check${left > 1 ? 's' : ''} left for this job.` : 'Every in-app skill for this job is proven.') : 'That\'s today\'s recall.'}</h2>
            <p className="fx-sub">Missed something? It comes back first in your next session. Try it now:</p>
            <button className="fx-cta in" onClick={() => { warp(1); setGen(gen + 1); setActive(0); setCombo(0) }}>⏩ Time-warp 1 day (demo)</button>
            {job && <button className="fx-btn ghost" onClick={() => go('sp-job', { id: job.id })}>See my match for {job.title}</button>}
            <p className="fx-fine">The memory meter is a mirror for you. Reel answers and watch time never award a credential.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
