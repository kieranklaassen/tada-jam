import { PLATE, type Brick, type Rgb } from './bricks'
import { modelBricks } from './builds'
import { BLACK, TONGUE, WHITE } from './palette'
import type { Kind } from './toys'

// A gobbler: a brick-built bin on legs, in two storeys. The top one is its
// mouth: a shallow dish with a pink tongue for a floor and a small throat in
// the middle of it. The one below is its belly, behind a clear front, where
// the toys it has swallowed stand small in two rows, the back row on a step.
// Its body shows what it takes: the colour it is built in, the white model
// that stands on its back, or its size.

export type GobblerShape = {
  /** Width across, in studs. Depth is always six. */
  width: number
  /** Height of the belly storey, in plates. */
  belly: number
  colour: Rgb
  /** The kind whose white model stands on its back, for a gobbler that goes by kind. */
  model?: Kind
  /** Half the width of its mouth, where that is narrower than its belly: nothing longer goes in. */
  throat?: number
  /** The front of its mouth is wide bars: a small thing put in slides out between them. */
  bars?: boolean
}

export type GobblerParts = {
  /** Feet, legs, both storeys, the tongue, its teeth, the knob on its head and the whites of its eyes, as one build standing on y = 0. */
  body: Brick[]
  /** Both pupils, as one build about the origin: the two always look the same way, so they move as one. */
  pupils: Brick[]
  /** The clear front of the belly. */
  window: Brick[]
}

const DEPTH = 6
/** Legs, in plates: the body starts here. */
export const LEGS = 3
/** How deep the dish of the mouth is, in plates. */
export const DISH = 3
/**
 * How high the step is that the back row of a belly stands on, in plates, and where the two rows stand from front
 * to back: each as far as it can from the other, the front one just behind the window and the back one just in
 * front of the lining, so that the deepest toy there is, a big car with its wheels out, touches neither.
 */
export const BELLY_STEP = 2.5
export const ROW_Z = 1.07
export const ROW_BACK = -0.79
/** The width of an eyeball. The eyes are balls, the one part of a gobbler that is not a brick. */
export const EYE = 2.5
/** The height of the knob on its head, in plates: tall enough that the teeth that hold it stay clear of the rim however the gobbler leans. */
const KNOB = 5
/** How wide the throat in the tongue is: a toy passes it only when it is chewed small. */
export const THROAT = 1
/** Where the bars of a barred mouth stand, either side of the middle: the gap between them lets a small toy through and no big one. */
export const BAR_AT = 2.05

const box = (colour: Rgb, x: number, y: number, z: number, w: number, d: number, h: number, studs = false): Brick => ({ x, y, z, w, d, h, colour, studs })
const peg = (x: number, y: number, z: number): Brick => ({ x, y, z, w: 0.8, d: 0.8, h: 2, colour: WHITE, round: true, studs: false })

/** The height of the top of the tongue above the feet, in plates. */
const tonguePlates = (shape: GobblerShape) => LEGS + 1 + shape.belly + 1

/** The height of the rim of the mouth above the feet, in world units. */
export function rimHeight(shape: GobblerShape): number {
  return (tonguePlates(shape) + DISH) * PLATE
}

/** The height of the top of the tongue above the feet: where a toy in the mouth lies. */
export function tongueTop(shape: GobblerShape): number {
  return tonguePlates(shape) * PLATE
}

/** The middle of each eye, measured from the feet (world units). */
export function eyeCentres(shape: GobblerShape): { x: number; y: number; z: number }[] {
  const y = rimHeight(shape) + EYE * 0.42
  // Flush with its sides: two gobblers side by side never touch eyes, however they sway.
  const x = shape.width / 2 - EYE / 2
  return [{ x: -x, y, z: DEPTH / 2 - 0.6 }, { x, y, z: DEPTH / 2 - 0.6 }]
}

/** The inside of the belly, measured from the feet: where the group stands and what the window shows. */
export function bellyBox(shape: GobblerShape): { x: number; y: number; z: number; w: number; h: number; d: number } {
  return { x: -shape.width / 2 + 1, y: (LEGS + 1) * PLATE, z: -DEPTH / 2 + 1, w: shape.width - 2, h: shape.belly * PLATE, d: DEPTH - 2 }
}

/** The knob on its head that the claw lifts it by: the middle of its top, measured from the feet. */
export function knobAt(shape: GobblerShape): { x: number; y: number; z: number } {
  return { x: shape.width / 2 - 1.6, y: rimHeight(shape) + KNOB * PLATE, z: -DEPTH / 2 + 0.2 }
}

/** How far to the side of the middle of the head, away from the knob, the model stands. */
const MODEL_ASIDE = 1.6

