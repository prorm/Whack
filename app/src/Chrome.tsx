import { createContext, useContext, type ReactNode } from 'react'
import { tr } from './i18n'
import type { OfflineStatus } from './offline'
import { go } from './router'
import { useStore } from './store'

export const OfflineCtx = createContext<{ status: OfflineStatus; online: boolean; poor: boolean }>({ status: 'unsupported', online: true, poor: false })

export function useDelivery() {
  const { state } = useStore()
  const { status, online, poor } = useContext(OfflineCtx)
  const choice = state.delivery === 'auto' ? (poor ? 'lite' : 'rich') : state.delivery
  const mode = !online || choice === 'offline' ? 'offline' : state.dataSaver ? 'lite' : choice
  return { mode, online, status, prefetch: mode === 'rich' && !poor && status === 'ready' }
}

export function OfflineChip() {
  const { status, online } = useContext(OfflineCtx)
  const { state } = useStore()
  const lang = state.lang
  const label = status === 'ready' ? tr(lang, 'offlineReady') : status === 'caching' ? tr(lang, 'offlineCaching') : tr(lang, 'offlineNo')
  return (
    <span className={`chip off-${status}`} role="status" data-testid="offline-status">
      {!online && <b>{tr(lang, 'youAreOffline')} · </b>}{label}
    </span>
  )
}

export function LangToggle() {
  const { state, setLang } = useStore()
  return (
    <button className="lang" onClick={() => setLang(state.lang === 'en' ? 'kn' : 'en')}
      aria-label={`${tr(state.lang, 'langToggle')} · ${tr(state.lang, 'langToggleLabel')}`}>
      <span lang={state.lang === 'en' ? 'kn' : 'en'}>
      {tr(state.lang, 'langToggle')}
      </span>
    </button>
  )
}

export function TopBar({ overlay, compact }: { overlay?: boolean; compact?: boolean }) {
  const { state } = useStore()
  const lang = state.lang
  if (compact) return <header className="topbar career-task-top">
    <div className="career-task-nav">
      <div className="career-task-brand"><a className="brand" href="#/home" aria-label="ScrollProof home">Scroll<b>Proof</b></a><OfflineChip /></div>
      <nav aria-label="App navigation">
        <a href="#/opportunities">Explore roles</a>
        <a href="#/workspace">My workspace</a>
        <details className="career-task-menu"><summary>Settings</summary><div>
          <LangToggle />
          <a href="#/delivery">Data & offline</a>
        </div></details>
      </nav>
    </div>
  </header>
  return (
    <header className={`topbar ${overlay ? 'overlay' : ''}`}>
      <button className="brand" onClick={() => go('home')} aria-label="ScrollProof home">Scroll<b>Proof</b></button>
      <OfflineChip />
      <nav className="topbar-actions" aria-label="App navigation">
        <LangToggle />
        <button className="pill-btn" onClick={() => go('path')}>{lang === 'kn' ? 'ಕಲಿ' : 'My path'}</button>
        <button className="pill-btn" onClick={() => go('feed')}>{tr(lang, 'feed')}</button>
        <button className="pill-btn" lang="en" onClick={() => go('mission')}>Missions</button>
        <button className="pill-btn" lang="en" onClick={() => go('delivery')}>Delivery</button>
      </nav>
    </header>
  )
}

export function Screen({ title, children, tone, kicker, contentLang, className = '', careerFlow = false }: {
  title: string; children: ReactNode; tone?: 'trainer' | 'contractor'; kicker?: ReactNode; contentLang?: 'en' | 'kn'; className?: string; careerFlow?: boolean
}) {
  const { state } = useStore()
  return (
    <div className={`screen ${tone ? `screen-${tone}` : ''} ${className}${careerFlow ? ' career-task' : ''}`} lang={state.lang === 'kn' ? 'kn' : 'en'}>
      <TopBar compact={careerFlow} />
      <main className="screen-body" lang={contentLang}>
        {kicker}
        <h1>{title}</h1>
        {children}
      </main>
    </div>
  )
}

export function StatusPill({ kind, children }: { kind: 'ok' | 'warn' | 'bad' | 'neutral'; children: ReactNode }) {
  return <span className={`status status-${kind}`}>{children}</span>
}
