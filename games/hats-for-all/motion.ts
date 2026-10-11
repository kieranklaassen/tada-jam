import type { CreatureKind } from './kinds'

// How each creature moves: its own tempo, weight and spring, so no two share
// a motion (the motion-personality convention). Pure numbers. The same
// landing, the same breath and the same sway read differently on each body.

export type Personality = {
  /** Breaths a second at rest. */
  tempo: number
  /** How hard its body springs back, and how soon the wobble dies. A soft, lightly damped body wobbles long. */
  stiffness: number
  damping: number
  /** How far it leans from side to side at rest, in radians. */
  sway: number
  /** How deep a hat landing on it squashes it. */
  bounce: number
  /** How high it hops when the floor is poked beside it. */
  hop: number
}

export const PERSONALITY: Record<CreatureKind, Personality> = {
  // A ball: quick, light and springy.
  bop: { tempo: 1.5, stiffness: 260, damping: 8, sway: 0.02, bounce: 0.32, hop: 1.0 },
  // A post with a long neck: slow, and it sways more than it bounces.
  lanky: { tempo: 0.45, stiffness: 70, damping: 5, sway: 0.09, bounce: 0.14, hop: 0.45 },
  // A pear: middling and heavy, it settles at once.
  flop: { tempo: 0.8, stiffness: 150, damping: 10, sway: 0.035, bounce: 0.22, hop: 0.6 },
  // A jelly loaf: very soft and barely damped, so one landing wobbles for seconds.
  wig: { tempo: 0.35, stiffness: 46, damping: 3.2, sway: 0.012, bounce: 0.3, hop: 0.3 },
  // A bean on big feet: very quick and jittery.
  pip: { tempo: 2.4, stiffness: 420, damping: 17, sway: 0.05, bounce: 0.2, hop: 1.4 },
}

/** A value on a spring: where it is and how fast it moves. */
export type Spring = { x: number; v: number }

/** Moves a spring towards its target by `dt` seconds, in small fixed steps so a slow frame cannot blow it up. */
export function stepSpring(spring: Spring, target: number, stiffness: number, damping: number, dt: number): void {
  let left = Math.min(dt, 0.1)
  while (left > 1e-6) {
    const h = Math.min(left, 1 / 240)
    spring.v += (stiffness * (target - spring.x) - damping * spring.v) * h
    spring.x += spring.v * h
    left -= h
  }
}

/** A number between 0 and 1 that is always the same for the same `n`: chance in ordinary detail, with no random stream to share. */
export function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}
