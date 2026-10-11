import { KNOCK, LICK, MUMF, OON, PAT, PIB, lampAt, type Cast } from './cast'
import type { Tier } from './config'
import { COLD_COAT, MINT, MINT_DARK, MINT_LIGHT, MUMF_EARS, MUMF_EYES, MUMF_HINGE, MUMF_JAW_TIP, MUMF_NOSE, MUMF_PAWS, OON as OON_SKIN, OON_EYES, OON_HALF, OON_LIGHT, OON_NOSE, OON_TONGUE, PIB_EYES, PIB_MOUTH, PIB_NECK, PIB_STALKS, PLUM, PLUM_COAT, PLUM_LIGHT, paintFlame, paintGlow, paintHand, paintMouse, paintMumfBody, paintMumfHead, paintMumfJaw, paintMumfPinch, paintOon, paintPaw, paintPibBody, paintPibHead, paintSoft } from './figures'
import { handPose, type Guidance, type HandPose } from './guidance'
import type { Point } from './input'
import { SQUEEZE, type Mood, type Snack } from './jar'
import { CHILLI, EGG, ICE, JELLY, THINGS, countOf, radiusOf, type Kind } from './kinds'
import { BAG, COUNTER_Y, HANDLE, HANG_Y, JAR, JAR_MID, LAMP, MOUSE, PLACES, PULL, RAIL, SEAT, SEAT_EDGE, SHELF, STOOL, TIP, TROLLEY, WINDOW } from './layout'
import { HELD, JIGGLE, POUR_TO_LIP, airOf, flightAt, pourAt, shivering, type Play, type Pour, type PuffKind } from './play'
import { makeRng, type Rng } from './rng'
import { paintBag, paintJarBack, paintJarGlass, paintLamp, paintRoom, paintTrolley, paintWindowFront, WALL } from './room'
import { fit, type Fit } from './stage'
import { REACH, paintSweet, paintYolk, yolkAt } from './sweets'

// The frame (ART.md, "The look"). Everything that stands still or keeps its
// shape is painted once into a sprite, at the surface's own density, and a
// frame is stamps of those sprites plus a few live strokes for what moves
// inside a face or hangs on a string: pupils, lids, brows, a tongue, the
// claw's cable and arms, the lamp's cord, the mouse's tail. `draw` hands back
// how many of both it made, and that is the game's draw count.

type C = CanvasRenderingContext2D
type Sprite = { image: CanvasImageSource; x: number; y: number; w: number; h: number }
export type CanvasMaker = (width: number, height: number) => { getContext(kind: '2d'): C | null }

const TAU = Math.PI * 2
const MOODS: readonly Mood[] = ['calm', 'shut', 'glee', 'squeezed', 'yawn']
const PUFF_LIFE: Record<PuffKind, number> = { sugar: 0.5, smoke: 0.9, mist: 1.1, spark: 0.35, flame: 0.6, crumb: 0.7, drip: 0.7, steam: 1.1 }
type Seat = Cast['seat']

type Puff = { what: PuffKind; x: number; y: number; vx: number; vy: number; age: number; size: number }
type Shown = { ang?: number; sx?: number; sy?: number; mood?: Mood; slide?: number; bob?: number; alpha?: number }

/** Pib and Oon are drawn this much larger about the stool's seat, so the one at the jar is large beside it. */
const SEATED = 1.15
/** A point of theirs, carried to the stage. */
const seated = (x: number): number => STOOL.x + (x - STOOL.x) * SEATED
const seatedY = (y: number): number => STOOL.y + (y - STOOL.y) * SEATED
const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value))

export class View {
  private readonly c: C
  private readonly make: CanvasMaker
  private readonly chance: Rng
  private tier: Tier = { dpr: 2, puffs: 10, glint: true }
  private width = 0
  private height = 0
  private ratio = 1
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private density = 0
  private count = 0
  private readonly puffs: Puff[] = []
  private readonly pose: HandPose = { travel: 0, press: 0, opacity: 0 }
  /** Seconds of play this view has drawn, for what it sets off by itself (smoke, steam, crumbs). */
  private clock = 0
  private readonly passed = new Map<string, number>()
  /** What a monster throws over the jar (a long flame), drawn once the jar is. */
  private late: (() => void)[] = []
  /** How far the jar leans with the ghost hand, as a share of a tip. Drawing only. */
  private shown = 0

  // Sprites, painted when first needed and thrown away when the density changes.
  private room: Sprite | null = null
  private fixed = new Map<string, Sprite>()
  private sweets = new Map<number, Sprite>()

  /** `chance` scatters the dust and decides nothing else. */
  constructor(c: C, make: CanvasMaker, chance: Rng) {
    this.c = c
    this.make = make
    this.chance = chance
  }

  get fitted(): Fit {
    return this.by
  }

  setTier(tier: Tier): void {
    this.tier = tier
    this.cap()
  }

  /** The surface's size in CSS pixels and its pixel ratio. */
  resize(width: number, height: number, ratio: number): void {
    // The room is the size of the surface: it is painted once for each size and pixel ratio, and kept otherwise.
    if (width !== this.width || height !== this.height || ratio !== this.ratio) this.room = null
    this.width = width
    this.height = height
    this.ratio = ratio
    this.by = fit(width, height)
    const density = ratio * this.by.scale
    if (density !== this.density) {
      this.density = density
      this.fixed.clear()
      this.sweets.clear()
    }
  }

  /** Dust, smoke, mist, sparks or a flame at a point of the stage. */
  puff(what: PuffKind, x: number, y: number, n: number, push: number): void {
    for (let i = 0; i < n; i++) {
      const a = what === 'drip' ? Math.PI / 2 : what === 'sugar' || what === 'spark' || what === 'crumb' ? Math.PI + this.chance.next() * Math.PI : -Math.PI / 2 + (this.chance.next() - 0.5)
      const speed = push * (0.4 + this.chance.next() * 0.6)
      this.puffs.push({ what, x: x + (what === 'drip' ? 0 : (this.chance.next() - 0.5) * 16), y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, age: 0, size: 0.7 + this.chance.next() * 0.6 })
    }
    this.cap()
  }

  /**
   * The tier's cap on puffs is a cap on loose dust. A made snack's flame, drip or steam is never dropped for
   * it, since its sound plays: the oldest loose puff goes instead. Those are bounded by the snacks there are.
   */
  private cap(): void {
    let loose = 0
    for (const p of this.puffs) if (!HELD.includes(p.what)) loose += 1
    for (let i = 0; loose > this.tier.puffs && i < this.puffs.length; ) {
      if (HELD.includes(this.puffs[i].what)) i += 1
      else {
        this.puffs.splice(i, 1)
        loose -= 1
      }
    }
  }

  /**
   * Draws the frame and returns its draw count: sprite stamps plus live strokes and fills. With no game yet it
   * draws the empty shop. `step` is the seconds of play the frame advances, for the dust.
   */
  draw(play: Play | null, cast: Cast | null, guidance: Guidance | null, step: number): number {
    const c = this.c
    this.count = 0
    if (this.by.scale <= 0) return 0
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.globalAlpha = 1
    this.room ??= this.paintRoom()
    c.drawImage(this.room.image, 0, 0)
    this.count += 1
    if (!play || !cast) return this.count
    const s = this.ratio * this.by.scale
    c.setTransform(s, 0, 0, s, this.ratio * this.by.x, this.ratio * this.by.y)

    this.clock += step
    this.late = []
    this.atWindow(play, cast)
    this.lamp(cast)
    this.atJar(play, cast)
    const move = guidance ? this.move(play, guidance.demoIndex) : null
    // The rail and the claw hang behind the jar: a tipped jar passes in front of the snack under the claw, and
    // the snack is seen through the glass. So the claw, and the glow on its snack, are drawn before the jar.
    const onClaw = move !== null && move.drag && move.from.x >= JAR.left
    if (guidance && guidance.glow > 0.01 && onClaw) this.glow(play, guidance)
    this.claw(play)
    // While the ghost hand shows the pull, the jar leans a little with it, so the hand is seen to do something.
    this.shown = 0
    if (guidance && guidance.demo !== null && play.tip === 0 && move !== null && move.drag && !onClaw) {
      const pose = handPose(guidance.demo, true, this.pose)
      this.shown = pose.travel * pose.press * 0.22
    }
    this.jar(play)
    for (const draw of this.late) draw()
    this.shelf(play)
    this.counter(play, cast)
    if (guidance && guidance.glow > 0.01 && !onClaw) this.glow(play, guidance)
    for (const flight of play.flights) {
      const at = flightAt(flight)
      if (flight.thrown && flight.k & CHILLI && flight.t > 0 && flight.t < flight.lasts * airOf(flight.k)) {
        // Chilli rockets out on a jet of flame, which points back along the way it came.
        const was = flightAt({ ...flight, t: flight.t - 0.03 })
        c.save()
        c.translate(at.x, at.y)
        c.rotate(Math.atan2(was.y - at.y, was.x - at.x) + Math.PI / 2)
        c.translate(0, -radiusOf(flight.k) * 0.5)
        c.scale(0.9, 1.3 + 0.25 * Math.sin(play.time * 40))
        this.stamp(this.one('flame', -30, -52, 60, 56, (ctx) => paintFlame(ctx, 48)))
        c.restore()
      }
      this.sweet(flight.k, at.x, at.y, { ang: at.ang, sx: 1 + at.squash, sy: 1 - at.squash, mood: flight.t < 0 ? 'calm' : 'glee' })
    }
    this.dust(step)
    if (guidance && guidance.demo !== null) this.hand(play, guidance)
    c.globalAlpha = 1
    return this.count
  }

