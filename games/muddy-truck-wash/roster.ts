import type { Personality } from './motion'
import { MAT, Shape, rgb, type Rgb } from './shapes'

// The vehicles as data: each one's fixed body, its moving part, its wheels and
// eyes, and the zones of its body a taste belongs to. Built in vehicle space:
// the nose points down -x, the wheels stand on y = 0, and +z is the side the
// child sees. Nothing here draws.

export type VehicleId = 'tipper' | 'fire-engine' | 'tractor' | 'mixer'

export type Wheel = { x: number; r: number; z: number; w: number; hub: Rgb }

/** A rectangle of the vehicle's side, in vehicle x and y. */
export type Zone = { x0: number; x1: number; y0: number; y1: number }

export type VehicleBuild = {
  /** Everything rigid, merged. */
  body: Shape
  /** The one part that moves by itself (a bed, a ladder, a flap, a drum), built in place. */
  part: Shape
  /** Where the part hinges or spins. */
  pivot: readonly [number, number, number]
}

export type VehicleDef = {
  id: VehicleId
  paint: Rgb
  build(): VehicleBuild
  wheels: readonly Wheel[]
  /** Lamp eyes: centre and radius. The near one comes first. */
  eyes: readonly { at: readonly [number, number, number]; r: number }[]
  /** The mouth in the bumper: the middle of the plate it is drawn on, facing ahead, and the plate's width and height. */
  mouth: { at: readonly [number, number, number]; w: number; h: number }
  /** The side view the surface grid covers. */
  side: Zone
  /** Parts of the body a taste can belong to. */
  zones: { nose: Zone; eyes: Zone; wheels: Zone; part: Zone }
  /** How far the moving part swings open (radians) about `partAxis`; a positive angle lifts it. */
  partSwing: number
  partAxis: readonly [number, number, number]
  /** A drum: it turns freely, and what is on it stays put while the metal turns under it. */
  partSpins: boolean
  /** How it moves: its weight, its tempo and how its funniest part is thrown about. No two vehicles share these. */
  moves: Personality
  /** Its horn: two pitches in Hz, and how long it holds them. */
  horn: { low: number; high: number; hold: number }
}

const builds = new Map<VehicleId, VehicleBuild>()

/** A vehicle's shapes, built once for the life of the page: a second mount, the silhouette and the view all read the same arrays. */
export function built(def: VehicleDef): VehicleBuild {
  let build = builds.get(def.id)
  if (!build) {
    build = def.build()
    builds.set(def.id, build)
  }
  return build
}

export const PAINT = {
  yellow: rgb(0xf5b301),
  orange: rgb(0xf06a0c),
  red: rgb(0xd61f2c),
  green: rgb(0x23a04a),
  blue: rgb(0x1668d8),
  cream: rgb(0xf7ecd2),
  charcoal: rgb(0x2b2d33),
  glass: rgb(0x1d3a55),
  zinc: rgb(0xc4c8cc),
  rubber: rgb(0x16171a),
  lamp: rgb(0xfff6dc),
  black: rgb(0x0c0c0e),
} as const

/** The parts every vehicle shares: a dark chassis rail, a deep zinc bumper (the plate its mouth is in) and two lamp eyes. */
export function undercarriage(body: Shape, length: number, noseX: number, eyes: VehicleDef['eyes']): void {
  body.box([length, 0.26, 1.36], PAINT.charcoal, { at: [noseX + length / 2 + 0.12, 0.6, 0] }, { bevel: 0.05 })
  body.box([0.2, 0.42, 1.8], PAINT.zinc, { at: [noseX + 0.08, 0.6, 0] }, { bevel: 0.07, mat: MAT.metal })
  for (const eye of eyes) {
    // A zinc bezel, then the lamp itself, proud of the bonnet so it reads from the side.
    body.round(eye.r * 1.12, 0.16, PAINT.zinc, { at: [eye.at[0] + 0.1, eye.at[1], eye.at[2]] }, { axis: 'x', mat: MAT.metal, segs: 18 })
    body.ball(eye.r, PAINT.lamp, { at: [eye.at[0], eye.at[1], eye.at[2]] }, { mat: MAT.eye, segs: 18 })
  }
}

/** A side window and its zinc frame, on the near and the far side. */
export function sideWindows(body: Shape, x: number, y: number, w: number, h: number, z: number): void {
  for (const side of [-1, 1]) {
    body.box([w + 0.1, h + 0.1, 0.04], PAINT.zinc, { at: [x, y, side * z] }, { bevel: 0.015, mat: MAT.metal })
    body.box([w, h, 0.05], PAINT.glass, { at: [x, y, side * (z + 0.012)] }, { bevel: 0.015, mat: MAT.lamp })
  }
}
