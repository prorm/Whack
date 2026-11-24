import { useCallback, useEffect, useState } from 'react'

export function useStored<T>(name: string, initial: T) {
  const key = 'scrollproof:journey:' + name
  const read = useCallback((): T => {
    try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? initial }
    catch { return initial }
  }, [key, initial])
  const [value, set] = useState(read)
  useEffect(() => {
    const change = (event: StorageEvent) => { if (!event.key || event.key === key) set(read()) }
    addEventListener('storage', change)
    return () => removeEventListener('storage', change)
  }, [key, read])
  const save = useCallback((next: T) => {
    localStorage.setItem(key, JSON.stringify(next))
    set(next)
  }, [key])
  return [value, save] as const
}
