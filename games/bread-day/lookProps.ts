import { bare, curve, cut, draw, fill, gouge, halo, moved, offset, oval, posed, ribbon, rough, shape, slab, turned, weight, within, type Print, type Pt } from './lookCut'

// The things on and around the bench, each printed once into its own sprite:
// the peel, the dough, the flour sack, the water jug, a baked loaf, the fire
// and a sparrow. Each paints in reference units from its box's top left corner.

/** Where the middle of the peel's blade lies in its box, and how far the peel is turned so its handle points down and right. */
export const BLADE = { x: 212, y: 136, turn: 0.157 }

/** The peel: one plain blue board with a carved rim. It carries the working object, so it stays nearly bare of marks. */
export function paintPeel(p: Print): void {
  const { rnd } = p, { x, y, turn } = BLADE
  const outline = curve([[-190, 0], [-184, -70], [-150, -96], [0, -98], [150, -96], [182, -70], [190, -28], [215, -21], [300, -19], [418, -17], [432, 0], [418, 17], [300, 19], [215, 21], [190, 28], [182, 70], [150, 96], [0, 98], [-150, 96], [-184, 70]], true, 6)
  const board = rough(turned(moved(outline, x, y), turn, x, y), rnd, 1.1, 5)
  halo(p, board, 6, 0.07)
  fill(p.base, board)
  fill(p.blue, board)
  // Its weight: the block left standing along the low side only.
  fill(p.key, board)
  cut(p.key, offset(board, weight(rnd, board.length, 0.6, 7)))
  bare(p, oval(x + 398 * Math.cos(turn), y + 398 * Math.sin(turn), 6.5, 6, 0, 3))
  for (const [ax, ay, length] of [[-150, -62, 120], [40, 70, 110], [236, 2, 120]]) {
    draw(p, turned([[x + ax, y + ay], [x + ax + length / 2, y + ay + 1.5], [x + ax + length, y + ay]], turn, x, y), 2, 0.05)
  }
  // Flour dust: specks of bare paper thickest around where the dough lies.
  within(p.blue, board, () => {
    for (let i = 0; i < 190; i++) {
      const a = rnd() * Math.PI * 2, d = 0.8 + rnd() * rnd() * 0.75, r = 0.7 + rnd() * rnd() * 2.6
      cut(p.blue, oval(x - 12 + Math.cos(a) * 128 * d, y - 2 + Math.sin(a) * 86 * d, r, r * (0.6 + rnd() * 0.4), rnd() * 3, 2))
    }
  })
}

/** The dough: bare paper inside one contour, heavier underneath, and two marks. Nothing else: it is the working object. */
export function paintDough(p: Print): void {
  const lump = rough(curve([[16, 100], [28, 56], [70, 24], [124, 16], [176, 30], [212, 66], [218, 108], [196, 146], [140, 162], [80, 160], [34, 142]]), p.rnd, 0.9, 7)
  shape(p, lump, null, 3, 9.5)
  draw(p, curve([[50, 74], [64, 52], [90, 40]], false), 3.4, 0.05)
  draw(p, curve([[152, 134], [178, 124], [192, 102]], false), 3.8, 0.05)
}

