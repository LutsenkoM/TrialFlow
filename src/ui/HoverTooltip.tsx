import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore'
import { armCss } from '../theme'
import { armLabel } from './format'
import styles from './HoverTooltip.module.css'

/** Small label that follows the pointer while a particle is hovered. */
export function HoverTooltip() {
  const ref = useRef<HTMLDivElement>(null)
  const patient = useAppStore((s) =>
    s.hoveredId === null ? null : (s.patients[s.hoveredId] ?? null),
  )

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (ref.current)
        ref.current.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <div ref={ref} className={styles.tip} data-visible={patient !== null} aria-hidden>
      {patient && (
        <>
          <span
            className={styles.dot}
            style={{ background: patient.arm ? armCss[patient.arm] : 'var(--neutral)' }}
          />
          <span className="num">{patient.code}</span>
          <span className={styles.arm}>{armLabel(patient.arm)}</span>
        </>
      )}
    </div>
  )
}
