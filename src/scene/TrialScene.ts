import gsap from 'gsap'
import {
  Container,
  Rectangle,
  type Application,
  type FederatedPointerEvent,
  type Ticker,
} from 'pixi.js'
import { AdvancedBloomFilter } from 'pixi-filters'
import { Viewport } from 'pixi-viewport'
import { buildFilterMask, computeEmphasis, isFilterActive } from '../core/filters'
import { computeFlowStats, createFlowStats, sum, type FlowStats } from '../core/flowStats'
import { WORLD } from '../core/layout'
import {
  STAGE,
  computeFrameIncremental,
  createFrameBuffers,
  type FrameBuffers,
} from '../core/particleModel'
import { getPatientTable, type PatientTable } from '../core/patientTable'
import { advanceWeek } from '../core/playback'
import { PerfMonitor, type PerfSnapshot } from '../core/perfMonitor'
import { SpatialGrid } from '../core/spatialGrid'
import { STUDY } from '../data/studyConfig'
import type { Patient } from '../data/types'
import { useAppStore, type AppState, type Quality } from '../store/appStore'
import { durations, easings } from '../theme'
import { CameraController } from './CameraController'
import { IntroDirector } from './IntroDirector'
import { ParticleLayer } from './ParticleLayer'
import { RibbonsLayer } from './RibbonsLayer'
import { SelectionLayer } from './SelectionLayer'
import { BurstLayer } from './BurstLayer'
import { Minimap } from './Minimap'
import { TrailLayer } from './TrailLayer'
import { Starfield } from './Starfield'
import { createGlowTexture, createHaloTexture, createRingTexture } from './textures'
import { ZonesLayer, type ZoneKey } from './ZonesLayer'

const ARM_KEYS: ZoneKey[] = ['placebo', 'low', 'high']
const REASON_KEYS: ZoneKey[] = [
  'adverse_event',
  'lack_of_efficacy',
  'withdrawal',
  'lost_to_follow_up',
]
/** Max ghost particles for motion trails (5 per travelling particle). */
const TRAIL_CAPACITY: Record<Quality, number> = { high: 6000, medium: 2500, low: 0 }
const TAU = Math.PI * 2
const SIN_STEPS = 1024
const SIN_MASK = SIN_STEPS - 1
const SIN = Float32Array.from({ length: SIN_STEPS }, (_, k) => Math.sin((k / SIN_STEPS) * TAU))
/** Pointer pick radius in screen pixels. */
const PICK_RADIUS_PX = 14

/**
 * Imperative Pixi scene. Owns every display object; reads app state from the zustand
 * store via getState()/subscribe so React never re-renders per frame.
 */
export class TrialScene {
  readonly viewport: Viewport
  readonly camera: CameraController
  private readonly app: Application
  private readonly starfield: Starfield
  private readonly zones: ZonesLayer
  private readonly ribbons = new RibbonsLayer()
  private readonly world = new Container()
  private readonly glowTexture = createGlowTexture()
  private readonly haloTexture = createHaloTexture()
  private readonly ringTexture = createRingTexture()
  private readonly selection: SelectionLayer
  private readonly grid = new SpatialGrid(
    { x: -400, y: -200, width: WORLD.width + 800, height: WORLD.height + 400 },
    24,
    0,
  )
  private readonly activity = new Map<ZoneKey, number>()
  private readonly unsubscribers: (() => void)[] = []