/** The flour sack: slumped, open at the top, a heap of flour standing in its mouth. */
export function paintSack(p: Print): void {
  const { rnd } = p
  const body = rough(curve([[26, 236], [14, 198], [18, 148], [30, 104], [44, 78], [62, 66], [104, 60], [132, 70], [150, 96], [162, 142], [166, 194], [158, 236], [94, 242]]), rnd, 1.3, 5)
  const lip = oval(88, 70, 50, 19, -0.1, 4), heap = rough(curve([[50, 72], [58, 44], [82, 26], [108, 38], [124, 68], [88, 80]]), rnd, 0.9, 4)
  halo(p, body, 6, 0.08); halo(p, lip, 5, 0); halo(p, heap, 5, 0)
  shape(p, body, null, 2.5, 8)
  within(p.red, body, () => {
    fill(p.red, ribbon(curve([[8, 158], [60, 172], [120, 170], [172, 154]], false), () => 14))
    fill(p.red, ribbon(curve([[8, 180], [60, 194], [120, 192], [172, 176]], false), () => 5))
  })
  shape(p, lip, null, 2, 5)
  fill(p.key, oval(88, 71, 41, 11.5, -0.1, 4))
  shape(p, heap, null, 1.6, 3.5)
  for (const fold of [[[40, 100], [35, 128], [41, 150]], [[134, 96], [146, 124], [143, 146]], [[30, 210], [58, 222], [94, 218]], [[112, 228], [138, 220], [154, 204]], [[84, 92], [80, 118], [86, 138]]] as Pt[][]) draw(p, curve(fold, false), 3, 0.05)
  // The side turned from the room, hatched.
  within(p.key, body, () => { for (let y = 106; y < 150; y += 9) fill(p.key, gouge(164, y, 2.5, 20 + rnd() * 8, 3.4)) })
  for (let i = 0; i < 9; i++) bare(p, oval(160 + rnd() * 16, 236 + rnd() * 10, 1 + rnd() * 2.2, 1 + rnd() * 1.4, 0, 2))
}

/** The water jug: a pale pot with a blue glazed belly, a handle and water up to its lip. */
export function paintJug(p: Print): void {
  const { rnd } = p
  const body = rough(curve([[42, 202], [24, 176], [17, 136], [27, 100], [47, 80], [51, 60], [45, 44], [40, 31], [72, 25], [104, 31], [124, 22], [115, 41], [99, 60], [101, 80], [121, 102], [129, 136], [121, 176], [103, 202], [72, 206]]), rnd, 1, 5)
  const grip = curve([[48, 60], [22, 58], [7, 84], [9, 118], [30, 138]], false)
  bare(p, ribbon(grip, () => 25)); halo(p, body, 6, 0.08)
  fill(p.key, ribbon(grip, () => 16)); bare(p, ribbon(grip, () => 8))
  shape(p, body, null, 2.5, 7.5)
  within(p.blue, body, () => {
    fill(p.blue, ribbon(curve([[8, 122], [72, 136], [136, 122]], false), () => 50))
    fill(p.blue, ribbon(curve([[40, 62], [72, 68], [106, 62]], false), () => 7))
  })
  cut(p.blue, gouge(38, 108, 1.45, 42, 7.5, 3))
  cut(p.blue, gouge(52, 114, 1.5, 22, 4, 2))
  shape(p, oval(73, 32, 29, 8.5, 0, 4), 'blue', 2, 3.5)
  draw(p, curve([[96, 178], [110, 164], [116, 144]], false), 3, 0.05)
}

/** A baked loaf: the one gold thing on the wall, scored three times. */
export function paintLoaf(p: Print): void {
  const loaf = rough(curve([[8, 51], [10, 31], [24, 15], [40, 10], [56, 15], [68, 31], [70, 51], [40, 56]]), p.rnd, 0.7, 4)
  halo(p, loaf, 4, 0)
  shape(p, loaf, 'gold', 2.5, 6.5)
  for (const [x, y] of [[20, 27], [34, 21], [48, 22]]) cut(p.gold, gouge(x, y, 1, 15, 4.6, 1))
}

/** One tongue of flame as a closed outline that comes to a point. */
function tongue(x: number, floor: number, w: number, h: number, lean: number): Pt[] {
  const tip: Pt = [x + lean, floor - h]
  return curve([[x - w, floor], [x - w * 0.9, floor - h * 0.3], [x - w * 0.35 + lean * 0.5, floor - h * 0.7], tip, tip, [x + w * 0.5 + lean * 0.4, floor - h * 0.55], [x + w, floor - h * 0.22], [x + w * 0.9, floor]], true, 4)
}

