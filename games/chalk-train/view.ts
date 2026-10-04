import { CHALKS, ORANGE, chalkLine, makeGrain, makeInk, type Ink } from './chalk'
import type { Tier } from './config'
import { GREY, fade, type Bit } from './effects'
import type { RiderLife } from './cast'
import { lampOf } from './company'
import { TRAIN, drawEngineLive, drawWagonLive, type Inks } from './engineView'
import type { HandPose } from './guidance'
import { strength, type Mark, SLEEPERS_BEHIND, SLEEPER_FIRST, SLEEPER_GAP, sleepersOn } from './marks'
import { pathLength, spotAt } from './path'
import { drawRiderLive } from './riderView'
import { makeRng } from './rng'
import { engineSprites, makeSprites, stamp, type Sprites } from './sprites'
import { TAR_GREY, drawDandelion, paintTar, puddlePath, toTar, viewFor, type View } from './tar'
import type { Toy } from './toy'
import { NONE, wetStretches } from './world'
import { TAR, type Pt } from './yard'

// The picture of the toy, in chalk on tar. The ground and the chalk on it
// are kept as one board, made again only when the chalk changes, and copied
// to the surface once a frame; everything that moves is drawn over it.

type G = CanvasRenderingContext2D

/** What the idle ladder shows this frame: the glow's strength and the ghost hand, if it is up. */
export type Shown = { glow: number; hand: HandPose | null }

const GROUND_SEED = 20261003
/** Sleepers tick into place this far behind the chalk still coming out. */
const WATER = '#b9cbd8'
/** The top of the engine's funnel, in the engine's own frame: where a rider that leaps up lands. */
const FUNNEL_TOP = { x: 37, y: -150 }
/** Homes and stops stand this much larger than they are drawn. */
const HOME = 1.15
const STOP = 1.15

type Box = { x0: number; y0: number; x1: number; y1: number }
/** A mark as it lies on the board. */
type Laid = { p: Pt[]; c: number; strength: number; box: Box }
/** The box a mark is drawn in, in tar units: its points, and room for its sleepers and its dust. */
function boxOf(p: readonly Pt[]): Box {
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
  for (const q of p) { box.x0 = Math.min(box.x0, q.x); box.y0 = Math.min(box.y0, q.y); box.x1 = Math.max(box.x1, q.x); box.y1 = Math.max(box.y1, q.y) }
  const room = 30
  return { x0: box.x0 - room, y0: box.y0 - room, x1: box.x1 + room, y1: box.y1 + room }
}

export class ToyView {
  private width = 0
  private height = 0
  private dpr = 0
  private view: View = { scale: 1, dx: 0, dy: 0 }
  private grain: HTMLCanvasElement | null = null
  private ground: HTMLCanvasElement | null = null
  private board: HTMLCanvasElement | null = null
  private sprites: Sprites | null = null
  private inks: Ink[] = [...CHALKS]
  private orange: Ink = ORANGE
  private groundKey = ''
  private boardKey = ''
  private laid: Laid[] = []
  private lookKey = ''
  private clock = 0
  /** How often a resting figure is drawn afresh, in versions a second. */
  private rest = 2

  /** The surface has a new size or density: everything kept is made again at the next draw. */
  resize(width: number, height: number, dpr: number): void {
    if (width === this.width && height === this.height && dpr === this.dpr) return
    this.width = width
    this.height = height
    this.dpr = dpr
    this.view = viewFor(width, height)
    this.ground = this.board = null
    this.laid = []
    this.sprites = null
    this.groundKey = this.boardKey = this.lookKey = ''
  }

  setTier(tier: Tier): void { this.rest = tier.rest }

  /** A point of the surface, in logical pixels, as a point of the tar. */
  toTar(x: number, y: number): Pt { return toTar(this.view, x, y) }

  private canvas(): HTMLCanvasElement {
    const c = document.createElement('canvas')
    c.width = Math.round(this.width * this.dpr)
    c.height = Math.round(this.height * this.dpr)
    return c
  }

