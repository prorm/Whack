import { createContext, useContext } from 'react'
import type { OfflineStatus } from './offline'

/** Connectivity and offline-cache status, provided once by App from useOffline(). */
export const OfflineCtx = createContext<{ status: OfflineStatus; online: boolean; poor: boolean }>({ status: 'unsupported', online: true, poor: false })

export function useDelivery() {
  const { status, online, poor } = useContext(OfflineCtx)
  return { online, poor, status }
}
