import { bounds, centred, type Brick, type Rgb } from './bricks'
import { TOY_COLOUR, WHITE } from './palette'
import type { Kind, Size, Toy } from './toys'

// The brick builds of the toys. A toy is one flat colour all over and has no
// face, no pattern and no part that moves: its colour, its kind and its size
// are all there is to see. Each build faces along +x, side-on to the child.

const box = (colour: Rgb, x: number, y: number, z: number, w: number, d: number, h: number, studs = true): Brick => ({ x, y, z, w, d, h, colour, studs })
const round = (colour: Rgb, x: number, y: number, z: number, w: number, d: number, h: number, studs = true): Brick => ({ x, y, z, w, d, h, colour, round: true, studs })
/** A wheel: a disc on its side, `w` across and `d` thick, its low edge at `y`. */
const wheel = (colour: Rgb, x: number, y: number, z: number, w: number, d: number): Brick => ({ x, y, z, w, d, h: w / 0.4, colour, round: true, axis: 'z', studs: false })

// A small toy is about three and a half studs long and a big one about five and a half: a big one is clearly the
// bigger of the two, and two big ones still stand side by side on the tray without touching.
function duck(c: Rgb, big: boolean): Brick[] {
  if (!big) return [
    box(c, 0, 0, 0, 2, 2, 3), // body
    box(c, 0, 3, 0.5, 1, 1, 1), // tail
    round(c, 1, 3, 0.2, 1.6, 1.6, 3), // a round head, leaning out over the chest
    box(c, 2.5, 4, 0.6, 0.9, 0.8, 1, false), // bill
  ]
  return [
    box(c, 0, 0, 0, 4, 3, 4),
    box(c, 0, 4, 1, 1, 1, 2),
    round(c, 2, 4, 0.2, 2.6, 2.6, 4),
    box(c, 4.4, 5, 0.9, 1.1, 1.2, 1, false),
  ]
}

function car(c: Rgb, big: boolean): Brick[] {
  if (!big) return [
    box(c, 0, 1, 0, 3, 2, 2), // chassis
    box(c, 0.5, 3, 0, 2, 2, 2), // cab
    wheel(c, 0.1, 0, -0.3, 1.1, 0.5), wheel(c, 1.8, 0, -0.3, 1.1, 0.5),
    wheel(c, 0.1, 0, 1.8, 1.1, 0.5), wheel(c, 1.8, 0, 1.8, 1.1, 0.5),
  ]
  return [
    box(c, 0, 2, 0, 5, 3, 3),
    box(c, 1, 5, 0, 3, 3, 3),
    wheel(c, 0.3, 0, -0.4, 1.8, 0.7), wheel(c, 2.9, 0, -0.4, 1.8, 0.7),
    wheel(c, 0.3, 0, 2.7, 1.8, 0.7), wheel(c, 2.9, 0, 2.7, 1.8, 0.7),
  ]
}

function rocket(c: Rgb, big: boolean): Brick[] {
  if (!big) return [
    box(c, 0.4, 0, 0.7, 0.6, 0.6, 2, false), box(c, 3, 0, 0.7, 0.6, 0.6, 2, false), // fins
    round(c, 1, 0, 0, 2, 2, 5, false), // body
    round(c, 1.3, 5, 0.3, 1.4, 1.4, 2, false), // shoulder
    round(c, 1.6, 7, 0.6, 0.8, 0.8, 2), // nose
  ]
  return [
    box(c, 0, 0, 1, 1, 1, 4, false), box(c, 4, 0, 1, 1, 1, 4, false),
    round(c, 1, 0, 0, 3, 3, 7, false),
    round(c, 1.5, 7, 0.5, 2, 2, 3, false),
    round(c, 2, 10, 1, 1, 1, 3),
  ]
}

const BUILD: { readonly [K in Kind]: (colour: Rgb, big: boolean) => Brick[] } = { duck, car, rocket }

/** A toy's bricks, centred on its footprint and standing on y = 0. */
export function toyBricks(toy: Toy): Brick[] {
  return centred(BUILD[toy.kind](TOY_COLOUR[toy.colour], toy.size === 'big'))
}

/** The same build in white: the model a kind gobbler carries on its head. */
export function modelBricks(kind: Kind, size: Size = 'small'): Brick[] {
  return centred(BUILD[kind](WHITE, size === 'big'))
}


/** How much room a toy takes: its length across, its depth and its height, in world units. */
export function toySpan(toy: Toy): { length: number; depth: number; height: number } {
  const { min, max } = bounds(toyBricks(toy))
  return { length: max[0] - min[0], depth: max[2] - min[2], height: max[1] - min[1] }
}
