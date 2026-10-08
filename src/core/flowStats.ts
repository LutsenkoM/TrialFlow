import { STAGE, type FrameBuffers } from './particleModel'
import type { PatientTable } from './patientTable'

/** Cumulative flows (patients that have passed along each path) plus current occupancy. */
export interface FlowStats {
  screened: number
  inScreening: number
  screenFailed: number
  randomized: number[]
  active: number[]
  completed: number[]
  /** [arm][reason] discontinued counts. */
  discontinued: number[][]
}

export function createFlowStats(): FlowStats {
  return {
    screened: 0,
    inScreening: 0,
    screenFailed: 0,
    randomized: [0, 0, 0],
    active: [0, 0, 0],
    completed: [0, 0, 0],
    discontinued: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  }
}

/**
 * Tallies stages from a computed frame. `include` (optional) restricts to a subset,
 * e.g. the currently filtered population.
 */
export function computeFlowStats(
  table: PatientTable,
  frame: FrameBuffers,
  out: FlowStats,
  include?: Uint8Array,
): FlowStats {
  out.screened = 0
  out.inScreening = 0
  out.screenFailed = 0
  for (let a = 0; a < 3; a++) {
    out.randomized[a] = 0
    out.active[a] = 0
    out.completed[a] = 0
    out.discontinued[a].fill(0)
  }
  for (let i = 0; i < table.count; i++) {
    if (include && !include[i]) continue
    const stage = frame.stage[i]
    if (stage === STAGE.hidden) continue
    out.screened++
    if (stage === STAGE.screening) {
      out.inScreening++
      continue
    }
    if (stage === STAGE.screenFailed) {
      out.screenFailed++
      continue
    }
    const arm = table.arm[i]
    out.randomized[arm]++
    if (stage === STAGE.treatment) out.active[arm]++
    else if (stage === STAGE.completed) out.completed[arm]++
    else out.discontinued[arm][table.outcome[i] - 1]++
  }
  return out
}

export const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)
