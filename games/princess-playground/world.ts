// The tray, the plank and the four friends, as numbers. Pure: no renderer and
// no DOM. Lengths are in tray units (the tray is 12 wide); x runs left to
// right, z from the far rim (negative) toward the child, y up from the sand.

export type FriendId = 'pim' | 'mog' | 'dot' | 'bo'
export type End = 'left' | 'right'

export const FRIEND_IDS: readonly FriendId[] = ['pim', 'mog', 'dot', 'bo']
export const ENDS: readonly End[] = ['left', 'right']

export type FriendSpec = {
  id: FriendId
  /** The game's own unit, shown only by size. */
  weight: number
  /** Half the width of the body. */
  radius: number
  /** Half the height of the body: a pebble is flatter than a ball. */
  halfHeight: number
  /** Seconds a hop takes: the friend's tempo. */
  hopSeconds: number
  /** How high a hop arcs above the straight line. */
  hopHeight: number
}

export const FRIENDS: Readonly<Record<FriendId, FriendSpec>> = {
  pim: { id: 'pim', weight: 2, radius: 0.62, halfHeight: 0.51, hopSeconds: 0.42, hopHeight: 1.9 },
  mog: { id: 'mog', weight: 3, radius: 0.81, halfHeight: 0.62, hopSeconds: 0.56, hopHeight: 1.5 },
  dot: { id: 'dot', weight: 3, radius: 0.81, halfHeight: 0.62, hopSeconds: 0.5, hopHeight: 0.95 },
  bo: { id: 'bo', weight: 4, radius: 1.1, halfHeight: 0.86, hopSeconds: 0.8, hopHeight: 1.0 },
}

/**
 * The tray is deep: the plank lies across its middle, the friends stand in a row in front of it, and behind it
 * there is room at the far rim for Dot to stand truly apart, further than a body's width from anyone on the plank.
 */
export const TRAY = { halfWidth: 6, halfDepth: 5, rimHeight: 0.45, rimThick: 0.35 } as const

export const PLANK = {
  halfLength: 3.6,
  halfWidth: 0.62,
  thickness: 0.16,
  /** Height of the plank's underside above the sand at the stone. */
  pivotHeight: 1.0,
  /** Where a stack stands, measured along the plank from the stone. */
  seat: 3.0,
  stoneRadius: 0.62,
  /** The plank lies across the middle of the tray. */
  z: 0,
} as const

/** The tilt at which an end rests on the sand, in radians. Positive is right end down. */
/**
 * Pim's crown, in her own measures: how wide it is at its base and how high it rises, as shares of her radius, and
 * where its base sits, as a share of her half height. It is low and wide, so that with it on she is still plainly
 * the smallest outline in the tray: a mark may tell a friend apart and must add no bulk.
 */
export const CROWN = { girth: 0.5, rise: 0.34, seat: 1.9 } as const

/**
 * Mog's ear bumps, in his own measures: how big each is, as a share of his radius, how far out from the middle of
 * his head it sits, and where the pair is set, as a share of his half height. They are low bumps at the corners of
 * his head and do not stand above the top of it, so that he and Dot, who weigh the same, are one size to the eye.
 */
export const EARS = { size: 0.26, out: 0.5, seat: 1.656 } as const

export const MAX_TILT = Math.asin(PLANK.pivotHeight / PLANK.halfLength)
/** How much further an end digs into the sand for each unit of weight on it beyond the lightest friend's: radians. */
export const DIG = 0.007
/** The lightest weight an end can hold: Pim's. With that, or with nothing, an end only touches the sand. */
const LIGHTEST = 2

/** How far the plank tilts with `weight` resting on its low end: the heavier the end, the deeper it digs. */
export function lowTilt(weight: number): number {
  return MAX_TILT + DIG * Math.max(0, weight - LIGHTEST)
}

/** Where friends may stand in the sand: inside the rim, clear of the plank's strip. */
export const SAND = {
  maxX: 5.15,
  /** Nearest the child. Kept off the bottom of the screen, where wrists rest. */
  maxZ: 3.85,
  minZ: -4.4,
  /** Half the depth of the strip under the plank where nobody stands. */
  plankStrip: 2.0,
  /** The strip reaches this far from the stone. */
  plankReach: 3.9,
} as const

/** Where the friend who asks next waits: in front of the stone. */
export const WAITING_PLACE = { x: 0, z: 3.3 } as const

export type Spot = { x: number; z: number }

/** The seat of an end along x, with the plank level. */
export function seatX(end: End): number {
  return end === 'left' ? -PLANK.seat : PLANK.seat
}

/** The end on a friend's own side of the tray. A friend dead centre goes right. */
export function endOnSide(x: number): End {
  return x < 0 ? 'left' : 'right'
}

export function otherEnd(end: End): End {
  return end === 'left' ? 'right' : 'left'
}

/** Height of the plank's top face at `along` (signed, from the stone) for a tilt. */
export function plankTopAt(along: number, tilt: number): number {
  return PLANK.pivotHeight + PLANK.thickness - Math.sin(tilt) * along
}

/** Places in the sand lie on a grid of hundredths of the tray's width, which is also how they are saved. */
export const GRID = (TRAY.halfWidth * 2) / 100

