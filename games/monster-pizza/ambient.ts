import { DOOR, OVEN } from './layout'

// What goes on at the edges and has nothing to do with the job: clouds over
// the street, a bird that crosses the doorway now and then, the fire in the
// oven, smoke from its chimney. Pure: where each is at a game time, for the
// view to stamp. All of it stands still when the game does, since the time
// is the attended clock's.

export type Drift = { x: number; y: number; size: number; alpha: number; turn: number }

const TAU = Math.PI * 2

/** Two clouds drifting across the doorway, slowly, one behind the other. */
export function clouds(t: number): Drift[] {
  const span = DOOR.w + 240, left = DOOR.x - DOOR.w / 2 - 120
  return [0, 1].map((i) => ({ x: left + ((t * (9 + i * 5) + i * 230) % span), y: DOOR.y + 70 + i * 62, size: 1 - i * 0.28, alpha: 1, turn: 0 }))
}

/** A bird crosses the doorway every dozen seconds, right to left, flapping. Null while it is away. */
export function bird(t: number): (Drift & { flap: number }) | null {
  const u = (t % 12) / 4
  if (u >= 1) return null
  const right = DOOR.x + DOOR.w / 2 + 40, left = DOOR.x - DOOR.w / 2 - 40
  return { x: right + (left - right) * u, y: DOOR.y + 150 + Math.sin(u * TAU * 1.5) * 18, size: 1, alpha: 1, turn: 0, flap: Math.sin(t * TAU * 3.2) }
}

/**
 * The fire: three tongues on the logs in the oven's mouth, each flickering to
 * its own beat, never still and never the same. `glow` 0 to 1 is how hard the
 * oven is working: baking, the fire stands taller.
 */
export function flames(t: number, glow: number): Drift[] {
  const foot = OVEN.y + OVEN.h * 0.25
  return [-1, 0, 1].map((k, i) => {
    const flick = 0.5 + 0.25 * Math.sin(t * TAU * (1.7 + i * 0.6) + i * 2.1) + 0.15 * Math.sin(t * TAU * (4.3 + i) + i)
    return { x: OVEN.x + k * OVEN.w * 0.13 + Math.sin(t * TAU * 0.9 + i * 1.7) * 3, y: foot, size: (i === 1 ? 0.9 : 0.66) * (0.7 + flick * 0.5) * (1 + glow * 0.45), alpha: 1, turn: 0.1 * Math.sin(t * TAU * (1.1 + i * 0.4) + i) }
  })
}

/** Smoke from the chimney: three curls rising one after another, growing and thinning as they go. */
export function smoke(t: number): Drift[] {
  const x = OVEN.x + OVEN.w * 0.26, top = OVEN.y - OVEN.h * 0.68
  return [0, 1, 2].map((i) => {
    const u = (t / 3.3 + i / 3) % 1
    return { x: x + Math.sin(u * TAU + i) * 12 + u * 16, y: top - 8 - u * 96, size: 0.6 + u * 0.9, alpha: Math.sin(u * Math.PI) * 0.8, turn: u * 1.4 }
  })
}

/** A puff of flour where a piece landed: how big and how faint, `age` seconds after. Gone after `PUFF_LASTS`. */
export const PUFF_LASTS = 0.55
/** The cloud the oven hiccups out hangs a little longer. */
export const CLOUD_LASTS = 0.9
export function puff(age: number, lasts = PUFF_LASTS): { size: number; alpha: number } {
  const u = Math.min(1, Math.max(0, age / lasts))
  return { size: 0.5 + u * 1.1, alpha: (1 - u) * 0.95 }
}
