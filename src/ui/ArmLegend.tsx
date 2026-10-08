import { ARMS } from '../data/studyConfig'
import { armCss } from '../theme'
import styles from './InsightsPanel.module.css'

export function ArmLegend() {
  return (
    <div className={styles.armLegend}>
      {ARMS.map((a) => (
        <span key={a.id}>
          <i style={{ background: armCss[a.id], boxShadow: `0 0 6px ${armCss[a.id]}` }} />
          {a.label}
        </span>
      ))}
    </div>
  )
}