export function gobblerParts(shape: GobblerShape): GobblerParts {
  const c = shape.colour, half = shape.width / 2, at = LEGS, tongue = tonguePlates(shape), rim = tongue + DISH, walls = rim - at - 1
  const foot = Math.max(1.5, half - 2.5)
  const body: Brick[] = [
    box(c, -foot - 1, 0, -1, 2, 3, 1, true), box(c, foot - 1, 0, -1, 2, 3, 1, true), // feet
    { x: -foot - 0.8, y: 1, z: -0.3, w: 1.6, d: 1.6, h: LEGS - 1, colour: c, round: true, studs: false }, // legs
    { x: foot - 0.8, y: 1, z: -0.3, w: 1.6, d: 1.6, h: LEGS - 1, colour: c, round: true, studs: false },
    box(c, -half, at, -3, shape.width, DEPTH, 1), // floor of the belly
    box(c, -half, at + 1, -3, shape.width, 1, walls, true), // back
    box(c, -half, at + 1, -2, 1, 5, walls, true), // sides
    box(c, half - 1, at + 1, -2, 1, 5, walls, true),
    box(c, -half + 1, at + 1, 2, shape.width - 2, 1, 1), // the sill under the window
    // A white lining behind the group and a white step for its back row, so a toy of the gobbler's own colour
    // shows. Each stands a hair off the wall.
    box(WHITE, -half + 1.05, at + 1.05, -1.95, shape.width - 2.1, 0.25, shape.belly - 0.3),
    box(WHITE, -half + 1.05, at + 1, -1.65, shape.width - 2.1, 1.4, BELLY_STEP),
    // The knob the claw lifts it by, at the back of its head.
    { x: half - 2.4, y: rim, z: -3.6, w: 1.6, d: 1.6, h: KNOB, colour: c, round: true, studs: true },
  ]
  // The tongue: the floor of the mouth, in four parts round the throat in its middle.
  const inner = half - 1, t = THROAT / 2
  body.push(box(TONGUE, -inner, tongue - 1, -2, inner - t, 4, 1), box(TONGUE, t, tongue - 1, -2, inner - t, 4, 1))
  body.push(box(TONGUE, -t, tongue - 1, -2, THROAT, 2 - t, 1), box(TONGUE, -t, tongue - 1, t, THROAT, 2 - t, 1))
  // The front of the mouth, above the window: a wall, or wide bars with the widest gap in the middle.
  if (shape.bars) {
    // A wall outside the bars, where the mouth is wide enough to have one.
    const wall = half - 1 - BAR_AT - 0.25 - 3.2
    if (wall > 0.05) for (const side of [-1, 1]) body.push(box(c, side > 0 ? BAR_AT + 0.25 + 3.2 : -half + 1, tongue - 1, 2, wall, 1, 1 + DISH, true))
    for (const side of [-1, 1]) body.push(box(c, side * BAR_AT - 0.25, tongue - 1, 2.2, 0.5, 0.6, 1 + DISH + 3))
    body.push(box(c, -half + 1, tongue - 1, 2, shape.width - 2, 1, 1))
  } else body.push(box(c, -half + 1, tongue - 1, 2, shape.width - 2, 1, 1 + DISH, true))
  // A narrow mouth: a shoulder inside the dish on either side.
  if (shape.throat) for (const side of [-1, 1]) body.push(box(c, side > 0 ? shape.throat : -inner, tongue, -2, inner - shape.throat, 4, DISH, true))
  // Peg teeth along the front and the back of the rim. The back row stops short of the knob, so the jaws have
  // room beside it; the front row leaves the gaps between bars open; and a gobbler with a model on the back of
  // its rim has no back row, the bracket of the model standing where it would be.
  for (let x = -half + 1.6; x < half - 3; x += 2) { if (!shape.bars) body.push(peg(x, rim, 2.1)); if (x + 1 < half - 4.6 && !shape.model) body.push(peg(x + 1, rim, -2.9)) }
  // Eyes like a frog's, on the front corners, clear of the mouth.
  for (const eye of eyeCentres(shape)) body.push({ x: eye.x - EYE / 2, y: (eye.y - EYE / 2) / PLATE, z: eye.z - EYE / 2, w: EYE, d: EYE, h: 0, colour: WHITE, ball: true, studs: false })
  if (shape.model) {
    // A bracket on the back of the rim, and the white model of its kind standing on it. It stands out behind
    // the mouth and well to one side of the knob, so neither a toy coming down nor the jaws, wide open, ever meet it.
    body.push(box(c, -2 - MODEL_ASIDE, rim, -3, 2, 1, 1), box(c, -3.6 - MODEL_ASIDE, rim + 1, -5.4, 4.8, 3.2, 1, true))
    for (const brick of modelBricks(shape.model)) body.push({ ...brick, x: brick.x - 1.2 - MODEL_ASIDE, y: brick.y + rim + 2, z: brick.z - 3.8 })
  }
  const window: Brick[] = [box(WHITE, -half + 1, at + 2, 2.25, shape.width - 2, 0.5, shape.belly - 2)]
  const [left, right] = eyeCentres(shape)
  const dot = EYE * 0.42
  const pupils: Brick[] = [left, right].map((eye) => ({ x: eye.x - dot / 2, y: -dot / 2 / PLATE, z: -dot / 2, w: dot, d: dot, h: 0, colour: BLACK, ball: true, studs: false }))
  return { body, pupils, window }
}
