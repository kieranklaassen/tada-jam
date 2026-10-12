import { Carry, STITCH } from './carry'
import { mothPose, poseOf, rest, type MothPose } from './cast'
import type { Tier } from './config'
import { DYE, css, fill, makeFelt, makeFleece, oval, shade, stampFleece, type Ctx, type Felt, type Fleece, type Maker, type Rgb } from './felted'
import { RED, Skins, strokeLoop } from './fixtures'
import { makeFolkArt, type FolkArt } from './folkArt'
import { drawFigure, drawMoth, type Stance } from './folkDraw'
import { handPose, type Guidance, type HandPose } from './guidance'
import { along, hintFor, type Hint } from './hint'
import { BOWLS, CELL, COMB, COMB_HAND, FELT, FRAME, GOOSE, LOOP, PEGS, PIG, pictureBox } from './layout'
import { BEHIND, Lit, MOUND, duskColour, makeMound, stampMound } from './lit'
import { Patches, type CloudLook } from './patches'
import { BEECH } from './room'
import { lightOf } from './scenes'
import { Bows, napPath, rainPath, steamPath } from './sky'
import type { Fit } from './stage'
import { WAG, type Toy } from './toy'
import { WHITE, middle, type Shape, type Sheet } from './wool'

// The frame. The lit room is stamped whole (lit.ts); over it go the laid wool,
// one draw a shape (patches.ts), what each thing carries, one stroke a dye
// (carry.ts), the weather (sky.ts), whatever of the table is in motion, the
// figures, the moth, the loose fibres and the idle guidance. Everything that
// moves is read from the toy and its clock. `draws` is what one frame put on
// the surface: stamps of sprites and canvases, strokes and fills, each one.
// A tier leaves out two things and no others, and `spared` counts them: the
// loose fibres under a working finger past the tier's number, and the second
// draw of running water and wind past the tier's number. The answer to a
// touch and the motion of a sound are drawn at every tier.

const LINT: Rgb = [168, 152, 172]
/** How big the tuft on the chosen bowl stands, by size: a handful, a tuft, a wisp. */
const TUFT_SIZE = [1.3, 1, 0.66]
/** The most bows drawn in one frame. */
const MOST_BOWS = 2
const still = (spring: { dip: number; vel: number }): boolean => Math.abs(spring.dip) < 0.004 && Math.abs(spring.vel) < 0.05
const ease = (u: number): number => { const t = Math.max(0, Math.min(1, u)); return t * t * (3 - 2 * t) }

/** The wool the ghost hand lays: a small canvas of its own, stamped as the hand goes and faded with it. */
type GhostWool = { canvas: HTMLCanvasElement; c: Ctx; x: number; y: number; w: number; h: number; key: string; laid: number }
const GHOST_STAMPS = 70

export class View {
  readonly patches: Patches
  readonly lit: Lit
  /** What the last frame put on the surface, and what its tier left out of it. */
  draws = 0
  spared = 0
  private carry = new Carry()
  private bows: Bows
  private skins: Skins
  private dpr = 1
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private tier: Tier | null = null
  private art: FolkArt | null = null
  private loose: Fleece[] = []
  private laying: Fleece[] = []
  private lint: Fleece | null = null
  private tufts: HTMLCanvasElement[] = []
  private hand: Felt | null = null
  private pose = rest()
  private stance: Stance = { scale: 1, flip: false, sunk: 0, blind: false, mist: null }
  private moth: MothPose = { wing: 0, feeler: 0, bob: 0, bite: 0 }
  private ghost: HandPose = { travel: 0, press: 0, opacity: 0 }
  private ghostWool: GhostWool | null = null
  private order = [0, 1, 2, 3]
  private graze: number[] = []
  /** The sheet the wool's canvases were last laid for, and the picture of the sheet that is leaving for the wall. */
  private seen: Sheet | null = null
  private leaving: HTMLCanvasElement | null = null

  constructor(private make: Maker) {
    this.patches = new Patches(make)
    this.lit = new Lit(make)
    this.bows = new Bows(make)
    this.skins = new Skins(make)
  }