  private readonly particleGroup = new Container()
  private readonly bloom = new AdvancedBloomFilter({
    threshold: 0.3,
    bloomScale: 0.85,
    brightness: 0.95,
    blur: 6,
    quality: 5,
  })
  private readonly bursts: BurstLayer
  private readonly minimap: Minimap
  private frameCount = 0
  private ribbonWeek = -1
  private readonly perf = new PerfMonitor()
  private trails: TrailLayer | null = null
  private particles: ParticleLayer | null = null
  private table: PatientTable | null = null
  private frame: FrameBuffers | null = null
  private stats: FlowStats = createFlowStats()
  private prevStats: FlowStats = createFlowStats()
  private filterMask = new Uint8Array(0)
  /** Emphasis shown on screen = lerp(from, to, mix); GSAP tweens `mix` on every change. */
  private emphasis = new Float32Array(0)
  private emphasisFrom = new Float32Array(0)
  private emphasisTo = new Float32Array(0)
  private readonly emphasisMix = { value: 1 }
  private emphasisDirty = true
  private offsetX = new Float32Array(0)
  private offsetY = new Float32Array(0)
  private renderedWeek = -1
  private gridWeek = -1
  private time = 0
  private hovered = -1
  private intro: IntroDirector | null = null

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
    this.viewport.hitArea = new Rectangle(-1e5, -1e5, 2e5, 2e5)
    app.stage.addChild(this.viewport)
    this.viewport.addChild(this.world)
    this.camera = new CameraController(this.viewport)
    this.minimap = new Minimap(this.viewport, this.glowTexture)
    app.stage.addChild(this.minimap)
    this.placeMinimap(app.screen.width, app.screen.height)

    this.zones = new ZonesLayer(this.haloTexture)
    this.selection = new SelectionLayer(this.ringTexture)
    this.bursts = new BurstLayer(this.ringTexture, this.glowTexture)
    this.particleGroup.filters = [this.bloom]
    this.world.addChild(this.zones, this.ribbons, this.particleGroup, this.bursts, this.selection)
    this.camera.home()

    app.renderer.on('resize', this.onResize)
    app.ticker.add(this.onTick)
    this.viewport.on('pointermove', this.onPointerMove)
    this.viewport.on('pointerleave', this.onPointerLeave)
    this.viewport.on('clicked', this.onClicked)

