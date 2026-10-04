// Small numbers for things in motion: a spring, a hop, a scatter. No DOM, no
// clock and no chance of its own: time comes in as seconds, and what looks
// random comes from `scatter`, which gives the same number for the same seed.

/** A value on a spring: where it is and how fast it moves. */
export type Spring = { x: number; v: number }

const SUBSTEP = 1 / 120

/**
 * Moves a spring towards its target for `dt` seconds. `stiffness` is how hard
 * it pulls and `damping` how fast it calms; it is stepped in small fixed
 * pieces so a long frame does not blow it up.
 */
export function stepSpring(spring: Spring, target: number, stiffness: number, damping: number, dt: number): void {
  let left = Math.min(Math.max(dt, 0), 0.25)
  while (left > 1e-6) {
    const h = Math.min(SUBSTEP, left)
    spring.v += (-stiffness * (spring.x - target) - damping * spring.v) * h
    spring.x += spring.v * h
    left -= h
  }
}

/** Whether a spring has come to rest at its target. */
export function atRest(spring: Spring, target: number, within = 0.002): boolean {
  return Math.abs(spring.x - target) < within && Math.abs(spring.v) < within * 8
}

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t
}

/** Fast at first, slow to arrive. */
export function easeOut(t: number): number {
  const u = 1 - clamp01(t)
  return 1 - u * u * u
}

/** Slow, fast, slow. */
export function easeInOut(t: number): number {
  const u = clamp01(t)
  return u * u * (3 - 2 * u)
}

/** Past the end and back: for something that pops into place. */
export function overshoot(t: number, amount = 1.6): number {
  const u = clamp01(t) - 1
  return 1 + u * u * ((amount + 1) * u + amount)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** A point on a hop from one place to another: straight across, with a rise of `lift` at the middle. */
export function hop(fromX: number, fromY: number, toX: number, toY: number, lift: number, t: number): { x: number; y: number } {
  const u = clamp01(t)
  return { x: lerp(fromX, toX, u), y: lerp(fromY, toY, u) - lift * 4 * u * (1 - u) }
}

/** A number from 0 up to 1 that depends only on the two numbers given: the same every time. */
export function scatter(seed: number, index: number): number {
  let h = Math.imul((seed | 0) ^ 0x51ed270b, 0x9e3779b1) ^ Math.imul((index | 0) + 0x7f4a7c15, 0x85ebca6b)
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d)
  h ^= h >>> 12
  h = Math.imul(h, 0x297a2d39)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}
