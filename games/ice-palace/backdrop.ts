import { BOUGH, BUILD, CLEAR_WITHIN, FIRS, GROUND_Y, POND, ridge } from './ground'
import { HARE_STEPS } from './cast'
import { all, blobby, dot, lens, oval, placed, poly, type Print, type Shape } from './print'

// Everything in the clearing that stands still, painted once for a size and
// stamped once a frame: the sky and its clouds, the bough that hangs in at
// the top, the ridge and its firs, the bank, the hare's tracks, the pond with
// its cloudy rim, the berry bush and the ink's grain. It is painted twice,
// by day and under the night's pull. What can move or be touched is drawn
// live by the view.

export { FIRS, ridge }

/** One fir, standing with its foot at `base`. */
export const fir = (x: number, base: number, h: number): Shape => {
  const w = h * 0.36
  return all(
    poly(x, base - h, x + w * 0.55, base - h * 0.62, x - w * 0.55, base - h * 0.62),
    poly(x, base - h * 0.78, x + w * 0.8, base - h * 0.32, x - w * 0.8, base - h * 0.32),
    poly(x, base - h * 0.5, x + w, base - h * 0.04, x - w, base - h * 0.04),
    poly(x - w * 0.12, base - h * 0.06, x + w * 0.12, base - h * 0.06, x + w * 0.12, base + h * 0.06, x - w * 0.12, base + h * 0.06),
  )
}
/** Snow lying on a fir's three tiers, on the side the weather comes from. */
const firSnow = (x: number, base: number, h: number): Shape => {
  const w = h * 0.36
  return all(
    lens(x - w * 0.1, base - h * 0.98, x - w * 0.5, base - h * 0.64, -h * 0.03, h * 0.035),
    lens(x - w * 0.16, base - h * 0.72, x - w * 0.74, base - h * 0.34, -h * 0.03, h * 0.035),
    lens(x - w * 0.2, base - h * 0.44, x - w * 0.94, base - h * 0.06, -h * 0.03, h * 0.035),
  )
}

const cloud = (x: number, y: number, s: number): Shape => all(oval(x, y, 62 * s, 20 * s), oval(x - 26 * s, y - 14 * s, 30 * s, 20 * s), oval(x + 14 * s, y - 20 * s, 36 * s, 24 * s), oval(x + 44 * s, y - 8 * s, 24 * s, 16 * s))

/**
 * Paints the still layer through `p`, whose surface is already set to stage units. `x0` to `x1` and `y0` to
 * `y1` are what of the stage's plane the surface shows: more than the stage on a surface of another shape, and
 * the sky, the ridge and the snow carry on out to those edges.
 */
