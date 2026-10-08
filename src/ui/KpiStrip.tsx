import { motion } from 'motion/react'
import type { KpiSeries, WeekStats } from '../core/insights'
import { ARMS } from '../data/studyConfig'
import { armCss, durations, easings } from '../theme'
import { AnimatedNumber } from './AnimatedNumber'
import glass from './glass.module.css'
import styles from './KpiStrip.module.css'
import { Sparkline } from './Sparkline'

interface Props {
  stats: WeekStats
  series: KpiSeries
  week: number
}

const sum = (xs: number[]) => xs[0] + xs[1] + xs[2]

/** Live KPI cards: count-up values, sparklines and per-arm split. */
export function KpiStrip({ stats, series, week }: Props) {
  const discontinued = stats.discontinued.map((r) => r[0] + r[1] + r[2] + r[3])
  const cards = [
    {
      key: 'screened',
      label: 'Screened',
      value: stats.screened,
      series: series.screened,
      color: '#a4adc2',
      split: null,
    },
    {
      key: 'randomized',
      label: 'Randomized',
      value: sum(stats.randomized),
      series: series.randomized,
      color: '#e8edf7',
      split: stats.randomized,
    },
    {
      key: 'active',
      label: 'Active',
      value: sum(stats.active),
      series: series.active,
      color: '#3fd8ff',
      split: stats.active,
    },
    {
      key: 'completed',
      label: 'Completed',
      value: sum(stats.completed),
      series: series.completed,
      color: '#5cf2b0',
      split: stats.completed,
    },
    {
      key: 'discontinued',
      label: 'Discontinued',
      value: sum(discontinued),
      series: series.discontinued,
      color: '#ff6b8b',
      split: discontinued,
    },
  ]

  return (
    <div className={styles.strip}>
      {cards.map((c, i) => (
        <motion.div
          key={c.key}
          className={`${glass.glass} ${styles.card}`}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.06, duration: durations.slow, ease: easings.out }}
          whileHover={{ y: -2 }}
        >
          <div className={styles.top}>
            <span className={styles.label}>
              <span
                className={styles.swatch}
                style={{ background: c.color, boxShadow: `0 0 8px ${c.color}` }}
              />
              {c.label}
            </span>
          </div>
          <AnimatedNumber value={c.value} className={styles.value} />
          <Sparkline values={c.series} upTo={week} color={c.color} width={132} height={28} />
          {c.split && (
            <div className={styles.split} aria-label={`${c.label} by arm`}>
              {ARMS.map((arm, a) => {
                const total = Math.max(1, c.split[0] + c.split[1] + c.split[2])
                return (
                  <motion.span
                    key={arm.id}
                    title={`${arm.label}: ${c.split[a]}`}
                    style={{ background: armCss[arm.id] }}
                    animate={{ flexGrow: c.split[a] / total }}
                    transition={{ duration: durations.slow, ease: easings.out }}
                  />
                )
              })}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}
