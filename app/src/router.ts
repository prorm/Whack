import { useEffect, useState } from 'react'
export type CapableRoute = 'capable' | 'capable-forge' | 'capable-scars' | 'capable-proof' | 'capable-public'
export type OsRoute = 'gps' | 'demand' | 'codelab' | 'datalab' | 'ailab' | 'exchange'

export type Route = CapableRoute | OsRoute | 'home' | 'flux-solar' | 'flux-pay' | 'flux-reels' | 'flux-ev' | 'flux-studio' | 'flux-queue' | 'fl-course' | 'fl-lesson' | 'fl-project' | 'sp-jobs' | 'sp-job' | 'sp-assess' | 'sp-passport' | 'sp-employer' | 'sp-teach' | 'sp-view'
const ROUTES: Route[] = ['gps', 'demand', 'codelab', 'datalab', 'ailab', 'exchange', 'capable', 'capable-forge', 'capable-scars', 'capable-proof', 'capable-public', 'home', 'flux-solar', 'flux-pay', 'flux-reels', 'flux-ev', 'flux-studio', 'flux-queue', 'fl-course', 'fl-lesson', 'fl-project', 'sp-jobs', 'sp-job', 'sp-assess', 'sp-passport', 'sp-employer', 'sp-teach', 'sp-view']

function parse(): Route {
  const r = location.hash.replace(/^#\/?/, '').split('?')[0] as Route
  return ROUTES.includes(r) ? r : 'home'
}

export function go(r: Route, params?: Record<string, string>) {
  location.hash = `/${r}${params ? '?' + new URLSearchParams(params) : ''}`
}

export function routeParam(name: string) {
  return new URLSearchParams(location.hash.split('?')[1]).get(name)
}

export function useRoute(): Route {
  // track the whole hash so a change of params on the same route (#/sp-passport?r=…) re-renders too
  const [, setHash] = useState(() => location.hash)
  const [r, setR] = useState(parse)
  useEffect(() => {
    const on = () => { setR(parse()); setHash(location.hash); window.scrollTo(0, 0) }
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  return r
}
