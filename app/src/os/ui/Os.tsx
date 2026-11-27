// The capability layer's screens: Career GPS, Demand Intelligence (organization seat), the Opportunity
// Exchange and the capability summary on the Proof Passport. Every organization and opportunity is DEMO.
import { useMemo, useState } from 'react'
import { useDelivery } from '../../Chrome'
import { capableRequest, errorText } from '../../capable/client'
import { routeParam } from '../../router'
import { blueprint, compileRequirement, diffBlueprint, fullText, simulationMatch, type Requirement } from '../compiler'
import { stateOf, type EvidenceMap } from '../evidence'
import { CHANGE_PRESET, CLUSTERS, COMMITMENT, coverage, opportunitiesFrom, type CoverState, type Opportunity } from '../market'
import { INTENTS, planPath, unlocks, type Intent, type StepState } from '../path'
import { CAP, DOMAIN_LABEL, LABS, closure } from '../taxonomy'
import { useEvidence, useOs, useReceipts } from '../store'

const STEP: Record<StepState, { label: string; cls: string }> = {
  proven: { label: 'Proven · skip', cls: 'ok' }, prove: { label: 'Prove directly', cls: 'go' }, learn: { label: 'Learn, then prove', cls: 'todo' },
  review: { label: 'Awaiting trainer review', cls: 'wait' }, in_person: { label: 'Supervised, in person', cls: 'wait' }, pending: { label: 'Assessment awaiting validation', cls: 'off' },
}
const COVER: Record<CoverState, { label: string; cls: string }> = {
  evidenced: { label: 'Evidence available', cls: 'ok' }, review: { label: 'Awaiting review', cls: 'wait' }, failed: { label: 'Retake', cls: 'bad' },
  missing: { label: 'Evidence missing', cls: 'todo' }, in_person: { label: 'Checked in person', cls: 'wait' }, pending: { label: 'No validated test yet', cls: 'off' },
}
const proveHref = (id: string) => {
  if (id.startsWith('ai-')) return id === 'ai-fault-triage' ? '#/ailab?track=trade' : '#/ailab'
  const p = CAP[id].proof
  return p.kind === 'codelab' ? '#/codelab' : p.kind === 'datalab' ? '#/datalab' : p.kind === 'arena' ? '#/capable' : p.kind === 'flux' && p.flux ? `#/sp-assess?c=${p.flux}` : null
}
const name = (id: string) => CAP[id]?.title ?? id

