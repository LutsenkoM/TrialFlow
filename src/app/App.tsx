import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useState } from 'react'
import { SceneCanvas } from '../scene/SceneCanvas'
import { useAppStore } from '../store/appStore'
import { durations, easings } from '../theme'
import { DebugPanel } from '../ui/DebugPanel'
import { FiltersPanel } from '../ui/FiltersPanel'
import { Header } from '../ui/Header'
import { HoverTooltip } from '../ui/HoverTooltip'
import { InsightsPanel } from '../ui/InsightsPanel'
import { IntroOverlay } from '../ui/IntroOverlay'
import { KpiStrip } from '../ui/KpiStrip'
import { MobileSheet } from '../ui/MobileSheet'
import { PatientCard } from '../ui/PatientCard'
import { PerfOverlay } from '../ui/PerfOverlay'
import { Timeline } from '../ui/Timeline'
import { useInsights } from '../ui/useInsights'
import { useKeyboardShortcuts } from '../ui/useKeyboardShortcuts'
import { MOBILE_QUERY, useMediaQuery } from '../ui/useMediaQuery'
import { ZoomControls } from '../ui/ZoomControls'
import styles from './App.module.css'
import { readParams, useBootSequence, useReducedMotionSync } from './useBootSequence'

export function App() {
  const hasSelection = useAppStore((s) => s.selectedId !== null)
  const patientCount = useAppStore((s) => s.patients.length)
  const [{ debug }] = useState(readParams)
  const [showStats, setShowStats] = useState(() =>
    new URLSearchParams(window.location.search).has('stats'),
  )
  const toggleStats = useCallback(() => setShowStats((v) => !v), [])
  const { ready, showIntro, skip } = useBootSequence()
  const insights = useInsights()
  useReducedMotionSync()
  useKeyboardShortcuts(toggleStats)
  const chrome = ready && !showIntro

  return (
    <div className={styles.shell}>
      <SceneCanvas />
      <AnimatePresence>
        {chrome && <Chrome key="chrome" insights={insights} hasSelection={hasSelection} />}
      </AnimatePresence>
      <AnimatePresence>
        {showIntro && (
          <IntroOverlay key="intro" ready={ready} patientCount={patientCount} onSkip={skip} />
        )}
      </AnimatePresence>
      <HoverTooltip />
      {debug && <DebugPanel />}
      <AnimatePresence>{showStats && <PerfOverlay key="perf" />}</AnimatePresence>
    </div>
  )
}

function Chrome({
  insights,
  hasSelection,
}: {
  insights: ReturnType<typeof useInsights>
  hasSelection: boolean
}) {
  const mobile = useMediaQuery(MOBILE_QUERY)
  const enter = (delay: number, y = 0, x = 0) => ({
    initial: { opacity: 0, y, x },
    animate: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: { delay, duration: durations.slow, ease: easings.out },
    },
    exit: { opacity: 0 },
  })
  if (mobile) {
    return (
      <motion.div className={styles.overlay}>
        <motion.div className={styles.topLeft} {...enter(0, -10)}>
          <Header />
          <FiltersPanel
            matched={insights.matched}
            total={insights.total}
            active={insights.filtered}
          />
        </motion.div>
        <motion.div className={styles.sheetSlot} {...enter(0.15, 40)}>
          <MobileSheet insights={insights} />
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div className={styles.overlay}>
      <div className={styles.top}>
        <motion.div className={styles.topLeft} {...enter(0, -10)}>
          <Header />
          <FiltersPanel
            matched={insights.matched}
            total={insights.total}
            active={insights.filtered}
          />
        </motion.div>
        <div className={styles.kpis}>
          <KpiStrip stats={insights.stats} series={insights.series} week={insights.week} />
        </div>
      </div>
      <div className={styles.middle}>
        <motion.div className={styles.side} {...enter(0.3, 0, 12)}>
          <ZoomControls />
        </motion.div>
        <div className={styles.rightPanel}>
          <AnimatePresence mode="wait" initial={false}>
            {hasSelection ? (
              <PatientCard key="card" />
            ) : (
              <InsightsPanel key="insights" data={insights} />
            )}
          </AnimatePresence>
        </div>
      </div>
      <motion.div className={styles.bottom} {...enter(0.15, 16)}>
        <Timeline />
      </motion.div>
    </motion.div>
  )
}
