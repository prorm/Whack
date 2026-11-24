import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useDelivery } from '../Chrome'
import { useJournal } from '../learn/journal'
import { useStored } from '../learn/useStored'
import type { Attempt, Receipt } from '../moonshot/domain'
import { routeParam, type Route } from '../router'
import { EMPTY_IDS, EMPTY_POSTINGS, INVENTORY_SAMPLE_ID, TRACK_KEYS, TRACKS, postingUrl, type Posting, type Track } from './opportunities'
import './careers.css'

const IMAGES = '/media/careers/inventory-counter.webp'
const PAGE_LINKS = [
  ['opportunities', 'Explore roles'],
  ['workspace', 'My workspace'],
  ['mission', 'Teach a skill'],
  ['flux', 'FLUX lessons'],
] as const
const EMPTY_EVIDENCE = { latest: '', attempts: {} as Record<string, Attempt>, intents: {} as Record<string, { state: string; receipt?: Receipt }> }

const href = (route: Route, params?: Record<string, string>) => '#/' + route + (params ? '?' + new URLSearchParams(params) : '')

export function Wordmark({ className = '' }: { className?: string }) {
  return <a href={href('home')} className={`career-wordmark ${className}`} aria-label="CAPABLE home">
    <span className="career-mark" aria-hidden="true"><i /><i /><i /></span><b>CAPABLE</b>
  </a>
}

export function CareerHeader({ page }: { page: string }) {
  return <header className="career-header">
    <div className="career-container career-header-inner">
      <Wordmark />
      <nav aria-label="Main navigation">
        {PAGE_LINKS.map(([id, label]) => <a key={id} href={href(id)}
          aria-current={(page === id || page === 'opportunity' && id === 'opportunities') ? 'page' : undefined}>{label}</a>)}
      </nav>
    </div>
  </header>
}

function Frame({ page, children }: { page: string; children: ReactNode }) {
  const { online } = useDelivery()
  return <div className="career-shell" lang="en">
    <a href="#career-main" className="career-skip" onClick={(event) => {
      event.preventDefault()
      document.getElementById('career-main')?.focus()
    }}>Skip to main content</a>
    <CareerHeader page={page} />
    {!online && <p className="career-offline" role="status">Offline. Saved roles and lessons are still available on this device.</p>}
    <main id="career-main" tabIndex={-1}>{children}</main>
    <footer className="career-container career-footer">
      <Wordmark />
      <div><a href={href('delivery')}>Data & offline settings</a><a href={href('feed')}>Revision reels</a></div>
    </footer>
  </div>
}

function Arrow() { return <span className="career-arrow" aria-hidden="true" /> }

function RoleRows({ ids, bookmarks, onSave }: { ids: Track[]; bookmarks: string[]; onSave: (id: string) => void }) {
  return <ul className="career-role-list">
    {ids.map((id) => {
      const role = TRACKS[id]
      const saved = bookmarks.includes(id)
      return <li key={id} className="career-role">
        <div className={`career-role-symbol career-role-${id}`} aria-hidden="true"><i /><i /><i /></div>
        <div className="career-role-main">
          <span className="career-role-meta">{role.area} <span aria-hidden="true">·</span> Demo role</span>
          <h3><a href={href('opportunity', { role: id })}>{role.title}</a></h3>
          <p>{role.description}</p>
        </div>
        <div className="career-role-actions">
          <button type="button" className="career-bookmark" aria-pressed={saved} aria-label={`Save ${role.title}`} onClick={() => onSave(id)}>
            <span className="career-bookmark-icon" aria-hidden="true" />
          </button>
          <a className="career-link-arrow" href={href('opportunity', { role: id })} aria-label={`View ${role.title}`}><Arrow /></a>
        </div>
      </li>
    })}
  </ul>
}

function useBookmarks() {
  const [saved, setSaved] = useStored('career-bookmarks', EMPTY_IDS)
  return { saved, toggle: (id: string) => setSaved(saved.includes(id) ? saved.filter((item) => item !== id) : [...saved, id]) }
}

function HeroImage() {
  const { mode } = useDelivery()
  const [failed, setFailed] = useState(false)
  return <figure className="career-hero-image">
    {mode !== 'offline' && !failed && <img src={IMAGES} alt="A worker counting tins on a stockroom counter" width="650" height="778" fetchPriority="high" onError={() => setFailed(true)} />}
    <figcaption className="career-image-caption">
      <span>Featured work sample</span>
      <a href={href('opportunity', { role: 'inventory' })}>Find the missing stock <Arrow /></a>
    </figcaption>
  </figure>
}