// ---------------------------------------------------------------- Career GPS
export function Gps() {
  const os = useOs()
  const ev = useEvidence()
  const opps = useMemo(() => opportunitiesFrom(os.reqs), [os.reqs])
  const intent = (routeParam('intent') as Intent | null) ?? null
  const [target, setTarget] = useState<string>(routeParam('target') ?? routeParam('cluster') ?? 'backend')
  const cluster = CLUSTERS.find((c) => c.id === target)
  const opp = opps.find((o) => o.id === target)
  const targets = cluster ? blueprint(os.reqs.filter((r) => r.cluster === cluster.id)).ordered : opp ? opp.requires : []
  const plan = planPath(targets, ev, new Set(os.s.declared))
  const top = unlocks(opps, ev).slice(0, 5)
  const mine = Object.entries(ev).filter(([, e]) => e.state === 'evidenced').map(([id]) => id)

  return <div className="os">
    <header className="os-intro"><div>
      <h1>Where do you want to go?</h1>
      <p>Career GPS starts from what employers actually ask for and from what you have already proven. Nobody makes a capable person sit through a course they don’t need.</p>
    </div></header>
    <div className="os-intents" role="list">{INTENTS.map((i) => <a role="listitem" key={i.id} href={`#/gps?intent=${i.id}`} aria-current={intent === i.id ? 'true' : undefined} className="os-intent">
      <b>{i.title}</b><span>{i.detail}</span></a>)}</div>

    {intent === 'start' && <section className="os-panel">
      <h2>Most requested across {os.reqs.length} employers</h2>
      <ol className="os-rank">{Object.entries(blueprint(os.reqs).demand).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, n]) =>
        <li key={id}><b>{name(id)}</b><span>{n} employer{n === 1 ? '' : 's'}</span><i style={{ width: `${(n / os.reqs.length) * 100}%` }} /></li>)}</ol>
      <p className="os-muted">Each role family below shares a foundation. Pick one; the path keeps every capability you prove.</p>
      <div className="os-chips">{CLUSTERS.map((c) => <button key={c.id} className="os-pick" aria-pressed={target === c.id} onClick={() => setTarget(c.id)}>{c.title}</button>)}</div>
    </section>}

    {(intent === 'role' || intent === 'switch') && <section className="os-panel">
      <h2>{intent === 'role' ? 'Choose the role' : 'Choose where you are heading'}</h2>
      {intent === 'switch' && <p className="os-muted">You already have evidence for {mine.length} capabilit{mine.length === 1 ? 'y' : 'ies'}{mine.length ? `: ${mine.map(name).join(', ')}` : ''}. It carries into any path that needs it.</p>}
      <div className="os-chips">
        {CLUSTERS.map((c) => <button key={c.id} className="os-pick" aria-pressed={target === c.id} onClick={() => setTarget(c.id)}>{c.title} · pathway</button>)}
        {opps.map((o) => <button key={o.id} className="os-pick" aria-pressed={target === o.id} onClick={() => setTarget(o.id)}>{o.title} · {o.org.replace(' (DEMO)', '')}</button>)}
      </div>
    </section>}

    {intent === 'skills' && <section className="os-panel">
      <h2>Prove what you already know</h2>
      <p className="os-muted">Skip the lessons. Each of these is an unseen task graded by code; saying you know something never counts on its own.</p>
      <div className="os-direct">
        <a href="#/codelab" className="os-card"><b>CodeLab · unseen payment incident</b><span>Debugging, testing, incident response</span></a>
        <a href="#/datalab" className="os-card"><b>DataLab · unseen settlement</b><span>Spreadsheets, reconciliation, data cleaning</span></a>
        <a href="#/ailab" className="os-card"><b>AI Pair · catch the copilot</b><span>AI-assisted debugging, safe AI use</span></a>
        <a href="#/capable" className="os-card"><b>Practical Arena · unseen fault</b><span>Fault diagnosis, safe isolation (simulated)</span></a>
        <a href="#/sp-assess?c=pay.idempotency" className="os-card"><b>Duplicate-webhook check</b><span>Idempotent payment handling</span></a>
      </div>
    </section>}

    {intent === 'earn' && <section className="os-panel">
      <h2>Closest paid work</h2>
      <ul className="os-list">{[...opps].sort((a, b) => (b.kind === 'Paid project' ? 1 : 0) - (a.kind === 'Paid project' ? 1 : 0) || coverage(b, ev).covered / Math.max(1, coverage(b, ev).total) - coverage(a, ev).covered / Math.max(1, coverage(a, ev).total)).slice(0, 5).map((o) => {
        const c = coverage(o, ev)
        return <li key={o.id}><div><b>{o.title}</b><span>{o.org} · {o.pay}</span></div><span className="os-count">{c.covered} of {c.total}</span><button className="os-link" onClick={() => setTarget(o.id)}>Plan the gap</button></li>
      })}</ul>
    </section>}

    {targets.length > 0 && <section className="os-panel os-path" aria-labelledby="path-h">
      <div className="os-path-head">
        <div><h2 id="path-h">{cluster ? `Your path: ${cluster.title}` : `Your path to ${opp!.title}`}</h2>
          <p className="os-muted">{cluster ? `Shared foundation of ${os.reqs.filter((r) => r.cluster === cluster.id).length} employers, plus each one’s branch.` : `${opp!.org} · ${COMMITMENT[opp!.commitment].label}`}</p></div>
        <dl className="os-kpis"><div><dt>Already proven</dt><dd>{plan.proven} / {plan.total}</dd></div><div><dt>Time left</dt><dd>~{Math.round(plan.remainingHours)} h</dd></div></dl>
      </div>
      <ol className="os-steps">{plan.steps.map((s, i) => {
        const c = CAP[s.id]
        const prove = proveHref(s.id)
        return <li key={s.id} className={`st-${STEP[s.state].cls}`}>
          <span className="os-n">{i + 1}</span>
          <div className="os-step-body">
            <b>{c.title}</b>
            <small>{DOMAIN_LABEL[c.domain]}{c.lab ? ` · ${c.lab}` : ''} · proof: {c.proof.label}</small>
            {s.state === 'learn' && <label className="os-declare"><input type="checkbox" checked={os.s.declared.includes(s.id)} onChange={(e) => os.declare(s.id, e.target.checked)} /> I already know this: skip the lesson</label>}
            {s.state === 'prove' && <label className="os-declare"><input type="checkbox" checked onChange={() => os.declare(s.id, false)} /> Skipping the lesson. The unseen task still decides.</label>}
          </div>
          <span className={`os-state ${STEP[s.state].cls}`}>{STEP[s.state].label}</span>
          <span className="os-step-go">
            {s.state === 'learn' && c.learn && <a href={c.learn.href}>{c.learn.label} →</a>}
            {(s.state === 'prove' || s.state === 'learn') && prove && <a href={prove}>Prove it →</a>}
          </span>
        </li>
      })}</ol>
      <p className="os-fine">Steps marked “awaiting validation” have no tested assessment yet, so nothing can award them. They become provable when a lab task for them passes review.</p>
    </section>}

    {top.length > 0 && <section className="os-panel">
      <h2>What would unlock the most</h2>
      <ul className="os-list">{top.map((u) => <li key={u.id}><div><b>{name(u.id)}</b><span>{u.completes.length ? `Completes: ${u.completes.join(', ')}` : `Needed by ${u.opens} opportunit${u.opens === 1 ? 'y' : 'ies'}`}</span></div>
        <span className="os-count">{u.opens}</span>{proveHref(u.id) ? <a className="os-link" href={proveHref(u.id)!}>Prove it</a> : <span className="os-muted">awaiting validation</span>}</li>)}</ul>
    </section>}
  </div>
}

