import { LAYOUT, STEP } from './props'
import { PAINT } from './roster'
import { MAT, Shape, rgb } from './shapes'

// The wash bay as a place: what stands and hangs around the work and never
// takes part in it. A shelf of soap, a window, a lamp, a roller brush, a pinwheel, and
// out in the yard a hill and toy trees. None of it is a tool and none
// has a face: it is lower in contrast than the three tools and the vehicles,
// and the few pieces that look as if they would answer a touch do answer one
// (`bits.ts`).

const PINK = rgb(0xd9578c), AQUA = rgb(0x2aa7a2), VIOLET = rgb(0x7460c4), SOAP = rgb(0xf3e3c4), GLASS = rgb(0xbfe2ee)
const DIRT = rgb(0x785938), GRASS = rgb(0x3f8a47), LEAF = rgb(0x2f7d43), TRUNK = rgb(0x6b4a2c), BOARD = rgb(0xe9dcc0)
const BRISTLE = rgb(0x2f7fe0), BRISTLE_PALE = rgb(0xeaf3ff)

/** Everything of the place that stands still, in one shape: it is drawn in one call. */
export function placeShape(): Shape {
  const s = new Shape()
  const wall = LAYOUT.wall.z
  // The shelf: a zinc board on two brackets.
  const shelf = LAYOUT.shelf
  s.box([shelf.w, 0.08, 0.44], PAINT.zinc, { at: [shelf.x, shelf.y, wall + 0.24] }, { bevel: 0.025, mat: MAT.metal })
  for (const side of [-1, 1]) s.box([0.08, 0.3, 0.34], PAINT.charcoal, { at: [shelf.x + side * (shelf.w / 2 - 0.3), shelf.y - 0.19, wall + 0.19] }, { bevel: 0.03, top: { sz: 1.2 } })
  // The window's frame and sill. The glass is painted on the wall.
  const w = LAYOUT.window, wx = (w.x0 + w.x1) / 2, wy = (w.y0 + w.y1) / 2, ww = w.x1 - w.x0, wh = w.y1 - w.y0
  for (const y of [w.y0, w.y1]) s.box([ww + 0.22, 0.11, 0.16], PAINT.cream, { at: [wx, y, wall + 0.08] }, { bevel: 0.03 })
  // The uprights stand a little behind the rails, so no two faces of the frame lie in one plane.
  for (const x of [w.x0, w.x1]) s.box([0.11, wh - 0.1, 0.13], PAINT.cream, { at: [x, wy, wall + 0.065] }, { bevel: 0.03 })
  s.box([ww + 0.46, 0.07, 0.3], PAINT.zinc, { at: [wx, w.y0 - 0.08, wall + 0.15] }, { bevel: 0.02, mat: MAT.metal })
  // The roller brush's foot and the arm that holds its top to the wall.
  const roller = LAYOUT.roller
  s.box([0.62, 0.3, 0.6], PAINT.charcoal, { at: [roller.x, 0.15, roller.z] }, { bevel: 0.06 })
  s.box([0.2, 0.12, roller.z - wall + 0.1], PAINT.zinc, { at: [roller.x, roller.y1 + 0.16, (roller.z + wall) / 2] }, { bevel: 0.03, mat: MAT.metal })
  // The pinwheel's pole, in the yard.
  const pin = LAYOUT.pinwheel
  s.round(0.045, pin.y, BOARD, { at: [pin.x, pin.y / 2, pin.z - 0.09] }, { axis: 'y', segs: 8, bevel: 0.02 })
  // Three old tyres stacked by the door post.
  for (let i = 0; i < 3; i++) s.ring(0.3, 0.14, PAINT.rubber, { at: [3.95 + (i % 2) * 0.05, 0.14 + i * 0.27, -2.2], turn: { axis: 'x', by: Math.PI / 2 } }, { mat: MAT.rubber, segs: 18, sides: 8 })
  // The hill: packed dirt with a grass cap, and two toy trees on its far side.
  const hill = LAYOUT.hill
  s.round(hill.foot, hill.h, DIRT, { at: [hill.x, hill.h / 2, hill.z] }, { axis: 'y', r2: hill.top, mat: MAT.soft, segs: 28, bevel: 0.12, capPaint: GRASS })
  // A lower step of grass round its far side, so it is a hill and not a drum.
  s.round(STEP.foot, STEP.h, GRASS, { at: [STEP.x, STEP.h / 2, STEP.z] }, { axis: 'y', r2: STEP.top, mat: MAT.soft, segs: 24, bevel: 0.1 })
  for (const [x, z, size] of [[10.6, -14.2, 1], [13.6, -13.8, 1.25], [8.4, -13.2, 0.8]] as const) {
    s.round(0.16 * size, 1.5 * size, TRUNK, { at: [x, hill.h + 0.75 * size, z] }, { axis: 'y', mat: MAT.soft, segs: 8, bevel: 0.03 })
    s.ball(1.0 * size, LEAF, { at: [x, hill.h + 1.9 * size, z] }, { mat: MAT.soft, segs: 12, squash: [1, 0.9, 1] })
    s.ball(0.62 * size, LEAF, { at: [x + 0.55 * size, hill.h + 2.55 * size, z + 0.1] }, { mat: MAT.soft, segs: 10 })
  }
  return s
}

/** How long the lamp's rod is, from where it hangs out of sight down to the shade. */
export const LAMP_ROD = 1.9

