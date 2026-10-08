import type { Patient } from '../data/types'
import { armCss, reasonCss } from '../theme'
import styles from './PatientCard.module.css'

interface Props {
  patient: Patient
  week: number
}

/** Mini schematic of the study with this patient's route lit up to the current week. */
export function PatientJourney({ patient, week }: Props) {
  const reached = (type: string) => patient.events.some((e) => e.type === type && e.week <= week)
  const color = patient.arm ? armCss[patient.arm] : 'var(--neutral)'
  const last = patient.events[patient.events.length - 1]
  const failed = reached('screen_failed')
  const randomized = reached('randomized')
  const done = reached('completed')
  const dropped = reached('discontinued')
  const endColor = last.type === 'discontinued' ? reasonCss[last.reason] : color
  const laneY = patient.arm === 'placebo' ? 14 : patient.arm === 'high' ? 46 : 30

  const node = (x: number, y: number, on: boolean, c: string) => (
    <circle
      cx={x}
      cy={y}
      r={on ? 4.5 : 3}
      fill={on ? c : 'transparent'}
      stroke={c}
      strokeOpacity={on ? 1 : 0.35}
    />
  )
  const seg = (d: string, on: boolean, c: string) => (
    <path
      d={d}
      fill="none"
      stroke={c}
      strokeWidth={on ? 2 : 1}
      strokeOpacity={on ? 0.95 : 0.2}
      strokeLinecap="round"
    />
  )

  return (
    <svg className={styles.journey} viewBox="0 0 280 72" role="img" aria-label="Patient journey">
      {seg('M14 30 H70', true, 'var(--neutral)')}
      {seg('M18 34 Q30 60 40 62', failed, 'var(--neutral)')}
      {patient.arm && seg(`M74 30 C 96 30, 96 ${laneY}, 118 ${laneY}`, randomized, color)}
      {patient.arm && seg(`M118 ${laneY} H222`, randomized, color)}
      {patient.arm && seg(`M222 ${laneY} H262`, done, color)}
      {patient.arm && seg(`M170 ${laneY} Q178 ${laneY + 20} 186 64`, dropped, endColor)}
      {node(14, 30, true, 'var(--neutral)')}
      {node(40, 62, failed, 'var(--neutral)')}
      {node(72, 30, randomized, 'var(--ink)')}
      {patient.arm && node(262, laneY, done, color)}
      {patient.arm && node(186, 64, dropped, endColor)}
      <text x="14" y="16" className={styles.journeyLabel}>
        Screen
      </text>
      <text x="72" y="16" className={styles.journeyLabel} textAnchor="middle">
        Rand.
      </text>
      <text x="262" y="70" className={styles.journeyLabel} textAnchor="end">
        Done
      </text>
    </svg>
  )
}
