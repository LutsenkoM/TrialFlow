import { Container, Particle, ParticleContainer, Rectangle, type Texture } from 'pixi.js'
import { mulberry32 } from '../data/prng'

interface Star {
  p: Particle
  depth: number
  bx: number
  by: number
  twinkle: number
  baseAlpha: number
}

/** Ambient star dust in screen space, drifting with slow parallax tied to the camera. */
export class Starfield extends Container {
  private readonly stars: Star[] = []
  private readonly pc: ParticleContainer
  private w = 1
  private h = 1

  constructor(texture: Texture, count = 420) {
    super()
    this.pc = new ParticleContainer({
      texture,
      dynamicProperties: { position: true, color: true, vertex: false },
    })
    this.pc.blendMode = 'add'
    this.addChild(this.pc)
    const rng = mulberry32(99)
    for (let i = 0; i < count; i++) {
      const depth = 0.15 + rng() * 0.85
      const size = (1.2 + rng() * 2.6) * depth
      const p = new Particle({
        texture,
        anchorX: 0.5,
        anchorY: 0.5,
        scaleX: (size / texture.width) * 2.2,
        scaleY: (size / texture.width) * 2.2,
        tint: rng() < 0.2 ? 0x9fb8ff : 0xdfe6ff,
      })
      this.pc.addParticle(p)
      this.stars.push({
        p,
        depth,
        bx: rng(),
        by: rng(),
        twinkle: rng() * Math.PI * 2,
        baseAlpha: 0.12 + rng() * 0.35,
      })
    }
  }

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.pc.boundsArea = new Rectangle(0, 0, w, h)
  }

  update(timeSec: number, camX: number, camY: number) {
    const { w, h } = this
    for (const s of this.stars) {
      const px = (((s.bx * w - camX * 0.06 * s.depth + timeSec * 3 * s.depth) % w) + w) % w
      const py = (((s.by * h - camY * 0.06 * s.depth) % h) + h) % h
      s.p.x = px
      s.p.y = py
      s.p.alpha = s.baseAlpha * (0.65 + 0.35 * Math.sin(timeSec * 0.8 + s.twinkle))
    }
  }
}