  /** The tier to draw at. A tier with finer or coarser wool lays every shape again; nothing else is painted anew. */
  setTier(tier: Tier, toy: Toy | null): void {
    this.tier = tier
    this.patches.setScale(tier.wool, toy ? toy.sheet : null)
  }

  /** The sheet has been read from the save: its shapes are laid into their canvases, as they were left. */
  load(toy: Toy): void {
    this.patches.rebuild(toy.sheet)
    this.seen = toy.sheet
    this.leaving = null
  }

  /** The surface has a new size or pixel ratio: everything painted once for the screen is painted again for it. */
  resize(width: number, height: number, dpr: number, by: Fit): void {
    this.dpr = dpr; this.by = by
    if (by.scale <= 0) return
    const k = dpr * by.scale
    this.lit.resize(width, height, dpr, by)
    this.art = makeFolkArt(this.make, k)
    this.skins.reset(k, this.art)
    this.bows.setScale(k)
    this.loose = DYE.map((rgb, dye) => makeFleece(this.make, rgb, k, 200 + dye, 0.16, 12))
    this.laying = DYE.map((rgb, dye) => makeFleece(this.make, rgb, k, 100 + dye))
    this.lint = makeFleece(this.make, LINT, k, 260, 0.12, 8)
    this.tufts = DYE.map((_, dye) => makeMound(this.make, dye, k, MOUND.tuft.w, MOUND.tuft.h, 30, true))
    // A pointing hand: the first finger stands at the palm's near edge, and the thumb lies out to the far side.
    this.hand = makeFelt(this.make, k, -24, -8, 46, 70, 91, (p) => {
      fill(p, [248, 236, 214], (q) => { q.roundRect(-9, -6, 18, 44, 9); q.roundRect(-11, 22, 48, 44, 18) })
      fill(p, [248, 236, 214], (q) => oval(q, 36, 34, 8, 15, -0.9))
    })
    this.ghostWool = null
    this.leaving = null
  }

  /**
   * The wool's canvases follow the sheet the toy holds. When a picture is hung the toy takes a new bare sheet:
   * what was laid on the old one is first taken into one picture, which the evening's scene swings up to its peg.
   */
  private sync(toy: Toy): void {
    if (toy.sheet !== this.seen) {
      const old = toy.leaving
      if (old && old === this.seen && this.lit.front) {
        this.patches.take(toy.laid, toy.joins)
        this.patches.comb(toy.combed, toy.relaid, old)
        const half = (this.dpr * this.by.scale) / 2
        this.leaving = this.make(this.lit.front.width, this.lit.front.height)
        const into = this.leaving.getContext('2d')!
        into.drawImage(this.lit.front, 0, 0)
        into.setTransform(1, 0, 0, 1, (FELT.x - FRAME.x) * half, (FELT.y - FRAME.y) * half)
        this.patches.snapshot(old, into, half)
      }
      toy.laid.length = 0; toy.joins.length = 0; toy.combed.length = 0; toy.relaid.length = 0
      this.patches.rebuild(toy.sheet)
      this.seen = toy.sheet
    }
    if (!toy.leaving) this.leaving = null
    this.patches.take(toy.laid, toy.joins)
    this.patches.comb(toy.combed, toy.relaid, toy.sheet)
  }

