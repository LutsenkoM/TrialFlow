import { mulberry32 } from '../data/prng'
import type { Patient } from '../data/types'
import { ARM_INDEX, REASON_INDEX } from './layout'

/** Outcome codes: -1 unresolved/screen fail, 0 completed, 1..4 = discontinued reason index + 1. */
export const OUTCOME_COMPLETED = 0

/**
 * Struct-of-arrays view of the population for the per-frame hot path.
 * Built once from Patient objects; never mutated afterwards.
 */
export interface PatientTable {
  count: number
  screenWeek: Float32Array
  decisionWeek: Float32Array
  /** Completion / discontinuation week; Infinity for screen fails. */
  endWeek: Float32Array
  /** 0..2 arm index, -1 for screen fail. */
  arm: Int8Array
  outcome: Int8Array
  site: Uint8Array
  age: Uint8Array
  /** 0 = F, 1 = M */
  sex: Uint8Array
  /** Deterministic per-particle randoms in [0,1): slot radius, slot angle, size, phase. */
  r0: Float32Array
  r1: Float32Array
  r2: Float32Array
  r3: Float32Array
}

export function buildPatientTable(patients: readonly Patient[], seed = 7): PatientTable {
  const n = patients.length
  const t: PatientTable = {
    count: n,
    screenWeek: new Float32Array(n),
    decisionWeek: new Float32Array(n),
    endWeek: new Float32Array(n),
    arm: new Int8Array(n),
    outcome: new Int8Array(n),
    site: new Uint8Array(n),
    age: new Uint8Array(n),
    sex: new Uint8Array(n),
    r0: new Float32Array(n),
    r1: new Float32Array(n),
    r2: new Float32Array(n),
    r3: new Float32Array(n),
  }
  const rng = mulberry32(seed)
  for (let i = 0; i < n; i++) {
    const p = patients[i]
    const last = p.events[p.events.length - 1]
    t.screenWeek[i] = p.events[0].week
    t.decisionWeek[i] = p.events[1].week
    t.arm[i] = p.arm === null ? -1 : ARM_INDEX[p.arm]
    if (last.type === 'completed') {
      t.endWeek[i] = last.week
      t.outcome[i] = OUTCOME_COMPLETED
    } else if (last.type === 'discontinued') {
      t.endWeek[i] = last.week
      t.outcome[i] = REASON_INDEX[last.reason] + 1
    } else {
      t.endWeek[i] = Infinity
      t.outcome[i] = -1
    }
    t.site[i] = p.siteId
    t.age[i] = p.age
    t.sex[i] = p.sex === 'F' ? 0 : 1
    t.r0[i] = rng()
    t.r1[i] = rng()
    t.r2[i] = rng()
    t.r3[i] = rng()
  }
  return t
}

const cache = new WeakMap<readonly Patient[], PatientTable>()

/** Shared, memoised table so the scene and the UI derive from the same arrays. */
export function getPatientTable(patients: readonly Patient[]): PatientTable {
  let t = cache.get(patients)
  if (!t) {
    t = buildPatientTable(patients)
    cache.set(patients, t)
  }
  return t
}
