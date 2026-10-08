import { describe, expect, it } from 'vitest'
import { generatePatients } from '../data/generator'
import { computeMilestones, visitDensity } from './timelineData'

const patients = generatePatients({ patientCount: 2000 })

describe('timeline data', () => {
  it('orders milestones within the timeline', () => {
    const ms = computeMilestones(patients)
    expect(ms.map((m) => m.id)).toEqual(['fpr', 'enroll', 'fpc', 'lplv'])
    for (const m of ms) {
      expect(m.week).toBeGreaterThanOrEqual(0)
      expect(m.week).toBeLessThanOrEqual(52)
    }
    expect(ms[0].week).toBeLessThan(ms[2].week)
  })

  it('normalises density to 0..1', () => {
    const d = visitDensity(patients, 52)
    expect(d).toHaveLength(52)
    expect(Math.max(...d)).toBe(1)
    expect(Math.min(...d)).toBeGreaterThanOrEqual(0)
  })
})