  /**
   * Draws the frame onto `c`, the surface's own context. With no toy yet it draws the bare room. `hint` is the one
   * move the idle ladder shows now, as the game has chosen it (game.ts); left out, it is read from the toy.
   */
  draw(c: Ctx, toy: Toy | null, guidance: Guidance | null, hint: Hint | null = null): void {
    this.draws = 0
    this.spared = 0
    this.patches.spared = 0
    if (this.by.scale <= 0 || !this.lit.room || !this.tier) return
    c.setTransform(1, 0, 0, 1, 0, 0)
    if (!toy || !this.art) { c.drawImage(this.lit.room, 0, 0); this.draws++; return }
    this.sync(toy)
    const light = lightOf(toy), held = toy.held, show = toy.show, k = this.dpr * this.by.scale
    const base = [k, 0, 0, k, this.dpr * this.by.x, this.dpr * this.by.y]
    let heaps = 0
    for (let dye = 0; dye < BOWLS.length; dye++) if (still(toy.bowls[dye])) heaps |= 1 << dye
    const combing = toy.stroke !== null && toy.stroke.comb, inHand = toy.tuftInHand
    // The comb wriggles once on the table, a moment after the first thing wakes: for that long it is not at rest.
    const wag = toy.t - toy.combWag, wags = wag >= 0 && wag < WAG && toy.hand !== COMB_HAND
    const combRests = toy.hand !== COMB_HAND && still(toy.comb) && !wags, back = toy.t - toy.loopBackAt
    const loopRests = !toy.finished && !(held && held.kind === 'loop') && back >= 0.3 && show.kind !== 'fresh'
    this.lit.compose(toy, light, { heaps, comb: combRests, loop: loopRests })
    c.drawImage(this.lit.canvas!, 0, 0)
    this.draws++
    c.setTransform(k, 0, 0, k, this.dpr * this.by.x, this.dpr * this.by.y)

    if (toy.sheet.shapes.length > 0) this.sheet(c, toy)
    this.scenes(c, toy)

    // The wool in the bowls: a heap that was tapped dips and springs, and the chosen one has a tuft standing on it,
    // as big as the tuft is and thinner as it is laid. A tuft the finger has taken from the bowl is under the finger.
    const spent = TUFT_SIZE[toy.size] * (toy.stroke && !combing ? 0.45 + 0.55 * toy.amount : 1)
    for (let dye = 0; dye < BOWLS.length; dye++) {
      const bowl = BOWLS[dye], dip = toy.bowls[dye].dip, rise = toy.rise[dye]
      if (!(heaps & (1 << dye))) { stampMound(c, this.lit.heaps[dye], bowl.x, bowl.y + 10, MOUND.heap.w, MOUND.heap.h, 1 + dip * 0.25, Math.max(0.6, 1 - dip * 0.7), 0); this.draws++ }
      if (rise > 0.03 && toy.hand === dye && !inHand) {
        const size = spent * (0.5 + 0.5 * rise)
        stampMound(c, this.tufts[dye], bowl.x, bowl.y - 2 - dip * 14, MOUND.tuft.w, MOUND.tuft.h, size, size * (1 - dip * 0.4), 0.07 * Math.sin(toy.t * 1.7 + dye) + dip * 0.2)
        this.draws++
      }
    }
    // The comb: chosen, it stands up off the table; taken from the table or at work, it goes with the finger; and
    // once, a moment after the first thing wakes, it wriggles where it lies.
    const comb = this.lit.comb
    if (!combRests && comb) {
      c.save()
      if (toy.combInHand) { c.translate(toy.finger.x + 12, toy.finger.y - 34); c.rotate(0.2 + (combing ? 0.08 * Math.sin(toy.t * 30) : 0)) }
      else if (wags) { const dies = 1 - wag / WAG; c.translate(COMB.x, COMB.y - 5 * Math.abs(Math.sin(wag * 20)) * dies - toy.comb.dip * 14); c.rotate(0.16 * Math.sin(wag * 40) * dies) }
      else { c.translate(COMB.x, COMB.y - (toy.hand === COMB_HAND ? 14 : 0) - toy.comb.dip * 14); c.rotate(toy.hand === COMB_HAND ? -0.22 + 0.03 * Math.sin(toy.t * 1.7) : 0) }
      c.drawImage(comb.canvas, -comb.ox, -comb.oy, comb.w, comb.h)
      c.restore()
      this.draws++
    }
    // A knocked peg wags for a moment, and so does the picture on it.
    for (let peg = 0; peg < PEGS.length; peg++) {
      const age = toy.t - toy.knocked[peg]
      if (age < 0 || age > 0.5) continue
      const wag = Math.sin(age * 40) * (1 - age / 0.5), hung = toy.wall.find((picture) => picture.peg === peg)
      if (hung) {
        const box = pictureBox(peg)
        c.save()
        c.translate(PEGS[peg].x, PEGS[peg].y)
        c.rotate(wag * 0.07)
        c.drawImage(this.lit.picture(hung.veils, false), box.x - PEGS[peg].x, box.y - PEGS[peg].y, box.w, box.h)
        c.restore()
      } else {
        c.fillStyle = css(shade(BEECH, -0.05))
        c.beginPath()
        c.arc(PEGS[peg].x + wag * 3, PEGS[peg].y + Math.abs(wag) * 1.5, 11.5, 0, Math.PI * 2)
        c.fill()
      }
      this.draws++
    }

    // The figures, the farthest first: each where the toy has it, at its size, facing its way, in its coat.
    this.order.sort((a, b) => toy.folk[a].y - toy.folk[b].y)
    for (const who of this.order) {
      const figure = toy.folk[who], lifted = held !== null && held.kind === 'figure' && held.who === who && held.lifted
      const pose = poseOf(who, toy.t, figure.mood, toy.t - figure.moodSince, figure.gazeX, figure.gazeY, figure.variant, this.pose, figure.shown, figure.turn, figure.hat, toy.t - figure.shownSince)
      // A coat that has just come or gone: one soft puff of the whole body.
      const puff = toy.t - figure.coatAt
      if (puff >= 0 && puff < 0.4) { pose.sx += 0.1 * Math.sin((puff / 0.4) * Math.PI); pose.sy -= 0.06 * Math.sin((puff / 0.4) * Math.PI) }
      const stance = this.stance
      stance.scale = figure.scale; stance.flip = figure.flip; stance.blind = figure.coat === WHITE
      // In mist only its ears show, on the line where the mist ends; in a pond or a stream it stands to its knees, and
      // the goose sits low on the water. A goose that rides a stream climbs out on the way, and one that flies is in the air.
      const stands = figure.at !== null && !figure.hop && !figure.errand && !lifted
      const wades = figure.wade && figure.shown !== 'ride' && figure.shown !== 'fly'
      stance.mist = stands && figure.mist && figure.mistTop >= 0 ? FELT.y + figure.mistTop * CELL : null
      stance.sunk = stands && wades ? (who === GOOSE ? 0.14 : 0.2) : 0
      const skin = figure.coat !== null ? this.skins.get(who, figure.coat) : who === PIG && figure.shown === 'fan' ? this.skins.get(PIG, RED) : null
      this.draws += drawFigure(c, this.art, who, figure.x, figure.y, pose, stance, skin)
    }

    // The rain and the steam, over all they fall on.
    const dxOf = (cloud: Shape): number => this.patches.motion(cloud, toy).dx
    c.lineCap = 'round'
    c.beginPath()
    if (rainPath(c, toy, dxOf)) { c.strokeStyle = 'rgba(176,208,244,0.85)'; c.lineWidth = 2; c.stroke(); this.draws++ }
    c.beginPath()
    if (steamPath(c, toy, dxOf)) { c.strokeStyle = 'rgba(244,240,232,0.55)'; c.lineWidth = 2.6; c.stroke(); this.draws++ }

    // The tuft the finger took from its bowl: under the finger all the way to the felt, and on the felt as it is laid.
    if (inHand) {
      stampMound(c, this.tufts[toy.hand], toy.finger.x, toy.finger.y + 10, MOUND.tuft.w, MOUND.tuft.h, spent, spent, 0.07 * Math.sin(toy.t * 1.7 + toy.hand))
      this.draws++
    }
    // The yarn loop, while it is not at rest: twanged, in the hand, or springing back.
    if (!loopRests && !toy.finished && show.kind !== 'fresh') {
      if (held && held.kind === 'loop' && held.lifted) strokeLoop(c, toy.finger.x, toy.finger.y + 26)
      else if (held && held.kind === 'loop') strokeLoop(c, LOOP.x + 2 * Math.sin(toy.t * 40), LOOP.y)
      else { const e = ease(back / 0.3); strokeLoop(c, toy.finger.x + (LOOP.x - toy.finger.x) * e, toy.finger.y + 26 + (LOOP.y - toy.finger.y - 26) * e) }
      this.draws++
    }
    // The evening light on the table and on the figures at the back.
    if (light > 0.01) { c.fillStyle = duskColour(Math.round(light * 16) / 16); c.beginPath(); this.lit.shadePath(c); c.fill(); this.draws++ }

    // The moth, where the toy has it; its jaws work while it eats.
    mothPose(toy.t, toy.moth.flying !== null || toy.moth.orbit !== null, toy.t - toy.moth.biteAt, this.moth)
    this.draws += drawMoth(c, this.art.moth, toy.moth.x, toy.moth.y, toy.moth.turn, this.moth)

    // Loose fibres and fluff afloat: each fades as it goes. The tier sets how many of the loose fibres under a
    // working finger are drawn. What is a touch's answer or the motion of a sound (the lint of a touch on the
    // room, the fluff the comb takes off, a coat combed off in one tuft) is `kept`, and is drawn at every tier.
    // The tier's number is for all that floats: the kept come first, and the newest loose fibres fill what is left.
    const floaters = toy.floaters
    let loose = 0
    for (const floater of floaters) if (!floater.kept) loose++
    let skip = Math.max(0, loose - Math.max(0, this.tier.floaters - (floaters.length - loose)))
    for (let i = 0; i < floaters.length; i++) {
      const floater = floaters[i], age = toy.t - floater.born
      if (!floater.kept && skip > 0) { skip--; this.spared++; continue }
      c.globalAlpha = Math.max(0, 1 - age / 1.6)
      stampFleece(c, floater.dye < 0 ? this.lint! : this.loose[floater.dye], floater.x, floater.y, floater.spin * age + i, floater.size, i, base)
      this.draws++
    }
    c.globalAlpha = 1

    this.spared += this.patches.spared
    if (guidance && (guidance.glow > 0.01 || guidance.demo !== null)) this.guide(c, toy, guidance, hint ?? hintFor(toy), base)
  }