// ---------------------------------------------------------------- Demand Intelligence (organization seat)
const EXAMPLES = [
  { label: 'Backend · payments', text: 'Our junior backend developers should be capable of investigating failed payment transactions, identifying API errors, fixing bugs without introducing regressions and writing an incident report.' },
  { label: 'Data · operations', text: 'Reconcile weekly vendor settlements in spreadsheets, clean duplicate rows from exports and explain discrepancies to the finance team.' },
  { label: 'Trades · electrical', text: 'Trainees must diagnose wiring faults with a multimeter and isolate circuits safely before any repair.' },
  { label: 'Something new', text: 'A junior engineer should set up Terraform for staging, write Python scripts to rotate logs, and explain outages to stakeholders.' },
]

type AiProposal = { model: string; capabilities: { id: string; evidence: string }[]; tasks: string[]; unmapped: string[] }

export function Demand() {
  const os = useOs()
  const ev = useEvidence()
  const { online } = useDelivery()
  const [org, setOrg] = useState('Your organization (DEMO)')
  const [role, setRole] = useState('Junior engineer')
  const [text, setText] = useState(EXAMPLES[0].text)
  const [cluster, setCluster] = useState('backend')
  const [ai, setAi] = useState<AiProposal | null>(null)
  const [aiNote, setAiNote] = useState('')
  const [busy, setBusy] = useState(false)
  const { compiled, ms } = useMemo(() => {
    const t0 = performance.now()
    const out = compileRequirement(text)
    return { compiled: out, ms: Math.max(0.1, performance.now() - t0) }
  }, [text])
  const sims = simulationMatch(compiled.matched.map((m) => m.id))
  const clusterReqs = os.reqs.filter((r) => r.cluster === cluster)
  const bp = blueprint(clusterReqs)
  const changed = clusterReqs.some((r) => r.change)
  const before = blueprint(clusterReqs.map((r) => ({ ...r, change: undefined })))
  const diff = diffBlueprint(before, bp)
  const all = blueprint(os.reqs)
  const opps = opportunitiesFrom(os.reqs)
  const pending = Object.entries(all.demand).filter(([id]) => CAP[id].proof.kind === 'pending').sort((a, b) => b[1] - a[1])
  const similar = useMemo(() => {
    const sets = os.reqs.map((r) => ({ r, ids: new Set(compileRequirement(fullText(r)).matched.map((m) => m.id)) }))
    const out: { a: Requirement; b: Requirement; j: number }[] = []
    sets.forEach((x, i) => sets.slice(i + 1).forEach((y) => {
      const inter = [...x.ids].filter((id) => y.ids.has(id)).length, union = new Set([...x.ids, ...y.ids]).size
      if (union && inter / union >= 0.35) out.push({ a: x.r, b: y.r, j: inter / union })
    }))
    return out.sort((p, q) => q.j - p.j).slice(0, 4)
  }, [os.reqs])

  async function askAi() {
    setBusy(true); setAiNote(''); setAi(null)
    try { setAi(await capableRequest<AiProposal>('compile', { text })) }
    catch (e) { setAiNote(`${errorText(e)} The deterministic result above is unaffected.`) } finally { setBusy(false) }
  }
  function publish() {
    const id = `r-${Date.now().toString(36)}`
    os.publish({ id, orgId: id, org: org.includes('DEMO') ? org : `${org} (DEMO)`, role, text, cluster: 'custom', at: Date.now() })
  }
  const detMatched = new Set(compiled.matched.map((m) => m.id))

  return <div className="os">
    <header className="os-intro"><div>
      <h1>Describe the work. CAPABLE builds the pathway.</h1>
      <p>Paste a job description, an SOP or a problem your new hires must solve. The Work Compiler maps it to a shared capability graph, finds the prerequisites nobody wrote down, and shows which simulations can test it. Everything here runs on this device and is labelled DEMO.</p>
    </div></header>

    <section className="os-compiler" aria-label="Work Compiler">
      <div className="os-compiler-in">
        <div className="os-two">
          <label className="c2-field"><span>Organization</span><input value={org} onChange={(e) => setOrg(e.target.value)} /></label>
          <label className="c2-field"><span>Role</span><input value={role} onChange={(e) => setRole(e.target.value)} /></label>
        </div>
        <label className="c2-field"><span>What must this person be able to do?</span><textarea rows={5} value={text} onChange={(e) => { setText(e.target.value); setAi(null) }} /></label>
        <div className="os-chips">{EXAMPLES.map((x) => <button key={x.label} className="os-pick" aria-pressed={text === x.text} onClick={() => { setText(x.text); setAi(null) }}>{x.label}</button>)}</div>
        <div className="c2-actions">
          <button className="c2-primary" disabled={!compiled.matched.length} onClick={publish}>Publish to the demand graph</button>
          <button className="c2-secondary" disabled={busy || !online || !text.trim()} onClick={() => void askAi()}>{busy ? 'Asking Gemini…' : 'Ask AI for a second opinion'}</button>
        </div>
        {aiNote && <p className="c2-small" role="status">{aiNote}</p>}
      </div>
      <div className="os-compiler-out" aria-live="polite">
        <p className="os-fine">Compiled on this device in {ms.toFixed(1)} ms · deterministic · graph of {Object.keys(CAP).length} capabilities</p>
        <h3>Tasks</h3>
        {compiled.tasks.length ? <ol className="os-tasks">{compiled.tasks.map((t) => <li key={t}>{t}</li>)}</ol> : <p className="os-muted">No task sentences yet. Describe what the person does.</p>}
        <h3>Capabilities</h3>
        <div className="os-chips">{compiled.matched.map((m) => <span key={m.id} className="os-cap" title={`Matched: ${m.phrases.join(', ')}`}><b>{name(m.id)}</b><small>“{m.phrases[0]}”</small></span>)}</div>
        {compiled.implied.length > 0 && <><h3>Prerequisites nobody wrote down</h3>
          <div className="os-chips">{compiled.implied.map((id) => <span key={id} className="os-cap implied"><b>{name(id)}</b></span>)}</div></>}
        {compiled.unmapped.length > 0 && <><h3>Awaiting validation</h3>
          <p className="os-muted">Not in the graph yet. A reviewer adds them before anything can be learned or proven.</p>
          <div className="os-chips">{compiled.unmapped.map((u) => <span key={u} className="os-cap off">{u}</span>)}</div></>}
        <h3>Simulation registry</h3>
        <ul className="os-labs">{[...sims.byLab.entries()].map(([lab, ids]) => {
          const meta = LABS.find((l) => l.id === lab)!
          return <li key={lab} className={meta.status}><b>{lab}</b><span>{meta.status === 'live' ? 'Live' : 'Planned · proof awaiting validation'}</span><small>{ids.map(name).join(', ')}</small></li>
        })}{sims.unhosted.length > 0 && <li className="planned"><b>No environment yet</b><span>Awaiting validation</span><small>{sims.unhosted.map(name).join(', ')}</small></li>}</ul>
        {ai && <div className="os-ai"><h3>AI proposal · {ai.model} · awaiting human validation</h3>
          <div className="os-chips">{ai.capabilities.map((c) => <span key={c.id} className={`os-cap ${detMatched.has(c.id) ? '' : 'ai'}`} title={c.evidence}><b>{name(c.id)}</b><small>{detMatched.has(c.id) ? 'agrees' : 'AI only'}</small></span>)}</div>
          {ai.unmapped.length > 0 && <p className="c2-small">AI also flagged: {ai.unmapped.join(', ')}</p>}
          <p className="c2-small">The AI may only choose capabilities that exist in the graph. Its picks never award evidence or change a pathway until a reviewer accepts them.</p></div>}
      </div>
    </section>

    <section className="os-panel" aria-labelledby="bp-h">
      <div className="os-path-head"><div><h2 id="bp-h">One pathway from many employers</h2>
        <p className="os-muted">Requirements from different organizations, normalized into a shared foundation and each employer’s branch.</p></div>
        <div className="os-chips">{CLUSTERS.map((c) => <button key={c.id} className="os-pick" aria-pressed={cluster === c.id} onClick={() => setCluster(c.id)}>{c.title}</button>)}</div></div>
      <div className="os-bp">
        <div className="os-bp-col"><h3>Employers</h3>{clusterReqs.map((r) => <div key={r.id} className="os-req"><b>{r.org}</b><span>{r.role}</span><p>“{r.text}”{r.change && <ins> {r.change}</ins>}</p></div>)}</div>
        <div className="os-bp-col"><h3>Shared foundation</h3>
          <div className="os-chips">{bp.shared.map((id) => <span key={id} className={`os-cap ${diff.added.includes(id) ? 'new' : ''}`}><b>{name(id)}</b><small>{bp.demand[id]} employers</small></span>)}</div>
          {bp.foundations.length > 0 && <><h3>Prerequisites</h3><div className="os-chips">{bp.foundations.map((id) => <span key={id} className={`os-cap implied ${diff.added.includes(id) ? 'new' : ''}`}><b>{name(id)}</b></span>)}</div></>}
          <h3>Employer branches</h3>
          {bp.branches.map((b) => <div key={b.req.id} className="os-branch"><b>{b.req.org.replace(' (DEMO)', '')}</b>
            <div className="os-chips">{b.ids.length ? b.ids.map((id) => <span key={id} className={`os-cap ${diff.added.includes(id) ? 'new' : ''}`}>{name(id)}</span>) : <span className="os-muted">nothing beyond the foundation</span>}</div></div>)}
          <a className="c2-secondary os-open" href={`#/gps?intent=role&target=${cluster}`}>Open this pathway as a learner</a>
        </div>
      </div>
      {cluster === 'backend' && <div className="os-change">
        {!changed ? <><div><b>The industry changes.</b><span>KiranaCart now needs interns to ship with Docker and CI/CD.</span></div>
          <button className="c2-primary" onClick={() => os.change(CHANGE_PRESET.reqId, CHANGE_PRESET.text)}>Apply KiranaCart’s new requirement</button></>
          : <><div><b>Requirement changed: +{diff.added.map(name).join(', +')}</b>
            <span>Only these are new. Every capability a learner already proved still counts: {bp.ordered.filter((id) => stateOf(ev, id) === 'evidenced').length} of {bp.ordered.length} are evidenced on this device.</span></div>
            <button className="c2-secondary" onClick={() => os.change(CHANGE_PRESET.reqId, null)}>Undo the change</button></>}
      </div>}
    </section>

    <section className="os-grid2">
      <div className="os-panel"><h2>Demand graph</h2>
        <p className="os-muted">{os.reqs.length} requirements from {new Set(os.reqs.map((r) => r.orgId)).size} organizations.</p>
        <ol className="os-rank">{Object.entries(all.demand).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, n]) =>
          <li key={id}><b>{name(id)}</b><span>{n}</span><i style={{ width: `${(n / os.reqs.length) * 100}%` }} /></li>)}</ol>
      </div>
      <div className="os-panel"><h2>What the graph tells you</h2>
        <h3>Employers with near-identical needs</h3>
        <ul className="os-list">{similar.map((s) => <li key={s.a.id + s.b.id}><div><b>{s.a.org.replace(' (DEMO)', '')} ↔ {s.b.org.replace(' (DEMO)', '')}</b><span>{Math.round(s.j * 100)}% overlap in required capabilities</span></div></li>)}</ul>
        <h3>Demand with no validated test yet</h3>
        <p className="os-muted">{pending.slice(0, 5).map(([id, n]) => `${name(id)} (${n})`).join(' · ')}. Building InfraLab would make these provable.</p>
      </div>
    </section>

    <Candidates opps={opps} ev={ev} />
  </div>
}

