import type { FriendId } from './world'

// What the view draws of one friend in one frame. Pure numbers: the motion
// model writes them and the stage maps them onto meshes.

export type FriendPose = {
  /** Where the bottom of the body is. */
  x: number
  y: number
  z: number
  /** 1 at rest; below 1 flattened and wider, above 1 stretched and thinner. */
  squash: number
  /** Roll, radians: positive leans to the child's right. */
  lean: number
  /** Nod, radians: positive tips the face up toward the sky. */
  nod: number
  /** Turn about the upright, radians: 0 faces the child. */
  turn: number
  /** 0 eyes open, 1 shut. */
  lids: number
  /** Where the eyes look, each -1 to 1, in the face's own frame. */
  gazeX: number
  gazeY: number
  /** Dot's colour, 0 pale to 1 full. The others stay at 1. */
  bright: number
  /** 0 mouth closed to 1 wide open. */
  mouth: number
  /** A second, lagging lean for the part that follows through: Pim's crown, Bo's belly, Mog's ears. */
  follow: number
  /** 0 a smile to 1 a mouth turned down: put out, never at the child. */
  frown: number
  /** A friend sits on this one: 1, else 0. Pim's crown slips to the side of her head. */
  pressed: number
}

export type Poses = Record<FriendId, FriendPose>

export function restPose(x = 0, y = 0, z = 0): FriendPose {
  return { x, y, z, squash: 1, lean: 0, nod: 0, turn: 0, lids: 0, gazeX: 0, gazeY: 0, bright: 1, mouth: 0, follow: 0, frown: 0, pressed: 0 }
}

/** What the view draws in one frame. */
export type Frame = {
  /** The plank's tilt, radians; positive is right end down. */
  tilt: number
  poses: Poses
  /** 0 to 1: the idle glow on what can be touched. */
  glow: number
  /** The friend the glow is on, or null for none. */
  glowOn: FriendId | null
}
