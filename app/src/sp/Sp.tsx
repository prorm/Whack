// ScrollProof: one product, five seats. Learn (goal feed) → Jobs (explainable match) → Proof Passport (inspectable
// evidence, consent) → Teach (Field Scars + impact) → Employer demo (missions, shortlist, invite).
// FLUX is the engine underneath. Every person, employer and listing here is DEMO and labelled so.
import { Fragment, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useDelivery } from '../Chrome'
import { request } from '../learn/sync'
import { routeParam, type Route } from '../router'
import { CONCEPT_NAMES } from '../flux/Episode'
import { misconception } from '../flux/assess'
import { CHECKLIST, LEVELS, intact, latestFor, levelOf, statusOf, visibleTo, type CheckId, type EvidenceRecord, type Level } from '../flux/passport'
import { allJobs, resetPassport, seedDemo, taskFor, usePassport } from '../flux/passportStore'
import { COMPETENCIES, SEED_JOBS, byId, matchJob, needsSupervision, type CompetencyId, type Job, type Match } from '../flux/skills'
import { useFlux, useScars } from '../flux/store'
import { CourseMap } from '../flux/learn/Learn'
import { Home } from '../flux/learn/Home'
import { resetCourse } from '../flux/learn/courseStore'
import { DEMO_CANDIDATES } from './demoCandidates'
import '../flux/flux.css'
import './sp.css'

const href = (r: Route, p?: Record<string, string>) => `#/${r}${p ? '?' + new URLSearchParams(p) : ''}`
const TABS: { id: string; label: string; icon: string; route: Route }[] = [
  { id: 'learn', label: 'Learn', icon: '▶', route: 'home' },
  { id: 'revise', label: 'Revise', icon: '↻', route: 'flux-reels' },
  { id: 'passport', label: 'Proof', icon: '◆', route: 'sp-passport' },
  { id: 'jobs', label: 'Jobs', icon: '◎', route: 'sp-jobs' },
  { id: 'teach', label: 'Teach', icon: '✚', route: 'sp-teach' },
]
const fmt = (t: number) => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
/** Projects have many right designs: show the rule, not one 'key'. */
const keyOf = (r: EvidenceRecord, id: string) => r.assessmentId === 'proj.rooftop' ? 'any design passing all checks' : String(r.key[id])
const LEVEL_LABEL = Object.fromEntries(LEVELS.map((l) => [l.id, l.label])) as Record<Level, string>

export function Shell({ tab, children, light }: { tab: string; children: ReactNode; light?: boolean }) {
  const { online } = useDelivery()
  return <div className={`fx-root sp-root ${light ? 'sp-light' : ''}`} lang="en">
    <a href="#sp-main" className="sp-skip" onClick={(e) => { e.preventDefault(); document.getElementById('sp-main')?.focus() }}>Skip to content</a>
    <header className="sp-top">
      <a href="#/home" className="sp-brand" aria-label="ScrollProof home"><span className="sp-mark" aria-hidden="true"><i /><i /><i /></span><span>Scroll<b>Proof</b></span></a>
      <span className="sp-engine">powered by FLUX</span>
      {!online && <span className="sp-off" role="status">Offline · learning still works</span>}
    </header>
    <main id="sp-main" tabIndex={-1} className="sp-main">{children}</main>
    <nav className="sp-tabs" aria-label="Main">
      {TABS.map((t) => <a key={t.id} href={href(t.route)} aria-current={tab === t.id ? 'page' : undefined}><span aria-hidden="true">{t.icon}</span>{t.label}</a>)}
    </nav>
  </div>
}

// ---------------------------------------------------------------- shared bits
function StateBadge({ row }: { row: Match['rows'][number] }) {
  if (row.state === 'in_person') return <span className="sp-state inperson">In person</span>
  if (row.state === 'evidenced') return <span className={`sp-state ok ${row.level}`}>{LEVEL_LABEL[row.level as Level] ?? 'Proven'}</span>
  if (row.state === 'failed') return <span className="sp-state bad">Retake</span>
  return <span className="sp-state none">Not proven</span>
}

function Meter({ m }: { m: Match }) {
  return <div className="sp-meter" role="img" aria-label={`${m.have} of ${m.need} in-app skills proven`}>
    {Array.from({ length: m.need }, (_, i) => <i key={i} className={i < m.have ? 'on' : ''} />)}
    <span>{m.have}/{m.need}</span>
  </div>
}

function MatchRows({ job, m, learner = true }: { job: Job; m: Match; learner?: boolean }) {
  return <ol className="sp-reqs">{m.rows.map((r) => {
    const c = byId(r.id)
    return <li key={r.id} className={`sp-req ${r.state}`}>
      <div><b>{c.title}</b><small>{c.can}</small>{r.state === 'in_person' && <small className="sp-note">{c.inPerson}</small>}</div>
      <div className="sp-req-side"><StateBadge row={r} />
        {learner && r.state !== 'evidenced' && r.state !== 'in_person' && <span className="sp-req-act">
          <a className="fx-btn ghost" href={'#/' + c.lessons[0].route}>Learn</a>
          <a className="fx-btn" href={href('sp-assess', { c: r.id, back: job.id })}>Prove</a></span>}
        {r.recordId && <a className="sp-link" href={href('sp-passport', { r: r.recordId })}>evidence</a>}
      </div>
    </li>
  })}</ol>
}

function DemoTag({ children = 'DEMO' }: { children?: ReactNode }) { return <span className="sp-demo">{children}</span> }

