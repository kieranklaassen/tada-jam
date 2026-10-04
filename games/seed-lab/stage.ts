// What the page is set with, and the marks of things in motion.
//
// The first half paints what is kept between frames: the plate and its boards,
// the pencil family lines, a visitor that left. The second half is what a
// frame in motion adds: a plant that bends, squashes or draws itself, a puff
// in pen and pencil, and gold dust on the beetle and the worm. journal.ts
// places all of it.

import { AT_REST, CREATURES, drawBody, drawLive, type CreatureKind } from './creatures'
import { ANTHER, INK, SCRAP, WASH, curve, dot, hash, hatch, pen, pencil, seedOf, tape, trace, wash, type Ctx, type Pt } from './ink'
import { PLANT, POTS_PER_ROW, stemHeight, type Layout, type PotPlace, type Rect } from './layout'
import type { PlantLive, Puff } from './live'
import { lookOf, type Look } from './plant'
import { paintSetting } from './setting'
import { drawPlant, drawPod, drawRunner } from './specimen'
import type { PageView, PlantView } from './spikePage'

/** The plate, the two boards, the border's ground, tape and a pressed leaf: everything that depends on the size alone. */
export function paintFurniture(ctx: Ctx, layout: Layout): void {
  const { k, shelf, tray, shelfBoard, trayBoard, borderStrip, border } = layout
  const first = shelf[0].cell, last = tray[POTS_PER_ROW - 1].cell, pad = 5 * k
  const plate: Rect = { x: first.x - pad, y: first.y - pad, w: last.x + last.w - first.x + pad * 2, h: last.y + last.h - first.y + pad * 2 }
  const edge: Pt[] = [[plate.x, plate.y + 1.5], [plate.x + plate.w - 1, plate.y], [plate.x + plate.w, plate.y + plate.h - 1.5], [plate.x + 1.5, plate.y + plate.h]]
  ctx.fillStyle = SCRAP
  trace(ctx, edge, true)
  ctx.fill()
  wash(ctx, edge, WASH.wood, { alpha: 0.07, rim: 0.16, seed: 3, loose: 0.6 })
  // The setting is painted across the page and the plate alike, under the plate's edge and everything set on the page.
  paintSetting(ctx, layout)
  pencil(ctx, [...edge, edge[0]], { seed: 4, w: 0.8, alpha: 0.4 })

  const plank: Pt[] = [[shelfBoard.x, shelfBoard.y], [shelfBoard.x + shelfBoard.w, shelfBoard.y], [shelfBoard.x + shelfBoard.w, shelfBoard.y + shelfBoard.h], [shelfBoard.x, shelfBoard.y + shelfBoard.h]]
  wash(ctx, plank, WASH.wood, { alpha: 0.7, seed: 5 })
  pen(ctx, [...plank, plank[0], plank[1]], { w: 1.3, seed: 6, taper: 0.01 })
  for (let i = 0; i < 3; i++) {
    const y = shelfBoard.y + shelfBoard.h * (0.3 + 0.22 * i), from = shelfBoard.x + shelfBoard.w * (0.05 + 0.3 * hash(7, i))
    pen(ctx, [[from, y], [from + shelfBoard.w * (0.25 + 0.3 * hash(8, i)), y + 0.6]], { w: 0.7, seed: 9 + i, taper: 0.4, alpha: 0.7 })
  }
  const lip = 9 * k, b = trayBoard
  const dish: Pt[] = [[b.x - 3, b.y - lip], [b.x + 2, b.y + b.h], [b.x + b.w - 2, b.y + b.h], [b.x + b.w + 3, b.y - lip], [b.x + b.w, b.y - lip], [b.x + b.w - 3.5, b.y], [b.x + 3.5, b.y], [b.x, b.y - lip]]
  wash(ctx, dish, WASH.zinc, { alpha: 0.9, seed: 12 })
  hatch(ctx, dish, { seed: 13, gap: 3.2, angle: 0.02, alpha: 0.4, w: 0.6 })
  pen(ctx, [...dish, dish[0], dish[1]], { w: 1.3, seed: 14, taper: 0.01 })

  const ground = border[0].ground, x0 = borderStrip.x + 4, x1 = borderStrip.x + borderStrip.w - 4
  const soil: Pt[] = [[x0, ground - 1], ...curve([[x0, ground - 1], [(x0 + x1) / 2, ground - 2.5], [x1, ground - 1]], false, 40), [x1, ground + 7], [x0, ground + 8]]
  wash(ctx, soil, WASH.wet, { alpha: 0.42, seed: 15, loose: 2.2 })
  hatch(ctx, soil, { seed: 16, gap: 4.5, angle: -0.9, alpha: 0.5, w: 0.7 })
  pen(ctx, curve([[x0, ground], [(x0 + x1) / 2, ground - 1.5], [x1, ground]], false, 30), { w: 1.3, seed: 17, taper: 0.04, wobble: 0.6 })

  const corners: [number, number, number][] = [[plate.x + 4, plate.y + 5, -0.78], [plate.x + plate.w - 4, plate.y + 5, 0.78], [plate.x + 4, plate.y + plate.h - 5, 0.78]]
  corners.forEach(([x, y, turn], i) => tape(ctx, x, y, 44 * k, turn, 20 + i, 15 * k))
}

