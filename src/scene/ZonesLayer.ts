import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js'
import { ARMS, REASONS, STUDY } from '../data/studyConfig'
import { layout, visitX, type Disc } from '../core/layout'
import { colors, fonts } from '../theme'

const LABEL_STYLE = {
  fontFamily: fonts.sans,
  fontSize: 15,
  fontWeight: '600',
  letterSpacing: 2.4,
  fill: colors.inkMuted,
} as const

const COUNT_STYLE = {
  fontFamily: fonts.mono,
  fontSize: 22,
  fontWeight: '500',
  fill: colors.ink,
} as const

const SMALL_STYLE = {
  fontFamily: fonts.mono,
  fontSize: 14,
  fill: colors.inkMuted,
  letterSpacing: 0.5,
} as const

export type ZoneKey =
  | 'screening'
  | 'screenFail'
  | 'randomization'
  | 'placebo'
  | 'low'
  | 'high'
  | 'completed'
  | 'adverse_event'
  | 'lack_of_efficacy'
  | 'withdrawal'
  | 'lost_to_follow_up'

interface ZoneVisual {
  halos: Sprite[]
  count: Text | null
  baseHaloAlpha: number
}

function makeText(text: string, style: object, x: number, y: number, anchorX = 0.5) {
  const t = new Text({ text, style, resolution: 3 })
  t.anchor.set(anchorX, 0.5)
  t.position.set(x, y)
  return t
}

/** Static scene furniture: zone rings, lanes, visit ticks, labels, and live counters. */
export class ZonesLayer extends Container {
  readonly halos = new Container()
  readonly lines = new Graphics()
  readonly labels = new Container()
  private readonly zones = new Map<ZoneKey, ZoneVisual>()

  private readonly haloTexture: Texture

  constructor(haloTexture: Texture) {
    super()
    this.haloTexture = haloTexture
    this.addChild(this.halos, this.lines, this.labels)
    this.drawScreening()
    this.drawRandomization()
    this.drawLanes()
    this.drawSinks()
  }

  private addHalo(key: ZoneKey, d: Disc, color: number, alpha: number, count: Text | null) {
    const halo = new Sprite(this.haloTexture)
    halo.anchor.set(0.5)
    halo.position.set(d.x, d.y)
    halo.width = halo.height = d.r * 3.2
    halo.tint = color
    halo.alpha = alpha
    halo.blendMode = 'add'
    this.halos.addChild(halo)
    const existing = this.zones.get(key)
    if (existing) existing.halos.push(halo)
    else this.zones.set(key, { halos: [halo], count, baseHaloAlpha: alpha })
  }

  private ring(d: Disc, color: number, alpha: number, dashed = false) {
    const g = this.lines
    if (!dashed) {
      g.circle(d.x, d.y, d.r).stroke({ width: 1.5, color, alpha })
      return
    }
    const segments = 72
    for (let s = 0; s < segments; s += 2) {
      const a0 = (s / segments) * Math.PI * 2
      const a1 = ((s + 1) / segments) * Math.PI * 2
      g.moveTo(d.x + Math.cos(a0) * d.r, d.y + Math.sin(a0) * d.r)
      g.arc(d.x, d.y, d.r, a0, a1)
    }
    g.stroke({ width: 1.5, color, alpha })
  }

  private drawScreening() {
    const s = layout.screening
    this.ring({ ...s, r: s.r + 14 }, colors.neutral, 0.22, true)
    this.ring(s, colors.neutral, 0.08)
    this.labels.addChild(makeText('SCREENING', LABEL_STYLE, s.x, s.y - s.r - 58))
    const count = makeText('0', COUNT_STYLE, s.x, s.y - s.r - 32)
    this.labels.addChild(count)
    this.addHalo('screening', s, colors.neutral, 0.1, count)

    const f = layout.screenFail
    this.ring({ ...f, r: f.r + 10 }, colors.screenFail, 0.25, true)
    this.labels.addChild(makeText('SCREEN FAIL', LABEL_STYLE, f.x, f.y + f.r + 36))
    const failCount = makeText('0', COUNT_STYLE, f.x, f.y + f.r + 62)
    this.labels.addChild(failCount)
    this.addHalo('screenFail', f, colors.screenFail, 0.06, failCount)
  }

  private drawRandomization() {
    const r = layout.randomization
    const g = this.lines
    const size = 22
    g.moveTo(r.x, r.y - size)
      .lineTo(r.x + size, r.y)
      .lineTo(r.x, r.y + size)
      .lineTo(r.x - size, r.y)
      .closePath()
      .stroke({ width: 1.5, color: colors.ink, alpha: 0.5 })
    g.circle(r.x, r.y, 4).fill({ color: colors.ink, alpha: 0.9 })
    this.labels.addChild(makeText('RANDOMIZATION', LABEL_STYLE, r.x, r.y - 330))
    this.labels.addChild(makeText('1 : 1 : 1', SMALL_STYLE, r.x, r.y - 306))
    this.addHalo('randomization', { ...r, r: 60 }, colors.ink, 0.08, null)
  }

