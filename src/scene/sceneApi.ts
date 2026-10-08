import type { TrialScene } from './TrialScene'

/** Narrow handle so UI (keyboard shortcuts, buttons) can drive the camera without owning the scene. */
let active: TrialScene | null = null

export function setActiveScene(scene: TrialScene | null) {
  active = scene
}

export const sceneApi = {
  zoomIn: () => active?.camera.zoomBy(1.4),
  zoomOut: () => active?.camera.zoomBy(1 / 1.4),
  resetView: () => active?.camera.home(true),
  /** Screen position of a particle (used by the smoke test). */
  screenPositionOf: (id: number) => active?.screenPositionOf(id) ?? null,
  perf: () => active?.perfSnapshot() ?? null,
}

declare global {
  interface Window {
    __trialFlow?: typeof sceneApi
  }
}
window.__trialFlow = sceneApi
