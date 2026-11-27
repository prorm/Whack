import { lazy, Suspense, useEffect } from 'react'
import { OfflineCtx } from './Chrome'
import { useOffline } from './offline'
import { useRoute } from './router'
const Flux = lazy(() => import('./flux/Flux').then((m) => ({ default: m.Flux })))
const Capable = lazy(() => import('./capable/Capable'))
const OsPage = lazy(() => import('./os/ui/Pages'))
const Sp = {
  home: lazy(() => import('./sp/Sp').then((m) => ({ default: m.SpHome }))),
  jobs: lazy(() => import('./sp/Sp').then((m) => ({ default: m.SpJobs }))),
  job: lazy(() => import('./sp/Sp').then((m) => ({ default: m.SpJob }))),
  assess: lazy(() => import('./sp/Sp').then((m) => ({ default: m.SpAssess }))),
  passport: lazy(() => import('./sp/Sp').then((m) => ({ default: m.SpPassport }))),
  employer: lazy(() => import('./sp/Sp').then((m) => ({ default: m.SpEmployer }))),
  teach: lazy(() => import('./sp/Sp').then((m) => ({ default: m.SpTeach }))),
  view: lazy(() => import('./sp/Sp').then((m) => ({ default: m.SpView }))),
  course: lazy(() => import('./sp/Sp').then((m) => ({ default: m.SpCourse }))),
  lesson: lazy(() => import('./flux/learn/Learn').then((m) => ({ default: m.LessonPlayer }))),
  project: lazy(() => import('./flux/learn/Learn').then((m) => ({ default: m.Project }))),
}
// keyed by the full hash: a new param (another record, another skill) gets fresh component state
const S = ({ v }: { v: keyof typeof Sp }) => { const C = Sp[v]; return <Suspense fallback={null}><C key={location.hash} /></Suspense> }
const F = ({ v }: { v: 'solar' | 'pay' | 'reels' | 'ev' | 'studio' | 'queue' }) => <Suspense fallback={null}><Flux view={v} /></Suspense>

function Routes() {
  const route = useRoute()
  useEffect(() => {
    const heading = document.querySelector<HTMLElement>('main h1')
    if (heading) {
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
  }, [route])
  switch (route) {
    case 'capable': case 'capable-forge': case 'capable-scars': case 'capable-proof': case 'capable-public':
      return <Suspense fallback={null}><Capable route={route} /></Suspense>
    case 'gps': case 'demand': case 'codelab': case 'datalab': case 'ailab': case 'exchange':
      return <Suspense fallback={null}><OsPage key={location.hash} route={route} /></Suspense>
    case 'sp-jobs': return <S v="jobs" />
    case 'sp-job': return <S v="job" />
    case 'sp-assess': return <S v="assess" />
    case 'sp-passport': return <S v="passport" />
    case 'sp-employer': return <S v="employer" />
    case 'sp-teach': return <S v="teach" />
    case 'sp-view': return <S v="view" />
    case 'fl-course': return <S v="course" />
    case 'fl-lesson': return <S v="lesson" />
    case 'fl-project': return <S v="project" />
    case 'flux-solar': return <F v="solar" />
    case 'flux-pay': return <F v="pay" />
    case 'flux-reels': return <F v="reels" />
    case 'flux-ev': return <F v="ev" />
    case 'flux-studio': return <F v="studio" />
    case 'flux-queue': return <F v="queue" />
    default: return <S v="home" />
  }
}

export default function App() {
  const offline = useOffline()
  return (
    <OfflineCtx.Provider value={offline}>
      <Routes />
    </OfflineCtx.Provider>
  )
}
