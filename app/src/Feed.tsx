import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { LISTINGS, SKILL_ID } from './domain'
import { S, tr } from './i18n'
import { SESSION_ID, useStore } from './store'
import { go } from './router'
import { TopBar, useDelivery } from './Chrome'
import { planReel } from './engine/remix.ts'
import { PremiumPlayer } from './learn/Revision'
import { useTwin } from './learn/twinStore'

type CardId = 'hook' | 'quiz' | 'callback' | 'job' | 'remix'

/**
 * The single personalisation rule: if the learner missed the in-feed question for this skill
 * in an EARLIER session, its callback reel is moved to the top of the feed.
 */
export function feedOrder(missed: Record<string, { sessionId: string }>, sessionId: string): { order: CardId[]; prioritised: boolean } {
  const m = missed[SKILL_ID]
  const prioritised = !!m && m.sessionId !== sessionId
  return { order: prioritised ? ['callback', 'hook', 'quiz', 'job'] : ['hook', 'quiz', 'callback', 'job'], prioritised }
}

export function Feed() {
  const { state, setFeedIndex } = useStore()
  const lang = state.lang
  // Decide the order once per feed visit so answering mid-session never reshuffles the feed.
  const [{ order: baseOrder, prioritised }] = useState(() => feedOrder(state.feed.missed, SESSION_ID))
  const { twin } = useTwin()
  // Memory Remix: planned once per feed visit from THIS learner's own record (no AI call, cached media).
  const [remix] = useState(() => planReel(twin, Date.now(), { opportunity: { title: 'Incentive tracker (demo listing)', pay: 'pay not stated' } }))
  const order: CardId[] = remix ? ['remix', ...baseOrder] : baseOrder
  const [active, setActive] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const { prefetch } = useDelivery()
  const nextCard = order[active + 1]
  useEffect(() => {
    if (!prefetch || (nextCard !== 'hook' && nextCard !== 'callback')) return
    const image = nextCard === 'hook' ? '/media/sheru-washers.webp' : '/media/huss-chase.webp'
    const abort = new AbortController()
    const timer = setTimeout(() => { void fetch(image, { signal: abort.signal, priority: 'low' }).catch(() => {}) }, 1300)
    return () => { clearTimeout(timer); abort.abort() }
  }, [nextCard, prefetch])

  const goTo = useCallback((i: number) => {
    const el = scroller.current
    if (!el) return
    const n = Math.max(0, Math.min(order.length - 1, i))
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ top: n * el.clientHeight, behavior: reduce ? 'auto' : 'smooth' })
  }, [order.length])

  // Visible card = the only active (animating) card.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const i = Number((e.target as HTMLElement).dataset.index)
          setActive(i)
          setFeedIndex(i)
        }
      }
    }, { root: el, threshold: 0.6 })
    el.querySelectorAll('[data-index]').forEach((c) => io.observe(c))
    return () => io.disconnect()
  }, [setFeedIndex])

  // The feed is focusable for keyboard scrolling. Native scrolling also works inside a tall card.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target !== el) return
      if (['ArrowDown', 'PageDown'].includes(e.key)) { e.preventDefault(); goTo(active + 1) }
      if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); goTo(active - 1) }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [active, goTo])

  const next = () => goTo(active + 1)

  return (
    <div className="feed-wrap">
      <TopBar overlay />
      <main className="feed" ref={scroller} aria-label={tr(lang, 'feed')} tabIndex={0}>
        {order.map((id, i) => (
          <article key={id} className="reel" data-index={i} data-active={i === active ? '' : undefined} inert={i !== active}
            aria-label={tr(lang, 'reelOf', { n: i + 1, total: order.length })}>
            {id === 'hook' && <HookReel active={i === active} onSkip={next} />}
            {id === 'quiz' && <QuizReel active={i === active} onNext={next} />}
            {id === 'callback' && <CallbackReel active={i === active} onSkip={next} prioritised={prioritised} />}
            {id === 'job' && <JobReel />}
            {id === 'remix' && remix && <PremiumPlayer active={i === active} plan={remix} next={next} skip={next} />}
          </article>
        ))}
      </main>
      <nav className="dots" aria-label={tr(lang, 'feedHint')}>
        {order.map((id, i) => (
          <button key={id} className={i === active ? 'on' : ''} aria-current={i === active ? 'true' : undefined}
            aria-label={tr(lang, 'reelOf', { n: i + 1, total: order.length })} onClick={() => goTo(i)} />
        ))}
      </nav>
    </div>
  )
}

// ------------------------------------------------------------------ timed caption player
function useTimedSteps(active: boolean, count: number, stepMs = 2300) {
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => { if (!active) { setStep(0); setPaused(false) } }, [active])
  useEffect(() => {
    if (!active || paused || step >= count - 1) return
    const t = setTimeout(() => setStep((s) => s + 1), stepMs)
    return () => clearTimeout(t)
  }, [active, paused, step, count, stepMs])
  return { step, paused, done: step >= count - 1, setPaused, replay: () => { setStep(0); setPaused(false) } }
}

