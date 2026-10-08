import { useId } from 'react'

interface Props {
  values: number[]
  /** Index of the "now" position; the line is drawn up to here. */
  upTo: number
  color: string
  width?: number
  height?: number
}

/** Tiny area sparkline over the whole timeline, revealed up to the current week. */
export function Sparkline({ values, upTo, color, width = 120, height = 32 }: Props) {
  const id = useId()
  const max = Math.max(1, ...values)
  const n = values.length - 1
  const x = (i: number) => (i / n) * width
  const y = (v: number) => height - 2 - (v / max) * (height - 4)
  const last = Math.max(0, Math.min(n, upTo))
  const whole = Math.floor(last)
  const pts: string[] = []
  for (let i = 0; i <= whole; i++) pts.push(`${x(i).toFixed(1)},${y(values[i]).toFixed(1)}`)
  const frac = last - whole
  const endV = whole < n ? values[whole] + (values[whole + 1] - values[whole]) * frac : values[n]
  pts.push(`${x(last).toFixed(1)},${y(endV).toFixed(1)}`)
  const line = `M${pts.join(' L')}`
  const area = `${line} L${x(last).toFixed(1)},${height} L0,${height} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle
        cx={x(last)}
        cy={y(endV)}
        r="2.5"
        fill={color}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  )
}
