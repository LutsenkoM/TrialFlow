import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { durations, easings } from '../theme'
import glass from './glass.module.css'
import { insightSections, type Insights } from './insightSections'
import styles from './InsightsPanel.module.css'

export function InsightSection({
  title,
  hint,
  children,
  index,
}: {
  title: string
  hint?: string
  children: ReactNode
  index: number
}) {
  return (
    <motion.section
      className={styles.section}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.08, duration: durations.slow, ease: easings.out }}
    >
      <header className={styles.sectionHead}>
        <h3 className={glass.eyebrow}>{title}</h3>
        {hint && <span className={styles.hint}>{hint}</span>}
      </header>
      {children}
    </motion.section>
  )
}

export function InsightsPanel({ data }: { data: Insights }) {
  return (
    <motion.aside
      className={`${glass.glass} ${styles.panel}`}
      aria-label="Insights"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: durations.slow, ease: easings.out }}
    >
      {insightSections(data).map((s, i) => (
        <InsightSection key={s.key} title={s.title} hint={s.hint} index={i}>
          {s.body}
        </InsightSection>
      ))}
    </motion.aside>
  )
}
