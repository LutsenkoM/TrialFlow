import { animate, useReducedMotion } from 'motion/react'
import { useLayoutEffect, useRef } from 'react'
import { durations, easings } from '../theme'

interface Props {
  value: number
  format?: (n: number) => string
  className?: string
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString('en-US')

/** Count-up number that tweens to each new value (instant with reduced motion). */
export function AnimatedNumber({ value, format = defaultFormat, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const current = useRef(value)
  const reduced = useReducedMotion()

  // Layout effect so the first value is in the DOM before paint; React never owns the text.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduced) {
      current.current = value
      el.textContent = format(value)
      return
    }
    const controls = animate(current.current, value, {
      duration: durations.slow,
      ease: easings.out,
      onUpdate: (v) => {
        current.current = v
        el.textContent = format(v)
      },
    })
    return () => controls.stop()
  }, [value, format, reduced])

  return <span ref={ref} className={`num ${className ?? ''}`} />
}
