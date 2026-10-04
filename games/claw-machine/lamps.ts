import { BACK, STEP, WALL } from './places'

// The lamps of the cabinet: a string of small bulbs up the back wall at one
// end, along the front of the parapet and down the back wall at the other,
// lit in a chase that runs round the frame. They are the machine showing off, and nothing to do with
// the task: no lamp marks a thing to touch, and none can be touched.

export type Lamp = { x: number; y: number; z: number }

/** How big a bulb is, across. */
export const LAMP_SIZE = 0.9
/** A bulb stands this far off the brick behind it: it touches nothing. */
const OFF = LAMP_SIZE / 2 + 0.04

/**
 * Every bulb, in the order the chase runs: up the back wall on the left, along the parapet, and down the back wall
 * on the right. The two strings on the back wall hang at its ends, outside whoever waits on the shelf and outside
 * a crate; the one on the parapet is on its front, lower than its top.
 */
export function lampSpots(): Lamp[] {
  const out: Lamp[] = []
  const endX = STEP.x + STEP.w - 1, backZ = BACK.z + 1 + OFF
  for (let y = 0.4; y <= 9.8; y += 1.84) out.push({ x: -endX, y, z: backZ })
  for (let x = -15; x <= 15; x += 2) out.push({ x, y: WALL.top - 0.6, z: WALL.z + 1 + OFF })
  for (let y = 9.6; y >= 0.4 - 1e-6; y -= 1.84) out.push({ x: endX, y, z: backZ })
  return out
}

/**
 * How bright the bulb at `index` is at a time: 0 dim to 1 lit. One bulb in
 * four is lit and the lit ones run along the string, three places a second.
 */
export function lampGlow(index: number, seconds: number): number {
  const turn = (index / 4 - seconds * 0.75) % 1
  const wave = Math.cos(turn * Math.PI * 2)
  return wave <= 0 ? 0 : wave * wave
}
