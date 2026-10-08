import { Container, type Application, type Ticker } from 'pixi.js'
import { AdvancedBloomFilter } from 'pixi-filters'
import { Viewport } from 'pixi-viewport'
import { WORLD } from '../core/layout'
import { computeFlowStats, createFlowStats, sum, type FlowStats } from '../core/flowStats'
import { STAGE, computeFrame, createFrameBuffers, type FrameBuffers } from '../core/particleModel'
import { advanceWeek } from '../core/playback'
import { buildPatientTable, type PatientTable } from '../core/patientTable'
import type { Patient } from '../data/types'
import { useAppStore } from '../store/appStore'
import { ParticleLayer } from './ParticleLayer'
import { RibbonsLayer } from './RibbonsLayer'
import { Starfield } from './Starfield'
import { createGlowTexture, createHaloTexture } from './textures'
import { ZonesLayer, type ZoneKey } from './ZonesLayer'

const ARM_KEYS: ZoneKey[] = ['placebo', 'low', 'high']
const REASON_KEYS: ZoneKey[] = [
  'adverse_event',
  'lack_of_efficacy',
  'withdrawal',
  'lost_to_follow_up',
]

/**
 * Imperative Pixi scene. Owns every display object; reads app state from the zustand
 * store via getState()/subscribe so React never re-renders per frame.
 */
export class TrialScene {
  readonly viewport: Viewport
  private readonly starfield: Starfield
  private readonly zones: ZonesLayer
  private readonly ribbons = new RibbonsLayer()
  private stats: FlowStats = createFlowStats()
  private prevStats: FlowStats = createFlowStats()
  private readonly activity = new Map<ZoneKey, number>()
  private readonly world = new Container()
  private readonly glowTexture = createGlowTexture()
  private readonly haloTexture = createHaloTexture()
  private particles: ParticleLayer | null = null
  private table: PatientTable | null = null
  private frame: FrameBuffers | null = null
  private emphasis = new Float32Array(0)
  private offsetX = new Float32Array(0)
  private offsetY = new Float32Array(0)
  private renderedWeek = -1
  private time = 0
  private readonly unsubscribers: (() => void)[] = []

  private readonly app: Application

  constructor(app: Application) {
    this.app = app
    this.starfield = new Starfield(this.glowTexture)
    this.starfield.resize(app.screen.width, app.screen.height)
    app.stage.addChild(this.starfield)

    this.viewport = new Viewport({
      screenWidth: app.screen.width,
      screenHeight: app.screen.height,
      worldWidth: WORLD.width,
      worldHeight: WORLD.height,
      events: app.renderer.events,
    })
    app.stage.addChild(this.viewport)
    this.viewport.addChild(this.world)

    this.zones = new ZonesLayer(this.haloTexture)
    this.world.addChild(this.zones)
    this.world.addChild(this.ribbons)
    this.fitToScreen()

    app.renderer.on('resize', this.onResize)
    app.ticker.add(this.onTick)

    const store = useAppStore
    this.unsubscribers.push(
      store.subscribe((s, prev) => {
        if (s.patients !== prev.patients) this.setPatients(s.patients)
      }),
    )
    this.setPatients(store.getState().patients)
  }

  private setPatients(patients: Patient[]) {
    if (this.particles) {
      this.world.removeChild(this.particles.container)
      this.particles.destroy()
      this.particles = null
    }
    if (patients.length === 0) return
    const table = buildPatientTable(patients)
    this.table = table
    this.frame = createFrameBuffers(table.count)
    this.emphasis = new Float32Array(table.count).fill(1)
    this.offsetX = new Float32Array(table.count)
    this.offsetY = new Float32Array(table.count)
    this.particles = new ParticleLayer(this.glowTexture, table.count)
    this.particles.container.filters = [
      new AdvancedBloomFilter({
        threshold: 0.18,
        bloomScale: 1.1,
        brightness: 1,
        blur: 7,
        quality: 5,
      }),
    ]
    this.world.addChild(this.particles.container)
    this.renderedWeek = -1
  }

  /**
   * Default camera: whole study on landscape screens (leaving room for the header and
   * timeline chrome), lanes-first framing on portrait phones.
   */
  fitToScreen() {
    const vp = this.viewport
    const { screenWidth: w, screenHeight: h } = vp
    if (w / h < 0.9) {
      vp.setZoom((h * 0.6) / WORLD.height, true)
      vp.moveCenter(1180, WORLD.height / 2 + 30)
      return
    }
    const insetTop = 40
    const insetBottom = 140
    const scale = Math.min(
      w / (WORLD.width + 200),
      (h - insetTop - insetBottom) / (WORLD.height + 40),
    )
    vp.setZoom(scale, true)
    const shift = (insetBottom - insetTop) / 2 / scale
    vp.moveCenter(WORLD.width / 2 - 40, WORLD.height / 2 + shift)
  }

