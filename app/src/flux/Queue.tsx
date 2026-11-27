// Verification queue: 2-of-3 masters per domain, challenges with patch / retire / dismiss, full changelog.
// Same-device DEMO: the reviewers below are fictional and labelled so. A real deployment needs accounts and a server.
import { useState } from 'react'
import { go } from '../router'
import { CONCEPT_NAMES } from './Episode'
import { NEEDED, mastersFor, openChallenges, resolve, review, type Submission } from './community'
import { sfx } from './fx'
import { Badges, ReelView, provOf, scarReels } from './Reels'
import { verdict } from './sieve'
import { setScars, useFlux, useScars } from './store'

const ICON = { ok: '✓', warn: '!', block: '✕' }

function Item({ s }: { s: Submission }) {
  const { scars, update } = useScars()
  const [note, setNote] = useState('')
  const [patch, setPatch] = useState('')
  const [err, setErr] = useState('')
  const [armed, setArmed] = useState(false)
  const [play, setPlay] = useState(false)
  const act = (fn: () => Submission) => { try { const n = fn(); update(s.id, () => n); setErr(''); sfx(n.status === 'live' ? 'combo' : 'tick', 0.5) } catch (e) { setErr((e as Error).message) } }
  const v = verdict(s.checks)
  const cards = scarReels([{ ...s, status: 'live' }])
  return (
    <article className={`fx-qitem ${s.status}`}>
      <div className="fx-qhead">
        <img src={s.photo} alt="" />
        <div>
          <span className={`fx-badge ${s.status === 'live' ? 'field' : s.status === 'pending' ? 'lab' : 'warn'}`}>{s.status.toUpperCase()}</span>
          <h3>{s.rule}</h3>
          <p className="fx-sub">Wrong belief: “{s.wrongBelief}” · {CONCEPT_NAMES[s.concept] ?? s.concept} · by {s.contributor.name}, {s.contributor.role}, {s.contributor.city}</p>
          {s.voiceNote && <audio controls src={s.voiceNote} />}
        </div>
      </div>
      <details><summary>Sieve: {v === 'warn' ? 'passed with notes' : v === 'ok' ? 'clean' : 'blocked'} ({s.checks.filter((c) => c.level !== 'ok').length} notes)</summary>
        <ul className="fx-checks">{s.checks.map((c, i) => <li key={c.id + i} className={c.level}><b>{ICON[c.level]}</b><span><strong>{c.label}</strong> {c.detail}</span></li>)}</ul></details>
      <button className="fx-btn ghost" onClick={() => setPlay(!play)}>{play ? 'Hide cards' : '▶ Play the cards'}</button>
      {play && <div className="fx-preview">{cards.map((r) => <ReelView key={r.id} reel={r} active={false} why="" combo={1} batt={0} onAnswer={() => {}} />)}</div>}
      {s.status === 'pending' && <div className="fx-masters">
        <p className="fx-kicker">Master review · {s.reviews.filter((r) => r.verdict === 'approve').length}/{NEEDED} approvals</p>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (required to reject)" aria-label="Review note" />
        {mastersFor(s.domain).map((m) => {
          const done = s.reviews.find((r) => r.reviewer === m.id)
          return <div key={m.id} className="fx-master">
            <span><b>{m.name}</b> <em>DEMO</em><small>{m.role} · passport {m.passport}</small></span>
            {done ? <span className={`fx-verd ${done.verdict}`}>{done.verdict === 'approve' ? '✓ approved' : `✕ ${done.note}`}</span> : <span className="fx-row">
              <button className="fx-btn" onClick={() => act(() => review(s, m.id, 'approve', note, Date.now()))}>Approve</button>
              <button className="fx-btn hot" onClick={() => act(() => review(s, m.id, 'reject', note, Date.now()))}>Reject</button></span>}
          </div>
        })}
      </div>}
      {openChallenges(s).map((c) => <div key={c.id} className="fx-challenge">
        <p className="fx-kicker">Open challenge by {c.by}</p>
        <p><b>{c.claim}</b><br /><span className="fx-sub">Evidence: {c.evidence}</span></p>
        <input value={patch} onChange={(e) => setPatch(e.target.value)} placeholder="Corrected explanation (for a patch)" aria-label="Patch text" />
        {mastersFor(s.domain).slice(0, 1).map((m) => <div key={m.id} className="fx-row">
          <span className="fx-sub">Resolve as {m.name} (DEMO):</span>
          <button className="fx-btn" onClick={() => act(() => resolve(s, c.id, m.id, 'patched', Date.now(), patch))}>Patch</button>
          <button className="fx-btn hot" onClick={() => act(() => resolve(s, c.id, m.id, 'retired', Date.now()))}>Retire card</button>
          <button className="fx-btn ghost" onClick={() => act(() => resolve(s, c.id, m.id, 'dismissed', Date.now()))}>Dismiss</button>
        </div>)}
      </div>)}
      {err && <p className="fx-mis" role="alert">{err}</p>}
      <ol className="fx-changelog">{s.changelog.map((c, i) => <li key={i}><time>{new Date(c.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time> {c.note}</li>)}</ol>
      <button className="fx-reset" onClick={() => { if (armed) setScars(scars.filter((x) => x.id !== s.id)); else setArmed(true) }}>{armed ? 'Tap again to delete this Field Scar from this device' : 'Delete from this device'}</button>
    </article>
  )
}

export function Queue() {
  const { scars } = useScars()
  const { s } = useFlux()
  const order = ['pending', 'live', 'rejected', 'retired']
  const list = [...scars].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || b.createdAt - a.createdAt)
  const live = scars.filter((x) => x.status === 'live').length
  return (
    <div className="fx-hub fx-queue">
      <header className="fx-top"><button className="fx-back" onClick={() => go('home')} aria-label="Back home">←</button><span className="fx-logo"><b>FLUX</b><i>verification queue</i></span></header>
      <section className="fx-hero">
        <p className="fx-kicker">2-of-3 masters · challenge forever</p>
        <h1 className="fx-h1">Nothing reaches the feed unverified.</h1>
        <p className="fx-sub">Each Field Scar needs two approvals from masters in its domain. Live cards stay open to challenge: a master can patch the rule, retire the card or dismiss the challenge, and every step lands in the changelog.</p>
        <p className="fx-fine">Same-device DEMO: the masters are fictional and labelled DEMO. In production they are people with high Proof Passport scores, each reviewing on their own account.</p>
      </section>
      <div className="fx-tiers">
        <div><Badges p={{ origin: 'flux_original', mediaSource: 'code_rendered', truth: 'tested_code', isDemo: false }} /><p>Full labs built by the FLUX team on tested code.</p></div>
        <div><Badges p={{ origin: 'community_verified', mediaSource: 'real_capture', truth: 'master_review', isDemo: false, verifiedBy: ['a', 'b'] }} /><p>Real captures from practitioners, compiled into games. {live} live on this device.</p></div>
        <div><Badges p={provOf({ id: 'x', concept: 'idem', track: 'pay', kind: 'choice', kicker: '', explain: '', q: '', options: [], prov: { origin: 'company_bounty', mediaSource: 'none', truth: 'team_authored', isDemo: true } })} /><p>Sanitised problems sponsored by hiring partners (DEMO only so far).</p></div>
      </div>
      {list.length === 0 ? <section className="fx-card"><h2>No Field Scars yet</h2><p className="fx-sub">Capture one in the studio. It shows up here for review.</p><button className="fx-cta in" onClick={() => go('flux-studio')}>Open the capture studio</button></section>
        : list.map((x) => <Item key={x.id} s={x} />)}
      {s.teamFlags.length > 0 && <section className="fx-card"><span className="fx-kicker">Challenges on FLUX originals · for the team</span>
        <ul className="fx-checks">{s.teamFlags.map((t, i) => <li key={i} className="warn"><b>!</b><span><strong>{t.reelId}</strong> {t.claim} · <em>{t.evidence}</em></span></li>)}</ul>
        <p className="fx-fine">A tested-code card only changes with a new passing test in the rule engine.</p></section>}
    </div>
  )
}
