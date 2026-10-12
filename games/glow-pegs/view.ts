import { paintBackdrop, paintPile, pileBox } from './backdrop'
import { CAP_ACROSS, fullBeam, halfShape, onBoard } from './beam'
import { drawBlooms } from './blooms'
import { BLUE, BOARD, COLOURS, GREEN, HOLES, ORIGIN, PEG_RADIUS, PITCH, RED, WHITE, YELLOW, centreOf, holeAt, type Colour } from './board'
import type { Tier } from './config'
import { fallerAt, type FallerPlace } from './fallers'
import { drawGecko, drawHand, drawHandle, drawMoth, drawSpider } from './figures'
import { GuideTurn, guideFor } from './guide'
import { handPose, type Guidance, type HandPose } from './guidance'
import { BULBS, BUTTONS, BUTTON_HALF, ECHO_LINE, HANDLE, LEVER, SPEAKER, VALVE, handPlace, keyMarks, knobAt, wellMouth } from './layout'
import { BEAM_HEIGHT, INK, PEG_INK, SPRITE, dashes, fillInk, glow, makeSprites, ring, rubOut, stamp, stampAt, tally, type Ctx, type MakeCanvas, type Sprites, type Stamp } from './pen'
import { fit, type Fit } from './stage'
import { FLASH_FOR, HANDLE_RATTLE, PILE_RATTLE, columnX, handleGlint, handleSwing, liveScale, type Flash, type Toy } from './toy'

// The view. Two canvases lie one over the other. The still layer holds the
// cabinet and every peg that stands still; it is painted once when the
// surface is sized, and after that only the cell of a hole that changed. The
// live layer holds whatever moves, and is never wiped while the game plays:
// each frame it is faded a little and the movers are drawn over it, so they
// leave a phosphor trail. That fade is the frame's one full-surface pass.
// A frame's draw count is what it stamped, stroked and filled on the live
// layer; the still layer costs a frame nothing. What rests is stamped: a
// watcher that is doing nothing is one drawing made beforehand and its pupils.

/** How strong the wide dim pass under a moving line is, once it has settled. */
const HALO = 0.34

/** How strong a half beam's band is: dim beside the full beam and beside a peg's cap. */
export const HALF_LIGHT = 0.34

/** The boxes the two watchers are drawn in while they rest, and the handle's. */
const SPIDER_BOX = { x: -12, y: 84, width: 210, height: 316 } as const
const GECKO_BOX = { x: 916, y: 116, width: 192, height: 466 } as const
const HANDLE_BOX = { x: HANDLE.x - 44, y: HANDLE.top, width: 88, height: 92 } as const
const KNOB = LEVER.knob * 2 + 12
/** The side of the peg sprite stamped on the key that is down: its cap as large as the key's peg. */
const KEY_PEG = (SPRITE * keyMarks(0).peg.r) / (PEG_RADIUS - 2)

/** The drawings made once. The gecko's is made for the way its head leans, and made again when that has changed and settled. */
type Made = { spider: Stamp; gecko: Stamp; neck: { x: number; y: number }; handle: Stamp; knob: HTMLCanvasElement; piles: Record<Colour, Stamp> }

const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3

export class ToyView {
  /** One scale and offset from the surface's size in CSS pixels, for the draw and for every touch. */
  fit: Fit = { scale: 0, x: 0, y: 0 }
  /** What the last frame drew on the live layer: stamps, strokes and fills. */
  draws = 0
  private readonly still: Ctx
  private readonly live: Ctx
  private sprites: Sprites | null = null
  private made: Made | null = null
  private ratio = 1
  private width = 0
  private height = 0
  private stale = true
  /** The toy the still layer was last painted whole for: the bare cabinet is painted before the save has been read. */
  private paintedFor: Toy | null = null
  private tier: Tier = { dpr: 2, trail: 0.11, halo: true, shimmer: true }
  private readonly turn = new GuideTurn()
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private readonly lastNeck = { x: 0, y: 0 }
  private readonly place: FallerPlace = { x: 0, y: 0, x2: 0, y2: 0, halves: false, first: false, second: false, shine: 1 }

