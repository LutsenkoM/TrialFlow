import { useEffect } from 'react'
import { useAppStore, type AppState } from '../store/appStore'

/**
 * Subscribes to a store slice and runs `apply` imperatively (DOM writes) without re-rendering.
 * Used for values that change every frame, like the playhead.
 */
export function useStoreEffect<T>(select: (s: AppState) => T, apply: (value: T) => void) {
  useEffect(() => {
    apply(select(useAppStore.getState()))
    return useAppStore.subscribe((s, prev) => {
      const v = select(s)
      if (v !== select(prev)) apply(v)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
