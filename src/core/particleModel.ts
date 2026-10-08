import { STUDY, protocolToCalendar } from '../data/studyConfig'
import { colors } from '../theme'
import { clamp01, easeInOutCubic, lerpColor, quad } from './easing'
import { layout, type Disc } from './layout'
import type { PatientTable } from './patientTable'

export const STAGE = {
  hidden: 0,
  screening: 1,
  screenFailed: 2,
  treatment: 3,
  completed: 4,
  discontinued: 5,
} as const
export type StageCode = (typeof STAGE)[keyof typeof STAGE]

/** Calendar weeks a particle spends travelling between zones. */
export const TRANSITION = { enter: 1.2, randomize: 1.1, sink: 1.0, fail: 1.0 } as const

const TREATMENT_CAL = protocolToCalendar(STUDY.treatmentWeeks)
const ARM_COLORS = [colors.arms.placebo, colors.arms.low, colors.arms.high]
const LANES = layout.lanes
const COMPLETED = [layout.completed.placebo, layout.completed.low, layout.completed.high]
const POOLS = [
  layout.discontinued.adverse_event,
  layout.discontinued.lack_of_efficacy,
  layout.discontinued.withdrawal,
  layout.discontinued.lost_to_follow_up,
]

/** Per-frame output buffers, reused across frames (no allocation in the hot path). */
export interface FrameBuffers {
  x: Float32Array
  y: Float32Array
  alpha: Float32Array
  scale: Float32Array
  tint: Uint32Array
  stage: Uint8Array
  /** 1 while the particle is travelling between zones (drives trails and drift). */
  moving: Uint8Array
  /** 0..1 progress of the most recent transition (for burst effects). */
  transition: Float32Array
}

export function createFrameBuffers(count: number): FrameBuffers {
  return {
    x: new Float32Array(count),
    y: new Float32Array(count),
    alpha: new Float32Array(count),
    scale: new Float32Array(count),
    tint: new Uint32Array(count),
    stage: new Uint8Array(count),
    moving: new Uint8Array(count),
    transition: new Float32Array(count),
  }
}

// Scratch point to avoid allocation.
let sx = 0
let sy = 0

function discSlot(d: Disc, r0: number, r1: number) {
  const rad = Math.sqrt(r0) * d.r
  const ang = r1 * Math.PI * 2
  sx = d.x + Math.cos(ang) * rad
  sy = d.y + Math.sin(ang) * rad
}

function laneSlot(arm: number, progress: number, r0: number, r1: number) {
  const lane = LANES[arm]
  sx = lane.x0 + progress * (lane.x1 - lane.x0) + (r1 - 0.5) * 10
  sy = lane.y + (r0 * 2 - 1) * lane.halfWidth
}

/**
 * Writes particle i's state at `week` into `out` at index `o` (defaults to i; trails write
 * ghosts into a separate buffer). Pure w.r.t. inputs.
 */
