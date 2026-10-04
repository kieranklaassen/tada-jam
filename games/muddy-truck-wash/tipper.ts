import { PAINT, sideWindows, undercarriage, type VehicleDef } from './roster'
import { MAT, Shape } from './shapes'

// Tipper, the yellow dump truck: heavy and slow, with a bed that flaps like a
// lid. Likes foam; cannot stand the cloth on its nose.

const EYES: VehicleDef['eyes'] = [
  { at: [-2.02, 1.5, 0.52], r: 0.3 },
  { at: [-2.02, 1.5, -0.52], r: 0.3 },
]

export const tipper: VehicleDef = {
  id: 'tipper',
  paint: PAINT.yellow,
  wheels: [
    { x: -1.42, r: 0.52, z: 0.8, w: 0.44, hub: PAINT.orange },
    { x: 0.58, r: 0.52, z: 0.8, w: 0.44, hub: PAINT.orange },
    { x: 1.84, r: 0.52, z: 0.8, w: 0.44, hub: PAINT.orange },
  ],
  eyes: EYES,
  mouth: { at: [-2.27, 0.62, 0], w: 1.5, h: 0.52 },
  side: { x0: -2.35, x1: 2.45, y0: 0, y1: 2.75 },
  zones: {
    nose: { x0: -2.35, x1: -1.5, y0: 0.4, y1: 1.3 },
    eyes: { x0: -2.35, x1: -1.6, y0: 1.2, y1: 1.85 },
    wheels: { x0: -2.0, x1: 2.35, y0: 0, y1: 0.75 },
    part: { x0: 0.0, x1: 2.45, y0: 1.0, y1: 2.3 },
  },
  partSwing: 0.85,
  partAxis: [0, 0, -1],
  partSpins: false,
  // Heavy and slow: soft springs that take their time, a deep breath, and a bed that flaps like a lid.
  moves: { stiffness: 70, damping: 6.5, give: 1.15, breath: 0.32, breathDepth: 0.014, idleRate: 9, idleSize: 0.0025, blink: [2.6, 5.5], partStiffness: 55, partDamping: 4.2, partThrow: 0.055, glance: 0.6 },
  horn: { low: 196, high: 247, hold: 0.34 },
  build() {
    const body = new Shape()
    undercarriage(body, 4.3, -2.2, EYES)
    // Bonnet: a wedge that rises to the cab.
    body.box([1.15, 0.62, 1.7], PAINT.yellow, { at: [-1.62, 1.04, 0] }, { bevel: 0.08, top: { sx: 0.94, dx: 0.03, sz: 0.94 } })
    // Grille on the nose.
    body.box([0.06, 0.34, 1.0], PAINT.charcoal, { at: [-2.2, 1.0, 0] }, { bevel: 0.02 })
    for (let i = -2; i <= 2; i++) body.box([0.05, 0.3, 0.06], PAINT.zinc, { at: [-2.235, 1.0, i * 0.2] }, { bevel: 0.015, mat: MAT.metal })
    // Cab: upright, with the roof a little narrower and a raked windscreen.
    body.box([1.18, 1.42, 1.84], PAINT.yellow, { at: [-0.5, 1.44, 0] }, { bevel: 0.09, top: { sx: 0.82, dx: 0.1, sz: 0.92 } })
    sideWindows(body, -0.44, 1.72, 0.62, 0.5, 0.875)
    body.box([0.05, 0.5, 1.3], PAINT.glass, { at: [-1.03, 1.74, 0], turn: { axis: 'z', by: -0.15 } }, { bevel: 0.015, mat: MAT.lamp })
    // The stack beside the bonnet, on the near side.
    body.round(0.085, 1.5, PAINT.zinc, { at: [-1.0, 1.9, 0.98] }, { axis: 'y', mat: MAT.metal, segs: 12 })
    body.round(0.12, 0.3, PAINT.zinc, { at: [-1.0, 2.6, 0.98] }, { axis: 'y', mat: MAT.metal, segs: 12 })
    // Mudguards over the front wheels.
    for (const side of [-1, 1]) body.box([1.3, 0.12, 0.5], PAINT.yellow, { at: [-1.42, 1.18, side * 0.84] }, { bevel: 0.04 })

    // The bed: a tub hinged at the back, with a lip that shades the cab.
    const part = new Shape()
    const bed = PAINT.orange
    // The side walls are the widest parts; the floor and the end walls sit inside them, so no two faces lie in one plane.
    part.box([2.44, 0.16, 1.84], bed, { at: [1.18, 1.02, 0] }, { bevel: 0.05 })
    for (const side of [-1, 1]) part.box([2.5, 0.92, 0.14], bed, { at: [1.18, 1.52, side * 0.91] }, { bevel: 0.05, top: { sx: 1.04 } })
    part.box([0.14, 1.3, 1.84], bed, { at: [0.0, 1.71, 0] }, { bevel: 0.05 })
    part.box([0.14, 0.8, 1.84], bed, { at: [2.38, 1.46, 0], turn: { axis: 'z', by: -0.22 } }, { bevel: 0.05 })
    part.box([0.7, 0.1, 1.84], bed, { at: [-0.28, 2.33, 0] }, { bevel: 0.04 })
    // Ribs on the near and far sides, pressed into the tub.
    for (const side of [-1, 1]) for (const x of [0.5, 1.2, 1.9]) part.box([0.12, 0.8, 0.06], bed, { at: [x, 1.52, side * 0.99] }, { bevel: 0.025 })
    return { body, part, pivot: [2.25, 0.98, 0] }
  },
}
