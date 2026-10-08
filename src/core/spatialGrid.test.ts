import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../data/prng'
import { SpatialGrid } from './spatialGrid'

describe('SpatialGrid', () => {
  const rng = mulberry32(1)
  const n = 5000
  const xs = new Float32Array(n)
  const ys = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    xs[i] = rng() * 1000
    ys[i] = rng() * 600
  }
  const grid = new SpatialGrid({ x: 0, y: 0, width: 1000, height: 600 }, 24, n)
  grid.rebuild(xs, ys, () => true)

  const brute = (x: number, y: number, radius: number, include = (_: number) => true) => {
    let best = -1
    let bestD = radius * radius
    for (let i = 0; i < n; i++) {
      if (!include(i)) continue
      const d = (xs[i] - x) ** 2 + (ys[i] - y) ** 2
      if (d <= bestD) {
        bestD = d
        best = i
      }
    }
    return best
  }

  it('matches brute-force nearest neighbour', () => {
    for (let q = 0; q < 300; q++) {
      const x = rng() * 1000
      const y = rng() * 600
      const a = grid.nearest(x, y, 20, xs, ys)
      const b = brute(x, y, 20)
      if (a !== b) {
        // Ties at equal distance are acceptable.
        expect((xs[a] - x) ** 2 + (ys[a] - y) ** 2).toBeCloseTo((xs[b] - x) ** 2 + (ys[b] - y) ** 2)
      }
    }
  })

  it('returns -1 when nothing is in range', () => {
    expect(grid.nearest(-500, -500, 10, xs, ys)).toBe(-1)
  })

  it('excludes filtered-out points', () => {
    const even = (i: number) => i % 2 === 0
    grid.rebuild(xs, ys, even)
    for (let q = 0; q < 100; q++) {
      const hit = grid.nearest(rng() * 1000, rng() * 600, 30, xs, ys)
      if (hit >= 0) expect(hit % 2).toBe(0)
    }
  })
})