  constructor(still: HTMLCanvasElement, live: HTMLCanvasElement, private readonly make: MakeCanvas, private readonly scan: HTMLElement | null = null) {
    this.still = still.getContext('2d') as Ctx
    this.live = live.getContext('2d') as Ctx
  }

  setTier(tier: Tier): void {
    if (tier.halo !== this.tier.halo) this.made = null
    this.tier = tier
  }

  /** The surface was sized: `width` and `height` in CSS pixels, and the pixel ratio. Sprites are made again at that density. */
  resize(width: number, height: number, ratio: number): void {
    this.width = width
    this.height = height
    this.ratio = ratio
    this.fit = fit(width, height)
    this.stale = true
    this.made = null
    if (this.fit.scale > 0) this.sprites = makeSprites(this.make, ratio * this.fit.scale)
  }

  /** The drawings that are made once and stamped while their subject rests. */
  private one(box: { x: number; y: number; width: number; height: number }, draw: (ctx: Ctx) => void): Stamp {
    const k = this.ratio * this.fit.scale
    const image = this.make(Math.round(box.width * k), Math.round(box.height * k))
    const ctx = image.getContext('2d') as Ctx
    ctx.setTransform(k, 0, 0, k, -box.x * k, -box.y * k)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    draw(ctx)
    return { image, ...box }
  }

  /** The gecko's stamp alone, for the way its head leans now. The pose is the one the toy gives for it at rest, so the stamp is the very drawing it replaces. */
  private makeGecko(toy: Toy, into: { gecko: Stamp; neck: { x: number; y: number } }): void {
    const gecko = toy.gecko.act === null ? toy.geckoPose() : { slide: 0, tremble: 0, tongue: 0, curl: 0, wag: 0, belly: 0, lids: [0, 0] as [number, number], pupil: 1, mouth: 0, slip: 0, rolling: 0, roll: 0, cross: 0, nod: 0 }
    const neck = { x: toy.neck.x, y: toy.neck.y }
    into.gecko = this.one(GECKO_BOX, (ctx) => drawGecko(ctx, gecko, { x: 590, y: 330 }, this.tier.halo ? HALO : 0, neck, 'body'))
    into.neck = neck
  }

  private makeStamps(toy: Toy): Made {
    const one = this.one.bind(this)
    const halo = this.tier.halo ? HALO : 0
    const at = { x: 590, y: 330 }
    const spider = toy.spider.act === null ? toy.spiderPose() : { drop: 0, swing: 0, squash: 0, eyeSpread: 0, lids: 0, cover: 0, feet: [0, 0, 0, 0] as [number, number, number, number], shake: 0, strand: 0 }
    const knobBox = { x: 0, y: 0, width: KNOB, height: KNOB }
    const piles = {} as Record<Colour, Stamp>
    for (const colour of COLOURS) piles[colour] = one(pileBox(colour), (ctx) => paintPile(ctx, colour, true))
    const leaning = {} as { gecko: Stamp; neck: { x: number; y: number } }
    this.makeGecko(toy, leaning)
    return {
      spider: one(SPIDER_BOX, (ctx) => drawSpider(ctx, spider, at, halo, 'body')),
      ...leaning,
      piles,
      handle: one(HANDLE_BOX, (ctx) => drawHandle(ctx, 0, 0)),
      // The lever's knob: a fat amber cap, solid like a peg and larger than one.
      knob: one(knobBox, (ctx) => {
        const r = LEVER.knob, c = KNOB / 2
        const body = ctx.createRadialGradient(c - r * 0.35, c - r * 0.4, 2, c, c, r)
        body.addColorStop(0, '#fff0cf')
        body.addColorStop(0.45, INK.touch)
        body.addColorStop(1, '#7a4208')
        ctx.fillStyle = body
        ctx.beginPath()
        ctx.arc(c, c, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.globalAlpha = 0.8
        ctx.beginPath()
        ctx.ellipse(c - r * 0.4, c - r * 0.48, r * 0.24, r * 0.13, -0.7, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }).image,
    }
  }

  private stageTransform(ctx: Ctx): void {
    const k = this.ratio * this.fit.scale
    ctx.setTransform(k, 0, 0, k, this.ratio * this.fit.x, this.ratio * this.fit.y)
  }

  private wipe(ctx: Ctx, black: boolean): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    if (black) {
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, this.width * this.ratio, this.height * this.ratio)
    } else ctx.clearRect(0, 0, this.width * this.ratio, this.height * this.ratio)
  }

