import { bare, carve, cut, draw, fill, gouge, oval, ribbon, rough, shape, slab, stroke, within, type Print, type Pt } from './lookCut'
import { BENCH, RACK_STEP, SPOTS, type View } from './lookLayout'

// The bakery itself, printed once per resize as one sheet: the night-blue wall
// cleared out of the key block stroke by stroke, the wide hatch onto the lane
// with the rack above it, the deep window with its cold sill, the brick oven
// with its warm nook, and the bench. Customers, breads and tools are not here:
// the game lays them over the room. All in reference units; `view` says how far the block runs.

const [HX, HY, HW, HH] = SPOTS.hatch
const [NX, NY, NW, NH] = SPOTS.nook
const [MX, MY, MW] = SPOTS.mouth
/** The oven's left face, its shoulder, and the chimney that runs up off the block. */
const OVEN = { x: 862, top: 112, flue0: 938, flue1: 1086 }
const ARCH = { cx: MX + MW / 2, half: MW / 2, spring: MY + MW / 2 }
const RACK = { x: SPOTS.loaf[0] + 3, y: SPOTS.loaf[1] + SPOTS.loaf[3], w: RACK_STEP * 4 }
/** The panes of the window, and the slab of its sill: the foot of the `sill` place the peel rests on. */
const WINDOW = { x: 576, y: 68, w: 132, h: 104 }
const SILL = { x: SPOTS.sill[0] - 6, y: SPOTS.sill[1] + SPOTS.sill[3] - 20, w: SPOTS.sill[2] + 12, h: 20 }
/** How deep the band of cobbles along the foot of the hatch is. */
const LANE = 50

const inOven = (x: number, y: number) => x > OVEN.x - 4 && (y > OVEN.top - 4 || (x > OVEN.flue0 - 4 && x < OVEN.flue1 + 4))

/** What the carver left standing on the wall: the oven and the dark beside it. */
function standing(x: number, y: number, v: View): boolean {
  if (inOven(x, y) || y < v.y0 + 30 || x < v.x0 + 12 || x > v.x1 - 12) return true
  return x > OVEN.x - 18 && y > OVEN.top + 20
}

/** The wall: the key block cleared in rows of broad strokes, so night blue shows and small dark nibs stay between them. */
function wall(p: Print, v: View): void {
  const { rnd } = p
  for (let y = v.y0 + 38; y < BENCH - 6; y += 15) {
    let x = v.x0 + 10 + rnd() * 40
    while (x < v.x1 - 20) {
      const want = 70 + rnd() * 150
      let reach = 0
      while (reach < want && !standing(x + reach + 10, y, v)) reach += 10
      // The carver worked from both sides, so round starts and pointed ends fall on either edge.
      const back = rnd() < 0.5
      if (reach >= 30 && !standing(x, y, v)) cut(p.key, gouge(back ? x + reach : x, y + (rnd() - 0.5) * 3, (back ? Math.PI : 0) + (rnd() - 0.5) * 0.05, reach, 20 + rnd() * 7, (rnd() - 0.5) * 5, 0.3))
      x += Math.max(24, reach * (0.9 + rnd() * 0.07))
    }
  }
}

/** The bench: the block left dark, a few long grain lines, and its back edge carved through to paper. */
function bench(p: Print, v: View): void {
  const { rnd } = p
  // The fire's glow on the bench: gold lies under the block in front of the oven mouth, so the grain carved there shows warm.
  const glow = oval(ARCH.cx - 10, BENCH + 6, 190, 74)
  const top = slab(v.x0, BENCH + 3, v.x1 - v.x0, 90, 40)
  within(p.blue, top, () => cut(p.blue, glow))
  within(p.gold, top, () => fill(p.gold, glow))
  for (let i = 0; i < 9; i++) {
    const x = ARCH.cx - 150 + rnd() * 230, y = BENCH + 12 + rnd() * 52
    carve(p, ['key'], stroke(rnd, x, y, x + 30 + rnd() * 70, y + (rnd() - 0.5) * 3, 1.5), 2 + rnd() * 1.6, 0.1)
  }
  for (let y = BENCH + 26; y < v.y1 - 10; y += 22 + rnd() * 20) {
    for (let x = v.x0 + rnd() * 160; x < v.x1 - 80; x += 60 + rnd() * 260) {
      const length = Math.min(120 + rnd() * 240, v.x1 - 14 - x)
      carve(p, ['key'], stroke(rnd, x, y, x + length, y + (rnd() - 0.5) * 5, 2), 1.5 + rnd() * 1.4, 0.1)
      x += length
    }
  }
  for (let x = v.x0 + 6; x < v.x1 - 30;) {
    const length = Math.min(90 + rnd() * 200, v.x1 - 8 - x)
    carve(p, ['key', 'blue'], stroke(rnd, x, BENCH, x + length, BENCH + (rnd() - 0.5) * 2, 1.2), 3.4 + rnd() * 2.2, 0.15)
    x += length + 5 + rnd() * 12
  }
}

