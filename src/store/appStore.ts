import { create } from 'zustand'
import type { ArmId, Patient, Sex, Stage } from '../data/types'
import { STUDY } from '../data/studyConfig'

export type Speed = 0.5 | 1 | 2 | 4
export type StatusFilter =
  'screening' | 'screen_failed' | 'treatment' | 'completed' | 'discontinued'

export interface Filters {
  arms: ArmId[]
  sites: number[]
  sexes: Sex[]
  ageRange: [number, number]
  statuses: StatusFilter[]
}

export const EMPTY_FILTERS: Filters = {
  arms: [],
  sites: [],
  sexes: [],
  ageRange: [STUDY.ageRange.min, STUDY.ageRange.max],
  statuses: [],
}

export interface AppState {
  patients: Patient[]
  week: number
  playing: boolean
  speed: Speed
  filters: Filters
  selectedId: number | null
  hoveredId: number | null
  /** Mirrors `prefers-reduced-motion`; non-essential animation is skipped when true. */
  reducedMotion: boolean
  /** True while the intro sequence runs. */
  intro: boolean
  setPatients: (patients: Patient[]) => void
  setWeek: (week: number) => void
  setPlaying: (playing: boolean) => void
  togglePlaying: () => void
  setSpeed: (speed: Speed) => void
  setFilters: (patch: Partial<Filters>) => void
  resetFilters: () => void
  select: (id: number | null) => void
  hover: (id: number | null) => void
  setReducedMotion: (v: boolean) => void
  setIntro: (v: boolean) => void
}

export function clampWeek(week: number): number {
  return Math.min(STUDY.timelineWeeks, Math.max(0, week))
}

export const useAppStore = create<AppState>()((set) => ({
  patients: [],
  week: 0,
  playing: false,
  speed: 1,
  filters: EMPTY_FILTERS,
  selectedId: null,
  hoveredId: null,
  reducedMotion:
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  intro: false,
  setPatients: (patients) => set({ patients }),
  setWeek: (week) => set({ week: clampWeek(week) }),
  setPlaying: (playing) => set({ playing }),
  togglePlaying: () =>
    set((s) => {
      // Pressing play at the end restarts from week 0.
      if (!s.playing && s.week >= STUDY.timelineWeeks) return { playing: true, week: 0 }
      return { playing: !s.playing }
    }),
  setSpeed: (speed) => set({ speed }),
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  resetFilters: () => set({ filters: EMPTY_FILTERS }),
  select: (selectedId) => set({ selectedId }),
  hover: (hoveredId) => set({ hoveredId }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setIntro: (intro) => set({ intro }),
}))

export type { Stage }
