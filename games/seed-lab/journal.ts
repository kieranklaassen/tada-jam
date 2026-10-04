// The journal page, composed. `drawPage` draws one frame from a plain view of
// the page (spikePage.ts), the places of layout.ts and the game's clock.
//
// Nearly everything is drawn once into a small canvas of its own and reused:
// the paper with the plate, boards and tape; each pot, each plant by its look,
// each packet and each creature's body. A frame is then a few dozen sprites
// laid down, most of them multiplied onto the paper so that washes stay
// transparent, plus the few pen strokes that are alive at idle. Plants do not
// move at idle.
//
// What is in motion comes in as `live` (live.ts) and is drawn from the same
// sprites, turned, sheared, squashed or cut off at a height, with a few pen
// and pencil marks of stage.ts over them. The visitors and the beetle are
// drawn by folk.ts, the tools, the loupe's note and the ghost hand by
// tools.ts. With no `live` the page is at rest.

import { creature, drawBeetle, drawVisitors, drawWish } from './folk'
import { stubbornTape } from './hit'
import { PAPER, curve, drawSpecks, hash, paintPaper, paintRing, pen, pencil, tape, type Ctx } from './ink'
import { PLANT, stemHeight, type Layout } from './layout'
import type { Live, PlantLive } from './live'
import { lookCode, type Look } from './plant'
import { POD, drawBudLive, drawPacket, drawPlant, drawPod, drawPot, drawRoots, drawSeed, drawTow } from './specimen'
import type { PageView } from './spikePage'
import { drawPuff, dustCap, paintFamily, paintFrond, paintFurniture, paintKept, paintLeaf, plantInMotion, standing, type Easel, type Sprite } from './stage'
import { PRESSED, frondAt, leafAt } from './things'
import { drawDrops, drawFence, drawHeld, drawLying, drawSplash, paintHand } from './tools'

export type Sheet = { canvas: CanvasImageSource; ctx: Ctx }
/** Makes an offscreen canvas of that many device pixels. A test passes a stub. */
export type MakeSheet = (width: number, height: number) => Sheet

export const domSheets: MakeSheet = (width, height) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return { canvas, ctx: canvas.getContext('2d')! }
}

/**
 * What one surface keeps between frames: its sprites; the set, which is the paper with everything on it that stands
 * still in its place (pots, packets, kept drawings, margin sketches, the can and the blotter); and the ground, which
 * is the set with the family lines on it.
 */
type Kept = { size: string; sprites: Map<string, Sprite>; set: { key: string; sheet: Sheet } | null; ground: { key: string; sheet: Sheet } | null }

/** What a frame cost beside what it laid on the surface: `kept` is how many things it laid into the kept set, on a frame in which that had to be made again. */
export type FrameWork = { kept: number }
const KEPT = new WeakMap<MakeSheet, Kept>()

const seconds = (time: number) => (Number.isFinite(time) ? time : 0)

const clamp = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value)

/**
 * Draws one frame of the page and returns how many sprites and figures it laid
 * down. `ctx` is already scaled by the pixel ratio, which is read back from it
 * so sprites are made at the surface's own sharpness. `tier` is the quality
 * tier in force: from the third on, the lifted tape end is left out. `live` is
 * what is in motion; with none, or with nothing in it, the page is at rest.
 * `work`, when given, is told what the frame cost beside that.
 */