// ---------------------------------------------------------------- Learn (home): the course is the product
export function SpHome() {
  const pp = usePassport()
  const jobs = allJobs(pp.s)
  const invites = pp.s.invites.filter((i) => i.candidateId === 'me' && i.status === 'sent')
  // reproducible demo: #/home?demo=seed loads the seeded learner, #/home?demo=reset wipes this device
  const demo = routeParam('demo')
  useEffect(() => {
    if (demo === 'seed') { sessionStorage.clear(); seedDemo(); location.replace('#/home'); location.reload() }
    if (demo === 'reset') { wipeDevice(); location.replace('#/home'); location.reload() }
  }, [demo])
  return <Shell tab="learn">
    {invites.map((i) => { const j = jobs.find((x) => x.id === i.jobId); return j && <a key={i.id} className="sp-invite" href={href('sp-job', { id: j.id })}>
      <b>Interview invite · {j.employer}</b><span>{j.title} · {i.slot}</span><DemoTag>DEMO · not a job offer</DemoTag></a> })}
    <Home />
    <DemoControls />
  </Shell>
}

/** One course's map (the solar course today). */
export function SpCourse() {
  return <Shell tab="learn"><CourseMap /></Shell>
}

function wipeDevice() {
  resetPassport(); resetCourse()
  localStorage.removeItem('scrollproof:flux:v1'); sessionStorage.clear()
}
function DemoControls() {
  const [armed, setArmed] = useState(false)
  return <section className="sp-demo-ctl" aria-label="Demo controls">
    <p className="fx-kicker">Demo controls</p>
    <p className="fx-fine">Load a seeded learner: lessons 1–4 finished, two proof attempts graded by the real grader (one pass, one fail with a named mistake), marked DEMO SEED. Nothing is reviewed or shared.</p>
    <div className="fx-row">
      <button className="fx-btn" onClick={() => { sessionStorage.clear(); seedDemo(); location.reload() }}>Load demo learner</button>
      <button className="fx-btn ghost" onClick={() => { if (!armed) return setArmed(true); wipeDevice(); location.reload() }}>{armed ? 'Tap again: erase everything on this device' : 'Reset demo'}</button>
    </div>
  </section>
}

function JobCard({ job, m, onAim }: { job: Job; m: Match; onAim?: () => void }) {
  return <article className="sp-job">
    <header><span className="sp-muted">{job.employer} · {job.city}</span>{needsSupervision(job) && <span className="sp-sup">Supervised</span>}</header>
    <h3><a href={href('sp-job', { id: job.id })}>{job.title}</a></h3>
    <p className="sp-muted">{job.pay}</p>
    <Meter m={m} />
    <p className="sp-chips">{m.rows.map((r) => <span key={r.id} className={`sp-chip ${r.state}`}>{byId(r.id).title}</span>)}</p>
    <div className="fx-row">{onAim && <button className="fx-btn" onClick={onAim}>Make this my goal</button>}<a className="fx-btn ghost" href={href('sp-job', { id: job.id })}>Details</a></div>
  </article>
}

// ---------------------------------------------------------------- Jobs
export function SpJobs() {
  const pp = usePassport()
  const st = (c: CompetencyId) => statusOf(pp.s.records, c)
  const jobs = allJobs(pp.s)
  const goal = jobs.find((j) => j.id === pp.s.goal)
  const m = goal ? matchJob(goal, st) : null
  return <Shell tab="jobs">
    <h1 className="sp-h1">Opportunities that match what you can prove</h1>
    <p className="fx-sub">No hidden score. Each role lists the exact skills it needs and which ones your evidence covers. All listings are DEMO.</p>
    {goal && m && <section className="sp-goal" aria-labelledby="goal-h">
      <div className="sp-goal-head"><p className="fx-kicker">Your goal</p><button className="sp-link" onClick={() => pp.setGoal(undefined)}>change</button></div>
      <h2 id="goal-h">{goal.title}</h2>
      <p className="sp-muted">{goal.employer} · {goal.city} · {goal.pay}</p>
      <Meter m={m} />
      <p className={`sp-outcome ${m.eligible ? 'ok' : ''}`}>{m.outcome}</p>
      <MatchRows job={goal} m={m} />
    </section>}
    <ul className="sp-jobs">{jobs.filter((j) => j.id !== goal?.id).map((j) => <li key={j.id}><JobCard job={j} m={matchJob(j, st)} onAim={() => pp.setGoal(j.id)} /></li>)}</ul>
    <a className="sp-employer-link" href={href('sp-employer')}><b>Hiring? Open the employer seat (DEMO)</b><span>Post a skill mission, see consenting candidates, inspect their evidence, invite.</span></a>
  </Shell>
}

