import { useEffect } from 'react'
import { generatePatients } from '../data/generator'
import { SceneCanvas } from '../scene/SceneCanvas'
import { useAppStore } from '../store/appStore'
import { DebugPanel } from '../ui/DebugPanel'
import styles from './App.module.css'

export function App() {
  const setPatients = useAppStore((s) => s.setPatients)
  useEffect(() => {
    setPatients(generatePatients())
  }, [setPatients])

  return (
    <div className={styles.shell}>
      <SceneCanvas />
      <DebugPanel />
    </div>
  )
}
