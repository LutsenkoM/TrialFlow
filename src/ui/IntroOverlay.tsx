import { motion } from 'motion/react'
import { useEffect } from 'react'
import { STUDY } from '../data/studyConfig'
import { durations, easings } from '../theme'
import { fmtInt } from './format'
import styles from './IntroOverlay.module.css'

interface Props {
  ready: boolean
  patientCount: number
  onSkip: () => void
}

const TITLE = 'Trial Flow'

/** Cinematic title card shown over the scene while it draws itself in. Click / any key skips. */
export function IntroOverlay({ ready, patientCount, onSkip }: Props) {
  useEffect(() => {
    const skip = () => onSkip()
    window.addEventListener('keydown', skip)
    return () => window.removeEventListener('keydown', skip)
  }, [onSkip])

  return (
    <motion.div
      className={styles.overlay}
      onClick={onSkip}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: durations.slow, ease: easings.out } }}
    >
      <div className={styles.center}>
        <motion.div
          className={styles.eyebrow}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: durations.slow, ease: easings.out }}
        >
          {STUDY.code} · {STUDY.phase}
        </motion.div>
        <h1 className={styles.title} aria-label={TITLE}>
          {TITLE.split('').map((ch, i) => (
            <motion.span
              key={i}
              aria-hidden
              initial={{ opacity: 0, y: 24, filter: 'blur(12px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.25 + i * 0.045, duration: 0.8, ease: easings.out }}
            >
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          ))}
        </h1>
        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: durations.slow }}
        >
          {ready
            ? `${fmtInt(patientCount)} synthetic patients · 52 weeks · 3 arms`
            : 'Generating synthetic patients…'}
        </motion.p>
        <div className={styles.progress}>
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: ready ? 1 : 0.6 }}
            transition={{ duration: ready ? 1.6 : 3, ease: easings.inOut }}
          />
        </div>
      </div>
      <button
        type="button"
        className={styles.skip}
        onClick={(e) => {
          e.stopPropagation()
          onSkip()
        }}
      >
        Skip intro
      </button>
    </motion.div>
  )
}
