import { useMemo } from 'react'
import { countStagesAt } from '../data/patientState'
import { STUDY } from '../data/studyConfig'
import { useAppStore } from '../store/appStore'
import styles from './DebugPanel.module.css'

/** Temporary M1 panel: stage counts for the selected week. */
export function DebugPanel() {
  const patients = useAppStore((s) => s.patients)
  const week = useAppStore((s) => s.week)
  const setWeek = useAppStore((s) => s.setWeek)
  const counts = useMemo(() => countStagesAt(patients, week), [patients, week])

  return (
    <div className={styles.panel}>
      <label>
        Week {week.toFixed(1)}
        <input
          type="range"
          min={0}
          max={STUDY.timelineWeeks}
          step={0.5}
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
        />
      </label>
      <dl>
        {Object.entries(counts).map(([stage, n]) => (
          <div key={stage}>
            <dt>{stage}</dt>
            <dd>{n}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
