import { bare, carve, cut, draw, fill, gouge, oval, ribbon, rough, shape, slab, stroke, within, type Print, type Pt } from './lookCut'
import { BENCH, RACK_STEP, SPOTS, type View } from './lookLayout'

// The bakery itself, printed once per resize as one sheet: the night-blue wall
// cleared out of the key block stroke by stroke, the hatch onto the lane, the
// deep window with its cold sill, the rack, the brick oven with its warm nook,
// and the bench. All in reference units; `view` says how far the block runs.

const [HX, HY, HW, HH] = SPOTS.hatch
const [NX, NY, NW, NH] = SPOTS.nook
const [MX, MY, MW] = SPOTS.mouth
/** The oven's left face, its shoulder, and the chimney that runs up off the block. */
const OVEN = { x: 862, top: 112, flue0: 938, flue1: 1086 }
const ARCH = { cx: MX + MW / 2, half: MW / 2, spring: MY + MW / 2 }
const RACK = { x: SPOTS.loaf[0] + 6, y: SPOTS.loaf[1] + 56, w: RACK_STEP * 4 }
const WINDOW = { x: 410, y: 70, w: 140, h: 134 }

const inOven = (x: number, y: number) => x > OVEN.x - 4 && (y > OVEN.top - 4 || (x > OVEN.flue0 - 4 && x < OVEN.flue1 + 4))

/** What the carver left standing on the wall: the oven, and the dark under the shelf, under the sill and beside the oven. */
function standing(x: number, y: number, v: View): boolean {
  if (inOven(x, y) || y < v.y0 + 30 || x < v.x0 + 12 || x > v.x1 - 12) return true
  if (x > OVEN.x - 18 && y > OVEN.top + 20) return true
  if (y > RACK.y + 12 && y < RACK.y + 38 && x > RACK.x - 8 && x < RACK.x + RACK.w + 8) return true
  return y > 240 && y < 272 && x > 372 && x < 588
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
      if (reach >= 30 && !standing(x, y, v)) cut(p.key, gouge(x, y + (rnd() - 0.5) * 3, (rnd() - 0.5) * 0.05, reach, 20 + rnd() * 7, (rnd() - 0.5) * 5, 0.3))
      x += Math.max(24, reach * (0.9 + rnd() * 0.07))
    }
  }
}

/** The bench: the block left dark, a few long grain lines, and its back edge carved through to paper. */
function bench(p: Print, v: View): void {
  const { rnd } = p
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
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.3, d = i % 2 ? r * 0.42 : r; pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d]) }
  cut(p.blue, pts); cut(p.key, pts); fill(p.gold, pts)
}

/** Night sky: thin strokes carved out of the blue, lying level like wind. */
function sky(p: Print, x: number, y: number, w: number, h: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const length = 24 + p.rnd() * 60, sx = x + 6 + p.rnd() * Math.max(1, w - length - 12)
    cut(p.blue, gouge(sx, y + 8 + p.rnd() * (h - 16), (p.rnd() - 0.5) * 0.06, length, 2.2 + p.rnd() * 2))
  }
}

/** The hatch: a timber frame, the lane beyond it with roofs, a fence and stars, the ledge, and the shut lower half of the door. */
function hatch(p: Print): void {
  const { rnd } = p, post = 17, ledge = HY + HH
  shape(p, rough(slab(HX - post, HY - post, HW + post * 2, HH + post, 12), rnd, 1.4), null, 2, 5)
  shape(p, rough(slab(HX, HY, HW, HH + 4, 12), rnd, 1.2), 'blue', 3, 3)
  sky(p, HX, HY, HW, 130, 13)
  for (const [x, y, r] of [[92, 204, 6], [150, 190, 4.5], [214, 214, 5.5], [268, 188, 4.5], [330, 222, 6], [118, 258, 4]]) star(p, x, y, r)
  const roofs: Pt[] = [[HX, ledge], [HX, 346], [92, 314], [130, 346], [130, 358], [166, 358], [166, 328], [182, 328], [182, 350], [216, 320], [254, 354], [254, 366], [304, 366], [322, 342], [HX + HW, 354], [HX + HW, ledge]]
  fill(p.key, rough(roofs, rnd, 1, 2))
  for (const [ax, ay, bx, by] of [[60, 349, 91, 322], [94, 322, 126, 348], [186, 352, 215, 327], [218, 328, 250, 355]]) carve(p, ['key', 'blue'], stroke(rnd, ax, ay, bx, by, 1), 2.6)
  for (const [x, y] of [[84, 362], [226, 374]]) { const pane = rough(slab(x, y, 11, 13, 5), rnd, 0.6); cut(p.key, pane); cut(p.blue, pane); fill(p.gold, pane) }
  // The fence the sparrows wait on: a rail and its pales, bare paper against the dark roofs.
  bare(p, ribbon(stroke(rnd, HX, 398, HX + 190, 402, 1.5), () => 7))
  for (let x = HX + 8; x < HX + 180; x += 23) bare(p, rough(slab(x, 404, 9, ledge - 404, 8), rnd, 0.8))
  shape(p, rough(slab(HX - post - 8, ledge, HW + post * 2 + 16, 22, 12), rnd, 1.2), null, 2, 6)
  for (let i = 0; i < 9; i++) { const x = HX + rnd() * HW, y = ledge + 6 + rnd() * 10; draw(p, stroke(rnd, x, y, x + 14 + rnd() * 30, y + 1, 1), 1.6, 0.1) }
  for (let x = HX + 44; x < HX + HW; x += 46) carve(p, ['key'], stroke(rnd, x, ledge + 26, x + (rnd() - 0.5) * 3, BENCH - 6, 1.5), 2.4, 0.15)
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? HX - post + 5 + rnd() * 6 : HX + HW + 5 + rnd() * 6, y = HY + rnd() * (HH - 40)
    draw(p, stroke(rnd, side, y, side + (rnd() - 0.5) * 2, y + 14 + rnd() * 26, 1), 1.6, 0.1)
  }
}