  // --- Sprites ------------------------------------------------------------------

  private sprite(x: number, y: number, w: number, h: number, paint: (c: C) => void): Sprite {
    const d = this.density
    const c = this.make(Math.max(1, Math.ceil(w * d)), Math.max(1, Math.ceil(h * d))).getContext('2d')!
    c.setTransform(d, 0, 0, d, -x * d, -y * d)
    paint(c)
    return { image: c.canvas, x, y, w, h }
  }

  private one(name: string, x: number, y: number, w: number, h: number, paint: (c: C) => void): Sprite {
    let sprite = this.fixed.get(name)
    if (!sprite) {
      sprite = this.sprite(x, y, w, h, paint)
      this.fixed.set(name, sprite)
    }
    return sprite
  }

  private stamp(sprite: Sprite): void {
    this.c.drawImage(sprite.image, sprite.x, sprite.y, sprite.w, sprite.h)
    this.count += 1
  }

  /** The whole room, as one sprite the size of the surface. */
  private paintRoom(): Sprite {
    const w = Math.max(1, Math.round(this.width * this.ratio)), h = Math.max(1, Math.round(this.height * this.ratio))
    const c = this.make(w, h).getContext('2d')!
    const s = this.ratio * this.by.scale
    c.fillStyle = WALL
    c.fillRect(0, 0, w, h)
    c.setTransform(s, 0, 0, s, this.ratio * this.by.x, this.ratio * this.by.y)
    const grain = makeRng(11)
    paintRoom(c, () => grain.next())
    return { image: c.canvas, x: 0, y: 0, w, h }
  }

  private sweetSprite(k: Kind, mood: Mood, withYolk: boolean): Sprite {
    const key = (k * 8 + MOODS.indexOf(mood)) * 2 + (withYolk ? 1 : 0)
    let sprite = this.sweets.get(key)
    if (!sprite) {
      const r = radiusOf(k), reach = r * REACH
      const grain = makeRng(k * 97 + 5)
      sprite = this.sprite(-reach, -reach, 2 * reach, 2 * reach, (c) => {
        paintSweet(c, k, r, mood, () => grain.next())
        const yolk = withYolk ? yolkAt(k) : null
        if (yolk) {
          c.translate(yolk.x * r, yolk.y * r)
          paintYolk(c, k, r)
        }
      })
      this.sweets.set(key, sprite)
    }
    return sprite
  }

  private yolkSprite(k: Kind): Sprite {
    const r = radiusOf(k) * 0.4
    return this.one(`yolk${k}`, -r, -r, 2 * r, 2 * r, (c) => paintYolk(c, k, radiusOf(k)))
  }

  /** One snack. With `slide` its yolk is drawn apart, that far to one side as a share of the radius. */
  private sweet(k: Kind, x: number, y: number, shown: Shown = {}): void {
    const c = this.c
    const live = shown.slide !== undefined && (k & EGG) !== 0
    c.save()
    c.translate(x, y)
    if (shown.ang) c.rotate(shown.ang)
    c.scale(shown.sx ?? 1, shown.sy ?? 1)
    if (shown.alpha !== undefined) c.globalAlpha = shown.alpha
    this.stamp(this.sweetSprite(k, shown.mood ?? 'calm', !live))
    if (live) {
      const at = yolkAt(k)!
      const r = radiusOf(k)
      c.translate((at.x + clamp(shown.slide!, -0.22, 0.22)) * r, (at.y + (shown.bob ?? 0)) * r)
      this.stamp(this.yolkSprite(k))
    }
    c.restore()
  }

  /**
   * A snack of the pile, squashed, popped and wobbling as the pile left it. Lying still it does nothing by itself,
   * but for what joining gave it: jelly's wobble, frost's shiver (and fire's flame, which is a puff).
   */
  private lying(s: Snack, time: number, mate?: Pick<Snack, 'x' | 'y'>): void {
    const jelly = (s.k & JELLY) !== 0
    const grown = (s.r / s.full) * (1 + clamp(s.pop, -0.3, 0.5))
    const squash = clamp(s.sq, -0.3, 0.4)
    const wobble = clamp(s.wob, -1.2, 1.2) * (jelly ? 0.1 : 0.03) + (made(s.k, JELLY) ? 0.02 * Math.sin(time * 2.4 + s.id) : 0)
    const shiver = s.shiver > 0 ? Math.sin(time * 70) * 2.5 : made(s.k, ICE) && shivering(time, s.id) ? Math.sin(time * 70) * 1.6 : 0
    // Two that are about to join squeeze together: each is pressed thin towards the other and leans into it.
    const { px, py, thinX, thinY } = squeezed(s, mate)
    this.sweet(s.k, s.x + shiver + px, s.y + s.full * (squash + wobble) * 0.8 + py, {
      ang: s.ang,
      sx: grown * (1 + squash + wobble) * thinX,
      sy: grown * (1 - squash - wobble) * thinY,
      mood: s.mood,
      // The yolk slides against the way it goes, and bobs as the white gathers itself up.
      slide: s.asleep ? undefined : clamp(-s.vx * 0.0012, -0.22, 0.22),
      bob: clamp(s.sqv * 0.02, -0.14, 0.14),
    })
  }

  // --- Those in the shop ----------------------------------------------------------

  /** True each time `value` passes a whole number: how a move sets off a puff once. */
  private passes(name: string, value: number): boolean {
    const whole = Math.floor(value)
    const before = this.passed.get(name)
    this.passed.set(name, whole)
    return before !== undefined && before !== whole
  }

  private paw(who: number): Sprite {
    const colours = PAWS[who]
    return this.one(`paw${who}`, -24, -30, 48, 54, (ctx) => paintPaw(ctx, colours[0], colours[1]))
  }