export function SpJob() {
  const pp = usePassport()
  const job = allJobs(pp.s).find((j) => j.id === routeParam('id')) ?? SEED_JOBS[0]
  const m = matchJob(job, (c) => statusOf(pp.s.records, c))
  const relevant = useMemo(() => {
    const ids = new Set(job.requires.map((c) => latestFor(pp.s.records, c)?.id).filter(Boolean) as string[])
    return pp.s.records.filter((r) => ids.has(r.id))
  }, [job, pp.s.records])
  const shared = pp.s.shares.filter((x) => x.employerId === job.employerId && !x.revokedAt)
  const [pick, setPick] = useState<string[]>([])
  const [agree, setAgree] = useState(false)
  const invite = pp.s.invites.find((i) => i.jobId === job.id && i.candidateId === 'me')
  return <Shell tab="jobs">
    <a className="sp-back" href={href('sp-jobs')}>← Jobs</a>
    <p className="fx-kicker">{job.employer} · {job.city} <DemoTag /></p>
    <h1 className="sp-h1">{job.title}</h1>
    <p className="fx-sub">{job.summary}</p>
    <p className="sp-muted">{job.pay}</p>
    {needsSupervision(job) && <p className="sp-warn">Hazardous trade. Passing simulations here can only earn a <b>supervised practical assessment</b> or apprenticeship consideration, never unsupervised electrical work.</p>}
    {invite && <section className="sp-invite big" aria-label="Interview invite">
      <b>Interview invite from {job.employer}</b><span>{invite.slot}</span><p>{invite.note}</p>
      <DemoTag>DEMO · same-device preview · not a job offer</DemoTag>
      {invite.status === 'sent' ? <div className="fx-row"><button className="fx-btn" onClick={() => pp.answerInvite(invite.id, 'accepted')}>Accept slot</button><button className="fx-btn ghost" onClick={() => pp.answerInvite(invite.id, 'declined')}>Decline</button></div>
        : <p className="sp-muted">You {invite.status} this invite.</p>}
    </section>}
    <section className="sp-panel">
      <div className="sp-goal-head"><h2>Your match</h2><Meter m={m} /></div>
      <p className={`sp-outcome ${m.eligible ? 'ok' : ''}`}>{m.outcome}</p>
      <MatchRows job={job} m={m} />
      <div className="fx-row">
        <a className="fx-cta in" href={href('home')} onClick={() => pp.setGoal(job.id)}>Learn for this job →</a>
        <a className="fx-btn ghost" href={href('flux-reels', { goal: job.id })} onClick={() => pp.setGoal(job.id)}>Revise for this job</a>
      </div>
    </section>
    <section className="sp-panel" aria-labelledby="share-h">
      <h2 id="share-h">Show my evidence to {job.employer}</h2>
      <p className="sp-muted">Nothing is shared until you choose. You pick the records; you can revoke any time. This is a same-device preview: no message leaves this phone.</p>
      {relevant.length === 0 ? <p className="sp-muted">No graded attempts for this job's skills yet.</p> : <>
        <ul className="sp-picks">{relevant.map((r) => <li key={r.id}><label><input type="checkbox" checked={pick.includes(r.id)} onChange={() => setPick(pick.includes(r.id) ? pick.filter((x) => x !== r.id) : [...pick, r.id])} />
          <span><b>{r.taskLabel}</b> · {Object.entries(r.outcomes).map(([c, o]) => `${byId(c as CompetencyId).title} ${o?.pass ? '✓' : '✗'}`).join(' · ')}</span></label></li>)}</ul>
        <label className="sp-agree"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I agree to show exactly these records, including my answers, to {job.employer}. I can revoke this.</label>
        <button className="fx-btn" disabled={!agree || !pick.length} onClick={() => { pp.share(job.employerId, pick); setPick([]); setAgree(false) }}>Share {pick.length || ''} record{pick.length === 1 ? '' : 's'}</button>
      </>}
      {shared.length > 0 && <ul className="sp-shares">{shared.map((x) => <li key={x.id}><span>Shared {x.recordIds.length} record{x.recordIds.length > 1 ? 's' : ''} · {fmt(x.at)}</span><button className="fx-btn hot" onClick={() => pp.unshare(x.id)}>Revoke</button></li>)}</ul>}
      {shared.length > 0 && <a className="sp-link" href={href('sp-employer', { job: job.id })}>See what the employer sees (demo) →</a>}
    </section>
  </Shell>
}