/** A small star: gold where the blue is cut away. */
function star(p: Print, x: number, y: number, r: number): void {
  const pts: Pt[] = []
  // Five points, so that no star reads as two bars crossed.
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2 + 0.2, d = i % 2 ? r * 0.46 : r * 1.1; pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d]) }
  cut(p.blue, pts); cut(p.key, pts); fill(p.gold, pts)
}

/** Night sky: thin strokes carved out of the blue, lying level like wind. */
function sky(p: Print, x: number, y: number, w: number, h: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const length = 24 + p.rnd() * 60, sx = x + 6 + p.rnd() * Math.max(1, w - length - 12)
    cut(p.blue, gouge(sx, y + 8 + p.rnd() * (h - 16), (p.rnd() - 0.5) * 0.06, length, 2.2 + p.rnd() * 2))
  }
}

/** The hatch: a wide timber frame onto the lane, with a low line of roofs far back, pale cobbles for the queue to stand on, and the ledge. Whoever waits there is laid over it by the game. */
function hatch(p: Print): void {
  const { rnd } = p, post = 17, ledge = HY + HH, ground = ledge - LANE
  shape(p, rough(slab(HX - post, HY - post, HW + post * 2, HH + post, 12), rnd, 1.4), null, 2, 5)
  const opening = rough(slab(HX, HY, HW, HH + 4, 12), rnd, 1.2)
  shape(p, opening, 'blue', 3, 3)
  sky(p, HX, HY, HW, 96, 15)
  for (const [x, y, r] of [[40, 26, 6], [112, 62, 4.5], [186, 24, 5.5], [250, 72, 4.5], [322, 32, 6], [392, 66, 4.5], [440, 24, 5]]) star(p, HX + x, HY + y, r)
  // Roofs far down the lane: one dark line, kept low so that heads stand clear against the sky.
  const roofs: Pt[] = [[HX, ground + 6]], ridges: Pt[][] = []
  for (let x = HX; x < HX + HW;) {
    const w = 52 + rnd() * 44, eave = ground - 58 + rnd() * 22
    if (rnd() < 0.62) {
      const peak: Pt = [x + w / 2, eave - 20 - rnd() * 14]
      roofs.push([x, eave], peak, [x + w, eave])
      ridges.push([[x + 3, eave - 1], [peak[0] - 1, peak[1] + 2]])
    } else {
      const flue = x + w * (0.25 + rnd() * 0.4)
      roofs.push([x, eave], [flue, eave], [flue, eave - 15], [flue + 11, eave - 15], [flue + 11, eave], [x + w, eave])
    }
    x += w
  }
  roofs.push([HX + HW + 60, ground + 6])
  within(p.key, opening, () => fill(p.key, rough(roofs, rnd, 1, 2)))
  for (const [a, b] of ridges) if (b[0] < HX + HW - 4) carve(p, ['key', 'blue'], stroke(rnd, a[0], a[1], b[0], b[1], 1), 2.4)
  for (const x of [HX + 70, HX + 236, HX + 388]) { const pane = rough(slab(x, ground - 30, 9, 11, 5), rnd, 0.6); cut(p.key, pane); cut(p.blue, pane); fill(p.gold, pane) }
  // The lane: courses of pale setts with night blue between them, larger toward the hatch. Squared stones, so a
  // round bird or a round belly standing on them is not one more of them.
  cut(p.key, slab(HX + 3, ground, HW - 6, LANE + 2, 30))
  for (const [y, w, h] of [[ground + 3, 15, 8], [ground + 16, 20, 11], [ground + 32, 26, 15]]) {
    for (let x = HX - rnd() * w; x < HX + HW; x += w + 5) {
      const sett = rough(slab(x + (rnd() - 0.5) * 2, y + (rnd() - 0.5) * 1.5, w * (0.88 + rnd() * 0.16), h, 5), rnd, 0.9, 3)
      within(p.blue, opening, () => cut(p.blue, sett))
    }
  }
  shape(p, rough(slab(HX - post - 8, ledge, HW + post * 2 + 10, 22, 12), rnd, 1.2), null, 2, 6)
  for (let i = 0; i < 12; i++) { const x = HX + rnd() * HW, y = ledge + 6 + rnd() * 10; draw(p, stroke(rnd, x, y, x + 14 + rnd() * 30, y + 1, 1), 1.6, 0.1) }
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? HX - post + 5 + rnd() * 6 : HX + HW + 5 + rnd() * 6, y = HY + rnd() * (HH - 40)
    draw(p, stroke(rnd, side, y, side + (rnd() - 0.5) * 2, y + 14 + rnd() * 26, 1), 1.6, 0.1)
  }
}

