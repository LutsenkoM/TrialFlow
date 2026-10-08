import { Pause, Play, RotateCcw } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { computeMilestones, visitDensity } from '../core/timelineData'
import { STUDY } from '../data/studyConfig'
import { useAppStore, type Speed } from '../store/appStore'
import { springs } from '../theme'
import glass from './glass.module.css'
import styles from './Timeline.module.css'
import { cancelJump, jumpToWeek, stepWeek, togglePlay } from './timeControl'
import { useStoreEffect } from './useStoreRef'

const SPEEDS: Speed[] = [0.5, 1, 2, 4]
const WEEKS = STUDY.timelineWeeks
const TICKS = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52]

export function Timeline() {
  const patients = useAppStore((s) => s.patients)
  const playing = useAppStore((s) => s.playing)
  const speed = useAppStore((s) => s.speed)
  const ended = useAppStore((s) => s.week >= WEEKS)
  const setSpeed = useAppStore((s) => s.setSpeed)

  const density = useMemo(() => visitDensity(patients), [patients])
  const milestones = useMemo(() => computeMilestones(patients), [patients])

  const trackRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef<HTMLSpanElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)
  const wasPlaying = useRef(false)

  // The playhead moves every frame: write to the DOM directly instead of re-rendering.
  useStoreEffect(
    (s) => s.week,
    (week) => {
      const pct = `${(week / WEEKS) * 100}%`
      if (fillRef.current) fillRef.current.style.width = pct
      if (thumbRef.current) thumbRef.current.style.left = pct
      if (readoutRef.current) readoutRef.current.textContent = week.toFixed(1).padStart(4, '0')
      sliderRef.current?.setAttribute('aria-valuenow', week.toFixed(1))
      sliderRef.current?.setAttribute('aria-valuetext', `Week ${week.toFixed(1)} of ${WEEKS}`)
    },
  )

  const weekFromPointer = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return ((clientX - rect.left) / rect.width) * WEEKS
  }

  const dragging = useRef(false)
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const s = useAppStore.getState()
    wasPlaying.current = s.playing
    dragging.current = false
    s.setPlaying(false)
    // A click glides to the target; dragging then follows the pointer 1:1.
    jumpToWeek(weekFromPointer(e.clientX))
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    if (!dragging.current) cancelJump()
    dragging.current = true
    useAppStore.getState().setWeek(weekFromPointer(e.clientX))
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (wasPlaying.current) useAppStore.getState().setPlaying(true)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 4 : 1
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') stepWeek(step)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') stepWeek(-step)
    else if (e.key === 'Home') jumpToWeek(0)
    else if (e.key === 'End') jumpToWeek(WEEKS)
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div className={`${glass.glass} ${styles.bar}`}>
      <motion.button
        type="button"
        className={styles.play}
        onClick={togglePlay}
        aria-label={playing ? 'Pause' : ended ? 'Replay from week 0' : 'Play'}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        transition={springs.press}
      >
        {playing ? <Pause size={18} /> : ended ? <RotateCcw size={18} /> : <Play size={18} />}
      </motion.button>

      <div className={styles.readout}>
        <span className={glass.eyebrow}>Week</span>
        <span className="num">
          <span ref={readoutRef} className={styles.week}>
            00.0
          </span>
          <span className={styles.of}> / {WEEKS}</span>
        </span>
      </div>

      <div
        ref={sliderRef}
        className={styles.scrubber}
        role="slider"
        tabIndex={0}
        aria-label="Study week"
        aria-valuemin={0}
        aria-valuemax={WEEKS}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div className={styles.density} aria-hidden>
          {density.map((d, i) => (
            <span key={i} style={{ height: `${8 + d * 92}%` }} />
          ))}
        </div>
        <div ref={trackRef} className={styles.track}>
          <div ref={fillRef} className={styles.fill} />
          <div
            className={styles.enrollment}
            style={{ width: `${(STUDY.enrollmentEndWeek / WEEKS) * 100}%` }}
          />
          {milestones.map((m) => (
            <span
              key={m.id}
              className={styles.milestone}
              style={{ left: `${(m.week / WEEKS) * 100}%` }}
              title={`${m.label} · week ${m.week.toFixed(1)}`}
            />
          ))}
          <div ref={thumbRef} className={styles.thumb} />
        </div>
        <div className={styles.ticks} aria-hidden>
          {TICKS.map((t) => (
            <span key={t} style={{ left: `${(t / WEEKS) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.speeds} role="radiogroup" aria-label="Playback speed">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={speed === s}
            className={styles.speed}
            onClick={() => setSpeed(s)}
          >
            {speed === s && (
              <motion.span
                layoutId="speed-pill"
                className={styles.speedPill}
                transition={springs.panel}
              />
            )}
            <span className="num">{s}×</span>
          </button>
        ))}
      </div>
    </div>
  )
}
