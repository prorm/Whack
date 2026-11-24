import { useEffect } from 'react'
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
    case 'home': return <CareerHome />
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
