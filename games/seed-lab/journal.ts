// The journal page, composed. `drawPage` draws one frame from a plain view of
// the page (spikePage.ts), the places of layout.ts and the game's clock.
//
// Nearly everything is drawn once into a small canvas of its own and reused:
// the paper with the plate, boards and tape; each pot, each plant by its look,
// each packet and each creature's body. A frame is then a few dozen sprites
// laid down, most of them multiplied onto the paper so that washes stay
// transparent, plus the few pen strokes that are alive at idle. Plants do not
// move at idle.

import { AT_REST, CREATURES, applyPose, drawBody, drawLive, drawLoupe, type CreatureKind, type Pose } from './creatures'
import { SCRAP, WASH, curve, hash, hatch, paintPaper, pen, pencil, seedOf, tape, trace, wash, type Ctx, type Pt } from './ink'
import { PLANT, POTS_PER_ROW, stemHeight, type Layout, type PotPlace, type Rect } from './layout'
import { lookCode, lookOf, type Look } from './plant'
import { drawPacket, drawPlant, drawPod, drawPot, drawRunner, sketchOf } from './specimen'
import type { PageView, PlantView, VisitorView } from './spikePage'

export type Sheet = { canvas: CanvasImageSource; ctx: Ctx }
/** Makes an offscreen canvas of that many device pixels. A test passes a stub. */
export type MakeSheet = (width: number, height: number) => Sheet

export const domSheets: MakeSheet = (width, height) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return { canvas, ctx: canvas.getContext('2d')! }
}

/** A drawing kept for reuse: its canvas, and its box about the point it is placed by, in CSS pixels. */
type Sprite = { canvas: CanvasImageSource; x: number; y: number; w: number; h: number }
/** What one surface keeps between frames: its sprites, and the ground, which is the paper with the family lines on it. */
type Kept = { size: string; sprites: Map<string, Sprite>; ground: { key: string; sheet: Sheet } | null }
const KEPT = new WeakMap<MakeSheet, Kept>()