  /** Sets `g` to draw in tar units. */
  private inTar(g: G): void {
    const k = this.dpr * this.view.scale
    g.setTransform(k, 0, 0, k, this.dpr * this.view.dx, this.dpr * this.view.dy)
  }

  /**
   * One mark as the game lays it: sleepers across it up to `sleepersTo` along,
   * and the rail over them. All the sleepers of a mark are one path and one
   * stroke, which is what keeps a tar full of chalk cheap to draw again.
   */
  private rail(g: G, p: readonly Pt[], ink: Ink, sleepersTo = Infinity): number {
    const rng = makeRng(p[0].x * 31 + p[0].y)
    if (p.length === 1) {
      chalkLine(g, rng, p, ink, 13)
      return 1
    }
    const total = Math.min(pathLength(p), sleepersTo)
    g.beginPath()
    // One sleeper across a short stroke would read as a cross, and two as a double bar: a mark gets three or
    // more, which is a rail, or none.
    for (let i = 0, count = sleepersOn(total); i < count; i++) {
      const s = SLEEPER_FIRST + i * SLEEPER_GAP
      const at = spotAt(p, s), reach = 16 + rng.next() * 3, skew = (rng.next() - 0.5) * 5
      g.moveTo(at.x + at.ty * reach + at.tx * skew, at.y - at.tx * reach + at.ty * skew)
      g.lineTo(at.x - at.ty * reach - at.tx * skew, at.y + at.tx * reach - at.ty * skew)
    }
    g.save()
    g.strokeStyle = this.inks[0]
    g.lineCap = 'round'
    g.lineWidth = 4.2
    g.globalAlpha *= 0.88
    g.stroke()
    g.restore()
    chalkLine(g, rng, p, ink, 12)
    return 2
  }

  /** One mark on the board: its rail, and the dark smear where its chalk lies in the water. */
  private laidMark(g: G, mark: Laid): void {
    g.globalAlpha = mark.strength
    this.rail(g, mark.p, this.inks[mark.c])
    for (const [from, to] of wetStretches(mark)) {
      g.globalAlpha = 0.42
      g.strokeStyle = '#4a5560'
      g.lineWidth = 17
      g.lineCap = 'round'
      g.lineJoin = 'round'
      g.beginPath()
      for (let k = from; k <= to; k++) (k === from ? g.moveTo(mark.p[k].x, mark.p[k].y) : g.lineTo(mark.p[k].x, mark.p[k].y))
      if (from === to) g.lineTo(mark.p[from].x + 0.1, mark.p[from].y)
      g.stroke()
    }
    g.globalAlpha = 1
  }

