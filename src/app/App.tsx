import { useEffect, useState } from 'react'
import { generatePatients } from '../data/generator'
import { SceneCanvas } from '../scene/SceneCanvas'
import { useAppStore } from '../store/appStore'
import { DebugPanel } from '../ui/DebugPanel'
import { Header } from '../ui/Header'
import { Timeline } from '../ui/Timeline'
import styles from './App.module.css'

function readParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    week: params.get('week'),
    count: Number(params.get('n')) || undefined,
    debug: params.has('debug'),
  }
}

export function App() {
  const setPatients = useAppStore((s) => s.setPatients)
  const [{ debug }] = useState(readParams)

  useEffect(() => {
    const { week, count } = readParams()
    if (week !== null) useAppStore.getState().setWeek(Number(week))
    setPatients(generatePatients({ patientCount: count }))
  }, [setPatients])

  return (
    <div className={styles.shell}>
      <SceneCanvas />
      <div className={styles.overlay}>
        <div className={styles.top}>
          <Header />
        </div>
        <div className={styles.bottom}>
          <Timeline />
        </div>
      </div>
      {debug && <DebugPanel />}
    </div>
  )
}
