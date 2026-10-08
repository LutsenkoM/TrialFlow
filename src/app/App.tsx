import { SceneCanvas } from '../scene/SceneCanvas'
import styles from './App.module.css'

export function App() {
  return (
    <div className={styles.shell}>
      <SceneCanvas />
    </div>
  )
}
