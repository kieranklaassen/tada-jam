import type { Tier } from './config'
import { Cast, type CastSprites, type Drawn } from './cast'
import { catBody, catTail, dollBody, dollHat, horseBody, horseTail, type DollId } from './figures'
import { handPose, type Guidance, type HandPose } from './guidance'
import { drawOrder, nestOf } from './hit'
import type { Point } from './input'
import { BASKET_BOX, LYING, RIM_Y, insideOrder, sizeIn } from './basket'
import { BASKET, MAT, bodiesOverlap } from './layout'
import { FLIP, archAngle, silkHeap as heapOf } from './motion'
import { HUE, ellipse, makeCanvas, stamp, veilOf, type Canvas, type Ctx, type Sprite } from './paper'
import { ARCH_RING } from './pieces'
import { archSprite, basketBack, basketFront, basketMouth, cloudSprite, handSprite, haloSprite, moteSprite, silkDrape, silkHeap, silkLying, silkSpread, sunSprite, type ArchId } from './props'
import { paintBackdrop, paintScenery, type Extent } from './scenery'
import { topOf as shapeTop } from './shape'
import { STAGE, fit, toStage, type Fit } from './stage'
import { drapeOf, stand, type Stand } from './stack'
import type { Piece } from './thing'
import type { World } from './world'

export type { Drawn } from './cast'

// The view: the world drawn as kite paper on a window. A frame is one stamp of the painted setting, then
// sprites laid with `multiply` so papers deepen where they overlap, then the few fresh strokes of the faces.
// It reads the world and its clock and nothing else: no time of its own, no chance, no state that the world
// does not hold.

