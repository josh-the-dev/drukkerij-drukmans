import { useSyncExternalStore } from 'react'

export function useLocalStorage<T>(key: string): T | null {
  const serialized = useSyncExternalStore(
    () => () => {}, // no subscription needed — localStorage doesn't push updates
    () => localStorage.getItem(key), // returns a string — stable by value comparison
    () => null, // server snapshot — always null during SSR
  )
  return serialized ? (JSON.parse(serialized) as T) : null
}
