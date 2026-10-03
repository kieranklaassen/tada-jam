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

/** Copies `from` into `into` without making an object, for the frame loop. */
export function copyPose(into: Pose, from: Pose): Pose {
  return Object.assign(into, from)
}
