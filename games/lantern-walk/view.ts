import { type Tier } from './config'
import { drawBadger, drawBreath, drawFox, drawHedgehog, drawOwl } from './figures'
import { handPose, type Guidance, type HandPose } from './guidance'
import { HOOK, POLE, WORMS, type Box } from './layout'
import { PAST, paintSetting } from './setting'
import type { Paper } from './sheet'
import { Bucket, Sketch, noise } from './sketch'
import { BIG, shownLit, underGlow } from './seen'
import { LAMP, drawSmall, lampPlace } from './small'
import { fit, type Fit } from './stage'
import type { Wood } from './wood'
import { lampShows } from './worms'

// The scratch card. The wood that stands still is scraped once into two
// layers the size of the surface: the dark one (black wax with rough lines
// that take their colour from the rainbow under the wax) and the ink one
// (the same lines in black, with shade, on nothing). A frame is one stamp of
// the dark layer, the little rounds the glow-worms' own lamps scrape clear,
// the creatures scraped live on top of that, and then the lantern's light:
// each patch is filled with its paper colour, the ink layer is stamped
// through the patches' outlines, and every creature a patch touches is
// drawn whole and in full, so a patch never cuts a creature in two. Lit
// means answered: the model says who is touched (seen.ts for the four large
// creatures, `Wood.touching` for the small things) and the view draws in
// full exactly those, so nobody is shown lit by a light it does not answer.
// A lamp's round lights the ground and its own worm, and nobody else.
// Nothing glows and nothing has a beam: light is only where the wax is gone.
//
// What a frame costs is counted where it is spent: every stamp, stroke and
// fill adds one to `draws`, and that is the number the frame-budget test
// holds and the grown-up overlay shows.

export const WAX = '#15121a'
export const CREAM = '#f6ecd6'
export const WHITE = '#fffdf6'
export const RAINBOW = ['#ff3d8b', '#ff8a1f', '#ffe14a', '#5fe36a', '#22d3c5', '#3d7bff', '#b05cff']
export const PAPER_COLOURS: Record<Paper, readonly [string, string]> = {
  red: ['#d2203c', '#f25a2a'],
  blue: ['#2148c4', '#1f93d8'],
  yellow: ['#f8e03a', '#f5a71f'],
}
export const LINE = 3.3

export type Surface = HTMLCanvasElement
export type Pen = CanvasRenderingContext2D
/** What the idle guidance points at: a box to mark and one move for the ghost hand. */
export type Aim = { fromX: number; fromY: number; toX: number; toY: number; tap: boolean; glow: Box; path?: number[] | null }
/** What a scene is showing in the wood. */
export type WoodShow = { door: number; glow: number }

export function trace(pen: Pen, bucket: Bucket, closed: boolean): void {
  const pts = bucket.pts
  let from = 0
  for (let p = 0; p < bucket.m; p++) {
    const end = bucket.ends[p]
    pen.moveTo(pts[from], pts[from + 1])
    for (let i = from + 2; i < end; i += 2) pen.lineTo(pts[i], pts[i + 1])
    if (closed) pen.closePath()
    from = end
  }
}

/** A band of colours laid slantwise across the whole stage, `times` over: what lies under the wax. */
export function band(pen: Pen, colours: readonly string[], times: number): CanvasGradient {
  const gradient = pen.createLinearGradient(PAST.left, PAST.top, PAST.right, PAST.bottom * 0.62)
  const stops = colours.length * times
  for (let i = 0; i <= stops; i++) gradient.addColorStop(i / stops, colours[i % colours.length])
  return gradient
}

/** The grain of the wax: dust, a little lighter and a little darker than the black. */
export function dust(layer: Pen): void {
  for (let i = 0; i < 1500; i++) {
    const x = PAST.left + (PAST.right - PAST.left) * (0.5 + 0.5 * noise(i, 91)), y = PAST.top + (PAST.bottom - PAST.top) * (0.5 + 0.5 * noise(i, 92))
    const size = 1.2 + 1.6 * (0.5 + 0.5 * noise(i, 93))
    layer.fillStyle = i % 3 === 0 ? 'rgba(0, 0, 0, 0.35)' : 'rgba(190, 170, 220, 0.07)'
    layer.fillRect(x, y, size, size)
  }
}