// ---------------------------------------------------------------- Prove (assessment)
export function SpAssess() {
  const pp = usePassport()
  const cid = (routeParam('c') ?? 'solar.series') as CompetencyId
  const back = routeParam('back')
  const comp = byId(cid)
  const a = comp.assessment
  const demoVariant = cid === 'solar.cold-max' && routeParam('demo') === 'work-order'
  const [seed, setSeed] = useState(() => demoVariant ? 8301 : 1 + Math.floor(Math.random() * 999_999))
  const [fixedVariant, setFixedVariant] = useState(demoVariant)
  const task = useMemo(() => a ? taskFor(a.id, seed) : null, [a, seed])
  const [ans, setAns] = useState<Record<string, string>>({})
  const [rec, setRec] = useState<EvidenceRecord | null>(null)
  if (!a || !task) return <Shell tab="jobs"><h1 className="sp-h1">{comp.title}</h1><p className="sp-warn">{comp.inPerson}</p></Shell>
  const submit = (e: FormEvent) => { e.preventDefault(); setRec(pp.submit(task, ans)) }
  const longLog = task.givens.length > 4
  const covered = Object.keys(rec?.outcomes ?? {}) as CompetencyId[]
  return <Shell tab="jobs">
    {back ? <a className="sp-back" href={href('flux-reels', { goal: back })}>← Back to my feed</a> : <a className="sp-back" href={href('sp-passport')}>← Passport</a>}
    <p className="fx-kicker">Proof check · {a.label} · v{a.version}</p>
    <h1 className="sp-h1">{comp.title}</h1>
    <p className="fx-sub">{fixedVariant ? 'Fixed demo variant' : 'A fresh task'} generated from seed {seed}. The grader checks your answers against the rules of the task.</p>
    <div className="fx-ticket">
      <header><b>{task.label}</b><span>DEMO task</span></header>
      <p className="sp-story">{task.story}</p>
      {longLog ? <ol className="sp-log">{task.givens.map((g) => <li key={g.label}><code>{g.value}</code></li>)}</ol>
        : <dl>{task.givens.map((g) => <Fragment key={g.label}><dt>{g.label}</dt><dd>{g.value}</dd></Fragment>)}</dl>}
    </div>
    <form onSubmit={submit}>
      <div className="fx-inputs">{task.asks.map((q) => <label key={q.id}>{q.label} ({q.unit})
        <input inputMode="decimal" value={ans[q.id] ?? ''} disabled={!!rec} onChange={(e) => setAns({ ...ans, [q.id]: e.target.value })} aria-describedby={rec ? `fb-${q.id}` : undefined} /></label>)}</div>
      {!rec && <button className="fx-cta in sp-wide" disabled={task.asks.some((q) => !ans[q.id]?.trim())}>Submit for grading</button>}
    </form>
    {rec && <section className={`fx-result ${Object.values(rec.outcomes).every((o) => o?.pass) ? 'ok' : 'bad'}`} role="status">
      {task.asks.map((q) => <p key={q.id} id={`fb-${q.id}`}><b>{q.label}: {rec.perAsk[q.id] ? '✓' : `✗ → ${rec.key[q.id]}`}</b></p>)}
      {covered.map((c) => { const o = rec.outcomes[c]!; return <div key={c} className="sp-oc"><b>{byId(c).title}: {o.pass ? 'PROVEN · system-assessed' : 'not yet'}</b>
        {o.misconceptions.map((x) => <p key={x} className="fx-mis">{misconception(x).title}. {misconception(x).repair}</p>)}</div> })}
      <details><summary>Worked solution</summary>{rec.working.map((w) => <p key={w}>{w}</p>)}</details>
      <p className="fx-fine">Saved as attempt <code>{rec.id}</code> · fingerprint <code>{rec.fingerprint}</code>. A new attempt replaces this one for matching.</p>
      <div className="fx-row">
        <a className="fx-cta in" href={href('sp-passport', { r: rec.id, ...(back ? { job: back } : {}) })}>Inspect evidence</a>
        {back && (Object.values(rec.outcomes).every((o) => o?.pass)
          ? <a className="fx-btn ghost" href={href('sp-job', { id: back })}>See my job match →</a>
          : <a className="fx-btn ghost" href={href('flux-reels', { goal: back })}>Practise with repair reels</a>)}
        <button className="fx-btn ghost" onClick={() => {
          const nextSeed = (seed + Math.floor(Math.random() * 999_998)) % 999_999 + 1
          setSeed(nextSeed); setFixedVariant(false); setAns({}); setRec(null)
        }}>New unseen task</button>
      </div>
    </section>}
    <p className="fx-fine">Practice and reels never award anything. Only a graded attempt counts, and for safety-critical trades it earns a supervised next step, not a licence.</p>
  </Shell>
}

// ---------------------------------------------------------------- Passport
export function SpPassport() {
  const pp = usePassport()
  const sel = routeParam('r')
  const recs = [...pp.s.records].sort((a, b) => b.at - a.at)
  const open = recs.find((r) => r.id === sel)
  const job = routeParam('job')
  const inApp = COMPETENCIES.filter((c) => c.assessment)
  return <Shell tab="passport">
    <p className="fx-kicker">Proof Passport</p>
    <h1 className="sp-h1">Your evidence</h1>
    <p className="fx-sub">What you can do, with the exact task, answers and grading behind each claim. You control who sees it.</p>
    {open && <RecordView r={open} job={job} />}
    <ol className="sp-levels">{LEVELS.map((l) => <li key={l.id} className={l.id}><b>{l.label}</b><span>{l.meaning}</span></li>)}</ol>
    <section className="sp-panel">
      <h2>Skills</h2>
      <ul className="sp-skills">{inApp.map((c) => {
        const st = statusOf(pp.s.records, c.id)
        return <li key={c.id} className={st.state}>
          <div><b>{c.title}</b><small>{st.note ?? c.can}</small></div>
          <div className="sp-req-side">{st.state === 'evidenced' ? <span className={`sp-state ok ${st.level}`}>{LEVEL_LABEL[st.level!]}</span> : st.state === 'failed' ? <span className="sp-state bad">Retake</span> : <span className="sp-state none">—</span>}
            {st.recordId ? <a className="sp-link" href={href('sp-passport', { r: st.recordId })}>inspect</a> : <a className="sp-link" href={href('sp-assess', { c: c.id })}>prove</a>}</div>
        </li>
      })}
        <li className="in_person"><div><b>{byId('site.safety').title}</b><small>{byId('site.safety').inPerson}</small></div><span className="sp-state inperson">In person</span></li>
      </ul>
    </section>
    {!open && <section className="sp-panel"><h2>Attempts</h2>
      {recs.length === 0 ? <p className="sp-muted">No graded attempts yet. Pick a job on Learn, swipe the reels, then take a proof check.</p>
        : <ul className="sp-attempts">{recs.map((r) => <li key={r.id}><a href={href('sp-passport', { r: r.id })}><b>{r.taskLabel}</b><span>{Object.entries(r.outcomes).map(([c, o]) => `${byId(c as CompetencyId).title} ${o?.pass ? '✓' : '✗'}`).join(' · ')}</span><small>{fmt(r.at)}{r.source === 'demo_seed' ? ' · DEMO SEED' : ''}</small></a></li>)}</ul>}
    </section>}
  </Shell>
}