export function CareerHome() {
  const { saved, toggle } = useBookmarks()
  const progress = useProgress()
  return <Frame page="home">
    <div className="career-container">
      <section className="career-hero" aria-labelledby="career-heading">
        <div className="career-hero-copy">
          <h1 id="career-heading">Find a role.<br />Prove you can<br className="career-desktop-break" /> do the work.</h1>
          <p>See what a role really asks you to do. Learn the skill, try the task, and build evidence you can share on your terms.</p>
          <div className="career-actions">
            <a className="career-btn career-btn-accent" href={href('opportunities')}>Explore roles <Arrow /></a>
            <a className="career-btn career-btn-on-dark" href={href('inventory-learning')} onClick={() => progress.start('inventory')}>Try a work sample</a>
          </div>
        </div>
        <HeroImage />
      </section>

      <section className="career-section career-start" aria-labelledby="career-start">
        <div className="career-section-head">
          <div><h2 id="career-start">Your first work sample</h2><p>Choose a role to see the task you’ll learn and practice.</p></div>
          <a className="career-text-link" href={href('opportunities')}>Browse all roles <Arrow /></a>
        </div>
        <RoleRows ids={TRACK_KEYS} bookmarks={saved} onSave={toggle} />
      </section>

      <section className="career-contribute" aria-labelledby="career-community">
        <div><h2 id="career-community">Pass on a skill you use at work.</h2>
          <p>Show how you solve a task people ask you about. Turn it into a practice mission someone else can learn from.</p></div>
        <a className="career-btn career-btn-secondary" href={href('mission')}>Teach a skill <Arrow /></a>
      </section>
    </div>
  </Frame>
}

export function Opportunities() {
  const { saved, toggle } = useBookmarks()
  const [filter, setFilter] = useState<'all' | Track>('all')
  const [postings, store] = useStored('career-postings', EMPTY_POSTINGS)
  const [form, showForm] = useState(false)
  const [error, setError] = useState('')
  const formTitle = useRef<HTMLHeadingElement>(null)
  const visible = filter === 'all' ? TRACK_KEYS : [filter]
  const savedPostings = postings.filter((item) => filter === 'all' || filter === item.track)

  function savePosting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const title = String(fields.get('title')).trim()
    const organization = String(fields.get('organization')).trim()
    const notes = String(fields.get('notes')).trim()
    const source = String(fields.get('url')).trim()
    const url = source ? postingUrl(source) : ''
    const track = fields.get('track')
    if (!title) { setError('Enter the job title.'); return }
    if (url === null) { setError('Use a complete HTTPS link, or leave it empty.'); return }
    if (track !== 'inventory' && track !== 'payouts') { setError('Choose the work sample that matches the role.'); return }
    const id = crypto.randomUUID()
    store([{ id, title, organization, notes, url, track }, ...postings])
    location.hash = href('opportunity', { saved: id })
  }

  return <Frame page="opportunities">
    <div className="career-container career-page">
      <div className="career-page-heading">
        <div><h1>Explore roles</h1><p>See what each role requires and practice the work it involves.</p></div>
        <button type="button" className="career-btn career-btn-primary" onClick={() => {
          showForm(!form)
          setError('')
          if (!form) requestAnimationFrame(() => formTitle.current?.focus())
        }} aria-expanded={form} aria-controls="career-posting-form">{form ? 'Close form' : 'Add a job posting'}</button>
      </div>
      {form && <section className="career-add-panel" id="career-posting-form">
        <h2 ref={formTitle} tabIndex={-1}>Add a job you found</h2>
        <p>The title, link and notes stay in your workspace on this device.</p>
        <form className="career-form" onSubmit={savePosting} autoComplete="off">
          <label>Job title<input name="title" required maxLength={100} placeholder="e.g. Stock assistant" spellCheck={false} /></label>
          <label>Organization (optional)<input name="organization" maxLength={100} spellCheck={false} /></label>
          <label className="career-field-wide">Posting link (optional)<input name="url" type="url" maxLength={2000} placeholder="https://…" spellCheck={false} /></label>
          <label className="career-field-wide">Which task does the job involve?
            <select name="track" required defaultValue=""><option value="" disabled>Choose a work sample</option>
              <option value="inventory">Reconcile stock counts</option><option value="payouts">Calculate rider payouts</option>
            </select>
          </label>
          <label className="career-field-wide">Requirements to remember (optional)<textarea name="notes" rows={2} maxLength={1600} spellCheck={false} autoCorrect="off" /></label>
          {error && <p className="career-error career-field-wide" role="alert">{error}</p>}
          <button className="career-btn career-btn-primary">Save job to workspace <Arrow /></button>
        </form>
      </section>}
      <div className="career-filters" role="group" aria-label="Filter by type of work">
        {([['all', 'All roles'], ['inventory', 'Stock & inventory'], ['payouts', 'Delivery & payouts']] as const).map(([key, label]) =>
          <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}
      </div>
      {savedPostings.length > 0 && <section className="career-section" aria-labelledby="personal-postings">
        <h2 id="personal-postings">Jobs you added</h2>
        <ul className="career-tracker">
          {savedPostings.map((job) => <li key={job.id}>
            <div><h3><a href={href('opportunity', { saved: job.id })}>{job.title}</a></h3><p>{job.organization || TRACKS[job.track].area}</p></div>
            <a className="career-link-arrow" href={href('opportunity', { saved: job.id })} aria-label={`View ${job.title}`}><Arrow /></a>
          </li>)}
        </ul>
      </section>}
      <section className="career-section" aria-labelledby="demo-postings">
        <h2 id="demo-postings">Practice opportunities</h2>
        <p>These sample roles come with training and a work sample. You can use them to prepare for a similar job.</p>
        <RoleRows ids={visible} bookmarks={saved} onSave={toggle} />
      </section>
      <section className="career-contribute" aria-labelledby="live-listings">
        <div><h2 id="live-listings">Looking for a job you can apply to?</h2>
          <p>Browse live postings, then bring a role back here to plan what you’ll practice.</p></div>
        <a className="career-btn career-btn-secondary" href="https://ncs.gov.in/" target="_blank" rel="noreferrer noopener">Open National Career Service <Arrow /></a>
      </section>
    </div>
  </Frame>
}