/** Loose crumbs of wax beside scraped lines: a speck by every few points of each. */
export function crumble(layer: Pen, lines: Bucket): void {
  const pts = lines.pts
  for (let i = 0; i < lines.n; i += 10) {
    const x = pts[i] + noise(i, 81) * 9, y = pts[i + 1] + noise(i, 82) * 9
    layer.moveTo(x, y)
    layer.lineTo(x + noise(i, 83) * 2.4, y + noise(i, 84) * 2.4)
  }
}

/** The ghost hand: a mitten with one finger out. A hand, and nothing to read. Two draws. */
export function ghostHand(pen: Pen, x: number, y: number, pose: HandPose): void {
  const size = 1 - pose.press * 0.12
  pen.save()
  pen.translate(x, y + 12 - pose.press * 8)
  pen.rotate(-0.35)
  pen.scale(size, size)
  pen.globalAlpha = pose.opacity * 0.9
  pen.beginPath()
  pen.moveTo(-9, 0); pen.quadraticCurveTo(-10, -30, 0, -32); pen.quadraticCurveTo(10, -30, 9, 0)
  pen.lineTo(30, 6); pen.quadraticCurveTo(40, 12, 36, 34); pen.quadraticCurveTo(30, 62, 4, 62); pen.quadraticCurveTo(-22, 60, -24, 36)
  pen.quadraticCurveTo(-34, 22, -28, 14); pen.quadraticCurveTo(-20, 10, -9, 22)
  pen.closePath()
  pen.fillStyle = WHITE
  pen.fill()
  pen.strokeStyle = WAX
  pen.lineWidth = LINE
  pen.stroke()
  pen.restore()
}

/**
 * The flame over the rim, never still: how tall it is, and how far its tip leans, in the lantern's own units. A
 * stream of breath bends it right over and presses it down.
 */
export function flameOf(wood: Wood, time: number): { lick: number; lean: number } {
  const bent = Math.abs(wood.bend)
  return {
    lick: (1 + wood.flare * 0.9 + noise(Math.floor(time * 14), 77) * 0.12) * (1 - 0.45 * bent),
    lean: noise(Math.floor(time * 9), 78) * 3 - wood.swingSpeed * 1.5 + wood.bend * 26,
  }
}

type Figure = { sketch: Sketch; paint: (s: Sketch, wood: Wood, t: number) => void }

