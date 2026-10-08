import { motion } from 'motion/react'
import type { KmPoint } from '../core/insights'
import { ARMS, STUDY } from '../data/studyConfig'
import { armCss, durations, easings } from '../theme'
import styles from './Charts.module.css'

interface Props {
  curves: KmPoint[][]
}

const W = 300
const H = 150
const PAD = { l: 30, r: 10, t: 8, b: 20 }
const Y_MIN = 0.5

const sx = (t: number) => PAD.l + (t / STUDY.treatmentWeeks) * (W - PAD.l - PAD.r)
const sy = (s: number) => PAD.t + ((1 - s) / (1 - Y_MIN)) * (H - PAD.t - PAD.b)

function stepPath(curve: KmPoint[]): string {
  let d = `M${sx(0)},${sy(1)}`
  for (const p of curve) d += ` H${sx(p.t).toFixed(1)} V${sy(p.s).toFixed(1)}`
  return d
}

/** Kaplan–Meier-style retention per arm (data cut at the current week), with a "now" cursor. */
export function RetentionChart({ curves }: Props) {
  // Longest follow-up available at this data cut, in protocol weeks.
  const maxT = Math.max(0, ...curves.map((c) => c[c.length - 1]?.t ?? 0))
  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Retention by arm"
    >
      {[1, 0.9, 0.8, 0.7, 0.6, 0.5].map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={sy(v)} y2={sy(v)} className={styles.grid} />
          <text x={PAD.l - 6} y={sy(v) + 3} className={styles.axis} textAnchor="end">
            {Math.round(v * 100)}%
          </text>
        </g>
      ))}
      {[0, 12, 24, 36, 52].map((t) => (
        <text key={t} x={sx(t)} y={H - 6} className={styles.axis} textAnchor="middle">
          W{t}
        </text>
      ))}
      {curves.map((curve, a) => {
        const arm = ARMS[a]
        const end = curve[curve.length - 1]
        return (
          <g key={arm.id}>
            <motion.path
              d={stepPath(curve)}
              fill="none"
              stroke={armCss[arm.id]}
              strokeWidth={1.75}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: durations.intro / 2, ease: easings.out }}
              style={{ filter: `drop-shadow(0 0 4px ${armCss[arm.id]})` }}
            />
            {end && end.t > 0 && (
              <circle cx={sx(end.t)} cy={sy(end.s)} r={2.5} fill={armCss[arm.id]} />
            )}
          </g>
        )
      })}
      {maxT > 0 && (
        <g>
          <line x1={sx(maxT)} x2={sx(maxT)} y1={PAD.t} y2={H - PAD.b} className={styles.now} />
          <text
            x={sx(maxT)}
            y={PAD.t + 8}
            className={styles.nowLabel}
            textAnchor={maxT > 40 ? 'end' : 'start'}
            dx={maxT > 40 ? -4 : 4}
          >
            now
          </text>
        </g>
      )}
    </svg>
  )
}
