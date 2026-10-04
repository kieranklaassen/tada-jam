import { BACK, STEP, WALL } from './places'

// The lamps of the cabinet: a string of small bulbs up the back wall at one
// end, along the front of the parapet and down the back wall at the other,
// lit in a chase that runs round the frame. They are the machine showing off, and nothing to do with
// the task: no lamp marks a thing to touch. A finger on a bulb is answered by the bulb: it flares with a
// ting, the flare runs a little way along the string, and the claw stays where it is.

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

/** How many bulbs there are. */
export const LAMPS = lampSpots().length
/** How long a bulb that a finger landed on flares, in seconds, and how far along the string the flare runs. */
export const FLARE_SECONDS = 0.8
const FLARE_RUNS = 3
const FLARE_STEP = 0.06

/**
 * How bright the flare of the bulb at `index` is, 0 to 1, when the bulb at `touched` had a finger on it
 * `since` seconds ago: full on the bulb itself, fainter and a moment later on each bulb further along.
 */
export function lampFlare(index: number, touched: number, since: number): number {
  const away = Math.abs(index - touched)
  if (away > FLARE_RUNS) return 0
  const t = since - away * FLARE_STEP
  return t < 0 || t > FLARE_SECONDS ? 0 : (1 - t / FLARE_SECONDS) * (1 - away / (FLARE_RUNS + 1))
}
