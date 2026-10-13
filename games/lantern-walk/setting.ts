import { BADGER_HOLE, HEDGEHOG_LANE, HOOK, MOTH_TRUNK, WORMS, wormPlace } from './layout'
import { noise, type Sketch } from './sketch'

// The wood that stands still, written once into a sketch: `lines` are the
// scraped lines, and `hide` holds the masses (trunks, the wall, the mound)
// that the light shows as shade. It is drawn past the stage on every side,
// since a surface of another shape shows more of it. Nothing here answers a
// touch, so nothing here is drawn as a thing to pick up. And nothing is drawn
// as a row of equal marks, which a child may take for writing: leaves, blades
// and shingles each have their own size and lean ("Reader" in REFINEMENT.md
// lists the marks that stay).

const PI = Math.PI
/** How far past the stage the wood is drawn. */
export const PAST = { left: -180, right: 1360, top: -80, bottom: 900 }

function trunk(s: Sketch, left: number, right: number, top: number, foot: number, id: number): void {
  const lean = noise(id, 1) * 10
  s.shape('hide', [left, top, right, top, right + lean + 6, foot, left + lean - 6, foot])
  s.line([left, top, left + lean * 0.4, (top + foot) / 2, left + lean - 6, foot, left + lean - 22, foot + 10])
  s.line([right, top, right + lean * 0.4, (top + foot) / 2, right + lean + 6, foot, right + lean + 22, foot + 10])
  // Bark: short broken strokes, never a ruled line.
  const width = right - left
  for (let k = 0; k < Math.round(width / 9) * 3; k++) {
    const x = left + 6 + (width - 12) * (0.5 + 0.5 * noise(id * 31 + k, 2))
    const y = top + (foot - top) * (0.5 + 0.5 * noise(id * 17 + k, 3))
    const length = 16 + 16 * (0.5 + 0.5 * noise(id + k, 4))
    if (y + length < foot - 6) s.line([x, y, x + noise(k, 5) * 3, y + length])
  }
}

function leaf(s: Sketch, x: number, y: number, size: number, turn: number): void {
  s.push(x, y, turn)
  s.bend(0, 0, size * 0.5, -size * 0.45, size, 0, 5)
  s.bend(0, 0, size * 0.5, size * 0.45, size, 0, 5)
  s.line([size * 0.1, 0, size * 0.9, 0])
  s.pop()
}

function toadstool(s: Sketch, x: number, y: number, size: number, id: number): void {
  s.push(x, y, noise(id, 6) * 0.12)
  s.line([-size * 0.16, 0, -size * 0.12, -size * 0.7]); s.line([size * 0.16, 0, size * 0.12, -size * 0.7])
  s.arc(0, -size * 0.7, size * 0.62, size * 0.56, PI, PI * 2, 12)
  s.bend(-size * 0.62, -size * 0.7, 0, -size * 0.52, size * 0.62, -size * 0.7, 8)
  s.shape('hide', [-size * 0.62, -size * 0.7, -size * 0.4, -size * 1.12, 0, -size * 1.26, size * 0.4, -size * 1.12, size * 0.62, -size * 0.7])
  s.shape('lines', [-size * 0.34, -size * 0.9, -size * 0.2, -size * 1.0, -size * 0.14, -size * 0.86, -size * 0.34, -size * 0.9])
  s.shape('lines', [size * 0.04, -size * 1.0, size * 0.2, -size * 1.12, size * 0.26, -size * 0.96, size * 0.04, -size * 1.0])
  // The frill under the cap: a few gills, each its own length.
  for (let k = -2; k <= 2; k++) s.line([k * size * 0.17 + noise(k + id, 7) * 3, -size * 0.64, k * size * 0.19, -size * (0.55 - 0.06 * noise(k, id + 8))])
  s.pop()
}

