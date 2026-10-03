import { carve, coat, curve, cut, draw, fill, gouge, halo, mirrored, oval, posed, ribbon, rough, shape, within, type Print, type Pt } from './lookCut'

// The badger, the baker: behind the bench, big, striped, looking down at the
// dough. Its black and white face is what a key block does best. Painted in
// its own upright frame (290 wide, the bench edge at 316) and set into its box
// a little smaller, with the head tilted toward the peel.

const MID = 145
const BENCH_EDGE = 316
const corner = (x: number, y: number): Pt[] => [[x, y], [x, y]]

function body(p: Print): void {
  const { rnd } = p
  const bulk = rough(curve([...corner(14, BENCH_EDGE), [20, 250], [40, 200], [82, 172], [MID, 162], [208, 172], [250, 200], [270, 250], ...corner(276, BENCH_EDGE)]), rnd, 1.4, 5)
  const bib = rough(curve([...corner(97, BENCH_EDGE), ...corner(103, 226), ...corner(187, 226), ...corner(193, BENCH_EDGE)], true, 8), rnd, 1, 3)
  const paws = [curve([[26, 318], [30, 296], [48, 284], [70, 288], [80, 304], [76, 324], [34, 326]]), curve([[214, 324], [210, 304], [220, 288], [242, 284], [260, 296], [264, 318], [256, 326]])].map((paw) => rough(paw, rnd, 0.8, 4))
  halo(p, bulk, 6, 0.1)
  for (const paw of paws) halo(p, paw, 5, 0)
  fill(p.base, bulk); fill(p.key, bulk)
  // Fur lying down and outward from the neck, carved most on the shoulders.
  coat(p, bulk, 10, 15, 4.2, (x) => Math.PI / 2 - (x - MID) * 0.006, (_x, y) => Math.max(0.1, 0.7 - (y - 170) / 220))
  for (const side of [-1, 1]) {
    const strap = ribbon(curve([[MID + side * 37, 228], [MID + side * 31, 200], [MID + side * 24, 176]], false), () => 12)
    shape(p, strap, null, 1.5, 3.5)
    carve(p, ['key'], curve([[MID + side * 93, 216], [MID + side * 101, 258], [MID + side * 92, 292]], false), 4.5, 0.1)
  }
  shape(p, bib, null, 2.2, 5.5)
  draw(p, curve([[122, 268], [MID, 276], [168, 268]], false), 2.8, 0.2)
  draw(p, curve([[122, 268], [124, 300]], false), 2.2, 0.2)
  draw(p, curve([[168, 268], [166, 300]], false), 2.2, 0.2)
  // Chatter: the ridges the gouge left when the apron was cleared.
  for (let i = 0; i < 9; i++) { const x = 108 + rnd() * 70, y = 236 + rnd() * 70; fill(p.key, gouge(x, y, 0.1 + rnd() * 0.2, 6 + rnd() * 7, 1.8)) }
  for (const paw of paws) {
    fill(p.base, paw); fill(p.key, paw)
    const x = paw[0][0] < MID ? 40 : 226
    for (let i = 0; i < 4; i++) cut(p.key, gouge(x + i * 8.5, 322, -1.5 + (i - 1.5) * 0.12, 13, 3.4))
  }
  shape(p, rough(curve([[116, 174], [MID, 184], [174, 174], [163, 202], [MID, 214], [127, 202]]), rnd, 0.8, 4), 'red', 2, 4.5)
  draw(p, curve([[134, 186], [MID, 198], [156, 186]], false), 2.2, 0.1)
}

function head(p: Print, blink: boolean): void {
  const { rnd } = p
  const skull = rough(curve([[84, 70], [112, 54], [MID, 50], [178, 54], [206, 70], [220, 104], [208, 138], [180, 162], [158, 187], [132, 187], [110, 162], [82, 138], [70, 104]]), rnd, 1, 5)
  const puff = rough(curve([[90, 60], [64, 36], [72, 4], [108, -16], [150, -22], [192, -14], [222, 10], [220, 40], [200, 60], [MID, 48]]), rnd, 1.2, 5)
  const band = rough(curve([...corner(90, 58), [MID, 45], ...corner(200, 58), ...corner(198, 76), [MID, 63], ...corner(92, 76)]), rnd, 0.8, 4)
  const ears = [oval(80, 70, 18, 17, 0, 4), oval(210, 70, 18, 17, 0, 4)]
  const tongue = rough(curve([[147, 180], [158, 180], [160, 191], [153, 197], [147, 190]], true, 3), rnd, 0.4, 3)
  halo(p, skull, 6, 0.05); halo(p, puff, 6, 0.08); halo(p, tongue, 3, 0)
  for (const ear of ears) halo(p, ear, 5, 0)
  for (const ear of ears) { shape(p, ear, null, 3, 5); fill(p.key, oval(ear[0][0] - 18, 71, 9.5, 8.5, 0, 3)) }
  shape(p, skull, null, 2.6, 6.5)
  // The stripes: from beside the nose, widening through each eye, up to the ear.
  const stripe = curve([[137, 168], [122, 146], [100, 116], [84, 92], [84, 72], [104, 62], [120, 84], [130, 112], [138, 140], [142, 166]])
  for (const side of [rough(stripe, rnd, 0.9, 5), rough(mirrored(stripe, MID), rnd, 0.9, 5)]) within(p.key, skull, () => fill(p.key, side))
  for (const x of [110, 180]) {
    if (blink) { carve(p, ['key'], curve([[x - 10, 107], [x, 113], [x + 10, 107]], false), 3.4, 0.2); continue }
    cut(p.key, oval(x, 108, 10.5, 9, 0, 3))
    fill(p.key, oval(x - 1.5, 111.5, 5.2, 5.4, 0, 2))
    cut(p.key, oval(x - 3.5, 109.5, 1.5, 1.5, 0, 1.5))
  }
  for (const x of [91, 199]) fill(p.red, oval(x, 134, 8.5, 7.5, 0, 3))
  shape(p, tongue, 'red', 1.5, 2.6)
  fill(p.key, rough(curve([[127, 157], [MID, 152], [163, 157], [158, 172], [MID, 178], [132, 172]], true, 3), rnd, 0.6, 4))
  cut(p.key, gouge(136, 160, 0.1, 9, 2.6))
  draw(p, curve([[131, 178], [138, 184], [MID, 178], [152, 184], [159, 178]], false, 3), 2.6, 0.2)
  for (let i = 0; i < 4; i++) fill(p.key, gouge(138 + rnd() * 12, 80 + i * 14 + rnd() * 5, 1.5, 6 + rnd() * 5, 1.7))
  // The cap: a soft crown gathered into a band.
  shape(p, puff, null, 2.6, 6.5)
  for (const pleat of [[[112, 50], [104, 26], [112, 2]], [[MID, 46], [146, 18], [142, -6]], [[180, 50], [190, 26], [184, 4]]] as Pt[][]) draw(p, curve(pleat, false), 3, 0)
  for (let i = 0; i < 6; i++) fill(p.key, gouge(92 + rnd() * 100, -2 + rnd() * 34, 0.2, 6 + rnd() * 6, 1.7))
  shape(p, band, null, 2, 4.5)
}

/** The badger in its box. `blink` prints the same badger with its eyes shut. */
export function paintBadger(p: Print, blink: boolean): void {
  posed(p, 0, 0, 0, 1, () => {
    for (const g of [p.base, p.blue, p.gold, p.red, p.key]) { g.translate(6, 36); g.scale(0.9, 0.9) }
    body(p)
    posed(p, MID, 168, -0.09, 1, () => head(p, blink))
  })
}
