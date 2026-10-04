import { curve, cut, draw, fill, gouge, halo, oval, ribbon, rough, shape, within, type Print, type Pt } from './lookCut'
import { clearBeak, corner, paintBeak, type Beak } from './lookHen'

// The duck at the hatch: a pale bird that is flat wherever it can be. A wide
// flat bill, two big flat webbed feet and a flat tray under one wing, for the
// pancake it wants. Painted in reference units from its box's top left corner,
// whole: the feet are too good to hide behind the ledge.

/** Where the middle of the bill's tip and the middle of the tray are, as shares of the box. */
export const DUCK = { w: 240, h: 250, mouth: [0.96, 0.24], basket: [0.81, 0.71] } as const

const BILL: Beak = { hinge: [176, 57], upper: [[171, 43], [198, 47], [220, 49], [233, 54], [231, 62], [200, 61], [175, 61]], lower: [[175, 59], [200, 61], [226, 62.5], [220, 69], [198, 70], [175, 70]], line: [[180, 60.5], [222, 61.5]], ink: 'gold', lift: 0.2, drop: 0.5 }

/** A webbed foot, flat on the ground and pointing at the bakery: three toes, and the web scalloped between them. */
function foot(p: Print, x: number, y: number): Pt[] {
  return rough(curve([[x, y], [x + 34, y - 4], ...corner(x + 68, y - 9), [x + 61, y + 2], ...corner(x + 78, y + 7), [x + 63, y + 13], ...corner(x + 70, y + 24), [x + 34, y + 23], [x + 6, y + 20], [x - 6, y + 10]], true, 4), p.rnd, 0.7, 4)
}

/** The duck in its box. `open` prints the same duck with its bill wide. */
export function paintDuck(p: Print, open: boolean): void {
  const { rnd } = p
  const body = rough(curve([[150, 22], [172, 30], [181, 50], [174, 72], [161, 92], [166, 114], [186, 142], [188, 174], [168, 202], [128, 216], [84, 212], [48, 194], [24, 162], ...corner(7, 120), [34, 134], [62, 130], [92, 120], [118, 104], [128, 80], [124, 52], [132, 32]]), rnd, 1.2, 5)
  const wing = rough(curve([[60, 150], [92, 135], [132, 137], [160, 154], [154, 177], [122, 191], [84, 189], ...corner(38, 160)]), rnd, 1, 5)
  const lip = rough(oval(181, 175, 51, 9.5, -0.05, 5), rnd, 0.6, 5)
  const pan = rough(curve([[131, 179], [138, 192], [158, 198.5], [184, 199], [208, 195], [225, 187], [231, 173], [181, 170]], true, 5), rnd, 0.7, 5)
  const at = [[54, 219], [124, 221]], feet = at.map(([x, y]) => foot(p, x, y))
  const legs: Pt[][] = [[[94, 204], [72, 226]], [[142, 206], [140, 228]]]
  clearBeak(p, BILL, open)
  halo(p, body, 6, 0.1); halo(p, pan, 5, 0); halo(p, lip, 5, 0)
  for (const web of feet) halo(p, web, 4.5, 0)
  // Feet first, the far one under the near one, then the body over the tops of the legs.
  feet.forEach((web, i) => {
    shape(p, ribbon(legs[i], () => 10), 'gold', 1.4, 3)
    shape(p, web, 'gold', 1.8, 4.4)
    const [hx, hy] = at[i]
    for (const [tx, ty] of [[61, -6], [69, 7], [62, 20]]) draw(p, [[hx + 4, hy + 10], [hx + 4 + (tx - 4) / 2, hy + 10 + (ty - 10) / 2 + 0.6], [hx + tx, hy + ty]], 2.6, 0.2)
  })
  shape(p, body, null, 2.6, 6.5)
  // The curl of the tail, and a few soft marks down the breast: a duck is smooth, so there are not many.
  draw(p, curve([[30, 142], [16, 130], [10, 112], [20, 104], [27, 112]], false, 3), 3, 0.1)
  within(p.key, body, () => {
    for (let i = 0; i < 9; i++) fill(p.key, gouge(170 - (i % 3) * 14 + rnd() * 5, 122 + Math.floor(i / 3) * 12 + (i % 3) * 5, 1.9, 8 + rnd() * 4, 2.2))
    for (let i = 0; i < 7; i++) fill(p.key, gouge(66 + i * 15 + rnd() * 4, 200 - Math.abs(i - 3) * 2.5, 2.9, 10 + rnd() * 5, 2.4))
    for (let i = 0; i < 3; i++) fill(p.key, gouge(132 + i * 3, 86 + i * 7, 0.5, 9, 2))
  })
  // The basket is as flat as a basket can be, and tucked under the wing, so the wing is printed over the end of it.
  shape(p, pan, null, 2, 5)
  within(p.key, pan, () => { for (let x = 150; x < 228; x += 10) fill(p.key, gouge(x + rnd() * 2, 191 - (x - 150) * 0.07, 0.05, 6.5, 2.4)) })
  shape(p, lip, null, 1.8, 3.6)
  fill(p.key, oval(181, 176, 45, 5.6, -0.05, 4))
  halo(p, wing, 4, 0)
  shape(p, wing, null, 2.2, 5.5)
  within(p.blue, wing, () => fill(p.blue, ribbon(curve([[44, 150], [58, 170], [84, 192]], false), () => 20)))
  for (const quill of [[[64, 158], [100, 152], [146, 160]], [[62, 168], [100, 166], [142, 172]], [[70, 178], [100, 178], [130, 182]]] as Pt[][]) draw(p, curve(quill, false), 2.6, 0.1)
  draw(p, curve([[56, 150], [66, 168], [86, 186]], false), 2.2, 0.2)
  // A round dark eye with a spark in it, a brow and a cheek.
  fill(p.red, oval(159, 62, 7, 6.2, 0, 3))
  fill(p.key, oval(160, 45, 6, 6.6, 0, 2))
  cut(p.key, oval(158.2, 42.8, 1.9, 1.9, 0, 1.5))
  draw(p, curve([[151, 35], [160, 31], [169, 36]], false, 3), 2.6, 0.2)
  paintBeak(p, BILL, open)
  // The nostril rides on the upper half of the bill, so it lifts with it.
  const lift = open ? -BILL.lift : 0, nx = 176 + 22 * Math.cos(lift) + 6 * Math.sin(lift), ny = 57 + 22 * Math.sin(lift) - 6 * Math.cos(lift)
  fill(p.key, oval(nx, ny, 2.6, 1.3, lift + 0.1, 1.5))
}
