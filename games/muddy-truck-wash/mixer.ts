import { PAINT, sideWindows, undercarriage, type VehicleDef } from './roster'
import { MAT, Shape } from './shapes'

// The mixer, a blue cement mixer: round and rolling. Likes anything on its
// drum, which turns; cannot stand the sponge on its wheels.

const EYES: VehicleDef['eyes'] = [
  { at: [-2.22, 1.46, 0.5], r: 0.3 },
  { at: [-2.22, 1.46, -0.5], r: 0.3 },
]

export const mixer: VehicleDef = {
  id: 'mixer',
  paint: PAINT.blue,
  wheels: [
    { x: -1.5, r: 0.5, z: 0.8, w: 0.42, hub: PAINT.cream },
    { x: 0.62, r: 0.5, z: 0.8, w: 0.42, hub: PAINT.cream },
    { x: 1.86, r: 0.5, z: 0.8, w: 0.42, hub: PAINT.cream },
  ],
  eyes: EYES,
  side: { x0: -2.55, x1: 2.6, y0: 0, y1: 3.0 },
  zones: {
    nose: { x0: -2.55, x1: -1.8, y0: 0.4, y1: 1.2 },
    eyes: { x0: -2.55, x1: -1.8, y0: 1.15, y1: 1.85 },
    wheels: { x0: -2.1, x1: 2.4, y0: 0, y1: 0.8 },
    part: { x0: -0.5, x1: 2.6, y0: 1.1, y1: 3.0 },
  },
  // The drum spins freely: its angle is not a swing.
  partSwing: 0,
  partAxis: [Math.cos(0.2), Math.sin(0.2), 0],
  partSpins: true,
  // Round and rolling: a slow sway that takes long to die, a deep slow breath, eyes that drift.
  moves: { stiffness: 85, damping: 4.2, give: 1.0, breath: 0.26, breathDepth: 0.016, idleRate: 11, idleSize: 0.002, blink: [3.0, 6.5], partStiffness: 0, partDamping: 0.9, partThrow: 0, glance: 0.45 },
  horn: { low: 262, high: 330, hold: 0.28 },
  build() {
    const body = new Shape()
    undercarriage(body, 4.6, -2.38, EYES)
    // A snub cab.
    body.box([1.35, 1.5, 1.84], PAINT.blue, { at: [-1.55, 1.44, 0] }, { bevel: 0.1, top: { sx: 0.84, dx: 0.1, sz: 0.93 } })
    sideWindows(body, -1.45, 1.74, 0.7, 0.5, 0.88)
    body.box([0.05, 0.52, 1.34], PAINT.glass, { at: [-2.19, 1.84, 0], turn: { axis: 'z', by: -0.13 } }, { bevel: 0.015, mat: MAT.lamp })
    // The cradle the drum rides in, and the chute at the back.
    body.box([3.0, 0.3, 1.5], PAINT.blue, { at: [0.95, 0.88, 0] }, { bevel: 0.06 })
    for (const x of [-0.35, 2.2]) body.box([0.2, 0.8, 1.3], PAINT.blue, { at: [x, 1.2, 0] }, { bevel: 0.05 })
    body.box([0.7, 0.1, 0.5], PAINT.zinc, { at: [2.45, 1.3, 0], turn: { axis: 'z', by: -0.6 } }, { bevel: 0.03, mat: MAT.metal })
    for (const side of [-1, 1]) for (const x of [-1.5, 1.28]) body.box([x < 0 ? 1.2 : 2.3, 0.1, 0.46], PAINT.blue, { at: [x, 1.1, side * 0.84] }, { bevel: 0.04 })

    // The drum: a barrel tilted up to the back, cream with orange bands so its turning shows.
    const part = new Shape()
    const tilt = { axis: 'z' as const, by: 0.2 }
    const at = (along: number): [number, number, number] => [0.95 + Math.cos(0.2) * along, 2.0 + Math.sin(0.2) * along, 0]
    part.round(0.92, 1.5, PAINT.cream, { at: at(-0.15), turn: tilt }, { axis: 'x', segs: 22, bevel: 0.06 })
    part.round(0.6, 0.8, PAINT.cream, { at: at(1.0), turn: tilt }, { axis: 'x', r2: 0.92, segs: 22, bevel: 0.05 })
    part.round(0.92, 0.5, PAINT.cream, { at: at(-1.15), turn: tilt }, { axis: 'x', r2: 0.6, segs: 22, bevel: 0.05 })
    // Bands that run along the drum, a quarter of the way round each: they sweep past as it turns.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2
      part.box(i % 2 ? [1.46, 0.34, 0.07] : [1.46, 0.07, 0.34], PAINT.orange, { at: [at(-0.15)[0] - Math.sin(0.2) * Math.cos(a) * 0.93, at(-0.15)[1] + Math.cos(0.2) * Math.cos(a) * 0.93, Math.sin(a) * 0.93], turn: tilt }, { bevel: 0.02 })
    }
    return { body, part, pivot: at(-0.15) }
  },
}
