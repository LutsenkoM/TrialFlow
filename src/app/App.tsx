import { useEffect, useState } from 'react'
import { generatePatients } from '../data/generator'
import { SceneCanvas } from '../scene/SceneCanvas'
import { useAppStore } from '../store/appStore'
import { DebugPanel } from '../ui/DebugPanel'
import { Header } from '../ui/Header'
import { HoverTooltip } from '../ui/HoverTooltip'
import { PatientCard } from '../ui/PatientCard'
import { Timeline } from '../ui/Timeline'
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
  const [{ debug }] = useState(readParams)

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
          <Header />
        </div>
        <div className={styles.middle}>
          <div className={styles.side}>
            <ZoomControls />
          </div>
          <PatientCard />
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
