import { PLATE, type Brick, type Rgb } from './bricks'
import { modelBricks } from './builds'
import { BLACK, TONGUE, WHITE } from './palette'
import type { Kind } from './toys'

// A gobbler: a brick-built bin on legs whose open top is its mouth and whose
// clear front is its belly. Its body shows what it takes: the colour it is
// built in, the white model that stands on its back, or its size.

export type GobblerShape = {
  /** Width across, in studs. Depth is always six. */
  width: number
  /** Height of the belly, in plates. */
  belly: number
  colour: Rgb
  /** The kind whose white model stands on its back, for a gobbler that goes by kind. */
  model?: Kind
  /** Half the width of its mouth, where that is narrower than its belly: nothing longer goes in. */
  throat?: number
  /** Its belly has wide bars in front and no pane: a small thing put in rolls out between them. */
  bars?: boolean
}

export type GobblerParts = {
  /** Feet, legs, the bin, its teeth, the knob on its head and the whites of its eyes, as one build standing on y = 0. */
  body: Brick[]
  /** Both pupils, as one build about the origin: the two always look the same way, so they move as one. */
  pupils: Brick[]
  /** The clear front of the belly. */
  window: Brick[]
  /** The tongue, lying on the floor of the mouth: a plate that rises with whatever lies on it. */
  tongue: Brick[]
}

const DEPTH = 6
/** Legs, in plates: the body starts here. */
export const LEGS = 3
/** The width of an eyeball. The eyes are balls, the one part of a gobbler that is not a brick. */
export const EYE = 2.5
/** The height of the knob on its head, in plates. */
const KNOB = 3
/** Where the bars of a barred belly stand, either side of the middle: the gap between them lets a small toy through and no big one. */
export const BAR_AT = 2.05

const box = (colour: Rgb, x: number, y: number, z: number, w: number, d: number, h: number, studs = false): Brick => ({ x, y, z, w, d, h, colour, studs })
const peg = (x: number, y: number, z: number): Brick => ({ x, y, z, w: 0.8, d: 0.8, h: 2, colour: WHITE, round: true, studs: false })

/** The height of the rim of the mouth above the feet, in world units. */
export function rimHeight(shape: GobblerShape): number {
  return (LEGS + 1 + shape.belly) * PLATE
}

/** The middle of each eye, measured from the feet (world units). */
export function eyeCentres(shape: GobblerShape): { x: number; y: number; z: number }[] {
  const y = (LEGS + 1 + shape.belly) * PLATE + EYE * 0.42
  const x = shape.width / 2 - 0.3
  return [{ x: -x, y, z: DEPTH / 2 - 0.6 }, { x, y, z: DEPTH / 2 - 0.6 }]
}

/** The inside of the belly, measured from the top of the legs: where the group lies and what the window shows. */
export function bellyBox(shape: GobblerShape): { x: number; y: number; z: number; w: number; h: number; d: number } {
  return { x: -shape.width / 2 + 1, y: 1 * PLATE, z: -DEPTH / 2 + 1, w: shape.width - 2, h: shape.belly * PLATE, d: DEPTH - 2 }
}

/** The knob on its head that the claw lifts it by: the middle of its top, measured from the feet. */
export function knobAt(shape: GobblerShape): { x: number; y: number; z: number } {
  return { x: shape.width / 2 - 1.6, y: (LEGS + 1 + shape.belly + KNOB) * PLATE, z: -DEPTH / 2 + 0.2 }
}

/** How far the floor of the mouth is above the feet, and how far the tongue can rise from it: to just under the rim. */
export function tongueTravel(shape: GobblerShape): { floor: number; rise: number } {
  return { floor: (LEGS + 1) * PLATE, rise: (shape.belly - 1) * PLATE }
}