  /** The sheet inside its frame: the wool, what each thing carries, the bows, and what the comb raises. */
  private sheet(c: Ctx, toy: Toy): void {
    const show = toy.show, weather = toy.weather
    c.save()
    c.beginPath()
    c.rect(FELT.x, FELT.y, FELT.w, FELT.h)
    c.clip()
    // A cloud that rains is darker. One a sun dries looks thinner on the sun's side: from that edge of it as far as
    // the sun's reach goes, and in the sun's scene the thinning comes across from that edge.
    const cloudOf = (shape: Shape, look: CloudLook): void => {
      look.dark = 0; look.side = 0; look.upTo = 0
      const rain = weather.rains.find((one) => one.cloud === shape)
      if (!rain) return
      const mine = rain.cloud.id === show.cloud
      look.dark = mine && show.kind === 'rain' ? show.gather : 1
      const first = rain.dry.indexOf(true)
      if (first < 0 || weather.suns.length === 0) return
      const at = middle(shape), come = mine && show.kind === 'sun' ? show.thin : 1
      const sun = weather.suns.reduce((best, next) => (Math.abs(next.col - at.col) < Math.abs(best.col - at.col) ? next : best))
      look.side = sun.col < at.col ? -1 : 1
      look.upTo = look.side > 0 ? rain.x1 + 1 - come * (rain.x1 + 1 - (rain.x0 + first)) : rain.x0 + come * (rain.dry.lastIndexOf(true) + 1)
    }
    this.draws += this.patches.draw(c, toy, toy.sheet, this.tier!.flow, cloudOf)
    // How wet a thing is: under a rain that reaches it; in the sun's scene what was wet dries.
    const wetOf = (shape: Shape): number => {
      const rain = weather.rains.find((one) => one.under === shape)
      if (!rain) return 0
      const mine = rain.cloud.id === show.cloud
      if (rain.dry.includes(false)) return mine && show.kind === 'rain' ? show.answer : 1
      return mine && show.kind === 'sun' ? 1 - show.dry : 0
    }
    this.graze.length = 0
    for (const figure of toy.folk) if (figure.shown === 'graze') this.graze.push(figure.x - 40 * figure.scale * (figure.flip ? -1 : 1))
    c.lineCap = 'round'
    c.lineJoin = 'round'
    c.lineWidth = 2.4
    for (let dye = 0; dye < DYE.length; dye++) {
      let any = false
      c.beginPath()
      for (const shape of toy.sheet.shapes) {
        if (shape.kind === 'fluff') continue
        const wet = wetOf(shape), own = shape.dye === dye, veiled = shape.veil === dye
        if (!own && !veiled && !(dye === 2 && wet > 0)) continue
        this.patches.place(c, shape, toy)
        if (own) this.carry.marks(c, shape, toy.t, wet, this.graze, shape.kind === 'sun' && show.kind === 'sun' && shape.id === show.sun ? 1 + 1.6 * Math.sin(show.rays * Math.PI) : 1)
        if (veiled) this.carry.veil(c, shape, dye, toy.t, 1)
        else if (dye === 2 && wet > 0) this.carry.veil(c, shape, dye, toy.t, wet)
        c.restore()
        any = true
      }
      if (!any) continue
      c.strokeStyle = css(shade(DYE[dye], STITCH[dye]), 0.9)
      c.stroke()
      this.draws++
    }
    this.draws += this.bows.draw(c, toy, MOST_BOWS)
    c.beginPath()
    if (napPath(c, toy)) { c.strokeStyle = 'rgba(206,196,214,0.7)'; c.lineWidth = 2; c.stroke(); this.draws++ }
    c.restore()
  }

