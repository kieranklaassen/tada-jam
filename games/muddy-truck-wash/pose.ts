// How a vehicle holds itself, as plain numbers. The motion module fills a
// pose in; the view shows it and decides nothing.

export type TruckPose = {
  x: number
  z: number
  /** The body above its rest height on the springs. */
  lift: number
  /** The whole vehicle, wheels and all, above the floor. */
  hop: number
  /** Nose down, radians. */
  pitch: number
  /** Leaning toward the child, radians. */
  lean: number
  wheelSpin: number
  /** How far each axle's tyres are pressed flat, 0 to about 0.3, front axle first. */
  squash: number[]
  /** The moving part: an angle about its pivot. */
  part: number
  /** Where the eyes look: sideways toward the child (about 0.75) or straight ahead (0), and up. */
  gazeSide: number
  gazeUp: number
  /** 0 open, 1 shut. */
  lid: number
  /** The eyes turned toward each other. */
  cross: number
}

export function restPose(): TruckPose {
  return { x: 0, z: 0, lift: 0, hop: 0, pitch: 0, lean: 0, wheelSpin: 0, squash: [], part: 0, gazeSide: 0.75, gazeUp: 0.1, lid: 0, cross: 0 }
}
