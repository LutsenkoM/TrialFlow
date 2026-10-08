import { Container, Sprite, type Texture } from 'pixi.js'
import { layout } from '../core/layout'
import { TRANSITION } from '../core/particleModel'
import type { FrameBuffers } from '../core/particleModel'
import type { PatientTable } from '../core/patientTable'
import { colors } from '../theme'

type Kind = 'ripple' | 'rise' | 'fall'

interface Burst {
  sprite: Sprite
  kind: Kind
  age: number
  life: number
  baseScale: number
  vy: number
}

const ARM_COLORS = [colors.arms.placebo, colors.arms.low, colors.arms.high]
const MAX_PER_FRAME = 10

/**
 * Event bursts: ripples at the randomization node, soft upward pulses on completion,
 * dim falling sparks on discontinuation. Fixed sprite pool, no allocation per event.
 */
export class BurstLayer extends Container {
  private readonly free: Burst[] = []
  private readonly live: Burst[] = []
  private lastRipple = 0
  private time = 0
  enabled = true

  constructor(ring: Texture, glow: Texture, size = 140) {
    super()
    for (let i = 0; i < size; i++) {
      const useRing = i < size / 3
      const sprite = new Sprite(useRing ? ring : glow)
      sprite.anchor.set(0.5)
      sprite.visible = false
      sprite.blendMode = 'add'
      this.addChild(sprite)
      this.free.push({
        sprite,
        kind: useRing ? 'ripple' : 'rise',
        age: 0,
        life: 1,
        baseScale: 1,
        vy: 0,
      })
    }
  }

  private spawn(kind: Kind, x: number, y: number, tint: number) {
    const wantRing = kind === 'ripple'
    const idx = this.free.findIndex((b) => (b.kind === 'ripple') === wantRing)
    if (idx < 0) return
    const b = this.free.splice(idx, 1)[0]
    b.kind = kind
    b.age = 0
    b.life = kind === 'ripple' ? 0.9 : kind === 'rise' ? 1.1 : 1.4
    b.baseScale = kind === 'ripple' ? 0.35 : kind === 'rise' ? 0.6 : 0.4
    b.vy = kind === 'rise' ? -38 : 22
    b.sprite.position.set(x, y)
    b.sprite.tint = tint
    b.sprite.visible = true
    this.live.push(b)
  }

  /** Detect events crossed between prevWeek and week (forward time only). */
  detect(table: PatientTable, frame: FrameBuffers, prevWeek: number, week: number) {
    if (!this.enabled || week <= prevWeek || week - prevWeek > 1) return
    let spawned = 0
    let randomizedArm = -1
    for (let i = 0; i < table.count && spawned < MAX_PER_FRAME; i++) {
      const arm = table.arm[i]
      if (arm < 0) continue
      // Passing through the randomization node (midway along the bezier).
      const rnd = table.decisionWeek[i] + TRANSITION.randomize * 0.5
      if (rnd > prevWeek && rnd <= week) randomizedArm = arm
      const arrive = table.endWeek[i] + TRANSITION.sink
      if (arrive > prevWeek && arrive <= week) {
        if (table.outcome[i] === 0) this.spawn('rise', frame.x[i], frame.y[i], ARM_COLORS[arm])
        else this.spawn('fall', frame.x[i], frame.y[i], colors.reasons.adverse_event)
        spawned++
      }
    }
    if (randomizedArm >= 0 && this.time - this.lastRipple > 0.14) {
      this.lastRipple = this.time
      this.spawn(
        'ripple',
        layout.randomization.x,
        layout.randomization.y,
        ARM_COLORS[randomizedArm],
      )
    }
  }

  update(dt: number) {
    this.time += dt
    for (let k = this.live.length - 1; k >= 0; k--) {
      const b = this.live[k]
      b.age += dt
      const t = b.age / b.life
      if (t >= 1) {
        b.sprite.visible = false
        this.live.splice(k, 1)
        this.free.push(b)
        continue
      }
      const s = b.sprite
      if (b.kind === 'ripple') {
        s.scale.set(b.baseScale * (0.4 + t * 1.6))
        s.alpha = 0.7 * (1 - t) * (1 - t)
      } else {
        s.y += b.vy * dt
        s.scale.set(b.baseScale * (b.kind === 'rise' ? 1 - t * 0.5 : 1 - t * 0.7))
        s.alpha = (b.kind === 'rise' ? 0.55 : 0.25) * Math.sin(Math.PI * t)
      }
    }
  }
}