/** The lamp about the point it hangs from: a rod, a green enamel shade and a warm bulb under it. It swings when it is knocked. */
export function lampShape(): Shape {
  const s = new Shape()
  s.round(0.025, LAMP_ROD - 0.25, PAINT.charcoal, { at: [0, -(LAMP_ROD - 0.25) / 2, 0] }, { axis: 'y', segs: 6, bevel: 0.01 })
  s.round(0.5, 0.3, PAINT.green, { at: [0, -LAMP_ROD + 0.15, 0] }, { axis: 'y', r2: 0.14, segs: 18, bevel: 0.04 })
  s.ball(0.17, PAINT.lamp, { at: [0, -LAMP_ROD + 0.02, 0] }, { mat: MAT.lamp, segs: 10 })
  return s
}

/** What stands on the shelf, about the middle of its board: bottles of soap, a jar of bubbles and two bars. One piece, so it jumps as one when the shelf is knocked. */
export function shelfShape(): Shape {
  const s = new Shape()
  // A tall pink bottle with a dark cap.
  s.round(0.15, 0.5, PINK, { at: [-0.95, 0.29, 0] }, { axis: 'y', segs: 14, bevel: 0.05 })
  s.round(0.06, 0.14, PINK, { at: [-0.95, 0.6, 0] }, { axis: 'y', segs: 10, bevel: 0.02 })
  s.round(0.085, 0.1, PAINT.charcoal, { at: [-0.95, 0.71, 0] }, { axis: 'y', segs: 10, bevel: 0.025 })
  // A squat jug.
  s.round(0.22, 0.36, AQUA, { at: [-0.48, 0.22, 0] }, { axis: 'y', r2: 0.17, segs: 16, bevel: 0.05 })
  s.round(0.07, 0.1, PAINT.cream, { at: [-0.48, 0.45, 0] }, { axis: 'y', segs: 10, bevel: 0.02 })
  // A jar of bubble mix: glass under a zinc lid.
  s.round(0.2, 0.42, GLASS, { at: [0.08, 0.25, 0] }, { axis: 'y', mat: MAT.lamp, segs: 16, bevel: 0.04 })
  s.round(0.22, 0.08, PAINT.zinc, { at: [0.08, 0.5, 0] }, { axis: 'y', mat: MAT.metal, segs: 16, bevel: 0.02 })
  // A square bottle with a pale shoulder.
  s.box([0.3, 0.42, 0.2], VIOLET, { at: [0.6, 0.25, 0] }, { bevel: 0.05 })
  s.box([0.14, 0.12, 0.12], PAINT.cream, { at: [0.6, 0.52, 0] }, { bevel: 0.03 })
  // Two bars of soap, one on the other.
  s.box([0.34, 0.1, 0.22], SOAP, { at: [1.02, 0.09, 0] }, { bevel: 0.04, mat: MAT.soft })
  s.box([0.3, 0.1, 0.2], PINK, { at: [1.0, 0.19, 0.01], turn: { axis: 'y', by: 0.3 } }, { bevel: 0.04, mat: MAT.soft })
  return s
}

/** The roller brush about its own axle, its foot at the origin: tiers of soft flaps, each tier turned a little on from the one below, so its turning shows. */
export function rollerShape(): Shape {
  const s = new Shape()
  const roller = LAYOUT.roller, tall = roller.y1 - roller.y0
  s.round(0.06, tall + 0.3, PAINT.zinc, { at: [0, tall / 2, 0] }, { axis: 'y', mat: MAT.metal, segs: 8, bevel: 0.02 })
  s.round(0.19, tall, BRISTLE, { at: [0, tall / 2, 0] }, { axis: 'y', mat: MAT.soft, segs: 12, bevel: 0.04 })
  // Thin flaps all round, painted in bands that wind up it like the stripe of a barber's pole.
  const tiers = 15, flaps = 9
  for (let tier = 0; tier < tiers; tier++) {
    const y = ((tier + 0.5) / tiers) * tall
    for (let i = 0; i < flaps; i++) {
      const a = (i / flaps) * Math.PI * 2 + tier * 0.23
      const paint = (i + Math.floor(tier / 2)) % 3 === 0 ? BRISTLE_PALE : BRISTLE
      s.box([0.24, tall / tiers + 0.02, 0.035], paint, { at: [Math.cos(a) * 0.29, y, -Math.sin(a) * 0.29], turn: { axis: 'y', by: a + 0.5 } }, { bevel: 0.012, mat: MAT.soft })
    }
  }
  return s
}

/** How far the roller's flaps reach from its axle. */
export const ROLLER_REACH = 0.42

/** The pinwheel about its hub, facing +z: five folded vanes in five paints. Five, so that it never stands as a cross. */
export function pinwheelShape(): Shape {
  const s = new Shape()
  const paints = [PAINT.red, PAINT.yellow, BRISTLE, PAINT.cream, PAINT.green]
  for (let i = 0; i < paints.length; i++) {
    const a = (i / paints.length) * Math.PI * 2
    // Each vane is a wedge from the hub out, leaning into the wind.
    // Each lies a little in front of the one before it, as folded paper does, so no two share a plane.
    s.box([0.7, 0.34, 0.03], paints[i], { at: [Math.cos(a + 0.35) * 0.37, Math.sin(a + 0.35) * 0.37, 0.0 + i * 0.034], turn: { axis: 'z', by: a + 0.35 } }, { bevel: 0.01, top: { sx: 0.25, dx: -0.2 } })
  }
  s.ball(0.1, PAINT.zinc, { at: [0, 0, 0.2] }, { mat: MAT.metal, segs: 8 })
  return s
}
