import { STEP, WALL } from './places'

// The lamps of the cabinet: a string of small bulbs up one corner post, along
// the front of the parapet and down the other post, lit in a chase that runs
// round the frame. They are the machine showing off, and nothing to do with
// the task: no lamp marks a thing to touch, and none can be touched.

export type Lamp = { x: number; y: number; z: number }

/** How big a bulb is, across. */
export const LAMP_SIZE = 0.9
/** A bulb stands this far off the brick behind it: it touches nothing. */
const OFF = LAMP_SIZE / 2 + 0.04

/** Every bulb, in the order the chase runs: up the left post, along the parapet, down the right post. */
export function lampSpots(): Lamp[] {
  const out: Lamp[] = []
  const postX = STEP.x + STEP.w + 1.3, postZ = WALL.z + 2 + OFF
  for (let y = 2.6; y <= 11.8; y += 1.84) out.push({ x: -postX, y, z: postZ })
  for (let x = -15; x <= 15; x += 2) out.push({ x, y: WALL.top - 0.6, z: WALL.z + 1 + OFF })
  for (let y = 11.8; y >= 2.6 - 1e-6; y -= 1.84) out.push({ x: postX, y, z: postZ })
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