  private paintStill(toy: Toy | null): void {
    const ctx = this.still
    this.wipe(ctx, true)
    this.stageTransform(ctx)
    paintBackdrop(ctx)
    for (let hole = 0; hole < HOLES; hole++) this.paintCell(toy, hole, false)
    this.stale = false
    this.paintedFor = toy
  }

  /** One hole's cell on the still layer: black, then its peg, or the pit of an empty hole. A peg that is still springing is on the live layer. */
  private paintCell(toy: Toy | null, hole: number, clear: boolean): void {
    const ctx = this.still, sprites = this.sprites!, at = centreOf(hole)
    if (clear) {
      ctx.fillStyle = '#000000'
      ctx.fillRect(at.x - PITCH / 2, at.y - PITCH / 2, PITCH, PITCH)
    }
    const colour = toy ? (toy.shown[hole] as Colour | 0) : 0
    if (colour === 0) ctx.drawImage(sprites.pit, at.x - SPRITE / 2, at.y - SPRITE / 2, SPRITE, SPRITE)
    else if (!toy!.live.some((peg) => peg.hole === hole)) ctx.drawImage(sprites.peg[colour], at.x - SPRITE / 2, at.y - SPRITE / 2, SPRITE, SPRITE)
  }

  /**
   * Draws a frame. `toy` is null until the save has been read: the bare cabinet. `step` is the seconds of play
   * the frame advances, 0 for a draw outside a frame, which wipes the live layer and draws it whole.
   */
  draw(toy: Toy | null, step: number, guidance: Guidance | null): void {
    if (this.fit.scale <= 0 || !this.sprites) return
    if (this.stale || this.paintedFor !== toy) {
      this.paintStill(toy)
      if (toy) toy.changed.length = 0
    } else if (toy && toy.changed.length > 0) {
      this.stageTransform(this.still)
      for (const hole of toy.changed) this.paintCell(toy, hole, true)
      toy.changed.length = 0
    }
    if (toy && !this.made) this.made = this.makeStamps(toy)
    // The gecko's head has come to rest somewhere new: its drawing alone is made again.
    if (toy && this.made && toy.gecko.act === null && this.leans(toy) && this.neckStill(toy)) this.makeGecko(toy, this.made)
    const ctx = this.live
    tally.stamps = tally.strokes = tally.fills = 0
    let settled = 1
    if (step > 0 && this.tier.trail > 0) {
      // The phosphor: what is there fades by a share that follows the step, so the trail is as long at any frame rate.
      settled = 1 - Math.exp(-step / this.tier.trail)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = `rgba(0, 0, 0, ${settled.toFixed(3)})`
      ctx.fillRect(0, 0, this.width * this.ratio, this.height * this.ratio)
      ctx.globalCompositeOperation = 'source-over'
    } else this.wipe(ctx, false)
    this.stageTransform(ctx)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // A wide pass is added a share at a time, so that it settles at its strength instead of piling up.
    const halo = this.tier.halo ? HALO * settled : 0
    if (toy) {
      this.drawBoard(ctx, toy, halo)
      this.drawCabinet(ctx, toy, halo)
      this.drawGuidance(ctx, toy, guidance)
    }
    this.draws = tally.stamps + tally.strokes + tally.fills
    if (this.scan && toy && this.tier.shimmer && step > 0) {
      this.scan.style.opacity = (0.55 + 0.12 * Math.sin(toy.time * 1.7)).toFixed(3)
      this.scan.style.backgroundPositionY = `${((toy.time * 5) % 3).toFixed(2)}px`
    }
  }

  /** The gecko's head leans another way than its stamped drawing has it. */
  private leans(toy: Toy): boolean {
    return Math.hypot(toy.neck.x - this.made!.neck.x, toy.neck.y - this.made!.neck.y) > 0.4
  }

