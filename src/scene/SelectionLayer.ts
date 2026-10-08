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

  update(
    time: number,
    hover: { x: number; y: number } | null,
    selected: { x: number; y: number; tint: number } | null,
  ) {
    this.hoverRing.visible = hover !== null
    if (hover) this.hoverRing.position.set(hover.x, hover.y)

    const visible = selected !== null
    this.selectRing.visible = visible
    this.selectRing2.visible = visible
    if (!selected) return
    const pulse = (time * 0.9) % 1
    this.selectRing.position.set(selected.x, selected.y)
    this.selectRing.tint = selected.tint
    this.selectRing.scale.set((44 / 128) * (1 + Math.sin(time * 3) * 0.06))
    // Expanding ripple.
    this.selectRing2.position.set(selected.x, selected.y)
    this.selectRing2.tint = selected.tint
    this.selectRing2.scale.set((44 / 128) * (1 + pulse * 1.6))
    this.selectRing2.alpha = 0.55 * (1 - pulse)
  }
}