function Candidates({ opps, ev }: { opps: Opportunity[]; ev: EvidenceMap }) {
  const os = useOs()
  const sharedWith = opps.filter((o) => os.s.shared[o.id])
  return <section className="os-panel" aria-labelledby="cand-h">
    <h2 id="cand-h">Learners who shared evidence with you</h2>
    <p className="os-muted">Same-device preview. A learner appears only after choosing to share from the Opportunity Exchange, and disappears when they revoke. No score, no ranking: the exact evidence per requirement.</p>
    {sharedWith.length === 0 ? <p className="os-empty">No learner has shared evidence yet. Open <a href="#/exchange">the learner’s Opportunity Exchange</a> and share with an opportunity.</p>
      : sharedWith.map((o) => {
        const c = coverage(o, ev)
        return <article key={o.id} className="os-cand"><header><b>You, this device (DEMO learner)</b><span>for {o.title} · {o.org}</span><span className="os-count">{c.covered} of {c.total}</span></header>
          <ul className="os-rows">{c.rows.map((r) => <li key={r.id}><span>{name(r.id)}</span><span className={`os-state ${COVER[r.state].cls}`}>{COVER[r.state].label}</span><small>{ev[r.id]?.source ?? ''}</small></li>)}</ul>
          <p className="c2-small">Identity not verified. A signed receipt proves the assessment record, not who took it or how they will perform on the job.</p></article>
      })}
  </section>
}

