import { STUDY, protocolToCalendar } from './studyConfig'
import type { Patient, PatientState } from './types'

const TREATMENT_CALENDAR_WEEKS = protocolToCalendar(STUDY.treatmentWeeks)

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

/** Pure: where is this patient at a given calendar week? */
export function getPatientStateAt(patient: Patient, week: number): PatientState {
  const { events } = patient
  const screened = events[0]
  if (week < screened.week) {
    return { stage: 'not_enrolled', progress: 0, since: 0, visitIndex: -1, reason: null }
  }
  const decision = events[1]
  if (week < decision.week) {
    const progress = clamp01((week - screened.week) / (decision.week - screened.week))
    return {
      stage: 'screening',
      progress,
      since: week - screened.week,
      visitIndex: -1,
      reason: null,
    }
  }
  if (decision.type === 'screen_failed') {
    return {
      stage: 'screen_failed',
      progress: 1,
      since: week - decision.week,
      visitIndex: -1,
      reason: null,
    }
  }

  let visitIndex = -1
  for (let i = 2; i < events.length; i++) {
    const e = events[i]
    if (e.week > week) break
    if (e.type === 'visit') visitIndex = e.visitIndex
    else if (e.type === 'completed') {
      return { stage: 'completed', progress: 1, since: week - e.week, visitIndex, reason: null }
    } else if (e.type === 'discontinued') {
      return {
        stage: 'discontinued',
        progress: 1,
        since: week - e.week,
        visitIndex,
        reason: e.reason,
      }
    }
  }
  const progress = clamp01((week - decision.week) / TREATMENT_CALENDAR_WEEKS)
  return { stage: 'treatment', progress, since: week - decision.week, visitIndex, reason: null }
}

export type StageCounts = Record<PatientState['stage'], number>

export function countStagesAt(patients: readonly Patient[], week: number): StageCounts {
  const counts: StageCounts = {
    not_enrolled: 0,
    screening: 0,
    screen_failed: 0,
    treatment: 0,
    completed: 0,
    discontinued: 0,
  }
  for (const p of patients) counts[getPatientStateAt(p, week).stage]++
  return counts
}
