import { Particle, ParticleContainer, Rectangle, type Texture } from 'pixi.js'
import { WORLD } from '../core/layout'
import { computeParticle, createFrameBuffers, type FrameBuffers } from '../core/particleModel'
import type { PatientTable } from '../core/patientTable'

const GHOSTS = 5
const PARTICLE_SIZE = 13

/**
 * Motion trails for travelling particles. Because positions are a pure function of the
 * week, each ghost is simply the same particle evaluated slightly in the past — no
 * render-texture feedback pass and no per-particle history buffers.
 */
export class TrailLayer {
  readonly container: ParticleContainer
  private readonly pool: Particle[] = []
  private readonly ghost: FrameBuffers
  private readonly baseScale: number
  private capacity: number
  /** Fades trails out when time stops. */
  private strength = 0

  constructor(texture: Texture, capacity: number) {
    this.capacity = capacity
    this.container = new ParticleContainer({
      texture,
      dynamicProperties: { position: true, color: true, vertex: true },
    })
    this.container.blendMode = 'add'
    this.container.boundsArea = new Rectangle(-400, -200, WORLD.width + 800, WORLD.height + 400)
    this.baseScale = PARTICLE_SIZE / texture.width
    this.ghost = createFrameBuffers(1)
    this.ensurePool(capacity)
  }

  private ensurePool(n: number) {
    while (this.pool.length < n) {
      const p = new Particle({
        texture: this.container.texture,
        anchorX: 0.5,
        anchorY: 0.5,
        alpha: 0,
      })
      this.pool.push(p)
      this.container.addParticle(p)
    }
  }

  setCapacity(n: number) {
    this.capacity = n
    this.ensurePool(n)
    this.container.visible = n > 0
  }

  /**
   * @param weekDelta signed weeks advanced this frame (0 when paused).
   * @param emphasis per-particle emphasis; dimmed particles get no trail.
   */
  update(
    table: PatientTable,
    frame: FrameBuffers,
    week: number,
    weekDelta: number,
    dt: number,
    emphasis: Float32Array,
  ) {
    const pool = this.pool
    const moving = Math.abs(weekDelta) > 1e-5
    this.strength += ((moving ? 1 : 0) - this.strength) * Math.min(1, dt * (moving ? 10 : 4))
    let used = 0
    if (this.capacity > 0 && this.strength > 0.02) {
      // Ghost spacing follows the current speed so trails stretch at 4× and shrink at 0.5×.
      const sign = weekDelta < 0 ? -1 : 1
      const step = Math.min(0.12, Math.max(0.025, Math.abs(weekDelta) * 1.6)) * sign
      const g = this.ghost
      for (let i = 0; i < table.count && used + GHOSTS <= this.capacity; i++) {
        if (!frame.moving[i] || emphasis[i] < 0.5) continue
        for (let k = 1; k <= GHOSTS; k++) {
          computeParticle(table, i, week - step * k, g, 0)
          const p = pool[used++]
          const fade = 1 - k / (GHOSTS + 1)
          p.x = g.x[0]
          p.y = g.y[0]
          p.tint = frame.tint[i]
          p.alpha = g.alpha[0] * fade * 0.42 * this.strength
          const s = g.scale[0] * this.baseScale * (0.55 + 0.45 * fade)
          p.scaleX = s
          p.scaleY = s
        }
      }
    }
    for (let j = used; j < pool.length; j++) {
      if (pool[j].alpha === 0) break
      pool[j].alpha = 0
    }
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}
