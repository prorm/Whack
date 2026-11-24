import { useEffect, useState } from 'react'

export type OfflineStatus = 'unsupported' | 'caching' | 'ready'
export type DeliveryMode = 'rich' | 'lite' | 'offline'
type NetworkInfo = { saveData?: boolean; effectiveType?: string } & EventTarget
const connection = (navigator as Navigator & { connection?: NetworkInfo }).connection

export function useOffline() {
  const [status, setStatus] = useState<OfflineStatus>(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return 'unsupported'
    return navigator.serviceWorker.controller ? 'ready' : 'caching'
  })
  const [online, setOnline] = useState(navigator.onLine)
  const [poor, setPoor] = useState(() => prefersLite())

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    const network = () => setPoor(prefersLite())
    addEventListener('online', update)
    addEventListener('offline', update)
    connection?.addEventListener('change', network)
    return () => {
      removeEventListener('online', update)
      removeEventListener('offline', update)
      connection?.removeEventListener('change', network)
    }
  }, [])

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    let stopped = false
    const workers = navigator.serviceWorker
    const update = () => {
      if (!stopped && workers.controller) setStatus('ready')
    }
    workers.addEventListener('controllerchange', update)
    void workers.register('/sw.js').then((registration) => {
      const check = () => {
        if (stopped) return
        if (!workers.controller && registration.installing?.state === 'redundant') setStatus('unsupported')
        else update()
      }
      const watch = () => {
        const installing = registration.installing
        installing?.addEventListener('statechange', () => {
          if (!stopped && !workers.controller && installing.state === 'redundant') setStatus('unsupported')
          else check()
        })
      }
      if (!stopped) {
        registration.addEventListener('updatefound', watch, { once: true })
        watch()
        check()
      }
    }).catch(() => { if (!stopped && !workers.controller) setStatus('unsupported') })
    return () => {
      stopped = true
      workers.removeEventListener('controllerchange', update)
    }
  }, [])

  return { status, online, poor }
}

function prefersLite() {
  return !!connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '')
}
