import { Container, Sprite, type Texture } from 'pixi.js'

/** Hover ring and pulsing selection halo that follow particles in world space. */
export class SelectionLayer extends Container {
  private readonly hoverRing: Sprite
  private readonly selectRing: Sprite
  private readonly selectRing2: Sprite

  constructor(ring: Texture) {
    super()
    const make = (size: number, alpha: number) => {
      const s = new Sprite(ring)
      s.anchor.set(0.5)
      s.width = s.height = size
      s.alpha = alpha
      s.visible = false
      s.blendMode = 'add'
      this.addChild(s)
      return s
    }
    this.hoverRing = make(30, 0.7)
    this.selectRing = make(44, 0.95)
    this.selectRing2 = make(44, 0.5)
  }

  /** Scalar arguments (no per-frame objects). */
  update(
    time: number,
    showHover: boolean,
    hx: number,
    hy: number,
    showSelected: boolean,
    sx: number,
    sy: number,
    tint: number,
  ) {
    this.hoverRing.visible = showHover
    if (showHover) this.hoverRing.position.set(hx, hy)

    this.selectRing.visible = showSelected
    this.selectRing2.visible = showSelected
    if (!showSelected) return
    const pulse = (time * 0.9) % 1
    this.selectRing.position.set(sx, sy)
    this.selectRing.tint = tint
    this.selectRing.scale.set((44 / 128) * (1 + Math.sin(time * 3) * 0.06))
    // Expanding ripple.
    this.selectRing2.position.set(sx, sy)
    this.selectRing2.tint = tint
    this.selectRing2.scale.set((44 / 128) * (1 + pulse * 1.6))
    this.selectRing2.alpha = 0.55 * (1 - pulse)
  }
}