  /** The gecko's head has stopped moving, so its drawing can be made again and stamped. */
  private neckStill(toy: Toy): boolean {
    const still = Math.hypot(toy.neck.x - this.lastNeck.x, toy.neck.y - this.lastNeck.y) < 0.01
    this.lastNeck.x = toy.neck.x
    this.lastNeck.y = toy.neck.y
    return still
  }

  /** The board's movers: what rests and is stamped, the springing pegs, the light of the beam, the blooms and the pegs in the air. */
  private drawBoard(ctx: Ctx, toy: Toy, halo: number): void {
    const sprites = this.sprites!, made = this.made!
    const spiderRests = toy.spider.act === null && toy.joltAge > 0.5, geckoRests = toy.gecko.act === null && !this.leans(toy)
    const hand = handPlace(toy.hand)
    // What is stamped with a soft edge is rubbed out first, or it would pile up on the phosphor.
    ctx.beginPath()
    ring(ctx, hand.x, hand.y, SPRITE * 0.72)
    const keyPeg = keyMarks(toy.mirror).peg
    ring(ctx, keyPeg.x, keyPeg.y + 1.5, KEY_PEG * 0.6)
    for (const peg of toy.live) {
      const at = centreOf(peg.hole)
      ring(ctx, at.x, at.y, SPRITE * 0.72)
    }
    if (spiderRests) ctx.rect(SPIDER_BOX.x, SPIDER_BOX.y, SPIDER_BOX.width, SPIDER_BOX.height)
    if (geckoRests) ctx.rect(GECKO_BOX.x, GECKO_BOX.y, GECKO_BOX.width, GECKO_BOX.height)
    rubOut(ctx)

    // The beam: a soft bar on its column, and each half beam a dim band along its row. They are added a share at a time.
    const share = Math.min(1, halo > 0 || this.tier.halo ? (halo / HALO) * 1.5 : 1)
    const beam = fullBeam(toy.beams)
    if (beam && onBoard(beam)) {
      ctx.globalAlpha = share
      ctx.drawImage(sprites.beam, columnX(beam.col) - PITCH / 2, BOARD.y - 10, PITCH, BEAM_HEIGHT)
      ctx.globalAlpha = 1
      tally.stamps += 1
    }
    // Half beams: each a soft dim band along the row of the yellow peg that split it, its height and length by the column it was
    // split off in. It lies behind a peg: where one stands in its cell the cap is left out of the band, so the band shows beside
    // the cap, and never above it, below it or across its face.
    let halves = false
    ctx.beginPath()
    for (const half of toy.beams) {
      if (!half.half) continue
      const x = columnX(half.col), y = ORIGIN.y + half.row * PITCH, shape = halfShape(half.from)
      ctx.moveTo(x + shape.reach, y)
      ctx.ellipse(x, y, shape.reach, shape.tall / 2, 0, 0, Math.PI * 2)
      if (toy.shown[holeAt(half.col, half.row)] !== 0) {
        ctx.moveTo(x + CAP_ACROSS / 2, y)
        ctx.arc(x, y, CAP_ACROSS / 2, 0, Math.PI * 2, true)
      }
      halves = true
    }
    if (halves) fillInk(ctx, PEG_INK[YELLOW], HALF_LIGHT * share, true)
    this.drawFlashes(ctx, toy.flashes, share)

    drawBlooms(ctx, toy.blooms)
    if (toy.kickAge < 0.3) {
      // A red peg kicks the bezel: its outline jumps outward and falls back.
      const out = 9 * Math.sin((toy.kickAge / 0.3) * Math.PI)
      ctx.beginPath()
      ctx.rect(BOARD.x - 10 - out, BOARD.y - 10 - out, BOARD.width + 20 + out * 2, BOARD.height + 20 + out * 2)
      glow(ctx, INK.bezel, 3, 0, 1 - toy.kickAge / 0.3)
    }
    if (toy.leverDown) {
      // The edge the beam comes in at is lit for as long as the lever is down.
      ctx.beginPath()
      ctx.moveTo(BOARD.x - 7, BOARD.y - 2)
      ctx.lineTo(BOARD.x - 7, BOARD.y + BOARD.height + 2)
      glow(ctx, INK.touch, 3.2, 0, 0.55 + 0.25 * Math.sin(toy.time * 9))
    }

    // A tapped well's whole pile rattles: one drawing of it, stamped over the still one, hops and shakes.
    for (const colour of COLOURS) {
      const age = toy.pileAge[colour]
      if (age >= PILE_RATTLE) continue
      const pile = made.piles[colour], fade = 1 - age / PILE_RATTLE
      ctx.drawImage(pile.image, pile.x + 2.5 * Math.sin(age * 80) * fade, pile.y - 7 * Math.abs(Math.sin(age * 34)) * fade, pile.width, pile.height)
      tally.stamps += 1
    }
    // The peg in hand stands up out of its pile, and hops when its well is tapped.
    const hop = toy.wellAge[toy.hand]
    stamp(ctx, sprites.peg[toy.hand], hand.x, hand.y - 14 * Math.exp(-7 * hop) * Math.abs(Math.sin(hop * 14)), SPRITE * (1.08 + 0.2 * Math.exp(-9 * hop)))
    for (const peg of toy.live) {
      const at = centreOf(peg.hole)
      // A white peg hangs dark for a breath before it lights.
      if (!peg.lit) ctx.globalAlpha = 0.28
      stamp(ctx, sprites.peg[peg.colour], at.x, at.y, SPRITE * liveScale(peg))
      ctx.globalAlpha = 1
    }
    for (const faller of toy.fallers) {
      const place = fallerAt(faller, this.place), image = sprites.peg[faller.colour]
      ctx.globalAlpha = place.shine
      if (place.halves) {
        if (place.first) stamp(ctx, image, place.x, place.y, SPRITE * 0.62)
        if (place.second) stamp(ctx, image, place.x2, place.y2, SPRITE * 0.5)
      } else if (place.first) stamp(ctx, image, place.x, place.y, SPRITE * 0.92)
      ctx.globalAlpha = 1
    }
    if (spiderRests) stampAt(ctx, made.spider)
    if (geckoRests) stampAt(ctx, made.gecko)
  }

