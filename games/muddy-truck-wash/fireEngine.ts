import { PAINT, sideWindows, undercarriage, type VehicleDef } from './roster'
import { MAT, Shape } from './shapes'

// The fire engine, red: quick and eager, ladder first. Likes the hose; cannot
// stand the sponge on its eyes.

const EYES: VehicleDef['eyes'] = [
  { at: [-2.3, 1.42, 0.5], r: 0.29 },
  { at: [-2.3, 1.42, -0.5], r: 0.29 },
]

export const fireEngine: VehicleDef = {
  id: 'fire-engine',
  paint: PAINT.red,
  wheels: [
    { x: -1.5, r: 0.46, z: 0.8, w: 0.4, hub: PAINT.cream },
    { x: 1.55, r: 0.46, z: 0.8, w: 0.4, hub: PAINT.cream },
  ],
  eyes: EYES,
  side: { x0: -2.6, x1: 2.6, y0: 0, y1: 2.9 },
  zones: {
    nose: { x0: -2.6, x1: -1.9, y0: 0.4, y1: 1.2 },
    eyes: { x0: -2.6, x1: -1.9, y0: 1.1, y1: 1.8 },
    wheels: { x0: -2.1, x1: 2.2, y0: 0, y1: 0.7 },
    part: { x0: -0.9, x1: 2.6, y0: 2.0, y1: 2.9 },
  },
  partSwing: 0.7,
  partAxis: [0, 0, -1],
  partSpins: false,
  // Quick and eager: stiff springs that snap back, short breaths, a ladder that twitches.
  moves: { stiffness: 190, damping: 11, give: 0.8, breath: 0.62, breathDepth: 0.008, idleRate: 15, idleSize: 0.0018, blink: [1.4, 3.2], partStiffness: 160, partDamping: 7, partThrow: 0.02, glance: 1.5 },
  horn: { low: 392, high: 523, hold: 0.16 },
  build() {
    const body = new Shape()
    undercarriage(body, 4.7, -2.45, EYES)
    // A flat-fronted cab over the front wheels.
    body.box([1.45, 1.5, 1.84], PAINT.red, { at: [-1.62, 1.42, 0] }, { bevel: 0.1, top: { sx: 0.86, dx: 0.1, sz: 0.93 } })
    sideWindows(body, -1.5, 1.72, 0.74, 0.5, 0.88)
    body.box([0.05, 0.52, 1.36], PAINT.glass, { at: [-2.3, 1.84, 0], turn: { axis: 'z', by: -0.13 } }, { bevel: 0.015, mat: MAT.lamp })
    // The roof lamp.
    body.round(0.14, 0.2, PAINT.blue, { at: [-1.5, 2.26, 0] }, { axis: 'y', mat: MAT.lamp, segs: 12 })
    // The long body, with a cream stripe and roller lockers.
    body.box([3.3, 1.2, 1.8], PAINT.red, { at: [0.72, 1.3, 0] }, { bevel: 0.09 })
    for (const side of [-1, 1]) {
      body.box([3.2, 0.16, 0.04], PAINT.cream, { at: [0.72, 1.02, side * 0.9] }, { bevel: 0.015 })
      for (const x of [0.0, 0.95, 1.9]) body.box([0.8, 0.52, 0.04], PAINT.zinc, { at: [x, 1.5, side * 0.9] }, { bevel: 0.015, mat: MAT.metal })
    }
    // Wheel arches.
    for (const side of [-1, 1]) for (const x of [-1.5, 1.55]) body.box([1.16, 0.1, 0.46], PAINT.red, { at: [x, 1.04, side * 0.84] }, { bevel: 0.04 })
    // A hose reel at the back and the nozzle on the roof it squirts from.
    body.round(0.3, 0.5, PAINT.cream, { at: [2.2, 2.05, 0] }, { axis: 'z', segs: 16 })
    body.round(0.08, 0.34, PAINT.zinc, { at: [-0.75, 2.02, 0.5], turn: { axis: 'z', by: 0.5 } }, { axis: 'y', mat: MAT.metal, segs: 10 })

    // The ladder: two cream rails and their rungs, hinged behind the cab.
    const part = new Shape()
    for (const side of [-1, 1]) part.box([3.2, 0.12, 0.1], PAINT.cream, { at: [0.85, 2.18, side * 0.36] }, { bevel: 0.03 })
    for (let i = 0; i < 8; i++) part.box([0.09, 0.09, 0.66], PAINT.zinc, { at: [-0.55 + i * 0.4, 2.18, 0] }, { bevel: 0.02, mat: MAT.metal })
    part.box([0.3, 0.3, 0.9], PAINT.red, { at: [2.3, 2.1, 0] }, { bevel: 0.05 })
    return { body, part, pivot: [2.3, 2.05, 0] }
  },
}
