import { motion } from 'motion/react'
import type { WeekStats } from '../core/insights'
import { ARMS, REASONS } from '../data/studyConfig'
import { armCss, durations, easings, reasonCss } from '../theme'
import styles from './Charts.module.css'

/** Discontinuations per arm as stacked bars by reason (share of randomized patients). */
export function DiscontinuationBars({ stats }: { stats: WeekStats }) {
  const maxShare = Math.max(
    0.05,
    ...ARMS.map(
      (_, a) => stats.discontinued[a].reduce((x, y) => x + y, 0) / Math.max(1, stats.randomized[a]),
    ),
  )
  return (
    <div className={styles.bars}>
      {ARMS.map((arm, a) => {
        const n = Math.max(1, stats.randomized[a])
        const total = stats.discontinued[a].reduce((x, y) => x + y, 0)
        return (
          <div key={arm.id} className={styles.barRow}>
            <span className={styles.barLabel} style={{ color: armCss[arm.id] }}>
              {arm.short}
            </span>
            <div className={styles.barTrack}>
              {REASONS.map((r, k) => (
                <motion.span
                  key={r.id}
                  title={`${r.label}: ${stats.discontinued[a][k]}`}
                  style={{ background: reasonCss[r.id] }}
                  initial={false}
                  animate={{ width: `${(stats.discontinued[a][k] / n / maxShare) * 100}%` }}
                  transition={{ duration: durations.slow, ease: easings.out }}
                />
              ))}
            </div>
            <span className={`num ${styles.barValue}`}>{((total / n) * 100).toFixed(1)}%</span>
          </div>
        )
      })}
      <div className={styles.legend}>
        {REASONS.map((r) => (
          <span key={r.id}>
            <i style={{ background: reasonCss[r.id] }} />
            {r.label}
          </span>
        ))}
      </div>
    </div>
  )
}