// ---------------------------------------------------------------- Opportunity Exchange
const KINDS = ['All', 'Job', 'Internship', 'Apprenticeship', 'Paid project', 'Sponsored cohort', 'Hackathon']

export function Exchange() {
  const os = useOs()
  const ev = useEvidence()
  const [kind, setKind] = useState('All')
  const opps = opportunitiesFrom(os.reqs).filter((o) => kind === 'All' || o.kind === kind)
  return <div className="os">
    <header className="os-intro"><div>
      <h1>Opportunities, matched on what you have shown.</h1>
      <p>Each listing comes from the organization’s own description of the work. You see exactly which requirements your evidence covers and what is missing. There is no hidden score.</p>
    </div></header>
    <div className="os-chips os-filter">{KINDS.map((k) => <button key={k} className="os-pick" aria-pressed={kind === k} onClick={() => setKind(k)}>{k}</button>)}</div>
    <div className="os-opps">{opps.map((o) => {
      const c = coverage(o, ev)
      const next = closure(o.requires).find((id) => stateOf(ev, id) !== 'evidenced' && CAP[id].proof.kind !== 'pending' && CAP[id].proof.kind !== 'in_person')
      const shared = Boolean(os.s.shared[o.id])
      return <article key={o.id} className="os-opp">
        <header><span className="os-muted">{o.org} · {o.place}</span><span className={`os-commit c-${o.commitment}`} title={COMMITMENT[o.commitment].detail}>{COMMITMENT[o.commitment].label}</span></header>
        <h2>{o.title}</h2>
        <p className="os-muted">{o.kind} · {o.pay}{o.supervised ? ' · supervised practical required' : ''}</p>
        <div className="os-meter" role="img" aria-label={`${c.covered} of ${c.total} requirements covered by evidence`}>
          {c.rows.filter((r) => r.state !== 'in_person').map((r) => <i key={r.id} className={r.state} />)}<span>{c.covered} of {c.total}</span></div>
        <ul className="os-rows">{c.rows.map((r) => <li key={r.id}><span>{name(r.id)}</span><span className={`os-state ${COVER[r.state].cls}`}>{COVER[r.state].label}</span></li>)}</ul>
        <p className="os-fine">{COMMITMENT[o.commitment].detail}</p>
        <div className="c2-actions">
          {next && <a className="c2-primary" href={`#/gps?intent=role&target=${o.id}`}>Plan the gap · next: {name(next)}</a>}
          <label className="os-share"><input type="checkbox" checked={shared} onChange={(e) => os.share(o.id, e.target.checked)} /> {shared ? 'Sharing my evidence (tap to revoke)' : `Share my evidence with ${o.org.replace(/ \(DEMO.*\)/, '')}`}</label>
        </div>
      </article>
    })}</div>
    <p className="os-fine">Coverage counts evidenced requirements. It is not a hiring probability, a candidate ranking or a promise of employment. Every organization and listing here is DEMO; sharing stays on this device. <a href="#/sp-jobs">Goal-based solar & EV job board</a></p>
  </div>
}

