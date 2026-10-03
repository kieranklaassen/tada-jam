import { PLATE, type Brick, type Rgb } from './bricks'
import { modelBricks } from './builds'
import { TONGUE, WHITE } from './palette'
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
}

export type GobblerParts = {
  /** Feet and legs: they stay planted while the body above them squashes and stretches. */
  base: Brick[]
  /** The bin, its teeth and the whites of its eyes, with y = 0 at the top of the legs. */
  body: Brick[]
  /** The clear front of the belly, in the body's own space. */
  window: Brick[]
  /** The tongue: a plate that rises out of the mouth with whatever lies on it. */
  tongue: Brick[]
}

const DEPTH = 6
/** Legs, in plates: the body starts here. */
export const LEGS = 3
/** The width of an eyeball. The eyes are balls, the one part of a gobbler that is not a brick. */
export const EYE = 2.5

const box = (colour: Rgb, x: number, y: number, z: number, w: number, d: number, h: number, studs = false): Brick => ({ x, y, z, w, d, h, colour, studs })
const peg = (x: number, y: number, z: number): Brick => ({ x, y, z, w: 0.8, d: 0.8, h: 2, colour: WHITE, round: true, studs: false })

/** The height of the rim of the mouth above the feet, in world units. */
export function rimHeight(shape: GobblerShape): number {
  return (LEGS + 1 + shape.belly) * PLATE
}

/** The middle of each eye on the body, in the body's own space (world units). */
export function eyeCentres(shape: GobblerShape): { x: number; y: number; z: number }[] {
  const y = (1 + shape.belly) * PLATE + EYE * 0.42
  const x = shape.width / 2 - 0.3
  return [{ x: -x, y, z: DEPTH / 2 - 0.6 }, { x, y, z: DEPTH / 2 - 0.6 }]
}

/** The inside of the belly, in the body's own space: where the group lies and what the window shows. */
export function bellyBox(shape: GobblerShape): { x: number; y: number; z: number; w: number; h: number; d: number } {
  return { x: -shape.width / 2 + 1, y: 1 * PLATE, z: -DEPTH / 2 + 1, w: shape.width - 2, h: shape.belly * PLATE, d: DEPTH - 2 }
}

export function gobblerParts(shape: GobblerShape): GobblerParts {
  const c = shape.colour, half = shape.width / 2, rim = 1 + shape.belly
  const foot = Math.max(1.5, half - 2.5)
  const base: Brick[] = [
    box(c, -foot - 1, 0, -1, 2, 3, 1, true), box(c, foot - 1, 0, -1, 2, 3, 1, true),
    { x: -foot - 0.8, y: 1, z: -0.3, w: 1.6, d: 1.6, h: LEGS - 1, colour: c, round: true, studs: false },
    { x: foot - 0.8, y: 1, z: -0.3, w: 1.6, d: 1.6, h: LEGS - 1, colour: c, round: true, studs: false },
  ]
  const body: Brick[] = [
    box(c, -half, 0, -3, shape.width, DEPTH, 1), // floor of the belly
    box(WHITE, -half + 1, 1, -2, shape.width - 2, 0.3, shape.belly), // a white lining behind the group, so a toy of the gobbler's own colour shows
    box(c, -half, 1, -3, shape.width, 1, shape.belly, true), // back
    box(c, -half, 1, -2, 1, 5, shape.belly, true), // sides
    box(c, half - 1, 1, -2, 1, 5, shape.belly, true),
    box(c, -half + 1, 1, 2, shape.width - 2, 1, 1), // the sill under the window
    box(c, -half + 1, rim - 1, 2, shape.width - 2, 1, 1), // the bar over it
  ]
  // Peg teeth along the front and the back of the rim.
  for (let x = -half + 1.6; x < half - 2; x += 2) body.push(peg(x, rim, 2.1), peg(x + 1, rim, -2.9))
  if (shape.model) {
    // A bracket on the back of the rim, and the white model of its kind standing on it.
    body.push(box(c, -1, rim, -3, 2, 1, 3), box(c, -3, rim + 3, -4, 6, 3, 1, true))
    for (const brick of modelBricks(shape.model)) body.push({ ...brick, y: brick.y + rim + 4, z: brick.z - 2.5 })
  }
  const window: Brick[] = [box(WHITE, -half + 1, 2, 2.25, shape.width - 2, 0.5, shape.belly - 2)]
  // The tongue lies on the floor of the mouth, a little clear of the walls.
  const tongue: Brick[] = [box(TONGUE, -half + 1.2, 0, -1.6, shape.width - 2.4, 3.6, 0.5, false)]
  return { base, body, window, tongue }
}
