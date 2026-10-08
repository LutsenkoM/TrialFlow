import { STUDY } from '../data/studyConfig'

/** Calendar weeks advanced per second at 1× speed (full study ≈ 40 s). */
export const WEEKS_PER_SECOND = 1.3

export interface PlaybackStep {
  week: number
  ended: boolean
}

export function advanceWeek(week: number, dtSeconds: number, speed: number): PlaybackStep {
  const next = week + dtSeconds * speed * WEEKS_PER_SECOND
  if (next >= STUDY.timelineWeeks) return { week: STUDY.timelineWeeks, ended: true }
  return { week: next, ended: false }
}
