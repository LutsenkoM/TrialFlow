/**
 * Uniform-grid spatial index over particle positions, rebuilt with a counting sort into
 * preallocated typed arrays. Nearest-neighbour queries touch only a handful of cells
 * instead of every particle.
 */
export class SpatialGrid {
  readonly cellSize: number
  private readonly minX: number
  private readonly minY: number
  private readonly cols: number
  private readonly rows: number
  private readonly cellStart: Int32Array
  private readonly cellCount: Int32Array
  private items: Int32Array
  private cellOf: Int32Array

  constructor(
    bounds: { x: number; y: number; width: number; height: number },
    cellSize: number,
    capacity: number,
  ) {
    this.cellSize = cellSize
    this.minX = bounds.x
    this.minY = bounds.y
    this.cols = Math.max(1, Math.ceil(bounds.width / cellSize))
    this.rows = Math.max(1, Math.ceil(bounds.height / cellSize))
    this.cellStart = new Int32Array(this.cols * this.rows + 1)
    this.cellCount = new Int32Array(this.cols * this.rows)
    this.items = new Int32Array(capacity)
    this.cellOf = new Int32Array(capacity)
  }

  private cellIndex(x: number, y: number): number {
    const cx = Math.floor((x - this.minX) / this.cellSize)
    const cy = Math.floor((y - this.minY) / this.cellSize)
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return -1
    return cy * this.cols + cx
  }

  /** Index all `include`d points. */
  rebuild(xs: Float32Array, ys: Float32Array, include: (i: number) => boolean) {
    const n = xs.length
    if (this.items.length < n) {
      this.items = new Int32Array(n)
      this.cellOf = new Int32Array(n)
    }
    const { cellCount, cellStart, cellOf, items } = this
    cellCount.fill(0)
    for (let i = 0; i < n; i++) {
      const c = include(i) ? this.cellIndex(xs[i], ys[i]) : -1
      cellOf[i] = c
      if (c >= 0) cellCount[c]++
    }
    let acc = 0
    for (let c = 0; c < cellCount.length; c++) {
      cellStart[c] = acc
      acc += cellCount[c]
    }
    cellStart[cellCount.length] = acc
    cellCount.fill(0)
    for (let i = 0; i < n; i++) {
      const c = cellOf[i]
      if (c < 0) continue
      items[cellStart[c] + cellCount[c]++] = i
    }
  }

  /** Nearest indexed point within `radius` of (x, y), or -1. */
  nearest(x: number, y: number, radius: number, xs: Float32Array, ys: Float32Array): number {
    const { cellSize, cols, rows, cellStart, items } = this
    const c0 = Math.max(0, Math.floor((x - radius - this.minX) / cellSize))
    const c1 = Math.min(cols - 1, Math.floor((x + radius - this.minX) / cellSize))
    const r0 = Math.max(0, Math.floor((y - radius - this.minY) / cellSize))
    const r1 = Math.min(rows - 1, Math.floor((y + radius - this.minY) / cellSize))
    let best = -1
    let bestD = radius * radius
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const cell = r * cols + c
        for (let k = cellStart[cell]; k < cellStart[cell + 1]; k++) {
          const i = items[k]
          const dx = xs[i] - x
          const dy = ys[i] - y
          const d = dx * dx + dy * dy
          if (d <= bestD) {
            bestD = d
            best = i
          }
        }
      }
    }
    return best
  }
}