export class WoodView {
  /** Stamps, strokes and fills of the last frame. */
  draws = 0
  /** Stamps of the last frame that covered the whole surface. */
  fullStamps = 0
  private readonly pen: Pen
  private dark: Surface | null = null
  private ink: Surface | null = null
  private width = 0
  private height = 0
  private ratio = 1
  private grain = true
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private rainbow: CanvasGradient | string = RAINBOW[0]
  private papers: Record<Paper, CanvasGradient | string> = { red: PAPER_COLOURS.red[0], blue: PAPER_COLOURS.blue[0], yellow: PAPER_COLOURS.yellow[0] }
  /** In the order of `BIG`, which is the order the model looks at them in. */
  private readonly big: Figure[] = [drawOwl, drawBadger, drawFox, drawHedgehog].map((paint) => ({ sketch: new Sketch(), paint }))
  private readonly small = new Sketch()
  private readonly smallLit = new Sketch()
  private readonly air = new Sketch()
  private readonly crumbsIn = new Bucket(512, 256)
  private readonly crumbsOut = new Bucket(512, 256)
  private readonly lamp = { x: 0, y: 0 }
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }

  /** `make` gives a canvas to scrape a layer into; a test hands in a stand-in. */
  constructor(canvas: Surface, private readonly make: () => Surface = () => document.createElement('canvas')) {
    this.pen = canvas.getContext('2d')!
  }

  /** The surface's size in CSS pixels, its pixel ratio and the tier. The two layers are scraped again. */
  resize(width: number, height: number, ratio: number, tier: Tier): void {
    this.width = width; this.height = height; this.ratio = ratio; this.grain = tier.grain
    this.by = fit(width, height)
    if (this.by.scale <= 0) return
    const pen = this.pen
    this.rainbow = band(pen, RAINBOW, 2)
    for (const paper of ['red', 'blue', 'yellow'] as const) this.papers[paper] = band(pen, PAPER_COLOURS[paper], 1)
    const setting = new Sketch()
    setting.wobble = 1.7
    paintSetting(setting)
    this.dark = this.layer((layer) => {
      layer.setTransform(1, 0, 0, 1, 0, 0)
      layer.fillStyle = WAX
      layer.fillRect(0, 0, Math.round(width * ratio), Math.round(height * ratio))
      this.place(layer)
      if (this.grain) dust(layer)
      layer.lineCap = 'round'; layer.lineJoin = 'round'
      layer.strokeStyle = this.rainbow
      layer.lineWidth = LINE - 0.3
      layer.beginPath(); trace(layer, setting.lines, false); layer.stroke()
      // The second scrape of the same line, a hair to one side: what a stick does in wax.
      layer.globalAlpha = 0.5
      layer.lineWidth = 1.3
      layer.translate(1.7, 1.2)
      layer.beginPath(); trace(layer, setting.lines, false); layer.stroke()
      layer.translate(-1.7, -1.2)
      if (this.grain) {
        layer.globalAlpha = 0.75
        layer.lineWidth = 2
        layer.beginPath(); crumble(layer, setting.lines); layer.stroke()
      }
      layer.globalAlpha = 1
    })
    this.ink = this.layer((layer) => {
      this.place(layer)
      layer.fillStyle = 'rgba(21, 18, 26, 0.17)'
      layer.beginPath(); trace(layer, setting.hide, true); layer.fill()
      layer.lineCap = 'round'; layer.lineJoin = 'round'
      layer.strokeStyle = WAX
      layer.lineWidth = LINE + 0.9
      layer.beginPath(); trace(layer, setting.lines, false); layer.stroke()
    })
  }

  private layer(paint: (layer: Pen) => void): Surface {
    const surface = this.make()
    surface.width = Math.round(this.width * this.ratio); surface.height = Math.round(this.height * this.ratio)
    paint(surface.getContext('2d')!)
    return surface
  }

  /** Sets a pen to draw in stage units. */
  private place(pen: Pen): void {
    const k = this.ratio * this.by.scale
    pen.setTransform(k, 0, 0, k, this.ratio * this.by.x, this.ratio * this.by.y)
  }

  /** Before storage has answered, neither place is known: the surface is black wax and nothing else. One draw. */
  blank(): void {
    const pen = this.pen
    this.draws = 0
    this.fullStamps = 0
    if (this.by.scale <= 0) return
    pen.setTransform(1, 0, 0, 1, 0, 0)
    pen.globalAlpha = 1
    pen.fillStyle = WAX
    pen.fillRect(0, 0, Math.round(this.width * this.ratio), Math.round(this.height * this.ratio))
    this.draws = 1
  }

  /**
   * Draws a frame: the wood as it stands at `time` seconds of play, or the bare wax-and-lines backdrop when
   * there is no wood yet. What it cost is in `draws`.
   */
  draw(wood: Wood | null, show: WoodShow, guidance: Guidance | null, aim: Aim | null, time: number): void {
    const pen = this.pen
    this.draws = 0
    this.fullStamps = 0
    if (this.by.scale <= 0 || !this.dark || !this.ink) return
    pen.setTransform(1, 0, 0, 1, 0, 0)
    pen.globalAlpha = 1
    pen.drawImage(this.dark, 0, 0)
    this.draws++; this.fullStamps++
    if (!wood) return
    this.place(pen)
    pen.lineCap = 'round'; pen.lineJoin = 'round'
    if (show.door > 0.01) this.door(show.door)

    this.lamps(wood)

    // The lines shiver a few times a second, as scraped frames do; the setting stands still.
    const boil = Math.floor(time * 6)
    for (const f of this.big) {
      f.sketch.clear()
      f.sketch.boil = boil
      f.paint(f.sketch, wood, time)
      this.scrape(f.sketch, WAX, this.rainbow, this.rainbow, WAX)
    }
    this.small.clear(); this.small.boil = boil
    drawSmall(this.small, wood, time, false)
    this.scrape(this.small, WAX, this.rainbow, this.rainbow, WAX)

    this.light(wood, show, time, boil)

    // What is in the air: the badger's breath and the candle's smoke.
    this.air.clear()
    this.air.boil = boil
    drawBreath(this.air, wood)
    // A nick in the wax where a second finger landed: a few short scrapes that open out and are gone.
    const nick = wood.nick
    if (nick.pulse > 0.02) {
      for (let k = 0; k < 5; k++) {
        const angle = k * 1.26 + noise(k, 61) * 0.4, from = 7 + (1 - nick.pulse) * 12, to = from + 4 + 9 * nick.pulse
        this.air.line([nick.x + Math.cos(angle) * from, nick.y + Math.sin(angle) * from, nick.x + Math.cos(angle) * to, nick.y + Math.sin(angle) * to])
      }
    }
    if (this.air.lines.m > 0) {
      pen.strokeStyle = this.rainbow
      pen.lineWidth = LINE
      pen.beginPath(); trace(pen, this.air.lines, false); pen.stroke()
      this.draws++
    }
    this.lantern(wood, time)
    if (guidance && aim) this.draws += drawGuide(pen, guidance, aim, time, wood.gives ? WHITE : this.rainbow, this.hand)
  }

  /** The door standing open: the dark of the room behind it, and its edge. Two draws. */
  private door(open: number): void {
    const pen = this.pen
    const wide = 30 + open * 90
    pen.fillStyle = WAX
    pen.beginPath()
    pen.moveTo(1092, 792); pen.lineTo(1092, 506); pen.quadraticCurveTo(1100, 470, 1092 + wide, 452 - open * 8); pen.lineTo(1092 + wide, 792)
    pen.closePath()
    pen.fill()
    pen.strokeStyle = this.rainbow
    pen.lineWidth = LINE
    pen.beginPath()
    pen.moveTo(1092 + wide, 792); pen.lineTo(1092 + wide, 452 - open * 8)
    pen.moveTo(1092 + wide - 12, 640); pen.lineTo(1092 + wide - 4, 632)
    pen.stroke()
    this.draws += 2
  }

  /** One figure in four scrapes: the wax it stands on, its lines, its whites and its pupils. */
  private scrape(sketch: Sketch, hide: string, lines: CanvasGradient | string, whites: CanvasGradient | string, pupils: string): void {
    const pen = this.pen
    if (sketch.hide.m > 0) {
      pen.fillStyle = hide
      pen.beginPath(); trace(pen, sketch.hide, true); pen.fill()
      this.draws++
    }
    if (sketch.lines.m > 0) {
      pen.strokeStyle = lines
      pen.lineWidth = LINE
      pen.beginPath(); trace(pen, sketch.lines, false); pen.stroke()
      this.draws++
    }
    if (sketch.whites.m > 0) {
      pen.fillStyle = whites
      pen.beginPath(); trace(pen, sketch.whites, true); pen.fill()
      this.draws++
    }
    if (sketch.pupils.m > 0) {
      pen.fillStyle = pupils
      pen.beginPath(); trace(pen, sketch.pupils, true); pen.fill()
      this.draws++
    }
  }

  /** The glow-worms' own lamps: each scrapes a little round clear, and the wood shows in ink through it. Under the creatures, which a lamp does not light. Two draws. */
  private lamps(wood: Wood): void {
    const pen = this.pen
    let lit = 0
    for (let i = 0; i < WORMS; i++) if (lampShows(wood, i)) lit++
    if (lit === 0) return
    const rounds = () => {
      for (let i = 0; i < WORMS; i++) {
        if (!lampShows(wood, i)) continue
        const at = lampPlace(wood, i, this.lamp), r = LAMP + wood.worms.pulse[i] * 10
        pen.moveTo(at.x + r, at.y)
        for (let k = 1; k < 14; k++) pen.lineTo(at.x + Math.cos((k / 14) * Math.PI * 2) * (r + noise(i * 14 + k, 95) * 3), at.y + Math.sin((k / 14) * Math.PI * 2) * (r + noise(i * 14 + k, 96) * 3))
        pen.closePath()
      }
    }
    // A glow-worm's own light is plain: it shows the colours under the wax as they are.
    pen.fillStyle = this.rainbow
    pen.beginPath(); rounds(); pen.fill()
    this.draws++
    pen.save()
    pen.beginPath(); rounds(); pen.clip()
    pen.setTransform(1, 0, 0, 1, 0, 0)
    pen.drawImage(this.ink!, 0, 0)
    this.draws++
    pen.restore()
    this.place(pen)
  }

  /** The lantern's light: paper colour where each window's outline falls, the wood in ink through the outlines, and whole and in full every creature a patch touches. */
  private light(wood: Wood, show: WoodShow, time: number, boil: number): void {
    const pen = this.pen
    const outline = (world: Float32Array) => {
      pen.moveTo(world[0], world[1])
      for (let i = 2; i < world.length; i += 2) pen.lineTo(world[i], world[i + 1])
      pen.closePath()
    }
    const gives = wood.gives
    if (gives) {
      // On the hook the windows come up on the wall as the ending shows them.
      pen.globalAlpha = wood.hung ? show.glow : 1
      for (const patch of wood.patches) {
        pen.fillStyle = patch.paper ? this.papers[patch.paper] : this.rainbow
        pen.beginPath(); outline(patch.world); pen.fill()
        this.draws++
      }
      pen.globalAlpha = 1
      pen.save()
      pen.beginPath()
      for (const patch of wood.patches) outline(patch.world)
      pen.clip()
      pen.setTransform(1, 0, 0, 1, 0, 0)
      pen.globalAlpha = wood.hung ? show.glow : 1
      pen.drawImage(this.ink!, 0, 0)
      pen.globalAlpha = 1
      this.draws++
      pen.restore()
      this.place(pen)
    }
    // Whoever a light touches is seen whole.
    for (let i = 0; i < BIG.length; i++) {
      if (shownLit(wood, BIG[i])) this.scrape(this.big[i].sketch, CREAM, WAX, WHITE, WAX)
      // The glow of a hung lantern lights nobody: whoever it lies on is scraped again over it, as the dark shows them.
      else if (underGlow(wood, BIG[i])) this.scrape(this.big[i].sketch, WAX, this.rainbow, this.rainbow, WAX)
    }
    this.smallLit.clear(); this.smallLit.boil = boil
    drawSmall(this.smallLit, wood, time, true)
    this.scrape(this.smallLit, CREAM, WAX, WHITE, WAX)
    if (wood.hung && wood.glow > 0) {
      this.smallLit.clear()
      drawSmall(this.smallLit, wood, time, 'under')
      this.scrape(this.smallLit, WAX, this.rainbow, this.rainbow, WAX)
    }
    if (!this.grain || !gives) return
    // Crumbs of wax along the scraped edge: dark ones left lying on the colour, bright ones knocked out past it.
    this.crumbsIn.clear(); this.crumbsOut.clear()
    for (let p = 0; p < wood.patches.length; p++) {
      const patch = wood.patches[p]
      for (let i = 0; i < patch.world.length; i += 4) {
        const dx = patch.world[i] - patch.x, dy = patch.world[i + 1] - patch.y
        const seed = p * 97 + i
        const into = noise(seed, 85) > 0 ? this.crumbsIn : this.crumbsOut
        const far = into === this.crumbsIn ? 0.9 - 0.1 * Math.abs(noise(seed, 86)) : 1.06 + 0.08 * Math.abs(noise(seed, 86))
        const x = patch.x + dx * far, y = patch.y + dy * far
        into.point(x, y); into.point(x + noise(seed, 87) * 3, y + noise(seed, 88) * 3)
        into.end()
      }
    }
    pen.lineWidth = 2.6
    pen.strokeStyle = WAX
    pen.beginPath(); trace(pen, this.crumbsIn, false); pen.stroke()
    pen.strokeStyle = this.rainbow
    pen.beginPath(); trace(pen, this.crumbsOut, false); pen.stroke()
    this.draws += 2
  }

  /** The lantern on its pole, or on its hook: the one thing in the wood with weight. */
  private lantern(wood: Wood, time: number): void {
    const pen = this.pen
    const grip = wood.grip, tipX = grip.x + POLE.x, tipY = grip.y + POLE.y
    const up = { x: -Math.sin(wood.swing), y: -Math.cos(wood.swing) }
    const squash = 1 + wood.flare * 0.16
    pen.strokeStyle = this.rainbow
    pen.lineWidth = LINE + 1.4
    pen.beginPath()
    if (wood.hung) {
      pen.moveTo(HOOK.x, HOOK.y)
    } else {
      pen.moveTo(grip.x - 9, grip.y + 44); pen.lineTo(tipX, tipY)
      pen.moveTo(grip.x - 4, grip.y + 44); pen.lineTo(tipX + 3, tipY + 8)
      pen.moveTo(tipX, tipY)
    }
    pen.lineTo(wood.lantern.x + up.x * 104, wood.lantern.y + up.y * 104)
    pen.stroke()
    this.draws++
    pen.save()
    pen.translate(wood.lantern.x, wood.lantern.y)
    pen.rotate(-wood.swing)
    pen.scale(squash * 1.35, (2 - squash) * 1.35)
    const body = () => {
      pen.beginPath()
      pen.moveTo(-30, -40); pen.lineTo(30, -40); pen.lineTo(33, 0); pen.lineTo(30, 42); pen.lineTo(-30, 42); pen.lineTo(-33, 0)
      pen.closePath()
    }
    // Giving light, the paper is scraped clear and takes the colour under the wax where it hangs; dark, it is wax with an edge.
    const gives = wood.gives
    body()
    pen.fillStyle = gives ? this.rainbow : WAX
    pen.fill()
    this.draws++
    const span = Math.max(1, wood.patches.length)
    const windowX = (bearing: number) => (bearing + Math.PI / 2) * (21 / (Math.PI * 0.6))
    if (gives) {
      // All the windows of one paper in one fill.
      for (const paper of ['red', 'blue', 'yellow', null] as const) {
        let any = false
        pen.beginPath()
        for (const patch of wood.patches) {
          if (patch.paper !== paper) continue
          any = true
          const x = windowX(patch.bearing), k = 0.085 * Math.min(1, 3 / span + 0.5)
          for (let i = 0; i < patch.local.length; i += 4) {
            const px = x + patch.local[i] * k, py = 2 + patch.local[i + 1] * k
            if (i === 0) pen.moveTo(px, py)
            else pen.lineTo(px, py)
          }
          pen.closePath()
        }
        if (!any) continue
        pen.fillStyle = paper ? this.papers[paper] : WHITE
        pen.fill()
        this.draws++
      }
    }
    if (wood.lit) {
      // The flame over the rim, never still.
      const { lick, lean } = flameOf(wood, time)
      pen.beginPath()
      pen.moveTo(-9, -40); pen.quadraticCurveTo(-12, -54 * lick, lean, -40 - 32 * lick); pen.quadraticCurveTo(12, -54 * lick, 9, -40)
      pen.closePath()
      pen.fillStyle = WHITE
      pen.fill()
      this.draws++
    }
    pen.strokeStyle = gives ? WAX : this.rainbow
    pen.lineWidth = LINE
    body()
    pen.moveTo(-30, -31); pen.lineTo(30, -31)
    pen.moveTo(-30, 33); pen.lineTo(30, 33)
    pen.moveTo(-24, -40); pen.quadraticCurveTo(0, -78, 24, -40)
    if (!gives) {
      for (const patch of wood.patches) {
        const x = windowX(patch.bearing)
        for (let i = 0; i <= patch.local.length; i += 4) {
          const at = i % patch.local.length
          const px = x + patch.local[at] * 0.085, py = 2 + patch.local[at + 1] * 0.085
          if (i === 0) pen.moveTo(px, py)
          else pen.lineTo(px, py)
        }
      }
    }
    pen.stroke()
    this.draws++
    pen.restore()
  }
}

