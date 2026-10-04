import { belly, spread } from '../overlap'
import type { Frame } from '../pose'
import { FRIEND_IDS, FRIENDS, PLANK, type FriendId } from '../world'

// What a finger points at: the place in the tray whose picture lies under it.
// A friend carried by the finger hangs over that place, so what the child
// points at is where the friend comes down. Pure numbers: a ray from the
// camera and one frame of the game.

export type Ray = { origin: { x: number; y: number; z: number }; direction: { x: number; y: number; z: number } }

export type Ground = {
  x: number
  z: number
  /** What lies there under the finger: a friend's body, the board, or the sand. */
  on: 'friend' | 'plank' | 'sand'
  /** The friend, when it is one. */
  id?: FriendId
}

/** How far past the board's own edges a finger still counts as on it, in tray units. */
export const BOARD_MARGIN = 0.18

/** Where along the ray it enters a friend's body, taken as the squashed egg it is drawn as; Infinity if it misses. */
function entersBody(ray: Ray, frame: Frame, id: FriendId): number {
  const pose = frame.poses[id], spec = FRIENDS[id]
  const wide = spread(pose.squash) * belly(0)
  const rx = spec.radius * wide, ry = spec.halfHeight * pose.squash, rz = spec.radius * 0.94 * wide
  // The ray in the body's own measures, where the body is a ball of radius 1 round its middle.
  const ox = (ray.origin.x - pose.x) / rx, oy = (ray.origin.y - (pose.y + ry)) / ry, oz = (ray.origin.z - pose.z) / rz
  const dx = ray.direction.x / rx, dy = ray.direction.y / ry, dz = ray.direction.z / rz
  const a = dx * dx + dy * dy + dz * dz, b = 2 * (ox * dx + oy * dy + oz * dz), c = ox * ox + oy * oy + oz * oz - 1
  const disc = b * b - 4 * a * c
  if (disc < 0) return Infinity
  const t = (-b - Math.sqrt(disc)) / (2 * a)
  return t > 0 ? t : Infinity
}

/**
 * The place under the finger. A friend's body there (never the one in the hand) gives that friend's own place, so
 * a finger on a stack means that stack; the board gives the point of the board, on its middle line; anything else
 * gives the point of the sand. Null when the ray looks up and away from the tray.
 */
export function groundUnder(ray: Ray, frame: Frame, except: FriendId | null): Ground | null {
  let nearest: FriendId | null = null, nearestAt = Infinity
  for (const id of FRIEND_IDS) {
    if (id === except) continue
    const t = entersBody(ray, frame, id)
    if (t < nearestAt) {
      nearest = id
      nearestAt = t
    }
  }
  const { origin: o, direction: d } = ray
  // The board's top, tilted about the stone: every point of it has y + x tan(tilt) = the height of its middle.
  const slope = Math.tan(frame.tilt), middle = PLANK.pivotHeight + PLANK.thickness
  const down = d.y + slope * d.x
  let board: Ground | null = null, boardAt = Infinity
  if (down < -1e-6) {
    const t = (middle - o.y - slope * o.x) / down
    const x = o.x + t * d.x, z = o.z + t * d.z
    if (t > 0 && Math.abs(z - PLANK.z) <= PLANK.halfWidth + BOARD_MARGIN && Math.abs(x) <= PLANK.halfLength * Math.cos(frame.tilt) + BOARD_MARGIN) {
      board = { x, z: PLANK.z, on: 'plank' }
      boardAt = t
    }
  }
  if (nearest && nearestAt <= boardAt) return { x: frame.poses[nearest].x, z: frame.poses[nearest].z, on: 'friend', id: nearest }
  if (board) return board
  if (d.y >= -1e-6) return null
  const t = -o.y / d.y
  return { x: o.x + t * d.x, z: o.z + t * d.z, on: 'sand' }
}
