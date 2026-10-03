import { PAINT } from './roster'
import { MAT, Shape, rgb } from './shapes'
import type { Tool } from './surface'

// The wash bay's fixed things and its three tools, as shapes. The tools are
// working objects: plain, with no face, no pattern and no motion of their own
// beyond what the material does (pack: game-design, working-objects-stay-plain.md).

export const LAYOUT = {
  /** Where the vehicle being washed stands. */
  bay: { x: 0, z: 0 },
  /** Where the next one waits, nose at the door. */
  door: { x: 6.15, z: -0.6 },
  /** The far end a vehicle leaves by, past the rack. */
  exit: { x: -13, z: -0.3 },
  /** The mud puddle in the yard. */
  puddle: { x: 4.1, z: 1.45, rx: 0.78, rz: 0.5 },
  rack: { x: -3.95, z: 0.35 },
  wall: { z: -2.7 },
  /** The wet pad of the bay, in x and z. */
  pad: { x0: -3.2, x1: 3.0, z0: -1.9, z1: 2.0 },
  /** Where the yard's dirt begins. */
  yardFrom: 3.3,
} as const

/** Where each tool hangs: its own origin in the world. */
export const TOOL_HOME: Readonly<Record<Tool, readonly [number, number, number]>> = {
  cloth: [LAYOUT.rack.x + 0.62, 3.62, LAYOUT.rack.z],
  hose: [LAYOUT.rack.x + 0.62, 2.2, LAYOUT.rack.z],
  sponge: [LAYOUT.rack.x + 0.66, 0.98, LAYOUT.rack.z],
}

const SPONGE = rgb(0xffd21f), HOSE = rgb(0x1fae54), CLOTH = rgb(0xf6f1e6), STRIPE = rgb(0xd61f2c), SUDS = rgb(0xf4fbff)

/** The post the tools hang on, with its three arms and the bucket the sponge lives on. */
export function rackShape(): Shape {
  const s = new Shape()
  const { x, z } = LAYOUT.rack
  s.box([1.5, 0.12, 1.1], PAINT.charcoal, { at: [x + 0.35, 0.06, z] }, { bevel: 0.04 })
  s.round(0.1, 4.2, PAINT.yellow, { at: [x, 2.1, z] }, { axis: 'y', segs: 14 })
  s.ball(0.17, PAINT.yellow, { at: [x, 4.22, z] }, { segs: 12 })
  for (const y of [3.64, 2.72]) {
    s.round(0.055, 0.8, PAINT.zinc, { at: [x + 0.4, y, z] }, { axis: 'x', mat: MAT.metal, segs: 10 })
    s.ball(0.09, PAINT.zinc, { at: [x + 0.8, y, z] }, { mat: MAT.metal, segs: 10 })
  }
  // The bucket: blue enamel, wider at the rim, with a zinc band.
  s.round(0.4, 0.62, PAINT.blue, { at: [x + 0.66, 0.43, z] }, { axis: 'y', r2: 0.5, segs: 20, bevel: 0.05 })
  s.round(0.52, 0.07, PAINT.zinc, { at: [x + 0.66, 0.74, z] }, { axis: 'y', mat: MAT.metal, segs: 20, bevel: 0.02 })
  s.ball(0.46, SUDS, { at: [x + 0.66, 0.72, z] }, { mat: MAT.soft, from: 0, squash: [1, 0.35, 1], segs: 16 })
  return s
}

/** Each tool about its own origin, as it hangs. */
export function toolShape(tool: Tool): Shape {
  const s = new Shape()
  if (tool === 'sponge') {
    s.box([0.82, 0.4, 0.56], SPONGE, { turn: { axis: 'z', by: 0.12 } }, { bevel: 0.11, mat: MAT.soft })
  } else if (tool === 'hose') {
    // Two turns of hose on the arm, and the nozzle hanging from them.
    s.ring(0.44, 0.085, HOSE, { at: [0, 0, -0.07] }, { mat: MAT.rubber, segs: 28, sides: 8 })
    s.ring(0.4, 0.085, HOSE, { at: [0.03, -0.03, 0.09] }, { mat: MAT.rubber, segs: 28, sides: 8 })
    s.round(0.085, 0.3, HOSE, { at: [0.36, -0.4, 0.09], turn: { axis: 'z', by: -0.9 } }, { axis: 'y', mat: MAT.rubber, segs: 10 })
    s.round(0.16, 0.4, PAINT.red, { at: [0.6, -0.59, 0.09], turn: { axis: 'z', by: -0.9 } }, { axis: 'y', r2: 0.1, segs: 14, bevel: 0.03 })
    s.round(0.08, 0.18, PAINT.zinc, { at: [0.82, -0.765, 0.09], turn: { axis: 'z', by: -0.9 } }, { axis: 'y', mat: MAT.metal, segs: 12, bevel: 0.02 })
  } else {
    // A folded cloth over the arm: cream with two red stripes.
    s.round(0.11, 0.84, CLOTH, { at: [0, 0.02, 0] }, { axis: 'x', mat: MAT.soft, segs: 12, bevel: 0.05 })
    s.box([0.84, 0.8, 0.07], CLOTH, { at: [0, -0.4, 0.1], turn: { axis: 'x', by: 0.05 } }, { bevel: 0.03, mat: MAT.soft, top: { sx: 1, sz: 1, dx: 0 } })
    s.box([0.84, 0.5, 0.07], CLOTH, { at: [0, -0.25, -0.1], turn: { axis: 'x', by: -0.05 } }, { bevel: 0.03, mat: MAT.soft })
    for (const y of [-0.54, -0.68]) s.box([0.86, 0.07, 0.075], STRIPE, { at: [0, y, 0.116], turn: { axis: 'x', by: 0.05 } }, { bevel: 0.01, mat: MAT.soft })
    // A corner hanging lower, so it reads as cloth and not as a board.
    s.box([0.3, 0.3, 0.07], CLOTH, { at: [0.2, -0.82, 0.125], turn: { axis: 'z', by: 0.6 } }, { bevel: 0.03, mat: MAT.soft })
  }
  return s
}

/** The back wall's fittings and the door the vehicles come through. */
export function bayShape(): Shape {
  const s = new Shape()
  const wall = LAYOUT.wall.z
  // A red water pipe along the wall, on zinc brackets, down to the rack.
  s.round(0.11, 9.6, PAINT.red, { at: [-1.2, 3.55, wall + 0.2] }, { axis: 'x', segs: 12 })
  for (const x of [-5.4, -2.4, 0.6, 3.2]) s.box([0.16, 0.3, 0.3], PAINT.zinc, { at: [x, 3.55, wall + 0.14] }, { bevel: 0.04, mat: MAT.metal })
  // The door post: yellow with dark bands, and a lintel.
  const post = LAYOUT.yardFrom - 0.1
  s.box([0.36, 5.2, 0.36], PAINT.yellow, { at: [post, 2.6, wall + 0.2] }, { bevel: 0.05 })
  for (const y of [0.5, 1.5, 2.5, 3.5, 4.5]) s.box([0.38, 0.4, 0.38], PAINT.charcoal, { at: [post, y, wall + 0.2] }, { bevel: 0.05 })
  // A drain grate at the front of the pad.
  s.box([1.1, 0.04, 0.5], PAINT.charcoal, { at: [0.2, 0.02, 1.62] }, { bevel: 0.015 })
  for (let i = -3; i <= 3; i++) s.box([0.07, 0.05, 0.42], PAINT.zinc, { at: [0.2 + i * 0.15, 0.03, 1.62] }, { bevel: 0.01, mat: MAT.metal })
  return s
}