  /** The monster at the window: its face to the glass, its breath on it, and the hand that wipes or knocks. */
  private atWindow(play: Play, cast: Cast): void {
    const c = this.c
    const w = cast.win
    const entrance = play.entrance
    let who = play.atWindow, drop = 0
    if (entrance) {
      // The one that is called in ducks away; the one after it comes up.
      if (entrance.rise > 0) drop = 1 - smooth(entrance.rise)
      else {
        who = play.seat
        drop = smooth(entrance.duck)
      }
    }
    const mid = (WINDOW.left + WINDOW.right) / 2
    c.save()
    c.beginPath()
    c.rect(WINDOW.left, WINDOW.top, WINDOW.right - WINDOW.left, WINDOW.bottom - WINDOW.top)
    c.clip()
    if (drop < 0.98) {
      c.save()
      c.translate(mid, WINDOW.bottom + drop * 280)
      const back = 1 - clamp(w.recoil, -1, 1) * 0.06
      c.scale(back, back)
      if (who === MUMF) {
        // Slow and heavy: it rises and sinks on one long breath.
        c.translate(22, -76 + Math.sin(w.bob * 0.22) * 4)
        c.scale(0.56, 0.56)
        this.mumfFace({ jaw: 0.6 + 0.08 * Math.sin(w.bob * 0.11), eyeX: w.eyeX, eyeY: w.eyeY, lid: w.lid, brow: 0, droop: 0, cold: 0, chatter: 0 })
      } else if (who === PIB) {
        // Quick: its neck jumps to a new lean and holds it.
        c.translate(6, 16 + Math.sin(w.bob * 1.4) * 2.5)
        c.rotate(w.twitch.tilt)
        c.strokeStyle = MINT_DARK
        c.lineCap = 'round'
        c.lineWidth = 48
        c.beginPath()
        c.moveTo(0, 40)
        c.lineTo(0, -70)
        c.stroke()
        this.count += 1
        c.translate(0, -104)
        this.pibFace({ time: play.time, eyeX: w.eyeX, eyeY: w.eyeY, twitch: w.twitch, open: 0.75, droop: 0, twirl: 0, frost: false, heavy: 0, shut: -1, lick: 0, small: false })
      } else {
        // Sleepy: it heaves slowly under lids that sink.
        c.translate(4, -62 + Math.sin(w.bob * 0.13) * 3)
        c.scale(0.68, 0.68 * (1 + 0.02 * Math.sin(w.bob * 0.13)))
        const heavy = 0.58 + 0.42 * w.lid
        this.oonFace({ lids: [heavy, heavy, heavy], eyeX: w.eyeX, eyeY: w.eyeY, cross: 0, tiny: 0 })
        // Its tongue lies flat against the pane.
        c.fillStyle = '#ff8fa0'
        c.beginPath()
        c.ellipse(OON_TONGUE.x + 6, OON_TONGUE.y + 22, 30, 24, 0, 0, TAU)
        c.fill()
        this.count += 1
      }
      c.restore()
      // Its breath on the pane, and the hand that wipes it off or knocks.
      c.translate(mid + 6, WINDOW.bottom + 14 + drop * 280)
      if (w.fog > 0.03) {
        c.globalAlpha = w.fog * 0.75
        const fog = this.one('fog', -62, -62, 124, 124, (ctx) => paintSoft(ctx, 60, 'rgba(255, 255, 255, 0.95)'))
        c.save()
        c.translate(0, -52)
        c.scale(0.5 + w.fog * 0.6, 0.4 + w.fog * 0.45)
        this.stamp(fog)
        c.restore()
        c.globalAlpha = 1
      }
      const knock = w.knock > 0 ? Math.abs(Math.sin((w.knock / KNOCK) * TAU)) : 0
      const hx = w.wipe >= 0 ? -52 + w.wipe * 104 : 84, hy = w.wipe >= 0 ? -52 + Math.sin(w.wipe * Math.PI) * -14 : -22
      c.translate(hx, hy)
      c.rotate(w.wipe >= 0 ? (w.wipe - 0.5) * 0.8 : 0.25)
      c.scale(1 + knock * 0.22, 1 + knock * 0.22)
      this.stamp(this.paw(who))
    }
    c.restore()
    this.stamp(this.one('window', WINDOW.left - 2, WINDOW.top - 2, WINDOW.right - WINDOW.left + 4, WINDOW.bottom - WINDOW.top + 4, (ctx) => paintWindowFront(ctx)))
  }

  private lamp(cast: Cast): void {
    const c = this.c
    const at = lampAt(cast.lamp.ang)
    c.strokeStyle = '#8f6a2a'
    c.lineWidth = 3
    c.beginPath()
    c.moveTo(LAMP.x, -40)
    c.lineTo(at.x, at.y)
    c.stroke()
    this.count += 1
    c.save()
    c.translate(at.x, at.y)
    c.rotate(-cast.lamp.ang)
    this.stamp(this.one('lamp', -72, -38, 144, 144, (ctx) => paintLamp(ctx)))
    c.restore()
  }

  /** The monster at the jar, or the one walking out or in. Nothing of it at rest lies left of the seat's edge. */
  private atJar(play: Play, cast: Cast): void {
    const c = this.c
    const entrance = play.entrance
    let who = play.seat, dx = 0, hop = 0
    if (entrance) {
      // How far off the stage a monster walks: past the surface's right edge.
      const walk = (this.width - this.by.x) / this.by.scale - SEAT_EDGE + 30
      if (entrance.in > 0) {
        dx = (1 - smooth(entrance.in)) * walk
        hop = Math.abs(Math.sin(entrance.in * Math.PI * 5)) * 12 * (1 - entrance.in)
      } else if (entrance.out < 1) {
        who = entrance.leaving
        dx = smooth(entrance.out) * walk
        hop = Math.abs(Math.sin(entrance.out * Math.PI * 5)) * 10
      } else return
    }
    c.save()
    c.beginPath()
    c.rect(SEAT_EDGE, -4000, 8000, 8000)
    c.clip()
    c.translate(dx, -hop)
    if (who === MUMF) this.mumf(cast.seat, dx)
    else if (who === PIB) this.pib(cast.seat, play.time, dx)
    else this.oon(cast.seat, dx)
    c.restore()
  }

  /** Mumf's head from its ears to its brows, about the head's middle. Used at the jar and, smaller, at the window. */
  private mumfFace(face: { jaw: number; eyeX: number; eyeY: number; lid: number; shut?: number; brow: number; droop: number; cold: number; chatter: number; yolks?: number; swim?: number; lick?: number; drool?: number; cheeks?: number; breath?: number }): void {
    const c = this.c
    const coat = face.cold > 0.5 ? COLD_COAT : PLUM_COAT
    // Two ears that stand out from the fur, and hang when it cannot stand a smell.
    c.fillStyle = coat.dark
    c.beginPath()
    MUMF_EARS.forEach((root, i) => {
      const a = (i ? -0.5 : -1.25) + face.droop * (i ? 1.7 : 2.6)
      c.moveTo(root.x + Math.cos(a) * 76, root.y + Math.sin(a) * 76)
      c.ellipse(root.x + Math.cos(a) * 36, root.y + Math.sin(a) * 36, 40, 19, a, 0, TAU)
    })
    c.fill()
    this.count += 1
    this.stamp(this.one('mumf-head', -205, -205, 410, 365, (ctx) => {
      const grain = makeRng(37)
      paintMumfHead(ctx, () => grain.next())
    }))
    if (face.cold > 0.01) {
      // It turns blue from the top down.
      c.save()
      c.beginPath()
      c.rect(-205, -205, 410, 365 * clamp(face.cold / 0.55, 0, 1))
      c.clip()
      this.stamp(this.one('mumf-head-cold', -205, -205, 410, 365, (ctx) => {
        const grain = makeRng(37)
        paintMumfHead(ctx, () => grain.next(), COLD_COAT)
      }))
      c.restore()
    }
    if (face.cheeks !== undefined && face.cheeks > 0.02) {
      // Both cheeks bulge as it chews.
      c.fillStyle = coat.light
      c.beginPath()
      c.ellipse(-22, 10, 30 + 9 * face.cheeks, 26 + 6 * face.cheeks, 0, 0, TAU)
      c.ellipse(96, 30, 26 + 9 * (1 - face.cheeks), 24 + 6 * (1 - face.cheeks), 0, 0, TAU)
      c.fill()
      this.count += 1
    }
    // The tongue goes round its lips.
    if (face.lick !== undefined && face.lick > 0) {
      const sweep = 1 - face.lick / LICK
      c.fillStyle = '#ff8fa0'
      c.beginPath()
      c.ellipse(-170 + sweep * 110, 30 - Math.sin(sweep * Math.PI) * 12, 34, 13, -0.2 + sweep * 0.4, 0, TAU)
      c.fill()
      this.count += 1
    }
    c.save()
    c.translate(MUMF_HINGE.x, MUMF_HINGE.y)
    c.rotate(-face.jaw * 0.42 + face.chatter)
    if (face.cold > 0.5) {
      this.stamp(this.one('mumf-jaw-cold', -215, -45, 250, 140, (ctx) => {
        const grain = makeRng(41)
        paintMumfJaw(ctx, () => grain.next(), COLD_COAT)
      }))
    } else {
      this.stamp(this.one('mumf-jaw', -215, -45, 250, 140, (ctx) => {
        const grain = makeRng(41)
        paintMumfJaw(ctx, () => grain.next())
      }))
    }
    if (face.drool !== undefined && face.drool > 0.05) {
      c.strokeStyle = 'rgba(214, 240, 250, 0.85)'
      c.lineWidth = 5
      c.lineCap = 'round'
      c.beginPath()
      c.moveTo(MUMF_JAW_TIP.x + 26, MUMF_JAW_TIP.y + 6)
      c.lineTo(MUMF_JAW_TIP.x + 26 + Math.sin((face.breath ?? 0) * 2) * 3, MUMF_JAW_TIP.y + 6 + face.drool * 46)
      c.stroke()
      this.count += 1
    }
    c.restore()
    // Pupils that arrive late, or two yolks that slide about; heavy lids; brows.
    const yolks = (face.yolks ?? 0) > 0.5
    const swim = face.swim ?? 0
    c.fillStyle = yolks ? '#ff8a1f' : '#2b1838'
    c.beginPath()
    MUMF_EYES.forEach((eye, i) => {
      const far = eye.r - 19
      const x = eye.x + clamp(face.eyeX + Math.cos(swim * (i ? 1.3 : -1) + i * 2) * (swim ? 0.9 : 0), -1, 1) * far
      const y = eye.y + clamp(face.eyeY + Math.sin(swim * (i ? 1.3 : -1) + i * 2) * (swim ? 0.9 : 0), -1, 1) * far
      c.moveTo(x + 17, y)
      c.arc(x, y, 17, 0, TAU)
    })
    c.fill()
    const lid = clamp(0.24 + face.lid * 0.76 - face.brow * 0.14, 0, 0.97)
    c.fillStyle = coat.base
    c.beginPath()
    MUMF_EYES.forEach((eye, i) => {
      // The part of the eye above a line that sinks as the lid closes. `shut` closes one eye by itself.
      const r = eye.r + 2, a = Math.asin(clamp(2 * (i === face.shut ? 0.97 : lid) - 1, -1, 1))
      c.moveTo(eye.x + Math.cos(a) * r, eye.y + Math.sin(a) * r)
      c.arc(eye.x, eye.y, r, a, Math.PI - a, true)
      c.closePath()
    })
    c.fill()
    c.strokeStyle = coat.dark
    c.lineWidth = 11
    c.lineCap = 'round'
    c.beginPath()
    MUMF_EYES.forEach((eye, i) => {
      const lift = 10 + face.brow * 16, tip = (i ? -1 : 1) * (6 - face.brow * 8)
      c.moveTo(eye.x - eye.r * 0.9, eye.y - eye.r - lift + tip)
      c.lineTo(eye.x + eye.r * 0.9, eye.y - eye.r - lift - tip)
    })
    c.stroke()
    this.count += 3
  }

