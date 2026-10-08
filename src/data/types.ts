export type ArmId = 'placebo' | 'low' | 'high'
export type Sex = 'F' | 'M'
export type DiscontinuationReason =
  'adverse_event' | 'lack_of_efficacy' | 'withdrawal' | 'lost_to_follow_up'

export type PatientEvent =
  | { type: 'screened'; week: number }
  | { type: 'screen_failed'; week: number }
  | { type: 'randomized'; week: number }
  | { type: 'visit'; week: number; visitIndex: number; protocolWeek: number }
  | { type: 'discontinued'; week: number; reason: DiscontinuationReason }
  | { type: 'completed'; week: number }

export type PatientEventType = PatientEvent['type']

export interface Patient {
  id: number
  /** Human-readable code, e.g. "TF301-03-0142". */
  code: string
  siteId: number
  age: number
  sex: Sex
  arm: ArmId | null
  /** Calendar study week the patient entered screening (fractional). */
  screeningWeek: number
  /** Chronologically ordered events, first is always `screened`. */
  events: PatientEvent[]
}

export type Stage =
  'not_enrolled' | 'screening' | 'screen_failed' | 'treatment' | 'completed' | 'discontinued'

export interface PatientState {
  stage: Stage
  /** 0..1 progress within the stage (screening window, protocol treatment period). Sinks: 1. */
  progress: number
  /** Calendar weeks since the patient entered the current stage. */
  since: number
  /** Index of the last visit attended (-1 if none). */
  visitIndex: number
  reason: DiscontinuationReason | null
}
