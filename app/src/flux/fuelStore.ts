// Scroll Fuel state on this device. Inside the browser extension the tank lives in chrome.storage (the content
// script drains it on the gated site); the toll log and DM-break history live here in the app's own storage.
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { MIN, emptyFuel, escape as takeEscape, record, refuel, type Fuel, type TollEntry } from './fuel.ts'

const KEY = 'scrollproof:flux:fuel:v1'
let fuel: Fuel = load()
const subs = new Set<() => void>()
function load(): Fuel { try { return { ...emptyFuel(Date.now()), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return emptyFuel(Date.now()) } }
function set(next: Fuel) { fuel = next; localStorage.setItem(KEY, JSON.stringify(next)); subs.forEach((f) => f()) }
addEventListener('storage', (e) => { if (e.key === KEY) { fuel = load(); subs.forEach((f) => f()) } })

export function useFuel() {
  const f = useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb) }, () => fuel)
  return {
    fuel: f,
    log: useCallback((e: TollEntry) => set(record(fuel, e)), []),
    add: useCallback((minutes: number) => set(refuel(fuel, minutes, Date.now())), []),
    escape: useCallback(() => set(takeEscape(fuel, Date.now())), []),
    setTank: useCallback((ms: number) => set({ ...fuel, tankMs: Math.max(0, ms), lastDrainAt: Date.now() }), []),
    reset: useCallback(() => set(emptyFuel(Date.now())), []),
  }
}

// ---------------------------------------------------------------- extension bridge (no-ops on the open web)
type Area = { get(keys: string[]): Promise<Record<string, unknown>>; set(v: Record<string, unknown>): Promise<void> }
type ChromeLike = { storage?: { local?: Area; onChanged?: { addListener(fn: (c: Record<string, { newValue?: unknown }>) => void): void; removeListener(fn: (c: Record<string, { newValue?: unknown }>) => void): void } } }
const chromeApi = (globalThis as { chrome?: ChromeLike }).chrome
export const inExtension = !!chromeApi?.storage?.local && location.protocol === 'chrome-extension:'

export function useExtensionState() {
  const [st, setSt] = useState<{ fuelMs: number; enabled: string[]; swipes: number } | null>(null)
  useEffect(() => {
    if (!inExtension) return
    const area = chromeApi!.storage!.local!
    const read = () => void area.get(['fuelMs', 'enabled', 'swipes']).then((v) => setSt({
      fuelMs: typeof v.fuelMs === 'number' ? v.fuelMs : 10 * MIN, enabled: Array.isArray(v.enabled) ? v.enabled as string[] : ['instagram', 'youtube-shorts'], swipes: typeof v.swipes === 'number' ? v.swipes : 0,
    }))
    read()
    const on = () => read()
    chromeApi!.storage!.onChanged!.addListener(on)
    const t = setInterval(read, 1000)
    return () => { chromeApi!.storage!.onChanged!.removeListener(on); clearInterval(t) }
  }, [])
  const setEnabled = (enabled: string[]) => void chromeApi?.storage?.local?.set({ enabled })
  const setTank = (fuelMs: number) => void chromeApi?.storage?.local?.set({ fuelMs, lastDrainAt: Date.now() })
  return { ext: st, setEnabled, setTank }
}