/**
 * The pressed leaf, in its own measure, its stalk going under its strip of tape at the origin. It is a kept drawing of
 * its own, laid in the set where it lies and by itself while a touch makes it rustle (things.ts).
 */
export function paintLeaf(ctx: Ctx, u: number): void {
  ctx.save()
  ctx.scale(u, u)
  const half: Pt[] = [[0, 0], [10, -8], [22, -12], [20, -17], [34, -18], [34, -23], [48, -19], [52, -23], [62, -14], [78, -3]]
  const leaf = [...half, ...half.slice(0, -1).reverse().map(([x, y]) => [x + 1, -y * 0.9] as const)]
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = SCRAP
  trace(ctx, leaf, true)
  ctx.fill()
  wash(ctx, leaf, WASH.leaf, { alpha: 0.42, seed: 30 })
  wash(ctx, leaf, WASH.wood, { alpha: 0.3, seed: 31, loose: 2 })
  pen(ctx, leaf, { w: 1.1 / u, seed: 32, taper: 0 })
  pen(ctx, [[-14, 1], [76, -2]], { w: 1.1 / u, seed: 33, taper: 0.1 })
  for (let i = 0; i < 4; i++) for (const side of [-1, 1]) pen(ctx, [[12 + i * 14, 0], [22 + i * 14, side * (12 - i * 1.5)]], { w: 0.7 / u, seed: 34 + i, taper: 0.4 })
  tape(ctx, -6, 1, 30, 1.45, 40, 13)
  ctx.restore()
}

/** The pressed frond, likewise: its stalk goes under its strip of tape at the origin. */
export function paintFrond(ctx: Ctx, u: number): void {
  ctx.save()
  ctx.scale(u, u)
  for (let i = 1; i <= 11; i++) {
    for (const side of [-1, 1]) {
      const x = 4 + i * 7.6, a = side * (1.05 - i * 0.02), long = 17 * (1 - i / 14) * (0.85 + 0.3 * hash(44, i * side))
      const tip: Pt = [x + Math.cos(a) * long, Math.sin(a) * long], nx = -Math.sin(a) * 2.7, ny = Math.cos(a) * 2.7
      const blade = curve([[x, 0], [x + Math.cos(a) * long * 0.45 + nx, Math.sin(a) * long * 0.45 + ny], tip, [x + Math.cos(a) * long * 0.45 - nx, Math.sin(a) * long * 0.45 - ny]], true)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = SCRAP
      trace(ctx, blade, true)
      ctx.fill()
      wash(ctx, blade, WASH.leaf, { alpha: 0.45, seed: 45 + i, loose: 0.6 })
      wash(ctx, blade, WASH.wood, { alpha: 0.3, seed: 46 + i, rim: 0 })
      pen(ctx, blade, { w: 0.75 / u, seed: 47 + i * side, taper: 0 })
    }
  }
  pen(ctx, curve([[-12, 2], [30, -1], [64, 0], [94, 3]]), { w: 1.1 / u, seed: 48, taper: 0.12 })
  tape(ctx, -3, 1, 28, 1.4, 49, 12)
  ctx.restore()
}

/** Where a plant stands and how high, whichever row it is in. */
export function standing(plant: PlantView, layout: Layout): { x: number; y: number; k: number; look: Look; place: PotPlace | null } {
  const look = lookOf(plant.pairs, plant.dry)
  if (plant.row === 'border') return { x: layout.border[plant.slot].x, y: layout.border[plant.slot].ground, k: layout.small, look, place: null }
  const place = layout[plant.row][plant.slot]
  return { x: place.x, y: place.soil + layout.k, k: layout.k, look, place }
}

const NONE: ReadonlySet<number> = new Set()

/**
 * A family line with one end in the border. `low` is the plant that stands in the border and `high` the other,
 * which may stand in a pot or in the border too; which of them is the young does not matter to the line. From the
 * top of the small plant it rises into the gap under the tray, runs along it, and goes up to the foot of the other's
 * pot: straight up for a pot of the tray, and up the left edge of its slot, between two plants, for a pot of the shelf,
 * so that it comes to the parent from the left as the lines of young to its left do, and never from both sides at one height.
 * Two border plants are joined by a low run just over the border's tops.
 */