  /** What a scene alone shows: the oldest picture on its way down, the frame swinging up to its peg, the fresh felt turning round. */
  private scenes(c: Ctx, toy: Toy): void {
    const show = toy.show
    if (show.kind === 'evening') {
      if (show.old && show.down < 0.75) {
        // On its peg until the goose has it, then in the goose's bill.
        const goose = toy.folk[GOOSE], box = pictureBox(show.old.peg), carried = show.down >= 0.3
        const x = carried ? goose.x + (goose.flip ? 50 : -50) * goose.scale - box.w * 0.4 : box.x + 2 * Math.sin(show.down * 60), y = carried ? goose.y - 250 * goose.scale : box.y
        c.drawImage(this.lit.picture(show.old.veils, false), x, y, box.w * (carried ? 0.8 : 1), box.h * (carried ? 0.8 : 1))
        this.draws++
      }
      if (show.swing < 1 && this.leaving) {
        // The frame swings up from the easel, shrinking to its place on the peg, and settles with a small sway.
        const e = ease(show.swing), to = pictureBox(show.peg), w = FRAME.w + (to.w - FRAME.w) * e, h = FRAME.h + (to.h - FRAME.h) * e
        const cx = FRAME.x + FRAME.w / 2 + (to.x + to.w / 2 - FRAME.x - FRAME.w / 2) * e, top = FRAME.y + (to.y - FRAME.y) * e - 60 * Math.sin(e * Math.PI)
        c.save()
        c.translate(cx, top)
        c.rotate(0.16 * Math.sin(show.swing * Math.PI * 3) * (1 - show.swing))
        c.drawImage(this.leaving, -w / 2, 0, w, h)
        c.restore()
        this.draws++
      }
    } else if (show.kind === 'fresh' && show.turn < 1 && this.lit.behind && this.lit.back && this.lit.front) {
      // The frame turns round on its middle: its wooden back narrows to an edge, and its front opens out.
      const wide = Math.cos(show.turn * Math.PI), side = wide > 0 ? this.lit.back : this.lit.front, w = Math.max(0.02, Math.abs(wide)) * FRAME.w
      c.drawImage(this.lit.behind, FRAME.x - BEHIND, FRAME.y - BEHIND, FRAME.w + BEHIND * 2, FRAME.h + BEHIND * 2)
      c.drawImage(side, FRAME.x + (FRAME.w - w) / 2, FRAME.y, w, FRAME.h)
      this.draws += 2
    }
  }

