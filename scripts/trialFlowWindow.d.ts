/** Test handle exposed by src/scene/sceneApi.ts (used by smoke and bench scripts). */
interface Window {
  __trialFlow?: {
    screenPositionOf(id: number): { x: number; y: number } | null
    perf(): {
      fps: number
      frameMs: number
      tickMs: number
      worstMs: number
      particles: number
    } | null
  }
}