export function gobblerParts(shape: GobblerShape): GobblerParts {
  const c = shape.colour, half = shape.width / 2, at = LEGS, rim = LEGS + 1 + shape.belly
  const foot = Math.max(1.5, half - 2.5)
  const body: Brick[] = [
    box(c, -foot - 1, 0, -1, 2, 3, 1, true), box(c, foot - 1, 0, -1, 2, 3, 1, true), // feet
    { x: -foot - 0.8, y: 1, z: -0.3, w: 1.6, d: 1.6, h: LEGS - 1, colour: c, round: true, studs: false }, // legs
    { x: foot - 0.8, y: 1, z: -0.3, w: 1.6, d: 1.6, h: LEGS - 1, colour: c, round: true, studs: false },
    box(c, -half, at, -3, shape.width, DEPTH, 1), // floor of the belly
    // A white lining behind the group, so a toy of the gobbler's own colour shows. It stands a hair off the wall and short of the rim.
    box(WHITE, -half + 1.05, at + 1.05, -1.95, shape.width - 2.1, 0.25, shape.belly - 0.3),
    box(c, -half, at + 1, -3, shape.width, 1, shape.belly, true), // back
    box(c, -half, at + 1, -2, 1, 5, shape.belly, true), // sides
    box(c, half - 1, at + 1, -2, 1, 5, shape.belly, true),
    box(c, -half + 1, at + 1, 2, shape.width - 2, 1, 1), // the sill under the window
    box(c, -half + 1, rim - 1, 2, shape.width - 2, 1, 1), // the bar over it
    // The knob the claw lifts it by, at the back of its head.
    { x: half - 2.4, y: rim, z: -3.6, w: 1.6, d: 1.6, h: KNOB, colour: c, round: true, studs: true },
  ]
  // Peg teeth along the front and the back of the rim.
  // The back row stops short of the knob, so the jaws have room beside it.
  for (let x = -half + 1.6; x < half - 3; x += 2) { body.push(peg(x, rim, 2.1)); if (x + 1 < half - 4.6) body.push(peg(x + 1, rim, -2.9)) }
  // Eyes like a frog's, on the front corners, clear of the mouth.
  for (const eye of eyeCentres(shape)) body.push({ x: eye.x - EYE / 2, y: (eye.y - EYE / 2) / PLATE, z: eye.z - EYE / 2, w: EYE, d: EYE, h: 0, colour: WHITE, ball: true, studs: false })
  if (shape.model) {
    // A bracket on the back of the rim, and the white model of its kind standing on it.
    // It stands out behind the mouth, so a toy coming down into the mouth never meets it.
    body.push(box(c, -2, rim, -3, 2, 1, 1), box(c, -3.6, rim + 1, -5.4, 4.8, 3.2, 1, true))
    for (const brick of modelBricks(shape.model)) body.push({ ...brick, x: brick.x - 1.2, y: brick.y + rim + 2, z: brick.z - 3.8 })
  }
  // A narrow mouth: a shoulder inside the rim on either side.
  if (shape.throat) for (const side of [-1, 1]) body.push(box(c, side > 0 ? shape.throat : -half + 1, rim - 1, -2, half - 1 - shape.throat, 4, 1))
  // Wide bars in front in place of a pane, with the widest gap in the middle.
  if (shape.bars) for (const side of [-1, 1]) body.push(box(c, side * BAR_AT - 0.25, at + 2, 2.2, 0.5, 0.6, shape.belly - 2))
  const window: Brick[] = shape.bars ? [] : [box(WHITE, -half + 1, at + 2, 2.25, shape.width - 2, 0.5, shape.belly - 2)]
  const [left, right] = eyeCentres(shape)
  const dot = EYE * 0.42
  const pupils: Brick[] = [left, right].map((eye) => ({ x: eye.x - dot / 2, y: -dot / 2 / PLATE, z: -dot / 2, w: dot, d: dot, h: 0, colour: BLACK, ball: true, studs: false }))
  // The tongue lies on the floor of the mouth, a little clear of the walls.
  const reach = shape.throat ? shape.throat - 0.15 : half - 1.3
  const tongue: Brick[] = [box(TONGUE, -reach, 0, -1.5, reach * 2, 3.3, 0.5, false)]
  return { body, pupils, window, tongue }
}