/** The window above the badger, set deep in the wall: moon, stars and frost in the panes, and short icicles off the cold sill. */
function window(p: Print): void {
  const { rnd } = p, { x, y, w, h } = WINDOW, deep = 20
  shape(p, rough(slab(x - deep, y - deep, w + deep * 2, h + deep + 6, 12), rnd, 1.3), null, 2, 5)
  // The thickness of the wall: hatching on the two faces turned away from the room.
  for (let ty = y - deep + 8; ty < y + h; ty += 9) draw(p, [[x - deep + 4, ty + 7], [x - 3, ty - 2]], 2 + rnd() * 1.2, 0.2)
  for (let tx = x + 4; tx < x + w + deep - 8; tx += 10) draw(p, [[tx - 5, y - 3], [tx + 6, y - deep + 4]], 2 + rnd() * 1.2, 0.2)
  shape(p, rough(slab(x, y, w, h, 12), rnd, 1.1), 'blue', 3, 3)
  sky(p, x, y, w, h * 0.6, 6)
  const moon = oval(x + w - 34, y + 30, 16, 16, 0, 4), bite = oval(x + w - 42, y + 24, 13.5, 13.5, 0, 4)
  cut(p.blue, moon); fill(p.gold, moon); fill(p.blue, bite); cut(p.gold, bite)
  star(p, x + 26, y + 24, 5.5); star(p, x + 44, y + 72, 4.5); star(p, x + w - 26, y + 76, 5)
  // Frost creeping up from the corners of the lower panes.
  for (const corner of [x + 3, x + w / 2 + 4]) {
    for (let i = 0; i < 7; i++) cut(p.blue, gouge(corner + rnd() * 5, y + h - 3, -1.5 + i * 0.22 + rnd() * 0.1, 12 + rnd() * 15, 3.2))
  }
  // One upright bar and no cross bar: two tall panes, and nothing that crosses in the middle to read as a sign.
  draw(p, stroke(rnd, x + w / 2, y, x + w / 2 + 1, y + h, 1), 6.5, 0.7)
  shape(p, rough(slab(SILL.x, SILL.y, SILL.w, SILL.h, 12), rnd, 1.2), null, 2, 6)
  // Icicles, kept short: the badger's cap is just below.
  for (let ix = SILL.x + 8; ix < SILL.x + SILL.w - 6; ix += 9 + rnd() * 12) {
    const drop = 4 + rnd() * 7
    bare(p, [[ix - 3, SILL.y + SILL.h - 2], [ix + 3, SILL.y + SILL.h - 2], [ix + (rnd() - 0.5) * 2, SILL.y + SILL.h + drop]])
  }
  // Frost on the wall beside the sill, as ferns: a leaning stem with nicks branching off it to either side, none crossing it.
  for (const [cx, cy, lean] of [[SILL.x - 16, SILL.y + 12, -1.9], [SILL.x + SILL.w + 14, SILL.y + 18, -1.2], [SILL.x + SILL.w + 22, SILL.y - 14, -1.45]]) {
    const ux = Math.cos(lean), uy = Math.sin(lean)
    bare(p, gouge(cx, cy, lean, 24, 2.6))
    for (let i = 1; i <= 3; i++) for (const side of [-1, 1]) {
      const at = i * 6 - (side < 0 ? 2 : 0)
      bare(p, gouge(cx + ux * at, cy + uy * at, lean + side * 0.85, 9 - i * 1.6, 2))
    }
  }
}