/** The window, set deep in the wall: moon, stars and frost in the panes, and icicles off the cold sill. */
function window(p: Print): void {
  const { rnd } = p, { x, y, w, h } = WINDOW, deep = 22
  shape(p, rough(slab(x - deep, y - deep, w + deep * 2, h + deep + 6, 12), rnd, 1.3), null, 2, 5)
  // The thickness of the wall: hatching on the two faces turned away from the room.
  for (let ty = y - deep + 8; ty < y + h; ty += 9) draw(p, [[x - deep + 4, ty + 7], [x - 3, ty - 2]], 2 + rnd() * 1.2, 0.2)
  for (let tx = x + 4; tx < x + w + deep - 8; tx += 10) draw(p, [[tx - 5, y - 3], [tx + 6, y - deep + 4]], 2 + rnd() * 1.2, 0.2)
  shape(p, rough(slab(x, y, w, h, 12), rnd, 1.1), 'blue', 3, 3)
  sky(p, x, y, w, h * 0.6, 6)
  const moon = oval(x + 104, y + 36, 18, 18, 0, 4), bite = oval(x + 96, y + 30, 15, 15, 0, 4)
  cut(p.blue, moon); fill(p.gold, moon); fill(p.blue, bite); cut(p.gold, bite)
  star(p, x + 28, y + 30, 5.5); star(p, x + 50, y + 88, 4.5); star(p, x + 118, y + 96, 5)
  // Frost creeping up from the corners of the lower panes.
  for (const corner of [x + 3, x + w / 2 + 4]) {
    for (let i = 0; i < 7; i++) cut(p.blue, gouge(corner + rnd() * 5, y + h - 3, -1.5 + i * 0.22 + rnd() * 0.1, 13 + rnd() * 17, 3.2))
  }
  draw(p, stroke(rnd, x + w / 2, y, x + w / 2 + 1, y + h, 1), 6.5, 0.7)
  draw(p, stroke(rnd, x, y + h / 2 + 2, x + w, y + h / 2, 1), 5.5, 0.7)
  const sill = SPOTS.sill, top = sill[1] + sill[3]
  shape(p, rough(slab(sill[0], top, sill[2], 19, 12), rnd, 1.2), null, 2, 6)
  for (let ix = sill[0] + 8; ix < sill[0] + sill[2] - 6; ix += 9 + rnd() * 12) {
    const drop = 9 + rnd() * 24
    bare(p, [[ix - 3.5, top + 17], [ix + 3.5, top + 17], [ix + (rnd() - 0.5) * 3, top + 19 + drop]])
  }
  // Frost crystals on the wall beside the sill: three crossed nicks each.
  for (const [cx, cy] of [[sill[0] - 14, top - 8], [sill[0] + sill[2] + 12, top + 6], [sill[0] + sill[2] + 22, top - 24]]) {
    for (let i = 0; i < 3; i++) { const a = i * 1.05 + 0.2; bare(p, gouge(cx - Math.cos(a) * 8, cy - Math.sin(a) * 8, a, 16, 3)) }
  }
}

/** The rack: a shelf on two brackets, a back rail and five pegs that make four places. */
function rack(p: Print): void {
  const { rnd } = p, { x, y, w } = RACK
  bare(p, ribbon(stroke(rnd, x - 2, y - 40, x + w + 2, y - 40, 1), () => 5.5))
  for (let i = 0; i <= 4; i++) {
    const px = x + i * RACK_STEP
    bare(p, rough(slab(px - 3.5, y - 46, 7, 47, 8), rnd, 0.7))
    bare(p, oval(px, y - 48, 5.5, 5, 0, 3))
  }
  for (const bx of [x + 30, x + w - 54]) shape(p, rough([[bx, y + 12], [bx + 26, y + 12], [bx + 5, y + 36], [bx, y + 34]], rnd, 0.6, 2), null, 1.5, 3.5)
  shape(p, rough(slab(x - 14, y, w + 28, 15, 11), rnd, 1.1), null, 2, 6)
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
  cut(p.key, rough(slab(NX - 5, NY - 5, NW + 10, NH + 8, 10), rnd, 1.2))
  fill(p.key, rough(slab(NX, NY, NW, NH + 4, 10), rnd, 1))
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
  bench(p, v)
  hatch(p)
  window(p)
  rack(p)
  oven(p, v)
  // The block's own edge, trimmed last, so nothing carved or inked runs past it.
  const trim = (g: CanvasRenderingContext2D) => { g.globalCompositeOperation = 'destination-in'; fill(g, block); g.globalCompositeOperation = 'source-over' }
  trim(p.blue); trim(p.gold); trim(p.red); trim(p.key)
}
