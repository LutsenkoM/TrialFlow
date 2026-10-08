import { AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import { generatePatients } from '../data/generator'
import { SceneCanvas } from '../scene/SceneCanvas'
import { useAppStore } from '../store/appStore'
import { DebugPanel } from '../ui/DebugPanel'
import { FiltersPanel } from '../ui/FiltersPanel'
import { Header } from '../ui/Header'
import { HoverTooltip } from '../ui/HoverTooltip'
import { InsightsPanel } from '../ui/InsightsPanel'
import { KpiStrip } from '../ui/KpiStrip'
import { PatientCard } from '../ui/PatientCard'
import { Timeline } from '../ui/Timeline'
import { useInsights } from '../ui/useInsights'
import { ZoomControls } from '../ui/ZoomControls'
import styles from './App.module.css'

function readParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    week: params.get('week'),
    count: Number(params.get('n')) || undefined,
    debug: params.has('debug'),
    select: params.get('select'),
  }
}

export function App() {
  const setPatients = useAppStore((s) => s.setPatients)
  const hasSelection = useAppStore((s) => s.selectedId !== null)
  const [{ debug }] = useState(readParams)
  const insights = useInsights()

  useEffect(() => {
    const { week, count, select } = readParams()
    if (week !== null) useAppStore.getState().setWeek(Number(week))
    setPatients(generatePatients({ patientCount: count }))
    // Deep link to a patient (after the scene has mounted so the camera can fly there).
    if (select !== null) window.setTimeout(() => useAppStore.getState().select(Number(select)), 900)
  }, [setPatients])

  return (
    <div className={styles.shell}>
      <SceneCanvas />
      <div className={styles.overlay}>
        <div className={styles.top}>
          <div className={styles.topLeft}>
            <Header />
            <FiltersPanel
              matched={insights.matched}
              total={insights.total}
              active={insights.filtered}
            />
          </div>
          <div className={styles.kpis}>
            <KpiStrip stats={insights.stats} series={insights.series} week={insights.week} />
          </div>
        </div>
        <div className={styles.middle}>
          <div className={styles.side}>
            <ZoomControls />
          </div>
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
        <div className={styles.bottom}>
          <Timeline />
        </div>
      </div>
      <HoverTooltip />
      {debug && <DebugPanel />}
    </div>
  )
}
