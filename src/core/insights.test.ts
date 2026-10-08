import { describe, expect, it } from 'vitest'
import { generatePatients } from '../data/generator'
import { countStagesAt } from '../data/patientState'
import { enrollmentHeatmap, kaplanMeier, kpiSeries, statsAt } from './insights'
import { buildPatientTable } from './patientTable'

const patients = generatePatients({ patientCount: 4000 })
const table = buildPatientTable(patients)
const all = new Uint8Array(table.count).fill(1)

describe('insights', () => {
  it('statsAt agrees with getPatientStateAt', () => {
    const s = statsAt(table, 30, all)
    const c = countStagesAt(patients, 30)
    expect(s.inScreening).toBe(c.screening)
    expect(s.screenFailed).toBe(c.screen_failed)
    expect(s.active.reduce((a, b) => a + b)).toBe(c.treatment)
    expect(s.completed.reduce((a, b) => a + b)).toBe(c.completed)
  })

  it('kpi series are cumulative where they should be', () => {
    const k = kpiSeries(table, all)
    expect(k.screened).toHaveLength(53)
    for (let w = 1; w < 53; w++) {
      expect(k.screened[w]).toBeGreaterThanOrEqual(k.screened[w - 1])
      expect(k.completed[w]).toBeGreaterThanOrEqual(k.completed[w - 1])
    }
  })

  it('KM curves are monotone non-increasing within [0,1]', () => {
    for (const curve of kaplanMeier(table, 52, all)) {
      expect(curve[0]).toEqual({ t: 0, s: 1 })
      for (let i = 1; i < curve.length; i++) {
        expect(curve[i].s).toBeLessThanOrEqual(curve[i - 1].s)
        expect(curve[i].t).toBeGreaterThanOrEqual(curve[i - 1].t)
        expect(curve[i].s).toBeGreaterThan(0)
      }
    }
  })

  it('KM final retention roughly matches the share that did not discontinue', () => {
    const [placebo] = kaplanMeier(table, 52, all)
    const inArm = patients.filter((p) => p.arm === 'placebo')
    const kept =
      inArm.filter((p) => !p.events.some((e) => e.type === 'discontinued')).length / inArm.length
    expect(placebo[placebo.length - 1].s).toBeCloseTo(kept, 1)
  })

  it('heatmap totals equal screened patients', () => {
    const h = enrollmentHeatmap(table, all)
    const total = h.flat().reduce((a, b) => a + b, 0)
    expect(total).toBe(table.count)
  })
})