function RecordView({ r, job }: { r: EvidenceRecord; job: string | null }) {
  const pp = usePassport()
  const ok = intact(r)
  const covers = Object.keys(r.outcomes) as CompetencyId[]
  const current = covers.every((c) => latestFor(pp.s.records, c)?.id === r.id)
  const [checks, setChecks] = useState<Record<CheckId, boolean>>({ version: false, response: false, working: false, conditions: false })
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const [link, setLink] = useState<{ url?: string; token?: string; err?: string }>({})
  const myShares = pp.s.shares.filter((x) => x.recordIds.includes(r.id))
  const allPass = Object.values(r.outcomes).every((o) => o?.pass)
  const doReview = (decision: 'approved' | 'needs_another_attempt') => {
    try { setErr(''); pp.review(r.id, { reviewer: 'Demo trainer', demo: true, checklist: checks, decision, reason: decision === 'approved' ? undefined : reason, at: Date.now() }) } catch (e) { setErr((e as Error).message) }
  }
  const makeLink = async () => {
    try {
      const res = await request<{ token: string; regraded: boolean }>('/api/proof/share', { record: r })
      const url = `${location.origin}${location.pathname}#/sp-view?t=${res.token}`
      setLink({ url, token: res.token }); pp.share('public-link', [r.id], res.token)
    } catch (e) { setLink({ err: (e as Error).message.includes('fetch') || (e as Error).message.includes('server') ? 'Share links need the ScrollProof server (npm start). Same-device sharing on the Jobs page still works.' : (e as Error).message }) }
  }
  const revokeLink = async (shareId: string, token?: string) => {
    if (token) { try { await request('/api/proof/revoke', { token }) } catch { /* local revoke still applies */ } }
    pp.unshare(shareId); setLink({})
  }
  return <section className="sp-panel sp-record" aria-labelledby="rec-h">
    <div className="sp-record-nav">
      <a className="sp-back" href={href('sp-passport')}>← All attempts</a>
      {job && <a className="sp-link" href={href('sp-job', { id: job })}>See my job match →</a>}
    </div>
    <h2 id="rec-h">{r.taskLabel} <small>attempt {r.id}</small></h2>
    {r.source === 'demo_seed' && <DemoTag>DEMO SEED · graded by the real grader from scripted answers</DemoTag>}
    <h3>Submitted vs key</h3>
    <table className="sp-table"><thead><tr><th>Ask</th><th>Answer</th><th>Key</th><th>Result</th></tr></thead><tbody>
      {r.asks.map((a) => <tr key={a.id}><td>{a.label}</td><td><code>{r.response[a.id]}</code></td><td>{keyOf(r, a.id)} {r.assessmentId === 'proj.rooftop' ? '' : a.unit}</td><td>{r.perAsk[a.id] ? 'Pass' : 'Miss'}</td></tr>)}</tbody></table>
    <dl className="sp-dl">
      <dt>Assessment</dt><dd>{r.assessmentId} · version {r.version} · seed {r.seed}</dd>
      <dt>Assessed</dt><dd>{fmt(r.at)}</dd>
      <dt>Graded by</dt><dd>Deterministic code on this device (no AI). The server re-grades from seed + answers before any share link.</dd>
      <dt>Fingerprint</dt><dd><code>{r.fingerprint}</code> {ok ? '· intact' : '· EDITED AFTER GRADING: not valid'}<br /><small>Detects edits to this record. It does not prove who took the task or rule out help.</small></dd>
      <dt>Status</dt><dd>{current ? 'Current attempt for its skills' : 'Superseded by a newer attempt: no longer counts for matching'}</dd>
    </dl>
    <h3>Task</h3><p>{r.story}</p>
    <ul className="sp-givens">{r.givens.map((g) => <li key={g.label}><b>{g.label}</b> {g.value}</li>)}</ul>
    <h3>Rubric</h3><ul>{r.rubric.map((x) => <li key={x}>{x}</li>)}</ul>
    {r.note && <><h3>Learner’s explanation (for trainer review, not graded)</h3><blockquote className="sp-note-q">{r.note}</blockquote></>}
    <h3>Outcome</h3>
    {covers.map((c) => { const o = r.outcomes[c]!; return <div key={c} className={`sp-oc ${o.pass ? 'ok' : 'bad'}`}><b>{byId(c).title}: {o.pass ? LEVEL_LABEL[levelOf(r, c)] : 'not proven'}</b>
      {o.misconceptions.map((x) => <p key={x} className="fx-mis">{misconception(x).title}. {misconception(x).repair}</p>)}</div> })}
    <details><summary>Worked solution</summary>{r.working.map((w) => <p key={w}>{w}</p>)}</details>

    <h3>Trainer review</h3>
    {r.review ? <p className={`sp-oc ${r.review.decision === 'approved' ? 'ok' : 'bad'}`}><b>{r.review.decision === 'approved' ? 'Approved' : 'Needs another attempt'}</b> by {r.review.reviewer} <DemoTag /> · {fmt(r.review.at)} · bound to attempt {r.review.attemptId} and fingerprint {r.review.fingerprint}{r.review.reason ? ` · “${r.review.reason}”` : ''}</p>
      : <div className="sp-review">
        <p className="sp-muted">Trainer seat (DEMO, same device). A review binds to this exact attempt and fingerprint. A new attempt detaches it.</p>
        {CHECKLIST.map((c) => <label key={c.id}><input type="checkbox" checked={checks[c.id]} onChange={(e) => setChecks({ ...checks, [c.id]: e.target.checked })} /> {c.label}</label>)}
        <input className="sp-field" placeholder="Reason if asking for another attempt" value={reason} onChange={(e) => setReason(e.target.value)} />
        {err && <p className="fx-mis" role="alert">{err}</p>}
        <div className="fx-row"><button className="fx-btn" disabled={!allPass || !ok} onClick={() => doReview('approved')}>Approve</button><button className="fx-btn ghost" onClick={() => doReview('needs_another_attempt')}>Ask for another attempt</button></div>
        {!allPass && <p className="fx-fine">Only an attempt that passed every part can be approved.</p>}
      </div>}

    <h3>Who can see this</h3>
    {myShares.length === 0 ? <p className="sp-muted">Only you.</p> : <ul className="sp-shares">{myShares.map((x) => <li key={x.id}><span>{x.employerId === 'public-link' ? 'Anyone with the link' : SEED_JOBS.find((j) => j.employerId === x.employerId)?.employer ?? x.employerId} · {x.revokedAt ? `revoked ${fmt(x.revokedAt)}` : `since ${fmt(x.at)}`}</span>
      {!x.revokedAt && <button className="fx-btn hot" onClick={() => revokeLink(x.id, x.token)}>Revoke</button>}</li>)}</ul>}
    <div className="fx-row"><button className="fx-btn" onClick={makeLink}>Create share link</button></div>
    {link.url && <p className="sp-linkbox"><code>{link.url}</code><button className="fx-btn ghost" onClick={() => navigator.clipboard?.writeText(link.url!)}>Copy</button></p>}
    {link.err && <p className="fx-mis" role="alert">{link.err}</p>}
  </section>
}

