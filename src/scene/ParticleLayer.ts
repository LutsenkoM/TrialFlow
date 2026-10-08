import { Particle, ParticleContainer, Rectangle, type Texture } from 'pixi.js'
import { WORLD } from '../core/layout'
import type { FrameBuffers } from '../core/particleModel'

/** Base particle size in world units (texture is scaled down to this). */
const PARTICLE_SIZE = 13

/** All patients as Pixi v8 `Particle`s in a single batched ParticleContainer, additive blended. */
export class ParticleLayer {
  readonly container: ParticleContainer
  private readonly particles: Particle[] = []
  private readonly baseScale: number

  constructor(texture: Texture, count: number) {
    this.container = new ParticleContainer({
      texture,
      dynamicProperties: { position: true, color: true, vertex: true, rotation: false, uvs: false },
    })
    this.container.blendMode = 'add'
    this.container.boundsArea = new Rectangle(-400, -200, WORLD.width + 800, WORLD.height + 400)
    this.baseScale = PARTICLE_SIZE / texture.width
    for (let i = 0; i < count; i++) {
      const p = new Particle({ texture, anchorX: 0.5, anchorY: 0.5, alpha: 0 })
      this.particles.push(p)
      this.container.addParticle(p)
    }
  }

  /**
   * Copies frame buffers into particles. `emphasis`: 1 normal, <1 dimmed, >1 highlighted.
   * `hovered` gets an extra size/alpha boost.
   */
  apply(
    frame: FrameBuffers,
    emphasis: Float32Array,
    offsetX: Float32Array,
    offsetY: Float32Array,
    hovered: number,
  ) {
    const ps = this.particles
    const base = this.baseScale
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i]
      const e = emphasis[i]
      p.x = frame.x[i] + offsetX[i]
      p.y = frame.y[i] + offsetY[i]
      let s = e >= 1 ? 1 + (e - 1) * 0.45 : 0.6 + 0.4 * e
      let a =
        e >= 1
          ? frame.alpha[i] + (1 - frame.alpha[i]) * Math.min(1, e - 1)
          : frame.alpha[i] * (0.05 + 0.95 * e)
      if (i === hovered) {
        s *= 1.7
        a = 1
      }
      s *= frame.scale[i] * base
      p.scaleX = s
      p.scaleY = s
      p.tint = frame.tint[i]
      p.alpha = a
    }
  }

  get count() {
    return this.particles.length
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}