/** The grid line nearest `value` that lies inside [low, high]. */
function onGrid(value: number, low: number, high: number, origin: number): number {
  let cell = Math.round((Math.max(low, Math.min(high, value)) - origin) / GRID)
  if (cell * GRID + origin > high + 1e-9) cell -= 1
  if (cell * GRID + origin < low - 1e-9) cell += 1
  return gridLine(cell, origin)
}

/** The grid line `cell` lines from `origin`, as one exact number however it was reached (and never minus zero). */
export function gridLine(cell: number, origin: number): number {
  return Math.round((cell * GRID + origin) * 1e6) / 1e6 + 0
}

/** The widest any friend reaches from its middle when it sits on a seat: Bo, spread by a landing and leaning with a sway. */
const SEATED_REACH = 1.43

/**
 * A friend of this radius standing at (x, z) would be in the way of the
 * plank: under the board, or within reach of whoever may sit on a seat.
 */
export function inTheWay(x: number, z: number, radius: number): boolean {
  const reach = radius * 1.15
  if (Math.abs(z - PLANK.z) < PLANK.halfWidth + reach && Math.abs(x) < PLANK.halfLength + reach) return true
  return Math.hypot(Math.abs(x) - PLANK.seat * 0.98, z - PLANK.z) < SEATED_REACH + reach + 0.08
}

/** Moves a spot to the nearest place a friend of this radius may stand. */
export function standable(spot: Spot, radius: number): Spot {
  // Clear of the rim by the body's widest reach: its radius, its belly, and the spread of a hard landing.
  const reach = radius * 1.3 + 0.05
  const sideRim = Math.min(SAND.maxX - radius * 0.5, TRAY.halfWidth - reach)
  const x = onGrid(spot.x, -sideRim, sideRim, -TRAY.halfWidth)
  const nearRim = Math.max(SAND.minZ + radius * 0.5, -TRAY.halfDepth + reach)
  const childRim = Math.min(SAND.maxZ, TRAY.halfDepth - reach)
  const z = onGrid(spot.z, nearRim, childRim, -TRAY.halfDepth)
  if (!inTheWay(x, z, radius)) return { x, z }
  // In the way of the plank: step out in front of it or behind it, to whichever free place is nearer.
  let best: number | null = null
  for (let step = 1; step <= 64; step++) {
    for (const way of [1, -1]) {
      const at = onGrid(z + way * step * GRID, nearRim, childRim, -TRAY.halfDepth)
      if (inTheWay(x, at, radius)) continue
      if (best === null || Math.abs(at - spot.z) < Math.abs(best - spot.z)) best = at
    }
    if (best !== null) break
  }
  return { x, z: best ?? childRim }
}

const PLACES = new Map<number, readonly Spot[]>()

/** Every place on the grid where a friend of this radius may stand: clear of the rim and out of the plank's way. */
export function standablePlaces(radius: number): readonly Spot[] {
  const known = PLACES.get(radius)
  if (known) return known
  const reach = radius * 1.3 + 0.05
  const sideRim = Math.min(SAND.maxX - radius * 0.5, TRAY.halfWidth - reach)
  const nearRim = Math.max(SAND.minZ + radius * 0.5, -TRAY.halfDepth + reach)
  const childRim = Math.min(SAND.maxZ, TRAY.halfDepth - reach)
  const xs = new Set<number>(), zs = new Set<number>()
  for (let v = -sideRim; v <= sideRim + 1e-9; v += GRID) xs.add(onGrid(v, -sideRim, sideRim, -TRAY.halfWidth))
  for (let v = nearRim; v <= childRim + 1e-9; v += GRID) zs.add(onGrid(v, nearRim, childRim, -TRAY.halfDepth))
  const places: Spot[] = []
  for (const x of xs) for (const z of zs) if (!inTheWay(x, z, radius)) places.push({ x, z })
  PLACES.set(radius, places)
  return places
}

/**
 * The two places in front of the plank on the right of the tray where the game sets friends down: an inner one
 * beside the waiting place and an outer one by the side rim. They are well apart from each other and from the
 * friend who waits, whoever stands on them.
 */
export const INNER: Spot = { x: 2.28, z: 3.72 }
export const OUTER: Spot = { x: 4.5, z: 2.5 }

/**
 * Where each friend stands by default on the right of the tray; mirrored for the left. Pim and Mog stand at the
 * inner place and Bo at the outer one; when Pim and Mog are set down on one side, Mog takes the outer place, which
 * Bo has then left for the plank (rides.ts). Dot's is the far rim, behind the plank and further than a body's
 * width from anyone who sits on it.
 */
export const HOME: Readonly<Record<FriendId, Spot>> = {
  pim: standable(INNER, FRIENDS.pim.radius),
  mog: standable(INNER, FRIENDS.mog.radius),
  bo: standable(OUTER, FRIENDS.bo.radius),
  dot: standable({ x: 4.68, z: -3.9 }, FRIENDS.dot.radius),
}

export function homeOn(id: FriendId, end: End): Spot {
  const home = HOME[id]
  return { x: end === 'left' ? -home.x : home.x, z: home.z }
}

/** The outer place on a side, for a friend of this size: where Mog is set down when Pim has the inner one. */
export function outerOn(id: FriendId, end: End): Spot {
  const outer = standable(OUTER, FRIENDS[id].radius)
  return { x: end === 'left' ? -outer.x : outer.x, z: outer.z }
}