export function computeParticle(
  t: PatientTable,
  i: number,
  week: number,
  out: FrameBuffers,
  o = i,
) {
  const scr = t.screenWeek[i]
  const r0 = t.r0[i]
  const r1 = t.r1[i]
  const baseScale = 0.75 + t.r2[i] * 0.5
  out.moving[o] = 0
  out.transition[o] = 1

  if (week < scr) {
    out.stage[o] = STAGE.hidden
    out.alpha[o] = 0
    out.x[o] = layout.source.x
    out.y[o] = layout.source.y + (r1 - 0.5) * layout.source.spread
    out.scale[o] = baseScale
    out.tint[o] = colors.neutral
    return
  }

  const dec = t.decisionWeek[i]
  discSlot(layout.screening, r0, r1)
  const screenX = sx
  const screenY = sy

  if (week < dec) {
    out.stage[o] = STAGE.screening
    out.tint[o] = colors.neutral
    out.scale[o] = baseScale
    const k = (week - scr) / TRANSITION.enter
    if (k < 1) {
      const e = easeInOutCubic(k)
      const fromX = layout.source.x
      const fromY = layout.source.y + (r1 - 0.5) * layout.source.spread
      out.x[o] = quad(fromX, screenX - 120, screenX, e)
      out.y[o] = quad(fromY, fromY, screenY, e)
      out.alpha[o] = 0.25 + 0.6 * clamp01(k * 2)
      out.moving[o] = 1
      out.transition[o] = k
    } else {
      out.x[o] = screenX
      out.y[o] = screenY
      out.alpha[o] = 0.85
    }
    return
  }

  const arm = t.arm[i]
  if (arm < 0) {
    out.stage[o] = STAGE.screenFailed
    out.tint[o] = colors.screenFail
    out.scale[o] = baseScale * 0.85
    discSlot(layout.screenFail, r0, r1)
    const k = (week - dec) / TRANSITION.fail
    if (k < 1) {
      const e = easeInOutCubic(k)
      out.x[o] = quad(screenX, screenX + 40, sx, e)
      out.y[o] = quad(screenY, (screenY + sy) / 2, sy, e)
      out.alpha[o] = 0.85 - 0.45 * e
      out.moving[o] = 1
      out.transition[o] = k
    } else {
      out.x[o] = sx
      out.y[o] = sy
      out.alpha[o] = 0.4
    }
    return
  }

  const end = t.endWeek[i]
  const armColor = ARM_COLORS[arm]

  if (week < end) {
    out.stage[o] = STAGE.treatment
    out.scale[o] = baseScale
    const progress = clamp01((week - dec) / TREATMENT_CAL)
    laneSlot(arm, progress, r0, r1)
    const k = (week - dec) / TRANSITION.randomize
    if (k < 1) {
      const e = easeInOutCubic(k)
      const rn = layout.randomization
      out.x[o] = quad(screenX, rn.x, sx, e)
      out.y[o] = quad(screenY, rn.y, sy, e)
      out.tint[o] = lerpColor(colors.neutral, armColor, clamp01(k * 1.6))
      out.alpha[o] = 0.85 - 0.25 * e
      out.moving[o] = 1
      out.transition[o] = k
    } else {
      out.x[o] = sx
      out.y[o] = sy
      out.tint[o] = armColor
      out.alpha[o] = 0.6
    }
    return
  }

  const outcome = t.outcome[i]
  const endProgress = clamp01((end - dec) / TREATMENT_CAL)
  laneSlot(arm, endProgress, r0, r1)
  const fromX = sx
  const fromY = sy
  const k = (week - end) / TRANSITION.sink

  if (outcome === 0) {
    out.stage[o] = STAGE.completed
    out.tint[o] = armColor
    out.scale[o] = baseScale
    discSlot(COMPLETED[arm], r0, r1)
    if (k < 1) {
      const e = easeInOutCubic(k)
      out.x[o] = quad(fromX, sx - 60, sx, e)
      out.y[o] = quad(fromY, fromY, sy, e)
      out.moving[o] = 1
      out.transition[o] = k
    } else {
      out.x[o] = sx
      out.y[o] = sy
    }
    out.alpha[o] = 0.7
    return
  }

  out.stage[o] = STAGE.discontinued
  out.scale[o] = baseScale * 0.85
  discSlot(POOLS[outcome - 1], r0, r1)
  if (k < 1) {
    const e = easeInOutCubic(k)
    // Fall: drop vertically first, then settle into the reason pool.
    out.x[o] = quad(fromX, fromX, sx, e)
    out.y[o] = quad(fromY, sy, sy, e)
    out.tint[o] = lerpColor(armColor, colors.reasons.lack_of_efficacy, e * 0.35)
    out.alpha[o] = 0.6 - 0.05 * e
    out.moving[o] = 1
    out.transition[o] = k
  } else {
    out.x[o] = sx
    out.y[o] = sy
    out.tint[o] = lerpColor(armColor, colors.reasons.lack_of_efficacy, 0.35)
    out.alpha[o] = 0.55
  }
}

export function computeFrame(t: PatientTable, week: number, out: FrameBuffers) {
  for (let i = 0; i < t.count; i++) computeParticle(t, i, week, out)
}

/** Stage codes only (no positions) — cheap path for UI-side filtering. */
export function computeStages(t: PatientTable, week: number, out: Uint8Array) {
  for (let i = 0; i < t.count; i++) {
    if (week < t.screenWeek[i]) out[i] = STAGE.hidden
    else if (week < t.decisionWeek[i]) out[i] = STAGE.screening
    else if (t.arm[i] < 0) out[i] = STAGE.screenFailed
    else if (week < t.endWeek[i]) out[i] = STAGE.treatment
    else out[i] = t.outcome[i] === 0 ? STAGE.completed : STAGE.discontinued
  }
}
