import { ENDS, FRIEND_IDS, FRIENDS, GRID, PLANK, SAND, WAITING_PLACE, endOnSide, homeOn, standable, standablePlaces, type End, type FriendId, type Spot } from './world'

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

/** The arrangement with one friend taken out of wherever it is: in the hand, on its way. Not sound by itself. */
export function lift(a: Arrangement, id: FriendId): Arrangement {
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

/** How near two friends may stand in the sand: their two radii, a tenth more for the belly each has below its middle, and a little air. */
export function elbowRoom(a: FriendId, b: FriendId): number {
  return (FRIENDS[a].radius + FRIENDS[b].radius) * 1.1 + 0.05
}
/** The waiting place is kept clear for whoever waits there, or will: nobody stands within this of it, plus their own radius. */
export const WAITING_CLEAR = 1.15

function clear(a: Arrangement, id: FriendId, at: Spot, spare = 0): boolean {
  const radius = FRIENDS[id].radius
  if (Math.hypot(at.x - WAITING_PLACE.x, at.z - WAITING_PLACE.z) < radius + WAITING_CLEAR) return false
  for (const other of FRIEND_IDS) {
    const there = a.sand[other]
    if (other === id || !there) continue
    if (Math.hypot(at.x - there.x, at.z - there.z) < elbowRoom(id, other) + spare) return false
  }
  return true
}

/** The room a friend moved to the nearest free place keeps beyond bare elbow room, where there is any. */
export const SPARE_ROOM = 0.15
/** And how much further off than the nearest free place such a roomier place may lie. */
export const SPARE_STEP = 0.3

/**
 * Nearest place to `spot` where this friend stands clear of the plank, the
 * rim, the waiting place and the others in the sand: of every place on the
 * grid, the one nearest to where the friend was let go. The answer is the
 * same every time and always exists.
 */
export function freeSpot(a: Arrangement, id: FriendId, spot: Spot): Spot {
  const radius = FRIENDS[id].radius
  const first = standable(spot, radius)
  // Where it was let go, if a friend may stand there: the common case, and the one a saved place always is.
  if (Math.hypot(first.x - spot.x, first.z - spot.z) < GRID && clear(a, id, first)) return first
  // Else the nearest of every place it may stand, measured from where it was let go, whichever way that lies.
  let best: Spot | null = null, bestApart = Infinity
  for (const at of standablePlaces(radius)) {
    const apart = Math.hypot(at.x - spot.x, at.z - spot.z)
    if (apart >= bestApart - 1e-9 || !clear(a, id, at)) continue
    best = at
    bestApart = apart
  }
  if (!best) return first
  // A place with a little room to spare is taken instead when one lies hardly further off: two neighbours crouching
  // to hop at once spread wider than they stand. Never at the price of a real step away from where it was let go.
  let roomy: Spot | null = null, roomyApart = bestApart + SPARE_STEP
  for (const at of standablePlaces(radius)) {
    const apart = Math.hypot(at.x - spot.x, at.z - spot.z)
    if (apart >= roomyApart - 1e-9 || !clear(a, id, at, SPARE_ROOM)) continue
    roomy = at
    roomyApart = apart
  }
  return roomy ?? best
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

/** How far past the board's tip a friend let go still lands on that end: over the board, and a little past its edge. Further out it is over sand. */
export const CATCH_PAST = 0.25
/** How near an end's seat, along the plank, a friend let go lands on that end and does not slide. */
export const CATCH = 1.75
/**
 * How far in front of or behind the plank's line a friend let go still lands on it: over the board itself, and a
 * little past its edges. A friend carried by the finger hangs over the board's line when the finger is on the board
 * or on a friend who sits on it; let go over the sand beside the plank, it is over sand.
 */
export const CATCH_DEPTH = PLANK.halfWidth + 0.25
/**
 * A friend let go at (x, z) over the tray, with the plank resting as `a` has
 * it. Over an end it lands there; over the middle it slides to the low end,
 * or on a level plank to the nearer one; anywhere else it stands in the sand.
 */
export function drop(a: Arrangement, id: FriendId, x: number, z: number): { arrangement: Arrangement; slid: boolean } {
  const without = lift(a, id)
  if (Math.abs(z - PLANK.z) <= CATCH_DEPTH && Math.abs(x) <= PLANK.halfLength + CATCH_PAST) {
    const near: End = endOnSide(x)
    if (Math.abs(Math.abs(x) - PLANK.seat) <= CATCH) return { arrangement: putOnEnd(a, id, near), slid: false }
    return { arrangement: putOnEnd(a, id, lowEnd(without) ?? near), slid: true }
  }
  return { arrangement: putInSand(a, id, { x, z }), slid: false }
}

/** Who Dot is with: everyone else on the plank when it is on the plank, or whoever stands in the sand within a body's width of it. */
export function companyOf(a: Arrangement, id: FriendId = 'dot'): FriendId[] {
  const place = placeOf(a, id)
  if (place.at === 'end') return [...a.left, ...a.right].filter((other) => other !== id)
  const here = standsAt(a, id)
  return FRIEND_IDS.filter((other) => {
    if (other === id || placeOf(a, other).at === 'end') return false
    const spot = standsAt(a, other)
    return Math.hypot(spot.x - here.x, spot.z - here.z) <= FRIENDS[id].radius * 3 + FRIENDS[other].radius
  })
}

/** Dot is in company: on the plank with anyone else on it, or in the sand within a body's width of another friend standing there. */
export function inCompany(a: Arrangement, id: FriendId = 'dot'): boolean {
  return companyOf(a, id).length > 0
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
