import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { STUDY } from '../data/studyConfig'
import { sceneApi } from '../scene/sceneApi'
import { useAppStore, type Quality } from '../store/appStore'
import { durations, easings } from '../theme'
import { fmtInt } from './format'
import glass from './glass.module.css'
import styles from './PerfOverlay.module.css'

const QUALITIES: Quality[] = ['high', 'medium', 'low']
const POPULATIONS = [STUDY.defaultPatientCount, STUDY.maxPatientCount]

type Snapshot = NonNullable<ReturnType<typeof sceneApi.perf>>

/** Hidden diagnostics panel (toggle with F): FPS, frame/CPU time, particle count, quality. */
export function PerfOverlay() {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const quality = useAppStore((s) => s.quality)
  const auto = useAppStore((s) => s.autoQuality)
  const setQuality = useAppStore((s) => s.setQuality)

  useEffect(() => {
    const id = window.setInterval(() => setSnap(sceneApi.perf()), 250)
    return () => window.clearInterval(id)
  }, [])

  const setPopulation = (n: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('n', String(n))
    url.searchParams.set('nointro', '')
    window.location.assign(url.toString())
  }

  const fps = snap?.fps ?? 0
  return (
    <motion.div
      className={`${glass.glass} ${styles.panel}`}
      role="status"
      aria-label="Performance"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: durations.base, ease: easings.out }}
    >
      <div className={styles.row}>
        <span className={styles.fps} data-level={fps >= 55 ? 'good' : fps >= 45 ? 'ok' : 'bad'}>
          <span className="num">{fps.toFixed(0)}</span> fps
        </span>
        <span className={styles.hint}>F to hide</span>
      </div>
      <dl className={styles.stats}>
        <dt>Frame</dt>
        <dd className="num">{snap?.frameMs.toFixed(1)} ms</dd>
        <dt>Scene CPU</dt>
        <dd className="num">{snap?.tickMs.toFixed(2)} ms</dd>
        <dt>Worst / 1 s</dt>
        <dd className="num">{snap?.worstMs.toFixed(1)} ms</dd>
        <dt>Particles</dt>
        <dd className="num">{fmtInt(snap?.particles ?? 0)}</dd>
      </dl>
      <div className={styles.label}>
        Quality {auto && <span className={styles.hint}>· auto</span>}
      </div>
      <div className={styles.seg}>
        {QUALITIES.map((q) => (
          <button key={q} type="button" aria-pressed={quality === q} onClick={() => setQuality(q)}>
            {q}
          </button>
        ))}
      </div>
      <div className={styles.label}>Population</div>
      <div className={styles.seg}>
        {POPULATIONS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={snap?.particles === n}
            onClick={() => setPopulation(n)}
          >
            {fmtInt(n)}
          </button>
        ))}
      </div>
    </motion.div>
  )
}