function borderLine(ctx: Ctx, layout: Layout, low: PlantView, high: PlantView, which: number, alpha: number, tree: Tree, toParent = false): void {
  const { strokes } = tree
  const { k } = layout, a = standing(low, layout), b = standing(high, layout)
  const topOf = (at: ReturnType<typeof standing>) => at.y - stemHeight(at.look.joints, at.k) - (PLANT.flower + 3) * at.k
  const side = (which ? 2.5 : -2.5) * k, seed = seedOf(low.id, high.id, which)
  if (!b.place) {
    if (a.place) return borderLine(ctx, layout, high, low, which, alpha, tree)
    // Two plants of the border: up from the one, along just over the border's tops, and down to the other. It is a
    // line like the rest, laid out with them, so that it hops what it would cross and is hopped in its turn.
    const top = Math.min(topOf(a), topOf(b)) - (5 + 3 * which) * k
    strokes.push({ pts: [[a.x + side, topOf(a)], [a.x + side, top], [b.x + side, top], [b.x + side, topOf(b)]], draw: (piece) => pencil(ctx, route(piece, 2 * k), { seed, w: 1, alpha }) })
    return
  }
  if (a.place) return
  const under = layout.tray[0].foot + PLANT.board * k, bar = borderBar(layout, high.id, which)
  const up: Pt[] = b.place.foot < layout.tray[0].cell.y + 1
    ? [[b.place.cell.x + 3 * k + side, bar], [b.place.cell.x + 3 * k + side, b.place.foot + PLANT.board * k + 5 * k], [b.x + side, b.place.foot + PLANT.board * k + 5 * k], [b.x + side, b.place.foot + PLANT.board * k]]
    : [[b.x + side, bar], [b.x + side, under]]
  strokes.push({ pts: [[a.x + side, topOf(a)], [a.x + side, bar], ...up], draw: (piece) => pencil(ctx, route(piece, 2 * k), { seed, w: 1.1, alpha }) })
  // Where the line of a young in the border reaches its parent in a pot, the parent is marked as it is for young in pots.
  if (toParent) markParent(ctx, tree, high.id, which, b.x + side + (which ? 7 : -7) * k, b.place.foot + PLANT.board * k + 3 * k, k)
}

/** The lines of the family tree as they are laid out, and the marks beside the parents they reach, each made once. */
type Tree = { strokes: Stroke[]; marks: (() => void)[]; marked: Set<string> }

/** Marks a parent in a pot, once for each parent and side: a small pod where it bore the pod, a pinch of dust where it gave the dust. */
function markParent(ctx: Ctx, tree: Tree, parent: number, which: number, x: number, y: number, k: number): void {
  const key = `${parent}:${which}`
  if (tree.marked.has(key)) return
  tree.marked.add(key)
  tree.marks.push(() => parentMark(ctx, x, y, which, k))
}

/** The height of the bar, in the gap under the tray, that carries the lines of border plants to one parent in a pot. */
function borderBar(layout: Layout, parent: number, which: number): number {
  return layout.tray[0].foot + PLANT.board * layout.k + (4 + 3.5 * which + 2 * hash(parent, 2)) * layout.k
}

/** One line of the family tree as its straight runs, and how a piece of it is drawn. Lines are laid out first and drawn together, so that each can hop the others. */
type Stroke = { pts: Pt[]; draw: (piece: Pt[]) => void }

/**
 * A line's pieces, broken wherever one of its upright runs would cross a level run of another line, with a small gap
 * left there: the line hops the bar, as a line of a family tree does, and no two strokes make a cross. A stub that
 * would be left shorter than the gap, at the start of a run or between two bars close together, is left out.
 */
function hopping(pts: readonly Pt[], bars: readonly { y: number; x1: number; x2: number }[], gap: number): Pt[][] {
  const out: Pt[][] = [[pts[0]]]
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i]
    if (Math.abs(a[0] - b[0]) < 0.5 && Math.abs(a[1] - b[1]) > 0.5) {
      const dir = Math.sign(b[1] - a[1]), lo = Math.min(a[1], b[1]), hi = Math.max(a[1], b[1])
      const crossed = bars.filter((bar) => bar.y > lo + 0.5 && bar.y < hi - 0.5 && a[0] > bar.x1 + 0.5 && a[0] < bar.x2 - 0.5).map((bar) => bar.y)
      for (const y of [...new Set(crossed)].sort((p, q) => (p - q) * dir)) {
        const piece = out[out.length - 1], last = piece[piece.length - 1], stop = y - dir * gap, start = y + dir * gap
        if ((stop - last[1]) * dir > 0.5) piece.push([a[0], stop])
        out.push([[a[0], (b[1] - start) * dir > 0 ? start : b[1]]])
      }
    }
    const piece = out[out.length - 1], last = piece[piece.length - 1]
    if (Math.abs(last[0] - b[0]) > 0.01 || Math.abs(last[1] - b[1]) > 0.01) piece.push(b)
  }
  return out.filter((piece) => piece.length > 1)
}

