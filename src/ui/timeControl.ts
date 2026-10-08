import gsap from 'gsap'
import { useAppStore, clampWeek } from '../store/appStore'
import { durations, easings } from '../theme'

const tweenState = { week: 0 }

/** Animated jump on the timeline (GSAP-tweens the week so particles glide instead of teleporting). */
export function jumpToWeek(target: number) {
  const store = useAppStore.getState()
  const to = clampWeek(target)
  gsap.killTweensOf(tweenState)
  if (store.reducedMotion || Math.abs(to - store.week) < 0.01) {
    store.setWeek(to)
    return
  }
  store.setPlaying(false)
  tweenState.week = store.week
  const distance = Math.abs(to - store.week)
  gsap.to(tweenState, {
    week: to,
    duration: Math.min(1.4, durations.base + distance * 0.025),
    ease: easings.gsapInOut,
    onUpdate: () => useAppStore.getState().setWeek(tweenState.week),
  })
}

/** Stop any in-flight jump (e.g. when the user grabs the scrubber). */
export function cancelJump() {
  gsap.killTweensOf(tweenState)
}

export function stepWeek(delta: number) {
  const w = useAppStore.getState().week
  jumpToWeek(delta > 0 ? Math.floor(w + 1e-6) + delta : Math.ceil(w - 1e-6) + delta)
}

export function togglePlay() {
  cancelJump()
  useAppStore.getState().togglePlaying()
}
