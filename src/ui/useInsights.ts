import { useMemo } from 'react'
import { buildFilterMask, isFilterActive } from '../core/filters'
import { enrollmentHeatmap, kaplanMeier, kpiSeries, statsAt } from '../core/insights'
import { computeStages } from '../core/particleModel'
import { getPatientTable } from '../core/patientTable'
import { STUDY } from '../data/studyConfig'
import { useAppStore } from '../store/appStore'

/** Week quantised to half-weeks so charts update a few times per second, not every frame. */
export const useCoarseWeek = () => useAppStore((s) => Math.round(s.week * 2) / 2)

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
