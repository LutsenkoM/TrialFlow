import type { Quality } from '../store/appStore'

export interface PerfSnapshot {
  fps: number
  frameMs: number
  /** CPU time spent in the scene's own per-frame work. */
  tickMs: number
  /** Worst frame in the last second. */
  worstMs: number
}

const LOWER: Record<Quality, Quality | null> = { high: 'medium', medium: 'low', low: null }

/**
 * Rolling frame statistics plus the auto-degrade rule: if FPS stays below `minFps`
 * for `windowSec`, suggest one quality level lower (then wait another window).
 */
export class PerfMonitor {
  private fpsEma = 60
  private frameEma = 16.7
  private tickEma = 0
  private worst = 0
  private worstWindow = 0
  private worstAge = 0
  private lowFor = 0
  readonly minFps: number
  readonly windowSec: number

  constructor(minFps = 50, windowSec = 3) {
    this.minFps = minFps
    this.windowSec = windowSec
  }

  record(frameMs: number, tickMs: number) {
    const a = 0.08
    this.frameEma += (frameMs - this.frameEma) * a
    this.fpsEma = 1000 / Math.max(1, this.frameEma)
    this.tickEma += (tickMs - this.tickEma) * a
    this.worstWindow = Math.max(this.worstWindow, frameMs)
    this.worstAge += frameMs
    if (this.worstAge >= 1000) {
      this.worst = this.worstWindow
      this.worstWindow = 0
      this.worstAge = 0
    }
  }

  /** Returns the quality to switch to, or null to keep the current one. */
  autoDegrade(current: Quality, dtSec: number): Quality | null {
    if (this.fpsEma < this.minFps) this.lowFor += dtSec
    else this.lowFor = 0
    if (this.lowFor < this.windowSec) return null
    this.lowFor = 0
    return LOWER[current]
  }

  reset() {
    this.lowFor = 0
  }

  snapshot(): PerfSnapshot {
    return { fps: this.fpsEma, frameMs: this.frameEma, tickMs: this.tickEma, worstMs: this.worst }
  }
}
