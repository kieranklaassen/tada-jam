import { blocksTurntable, clampWalk, insideWalk, TURNTABLE, WALK, type Point } from './layout'

// How awake critters get around the bench: pick a spot inside the walkable
// area, turn toward it at a limited rate while keeping clear of friends,
// the turntable, and the bench edges, notice when a friend is close
// enough to greet, and never stand in each other: every critter keeps its
// footprint (its body and the parts that stick out) clear of its friends'.
// Pure and allocation-free per step, so it is tested directly and cheap in
// the frame loop.

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
/** Room left between two friends' footprints. */
export const FOOTPRINT_GAP = 1
/** Friends this far apart beyond their footprints are close enough to greet. */
export const MEET_GAP = 6
/** How fast two overlapping footprints are pushed apart, in bench units a second: faster than any gait, never a jump. */
export const SEPARATE_SPEED = 60

/** A new place to walk to: inside the walkable area, a comfortable distance away, not in front of the turntable. */
export function pickTarget(from: Point, rand: Random, out: Point): Point {
  for (let attempt = 0; attempt < 12; attempt++) {
    const x = WALK.minX + 6 + random(rand) * (WALK.maxX - WALK.minX - 12)
    const z = WALK.minZ + 5 + random(rand) * (WALK.maxZ - WALK.minZ - 10)
    const d = Math.hypot(x - from.x, z - from.z)
    if (d > 14 && d < 55 && insideWalk({ x, z }, 5) && !blocksTurntable({ x, z })) {
      out.x = x
      out.z = z
      return out
    }
  }
  clampWalk({ x: from.x + 20, z: from.z }, 6, out)
  if (blocksTurntable(out)) clampWalk({ x: TURNTABLE.x - TURNTABLE.r - 11, z: out.z }, 6, out)
  return out
}

/** Where a critter stands, which way it faces, and how far its footprint reaches from its middle (body and parts, as last drawn). */
export type Mover = { x: number; z: number; heading: number; reach: number }

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
    const range = Math.max(BODY_CLEARANCE * 2, mover.reach + other.reach + MEET_GAP)
    if (od > 0.001 && od < range) {
      const push = (range - od) / range
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
  return Math.hypot(a.x - b.x, a.z - b.z) < meetDistance(a, b)
}

export function meetDistance(a: Mover, b: Mover): number {
  return Math.max(MEET_RADIUS, a.reach + b.reach + MEET_GAP)
}

/** How close two friends' middles may come before their footprints touch. */
export function apartDistance(a: Mover, b: Mover): number {
  return a.reach + b.reach + FOOTPRINT_GAP
}

/**
 * Push apart every pair of the first `count` movers whose footprints overlap, at most
 * SEPARATE_SPEED * dt each step. A pinned mover (landing, waking, lying down, asleep on the
 * turntable: its path is its own) only pushes; the other gives way.
 */
export function separate(movers: readonly Mover[], pinned: readonly boolean[], count: number, dt: number): void {
  const most = SEPARATE_SPEED * dt
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      if (pinned[i] && pinned[j]) continue
      const a = movers[i]
      const b = movers[j]
      let dx = b.x - a.x
      let dz = b.z - a.z
      const d = Math.hypot(dx, dz)
      const overlap = apartDistance(a, b) - d
      if (overlap <= 0) continue
      if (d > 1e-6) {
        dx /= d
        dz /= d
      } else {
        dx = 1
        dz = 0
      }
      const push = Math.min(overlap, most)
      const share = pinned[i] ? 0 : pinned[j] ? 1 : 0.5
      a.x -= dx * push * share
      a.z -= dz * push * share
      b.x += dx * push * (1 - share)
      b.z += dz * push * (1 - share)
      if (share > 0) clampWalk(a, 1, a)
      if (share < 1) clampWalk(b, 1, b)
    }
  }
}

const candidate: Point = { x: 0, z: 0 }

function clearOf(at: Point, reach: number, others: readonly Mover[], count: number): boolean {
  for (let i = 0; i < count; i++) if (Math.hypot(at.x - others[i].x, at.z - others[i].z) < reach + others[i].reach + FOOTPRINT_GAP) return false
  return true
}

/**
 * The nearest spot to `at` (into `out`) inside the walkable area where a footprint of `reach` is clear
 * of the first `count` others, searched on widening rings; `at` itself (kept inside) when the bench is too full.
 */
export function clearSpot(at: Point, reach: number, others: readonly Mover[], count: number, out: Point): Point {
  clampWalk(at, 2, out)
  if (clearOf(out, reach, others, count)) return out
  for (let ring = 1; ring <= 40; ring++) {
    for (let k = 0; k < 24; k++) {
      const angle = (k / 24) * Math.PI * 2
      candidate.x = at.x + Math.sin(angle) * ring * 1.5
      candidate.z = at.z + Math.cos(angle) * ring * 1.5
      if (!insideWalk(candidate, 2) || !clearOf(candidate, reach, others, count)) continue
      out.x = candidate.x
      out.z = candidate.z
      return out
    }
  }
  return out
}

/** The heading from `from` toward `to`. */
export function headingTo(from: Point, to: Point): number {
  return Math.atan2(to.x - from.x, to.z - from.z)
}
