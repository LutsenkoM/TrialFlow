import type { Filters, StatusFilter } from '../store/appStore'
import { ARM_INDEX } from './layout'
import { STAGE } from './particleModel'
import type { PatientTable } from './patientTable'

const STATUS_STAGE: Record<StatusFilter, number> = {
  screening: STAGE.screening,
  screen_failed: STAGE.screenFailed,
  treatment: STAGE.treatment,
  completed: STAGE.completed,
  discontinued: STAGE.discontinued,
}

export function isFilterActive(f: Filters, ageMin: number, ageMax: number): boolean {
  return (
    f.arms.length > 0 ||
    f.sites.length > 0 ||
    f.sexes.length > 0 ||
    f.statuses.length > 0 ||
    f.ageRange[0] > ageMin ||
    f.ageRange[1] < ageMax
  )
}

/** Writes 1/0 per patient into `out`. Status filters use `stage` (stage codes at the current week). */
export function buildFilterMask(
  table: PatientTable,
  stage: Uint8Array,
  f: Filters,
  out: Uint8Array,
): number {
  const arms = new Set(f.arms.map((a) => ARM_INDEX[a]))
  const sites = new Set(f.sites)
  const sexes = new Set<number>(f.sexes.map((s) => (s === 'F' ? 0 : 1)))
  const stages = new Set(f.statuses.map((s) => STATUS_STAGE[s]))
  const [ageLo, ageHi] = f.ageRange
  let matched = 0
  for (let i = 0; i < table.count; i++) {
    const ok =
      (arms.size === 0 || arms.has(table.arm[i])) &&
      (sites.size === 0 || sites.has(table.site[i])) &&
      (sexes.size === 0 || sexes.has(table.sex[i])) &&
      (stages.size === 0 || stages.has(stage[i])) &&
      table.age[i] >= ageLo &&
      table.age[i] <= ageHi
    out[i] = ok ? 1 : 0
    if (ok) matched++
  }
  return matched
}

/**
 * Target emphasis per particle: 1 normal, ~0 dimmed, >1 highlighted.
 * Filters: matching particles get a subtle boost when a filter is active.
 * Selection: everyone else dims so the selected patient stands out.
 */
export function computeEmphasis(
  mask: Uint8Array,
  filterActive: boolean,
  selectedId: number | null,
  out: Float32Array,
) {
  const selectionDim = selectedId === null ? 1 : 0.35
  for (let i = 0; i < out.length; i++) {
    const base = mask[i] ? (filterActive ? 1.25 : 1) : 0.06
    out[i] = base * selectionDim
  }
  if (selectedId !== null && selectedId < out.length) out[selectedId] = 2
}
