import { describe, expect, it } from 'vitest'
import { generatePatients } from '../data/generator'
import { getPatientStateAt } from '../data/patientState'
import type { Stage } from '../data/types'
import { buildPatientTable } from './patientTable'
import { STAGE, computeFrame, computeStages, createFrameBuffers } from './particleModel'

const patients = generatePatients({ patientCount: 2000 })
const table = buildPatientTable(patients)

const STAGE_MAP: Record<Stage, number> = {
  not_enrolled: STAGE.hidden,
  screening: STAGE.screening,
  screen_failed: STAGE.screenFailed,
  treatment: STAGE.treatment,
  completed: STAGE.completed,
  discontinued: STAGE.discontinued,
}

describe('particleModel', () => {
  it('agrees with getPatientStateAt on the stage of every patient', () => {
    const buf = createFrameBuffers(table.count)
    for (const week of [0, 3.3, 12, 25.5, 40, 52]) {
      computeFrame(table, week, buf)
      patients.forEach((p, i) => {
        expect(buf.stage[i]).toBe(STAGE_MAP[getPatientStateAt(p, week).stage])
      })
    }
  })

  it('moves particles continuously (no teleports between nearby weeks)', () => {
    const a = createFrameBuffers(table.count)
    const b = createFrameBuffers(table.count)
    for (let week = 0; week < 52; week += 0.25) {
      computeFrame(table, week, a)
      computeFrame(table, week + 0.005, b)
      for (let i = 0; i < table.count; i++) {
        if (a.stage[i] === STAGE.hidden || b.stage[i] === STAGE.hidden) continue
        const d = Math.hypot(a.x[i] - b.x[i], a.y[i] - b.y[i])
        expect(d).toBeLessThan(25)
      }
    }
  })

  it('gives the same frame regardless of scrub direction', () => {
    const forward = createFrameBuffers(table.count)
    const back = createFrameBuffers(table.count)
    computeFrame(table, 30, forward)
    computeFrame(table, 50, back)
    computeFrame(table, 30, back)
    expect(Array.from(back.x)).toEqual(Array.from(forward.x))
  })

  it('computeStages matches the full frame computation', () => {
    const buf = createFrameBuffers(table.count)
    const stages = new Uint8Array(table.count)
    for (const week of [2, 17.5, 33, 52]) {
      computeFrame(table, week, buf)
      computeStages(table, week, stages)
      expect(Array.from(stages)).toEqual(Array.from(buf.stage))
    }
  })
})