/** The level runs of a line, as bars another line's upright run may have to hop. */
function levels(pts: readonly Pt[]): { y: number; x1: number; x2: number }[] {
  const out: { y: number; x1: number; x2: number }[] = []
  for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i][1] - pts[i - 1][1]) < 0.5 && Math.abs(pts[i][0] - pts[i - 1][0]) > 0.5) out.push({ y: pts[i][1], x1: Math.min(pts[i][0], pts[i - 1][0]), x2: Math.max(pts[i][0], pts[i - 1][0]) })
  return out
}

/**
 * A path of straight runs with rounded corners, as points a few pixels apart for the pencil to break up. A curve
 * through corner points would swing wide wherever a short run meets a long one; this keeps to the runs and rounds
 * each corner inside a radius of `r`.
 */
function route(pts: readonly Pt[], r: number, gap = 3): Pt[] {
  const out: Pt[] = []
  const run = (from: Pt, to: Pt) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / gap))
    for (let step = 0; step < steps; step++) out.push([from[0] + ((to[0] - from[0]) * step) / steps, from[1] + ((to[1] - from[1]) * step) / steps])
  }
  let at = pts[0]
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1], [x, y] = pts[i], [nx, ny] = pts[i + 1]
    const before = Math.hypot(x - px, y - py), after = Math.hypot(nx - x, ny - y)
    if (before < 1e-3 || after < 1e-3) continue
    const cut = Math.min(r, before / 2, after / 2)
    const enter: Pt = [x - ((x - px) / before) * cut, y - ((y - py) / before) * cut], leave: Pt = [x + ((nx - x) / after) * cut, y + ((ny - y) / after) * cut]
    run(at, enter)
    for (let step = 0; step < 4; step++) {
      const t = step / 4, u = 1 - t
      out.push([u * u * enter[0] + 2 * u * t * x + t * t * leave[0], u * u * enter[1] + 2 * u * t * y + t * t * leave[1]])
    }
    at = leave
  }
  run(at, pts[pts.length - 1])
  out.push(pts[pts.length - 1])
  return out
}

/**
 * The pencil family lines, two from each young of a pod to its two parents, and each runner. They change only when
 * the page's plants do. A plant that is `away` (not grown yet, or off its place in a hop or a hand) has no line.
 * `seen` is handed every piece of every routed line as it is drawn, for the tests.
 */