/** The fire in the oven mouth: gold tongues, a red heart printed over them, a bare core and two logs. `frame` is one of three stills it flickers between. */
export function paintFire(p: Print, frame: number): void {
  const { rnd } = p, floor = 198
  const flames = [[46, 20, 62], [76, 24, 112], [110, 28, 150], [142, 24, 104], [170, 19, 58]].map(([x, w, h], i) => {
    const sway = ((i + frame) % 3 - 1) * 9, high = h * (1 + (((i * 2 + frame) % 3) - 1) * 0.13)
    return { x, w, h: high, sway }
  })
  for (const f of flames) {
    const gold = rough(tongue(f.x, floor, f.w, f.h, f.sway), rnd, 0.9, 4)
    fill(p.base, gold); fill(p.gold, gold)
  }
  for (const f of flames.slice(1, 4)) fill(p.red, rough(tongue(f.x, floor, f.w * 0.62, f.h * 0.6, f.sway * 0.6), rnd, 0.8, 4))
  const core = tongue(110 + flames[2].sway * 0.3, floor, 13, flames[2].h * 0.34, flames[2].sway * 0.3)
  cut(p.gold, core); cut(p.red, core)
  // Licks carved by the key block, so the flames have drawing in them and not only colour.
  for (const f of flames) draw(p, curve([[f.x - f.w * 0.4, floor - f.h * 0.2], [f.x - f.w * 0.1 + f.sway * 0.4, floor - f.h * 0.5], [f.x + f.sway * 0.8, floor - f.h * 0.84]], false), 2.6, 0)
  for (const [x, y, r] of [[58 + frame * 9, 92 - frame * 14, 3.4], [150 - frame * 7, 70 + frame * 10, 3], [112 + frame * 12, 26 + frame * 6, 2.6]]) {
    const spark = oval(x, y, r, r * 1.3, 0.5, 2)
    fill(p.base, spark); fill(p.gold, spark)
  }
  for (const [x, turn, length] of [[28, 0.1, 118], [70, -0.12, 122]]) {
    const log = rough(turned(slab(x, floor - 15, length, 17, 9), turn, x + length / 2, floor - 6), rnd, 1, 3)
    bare(p, offset(log, () => 2.5)); fill(p.key, log)
    within(p.key, log, () => { for (let i = 0; i < 5; i++) cut(p.key, gouge(x + 10 + i * (length / 5.5) + rnd() * 6, floor - 7 + turn * (i - 2) * 22 + (rnd() - 0.5) * 6, turn, 12 + rnd() * 8, 2.6)) })
  }
}

/** A sparrow on the fence: a pale round bird with a dark cap, bib and wing. `peck` bends it over. */
export function paintSparrow(p: Print, peck: boolean): void {
  posed(p, 23, 30, peck ? 0.55 : 0, 1, () => {
    const body = rough(curve([[8, 24], [13, 13], [25, 8], [35, 11], [39, 20], [35, 30], [23, 34], [12, 31]], true, 3), p.rnd, 0.5, 4)
    const tail: Pt[] = [[11, 25], [1, 32], [3, 36], [14, 31]], beak: Pt[] = [[37.5, 14.5], [45, 18], [37.5, 21]]
    halo(p, body, 3, 0); bare(p, offset(tail, () => 2.2)); bare(p, offset(beak, () => 2))
    fill(p.key, tail); fill(p.key, beak)
    shape(p, body, null, 1.5, 3.5)
    fill(p.key, curve([[23, 9], [31, 8], [37, 12], [34, 15], [27, 13]], true, 3))
    fill(p.key, curve([[34, 21], [38, 22], [35, 27], [31, 25]], true, 3))
    const wing = curve([[12, 19], [23, 16], [29, 23], [20, 29]], true, 3)
    fill(p.key, wing)
    within(p.key, wing, () => { cut(p.key, gouge(15, 20, 0.5, 11, 2.2)); cut(p.key, gouge(15, 24, 0.4, 9, 2)) })
    fill(p.key, oval(33, 17.5, 1.7, 1.7, 0, 1.5))
  })
  draw(p, [[21, 33], [20.5, 37], [20, 41]], 1.8, 0.6)
  draw(p, [[27, 33], [27.5, 37], [28, 41]], 1.8, 0.6)
}
