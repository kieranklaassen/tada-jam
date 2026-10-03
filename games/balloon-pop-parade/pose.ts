// A friend's pose as plain numbers. The motion modules write poses, the stage
// applies them to the meshes, and neither knows about the other, so every
// motion can be tested without a renderer.

export type Pose = {
  /** Where the feet are, in world units. `y` is the height of the ground plus any lift. */
  x: number
  y: number
  z: number
  scale: number
  /** The whole toy about its upright axis: 0 faces the child, positive turns its left side towards the child. */
  turn: number
  /** The whole toy tipping sideways about its feet, and bowing forwards. */
  lean: number
  bow: number
  /** 1 at rest; below 1 is flatter and wider, above 1 taller and thinner. The volume is kept. */
  squash: number
  /** The head: negative `nod` looks up. */
  nod: number
  headTurn: number
  tilt: number
  /** Each arm out and up from hanging, in radians: 0 hangs, about 2.5 reaches up. And forwards. */
  armL: number
  armR: number
  armLForward: number
  armRForward: number
  /** The funniest part: a wag from side to side, a flick up, and a puff (1 at rest). */
  wag: number
  flick: number
  puff: number
  /** 0 open, 1 shut. */
  blink: number
  /** The breathing glow, 0 to 1. */
  glow: number
}

export function restPose(): Pose {
  return {
    x: 0, y: 0, z: 0, scale: 1, turn: 0, lean: 0, bow: 0, squash: 1,
    nod: 0, headTurn: 0, tilt: 0,
    armL: 0.12, armR: 0.12, armLForward: 0, armRForward: 0,
    wag: 0, flick: 0, puff: 1, blink: 0, glow: 0,
  }
}

/** A pose at rest that nobody writes to: `copyPose(pose, REST)` starts a pose again without making an object. */
export const REST: Readonly<Pose> = Object.freeze(restPose())

/** Copies `from` into `into` without making an object, for the frame loop. */
export function copyPose(into: Pose, from: Readonly<Pose>): Pose {
  into.x = from.x; into.y = from.y; into.z = from.z; into.scale = from.scale
  into.turn = from.turn; into.lean = from.lean; into.bow = from.bow; into.squash = from.squash
  into.nod = from.nod; into.headTurn = from.headTurn; into.tilt = from.tilt
  into.armL = from.armL; into.armR = from.armR; into.armLForward = from.armLForward; into.armRForward = from.armRForward
  into.wag = from.wag; into.flick = from.flick; into.puff = from.puff; into.blink = from.blink; into.glow = from.glow
  return into
}

/**
 * How much wider a friend is when it is squashed to `squash` of its height. Air under vinyl spreads, but a toy
 * that spread by its whole volume would push its arms into the friend beside it, so it spreads by half of that.
 */
export function spread(squash: number): number {
  return 1 + (1 / Math.sqrt(Math.max(0.2, squash)) - 1) * 0.5
}

/** The same pose done to the other side: what a friend does towards its left, done towards its right. */
export function mirror(pose: Pose): void {
  const arm = pose.armL, forward = pose.armLForward
  pose.armL = pose.armR
  pose.armR = arm
  pose.armLForward = pose.armRForward
  pose.armRForward = forward
  pose.turn = -pose.turn
  pose.lean = -pose.lean
  pose.headTurn = -pose.headTurn
  pose.tilt = -pose.tilt
  pose.wag = -pose.wag
}

/**
 * How far an arm comes round to the front as it swings, in radians, for an arm `arm` radians out from hanging. An
 * arm that swung straight out sideways would reach into the friend beside it every time it was raised or let
 * down, so half way up it points mostly forwards, at the child, and it is out to the side only a little.
 */
export function forwardOf(arm: number): number {
  const s = Math.sin(arm)
  return 1.3 * s * s
}
