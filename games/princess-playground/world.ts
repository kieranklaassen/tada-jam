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
  dot: { id: 'dot', weight: 3, radius: 0.74, halfHeight: 0.56, hopSeconds: 0.62, hopHeight: 1.2 },
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
  plankStrip: 1.2,
  /** The strip reaches this far from the stone. */
  plankReach: 4.3,
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

/** Moves a spot to the nearest place a friend of this radius may stand. */
export function standable(spot: Spot, radius: number): Spot {
  let x = Math.max(-SAND.maxX + radius * 0.5, Math.min(SAND.maxX - radius * 0.5, spot.x))
  let z = Math.max(SAND.minZ + radius * 0.5, Math.min(SAND.maxZ, spot.z))
  const half = SAND.plankStrip + radius * 0.4
  if (Math.abs(x) < SAND.plankReach + radius && Math.abs(z - PLANK.z) < half) {
    // Under the plank: step out in front of it, or behind it where there is room and it is nearer.
    const behind = PLANK.z - half
    z = z < PLANK.z && behind >= SAND.minZ + radius * 0.5 ? behind : PLANK.z + half
  }
  return { x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100 }
}

/** Where each friend stands by default on the right of the tray; mirrored for the left. Dot's is the rim. */
export const HOME: Readonly<Record<FriendId, Spot>> = {
  pim: { x: 1.7, z: 2.3 },
  mog: { x: 2.6, z: 0.75 },
  bo: { x: 4.45, z: 2.0 },
  dot: { x: 4.75, z: -2.63 },
}

export function homeOn(id: FriendId, end: End): Spot {
  const home = HOME[id]
  return { x: end === 'left' ? -home.x : home.x, z: home.z }
}
