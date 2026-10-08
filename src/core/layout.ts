import { ARM_IDS, REASONS, STUDY } from '../data/studyConfig'
import type { ArmId, DiscontinuationReason } from '../data/types'

/** World-space geometry of the scene. All scene drawing and particle math use these numbers. */
export interface Point {
  x: number
  y: number
}

export interface Disc extends Point {
  r: number
}

export interface Lane {
  arm: ArmId
  x0: number
  x1: number
  y: number
  halfWidth: number
}

export const WORLD = { width: 2400, height: 1420 } as const

const LANE_Y: Record<ArmId, number> = { placebo: 400, low: 660, high: 920 }

export const layout = {
  source: { x: -160, y: 660, spread: 420 },
  screening: { x: 330, y: 660, r: 170 } satisfies Disc,
  screenFail: { x: 330, y: 1150, r: 125 } satisfies Disc,
  randomization: { x: 640, y: 660 } satisfies Point,
  lanes: ARM_IDS.map((arm): Lane => ({ arm, x0: 820, x1: 1880, y: LANE_Y[arm], halfWidth: 54 })),
  completed: Object.fromEntries(
    ARM_IDS.map((arm) => [arm, { x: 2130, y: LANE_Y[arm], r: 112 }]),
  ) as Record<ArmId, Disc>,
  completedZone: { x: 2130, y: 660, r: 0 },
  discontinued: Object.fromEntries(
    REASONS.map((reason, i) => [reason.id, { x: 1000 + i * 270, y: 1225, r: 92 }]),
  ) as Record<DiscontinuationReason, Disc>,
} as const

export const ARM_INDEX: Record<ArmId, number> = { placebo: 0, low: 1, high: 2 }
export const REASON_INDEX: Record<DiscontinuationReason, number> = {
  adverse_event: 0,
  lack_of_efficacy: 1,
  withdrawal: 2,
  lost_to_follow_up: 3,
}

/** x of a protocol visit tick on a lane. */
export function visitX(lane: Lane, protocolWeek: number): number {
  return lane.x0 + (protocolWeek / STUDY.treatmentWeeks) * (lane.x1 - lane.x0)
}
