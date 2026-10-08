import { Container, type Application, type Ticker } from 'pixi.js'
import { AdvancedBloomFilter } from 'pixi-filters'
import { Viewport } from 'pixi-viewport'
import { WORLD } from '../core/layout'
import { STAGE, computeFrame, createFrameBuffers, type FrameBuffers } from '../core/particleModel'
import { buildPatientTable, type PatientTable } from '../core/patientTable'
import type { Patient } from '../data/types'
import { useAppStore } from '../store/appStore'
import { ParticleLayer } from './ParticleLayer'
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

  /** Default camera: whole study on landscape screens, lanes-first framing on portrait phones. */
  fitToScreen() {
    const vp = this.viewport
    const { screenWidth: w, screenHeight: h } = vp
    if (w / h < 0.9) {
      vp.setZoom((h * 0.62) / WORLD.height, true)
      vp.moveCenter(1180, WORLD.height / 2 + 30)
      return
    }
    vp.fit(true, WORLD.width + 260, WORLD.height + 120)
    vp.moveCenter(WORLD.width / 2 - 40, WORLD.height / 2 + 20)
  }

  private onResize = (w: number, h: number) => {
    this.viewport.resize(w, h, WORLD.width, WORLD.height)
    this.starfield.resize(w, h)
    this.fitToScreen()
  }

  private onTick = (ticker: Ticker) => {
    this.time += ticker.deltaMS / 1000
    this.starfield.update(
      this.time,
      this.viewport.left * this.viewport.scale.x,
      this.viewport.top * this.viewport.scale.y,
    )
    const { table, frame, particles } = this
    if (!table || !frame || !particles) return

    const week = useAppStore.getState().week
    if (week !== this.renderedWeek) {
      computeFrame(table, week, frame)
      this.updateCounts(frame)
      this.renderedWeek = week
    }
    this.updateDrift()
    particles.apply(frame, this.emphasis, this.offsetX, this.offsetY)
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

  private updateCounts(frame: FrameBuffers) {
    const table = this.table
    if (!table) return
    let screening = 0
    let failed = 0
    let completed = 0
    const arms = [0, 0, 0]
    const reasons = [0, 0, 0, 0]
    for (let i = 0; i < table.count; i++) {
      switch (frame.stage[i]) {
        case STAGE.screening:
          screening++
          break
        case STAGE.screenFailed:
          failed++
          break
        case STAGE.treatment:
          arms[table.arm[i]]++
          break
        case STAGE.completed:
          completed++
          break
        case STAGE.discontinued:
          reasons[table.outcome[i] - 1]++
          break
      }
    }
    this.zones.setCount('screening', screening)
    this.zones.setCount('screenFail', failed)
    this.zones.setCount('completed', completed)
    ARM_KEYS.forEach((k, i) => this.zones.setCount(k, arms[i]))
    REASON_KEYS.forEach((k, i) => this.zones.setCount(k, reasons[i]))
  }

  destroy() {
    this.unsubscribers.forEach((u) => u())
    this.app.ticker.remove(this.onTick)
    this.app.renderer.off('resize', this.onResize)
    this.particles?.destroy()
    this.viewport.destroy({ children: true })
    this.starfield.destroy({ children: true })
    this.glowTexture.destroy(true)
    this.haloTexture.destroy(true)
  }
}
