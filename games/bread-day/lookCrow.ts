import { bare, carve, coat, curve, cut, fill, gouge, halo, offset, oval, ribbon, rough, within, type Print, type Pt } from './lookCut'
import { basket, clearBeak, corner, paintBeak, type Beak } from './lookHen'

// The crow at the hatch: nearly all key block, its feathers white gouge marks,
// one wing held out behind it to be admired. It wants a bread as black as that
// wing. A basket hangs from its lifted foot. Painted in reference units from
// its box's top left corner; the lower edge cuts its leg and the tip of its tail.

/** Where the beak tip and the basket's opening are, as shares of the box. */
export const CROW = { w: 220, h: 250, mouth: [0.95, 0.27], basket: [0.82, 0.86] } as const

const BEAK: Beak = { hinge: [156, 62], upper: [[152, 41], [180, 43], [202, 52], ...corner(213, 67), [190, 65], [154, 64]], lower: [[154, 63], [190, 65], ...corner(205, 68), [186, 77], [154, 81]], line: [[158, 64], [200, 66.5]], ink: null, lift: 0.26, drop: 0.42 }

/** The wing held out: a dark fan with fingered tips, split feather from feather by long cuts. */
function wing(p: Print): void {
  const { rnd } = p
  const fan = rough(curve([[110, 100], [76, 86], [40, 94], [14, 120], ...corner(7, 164), [26, 150], ...corner(14, 190), [36, 172], ...corner(29, 210), [51, 189], ...corner(53, 219), [69, 196], [88, 194], [106, 170], [116, 132]], true, 4), rnd, 1.1, 5)
  halo(p, fan, 5, 0.05)
  fill(p.base, fan); fill(p.key, fan)
  within(p.key, fan, () => {
    // One long cut down the shaft of each finger feather, and one between each pair.
    for (const [ax, ay, bx, by] of [[40, 118, 9, 158], [52, 128, 26, 154], [60, 136, 16, 184], [70, 142, 37, 176], [78, 148, 32, 203], [88, 154, 52, 192], [96, 160, 55, 211], [104, 164, 70, 198]]) {
      carve(p, ['key'], curve([[ax, ay], [(ax + bx) / 2 - 5, (ay + by) / 2 - 3], [bx, by]], false), 3.4, 0.2)
    }
    // The small feathers of the shoulder, in a row along its leading edge.
    for (let i = 0; i < 8; i++) cut(p.key, gouge(34 + i * 9.5 + rnd() * 3, 108 - Math.sin(i * 0.45) * 10 + i * 2.5, 2 - i * 0.05, 11 + rnd() * 4, 4.6))
  })
}

/** The crow in its box. `open` prints the same crow with its beak wide. */
export function paintCrow(p: Print, open: boolean): void {
  const { rnd } = p
  const body = rough(curve([[118, 22], [146, 27], [161, 46], [160, 78], [152, 97], [166, 122], [175, 152], [168, 186], [148, 212], [118, 221], [92, 217], [72, 232], ...corner(48, 252), [50, 218], [62, 180], [72, 138], [80, 100], [88, 62], [98, 36]]), rnd, 1.3, 5)
  const stand: Pt[] = [[122, 212], [120, 252]], lifted = curve([[146, 204], [166, 204], [180, 193]], false, 4)
  clearBeak(p, BEAK, open)
  halo(p, body, 6.5, 0.1)
  for (const leg of [stand, lifted]) bare(p, ribbon(leg, () => 10.5))
  fill(p.key, ribbon(stand, () => 6)); fill(p.key, ribbon(lifted, () => 6))
  // A tuft the wind has got under, at the back of the crown.
  const tuft = [0, 1, 2].map((i) => gouge(113 - i * 8, 27 + i * i * 2.2, -1.75 - i * 0.3, 17 - i, 6.5))
  for (const quill of tuft) bare(p, offset(quill, () => 3.2))
  for (const quill of tuft) fill(p.key, quill)
  fill(p.base, body); fill(p.key, body)
  // Feathers lie down the breast and along the tail: few on the head, most where the breast turns to the bakery.
  coat(p, body, 10.5, 16, 5, (x, y) => 1.85 + (150 - x) * 0.004 + Math.max(0, y - 190) * 0.008, (x, y) => (y < 94 ? 0.07 : Math.max(0.12, Math.min(0.62, 0.14 + (x - 80) / 150))))
  // The hackles of the throat: three longer cuts.
  for (let i = 0; i < 3; i++) cut(p.key, gouge(146 - i * 9, 88 + i * 3, 1.5 + i * 0.12, 20, 3.6, -2))
  basket(p, 180, 215, 50, 33, [[158, 217], [162, 199], [180, 190], [198, 199], [202, 217]])
  // The claws over the hoop of the basket.
  const claws = [0, 1, 2].map((i) => gouge(172 + i * 7, 185, 1.25 + i * 0.22, 15, 4.6))
  for (const claw of claws) bare(p, offset(claw, () => 1.8))
  for (const claw of claws) fill(p.key, claw)
  wing(p)
  // The line where the beak meets the face, a bright round eye and a cheek.
  carve(p, ['key'], curve([[151, 42], [156, 62], [153, 81]], false, 4), 2.6, 0.3)
  const cheek = oval(133, 77, 7.5, 6.5, 0, 3)
  cut(p.key, cheek); fill(p.red, cheek)
  cut(p.key, oval(136, 52, 11, 10.5, 0, 3))
  fill(p.key, oval(138.5, 53, 5.4, 5.6, 0, 2))
  cut(p.key, oval(136.6, 50.8, 1.7, 1.7, 0, 1.5))
  paintBeak(p, BEAK, open)
}