/** The idle ladder: a ring of scraped ticks round the one thing to touch, then a ghost hand that shows one move with it. Gives back what it cost in draws. */
export function drawGuide(pen: Pen, guidance: Guidance, aim: Aim, time: number, colour: CanvasGradient | string, hand: HandPose): number {
  let draws = 0
  if (guidance.glow > 0.01) {
    const cx = (aim.glow.left + aim.glow.right) / 2, cy = (aim.glow.top + aim.glow.bottom) / 2
    // The ring keeps to the thing's own shape, so a tall thing has a tall ring and nothing beside it is inside.
    const breath = Math.sin(time * 3.2) * 5
    const rx = (aim.glow.right - aim.glow.left) / 2 + 14 + breath, ry = (aim.glow.bottom - aim.glow.top) / 2 + 14 + breath
    pen.globalAlpha = guidance.glow
    pen.strokeStyle = colour
    pen.lineWidth = LINE + 1.5
    pen.beginPath()
    for (let i = 0; i < 11; i++) {
      // Ticks of uneven length, turning slowly: a shimmer, and nothing to read.
      const angle = (i / 11) * Math.PI * 2 + time * 0.4 + noise(i, 71) * 0.14, long = 11 + 8 * (0.5 + 0.5 * noise(i, 72))
      const x = cx + Math.cos(angle) * rx, y = cy + Math.sin(angle) * ry
      pen.moveTo(x, y)
      pen.lineTo(x + Math.cos(angle) * long, y + Math.sin(angle) * long)
    }
    pen.stroke()
    draws++
    pen.globalAlpha = 1
  }
  if (guidance.demo === null) return draws
  const pose = handPose(guidance.demo, !aim.tap, hand)
  if (pose.opacity <= 0.01) return draws
  const at = handAt(aim, pose.travel)
  ghostHand(pen, at.x, at.y, pose)
  return draws + 2
}

const handPlace = { x: 0, y: 0 }

/** Where the ghost hand is, `travel` of the way through its move: along its path where it has one, and else straight from where the move starts to where it ends. */
export function handAt(aim: Aim, travel: number): { x: number; y: number } {
  const path = aim.path
  if (!path || path.length < 4) {
    handPlace.x = aim.fromX + (aim.toX - aim.fromX) * travel; handPlace.y = aim.fromY + (aim.toY - aim.fromY) * travel
    return handPlace
  }
  let total = 0
  for (let i = 2; i < path.length; i += 2) total += Math.hypot(path[i] - path[i - 2], path[i + 1] - path[i - 1])
  let want = Math.min(1, Math.max(0, travel)) * total
  for (let i = 2; i < path.length; i += 2) {
    const long = Math.hypot(path[i] - path[i - 2], path[i + 1] - path[i - 1])
    if (want <= long || i === path.length - 2) {
      const part = long > 0 ? Math.min(1, want / long) : 0
      handPlace.x = path[i - 2] + (path[i] - path[i - 2]) * part; handPlace.y = path[i - 1] + (path[i + 1] - path[i - 1]) * part
      return handPlace
    }
    want -= long
  }
  return handPlace
}
