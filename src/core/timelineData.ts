import { STUDY } from '../data/studyConfig'
import type { Patient } from '../data/types'

export interface Milestone {
  id: string
  label: string
  week: number
}

/** Study milestones derived from the generated data. */
export function computeMilestones(patients: readonly Patient[]): Milestone[] {
  let firstRandomized = Infinity
  let lastScreened = -Infinity
  let firstCompleted = Infinity
  let lastEvent = -Infinity
  for (const p of patients) {
    lastScreened = Math.max(lastScreened, p.events[0].week)
    for (const e of p.events) {
      if (e.type === 'randomized') firstRandomized = Math.min(firstRandomized, e.week)
      if (e.type === 'completed') firstCompleted = Math.min(firstCompleted, e.week)
      lastEvent = Math.max(lastEvent, e.week)
    }
  }
  const all: Milestone[] = [
    { id: 'fpr', label: 'First patient randomized', week: firstRandomized },
    { id: 'enroll', label: 'Enrollment closes', week: lastScreened },
    { id: 'fpc', label: 'First patient completes', week: firstCompleted },
    { id: 'lplv', label: 'Last patient, last visit', week: lastEvent },
  ]
  return all.filter((m) => Number.isFinite(m.week))
}

/** Normalised (0..1) count of scheduled visits per calendar bin — the scrubber's activity strip. */
export function visitDensity(patients: readonly Patient[], bins = 104): number[] {
  const counts = new Array<number>(bins).fill(0)
  const scale = bins / STUDY.timelineWeeks
  for (const p of patients) {
    for (const e of p.events) {
      if (e.type !== 'visit' && e.type !== 'screened') continue
      const b = Math.min(bins - 1, Math.floor(e.week * scale))
      counts[b]++
    }
  }
  const max = Math.max(1, ...counts)
  return counts.map((c) => c / max)
}