type Sprites = CastSprites & {
  arch: Record<ArchId, Sprite>
  /** Each thing's own outline in the pane's pale colour, laid under it where it stands in front of another (paper.ts). */
  veil: { arch: Record<ArchId, Sprite>; body: Record<DollId, Sprite>; horse: Sprite; drape: Sprite }
  lying: Sprite; spread: Sprite; heap: Sprite; drape: Sprite; basketFront: Sprite; basketBack: Sprite; basketMouth: Sprite; sun: Sprite; cloudA: Sprite; cloudB: Sprite; halo: Sprite; mote: Sprite; hand: Sprite
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

export class RainbowView {
  private readonly ctx: Ctx
  private readonly seed: number
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private dpr = 1
  private density = 0
  private motes = 0
  private sprites: Sprites | null = null
  private layer: Canvas | null = null
  private extent: Extent = { left: 0, top: 0, right: STAGE.width, bottom: STAGE.height }
  private readonly handOut: HandPose = { travel: 0, press: 0, opacity: 0 }
  private readonly at: Stand = { x: 0, y: 0, rot: 0 }
  readonly drawn: Drawn = { stamps: 0, pen: 0, fullSurface: 0 }
  private readonly cast = new Cast(this.drawn)

  constructor(canvas: Pick<HTMLCanvasElement, 'getContext'>, seed: number) {
    this.ctx = canvas.getContext('2d')!
    this.seed = seed
  }

  /** What a tier sets besides the pixel ratio: how many motes of light drift on the pane. */
  setTier(tier: Tier): void {
    this.motes = tier.motes
  }

  /** The surface's size in CSS pixels and its pixel ratio. Everything is cut again at that density and the setting is painted again. */
  resize(width: number, height: number, dpr: number): void {
    this.dpr = dpr
    this.by = fit(width, height)
    const s = this.by.scale
    if (s <= 0) return
    this.extent = { left: -this.by.x / s, top: -this.by.y / s, right: (width - this.by.x) / s, bottom: (height - this.by.y) / s }
    const density = dpr * s
    if (density !== this.density || !this.sprites) {
      this.density = density
      const seed = this.seed
      const arch = { 'arch-large': archSprite(density, seed, 'arch-large', 1), 'arch-middle': archSprite(density, seed, 'arch-middle', 2), 'arch-small': archSprite(density, seed, 'arch-small', 3) }
      const body = { 'doll-tall': dollBody(density, seed, 'doll-tall', 4), 'doll-round': dollBody(density, seed, 'doll-round', 6), 'doll-small': dollBody(density, seed, 'doll-small', 8) }
      const horse = horseBody(density, seed), drape = silkDrape(density, seed)
      this.sprites = {
        arch, body, horse,
        veil: {
          arch: { 'arch-large': veilOf(arch['arch-large'], density), 'arch-middle': veilOf(arch['arch-middle'], density), 'arch-small': veilOf(arch['arch-small'], density) },
          body: { 'doll-tall': veilOf(body['doll-tall'], density), 'doll-round': veilOf(body['doll-round'], density), 'doll-small': veilOf(body['doll-small'], density) },
          horse: veilOf(horse, density),
          drape: veilOf(drape, density),
        },
        hat: { 'doll-tall': dollHat(density, seed, 'doll-tall', 10), 'doll-round': dollHat(density, seed, 'doll-round', 12), 'doll-small': dollHat(density, seed, 'doll-small', 14) },
        tail: horseTail(density, seed), cat: catBody(density, seed), catTail: catTail(density, seed),
        lying: silkLying(density, seed), spread: silkSpread(density, seed), heap: silkHeap(density, seed), drape, basketFront: basketFront(density, seed), basketBack: basketBack(density, seed), basketMouth: basketMouth(density, seed, LYING.r, LYING.opening), sun: sunSprite(density, seed),
        cloudA: cloudSprite(density, seed, 62, HUE.blue), cloudB: cloudSprite(density, seed, 64, HUE.pink), halo: haloSprite(density), mote: moteSprite(density), hand: handSprite(density),
      }
    }
    this.layer = makeCanvas(Math.round(width * dpr), Math.round(height * dpr))
    this.toStageUnits(this.layer.ctx)
    paintScenery(this.layer.ctx, this.extent, this.seed)
  }

  /** A touch in the surface's CSS pixels, as a point of the stage. */
  toStage(at: Point): Point {
    return toStage(at, this.by)
  }

  private toStageUnits(ctx: Ctx): void {
    const k = this.dpr * this.by.scale
    ctx.setTransform(k, 0, 0, k, this.dpr * this.by.x, this.dpr * this.by.y)
  }

  /** Draws the frame. With no world yet (the save is still being read) it draws the bare garden. */
  draw(world: World | null, guidance: Guidance | null): Drawn {
    const ctx = this.ctx, drawn = this.drawn, sprites = this.sprites
    drawn.stamps = 0; drawn.pen = 0; drawn.fullSurface = 0
    if (this.by.scale <= 0) return drawn
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    if (!world || !sprites || !this.layer) {
      this.toStageUnits(ctx)
      paintBackdrop(ctx, this.extent)
      return drawn
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(this.layer.image, 0, 0)
    drawn.stamps += 1; drawn.fullSurface += 1
    this.toStageUnits(ctx)
    const t = world.time, held = world.held
    // While a scene plays nothing is offered: the scene is the one thing to watch.
    const guide = world.scene ? null : guidance, glow = guide ? guide.glow : 0

    this.hangings(ctx, sprites, t)
    // The mat lights up at its edge while a thing is in hand: that is where it can go.
    if (held) {
      ctx.strokeStyle = '#fffbe0'
      ctx.globalAlpha = 0.45 + 0.2 * Math.sin(t * 3.2) + 0.3 * glow
      ctx.lineWidth = 12
      ctx.beginPath()
      ellipse(ctx, MAT.x, MAT.y, MAT.rx - 4, MAT.ry - 4)
      ctx.stroke()
      ctx.globalAlpha = 1
      drawn.pen += 1
    }
    this.rings(ctx, world.ripples, t, 1.2, 150, 0.42, 6)
    // Shade under every thing that stands on the ground, all in one fill: smaller the higher the thing is.
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = 'rgba(150,160,200,0.3)'
    ctx.beginPath()
    for (const p of world.pieces) {
      if (p.on !== null || p.far >= 1) continue
      const high = 1 - clamp((p.lift + p.hop) / 150, 0, 0.7)
      ctx.moveTo(p.px + p.def.reach * 0.9 * high, p.py + 2)
      ellipse(ctx, p.px, p.py + 2, p.def.reach * 0.9 * high, 8 * high)
    }
    ctx.fill()
    drawn.pen += 1

    // What lies by the mat, with the light round what can be touched; the basket and the cat; then what stands
    // on the mat, back to front, each stack from the bottom up; then the thing in hand. The order is hit.ts's,
    // so a touch finds things in the order they are drawn.
    const order = drawOrder(world.pieces, held)
    if (glow > 0 && !held) {
      ctx.globalCompositeOperation = 'source-over'
      const nest = nestOf(world.pieces, held)
      // The light is round what lies by the mat. When nothing lies there, it is round the things on the mat that the hand will show.
      const offered = order.some((p) => p.at === 'home') ? [] : world.offered()
      for (const p of order) {
        if (!offered.includes(p) && (p.at !== 'home' || (p.def.kind === 'arch' && p !== nest))) continue
        stamp(ctx, sprites.halo, p.px, p.py - p.def.height * 0.5, 0, (p.def.halfWidth + 34) / 62, (p.def.height * 0.5 + 34) / 62, glow * (0.7 + 0.2 * Math.sin(t * 3)))
        drawn.stamps += 1
      }
    }
    let i = 0
    for (; i < order.length && order[i].at === 'home' && order[i] !== held; i++) this.piece(ctx, sprites, world, order[i], false, false)
    this.basket(ctx, sprites, world)
    this.cast.cat(ctx, sprites, world)
    for (; i < order.length; i++) this.piece(ctx, sprites, world, order[i], order[i] === held, this.inFront(order, i))

    ctx.globalCompositeOperation = 'source-over'
    this.rings(ctx, world.tinks, t, 0.8, 46, 1, 3)
    // The idle hand shows one thing a child could do, and a different one each time it comes back.
    const to = guide && guide.demo !== null ? world.offers()[guide.demoIndex] : undefined
    if (guide && guide.demo !== null && to) {
      const hand = handPose(guide.demo, false, this.handOut)
      stamp(ctx, sprites.hand, to.x + 4, to.y + 22 - 16 * hand.press, -0.16, 1 - 0.07 * hand.press, 1 - 0.07 * hand.press, hand.opacity)
      drawn.stamps += 1
    }
    ctx.globalAlpha = 1
    return drawn
  }

  /**
   * Whether the thing at `index` dims what is behind it, so that two papers never read as one: a thing that
   * rests on another or is in the hand always does (it stands before its bearer, or before the hills), and a
   * thing on the bare mat does where it stands in front of another thing's body.
   */
  private inFront(order: readonly Piece[], index: number): boolean {
    const p = order[index]
    if (p.def.kind === 'silk') return false
    if (p.on !== null || p.lift > 1) return true
    for (let i = 0; i < index; i++) {
      const q = order[i]
      if (q.on === null && bodiesOverlap(p.def, p.px, p.py - p.lift, q.def, q.px, q.py - q.lift)) return true
    }
    return false
  }

  /**
   * The basket, upright or on its side, and what looks out of it. Its wicker lets nothing through, so a thing
   * in it shows only where it looks over the rim of the upright basket or out of the mouth of the lying one,
   * and whatever does not look out is not drawn. While the basket swings over, nothing in it shows.
   */
  private basket(ctx: Ctx, sprites: Sprites, world: World): void {
    const s = world.time - world.basketAt, tip = world.tip, shake = s < 2 ? 0.1 * Math.exp(-3.2 * s) * Math.sin(15 * s) : 0
    const x = BASKET.x + (LYING.x - BASKET.x) * tip, y = BASKET.y + (LYING.y + LYING.r - BASKET.y) * tip, turn = shake - (tip * Math.PI) / 2
    ctx.globalCompositeOperation = 'source-over'
    // On its side it is a round disc, and a disc turned about its middle shows nothing: at a tap it gives under the finger, from the frame of the tap, and rings out.
    const jolt = s < 1 ? 0.07 * Math.exp(-6 * s) * Math.cos(15 * s) : 0
    if (tip > 0) { stamp(ctx, sprites.basketMouth, LYING.x, LYING.y, shake, 1 + jolt, 1 - jolt, tip); this.drawn.stamps += 1 }
    if (tip < 1) { stamp(ctx, sprites.basketBack, x, y, turn, 1, 1, 1 - tip); this.drawn.stamps += 1 }
    if (tip === 0 || tip === 1) {
      const k = sizeIn(1, tip), edge = tip === 1 ? LYING.y + LYING.opening : RIM_Y
      // Only what reaches into the mouth is drawn at all.
      const inside = insideOrder(world.pieces).filter((p) => stand(world.pieces, p, this.at).y - shapeTop(p.def.id) * k < edge)
      if (inside.length > 0) {
        ctx.save()
        ctx.beginPath()
        if (tip === 1) ellipse(ctx, LYING.x, LYING.y, LYING.opening, LYING.opening)
        else ctx.rect(BASKET_BOX.left, RIM_Y - 400, BASKET_BOX.right - BASKET_BOX.left, 400)
        ctx.clip()
        for (const p of inside) this.piece(ctx, sprites, world, p, false, true)
        ctx.restore()
        ctx.globalCompositeOperation = 'source-over'
      }
    }
    if (tip < 1) { stamp(ctx, sprites.basketFront, x, y, turn, 1, 1, 1 - tip); this.drawn.stamps += 1 }
  }

  /** What hangs in the window on threads and sways: a sun and two clouds. Then the motes of light on the pane. */
  private hangings(ctx: Ctx, sprites: Sprites, t: number): void {
    const top = Math.min(0, this.extent.top)
    const hung: [Sprite, number, number, number, number, number][] = [[sprites.sun, 232, 104, 0.05, 0.7, 0], [sprites.cloudA, 700, 44, 0.08, 0.5, 1], [sprites.cloudB, 968, 92, 0.06, 0.43, 2.2]]
    ctx.strokeStyle = 'rgba(120,130,150,0.5)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    for (const [, x, length, swing, hz, phase] of hung) {
      const a = swing * Math.sin(t * hz * Math.PI * 2 * 0.3 + phase)
      ctx.moveTo(x, top)
      ctx.lineTo(x + Math.sin(a) * (length - top), top + Math.cos(a) * (length - top))
    }
    ctx.stroke()
    this.drawn.pen += 1
    ctx.globalCompositeOperation = 'multiply'
    for (const [sprite, x, length, swing, hz, phase] of hung) {
      const a = swing * Math.sin(t * hz * Math.PI * 2 * 0.3 + phase)
      stamp(ctx, sprite, x + Math.sin(a) * (length - top), top + Math.cos(a) * (length - top), sprite === sprites.sun ? t * 0.1 : -a)
      this.drawn.stamps += 1
    }
    ctx.globalCompositeOperation = 'source-over'
    for (let i = 0; i < this.motes; i++) {
      const drift = (i * 173.3 + (this.seed % 97) * 11 + t * (5 + (i % 3) * 3)) % (STAGE.width + 40) - 20
      stamp(ctx, sprites.mote, drift, 90 + ((i * 97) % 520) + Math.sin(t * 0.3 + i) * 22, 0, 1, 1, 0.4 + 0.3 * Math.sin(t * 0.8 + i * 2))
      this.drawn.stamps += 1
    }
  }

  /** Rings that open and fade: in the mat's paper where something landed, on the pane where a finger tapped. */
  private rings(ctx: Ctx, rings: readonly { x: number; y: number; at: number }[], t: number, life: number, reach: number, flat: number, width: number): void {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = '#ffffff'
    for (const ring of rings) {
      const s = (t - ring.at) / life
      if (s < 0 || s >= 1) continue
      ctx.globalAlpha = (1 - s) * 0.9
      ctx.lineWidth = width * (1 - s) + 1
      ctx.beginPath()
      ellipse(ctx, ring.x, ring.y, 16 + reach * s, (16 + reach * s) * flat)
      ctx.stroke()
      this.drawn.pen += 1
    }
    ctx.globalAlpha = 1
  }

  private piece(ctx: Ctx, sprites: Sprites, world: World, p: Piece, inHand: boolean, veil: boolean): void {
    const t = world.time, id = p.def.id, at = stand(world.pieces, p, this.at)
    if (inHand && !p.flight && world.hand?.mode === 'held') at.y -= 3 * Math.sin(t * 5)
    const x = at.x, y = at.y
    // A thing in the basket is a little way in, and smaller for it.
    const squash = clamp(p.squash, -0.5, 0.6), k = sizeIn(p.far, world.tip), sx = (1 + squash * 0.3) * k, sy = (1 - squash * 0.42) * k
    ctx.globalCompositeOperation = 'multiply'
    if (p.def.kind === 'doll') return this.cast.doll(ctx, sprites, world, p, at, sx, sy, inHand, veil)
    if (p.def.kind === 'horse') return this.cast.horse(ctx, sprites, world, p, at, sx, sy, inHand, veil)
    if (p.def.kind === 'arch') {
      const since = t - p.turnAt, a = archAngle(since, p.turned), outer = ARCH_RING[id as ArchId].outer
      // On its back it lies on its crown, so its middle is a radius up, and it rolls as it rocks. Its lean and any spin turn it further.
      const ax = x + (p.turned && since >= FLIP ? outer * (a - Math.PI) * 0.6 : 0), ay = y - (outer * (1 - Math.cos(a))) / 2, turn = a + at.rot + p.spin
      if (veil) {
        ctx.globalCompositeOperation = 'source-over'
        stamp(ctx, sprites.veil.arch[id as ArchId], ax, ay, turn, sx, sy, 0.55)
        ctx.globalCompositeOperation = 'multiply'
        this.drawn.stamps += 1
      }
      stamp(ctx, sprites.arch[id as ArchId], ax, ay, turn, sx, sy)
      this.drawn.stamps += 1
      return
    }
    // The silk: draped over what it rests on, lying in folds by the mat, in a heap in the basket, and otherwise spread flat or gathered.
    const drape = drapeOf(world.pieces, p)
    if (drape) {
      // A hammock hangs from the cradle's rim and dips into it; over anything else the silk is a drape as wide and as high as what it covers, a whole nest of arches as its outermost one. A touch goes by the same numbers (stack.ts).
      const dy = drape.rim, kx = (drape.wide / 100) * sx, ky = (drape.high / 100) * sy
      // What is under the cloth shows through it dimmed, so the cloth keeps its own colour.
      ctx.globalCompositeOperation = 'source-over'
      stamp(ctx, sprites.veil.drape, x, y - dy, at.rot, kx, ky, 0.5)
      ctx.globalCompositeOperation = 'multiply'
      stamp(ctx, sprites.drape, x, y - dy, at.rot, kx, ky)
      this.drawn.stamps += 2
      return
    }
    if (p.at === 'basket' || p.far > 0) { stamp(ctx, sprites.heap, x, y, at.rot, 0.8 * k, 0.8 * k); this.drawn.stamps += 1; return }
    const heap = heapOf(t - p.turnAt, p.turned)
    if (p.at === 'home' && !inHand && !p.flight && !p.led) {
      // Turned over at its place it gathers into a heap, and turned again it falls open into its folds.
      if (heap < 1) { stamp(ctx, sprites.lying, x, y, 0, sx * (1 - 0.3 * heap), sy * (1 - 0.25 * heap), 1 - heap); this.drawn.stamps += 1 }
      if (heap > 0) { stamp(ctx, sprites.heap, x, y, 0, sx * (0.8 + 0.4 * heap), sy * (0.6 + 0.5 * heap), heap); this.drawn.stamps += 1 }
      return
    }
    const air = p.flight ? 1 - p.flight.t / p.flight.dur : 0
    // It ripples once when anything lands on the mat.
    const stir = t - world.landedAt, wave = p.at === 'mat' && stir < 1 ? 0.07 * Math.exp(-5 * stir) * Math.sin(18 * stir) : 0
    if (heap < 1) { stamp(ctx, sprites.spread, x, y, at.rot + 0.22 * Math.sin(t * 7) * air, sx * (1 - 0.4 * heap) * (1 + wave), sy * (1 - 0.3 * heap) * (1 - wave), 1 - heap); this.drawn.stamps += 1 }
    if (heap > 0) { stamp(ctx, sprites.heap, x, y, at.rot, sx * (0.7 + 0.3 * heap), sy * (0.5 + 0.5 * heap), heap); this.drawn.stamps += 1 }
  }
}