  /**
   * Brings the board up to date: the ground with every mark on it. Where only
   * some marks changed (one made, the oldest rubbed out or grown paler), only
   * the boxes they lie in are painted again, from the ground up.
   */
  private makeBoard(marks: readonly Mark[], water: number): void {
    const groundKey = String(water)
    let whole = !this.board
    if (!this.ground || groundKey !== this.groundKey) {
      this.ground = this.canvas()
      const g = this.ground.getContext('2d')!
      g.scale(this.dpr, this.dpr)
      paintTar(g, this.width, this.height, this.view, GROUND_SEED, water === NONE ? null : CHALKS[water])
      this.groundKey = groundKey
      whole = true
    }
    this.board ??= this.canvas()
    const g = this.board.getContext('2d')!
    const points = marks.reduce((sum, mark) => sum + mark.p.length, 0)
    const next: Laid[] = marks.map((mark, i) => ({ p: mark.p, c: mark.c, strength: strength(i, marks.length, points), box: boxOf(mark.p) }))
    const dirty: Box[] = []
    if (!whole) {
      for (const old of this.laid) {
        const now = next.find((n) => n.p === old.p)
        if (!now || now.strength !== old.strength) dirty.push(old.box)
      }
      for (const n of next) if (!this.laid.some((old) => old.p === n.p)) dirty.push(n.box)
      const area = dirty.reduce((sum, b) => sum + (b.x1 - b.x0) * (b.y1 - b.y0), 0)
      if (area > TAR.w * TAR.h * 0.5) whole = true
    }
    this.laid = next
    if (whole) {
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.drawImage(this.ground, 0, 0)
      this.inTar(g)
      for (const mark of next) this.laidMark(g, mark)
      return
    }
    const k = this.dpr * this.view.scale
    for (const box of dirty) {
      // The box in the surface's own pixels, a little outward so no edge is left.
      const x = Math.max(0, Math.floor(box.x0 * k + this.dpr * this.view.dx) - 1), y = Math.max(0, Math.floor(box.y0 * k + this.dpr * this.view.dy) - 1)
      const w = Math.min(this.board.width - x, Math.ceil((box.x1 - box.x0) * k) + 3), h = Math.min(this.board.height - y, Math.ceil((box.y1 - box.y0) * k) + 3)
      if (w <= 0 || h <= 0) continue
      g.save()
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.beginPath()
      g.rect(x, y, w, h)
      g.clip()
      g.drawImage(this.ground, x, y, w, h, x, y, w, h)
      this.inTar(g)
      for (const mark of next) if (mark.box.x0 < box.x1 && mark.box.x1 > box.x0 && mark.box.y0 < box.y1 && mark.box.y1 > box.y0) this.laidMark(g, mark)
      g.restore()
    }
  }

  private bit(g: G, bit: Bit, sprites: Sprites): void {
    const show = fade(bit), chalk = bit.colour >= 0 ? CHALKS[bit.colour] : null
    g.globalAlpha = show
    if (bit.kind === 'dust') {
      g.fillStyle = chalk ?? CHALKS[0]
      g.beginPath()
      g.arc(bit.x, bit.y, bit.size, 0, Math.PI * 2)
      g.fill()
    } else if (bit.kind === 'drop') {
      g.fillStyle = chalk ?? WATER
      g.beginPath()
      g.ellipse(bit.x, bit.y, bit.size * 0.8, bit.size * 1.2, 0, 0, Math.PI * 2)
      g.fill()
    } else if (bit.kind === 'seed') {
      g.strokeStyle = '#fafaf4'
      g.lineWidth = 1.2
      g.beginPath()
      g.moveTo(bit.x, bit.y)
      g.lineTo(bit.x + 1, bit.y + 7)
      g.stroke()
      g.fillStyle = '#fafaf4'
      g.beginPath()
      g.arc(bit.x, bit.y, bit.size, 0, Math.PI * 2)
      g.fill()
    } else if (bit.kind === 'feather') {
      // A small feather, turning over as it floats down.
      g.fillStyle = chalk ?? CHALKS[1]
      g.beginPath()
      g.ellipse(bit.x, bit.y, bit.size * 2.4, bit.size * 0.9, Math.sin(bit.age * 6 + bit.life * 40) * 0.9, 0, Math.PI * 2)
      g.fill()
    } else if (bit.kind === 'stub') {
      // A stub of chalk, tumbling as it falls.
      g.strokeStyle = chalk ?? CHALKS[0]
      g.lineWidth = bit.size
      g.lineCap = 'round'
      const turn = bit.age * 9, reach = bit.size * 1.1
      g.beginPath()
      g.moveTo(bit.x - Math.cos(turn) * reach, bit.y - Math.sin(turn) * reach)
      g.lineTo(bit.x + Math.cos(turn) * reach, bit.y + Math.sin(turn) * reach)
      g.stroke()
    } else if (bit.kind === 'ripple') {
      g.strokeStyle = chalk ?? '#e6eef4'
      g.lineWidth = 2.5
      g.beginPath()
      g.ellipse(bit.x, bit.y, bit.size, bit.size * 0.36, 0, 0, Math.PI * 2)
      g.stroke()
    } else if (bit.kind === 'smoke') {
      // Smoke holds its white for most of its life and thins out at the end.
      g.globalAlpha = Math.min(1, show * 1.6) * (bit.colour === GREY ? 0.45 : 1)
      g.save()
      g.translate(bit.x, bit.y)
      g.scale(bit.size / 20, bit.size / 20)
      stamp(g, sprites.puff[Math.floor(bit.life * 97) % sprites.puff.length])
      g.restore()
    } else if (bit.kind === 'ring') {
      g.strokeStyle = this.inks[0]
      g.lineWidth = 4.5
      g.beginPath()
      g.ellipse(bit.x, bit.y, bit.size * 1.3, bit.size, 0, 0, Math.PI * 2)
      g.stroke()
    } else if (bit.kind === 'print') {
      g.globalAlpha = show * 0.55
      g.fillStyle = chalk ?? '#3f464d'
      g.beginPath()
      g.ellipse(bit.x, bit.y + 4, bit.size * 1.6, bit.size * 0.6, 0, 0, Math.PI * 2)
      g.fill()
    } else {
      g.globalAlpha = show * 0.22
      g.fillStyle = CHALKS[0]
      g.beginPath()
      g.ellipse(bit.x, bit.y + 3, bit.size * 2, bit.size * 0.8, 0, 0, Math.PI * 2)
      g.fill()
    }
    g.globalAlpha = 1
  }

