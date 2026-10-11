// Springs for everything that has weight: the truck on its wheels, the nozzle
// swinging round, a thing that squashes when water lands on it. Numbers only,
// no renderer. A spring is stepped on game time, and a long frame is cut into
// short steps so a slow device plays the same motion as a fast one.

export type Spring = {
  /** Where it is. */
  value: number
  /** How fast it is moving. */
  velocity: number
  /** Where it is going. */
  target: number
}

/** How a spring feels: `stiffness` is how hard it pulls, `damping` how soon it settles. */
export type Feel = { readonly stiffness: number; readonly damping: number }

/** No single step is longer than this, in seconds. */
export const LONGEST_STEP_S = 1 / 120

export function spring(value = 0): Spring {
  return { value, velocity: 0, target: value }
}

/** Moves a spring on by `seconds`. It changes the spring it is given and returns it. */
export function stepSpring(s: Spring, feel: Feel, seconds: number): Spring {
  if (!(seconds > 0)) return s
  const steps = Math.ceil(seconds / LONGEST_STEP_S)
  const dt = seconds / steps
  for (let i = 0; i < steps; i++) {
    s.velocity += (feel.stiffness * (s.target - s.value) - feel.damping * s.velocity) * dt
    s.value += s.velocity * dt
  }
  return s
}

/** A push: the spring is knocked and comes back by itself. */
export function kick(s: Spring, impulse: number): Spring {
  s.velocity += impulse
  return s
}

/** At rest: where it is going, and still. */
export function settled(s: Spring, within = 0.001): boolean {
  return Math.abs(s.target - s.value) < within && Math.abs(s.velocity) < within
}

/**
 * How far past its target a spring of this feel swings, as a share of the
 * distance it was sent: 0 for one that creeps in, about 0.16 for a lively one.
 */
export function overshootOf(feel: Feel): number {
  const ratio = feel.damping / (2 * Math.sqrt(feel.stiffness))
  if (ratio >= 1) return 0
  return Math.exp((-Math.PI * ratio) / Math.sqrt(1 - ratio * ratio))
}

/** Follows a target with a lag and no overshoot: the landing point of a hose trailing the finger. */
export function follow(value: number, target: number, lagSeconds: number, seconds: number): number {
  if (!(seconds > 0)) return value
  if (!(lagSeconds > 0)) return target
  return target + (value - target) * Math.exp(-seconds / lagSeconds)
}
