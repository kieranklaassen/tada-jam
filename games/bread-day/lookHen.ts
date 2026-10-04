import { bare, coat, curve, cut, draw, fill, gouge, halo, offset, oval, posed, ribbon, rough, scatter, shape, turned, within, type Colour, type Print, type Pt } from './lookCut'

// The hen at the hatch and her chicks on the ledge. She is as round as a loaf
// and her speckles lie on her like seeds, which is the bread she wants. The
// beak and the basket the other birds share are cut here too. Painted in
// reference units from each box's top left corner.

/** Where the beak tip and the basket's opening are, as shares of the box. For a chick `basket` is the ground it pecks. */
export const HEN = { w: 230, h: 240, mouth: [0.96, 0.28], basket: [0.77, 0.79] } as const
export const CHICK = { w: 60, h: 56, mouth: [0.92, 0.44], basket: [0.84, 0.95] } as const

export const corner = (x: number, y: number): Pt[] => [[x, y], [x, y]]

/** A beak in two halves that turn on a hinge. `line` runs along the shut mouth, from the hinge to short of the tip. */
export type Beak = { hinge: Pt; upper: readonly Pt[]; lower: readonly Pt[]; line: readonly Pt[]; ink: Colour | null; lift: number; drop: number }

const halves = (b: Beak, open: boolean): Pt[][] => [b.lower, b.upper].map((half, i) => turned(curve(half, true, 3), open ? (i ? -b.lift : b.drop) : 0, b.hinge[0], b.hinge[1]))

/** Clears the ground round a beak before the head is printed. It takes nothing from the seeded stream, so an open and a shut printing are alike everywhere else. */
export function clearBeak(p: Print, b: Beak, open: boolean): void {
  for (const half of halves(b, open)) bare(p, offset(half, (i) => 4.4 + 1.5 * Math.sin(i * 0.7)))
}

/** The beak itself, last of all: shut, or open on the red of the mouth with a tongue in it. */
export function paintBeak(p: Print, b: Beak, open: boolean): void {
  const [lower, upper] = halves(b, open), [hx, hy] = b.hinge, far = b.line[b.line.length - 1]
  if (open) {
    const [top] = turned([far], -b.lift, hx, hy), [low] = turned([far], b.drop, hx, hy)
    bare(p, [b.hinge, top, low]); fill(p.red, [b.hinge, top, low])
    draw(p, [[hx + 2, hy + 1], [(hx + low[0] * 2 + top[0]) / 4, (hy + low[1] * 2 + top[1]) / 4], [(low[0] * 2 + top[0]) / 3, (low[1] * 2 + top[1]) / 3]], 3, 0.5)
  }
  for (const half of [lower, upper]) {
    if (b.ink) shape(p, half, b.ink, 1.4, 3.4)
    else { fill(p.base, half); fill(p.key, half) }
  }
  if (!open && !b.ink) cut(p.key, ribbon(b.line, (t) => 2.6 - t))
}

/** A wicker basket whose mouth is an oval about (cx, top), with a hoop handle through the points of `grip`. */
export function basket(p: Print, cx: number, top: number, w: number, h: number, grip: readonly Pt[]): void {
  const { rnd } = p, r = w / 2, hoop = curve(grip, false, 4)
  const pan = rough(curve([[cx - r, top], [cx - r * 0.94, top + h * 0.5], [cx - r * 0.7, top + h * 0.93], [cx, top + h], [cx + r * 0.7, top + h * 0.93], [cx + r * 0.94, top + h * 0.5], [cx + r, top]], true, 4), rnd, 0.7, 4)
  const lip = oval(cx, top, r + 3, h * 0.2, 0, 3)
  bare(p, ribbon(hoop, () => 14)); halo(p, pan, 4.5, 0); halo(p, lip, 4.5, 0)
  fill(p.key, ribbon(hoop, () => 8.5)); bare(p, ribbon(hoop, () => 3.4))
  shape(p, pan, null, 2, 5)
  // The weave: rows of short strokes, each row set half a step off the last.
  within(p.key, pan, () => {
    for (let row = 0; row < 4; row++) for (let x = cx - r + 3 + (row % 2) * 5; x < cx + r; x += 10) fill(p.key, gouge(x + rnd() * 2, top + h * (0.33 + row * 0.17), 0.12, 6.5, 2.4))
  })
  shape(p, lip, null, 1.8, 3.6)
  fill(p.key, oval(cx, top + 1, r - 2.5, h * 0.11, 0, 3))
}

const BEAK: Beak = { hinge: [200, 63], upper: [[196, 51], [211, 54], ...corner(224, 66), [200, 67.5]], lower: [[199, 65.5], ...corner(220, 67.5), [211, 75], [199, 77]], line: [[202, 66.5], [217, 67]], ink: 'gold', lift: 0.42, drop: 0.72 }

