import { clampWalk, insideWalk, TURNTABLE, WALK, type Point } from './layout'

// How awake critters get around the bench: pick a spot inside the walkable
// area, turn toward it at a limited rate while keeping clear of friends,
// the turntable, and the bench edges, and notice when a friend is close
// enough to greet. Pure and allocation-free per step, so it is tested
// directly and cheap in the frame loop.

export type Random = { s: number }

/** A small seeded generator (mulberry32) that lives in a plain object. */
export function random(state: Random): number {
  state.s = (state.s + 0x6d2b79f5) >>> 0
  let t = state.s
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const BODY_CLEARANCE = 9
export const MEET_RADIUS = 21
export const ARRIVE_RADIUS = 3

/** A new place to walk to: inside the walkable area, a comfortable distance away. */
export function pickTarget(from: Point, rand: Random, out: Point): Point {
  for (let attempt = 0; attempt < 12; attempt++) {
    const x = WALK.minX + 6 + random(rand) * (WALK.maxX - WALK.minX - 12)
    const z = WALK.minZ + 5 + random(rand) * (WALK.maxZ - WALK.minZ - 10)
    const d = Math.hypot(x - from.x, z - from.z)
    if (d > 14 && d < 55 && insideWalk({ x, z }, 5)) {
      out.x = x
      out.z = z
      return out
    }
  }
  return clampWalk({ x: from.x + 20, z: from.z }, 6, out)
}

export type Mover = { x: number; z: number; heading: number }

function wrap(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}

/**
 * Turn `mover` toward `target`, pushed away from friends, the turntable,
 * and the edges; returns the new heading. Heading 0 faces +z (toward the child).
 */
export function steer(mover: Mover, target: Point, others: readonly Mover[], count: number, turnRate: number, dt: number): number {
  let dx = target.x - mover.x
  let dz = target.z - mover.z
  const d = Math.hypot(dx, dz) || 1
  dx /= d
  dz /= d
  for (let i = 0; i < count; i++) {
    const other = others[i]
    if (other === mover) continue
    const ox = mover.x - other.x
    const oz = mover.z - other.z
    const od = Math.hypot(ox, oz)
    if (od > 0.001 && od < BODY_CLEARANCE * 2) {
      const push = (BODY_CLEARANCE * 2 - od) / (BODY_CLEARANCE * 2)
      dx += (ox / od) * push * 1.6
      dz += (oz / od) * push * 1.6
    }
  }
  const tx = mover.x - TURNTABLE.x
  const tz = mover.z - TURNTABLE.z
  const td = Math.hypot(tx, tz)
  const ring = WALK.turntableClearance + 7
  if (td < ring && td > 0.001) {
    const push = (ring - td) / 7
    dx += (tx / td) * push
    dz += (tz / td) * push
  }
  const edge = 6
  if (mover.x < WALK.minX + edge) dx += (WALK.minX + edge - mover.x) / edge
  if (mover.x > WALK.maxX - edge) dx -= (mover.x - (WALK.maxX - edge)) / edge
  if (mover.z < WALK.minZ + edge) dz += (WALK.minZ + edge - mover.z) / edge
  if (mover.z > WALK.maxZ - edge) dz -= (mover.z - (WALK.maxZ - edge)) / edge
  const desired = Math.atan2(dx, dz)
  const turn = wrap(desired - mover.heading)
  const limit = turnRate * dt
  return wrap(mover.heading + Math.max(-limit, Math.min(limit, turn)))
}

const stepped: Point = { x: 0, z: 0 }

/** Move `mover` along its heading by `distance` (negative steps back), staying inside the walkable area. */
export function advance(mover: Mover, distance: number): void {
  stepped.x = mover.x + Math.sin(mover.heading) * distance
  stepped.z = mover.z + Math.cos(mover.heading) * distance
  clampWalk(stepped, 1, mover)
}

export function arrived(mover: Mover, target: Point): boolean {
  return Math.hypot(target.x - mover.x, target.z - mover.z) < ARRIVE_RADIUS
}

/** Two friends close enough to greet each other. */
export function meeting(a: Mover, b: Mover): boolean {
  return Math.hypot(a.x - b.x, a.z - b.z) < MEET_RADIUS
}

/** The heading from `from` toward `to`. */
export function headingTo(from: Point, to: Point): number {
  return Math.atan2(to.x - from.x, to.z - from.z)
}