  /** Mumf at the jar: slow and heavy, from the jaw. Its six answers are here, one for each level (ART.md, Mumf's table). */
  private mumf(s: Seat, dx: number): void {
    const c = this.c
    const L = s.level, t = s.clock
    const amp = 1 - 0.55 * s.calm
    const breath = Math.sin(s.breath)
    const peeking = s.peek > 0
    const lean = s.lean - (peeking ? 0.45 : 0)
    // Jelly: the whole heap wobbles out of its control.
    const wub = L[4] * amp * Math.sin(t * TAU * 2.6)
    const pat = s.pat > 0 ? Math.sin((s.pat / PAT) * TAU * 2) : 0
    // Ice: blue from the top down, over a second and a half.
    const cold = L[5] * clamp(t / 1.6, 0, 1)
    const belly = s.poke + wub * 1.7 + pat * 0.8
    c.save()
    c.translate(SEAT.x + 12 + lean * 30, COUNTER_Y)
    c.scale(1 + belly * 0.035 - breath * 0.006, 1 + breath * 0.016 - belly * 0.03)
    this.stamp(this.one('mumf-body', -310, -280, 580, 440, (ctx) => {
      const grain = makeRng(31)
      paintMumfBody(ctx, () => grain.next())
    }))
    if (cold > 0.55) {
      c.save()
      c.beginPath()
      c.rect(-310, -280, 580, 440 * ((cold - 0.55) / 0.45))
      c.clip()
      this.stamp(this.one('mumf-body-cold', -310, -280, 580, 440, (ctx) => {
        const grain = makeRng(31)
        paintMumfBody(ctx, () => grain.next(), COLD_COAT)
      }))
      c.restore()
    }
    // Its toes, which curl when it is given chilli.
    const curl = L[3] * (0.7 + 0.3 * Math.sin(t * 6) * amp)
    c.fillStyle = '#fff3d6'
    c.beginPath()
    for (const paw of MUMF_PAWS) {
      for (const toe of [-22, 0, 22]) {
        const x = paw.x + toe * (1 - 0.4 * curl), y = paw.y + 12 - 10 * curl
        c.moveTo(x + 8, y)
        c.ellipse(x, y, 8, 6 - 2.5 * curl, 0, 0, TAU)
      }
    }
    c.fill()
    this.count += 1
    if (s.pat > 0) {
      c.translate(-40 + pat * 6, -90 - Math.abs(pat) * 14)
      this.stamp(this.paw(MUMF))
    }
    c.restore()

    // The head rides the breath and leans back from a burp.
    const hx = SEAT.x + lean * 58 + wub * 9, hy = SEAT.y - breath * 5 - belly * 6
    c.save()
    c.translate(hx, hy)
    c.rotate(lean * 0.16 + belly * 0.02)
    // Bread: slow chewing. Chilli: the jaw drops for the flame.
    const chew = Math.sin(t * TAU * 1.1)
    let jaw = s.jaw + (0.3 + 0.2 * chew - s.jaw) * L[0]
    jaw += (1 - jaw) * L[3] * (1 - 0.6 * s.calm)
    this.mumfFace({
      jaw,
      eyeX: peeking ? -1 : s.eyeX,
      eyeY: peeking ? 0.4 : s.eyeY,
      // An empty jar: it looks in with the eye nearest the jar, the other shut, and then blinks.
      lid: s.peek > 0 && s.peek < 0.25 ? 1 : peeking ? 0 : s.lid,
      shut: peeking ? 1 : undefined,
      brow: s.brow,
      droop: L[1],
      cold,
      chatter: L[5] * (0.35 + 0.65 * amp) * 0.07 * Math.sin(t * 46),
      yolks: L[2],
      swim: L[2] > 0.5 || L[4] > 0.5 ? t * (L[2] > 0.5 ? 2.3 : 1.2) + 0.01 : 0,
      lick: s.lick,
      drool: Math.max(s.drool, L[2]) * (1 + 1.6 * L[2]),
      cheeks: L[0] * (0.5 + 0.5 * chew),
      breath: s.breath,
    })
    if (L[5] > 0.02) {
      // An icicle grows on its nose.
      const long = 46 * L[5] * clamp((t - 0.5) / 1, 0, 1)
      c.fillStyle = '#d9f1ff'
      c.beginPath()
      c.moveTo(MUMF_NOSE.x - 9, MUMF_NOSE.y + 8)
      c.lineTo(MUMF_NOSE.x + 9, MUMF_NOSE.y + 8)
      c.lineTo(MUMF_NOSE.x + 1, MUMF_NOSE.y + 10 + long)
      c.fill()
      this.count += 1
    }
    if (L[1] > 0.02) {
      // Cheese: it pinches its nose shut with two fingers, on an arm that comes up from below.
      const up = L[1]
      const px = MUMF_NOSE.x + 4, py = MUMF_NOSE.y + 4 + (1 - up) * 190 + Math.sin(t * TAU * 2.08) * 2 * amp
      c.strokeStyle = PLUM
      c.lineCap = 'round'
      c.lineWidth = 40
      c.beginPath()
      c.moveTo(px + 10, py + 60)
      c.quadraticCurveTo(px + 40, py + 150, px + 96, py + 210)
      c.stroke()
      this.count += 1
      c.save()
      c.translate(px, py)
      this.stamp(this.one('mumf-pinch', -40, -14, 80, 90, (ctx) => paintMumfPinch(ctx)))
      c.restore()
    }
    c.restore()

    if (dx !== 0) return
    // What rises and falls from it. Chilli: the tips of its fur smoke. Bread: crumbs fall from its jaw.
    if (L[3] > 0.5 && this.passes('fur', this.clock / (0.2 + 0.7 * s.calm))) this.puff('smoke', hx - 90 + this.chance.next() * 180, hy - 150, 1, 24)
    if (L[0] > 0.5 && this.passes('crumbs', this.clock / (0.28 + 1.4 * s.calm))) this.puff('crumb', hx - 150 + this.chance.next() * 40, hy + 70, 2, 50)
    if (L[3] > 0.02) {
      // Chilli: one long slow flame, out over the jar, and then a lick of it at the lips for as long as it sits.
      const long = L[3] * (clamp((t - 0.15) / 0.5, 0, 1) * (1 - s.calm) * 5.2 + 0.5 + 0.12 * Math.sin(t * 17))
      const mouth = { x: hx - 150, y: hy + 40 }
      this.late.push(() => {
        c.save()
        c.translate(mouth.x, mouth.y)
        c.rotate(-1.13)
        c.scale(0.9 + long * 0.12, long)
        this.stamp(this.one('flame', -30, -52, 60, 56, (ctx) => paintFlame(ctx, 48)))
        c.restore()
      })
    }
  }

