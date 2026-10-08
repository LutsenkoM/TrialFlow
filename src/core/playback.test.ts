import { describe, expect, it } from 'vitest'
import { WEEKS_PER_SECOND, advanceWeek } from './playback'

describe('advanceWeek', () => {
  it('scales by speed', () => {
    expect(advanceWeek(10, 1, 2).week).toBeCloseTo(10 + 2 * WEEKS_PER_SECOND)
    expect(advanceWeek(10, 1, 0.5).week).toBeCloseTo(10 + 0.5 * WEEKS_PER_SECOND)
  })

  it('stops at the end of the timeline', () => {
    expect(advanceWeek(51.9, 1, 4)).toEqual({ week: 52, ended: true })
  })
})