export function paintBackdrop(p: Print, x0: number, y0: number, x1: number, y1: number): void {
  p.fill('paper', poly(x0, y0, x1, y0, x1, y1, x0, y1))

  // The sky is the blue ink, down to the ridge.
  p.fill('blue', (g) => {
    g.moveTo(x0, y0)
    g.lineTo(x1, y0)
    for (let x = x1; x > x0 - 20; x -= 20) g.lineTo(x, ridge(x))
    g.closePath()
  })
  p.fill('paper', all(cloud(424, 176, 0.8), cloud(628, 50, 1.25), cloud(850, 104, 0.8), cloud(1062, 54, 1.05)))

  // The bough of a fir that stands outside the frame: a twig in from the top, a clump of needles over each place an icicle hangs, snow lying on it.
  p.fill('both', all(
    lens(262, -8, 540, 44, 9, -7),
    ...BOUGH.map(({ x, y }, i) => poly(x - 30 - (i % 2) * 6, y - 30, x + 28 + (i % 3) * 5, y - 26, x + 15, y + 3, x + 2, y - 6, x - 13, y + 4)),
  ))
  p.fill('paper', all(lens(270, -10, 420, 16, -7, 2), lens(410, 12, 530, 38, -6, 2)))

  // The firs are both inks; the snow on them is the sheet.
  p.fill('both', all(...FIRS.map(([x, h]) => fir(x, ridge(x) + 8, h))))
  p.fill('paper', all(...FIRS.map(([x, h]) => firSnow(x, ridge(x) + 8, h))))

  // The bank: its face is in shade, right across the clearing.
  p.fill('blue', (g) => {
    g.moveTo(x0, GROUND_Y)
    g.lineTo(x1, GROUND_Y)
    for (let x = x1; x >= x0 - 16; x -= 16) g.lineTo(x, GROUND_Y + 16 + 6 * Math.sin(x / 37) + 4 * Math.sin(x / 11))
    g.closePath()
  })

  // The far snow rolls: thin lines of shade, drawn light so that the bank where the palace stands stays the plain
  // surface under the blocks. A hare has crossed it, and the king's footprints come in from the edge.
  p.fill('blue', all(
    lens(150, 312, 330, 296, 3), lens(250, 356, 420, 348, 2.4), lens(396, 286, 560, 276, 3), lens(520, 334, 700, 330, 2.4),
    lens(640, 292, 800, 300, 3), lens(760, 352, 880, 346, 2.4), lens(300, 420, 470, 414, 2.4), lens(560, 430, 760, 424, 2.4),
    lens(BUILD.x1 + 10, 420, BUILD.x1 + 64, 414, 2.4),
  ))
  // The hare's tracks, where the hare lands after each of its bounds (cast.ts): two small prints side by side
  // and a long one behind, turned the way it was going. The bounds are uneven and the line wanders.
  p.fill('blue', all(...HARE_STEPS.slice(1, -1).map((step, i) => {
    const before = HARE_STEPS[i], turn = Math.atan2(step.y - before.y, step.x - before.x)
    return placed(step.x, step.y + 4, turn, 1, 1, all(oval(6, -4, 4.5, 2.6), oval(8, 4 + (i % 3), 4.5, 2.6), oval(-9 - (i % 2) * 4, 0, 5, 3)))
  })))
  // King Winter's footprints: five, of unequal size, step and turn, as a heavy walker's are.
  p.fill('blue', all(oval(1167, 575, 9.5, 5.2, -0.32), oval(1146, 597, 8, 5.6, -0.12), oval(1125, 561, 10, 5, -0.45), oval(1098, 588, 8.4, 4.6, -0.2), oval(1083, 549, 9, 5.4, -0.55)))

  // The pond: solid where the ice is clear, flecked with paper round its cloudy edge.
  const pond = oval(POND.cx, POND.cy, POND.rx, POND.ry)
  p.fill('water', pond)
  p.fill('cloud', all(pond, oval(POND.cx, POND.cy, POND.rx * CLEAR_WITHIN, POND.ry * CLEAR_WITHIN)), true)
  p.line('paper', 2, (g) => {
    g.moveTo(470, 640)
    g.quadraticCurveTo(560, 610, 660, 650)
    g.moveTo(520, 720)
    g.quadraticCurveTo(620, 742, 700, 706)
    g.moveTo(690, 628)
    g.quadraticCurveTo(730, 660, 716, 700)
  })
  // The peeper's hollow at one corner, the berry bush at the other.
  p.fill('blue', lens(14, 786, 196, 790, 8, -1))
  p.line('blue', 7, bushTwigs)
  p.line('red', 7, bushTwigs)
  p.fill('red', all(dot(1052, 716, 10), dot(1086, 742, 9), dot(1128, 700, 10), dot(1150, 748, 9), dot(1068, 778, 9), dot(1118, 786, 10), dot(1160, 800, 8)))
  p.fill('paper', all(blobby([1030, 696, 1052, 674, 1078, 692]), blobby([1104, 684, 1132, 666, 1158, 690]), blobby([1066, 760, 1092, 748, 1112, 766]), blobby([1010, 820, 1060, 792, 1120, 806, 1180, 790, 1190, 830])))

  // Ink grain over the whole sheet: it only shows where there is ink.
  p.fill('grain', poly(x0, y0, x1, y0, x1, y1, x0, y1))
}

const bushTwigs: Shape = (g) => {
  g.moveTo(1100, 824)
  g.lineTo(1100, 690)
  g.moveTo(1100, 780)
  g.lineTo(1056, 726)
  g.moveTo(1100, 760)
  g.lineTo(1146, 712)
  g.moveTo(1100, 800)
  g.lineTo(1156, 770)
  g.moveTo(1100, 806)
  g.lineTo(1062, 786)
}
