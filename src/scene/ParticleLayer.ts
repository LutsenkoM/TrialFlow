import { Particle, ParticleContainer, Rectangle, type Texture } from 'pixi.js'
import { WORLD } from '../core/layout'
import type { FrameBuffers } from '../core/particleModel'

/** 0xRRGGBB → 0xBBGGRR, the layout Pixi packs into Particle.color. */
export function bgr(rgb: number): number {
  return ((rgb & 0xff) << 16) | (rgb & 0xff00) | ((rgb >> 16) & 0xff)
}

/** Base particle size in world units (texture is scaled down to this). */
const PARTICLE_SIZE = 13

/** All patients as Pixi v8 `Particle`s in a single batched ParticleContainer, additive blended. */
export class ParticleLayer {
  readonly container: ParticleContainer
  private readonly particles: Particle[] = []
  private readonly baseScale: number
  private lastScale = new Float32Array(0)

  constructor(texture: Texture, count: number) {
    this.container = new ParticleContainer({
      texture,
      // Scale ("vertex") is static: it only changes on filter/selection transitions and hover,
      // so it is re-uploaded on demand via update() instead of every frame.
      dynamicProperties: {
        position: true,
        color: true,
        vertex: false,
        rotation: false,
        uvs: false,
      },
    })
    this.container.blendMode = 'add'
    this.container.boundsArea = new Rectangle(-400, -200, WORLD.width + 800, WORLD.height + 400)
    this.baseScale = PARTICLE_SIZE / texture.width
    this.lastScale = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const p = new Particle({
        texture,
        anchorX: 0.5,
        anchorY: 0.5,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
      })
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
    const last = this.lastScale
    let scaleDirty = false
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
      if (Math.abs(s - last[i]) > 1e-4) {
        last[i] = s
        p.scaleX = s
        p.scaleY = s
        scaleDirty = true
      }
      // Write the packed ABGR colour directly: the tint/alpha setters go through Color
      // parsing and clamping, which is measurable at 15k particles per frame.
      p.color = bgr(frame.tint[i]) + (((a < 0 ? 0 : a > 1 ? 1 : a) * 255) << 24)
    }
    if (scaleDirty) this.container.update()
  }

  get count() {
    return this.particles.length
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}