  /**
   * Draws a frame and returns how many pictures and paths it took. With no
   * toy yet, before the saved world has been read, it draws the bare tar.
   */
  draw(canvas: HTMLCanvasElement, toy: Toy | null, shown: Shown, dt: number): number {
    const g = canvas.getContext('2d')
    if (!g || this.width <= 0 || this.height <= 0) return 0
    this.clock += dt
    const k = this.dpr * this.view.scale
    if (!this.grain) this.grain = makeGrain(makeRng(GROUND_SEED + 2))
    if (!this.sprites || !this.ground) {
      // One pixel of grain is one logical pixel of the surface, whatever the tar is scaled by.
      this.inks = CHALKS.map((colour) => makeInk(g, this.grain!, colour, 1 / this.view.scale) ?? colour)
      this.orange = makeInk(g, this.grain, ORANGE, 1 / this.view.scale) ?? ORANGE
    }
    const look = toy ? `${toy.stripes}/${toy.tint}` : 'none'
    const engineLook = { stripes: toy && toy.stripes !== NONE ? CHALKS[toy.stripes] : null, tint: toy && toy.tint !== NONE ? CHALKS[toy.tint] : null }
    if (!this.sprites) {
      this.sprites = makeSprites(k * TRAIN, this.grain, this.dpr, engineLook)
      this.lookKey = look
    } else if (look !== this.lookKey) {
      this.sprites.engine = engineSprites(k * TRAIN, this.grain, this.dpr, engineLook)
      this.lookKey = look
    }
    // A line a rider is still scraping in the first showing is not on the tar yet.
    const hidden = toy?.company.hidden ?? null
    const boardKey = toy ? `${toy.marksVersion}/${toy.world.water}/${hidden ? 'h' : ''}` : 'bare'
    if (!this.board || boardKey !== this.boardKey) {
      this.makeBoard(toy ? toy.world.marks.filter((mark) => mark !== hidden) : [], toy ? toy.world.water : NONE)
      this.boardKey = boardKey
    }
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalAlpha = 1
    g.drawImage(this.board!, 0, 0)
    let drawn = 1
    if (!toy) return drawn
    const sprites = this.sprites
    this.inTar(g)
    drawDandelion(g, makeRng(5), toy.weed)
    drawn++
    for (const bit of toy.bits.list) if (bit.kind === 'print' || bit.kind === 'trail' || bit.kind === 'ripple') { this.bit(g, bit, sprites); drawn++ }
    // The homes, and the stops where someone waits: each a kept picture, a home with its small answer to a touch.
    const stage = toy.company.stage(), still = Math.floor(this.clock * this.rest) % sprites.stop.length
    for (const home of stage.homes) {
      g.save()
      g.globalAlpha = home.shown
      g.translate(home.at.x, home.at.y + 8)
      // Each home answers a touch with a small move of its own: the pond spreads flat like a ripple, the nest
      // rustles from side to side, the leaf flaps up and down once, the cushion puffs out.
      const beat = Math.sin(home.pulse * Math.PI)
      if (home.kind === 'chick') g.rotate(Math.sin(home.pulse * Math.PI * 6) * 0.08 * beat)
      if (home.kind === 'snail') g.rotate(Math.sin(home.pulse * Math.PI * 2) * 0.16)
      const wide = home.kind === 'frog' ? beat * 0.12 : home.kind === 'cat' ? beat * 0.14 : 0
      const high = home.kind === 'frog' ? -beat * 0.12 : home.kind === 'cat' ? beat * 0.16 : 0
      g.scale(HOME * (1 + wide), HOME * (1 + high))
      stamp(g, sprites.homes[home.kind][still])
      g.restore()
      drawn++
    }
    for (const stop of stage.stops) {
      g.save()
      // The post stands clear of whoever waits, and its lamp above their head.
      g.translate(stop.x - 4, stop.y + 8)
      g.scale(STOP, STOP)
      stamp(g, sprites.stop[still])
      g.restore()
      drawn++
      // Its lamp answers a touch: it lights up, wide and soft, and dims again.
      if (stop.lit > 0.01) {
        const lamp = lampOf(stop), r = 34 + 36 * Math.sin(stop.lit * Math.PI), bright = Math.min(1, stop.lit * 2)
        const glow = g.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, r)
        glow.addColorStop(0, `rgba(255,246,200,${0.9 * bright})`)
        glow.addColorStop(0.45, `rgba(248,220,116,${0.55 * bright})`)
        glow.addColorStop(1, 'rgba(248,220,116,0)')
        g.fillStyle = glow
        g.beginPath()
        g.arc(lamp.x, lamp.y, r, 0, Math.PI * 2)
        g.fill()
        drawn++
      }
    }
    const line = toy.live ?? toy.company.showing
    if (line) drawn += this.rail(g, line.p, this.inks[line.colour], pathLength(line.p) - SLEEPERS_BEHIND)

