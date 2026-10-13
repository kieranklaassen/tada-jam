import { DIVE_S, ROLL_S } from './answers'
import { GNOME, PAPER, frogSprites, gnomeSprites, handSprite, mushroomSprite, noseSizeOf, paintPlace, shoulderOf, snailSprites, sunSprites, type GnomeSprites, type MakeCanvas, type Sprite } from './art'
import { FULL, TIERS, type Tier } from './config'
import { CART, GNOMES, GNOME_SCALE, LAMP, SEATS, SNAIL, STREAM, SUN, skyline, type GnomeId, type Kind } from './ground'
import type { Hint } from './hint'
import { ropeParts } from './marks'
import { poseOf, snailIdle, sunIdle } from './motion'
import { NIGHT, ROPE, ROPE_KNOT, ROPE_WIDE, cartSprite, doorSprite, faceSprite, houseSprite, lampSprite, litHouse, nightTwin, paintNight } from './parts'
import { TOSS_S, WALKER } from './scenes'
import { shapeOf, topOf, windowOf } from './shapes'
import { clamp } from './spring'
import { STAGE, fit, type Fit } from './stage'
import type { GnomeShown, MushroomShown, Prop, Shown } from './village'

// The frame. Everything that stands still was painted once into the backdrop,
// and everything that moves is a sprite painted once and stamped, with a few
// live fills for what cannot be a sprite: pupils, lids, brows and mouths, the
// pebbles (all of them as three fills), the glints on the water and the
// specks in the air. Night is the same paint multiplied by one blue: a second
// backdrop painted once, and a night twin of each sprite made the first time
// it is needed. The view counts what it draws: `stamps` are sprites laid
// down, `strokes` are live fills and lines, and their sum is the frame's draw
// count, which the budget test holds.

type Matrix = [number, number, number, number, number, number]