  /**
   * The pegs the beam has just met, one fill a colour. Each is a halo of light round its peg, and each colour's
   * halo has its own shape over its life: red a burst that is gone at once, blue a wide one that sinks over four
   * beats, yellow two beats of light, one to each side, green one that springs wide and tall, white a steady
   * round one for as long as it holds the beam.
   */
  private drawFlashes(ctx: Ctx, flashes: readonly Flash[], share: number): void {
    for (const colour of [RED, BLUE, YELLOW, GREEN, WHITE] as const) {
      let any = false, young = false
      ctx.beginPath()
      for (const flash of flashes) {
        if (flash.colour !== colour) continue
        const { x, y } = centreOf(flash.hole)
        const u = Math.min(1, flash.age / FLASH_FOR[colour]), size = flash.half ? 0.62 : 1
        let rx = 0, ry = 0, dx = 0
        if (colour === RED) rx = ry = 46 * (1 - u * u)
        else if (colour === BLUE) rx = ry = 40 * (1 - 0.45 * u)
        else if (colour === YELLOW) {
          // Two flashes, one to each side.
          const second = u >= 0.5
          rx = ry = 22 + 16 * Math.sin(((u * 2) % 1) * Math.PI)
          dx = second ? 7 : -7
        } else if (colour === GREEN) {
          const spring = Math.exp(-5 * u) * Math.sin(u * 16)
          rx = (38 - 16 * u) * (1 + 0.45 * spring)
          ry = (38 - 16 * u) * (1 - 0.45 * spring)
        } else rx = ry = 34 * (u < 0.85 ? 1 : 1 - 0.4 * ((u - 0.85) / 0.15))
        // A halo round the peg, with the peg itself left clear in the middle of it: the light is the peg's own.
        const inner = PEG_RADIUS - 3
        if (rx * size <= inner + 1 || ry * size <= inner + 1) continue
        ctx.moveTo(x + dx + rx * size, y)
        ctx.ellipse(x + dx, y, rx * size, ry * size, 0, 0, Math.PI * 2)
        ctx.moveTo(x + inner, y)
        ctx.arc(x, y, inner, 0, Math.PI * 2, true)
        any = true
        if (flash.age < 0.05) young = true
      }
      // A new flash is there at once, at its full light; after that it is kept up a share a frame.
      if (any) fillInk(ctx, PEG_INK[colour], young ? 0.75 : 0.75 * Math.min(1, share), true)
    }
  }

