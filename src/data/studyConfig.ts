import type { ArmId, DiscontinuationReason } from './types'

export interface SiteConfig {
  id: number
  name: string
  city: string
  country: string
  /** Relative enrollment capacity (weights site selection). */
  capacity: number
  /** Calendar week the site is activated and starts screening. */
  activationWeek: number
}

export interface ArmConfig {
  id: ArmId
  label: string
  short: string
}

export type HazardTable = Record<ArmId, Record<DiscontinuationReason, number>>

export const ARMS: readonly ArmConfig[] = [
  { id: 'placebo', label: 'Placebo', short: 'PBO' },
  { id: 'low', label: 'Low Dose', short: 'LD' },
  { id: 'high', label: 'High Dose', short: 'HD' },
]

export const ARM_IDS: readonly ArmId[] = ARMS.map((a) => a.id)

export const REASONS: readonly { id: DiscontinuationReason; label: string }[] = [
  { id: 'adverse_event', label: 'Adverse event' },
  { id: 'lack_of_efficacy', label: 'Lack of efficacy' },
  { id: 'withdrawal', label: 'Withdrawal of consent' },
  { id: 'lost_to_follow_up', label: 'Lost to follow-up' },
]

export const SITES: readonly SiteConfig[] = [
  {
    id: 1,
    name: 'Nordlicht Klinikum',
    city: 'Hamburg',
    country: 'Germany',
    capacity: 1.4,
    activationWeek: 0,
  },
  {
    id: 2,
    name: 'Bayview Research Center',
    city: 'San Diego',
    country: 'USA',
    capacity: 1.8,
    activationWeek: 0.5,
  },
  {
    id: 3,
    name: 'Hôpital Saint-Aurèle',
    city: 'Lyon',
    country: 'France',
    capacity: 1.0,
    activationWeek: 1.5,
  },
  {
    id: 4,
    name: 'Maple Ridge Health',
    city: 'Toronto',
    country: 'Canada',
    capacity: 1.1,
    activationWeek: 2,
  },
  {
    id: 5,
    name: 'Sakura Medical Institute',
    city: 'Osaka',
    country: 'Japan',
    capacity: 0.8,
    activationWeek: 3,
  },
  {
    id: 6,
    name: 'Vistula Clinical Trials',
    city: 'Kraków',
    country: 'Poland',
    capacity: 1.3,
    activationWeek: 3.5,
  },
  {
    id: 7,
    name: 'Southern Cross Research',
    city: 'Melbourne',
    country: 'Australia',
    capacity: 0.7,
    activationWeek: 5,
  },
  {
    id: 8,
    name: 'Instituto Alameda',
    city: 'São Paulo',
    country: 'Brazil',
    capacity: 0.9,
    activationWeek: 6,
  },
]

export const STUDY = {
  code: 'TF-301',
  title: 'A Phase III, 52-week, double-blind, placebo-controlled study',
  phase: 'Phase III',
  /** Length of the calendar timeline shown in the app. */
  timelineWeeks: 52,
  /** Protocol treatment duration (weeks since randomization). */
  treatmentWeeks: 52,
  /** Calendar weeks per protocol week (the timeline compresses the treatment period, see DECISIONS.md). */
  treatmentTimeScale: 0.55,
  defaultPatientCount: 8000,
  maxPatientCount: 15000,
  defaultSeed: 301,
  enrollmentEndWeek: 20,
  /** Calendar duration of the screening period, uniform in [min, max]. */
  screeningDuration: { min: 1, max: 3 },
  screenFailRate: 0.25,
  ageRange: { min: 18, max: 80 },
  ageMean: 52,
  ageSd: 13,
  femaleShare: 0.54,
  /** Randomization block size per site (1:1:1). */
  blockSize: 6,
  visitWeeks: [2, 4, 8, 12, 16, 24, 32, 40, 52] as readonly number[],
  /**
   * Weekly hazard of discontinuation per protocol week.
   * High dose: more adverse events; placebo: more lack of efficacy.
   */
  hazards: {
    placebo: {
      adverse_event: 0.0008,
      lack_of_efficacy: 0.0034,
      withdrawal: 0.0012,
      lost_to_follow_up: 0.0008,
    },
    low: {
      adverse_event: 0.0016,
      lack_of_efficacy: 0.0018,
      withdrawal: 0.001,
      lost_to_follow_up: 0.0008,
    },
    high: {
      adverse_event: 0.0036,
      lack_of_efficacy: 0.001,
      withdrawal: 0.0012,
      lost_to_follow_up: 0.0008,
    },
  } satisfies HazardTable,
} as const

export type StudyConfig = typeof STUDY

/** Calendar week offset from randomization to a protocol week. */
export function protocolToCalendar(protocolWeeks: number): number {
  return protocolWeeks * STUDY.treatmentTimeScale
}