  /** The idle ladder: a breathing glow on the thing to take hold of, then a ghost hand that shows the one move. */
  private guide(c: Ctx, toy: Toy, guidance: Guidance, hint: Hint, base: readonly number[]): void {
    if (guidance.glow > 0.01) {
      const breath = 0.75 + 0.25 * Math.sin(toy.t * 3)
      const glow = c.createRadialGradient(hint.glow.x, hint.glow.y, 6, hint.glow.x, hint.glow.y, 92)
      glow.addColorStop(0, `rgba(255,246,214,${0.6 * guidance.glow * breath})`)
      glow.addColorStop(1, 'rgba(255,246,214,0)')
      c.fillStyle = glow
      c.beginPath()
      c.arc(hint.glow.x, hint.glow.y, 92, 0, Math.PI * 2)
      c.fill()
      this.draws++
    }
    if (guidance.demo === null || !this.hand) return
    handPose(guidance.demo, hint.drag, this.ghost)
    const at = along(hint.path, this.ghost.travel)
    if (hint.wool && toy.hand < DYE.length && this.ghost.travel > 0.5) this.layGhost(c, toy.hand, hint, base)
    c.globalAlpha = 0.8 * this.ghost.opacity
    const lift = 1 + 0.12 * (1 - this.ghost.press)
    c.drawImage(this.hand.canvas, at.x - this.hand.ox * lift, at.y - this.hand.oy * lift + 10 * (1 - this.ghost.press), this.hand.w * lift, this.hand.h * lift)
    c.globalAlpha = 1
    this.draws++
  }

