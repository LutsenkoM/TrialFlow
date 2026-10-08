import { mulberry32, normal, shuffleInPlace, uniform, weightedIndex, type Rng } from './prng'
import { ARM_IDS, REASONS, SITES, STUDY, protocolToCalendar } from './studyConfig'
import type { ArmId, DiscontinuationReason, Patient, PatientEvent, Sex } from './types'

export interface GenerateOptions {
  seed?: number
  patientCount?: number
}

interface Draft {
  siteId: number
  age: number
  sex: Sex
  screeningWeek: number
  decisionWeek: number
  failed: boolean
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000
}

function draftPatient(rng: Rng): Draft {
  const siteIndex = weightedIndex(
    rng,
    SITES.map((s) => s.capacity),
  )
  const site = SITES[siteIndex]
  // Ramp-up: density grows over time (sqrt of uniform skews towards later weeks).
  const span = STUDY.enrollmentEndWeek - site.activationWeek
  const screeningWeek = site.activationWeek + span * Math.sqrt(rng())
  const duration = uniform(rng, STUDY.screeningDuration.min, STUDY.screeningDuration.max)
  const { min, max } = STUDY.ageRange
  const age = Math.round(Math.min(max, Math.max(min, normal(rng, STUDY.ageMean, STUDY.ageSd))))
  return {
    siteId: site.id,
    age,
    sex: rng() < STUDY.femaleShare ? 'F' : 'M',
    screeningWeek: round3(screeningWeek),
    decisionWeek: round3(screeningWeek + duration),
    failed: rng() < STUDY.screenFailRate,
  }
}

/** Permuted-block 1:1:1 randomization, one block stream per site. */
function makeArmAllocator(rng: Rng): (siteId: number) => ArmId {
  const queues = new Map<number, ArmId[]>()
  return (siteId) => {
    let queue = queues.get(siteId)
    if (!queue || queue.length === 0) {
      const perArm = STUDY.blockSize / ARM_IDS.length
      queue = shuffleInPlace(
        rng,
        ARM_IDS.flatMap((arm) => Array.from({ length: perArm }, () => arm)),
      )
      queues.set(siteId, queue)
    }
    return queue.pop() as ArmId
  }
}

/** Competing-risks exponential draw: returns protocol week + reason, or null if no dropout. */
function drawDiscontinuation(
  rng: Rng,
  arm: ArmId,
): { protocolWeek: number; reason: DiscontinuationReason } | null {
  const hazards = STUDY.hazards[arm]
  const weights = REASONS.map((r) => hazards[r.id])
  const total = weights.reduce((a, b) => a + b, 0)
  const t = -Math.log(Math.max(rng(), 1e-12)) / total
  const reason = REASONS[weightedIndex(rng, weights)].id
  if (t >= STUDY.treatmentWeeks) return null
  return { protocolWeek: t, reason }
}

function treatmentEvents(rng: Rng, arm: ArmId, randomizedWeek: number): PatientEvent[] {
  const events: PatientEvent[] = []
  const dropout = drawDiscontinuation(rng, arm)
  const endProtocolWeek = dropout ? dropout.protocolWeek : STUDY.treatmentWeeks
  STUDY.visitWeeks.forEach((protocolWeek, visitIndex) => {
    // A completing patient attends the final visit; a dropout only visits strictly before.
    const attended = dropout ? protocolWeek < endProtocolWeek : true
    if (!attended) return
    events.push({
      type: 'visit',
      week: round3(randomizedWeek + protocolToCalendar(protocolWeek)),
      visitIndex,
      protocolWeek,
    })
  })
  const endWeek = round3(randomizedWeek + protocolToCalendar(endProtocolWeek))
  if (dropout) {
    events.push({ type: 'discontinued', week: endWeek, reason: dropout.reason })
  } else {
    events.push({ type: 'completed', week: endWeek })
  }
  return events
}

export function generatePatients(options: GenerateOptions = {}): Patient[] {
  const seed = options.seed ?? STUDY.defaultSeed
  const count = options.patientCount ?? STUDY.defaultPatientCount
  const rng = mulberry32(seed)

  const drafts: Draft[] = []
  for (let i = 0; i < count; i++) drafts.push(draftPatient(rng))
  drafts.sort((a, b) => a.screeningWeek - b.screeningWeek)

  // Arms are allocated in order of randomization date, per site.
  const allocate = makeArmAllocator(rng)
  const order = drafts
    .map((_, i) => i)
    .filter((i) => !drafts[i].failed)
    .sort((a, b) => drafts[a].decisionWeek - drafts[b].decisionWeek)
  const arms = new Map<number, ArmId>()
  for (const i of order) arms.set(i, allocate(drafts[i].siteId))

  const siteCounters = new Map<number, number>()
  return drafts.map((d, id) => {
    const n = (siteCounters.get(d.siteId) ?? 0) + 1
    siteCounters.set(d.siteId, n)
    const arm = arms.get(id) ?? null
    const events: PatientEvent[] = [{ type: 'screened', week: d.screeningWeek }]
    if (arm === null) {
      events.push({ type: 'screen_failed', week: d.decisionWeek })
    } else {
      events.push({ type: 'randomized', week: d.decisionWeek })
      events.push(...treatmentEvents(rng, arm, d.decisionWeek))
    }
    return {
      id,
      code: `TF301-${String(d.siteId).padStart(2, '0')}-${String(n).padStart(4, '0')}`,
      siteId: d.siteId,
      age: d.age,
      sex: d.sex,
      arm,
      screeningWeek: d.screeningWeek,
      events,
    }
  })
}