function fern(s: Sketch, points: readonly number[], leaflets: number, size: number): void {
  s.line(points)
  const pieces = points.length / 2 - 1
  for (let k = 1; k < leaflets; k++) {
    const along = (k / leaflets) * pieces, at = Math.min(pieces - 1, Math.floor(along)), part = along - at
    const x0 = points[at * 2], y0 = points[at * 2 + 1], x1 = points[at * 2 + 2], y1 = points[at * 2 + 3]
    const x = x0 + (x1 - x0) * part, y = y0 + (y1 - y0) * part
    const angle = Math.atan2(y1 - y0, x1 - x0)
    const reach = size * (0.5 + 0.5 * Math.sin((k / leaflets) * PI)) * (0.8 + 0.3 * noise(k, 14))
    leaf(s, x, y, reach, angle - 1.25)
    leaf(s, x, y, reach * 0.9, angle + 1.25)
  }
}

/** A tuft of grass: a few blades from one foot, each its own height and lean. */
function tuft(s: Sketch, x: number, y: number, id: number): void {
  const blades = 2 + Math.round(1.4 * (0.5 + 0.5 * noise(id, 60)))
  for (let k = 0; k < blades; k++) {
    const lean = (k - (blades - 1) / 2) * 7 + noise(id * 5 + k, 61) * 6
    const height = 12 + 14 * (0.5 + 0.5 * noise(id * 3 + k, 62))
    s.bend(x + k * 3, y, x + k * 3 + lean * 0.3, y - height * 0.6, x + k * 3 + lean, y - height, 3)
  }
}

/** A stone: a lump with corners, never a ring. */
function stone(s: Sketch, x: number, y: number, w: number, h: number, id: number): void {
  const points: number[] = []
  for (let k = 0; k <= 6; k++) {
    const angle = (k % 6) * (PI / 3) + noise(id, 50) * 0.4
    const r = 0.8 + 0.3 * (0.5 + 0.5 * noise(id * 7 + (k % 6), 51))
    points.push(x + Math.cos(angle) * w * r, y + Math.sin(angle) * h * r)
  }
  s.line(points)
}

/**
 * Cracks in the plaster of the house wall: three hairlines, each jagged and nearly straight, each with its own
 * slant and length, one beside the door post, one over the door and one under the eaves. None stands above
 * another, none forks and none bends twice like a letter (layout.test.ts holds it).
 */
export const CRACKS: readonly (readonly number[])[] = [
  [1044, 548, 1049, 566, 1046, 580, 1054, 598, 1052, 614, 1060, 632],
  [1088, 322, 1098, 328, 1103, 342, 1115, 346, 1119, 361, 1130, 366],
  [1170, 292, 1162, 303, 1165, 315, 1157, 326, 1158, 338],
]

/**
 * The twigs that lie on the near ground: how each is turned, how long it is, where it is bent and how far. Each
 * is one bent stick with no fork, and no two have one direction and one length (layout.test.ts holds it).
 */
export const TWIGS: readonly (readonly [number, number, number, number])[] = [
  [0.3, 22, 0.4, 0.5], [1.9, 16, 0.62, -0.4], [2.6, 28, 0.3, 0.32], [1.1, 19, 0.5, -0.6], [2.95, 25, 0.7, 0.45], [1.5, 27, 0.45, 0.3], [0.75, 30, 0.35, -0.36], [2.2, 18, 0.6, 0.55],
]

/** Twig `n` as it lies, from its own middle: three points, bent once. */
export function twigOf(n: number): number[] {
  const [turn, long, at, kink] = TWIGS[n % TWIGS.length]
  const ax = Math.cos(turn), ay = Math.sin(turn), bx = Math.cos(turn + kink), by = Math.sin(turn + kink)
  const kx = -long / 2 + ax * long * at, ky = ay * long * at
  return [-long / 2, 0, kx, ky, kx + bx * long * (1 - at), ky + by * long * (1 - at)]
}

/** The mouth of the badger's hole: an uneven arch, open at the ground. */
export const HOLE_MOUTH: readonly number[] = [324, 802, 322, 776, 328, 752, 338, 737, 352, 730, 366, 737, 373, 756, 376, 780, 374, 802]

