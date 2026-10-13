import { drawBay, drawDrops, drawFront, drawStick, drawWork } from './benchView'
import type { Tier } from './config'
import { LICK_SECONDS, type Fair, type Flight, type Point } from './fair'
import { BODY_STAMPS, drawFellow, type Held } from './folkView'
import { Frame } from './frame'
import { glowsOf, showOf } from './guide'
import { handPose, type Guidance, type HandPose } from './guidance'
import { BASKET, COUNTER, FOLK, HAT_FLAME, LANTERNS, POT, WINDOW, type Who } from './hall'
import { HOLDS } from './holds'
import type { Puff } from './meetings'
import { alpha, type Pen, type Sprite } from './paint'
import { DOORWAY, SNOW, STAR, slotAt, type Place } from './places'
import { WAX_PALE } from './scenery'
import { MARK } from './things'
import { IN_BASKET, Sprites } from './sprites'
import { STAGE, fit, type Fit } from './stage'

// The frame. Every picture is painted ahead of it (sprites.ts); a frame
// stamps them and draws what must be fresh: the wax, the candle, the drops
// and the faces. `count` is what the last frame cost, as sprite stamps plus
// live strokes and fills, which is this game's draw count.

/** How big a thing is drawn in the child's hand, as a share of its size on the bench. */
const IN_HAND = 0.62
const MOTE: Record<Puff['kind'], string> = { crumbs: '#d9a35e', needles: '#4f8a55', flour: '#fbf6ea', smoke: '#cfc8bc', sparks: '#ffc45a' }
const ease = (p: number): number => p * p * (3 - 2 * p)
/** How many times the basket's halo pulses once it stands in the snow, and how fast. After that it stands still. */
export const HALO = { pulses: 3, rate: 2.2 } as const
/** The halo's pulse, `age` seconds after it came up: a few slow swells, each smaller than the last, and then none. */
export function haloPulse(age: number): number {
  const turns = (age * HALO.rate) / (Math.PI * 2)
  return turns >= HALO.pulses ? 0 : Math.sin(age * HALO.rate) * 0.06 * (1 - turns / HALO.pulses)
}
/** The light a paper lantern throws on a face, as a share of the light sprite's size: a pool about the size of a head and shoulders. */
const FACE_TINT = 2.6

