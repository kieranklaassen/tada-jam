import { ENDS, FRIEND_IDS, FRIENDS, PLANK, SAND, WAITING_PLACE, endOnSide, homeOn, standable, type End, type FriendId, type Spot } from './world'

// Who is where: the model of the world, and the only thing the plank reads.
// Pure. Each end holds a stack, bottom first; everyone else stands in the
// sand, or at the waiting place. The tilt follows the two totals and nothing
// else: heavier end down, equal totals level.

export type Arrangement = {
  left: FriendId[]
  right: FriendId[]
  /** Where each friend who is not on the plank stands. The friend at the waiting place has no entry. */
  sand: Partial<Record<FriendId, Spot>>
  waiting: FriendId | null
}

export type Place = { at: 'end'; end: End; level: number } | { at: 'sand'; spot: Spot } | { at: 'waiting' }

export function emptyArrangement(): Arrangement {
  const sand: Partial<Record<FriendId, Spot>> = {}
  for (const id of FRIEND_IDS) sand[id] = homeOn(id, 'right')
  return { left: [], right: [], sand, waiting: null }
}

export function copy(a: Arrangement): Arrangement {
  const sand: Partial<Record<FriendId, Spot>> = {}
  for (const id of FRIEND_IDS) if (a.sand[id]) sand[id] = { ...a.sand[id]! }
  return { left: [...a.left], right: [...a.right], sand, waiting: a.waiting }
}

export function placeOf(a: Arrangement, id: FriendId): Place {
  for (const end of ENDS) {
    const level = a[end].indexOf(id)
    if (level >= 0) return { at: 'end', end, level }
  }
  if (a.waiting === id) return { at: 'waiting' }
  return { at: 'sand', spot: a.sand[id] ?? homeOn(id, 'right') }
}

export function weightOn(a: Arrangement, end: End, without: FriendId | null = null): number {
  return a[end].reduce((sum, id) => sum + (id === without ? 0 : FRIENDS[id].weight), 0)
}

/** Which way the plank rests: 1 right end down, -1 left end down, 0 level. `without` is a friend lifted off by the finger. */
export function lean(a: Arrangement, without: FriendId | null = null): -1 | 0 | 1 {
  const left = weightOn(a, 'left', without), right = weightOn(a, 'right', without)
  return right > left ? 1 : right < left ? -1 : 0
}

/** The end that is down, or null when the plank is level. */
export function lowEnd(a: Arrangement): End | null {
  const way = lean(a)
  return way === 0 ? null : way > 0 ? 'right' : 'left'
}

/** Where a friend stands in the tray, on the level: its seat, its spot in the sand, or the waiting place. */
export function standsAt(a: Arrangement, id: FriendId): Spot {
  const place = placeOf(a, id)
  if (place.at === 'end') return { x: place.end === 'left' ? -PLANK.seat : PLANK.seat, z: PLANK.z }
  if (place.at === 'waiting') return { ...WAITING_PLACE }
  return place.spot
}

function lift(a: Arrangement, id: FriendId): Arrangement {
  const next = copy(a)
  next.left = next.left.filter((other) => other !== id)
  next.right = next.right.filter((other) => other !== id)
  delete next.sand[id]
  if (next.waiting === id) next.waiting = null
  return next
}

/** The friend goes onto an end, on top of whoever sits there. */
export function putOnEnd(a: Arrangement, id: FriendId, end: End): Arrangement {
  const next = lift(a, id)
  next[end].push(id)
  return next
}

/** The friend stands in the sand, at the nearest free place to `spot`. */
export function putInSand(a: Arrangement, id: FriendId, spot: Spot): Arrangement {
  const next = lift(a, id)
  next.sand[id] = freeSpot(next, id, spot)
  return next
}