  /** The cabinet's movers: the lamps, the valve, the loudspeaker, the keys, the wells, the lever, the handle and the three who live there. */
  private drawCabinet(ctx: Ctx, toy: Toy, halo: number): void {
    const made = this.made!, time = toy.time
    const share = this.tier.halo ? halo / HALO : 1
    // The marquee's lamps breathe, each at its own pace; while a beam is trapped the nearest ones flare after it.
    const beam = fullBeam(toy.beams)
    ctx.beginPath()
    BULBS.forEach((bulb, i) => {
      let lit = 0.78 + 0.2 * Math.sin(time * (0.9 + 0.13 * i) + i * 1.9)
      if (toy.chase && beam) lit = 0.35 + 1.1 * Math.max(0, 1 - Math.abs(bulb.x - columnX(beam.col)) / 150)
      const r = bulb.r * lit
      ctx.moveTo(bulb.x + r, bulb.y)
      ctx.arc(bulb.x, bulb.y, r, 0, Math.PI * 2)
    })
    fillInk(ctx, INK.bulb, 0.9 * share, true)
    // The valve's filament: a wire wound unevenly, which flickers.
    const flicker = 0.5 + 0.3 * Math.sin(time * 23) * Math.sin(time * 7.3)
    const vx = VALVE.x, vy = VALVE.y
    ctx.beginPath()
    ctx.moveTo(vx - 9, vy + 26)
    ctx.bezierCurveTo(vx - 15, vy + 2, vx + 4, vy + 10, vx - 3, vy - 8)
    ctx.bezierCurveTo(vx - 9, vy - 24, vx + 13, vy - 26, vx + 7, vy - 4)
    ctx.bezierCurveTo(vx + 3, vy + 8, vx + 12, vy + 14, vx + 10, vy + 26)
    glow(ctx, INK.touch, 2, 0, flicker)
    if (toy.pulseAge < 0.45) {
      // Every sound pushes the cone out: one fold of it swells, a whole closed ring a little off the cone's middle.
      const u = toy.pulseAge / 0.45, r = 28 + 62 * ease(u)
      ctx.beginPath()
      ctx.ellipse(SPEAKER.x + 14 * (1 - u), SPEAKER.y, r * 0.92, r, 0, 0, Math.PI * 2)
      ctx.closePath()
      glow(ctx, INK.bezel, 3, 0, 1 - u)
    }
    if (toy.sparks.length > 0) {
      ctx.beginPath()
      for (const spark of toy.sparks) dashes(ctx, spark.x, spark.y, 6 + 44 * ease(spark.age / 0.5), 12, 5, spark.x * 0.01)
      glow(ctx, INK.hand, 2, 0, 0.9)
    }
    // The key that is down is lit whole, at once: its one peg in the colour in hand, and its rim, its folds and its echoes bright.
    const marks = keyMarks(toy.mirror), button = BUTTONS[toy.mirror]
    const sink = 3 * Math.exp(-12 * toy.buttonAge)
    // Its peg is a peg: the cap of the colour in hand with its light, as on the board, at the key's size.
    stamp(ctx, this.sprites!.peg[toy.hand], marks.peg.x, marks.peg.y + sink, KEY_PEG)
    ctx.beginPath()
    ctx.rect(button.x - BUTTON_HALF + 3, button.y - BUTTON_HALF + 3 + sink, BUTTON_HALF * 2 - 6, BUTTON_HALF * 2 - 6)
    for (const fold of marks.folds) {
      ctx.moveTo(fold[0], fold[1] + sink)
      ctx.lineTo(fold[2], fold[3] + sink)
    }
    for (const echo of marks.echoes) ring(ctx, echo.x, echo.y + sink, echo.r)
    glow(ctx, INK.touch, ECHO_LINE, 0, 0.9)
    // A well that was tapped, or took a peg, lights its mouth.
    let wells = false
    ctx.beginPath()
    for (let colour = 1; colour <= 5; colour++) {
      const age = toy.wellAge[colour]
      if (age >= 0.4) continue
      const mouth = wellMouth(colour as Colour), wide = 46 + 10 * Math.sin((age / 0.4) * Math.PI)
      ctx.moveTo(mouth.x + wide, mouth.y)
      ctx.ellipse(mouth.x, mouth.y, wide, 13, 0, 0, Math.PI)
      wells = true
    }
    if (wells) glow(ctx, INK.touch, 3, 0, 0.9)

    // The lever's knob is where the toy has it: under the finger that drags it, or at its end, with a small bounce off the stop at a clunk.
    const bounce = (toy.leverDown ? -1 : 1) * 0.07 * Math.exp(-9 * toy.leverAge) * Math.abs(Math.sin(toy.leverAge * 30))
    const knob = knobAt(toy.knob + bounce), size = KNOB * (toy.leverHeld ? 0.9 : 1)
    ctx.drawImage(made.knob, knob.x - size / 2, knob.y - size / 2, size, size)
    tally.stamps += 1
    // The handle hangs still and follows the finger when pulled. Rattled, by a tap or by itself, it is seen to: the handle and
    // its ball swing from side to side for a second, with a glint. The further it is pulled the less it swings under the finger.
    const rattling = toy.handleAge < HANDLE_RATTLE.lasts
    if (toy.handlePull === 0 && !rattling) stampAt(ctx, made.handle)
    else drawHandle(ctx, toy.handlePull, handleSwing(toy.handleAge) * (1 - toy.handlePull / HANDLE.stop), handleGlint(toy.handleAge))

    const look = toy.gaze()
    const spider = toy.spiderPose(), gecko = toy.geckoPose()
    // A peg that lands in the tray shakes the spider on its thread.
    const jolt = toy.joltAge < 0.5 ? 7 * Math.sin(toy.joltAge * 48) * Math.exp(-7 * toy.joltAge) : 0
    if (toy.spider.act === null && jolt === 0) drawSpider(ctx, spider, look, halo, 'pupils')
    else drawSpider(ctx, spider, look, halo, 'all', jolt)
    drawGecko(ctx, gecko, look, halo, toy.neck, toy.gecko.act === null && !this.leans(toy) ? 'pupils' : 'all')
    drawMoth(ctx, toy.moth, halo)
  }