  /** Pib's head, about its middle: stalks, eyes that go their own ways, a mouth. Used at the jar and at the window. */
  private pibFace(face: { time: number; eyeX: number; eyeY: number; twitch: Cast['seat']['twitch']; open: number; droop: number; twirl: number; frost: boolean; heavy: number; shut: number; lick: number; small: boolean }): Point[] {
    const c = this.c
    const tips: Point[] = PIB_EYES.map((eye, i) => {
      const foot = PIB_STALKS[i], side = i ? 1 : -1
      // Bread: the stalks droop to the sides. Cheese: they twirl about their feet.
      let x = eye.x + (side * 84 - eye.x) * face.droop, y = eye.y + (-14 - eye.y) * face.droop
      const a = face.twirl * side
      const dx = x - foot.x, dy = y - foot.y
      x = foot.x + dx * Math.cos(a) - dy * Math.sin(a) * 0.6
      y = foot.y + dy * (0.7 + 0.3 * Math.cos(a)) + dx * Math.sin(a) * 0.3
      return { x, y }
    })
    c.strokeStyle = face.frost ? '#bfe6f5' : MINT_DARK
    c.lineWidth = 10
    c.lineCap = 'round'
    c.beginPath()
    PIB_STALKS.forEach((foot, i) => {
      c.moveTo(foot.x, foot.y)
      c.quadraticCurveTo(foot.x + (i ? 14 : -14) + Math.sin(face.time * 3 + i * 2) * 4, (foot.y + tips[i].y) / 2, tips[i].x, tips[i].y)
    })
    c.stroke()
    this.count += 1
    this.stamp(this.one('pib-head', -86, -64, 172, 128, (ctx) => {
      const grain = makeRng(23)
      paintPibHead(ctx, () => grain.next())
    }))
    c.fillStyle = '#fffdf6'
    c.beginPath()
    PIB_EYES.forEach((eye, i) => {
      c.moveTo(tips[i].x + eye.r, tips[i].y)
      c.arc(tips[i].x, tips[i].y, eye.r, 0, TAU)
    })
    c.fill()
    const stray = face.twitch.strayFor > 0
    const size = face.small ? 5 : 10
    c.fillStyle = '#2f3b36'
    c.beginPath()
    tips.forEach((tip, i) => {
      const x = tip.x + (i && stray ? face.twitch.strayX : face.eyeX) * 10, y = tip.y + (i && stray ? face.twitch.strayY : face.eyeY) * 9
      c.moveTo(x + size, y)
      c.arc(x, y, size, 0, TAU)
    })
    c.fill()
    this.count += 2
    // It blinks one eye at a time; bored, both lids hang.
    const winked = face.shut >= 0 ? face.shut : face.twitch.wink > 0.05 ? (face.twitch.winkLeft ? 0 : 1) : -1
    if (winked >= 0 || face.heavy > 0.05) {
      c.fillStyle = MINT
      c.beginPath()
      tips.forEach((tip, i) => {
        const r = PIB_EYES[i].r + 1
        if (i === winked) {
          c.moveTo(tip.x + r, tip.y)
          c.arc(tip.x, tip.y, r, 0, TAU)
        } else if (face.heavy > 0.05) {
          const a = Math.asin(clamp(2 * face.heavy * 0.62 - 1, -1, 1))
          c.moveTo(tip.x + Math.cos(a) * r, tip.y + Math.sin(a) * r)
          c.arc(tip.x, tip.y, r, a, Math.PI - a, true)
          c.closePath()
        }
      })
      c.fill()
      this.count += 1
    }
    // The mouth, open: its one want.
    const open = clamp(face.open, 0, 1.6)
    c.fillStyle = '#2f5a48'
    c.beginPath()
    c.ellipse(PIB_MOUTH.x, PIB_MOUTH.y, 30 - 7 * Math.min(1, open), 4 + 14 * open, 0, 0, TAU)
    c.fill()
    this.count += 1
    if (open > 0.35 || face.lick > 0) {
      const sweep = face.lick > 0 ? 1 - face.lick / LICK : 0.5
      c.fillStyle = '#ff8fa0'
      c.beginPath()
      if (face.lick > 0) c.ellipse(PIB_MOUTH.x - 22 + sweep * 44, PIB_MOUTH.y - 12 - Math.sin(sweep * Math.PI) * 5, 13, 7, 0, 0, TAU)
      else c.ellipse(PIB_MOUTH.x, PIB_MOUTH.y + 6 * open, 15, 3 + 5 * open, 0, 0, TAU)
      c.fill()
      this.count += 1
    }
    return tips
  }

  /** Pib at the jar: quick and twitchy, from the neck. Its six answers are here (ART.md, Pib's table). */
  private pib(s: Seat, time: number, dx: number): void {
    const c = this.c
    const L = s.level, t = s.clock
    const amp = 1 - 0.55 * s.calm
    const peeking = s.peek > 0
    const lean = s.lean - (peeking ? 0.5 : 0)
    const pat = s.pat > 0 ? Math.sin((s.pat / PAT) * TAU * 2) : 0
    // Ice: it slides down in its seat.
    const slide = L[5] * 40
    const ox = STOOL.x + lean * 14, oy = STOOL.y + slide
    c.save()
    c.translate(STOOL.x, STOOL.y)
    c.scale(SEATED, SEATED)
    c.translate(-STOOL.x, -STOOL.y)
    c.save()
    c.translate(ox, oy)
    c.rotate(L[5] * 0.12 + lean * 0.05)
    c.scale(1 + pat * 0.04, 1 - pat * 0.04 + 0.012 * Math.sin(s.breath))
    this.stamp(this.one('pib-body', -100, -126, 200, 240, (ctx) => {
      const grain = makeRng(29)
      paintPibBody(ctx, () => grain.next())
    }))
    if (s.pat > 0) {
      c.translate(-6 + pat * 5, -44 - Math.abs(pat) * 10)
      this.stamp(this.paw(PIB))
    }
    c.restore()

    // The neck. Cheese: it shoots up to half as long again. A poke: it snaps short and comes back.
    const base = { x: ox - 24, y: oy - 102 }
    const short = 1 - 0.45 * clamp(Math.abs(s.poke), 0, 1)
    const giggle = L[4] * amp * -9 * Math.abs(Math.sin(t * TAU * 5.5))
    const reach = { x: (PIB_NECK.rest.x + (PIB_NECK.long.x - PIB_NECK.rest.x) * L[1]) * short + lean * 36, y: (PIB_NECK.rest.y + (PIB_NECK.long.y - PIB_NECK.rest.y) * L[1]) * short + giggle + Math.sin(s.breath) * 2 }
    const far = Math.hypot(reach.x, reach.y) || 1
    const px = -reach.y / far, py = reach.x / far
    const wave = L[4] * (0.4 + 0.6 * amp) * 15
    const along = (u: number): Point => {
      // A swan's bow, and with jelly a wave that runs up it like a noodle.
      const off = Math.sin(Math.PI * u) * (6 + wave * Math.sin(u * TAU * 2.2 - t * 10))
      return { x: base.x + reach.x * u + px * off, y: base.y + reach.y * u + py * off }
    }
    const trace = (upTo: number) => {
      c.beginPath()
      c.moveTo(base.x + 6, base.y + 22)
      for (let i = 0; i <= 10; i++) {
        const at = along((i / 10) * upTo)
        c.lineTo(at.x, at.y)
      }
    }
    c.lineCap = 'round'
    c.lineJoin = 'round'
    trace(1)
    c.strokeStyle = MINT_DARK
    c.lineWidth = 34
    c.stroke()
    c.strokeStyle = MINT
    c.lineWidth = 26
    c.stroke()
    this.count += 2
    // Chilli: the neck turns red from the bottom up.
    const red = L[3] * clamp(t / 1.4, 0, 1)
    if (red > 0.02) {
      trace(red)
      c.strokeStyle = '#ef6a4f'
      c.lineWidth = 26
      c.stroke()
      this.count += 1
    }
    if (L[2] > 0.02) {
      // Egg: a lump runs up the neck and down again with each hiccup.
      const period = 0.7 + 1.9 * s.calm
      const phase = (t % period) / period
      const at = along(Math.sin(Math.PI * Math.min(1, phase / 0.8)) * 0.92)
      c.fillStyle = red > 0.5 ? '#f48a70' : MINT_LIGHT
      c.beginPath()
      c.arc(at.x, at.y, 25 * L[2], 0, TAU)
      c.fill()
      this.count += 1
    }

    const head = along(1)
    c.save()
    c.translate(head.x, head.y)
    c.rotate(s.twitch.tilt + lean * 0.1 + L[4] * amp * 0.1 * Math.sin(t * 9))
    // Bread: two bored chews, then a yawn. Chilli and cheese: wide open.
    let open = s.jaw
    const yawn = t < 0.5 ? 0.2 + 0.5 * Math.abs(Math.sin(t * TAU * 2)) : t < 1.5 ? 0.3 + 1.2 * Math.sin(((t - 0.5) / 1) * Math.PI) : 0.3 + 0.9 * Math.max(0, Math.sin((t * TAU) / 5)) ** 6
    open += (yawn - open) * L[0]
    open += (1 - open) * Math.max(L[3], L[1]) * (1 - 0.4 * s.calm)
    const tips = this.pibFace({
      time,
      eyeX: peeking ? -1 : s.eyeX,
      eyeY: peeking ? 0.6 : s.eyeY,
      twitch: s.twitch,
      open,
      droop: L[0],
      twirl: L[1] * t * (1.2 + 6 * amp),
      frost: L[5] > 0.5,
      heavy: Math.max(L[0], s.peek > 0 && s.peek < 0.25 ? 1.6 : 0),
      shut: peeking && s.peek >= 0.25 ? 1 : -1,
      lick: s.lick,
      small: L[3] > 0.5,
    })
    if (L[3] > 0.3) {
      // Chilli: it fans its mouth.
      c.save()
      c.translate(-56 + Math.sin(t * 20) * 12 * (0.4 + 0.6 * amp), 34)
      c.rotate(-0.5 + Math.sin(t * 20) * 0.35)
      this.stamp(this.paw(PIB))
      c.restore()
    }
    c.restore()
    c.restore()

    if (dx !== 0) return
    // Chilli: steam whistles out of both eye stalks. Ice: frost sparkles on them, and it sighs a small cold cloud.
    if (L[3] > 0.5 && this.passes('steam', this.clock / (0.1 + 0.5 * s.calm))) {
      const tip = tips[this.chance.next() < 0.5 ? 0 : 1]
      this.puff('mist', seated(head.x + tip.x), seatedY(head.y + tip.y - 20), 1, 90)
    }
    if (L[5] > 0.5 && this.passes('frost', this.clock / (0.16 + 0.6 * s.calm))) {
      const tip = tips[this.chance.next() < 0.5 ? 0 : 1]
      this.puff('sugar', seated(head.x + tip.x), seatedY(head.y + tip.y - 6), 1, 26)
    }
    if (L[5] > 0.5 && this.passes('sigh', (t + 2.3) / 2.8)) this.puff('mist', seated(head.x - 26), seatedY(head.y + PIB_MOUTH.y), 2, 16)
  }

