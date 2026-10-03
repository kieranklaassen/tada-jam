// Where each thing of a yard is, in yard units, and which thing a point of
// the yard belongs to. No renderer. The rules say what stands on which spot
// (world.ts); this module says where on the spot, since a boat lies in a pool
// and a cat can nap in the boat. The view draws things here and the game
// lands water here, so what a child touches is what gets wet.

import { BELL, BELL_REACH, SPOTS, THING_REACH, TRUCK, TRUCK_REACH, distance, type Place } from './layout'
import type { Yard } from './world'

/** Where one thing sits relative to the thing it is in, or to the spot it shares. */
export const NEST = {
  /** The boat lies at the right of the pool, leaving the middle to the water and the left to the duck. */
  boatInPool: { x: 0.55, z: 0 },
  /** The cat naps in the middle of the boat. */
  catInBoat: { x: -0.05, z: 0 },
  /** A boat carried over the rim lies aground on the near side of the pool. */
  boatAground: { x: 0.35, z: 1.85 },
  /** The duck's side of the pool. */
  duckInPool: { x: -0.7, z: 0 },
} as const

/** How near a point must be to count as on a thing that is in another. */
export const NESTED_REACH = { boat: 0.45, cat: 0.3 } as const

/** Where the cat sits on the truck: on top of the hose reel at its back, clear of the light and the nozzle, and how high that is. */
export const ROOF: Place = { x: TRUCK.x - 1.67, z: TRUCK.z - 0.04 }
export const ROOF_HEIGHT = 2.47

export type Target = { on: 'thing'; index: number } | { on: 'bell' } | { on: 'truck' } | { on: 'ground' }

/** The middle of a thing, where it is drawn and where water aimed at it lands. A thing on the roof is at the truck. */
export function placeOf(yard: Yard, index: number): Place {
  const thing = yard.things[index]
  if (!thing) return TRUCK
  if (thing.spot === 'roof') return ROOF
  const spot = SPOTS[thing.spot] ?? SPOTS[0]
  if (thing.in !== undefined) {
    const holder = yard.things[thing.in]
    const base = placeOf(yard, thing.in)
    const nest = holder?.kind === 'boat' ? NEST.catInBoat : NEST.boatInPool
    return { x: base.x + nest.x, z: base.z + nest.z }
  }
  // A boat that shares a pool's spot without being in it was carried over the rim.
  const sharesWithPool = thing.kind === 'boat' && yard.things.some((other, at) => at !== index && other.kind === 'pool' && other.spot === thing.spot)
  if (sharesWithPool) return { x: spot.x + NEST.boatAground.x, z: spot.z + NEST.boatAground.z }
  return spot
}

/** How near a point must be to count as on this thing. */
export function reachOf(yard: Yard, index: number): number {
  const thing = yard.things[index]
  if (!thing) return 0
  if (thing.spot === 'roof') return 0
  if (thing.in !== undefined) return thing.kind === 'cat' ? NESTED_REACH.cat : NESTED_REACH.boat
  return thing.kind === 'boat' ? 0.9 : THING_REACH
}

/**
 * What a point of the yard is. The smallest thing whose reach holds the point
 * wins, so a cat in a boat in a pool is the cat, then the boat, then the pool.
 * The truck is itself, and takes no water. Everything else is open ground.
 */
export function targetAt(yard: Yard, x: number, z: number): Target {
  const point = { x, z }
  if (distance(point, TRUCK) <= TRUCK_REACH) return { on: 'truck' }
  let best = -1
  let bestReach = Infinity
  yard.things.forEach((_, index) => {
    const reach = reachOf(yard, index)
    if (reach > 0 && distance(point, placeOf(yard, index)) <= reach && reach < bestReach) {
      best = index
      bestReach = reach
    }
  })
  if (best >= 0) return { on: 'thing', index: best }
  if (distance(point, BELL) <= BELL_REACH) return { on: 'bell' }
  return { on: 'ground' }
}

/** How near the middle of another thing a walker may pass: the widest thing's half width, and the cat's own with her tail out. */
export const WALK_CLEAR = 2.4

function nearestOnWay(from: Place, to: Place, point: Place): number {
  const dx = to.x - from.x, dz = to.z - from.z
  const long = dx * dx + dz * dz
  const share = long === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.z - from.z) * dz) / long))
  return Math.hypot(point.x - (from.x + dx * share), point.z - (from.z + dz * share))
}

/**
 * A way for a walker from one place to another that passes through nothing:
 * straight if the straight way is clear of every place in `others`, or else by
 * one point to the side, the nearer side first. Null when no such way is found:
 * the walker then jumps over.
 */
export function wayRound(from: Place, to: Place, others: readonly Place[]): Place[] | null {
  const clear = (a: Place, b: Place) => others.every((other) => nearestOnWay(a, b, other) >= WALK_CLEAR)
  if (clear(from, to)) return []
  const far = Math.max(0.001, distance(from, to))
  const side = { x: -(to.z - from.z) / far, z: (to.x - from.x) / far }
  for (const out of [2.2, -2.2, 3.2, -3.2, 4.2, -4.2]) {
    for (const along of [0.5, 0.35, 0.65]) {
      const via = { x: from.x + (to.x - from.x) * along + side.x * out, z: from.z + (to.z - from.z) * along + side.z * out }
      // The way stays on the sand, and out of the strip by the near edge.
      if (via.x < 0.8 || via.x > 15.2 || via.z < 1 || via.z > 8.6) continue
      if (clear(from, via) && clear(via, to)) return [via]
    }
  }
  return null
}