  /** The idle ladder: a soft light on what can be touched next, and then a ghost hand that shows the move. */
  private drawGuidance(ctx: Ctx, toy: Toy, guidance: Guidance | null): void {
    const turn = this.turn.of(guidance)
    if (!guidance || guidance.glow <= 0) return
    const guide = guideFor({ nextHoles: toy.nextHoles(), leverDown: toy.leverDown, anyPeg: toy.shown.some((cell) => cell !== 0) }, turn)
    if (!guide) return
    const breath = 0.75 + 0.25 * Math.sin(toy.time * 2.4)
    ctx.beginPath()
    if (guide.kind === 'pegs') {
      for (const hole of guide.holes) {
        const at = centreOf(hole)
        ctx.moveTo(at.x + PEG_RADIUS, at.y)
        ctx.arc(at.x, at.y, PEG_RADIUS, 0, Math.PI * 2)
      }
    } else {
      const at = guide.from
      ctx.moveTo(at.x + 50, at.y)
      ctx.arc(at.x, at.y, 50, 0, Math.PI * 2)
    }
    fillInk(ctx, INK.touch, 0.17 * guidance.glow * breath, true)
    if (guidance.demo === null) return
    const pose = handPose(guidance.demo, true, this.hand)
    const x = guide.from.x + (guide.to.x - guide.from.x) * pose.travel, y = guide.from.y + (guide.to.y - guide.from.y) * pose.travel
    if (guide.kind === 'lever' && pose.travel > 0) {
      // The knob's ghost goes down with the hand, so the hand is seen to take it along.
      ctx.beginPath()
      ctx.arc(x, y, LEVER.knob, 0, Math.PI * 2)
      fillInk(ctx, INK.touch, 0.3 * pose.opacity)
    }
    drawHand(ctx, x, y, pose.press, pose.opacity)
  }
}
