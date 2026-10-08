import { RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { ARMS, SITES, STUDY } from '../data/studyConfig'
import type { Sex } from '../data/types'
import { useAppStore, type StatusFilter } from '../store/appStore'
import { armCss, durations, easings, springs } from '../theme'
import styles from './FiltersPanel.module.css'
import { fmtInt } from './format'
import glass from './glass.module.css'

const STATUSES: { id: StatusFilter; label: string }[] = [
  { id: 'screening', label: 'Screening' },
  { id: 'screen_failed', label: 'Screen fail' },
  { id: 'treatment', label: 'On treatment' },
  { id: 'completed', label: 'Completed' },
  { id: 'discontinued', label: 'Discontinued' },
]

const SEXES: { id: Sex; label: string }[] = [
  { id: 'F', label: 'Female' },
  { id: 'M', label: 'Male' },
]

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

function Chip({
  on,
  onClick,
  color,
  children,
}: {
  on: boolean
  onClick: () => void
  color?: string
  children: React.ReactNode
}) {
  return (
    <motion.button
      type="button"
      className={styles.chip}
      aria-pressed={on}
      onClick={onClick}
      style={color ? { ['--chip' as string]: color } : undefined}
      whileTap={{ scale: 0.94 }}
      transition={springs.press}
    >
      {color && <span className={styles.chipDot} />}
      {children}
    </motion.button>
  )
}

interface Props {
  matched: number
  total: number
  active: boolean
}

export function FiltersPanel({ matched, total, active }: Props) {
  const [open, setOpen] = useState(false)
  const filters = useAppStore((s) => s.filters)
  const setFilters = useAppStore((s) => s.setFilters)
  const resetFilters = useAppStore((s) => s.resetFilters)
  const { min, max } = STUDY.ageRange
  const [lo, hi] = filters.ageRange
  const activeCount =
    filters.arms.length +
    filters.sites.length +
    filters.sexes.length +
    filters.statuses.length +
    (lo > min || hi < max ? 1 : 0)

  return (
    <div className={styles.wrap}>
      <motion.button
        type="button"
        className={`${glass.glass} ${styles.toggle}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="filters-panel"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        transition={springs.press}
      >
        <SlidersHorizontal size={15} />
        Filters
        {activeCount > 0 && <span className={`num ${styles.badge}`}>{activeCount}</span>}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="filters-panel"
            className={`${glass.glass} ${styles.panel}`}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: durations.base, ease: easings.out }}
            style={{ transformOrigin: 'top left' }}
          >
            <div className={styles.head}>
              <span className={glass.eyebrow}>Filter population</span>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => setOpen(false)}
                aria-label="Close filters"
              >
                <X size={14} />
              </button>
            </div>

            <fieldset className={styles.group}>
              <legend>Arm</legend>
              <div className={styles.chips}>
                {ARMS.map((a) => (
                  <Chip
                    key={a.id}
                    on={filters.arms.includes(a.id)}
                    color={armCss[a.id]}
                    onClick={() => setFilters({ arms: toggle(filters.arms, a.id) })}
                  >
                    {a.label}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.group}>
              <legend>Status at current week</legend>
              <div className={styles.chips}>
                {STATUSES.map((s) => (
                  <Chip
                    key={s.id}
                    on={filters.statuses.includes(s.id)}
                    onClick={() => setFilters({ statuses: toggle(filters.statuses, s.id) })}
                  >
                    {s.label}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.group}>
              <legend>Sex</legend>
              <div className={styles.chips}>
                {SEXES.map((s) => (
                  <Chip
                    key={s.id}
                    on={filters.sexes.includes(s.id)}
                    onClick={() => setFilters({ sexes: toggle(filters.sexes, s.id) })}
                  >
                    {s.label}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.group}>
              <legend>
                Age{' '}
                <span className="num">
                  {lo}–{hi}
                </span>
              </legend>
              <div
                className={styles.range}
                style={{
                  ['--lo' as string]: (lo - min) / (max - min),
                  ['--hi' as string]: (hi - min) / (max - min),
                }}
              >
                <div className={styles.rangeFill} />
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={lo}
                  aria-label="Minimum age"
                  onChange={(e) =>
                    setFilters({ ageRange: [Math.min(Number(e.target.value), hi), hi] })
                  }
                />
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={hi}
                  aria-label="Maximum age"
                  onChange={(e) =>
                    setFilters({ ageRange: [lo, Math.max(Number(e.target.value), lo)] })
                  }
                />
              </div>
            </fieldset>

            <fieldset className={styles.group}>
              <legend>Site</legend>
              <div className={styles.chips}>
                {SITES.map((s) => (
                  <Chip
                    key={s.id}
                    on={filters.sites.includes(s.id)}
                    onClick={() => setFilters({ sites: toggle(filters.sites, s.id) })}
                  >
                    {s.city}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <div className={styles.foot}>
              <span className={styles.count}>
                <span className="num">{fmtInt(matched)}</span> of{' '}
                <span className="num">{fmtInt(total)}</span> patients
              </span>
              <button
                type="button"
                className={styles.reset}
                onClick={resetFilters}
                disabled={!active}
              >
                <RotateCcw size={13} />
                Reset
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
