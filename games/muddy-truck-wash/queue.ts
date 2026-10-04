import { LADDER } from './config'
import { ROSTER, vehicle, whoNext } from './cycle'
import { arrive } from './mud'
import { LAYOUT, groundAt } from './props'
import type { VehicleId } from './roster'
import { silhouette } from './silhouette'
import type { Surface } from './surface'

// The queue in the yard: the two vehicles of the roster that are neither in
// the bay nor at the door wait their turn on the hill, where they can be
// seen and no tool can reach them. Who they are follows from who is in the
// bay and who is at the door, so nothing about them is saved. Pure.

/** The two that wait, the one that comes to the door next first. */
export function queueOf(bay: VehicleId, next: VehicleId): VehicleId[] {
  const [first] = whoNext(1, [next, bay])
  const others = ROSTER.map((def) => def.id).filter((id) => id !== bay && id !== next && id !== first)
  return first === bay || first === next ? others.slice(0, 2) : [first, ...others].slice(0, 2)
}

/** A tyre's tread stands this far out from its round: on the hill a vehicle stands on its treads, not in the dirt. */
export const TREAD = 0.09

/** Where a place in the queue is, how far the vehicle there is turned toward the bay, and how high it stands: on the hill's top, on its treads. */
export function queueSpot(place: number): { x: number; z: number; turn: number; ground: number } {
  const spot = LAYOUT.queue[Math.max(0, Math.min(LAYOUT.queue.length - 1, place))]
  return { ...spot, ground: groundAt(spot.x, spot.z) + TREAD }
}

/**
 * What a vehicle wears while it waits in the queue: fresh splashes, the same
 * for the same vehicle every time. It is not the mud it comes to the door
 * with, which is laid out only when its turn comes; nobody can touch it here.
 */
export function queueMud(who: VehicleId): Surface {
  return arrive(silhouette(vehicle(who)), LADDER[0], 0x51ab + ROSTER.findIndex((def) => def.id === who) * 0x9e37)
}
