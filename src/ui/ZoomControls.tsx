import { Maximize2, Minus, Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { sceneApi } from '../scene/sceneApi'
import { springs } from '../theme'
import glass from './glass.module.css'
import styles from './ZoomControls.module.css'

const BUTTONS = [
  { label: 'Zoom in', icon: Plus, run: sceneApi.zoomIn },
  { label: 'Zoom out', icon: Minus, run: sceneApi.zoomOut },
  { label: 'Reset view', icon: Maximize2, run: sceneApi.resetView },
]

export function ZoomControls() {
  return (
    <div className={`${glass.glass} ${styles.group}`} role="group" aria-label="Camera">
      {BUTTONS.map(({ label, icon: Icon, run }) => (
        <motion.button
          key={label}
          type="button"
          className={styles.btn}
          onClick={run}
          aria-label={label}
          title={label}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={springs.press}
        >
          <Icon size={15} />
        </motion.button>
      ))}
    </div>
  )
}
