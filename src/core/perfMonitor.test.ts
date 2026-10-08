import { describe, expect, it } from 'vitest'
import { PerfMonitor } from './perfMonitor'

const run = (m: PerfMonitor, frameMs: number, seconds: number, q: 'high' | 'medium' | 'low') => {
  let result: string | null = null
  for (let t = 0; t < seconds * 1000; t += frameMs) {
    m.record(frameMs, 2)
    result = m.autoDegrade(q, frameMs / 1000) ?? result
  }
  return result
}

describe('PerfMonitor', () => {
  it('keeps quality at 60 fps', () => {
    expect(run(new PerfMonitor(), 16.7, 10, 'high')).toBeNull()
  })

  it('drops one level after ~3 s below 50 fps', () => {
    const m = new PerfMonitor()
    expect(run(m, 28, 2, 'high')).toBeNull()
    expect(run(m, 28, 2.5, 'high')).toBe('medium')
  })

  it('never goes below low', () => {
    expect(run(new PerfMonitor(), 40, 10, 'low')).toBeNull()
  })

  it('reports fps from frame times', () => {
    const m = new PerfMonitor()
    for (let i = 0; i < 200; i++) m.record(20, 3)
    expect(m.snapshot().fps).toBeCloseTo(50, 0)
    expect(m.snapshot().tickMs).toBeCloseTo(3, 1)
  })
})
