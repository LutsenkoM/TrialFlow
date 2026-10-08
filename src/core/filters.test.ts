import { describe, expect, it } from 'vitest'
import { generatePatients } from '../data/generator'
import { EMPTY_FILTERS } from '../store/appStore'
import { buildFilterMask, computeEmphasis, isFilterActive } from './filters'
import { STAGE, computeFrame, createFrameBuffers } from './particleModel'
import { buildPatientTable } from './patientTable'

const patients = generatePatients({ patientCount: 3000 })
const table = buildPatientTable(patients)
const frame = createFrameBuffers(table.count)
computeFrame(table, 40, frame)
const mask = new Uint8Array(table.count)

describe('filters', () => {
  it('matches everyone with empty filters', () => {
    expect(buildFilterMask(table, frame.stage, EMPTY_FILTERS, mask)).toBe(table.count)
    expect(isFilterActive(EMPTY_FILTERS, 18, 80)).toBe(false)
  })

  it('combines arm, sex and age with AND', () => {
    const f = {
      ...EMPTY_FILTERS,
      arms: ['high' as const],
      sexes: ['F' as const],
      ageRange: [40, 60] as [number, number],
    }
    const n = buildFilterMask(table, frame.stage, f, mask)
    const expected = patients.filter(
      (p) => p.arm === 'high' && p.sex === 'F' && p.age >= 40 && p.age <= 60,
    ).length
    expect(n).toBe(expected)
    expect(isFilterActive(f, 18, 80)).toBe(true)
  })

  it('filters status by the stage at the current week', () => {
    const n = buildFilterMask(
      table,
      frame.stage,
      { ...EMPTY_FILTERS, statuses: ['completed'] },
      mask,
    )
    let completed = 0
    for (let i = 0; i < table.count; i++) if (frame.stage[i] === STAGE.completed) completed++
    expect(n).toBe(completed)
  })

  it('highlights the selection and dims the rest', () => {
    mask.fill(1)
    const out = new Float32Array(table.count)
    computeEmphasis(mask, false, 7, out)
    expect(out[7]).toBe(2)
    expect(out[8]).toBeLessThan(1)
  })
})
