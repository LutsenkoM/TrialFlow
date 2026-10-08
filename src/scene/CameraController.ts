import gsap from 'gsap'
import type { Viewport } from 'pixi-viewport'
import { WORLD } from '../core/layout'
import { durations, easings } from '../theme'

/** Default framing, zoom clamps and GSAP-driven camera flights for the pixi-viewport. */
export class CameraController {
  private readonly vp: Viewport
  private tween: gsap.core.Tween | null = null
  /** Scale at which the default view fits; zoom clamps are relative to it. */
  fitScale = 1

  constructor(vp: Viewport) {
    this.vp = vp
    vp.drag({ clampWheel: false }).pinch().wheel({ smooth: 6 }).decelerate({ friction: 0.92 })
    // Any manual camera input cancels an in-flight animation.
    vp.on('drag-start', this.cancel)
    vp.on('pinch-start', this.cancel)
    vp.on('wheel-start', this.cancel)
  }

  private cancel = () => {
    this.tween?.kill()
    this.tween = null
  }

  private applyClamps() {
    const vp = this.vp
    vp.clampZoom({ minScale: this.fitScale * 0.5, maxScale: Math.max(this.fitScale * 12, 3) })
    // Generous bounds: the home view is deliberately off-centre (UI chrome), so the clamp
    // must never "underflow-centre" it.
    vp.clamp({
      left: -WORLD.width,
      right: WORLD.width * 2,
      top: -WORLD.height,
      bottom: WORLD.height * 2,
      underflow: 'none',
    })
  }

  /** Whole study on landscape screens (leaving room for the chrome), lanes-first on portrait. */
  computeHome(): { x: number; y: number; scale: number } {
    const { screenWidth: w, screenHeight: h } = this.vp
    if (w / h < 0.9) {
      return { x: 1180, y: WORLD.height / 2 + 30, scale: (h * 0.6) / WORLD.height }
    }
    // Screen space taken by UI chrome (header/KPIs, insights panel, timeline).
    const wide = w > 1100
    const inset = { top: wide ? 150 : 210, bottom: 130, left: 16, right: wide ? 390 : 16 }
    const availW = w - inset.left - inset.right
    const availH = h - inset.top - inset.bottom
    const scale = Math.min(availW / (WORLD.width + 80), availH / (WORLD.height + 20))
    // Shift the world centre so it lands in the middle of the free area.
    const dx = (inset.right - inset.left) / 2 / scale
    const dy = (inset.bottom - inset.top) / 2 / scale
    return { x: WORLD.width / 2 - 70 + dx, y: WORLD.height / 2 + dy, scale }
  }

  home(animate = false) {
    const target = this.computeHome()
    this.fitScale = target.scale
    this.vp.plugins.remove('clamp')
    this.vp.plugins.remove('clamp-zoom')
    if (animate) this.flyTo(target.x, target.y, target.scale, durations.scene)
    else {
      this.cancel()
      this.vp.setZoom(target.scale, true)
      this.vp.moveCenter(target.x, target.y)
    }
    this.applyClamps()
  }

  flyTo(x: number, y: number, scale: number, duration: number = durations.scene) {
    this.cancel()
    const vp = this.vp
    const state = { x: vp.center.x, y: vp.center.y, scale: vp.scale.x }
    this.tween = gsap.to(state, {
      x,
      y,
      scale,
      duration,
      ease: easings.gsapInOut,
      onUpdate: () => {
        vp.setZoom(state.scale, true)
        vp.moveCenter(state.x, state.y)
      },
    })
  }

  zoomBy(factor: number) {
    const vp = this.vp
    const target = Math.min(Math.max(vp.scale.x * factor, this.fitScale * 0.5), this.fitScale * 12)
    this.flyTo(vp.center.x, vp.center.y, target, durations.base)
  }

  destroy() {
    this.cancel()
  }
}
