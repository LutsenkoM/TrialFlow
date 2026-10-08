export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/** Quadratic bezier, one axis. */
export const quad = (a: number, c: number, b: number, t: number) => {
  const u = 1 - t
  return u * u * a + 2 * u * t * c + t * t * b
}

export function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff
  const ag = (a >> 8) & 0xff
  const ab = a & 0xff
  const r = ar + (((b >> 16) & 0xff) - ar) * t
  const g = ag + (((b >> 8) & 0xff) - ag) * t
  const bl = ab + ((b & 0xff) - ab) * t
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (bl & 0xff)
}