/** Nearest place to `spot` where this friend stands clear of the plank, the waiting place and the others in the sand. */
export function freeSpot(a: Arrangement, id: FriendId, spot: Spot): Spot {
  const radius = FRIENDS[id].radius
  let at = standable(spot, radius)
  const others: { spot: Spot; radius: number }[] = []
  for (const other of FRIEND_IDS) if (other !== id && a.sand[other]) others.push({ spot: a.sand[other]!, radius: FRIENDS[other].radius })
  // The waiting place is kept clear for whoever waits there, or will.
  others.push({ spot: WAITING_PLACE, radius: 0.9 })
  for (let pass = 0; pass < 12; pass++) {
    let moved = false
    for (const other of others) {
      const dx = at.x - other.spot.x, dz = at.z - other.spot.z
      const gap = radius + other.radius + 0.06, apart = Math.hypot(dx, dz)
      if (apart >= gap) continue
      // Straight away from the other; from dead centre, away toward the nearer rim.
      const ux = apart > 1e-3 ? dx / apart : at.x >= 0 ? 1 : -1, uz = apart > 1e-3 ? dz / apart : 0
      at = standable({ x: other.spot.x + ux * gap, z: other.spot.z + uz * gap }, radius)
      moved = true
    }
    if (!moved) break
    // Pinned against a rim or the plank: slide along instead.
    if (pass >= 6) at = standable({ x: at.x + (at.x >= 0 ? -1 : 1) * 0.45, z: at.z }, radius)
  }
  return at
}

/**
 * A tap. A friend in the sand hops onto the end on its own side; a friend on
 * the plank hops off into the sand on that side, and whoever sat on it comes
 * down one place. A tap on the friend at the waiting place is the game's to
 * answer (it begins the next ride), so it changes nothing here.
 */
export function tap(a: Arrangement, id: FriendId): Arrangement {
  const place = placeOf(a, id)
  if (place.at === 'waiting') return a
  if (place.at === 'end') return putInSand(a, id, homeOn(id, place.end))
  return putOnEnd(a, id, endOnSide(place.spot.x))
}

/** How near an end's seat, along the plank, a friend let go still lands on that end. */
export const CATCH = 1.75
/** How far in front of or behind the plank a friend let go still lands on it. */
export const CATCH_DEPTH = 1.5

/**
 * A friend let go at (x, z) over the tray, with the plank resting as `a` has
 * it. Over an end it lands there; over the middle it slides to the low end,
 * or on a level plank to the nearer one; anywhere else it stands in the sand.
 */
export function drop(a: Arrangement, id: FriendId, x: number, z: number): { arrangement: Arrangement; slid: boolean } {
  const without = lift(a, id)
  if (Math.abs(z - PLANK.z) <= CATCH_DEPTH && Math.abs(x) <= PLANK.seat + CATCH) {
    const near: End = endOnSide(x)
    if (Math.abs(Math.abs(x) - PLANK.seat) <= CATCH) return { arrangement: putOnEnd(a, id, near), slid: false }
    return { arrangement: putOnEnd(a, id, lowEnd(without) ?? near), slid: true }
  }
  return { arrangement: putInSand(a, id, { x, z }), slid: false }
}

/** Dot is in company: on the plank with anyone else on it, or in the sand within a body's width of another friend standing there. */
export function inCompany(a: Arrangement, id: FriendId = 'dot'): boolean {
  const place = placeOf(a, id)
  if (place.at === 'end') return a.left.length + a.right.length > 1
  const here = standsAt(a, id)
  for (const other of FRIEND_IDS) {
    if (other === id) continue
    const there = placeOf(a, other)
    if (there.at === 'end') continue
    const spot = standsAt(a, other)
    if (Math.hypot(spot.x - here.x, spot.z - here.z) <= FRIENDS[id].radius * 3 + FRIENDS[other].radius) return true
  }
  return false
}

/** True when every friend is in exactly one place and every spot is inside the tray. */
export function isSound(a: Arrangement): boolean {
  for (const id of FRIEND_IDS) {
    const places = (a.left.includes(id) ? 1 : 0) + (a.right.includes(id) ? 1 : 0) + (a.sand[id] ? 1 : 0) + (a.waiting === id ? 1 : 0)
    if (places !== 1) return false
    const spot = a.sand[id]
    if (spot && (Math.abs(spot.x) > SAND.maxX || spot.z > SAND.maxZ || spot.z < SAND.minZ)) return false
  }
  return new Set(a.left).size === a.left.length && new Set(a.right).size === a.right.length
}
