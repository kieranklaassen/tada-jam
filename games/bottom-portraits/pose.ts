// How a body is held, as numbers the view lays onto its tin.

export type Pose = {
  x: number; y: number; z: number
  /** Radians round; a quarter turn is half of pi. */
  yaw: number
  /** 1 is at rest; under 1 is pressed down and fat, over 1 is drawn up and thin. */
  squash: number
  /** The body on its stand, radians: forwards, and to its left. */
  lean: number
  tilt: number
  /** The whole body turned on its stand. */
  twist: number
  hop: number
  nod: number; shake: number; cock: number
  /** The loose pieces: how far the first and the second are out of place. */
  a: number; b: number
  look: number; up: number
  /** 0 open to 1 shut. */
  lid: number
}

export const restPose = (): Pose => ({ x: 0, y: 0, z: 0, yaw: 0, squash: 1, lean: 0, tilt: 0, twist: 0, hop: 0, nod: 0, shake: 0, cock: 0, a: 0, b: 0, look: 0, up: 0, lid: 0 })

export function settle(pose: Pose): Pose {
  return Object.assign(pose, { squash: 1, lean: 0, tilt: 0, twist: 0, hop: 0, nod: 0, shake: 0, cock: 0, a: 0, b: 0, look: 0, up: 0, lid: 0 })
}

/** The painter, as held. */
export type MaestroPose = {
  yaw: number; lean: number; sway: number; duck: number; squash: number
  nod: number; shake: number; cock: number
  /** The brush arm: 0 at rest to 1 held straight out to measure; `dab` swings it on the canvas. */
  arm: number; dab: number
  moustache: number
  /** The monocle: 0 in the eye to 1 hanging on its cord. */
  monocle: number
  look: number; up: number; lid: number
  flap: number
  beret: number
}
export const restMaestro = (): MaestroPose => ({ yaw: 0, lean: 0, sway: 0, duck: 0, squash: 1, nod: 0, shake: 0, cock: 0, arm: 0, dab: 0, moustache: 0, monocle: 0, look: 0, up: 0, lid: 0, flap: 0, beret: 0 })