function ReelShell(props: {
  tag: string; tone: 'gold' | 'red' | 'teal' | 'ink'; bg?: string; children: ReactNode;
  captions?: string[]; step?: number; controls?: ReturnType<typeof useTimedSteps>; onSkip?: () => void; banner?: string; active?: boolean
}) {
  const { state, toggleCaptions } = useStore()
  const { mode } = useDelivery()
  const lang = state.lang
  const [bgOk, setBgOk] = useState(true)
  const c = props.controls
  return (
    <div className={`shell tone-${props.tone}`}>
      {props.active && mode !== 'offline' && props.bg && bgOk && <img className="shell-bg" src={props.bg} alt="" onError={() => setBgOk(false)} />}
      <div className="shell-shade" />
      <div className="shell-tag">{props.tag}</div>
      {props.banner && <div className="shell-banner" role="status">{props.banner}</div>}
      <div className="shell-stage">{props.children}</div>
      {props.captions && state.captions && (
        <p className="caption" aria-live="polite" lang={lang === 'kn' ? 'kn' : 'en'}>{props.captions[props.step ?? 0]}</p>
      )}
      <div className="shell-controls">
        {c && (
          c.done
            ? <button className="ctl" onClick={c.replay}>↺ {tr(lang, 'replay')}</button>
            : <button className="ctl" onClick={() => c.setPaused(!c.paused)} aria-pressed={c.paused}>
                {c.paused ? `▶ ${tr(lang, 'play')}` : `❚❚ ${tr(lang, 'pause')}`}
              </button>
        )}
        {props.captions && (
          <button className="ctl" onClick={toggleCaptions} aria-pressed={state.captions}>
            CC {state.captions ? tr(lang, 'captionsOn') : tr(lang, 'captionsOff')}
          </button>
        )}
        {props.onSkip && <button className="ctl" onClick={props.onSkip}>{tr(lang, 'skip')} ↓</button>}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ 1. comedy hook
function HookReel({ active, onSkip }: { active: boolean; onSkip: () => void }) {
  const { state } = useStore()
  const lang = state.lang
  const caps = S.hookCap.map((c) => c[lang])
  const ctl = useTimedSteps(active, caps.length)
  const s = ctl.step
  const hi = s === 3 ? 'id' : s === 4 ? 'od' : s === 5 ? 't' : s >= 6 ? 'all' : 'none'
  return (
    <ReelShell tag={tr(lang, 'hookTag')} tone="gold" bg="/media/sheru-washers.webp" active={active} captions={caps} step={s} controls={ctl} onSkip={onSkip}>
      <div className={`drip ${s >= 0 && s < 2 ? 'on' : ''} ${s >= 6 ? 'on' : ''}`} aria-hidden="true"><i /><i /><i /></div>
      {s === 1 && <div className="aviator-pop" aria-hidden="true">😎 ↓</div>}
      <WasherDiagram highlight={s >= 2 ? hi : 'none'} show={s >= 2} values={{ id: 15, od: 24, t: 3 }} alt={tr(lang, 'hookStaticAlt')} lang={lang} />
    </ReelShell>
  )
}

export function WasherDiagram({ highlight, show, values, alt, lang }: {
  highlight: 'id' | 'od' | 't' | 'all' | 'none'; show: boolean; values: { id: number; od: number; t: number }; alt: string; lang: 'en' | 'kn'
}) {
  const on = (k: 'id' | 'od' | 't') => highlight === k || highlight === 'all'
  return (
    <figure className={`washer ${show ? 'show' : ''}`} data-hl={highlight}>
      <svg viewBox="0 0 320 210" role="img" aria-label={alt}>
        {/* top view */}
        <circle cx="105" cy="100" r="78" className="w-body" />
        <circle cx="105" cy="100" r="40" className="w-hole" />
        <g className={`dim ${on('od') ? 'hl' : ''}`}>
          <line x1="27" y1="190" x2="183" y2="190" /><line x1="27" y1="180" x2="27" y2="200" /><line x1="183" y1="180" x2="183" y2="200" />
          <text x="105" y="184">OD {values.od} mm</text>
        </g>
        <g className={`dim ${on('id') ? 'hl' : ''}`}>
          <line x1="65" y1="100" x2="145" y2="100" />
          <text x="105" y="92">ID {values.id} mm</text>
        </g>
        {/* side view */}
        <rect x="235" y="60" width={8 + values.t * 4} height="90" className="w-body" />
        <g className={`dim ${on('t') ? 'hl' : ''}`}>
          <line x1="235" y1="165" x2={243 + values.t * 4} y2="165" />
          <text x="255" y="185">{lang === 'kn' ? 'ದಪ್ಪ' : 'thick'} {values.t} mm</text>
        </g>
      </svg>
    </figure>
  )
}

// ------------------------------------------------------------------ 2. in-feed question (untimed)
function QuizReel({ active, onNext }: { active: boolean; onNext: () => void }) {
  const { state, answerQuiz } = useStore()
  const lang = state.lang
  const [choice, setChoice] = useState<string | null>(null)
  const opts = useMemo(() => [
    { id: 'id', label: tr(lang, 'quizOptID') },
    { id: 'od', label: tr(lang, 'quizOptOD') },
    { id: 't', label: tr(lang, 'quizOptT') },
  ], [lang])
  const correct = choice === 'od'
  const pick = (id: string) => { setChoice(id); answerQuiz(id, id === 'od') }
  return (
    <ReelShell tag={tr(lang, 'quizTag')} tone="teal">
      <div className={`quiz ${active ? 'in' : ''}`}>
        <h2 className="quiz-q">{tr(lang, 'quizQ')}</h2>
        <div className="quiz-opts" role="group" aria-label={tr(lang, 'quizQ')}>
          {opts.map((o) => (
            <button key={o.id} className={`opt ${choice === o.id ? (o.id === 'od' ? 'ok' : 'bad') : ''}`}
              disabled={choice !== null} aria-pressed={choice === o.id} onClick={() => pick(o.id)}>{o.label}</button>
          ))}
        </div>
        <div className="quiz-fb" aria-live="polite">
          {choice && (
            <>
              <p className={correct ? 'fb-ok' : 'fb-bad'}>
                {correct ? tr(lang, 'quizRight') : choice === 'id' ? tr(lang, 'quizWrongID') : tr(lang, 'quizWrongT')}
              </p>
              {!correct && <p className="fb-note">{tr(lang, 'quizSaved')}</p>}
              <div className="row">
                {!correct && <button className="btn ghost" onClick={() => setChoice(null)}>{tr(lang, 'tryAgain')}</button>}
                <button className="btn" onClick={onNext}>{tr(lang, 'nextReel')} ↓</button>
              </div>
            </>
          )}
        </div>
        <p className="fine">{tr(lang, 'noCredentialNote')}</p>
      </div>
    </ReelShell>
  )
}

// ------------------------------------------------------------------ 3. callback, different example + format
function CallbackReel({ active, onSkip, prioritised }: { active: boolean; onSkip: () => void; prioritised: boolean }) {
  const { state } = useStore()
  const lang = state.lang
  const caps = S.callbackCap.map((c) => c[lang])
  const ctl = useTimedSteps(active, caps.length)
  const s = ctl.step
  return (
    <ReelShell tag={tr(lang, 'callbackTag')} tone="red" bg="/media/huss-chase.webp" active={active} captions={caps} step={s} controls={ctl}
      onSkip={onSkip} banner={prioritised ? tr(lang, 'callbackPriority') : undefined}>
      <div className={`monster ${s >= 4 ? 'gone' : ''}`} aria-hidden="true">DRIP</div>
      <div className={`speedlines ${s < 4 ? 'on' : ''}`} aria-hidden="true" />
      <div className={`checklist ${s >= 1 ? 'show' : ''}`} role="img" aria-label={tr(lang, 'callbackStaticAlt')}>
        <div className="cl-head"><span /><span>{lang === 'kn' ? 'ಬೇಕು' : 'Need'}</span><span>{lang === 'kn' ? 'ಸ್ಪೇರ್' : 'Spare'}</span><span /></div>
        {([['ID', 19, 19], ['OD', 27, 27], [lang === 'kn' ? 'ದಪ್ಪ' : 'Thick', 2, 3]] as const).map(([k, need, have], i) => (
          <div key={i} className={`cl-row ${s >= 3 ? (need === have ? 'ok' : 'bad') : ''}`}>
            <span>{k}</span><span>{need} mm</span><span>{s >= 2 ? `${have} mm` : '…'}</span><span>{s >= 3 ? (need === have ? '✓' : '✗') : ''}</span>
          </div>
        ))}
      </div>
    </ReelShell>
  )
}

// ------------------------------------------------------------------ 4. local job reel
function JobReel() {
  const { state } = useStore()
  const lang = state.lang
  const l = LISTINGS[0]
  return (
    <ReelShell tag={tr(lang, 'jobTag')} tone="ink">
      <article className="job">
        <p className="demo-badge">DEMO</p>
        <h2>{l.contractor}</h2>
        <dl>
          <div><dt>{tr(lang, 'jobWhere')}</dt><dd>{l.locality}</dd></div>
          <div><dt>{tr(lang, 'jobPay')}</dt><dd>{l.pay}</dd></div>
          <div><dt>{tr(lang, 'jobShift')}</dt><dd>{l.shift}</dd></div>
          <div><dt>{tr(lang, 'jobNeeds')}</dt><dd className="need">{l.requiredSkill[lang]}</dd></div>
        </dl>
        <button className="btn big" onClick={() => go('work-order')}>{tr(lang, 'jobCta')} →</button>
        <button className="btn ghost" onClick={() => go('passport')}>{tr(lang, 'passport')}</button>
        <p className="fine">{tr(lang, 'jobFictional')}</p>
      </article>
    </ReelShell>
  )
}
