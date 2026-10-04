import { carve, coat, curve, cut, draw, fill, gouge, halo, mulberry32, oval, posed, ribbon, rough, shape, within, type Print, type Pt } from './lookCut'

// The dachshund at the hatch, in profile, nose toward the bakery. Long is its
// whole character: a long dark back, a long ear, a long pale nose, and a long
// narrow basket strapped along the back for a long bread. Painted in reference
// units from its box's top left corner, and set low in the box so that the
// ledge leaves only stubs of its short legs.

/** Its box, and where its mouth and the middle of the basket's opening are, as shares of the box. */
export const DACHSHUND = { w: 330, h: 200, mouth: [0.87, 0.57], basket: [0.35, 0.48] } as const

/** Where the jaw hangs from the head: the mouth opens about this point. */
const HINGE: Pt = [250, 96]
const corner = (x: number, y: number): Pt[] => [[x, y], [x, y]]

/** The long basket: a dark opening seen a little from above, and a wall of wicker in stepped courses. */
function basket(p: Print): void {
  const { rnd } = p
  const wall = rough(curve([...corner(40, 80), ...corner(190, 80), [187, 100], ...corner(176, 119), ...corner(56, 119), [43, 100]]), rnd, 0.9, 4)
  const rim = rough(oval(115, 80, 79, 9.5, 0, 5), rnd, 0.7, 5)
  halo(p, wall, 5, 0); halo(p, rim, 5, 0.04)
  shape(p, wall, null, 2, 5)
  within(p.key, wall, () => {
    for (let row = 0; row < 3; row++) for (let x = 50 + (row % 2) * 9; x < 184; x += 18) fill(p.key, gouge(x + rnd() * 3, 96 + row * 7.5 + rnd() * 1.5, 0.06, 12, 2.7, 1.2))
  })
  shape(p, rim, null, 2.2, 3.4)
  const hollow = rough(oval(115, 80.5, 71, 5.2, 0, 5), rnd, 0.5, 5)
  fill(p.key, hollow)
  within(p.key, hollow, () => { for (let i = 0; i < 7; i++) cut(p.key, gouge(56 + i * 17 + rnd() * 6, 82.5, 0.05, 8 + rnd() * 5, 1.8)) })
}