export function paintFamily(ctx: Ctx, view: PageView, layout: Layout, away: ReadonlySet<number> = NONE, seen?: (piece: readonly Pt[]) => void): void {
  const { k } = layout, byId = new Map(view.plants.map((plant) => [plant.id, plant]))
  // With a plant in focus its own lines stand out and every other line steps back, so one family can be read on a full page.
  const focus = view.focus ?? null
  const strength = (young: number, parent: number, usual: number) => (focus === null ? usual : young === focus || parent === focus ? 0.85 : 0.16)
  const tree: Tree = { strokes: [], marks: [], marked: new Set<string>() }, { strokes, marks } = tree
  view.plants.forEach((young) => {
    const origin = young.origin, from = standing(young, layout), own = from.place
    if (away.has(young.id)) return
    if (!own) {
      // A young plant in the border: its lines are fainter, since eighteen small plants would otherwise rule the page.
      if (origin.kind === 'seed') [origin.onto, origin.dust].forEach((id, which) => {
        const parent = byId.get(id)
        if (parent && !away.has(id)) borderLine(ctx, layout, young, parent, which, strength(young.id, id, 0.34), tree, true)
      })
      // A copy that has gone to the border keeps its one line to its one parent, in pencil.
      if (origin.kind === 'runner') {
        const parent = byId.get(origin.from)
        if (parent && !away.has(origin.from)) borderLine(ctx, layout, young, parent, 0, strength(young.id, origin.from, 0.34), tree)
      }
      return
    }
    if (origin.kind === 'runner') {
      const parent = byId.get(origin.from), to = parent && standing(parent, layout)
      // A parent that has gone to the border is reached there by one pencil line.
      if (parent && to && !to.place && !away.has(origin.from)) return borderLine(ctx, layout, parent, young, 0, strength(young.id, origin.from, 0.55), tree)
      if (!to?.place || away.has(origin.from)) return
      // Between two neighbours on one board the runner sags from pot to pot. Any further and it is led round the plants in between: under its parent's board, along it, and in to the copy's pot from the side.
      const near = Math.abs(to.place.foot - own.foot) < 1 && Math.abs(to.x - from.x) < own.cell.w * 1.5
      if (near) {
        const [a, b] = to.x < from.x ? [to, from] : [from, to]
        drawRunner(ctx, [a.x, a.y], [b.x, b.y], PLANT.potH * k - 2, k)
        // Its sag between the two pots counts as a level run for the lines that come up between them: they hop it.
        const low = a.y + PLANT.potH * k - 7 * k, half = (PLANT.potW / 2) * k
        strokes.push({ pts: [[a.x + half, low], [b.x - half, low]], draw: () => {} })
      } else {
        const out = 24 * k, under = to.place.foot + PLANT.board * k + 4 * k, low = own.foot - 7 * k
        const side = from.x > to.x ? -1 : 1, edge = side < 0 ? own.cell.x + own.cell.w - 3 * k : own.cell.x + 3 * k
        const path: Pt[] = Math.abs(to.place.foot - own.foot) < 1
          ? [[to.x + out, to.place.foot - 7 * k], [to.x + out, under], [from.x - out, under], [from.x - out, low], [from.x - out * 0.5, low]]
          : [[to.x + out, to.place.foot - 7 * k], [to.x + out, under], [edge, under], [edge, low], [from.x + (side < 0 ? out * 0.5 : -out * 0.5), low]]
        strokes.push({ pts: path, draw: (piece) => pen(ctx, route(piece, 5 * k), { w: 1.25, seed: seedOf(young.id, 7), taper: 0.04 }) })
      }
    }
    if (origin.kind !== 'seed') return
    const top = from.y - stemHeight(from.look.joints, k) - (PLANT.flower + 4) * k
    /** The bar that carries this young's line to one parent in a pot, or none: every line to one parent runs along the same bar, so a brood's lines gather into two. */
    const barTo = (id: number, which: number): { above: boolean; below: boolean; meet: number; bar: number } | null => {
      const parent = byId.get(id), to = parent && standing(parent, layout)
      if (!to?.place || to.place === own || away.has(id)) return null
      // A parent on the row above is reached from under its board; one in the same row, over the tops. A parent on the
      // row below (a young carried up to the shelf) is reached from under the young's own board, down to the parent's
      // top: led over the tops, the line would come down through whatever stands on the shelf above the parent, and
      // through the young itself where the parent stands straight below it.
      const above = to.place.foot < own.cell.y + 1, below = !above && to.place.foot > own.foot + 1
      const meet = above ? to.place.foot + PLANT.board * k + 1 : to.y - stemHeight(to.look.joints, k) - (PLANT.flower + 4) * k
      const bar = above ? meet + (3.5 + 5.5 * which + 1.5 * hash(id, 1)) * k : below ? own.foot + PLANT.board * k + 1 + (6.2 + 5.5 * which + 1.5 * hash(young.id, 1)) * k : own.cell.y + (3 + 4 * which) * k
      return { above, below, meet, bar }
    }
    ;[origin.onto, origin.dust].forEach((id, which) => {
      const parent = byId.get(id), to = parent && standing(parent, layout)
      // A line is drawn for as long as both its plants are on the page: a parent that has hopped to the border is reached there.
      if (parent && to && !to.place && !away.has(id)) return borderLine(ctx, layout, parent, young, which, strength(young.id, id, 0.55), tree)
      const mine = barTo(id, which)
      if (!to?.place || !mine) return
      const { above, below, meet } = mine
      const x = from.x + (which ? 3 : -3) * k, end = to.x + (which ? 3 : -3) * k
      // Young to the left of a parent and young to its right join its riser at two heights, a little apart: both sides
      // meeting it at one point, with a young straight under it, would be four strokes at a cross.
      const bar = mine.bar + (x > end + 0.5 ? 2.4 * k : 0)
      // Under a parent the line goes on up across the board to the foot of its pot.
      const tail: Pt[] = above ? [[end, to.place.foot - 1]] : []
      // Straight runs with small square turns: a brood's lines join their bar and their parent's riser at right angles,
      // as the lines of a family tree do, and do not sweep into them, which would draw a barb at every join.
      // A young straight under its parent goes straight up to it.
      // To a parent below, the line leaves from the foot of the young's pot, across its board.
      const start: Pt = below ? [x, own.foot - 1] : [x, top]
      const run: Pt[] = Math.abs(x - end) <= 0.5 ? [start, [end, meet], ...tail] : [start, [x, bar], [end, bar], [end, meet], ...tail]
      strokes.push({ pts: run, draw: (piece) => pencil(ctx, route(piece, 2 * k), { seed: seedOf(young.id, which), w: 1.15, alpha: strength(young.id, id, 0.62) }) })
      // Which parent bore the pod and which gave the dust is marked where the lines reach it, once a parent and a side:
      // a small pod beside the line to the pod parent, a pinch of dust beside the line to the dust parent, as the heads of the loupe's note are.
      markParent(ctx, tree, id, which, end + (which ? 7 : -7) * k, meet + (above ? 3 : -9) * k, k)
    })
  })
  // Every line is laid out; now each is drawn, hopping the level runs of all the others.
  const bars = strokes.map((stroke) => levels(stroke.pts))
  strokes.forEach((stroke, at) => {
    for (const piece of hopping(stroke.pts, bars.flatMap((own, of) => (of === at ? [] : own)), 3 * k)) { stroke.draw(piece); seen?.(piece) }
  })
  for (const mark of marks) mark()
}