  /** Oon's eyes, about the blob's middle, over the sprite: lids that sink, and pupils. Used at the jar and at the window. */
  private oonFace(face: { lids: readonly number[]; eyeX: number; eyeY: number; cross: number; tiny: number }): void {
    const c = this.c
    this.stamp(this.one('oon', -172, -110, 344, 222, (ctx) => {
      const grain = makeRng(47)
      paintOon(ctx, () => grain.next())
    }))
    const size = 10 - 5 * face.tiny
    c.fillStyle = '#3b1d0c'
    c.beginPath()
    OON_EYES.forEach((eye, i) => {
      // Ice: its eyes cross.
      const toX = i === 0 ? 1 : i === 2 ? -1 : 0, toY = i === 1 ? 1 : 0.2
      const x = eye.x + (face.eyeX + (toX - face.eyeX) * face.cross) * (eye.r - 11), y = eye.y + (face.eyeY + (toY - face.eyeY) * face.cross) * (eye.r - 11)
      c.moveTo(x + size, y)
      c.arc(x, y, size, 0, TAU)
    })
    c.fill()
    c.fillStyle = OON_SKIN
    c.beginPath()
    OON_EYES.forEach((eye, i) => {
      const lid = clamp(face.lids[i], 0, 0.99)
      if (lid < 0.03) return
      const r = eye.r + 2, a = Math.asin(clamp(2 * lid - 1, -1, 1))
      c.moveTo(eye.x + Math.cos(a) * r, eye.y + Math.sin(a) * r)
      c.arc(eye.x, eye.y, r, a, Math.PI - a, true)
      c.closePath()
    })
    c.fill()
    this.count += 2
  }

  /** Oon at the jar: sleepy and heavy-lidded, from the tongue. Its six answers are here (ART.md, Oon's table). */
  private oon(s: Seat, dx: number): void {
    const c = this.c
    const L = s.level, t = s.clock
    const amp = 1 - 0.55 * s.calm
    const peeking = s.peek > 0
    const lean = s.lean - (peeking ? 0.4 : 0)
    const pat = s.pat > 0 ? Math.sin((s.pat / PAT) * TAU * 2) : 0
    // Chilli: it shoots straight up off its seat, and stays up.
    const air = L[3] * ((110 + 16 * Math.sin(t * 9)) * (1 - s.calm) + (64 + 9 * Math.sin(t * 3)) * s.calm)
    // Jelly: it melts into a wide wobbling puddle.
    const melt = L[4]
    const wob = melt * (0.4 + 0.6 * amp) * Math.sin(t * TAU * 1.5)
    // Bread: it chews, and falls asleep in the middle of it.
    const chewing = L[0] * (t < 0.6 ? Math.abs(Math.sin(t * TAU * 2.5)) : 0)
    const asleep = L[0] * (t > 0.6 ? 1 : 0)
    const cx = STOOL.x - 9 + lean * 30, foot = STOOL.y + 4 - air
    const sx = 1 + 0.13 * melt + 0.035 * wob + pat * 0.03, sy = (1 - 0.48 * melt) * (1 - 0.05 * wob + 0.02 * Math.sin(s.breath) - 0.05 * chewing - pat * 0.03)
    c.save()
    c.translate(STOOL.x, STOOL.y)
    c.scale(SEATED, SEATED)
    c.translate(-STOOL.x, -STOOL.y)
    c.save()
    c.translate(cx, foot)
    c.scale(sx, sy)
    c.translate(0, -OON_HALF.y)
    // Its lids: heavy, shut in sleep, sprung open by egg (one after the other), chilli and ice.
    const heavy = 0.58 + 0.42 * s.lid
    const lids = OON_EYES.map((_, i) => {
      let lid = Math.max(heavy, asleep)
      if (s.peep > 0 && i === 1) lid = s.peep > 0.28 ? 0.02 : 1
      const wide = Math.max(L[2] * (t > 0.25 * (i + 1) ? 1 : 0), L[3], 0.7 * L[5])
      lid *= 1 - wide
      if (peeking) lid = s.peek < 0.25 ? 1 : i === 0 ? 0.05 : 1
      return lid
    })
    this.oonFace({ lids, eyeX: peeking ? -1 : s.eyeX, eyeY: peeking ? 0.3 : s.eyeY, cross: L[5], tiny: L[3] })

    // The tongue. It hangs; cheese pulls it out long and it twangs back; ice sticks it straight out, stiff.
    const root = OON_TONGUE
    let tip = { x: root.x - 12 + 5 * Math.sin(s.breath), y: root.y + 44 }, bend = { x: root.x - 18, y: root.y + 14 }, thick = 24
    const beat = t % 1.7
    const pull = beat < 0.8 ? smooth(beat / 0.8) : Math.exp(-7 * (beat - 0.8)) * Math.cos((beat - 0.8) * 30)
    const stretch = L[1] * (pull * (1 - s.calm) + (0.5 + 0.06 * Math.sin(t * 2)) * s.calm)
    tip.y += stretch * 170
    thick -= 9 * Math.max(0, stretch)
    if (L[5] > 0.02) {
      const stiff = { x: root.x - 84, y: root.y + 2 + L[1] * 7 * Math.sin(t * 38) * amp }
      tip = { x: tip.x + (stiff.x - tip.x) * L[5], y: tip.y + (stiff.y - tip.y) * L[5] }
      bend = { x: bend.x + ((root.x + tip.x) / 2 - bend.x) * L[5], y: bend.y + ((root.y + tip.y) / 2 - bend.y) * L[5] }
      thick += (20 - thick) * L[5]
    }
    if (s.lick > 0) {
      const sweep = 1 - s.lick / LICK
      tip = { x: root.x - 30 + sweep * 70, y: root.y - 36 - Math.sin(sweep * Math.PI) * 8 }
      bend = { x: root.x - 22, y: root.y - 8 }
    }
    c.strokeStyle = L[5] > 0.5 ? '#bfe3f7' : '#ff8fa0'
    c.lineCap = 'round'
    c.lineWidth = thick
    c.beginPath()
    c.moveTo(root.x, root.y)
    c.quadraticCurveTo(bend.x, bend.y, tip.x, tip.y)
    c.stroke()
    this.count += 1
    if (L[3] > 0.3) {
      // Chilli: a flame flickers on the tip of its tongue.
      c.save()
      c.translate(tip.x, tip.y - 6)
      c.scale(0.7 + 0.1 * Math.sin(t * 23), (0.75 + 0.2 * Math.sin(t * 17)) / sy)
      this.stamp(this.one('flame', -30, -52, 60, 56, (ctx) => paintFlame(ctx, 48)))
      c.restore()
    }
    if (asleep > 0.5) {
      // Bread: a bubble swells from its nose and pops.
      const period = 1.9 + 1.6 * s.calm
      const swell = ((t - 0.6) % period) / (period - 0.3)
      if (swell < 1) {
        const r = (8 + 24 * swell) * (1 - 0.3 * s.calm)
        c.fillStyle = 'rgba(214, 240, 250, 0.45)'
        c.strokeStyle = 'rgba(255, 255, 255, 0.9)'
        c.lineWidth = 2.5
        c.beginPath()
        c.arc(OON_NOSE.x - r * 0.8, OON_NOSE.y + 4 - r * 0.3, r, 0, TAU)
        c.fill()
        c.stroke()
        this.count += 2
      }
    }
    if (s.pat > 0) {
      c.translate(30 + pat * 6, 46 - Math.abs(pat) * 10)
      this.stamp(this.paw(OON))
    }
    c.restore()
    c.restore()
    if (dx !== 0) return
    if (asleep > 0.5 && s.calm < 0.5 && this.passes('pop', (t - 0.6) / 1.9)) this.puff('mist', seated(cx + (OON_NOSE.x - 20) * sx), seatedY(foot + (OON_NOSE.y - OON_HALF.y) * sy), 1, 30)
  }

