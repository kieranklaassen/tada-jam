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
  pim: { id: 'pim', weight: 2, radius: 0.56, halfHeight: 0.46, hopSeconds: 0.42, hopHeight: 1.9 },
  mog: { id: 'mog', weight: 3, radius: 0.74, halfHeight: 0.56, hopSeconds: 0.56, hopHeight: 1.5 },
  dot: { id: 'dot', weight: 3, radius: 0.74, halfHeight: 0.56, hopSeconds: 0.5, hopHeight: 0.95 },
  bo: { id: 'bo', weight: 4, radius: 1.0, halfHeight: 0.78, hopSeconds: 0.8, hopHeight: 1.0 },
}

export const TRAY = { halfWidth: 6, halfDepth: 3.75, rimHeight: 0.45, rimThick: 0.35 } as const

export const PLANK = {
  halfLength: 3.6,
  halfWidth: 0.62,
  thickness: 0.16,
  /** Height of the plank's underside above the sand at the stone. */
  pivotHeight: 1.0,
  /** Where a stack stands, measured along the plank from the stone. */
  seat: 3.0,
  stoneRadius: 0.62,
  /** The plank lies across the tray this far from its middle, toward the far rim, so the friends stand in front of it. */
  z: -1.0,
} as const

/** The tilt at which an end rests on the sand, in radians. Positive is right end down. */
export const MAX_TILT = Math.asin(PLANK.pivotHeight / PLANK.halfLength)

/** Where friends may stand in the sand: inside the rim, clear of the plank's strip. */
export const SAND = {
  maxX: 5.15,
  /** Nearest the child. Kept off the bottom of the screen, where wrists rest. */
  maxZ: 2.75,
  minZ: -3.0,
  /** Half the depth of the strip under the plank where nobody stands. */
  plankStrip: 1.8,
  /** The strip reaches this far from the stone. */
  plankReach: 3.9,
} as const

/** Where the friend who asks next waits: in front of the stone. */
export const WAITING_PLACE = { x: 0, z: 2.3 } as const

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

/** Moves a spot to the nearest place a friend of this radius may stand. */
export function standable(spot: Spot, radius: number): Spot {
  const x = onGrid(spot.x, -SAND.maxX + radius * 0.5, SAND.maxX - radius * 0.5, -TRAY.halfWidth)
  const nearRim = SAND.minZ + radius * 0.5
  let z = onGrid(spot.z, nearRim, SAND.maxZ, -TRAY.halfDepth)
  const half = SAND.plankStrip + radius * 0.4
  if (Math.abs(x) < SAND.plankReach + radius && Math.abs(z - PLANK.z) < half) {
    // Under the plank: step out in front of it, or behind it where there is room and it is nearer.
    const behind = PLANK.z - half
    z = spot.z < PLANK.z && behind >= nearRim ? onGrid(behind, nearRim, behind, -TRAY.halfDepth) : onGrid(PLANK.z + half, PLANK.z + half, SAND.maxZ, -TRAY.halfDepth)
  }
  return { x, z }
}

/** Where each friend stands by default on the right of the tray; mirrored for the left. Dot's is the rim. */
export const HOME: Readonly<Record<FriendId, Spot>> = {
  pim: standable({ x: 1.68, z: 2.49 }, FRIENDS.pim.radius),
  mog: standable({ x: 2.88, z: 1.41 }, FRIENDS.mog.radius),
  bo: standable({ x: 4.56, z: 2.37 }, FRIENDS.bo.radius),
  dot: standable({ x: 4.68, z: -2.55 }, FRIENDS.dot.radius),
}

export function homeOn(id: FriendId, end: End): Spot {
  const home = HOME[id]
  return { x: end === 'left' ? -home.x : home.x, z: home.z }
}