function dog(p: Print, open: boolean): void {
  const { rnd } = p
  // What only the open mouth has is cut from a stream of its own, so both states use the main stream alike.
  const side: Print = { ...p, rnd: mulberry32(77) }
  const body = rough(curve([[30, 106], [13, 130], [22, 158], [80, 166], [150, 165], [204, 172], [238, 164], [252, 130], [258, 98], [242, 64], [222, 70], [208, 96], [186, 110], [120, 116], [66, 111]]), rnd, 1.4, 5)
  const leg = (x: number, wide: number) => rough(curve([...corner(x, 150), [x - 2, 186], ...corner(x - 1, 216), ...corner(x + wide + 3, 216), [x + wide + 1, 186], ...corner(x + wide, 150)]), rnd, 0.8, 4)
  const far = [leg(58, 13), leg(228, 13)], near = [leg(32, 18), leg(202, 18)]
  const tail = ribbon(rough(curve([[26, 120], [12, 104], [7, 78], [14, 54]], false, 5), rnd, 0.8, 4), (t) => 13 * (1 - t) + 4)
  const head = rough(curve([[224, 60], [238, 40], [260, 37], [278, 49], [298, 63], [315, 71], [320, 83], [312, 92], [290, 94], [268, 98], [246, 98], [228, 84]]), rnd, 1, 5)
  const jaw = rough(curve([[250, 89], [280, 90], [303, 91], [310, 97], [303, 103], [280, 105], [256, 105], [244, 98]]), rnd, 0.7, 4)
  const ear = rough(curve([[236, 42], [225, 50], [213, 76], [209, 98], [217, 113], [231, 107], [241, 84], [247, 60]]), rnd, 0.9, 4)
  // An open mouth drops the jaw and throws the head back a little, ear and all.
  const lift = open ? -0.13 : 0, gape = open ? 0.5 : 0

  halo(p, body, 6, 0.1); halo(p, tail, 4.5, 0)
  for (const one of [...far, ...near]) halo(p, one, 5, 0)
  for (const one of far) { fill(p.base, one); fill(p.key, one) }
  fill(p.base, tail); fill(p.key, tail)
  fill(p.base, body); fill(p.key, body)
  // A smooth coat lying from the head toward the tail, carved most along the back and left dark under the belly.
  coat(p, body, 8.5, 13, 3.6, (x, y) => Math.PI - 0.12 - Math.max(0, x - 196) * 0.016 + (y - 130) * 0.003, (x, y) => Math.max(0.1, Math.min(0.85, 0.86 - (y - 108) / 66 - Math.max(0, x - 236) / 60)))
  for (const one of near) {
    fill(p.base, one); fill(p.key, one)
    const x = one[0][0]
    for (let i = 0; i < 3; i++) cut(p.key, gouge(x + 4 + i * 5, 174 + i * 3 + rnd() * 4, 1.5, 12 + rnd() * 6, 2.6))
    cut(p.key, gouge(x - 3, 150, 0.8, 18, 3.2, 3))
  }
  carve(p, ['key'], curve([[27, 130], [44, 121], [60, 132], [58, 156]], false), 3.4, 0.1)
  // Two girths hold the basket on: the key block cut away to the paper.
  for (const x of [82, 160]) {
    const girth = ribbon(curve([[x, 106], [x - 4, 138], [x + 2, 174]], false), () => 9)
    within(p.key, body, () => { cut(p.key, girth) })
    draw(p, curve([[x + 6, 114], [x + 2, 138], [x + 8, 168]], false), 2.4, 0.3)
  }
  basket(p)
  // A red collar, cut and inked as the goat's is.
  const band = ribbon(curve([[204, 98], [228, 120], [256, 126]], false), () => 14)
  within(p.key, body, () => { cut(p.key, band) })
  within(p.red, body, () => { fill(p.red, band) })
  draw(p, curve([[208, 91], [231, 112], [253, 118]], false), 2.4, 0.3)
  draw(p, curve([[201, 106], [225, 128], [247, 134]], false), 2.8, 0.3)

  // Both rims are cleared before either piece is printed, so the head's rim does not eat the jaw.
  posed(p, HINGE[0], HINGE[1], gape, 1, () => halo(p, jaw, 5, 0))
  posed(p, HINGE[0], HINGE[1], lift, 1, () => halo(p, head, 6, 0.05))
  if (open) fill(p.key, rough(curve([[246, 96], [276, 88], [303, 86], [296, 104], [294, 120], [270, 110]], true, 4), side.rnd, 0.6, 4))
  posed(p, HINGE[0], HINGE[1], gape, 1, () => {
    if (open) shape(side, rough(curve([[262, 90], [282, 82], [303, 84], [307, 91], [296, 96], [268, 98]], true, 3), side.rnd, 0.5, 3), 'red', 1.5, 2.6)
    shape(p, jaw, null, 2, 4.5)
  })
  posed(p, HINGE[0], HINGE[1], lift, 1, () => {
    shape(p, head, null, 2.4, 5.5)
    // Black and tan: a dark cap over the skull, a pale brow spot, and the long nose left as paper.
    const cap = rough(curve([[214, 26], [270, 30], [283, 53], [270, 66], [263, 82], [257, 108], [214, 108]]), rnd, 0.9, 5)
    within(p.key, head, () => fill(p.key, cap))
    within(p.key, head, () => { for (let i = 0; i < 9; i++) cut(p.key, gouge(236 + rnd() * 22, 44 + i * 5.5 + rnd() * 3, 2.3 + rnd() * 0.3, 8 + rnd() * 5, 2.6)) })
    cut(p.key, oval(264, 47.5, 5, 3.4, 0.5, 2))
    fill(p.key, rough(oval(314, 78, 8.5, 7.5, 0.3, 3), rnd, 0.5, 3))
    cut(p.key, gouge(310, 75, 0.2, 6, 2))
    fill(p.red, oval(283, 82, 7.5, 6.5, 0, 3))
    for (const [x, y] of [[296, 84], [302, 80], [303, 87]]) fill(p.key, oval(x, y, 1.2, 1.2, 0, 1.5))
    if (!open) draw(side, curve([[270, 99], [259, 97], [255, 90]], false, 3), 2.6, 0.2)
    halo(p, ear, 4, 0)
    fill(p.base, ear); fill(p.key, ear)
    coat(p, ear, 9, 13, 3, () => 1.8, (_x, y) => Math.max(0.15, 0.75 - (y - 50) / 90))
    // The eye: a round paper window in the dark cap, looking into the bakery.
    cut(p.key, oval(266, 62, 9.5, 9, 0, 3))
    fill(p.key, oval(268, 63, 5.4, 5.6, 0, 2))
    cut(p.key, oval(266.5, 61, 1.6, 1.6, 0, 1.5))
  })
}

/** The dachshund in its box. `open` prints the same dog with its mouth wide open. */
export function paintDachshund(p: Print, open: boolean): void {
  posed(p, 0, 0, 0, 1, () => {
    for (const g of [p.base, p.blue, p.gold, p.red, p.key]) { g.translate(4, 17); g.scale(0.975, 0.975) }
    dog(p, open)
  })
}