  // --- The jar, the shelf and the counter -------------------------------------------

  /** The jar's own turn: tipped on its foot towards the mouth, rocked on its base, swollen before a burp. */
  private turnJar(play: Play): void {
    const c = this.c
    c.translate(TIP.x, TIP.y)
    c.rotate((play.tip + this.shown) * TIP.angle)
    c.translate(-TIP.x, -TIP.y)
    c.translate(JAR_MID, JAR.floor + JAR.glass)
    c.rotate(play.tilt * 0.05)
    c.scale(1 + play.swell * 0.045, 1 - play.swell * 0.012)
    c.translate(-JAR_MID, -(JAR.floor + JAR.glass))
  }

  private jar(play: Play): void {
    const c = this.c
    const time = play.time
    const box = { x: HANDLE.left - 44, y: JAR.rim - 30, w: JAR.right - HANDLE.left + 44 + 34, h: JAR.floor - JAR.rim + 30 + 26 }
    c.save()
    this.turnJar(play)
    this.stamp(this.one('jar-back', box.x, box.y, box.w, box.h, (ctx) => paintJarBack(ctx)))
    for (const s of play.jar.snacks) this.lying(s, time, s.mate < 0 ? undefined : play.jar.snacks.find((other) => other.id === s.mate))
    // The ones a burp is about to throw out shake where they lie.
    for (let i = 0; i < play.leaving.length; i++) {
      const gone = play.leaving[i]
      this.sweet(gone.k, gone.x + Math.sin(time * 50 + i) * 3 * play.swell, gone.y - play.swell * 8, { mood: 'squeezed' })
    }
    c.restore()
    // What a tip pours out slides to the lip inside the glass, and flies from there to the mouth in front of it.
    for (const pour of play.pouring) if (pour.out <= POUR_TO_LIP) this.pour(pour, play.tip)
    c.save()
    this.turnJar(play)
    this.stamp(this.one('jar-glass', box.x, box.y, box.w, box.h, (ctx) => paintJarGlass(ctx)))
    if (this.tier.glint) {
      // One glint that drifts slowly up and down the glass.
      const glint = this.one('glint', -14, -60, 28, 120, (ctx) => {
        const shine = ctx.createLinearGradient(0, -60, 0, 60)
        shine.addColorStop(0, 'rgba(255, 255, 255, 0)')
        shine.addColorStop(0.5, 'rgba(255, 255, 255, 0.75)')
        shine.addColorStop(1, 'rgba(255, 255, 255, 0)')
        ctx.fillStyle = shine
        ctx.beginPath()
        ctx.roundRect(-9, -60, 18, 120, 9)
        ctx.fill()
      })
      c.translate(JAR.left + 28, (JAR.rim + JAR.floor) / 2 + Math.sin(time * 0.5) * 120)
      this.stamp(glint)
    }
    c.restore()
    for (const pour of play.pouring) if (pour.out > POUR_TO_LIP) this.pour(pour, play.tip)
  }

  private pour(pour: Pour, tip: number): void {
    const at = pourAt(pour, tip)
    this.sweet(pour.k, at.x, at.y, { ang: tip * TIP.angle + pour.out * 1.2, sx: at.size, sy: at.size, mood: pour.out > 0.05 ? 'glee' : 'calm' })
  }

  private shelf(play: Play): void {
    for (let i = 0; i < THINGS.length; i++) {
      const k: Kind = 1 << i
      // All six are on the shelf, always: one that was taken comes up out of its cup again at once.
      const back = play.shelfBack[i]
      const rise = back > 0 ? clamp(1 - back / 0.45, 0, 1) : 1
      if (rise <= 0.02) continue
      this.sweet(k, SHELF[i].x, SHELF[i].y - 8 + (1 - rise) * 26, { sx: 0.6 + rise * 0.4, sy: 0.4 + rise * 0.6 })
    }
  }

  private counter(play: Play, cast: Cast): void {
    const c = this.c
    const mouse = cast.mouse
    const hide = clamp(mouse.hide, 0, 1)
    const bagX = (BAG.left + BAG.right) / 2
    const drawMouse = () => {
      // A hop from the counter to over the bag's mouth, then down into it.
      const up = clamp(hide / 0.5, 0, 1), down = clamp((hide - 0.5) / 0.5, 0, 1)
      const x = MOUSE.x + (bagX - MOUSE.x) * up, y = MOUSE.y + (BAG.top + 4 - MOUSE.y) * up - Math.sin(up * Math.PI) * 50 + down * 70
      const facing = hide > 0.05 ? -1 : mouse.turn >= 0 ? 1 : -1
      c.save()
      c.translate(x, y)
      c.scale(facing * (0.35 + 0.65 * Math.min(1, Math.abs(mouse.turn) + hide)), 1)
      // A string tail that sways.
      c.strokeStyle = '#fffaf0'
      c.lineWidth = 3
      c.lineCap = 'round'
      c.beginPath()
      c.moveTo(-38, 6)
      c.bezierCurveTo(-58, 2 + Math.sin(mouse.tail) * 8, -62, 20 - Math.sin(mouse.tail) * 8, -80, 12 + Math.cos(mouse.tail) * 6)
      c.stroke()
      this.count += 1
      c.rotate(mouse.twitch * 0.05)
      this.stamp(this.one('mouse', -48, -40, 100, 72, (ctx) => {
        const grain = makeRng(43)
        paintMouse(ctx, () => grain.next())
      }))
      c.restore()
    }
    if (hide > 0.3) drawMouse()
    c.save()
    c.translate(bagX, BAG.bottom)
    c.rotate(cast.bag.shake * 0.05)
    this.stamp(this.one('bag', -(BAG.right - BAG.left) / 2 - 14, -(BAG.bottom - BAG.top) - 6, BAG.right - BAG.left + 28, BAG.bottom - BAG.top + 20, (ctx) => paintBag(ctx)))
    c.restore()
    if (hide <= 0.3) drawMouse()
    for (let i = 0; i < PLACES.length; i++) {
      const k = play.counter[i]
      if (!k || !play.placeIn[i]) continue
      // A snack that was given jelly never quite stops wobbling, on the counter as in the jar.
      // One a burp set down jiggles for a long time; frost shivers here as it does in the jar.
      const jig = play.jiggle[i] / JIGGLE
      const wobble = (made(k, JELLY) ? 0.02 * Math.sin(play.time * 2.4 + i) : 0) + 0.14 * jig * jig * Math.sin(play.time * 15)
      const shiver = made(k, ICE) && shivering(play.time, 40 + i) ? Math.sin(play.time * 70) * 1.6 : 0
      this.sweet(k, PLACES[i].x + shiver, PLACES[i].y + 30 - radiusOf(k) * 0.82 + radiusOf(k) * wobble * 0.8, { sx: 1 + wobble, sy: 1 - wobble })
    }
  }

  // --- The claw ------------------------------------------------------------------------