/** The mark beside a family line where it reaches a parent: a small pod for the plant that bore the pod, a pinch of gold dust for the plant that gave the dust. */
function parentMark(ctx: Ctx, x: number, y: number, which: number, k: number): void {
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  if (which === 0) {
    ctx.translate(x - 2 * k, y)
    drawPod(ctx, 0.2 * k)
  } else {
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 3 === 2 ? ANTHER : WASH.gold
      ctx.beginPath()
      ctx.arc(x + (hash(61, i) - 0.3) * 7 * k, y + (2 + hash(62, i) * 7) * k, (0.8 + 0.6 * hash(63, i)) * k, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

/**
 * A visitor that left with its plant, drawn small on a card of its own, which is stuck in the top margin by one strip
 * of tape at its top: the card brings its own paper, so the drawing is as clear over the sky as on bare paper, and a
 * touch swings it about its tape (things.ts). The origin is the middle of the card's foot, a little above it.
 */
export function paintKept(ctx: Ctx, kind: CreatureKind, look: Look, box: Rect, small: number): void {
  const s = Math.min((box.h * 0.6) / CREATURES[kind].h, (box.w * 0.55) / CREATURES[kind].w)
  const card: Pt[] = [[-box.w / 2 + 3, -box.h + 11], [box.w / 2 - 4, -box.h + 9.5], [box.w / 2 - 3, 4], [-box.w / 2 + 4, 5]]
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = SCRAP
  trace(ctx, card, true)
  ctx.fill()
  wash(ctx, card, WASH.wood, { alpha: 0.1, rim: 0.25, seed: 58, loose: 0.5 })
  pencil(ctx, [...card, card[0]], { seed: 59, w: 0.8, alpha: 0.5 })
  tape(ctx, 0, -box.h + 10, Math.min(26, box.w * 0.3), 0.06, 57, 9)
  ctx.save()
  ctx.translate(box.w * 0.18, 0)
  drawBody(ctx, kind, s)
  drawLive(ctx, kind, s, AT_REST)
  ctx.restore()
  ctx.translate(-box.w * 0.3, 0)
  drawPlant(ctx, look, Math.min(small, (box.h * 0.9) / (stemHeight(look.joints, 1) + PLANT.flower)), { solid: true })
  pencil(ctx, [[-box.w * 0.12, 1], [box.w * 0.7, 2]], { seed: 60, w: 1 })
}

/** A short pencil line for a creature to stand on. */
export function pencilGround(ctx: Ctx, x: number, y: number, half: number): void {
  ctx.globalCompositeOperation = 'source-over'
  pencil(ctx, [[x - half, y + 1], [x - half * 0.2, y + 2], [x + half, y + 1]], { seed: Math.round(half), w: 1.1, alpha: 0.6 })
}

// --- The marks of things in motion -------------------------------------------

const TAU = Math.PI * 2

/** A drawing kept for reuse: its canvas, and its box about the point it is placed by, in CSS pixels. */
/** A kept drawing. `mode` is how it is laid when nothing else is said: multiplied onto the page, as a wash is, or as it is, for a drawing that brings its own paper. */
export type Sprite = { canvas: CanvasImageSource; x: number; y: number; w: number; h: number; mode?: GlobalCompositeOperation }

/** What the page hands to a figure that lays kept drawings down: the surface, its pixel ratio, and the two ways a drawing is laid. */
export type Brush = {
  ctx: Ctx
  ratio: number
  /** Lays a kept drawing with its point at that place, multiplied onto what is there unless told otherwise. */
  put(made: Sprite, x: number, y: number, mode?: GlobalCompositeOperation): void
  /** Lays only the rows of a kept drawing between two heights about its point. */
  band(made: Sprite, top: number, bottom: number, mode?: GlobalCompositeOperation): void
}

/** What the page hands to the figures of folk.ts and tools.ts: the brush, the page's scale, its kept drawings, and a tally of what is laid. */
export type Easel = Brush & {
  k: number
  /** A drawing kept under a name: painted once, into a sheet with that box about its point, and reused. */
  sprite(key: string, x: number, y: number, w: number, h: number, paint: (on: Ctx) => void, mode?: GlobalCompositeOperation): Sprite
  /** The kept drawing of a plant of that look at that scale. */
  plant(look: Look, kk: number): Sprite
  /** Lays something moved to a point, turned and scaled there. */
  placed(x: number, y: number, turn: number, wide: number, tall: number, paint: () => void): void
  /** Counts one figure drawn straight onto the surface. */
  mark(): void
}

/**
 * A plant in motion, its soil point at (x, y): `whole` gives its kept drawing at scale `kk`, `line` the same in pen
 * alone, `stem` the height of its flower's middle, and `z` scales it the rest of the way while it is in the air.
 * It squashes about its soil line and keeps its area. It bends as a spring does, in a curve: the stem is laid in a
 * few bands, each sheared a little more than the one under it, and the flower is turned to sit square on the tip.
 * While it grows, the pen races up the stem with the wash a little behind it; then the flower opens on the tip and
 * the wash blooms into it, with a small pop at the end. `pod` draws its pod about the flower, when it has one.
 */
export function plantInMotion(b: Brush, whole: () => Sprite, line: () => Sprite, stem: number, kk: number, state: PlantLive, x: number, y: number, z: number, pod: (() => void) | null): void {
  // A plant that has not started is not drawn, and its drawing is not made yet either: six young do not all cost their first frame at once.
  if (!(state.grow > 0)) return
  const { ctx } = b, full = whole(), squash = state.squash > 0 ? state.squash : 1, bend = state.bend, neck = stem - 22.5 * kk, wide = z / Math.sqrt(squash), tall = squash * z
  ctx.save()
  ctx.translate(x, y)
  if (state.grow >= 1 && Math.abs(bend) > 0.02) {
    ctx.scale(wide, tall)
    // The bands meet on whole pixels of the surface, so no seam shows between them.
    const count = Math.min(6, 2 + Math.ceil(Math.abs(bend) * 20)), snap = (v: number) => (Math.round((y + tall * v) * b.ratio) / b.ratio - y) / tall
    let low = 0, from = 0
    for (let i = 1; i <= count; i++) {
      const high = snap((-neck * i) / count), to = bend * stem * (high / stem) ** 2, slope = (to - from) / (high - low)
      ctx.save()
      ctx.transform(1, 0, slope, 1, from - slope * low, 0)
      b.band(full, high, i === 1 ? full.y + full.h : low)
      ctx.restore()
      low = high
      from = to
    }
    ctx.translate(from, low)
    ctx.rotate(Math.atan((2 * bend * -low) / stem))
    ctx.translate(0, -low)
    b.band(full, full.y, low)
    pod?.()
  } else {
    ctx.transform(wide, 0, -bend * tall, tall, 0, 0)
    if (state.grow >= 1) {
      b.put(full, 0, 0)
      pod?.()
    } else {
      const pen = line(), open = Math.max(0, (state.grow - 0.8) / 0.2), top = -neck * Math.min(1, state.grow / 0.8), lag = Math.min(26 * kk, -top) * (1 - Math.min(1, open * 3))
      let tip = top
      b.band(full, top + lag, full.y + full.h)
      b.band(pen, top, top + lag)
      if (open > 0) {
        const f = open < 0.5 ? 0.25 + 0.75 * (1 - (1 - open * 2) ** 2) : 1 + 0.15 * Math.sin((open - 0.5) * TAU), root = -(stem - 20 * kk)
        ctx.save()
        ctx.translate(0, root)
        ctx.scale(f, f)
        ctx.translate(0, -root)
        if (open < 0.6) b.band(pen, full.y, -neck)
        ctx.globalAlpha = Math.min(1, Math.max(0, (open - 0.2) / 0.35))
        if (open > 0.2) b.band(full, full.y, -neck)
        ctx.restore()
        tip = root - 46 * kk * f
      }
      ctx.globalCompositeOperation = 'source-over'
      dot(ctx, 0.5 * kk, tip, 2.1 * Math.sqrt(kk), INK)
    }
  }
  ctx.restore()
}

/** Gold dust lying on the beetle's wing cases, in its own drawing's measure: `amount` 0 to 1 is how many specks. */
export function goldDust(ctx: Ctx, s: number, amount: number): void {
  const count = Math.round(Math.max(0, Math.min(1, amount)) * 64)
  for (let tone = 0; tone < 2; tone++) {
    ctx.fillStyle = tone ? ANTHER : WASH.gold
    ctx.beginPath()
    for (let i = 0; i < count; i++) {
      if ((i % 5 === 3 ? 1 : 0) !== tone) continue
      // Dust settles on top: more of it lies high on the cases than down their sides.
      const v = hash(61, i) ** 1.6, y = -49 + v * 33, half = 27 * Math.sqrt(Math.max(0, 1 - ((y + 30) / 21) ** 2)), x = 15 + (hash(62, i) * 2 - 1) * half, r = 0.9 + 1.3 * hash(63, i)
      ctx.moveTo((x + r) * s, y * s)
      ctx.arc(x * s, y * s, r * s, 0, TAU)
    }
    ctx.fill()
  }
}

/** The worm's cap: a small heap of gold dust on its head, in its own drawing's measure, and a few specks that have slid off it. */
export function dustCap(ctx: Ctx, s: number): void {
  ctx.save()
  ctx.scale(s, s)
  const heap = curve([[-19, -29.2], [-16.5, -33], [-11.5, -35.6], [-6.5, -33.6], [-3.4, -29.8], [-8, -31.2], [-13.5, -30.8]], true, 1.5)
  ctx.fillStyle = WASH.gold
  trace(ctx, heap, true)
  ctx.fill()
  wash(ctx, heap, WASH.gold, { alpha: 0.5, seed: 64, rim: 0.6, loose: 0.6 })
  for (let i = 0; i < 10; i++) dot(ctx, -16.5 + hash(66, i) * 11, -34.4 + hash(67, i) * 4, 0.5, ANTHER)
  for (let i = 0; i < 7; i++) dot(ctx, -22 + hash(68, i) * 22, -27 + hash(69, i) * 11, 0.5 + 0.4 * hash(70, i), i % 3 ? WASH.gold : ANTHER)
  ctx.restore()
}

/**
 * A puff, drawn in pen and pencil and nothing else, about twice as far across as its `r`. Soil is dark crumbs thrown
 * up and out over a low pencil arc; a pop is a burst of short pencil strokes; a sneeze is a small cloud of pencil
 * curls. Age spreads it and thins it.
 */
export function drawPuff(ctx: Ctx, puff: Puff, k: number): void {
  const age = Math.max(0, Math.min(1, puff.age)), out = 1 - (1 - age) ** 2, r = puff.r, seed = seedOf(puff.x, puff.y)
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.translate(puff.x, puff.y)
  ctx.globalAlpha *= 1 - age ** 3
  if (puff.kind === 'soil') {
    const arc: Pt[] = []
    for (let i = 0; i <= 10; i++) arc.push([Math.cos(-2.75 + i * 0.236) * r * (0.7 + 0.5 * out), Math.sin(-2.75 + i * 0.236) * r * (0.3 + 0.35 * out)])
    pencil(ctx, arc, { seed, w: 1.3 * k, alpha: 0.7 })
    // Thrown to both sides and not straight up, so whatever stands or lands in the middle stays clear: flecks, not round dots.
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1, a = -Math.PI / 2 + side * (0.5 + 0.95 * hash(seed, i)), far = r * (0.6 + 1.6 * out) * (0.6 + 0.5 * hash(seed + 1, i))
      const x = Math.cos(a) * far, y = Math.sin(a) * far + r * 0.9 * age * age, long = (1.2 + 1.8 * hash(seed + 2, i)) * k
      pen(ctx, [[x - Math.cos(a) * long, y - Math.sin(a) * long], [x + Math.sin(a) * 0.4 * long, y], [x + Math.cos(a) * long, y + Math.sin(a) * long]], { w: (1.6 + 1.4 * hash(seed + 3, i)) * k, seed: seed + i, taper: 0.3, ink: i % 3 ? WASH.wet : INK })
    }
  } else if (puff.kind === 'pop') {
    for (let i = 0; i < 11; i++) {
      const a = ((i + 0.7 * hash(seed, i)) / 11) * TAU, from = r * (0.75 + 0.85 * out), to = from + r * (0.45 + 0.4 * hash(seed + 1, i)) * (1 - 0.4 * age)
      const cos = Math.cos(a), sin = Math.sin(a), mid = (from + to) / 2
      pencil(ctx, [[cos * from, sin * from], [cos * mid - sin, sin * mid + cos], [cos * to, sin * to]], { seed: seed + i, w: 1.9 * k, alpha: 1 })
    }
  } else {
    // A sneeze is blown one way: two ranks of short pencil strokes in a fan in front of the head, the far rank longer.
    // No stroke curls: a pencil curl standing by itself in the air, of most of a turn, would read as a figure.
    for (let i = 0; i < 12; i++) {
      const rank = i % 2, a = Math.PI + (Math.floor(i / 2) - 2.5) * 0.24 + 0.1 * (hash(seed, i) - 0.5)
      const from = r * (0.25 + 0.5 * rank + 0.9 * out) * (0.85 + 0.3 * hash(seed + 1, i)), to = from + r * (0.22 + 0.2 * rank + 0.16 * hash(seed + 2, i)) * (1 - 0.3 * age)
      const cos = Math.cos(a), sin = Math.sin(a) * 0.8, mid = (from + to) / 2
      pencil(ctx, [[cos * from, sin * from], [cos * mid + sin * 0.8, sin * mid - cos * 0.8], [cos * to, sin * to]], { seed: seed + i, w: 1.5 * k, alpha: 0.9 })
    }
  }
  ctx.restore()
}