/** The rack above the hatch: a shelf on two brackets, a back rail and five pegs that make four places. The breads on it are the game's. */
function rack(p: Print): void {
  const { rnd } = p, { x, y, w } = RACK
  bare(p, ribbon(stroke(rnd, x - 2, y - 40, x + w + 2, y - 40, 1), () => 5.5))
  for (let i = 0; i <= 4; i++) {
    const px = x + i * RACK_STEP
    bare(p, rough(slab(px - 2.5, y - 46, 5, 47, 8), rnd, 0.6))
    bare(p, oval(px, y - 48, 4.5, 4.2, 0, 3))
  }
  // Iron brackets, dark against the hatch's pale lintel.
  for (const bx of [x + 22, x + w - 48]) {
    fill(p.key, rough([[bx, y + 12], [bx + 27, y + 12], [bx + 6, y + 33], [bx, y + 31]], rnd, 0.6, 2))
    cut(p.key, gouge(bx + 5, y + 18, 0.75, 9, 2.6))
  }
  shape(p, rough(slab(x - 17, y, w + 20, 14, 11), rnd, 1.1), null, 2, 6)
  for (let i = 0; i < 5; i++) { const sx = x + rnd() * (w - 40); draw(p, stroke(rnd, sx, y + 6, sx + 16 + rnd() * 24, y + 7, 1), 1.5, 0.1) }
}

/** The arch of the oven mouth, `out` units outside the opening. */
function arch(out: number): Pt[] {
  const { cx, half, spring } = ARCH, r = half + out, pts: Pt[] = [[cx - r, BENCH]]
  for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; pts.push([cx + Math.cos(a) * r, spring + Math.sin(a) * r]) }
  pts.push([cx + r, BENCH])
  return pts
}

