import { SITES } from '../data/studyConfig'
import styles from './Charts.module.css'

interface Props {
  rows: number[][]
  week: number
}

/** Screenings per site × week; the current week column is highlighted. */
export function EnrollmentHeatmap({ rows, week }: Props) {
  const max = Math.max(1, ...rows.flat())
  const cols = rows[0]?.length ?? 0
  const current = Math.floor(week)
  return (
    <div className={styles.heatmap} role="img" aria-label="Enrollment by site and week">
      {rows.map((row, r) => (
        <div key={SITES[r].id} className={styles.heatRow}>
          <span className={styles.heatLabel} title={`${SITES[r].name}, ${SITES[r].country}`}>
            {SITES[r].city}
          </span>
          <div className={styles.heatCells} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {row.map((v, c) => (
              <span
                key={c}
                data-now={c === current}
                data-future={c > current}
                style={{ ['--v' as string]: (v / max).toFixed(3) }}
                title={`${SITES[r].city} · W${c}: ${v}`}
              />
            ))}
          </div>
        </div>
      ))}
      <div className={styles.heatAxis}>
        <span>W0</span>
        <span>W{cols - 1}</span>
      </div>
    </div>
  )
}
