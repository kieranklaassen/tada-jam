import { PAINT } from './roster'
import { MAT, Shape, rgb } from './shapes'
import type { Tool } from './surface'

// The wash bay's fixed things and its three tools, as shapes. The tools are
// working objects: plain, with no face, no pattern and no motion of their own
// beyond what the material does (pack: game-design, working-objects-stay-plain.md).

export const LAYOUT = {
  /** Where the vehicle being washed stands. */
  bay: { x: 0, z: 0 },
  /** Where the next one waits, nose at the door: far enough along that its nose is clear of the tail of the one in the bay as the child sees them. */
  door: { x: 6.7, z: -0.6 },
  /** The far end a vehicle leaves by, past the rack. */
  exit: { x: -13.5, z: -0.5 },
  /** The mud puddle in the yard: toward the child from the vehicle that waits, with clear dirt between the two, so a finger on one is not on the other. */
  puddle: { x: 4.45, z: 2.05, rx: 0.7, rz: 0.48 },
  /** The rack stands toward the child, clear of the lane the vehicles leave by. */
  rack: { x: -4.45, z: 1.6 },
  /** The tap on the rack's long arm, over the nose of the vehicle in the bay. It lets a drop go only in the first showing. */
  tap: { x: -1.45, y: 3.8, z: 0.3, hang: 4.12 },
  wall: { z: -2.7 },
  /** The wet pad of the bay, in x and z. */
  pad: { x0: -3.2, x1: 3.0, z0: -1.9, z1: 2.0 },
  /** The drain at the front of the pad. */
  drain: { x: 0.2, z: 1.62 },
  /** Water standing on the open floor in front of the pad: two thin pools, each an oval in x and z. */
  pools: [{ x: -1.3, z: 3.75, rx: 1.25, rz: 0.5 }, { x: 1.75, z: 4.6, rx: 1.0, rz: 0.42 }],
  /** The red water pipe along the back wall. */
  pipe: { x0: -6.0, x1: 3.6, y: 3.55, r: 0.11 },
  /** The suds bucket the sponge lives on, beside the rack's post: how far from the post, how wide at the rim, how high. */
  bucket: { dx: 0.66, r: 0.52, top: 0.78 },
  /** Where the yard's dirt begins. */
  yardFrom: 3.3,
  /** The shelf of soap on the back wall: the middle of its board. */
  shelf: { x: -0.7, y: 4.25, w: 2.5 },
  /** The window high in the back wall, in x and y. */
  window: { x0: 1.2, x1: 2.85, y0: 4.0, y1: 4.98 },
  /** The roller brush that stands at the wall behind the tail of the vehicle in the bay: its foot. */
  roller: { x: 2.35, z: -2.26, y0: 0.38, y1: 3.42 },
  /** The pinwheel on its pole in the yard: its hub. */
  pinwheel: { x: 5.05, y: 2.05, z: -3.7 },
  /** The lamp that hangs over the rack's end of the bay: the bottom of its shade. */
  lamp: { x: -2.9, y: 4.55, z: -1.7 },
  /** The yard's hill: a flat-topped bank of packed dirt the queue comes down. */
  hill: { x: 11.6, z: -9.6, foot: 6.6, top: 5.8, h: 1.6 },
  /**
   * Where the two that are not yet at the door wait their turn, side by side on the hill, and how far each is turned
   * toward the bay and the child. The head of the queue stands on the side it leaves by, round to the door; the other stands on the
   * side the one that has just left comes back by, from behind the bay.
   */
  queue: [{ x: 12.0, z: -8.2, turn: 1.0 }, { x: 8.9, z: -8.9, turn: 0.9 }],
} as const

/** The hill's lower step of grass, round its far side: a second, wider and lower bank, set off from the hill's middle. */
export const STEP = { x: LAYOUT.hill.x + 2.4, z: LAYOUT.hill.z - 2.0, foot: LAYOUT.hill.foot + 1.2, top: LAYOUT.hill.foot + 0.6, h: 0.7 } as const

