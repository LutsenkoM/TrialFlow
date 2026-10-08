import { useEffect } from 'react'
import { generatePatients } from '../data/generator'
import { SceneCanvas } from '../scene/SceneCanvas'
import { useAppStore } from '../store/appStore'
import { DebugPanel } from '../ui/DebugPanel'
import styles from './App.module.css'

export function App() {
  const setPatients = useAppStore((s) => s.setPatients)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const week = params.get('week')
    if (week !== null) useAppStore.getState().setWeek(Number(week))
    const count = Number(params.get('n')) || undefined
    setPatients(generatePatients({ patientCount: count }))
  }, [setPatients])

  return (
    <div className={styles.shell}>
      <SceneCanvas />
      <DebugPanel />
    </div>
  )
}