/** The plate, the two boards, the border's ground, tape and a pressed leaf: everything that depends on the size alone. */
function paintFurniture(ctx: Ctx, layout: Layout): void {
  const { k, shelf, tray, shelfBoard, trayBoard, borderStrip, border } = layout
  const first = shelf[0].cell, last = tray[POTS_PER_ROW - 1].cell, pad = 5 * k
  const plate: Rect = { x: first.x - pad, y: first.y - pad, w: last.x + last.w - first.x + pad * 2, h: last.y + last.h - first.y + pad * 2 }
  const edge: Pt[] = [[plate.x, plate.y + 1.5], [plate.x + plate.w - 1, plate.y], [plate.x + plate.w, plate.y + plate.h - 1.5], [plate.x + 1.5, plate.y + plate.h]]
  ctx.fillStyle = SCRAP
  trace(ctx, edge, true)
  ctx.fill()
  wash(ctx, edge, WASH.wood, { alpha: 0.07, rim: 0.16, seed: 3, loose: 0.6 })
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

  // A pressed leaf in the top left corner, held by one strip of tape.
  const u = Math.min(first.x - borderStrip.x, first.y) / 84
  ctx.save()
  ctx.translate(borderStrip.x + 22 * u, first.y - 12 * u)
  ctx.rotate(-0.5)
  ctx.scale(u, u)
  const half: Pt[] = [[0, 0], [10, -8], [22, -12], [20, -17], [34, -18], [34, -23], [48, -19], [52, -23], [62, -14], [78, -3]]
  const leaf = [...half, ...half.slice(0, -1).reverse().map(([x, y]) => [x + 1, -y * 0.9] as const)]
  wash(ctx, leaf, WASH.leaf, { alpha: 0.42, seed: 30 })
  wash(ctx, leaf, WASH.wood, { alpha: 0.3, seed: 31, loose: 2 })
  pen(ctx, leaf, { w: 1.1 / u, seed: 32, taper: 0 })
  pen(ctx, [[-14, 1], [76, -2]], { w: 1.1 / u, seed: 33, taper: 0.1 })
  for (let i = 0; i < 4; i++) for (const side of [-1, 1]) pen(ctx, [[12 + i * 14, 0], [22 + i * 14, side * (12 - i * 1.5)]], { w: 0.7 / u, seed: 34 + i, taper: 0.4 })
  tape(ctx, -6, 1, 30, 1.45, 40, 13)
  ctx.restore()

  // A pressed frond in the bare paper beside the wish, under its own strip of tape.
  const { wish, beetle, wide } = layout
  ctx.save()
  ctx.translate(wide ? wish.x + wish.w * 0.55 : beetle.x + beetle.w * 0.2, wide ? first.y - 30 * u : beetle.y - 26 * u)
  ctx.rotate(wide ? -0.16 : -0.4)
  ctx.scale(u * 1.05, u * 1.05)
  for (let i = 1; i <= 11; i++) {
    for (const side of [-1, 1]) {
      const x = 4 + i * 7.6, a = side * (1.05 - i * 0.02), long = 17 * (1 - i / 14) * (0.85 + 0.3 * hash(44, i * side))
      const tip: Pt = [x + Math.cos(a) * long, Math.sin(a) * long], nx = -Math.sin(a) * 2.7, ny = Math.cos(a) * 2.7
      const blade = curve([[x, 0], [x + Math.cos(a) * long * 0.45 + nx, Math.sin(a) * long * 0.45 + ny], tip, [x + Math.cos(a) * long * 0.45 - nx, Math.sin(a) * long * 0.45 - ny]], true)
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
function standing(plant: PlantView, layout: Layout): { x: number; y: number; k: number; look: Look; place: PotPlace | null } {
  const look = lookOf(plant.pairs, plant.dry)
  if (plant.row === 'border') return { x: layout.border[plant.slot].x, y: layout.border[plant.slot].ground, k: layout.small, look, place: null }
  const place = layout[plant.row][plant.slot]
  return { x: place.x, y: place.soil + layout.k, k: layout.k, look, place }
}

/** The pencil family lines, two from each young of a pod to its two parents, and each runner. They change only when the page's plants do. */
function paintFamily(ctx: Ctx, view: PageView, layout: Layout): void {
  const { k } = layout, byId = new Map(view.plants.map((plant) => [plant.id, plant]))
  view.plants.forEach((young) => {
    const origin = young.origin, from = standing(young, layout), own = from.place
    if (!own) return
    if (origin.kind === 'runner') {
      const parent = byId.get(origin.from), to = parent && standing(parent, layout)
      if (!to?.place) return
      const [a, b] = to.x < from.x ? [to, from] : [from, to]
      drawRunner(ctx, [a.x, a.y], [b.x, b.y], PLANT.potH * k - 2, k)
    }
    if (origin.kind !== 'seed') return
    const top = from.y - stemHeight(from.look.joints, k) - (PLANT.flower + 4) * k
    ;[origin.onto, origin.dust].forEach((id, which) => {
      const parent = byId.get(id), to = parent && standing(parent, layout)
      if (!to?.place || to.place === own) return
      // A parent on the row above is reached from under its board; one in the same row, over the tops.
      const above = to.place.foot < own.cell.y + 1
      const meet = above ? to.place.foot + PLANT.board * k + 1 : to.y - stemHeight(to.look.joints, k) - (PLANT.flower + 4) * k
      // Every line to one parent runs along the same bar, so a brood's lines gather into two.
      const bar = above ? meet + (3.5 + 5.5 * which + 1.5 * hash(id, 1)) * k : own.cell.y + (3 + 4 * which) * k
      const x = from.x + (which ? 3 : -3) * k, end = to.x + (which ? 3 : -3) * k, turn = Math.sign(end - x) * 7 * k
      const rise: Pt[] = top - bar > 14 * k ? [[x, top], [x, bar + 9 * k]] : [[x, top]]
      // Under a parent the line goes on up across the board to the foot of its pot.
      const tail: Pt[] = above ? [[end, meet - PLANT.board * k * 0.5], [end, to.place.foot - 1]] : []
      pencil(ctx, curve([...rise, [x + turn, bar], [end - turn, bar], [end, meet], ...tail], false, 3), { seed: seedOf(young.id, which), w: 1.15, alpha: 0.62 })
    })
  })
}

/** A wish: the plant asked for, in pencil with a note of its colour, as many times as asked, on a scrap of paper held by tape. */
function paintWish(ctx: Ctx, wish: VisitorView, box: Rect, k: number): void {
  // The scrap is no wider than its carrier can show round, and grows to the right for a wish of two or three.
  const count = Math.max(1, Math.min(3, wish.count)), narrow = Math.min(box.w * 0.74, 108 * k), w = Math.min(box.w, narrow * (0.8 + 0.2 * count)), h = Math.min(box.h * 0.94, 190 * k)
  const scale = Math.min(0.7 * k, (h * 0.8) / (4 * PLANT.joint + PLANT.stalk + PLANT.flower))
  ctx.translate((w - narrow) / 2, 0)
  ctx.rotate(-0.06)
  const scrap: Pt[] = [[-w / 2, -h + 2], [w / 2 - 3, -h], [w / 2, -4], [w * 0.2, 0], [-w / 2 + 2, -2]]
  ctx.fillStyle = SCRAP
  trace(ctx, scrap, true)
  ctx.fill()
  wash(ctx, scrap, WASH.wood, { alpha: 0.12, rim: 0.2, seed: 50 })
  pencil(ctx, [...scrap, scrap[0]], { seed: 51, w: 0.9, alpha: 0.55 })
  const { look, show } = sketchOf(wish.wish), ground = -h * 0.12
  for (let i = 0; i < count; i++) {
    ctx.save()
    ctx.translate((i - (count - 1) / 2) * (w / (count + 0.4)), ground)
    drawPlant(ctx, look, scale * (count > 1 ? 0.8 : 1), { pencil: true, show })
    ctx.restore()
  }
  pencil(ctx, curve([[-w * 0.36, ground + 1], [0, ground + 2.5], [w * 0.36, ground]]), { seed: 52, w: 1.2 })
  tape(ctx, w * 0.04 - (w - narrow) / 2, 3 * k, 34 * k, 1.45, 53, 15 * k)
}

/** The sketch a waiting visitor has not shown yet: a small roll of paper. */
function paintRoll(ctx: Ctx, k: number): void {
  const roll: Pt[] = [[-15 * k, -4 * k], [14 * k, -5 * k], [15 * k, 4 * k], [-14 * k, 5 * k]]
  ctx.fillStyle = SCRAP
  trace(ctx, roll, true)
  ctx.fill()
  wash(ctx, roll, WASH.wood, { alpha: 0.2, seed: 70 })
  pencil(ctx, [...roll, roll[0]], { seed: 71, w: 1, alpha: 0.8 })
  pencil(ctx, curve([[-14.5 * k, -3 * k], [-11.5 * k, 0], [-13 * k, 3 * k], [-15 * k, 0.5 * k], [-13.6 * k, -0.8 * k]]), { seed: 72, w: 0.9, alpha: 0.8 })
  pencil(ctx, [[-6 * k, -4.4 * k], [-5.4 * k, 4.6 * k]], { seed: 73, w: 0.8, alpha: 0.5 })
}

/** A visitor that left with its plant, drawn small for the top margin. */
function paintKept(ctx: Ctx, kind: CreatureKind, look: Look, box: Rect, small: number): void {
  const s = Math.min((box.h * 0.6) / CREATURES[kind].h, (box.w * 0.55) / CREATURES[kind].w)
  ctx.save()
  ctx.translate(box.w * 0.18, 0)
  drawBody(ctx, kind, s)
  drawLive(ctx, kind, s, AT_REST)
  ctx.restore()
  ctx.translate(-box.w * 0.3, 0)
  drawPlant(ctx, look, Math.min(small, (box.h * 0.9) / (stemHeight(look.joints, 1) + PLANT.flower)))
  pencil(ctx, [[-box.w * 0.12, 1], [box.w * 0.7, 2]], { seed: 60, w: 1 })
}

const seconds = (time: number) => (Number.isFinite(time) ? time : 0)

/**
 * Draws one frame of the page and returns how many sprites and figures it laid
 * down. `ctx` is already scaled by the pixel ratio, which is read back from it
 * so sprites are made at the surface's own sharpness. `tier` is the quality
 * tier in force: from the third on, the lifted tape end is left out.
 */
export function drawPage(ctx: Ctx, view: PageView, layout: Layout, time: number, tier: number, make: MakeSheet = domSheets): number {
  const ratio = Math.max(0.5, Math.round((typeof ctx.getTransform === 'function' ? ctx.getTransform().a : 1) * 100) / 100 || 1)
  const size = `${layout.w}x${layout.h}@${ratio}`
  let kept = KEPT.get(make)
  if (!kept || kept.size !== size) KEPT.set(make, (kept = { size, sprites: new Map(), ground: null }))
  const { sprites } = kept, { k } = layout
  let draws = 0

  const sprite = (key: string, x: number, y: number, w: number, h: number, paint: (on: Ctx) => void): Sprite => {
    let made = sprites.get(key)
    if (!made) {
      const sheet = make(Math.max(1, Math.ceil(w * ratio)), Math.max(1, Math.ceil(h * ratio)))
      sheet.ctx.scale(ratio, ratio)
      sheet.ctx.translate(-x, -y)
      paint(sheet.ctx)
      sprites.set(key, (made = { canvas: sheet.canvas, x, y, w, h }))
    }
    return made
  }
  const put = (made: Sprite, x: number, y: number, mode: GlobalCompositeOperation = 'multiply') => {
    ctx.globalCompositeOperation = mode
    ctx.drawImage(made.canvas, x + made.x, y + made.y, made.w, made.h)
    draws++
  }
  const creature = (kind: CreatureKind, x: number, y: number, s: number, pose: Pose) => {
    const { w, h } = CREATURES[kind]
    const body = sprite(`body ${kind} ${s.toFixed(3)}`, -w * 0.62 * s, -h * 1.12 * s, w * 1.24 * s, h * 1.24 * s, (on) => drawBody(on, kind, s))
    ctx.save()
    ctx.translate(x, y)
    applyPose(ctx, pose)
    put(body, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    drawLive(ctx, kind, s, pose)
    draws++
    ctx.restore()
  }

  ctx.save()
  // The paper is painted once for a size. The ground is that paper with the family lines on it, and is
  // repainted in place only when the page's plants change, so a frame makes one full-surface draw.
  const paper = sprite(`paper ${view.seed}`, 0, 0, layout.w, layout.h, (on) => {
    paintPaper(on, layout.w, layout.h, view.seed)
    paintFurniture(on, layout)
  })
  const family = view.plants.map((plant) => [plant.id, plant.pairs, plant.dry ? 1 : 0, plant.row, plant.slot, JSON.stringify(plant.origin)].join()).join(';')
  if (!kept.ground) kept.ground = { key: '', sheet: make(Math.ceil(layout.w * ratio), Math.ceil(layout.h * ratio)) }
  if (kept.ground.key !== family) {
    const on = kept.ground.sheet.ctx
    on.setTransform(ratio, 0, 0, ratio, 0, 0)
    on.globalCompositeOperation = 'source-over'
    on.drawImage(paper.canvas, 0, 0, layout.w, layout.h)
    paintFamily(on, view, layout)
    kept.ground.key = family
  }
  put({ canvas: kept.ground.sheet.canvas, x: 0, y: 0, w: layout.w, h: layout.h }, 0, 0, 'source-over')

  view.packets.forEach((id, at) => {
    const box = layout.packets[at]
    if (!box) return
    const w = box.w * 0.84, h = box.h * 0.9
    put(sprite(`packet ${id}`, -8, -10, w + 16, h + 18, (on) => {
      on.rotate((hash(11, id.length) - 0.5) * 0.09)
      drawPacket(on, id, w, h)
      tape(on, w * 0.5, 2, 34 * k, (hash(12, id.length) - 0.5) * 0.3, id.length, 14 * k)
    }), box.x + box.w * 0.08, box.y + box.h * 0.06, 'source-over')
  })
  view.kept.slice(0, layout.kept.length).forEach((entry, at) => {
    const box = layout.kept[at]
    put(sprite(`kept ${entry.kind} ${lookCode(entry.look)}`, -box.w / 2, -box.h + 6, box.w, box.h, (on) => paintKept(on, entry.kind, entry.look, box, layout.small)), box.x + box.w / 2, box.y + box.h - 6)
  })

  const reach = layout.shelf[0].bud.x - layout.shelf[0].x
  const runs = new Set(view.plants.flatMap((plant) => (plant.origin.kind === 'runner' ? [plant.origin.from] : [])))
  ;[...layout.shelf, ...layout.tray].forEach((place, pot) => {
    // A plant carries one runner bud, unless its runner is already out and rooted.
    const dry = view.dry[pot] === true, bud = view.buds && view.plants.some((plant) => plant.row !== 'border' && layout[plant.row][plant.slot] === place && !runs.has(plant.id))
    put(sprite(`pot ${dry} ${bud}`, -36 * k, -14 * k, 36 * k + Math.max(36 * k, reach + 12 * k), 76 * k, (on) => drawPot(on, k, dry, bud ? reach : 0)), place.x, place.soil)
  })
  for (const plant of view.plants) {
    const at = standing(plant, layout), tall = stemHeight(at.look.joints, at.k) + (PLANT.flower + 6) * at.k
    put(sprite(`plant ${lookCode(at.look)} ${at.k.toFixed(4)}`, -36 * at.k, -tall, 72 * at.k, tall + 6 * at.k, (on) => drawPlant(on, at.look, at.k)), at.x, at.y)
    if (view.pods.includes(plant.id)) put(sprite('pod', -8 * k, -44 * k, 52 * k, 52 * k, (on) => { on.rotate(Math.PI + 0.8); drawPod(on, k * 1.15) }), at.x + 15 * at.k, at.y - stemHeight(at.look.joints, at.k) - 15 * at.k)
  }

  const t = seconds(time), sway = (t * 0.21) % 1, breath = 0.5 - 0.5 * Math.cos(t * 1.3)
  if (view.worm !== null) {
    const place = [...layout.shelf, ...layout.tray][view.worm]
    if (place) creature('worm', place.x + 3 * k, place.soil + 2 * k, k * 1.1, { lean: Math.sin(t * 0.7) * 0.05, look: 0.2, breath: 0, sway })
  }
  if (view.visitor) {
    const v = view.visitor, box = layout.visitor, s = Math.min(1.3 * k, box.w / (CREATURES[v.kind].w * 1.05), box.h / (CREATURES[v.kind].h * 1.25))
    const scrap = layout.wish, x = box.x + box.w * 0.56, y = box.y + box.h * 0.97, [hx, hy] = CREATURES[v.kind].hold
    creature(v.kind, x, y, s, { lean: -0.05, look: 0.15, breath: breath * 0.6, sway })
    // It carries its wish where everyone can see it: the scrap stands on its back, held by a strip of tape.
    put(sprite(`wish ${JSON.stringify(v.wish)} ${v.count}`, -scrap.w / 2, -scrap.h, scrap.w * 1.5, scrap.h + 24 * k, (on) => paintWish(on, v, scrap, k)), x + hx * s, y + hy * s, 'source-over')
  }
  if (view.waiting) {
    const v = view.waiting, box = layout.waiting, s = Math.min(k, box.w / (CREATURES[v.kind].w * 0.9), box.h / (CREATURES[v.kind].h * 1.3))
    // One that flies waits in the air and bobs; one that walks waits on a pencil line. Either holds its sketch rolled up.
    const flies = v.kind === 'bee' || v.kind === 'moth', [hx, hy] = flies ? CREATURES[v.kind].hold : [-CREATURES[v.kind].w * 0.2, -5]
    const x = box.x + box.w * 0.56, y = box.y + box.h * (flies ? 0.62 : 0.8) + (flies ? Math.sin(t * 2.2) * 1.5 * k : 0)
    if (!flies) { pencilGround(ctx, x, y, box.w * 0.42); draws++ }
    put(sprite('roll', -22 * k, -10 * k, 44 * k, 20 * k, (on) => paintRoll(on, k * 1.25)), x + hx * s, y + hy * s, 'source-over')
    creature(v.kind, x, y, s, { lean: 0.04, look: 0, breath: 0.5 - 0.5 * Math.cos(t * 2.6), sway: (t * 0.6) % 1 })
  }
  {
    const pots = [...layout.shelf, ...layout.tray], box = layout.beetle
    const beside = view.beetle.at === 'pot' ? pots[view.beetle.pot] : null
    const s = Math.min(1.35 * k, box.w / 205, box.h / 100)
    const x = beside ? beside.x + 60 * s : box.x + box.w * 0.64, y = beside ? beside.foot : box.y + box.h * 0.9
    pencilGround(ctx, x - 20 * s, y, 78 * s)
    draws++
    put(sprite(`loupe ${s.toFixed(3)}`, -62 * s, -100 * s, 100 * s, 104 * s, (on) => drawLoupe(on, s * 0.84, Math.PI + 0.75)), x - 72 * s, y)
    creature('beetle', x, y, s, { lean: 0.03 * Math.sin(t * 0.5), look: -0.1, breath, sway })
  }
  if (tier < 2) {
    // The one strip of tape that will not lie flat: its free end lifts and settles.
    const last = layout.tray[POTS_PER_ROW - 1].cell, lift = 0.5 - 0.5 * Math.cos(t * 0.8)
    ctx.globalCompositeOperation = 'source-over'
    ctx.save()
    ctx.translate(last.x + last.w + 1 * k, last.y + last.h)
    ctx.rotate(-0.78)
    tape(ctx, 0, 0, 30 * k, 0, 23, 15 * k)
    ctx.translate(15 * k, 0)
    ctx.transform(1, 0, -0.5 * lift, 1 - 0.35 * lift, 0, 0)
    tape(ctx, 9 * k, 0, 18 * k, 0, 24, 15 * k)
    ctx.restore()
    draws++
  }
  ctx.restore()
  return draws
}

/** A short pencil line for a creature to stand on. */
function pencilGround(ctx: Ctx, x: number, y: number, half: number): void {
  ctx.globalCompositeOperation = 'source-over'
  pencil(ctx, [[x - half, y + 1], [x - half * 0.2, y + 2], [x + half, y + 1]], { seed: Math.round(half), w: 1.1, alpha: 0.6 })
}