const translate = (m: Matrix, x: number, y: number): Matrix => [m[0], m[1], m[2], m[3], m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
const scale = (m: Matrix, sx: number, sy: number): Matrix => [m[0] * sx, m[1] * sx, m[2] * sy, m[3] * sy, m[4], m[5]]
const rotate = (m: Matrix, angle: number): Matrix => {
  const c = Math.cos(angle), s = Math.sin(angle)
  return [m[0] * c + m[2] * s, m[1] * c + m[3] * s, m[2] * c - m[0] * s, m[3] * c - m[1] * s, m[4], m[5]]
}
/** Leans the top over: x moves by `k` for each unit above the origin. */
const shear = (m: Matrix, k: number): Matrix => [m[0], m[1], m[2] - m[0] * k, m[3] - m[1] * k, m[4], m[5]]
const lerp = (a: number, b: number, p: number): number => a + (b - a) * p

/** Sprites are painted for the sharpest tier and stamped smaller on the others, so a tier change repaints only the backdrops. */
const SHARPEST = TIERS[0].dpr
const DARK = '#2b2440', WHITE = '#fff6e4', SKIN = '#f3b896'
/** A pebble's paint and the light on it. */
const STONE_PAINT = '#c9c0bb', STONE_LIGHT = '#f1ebe6'
/** How far out a bell house's rope is before it is all out and part of the house's own painted piece. */
/** The stage line that says whether what is in the air is under the night yet: the middle of the moss. */
const SPECKS_AT = 450
export const ROPE_DOWN = 0.95
/** A pulled puffball: how much wider it gets at the most, how low it gets at the least, and how much of the pull lifts it off the moss. */
export const PUFF_FLAT = { wider: 0.5, least: 0.3, lift: 0.85 } as const
/** The water in the baker's bucket: where its surface lies in the bucket, from his shoulder, and its paint. */
export const BUCKET_WATER = { x: 48, y: 28, rx: 19, ry: 4.6, paint: '#3f7fdb' } as const
/** The ghost mushroom under the idle hand: pale, in the colour of the ground it would stand in. */
const GHOST: Record<Kind, string> = { red: '#e6f4ad', bell: '#cdf1e2', puff: '#a9cf98' }

/** A colour multiplied by the night's blue. */
const nights = new Map<string, string>()
function atNight(colour: string): string {
  let made = nights.get(colour)
  if (!made) {
    const part = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
    made = '#' + [0, 1, 2].map((i) => Math.round((part(colour, i) * part(NIGHT, i)) / 255).toString(16).padStart(2, '0')).join('')
    nights.set(colour, made)
  }
  return made
}

/** A number that belongs to a place and stays the same: so no two pebbles are alike and none of them flickers. */
const wander = (x: number, y: number, salt: number): number => {
  const v = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453
  return v - Math.floor(v)
}

export type Counts = { stamps: number; strokes: number }

const AT_REST: GnomeShown = { where: 'log', x: 0, y: 0, scale: 1, facing: 1, walked: 0, low: 0, sat: false, fade: 1, asleep: false, carries: false, hands: false, hatPull: 0, bare: false, hop: 0, hatBend: 0, hatUp: 0, press: 0, rise: 0, lean: 0, nod: 0, face: null }

export class GladeView {
  private readonly ctx: CanvasRenderingContext2D
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private base: Matrix = [1, 0, 0, 1, 0, 0]
  private backdrop: HTMLCanvasElement | null = null
  private nightBackdrop: HTMLCanvasElement | null = null
  private painted = 0
  private mushrooms = new Map<string, Sprite>()
  private twins = new Map<Sprite, Sprite>()
  private gnomes: Record<GnomeId, GnomeSprites> | null = null
  private faces: Record<GnomeId, Sprite> | null = null
  private snail: ReturnType<typeof snailSprites> | null = null
  private sun: ReturnType<typeof sunSprites> | null = null
  private frog: ReturnType<typeof frogSprites> | null = null
  private hand: Sprite | null = null
  private cart: Sprite | null = null
  private door: Sprite | null = null
  private lamp: Sprite | null = null
  private tier: Tier = TIERS[0]
  /** The stage line the night has been painted down to: what stands above it is seen in the night's paint. */
  private dusk = -Infinity
  readonly counts: Counts = { stamps: 0, strokes: 0 }

  constructor(private readonly canvas: HTMLCanvasElement, private readonly make: MakeCanvas) {
    this.ctx = canvas.getContext('2d')!
  }

  setTier(tier: Tier): void {
    this.tier = tier
  }

  /** The surface's size in CSS pixels and its pixel ratio. Sprites are painted again when the fit changes, the backdrops when either does. */
  resize(width: number, height: number, ratio: number): void {
    const by = fit(width, height)
    const refit = by.scale !== this.by.scale
    this.by = by
    this.base = [ratio * by.scale, 0, 0, ratio * by.scale, ratio * by.x, ratio * by.y]
    if (by.scale <= 0) return
    if (refit) this.paintSprites(by.scale * SHARPEST)
    const backdrop = this.make(this.canvas.width, this.canvas.height)
    const ctx = backdrop.getContext('2d')!
    ctx.setTransform(...this.base)
    paintPlace(ctx, this.make)
    this.backdrop = backdrop
    // The night's backdrop is painted the first time the sun goes down.
    this.nightBackdrop = null
  }

  private paintSprites(pixels: number): void {
    if (pixels === this.painted) return
    this.painted = pixels
    this.mushrooms.clear()
    this.twins.clear()
    for (const kind of ['red', 'bell', 'puff'] as const) for (let size = 1; size <= FULL; size++) this.mushrooms.set(kind + size, mushroomSprite(this.make, pixels, kind, size))
    const gnomes = {} as Record<GnomeId, GnomeSprites>, faces = {} as Record<GnomeId, Sprite>
    for (const who of GNOMES) {
      gnomes[who] = gnomeSprites(this.make, pixels * GNOME_SCALE, who, (SEATS[who].top - SEATS[who].y) / GNOME_SCALE)
      faces[who] = faceSprite(this.make, pixels, who)
    }
    this.gnomes = gnomes
    this.faces = faces
    this.snail = snailSprites(this.make, pixels)
    this.sun = sunSprites(this.make, pixels)
    this.frog = frogSprites(this.make, pixels)
    this.hand = handSprite(this.make, pixels)
    this.cart = cartSprite(this.make, pixels)
    this.door = doorSprite(this.make, pixels)
    this.lamp = lampSprite(this.make, pixels)
  }

  /** Whether a thing whose foot is at `y` is under the night already. */
  private dark(y: number): boolean {
    return y < this.dusk
  }

  private ink(colour: string, y: number): string {
    return this.dark(y) ? atNight(colour) : colour
  }

  /** Lays a sprite down. `y` is the stage line its foot stands on: above the dusk line it is its night twin. */
  private stamp(sprite: Sprite, m: Matrix, alpha = 1, y = Infinity): void {
    const ctx = this.ctx
    let piece = sprite
    if (this.dark(y)) {
      let twin = this.twins.get(sprite)
      if (!twin) { twin = nightTwin(this.make, sprite); this.twins.set(sprite, twin) }
      piece = twin
    }
    ctx.setTransform(...m)
    if (alpha !== 1) ctx.globalAlpha = alpha
    ctx.drawImage(piece.canvas, piece.x, piece.y, piece.w, piece.h)
    if (alpha !== 1) ctx.globalAlpha = 1
    this.counts.stamps += 1
  }

  private fill(colour: string, alpha = 1): void {
    const ctx = this.ctx
    ctx.fillStyle = colour
    if (alpha !== 1) ctx.globalAlpha = alpha
    ctx.fill()
    if (alpha !== 1) ctx.globalAlpha = 1
    this.counts.strokes += 1
  }

  private line(colour: string, width: number, alpha = 1): void {
    const ctx = this.ctx
    ctx.strokeStyle = colour
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    if (alpha !== 1) ctx.globalAlpha = alpha
    ctx.stroke()
    if (alpha !== 1) ctx.globalAlpha = 1
    this.counts.strokes += 1
  }

  /** Draws the frame. With no state yet it draws the place alone: the bare backdrop of the look. */
  draw(shown: Shown | null, hint: Hint | null): Counts {
    const ctx = this.ctx
    this.counts.stamps = 0
    this.counts.strokes = 0
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (!this.backdrop || this.by.scale <= 0) {
      ctx.fillStyle = PAPER
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
      return this.counts
    }
    const t = shown ? shown.t : 0
    this.drawBackdrop(shown ? shown.dark : 0)
    this.drawSun(t, shown)
    this.drawWater(t, shown)
    if (shown) this.drawPebbles(shown)
    if (shown?.dimple) this.drawDimple(shown.dimple)
    if (hint && hint.glow > 0) this.drawGlow(hint, t)
    if (shown) {
      // Mushrooms and whoever is out on the moss, the farthest first.
      const out = GNOMES.filter((who) => shown.gnomes[who].where === 'out' && shown.gnomes[who].scale < 0.7).sort((a, b) => shown.gnomes[a].y - shown.gnomes[b].y)
      let next = 0
      for (const m of shown.mushrooms) {
        while (next < out.length && shown.gnomes[out[next]].y < m.y) this.drawGnome(out[next++], t, shown)
        this.drawMushroom(m, t)
      }
      while (next < out.length) this.drawGnome(out[next++], t, shown)
      this.drawSteps(shown)
      if (shown.hat) this.drawHatOnStep(shown.hat)
      for (const l of shown.leaving) {
        // Up and over, cap first, and down into the earth.
        const p = l.age / DIVE_S, shape = shapeOf(l.kind, l.size)
        const rise = p < 0.45 ? Math.sin((p / 0.45) * Math.PI * 0.5) : 1 - ((p - 0.45) / 0.55) ** 2
        const turn = clamp(p / 0.45, 0, 1) * Math.PI
        const shrink = p < 0.6 ? 1 : 1 - ((p - 0.6) / 0.4) * 0.9
        let m = translate(this.base, l.x, l.y - shape.height * 0.5 - rise * (l.pull + 70))
        m = scale(rotate(m, turn * (l.flip ? -1 : 1)), (l.flip ? -1 : 1) * shrink, shrink)
        this.stamp(this.sprite(l.kind, l.size), translate(m, 0, shape.height * 0.5), 1, l.y)
      }
      for (const prop of shown.props) this.drawLowProp(prop)
    }
    if (hint && hint.ghost > 0) this.drawGhost(hint)
    if (shown?.frog) this.drawFrog(shown.frog)
    if (shown?.column) this.drawColumn(shown.column, t)
    if (shown?.cart && this.cart) this.stamp(this.cart, rotate(translate(this.base, shown.cart.x, CART.y - Math.abs(shown.cart.hop) * 0.5), clamp(shown.cart.hop, -8, 8) * 0.012), 1, CART.y)
    this.drawSnail(t, shown)
    for (const who of GNOMES) if (!shown || shown.gnomes[who].where === 'log' || (shown.gnomes[who].where === 'out' && shown.gnomes[who].scale >= 0.7)) this.drawGnome(who, t, shown)
    if (shown) {
      for (const prop of shown.props) this.drawHighProp(prop, shown)
      if (shown.door && this.door) this.stamp(this.door, rotate(translate(this.base, shown.door.x, shown.door.y + 34), 0.12 * Math.sin(t * 9)), 1, shown.door.y)
      this.drawSpecks(shown)
    }
    if (hint?.hand && this.hand) {
      const lift = (1 - hint.hand.press) * 26
      this.stamp(this.hand, translate(this.base, hint.hand.x + 4, hint.hand.y - 26 - lift), 0.82 * hint.hand.opacity)
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    return this.counts
  }

  /** The painted place: by day, by night, or both for the moments the night is being painted over it from the top. */
  private drawBackdrop(dark: number): void {
    const ctx = this.ctx, day = this.backdrop!
    this.dusk = dark <= 0 ? -Infinity : dark >= 1 ? Infinity : lerp(-40, STAGE.height + 40, dark)
    if (dark > 0 && !this.nightBackdrop) {
      this.nightBackdrop = this.make(this.canvas.width, this.canvas.height)
      paintNight(this.nightBackdrop.getContext('2d')!, day, this.base)
    }
    const night = this.nightBackdrop
    if (dark <= 0 || !night) { ctx.drawImage(day, 0, 0); this.counts.stamps += 1; return }
    if (dark >= 1) { ctx.drawImage(night, 0, 0); this.counts.stamps += 1; return }
    const w = this.canvas.width, h = this.canvas.height, edge = clamp(Math.round(this.base[5] + this.base[3] * this.dusk), 1, h - 1)
    ctx.drawImage(night, 0, 0, w, edge, 0, 0, w, edge)
    ctx.drawImage(day, 0, edge, w, h - edge, 0, edge, w, h - edge)
    this.counts.stamps += 2
  }

  private sprite(kind: Kind, size: number): Sprite {
    return this.mushrooms.get(kind + clamp(Math.round(size), 1, FULL))!
  }

  /** A house's sprite: with its door alone, with its chimney or ladder out, or with its window lit. Painted the first time it is needed. */
  private house(kind: Kind, size: number, built: boolean, lit: boolean): Sprite {
    const whole = clamp(Math.round(size), 1, FULL), key = kind + whole + (lit ? 'l' : built ? 'h' : 'd')
    let made = this.mushrooms.get(key)
    if (!made) {
      if (this.mushrooms.size > 110) { for (const k of [...this.mushrooms.keys()]) if (/[lhd]$/.test(k)) this.mushrooms.delete(k) }
      made = lit ? litHouse(this.make, this.painted, kind, whole) : houseSprite(this.make, this.painted, kind, whole, built, false)
      this.mushrooms.set(key, made)
    }
    return made
  }

  private drawMushroom(m: MushroomShown, t: number): void {
    const whole = clamp(Math.round(m.seen), 1, FULL)
    const painted = shapeOf(m.kind, whole), now = shapeOf(m.kind, Math.max(0.2, m.seen))
    const squash = clamp(m.squash, -0.5, 0.5), puff = clamp(m.puff, -0.8, 1.2)
    const pull = m.pull / Math.max(40, painted.height)
    // Pulled by its cap, a red one and a bell stretch like gum, taller and thinner. A puffball goes flat: the air
    // goes out of it, and it hangs from the finger wide and low, off the moss.
    const flat = m.kind === 'puff'
    let sx = (now.width / painted.width) * (1 - squash * 0.36) * (1 + puff * 0.14) * (flat ? 1 + Math.min(PUFF_FLAT.wider, pull * 0.4) : 1 - Math.min(0.3, pull * 0.25))
    const sy = (now.height / painted.height) * (1 + squash * 0.5) * (1 + puff * 0.16) * (flat ? Math.max(PUFF_FLAT.least, 1 - pull * 0.55) : 1 + pull * 0.95)
    if (m.flip) sx = -sx
    let at = translate(this.base, m.x, m.y - (flat ? m.pull * PUFF_FLAT.lift : 0))
    // The bell swings about its foot; the others lean their tops over, as jelly does.
    if (m.kind === 'bell') at = rotate(at, clamp(m.swing, -1, 1) * 0.42)
    else at = shear(at, clamp(m.swing, -1, 1) * 0.34)
    at = scale(at, sx, sy)
    const lit = m.door && m.glow > 0.5
    // In a middling house the tall gnome stoops, and the tip of his hat sticks out of the cap: painted behind it.
    if (m.manner === 'stooped' && this.gnomes) {
      const top = topOf(m.kind, whole)
      this.stamp(this.gnomes.tall.hat, scale(translate(at, top.x, top.y + 34 - clamp(m.jerk, -6, 6)), 0.26, 0.26), 1, m.y)
    }
    // A bell's rope is seen being let down: until it is all out it is drawn as far as it has come, and then it is part of the house.
    const down = m.kind === 'bell' ? ROPE_DOWN : 0.5
    this.stamp(m.door ? this.house(m.kind, whole, m.built >= down, lit) : this.sprite(m.kind, whole), at, 1, lit ? Infinity : m.y)
    if (m.door && m.kind === 'bell' && m.built > 0.02 && m.built < down) this.drawRope(m, at, whole)
    if (!m.who || !m.manner || !this.faces) return
    // Whoever lives here shows in the window, each in his own manner.
    const pane = windowOf(m.kind, m.size), r = pane.r, k = r / 17
    let dx = 0, dy = 0, turn = 0, grow = 1
    switch (m.manner) {
      case 'upright': dy = -r * 0.08; break
      case 'stooped': turn = 0.4; dy = r * 0.2; break
      case 'crawled': turn = 0.75; dy = r * 0.36; break
      case 'kneading': dy = r * 0.3 * Math.abs(Math.sin(t * 6.2)); dx = r * 0.1 * Math.sin(t * 6.2); break
      case 'thirsty': dx = r * 0.26 * Math.sin(t * 1.3); dy = r * 0.12; break
      case 'asleep': turn = 0.5; grow = 1 + 0.06 * Math.sin(t * 1.2); break
      case 'woken': dx = r * 0.14 * Math.sin(t * 13) * Math.max(0, Math.sin(t * 1.9)); dy = r * 0.24; break
      case 'sunning': turn = -0.42 + 0.05 * Math.sin(t * 0.8); break
      case 'sniffing': dy = -r * 0.14 * Math.abs(Math.sin(Math.min(1, (t % 3.3) / 0.9) * 3 * Math.PI)); break
      case 'sneezing': dy = -r * 0.26 * Math.abs(Math.sin(Math.min(1, (t % 2.1) / 0.8) * 3 * Math.PI)); turn = -0.2; break
    }
    const face = scale(rotate(translate(at, pane.x + dx / Math.abs(sx || 1), pane.y + dy - clamp(m.jerk, -8, 8) * r * 0.05), turn), (k * grow) / Math.abs(sx || 1), (k * grow) / (sy || 1))
    this.stamp(this.faces[m.who], face, 1, lit ? Infinity : m.y)
  }

  /** A bell house's rope on its way down: the part that is out, its knots, and the roll that is still to come at its end. */
  private drawRope(m: MushroomShown, at: Matrix, whole: number): void {
    const ctx = this.ctx, rope = ropeParts(whole, clamp(m.built / ROPE_DOWN, 0, 1)), end = rope.line[rope.line.length - 1]
    ctx.setTransform(...at)
    ctx.beginPath()
    rope.line.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    this.line(this.ink(ROPE, m.y), ROPE_WIDE)
    ctx.beginPath()
    for (const knot of rope.knots) { ctx.moveTo(knot.x + knot.r, knot.y); ctx.ellipse(knot.x, knot.y, knot.r * 1.25, knot.r, knot.tilt, 0, Math.PI * 2) }
    // What is still rolled up hangs at the end and gets smaller as the rope comes out.
    const roll = 3 + 5 * (1 - m.built / ROPE_DOWN)
    ctx.moveTo(end.x + roll, end.y + roll * 0.6)
    ctx.ellipse(end.x, end.y + roll * 0.6, roll, roll * 0.8, 0, 0, Math.PI * 2)
    this.fill(this.ink(ROPE_KNOT.base, m.y))
  }

  /**
   * What a path that has reached a red mushroom leaves at its foot: under a door the last pebble as a flat step,
   * and with no door yet a small heap against the stem. One shadow, one stone colour and one light for all of them.
   */
  private drawSteps(shown: Shown): void {
    const stones: { x: number; y: number; rx: number; ry: number; turn: number }[] = []
    for (const m of shown.mushrooms) {
      if (!m.stone) continue
      const shape = shapeOf(m.kind, Math.max(1, m.seen)), side = m.flip ? -1 : 1
      if (m.stone === 'step') stones.push({ x: m.x + side * 1.5, y: m.y + 9, rx: Math.max(17, shape.stemWidth * 0.52), ry: 6.5, turn: side * 0.05 })
      else {
        // Three pebbles, no two of a size, leaning on the stem and on one another.
        const x = m.x + side * (shape.stemWidth / 2 + 5)
        stones.push({ x, y: m.y + 7, rx: 9.5, ry: 6.4, turn: side * 0.3 }, { x: x + side * 13, y: m.y + 10, rx: 7.4, ry: 5, turn: -side * 0.5 }, { x: x + side * 5.5, y: m.y - 2.5, rx: 6.2, ry: 4.6, turn: side * 0.9 })
      }
    }
    if (stones.length === 0) return
    const ctx = this.ctx, night = this.dusk > 500
    ctx.setTransform(...this.base)
    const pass = (dx: number, dy: number, grow: number) => {
      ctx.beginPath()
      for (const s of stones) { ctx.moveTo(s.x + dx + Math.cos(s.turn) * s.rx * grow, s.y + dy + Math.sin(s.turn) * s.rx * grow); ctx.ellipse(s.x + dx, s.y + dy, s.rx * grow, s.ry * grow, s.turn, 0, Math.PI * 2) }
    }
    pass(1.5, 3, 1.1)
    this.fill('#1d4a2a', 0.34)
    pass(0, 0, 1)
    this.fill(night ? atNight(STONE_PAINT) : STONE_PAINT)
    pass(-1.6, -1.4, 0.5)
    this.fill(night ? atNight(STONE_LIGHT) : STONE_LIGHT)
  }

  /** The tall gnome's hat where he had to leave it: on its side on the moss, beside the door. */
  private drawHatOnStep(hat: NonNullable<Shown['hat']>): void {
    if (!this.gnomes) return
    const long = hat.box.x1 - hat.box.x0, brim = hat.tip > 0 ? hat.box.x0 : hat.box.x1, k = long / 200
    const at = rotate(translate(this.base, brim, hat.box.y1 - 16), hat.tip * (Math.PI / 2) + clamp(hat.rock, -3, 3) * 0.1)
    this.stamp(this.gnomes.tall.hat, scale(at, k, k), 1, hat.box.y1)
    // The dark of its open end, so that a hat on its side is a hat and nothing to eat.
    const ctx = this.ctx
    ctx.setTransform(...at)
    ctx.beginPath()
    ctx.ellipse(0, -5, 15, 6, 0, 0, Math.PI * 2)
    this.fill(this.ink('#5a2418', hat.box.y1))
  }

  private drawGhost(hint: Hint): void {
    // Pale and see-through, in the colour of the ground it stands in: the shape of a mushroom, and plainly not one.
    const ctx = this.ctx, shape = shapeOf(hint.kind, hint.ghost), { x, y } = hint.at
    ctx.setTransform(...this.base)
    ctx.beginPath()
    if (hint.kind === 'puff') ctx.ellipse(x, y - shape.capHeight / 2, shape.capWidth / 2, shape.capHeight / 2, 0, 0, Math.PI * 2)
    else {
      const top = y - shape.stemHeight, lean = hint.kind === 'bell' ? shape.lean : 0
      ctx.moveTo(x - shape.stemWidth / 2, y)
      ctx.lineTo(x - shape.stemWidth / 2 + lean * 0.4, top)
      ctx.lineTo(x + shape.stemWidth / 2 + lean * 0.4, top)
      ctx.lineTo(x + shape.stemWidth / 2, y)
      ctx.closePath()
      ctx.moveTo(x + lean + shape.capWidth / 2, top + (hint.kind === 'bell' ? shape.capHeight * 0.4 : 0))
      ctx.ellipse(x + lean, top + (hint.kind === 'bell' ? shape.capHeight * 0.4 : 0), shape.capWidth / 2, hint.kind === 'bell' ? shape.capHeight * 0.45 : shape.capHeight * 0.8, 0, Math.PI, Math.PI * 2)
      ctx.closePath()
    }
    this.fill(GHOST[hint.kind], 0.5 * (hint.hand?.opacity ?? 0))
  }

  private drawSun(t: number, shown: Shown | null): void {
    if (!this.sun) return
    const ctx = this.ctx, idle = sunIdle(t), squash = clamp(shown?.sun.squash ?? 0, -0.4, 0.4), y = shown ? shown.sun.y : SUN.y, r = SUN.r
    const behind = y > SUN.y + 2
    if (behind) {
      // It goes down behind the hill: nothing of it is drawn below the skyline.
      ctx.save()
      ctx.setTransform(...this.base)
      ctx.beginPath()
      ctx.moveTo(SUN.x - 300, -400)
      for (let x = SUN.x - 300; x <= SUN.x + 300; x += 20) ctx.lineTo(x, skyline(x) + 3)
      ctx.lineTo(SUN.x + 300, -400)
      ctx.closePath()
      ctx.clip()
    }
    const at = translate(this.base, SUN.x, y), asleep = shown?.sun.asleep ?? false
    this.stamp(this.sun.rays, rotate(at, idle.turn + (shown?.sun.spin ?? 0)))
    const breath = 1 + 0.025 * idle.breath
    this.stamp(this.sun.disc, scale(at, breath * (1 - squash * 0.3), breath * (1 + squash * 0.4)))
    const cheeks = shown?.sun.cheeks ?? 0
    ctx.setTransform(...at)
    if (cheeks > 0.05) {
      // Held, it puffs out its cheeks.
      ctx.beginPath()
      for (const side of [-1, 1]) ctx.ellipse(side * r * 0.56, r * 0.24, r * 0.22 * (1 + 0.5 * cheeks), r * 0.2 * (1 + 0.5 * cheeks), 0, 0, Math.PI * 2)
      this.fill('#ff9a2e')
    }
    // Its eyes: open, shut in a blink, or shut in sleep.
    ctx.beginPath()
    for (const side of [-1, 1]) ctx.ellipse(side * r * 0.3, -r * 0.14, r * 0.09, r * 0.13 * (asleep ? 0.12 : Math.max(0.12, 1 - idle.lid)), 0, 0, Math.PI * 2)
    this.fill(DARK)
    if (behind) ctx.restore()
  }

  private drawWater(t: number, shown: Shown | null): void {
    const ctx = this.ctx
    ctx.setTransform(...this.base)
    // Glints run down the stream, each a short curl of white.
    ctx.beginPath()
    const last = STREAM.length - 1
    for (let i = 0; i < this.tier.glints; i++) {
      const along = (t * 0.07 + i / this.tier.glints) % 1
      const s = STREAM[Math.floor(along * last)], side = ((i * 7) % 5) / 5 - 0.4
      const x = s.x + side * s.half * 1.1, y = s.y
      ctx.moveTo(x - 7, y - 1)
      ctx.quadraticCurveTo(x, y + 4 + 2 * Math.sin(t * 3 + i), x + 7, y - 1)
    }
    this.line(this.dusk > 500 ? atNight('#eef8ff') : '#eef8ff', 3.2, 0.85)
    if (shown && shown.rings.length > 0) {
      ctx.beginPath()
      for (const ring of shown.rings) {
        const r = 8 + ring.age * 62
        ctx.moveTo(ring.x + r, ring.y)
        ctx.ellipse(ring.x, ring.y, r, r * 0.42, 0, 0, Math.PI * 2)
      }
      this.line(this.dusk > 500 ? atNight('#eef8ff') : '#eef8ff', 3.4, clamp(1 - shown.rings[0].age / 0.9, 0, 1))
    }
  }

  /** Every pebble, stepping stone and meeting as three fills: a shadow, the stone and its light. No two are one size or lie quite on the grid. */
  private drawPebbles(shown: Shown): void {
    const ctx = this.ctx
    type Stone = { x: number; y: number; rx: number; ry: number; turn: number; up: number }
    const stones: Stone[] = []
    const add = (x: number, y: number, wet: boolean, up: number, turn: number, small = 1) => {
      const a = wander(x, y, 1), b = wander(x, y, 2), c = wander(x, y, 3)
      const r = (wet ? 10.5 + 3 * a : 6.8 + 3.4 * a) * small
      stones.push({ x: x + (b - 0.5) * 5, y: y + (c - 0.5) * 4, rx: r, ry: r * (wet ? 0.46 : 0.66 + 0.16 * b), turn: (c - 0.5) * 0.9 + turn, up })
    }
    const knots = new Set(shown.knots.map((p) => p.x + ',' + p.y))
    for (const p of shown.pebbles) {
      if (!knots.has(p.x + ',' + p.y)) { add(p.x, p.y, p.wet, p.up, p.turn); continue }
      // Where two paths meet the pebbles have shuffled round: a middle one and smaller ones round it, none the same.
      add(p.x, p.y, p.wet, p.up, p.turn, 0.8)
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + p.turn + wander(p.x, p.y, 4 + i) * 0.6, far = 13 + 4 * wander(p.x, p.y, 9 + i); add(p.x + Math.cos(a) * far, p.y + Math.sin(a) * far * 0.7, p.wet, p.up, p.turn, 0.5 + 0.2 * wander(p.x, p.y, 14 + i)) }
    }
    for (const prop of shown.props) {
      if (prop.what === 'loose') add(prop.x, prop.y, false, prop.phase === 'up' ? 22 * Math.sin(Math.min(1, prop.since / 0.3) * Math.PI) : -8 * Math.min(1, prop.since / 0.15), prop.since * 8)
      if (prop.what === 'rolling' && prop.points) {
        // They roll away to the nearer edge, the ones that set off first the farthest along.
        const p = clamp(prop.age / ROLL_S, 0, 1)
        prop.points.forEach((point, i) => {
          const side = point.x < STAGE.width / 2 ? -1 : 1, go = Math.max(0, p - 0.02 * (i % 12)) ** 2
          add(point.x + side * go * 900, point.y + go * 30, false, 6 * Math.abs(Math.sin(go * 20 + i)), go * 30 * side)
        })
      }
    }
    if (stones.length === 0) return
    ctx.setTransform(...this.base)
    const pass = (dx: number, dy: number, grow: number, lift: number) => {
      ctx.beginPath()
      for (const s of stones) {
        const y = s.y + dy - s.up * lift
        ctx.moveTo(s.x + dx + Math.cos(s.turn) * s.rx * grow, y + Math.sin(s.turn) * s.rx * grow)
        ctx.ellipse(s.x + dx, y, s.rx * grow, s.ry * grow, s.turn, 0, Math.PI * 2)
      }
    }
    const night = this.dusk > 500
    pass(1.5, 3.5, 1.08, 0)
    this.fill('#1d4a2a', 0.34)
    pass(0, 0, 1, 1)
    this.fill(night ? atNight(STONE_PAINT) : STONE_PAINT)
    pass(-1.6, -1.6, 0.5, 1)
    this.fill(night ? atNight(STONE_LIGHT) : STONE_LIGHT)
  }

  private drawDimple(dimple: { x: number; y: number; depth: number }): void {
    const ctx = this.ctx
    ctx.setTransform(...this.base)
    ctx.beginPath()
    ctx.ellipse(dimple.x, dimple.y + 2, 30 + 16 * dimple.depth, 9 + 5 * dimple.depth, 0, 0, Math.PI * 2)
    this.fill('#1d4a2a', 0.3 * dimple.depth)
  }

  private drawGlow(hint: Hint, t: number): void {
    const ctx = this.ctx
    ctx.setTransform(...this.base)
    const breath = 0.8 + 0.2 * Math.sin(t * 2.6)
    // A patch of pale paint with a looser one round it, both breathing: light enough to read on the sunny moss, the bank and the shade alike.
    ctx.beginPath()
    ctx.ellipse(hint.at.x, hint.at.y, 58 * breath, (hint.act === 'grow' ? 24 : 40) * breath, 0, 0, Math.PI * 2)
    this.fill('#fffbe0', 0.5 * hint.glow)
    ctx.beginPath()
    ctx.ellipse(hint.at.x, hint.at.y, 74 * breath, (hint.act === 'grow' ? 31 : 52) * breath, 0, 0, Math.PI * 2)
    this.fill('#fffbe0', 0.22 * hint.glow)
  }

  private drawFrog(frog: NonNullable<Shown['frog']>): void {
    if (!this.frog) return
    const up = clamp(frog.up, 0, 1.15), squash = clamp(frog.squash, -0.4, 0.4)
    const at = translate(this.base, frog.x, frog.y + 6)
    this.stamp(this.frog.dome, scale(at, 0.7 + 0.3 * up, up), 1, frog.y)
    this.stamp(this.frog.frog, scale(translate(at, 0, -50 * up), 1 - squash * 0.3, (1 + squash * 0.5) * Math.min(1, up * 1.4)), 1, frog.y)
  }

  /** Water drawn up by a finger like toffee: a column that thins towards the top and wobbles. */
  private drawColumn(column: NonNullable<Shown['column']>, t: number): void {
    const ctx = this.ctx, top = column.y - column.up, sway = 5 * Math.sin(t * 9) * Math.min(1, column.up / 60)
    ctx.setTransform(...this.base)
    ctx.beginPath()
    ctx.moveTo(column.x - 26, column.y + 4)
    ctx.quadraticCurveTo(column.x - 8 + sway, column.y - column.up * 0.5, column.x - 9 + sway, top)
    ctx.quadraticCurveTo(column.x + sway, top - 12, column.x + 9 + sway, top)
    ctx.quadraticCurveTo(column.x + 8 + sway, column.y - column.up * 0.5, column.x + 26, column.y + 4)
    ctx.closePath()
    this.fill(this.ink('#3f7fdb', column.y))
    ctx.beginPath()
    ctx.moveTo(column.x - 4 + sway, top + 6)
    ctx.quadraticCurveTo(column.x - 6 + sway, column.y - column.up * 0.5, column.x - 14, column.y - 4)
    this.line(this.ink('#bfe2ff', column.y), 3.5)
  }

  private drawSpecks(shown: Shown): void {
    if (shown.specks.length === 0) return
    const ctx = this.ctx
    ctx.setTransform(...this.base)
    // One fill for each pot of paint the specks are made of.
    const pots: readonly [string, readonly string[], number][] = [['#fff6e4', ['spore', 'spot', 'flour', 'bubble'], 0.9], ['#bfe2ff', ['drop', 'splash'], 1], ['#3c8746', ['leaf'], 1], ['#efe6ee', ['smoke'], 0.7], ['#7a6238', ['grit'], 1]]
    for (const [colour, kinds, alpha] of pots) {
      let any = false
      ctx.beginPath()
      for (const s of shown.specks) {
        if (!kinds.includes(s.what)) continue
        any = true
        const swells = s.what === 'flour' || s.what === 'spore' || s.what === 'smoke'
        const fade = swells ? 1 + s.age / s.life : 1 - 0.5 * (s.age / s.life)
        const r = s.size * fade * (s.age > s.life * 0.8 ? (s.life - s.age) / (s.life * 0.2) : 1)
        ctx.moveTo(s.x + r, s.y)
        if (s.what === 'leaf') ctx.ellipse(s.x, s.y, r * 1.5, r * 0.7, s.age * 3 + s.size, 0, Math.PI * 2)
        else ctx.arc(s.x, s.y, Math.max(0.1, r), 0, Math.PI * 2)
      }
      // Spores, flour, drops, leaves, smoke and grit are paint like everything else: under the night they are in its paint.
      if (any) this.fill(this.ink(colour, SPECKS_AT), alpha)
    }
  }

  private drawGnome(who: GnomeId, t: number, shown: Shown | null): void {
    if (!this.gnomes) return
    const parts = this.gnomes[who], seat = SEATS[who], ctx = this.ctx
    const g = shown ? shown.gnomes[who] : AT_REST
    const out = g.where === 'out'
    const pose = poseOf(who, t, g)
    // On the moss he is small and on his feet; between the log and the moss he is on his way from one to the other.
    const off = out ? clamp((1 - g.scale) / (1 - WALKER), 0, 1) : 0
    const size = (out ? g.scale : 1) * GNOME_SCALE, x = out ? g.x : seat.x, foot = out ? g.y : seat.y, alpha = out ? clamp(g.fade, 0, 1) : 1
    const facing = out ? g.facing : 1
    if (out) {
      // Each step is a bounce, at his own pace; asleep he shuffles with his head down.
      const step = Math.sin(g.walked / (who === 'baker' ? 7 : who === 'tall' ? 13 : 10))
      pose.bob += (g.asleep ? 2 : 7) * Math.abs(step) * off
      pose.lean += 0.07 * step * off + 1.1 * g.low
      if (g.asleep) { pose.lid = 1; pose.head += 0.3; pose.mouth = 0.4 }
      if (g.sat) { pose.bob -= 26; pose.lean -= 0.1; pose.lid = 1 }
      if (g.carries) pose.bundle = 0.55 + 0.1 * step
    }
    if (alpha <= 0.01) return
    const body = scale(rotate(translate(this.base, x, foot - 48 * size * off - (pose.bob - 30 * g.low * off) * size / GNOME_SCALE), pose.lean), facing * size, size * (1 + 0.07 * pose.rise))
    this.stamp(parts.body, body, alpha, foot)
    const shoulder = shoulderOf(who)
    const arm = rotate(translate(body, shoulder.x, shoulder.y), pose.bundle)
    this.stamp(parts.bundle, arm, alpha, foot)
    if (out && g.carries) {
      // A bucket with water in it shows its water: blue up to the rim.
      ctx.setTransform(...arm)
      ctx.beginPath()
      ctx.ellipse(BUCKET_WATER.x, BUCKET_WATER.y, BUCKET_WATER.rx, BUCKET_WATER.ry, 0, 0, Math.PI * 2)
      this.fill(this.ink(BUCKET_WATER.paint, foot), alpha)
    }
    const head = rotate(translate(body, 0, GNOME.neck), pose.head)
    this.stamp(parts.head, head, alpha, foot)

    // The face, live: pupils that follow the finger, lids, brows and a mouth.
    ctx.setTransform(...head)
    let gx = 0, gy = 0.2
    if (shown?.gaze) {
      // His eyes follow the finger, on the log and out on the moss alike: from where his face is, and mirrored with him when he faces the other way.
      const dx = (shown.gaze.x - x) * facing, dy = shown.gaze.y - (foot - 48 * size * off + (GNOME.neck + GNOME.face) * size), far = Math.hypot(dx, dy) || 1
      gx = dx / far
      gy = dy / far
    } else if (out) { gx = 0.8; gy = 0.1 }
    else if (who === 'tall') gy = -0.8
    else if (who === 'baker') gx = 0.8
    else if (who === 'sneezy') { gx = 0.7; gy = -0.6 }
    const eye = GNOME.eye, lid = clamp(pose.lid, 0, 1)
    if (lid < 0.9) {
      ctx.beginPath()
      for (const side of [-1, 1]) {
        const ex = side * eye.x + gx * 3.6, ey = eye.y + gy * 4.2
        ctx.moveTo(ex + 4.2, ey)
        ctx.arc(ex, ey, 4.2, 0, Math.PI * 2)
      }
      this.fill(DARK, alpha)
    }
    if (lid > 0.04) {
      // Lids come down from above with their outer corners lowest: heavy and drooping, never a hard line across the eye.
      ctx.beginPath()
      for (const side of [-1, 1]) {
        const x0 = side * eye.x - eye.rx - 1.5, x1 = side * eye.x + eye.rx + 1.5, top = eye.y - eye.ry - 1.5, down = top + (eye.ry * 2 + 3) * lid
        const outer = side > 0 ? x1 : x0, inner = side > 0 ? x0 : x1
        ctx.moveTo(inner, top)
        ctx.lineTo(outer, top)
        ctx.lineTo(outer, Math.min(down + 3.5, eye.y + eye.ry + 1.5))
        ctx.quadraticCurveTo(side * eye.x, down + 2.5, inner, down - 2.5)
        ctx.closePath()
      }
      this.fill(this.ink(SKIN, foot), alpha)
    }
    // Brows: raised and level, or worried with their inner ends up. They are never drawn down over the eyes.
    const lift = Math.max(0, pose.brow) * 3, worry = Math.max(0, -pose.brow) * 3.4
    ctx.beginPath()
    for (const side of [-1, 1]) {
      ctx.moveTo(side * (eye.x - 9), GNOME.brow.y - lift - worry)
      ctx.lineTo(side * (eye.x + 9), GNOME.brow.y - lift + worry * 0.6)
    }
    this.line(this.ink(WHITE, foot), 6, alpha)
    ctx.beginPath()
    ctx.ellipse(0, GNOME.mouth.y + 2 * pose.mouth, 8 - 2 * pose.mouth, 1.8 + 8 * clamp(pose.mouth, 0, 1), 0, 0, Math.PI * 2)
    this.fill(this.ink('#7a2a2a', foot), alpha)
    if (parts.nose) {
      const big = pose.nose * (noseSizeOf(who) / 17)
      this.stamp(parts.nose, scale(translate(head, 0, GNOME.nose.y), big, big), alpha, foot)
    }
    if (!(out && g.bare)) {
      // On a walk from a house that is too low he has no hat on: it lies on his doorstep.
      const hat = scale(rotate(translate(head, 0, GNOME.brim + 30 * pose.hatDown - pose.hatUp - g.hatPull * 0.5), pose.hat), 1, 1 + g.hatPull / 160)
      this.stamp(parts.hat, hat, alpha, foot)
    }
    if (g.hands) {
      ctx.setTransform(...head)
      ctx.beginPath()
      for (const side of [-1, 1]) ctx.ellipse(side * 20, GNOME.brim + 2, 13, 10, side * 0.5, 0, Math.PI * 2)
      this.fill(this.ink(SKIN, foot), alpha)
    }
  }

  private drawSnail(t: number, shown: Shown | null): void {
    if (!this.snail) return
    const idle = snailIdle(t), ctx = this.ctx
    const squash = clamp(shown?.snail.squash ?? 0, -0.4, 0.4), eyes = shown?.snail.eyes ?? [0, 0]
    const x = shown ? shown.snail.x : SNAIL.x, y = shown ? shown.snail.y : SNAIL.y, facing = shown ? shown.snail.facing : 1
    // It ripples along as it crawls.
    const ripple = idle.ripple + (shown ? 2.4 * Math.sin(shown.snail.crawled / 9) : 0)
    const at = scale(translate(this.base, x, y + 14), facing, 1)
    this.stamp(this.snail.body, scale(at, 1 + 0.02 * ripple, 1 - 0.02 * ripple), 1, y)
    this.stamp(this.snail.shell, scale(translate(at, 14, -52), 1 - squash * 0.2, 1 + squash * 0.3 + 0.012 * ripple), 1, y)
    // Its lamp stands on the stone behind it, the lantern hanging in towards the shell, below the cart and clear of it: a light, and so in its own paint at night.
    if (shown?.snail.lamp && this.lamp) this.stamp(this.lamp, scale(translate(this.base, x + facing * (LAMP.x - SNAIL.x), y + LAMP.y - SNAIL.y), -facing, 1))
    // Two eyes on stalks, which sway one after the other and can be pulled right in.
    ctx.setTransform(...at)
    const tips: [number, number][] = []
    ctx.beginPath()
    for (const i of [0, 1] as const) {
      const far = 1 - eyes[i], rootX = -80 + i * 14, rootY = -44
      const tx = rootX - 8 + i * 6 + Math.sin(idle.stalks[i]) * 30 * far, ty = rootY - 6 - 38 * far
      ctx.moveTo(rootX, rootY)
      ctx.quadraticCurveTo(rootX - 4, rootY - 20 * far, tx, ty)
      tips.push([tx, ty])
    }
    this.line(this.ink('#f1c79c', y), 7)
    ctx.beginPath()
    for (const [tx, ty] of tips) { ctx.moveTo(tx + 9, ty); ctx.arc(tx, ty, 9, 0, Math.PI * 2) }
    this.fill(this.ink('#fffdf6', y))
    ctx.beginPath()
    const look = shown?.gaze ? Math.sign(shown.gaze.x - x) * 2.5 * facing : -2.5
    for (const [tx, ty] of tips) { ctx.moveTo(tx + look + 3.8, ty); ctx.arc(tx + look, ty + 0.5, 3.8, 0, Math.PI * 2) }
    this.fill(DARK)
  }

  /** Short-lived things that stand in the moss: a cap that peeks out, a button that slips back. */
  private drawLowProp(prop: Prop): void {
    if (prop.what === 'peek' && prop.kind) {
      const p = prop.age / prop.life, up = Math.sin(Math.min(1, p * 1.15) * Math.PI) ** 0.6
      // It turns once before it sinks.
      const turn = prop.phase === 'sink' ? 1 : Math.cos(Math.min(1, prop.since / 0.4) * Math.PI * 2)
      this.stamp(this.sprite(prop.kind, 2), scale(translate(this.base, prop.x, prop.y), 0.9 * turn, 0.75 * up + 0.01), 1, prop.y)
    }
    if (prop.what === 'slip' && prop.kind) this.stamp(this.sprite(prop.kind, 1), scale(translate(this.base, prop.x, prop.y), 1, Math.max(0.02, 1 - prop.age / prop.life)), 1, prop.y)
  }

  /** Short-lived things in front of everything: a door on its way, as a gate, as a raft, or in a gnome's hands; a hat sneezed out of a house. */
  private drawHighProp(prop: Prop, shown: Shown): void {
    if (!this.door) return
    const home = (x: number, y: number): Matrix => {
      const p = clamp(prop.since / 0.3, 0, 1)
      return scale(rotate(translate(this.base, lerp(x, CART.x, p), lerp(y, CART.top + 40, p) - 60 * Math.sin(Math.PI * p)), p * 5), 1 - 0.3 * p, 1 - 0.3 * p)
    }
    if (prop.what === 'flight' && prop.to) {
      const p = clamp(prop.age / prop.life, 0, 1)
      this.stamp(this.door, scale(rotate(translate(this.base, lerp(prop.x, prop.to.x, p), lerp(prop.y, prop.to.y, p) + 30 - 90 * Math.sin(Math.PI * p)), p * 6.3), 1 - 0.4 * p, 1 - 0.4 * p), 1, prop.y)
    } else if (prop.what === 'gate') {
      const since = prop.since
      if (prop.phase === 'home') return this.stamp(this.door, home(prop.x, prop.y), 1, prop.y)
      const tall = prop.phase === 'up' ? clamp(since / 0.2, 0.05, 1) : prop.phase === 'flat' ? Math.max(0.12, 1 - since / 0.1) : 1
      const wide = prop.phase === 'open' ? Math.max(0.25, Math.cos(clamp(since / 0.3, 0, 1) * 1.3)) : prop.phase === 'shut' ? Math.min(1, 0.27 + since / 0.25) : 1
      this.stamp(this.door, scale(translate(this.base, prop.x, prop.y + 4), wide, tall), 1, prop.y)
    } else if (prop.what === 'raft') {
      if (prop.phase === 'home') {
        const p = clamp(prop.age / (prop.life - 0.4), 0, 1), from = this.downstream(prop.x, prop.y, p)
        return this.stamp(this.door, home(from.x, from.y), 1, prop.y)
      }
      const at = this.downstream(prop.x, prop.y, clamp(prop.age / (prop.life - 0.4), 0, 1))
      this.stamp(this.door, scale(rotate(translate(this.base, at.x, at.y + 8 + 2 * Math.sin(prop.age * 7)), prop.age * 1.6), 0.9, 0.42), 1, prop.y)
    } else if (prop.what === 'knocked') {
      if (prop.phase === 'home') return this.stamp(this.door, home(prop.x, prop.y), 1, prop.y)
      const jolt = prop.phase === 'knock' ? 5 * Math.sin(prop.since * 60) * Math.max(0, 1 - prop.since / 0.15) : 0
      const aside = prop.phase === 'look' ? 34 * clamp(prop.since / 0.2, 0, 1) : 0
      this.stamp(this.door, translate(this.base, prop.x + jolt + aside, prop.y + 40 - 12 * clamp(prop.age / 0.15, 0, 1)), 1, prop.y)
    } else if (prop.what === 'spot') {
      // The one more spot a red mushroom pops out as the finger lifts: it comes up on the cap with the plip, and sinks into the paint.
      const m = shown.mushrooms.find((other) => other.id === prop.id)
      if (!m || m.kind !== 'red') return
      const shape = shapeOf(m.kind, Math.max(1, m.seen)), p = clamp(prop.age / prop.life, 0, 1), ctx = this.ctx
      const r = (5 + 0.4 * m.seen) * Math.min(1, p / 0.12) * (1 + 0.6 * Math.max(0, 1 - p / 0.3))
      ctx.setTransform(...this.base)
      ctx.beginPath()
      ctx.ellipse(m.x + (m.flip ? -1 : 1) * shape.capWidth * 0.24, m.y - shape.stemHeight - shape.capHeight * 0.42, r, r * 0.86, 0, 0, Math.PI * 2)
      this.fill(this.ink(WHITE, m.y), clamp((1 - p) / 0.35, 0, 1))
    } else if (prop.what === 'toss' && prop.to) {
      // A pebble beside the snail, and then in the air on its way over the pond to the log.
      const p = prop.phase === 'fly' ? clamp(prop.since / TOSS_S, 0, 1) : 0, ctx = this.ctx
      ctx.setTransform(...this.base)
      ctx.beginPath()
      ctx.ellipse(lerp(prop.x, prop.to.x, p), lerp(prop.y, prop.to.y, p) - 170 * Math.sin(Math.PI * p), 8, 5.6, p * 9, 0, Math.PI * 2)
      this.fill(this.ink(STONE_PAINT, prop.y))
    } else if (prop.what === 'hatOut' && this.gnomes) {
      const m = shown.mushrooms.find((other) => other.id === prop.id)
      if (!m) return
      const top = topOf(m.kind, m.size), p = clamp(prop.age / prop.life, 0, 1)
      this.stamp(this.gnomes.sneezy.hat, scale(rotate(translate(this.base, m.x + (m.flip ? -1 : 1) * top.x, m.y + top.y + 10 - 46 * Math.sin(Math.PI * p)), 0.5 * Math.sin(p * 9)), 0.3, 0.3), 1, m.y)
    }
  }

  /** Where a thing dropped in the water at a point has floated to, a share of the way to the pond. */
  private downstream(x: number, y: number, share: number): { x: number; y: number } {
    let from = 0
    STREAM.forEach((s, i) => { if (Math.hypot(s.x - x, s.y - y) < Math.hypot(STREAM[from].x - x, STREAM[from].y - y)) from = i })
    const to = STREAM[Math.min(STREAM.length - 1, from + Math.round(share * 14))]
    return { x: lerp(x, to.x, Math.min(1, share * 1.5)), y: lerp(y, to.y, Math.min(1, share * 1.2)) }
  }
}