export function drawPage(ctx: Ctx, view: PageView, layout: Layout, time: number, tier: number, make: MakeSheet = domSheets, live: Live | null = null, work?: FrameWork): number {
  const ratio = Math.max(0.5, Math.round((typeof ctx.getTransform === 'function' ? ctx.getTransform().a : 1) * 100) / 100 || 1)
  const size = `${layout.w}x${layout.h}@${ratio}`
  let kept = KEPT.get(make)
  if (!kept || kept.size !== size) KEPT.set(make, (kept = { size, sprites: new Map(), set: null, ground: null }))
  const { sprites } = kept, { k } = layout
  let draws = 0, baked = 0

  const sprite = (key: string, x: number, y: number, w: number, h: number, paint: (on: Ctx) => void, mode?: GlobalCompositeOperation): Sprite => {
    let made = sprites.get(key)
    if (!made) {
      const sheet = make(Math.max(1, Math.ceil(w * ratio)), Math.max(1, Math.ceil(h * ratio)))
      sheet.ctx.scale(ratio, ratio)
      sheet.ctx.translate(-x, -y)
      paint(sheet.ctx)
      sprites.set(key, (made = { canvas: sheet.canvas, x, y, w, h, mode }))
    }
    return made
  }
  const reach = layout.shelf[0].bud.x - layout.shelf[0].x
  /**
   * The kept drawing of a plant. `bud` is given for a grown plant that stands in a pot of the shelf or the tray: its
   * runner bud, a stolon out of the soil and over the rim, is part of the drawing, in the wobble of wet soil or of dry.
   */
  const plantSprite = (look: Look, kk: number, bare = false, bud: 'wet' | 'dry' | null = null): Sprite => {
    const tall = stemHeight(look.joints, kk) + (PLANT.flower + 6) * kk
    // A plant brings its own paper: it is laid as it is, so that the setting behind it never shifts its colours. The pen line alone is laid as a line is.
    if (!bud) return sprite(`plant ${bare ? 'pen ' : ''}${lookCode(look)} ${kk.toFixed(4)}`, -36 * kk, -tall, 72 * kk, tall + 6 * kk, (on) => drawPlant(on, look, kk, { bare, solid: true }), bare ? undefined : 'source-over')
    return sprite(`plant ${bud} ${lookCode(look)} ${kk.toFixed(4)}`, -36 * kk, -tall, 36 * kk + Math.max(36 * kk, reach + 12 * kk), tall + 36 * kk, (on) => {
      // The bud first, so that the plant's own paper is laid over the stolon where the two meet.
      on.save()
      on.translate(0, -kk)
      drawBudLive(on, kk, bud === 'dry', reach, 0, 0)
      on.restore()
      drawPlant(on, look, kk, { bare, solid: true })
    }, 'source-over')
  }
  /** A brush on a surface: this frame's, or a kept sheet's. `count` is told of each thing it lays down. */
  const brushOn = (ctx: Ctx, count: () => void): Easel => ({
    ctx, ratio, k, sprite, plant: plantSprite, mark: count,
    put(made, x, y, mode = made.mode ?? 'multiply') {
      ctx.globalCompositeOperation = mode
      ctx.drawImage(made.canvas, x + made.x, y + made.y, made.w, made.h)
      count()
    },
    placed(x, y, turn, wide, tall, paint) {
      ctx.save()
      ctx.translate(x, y)
      if (turn) ctx.rotate(turn)
      if (wide !== 1 || tall !== 1) ctx.scale(wide, tall)
      paint()
      ctx.restore()
    },
    band(made, top, bottom, mode = made.mode ?? 'multiply') {
      const from = Math.max(top, made.y), tall = Math.min(bottom, made.y + made.h) - from
      if (tall <= 0) return
      ctx.globalCompositeOperation = mode
      ctx.drawImage(made.canvas, 0, (from - made.y) * ratio, made.w * ratio, tall * ratio, made.x, from, made.w, tall)
      count()
    },
  })
  const brush = brushOn(ctx, () => { draws++ }), { put, placed } = brush

  ctx.save()
  // The paper is painted once for a size. The set is that paper with everything that stands still in its place, and
  // is made again only when one of those things changes or leaves its place. The ground is the set with the family
  // lines on it, and is made again only when the page's plants change. So a frame makes one full-surface draw, and
  // lays down by itself only what is in motion and the plants.
  const paper = sprite(`paper ${view.seed}`, 0, 0, layout.w, layout.h, (on) => {
    paintPaper(on, layout.w, layout.h, view.seed)
    paintFurniture(on, layout)
  })
  const pots = [...layout.shelf, ...layout.tray]
  // A plant that has not grown yet, or is off its place in a hop or a hand, has no family line, pod or runner bud.
  const away = new Set<number>()
  if (live) for (const [id, state] of live.plants) if (state.grow < 1 || state.at) away.add(id)
  const under = (x: number, y: number, half: number) => {
    ctx.globalCompositeOperation = 'source-over'
    pencil(ctx, [[x - half, y], [x - half * 0.3, y + 1.4], [x + half * 0.4, y + 1.1], [x + half, y - 0.4]], { seed: 21, w: 1.4, alpha: 0.55 })
  }
  // What hops is drawn over what stands, and what is in the hand over everything, with a pencil stroke on the paper under it.
  const hopping: (() => void)[] = [], inHand: (() => void)[] = []
  /** The grown plant that stands in a pot, if one does and is in its place. */
  const ownerOf = (place: (typeof pots)[number]) => (view.buds ? view.plants.find((plant) => plant.row !== 'border' && layout[plant.row][plant.slot] === place && !away.has(plant.id)) : undefined)
  const potSprite = (dry: boolean) => sprite(`pot ${dry}`, -36 * k, -14 * k, 72 * k, 76 * k, (on) => drawPot(on, k, dry, 0))
  /**
   * The things of the page that mostly stand still: the packets, the kept drawings, the margin sketches, the can and
   * the blotter, and the pots. `still` lays those that are in their places, for the set; otherwise it lays, on the
   * frame, only those that are in motion or off their places.
   */
  const furniture = (b: Easel, still: boolean) => {
    view.packets.forEach((id, at) => {
      const box = layout.packets[at]
      if (!box) return
      const w = box.w * 0.84, h = box.h * 0.9, moved = live?.packets.get(id), cx = box.x + box.w / 2, cy = box.y + box.h / 2
      if (still !== !moved) return
      const made = sprite(`packet ${id}`, -8, -10, w + 16, h + 18, (on) => {
        on.rotate((hash(11, id.length) - 0.5) * 0.09)
        drawPacket(on, id, w, h)
        tape(on, w * 0.5, 2, 34 * k, (hash(12, id.length) - 0.5) * 0.3, id.length, 14 * k)
      })
      if (!moved) b.put(made, box.x + box.w * 0.08, box.y + box.h * 0.06, 'source-over')
      // A packet a visitor is carrying in, or setting down: off its place, its middle at that point, smaller while it is carried.
      else if (moved.at) b.placed(moved.at.x, moved.at.y, 0, moved.at.z, moved.at.z, () => b.put(made, -w / 2, -h / 2, 'source-over'))
      else b.placed(cx + moved.shake, cy, moved.spin, 1, 1, () => b.put(made, box.x + box.w * 0.08 - cx, box.y + box.h * 0.06 - cy, 'source-over'))
    })
    // A kept drawing hangs on its card by a strip of tape at its top, and swings about it when it is touched.
    view.kept.slice(0, layout.kept.length).forEach((entry, at) => {
      const box = layout.kept[at], swing = live?.things.get(`kept${at}`)
      if (still !== (swing === undefined)) return
      const made = sprite(`kept ${entry.kind} ${lookCode(entry.look)}`, -box.w / 2, -box.h + 6, box.w, box.h, (on) => paintKept(on, entry.kind, entry.look, box, layout.small), 'source-over')
      if (swing === undefined) b.put(made, box.x + box.w / 2, box.y + box.h - 6)
      else b.placed(box.x + box.w / 2, box.y + 10, swing, 1, 1, () => b.put(made, 0, box.h - 16))
    })
    // The pressed leaf and the frond: each lies where it is taped, and rustles about its tape when it is touched.
    for (const [name, at, box, paint] of [['leaf', leafAt(layout), PRESSED.leaf, paintLeaf], ['frond', frondAt(layout), PRESSED.frond, paintFrond]] as const) {
      const swing = live?.things.get(name)
      if (still !== (swing === undefined)) continue
      const u = at.u, made = sprite(name, (box.x - 6) * u, (box.y - 6) * u, (box.w + 12) * u, (box.h + 12) * u, (on) => paint(on, u), 'source-over')
      b.placed(at.x, at.y, at.turn + (swing ?? 0), 1, 1, () => b.put(made, 0, 0))
    }
    drawLying(b, view, layout, live, still)
    pots.forEach((place, pot) => {
      const dry = view.dry[pot] === true, moved = live?.pots.get(pot)
      if (still) { if (!moved) b.put(potSprite(dry), place.x, place.soil); return }
      // A bud that swings or curls is drawn by itself, and so is the bud of a plant whose pot is in the hand or squashing.
      const owner = ownerOf(place), sprung = (owner && !moved && live?.buds.get(owner.id)) || null
      if (sprung) b.placed(place.x, place.soil, 0, 1, 1, () => { drawBudLive(b.ctx, k, dry, reach, sprung.boing, sprung.curl); b.mark() })
      if (!moved) return
      // A pot squashes about its foot. One that is off its place is in the hand.
      const x = moved.at?.x ?? place.x, foot = (moved.at?.y ?? place.soil) + PLANT.potH * k, squash = moved.squash > 0 ? moved.squash : 1
      const paint = () => b.placed(x, foot, 0, 1 / Math.sqrt(squash), squash, () => {
        b.put(potSprite(dry), 0, -PLANT.potH * k)
        if (owner) b.placed(0, -PLANT.potH * k, 0, 1, 1, () => { drawBudLive(b.ctx, k, dry, reach, 0, 0); b.mark() })
      })
      if (moved.at) inHand.push(() => { under(x, foot + 7 * k, 30 * k); paint() })
      else paint()
    })
  }
  /** Whether a plant's runner bud is part of its own kept drawing now: it stands grown in a pot that is in its place, and its bud is at rest. */
  const budOf = (plant: PageView['plants'][number]): 'wet' | 'dry' | null => {
    if (!view.buds || plant.row === 'border' || away.has(plant.id)) return null
    const pot = pots.indexOf(layout[plant.row][plant.slot])
    if (pot < 0 || live?.pots.get(pot) || live?.buds.get(plant.id)) return null
    return view.dry[pot] === true ? 'dry' : 'wet'
  }
  const sketching = clamp(live?.sketching ?? 1)
  const setKey = [
    view.packets.filter((id) => !live?.packets.get(id)).join(), view.kept.map((entry) => `${entry.kind}${lookCode(entry.look)}`).join(),
    (view.sketched ?? []).join(), sketching < 1 ? 'drawing' : '', view.tools ? `${live?.can ? '' : 'c'}${live?.blotter ? '' : 'b'}` : '',
    live ? [...live.things.keys()].sort().join() : '', live?.resketch ? `again${live.resketch.index}` : '',
    pots.map((_, pot) => (view.dry[pot] === true ? 'd' : 'w') + (live?.pots.get(pot) ? '!' : '')).join(''),
  ].join('|')
  if (!kept.set) kept.set = { key: '', sheet: make(Math.ceil(layout.w * ratio), Math.ceil(layout.h * ratio)) }
  if (kept.set.key !== setKey) {
    const on = kept.set.sheet.ctx
    on.setTransform(ratio, 0, 0, ratio, 0, 0)
    on.globalCompositeOperation = 'source-over'
    on.drawImage(paper.canvas, 0, 0, layout.w, layout.h)
    furniture(brushOn(on, () => { baked++ }), true)
    kept.set.key = setKey
    if (kept.ground) kept.ground.key = ''
  }
  const family = view.plants.map((plant) => [plant.id, plant.pairs, plant.dry ? 1 : 0, plant.row, plant.slot, JSON.stringify(plant.origin)].join()).join(';') + (away.size ? `|${[...away].sort().join()}` : '') + `|${view.focus ?? ''}`
  if (!kept.ground) kept.ground = { key: '', sheet: make(Math.ceil(layout.w * ratio), Math.ceil(layout.h * ratio)) }
  if (kept.ground.key !== family) {
    const on = kept.ground.sheet.ctx
    on.setTransform(ratio, 0, 0, ratio, 0, 0)
    on.globalCompositeOperation = 'source-over'
    on.drawImage(kept.set.sheet.canvas, 0, 0, layout.w, layout.h)
    paintFamily(on, view, layout, away)
    kept.ground.key = family
  }
  put({ canvas: kept.ground.sheet.canvas, x: 0, y: 0, w: layout.w, h: layout.h }, 0, 0, 'source-over')
  if (work) work.kept = baked

  furniture(brush, false)
  drawWish(brush, view, layout, live)
  if (live?.prints.length) { drawSpecks(ctx, live.prints, true); draws++ }

  /** A pod on the flower whose middle is at that point: its stalk comes out from behind the flower and the pod hangs from it, as swollen and as shaken as `live` says. */
  const pod = (x: number, y: number, kk: number, on: number) => {
    const state = live?.pods.find((one) => one.on === on), swell = state ? Math.max(0, state.swell) : 1, px = x + POD.top[0] * kk, py = y + POD.top[1] * kk
    // A pod in the hand is off its plant: it is drawn where the finger has it, with the other things in the hand.
    if (state?.at) return
    ctx.globalCompositeOperation = 'source-over'
    pen(ctx, curve([[x + 14 * kk, y + 5 * kk], [x + 24 * kk, y], [x + 33 * kk, y + 0.5 * kk], [px, py]]), { w: 1.4 * (0.5 + 0.5 * kk), seed: 89, taper: 0.05 })
    const made = sprite(`pod ${kk.toFixed(4)}`, -13 * kk, -5 * kk, 30 * kk, 54 * kk, (sheet) => drawPod(sheet, kk))
    if (swell === 1 && !state?.shake) return put(made, px, py)
    // It grows long first and fat after, and past full it only gets fatter: that is the breath it holds. A shake swings it on its stalk.
    const full = Math.min(1, swell), over = Math.max(0, swell - 1)
    placed(px, py, (state?.shake ?? 0) * 0.35, (0.24 + 0.76 * full ** 1.6) * (1 + 1.1 * over), (0.34 + 0.66 * full) * (1 + 0.1 * over), () => put(made, 0, 0))
  }
  /** Whether a plant at that point stands in some pot, where that pot is now: one that does not shows its root ball. */
  const potted = (x: number, y: number) => pots.some((place, pot) => {
    const moved = live?.pots.get(pot)
    return Math.abs((moved?.at?.x ?? place.x) - x) < 8 * k && Math.abs((moved?.at?.y ?? place.soil) - y) < 16 * k
  })
  const moving = (at: ReturnType<typeof standing>, state: PlantLive, podOn: number | null, bud: 'wet' | 'dry' | null) => {
    // In the air a plant is the kept drawing of the nearer of the two scales, scaled the rest of the way.
    const to = state.at, kk = !to ? at.k : Math.abs(Math.log(to.k / layout.k)) <= Math.abs(Math.log(to.k / layout.small)) ? layout.k : layout.small
    const z = to ? to.k / kk : 1, x = to?.x ?? at.x, y = to?.y ?? at.y, stem = stemHeight(at.look.joints, kk)
    // Out of a pot it shows its root ball: in the hand, or on its way between a pot and the border. A plant of the border
    // that only moves along the border, as when the border closes up, stands in open ground at both ends and shows none.
    if (to && !potted(x, y) && (state.held || to.k > layout.small * 1.02)) {
      if (state.held) under(x, y + 34 * kk * z, 22 * kk * z)
      placed(x, y, state.bend * 0.6, z, z, () => put(sprite(`roots ${kk.toFixed(4)}`, -20 * kk, -4 * kk, 40 * kk, 40 * kk, (on) => drawRoots(on, kk)), 0, 0))
    }
    plantInMotion(brush, () => plantSprite(at.look, kk, false, to ? null : bud), () => plantSprite(at.look, kk, true), stem, kk, state, x, y, z, podOn === null ? null : () => pod(0, -stem, kk, podOn))
  }
  for (const plant of view.plants) {
    const at = standing(plant, layout), state = live?.plants.get(plant.id), podded = view.pods.includes(plant.id) || live?.pods.some((one) => one.on === plant.id) === true
    if (!state) {
      // A plant at rest stands still: it is a working piece, and has no motion of its own at idle.
      put(plantSprite(at.look, at.k, false, budOf(plant)), at.x, at.y)
      if (podded) pod(at.x, at.y - stemHeight(at.look.joints, at.k), at.k, plant.id)
      continue
    }
    const paint = () => moving(at, state, podded ? plant.id : null, budOf(plant))
    // A plant in the hand is over everything. One that stands before a visitor, or rides on it, is under the visitor: the visitor is laid over its own shape and is not seen through it.
    if (state.held && plant.id !== live?.offered) inHand.push(paint)
    else if (state.at) hopping.push(paint)
    else paint()
  }
  for (const paint of hopping) paint()

  const t = seconds(time), sway = (t * 0.21) % 1
  if (live?.worm) {
    // The worm in motion comes up out of the soil, cut off at the soil line, and turns to look: its drawing faces left and is turned over to face right.
    // In a pot that is in the hand, or held out to a visitor, it rides along and looks out of it there.
    const { pot, rise, look, cap } = live.worm, place = pots[pot], s = k * 1.1, held = live.pots.get(pot)?.at ?? null
    if (place && rise > 0.02) {
      const wx = held?.x ?? place.x, wy = held?.y ?? place.soil
      ctx.save()
      ctx.beginPath()
      ctx.rect(wx - 40 * k, wy - 64 * k, 80 * k, 69 * k)
      ctx.clip()
      ctx.translate(wx + 5.5 * k, wy + 2 * k + (1 - clamp(rise)) * 38 * s)
      ctx.scale(look <= 0 ? 0.6 - 0.4 * look : look < 0.3 ? 0.6 - look * 4.4 : -0.6 - 0.4 * look, 1)
      creature(brush, 'worm', -2.5 * k, 0, s, { lean: look * 0.06, look: 0.2, breath: 0, sway }, 0, cap ? () => dustCap(ctx, s) : undefined)
      ctx.restore()
    }
  } else if (view.worm !== null && !live?.pots.get(view.worm)?.at) {
    const place = pots[view.worm]
    if (place) creature(brush, 'worm', place.x + 3 * k, place.soil + 2 * k, k * 1.1, { lean: Math.sin(t * 0.7) * 0.05, look: 0.2, breath: 0, sway })
  }
  drawVisitors(brush, view, layout, live, t)
  if (live?.tow) { drawTow(ctx, [live.tow.from.x, live.tow.from.y], [live.tow.to.x, live.tow.to.y], k); draws++ }
  if (live?.fence) { drawFence(ctx, live.fence, k); draws++ }
  // The bite out of a leaf is bare paper where the leaf's edge was.
  if (live?.nibble) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(live.nibble.x, live.nibble.y, live.nibble.r, 0, Math.PI * 2); ctx.fill(); draws++ }
  drawBeetle(brush, view, layout, live, t, pots)
  {
    // The one strip of tape that will not lie flat: its free end lifts and settles by itself, and lies flat while the
    // beetle presses it. On the lower tiers it does not move by itself, and still answers the beetle.
    const down = Math.max(0, Math.min(1, live?.tapeDown ?? 0))
    const strip = stubbornTape(layout), lift = (tier < 2 ? 0.5 - 0.5 * Math.cos(t * 0.8) : 0.7) * (1 - down)
    ctx.globalCompositeOperation = 'source-over'
    ctx.save()
    ctx.translate(strip.x, strip.y)
    ctx.rotate(strip.turn)
    tape(ctx, 0, 0, 30 * k, 0, 23, 15 * k)
    ctx.translate(15 * k, 0)
    ctx.transform(1, 0, -0.5 * lift, 1 - 0.35 * lift, 0, 0)
    tape(ctx, 9 * k, 0, 18 * k, 0, 24, 15 * k)
    ctx.restore()
    draws++
  }
  if (live) {
    for (const puff of live.puffs) { if (puff.kind === 'splash') drawSplash(ctx, puff, k); else drawPuff(ctx, puff, k); draws++ }
    for (const seed of live.seeds) {
      // A seed is kept at the nearest half scale and scaled the rest of the way, so a small one stays sharp.
      const q = Math.max(0.5, Math.round(seed.k * 2) / 2)
      placed(seed.x, seed.y, seed.turn, seed.k / q, seed.k / q, () => put(sprite(`seed ${q}`, -10 * q, -8 * q, 20 * q, 16 * q, (on) => drawSeed(on, q)), 0, 0))
    }
    // Specks are gold dust, but for the wet ones, which are drops of water.
    const wet = live.motes.some((mote) => mote.wet) ? live.motes.filter((mote) => mote.wet) : null
    if (live.motes.length > (wet?.length ?? 0)) { drawSpecks(ctx, wet ? live.motes.filter((mote) => !mote.wet) : live.motes); draws++ }
    if (wet) { drawDrops(ctx, wet); draws++ }
    if (live.glow.strength > 0) {
      ctx.globalAlpha = clamp(live.glow.strength)
      for (const ring of live.glow.rings) {
        // One pencil circle is kept for each size and turned differently at each place, so no two rings start at the same spot.
        const q = Math.max(8, Math.round(ring.r / 4) * 4), z = (ring.r / q) * (1 + 0.035 * Math.sin(t * 2.4 + ring.x * 0.05))
        placed(ring.x, ring.y, hash(Math.round(ring.x), Math.round(ring.y)) * Math.PI * 2, z, z, () => put(sprite(`ring ${q}`, -q - 5, -q - 5, q * 2 + 10, q * 2 + 10, (on) => paintRing(on, q)), 0, 0))
      }
      ctx.globalAlpha = 1
    }
    for (const paint of inHand) paint()
    for (const one of live.pods) {
      if (!one.at) continue
      // The pod carried: off its stalk, as fat as its breath has made it, swinging a little from the fingertip.
      const over = Math.max(0, one.swell - 1)
      ctx.globalCompositeOperation = 'source-over'
      placed(one.at.x, one.at.y, one.shake * 0.35 + 0.25, 1 + 1.1 * over, 1 + 0.1 * over, () => put(sprite(`pod ${k.toFixed(4)}`, -13 * k, -5 * k, 30 * k, 54 * k, (sheet) => drawPod(sheet, k)), 0, -22 * k))
      draws++
    }
    drawHeld(brush, layout, live)
    if (live.hand && live.hand.opacity > 0) {
      const press = Math.round(clamp(live.hand.press) * 2) / 2, u = 1.55 * k
      ctx.globalAlpha = clamp(live.hand.opacity)
      put(sprite(`hand ${press}`, -12 * u, -5 * u, 72 * u, 88 * u, (on) => paintHand(on, u, press)), live.hand.x, live.hand.y, 'source-over')
    }
  }
  ctx.restore()
  return draws
}
