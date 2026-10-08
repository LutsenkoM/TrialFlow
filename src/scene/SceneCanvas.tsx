import { Application, extend, useApplication } from '@pixi/react'
import { Container } from 'pixi.js'
import { useEffect, useRef } from 'react'
import { TrialScene } from './TrialScene'
import styles from './SceneCanvas.module.css'

extend({ Container })

function loadSceneFonts() {
  return Promise.all([
    document.fonts.load('600 16px "Inter Variable"'),
    document.fonts.load('500 16px "JetBrains Mono Variable"'),
  ]).catch(() => undefined)
}

/** Mounts the imperative TrialScene once the Pixi application is ready. */
function SceneBridge() {
  const { app, isInitialised } = useApplication()
  useEffect(() => {
    if (!isInitialised) return
    let scene: TrialScene | null = null
    let cancelled = false
    // Labels use web fonts; load them explicitly so Pixi measures text with the right metrics.
    void loadSceneFonts().then(() => {
      if (!cancelled) scene = new TrialScene(app)
    })
    return () => {
      cancelled = true
      scene?.destroy()
    }
  }, [app, isInitialised])
  return null
}

export function SceneCanvas() {
  const hostRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={hostRef} className={styles.host}>
      <div className={styles.mesh} aria-hidden />
      <div className={styles.grain} aria-hidden />
      <Application
        resizeTo={hostRef}
        backgroundAlpha={0}
        antialias
        autoDensity
        resolution={Math.min(window.devicePixelRatio, 2)}
        preference="webgl"
        className={styles.canvas}
      >
        <SceneBridge />
      </Application>
    </div>
  )
}