  private claw(play: Play): void {
    const c = this.c
    const claw = play.claw
    const holds = claw.k !== 0 && claw.in
    const r = radiusOf(claw.k || 1 << play.pick)
    const hang = play.hang
    // Where the cable ends and the arms begin: at the top of the snack.
    const reach = HANG_Y - RAIL.y - r * 0.86
    const gx = claw.x + Math.sin(claw.ang) * reach, gy = RAIL.y + Math.cos(claw.ang) * reach
    c.strokeStyle = '#8f6a2a'
    c.lineWidth = 4
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(claw.x, RAIL.y + 14)
    c.lineTo(gx, gy)
    c.stroke()
    this.count += 1
    c.save()
    c.translate(claw.x, RAIL.y)
    this.stamp(this.one('trolley', -TROLLEY.half, -TROLLEY.up, 2 * TROLLEY.half, TROLLEY.up + TROLLEY.down, (ctx) => paintTrolley(ctx)))
    c.restore()
    if (holds) {
      // Jelly wobbles all the way, more the faster it swings; what joining gave a snack goes on under the claw too.
      const lively = clamp(Math.abs(claw.angv) / 3 + Math.abs(claw.v) / 900, 0, 1)
      const wobble = claw.k & JELLY ? 0.09 * lively * Math.sin(play.time * 17) + (made(claw.k, JELLY) ? 0.02 * Math.sin(play.time * 2.4) : 0) : 0
      const shiver = made(claw.k, ICE) && shivering(play.time, 50) ? Math.sin(play.time * 70) * 1.6 : 0
      this.sweet(claw.k, hang.x + shiver, hang.y, { ang: -claw.ang, sx: 1 + wobble, sy: 1 - wobble, mood: play.held ? 'glee' : 'calm', slide: claw.ang * 0.5 })
    }
    // Two arms round the snack, which spring open when it is let go.
    const open = claw.open
    c.save()
    c.translate(gx, gy)
    c.rotate(-claw.ang)
    c.strokeStyle = '#c2903a'
    c.lineWidth = 8
    c.lineJoin = 'round'
    c.beginPath()
    for (const side of [-1, 1]) {
      c.moveTo(0, 0)
      c.quadraticCurveTo(side * (r * 0.98 + open * 22), -2 - open * 6, side * (r * 0.9 + open * 30), r * 0.62 - open * 14)
    }
    c.stroke()
    c.fillStyle = '#f6dc8a'
    c.beginPath()
    c.arc(0, 0, 8, 0, TAU)
    c.fill()
    this.count += 2
    c.restore()
  }

  // --- Dust, the glow and the ghost hand ---------------------------------------------------

  private dust(step: number): void {
    const c = this.c
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i]
      p.age += step
      const life = PUFF_LIFE[p.what]
      if (p.age >= life) {
        this.puffs.splice(i, 1)
        continue
      }
      const t = p.age / life
      if (p.what === 'sugar' || p.what === 'spark' || p.what === 'crumb') p.vy += 900 * step
      else if (p.what === 'drip') p.vy += 500 * step
      else if (p.what === 'mist') p.vy += 60 * step
      else if (p.what === 'steam') p.vy -= 40 * step
      else if (p.what === 'smoke') p.vy -= 80 * step
      p.x += p.vx * step
      p.y += p.vy * step
      c.save()
      c.translate(p.x, p.y)
      if (p.what === 'flame') {
        const tall = Math.sin(t * Math.PI)
        c.rotate(0.5)
        c.scale(p.size * (0.5 + tall * 0.6), p.size * tall)
        this.stamp(this.one('flame', -30, -52, 60, 56, (ctx) => paintFlame(ctx, 48)))
      } else {
        const size = p.what === 'sugar' ? 0.22 : p.what === 'crumb' ? 0.26 : p.what === 'drip' ? 0.3 : p.what === 'spark' ? 0.2 : 0.45 + t * 0.9
        c.globalAlpha = (1 - t) * (p.what === 'smoke' ? 0.55 : p.what === 'mist' || p.what === 'steam' ? 0.5 : 0.95)
        c.scale(p.size * size, p.size * size)
        const colour = p.what === 'sugar' ? 'rgba(255, 255, 255, 1)' : p.what === 'crumb' ? 'rgba(204, 140, 60, 1)' : p.what === 'drip' ? 'rgba(255, 200, 20, 1)' : p.what === 'spark' ? 'rgba(255, 214, 80, 1)' : p.what === 'smoke' ? 'rgba(110, 96, 96, 0.9)' : 'rgba(205, 238, 255, 0.95)'
        this.stamp(this.one(p.what === 'steam' ? 'mist' : p.what, -26, -26, 52, 52, (ctx) => paintSoft(ctx, 24, colour)))
      }
      c.restore()
    }
    c.globalAlpha = 1
  }

  /**
   * What the idle ladder shows, by what the scene on screen is waiting for (ART.md, "The scenes"): a fed monster
   * and an empty jar, the one at the window; a made snack in the jar, the handle; otherwise a slide of the claw
   * and a let-go, then a thing on the shelf. `from` and `to` are where the ghost hand's fingertip goes, set below
   * or beside what it shows so the hand never lies over a face; `glow` is the middle of what glows.
   */
  private move(play: Play, index: number): { from: Point; to: Point; drag: boolean; glow: Point } {
    const turn = Math.max(0, index)
    if (play.finished && play.jar.snacks.length === 0) {
      const at = { x: WINDOW.right - 46, y: WINDOW.bottom - 30 }
      return { from: at, to: at, drag: false, glow: { x: (WINDOW.left + WINDOW.right) / 2, y: WINDOW.bottom - 96 } }
    }
    if (turn % 2 === 0 && play.jar.snacks.some((s) => countOf(s.k) > 1)) {
      const from = { x: (HANDLE.left + HANDLE.right) / 2, y: (HANDLE.top + HANDLE.bottom) / 2 + 30 }
      return { from, to: { x: from.x + PULL * 0.75, y: from.y }, drag: true, glow: { x: from.x, y: from.y - 30 } }
    }
    if (turn % 2 === 1) {
      const place = SHELF[(play.pick + 1) % SHELF.length]
      const at = { x: place.x + 8, y: place.y + 32 }
      return { from: at, to: at, drag: false, glow: { x: place.x, y: place.y - 8 } }
    }
    const under = HANG_Y + radiusOf(play.claw.k || 1 << play.pick) + 16
    const from = { x: play.claw.x, y: under }
    return { from, to: { x: from.x < JAR_MID ? from.x + 150 : from.x - 150, y: under }, drag: true, glow: play.hang }
  }

  private glow(play: Play, guidance: Guidance): void {
    const c = this.c
    const at = this.move(play, guidance.demoIndex).glow
    const pulse = 1 + Math.sin(play.time * 3) * 0.05
    c.save()
    c.globalAlpha = guidance.glow * 0.9
    c.translate(at.x, at.y)
    c.scale(pulse, pulse)
    this.stamp(this.one('glow', -78, -78, 156, 156, (ctx) => paintGlow(ctx, 76)))
    c.restore()
  }

  private hand(play: Play, guidance: Guidance): void {
    const c = this.c
    const move = this.move(play, guidance.demoIndex)
    const pose = handPose(guidance.demo!, move.drag, this.pose)
    const x = move.from.x + (move.to.x - move.from.x) * pose.travel, y = move.from.y + (move.to.y - move.from.y) * pose.travel
    c.save()
    c.globalAlpha = pose.opacity
    c.translate(x, y + 16 - pose.press * 12)
    c.rotate(-0.25)
    c.scale(1 - pose.press * 0.08, 1 - pose.press * 0.08)
    this.stamp(this.one('hand', -36, -6, 72, 98, (ctx) => paintHand(ctx)))
    c.restore()
  }
}

/** A snack of two or three things that holds `thing`: what joining gave it shows at rest (a wobble, a shiver, a flame). */
function made(k: Kind, thing: number): boolean {
  return (k & thing) !== 0 && countOf(k) > 1
}

function smooth(t: number): number {
  const u = clamp(t, 0, 1)
  return u * u * (3 - 2 * u)
}

/** The colour of each monster's hand and of its palm, in the round's order. */
const PAWS: readonly (readonly [string, string])[] = [[PLUM_LIGHT, '#fff3d6'], [MINT_LIGHT, 'rgba(215, 245, 232, 0.85)'], [OON_LIGHT, '#ffe2b4']]

/**
 * How a snack is drawn while it squeezes against the one it is about to join (`mate`): pressed thin towards
 * it by up to a fifth, a little wider across, and leaning into it by up to a fifth of its radius.
 */
export function squeezed(s: Pick<Snack, 'x' | 'y' | 'r' | 'squeeze'>, mate?: Pick<Snack, 'x' | 'y'>): { px: number; py: number; thinX: number; thinY: number } {
  if (!mate) return { px: 0, py: 0, thinX: 1, thinY: 1 }
  const u = Math.max(0, Math.min(1, s.squeeze / SQUEEZE))
  const ease = u * u * (3 - 2 * u)
  const dx = mate.x - s.x, dy = mate.y - s.y
  const d = Math.hypot(dx, dy) || 1
  const sideways = Math.abs(dx) > Math.abs(dy)
  return { px: (dx / d) * s.r * 0.2 * ease, py: (dy / d) * s.r * 0.2 * ease, thinX: sideways ? 1 - 0.2 * ease : 1 + 0.12 * ease, thinY: sideways ? 1 + 0.12 * ease : 1 - 0.2 * ease }
}