    this.unsubscribers.push(useAppStore.subscribe(this.onStoreChange))
    this.setPatients(useAppStore.getState().patients)
    if (useAppStore.getState().intro) {
      this.intro = new IntroDirector(
        this.world,
        [this.zones, this.ribbons],
        this.starfield,
        this.camera,
      )
    }
  }

  // ---- store -------------------------------------------------------------

  private onStoreChange = (s: AppState, prev: AppState) => {
    if (s.patients !== prev.patients) this.setPatients(s.patients)
    if (s.filters !== prev.filters || s.selectedId !== prev.selectedId) this.emphasisDirty = true
    if (s.selectedId !== prev.selectedId) this.onSelectionChange(s.selectedId)
    if (s.quality !== prev.quality) this.applyQuality(s.quality)
    if (!s.intro && prev.intro && this.intro) {
      this.intro.finish()
      this.intro = null
    }
  }

  private setPatients(patients: Patient[]) {
    if (this.particles) {
      this.particleGroup.removeChildren()
      this.particles.destroy()
      this.trails?.destroy()
      this.particles = null
      this.trails = null
    }
    this.table = null
    this.frame = null
    if (patients.length === 0) return
    const table = getPatientTable(patients)
    const n = table.count
    this.table = table
    this.frame = createFrameBuffers(n)
    this.filterMask = new Uint8Array(n).fill(1)
    this.emphasis = new Float32Array(n).fill(1)
    this.emphasisFrom = new Float32Array(n).fill(1)
    this.emphasisTo = new Float32Array(n).fill(1)
    this.offsetX = new Float32Array(n)
    this.offsetY = new Float32Array(n)
    this.particles = new ParticleLayer(this.glowTexture, n)
    this.trails = new TrailLayer(this.glowTexture, TRAIL_CAPACITY[useAppStore.getState().quality])
    // Trails and particles share one bloom pass.
    this.particleGroup.addChild(this.trails.container, this.particles.container)
    this.applyQuality(useAppStore.getState().quality)
    this.minimap.setPopulation(n)
    this.renderedWeek = -1
    this.gridWeek = -1
    this.emphasisDirty = true
  }

  // ---- frame loop --------------------------------------------------------

  private onTick = (ticker: Ticker) => {
    const t0 = performance.now()
    this.step(ticker)
    this.perf.record(ticker.deltaMS, performance.now() - t0)
    const state = useAppStore.getState()
    if (state.autoQuality && !state.intro && document.visibilityState === 'visible') {
      const next = this.perf.autoDegrade(state.quality, ticker.deltaMS / 1000)
      if (next) state.setQuality(next, true)
    }
  }

  perfSnapshot(): PerfSnapshot & { particles: number } {
    return { ...this.perf.snapshot(), particles: this.table?.count ?? 0 }
  }

  /** High: full bloom + trails + starfield. Medium: lighter bloom, fewer trails. Low: no bloom/trails/stars. */
  private applyQuality(q: Quality) {
    this.particleGroup.filters = q === 'low' ? [] : [this.bloom]
    this.bloom.quality = q === 'high' ? 5 : 3
    this.bloom.blur = q === 'high' ? 6 : 4
    this.trails?.setCapacity(TRAIL_CAPACITY[q])
    this.starfield.visible = q !== 'low'
    this.bursts.visible = q !== 'low'
    this.perf.reset()
  }

  private step(ticker: Ticker) {
    const dt = Math.min(ticker.deltaMS, 100) / 1000
    this.time += dt
    const vp = this.viewport
    if (!useAppStore.getState().reducedMotion) {
      this.starfield.update(this.time, vp.left * vp.scale.x, vp.top * vp.scale.y)
    }
    this.advancePlayback(dt)

    const { table, frame, particles } = this
    if (!table || !frame || !particles) return
    const state = useAppStore.getState()

    const prevWeek = this.renderedWeek
    if (state.week !== this.renderedWeek) {
      computeFrameIncremental(table, this.renderedWeek, state.week, frame)
      this.bursts.detect(table, frame, prevWeek, state.week)
      this.updateStats(state.week - this.renderedWeek)
      // Status filters depend on the stage at this week.
      if (state.filters.statuses.length > 0) this.emphasisDirty = true
      this.renderedWeek = state.week
    }
    if (this.emphasisDirty) this.retargetEmphasis(state)
    this.blendEmphasis()
    this.decayActivity(dt)
    this.updateDrift(state.reducedMotion)
    particles.apply(frame, this.emphasis, this.offsetX, this.offsetY, this.hovered)
    const weekDelta = prevWeek < 0 ? 0 : state.week - prevWeek
    if (this.trails && !state.reducedMotion)
      this.trails.update(table, frame, state.week, weekDelta, dt, this.emphasis)
    this.bursts.enabled = !state.reducedMotion
    this.bursts.update(dt)
    this.updateSelection(state.selectedId)
    if (this.minimap.visible && this.frameCount++ % 3 === 0) this.minimap.update(frame)
  }

  /** Bottom-left, beside the timeline (CSS reserves the gutter at the same breakpoint). */
  private placeMinimap(w: number, h: number) {
    const { height } = this.minimap.size
    this.minimap.visible = w > 1100 && h >= 700
    this.minimap.position.set(24, h - 24 - height)
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
  private updateDrift(reduced: boolean) {
    const { table, frame, offsetX, offsetY } = this
    if (!table || !frame) return
    if (reduced) {
      offsetX.fill(0)
      offsetY.fill(0)
      return
    }
    // Sine lookup table instead of 30k Math.sin/cos calls per frame.
    const ax = (this.time * 0.7 * SIN_STEPS) / TAU
    const ay = (this.time * 0.53 * SIN_STEPS) / TAU
    for (let i = 0; i < table.count; i++) {
      const amp = frame.moving[i] ? 0 : frame.stage[i] === STAGE.treatment ? 1.6 : 3.2
      if (amp === 0) {
        offsetX[i] = 0
        offsetY[i] = 0
        continue
      }
      const phase = table.r3[i] * SIN_STEPS
      offsetX[i] = SIN[(ax + phase) & SIN_MASK] * amp
      // cos(x) = sin(x + π/2)
      offsetY[i] = SIN[(ay + phase * 1.3 + SIN_STEPS / 4) & SIN_MASK] * amp
    }
  }

  // ---- emphasis (filters + selection) -------------------------------------

  private retargetEmphasis(state: AppState) {
    const { table, frame } = this
    if (!table || !frame) return
    this.emphasisDirty = false
    buildFilterMask(table, frame.stage, state.filters, this.filterMask)
    const active = isFilterActive(state.filters, STUDY.ageRange.min, STUDY.ageRange.max)
    this.emphasisFrom.set(this.emphasis)
    computeEmphasis(this.filterMask, active, state.selectedId, this.emphasisTo)
    gsap.killTweensOf(this.emphasisMix)
    this.emphasisMix.value = 0
    if (state.reducedMotion) this.emphasisMix.value = 1
    else gsap.to(this.emphasisMix, { value: 1, duration: durations.slow, ease: easings.gsapOut })
    this.gridWeek = -1
  }

  private blendEmphasis() {
    const m = this.emphasisMix.value
    const { emphasis, emphasisFrom, emphasisTo } = this
    if (m >= 1) {
      emphasis.set(emphasisTo)
      return
    }
    for (let i = 0; i < emphasis.length; i++)
      emphasis[i] = emphasisFrom[i] + (emphasisTo[i] - emphasisFrom[i]) * m
  }

  // ---- picking -----------------------------------------------------------

  private ensureGrid() {
    const { table, frame } = this
    if (!table || !frame || this.gridWeek === this.renderedWeek) return
    const mask = this.filterMask
    // Hidden and filtered-out particles are not pickable.
    this.grid.rebuild(frame.x, frame.y, (i) => frame.stage[i] !== STAGE.hidden && mask[i] === 1)
    this.gridWeek = this.renderedWeek
  }

  private pick(globalX: number, globalY: number): number {
    if (!this.frame) return -1
    this.ensureGrid()
    const p = this.viewport.toWorld(globalX, globalY)
    const radius = PICK_RADIUS_PX / this.viewport.scale.x
    return this.grid.nearest(p.x, p.y, radius, this.frame.x, this.frame.y)
  }

  private onPointerMove = (e: FederatedPointerEvent) => {
    if (e.pointerType === 'touch') return
    const hit = this.pick(e.global.x, e.global.y)
    if (hit === this.hovered) return
    this.hovered = hit
    this.app.canvas.style.cursor = hit >= 0 ? 'pointer' : ''
    useAppStore.getState().hover(hit >= 0 ? hit : null)
  }

  private onPointerLeave = () => {
    this.hovered = -1
    this.app.canvas.style.cursor = ''
    useAppStore.getState().hover(null)
  }

  private onClicked = (e: { screen: { x: number; y: number } }) => {
    const hit = this.pick(e.screen.x, e.screen.y)
    useAppStore.getState().select(hit >= 0 ? hit : null)
  }

  private onSelectionChange(id: number | null) {
    const frame = this.frame
    if (id === null || !frame) return
    const scale = Math.max(this.viewport.scale.x, this.camera.fitScale * 2.6)
    // Offset so the particle isn't hidden behind the patient card on wide screens.
    const offset = this.viewport.screenWidth > 900 ? 180 / scale : 0
    if (useAppStore.getState().reducedMotion)
      this.camera.jumpTo(frame.x[id] + offset, frame.y[id], scale)
    else this.camera.flyTo(frame.x[id] + offset, frame.y[id], scale)
  }

  private updateSelection(selectedId: number | null) {
    const frame = this.frame
    if (!frame) return
    const h = this.hovered
    const showHover = h >= 0 && h !== selectedId
    const showSel = selectedId !== null && frame.stage[selectedId] !== STAGE.hidden
    const id = selectedId ?? 0
    this.selection.update(
      this.time,
      showHover,
      showHover ? frame.x[h] + this.offsetX[h] : 0,
      showHover ? frame.y[h] + this.offsetY[h] : 0,
      showSel,
      showSel ? frame.x[id] + this.offsetX[id] : 0,
      showSel ? frame.y[id] + this.offsetY[id] : 0,
      showSel ? frame.tint[id] : 0,
    )
  }

  screenPositionOf(id: number): { x: number; y: number } | null {
    const frame = this.frame
    if (!frame || id < 0 || id >= frame.x.length || frame.stage[id] === STAGE.hidden) return null
    const p = this.viewport.toScreen(frame.x[id], frame.y[id])
    return { x: p.x, y: p.y }
  }

  // ---- stats + zone pulses ----------------------------------------------

  private updateStats(deltaWeeks: number) {
    const { table, frame } = this
    if (!table || !frame) return
    const recycled = this.prevStats
    this.prevStats = this.stats
    this.stats = computeFlowStats(table, frame, recycled)
    const s = this.stats
    const p = this.prevStats

    const reasonTotal = (st: FlowStats, r: number) =>
      st.discontinued[0][r] + st.discontinued[1][r] + st.discontinued[2][r]
    this.zones.setCount('screening', s.inScreening)
    this.zones.setCount('screenFail', s.screenFailed)
    this.zones.setCount('completed', sum(s.completed))
    ARM_KEYS.forEach((k, i) => this.zones.setCount(k, s.active[i]))
    REASON_KEYS.forEach((k, r) => this.zones.setCount(k, reasonTotal(s, r)))
    // Ribbon geometry is rebuilt at most every 0.1 week while playing (it grows slowly);
    // scrubbing redraws immediately.
    const week = useAppStore.getState().week
    if (!useAppStore.getState().playing || Math.abs(week - this.ribbonWeek) >= 0.1) {
      this.ribbons.draw(s, table.count)
      this.ribbonWeek = week
    }

    // Zone pulses: inflow rate (relative to population) while time moves forward.
    if (deltaWeeks > 0 && deltaWeeks < 2) {
      const rate = (now: number, before: number) => (now - before) / deltaWeeks / table.count
      this.bump('screening', rate(s.screened, p.screened) * 12)
      this.bump('screenFail', rate(s.screenFailed, p.screenFailed) * 40)
      this.bump('randomization', rate(sum(s.randomized), sum(p.randomized)) * 14)
      ARM_KEYS.forEach((k, a) => this.bump(k, rate(s.randomized[a], p.randomized[a]) * 40))
      this.bump('completed', rate(sum(s.completed), sum(p.completed)) * 10)
      REASON_KEYS.forEach((k, r) => this.bump(k, rate(reasonTotal(s, r), reasonTotal(p, r)) * 160))
    }
  }

  private bump(key: ZoneKey, level: number) {
    const current = this.activity.get(key) ?? 0
    this.activity.set(key, Math.min(1, Math.max(current, level)))
  }

  private decayActivity(dt: number) {
    // forEach avoids allocating [key, value] entry arrays every frame.
    this.activity.forEach((level, key, map) => {
      const next = level * Math.exp(-dt * 2.2)
      map.set(key, next)
      this.zones.setActivity(key, next)
    })
  }

  // ---- lifecycle ---------------------------------------------------------

  private onResize = (w: number, h: number) => {
    this.viewport.resize(w, h, WORLD.width, WORLD.height)
    this.starfield.resize(w, h)
    this.placeMinimap(w, h)
    this.camera.home()
  }

  destroy() {
    this.unsubscribers.forEach((u) => u())
    this.intro?.finish()
    gsap.killTweensOf(this.emphasisMix)
    this.camera.destroy()
    this.app.ticker.remove(this.onTick)
    this.app.renderer.off('resize', this.onResize)
    this.particles?.destroy()
    this.trails?.destroy()
    this.viewport.destroy({ children: true })
    this.starfield.destroy({ children: true })
    this.glowTexture.destroy(true)
    this.haloTexture.destroy(true)
    this.ringTexture.destroy(true)
  }
}