export function paintSetting(s: Sketch): void {
  // The canopy: clumps of leaves across the top. No two clumps next to each other have the same width, droop or
  // lean, some stretches are a spray of loose leaves instead, and the rows wander, so it is foliage and not a
  // line of equal marks.
  for (let row = 0; row < 5; row++) {
    let x = PAST.left + (row % 3) * 23 - 20
    for (let k = 0; x < PAST.right; k++) {
      const id = row * 131 + k
      const big = (k + row) % 3 === 0 ? 1 : 0
      const wide = 18 + 20 * (0.5 + 0.5 * noise(id, 1)) + big * 30
      const y = PAST.top + 20 + row * 39 + noise(id, 2) * 19
      if ((k + row * 2) % 5 === 3) {
        for (let n = 0; n < 3; n++) leaf(s, x + wide * (0.3 + n * 0.6), y + 8 + noise(id + n, 6) * 12, 20 + 12 * (0.5 + 0.5 * noise(id + n, 7)), 0.5 + n * 0.7 + noise(id + n, 9) * 0.6)
      } else {
        s.arc(x + wide, y, wide, 12 + 10 * (0.5 + 0.5 * noise(id, 3)) + big * 24, 0.05 + 0.3 * (0.5 + 0.5 * noise(id, 4)), PI - 0.05 - 0.3 * (0.5 + 0.5 * noise(id, 14)), 9, noise(id, 5) * 0.42)
        if (big) s.bend(x + wide * 0.5, y + 6, x + wide, y + 16 + noise(id, 15) * 8, x + wide * 1.4, y + 4, 4)
      }
      if (row === 4 && k % 2 === 0) leaf(s, x + wide * 0.6, y + 34 + noise(id, 6) * 8, 16 + 8 * noise(id, 7), 1.1 + noise(id, 9) * 0.8)
      if (row === 4 && k % 3 === 1) s.line([x + wide, y + 30, x + wide - 3 + noise(id, 8) * 6, y + 44 + noise(id, 10) * 10])
      x += wide * 2 - 6 + noise(id, 11) * 12
    }
  }
  // Creepers that hang out of the leaves, each to its own length, short of the fern.
  const creepers = [[372, 148, 252], [454, 150, 236], [548, 146, 268], [600, 150, 222], [776, 148, 290]]
  for (const [x, top, foot] of creepers) {
    const points: number[] = []
    for (let k = 0; k <= 6; k++) points.push(x + Math.sin(k * 1.1 + x) * 7, top + ((foot - top) * k) / 6)
    s.line(points)
    for (let k = 1; k <= 5; k++) leaf(s, points[k * 2], points[k * 2 + 1], 13 + 6 * (0.5 + 0.5 * noise(k, x)), (k % 2 ? 0.5 : PI - 0.5) + noise(k, x) * 0.3)
  }
  // The moon behind the leaves, thin and lying on its back.
  s.arc(424, 196, 46, 46, 0.5, PI + 0.9, 16)
  s.arc(434, 182, 40, 40, 0.75, PI + 0.62, 14)

  // The far ground line: tufts and bare stretches, nothing ruled.
  let gx = PAST.left
  for (let k = 0; gx < PAST.right; k++) {
    const y = 566 + noise(k, 12) * 7
    const run = 26 + 30 * (0.5 + 0.5 * noise(k, 13))
    if (k % 3 !== 2) s.bend(gx, y, gx + run / 2, y + noise(k, 15) * 5, gx + run, y + noise(k + 1, 12) * 4, 3)
    if (k % 2 === 0) tuft(s, gx + run * 0.4, y, k + 300)
    gx += run + 8
  }
  // Leaves and pebbles lying on the far ground, behind where the fox walks.
  for (let k = 0; k < 16; k++) {
    const x = 350 + k * 34 + noise(k, 16) * 12, y = 590 + 34 * (0.5 + 0.5 * noise(k, 17))
    if (k % 3 === 0) stone(s, x, y, 7 + 4 * noise(k, 18), 4, k + 40)
    else leaf(s, x, y, 14 + 6 * noise(k, 19), noise(k, 20) * 1.4)
  }
  // What lies flat on the near ground, where the fox and the hedgehog walk over it: fallen leaves, pebbles, twigs
  // and the dips of the ground itself. Nothing here stands up, so nothing is walked through.
  for (let k = 0; k < 30; k++) {
    const x = 348 + (k * 23.7 + 40 * (0.5 + 0.5 * noise(k, 24))) % 560, y = 640 + 150 * (0.5 + 0.5 * noise(k, 25))
    if (x > 896 && y < 690) continue
    // Nothing lies in the mouth of the badger's hole.
    if (x > BADGER_HOLE.left - 16 && x < BADGER_HOLE.right + 30 && y > BADGER_HOLE.top - 12) continue
    if (k % 4 === 0) stone(s, x, y, 8 + 5 * noise(k, 26), 5, k + 80)
    else if (k % 4 === 1) s.line(twigOf((k - 1) / 4).map((v, i) => v + (i % 2 ? y : x)))
    else leaf(s, x, y, 15 + 8 * (0.5 + 0.5 * noise(k, 19)), noise(k, 20) * 1.5)
  }
  for (const [x0, x1, y] of [[352, 430, 694], [520, 640, 700], [700, 800, 692], [380, 500, 760], [640, 760, 752]] as const) s.bend(x0, y, (x0 + x1) / 2, y + 7, x1, y - 2, 4)

  // The moths' tree, thick, with a knot in it; the glow-worms' fern grows from its side and arches over the middle of the wood.
  trunk(s, MOTH_TRUNK.left, MOTH_TRUNK.right, 132, MOTH_TRUNK.foot, 6)
  const rib: number[] = [MOTH_TRUNK.left + 4, 398, 838, 376, 780, 364]
  for (let i = 0; i < WORMS; i++) {
    const at = wormPlace(i)
    rib.push(at.x, at.y + 3)
  }
  rib.push(474, 374)
  fern(s, rib, 21, 28)
  // Roots at its foot, where sleeping moths lie, and a stump with a snail on it, out of everyone's way.
  s.bend(MOTH_TRUNK.left - 2, 560, 862, 566, 848, 580, 4); s.bend(MOTH_TRUNK.right, 560, 1008, 570, 1016, 584, 4)
  s.shape('hide', [906, 682, 912, 618, 996, 614, 1002, 682])
  s.line([906, 682, 912, 620]); s.line([1002, 682, 996, 616])
  s.shape('lines', [912, 620, 936, 606, 978, 604, 996, 616, 974, 628, 930, 630, 912, 620])
  s.arc(954, 617, 22, 6, 0.3, PI * 1.5, 7); s.arc(954, 617, 10, 3, PI, PI * 2.4, 5)
  s.line([930, 646, 934, 668]); s.line([972, 642, 968, 662]); s.line([952, 656, 955, 676])
  s.push(948, 608)
  s.shape('lines', [-12, -2, -10, -16, 2, -22, 12, -14, 10, -2]); s.arc(0, -11, 6, 5, 0, PI * 1.5, 6)
  s.line([-16, -2, 20, -2, 26, -9]); s.line([22, -8, 24, -18]); s.line([26, -8, 31, -15])
  s.pop()

  // The great trunk at the left edge and the owl's branch.
  s.shape('hide', [PAST.left, PAST.top, 100, PAST.top, 112, 400, 134, PAST.bottom, PAST.left, PAST.bottom])
  s.line([100, PAST.top, 104, 180, 100, 270]); s.line([108, 342, 112, 480, 122, 640, 140, PAST.bottom])
  for (let k = 0; k < 64; k++) {
    const x = PAST.left + 8 + 270 * (0.5 + 0.5 * noise(k, 20)), y = PAST.top + (PAST.bottom - PAST.top - 100) * (0.5 + 0.5 * noise(k, 21))
    if (x < 94 && (y < 240 || y > 350)) s.line([x, y, x + noise(k, 22) * 4, y + 44, x + noise(k, 23) * 5, y + 92])
  }
  s.shape('hide', [100, 280, 300, 296, 452, 312, 300, 330, 100, 342])
  s.line([100, 270, 200, 286, 300, 294, 400, 304, 456, 312])
  s.line([108, 342, 200, 336, 300, 330, 400, 320, 456, 312])
  // Bark on the branch: a few marks, no two of one length or one lean, and no two the same way apart.
  for (const [x, y, long, lean] of [[124, 300, 9, 5], [146, 318, 30, -3], [222, 304, 13, 6], [296, 320, 22, -2], [318, 306, 8, 4], [398, 312, 30, 3]]) {
    s.bend(x, y, x + long * 0.5, y + lean * 1.4, x + long, y + lean, 3)
  }
  s.bend(372, 300, 384, 268, 410, 246, 6)
  // Under the branch, where nobody walks: creepers of three lengths, two bracket fungi on the trunk and a frond growing out of it.
  for (const [x, top, foot] of [[150, 344, 468], [236, 338, 428], [322, 330, 498]]) {
    const points: number[] = []
    for (let k = 0; k <= 6; k++) points.push(x + Math.sin(k * 1.3 + x) * 8, top + ((foot - top) * k) / 6)
    s.line(points)
    for (let k = 1; k <= 6; k++) leaf(s, points[k * 2], points[k * 2 + 1], 14 + 8 * (0.5 + 0.5 * noise(k, x)), (k % 2 ? 0.6 : PI - 0.6) + noise(k, x + 1) * 0.4)
  }
  for (const [y, wide] of [[402, 46], [452, 32]]) {
    s.line([112, y - 4, 112 + wide * 0.6, y - 12, 112 + wide, y - 2, 112 + wide * 0.5, y + 8, 114, y + 10])
    for (let k = 1; k <= 3; k++) s.line([112 + wide * 0.22 * k, y + 2 + noise(k, y) * 2, 112 + wide * 0.2 * k - 3, y + 7])
  }
  fern(s, [116, 512, 168, 468, 232, 432, 300, 414], 11, 24)
  leaf(s, 410, 246, 26, -0.5); leaf(s, 396, 262, 22, -2.3); leaf(s, 446, 314, 24, 0.5)

  // The house at the right edge: wall, eaves, door, mat, and the hook the lantern hangs on.
  s.shape('hide', [1034, 236, PAST.right, 150, PAST.right, PAST.bottom, 1034, PAST.bottom])
  s.line([1034, 236, 1036, 480, 1034, 700, 1036, PAST.bottom])
  s.line([988, 262, 1100, 208, 1220, 160, PAST.right, 112])
  s.line([996, 246, 1100, 190, 1220, 142, PAST.right, 94])
  // Slates along the eaves: each a closed four-cornered tile of its own width hanging from the eave line, every other one slipped.
  let ex = 1004
  for (let k = 0; ex < PAST.right; k++) {
    const wide = 26 + 22 * (0.5 + 0.5 * noise(k, 35)), y = 248 - (ex - 1004) * 0.445 - (k % 2) * 7
    const far = wide - 5, deep = 13 + noise(k, 36) * 4
    s.line([ex, y, ex + far, y - far * 0.445, ex + far - 2 + noise(k, 37) * 2, y - far * 0.445 + deep, ex + 3, y + deep + noise(k, 38) * 2, ex, y])
    ex += wide
  }
  // Cracks in the plaster.
  for (const crack of CRACKS) s.line(crack)
  // The door: a round-topped frame, planks of uneven width, two hinge straps that curl, and a latch.
  s.line([1078, 792, 1078, 492]); s.arc(1160, 492, 82, 66, PI, PI * 1.5, 8); s.line([1160, 426, PAST.right, 426])
  s.line([1090, 792, 1090, 500]); s.arc(1160, 500, 70, 60, PI, PI * 1.5, 8)
  for (const x of [1120, 1162, 1192, 1240, 1276, 1326]) s.line([x, 792, x + noise(x, 42) * 3, x < 1150 ? 470 : 441])
  s.bend(1090, 548, 1126, 540, 1150, 552, 5); s.arc(1150, 560, 8, 8, -PI / 2, PI, 6)
  s.bend(1090, 724, 1120, 734, 1142, 722, 5); s.arc(1142, 714, 8, 8, PI / 2, PI * 2, 6)
  s.shape('lines', [1098, 628, 1118, 620, 1122, 634, 1100, 644, 1098, 628])
  s.line([1062, 794, PAST.right, 794]); s.line([1054, 808, PAST.right, 808])
  // The mat's fringe: threads of every length.
  let mx = 1066
  for (let k = 0; mx < PAST.right; k++) {
    s.line([mx, 796, mx - 2 - 4 * (0.5 + 0.5 * noise(k, 45)), 801 + 7 * (0.5 + 0.5 * noise(k, 46))])
    mx += 8 + 12 * (0.5 + 0.5 * noise(k, 47))
  }
  // The hook: an iron arm from the wall with an upturned end.
  s.line([1034, HOOK.y - 26, 1062, HOOK.y - 30, HOOK.x - 6, HOOK.y - 18, HOOK.x + 2, HOOK.y - 4, HOOK.x - 2, HOOK.y + 6, HOOK.x - 12, HOOK.y + 4])
  s.line([1034, HOOK.y + 4, 1058, HOOK.y - 26])

  // The badger's mound and a toadstool beside it.
  s.shape('hide', [20, 800, 60, 600, 196, 530, 330, 610, 400, 800])
  s.bend(24, 800, 40, 560, 196, 532, 10); s.bend(196, 532, 350, 556, 398, 800, 10)
  toadstool(s, 316, 542, 30, 6)
  // Its hole, at the foot of the mound beside it: a ragged mouth with the dark inside, a root hanging over it, and the earth it dug out lying before it.
  s.shape('hide', HOLE_MOUTH)
  s.line(HOLE_MOUTH)
  s.line([334, 790, 340, 762, 349, 748]); s.line([352, 796, 357, 774]); s.line([366, 788, 364, 764, 358, 750])
  s.bend(344, 733, 352, 746, 347, 760, 4)
  stone(s, 392, 796, 9, 5, 91); stone(s, 404, 810, 6, 4, 92)

  // The roots that stop a rolling hedgehog, at the two ends of its way.
  const leftRoot = HEDGEHOG_LANE.left - 108, rightRoot = HEDGEHOG_LANE.right + 106
  s.bend(leftRoot - 14, 816, leftRoot - 6, 772, leftRoot + 2, 814, 6); s.bend(leftRoot - 26, 818, leftRoot - 20, 792, leftRoot - 10, 800, 4)
  s.bend(rightRoot, 816, rightRoot + 4, 778, rightRoot + 10, 814, 6)
  // Stones of the path to the door, flat in the grass in front of it: no two of one size, and no two gaps alike.
  for (const [x, y, w, h, id] of [[512, 812, 30, 6, 0], [566, 806, 15, 5, 1], [684, 813, 38, 7, 2], [744, 808, 12, 4, 3], [866, 811, 25, 6, 4], [948, 807, 19, 5, 5]]) stone(s, x, y, w, h, id)
  // Grass along the foot of the picture, and under it.
  let fx = PAST.left
  for (let k = 0; fx < PAST.right; k++) {
    tuft(s, fx, 824 + noise(k, 63) * 5, k)
    fx += 16 + 20 * (0.5 + 0.5 * noise(k, 64))
  }
  for (let row = 0; row < 3; row++) {
    let x = PAST.left + row * 13
    for (let k = 0; x < PAST.right; k++) {
      tuft(s, x, 852 + row * 22 + noise(k, 65 + row) * 6, 500 + row * 97 + k)
      x += 30 + 30 * (0.5 + 0.5 * noise(k, 66 + row))
    }
  }
}
