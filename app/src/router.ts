import { useEffect, useState } from 'react'

export type Route = 'home' | 'opportunities' | 'opportunity' | 'workspace' | 'inventory-learning' | 'mission' | 'path' | 'diagnostic' | 'delivery' | 'revision' | 'challenge' | 'skill-review' | 'skill-passport' | 'feed' | 'work-order' | 'practice' | 'evidence' | 'passport' | 'trainer' | 'contractor' | 'learn'
const ROUTES: Route[] = ['home', 'opportunities', 'opportunity', 'workspace', 'inventory-learning', 'mission', 'path', 'diagnostic', 'delivery', 'revision', 'challenge', 'skill-review', 'skill-passport', 'feed', 'work-order', 'practice', 'evidence', 'passport', 'trainer', 'contractor', 'learn']

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
  const [r, setR] = useState(parse)
  useEffect(() => {
    const on = () => { setR(parse()); window.scrollTo(0, 0) }
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  return r
}
