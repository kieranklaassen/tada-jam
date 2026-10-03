import { lean, placeOf, type Arrangement } from './arrangement'
import { restPose, type Frame, type Poses } from './pose'
import { FRIEND_IDS, FRIENDS, MAX_TILT, PLANK, WAITING_PLACE, plankTopAt, type End, type FriendId } from './world'

// Where everything is when nothing moves: the plank on its heavier end, each
// stack standing on its seat, everyone else in the sand. Pure. A load draws
// this, and every hop and toss ends in it.

/** Where a friend sitting on another has its underside, as a share of the height of the one below: on its very top, touching and not sunk in. */
export const NESTLE = 1

export function restTilt(a: Arrangement, without: FriendId | null = null): number {
  return lean(a, without) * MAX_TILT
}

/** Where the bottom of the friend at `level` of an end's stack is, for a tilt. A stack stands square on the board, so it leans with it. */
export function seatOf(a: Arrangement, end: End, level: number, tilt: number): { x: number; y: number; z: number } {
  const along = (end === 'left' ? -1 : 1) * PLANK.seat
  let x = along * Math.cos(tilt), y = plankTopAt(along, tilt)
  for (let i = 0; i < level; i++) {
    const rise = FRIENDS[a[end][i]].halfHeight * 2 * NESTLE
    x += Math.sin(tilt) * rise
    y += Math.cos(tilt) * rise
  }
  return { x, y, z: PLANK.z }
}

/** Where the bottom of a friend is at rest, for a tilt. */
export function restingAt(a: Arrangement, id: FriendId, tilt: number): { x: number; y: number; z: number } {
  const place = placeOf(a, id)
  if (place.at === 'end') return seatOf(a, place.end, place.level, tilt)
  if (place.at === 'waiting') return { x: WAITING_PLACE.x, y: 0, z: WAITING_PLACE.z }
  return { x: place.spot.x, y: 0, z: place.spot.z }
}

export function restFrame(a: Arrangement): Frame {
  const tilt = restTilt(a)
  const poses = {} as Poses
  for (const id of FRIEND_IDS) {
    const at = restingAt(a, id, tilt)
    poses[id] = restPose(at.x, at.y, at.z)
    // On a tilted plank a friend sits square on it.
    if (placeOf(a, id).at === 'end') poses[id].lean = tilt
  }
  return { tilt, poses, glow: 0, glowOn: null }
}