  /** The wool the ghost hand lays: fleece stamped along its way as a finger's would be, into a canvas of its own. It fades with the hand, and nothing of it is kept. */
  private layGhost(c: Ctx, dye: number, hint: Hint, base: readonly number[]): void {
    const [, from, to] = hint.path, k = base[0], pad = 40
    const x = Math.min(from.x, to.x) - pad, y = Math.min(from.y, to.y) - pad, w = Math.abs(to.x - from.x) + pad * 2, h = Math.abs(to.y - from.y) + pad * 2
    const key = `${dye}|${from.x}|${from.y}|${k}`
    let wool = this.ghostWool
    const wanted = Math.floor((this.ghost.travel - 0.5) * 2 * GHOST_STAMPS)
    if (!wool || wool.key !== key || wanted < wool.laid) {
      const canvas = wool && wool.key === key ? wool.canvas : this.make(Math.ceil(w * k), Math.ceil(h * k)), into = canvas.getContext('2d')!
      into.setTransform(1, 0, 0, 1, 0, 0)
      into.clearRect(0, 0, canvas.width, canvas.height)
      wool = this.ghostWool = { canvas, c: into, x, y, w, h, key, laid: 0 }
    }
    const turn = Math.atan2(to.y - from.y, to.x - from.x), own = [k, 0, 0, k, -x * k, -y * k]
    for (; wool.laid < wanted; wool.laid++) {
      // Thick at first and thinner toward the end, as a tuft is spent.
      const i = wool.laid, u = i / GHOST_STAMPS, spread = 12 * (1 - 0.5 * u)
      const px = from.x + (to.x - from.x) * u + (((i * 7) % 11) / 11 - 0.5) * spread, py = from.y + (to.y - from.y) * u + (((i * 5) % 9) / 9 - 0.5) * spread
      stampFleece(wool.c, this.laying[dye], px, py, turn + (((i * 3) % 7) / 7 - 0.5) * 0.5, 1.1 - 0.4 * u, i, own)
      if (u < 0.7) stampFleece(wool.c, this.laying[dye], px + 3, py - 2, turn + 0.2, 1, i + 3, own)
    }
    c.globalAlpha = this.ghost.opacity
    c.drawImage(wool.canvas, wool.x, wool.y, wool.w, wool.h)
    c.globalAlpha = 1
    this.draws++
  }
}