/** The hen in her box. `open` prints the same hen with her beak wide. */
export function paintHen(p: Print, open: boolean): void {
  const { rnd } = p
  const body = rough(curve([[176, 34], [196, 44], [202, 62], [196, 84], [208, 112], [212, 148], [198, 186], [166, 212], [118, 222], [70, 214], [36, 190], [22, 152], [28, 116], [56, 104], [98, 104], [134, 92], [150, 64], [160, 42]]), rnd, 1.2, 5)
  const tail = rough(curve([[34, 126], [12, 92], ...corner(8, 54), [22, 64], ...corner(28, 36), [42, 54], ...corner(57, 38), [60, 72], [66, 112]], true, 4), rnd, 1, 4)
  const comb = rough(curve([[160, 44], [157, 24], [167, 15], [174, 26], [180, 9], [190, 13], [191, 28], [201, 24], [205, 36], [198, 48], [178, 40]], true, 3), rnd, 0.6, 4)
  const wattle = rough(curve([[195, 77], [205, 81], [207, 97], [200, 104], [193, 93]], true, 3), rnd, 0.5, 4)
  const wing = rough(curve([[70, 130], [96, 114], [132, 124], [162, 146], [187, 160], [185, 173], [160, 179], [122, 181], [90, 170], [72, 152]]), rnd, 1, 5)
  clearBeak(p, BEAK, open)
  halo(p, body, 6, 0.1); halo(p, tail, 5.5, 0.06); halo(p, comb, 4.5, 0); halo(p, wattle, 4, 0)
  for (const x of [100, 136]) { const leg: Pt[] = [[x, 210], [x + 2, 246]]; bare(p, ribbon(leg, () => 10)); fill(p.key, ribbon(leg, () => 5.2)) }
  // The tail: dark plumes, each split from the next by one long cut.
  fill(p.base, tail); fill(p.key, tail)
  for (const plume of [[[44, 116], [24, 88], [17, 66]], [[50, 110], [38, 78], [33, 50]], [[58, 108], [54, 76], [54, 52]]] as Pt[][]) cut(p.key, ribbon(curve(plume, false), (t) => 4.4 * (1 - t * 0.7)))
  shape(p, comb, 'red', 1.6, 3.6)
  shape(p, body, null, 2.6, 6.5)
  // Her speckles: seed-shaped and seed-sized, all over her but not on her face.
  within(p.key, offset(body, () => -6), () => scatter(rnd, 18, 82, 200, 140, 16.5, (x, y) => {
    const lie = 1.5 + (x - 120) * 0.006 + (rnd() - 0.5) * 0.9
    if (x < 162 || y > 92) fill(p.key, gouge(x, y, lie, 9 + rnd() * 3, 5.2, 0, 0.5))
  }))
  basket(p, 178, 190, 54, 40, [[154, 192], [158, 164], [178, 150], [198, 164], [202, 192]])
  // The wing she carries it on: dark, and scaled with feathers that lie toward its tip.
  halo(p, wing, 4.5, 0)
  fill(p.base, wing); fill(p.key, wing)
  coat(p, wing, 13, 12, 6.5, () => 0.4 + Math.PI, () => 0.9)
  shape(p, wattle, 'red', 1.4, 3)
  fill(p.red, oval(181, 76, 6.5, 6, 0, 3))
  fill(p.key, oval(184, 55, 7.6, 7.8, 0, 3))
  cut(p.key, oval(184.5, 55, 5.2, 5.4, 0, 2))
  fill(p.key, oval(186, 55.5, 3.2, 3.5, 0, 2))
  draw(p, curve([[174, 45], [184, 41], [193, 46]], false, 3), 2.6, 0.2)
  paintBeak(p, BEAK, open)
}

/** One chick, whole: a tuft, a beak, an eye and two legs. `peck` tips it over onto its beak. */
export function paintChick(p: Print, peck: boolean): void {
  const { rnd } = p, legs: Pt[][] = [[[22, 43], [21.5, 49], [21, 54]], [[31, 43], [31.5, 49], [32, 54]]]
  for (const leg of legs) bare(p, ribbon(leg, () => 5.4))
  posed(p, 28, 33, peck ? 0.9 : 0, 1, () => {
    const body = rough(curve([[9, 35], [12, 23], [21, 14], [33, 11], [43, 15], [47, 25], [44, 36], [36, 45], [23, 46], [13, 42]], true, 2.5), rnd, 0.4, 4)
    const beak = curve([...corner(45, 19.5), ...corner(56, 24.5), ...corner(45, 29.5)], true, 2)
    const tuft = [-2.5, -1.95, -1.4].map((lean, i) => gouge(30 + i, 14, lean, i === 1 ? 7 : 5.5, 2.4))
    halo(p, body, 3.2, 0); bare(p, offset(beak, () => 2.4))
    for (const t of tuft) bare(p, offset(t, () => 2))
    for (const t of tuft) fill(p.key, t)
    shape(p, beak, 'gold', 0.9, 1.9)
    shape(p, body, null, 1.5, 3.4)
    shape(p, rough(curve([[14, 31], [21, 26.5], [29, 30], [27, 37], [18, 38.5]], true, 2), rnd, 0.3, 4), null, 1.1, 2.8)
    for (let i = 0; i < 3; i++) fill(p.key, gouge(25 + i * 5 + rnd() * 2, 42 - i * 1.2, -0.15, 3.6, 1.5))
    fill(p.red, oval(37.5, 31, 3.3, 2.9, 0, 1.5))
    fill(p.key, oval(38, 22, 3.3, 3.5, 0, 1.2))
    cut(p.key, oval(37.1, 21.1, 0.9, 0.9, 0, 1))
  })
  for (const leg of legs) { draw(p, leg, 2.5, 0.6); draw(p, [[leg[2][0] - 2, 54.4], [leg[2][0] + 5, 54]], 1.8, 0.5) }
}