// ---------------------------------------------------------------- Passport summary
export function CapabilitySummary() {
  const ev = useEvidence()
  const receipts = useReceipts()
  const evidenced = Object.entries(ev).filter(([, e]) => e.state === 'evidenced')
  const review = Object.entries(ev).filter(([, e]) => e.state === 'review')
  const passedReceipts = receipts.filter((r) => r.receipt.record.passed).length
  const domains = new Set(evidenced.map(([id]) => CAP[id].domain))
  return <section className="os-panel os-summary" aria-labelledby="cap-h">
    <h2 id="cap-h">Capability evidence</h2>
    <dl className="os-kpis wide"><div><dt>Capabilities evidenced</dt><dd>{evidenced.length}</dd></div><div><dt>Signed lab receipts passed</dt><dd>{passedReceipts}</dd></div>
      <div><dt>Domains</dt><dd>{domains.size}</dd></div><div><dt>Identity</dt><dd className="os-muted">Not verified</dd></div></dl>
    {evidenced.length + review.length === 0 ? <p className="os-muted">Nothing evidenced yet. Pass an unseen task in CodeLab, DataLab, the Practical Arena or a FLUX proof check.</p>
      : <ul className="os-rows">{[...evidenced, ...review].map(([id, e]) => <li key={id}><span><b>{name(id)}</b> <small>{DOMAIN_LABEL[CAP[id].domain]}</small></span>
        <span className={`os-state ${e.state === 'evidenced' ? 'ok' : 'wait'}`}>{e.state === 'evidenced' ? e.level : 'Awaiting trainer review'}</span><small>{e.source}</small></li>)}</ul>}
    <p className="os-fine">Evidence is portable: an employer that accepts the same assessment and version can reuse it. A signature proves the assessment record is authentic, not who took it or how they will perform on the job.</p>
  </section>
}
