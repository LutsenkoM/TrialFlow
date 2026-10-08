import { describe, expect, it } from 'vitest'
import { generatePatients } from '../data/generator'
import { countStagesAt } from '../data/patientState'
import { computeFlowStats, createFlowStats, sum } from './flowStats'
import { computeFrame, createFrameBuffers } from './particleModel'
import { buildPatientTable } from './patientTable'

describe('computeFlowStats', () => {
  const patients = generatePatients({ patientCount: 3000 })
  const table = buildPatientTable(patients)
  const frame = createFrameBuffers(table.count)

  it('matches stage counts from getPatientStateAt', () => {
    for (const week of [8, 26, 52]) {
      computeFrame(table, week, frame)
      const s = computeFlowStats(table, frame, createFlowStats())
      const c = countStagesAt(patients, week)
      expect(s.screened).toBe(table.count - c.not_enrolled)
      expect(s.screenFailed).toBe(c.screen_failed)
      expect(sum(s.active)).toBe(c.treatment)
      expect(sum(s.completed)).toBe(c.completed)
      expect(sum(s.discontinued.map(sum))).toBe(c.discontinued)
    }
  })

  it('respects an include mask', () => {
    computeFrame(table, 52, frame)
    const none = computeFlowStats(table, frame, createFlowStats(), new Uint8Array(table.count))
    expect(none.screened).toBe(0)
  })
})