/** How high the yard's ground is at a spot: the floor, the hill, or the hill's lower step. */
export function groundAt(x: number, z: number): number {
  const bank = (b: { x: number; z: number; foot: number; top: number; h: number }): number => b.h * Math.max(0, Math.min(1, (b.foot - Math.hypot(x - b.x, z - b.z)) / (b.foot - b.top)))
  return Math.max(bank(LAYOUT.hill), bank(STEP))
}

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
  s.ball(0.075, PAINT.zinc, { at: [LAYOUT.tap.x, LAYOUT.tap.hang, LAYOUT.tap.z] }, { mat: MAT.metal, segs: 10 })
  // The bucket: blue enamel, wider at the rim, with a zinc band.
  s.round(0.4, 0.62, PAINT.blue, { at: [x + 0.66, 0.43, z] }, { axis: 'y', r2: 0.5, segs: 20, bevel: 0.05 })
  s.round(0.52, 0.07, PAINT.zinc, { at: [x + 0.66, 0.74, z] }, { axis: 'y', mat: MAT.metal, segs: 20, bevel: 0.02 })
  s.ball(0.46, SUDS, { at: [x + 0.66, 0.72, z] }, { mat: MAT.soft, from: 0, squash: [1, 0.35, 1], segs: 16 })
  // A reel on the middle arm: a dark back plate with a zinc boss, and two turns of hose round it. With the plate behind it the coil
  // is a filled wheel and never an empty ring, whether the nozzle hangs in it or is in the hand.
  s.round(0.35, 0.04, PAINT.charcoal, { at: [x + 0.63, 2.19, z - 0.2] }, { axis: 'z', segs: 24, bevel: 0.012 })
  s.round(0.09, 0.07, PAINT.zinc, { at: [x + 0.63, 2.19, z - 0.185] }, { axis: 'z', mat: MAT.metal, segs: 12, bevel: 0.015 })
  // The nozzle hangs in front of the plate, inside the turns, and is the tool.
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

/**
 * The tap, about the point it hangs from at the end of the arm: a thin stem,
 * a red body and a zinc mouth below it. It is not a tool. It lets a drop go
 * in the first showing only; touched, it swings and gives no water.
 */
export function tapShape(): Shape {
  const s = new Shape()
  s.round(0.025, 0.14, PAINT.zinc, { at: [0, -0.1, 0] }, { axis: 'y', mat: MAT.metal, segs: 8, bevel: 0.008 })
  s.round(0.1, 0.2, PAINT.red, { at: [0, -0.24, 0] }, { axis: 'y', segs: 12, bevel: 0.03 })
  s.round(0.06, 0.1, PAINT.zinc, { at: [0, -0.37, 0] }, { axis: 'y', mat: MAT.metal, segs: 10, bevel: 0.02 })
  return s
}

/** The back wall's fittings and the door the vehicles come through. */
export function bayShape(): Shape {
  const s = new Shape()
  const wall = LAYOUT.wall.z
  // A red water pipe along the wall, on zinc brackets, down to the rack.
  const pipe = LAYOUT.pipe
  s.round(pipe.r, pipe.x1 - pipe.x0, PAINT.red, { at: [(pipe.x0 + pipe.x1) / 2, pipe.y, wall + 0.2] }, { axis: 'x', segs: 12 })
  for (const x of [-5.4, -2.4, 0.6]) s.box([0.16, 0.3, 0.3], PAINT.zinc, { at: [x, pipe.y, wall + 0.14] }, { bevel: 0.04, mat: MAT.metal })
  // The door post: yellow with dark bands, and a lintel.
  const post = LAYOUT.yardFrom - 0.1
  s.box([0.36, 5.2, 0.36], PAINT.yellow, { at: [post, 2.6, wall + 0.2] }, { bevel: 0.05 })
  for (const y of [0.5, 1.5, 2.5, 3.5, 4.5]) s.box([0.46, 0.4, 0.46], PAINT.charcoal, { at: [post, y, wall + 0.2] }, { bevel: 0.05 })
  // A drain grate at the front of the pad.
  const drain = LAYOUT.drain
  s.box([1.1, 0.04, 0.5], PAINT.charcoal, { at: [drain.x, 0.02, drain.z] }, { bevel: 0.015 })
  for (let i = -3; i <= 3; i++) s.box([0.07, 0.1, 0.42], PAINT.zinc, { at: [drain.x + i * 0.15, 0.05, drain.z] }, { bevel: 0.01, mat: MAT.metal })
  return s
}
