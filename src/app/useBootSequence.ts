import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { loadPatients } from '../data/loadPatients'
import { useAppStore } from '../store/appStore'

const INTRO_MS = 2600

interface Params {
  week: string | null
  count: number | undefined
  select: string | null
  skipIntro: boolean
}

export function readParams(): Params & { debug: boolean } {
  const params = new URLSearchParams(window.location.search)
  const week = params.get('week')
  const select = params.get('select')
  return {
    week,
    count: Number(params.get('n')) || undefined,
    select,
    debug: params.has('debug'),
    // Deep links and screenshots go straight to the content.
    skipIntro: params.has('nointro') || week !== null || select !== null,
  }
}

/**
 * Loads data in a worker and runs the intro: title card + scene draw-in for ~2.6 s
 * (skippable), then autoplay from week 0. Reduced motion / deep links skip the intro.
 */
export function useBootSequence() {
  const [ready, setReady] = useState(false)
  const [showIntro, setShowIntro] = useState(
    () => !readParams().skipIntro && !useAppStore.getState().reducedMotion,
  )
  const started = useRef(0)
  const finished = useRef(false)

  // Before the scene mounts (it waits for fonts), so it knows whether to play the intro.
  useLayoutEffect(() => {
    started.current = performance.now()
    useAppStore.getState().setIntro(showIntro)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finishIntro = useCallback(() => {
    if (finished.current) return
    finished.current = true
    setShowIntro(false)
    const s = useAppStore.getState()
    s.setIntro(false)
    s.setWeek(0)
    s.setPlaying(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    const { week, count, select } = readParams()
    if (week !== null) useAppStore.getState().setWeek(Number(week))
    loadPatients({ patientCount: count })
      .then(({ patients }) => {
        if (cancelled) return
        useAppStore.getState().setPatients(patients)
        setReady(true)
        if (select !== null)
          window.setTimeout(() => useAppStore.getState().select(Number(select)), 900)
      })
      .catch((err: unknown) => console.error('Failed to generate data', err))
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-finish once data is ready and the intro has had its time.
  useEffect(() => {
    if (!showIntro || !ready) return
    const remaining = Math.max(0, INTRO_MS - (performance.now() - started.current))
    const id = window.setTimeout(finishIntro, remaining)
    return () => window.clearTimeout(id)
  }, [showIntro, ready, finishIntro])

  const skip = useCallback(() => {
    if (ready) finishIntro()
  }, [ready, finishIntro])

  return { ready, showIntro, skip }
}

export function useReducedMotionSync() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => useAppStore.getState().setReducedMotion(mq.matches)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
}