/** The oven: bricks drawn by their carved mortar, which shows gold near the fire and paper further off. */
function oven(p: Print, v: View): void {
  const { rnd } = p, right = v.x1 + 8, up = v.y0 - 8
  const body: Pt[] = [[OVEN.x, BENCH], [OVEN.x, OVEN.top], [OVEN.flue0, OVEN.top], [OVEN.flue0, up], [OVEN.flue1, up], [OVEN.flue1, OVEN.top], [right, OVEN.top], [right, BENCH]]
  cut(p.blue, body)
  fill(p.key, body)
  within(p.gold, body, () => { fill(p.gold, oval(ARCH.cx, ARCH.spring + 10, 178, 170)); fill(p.gold, slab(NX - 10, NY - 60, NW + 20, NH + 60)) })
  const open = arch(30), busy = (x: number, y: number) =>
    (x > NX - 12 && x < NX + NW + 12 && y > NY - 8 && y < NY + NH + 22) || (x > open[0][0] && x < open[open.length - 1][0] && y > ARCH.spring - Math.sqrt(Math.max(0, (ARCH.half + 30) ** 2 - (x - ARCH.cx) ** 2)))
  // Courses, each carved in a few runs, and the joints between bricks, staggered row by row.
  for (let y = BENCH - 28, row = 0; y > up; y -= 29, row++) {
    const x0 = y < OVEN.top ? OVEN.flue0 + 3 : OVEN.x + 3, x1 = y < OVEN.top ? OVEN.flue1 - 3 : right
    for (let x = x0; x < x1 - 12;) {
      let reach = 0
      const want = 50 + rnd() * 110
      while (reach < want && x + reach < x1 && !busy(x + reach + 6, y)) reach += 6
      if (reach > 14 && !busy(x, y)) carve(p, ['key'], stroke(rnd, x, y + (rnd() - 0.5), x + reach, y + (rnd() - 0.5) * 2, 1.4), 2.6 + rnd() * 1.6, 0.2)
      x += reach + 7 + rnd() * 9
    }
    for (let x = x0 + (row % 2 ? 33 : 2) + rnd() * 4; x < x1 - 6; x += 62 + (rnd() - 0.5) * 6) {
      if (x > x0 + 8 && !busy(x, y + 14) && !busy(x, y + 4) && !busy(x, y + 25)) carve(p, ['key'], stroke(rnd, x, y + 4, x + (rnd() - 0.5) * 2, y + 25, 1), 2.4 + rnd() * 1.4, 0.3)
    }
  }
  carve(p, ['key', 'blue'], stroke(rnd, OVEN.x, OVEN.top + 2, OVEN.x + 1, BENCH - 4, 2), 5, 0.3)
  carve(p, ['key', 'blue'], stroke(rnd, OVEN.x, OVEN.top, OVEN.flue0, OVEN.top, 2), 4.5, 0.3)
  carve(p, ['key', 'blue'], stroke(rnd, OVEN.flue1, OVEN.top, right, OVEN.top, 2), 4.5, 0.3)
  // The mouth: two carved rings and the joints of the arch stones between them.
  carve(p, ['key'], rough(arch(3), rnd, 1), 5.5, 0.5)
  carve(p, ['key'], rough(arch(29), rnd, 1.2), 3.8, 0.4)
  for (let i = 1; i < 12; i++) {
    const a = Math.PI + (i / 12) * Math.PI, c = Math.cos(a), s = Math.sin(a), { cx, half, spring } = ARCH
    carve(p, ['key'], [[cx + c * (half + 7), spring + s * (half + 7)], [cx + c * (half + 26), spring + s * (half + 26)]], 3.4, 0.5)
  }
  for (let y = ARCH.spring + 24; y < BENCH - 10; y += 27) {
    for (const side of [-1, 1]) carve(p, ['key'], [[ARCH.cx + side * (ARCH.half + 7), y], [ARCH.cx + side * (ARCH.half + 26), y + (rnd() - 0.5) * 2]], 3.2, 0.5)
  }
  // The warm nook: a dark recess with a pale ledge, and heat rising in carved waves.
  const niche = (grow: number): Pt[] => slab(NX - grow, NY - grow, NW + grow * 2, NH + grow + 4, 10).map(([x, y]): Pt => [x, y < NY ? y - 13 * Math.sin((Math.PI * (x - NX + grow)) / (NW + grow * 2)) : y])
  cut(p.key, rough(niche(5), rnd, 1.2))
  fill(p.key, rough(niche(0), rnd, 1))
  for (const [hx, lift, phase] of [[NX + 44, 88, 0], [NX + 96, 100, 2], [NX + 148, 84, 4]]) {
    const line: Pt[] = []
    for (let i = 0; i <= 14; i++) { const t = i / 14; line.push([hx + Math.sin(t * 8.5 + phase) * 9, NY + NH - 8 - t * lift]) }
    carve(p, ['key'], line, 6.5, 0.12)
  }
  shape(p, rough(slab(NX - 16, NY + NH, NW + 32, 17, 12), rnd, 1.2), null, 2, 6)
}

export function paintRoom(p: Print, v: View): void {
  const block = rough(slab(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0, 16), p.rnd, 1.7, 4)
  fill(p.blue, block)
  fill(p.key, block)
  wall(p, v)
  // Chatter: stray nicks in the dark band the carver left along the top.
  for (let x = v.x0 + 30; x < OVEN.x - 40; x += 40 + p.rnd() * 90) cut(p.key, gouge(x, v.y0 + 9 + p.rnd() * 14, (p.rnd() - 0.5) * 0.5, 8 + p.rnd() * 14, 2.6))
  bench(p, v)
  hatch(p)
  window(p)
  rack(p)
  oven(p, v)
  // The block's own edge, trimmed last, so nothing carved or inked runs past it.
  const trim = (g: CanvasRenderingContext2D) => { g.globalCompositeOperation = 'destination-in'; fill(g, block); g.globalCompositeOperation = 'source-over' }
  trim(p.blue); trim(p.gold); trim(p.red); trim(p.key)
  // A few specks of ink the block left in the margin.
  for (let i = 0; i < 12; i++) {
    const along = p.rnd(), out = 3 + p.rnd() * 9, r = 0.6 + p.rnd() * 1.1
    const [x, y] = i % 2 ? [v.x0 + along * (v.x1 - v.x0), i % 4 === 1 ? v.y0 - out : v.y1 + out] : [i % 4 ? v.x1 + out : v.x0 - out, v.y0 + along * (v.y1 - v.y0)]
    fill(p.key, oval(x, y, r, r * 0.7, along * 3, 1.5))
  }
}
