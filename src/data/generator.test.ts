import { describe, expect, it } from 'vitest'
import { generatePatients } from './generator'
import { mulberry32 } from './prng'
import { STUDY } from './studyConfig'

const patients = generatePatients({ seed: 301, patientCount: 8000 })

describe('mulberry32', () => {
  it('is deterministic and in [0, 1)', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 1000; i++) {
      const x = a()
      expect(x).toBe(b())
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })
})

describe('generatePatients', () => {
  it('produces identical output for the same seed', () => {
    const again = generatePatients({ seed: 301, patientCount: 8000 })
    expect(again).toEqual(patients)
  })

  it('produces different output for a different seed', () => {
    const other = generatePatients({ seed: 302, patientCount: 8000 })
    expect(other).not.toEqual(patients)
  })

  it('respects the requested patient count, including 15k', () => {
    expect(patients).toHaveLength(8000)
    expect(generatePatients({ patientCount: 15000 })).toHaveLength(15000)
  })

  it('has a screen-fail rate near 25%', () => {
    const failed = patients.filter((p) => p.arm === null).length / patients.length
    expect(failed).toBeGreaterThan(0.23)
    expect(failed).toBeLessThan(0.27)
  })

  it('randomizes 1:1:1 within tolerance', () => {
    const randomized = patients.filter((p) => p.arm !== null)
    for (const arm of ['placebo', 'low', 'high'] as const) {
      const share = randomized.filter((p) => p.arm === arm).length / randomized.length
      expect(Math.abs(share - 1 / 3)).toBeLessThan(0.01)
    }
  })

  it('keeps demographics within spec', () => {
    for (const p of patients) {
      expect(p.age).toBeGreaterThanOrEqual(18)
      expect(p.age).toBeLessThanOrEqual(80)
      expect(['F', 'M']).toContain(p.sex)
      expect(p.siteId).toBeGreaterThanOrEqual(1)
      expect(p.siteId).toBeLessThanOrEqual(8)
    }
  })

  it('screens everyone within weeks 0–20', () => {
    for (const p of patients) {
      expect(p.screeningWeek).toBeGreaterThanOrEqual(0)
      expect(p.screeningWeek).toBeLessThanOrEqual(STUDY.enrollmentEndWeek)
    }
  })

  it('orders every timeline chronologically and ends within the timeline', () => {
    for (const p of patients) {
      expect(p.events[0].type).toBe('screened')
      for (let i = 1; i < p.events.length; i++) {
        expect(p.events[i].week).toBeGreaterThanOrEqual(p.events[i - 1].week)
      }
      expect(p.events[p.events.length - 1].week).toBeLessThanOrEqual(STUDY.timelineWeeks)
    }
  })

  it('ends every randomized patient in exactly one terminal event', () => {
    for (const p of patients.filter((x) => x.arm !== null)) {
      const terminal = p.events.filter((e) => e.type === 'completed' || e.type === 'discontinued')
      expect(terminal).toHaveLength(1)
      expect(p.events[p.events.length - 1]).toBe(terminal[0])
    }
  })

  it('gives completers every scheduled visit', () => {
    const completer = patients.find((p) => p.events.some((e) => e.type === 'completed'))
    expect(completer?.events.filter((e) => e.type === 'visit')).toHaveLength(
      STUDY.visitWeeks.length,
    )
  })

  it('reflects per-arm dropout profiles', () => {
    const reasonShare = (arm: string, reason: string) => {
      const inArm = patients.filter((p) => p.arm === arm)
      const n = inArm.filter((p) =>
        p.events.some((e) => e.type === 'discontinued' && e.reason === reason),
      ).length
      return n / inArm.length
    }
    expect(reasonShare('high', 'adverse_event')).toBeGreaterThan(
      reasonShare('placebo', 'adverse_event'),
    )
    expect(reasonShare('placebo', 'lack_of_efficacy')).toBeGreaterThan(
      reasonShare('high', 'lack_of_efficacy'),
    )
  })
})
