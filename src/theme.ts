import type { ArmId, DiscontinuationReason } from './data/types'

/**
 * Design tokens shared by the Pixi scene and React UI.
 * CSS mirrors live in styles/tokens.css — keep both in sync.
 */
export const colors = {
  bg: 0x060a14,
  bgRaised: 0x0b1222,
  ink: 0xe8edf7,
  inkMuted: 0x8b95ab,
  inkFaint: 0x4a5470,
  line: 0x1e2942,
  neutral: 0xa4adc2,
  screenFail: 0x59627a,
  arms: {
    placebo: 0x3fd8ff,
    low: 0xa07cff,
    high: 0xffb547,
  } satisfies Record<ArmId, number>,
  reasons: {
    adverse_event: 0xff6b8b,
    lack_of_efficacy: 0x8a93c4,
    withdrawal: 0xc2a1ff,
    lost_to_follow_up: 0x4f8a97,
  } satisfies Record<DiscontinuationReason, number>,
  success: 0x5cf2b0,
} as const

export const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`

export const armCss: Record<ArmId, string> = {
  placebo: hex(colors.arms.placebo),
  low: hex(colors.arms.low),
  high: hex(colors.arms.high),
}

export const reasonCss: Record<DiscontinuationReason, string> = {
  adverse_event: hex(colors.reasons.adverse_event),
  lack_of_efficacy: hex(colors.reasons.lack_of_efficacy),
  withdrawal: hex(colors.reasons.withdrawal),
  lost_to_follow_up: hex(colors.reasons.lost_to_follow_up),
}

export const fonts = {
  sans: '"Inter Variable", Inter, system-ui, sans-serif',
  mono: '"JetBrains Mono Variable", ui-monospace, monospace',
} as const

export const space = (n: number) => n * 8

export const radii = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const

/** Seconds — GSAP uses seconds; `motion` takes seconds too. */
export const durations = {
  fast: 0.18,
  base: 0.32,
  slow: 0.6,
  scene: 0.9,
  intro: 2.6,
} as const

/** Cubic-bezier control points for `motion`, plus GSAP ease names with the same feel. */
export const easings = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
  gsapOut: 'expo.out',
  gsapInOut: 'power3.inOut',
} as const

export const springs = {
  press: { type: 'spring', stiffness: 520, damping: 30 },
  panel: { type: 'spring', stiffness: 260, damping: 32 },
} as const