// ---------------------------------------------------------------- public share link viewer
export function SpView() {
  const t = routeParam('t') ?? ''
  const [state, setState] = useState<{ status: 'loading' | 'ok' | 'revoked' | 'missing' | 'offline'; data?: { record: EvidenceRecord; regraded: boolean; at: number } }>({ status: 'loading' })
  useEffect(() => {
    fetch(`/api/proof/public/${encodeURIComponent(t)}`).then(async (res) => {
      if (res.status === 410) return setState({ status: 'revoked' })
      if (!res.ok) return setState({ status: 'missing' })
      setState({ status: 'ok', data: await res.json() })
    }).catch(() => setState({ status: 'offline' }))
  }, [t])
  const r = state.data?.record
  return <div className="fx-root sp-root sp-light"><main className="sp-main" id="sp-main">
    <p className="fx-kicker">ScrollProof · shared evidence</p>
    {state.status === 'loading' && <p>Loading…</p>}
    {state.status === 'revoked' && <><h1 className="sp-h1">The learner revoked this link.</h1><p className="sp-muted">The server no longer serves this record.</p></>}
    {state.status === 'missing' && <h1 className="sp-h1">No record at this link.</h1>}
    {state.status === 'offline' && <h1 className="sp-h1">The ScrollProof server is not reachable.</h1>}
    {r && <section className="sp-panel">
      <h1 className="sp-h1">{r.taskLabel}</h1>
      {r.source === 'demo_seed' && <DemoTag>DEMO SEED</DemoTag>}
      <p>{state.data!.regraded ? 'Re-graded by the server from the seed and the raw answers.' : 'Stored as submitted.'} Shared {fmt(state.data!.at)}.</p>
      <ul className="sp-givens">{r.givens.map((g) => <li key={g.label}><b>{g.label}</b> {g.value}</li>)}</ul>
      <table className="sp-table"><tbody>{r.asks.map((a) => <tr key={a.id}><td>{a.label}</td><td><code>{r.response[a.id]}</code></td><td>{keyOf(r, a.id)}</td><td>{r.perAsk[a.id] ? '✓' : '✗'}</td></tr>)}</tbody></table>
      {Object.entries(r.outcomes).map(([c, o]) => <p key={c}><b>{byId(c as CompetencyId).title}</b>: {o?.pass ? 'passed (system-assessed)' : 'not passed'}</p>)}
      <p className="fx-fine">Identity is not verified. A pass on a safety-critical skill qualifies for supervised assessment only.</p>
    </section>}
  </main></div>
}

// ---------------------------------------------------------------- Teach (contributors)
export function SpTeach() {
  const { scars } = useScars()
  const { s } = useFlux()
  const pp = usePassport()
  const mine = scars.filter((x) => x.contributor.name)
  const impact = (id: string, concept: string) => {
    const ans = Object.entries(s.answered).filter(([k]) => k === `scar-${id}` || k === `scar-${id}-cap`).map(([, v]) => v)
    const comp = COMPETENCIES.find((c) => c.concepts.includes(concept))
    const firstSeen = ans.length ? Math.min(...ans.map((a) => a.at)) : Infinity
    const provedAfter = comp && pp.s.records.some((r) => r.outcomes[comp.id]?.pass && r.at > firstSeen)
    return { plays: ans.length, correct: ans.filter((a) => a.correct).length, provedAfter: !!provedAfter }
  }
  return <Shell tab="teach">
    <p className="fx-kicker">Teach a skill · Field Scars</p>
    <h1 className="sp-h1">Turn the mistake you made on site into the card that saves the next apprentice.</h1>
    <p className="fx-sub">Upload a photo of a real fault, mark it, and write the wrong belief juniors hold. It becomes two playable cards after a safety & slop sieve and two master sign-offs. Your name stays on it.</p>
    <div className="fx-row"><a className="fx-cta in" href={href('flux-studio')}>📷 Capture a Field Scar</a><a className="fx-btn ghost" href={href('flux-queue')}>Master review queue</a></div>
    <section className="sp-panel">
      <h2>Your impact <small>events recorded on this device</small></h2>
      {mine.length === 0 ? <p className="sp-muted">No scars yet. Uploading unlocks after you beat an unseen work order in that domain (prove it to post it).</p>
        : <table className="sp-table"><thead><tr><th>Card</th><th>Status</th><th>Plays</th><th>First-try right</th><th>Learner later proved the skill</th></tr></thead><tbody>
          {mine.map((x) => { const i = impact(x.id, x.concept); return <tr key={x.id}><td>{CONCEPT_NAMES[x.concept] ?? x.concept}: {x.question}</td><td>{x.status}</td><td>{i.plays}</td><td>{i.correct}</td><td>{i.provedAfter ? 'yes' : '—'}</td></tr> })}</tbody></table>}
      <p className="fx-fine">Counted from real events only: answers to your cards and graded attempts that came after. No views, no watch time.</p>
    </section>
    <section className="sp-panel">
      <h2>Proposed mentor rewards <small>not implemented · no money moves</small></h2>
      <ul>
        <li>Paid from employer mission fees, never from learners.</li>
        <li>Weighted by <b>verified usefulness</b>: learners who missed a concept, played your card, and then passed the unseen proof check.</li>
        <li>Zero for raw views. A card under challenge earns nothing until masters patch or clear it.</li>
      </ul>
    </section>
  </Shell>
}