function startHref(track: Track) {
  return track === 'inventory' ? href('inventory-learning') : href('path', { from: 'payouts' })
}

function useProgress() {
  const [journeys, save] = useStored<Track[]>('career-started-tracks', [])
  const [inventory] = useStored('moonshot-evidence-v1', EMPTY_EVIDENCE)
  const [payoutDraft] = useStored('payout-draft', null)
  const { submissions, receipts } = useJournal()
  const inventoryAttempts = Object.values(inventory.attempts).filter((item) => item.source === INVENTORY_SAMPLE_ID)
  const current = inventoryAttempts.sort((a, b) => b.at - a.at)[0]
  const record = current && inventory.intents[current.id]
  const payout = payoutDraft ? undefined : submissions[0]
  const status = (track: Track): { label: string; proof: boolean } => {
    const assessment = track === 'inventory' ? current : payout
    const review = track === 'inventory' ? (record?.state === 'send' && record.receipt?.decision === 'reviewed')
      : payout && receipts[payout.id]?.decision === 'approved'
    return review ? { label: 'Review recorded', proof: true }
      : assessment ? { label: 'Work sample submitted', proof: false }
        : journeys.includes(track) ? { label: 'In progress', proof: false } : { label: 'Ready to start', proof: false }
  }
  return { journeys, status, start: (track: Track) => { if (!journeys.includes(track)) save([...journeys, track]) } }
}

export function Opportunity() {
  const [postings, savePostings] = useStored('career-postings', EMPTY_POSTINGS)
  const [applied, setApplied] = useStored('career-applications', EMPTY_IDS)
  const { saved, toggle } = useBookmarks()
  const progress = useProgress()
  const personalId = routeParam('saved')
  const id = routeParam('role')
  const personal = personalId ? postings.find((posting) => posting.id === personalId) : undefined
  const track = personal?.track ?? (id === 'payouts' ? 'payouts' : id === 'inventory' ? 'inventory' : undefined)
  if (!track) return <Frame page="opportunity">
    <div className="career-container career-page"><h1>Role unavailable</h1><p>You can browse the practice roles or find jobs saved on this device.</p>
      <a className="career-btn career-btn-primary" href={href('opportunities')}>Back to roles <Arrow /></a></div>
  </Frame>
  const role = TRACKS[track]
  const state = progress.status(track)
  return <Frame page="opportunity">
    <div className="career-container career-page">
      <a className="career-text-link" href={href('opportunities')}>Back to roles</a>
      <div className="career-page-heading career-role-heading">
        <div><p>{personal ? personal.organization || 'Job you added' : `${role.area} · Demo role`}</p>
          <h1>{personal?.title ?? role.title}</h1><p>{role.description}</p></div>
        {!personal && <button className="career-btn career-btn-secondary" type="button" onClick={() => toggle(track)} aria-pressed={saved.includes(track)}>
          {saved.includes(track) ? 'Saved to workspace' : 'Save this role'}
        </button>}
      </div>
      {personal?.notes && <section className="career-note"><h2>Your job notes</h2><p>{personal.notes}</p></section>}
      <div className="career-detail-grid">
        <aside className="career-summary" aria-labelledby="role-work-sample">
          <h2 id="role-work-sample">Work sample</h2>
          <dl><div><dt>Worksheet</dt><dd>{role.artifact}</dd></div><div><dt>Practice time</dt><dd>{role.time}</dd></div><div><dt>Progress</dt><dd>{state.label}</dd></div></dl>
          <a className="career-btn career-btn-accent" href={startHref(track)} onClick={() => progress.start(track)}>
            {state.label === 'Ready to start' ? 'Start learning for this role' : 'Continue your work sample'} <Arrow />
          </a>
        </aside>
        <section className="career-section career-detail-flow" aria-labelledby="role-practice">
          <h2 id="role-practice">What you’ll practice</h2>
          <ol className="career-steps">
            <li><div><h3>{role.skill}</h3><p>{role.requirement}</p></div></li>
            <li><div><h3>Complete the work sample</h3><p>Try a new set of figures and see which calculations you got right.</p></div></li>
            <li><div><h3>Decide who can see your work</h3><p>Choose whether to send the worksheet for review. The demo preview stays on this device.</p></div></li>
          </ol>
        </section>
      </div>
      {personal && <section className="career-contribute" aria-labelledby="original-listing">
        <div><h2 id="original-listing">Your application</h2><p>{applied.includes(personal.id) ? 'Marked as applied in this workspace.' : 'Apply on the original job website. Track your progress here.'}</p></div>
        <div className="career-actions">
          {personal.url && <a href={personal.url} className="career-btn career-btn-primary" target="_blank" rel="noreferrer noopener">Open original job posting <Arrow /></a>}
          <button type="button" className="career-btn career-btn-secondary" onClick={() => setApplied(applied.includes(personal.id)
            ? applied.filter((item) => item !== personal.id) : [...applied, personal.id])}>
            {applied.includes(personal.id) ? 'Clear applied status' : 'Mark as applied'}
          </button>
          <button type="button" className="career-btn career-btn-secondary" onClick={() => {
            savePostings(postings.filter((item) => item.id !== personal.id))
            setApplied(applied.filter((item) => item !== personal.id))
            location.hash = href('workspace')
          }}>Remove saved job</button>
        </div>
      </section>}
    </div>
  </Frame>
}

