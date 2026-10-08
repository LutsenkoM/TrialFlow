import { useMemo } from 'react'
import { buildFilterMask, isFilterActive } from '../core/filters'
import { enrollmentHeatmap, kaplanMeier, kpiSeries, statsAt } from '../core/insights'
import { computeStages } from '../core/particleModel'
import { getPatientTable } from '../core/patientTable'
import { STUDY } from '../data/studyConfig'
import { useAppStore } from '../store/appStore'

/**
 * Week quantised so charts update ~2–3 times per second regardless of playback speed
 * (half-weeks at 1×, two weeks at 4×), never every frame.
 */
export const useCoarseWeek = () =>
  useAppStore((s) => {
    const step = s.playing ? 0.5 * s.speed : 0.5
    return Math.min(52, Math.round(s.week / step) * step)
  })

/** Filter-aware insight data shared by KPI cards and charts. */
export function useInsights() {
  const patients = useAppStore((s) => s.patients)
  const filters = useAppStore((s) => s.filters)
  const week = useCoarseWeek()
  const table = useMemo(() => getPatientTable(patients), [patients])
  const statusFiltered = filters.statuses.length > 0

  // Status filters depend on the current week; everything else is static per filter set.
  const maskWeek = statusFiltered ? week : 0
  const mask = useMemo(() => {
    const stages = new Uint8Array(table.count)
    if (statusFiltered) computeStages(table, maskWeek, stages)
    const out = new Uint8Array(table.count)
    const matched = buildFilterMask(table, stages, filters, out)
    return { bits: out, matched }
  }, [table, filters, statusFiltered, maskWeek])

  const stats = useMemo(() => statsAt(table, week, mask.bits), [table, week, mask])
  const series = useMemo(() => kpiSeries(table, mask.bits), [table, mask])
  const km = useMemo(() => kaplanMeier(table, week, mask.bits), [table, week, mask])
  const heatmap = useMemo(() => enrollmentHeatmap(table, mask.bits), [table, mask])
  const filtered = isFilterActive(filters, STUDY.ageRange.min, STUDY.ageRange.max)

  return { week, stats, series, km, heatmap, matched: mask.matched, total: table.count, filtered }
}