// ---------------------------------------------------------------- Employer (DEMO seat)
const EMPLOYERS = [...new Map(SEED_JOBS.map((j) => [j.employerId, j.employer])).entries()]

export function SpEmployer() {
  const pp = usePassport()
  const initialJob = allJobs(pp.s).find((job) => job.id === routeParam('job'))
  const [emp, setEmp] = useState(initialJob?.employerId ?? EMPLOYERS[0][0])
  const empName = EMPLOYERS.find(([id]) => id === emp)![1]
  const jobs = allJobs(pp.s).filter((j) => j.employerId === emp)
  const [jobId, setJobId] = useState(initialJob?.id ?? '')
  const job = jobs.find((j) => j.id === jobId) ?? jobs[0]
  const [inspect, setInspect] = useState<{ name: string; rec: EvidenceRecord } | null>(null)
  const [inviteFor, setInviteFor] = useState('')
  const [slot, setSlot] = useState('Thu 28 Nov · 10:30 · site office')
  const [note, setNote] = useState('Bring safety boots. The practical is supervised by our senior technician.')
  const mine = visibleTo(emp, pp.s.records, pp.s.shares)
  const cands = [
    ...(mine.length ? [{ id: 'me', name: 'Learner on this device', city: '—', note: 'Shared from their Proof Passport', records: mine, demo: false }] : []),
    ...DEMO_CANDIDATES.filter((c) => c.consentTo.includes(emp)).map((c) => ({ ...c, demo: true })),
  ]
  const ranked = job ? cands.map((c) => ({ c, m: matchJob(job, (x) => statusOf(c.records, x)) })).sort((a, b) => Number(b.m.eligible) - Number(a.m.eligible) || b.m.have - a.m.have) : []
  const short = job ? pp.s.shortlist[job.id] ?? [] : []
  return <Shell tab="jobs" light>
    <p className="fx-kicker">Employer seat <DemoTag>DEMO · same device · no outbound messages</DemoTag></p>
    <label className="sp-acting">Acting as <select value={emp} onChange={(e) => { setEmp(e.target.value); setJobId('') }}>{EMPLOYERS.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
    <h1 className="sp-h1">Hire for skills you can inspect</h1>
    <p className="fx-sub">Post what the work needs. Candidates appear only if they chose to share evidence with {empName}. You see their exact answers, not a score.</p>
    <NewMission employerId={emp} employer={empName} onCreated={(j) => setJobId(j.id)} />
    {job && <section className="sp-panel">
      <div className="sp-goal-head"><h2>Candidates · {job.title}</h2>
        {jobs.length > 1 && <select value={job.id} onChange={(e) => setJobId(e.target.value)} aria-label="Mission">{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select>}</div>
      <p className="sp-chips">{job.requires.map((c) => <span key={c} className="sp-chip">{byId(c).title}</span>)}</p>
      {needsSupervision(job) && <p className="sp-warn">Hazardous work: eligible candidates go to a <b>supervised practical assessment</b>. Simulations do not license unsupervised work.</p>}
      {ranked.length === 0 ? <p className="sp-muted">No candidate has shared evidence with {empName} yet.</p> :
        <ul className="sp-cands">{ranked.map(({ c, m }) => <li key={c.id} className={m.eligible ? 'eligible' : ''}>
          <header><b>{c.name}</b>{c.demo && <DemoTag />}<span className="sp-muted">{c.city} · {c.note}</span></header>
          <Meter m={m} />
          <ol className="sp-reqs compact">{m.rows.map((r) => <li key={r.id} className={`sp-req ${r.state}`}><span>{byId(r.id).title}</span><StateBadge row={r} />
            {r.recordId && <button className="sp-link" onClick={() => setInspect({ name: c.name, rec: c.records.find((x) => x.id === r.recordId)! })}>inspect</button>}</li>)}</ol>
          <p className={`sp-outcome ${m.eligible ? 'ok' : ''}`}>{m.outcome}</p>
          <div className="fx-row">
            <button className="fx-btn ghost" aria-pressed={short.includes(c.id)} onClick={() => pp.toggleShortlist(job.id, c.id)}>{short.includes(c.id) ? '★ Shortlisted' : '☆ Shortlist'}</button>
            <button className="fx-btn" disabled={!m.eligible || !short.includes(c.id)} onClick={() => setInviteFor(c.id)}>{pp.s.invites.some((i) => i.jobId === job.id && i.candidateId === c.id) ? 'Invited ✓' : needsSupervision(job) ? 'Invite to supervised practical' : 'Invite to interview'}</button>
          </div>
          {inviteFor === c.id && <form className="sp-inviteform" onSubmit={(e) => { e.preventDefault(); pp.invite({ jobId: job.id, candidateId: c.id, slot, note }); setInviteFor('') }}>
            <label>Slot<input className="sp-field" value={slot} onChange={(e) => setSlot(e.target.value)} /></label>
            <label>Note<input className="sp-field" value={note} onChange={(e) => setNote(e.target.value)} /></label>
            <p className="fx-fine">DEMO: the invite appears in this device's learner inbox. Nothing is sent anywhere. It is not a job offer.</p>
            <button className="fx-btn">Send invite (DEMO)</button></form>}
        </li>)}</ul>}
    </section>}
    {inspect && <div className="sp-modal" role="dialog" aria-modal="true" aria-label={`Evidence from ${inspect.name}`} onClick={() => setInspect(null)}>
      <div onClick={(e) => e.stopPropagation()}><button className="sp-close" onClick={() => setInspect(null)} aria-label="Close">×</button>
        <p className="fx-kicker">Shared by {inspect.name}</p>
        <h2>{inspect.rec.taskLabel} <small>v{inspect.rec.version} · {fmt(inspect.rec.at)}</small></h2>
        {inspect.rec.source === 'demo_seed' && <DemoTag>DEMO SEED</DemoTag>}
        <ul className="sp-givens">{inspect.rec.givens.map((g) => <li key={g.label}><b>{g.label}</b> {g.value}</li>)}</ul>
        <table className="sp-table"><thead><tr><th>Ask</th><th>Answer</th><th>Key</th><th></th></tr></thead><tbody>{inspect.rec.asks.map((a) => <tr key={a.id}><td>{a.label}</td><td><code>{inspect.rec.response[a.id]}</code></td><td>{keyOf(inspect.rec, a.id)}</td><td>{inspect.rec.perAsk[a.id] ? '✓' : '✗'}</td></tr>)}</tbody></table>
        {inspect.rec.note && <blockquote className="sp-note-q">“{inspect.rec.note}”</blockquote>}
        {Object.entries(inspect.rec.outcomes).map(([c, o]) => <p key={c}><b>{byId(c as CompetencyId).title}</b>: {o?.pass ? LEVEL_LABEL[levelOf(inspect.rec, c as CompetencyId)] : 'not passed'} {o?.misconceptions.map((x) => <span key={x} className="fx-mis">{misconception(x).title}</span>)}</p>)}
        <p className="fx-fine">Fingerprint {inspect.rec.fingerprint} {intact(inspect.rec) ? 'intact' : 'BROKEN'}. Identity not verified.</p>
      </div></div>}
  </Shell>
}

function NewMission({ employerId, employer, onCreated }: { employerId: string; employer: string; onCreated: (j: Job) => void }) {
  const pp = usePassport()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [city, setCity] = useState('Bengaluru')
  const [pay, setPay] = useState('₹16,000–20,000 / month (illustrative)')
  const [req, setReq] = useState<CompetencyId[]>([])
  const [sup, setSup] = useState(false)
  const hazardous = req.some((c) => byId(c).hazardous)
  if (!open) return <button className="fx-btn" onClick={() => setOpen(true)}>+ Post a skill mission</button>
  return <form className="sp-panel sp-mission" onSubmit={(e) => {
    e.preventDefault()
    if (!title.trim() || !req.length) return
    onCreated(pp.addJob({ title: title.trim(), employer, employerId, city, pay, requires: req, supervised: sup || hazardous, summary: 'Posted from the employer seat (DEMO).' })); setOpen(false); setTitle(''); setReq([])
  }}>
    <h2>New skill mission</h2>
    <label>Role title<input className="sp-field" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Rooftop solar helper" /></label>
    <label>City<input className="sp-field" value={city} onChange={(e) => setCity(e.target.value)} /></label>
    <label>Pay (illustrative)<input className="sp-field" value={pay} onChange={(e) => setPay(e.target.value)} /></label>
    <fieldset><legend>Skills the work needs</legend>{COMPETENCIES.map((c) => <label key={c.id} className="sp-check"><input type="checkbox" checked={req.includes(c.id)} onChange={() => setReq(req.includes(c.id) ? req.filter((x) => x !== c.id) : [...req, c.id])} />
      <span><b>{c.title}</b> <small>{c.assessment ? `${c.assessment.label} v${c.assessment.version}` : 'checked in person'}{c.hazardous ? ' · hazardous' : ''}</small></span></label>)}</fieldset>
    <label className="sp-check"><input type="checkbox" checked={sup || hazardous} disabled={hazardous} onChange={(e) => setSup(e.target.checked)} /> <span>Supervised start {hazardous && <small>(required: a hazardous skill is selected)</small>}</span></label>
    <div className="fx-row"><button className="fx-btn" disabled={!title.trim() || !req.length}>Publish mission (DEMO)</button><button type="button" className="fx-btn ghost" onClick={() => setOpen(false)}>Cancel</button></div>
    <p className="fx-fine">Learners on this device see it in Jobs immediately and can aim their feed at it.</p>
  </form>
}