    // A resting figure is drawn afresh a few times a second, a moving one more often: chalk that is alive.
    const pose = toy.engine, moving = pose.speed > 1
    const version = Math.floor(this.clock * (moving ? 7 : this.rest)) % sprites.engine.length
    const inks: Inks = { white: this.inks[0], pink: this.inks[2], orange: this.orange }
    const cast = [...toy.company.cast.riders.values(), ...toy.company.cast.gone]
    // A rider looks toward its home, or the way the train goes; its eyes are drawn in its own frame.
    const rider = (life: RiderLife, facing: 1 | -1) => {
      const to = life.gaze ? Math.sign(life.gaze.x - life.x) * facing : 1
      const bearing = life.bearing(this.clock)
      // Reaching, it leans the way its home lies.
      if (life.doing === 'reach') bearing.tilt *= to || 1
      return drawRiderLive(g, sprites, this.inks[0], life, bearing, { x: 0.6 * (to || 1), y: life.gaze ? Math.max(-0.6, Math.min(0.6, (life.gaze.y - life.y) / 300)) : 0 }, version, this.clock)
    }
    const afoot = (life: RiderLife) => {
      const facing: 1 | -1 = life.gaze && life.gaze.x < life.x ? -1 : 1
      g.save()
      g.translate(life.x, life.y)
      g.scale(facing, 1)
      drawn += rider(life, facing)
      g.restore()
    }
    const train = () => {
      let n = 0
      for (const index of [1, 0]) {
        const aboard = cast.find((life) => life.settledIn === index)
        // One that has leapt up onto the funnel is not in its wagon for the moment: it is drawn after the train.
        const seated = aboard && aboard.bearing(this.clock).perch <= 0.02 ? aboard : undefined
        n += drawWagonLive(g, sprites, toy.wagon(index), index, toy.journey.travelled, version, toy.chatter / 0.35, this.clock, seated ? () => rider(seated, toy.wagon(index).facing) : undefined, toy.hops[index])
      }
      return n + drawEngineLive(g, sprites, inks, pose, toy.life.bearing, toy.journey.travelled, version, this.clock, toy.beard)
    }
    // Whoever stands on the tar is drawn before the train, which passes in front; whoever is in the air, hopping aboard or out, after it.
    for (const life of cast) if (life.settledIn < 0 && !life.moving) afoot(life)
    if (toy.reflect) {
      // Seen in the puddle: the train upside down under itself, pale, inside the water's edge.
      g.save()
      puddlePath(g)
      g.clip()
      g.globalAlpha = 0.28
      g.translate(0, pose.y * 2 + 16)
      g.scale(1, -1)
      drawn += train()
      g.restore()
      g.globalAlpha = 1
    }
    drawn += train()
    for (const life of cast) if (life.settledIn < 0 && life.moving) afoot(life)
    // Up on the funnel: from its seat to the top of the funnel in an arc, and back.
    for (const life of cast) {
      const perch = life.settledIn >= 0 ? life.bearing(this.clock).perch : 0
      if (perch <= 0.02) continue
      const top = toy.onEngine(FUNNEL_TOP)
      g.save()
      g.translate(life.x + (top.x - life.x) * perch, life.y + (top.y - life.y) * perch - Math.sin(perch * Math.PI) * 70)
      g.scale(pose.facing, 1)
      drawn += rider(life, pose.facing)
      g.restore()
    }
    for (const bit of toy.bits.list) if (bit.kind !== 'print' && bit.kind !== 'trail' && bit.kind !== 'ripple') { this.bit(g, bit, sprites); drawn++ }

