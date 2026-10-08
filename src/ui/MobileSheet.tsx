import { AnimatePresence, motion, useAnimationControls, type PanInfo } from 'motion/react'
import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { springs } from '../theme'
import glass from './glass.module.css'
import { InsightSection } from './InsightsPanel'
import { insightSections, type Insights } from './insightSections'
import { KpiStrip } from './KpiStrip'
import styles from './MobileSheet.module.css'
import { PatientCard } from './PatientCard'
import { Timeline } from './Timeline'

/** Collapsed height shows the timeline; expanded reveals KPIs and swipeable chart cards. */
const PEEK = 168

/** Phone layout: a draggable bottom sheet holding the timeline, KPIs, charts and patient card. */
export function MobileSheet({ insights }: { insights: Insights }) {
  const [open, setOpen] = useState(false)
  const controls = useAnimationControls()
  const hasSelection = useAppStore((s) => s.selectedId !== null)
  const expanded = open || hasSelection

  const snap = (next: boolean) => {
    setOpen(next)
    void controls.start({ y: 0 })
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -40 || info.velocity.y < -300) snap(true)
    else if (info.offset.y > 40 || info.velocity.y > 300) {
      snap(false)
      if (hasSelection) useAppStore.getState().select(null)
    } else snap(open)
  }

  return (
    <motion.div
      className={`${glass.glass} ${styles.sheet}`}
      data-expanded={expanded}
      layout
      transition={springs.panel}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.25}
      onDragEnd={onDragEnd}
      animate={controls}
      style={{ minHeight: PEEK }}
    >
      <button
        type="button"
        className={styles.handle}
        onClick={() => snap(!open)}
        aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
        aria-expanded={expanded}
      >
        <span />
      </button>
      <Timeline />
      <AnimatePresence initial={false} mode="wait">
        {expanded && (
          <motion.div
            key={hasSelection ? 'card' : 'insights'}
            className={styles.body}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            {hasSelection ? (
              <PatientCard />
            ) : (
              <>
                <div className={styles.kpis}>
                  <KpiStrip stats={insights.stats} series={insights.series} week={insights.week} />
                </div>
                <div className={styles.cards}>
                  {insightSections(insights).map((s, i) => (
                    <div key={s.key} className={styles.card}>
                      <InsightSection title={s.title} hint={s.hint} index={i}>
                        {s.body}
                      </InsightSection>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