  private drawLanes() {
    const g = this.lines
    for (const lane of layout.lanes) {
      const color = colors.arms[lane.arm]
      const top = lane.y - lane.halfWidth - 10
      const h = (lane.halfWidth + 10) * 2
      g.roundRect(lane.x0 - 20, top, lane.x1 - lane.x0 + 40, h, h / 2).fill({
        color,
        alpha: 0.035,
      })
      g.moveTo(lane.x0, top).lineTo(lane.x1, top).stroke({ width: 1, color, alpha: 0.16 })
      g.moveTo(lane.x0, top + h)
        .lineTo(lane.x1, top + h)
        .stroke({ width: 1, color, alpha: 0.16 })

      // Feeder curve from the randomization node into the lane.
      const r = layout.randomization
      g.moveTo(r.x + 24, r.y)
        .bezierCurveTo(r.x + 110, r.y, lane.x0 - 110, lane.y, lane.x0 - 20, lane.y)
        .stroke({ width: 1.25, color, alpha: 0.28 })

      for (const week of STUDY.visitWeeks) {
        const x = visitX(lane, week)
        g.moveTo(x, top + 6)
          .lineTo(x, top + h - 6)
          .stroke({ width: 1.5, color, alpha: 0.32 })
        g.circle(x, top, 2.5).fill({ color, alpha: 0.9 })
        g.circle(x, top + h, 2.5).fill({ color, alpha: 0.9 })
      }

      const arm = ARMS.find((a) => a.id === lane.arm)
      const label = makeText(
        (arm?.label ?? lane.arm).toUpperCase(),
        { ...LABEL_STYLE, fill: color },
        lane.x0,
        top - 22,
        0,
      )
      this.labels.addChild(label)
      const count = makeText(
        '0',
        { ...COUNT_STYLE, fontSize: 18 },
        lane.x0 + label.width + 16,
        top - 22,
        0,
      )
      this.labels.addChild(count)
      this.addHalo(lane.arm, { x: (lane.x0 + lane.x1) / 2, y: lane.y, r: 120 }, color, 0, count)
    }

    const topLane = layout.lanes[0]
    for (const week of STUDY.visitWeeks) {
      const x = visitX(topLane, week)
      this.labels.addChild(makeText(`W${week}`, SMALL_STYLE, x, topLane.y - topLane.halfWidth - 72))
    }
  }

  private drawSinks() {
    const zone = layout.completedZone
    this.labels.addChild(
      makeText('COMPLETED', LABEL_STYLE, zone.x, layout.completed.placebo.y - 172),
    )
    const doneCount = makeText('0', COUNT_STYLE, zone.x, layout.completed.placebo.y - 146)
    this.labels.addChild(doneCount)
    for (const arm of ARMS) {
      const d = layout.completed[arm.id]
      const color = colors.arms[arm.id]
      this.ring({ ...d, r: d.r + 10 }, color, 0.22, true)
      this.addHalo('completed', d, color, 0.06, doneCount)
    }

    const pools = REASONS.map((r) => layout.discontinued[r.id])
    const left = pools[0].x - pools[0].r - 40
    const right = pools[pools.length - 1].x + pools[0].r + 40
    const y = pools[0].y
    this.lines
      .moveTo(left, y - pools[0].r - 46)
      .lineTo(right, y - pools[0].r - 46)
      .stroke({ width: 1, color: colors.reasons.adverse_event, alpha: 0.14 })
    this.labels.addChild(
      makeText(
        'DISCONTINUED',
        { ...LABEL_STYLE, fill: colors.reasons.adverse_event },
        left,
        y - pools[0].r - 66,
        0,
      ),
    )
    for (const reason of REASONS) {
      const d = layout.discontinued[reason.id]
      const color = colors.reasons[reason.id]
      this.ring({ ...d, r: d.r + 8 }, color, 0.24, true)
      this.labels.addChild(
        makeText(reason.label, { ...SMALL_STYLE, fill: colors.inkMuted }, d.x, d.y + d.r + 30),
      )
      const count = makeText('0', { ...COUNT_STYLE, fontSize: 18 }, d.x, d.y + d.r + 54)
      this.labels.addChild(count)
      this.addHalo(reason.id, d, color, 0.05, count)
    }
  }

  setCount(key: ZoneKey, n: number) {
    const z = this.zones.get(key)
    if (z?.count) z.count.text = n.toLocaleString('en-US')
  }

  /** 0..1 activity level drives a subtle halo pulse. */
  setActivity(key: ZoneKey, level: number) {
    const z = this.zones.get(key)
    if (!z) return
    for (const halo of z.halos) halo.alpha = z.baseHaloAlpha + level * 0.16
  }
}
