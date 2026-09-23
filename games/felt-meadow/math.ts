// Small numeric helpers shared by the meadow's life and its geometry.

export type Spring = { x: number; v: number }

/**
 * The longest step a stiff, well-damped spring may take. Stepped this way, a
 * spring of stiffness k and damping c stops settling and flips past its
 * target every step once k·dt² + 2c·dt reaches 4, which the held seed
 * (520, 27) does at 20 fps, the slowest frame the meadow steps. Frames slower
 * than 50 fps are split for such springs; faster ones are one step as tuned.
 */
export const STEADY_STEP = 1 / 50

/** How many equal substeps `dt` needs so that none is longer than `maxStep`. */
export function substeps(dt: number, maxStep: number): number {
  return Math.max(1, Math.ceil(dt / maxStep))
}

/** A semi-implicit Euler step of a damped spring toward `target` (split into substeps no longer than `maxStep`); returns the new position. */
export function spring(s: Spring, target: number, dt: number, stiffness: number, damping: number, maxStep = Infinity): number {
  const steps = substeps(dt, maxStep)
  const h = dt / steps
  for (let i = 0; i < steps; i++) {
    s.v += (stiffness * (target - s.x) - damping * s.v) * h
    s.x += s.v * h
  }
  return s.x
}

/** The same spring in substeps of at most 1/240 s, so a stiff spring overshoots the same at 30 fps as at 60. */
export function stiffSpring(s: Spring, target: number, dt: number, stiffness: number, damping: number): number {
  return spring(s, target, dt, stiffness, damping, 1 / 240)
}

/** `current` eased toward `target` by `dt * rate` of the gap (the whole gap on a long frame). */
export function toward(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * Math.min(1, dt * rate)
}

/** An angle in radians brought into (-π, π], so turning by it takes the short way round. */
export function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}

export function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value))
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** A small seeded random source (mulberry32) in [0, 1): the same seed gives the same sequence on every run. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
