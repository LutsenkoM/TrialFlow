import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { getPatientStateAt } from '../data/patientState'
import type { Patient } from '../data/types'
import { useAppStore } from '../store/appStore'
import { armCss, easings, durations } from '../theme'
import { armLabel, eventLabel, fmtWeek, siteById, statusLabel } from './format'
import glass from './glass.module.css'
import styles from './PatientCard.module.css'
import { PatientJourney } from './PatientJourney'

export function PatientCard() {
  const selectedId = useAppStore((s) => s.selectedId)
  const patient = useAppStore((s) =>
    s.selectedId === null ? null : (s.patients[s.selectedId] ?? null),
  )
  const select = useAppStore((s) => s.select)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [select])

  return (
    <AnimatePresence mode="wait">
      {patient && (
        <motion.aside
          key={selectedId}
          className={`${glass.glass} ${styles.card}`}
          aria-label={`Patient ${patient.code}`}
          initial={{ opacity: 0, x: 40, filter: 'blur(6px)' }}
          animate={{
            opacity: 1,
            x: 0,
            filter: 'blur(0px)',
            // Let the camera start flying before the card slides in.
            transition: { duration: durations.base, ease: easings.out, delay: 0.25 },
          }}
          exit={{
            opacity: 0,
            x: 24,
            filter: 'blur(4px)',
            transition: { duration: durations.fast },
          }}
        >
          <CardBody patient={patient} onClose={() => select(null)} />
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function CardBody({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  // Quantised so the card updates a few times per second while playing, not every frame.
  const week = useAppStore((s) => Math.floor(s.week * 4) / 4)
  const state = getPatientStateAt(patient, week)
  const site = siteById(patient.siteId)
  const accent = patient.arm ? armCss[patient.arm] : 'var(--neutral)'

  return (
    <div className={styles.inner} style={{ ['--accent' as string]: accent }}>
      <div className={styles.accentBar} />
      <header className={styles.head}>
        <div>
          <div className={glass.eyebrow}>Patient</div>
          <h2 className={`num ${styles.code}`}>{patient.code}</h2>
        </div>
        <motion.button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close patient card"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
        >
          <X size={16} />
        </motion.button>
      </header>

      <div className={styles.status} data-stage={state.stage}>
        <span className={styles.statusDot} />
        {statusLabel(state)}
      </div>

      <dl className={styles.facts}>
        <div>
          <dt>Arm</dt>
          <dd style={{ color: accent }}>{armLabel(patient.arm)}</dd>
        </div>
        <div>
          <dt>Age · Sex</dt>
          <dd className="num">
            {patient.age} · {patient.sex}
          </dd>
        </div>
        <div className={styles.wide}>
          <dt>Site</dt>
          <dd>
            {site?.name}
            <span className={styles.muted}>
              {' '}
              · {site?.city}, {site?.country}
            </span>
          </dd>
        </div>
      </dl>

      <PatientJourney patient={patient} week={week} />

      <ol className={styles.events}>
        {patient.events.map((e, i) => {
          const past = e.week <= week
          return (
            <motion.li
              key={i}
              className={styles.event}
              data-past={past}
              data-type={e.type}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.035, duration: durations.base, ease: easings.out }}
            >
              <span className={styles.eventDot} />
              <span className={styles.eventLabel}>{eventLabel(e)}</span>
              <span className={`num ${styles.eventWeek}`}>{fmtWeek(e.week)}</span>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}