  private onResize = (w: number, h: number) => {
    this.viewport.resize(w, h, WORLD.width, WORLD.height)
    this.starfield.resize(w, h)
    this.fitToScreen()
  }

  private onTick = (ticker: Ticker) => {
    const dt = Math.min(ticker.deltaMS, 100) / 1000
    this.time += dt
    this.starfield.update(
      this.time,
      this.viewport.left * this.viewport.scale.x,
      this.viewport.top * this.viewport.scale.y,
    )
    this.advancePlayback(dt)
    const { table, frame, particles } = this
    if (!table || !frame || !particles) return

    const week = useAppStore.getState().week
    if (week !== this.renderedWeek) {
      computeFrame(table, week, frame)
      this.updateStats(week - this.renderedWeek)
      this.renderedWeek = week
    }
    this.decayActivity(dt)
    this.updateDrift()
    particles.apply(frame, this.emphasis, this.offsetX, this.offsetY)
  }

  /** The playback clock lives in the Pixi ticker, not in React. */
  private advancePlayback(dt: number) {
    const state = useAppStore.getState()
    if (!state.playing) return
    const step = advanceWeek(state.week, dt, state.speed)
    state.setWeek(step.week)
    if (step.ended) state.setPlaying(false)
  }

  /** Gentle swarm drift for particles resting in a zone. */
  private updateDrift() {
    const { table, frame } = this
    if (!table || !frame) return
    const t = this.time
    for (let i = 0; i < table.count; i++) {
      const phase = table.r3[i] * 6.283
      const amp = frame.moving[i] ? 0 : frame.stage[i] === STAGE.treatment ? 1.6 : 3.2
      this.offsetX[i] = Math.sin(t * 0.7 + phase) * amp
      this.offsetY[i] = Math.cos(t * 0.53 + phase * 1.3) * amp
    }
  }

  private updateStats(deltaWeeks: number) {
    const { table, frame } = this
    if (!table || !frame) return
    const prev = this.prevStats
    this.prevStats = this.stats
    this.stats = computeFlowStats(table, frame, prev)
    const s = this.stats
    const p = this.prevStats

    const reasonTotals = [0, 1, 2, 3].map(
      (r) => s.discontinued[0][r] + s.discontinued[1][r] + s.discontinued[2][r],
    )
    this.zones.setCount('screening', s.inScreening)
    this.zones.setCount('screenFail', s.screenFailed)
    this.zones.setCount('completed', sum(s.completed))
    ARM_KEYS.forEach((k, i) => this.zones.setCount(k, s.active[i]))
    REASON_KEYS.forEach((k, i) => this.zones.setCount(k, reasonTotals[i]))
    this.ribbons.draw(s, table.count)

    // Zone pulses: inflow rate (patients per week, relative to population) while playing forward.
    if (deltaWeeks > 0 && deltaWeeks < 2) {
      const rate = (now: number, before: number) => (now - before) / deltaWeeks / table.count
      this.bump('screening', rate(s.screened, p.screened) * 12)
      this.bump('screenFail', rate(s.screenFailed, p.screenFailed) * 40)
      this.bump('randomization', rate(sum(s.randomized), sum(p.randomized)) * 14)
      ARM_KEYS.forEach((k, a) => this.bump(k, rate(s.randomized[a], p.randomized[a]) * 40))
      this.bump('completed', rate(sum(s.completed), sum(p.completed)) * 10)
      REASON_KEYS.forEach((k, r) => {
        const before = p.discontinued[0][r] + p.discontinued[1][r] + p.discontinued[2][r]
        this.bump(k, rate(reasonTotals[r], before) * 160)
      })
    }
  }

  private bump(key: ZoneKey, level: number) {
    const current = this.activity.get(key) ?? 0
    this.activity.set(key, Math.min(1, Math.max(current, level)))
  }

  private decayActivity(dt: number) {
    for (const [key, level] of this.activity) {
      const next = level * Math.exp(-dt * 2.2)
      this.activity.set(key, next)
      this.zones.setActivity(key, next)
    }
  }

  destroy() {
    this.unsubscribers.forEach((u) => u())
    this.app.ticker.remove(this.onTick)
    this.app.renderer.off('resize', this.onResize)
    this.particles?.destroy()
    this.ribbons.destroy()
    this.viewport.destroy({ children: true })
    this.starfield.destroy({ children: true })
    this.glowTexture.destroy(true)
    this.haloTexture.destroy(true)
  }
}