export class FairView {
  readonly sprites = new Sprites()
  private readonly f: Frame
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private ratio = 1
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }

  constructor(canvas: { getContext(kind: '2d'): unknown }) {
    this.f = new Frame(canvas.getContext('2d') as Pen, this.sprites)
  }

  get fit(): Fit {
    return this.by
  }

  /** Sprite stamps plus live strokes and fills in the last frame, and how many of those were stamps. */
  get count(): number {
    return this.f.count
  }

  get stamps(): number {
    return this.f.stamps
  }

  /**
   * The surface has a new size in CSS pixels, or is drawn at a new pixel ratio. `sharpest` is the ratio the display
   * is drawn at on the top tier: the pictures are painted at that when the surface takes its shape, and a tier
   * that draws at a lower ratio stamps the same pictures and paints nothing.
   */
  resize(width: number, height: number, ratio: number, sharpest: number = ratio): void {
    this.by = fit(width, height)
    this.ratio = ratio
    if (this.by.scale <= 0) return
    // The hall covers the whole surface, the stage and whatever shows beyond it.
    this.sprites.plan({ x: -this.by.x / this.by.scale, y: -this.by.y / this.by.scale, w: width / this.by.scale, h: height / this.by.scale }, sharpest * this.by.scale)
  }

  /** Draws one frame. With no fair yet (the slot is still being read) it draws the hall alone. */
  draw(fair: Fair | null, guidance: Guidance | null, tier: Tier): void {
    const f = this.f, g = f.g, s = this.sprites
    f.begin()
    if (this.by.scale <= 0) return
    const k = this.ratio * this.by.scale
    g.setTransform(k, 0, 0, k, this.ratio * this.by.x, this.ratio * this.by.y)
    g.globalAlpha = 1
    g.globalCompositeOperation = 'source-over'
    const hall = s.of('hall'), X = s.extent.x, W = s.extent.w
    if (!fair) return f.put(hall, 0, 0)
    const t = fair.time, slide = fair.slide
    // The places in view: one at rest, two while the hall slides by.
    const bays: [Place, number][] = slide ? [[slide.from, -slide.dir * slide.p * W], [slide.to, slide.dir * (1 - slide.p) * W]] : [[fair.at, 0]]
    // The hall goes by with the places: it is the same all the way along, so it wraps.
    const shift = slide ? (((-slide.dir * slide.p * W) % W) + W) % W : 0
    if (shift > 0.5) {
      f.part(hall, W - shift, W, X, 0)
      f.part(hall, 0, W - shift, X + shift, 0)
    } else f.put(hall, 0, 0)
    // The snow falls on the tiers that can afford it, and swirls on every tier when the glass is tapped: the
    // answer to a touch is never something a tier leaves out.
    if ((tier.snow || fair.swirl > 0) && !slide) this.snow(fair)
    for (const [place, off] of bays) drawBay(f, fair, place, off)
    // While the hall slides by, the pieces on the benches go by behind those who stand in it, with their benches.
    if (slide) for (const [place, off] of bays) drawWork(f, fair, place, off)

    // The three who stand behind the counter are cut off by its back edge, but for where the counter stops at the door.
    g.save()
    g.beginPath()
    g.rect(-STAGE.width, -STAGE.height, STAGE.width * 3, STAGE.height + COUNTER.back)
    for (const [place, off] of bays) if (place === 'door') g.rect(DOORWAY.left + off, COUNTER.back - 1, DOORWAY.right - DOORWAY.left, STAGE.height)
    g.clip()
    for (const who of ['tuba', 'maker', 'baker'] as const) this.fellow(fair, who)
    g.restore()
    this.fellow(fair, 'bundle')

    // The flames' live light falls on the hall and on those who stand in it. The work, the basket and the
    // fronts are drawn after it, plain and unwashed: they are what the child works with.
    this.pools(fair, tier, t)
    if (!slide) drawWork(f, fair, fair.at, 0)
    for (const [place, off] of bays) drawFront(f, fair, place, off)
    this.basket(fair, bays)
    for (const [place, off] of bays) if (place === 'candle') drawStick(f, fair, off)
    this.fellow(fair, 'goat')
    // The goat is drawn after the light, so the paper's colour is laid on its face here.
    const tint = this.tintOf(fair)
    if (tint) this.faceTint(fair, tint, 'goat', t)
    if (fair.at === 'candle' && !slide) drawDrops(f, fair)
    this.flames(fair, t)
    this.inAir(fair)
    this.guide(fair, guidance)
  }

  private fellow(fair: Fair, who: Who): void {
    const thing = fair.shown[who]
    const held: Held | null = thing ? { sprite: this.sprites.thing(thing, true), grip: HOLDS[who][thing.craft] } : null
    // The goat licks its lips at each drop: its tongue is out for a moment of the game's clock.
    const lick = who === 'goat' && fair.lick < LICK_SECONDS ? fair.lick / LICK_SECONDS : -1
    const ops = drawFellow(this.f.g, this.folk(), who, fair.folk.pose(who), held, lick)
    this.f.ops(ops, BODY_STAMPS[who] + (held ? 1 : 0))
  }

  /** The fair-goers' pictures, looked up afresh each frame: any of them may have been painted anew. */
  private folk() {
    const s = this.sprites
    return { maker: s.of('maker'), tuba: s.of('tuba'), baker: s.of('baker'), bundle: s.of('bundle'), goat: s.of('goat'), fist: s.of('fist'), bell: s.of('bell'), moustache: s.of('moustache'), hat: s.of('hat'), pompom: s.of('pompom'), mitten: s.of('mitten'), jaw: s.of('jaw'), ear: s.of('ear') }
  }

  /** The snow behind the window, in one stamp: the picture is two windows high and scrolls. */
  private snow(fair: Fair): void {
    const g = this.f.g, w = WINDOW
    g.save()
    g.beginPath()
    g.rect(w.x, w.y + 20, w.w, w.h - 20)
    g.clip()
    const fall = (fair.time * 26) % w.h, drift = Math.sin(fair.time * 0.5) * 8 + fair.swirl * Math.sin(fair.time * 9) * 26
    this.f.put(this.sprites.of('snow'), w.x + drift, w.y + fall - w.h)
    g.restore()
  }

  /** Where the flame on her hat is: it goes where she goes. */
  private hatFlame(fair: Fair): Point {
    const maker = fair.folk.pose('maker'), m = FOLK.maker
    return { x: m.x + HAT_FLAME.x - Math.sin(maker.lean) * HAT_FLAME.y, y: m.foot + maker.dy + HAT_FLAME.y * maker.squash - maker.part2 * 5 }
  }

  private flick(fair: Fair, t: number, i: number): number {
    return 1 + Math.sin(t * (9 + i * 1.7) + i * 2.1) * 0.08 + Math.sin(t * (23 + i * 3.1)) * 0.05 + fair.flutter.x * 0.5
  }

  /** The live pools of light the tier allows, brightest first. Each flickers with its flame. */
  private pools(fair: Fair, tier: Tier, t: number): void {
    const hat = this.hatFlame(fair), light = this.sprites.of('light')
    const pools: [number, number, number, number][] = [
      [POT.x, POT.y - 46, 330, 0.3 * this.flick(fair, t, 11)],
      [hat.x, hat.y - 14, 130, 0.3 * this.flick(fair, t, 7)],
      [LANTERNS[0].x, LANTERNS[0].y + 24, 150, 0.28 * this.flick(fair, t, 0)],
      [LANTERNS[1].x, LANTERNS[1].y + 24, 150, 0.28 * this.flick(fair, t, 1)],
    ]
    for (let i = 0; i < Math.min(tier.pools, pools.length); i++) this.f.shine(light, pools[i][0], pools[i][1], pools[i][3], pools[i][2] / 64)
    // A candle stood behind the star makes a lantern of it: the colour of its paper falls over the faces.
    const tint = this.tintOf(fair)
    if (tint) {
      this.f.shine(tint, STAR.x, STAR.y + 30, 0.42 * this.flick(fair, t, 3), 5, 3.6)
      // The four who are drawn before the light: the paper's colour on each face.
      for (const who of ['tuba', 'maker', 'baker', 'bundle'] as const) this.faceTint(fair, tint, who, t)
    }
  }

  /** The light of the star lantern, in its paper's colour, while a candle that still burns stands behind the star. */
  private tintOf(fair: Fair): Sprite | null {
    const star = fair.pieces.star
    if (fair.at !== 'star' || fair.slide || star.on?.craft !== 'candle' || star.on.mark !== MARK.none || fair.carry?.from.kind === 'bench') return null
    return this.sprites.of(`tint${(star.colour % 3) as 0 | 1 | 2}`)
  }

  private faceTint(fair: Fair, tint: Sprite, who: Who, t: number): void {
    const eyes = FOLK[who].eyes
    this.f.shine(tint, eyes.x, eyes.y, 0.34 * this.flick(fair, t, 3), FACE_TINT)
  }

  /** The two hanging lanterns, which swing, and the flame on her hat, which a large thing in her fist doubles. */
  private flames(fair: Fair, t: number): void {
    const f = this.f
    for (let i = 0; i < LANTERNS.length; i++) f.turn(this.sprites.of('lantern'), LANTERNS[i].x, LANTERNS[i].y - 26, fair.lamps[i].x)
    const maker = fair.folk.pose('maker'), hat = this.hatFlame(fair)
    f.turn(this.sprites.of('flame'), hat.x, hat.y, maker.lean + fair.flutter.x * 0.6 + maker.part2 * 0.2, 1 + maker.flame * 0.3, this.flick(fair, t, 7) * (1 + maker.flame * 0.9))
  }

  /**
   * The basket: on the counter at a stall and at the door, in the child's hand while it is carried, and in the
   * snow once it has been carried out, where it glows. One stamp, and one more for a thing that hops under a finger.
   */
  private basket(fair: Fair, bays: [Place, number][]): void {
    const f = this.f, shake = fair.basketShake.x
    const hopping = fair.hop.what === 'slot' && fair.hop.age < 0.3 && fair.hop.index >= 0 && fair.hop.index < fair.basket.length ? fair.hop.index : -1
    const taken = fair.carry?.from.kind === 'slot' ? fair.carry.from.index : fair.flight?.hides?.kind === 'slot' ? fair.flight.hides.index : -1
    const hidden = taken >= 0 ? taken : hopping
    const picture = this.sprites.basketWith(fair.basket, hidden)
    // Let go, it goes from the hand to where it belongs.
    const back = fair.basketFrom && fair.basketAge < 0.35 ? 1 - ease(fair.basketAge / 0.35) : 0
    if (fair.finished) {
      const door = bays.find(([place]) => place === 'door')
      if (!door) return
      const x = SNOW.x + door[1], y = SNOW.y - 88
      if (fair.glow > 0.01) f.shine(this.sprites.of('halo'), x, y + 30, fair.glow * (0.5 + haloPulse(fair.haloAge)), 3.4, 2.8)
      const from = fair.basketFrom ?? { x, y }
      f.turn(picture, x + (from.x - x) * back, y + (from.y - y) * back, shake * 0.05, 0.8 + back * 0.2, 0.8 + back * 0.2)
      return
    }
    if (fair.hooked) return f.turn(picture, fair.hooked.x, fair.hooked.y + 30, Math.sin(fair.time * 5) * 0.04)
    const from = fair.basketFrom ?? BASKET
    f.turn(picture, BASKET.x + (from.x - BASKET.x) * back, BASKET.y + (from.y - BASKET.y) * back, shake * 0.05)
    if (hidden === hopping && hopping >= 0) {
      const at = slotAt(hopping), up = Math.sin((fair.hop.age / 0.3) * Math.PI)
      f.turn(this.sprites.thing(fair.basket[hopping]), at.x, at.y - up * 22, 0, IN_BASKET * (1 + up * 0.12), IN_BASKET * (1 + up * 0.12))
    }
  }

  /** How big a thing in the air is when it lands: as it lies in the basket, on its bench, or in a hand. */
  private landed(flight: Flight): number {
    const to = flight.hides
    return !to ? 0.6 : to.kind === 'slot' ? IN_BASKET : to.kind === 'bench' ? 1 : HOLDS[to.who][flight.thing.craft].scale
  }

  /** What is in the air: the thing in the child's hand, a thing on its way, crumbs and needles, a wax bubble. */
  private inAir(fair: Fair): void {
    const f = this.f, g = f.g
    const flight = fair.flight
    if (flight) {
      const p = Math.min(1, flight.age / flight.lasts), q = flight.dip ? 1 - Math.abs(p * 2 - 1) : p, e = ease(q)
      const x = flight.from.x + (flight.to.x - flight.from.x) * e, y = flight.from.y + (flight.to.y - flight.from.y) * e - Math.sin(q * Math.PI) * (flight.dip ? 0 : 46)
      const size = flight.dip ? IN_BASKET + 0.14 * e : IN_HAND + (this.landed(flight) - IN_HAND) * e
      f.turn(this.sprites.thing(flight.thing, flight.hides?.kind === 'who'), x, y, flight.spin ? p * Math.PI * 2 : Math.sin(q * Math.PI) * 0.3, size, size)
    }
    if (fair.carry) f.turn(this.sprites.thing(fair.carry.thing), fair.carry.x, fair.carry.y - 26, Math.sin(fair.time * 6) * 0.05, IN_HAND, IN_HAND)
    if (fair.swell) {
      const p = fair.swell.age / 0.6, goat = FOLK.goat
      g.beginPath()
      if (fair.swell.kind === 'bubble') {
        // A wax bubble swells from its mouth.
        g.fillStyle = alpha(WAX_PALE[0], 0.8 - p * 0.3)
        g.arc(goat.x + 150 + p * 16, goat.foot - 46, 6 + p * 28, 0, Math.PI * 2)
      } else {
        // What it swallowed whole goes down its neck.
        g.fillStyle = alpha('#e8dfcc', 0.9 - p * 0.4)
        g.ellipse(goat.x + 30 - p * 190, goat.foot - 92 + p * 10, 34 - p * 8, 26 - p * 6, 0, 0, Math.PI * 2)
      }
      g.fill()
      f.ops(1)
    }
    // Crumbs, needles, flour and smoke: all of one kind in one fill.
    for (const kind of ['crumbs', 'needles', 'flour', 'smoke', 'sparks'] as const) {
      let any = false
      g.beginPath()
      for (const m of fair.motes) {
        if (m.kind !== kind) continue
        const left = 1 - m.age / m.life, r = kind === 'smoke' ? 7 + m.age * 12 : kind === 'flour' ? 5 : 4
        g.moveTo(m.x + r, m.y)
        g.ellipse(m.x, m.y, r * (kind === 'needles' ? 2.2 : 1), r * (kind === 'needles' ? 0.5 : 1) * (0.4 + left * 0.6), m.vx * 0.01, 0, Math.PI * 2)
        any = true
      }
      if (!any) continue
      g.fillStyle = alpha(MOTE[kind], kind === 'smoke' ? 0.35 : 0.9)
      g.fill()
      f.ops(1)
    }
  }

  /** The idle ladder: a glow on what answers, then an open hand that shows one move and does not do it. */
  private guide(fair: Fair, guidance: Guidance | null): void {
    if (!guidance || fair.inHand || fair.playing) return
    const f = this.f, g = f.g, halo: Sprite = this.sprites.of('halo')
    if (guidance.glow > 0.01) {
      const tall = fair.at === 'candle'
      glowsOf(fair).forEach((at, n) => f.shine(halo, at.x, at.y, guidance.glow * (0.42 + Math.sin(fair.time * 3 + n) * 0.08), n === 0 ? (tall ? 1.5 : 2.6) : 1.5, n === 0 ? (tall ? 3 : 2.6) : 1.5))
    }
    if (guidance.demo === null) return
    const show = showOf(fair, guidance.demoIndex)
    if (!show) return
    const pose = handPose(guidance.demo, show.to !== null, this.hand, show.presses)
    // The candle goes down into the pot and up again: one move, there and back.
    const there = fair.at === 'candle' && show.to?.x === POT.x ? Math.sin(pose.travel * Math.PI) : pose.travel
    const x = show.from.x + ((show.to?.x ?? show.from.x) - show.from.x) * there, y = show.from.y + ((show.to?.y ?? show.from.y) - show.from.y) * there
    g.globalAlpha = pose.opacity
    f.turn(this.sprites.of('hand'), x, y - (1 - pose.press) * 12, 0, 1 - pose.press * 0.05, 1 - pose.press * 0.05)
    g.globalAlpha = 1
  }
}
