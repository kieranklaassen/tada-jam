// The geometry behind the model, kept free of three.js so it can be tested.
//
// Everything is measured as the moon's elongation: the angle between the sun
// and the moon as seen from Earth. 0 is new moon (moon between Earth and sun),
// π is full moon (Earth between them). The moon orbits counter-clockwise seen
// from above the north pole, so a growing angle is a waxing moon, lit on the
// right for someone in the northern hemisphere.

export const TAU = Math.PI * 2
export const PHASE_COUNT = 8

/** Wraps any angle into [0, 2π). */
export function wrap(angle: number): number {
  const a = angle % TAU
  return a < 0 ? a + TAU : a
}

/** Fraction of the visible disc that is lit, 0 at new moon and 1 at full. */
export function litFraction(elongation: number): number {
  return (1 - Math.cos(elongation)) / 2
}

export function isWaxing(elongation: number): boolean {
  const a = wrap(elongation)
  return a > 0 && a < Math.PI
}

/** Which of the eight named phases the angle is closest to (0 new … 4 full … 7 waning crescent). */
export function phaseIndex(elongation: number): number {
  return Math.round(wrap(elongation) / (TAU / PHASE_COUNT)) % PHASE_COUNT
}

export function phaseAngle(index: number): number {
  return (((index % PHASE_COUNT) + PHASE_COUNT) % PHASE_COUNT) * (TAU / PHASE_COUNT)
}

/** Signed shortest turn from one angle to another, in (-π, π]. */
export function shortestTurn(from: number, to: number): number {
  const d = wrap(to - from)
  return d > Math.PI ? d - TAU : d
}

/** World position on the orbit. The sun sits along −x, so elongation 0 points at it. */
export function orbitPoint(elongation: number, radius: number): { x: number; z: number } {
  const angle = Math.PI + elongation
  return { x: radius * Math.cos(angle), z: -radius * Math.sin(angle) }
}

/** Inverse of orbitPoint: the elongation of any point on the orbit plane. */
export function elongationAt(x: number, z: number): number {
  return wrap(Math.atan2(-z, x) - Math.PI)
}

/**
 * SVG path for the lit part of a moon of radius r centred on (0, 0), as seen
 * from the northern hemisphere. Returns an empty string at new moon.
 */
export function litPath(elongation: number, r: number): string {
  const a = wrap(elongation)
  const fraction = litFraction(a)
  if (fraction < 0.004) return ''
  if (fraction > 0.996) return `M0 ${-r}A${r} ${r} 0 1 1 0 ${r}A${r} ${r} 0 1 1 0 ${-r}Z`
  // The terminator is a half-ellipse; its bulge shrinks to a straight line at quarter moon.
  const bulge = Math.cos(a)
  const rx = Math.abs(bulge) * r
  const waxing = a < Math.PI
  const side = waxing ? 1 : 0
  // Crescent: the terminator bows towards the lit limb. Gibbous: away from it.
  const back = (bulge > 0) === waxing ? 0 : 1
  const f = (n: number) => Number(n.toFixed(3))
  return `M0 ${f(-r)}A${f(r)} ${f(r)} 0 0 ${side} 0 ${f(r)}A${f(rx)} ${f(r)} 0 0 ${back} 0 ${f(-r)}Z`
}
