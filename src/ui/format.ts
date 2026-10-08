import { ARMS, REASONS, SITES } from '../data/studyConfig'
import type { ArmId, DiscontinuationReason, PatientEvent, PatientState } from '../data/types'

export const armLabel = (arm: ArmId | null) =>
  arm ? (ARMS.find((a) => a.id === arm)?.label ?? arm) : 'Not randomized'
export const reasonLabel = (r: DiscontinuationReason) => REASONS.find((x) => x.id === r)?.label ?? r
export const siteById = (id: number) => SITES.find((s) => s.id === id)
export const fmtInt = (n: number) => n.toLocaleString('en-US')
export const fmtWeek = (w: number) => `W${w.toFixed(1)}`

export function eventLabel(e: PatientEvent): string {
  switch (e.type) {
    case 'screened':
      return 'Screening started'
    case 'screen_failed':
      return 'Screen failure'
    case 'randomized':
      return 'Randomized'
    case 'visit':
      return `Visit ${e.visitIndex + 1} · protocol W${e.protocolWeek}`
    case 'discontinued':
      return `Discontinued — ${reasonLabel(e.reason)}`
    case 'completed':
      return 'Completed study'
  }
}

export function statusLabel(s: PatientState): string {
  switch (s.stage) {
    case 'not_enrolled':
      return 'Not yet enrolled'
    case 'screening':
      return 'In screening'
    case 'screen_failed':
      return 'Screen failure'
    case 'treatment':
      return s.visitIndex >= 0 ? `On treatment · visit ${s.visitIndex + 1} of 9` : 'On treatment'
    case 'completed':
      return 'Completed'
    case 'discontinued':
      return `Discontinued · ${s.reason ? reasonLabel(s.reason) : ''}`
  }
}
