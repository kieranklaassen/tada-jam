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
  exit: { x: -13.5, z: -0.5 },
  /** The mud puddle in the yard. */
  puddle: { x: 4.1, z: 1.45, rx: 0.78, rz: 0.5 },
  /** The rack stands toward the child, clear of the lane the vehicles leave by. */
  rack: { x: -4.45, z: 1.6 },
  /** The tap on the rack's long arm, over the nose of the vehicle in the bay. It lets a drop go only in the first showing. */
  tap: { x: -1.85, y: 3.92, z: 0.3 },
  wall: { z: -2.7 },
  /** The wet pad of the bay, in x and z. */
  pad: { x0: -3.2, x1: 3.0, z0: -1.9, z1: 2.0 },
  /** Where the yard's dirt begins. */
  yardFrom: 3.3,
} as const

/** Where each tool hangs: its own origin in the world. */
export const TOOL_HOME: Readonly<Record<Tool, readonly [number, number, number]>> = {
  cloth: [LAYOUT.rack.x + 0.62, 3.62, LAYOUT.rack.z],
  // The nozzle hangs wholly inside the coil's ring, touching neither turn of it.
  hose: [LAYOUT.rack.x + 0.63, 2.42, LAYOUT.rack.z + 0.01],
  sponge: [LAYOUT.rack.x + 0.66, 1.06, LAYOUT.rack.z],
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
  // The long arm from the top of the post out over the lane, and the tap at its end.
  const reach = Math.hypot(LAYOUT.tap.x - x, LAYOUT.tap.z - z), swing = Math.atan2(-(LAYOUT.tap.z - z), LAYOUT.tap.x - x)
  s.round(0.055, reach, PAINT.zinc, { at: [(x + LAYOUT.tap.x) / 2, 4.12, (z + LAYOUT.tap.z) / 2], turn: { axis: 'y', by: swing } }, { axis: 'x', mat: MAT.metal, segs: 10 })
  s.round(0.1, 0.2, PAINT.red, { at: [LAYOUT.tap.x, 4.06, LAYOUT.tap.z] }, { axis: 'y', segs: 12, bevel: 0.03 })
  s.round(0.06, 0.12, PAINT.zinc, { at: [LAYOUT.tap.x, 3.94, LAYOUT.tap.z] }, { axis: 'y', mat: MAT.metal, segs: 10, bevel: 0.02 })
  // The bucket: blue enamel, wider at the rim, with a zinc band.
  s.round(0.4, 0.62, PAINT.blue, { at: [x + 0.66, 0.43, z] }, { axis: 'y', r2: 0.5, segs: 20, bevel: 0.05 })
  s.round(0.52, 0.07, PAINT.zinc, { at: [x + 0.66, 0.74, z] }, { axis: 'y', mat: MAT.metal, segs: 20, bevel: 0.02 })
  s.ball(0.46, SUDS, { at: [x + 0.66, 0.72, z] }, { mat: MAT.soft, from: 0, squash: [1, 0.35, 1], segs: 16 })
  // Two turns of hose on the middle arm; the nozzle hangs from them and is the tool.
  s.ring(0.44, 0.085, HOSE, { at: [x + 0.62, 2.2, z - 0.07] }, { mat: MAT.rubber, segs: 28, sides: 8 })
  s.ring(0.4, 0.085, HOSE, { at: [x + 0.65, 2.17, z + 0.09] }, { mat: MAT.rubber, segs: 28, sides: 8 })
  return s
}

/** How each tool hangs on the rack: a turn about z. */
export const TOOL_HANG: Readonly<Record<Tool, number>> = { cloth: 0, hose: 0, sponge: 0 }

/** The middle of each tool as it hangs, from its origin: where a finger aims and where a glow sits. */
export const TOOL_MIDDLE: Readonly<Record<Tool, readonly [number, number, number]>> = { cloth: [0, -0.42, 0], hose: [0, -0.2, 0], sponge: [0, 0, 0] }

/** Each tool about its own origin, as it hangs. */
export function toolShape(tool: Tool): Shape {
  const s = new Shape()
  if (tool === 'sponge') {
    s.box([0.82, 0.4, 0.56], SPONGE, { turn: { axis: 'z', by: 0.12 } }, { bevel: 0.11, mat: MAT.soft })
  } else if (tool === 'hose') {
    // The nozzle, pointing down -y from its origin: a stub of hose, a red grip, a zinc tip. The coil stays on the rack.
    s.round(0.08, 0.2, HOSE, { at: [0, 0.0, 0] }, { axis: 'y', mat: MAT.rubber, segs: 10 })
    s.round(0.1, 0.3, PAINT.red, { at: [0, -0.24, 0] }, { axis: 'y', r2: 0.16, segs: 14, bevel: 0.03 })
    s.round(0.08, 0.14, PAINT.zinc, { at: [0, -0.45, 0] }, { axis: 'y', mat: MAT.metal, segs: 12, bevel: 0.02 })
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
  for (const x of [-5.4, -2.4, 0.6]) s.box([0.16, 0.3, 0.3], PAINT.zinc, { at: [x, 3.55, wall + 0.14] }, { bevel: 0.04, mat: MAT.metal })
  // The door post: yellow with dark bands, and a lintel.
  const post = LAYOUT.yardFrom - 0.1
  s.box([0.36, 5.2, 0.36], PAINT.yellow, { at: [post, 2.6, wall + 0.2] }, { bevel: 0.05 })
  for (const y of [0.5, 1.5, 2.5, 3.5, 4.5]) s.box([0.46, 0.4, 0.46], PAINT.charcoal, { at: [post, y, wall + 0.2] }, { bevel: 0.05 })
  // A drain grate at the front of the pad.
  s.box([1.1, 0.04, 0.5], PAINT.charcoal, { at: [0.2, 0.02, 1.62] }, { bevel: 0.015 })
  for (let i = -3; i <= 3; i++) s.box([0.07, 0.1, 0.42], PAINT.zinc, { at: [0.2 + i * 0.15, 0.05, 1.62] }, { bevel: 0.01, mat: MAT.metal })
  return s
}
