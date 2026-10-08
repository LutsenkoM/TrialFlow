import { SITES, STUDY } from '../data/studyConfig'
import type { PatientTable } from './patientTable'

/** Population summary at a calendar week, restricted to `mask` (1 = included). */
export interface WeekStats {
  screened: number
  inScreening: number
  screenFailed: number
  randomized: number[]
  active: number[]
  completed: number[]
  /** [arm][reason] */
  discontinued: number[][]
}

export function statsAt(t: PatientTable, week: number, mask: Uint8Array): WeekStats {
  const s: WeekStats = {
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
  for (let i = 0; i < t.count; i++) {
    if (!mask[i] || week < t.screenWeek[i]) continue
    s.screened++
    if (week < t.decisionWeek[i]) {
      s.inScreening++
      continue
    }
    const arm = t.arm[i]
    if (arm < 0) {
      s.screenFailed++
      continue
    }
    s.randomized[arm]++
    if (week < t.endWeek[i]) s.active[arm]++
    else if (t.outcome[i] === 0) s.completed[arm]++
    else s.discontinued[arm][t.outcome[i] - 1]++
  }
  return s
}

export interface KpiSeries {
  screened: number[]
  randomized: number[]
  active: number[]
  completed: number[]
  discontinued: number[]
}

/** Weekly KPI history (index = week 0..52) for sparklines. */
export function kpiSeries(t: PatientTable, mask: Uint8Array): KpiSeries {
  const out: KpiSeries = {
    screened: [],
    randomized: [],
    active: [],
    completed: [],
    discontinued: [],
  }
  const total = (xs: number[]) => xs[0] + xs[1] + xs[2]
  for (let w = 0; w <= STUDY.timelineWeeks; w++) {
    const s = statsAt(t, w, mask)
    out.screened.push(s.screened)
    out.randomized.push(total(s.randomized))
    out.active.push(total(s.active))
    out.completed.push(total(s.completed))
    out.discontinued.push(s.discontinued.reduce((a, r) => a + r[0] + r[1] + r[2] + r[3], 0))
  }
  return out
}

export interface KmPoint {
  /** Protocol weeks since randomization. */
  t: number
  /** Survival (still on study) probability. */
  s: number
}

/**
 * Kaplan–Meier retention per arm with a data cut at calendar `week`:
 * discontinuation = event; completion or still-active-at-cut = censored.
 */
export function kaplanMeier(t: PatientTable, week: number, mask: Uint8Array): KmPoint[][] {
  const scale = STUDY.treatmentTimeScale
  // Packed sort keys (typed arrays sort natively, no per-patient objects):
  // key = round(time * 1e5) * 2 + (censored ? 1 : 0), so events sort before censorings at ties.
  const keys = [new Float64Array(t.count), new Float64Array(t.count), new Float64Array(t.count)]
  const sizes = [0, 0, 0]
  for (let i = 0; i < t.count; i++) {
    const arm = t.arm[i]
    if (!mask[i] || arm < 0 || week < t.decisionWeek[i]) continue
    const end = t.endWeek[i]
    const time = (Math.min(end, week) - t.decisionWeek[i]) / scale
    const event = end <= week && t.outcome[i] > 0
    keys[arm][sizes[arm]++] = Math.round(time * 1e5) * 2 + (event ? 0 : 1)
  }
  return keys.map((all, arm) => {
    const obs = all.subarray(0, sizes[arm]).sort()
    const curve: KmPoint[] = [{ t: 0, s: 1 }]
    let atRisk = obs.length
    let s = 1
    let k = 0
    while (k < obs.length) {
      const tick = Math.floor(obs[k] / 2)
      let events = 0
      let leaving = 0
      while (k < obs.length && Math.floor(obs[k] / 2) === tick) {
        if (obs[k] % 2 === 0) events++
        leaving++
        k++
      }
      if (events > 0 && atRisk > 0) {
        s *= 1 - events / atRisk
        curve.push({ t: tick / 1e5, s })
      }
      atRisk -= leaving
    }
    const maxT = obs.length ? Math.floor(obs[obs.length - 1] / 2) / 1e5 : 0
    if (curve[curve.length - 1].t < maxT) curve.push({ t: maxT, s })
    return curve
  })
}

/** Screenings per site per calendar week (rows = SITES order, cols = weeks 0..enrollmentEnd+3). */
export function enrollmentHeatmap(t: PatientTable, mask: Uint8Array): number[][] {
  const weeks = STUDY.enrollmentEndWeek + 1
  const rows = SITES.map(() => new Array<number>(weeks).fill(0))
  const rowOf = new Map(SITES.map((s, i) => [s.id, i]))
  for (let i = 0; i < t.count; i++) {
    if (!mask[i]) continue
    const r = rowOf.get(t.site[i])
    if (r === undefined) continue
    const w = Math.min(weeks - 1, Math.floor(t.screenWeek[i]))
    rows[r][w]++
  }
  return rows
}
