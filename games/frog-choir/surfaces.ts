import { flatRoom, MARGIN, touches } from './bodies'
import type { PondController } from './controller'
import { PAD_RIM, PADS, SHORE_Z } from './layout'

// What lies on the pond's surfaces and what falls onto them: blob shadows
// and splash droplets. Both keep clear of the frogs, measured with
// bodies.ts, so neither ever cuts into one.

/** A blob shadow lies this far above the surface under it. */
export const SHADOW_LIFT = 0.006
/** A shadow squeezed below this share of its size is too small to read, and goes. */
const SHADOW_SMALLEST = 0.35

export type ShadowSpot = { y: number; radius: number }

/**
 * Where a blob shadow `radius` wide, centred at (x, z), lies: a hair above
 * what is under it (the highest pad it reaches, or the water). It shrinks
 * so it never cuts into a frog other than the one casting it (`caster`, or
 * -1 for none) or reaches the shore. Radius 0 when it goes.
 */
export function shadowSpot(c: PondController, x: number, z: number, radius: number, caster: number, out: ShadowSpot): ShadowSpot {
  let y = 0
  for (const pad of PADS) if (Math.hypot(pad.x - x, pad.z - z) < pad.radius * PAD_RIM * c.padSpread[pad.index] + radius) y = Math.max(y, c.padTop[pad.index])
  y += SHADOW_LIFT
  let room = Math.min(radius, z - SHORE_Z - MARGIN)
  for (const frog of c.frogs) if (frog.index !== caster) room = Math.min(room, flatRoom(frog.baseY, frog.shape.top, frog.shape.low, Math.hypot(frog.x - x, frog.z - z), y))
  out.y = y
  out.radius = room < radius * SHADOW_SMALLEST ? 0 : room
  return out
}

/** Whether a droplet of radius `r` has come down on the water, landed on a pad or the shore, or hit a frog other than the one it splashed from. */
export function dropLanded(c: PondController, from: number, x: number, y: number, z: number, r: number, falling: boolean): boolean {
  if ((falling && y - r <= 0) || z - r <= SHORE_Z) return true
  for (const pad of PADS) if (y - r < c.padTop[pad.index] && Math.hypot(pad.x - x, pad.z - z) < pad.radius * PAD_RIM * c.padSpread[pad.index] + r) return true
  for (const frog of c.frogs) if (frog.index !== from && touches(frog.baseY, frog.shape.top, frog.shape.low, Math.hypot(frog.x - x, frog.z - z), y, r)) return true
  return false
}