export function Workspace() {
  const progress = useProgress()
  const { saved, toggle } = useBookmarks()
  const [postings] = useStored('career-postings', EMPTY_POSTINGS)
  const [applied] = useStored('career-applications', EMPTY_IDS)
  const tracks = TRACK_KEYS.filter((id) => progress.journeys.includes(id) || progress.status(id).label !== 'Ready to start')
  const bookmarked = TRACK_KEYS.filter((id) => saved.includes(id))
  return <Frame page="workspace">
    <div className="career-container career-page">
      <div className="career-page-heading"><div><h1>My workspace</h1><p>Keep job leads, training, and the work you’ve submitted in one place.</p></div>
        <a className="career-btn career-btn-primary" href={href('opportunities')}>Explore roles <Arrow /></a></div>
      <section className="career-section" aria-labelledby="my-samples">
        <h2 id="my-samples">Work samples</h2>
        {tracks.length ? <ul className="career-tracker">
          {tracks.map((id) => <li key={id}>
            <div><h3>{TRACKS[id].artifact}</h3><p>{progress.status(id).label}</p></div>
            <a className="career-btn career-btn-secondary" href={progress.status(id).proof
              ? id === 'payouts' ? href('skill-passport') : href('inventory-learning', { view: 'evidence' })
              : startHref(id)}>
              {progress.status(id).proof ? 'Open evidence' : 'Continue work sample'} <Arrow /></a>
          </li>)}
        </ul> : <div className="career-empty"><p>Start a role’s training to see your progress here.</p>
          <a className="career-text-link" href={href('opportunities')}>Find a work sample <Arrow /></a></div>}
      </section>
      <section className="career-section" aria-labelledby="job-tracker">
        <h2 id="job-tracker">Jobs you’re tracking</h2>
        {postings.length ? <ul className="career-tracker">{postings.map((item: Posting) => <li key={item.id}>
          <div><h3><a href={href('opportunity', { saved: item.id })}>{item.title}</a></h3>
            <p>{[item.organization, applied.includes(item.id) ? 'Applied' : 'Saved'].filter(Boolean).join(' · ')}</p></div>
          <a className="career-link-arrow" href={href('opportunity', { saved: item.id })} aria-label={`View ${item.title}`}><Arrow /></a>
        </li>)}</ul> : <div className="career-empty"><p>Add a job you found elsewhere to link it to a work sample.</p>
          <a className="career-text-link" href={href('opportunities')}>Go to Explore roles <Arrow /></a></div>}
      </section>
      {bookmarked.length > 0 && <section className="career-section" aria-labelledby="saved-demos">
        <h2 id="saved-demos">Saved practice roles</h2><RoleRows ids={bookmarked} bookmarks={saved} onSave={toggle} />
      </section>}
      <div className="career-actions">
        <a className="career-text-link" href={href('path')}>Open my personal learning path <Arrow /></a>
        <a className="career-text-link" href={href('skill-passport')}>Open payout Skill Passport <Arrow /></a>
      </div>
    </div>
  </Frame>
}
