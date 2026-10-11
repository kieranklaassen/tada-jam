// A damped spring: the one easing the glade uses, so that everything that is
// pushed overshoots and settles. Pure numbers, stepped by game time.

export type Spring = {
  value: number
  velocity: number
  target: number
  /** How hard it pulls to its target, and how fast it loses speed. */
  stiffness: number
  damping: number
}

export function spring(value: number, stiffness: number, damping: number): Spring {
  return { value, velocity: 0, target: value, stiffness, damping }
}

/** Steps a spring by `dt` seconds, in small steps so a long frame cannot blow it up. */
export function stepSpring(s: Spring, dt: number): void {
  let left = Math.min(dt, 0.1)
  while (left > 0) {
    const h = Math.min(left, 1 / 120)
    s.velocity += ((s.target - s.value) * s.stiffness - s.velocity * s.damping) * h
    s.value += s.velocity * h
    left -= h
  }
}

/** Puts a spring at rest on its target, as a load does: nothing eases in. */
export function settle(s: Spring, at = s.target): void {
  s.value = at
  s.target = at
  s.velocity = 0
}

export function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}
