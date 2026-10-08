import { describe, expect, it } from 'vitest'
import { countStagesAt, getPatientStateAt } from './patientState'
import { generatePatients } from './generator'
import type { Patient } from './types'

const completer: Patient = {
  id: 1,
  code: 'TF301-01-0001',
  siteId: 1,
  age: 40,
  sex: 'F',
  arm: 'low',
  screeningWeek: 2,
  events: [
    { type: 'screened', week: 2 },
    { type: 'randomized', week: 4 },
    { type: 'visit', week: 5.1, visitIndex: 0, protocolWeek: 2 },
    { type: 'visit', week: 6.2, visitIndex: 1, protocolWeek: 4 },
    { type: 'completed', week: 32.6 },
  ],
}

const dropout: Patient = {
  ...completer,
  id: 2,
  events: [
    { type: 'screened', week: 2 },
    { type: 'randomized', week: 4 },
    { type: 'visit', week: 5.1, visitIndex: 0, protocolWeek: 2 },
    { type: 'discontinued', week: 6, reason: 'adverse_event' },
  ],
}

const screenFail: Patient = {
  ...completer,
  id: 3,
  arm: null,
  events: [
    { type: 'screened', week: 2 },
    { type: 'screen_failed', week: 3 },
  ],
}

describe('getPatientStateAt', () => {
  it('is not enrolled before screening', () => {
    expect(getPatientStateAt(completer, 1).stage).toBe('not_enrolled')
  })

  it('reports screening progress', () => {
    const s = getPatientStateAt(completer, 3)
    expect(s.stage).toBe('screening')
    expect(s.progress).toBeCloseTo(0.5)
    expect(s.since).toBeCloseTo(1)
  })

  it('handles screen failures', () => {
    const s = getPatientStateAt(screenFail, 3.5)
    expect(s.stage).toBe('screen_failed')
    expect(s.since).toBeCloseTo(0.5)
  })

  it('tracks treatment progress and visits', () => {
    const before = getPatientStateAt(completer, 4.5)
    expect(before.stage).toBe('treatment')
    expect(before.visitIndex).toBe(-1)
    const after = getPatientStateAt(completer, 6.5)
    expect(after.visitIndex).toBe(1)
    expect(after.progress).toBeGreaterThan(before.progress)
  })

  it('reaches completion', () => {
    const s = getPatientStateAt(completer, 40)
    expect(s.stage).toBe('completed')
    expect(s.visitIndex).toBe(1)
    expect(s.since).toBeCloseTo(7.4)
  })

  it('records discontinuation reason', () => {
    const s = getPatientStateAt(dropout, 10)
    expect(s.stage).toBe('discontinued')
    expect(s.reason).toBe('adverse_event')
  })

  it('is a pure function of week (scrubbing backwards gives the same answer)', () => {
    const forward = getPatientStateAt(completer, 6.5)
    getPatientStateAt(completer, 40)
    expect(getPatientStateAt(completer, 6.5)).toEqual(forward)
  })
})

describe('countStagesAt', () => {
  const patients = generatePatients({ patientCount: 3000 })

  it('sums to the population at any week', () => {
    for (const week of [0, 5, 20, 52]) {
      const counts = countStagesAt(patients, week)
      const total = Object.values(counts).reduce((a, b) => a + b, 0)
      expect(total).toBe(3000)
    }
  })

  it('has everyone resolved by week 52', () => {
    const counts = countStagesAt(patients, 52)
    expect(counts.not_enrolled + counts.screening + counts.treatment).toBe(0)
  })
})
