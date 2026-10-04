import { bare, carve, curve, cut, draw, fill, gouge, halo, moved, offset, oval, posed, ribbon, rough, shape, slab, stroke, turned, weight, within, type Print, type Pt } from './lookCut'

// The things on and around the bench, each printed once into its own sprite:
// the peel, the dough, the flour sack, the water jug, the bubbly jar, the seed
// dish, a baked loaf, the fire, the oven door and a sparrow. Each paints in
// reference units from its box's top left corner.

/** Where the middle of the peel's blade lies in its box, and how far the peel is turned so its handle points down and right. */
export const BLADE = { x: 212, y: 136, turn: 0.157 }

/** The peel: one plain blue board with a carved rim. It carries the working object, so it stays nearly bare of marks. */
export function paintPeel(p: Print): void {
  const { rnd } = p, { x, y, turn } = BLADE
  const outline = curve([[-190, 0], [-184, -70], [-150, -96], [0, -98], [150, -96], [182, -70], [190, -28], [215, -21], [300, -19], [418, -17], [432, 0], [418, 17], [300, 19], [215, 21], [190, 28], [182, 70], [150, 96], [0, 98], [-150, 96], [-184, 70]], true, 6)
  const board = rough(turned(moved(outline, x, y), turn, x, y), rnd, 1.1, 5)
  halo(p, board, 6.5, 0.12)
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

/** The flour sack: slumped on its two corners, its top rolled down, a heap of flour standing in its mouth. */
export function paintSack(p: Print): void {
  const { rnd } = p
  const body = rough(curve([[10, 240], [10, 240], [18, 200], [14, 152], [24, 118], [36, 102], [90, 96], [146, 98], [158, 116], [168, 152], [164, 200], [174, 240], [174, 240], [92, 234]]), rnd, 1.3, 5)
  const heap = rough(curve([[38, 106], [52, 72], [86, 52], [120, 68], [142, 104], [90, 118]]), rnd, 0.9, 4)
  const roll = curve([[24, 104], [56, 121], [96, 126], [130, 120], [158, 100]], false)
  const cuff = ribbon(roll, () => 18)
  halo(p, body, 6, 0.08); halo(p, heap, 5, 0); halo(p, cuff, 5, 0)
  shape(p, body, null, 2.5, 8)
  within(p.red, body, () => {
    fill(p.red, ribbon(curve([[4, 182], [60, 197], [120, 196], [178, 180]], false), () => 14))
    fill(p.red, ribbon(curve([[4, 205], [60, 219], [120, 218], [178, 203]], false), () => 5))
  })
  fill(p.key, oval(90, 103, 58, 13, -0.03, 4))
  shape(p, heap, null, 1.6, 3.5)
  shape(p, cuff, null, 2, 5)
  // The twist of the rolled cloth, and the gathers that hang from it.
  for (let i = 3; i < roll.length - 3; i += 4) draw(p, [[roll[i][0] - 3, roll[i][1] - 7], [roll[i][0] + 4, roll[i][1] + 7]], 2, 0.3)
  for (const fold of [[[46, 132], [41, 150], [45, 166]], [[82, 139], [80, 156], [85, 170]], [[118, 136], [124, 152], [121, 166]], [[146, 124], [154, 142], [152, 158]], [[26, 222], [40, 228], [58, 224]], [[122, 228], [144, 226], [158, 216]]] as Pt[][]) draw(p, curve(fold, false), 3, 0.05)
  // The side turned from the room, hatched.
  within(p.key, body, () => { for (let y = 128; y < 172; y += 9) fill(p.key, gouge(170, y, 2.5, 18 + rnd() * 8, 3.4)) })
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

/** A small bubble: a ring of the key block round bare paper. */
function bubble(p: Print, x: number, y: number, r: number): void {
  shape(p, rough(oval(x, y, r, r * 0.94, 0, 2.5), p.rnd, r * 0.06, 3), null, 1.3, 2.6)
}

/** The bubbly jar: a squat pot with a blue band, and a froth of bubbles domed over its rim, so it looks alive. */
export function paintJar(p: Print): void {
  const { rnd } = p
  const body = rough(curve([[19, 106], [9, 90], [8, 68], [15, 53], [25, 47], [67, 47], [77, 53], [84, 68], [83, 90], [73, 106], [46, 108]]), rnd, 0.9, 5)
  const rim = ribbon(curve([[19, 45], [46, 48], [73, 45]], false), () => 10)
  const froth = [[30, 37, 8.5], [62, 37, 8.5], [46, 33, 10.5], [37, 24, 7.5], [56, 23, 8], [46, 14, 6.5]]
  halo(p, body, 5.5, 0.06); halo(p, rim, 4.5, 0)
  for (const [x, y, r] of froth) bare(p, oval(x, y, r + 4.5, r + 4.5, 0, 3))
  for (const [x, y, r] of [[22, 20, 3.6], [70, 17, 3.2], [60, 6, 2.6]]) bare(p, oval(x, y, r + 3, r + 3, 0, 3))
  shape(p, body, null, 2.4, 7)
  within(p.blue, body, () => fill(p.blue, ribbon(curve([[2, 76], [46, 84], [90, 76]], false), () => 28)))
  // Bubbles rising through it: specks of bare paper in the band.
  for (const [x, y, r] of [[26, 82, 3], [38, 74, 2.2], [52, 86, 3.4], [61, 75, 2.4], [70, 84, 2.8], [44, 92, 2]]) cut(p.blue, oval(x, y, r, r, 0, 2))
  draw(p, curve([[66, 98], [75, 90], [77, 76]], false), 2.6, 0.05)
  for (const [x, y, r] of froth) bubble(p, x, y, r)
  shape(p, rim, null, 2, 4.5)
  for (const [x, y, r] of [[22, 20, 3.6], [70, 17, 3.2], [60, 6, 2.6]]) bubble(p, x, y, r)
}

/** The seed dish: a shallow bowl with a blue line round it and a heap of seeds. */
export function paintDish(p: Print): void {
  const { rnd } = p
  const bowl = rough(curve([[6, 37], [6, 37], [14, 54], [32, 66], [45, 70], [71, 70], [84, 66], [102, 54], [110, 37], [110, 37], [58, 45]]), rnd, 0.9, 5)
  const heap = rough(curve([[18, 42], [30, 24], [56, 11], [84, 22], [98, 42], [58, 50]]), rnd, 0.8, 4)
  const foot = rough(slab(42, 68, 32, 7, 8), rnd, 0.5)
  halo(p, bowl, 5.5, 0.06); halo(p, heap, 5, 0); halo(p, foot, 3.5, 0)
  shape(p, foot, null, 1.5, 3.5)
  shape(p, heap, null, 1.8, 3.5)
  // The seeds: small dark grains lying every way, cut off where the bowl's lip hides them.
  within(p.key, heap, () => {
    for (let i = 0; i < 27; i++) {
      const a = rnd() * Math.PI, d = Math.sqrt(rnd())
      fill(p.key, oval(58 + Math.cos(a) * 35 * d, 43 - Math.sin(a) * 28 * d, 4.4, 2.3, rnd() * Math.PI, 1.5))
    }
  })
  shape(p, bowl, null, 2.4, 7)
  within(p.blue, bowl, () => fill(p.blue, ribbon(curve([[2, 50], [58, 59], [114, 50]], false), () => 6)))
  draw(p, curve([[86, 60], [96, 54], [101, 46]], false), 2.4, 0.05)
  for (const [x, y, turn] of [[8, 70, 0.4], [20, 74, 2.1], [100, 72, 1.2]]) bare(p, oval(x, y, 3.8, 2.1, turn, 1.5))
}

/** The oven mouth in its box: the arch the door fills, `inset` units inside the opening. */
function plate(inset: number): Pt[] {
  const r = 105 - inset, pts: Pt[] = [[105 - r, 205]]
  for (let i = 0; i <= 28; i++) { const a = Math.PI + (i / 28) * Math.PI; pts.push([105 + Math.cos(a) * r, 105 + Math.sin(a) * r]) }
  pts.push([105 + r, 205])
  return pts
}

/**
 * The oven's iron door, shut: a dark arched plate over the mouth, rivets round its edge, a handle, and a small
 * round window with the bake glowing in it. Gold lies under the whole plate, so what is carved into it shows
 * warm, like the mortar round the mouth. Clear outside the arch.
 */
export function paintDoor(p: Print): void {
  const { rnd } = p, door = rough(plate(5), rnd, 0.9, 5), eye = { x: 105, y: 90, r: 32 }
  fill(p.base, door); fill(p.gold, door); fill(p.key, door)
  carve(p, ['key'], rough(plate(24), rnd, 0.8, 5).slice(1, -1), 3, 0.4)
  const studs = plate(14)
  for (let i = 1; i < studs.length - 1; i += 2) cut(p.key, oval(studs[i][0], studs[i][1], 3.4, 3.2, 0, 2))
  for (const y of [186, 160]) for (const x of [19, 191]) cut(p.key, oval(x, y, 3.4, 3.2, 0, 2))
  // Two strap hinges on the left, each a carved bar ending in a stud.
  for (const y of [128, 176]) {
    carve(p, ['key'], stroke(rnd, 30, y, 74, y + 1, 1), 5, 0.5)
    cut(p.key, oval(80, y + 1, 4, 3.8, 0, 2))
  }
  // The window: a ring of bare paper, and inside it gold with a red heart, behind a grille of three upright bars.
  // Nothing crosses in it: two bars that crossed read as a sign.
  const ring = oval(eye.x, eye.y, eye.r + 5, eye.r + 5, 0, 4), glass = rough(oval(eye.x, eye.y, eye.r, eye.r, 0, 4), rnd, 0.6, 5)
  cut(p.gold, ring); cut(p.key, ring)
  fill(p.key, oval(eye.x, eye.y, eye.r + 1.6, eye.r + 1.6, 0, 4))
  fill(p.gold, glass); cut(p.key, glass)
  within(p.red, glass, () => fill(p.red, rough(curve([[eye.x - 22, eye.y + 30], [eye.x - 15, eye.y + 4], [eye.x - 4, eye.y + 12], [eye.x + 3, eye.y - 10], [eye.x + 11, eye.y + 9], [eye.x + 19, eye.y + 2], [eye.x + 24, eye.y + 30]]), rnd, 0.6, 4)))
  for (const dx of [-13, 0, 13]) { const reach = Math.sqrt(eye.r * eye.r - dx * dx); draw(p, stroke(rnd, eye.x + dx, eye.y - reach, eye.x + dx + 0.6, eye.y + reach, 0.8), 3.2, 0.8) }
  // The handle: a bar of bare iron standing off the plate on two feet.
  const grip = rough(slab(126, 150, 56, 13, 8), rnd, 0.7)
  bare(p, offset(grip, () => 3.5))
  for (const x of [132, 176]) fill(p.key, oval(x, 156.5, 7.5, 9, 0, 3))
  shape(p, grip, null, 2, 5)
}

/** A baked loaf: the one gold thing on the wall, scored three times. */
export function paintLoaf(p: Print): void {
  const loaf = rough(curve([[7, 46], [9, 28], [21, 14], [35, 9], [49, 14], [61, 28], [63, 46], [35, 51]]), p.rnd, 0.7, 4)
  halo(p, loaf, 4, 0)
  shape(p, loaf, 'gold', 2.5, 6.5)
  for (const [x, y] of [[17, 25], [30, 19], [43, 20]]) cut(p.gold, gouge(x, y, 1, 14, 4.4, 1))
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

/** A sparrow on the fence: a pale round bird with a dark cap, wing and tail. `peck` bends it over. */
export function paintSparrow(p: Print, peck: boolean): void {
  posed(p, 26, 34, peck ? 0.5 : 0, 1, () => {
    const body = rough(curve([[10, 30], [14, 16], [26, 9], [38, 11], [44, 20], [41, 32], [30, 39], [17, 38]], true, 3), p.rnd, 0.5, 4)
    const tail: Pt[] = [[14, 29], [2, 36], [4, 41], [18, 36]], beak: Pt[] = [[42.5, 15.5], [51, 20], [42.5, 24]]
    halo(p, body, 3.5, 0); bare(p, offset(tail, () => 2.5)); bare(p, offset(beak, () => 2.2))
    fill(p.key, tail); fill(p.key, beak)
    shape(p, body, null, 1.6, 3.6)
    fill(p.key, curve([[25, 10], [35, 9], [42, 15], [33, 15]], true, 3))
    const wing = curve([[13, 24], [26, 20], [33, 28], [23, 35]], true, 3)
    fill(p.key, wing)
    within(p.key, wing, () => cut(p.key, gouge(16, 26, 0.3, 13, 2.6)))
    fill(p.key, oval(37, 19.5, 2.2, 2.2, 0, 1.5))
  })
  draw(p, [[24, 38], [23.5, 42], [23, 47]], 2, 0.6)
  draw(p, [[31, 38], [31.5, 42], [32, 47]], 2, 0.6)
}
