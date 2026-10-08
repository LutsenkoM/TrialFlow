import {
  Container,
  Graphics,
  Particle,
  ParticleContainer,
  Rectangle,
  type FederatedPointerEvent,
  type Texture,
} from 'pixi.js'
import type { Viewport } from 'pixi-viewport'
import { WORLD, layout } from '../core/layout'
import type { FrameBuffers } from '../core/particleModel'
import { colors } from '../theme'

const WIDTH = 172
const PAD = 10
const SAMPLE = 5

/**
 * Overview of the whole scene in screen space: zone outlines, a sampled particle cloud and
 * the current viewport rectangle. Click or drag to move the camera.
 */
export class Minimap extends Container {
  private readonly bg = new Graphics()
  private readonly zones = new Graphics()
  private readonly frameRect = new Graphics()
  private readonly dots: ParticleContainer
  private readonly sampled: Particle[] = []
  private readonly scaleW: number
  private readonly mapHeight: number
  private readonly originX = -260
  private readonly vp: Viewport
  private dragging = false

  constructor(vp: Viewport, texture: Texture) {
    super()
    this.vp = vp
    const worldW = WORLD.width + 260
    this.scaleW = (WIDTH - PAD * 2) / worldW
    this.mapHeight = WORLD.height * this.scaleW + PAD * 2
    this.dots = new ParticleContainer({
      texture,
      dynamicProperties: { position: true, color: true, vertex: false },
    })
    this.dots.blendMode = 'add'
    this.dots.boundsArea = new Rectangle(0, 0, WIDTH, this.mapHeight)
    this.addChild(this.bg, this.zones, this.dots, this.frameRect)
    this.drawStatic()

    this.eventMode = 'static'
    this.cursor = 'pointer'
    this.hitArea = new Rectangle(0, 0, WIDTH, this.mapHeight)
    this.on('pointerdown', this.onDown)
    this.on('globalpointermove', this.onMove)
    this.on('pointerup', this.onUp)
    this.on('pointerupoutside', this.onUp)
  }

  get size() {
    return { width: WIDTH, height: this.mapHeight }
  }

  private mx = (x: number) => PAD + (x - this.originX) * this.scaleW
  private my = (y: number) => PAD + y * this.scaleW

  private drawStatic() {
    this.bg
      .roundRect(0, 0, WIDTH, this.mapHeight, 12)
      .fill({ color: 0x0b1222, alpha: 0.82 })
      .stroke({ width: 1, color: 0xaabeff, alpha: 0.12 })
    const g = this.zones
    const ring = (x: number, y: number, r: number, color: number) =>
      g.circle(this.mx(x), this.my(y), r * this.scaleW).stroke({ width: 1, color, alpha: 0.35 })
    ring(layout.screening.x, layout.screening.y, layout.screening.r, colors.neutral)
    ring(layout.screenFail.x, layout.screenFail.y, layout.screenFail.r, colors.screenFail)
    for (const lane of layout.lanes) {
      const color = colors.arms[lane.arm]
      g.roundRect(
        this.mx(lane.x0),
        this.my(lane.y - lane.halfWidth),
        (lane.x1 - lane.x0) * this.scaleW,
        lane.halfWidth * 2 * this.scaleW,
        3,
      ).stroke({
        width: 1,
        color,
        alpha: 0.35,
      })
      const done = layout.completed[lane.arm]
      ring(done.x, done.y, done.r, color)
    }
    for (const pool of Object.values(layout.discontinued))
      ring(pool.x, pool.y, pool.r, colors.reasons.adverse_event)
  }

  setPopulation(count: number) {
    this.dots.removeParticles()
    this.sampled.length = 0
    for (let i = 0; i < count; i += SAMPLE) {
      const p = new Particle({
        texture: this.dots.texture,
        anchorX: 0.5,
        anchorY: 0.5,
        scaleX: 0.05,
        scaleY: 0.05,
        alpha: 0,
      })
      this.sampled.push(p)
      this.dots.addParticle(p)
    }
  }

  update(frame: FrameBuffers) {
    const ps = this.sampled
    for (let k = 0; k < ps.length; k++) {
      const i = k * SAMPLE
      const p = ps[k]
      p.x = this.mx(frame.x[i])
      p.y = this.my(frame.y[i])
      p.tint = frame.tint[i]
      p.alpha = frame.alpha[i] * 0.9
    }
    const vp = this.vp
    const x0 = Math.max(PAD, this.mx(vp.left))
    const y0 = Math.max(PAD, this.my(vp.top))
    const x1 = Math.min(WIDTH - PAD, this.mx(vp.right))
    const y1 = Math.min(this.mapHeight - PAD, this.my(vp.bottom))
    this.frameRect.clear()
    if (x1 > x0 && y1 > y0) {
      this.frameRect
        .roundRect(x0, y0, x1 - x0, y1 - y0, 3)
        .fill({ color: 0xffffff, alpha: 0.05 })
        .stroke({ width: 1, color: 0xffffff, alpha: 0.7 })
    }
  }

  private moveCamera(e: FederatedPointerEvent) {
    const local = this.toLocal(e.global)
    const wx = (local.x - PAD) / this.scaleW + this.originX
    const wy = (local.y - PAD) / this.scaleW
    this.vp.moveCenter(wx, wy)
  }

  private onDown = (e: FederatedPointerEvent) => {
    e.stopPropagation()
    this.dragging = true
    this.moveCamera(e)
  }

  private onMove = (e: FederatedPointerEvent) => {
    if (this.dragging) this.moveCamera(e)
  }

  private onUp = () => {
    this.dragging = false
  }
}
