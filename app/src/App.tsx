import { lazy, Suspense, useEffect } from 'react'
import { OfflineCtx } from './Chrome'
import { Feed } from './Feed'
import { useOffline } from './offline'
import { useRoute } from './router'
import { Contractor, EvidenceScreen, Passport, Practice, Trainer, WorkOrder } from './screens'
import { StoreProvider, useStore } from './store'
import { Learn } from './learn/Learn'
import { TwinProvider } from './learn/twinStore'
import { Delivery, Diagnostic, Journey } from './learn/Journey'
import { Revision } from './learn/Revision'
import { Challenge, SkillPassport, SkillReview } from './learn/SkillProof'
import { SyncProvider } from './learn/sync'
import { Mission } from './moonshot/Mission'
import { CareerHome, Opportunities, Opportunity, Workspace } from './careers/Careers'
const Flux = lazy(() => import('./flux/Flux').then((m) => ({ default: m.Flux })))
const Sp = {
  home: lazy(() => import('./sp/Sp').then((m) => ({ default: m.SpHome }))),
  jobs: lazy(() => import('./sp/Sp').then((m) => ({ default: m.SpJobs }))),
  job: lazy(() => import('./sp/Sp').then((m) => ({ default: m.SpJob }))),
  assess: lazy(() => import('./sp/Sp').then((m) => ({ default: m.SpAssess }))),
  passport: lazy(() => import('./sp/Sp').then((m) => ({ default: m.SpPassport }))),
  employer: lazy(() => import('./sp/Sp').then((m) => ({ default: m.SpEmployer }))),
  teach: lazy(() => import('./sp/Sp').then((m) => ({ default: m.SpTeach }))),
  view: lazy(() => import('./sp/Sp').then((m) => ({ default: m.SpView }))),
}
// keyed by the full hash: a new param (another record, another skill) gets fresh component state
const S = ({ v }: { v: keyof typeof Sp }) => { const C = Sp[v]; return <Suspense fallback={null}><C key={location.hash} /></Suspense> }
import './learn/journey.css'

function Routes() {
  const route = useRoute()
  const { state } = useStore()
  useEffect(() => { document.documentElement.lang = state.lang === 'kn' ? 'kn' : 'en' }, [state.lang])
  useEffect(() => {
    const heading = document.querySelector<HTMLElement>('main h1')
    if (heading) {
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
  }, [route])
  switch (route) {
    case 'home': return <S v="home" />
    case 'careers': return <CareerHome />
    case 'sp-jobs': return <S v="jobs" />
    case 'sp-job': return <S v="job" />
    case 'sp-assess': return <S v="assess" />
    case 'sp-passport': return <S v="passport" />
    case 'sp-employer': return <S v="employer" />
    case 'sp-teach': return <S v="teach" />
    case 'sp-view': return <S v="view" />
    case 'opportunities': return <Opportunities />
    case 'opportunity': return <Opportunity />
    case 'workspace': return <Workspace />
    case 'inventory-learning': return <Mission key="learner-mission" learner />
    case 'mission': return <Mission key="contributor-mission" />
    case 'work-order': return <WorkOrder />
    case 'practice': return <Practice />
    case 'evidence': return <EvidenceScreen />
    case 'passport': return <Passport />
    case 'trainer': return <Trainer />
    case 'contractor': return <Contractor />
    case 'learn': return <Learn />
    case 'feed': return <Feed />
    case 'delivery': return <Delivery />
    case 'diagnostic': return <Diagnostic />
    case 'revision': return <Revision />
    case 'challenge': return <Challenge />
    case 'skill-review': return <SkillReview />
    case 'skill-passport': return <SkillPassport />
    case 'flux': return <Suspense fallback={null}><Flux /></Suspense>
    case 'flux-solar': return <Suspense fallback={null}><Flux view="solar" /></Suspense>
    case 'flux-pay': return <Suspense fallback={null}><Flux view="pay" /></Suspense>
    case 'flux-reels': return <Suspense fallback={null}><Flux view="reels" /></Suspense>
    case 'flux-ev': return <Suspense fallback={null}><Flux view="ev" /></Suspense>
    case 'flux-studio': return <Suspense fallback={null}><Flux view="studio" /></Suspense>
    case 'flux-queue': return <Suspense fallback={null}><Flux view="queue" /></Suspense>
    case 'flux-fuel': return <Suspense fallback={null}><Flux view="fuel" /></Suspense>
    case 'flux-gate': return <Suspense fallback={null}><Flux view="gate" /></Suspense>
    default: return <Journey />
  }
}

export default function App() {
  const offline = useOffline()
  return (
    <StoreProvider>
      <OfflineCtx.Provider value={offline}>
        <SyncProvider>
          <TwinProvider>
            <Routes />
          </TwinProvider>
        </SyncProvider>
      </OfflineCtx.Provider>
    </StoreProvider>
  )
}
