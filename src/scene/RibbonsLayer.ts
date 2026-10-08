import { Graphics } from 'pixi.js'
import { REASONS } from '../data/studyConfig'
import { layout } from '../core/layout'
import type { FlowStats } from '../core/flowStats'
import { sum } from '../core/flowStats'
import { colors } from '../theme'

type Vec = [number, number]

/** Max ribbon width in world units, reached when the whole population flows down one path. */
const MAX_WIDTH = 170
const SAMPLES = 28

const ARM_COLORS = [colors.arms.placebo, colors.arms.low, colors.arms.high]

function cubic(p0: Vec, c1: Vec, c2: Vec, p3: Vec, t: number): Vec {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return [
    a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0],
    a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1],
  ]
}

function cubicTangent(p0: Vec, c1: Vec, c2: Vec, p3: Vec, t: number): Vec {
  const u = 1 - t
  const a = 3 * u * u
  const b = 6 * u * t
  const c = 3 * t * t
  return [
    a * (c1[0] - p0[0]) + b * (c2[0] - c1[0]) + c * (p3[0] - c2[0]),
    a * (c1[1] - p0[1]) + b * (c2[1] - c1[1]) + c * (p3[1] - c2[1]),
  ]
}

/**
 * Sankey-like flow bands under the particles. Width ∝ cumulative patients that have
 * travelled each path up to the current week, so they grow as time advances.
 */
export class RibbonsLayer extends Graphics {
  private readonly left: number[] = []
  private readonly right: number[] = []

  constructor() {
    super()
    this.blendMode = 'add'
  }

  private band(p0: Vec, c1: Vec, c2: Vec, p3: Vec, width: number, color: number, alpha: number) {
    if (width < 0.4) return
    // Graphics keeps a reference to the point array until render, so each band needs its own.
    const pts: number[] = []
    const { left, right } = this
    left.length = 0
    right.length = 0
    for (let s = 0; s <= SAMPLES; s++) {
      const t = s / SAMPLES
      const p = cubic(p0, c1, c2, p3, t)
      const [dx, dy] = cubicTangent(p0, c1, c2, p3, t)
      const len = Math.hypot(dx, dy) || 1
      // Taper ends slightly so bands melt into the zones.
      const taper = 0.75 + 0.25 * Math.sin(Math.PI * t)
      const hw = (width / 2) * taper
      const nx = (-dy / len) * hw
      const ny = (dx / len) * hw
      left.push(p[0] + nx, p[1] + ny)
      right.push(p[0] - nx, p[1] - ny)
    }
    pts.push(...left)
    for (let k = right.length - 2; k >= 0; k -= 2) pts.push(right[k], right[k + 1])
    this.poly(pts).fill({ color, alpha })
  }

  draw(stats: FlowStats, population: number) {
    this.clear()
    if (population === 0) return
    const w = (n: number) => (n / population) * MAX_WIDTH
    const sc = layout.screening
    const rn = layout.randomization
    const sf = layout.screenFail

    this.band(
      [-60, sc.y],
      [80, sc.y],
      [sc.x - sc.r - 80, sc.y],
      [sc.x - sc.r + 10, sc.y],
      w(stats.screened),
      colors.neutral,
      0.07,
    )
    this.band(
      [sc.x, sc.y + sc.r - 10],
      [sc.x, sc.y + sc.r + 80],
      [sf.x, sf.y - sf.r - 80],
      [sf.x, sf.y - sf.r + 10],
      w(stats.screenFailed),
      colors.screenFail,
      0.08,
    )
    const randomized = sum(stats.randomized)
    this.band(
      [sc.x + sc.r - 10, sc.y],
      [sc.x + sc.r + 60, sc.y],
      [rn.x - 80, rn.y],
      [rn.x - 18, rn.y],
      w(randomized),
      colors.neutral,
      0.08,
    )

    layout.lanes.forEach((lane, a) => {
      const color = ARM_COLORS[a]
      this.band(
        [rn.x + 18, rn.y],
        [rn.x + 110, rn.y],
        [lane.x0 - 110, lane.y],
        [lane.x0 - 10, lane.y],
        w(stats.randomized[a]),
        color,
        0.1,
      )
      const done = layout.completed[lane.arm]
      this.band(
        [lane.x1 + 10, lane.y],
        [lane.x1 + 70, lane.y],
        [done.x - done.r - 70, done.y],
        [done.x - done.r + 10, done.y],
        w(stats.completed[a]),
        color,
        0.1,
      )
    })

    const bottom = layout.lanes[layout.lanes.length - 1]
    const laneBottom = bottom.y + bottom.halfWidth + 12
    REASONS.forEach((reason, r) => {
      const pool = layout.discontinued[reason.id]
      const n = stats.discontinued[0][r] + stats.discontinued[1][r] + stats.discontinued[2][r]
      this.band(
        [pool.x, laneBottom],
        [pool.x, laneBottom + 60],
        [pool.x, pool.y - pool.r - 90],
        [pool.x, pool.y - pool.r + 6],
        w(n),
        colors.reasons[reason.id],
        0.1,
      )
    })
  }
}