    // The idle ladder: a soft breathing glow on the bare spot to chalk on, then a ghost hand that shows the move once.
    if (shown.glow > 0.01 || shown.hand) {
      const want = toy.want
      if (shown.glow > 0.01) {
        const r = 66 + Math.sin(this.clock * 3) * 8
        const glow = g.createRadialGradient(want.x, want.y, 0, want.x, want.y, r)
        glow.addColorStop(0, `rgba(255,252,240,${0.5 * shown.glow})`)
        glow.addColorStop(0.55, `rgba(255,252,240,${0.2 * shown.glow})`)
        glow.addColorStop(1, 'rgba(255,252,240,0)')
        g.fillStyle = glow
        g.beginPath()
        g.arc(want.x, want.y, r, 0, Math.PI * 2)
        g.fill()
        drawn++
      }
      if (shown.hand && shown.hand.opacity > 0.01) {
        const hand = shown.hand
        // With the train wanted somewhere the hand draws a line from the engine to the spot; otherwise it taps the spot.
        const from = toy.wantFrom
        const at = from ? { x: from.x + (want.x - from.x) * hand.travel, y: from.y + (want.y - from.y) * hand.travel } : want
        if (hand.press > 0.6) {
          g.globalAlpha = hand.opacity * 0.8
          g.fillStyle = this.inks[0]
          g.strokeStyle = this.inks[0]
          if (from && hand.travel > 0.02) {
            g.lineWidth = 12
            g.lineCap = 'round'
            g.beginPath()
            g.moveTo(from.x, from.y)
            g.lineTo(at.x, at.y)
            g.stroke()
          }
          g.beginPath()
          g.arc(at.x, at.y, 9, 0, Math.PI * 2)
          g.fill()
        }
        g.globalAlpha = hand.opacity * 0.9
        g.save()
        g.translate(at.x + 4, at.y + 4 + (1 - hand.press) * 26)
        g.rotate(-0.25)
        g.scale(TRAIN * (1 - hand.press * 0.06), TRAIN * (1 - hand.press * 0.06))
        stamp(g, sprites.hand)
        g.restore()
        g.globalAlpha = 1
        drawn += 2
      }
    }
    return drawn
  }

  /** The colour to show before anything has been drawn. */
  static readonly bare = TAR_GREY
}
