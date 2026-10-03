import { PAINT, type VehicleDef } from './roster'
import { MAT, Shape } from './shapes'

// The tractor, green: lopsided and chugging, on two huge rear wheels. Likes
// the cloth on its bonnet; cannot stand the hose on its exhaust pipe.

const EYES: VehicleDef['eyes'] = [
  { at: [-1.98, 1.62, 0.42], r: 0.28 },
  { at: [-1.98, 1.62, -0.42], r: 0.28 },
]

export const tractor: VehicleDef = {
  id: 'tractor',
  paint: PAINT.green,
  wheels: [
    { x: -1.35, r: 0.4, z: 0.72, w: 0.34, hub: PAINT.yellow },
    { x: 1.05, r: 0.95, z: 0.86, w: 0.56, hub: PAINT.yellow },
  ],
  eyes: EYES,
  side: { x0: -2.3, x1: 2.2, y0: 0, y1: 3.1 },
  zones: {
    nose: { x0: -2.3, x1: -0.3, y0: 0.9, y1: 1.7 },
    eyes: { x0: -2.3, x1: -1.6, y0: 1.3, y1: 2.0 },
    wheels: { x0: -1.8, x1: 2.1, y0: 0, y1: 0.9 },
    // Its exhaust pipe, standing on the bonnet.
    part: { x0: -1.5, x1: -0.7, y0: 1.7, y1: 3.1 },
  },
  partSwing: 1.2,
  partAxis: [0, 0, -1],
  partSpins: false,
  // Lopsided and chugging: a quick shake at idle, a body that rocks on its big back wheels, a flap that chatters.
  moves: { stiffness: 110, damping: 6, give: 1.0, breath: 0.45, breathDepth: 0.01, idleRate: 6.5, idleSize: 0.006, blink: [2.0, 4.2], partStiffness: 220, partDamping: 5, partThrow: 0.09, glance: 0.9 },
  horn: { low: 147, high: 175, hold: 0.22 },
  build() {
    const body = new Shape()
    // A short rail: the tractor sits on its axles, nose low.
    body.box([3.2, 0.24, 0.9], PAINT.charcoal, { at: [-0.35, 0.72, 0] }, { bevel: 0.05 })
    body.box([0.18, 0.24, 1.3], PAINT.zinc, { at: [-2.1, 0.74, 0] }, { bevel: 0.06, mat: MAT.metal })
    for (const eye of EYES) {
      body.round(eye.r * 1.12, 0.16, PAINT.zinc, { at: [eye.at[0] + 0.1, eye.at[1], eye.at[2]] }, { axis: 'x', mat: MAT.metal, segs: 18 })
      body.ball(eye.r, PAINT.lamp, { at: [eye.at[0], eye.at[1], eye.at[2]] }, { mat: MAT.eye, segs: 18 })
    }
    // The long narrow bonnet, with a grille of zinc bars on its nose.
    body.box([1.9, 0.78, 1.0], PAINT.green, { at: [-1.1, 1.24, 0] }, { bevel: 0.1, top: { sz: 0.86 } })
    body.box([0.06, 0.5, 0.7], PAINT.charcoal, { at: [-2.06, 1.2, 0] }, { bevel: 0.02 })
    for (let i = -2; i <= 2; i++) body.box([0.05, 0.05, 0.66], PAINT.zinc, { at: [-2.09, 1.2 + i * 0.1, 0] }, { bevel: 0.012, mat: MAT.metal })
    // An open cab: a seat, four posts and a roof.
    body.box([1.25, 0.5, 1.3], PAINT.green, { at: [0.75, 1.12, 0] }, { bevel: 0.08 })
    body.box([0.5, 0.5, 0.8], PAINT.charcoal, { at: [0.95, 1.55, 0] }, { bevel: 0.1, mat: MAT.soft })
    for (const x of [0.15, 1.35]) for (const side of [-1, 1]) body.box([0.1, 1.5, 0.1], PAINT.green, { at: [x, 2.1, side * 0.6] }, { bevel: 0.03 })
    body.box([1.6, 0.14, 1.5], PAINT.yellow, { at: [0.75, 2.9, 0] }, { bevel: 0.05 })
    // The steering wheel on its column.
    body.round(0.035, 0.6, PAINT.zinc, { at: [0.1, 1.6, 0], turn: { axis: 'z', by: 0.6 } }, { axis: 'y', mat: MAT.metal, segs: 8 })
    body.ring(0.2, 0.035, PAINT.charcoal, { at: [0.28, 1.86, 0], turn: { axis: 'y', by: Math.PI / 2 } }, { mat: MAT.rubber, segs: 16, sides: 6 })
    // Mudguards over the big wheels.
    for (const side of [-1, 1]) body.box([1.7, 0.12, 0.56], PAINT.green, { at: [1.05, 2.14, side * 0.96] }, { bevel: 0.05 })
    // The exhaust pipe on the bonnet.
    body.round(0.075, 1.25, PAINT.zinc, { at: [-1.1, 2.2, 0.2] }, { axis: 'y', mat: MAT.metal, segs: 12 })

    // The flap on top of the pipe, hinged on its far edge.
    const part = new Shape()
    part.round(0.13, 0.05, PAINT.zinc, { at: [-1.1, 2.86, 0.2] }, { axis: 'y', mat: MAT.metal, segs: 12, bevel: 0.015 })
    return { body, part, pivot: [-0.97, 2.84, 0.2] }
  },
}
