import { chief, chiefModel } from './figures'
import { handPose, type Guidance, type HandPose } from './guidance'
import { key, length, samePoint, type Kind, type Part, type Point } from './kit'
import { TRAY, bays } from './layout'
import { INK, THICK, pin, stream, string, wood, woodShadow, type Pen, type Wood } from './look'
import { stringSway } from './motion'
import { ends } from './pose'
import { paintSheet, plotFor, px, water, type Plot } from './sheet'
import { isFooting, type Site } from './sites'
import { CHIEF, FLIGHT, RING, type Toy } from './toy'

// The toy drawn: the still sheet stamped once from an offscreen canvas, then
// the water, the tray's piles, the parts where their springs have them, the
// pins, the chief, and the idle guidance. It reads the toy and never changes
// it. No text is drawn anywhere.

const woodOf = (part: Pick<Part, 'kind' | 'turned'>): Wood => (part.kind === 'plank' ? (part.turned ? 'plank-edge' : 'plank') : part.kind === 'thread' ? 'stick' : part.kind)

/** How each kind shakes when plucked: how far, in cells, and how many times a second. */
const SHAKE: Readonly<Record<Kind, { far: number; beat: number }>> = {
  plank: { far: 0.07, beat: 8 }, stick: { far: 0.035, beat: 21 }, tube: { far: 0.03, beat: 13 }, thread: { far: 0.22, beat: 15 },
}

/** The move the ghost hand shows: a part laid between two points on the near bank, away from the gap. */
export const demoMove = (at: Site): { from: Point; to: Point } => ({ from: [at.left[0] - 3, at.left[1]], to: [at.left[0] - 1, at.left[1] + 1] })

export class View {
  plot: Plot = { cell: 1, ox: 0, oy: 0 }
  private width = 0
  private height = 0
  private ratio = 1
  private grain = true
  private sheet: HTMLCanvasElement | null = null
  private sheetOf = ''
  private readonly sprites = new Map<string, HTMLCanvasElement>()
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }

  constructor(private readonly seed: number, private readonly make: () => HTMLCanvasElement = () => document.createElement('canvas')) {}

  /** The surface's size in CSS pixels, its pixel ratio, and whether this tier draws the grain. Sprites are made again at the new density. */
  size(width: number, height: number, ratio: number, grain: boolean): void {
    if (width === this.width && height === this.height && ratio === this.ratio && grain === this.grain) return
    this.width = width; this.height = height; this.ratio = ratio; this.grain = grain
    this.plot = plotFor(width, height)
    this.sprites.clear()
    this.sheetOf = ''
  }

  /** A place on the surface, in CSS pixels, as grid cells. */
  toGrid(sx: number, sy: number): [number, number] {
    return [(sx - this.plot.ox) / this.plot.cell, (this.plot.oy - sy) / this.plot.cell]
  }

  /** The bare sheet colour: what is drawn before the saved state has been read. */
  backdrop(pen: Pen): void {
    pen.setTransform(1, 0, 0, 1, 0, 0)
    pen.fillStyle = INK.sheet
    pen.fillRect(0, 0, this.width * this.ratio, this.height * this.ratio)
  }

  private stamp(pen: Pen, at: Site): void {
    const name = `${at.id}/${at.variant}`
    if (!this.sheet || this.sheetOf !== name) {
      const sheet = this.sheet ?? this.make()
      sheet.width = Math.round(this.width * this.ratio); sheet.height = Math.round(this.height * this.ratio)
      const own = sheet.getContext('2d')
      if (own) { own.setTransform(this.ratio, 0, 0, this.ratio, 0, 0); paintSheet(own, this.width, this.height, this.plot, at, this.seed, true) }
      this.sheet = sheet; this.sheetOf = name
    }
    pen.setTransform(1, 0, 0, 1, 0, 0)
    pen.drawImage(this.sheet, 0, 0)
    pen.setTransform(this.ratio, 0, 0, this.ratio, 0, 0)
  }

  /** One part as a picture, lying level with its first pin at the picture's own origin: made once for each kind and length. */
  private sprite(kind: Wood, long: number): { canvas: HTMLCanvasElement; pad: number; tall: number } {
    const { cell } = this.plot, pad = (THICK[kind] * 0.5 + 0.12) * cell, tall = (THICK[kind] + 0.16) * cell
    const name = `${kind}:${long.toFixed(3)}`
    let canvas = this.sprites.get(name)
    if (!canvas) {
      canvas = this.make()
      canvas.width = Math.ceil((long * cell + 2 * pad) * this.ratio); canvas.height = Math.ceil(tall * this.ratio)
      const own = canvas.getContext('2d')
      if (own) {
        own.setTransform(this.ratio, 0, 0, this.ratio, 0, 0)
        // Each length has its own grain, the same every time it is made.
        wood(own, kind, pad, tall / 2, pad + long * cell, tall / 2, cell, stream(Math.round(long * 977) + kind.length * 131), false, this.grain)
      }
      this.sprites.set(name, canvas)
    }
    return { canvas, pad, tall }
  }

  /** A wooden or paper part between two places in pixels. `lift` raises its shadow; `deep` squeezes or swells its depth while it turns. */
  private part(pen: Pen, kind: Wood, long: number, a: readonly [number, number], b: readonly [number, number], lift = 1, deep = 1): void {
    if (lift > 0) woodShadow(pen, kind, a[0], a[1], b[0], b[1], this.plot.cell, lift, deep)
    const { canvas, pad, tall } = this.sprite(kind, long)
    pen.save()
    pen.translate(a[0], a[1]); pen.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]))
    pen.drawImage(canvas, -pad, (-tall / 2) * deep, canvas.width / this.ratio, tall * deep)
    pen.restore()
  }

  /** Draws the toy and returns how many things it drew, which a canvas game reports as its draw calls. */
  draw(pen: Pen, toy: Toy, guidance: Guidance | null): number {
    const { plot } = this, { cell } = plot, at = toy.at, footing = isFooting(at)
    const at2 = (p: readonly [number, number]) => px(plot, p[0], p[1])
    let drawn = 1
    this.stamp(pen, at)
    water(pen, plot, at, toy.seconds)

    // The tray's piles: as many parts as are left of each kind, and the pile last picked stands a little proud.
    for (const bay of bays(at)) {
      const left = toy.left(bay.kind), picked = toy.selected === bay.kind
      const long = Math.min(bay.x1 - bay.x0 - 0.9, 3), x0 = (bay.x0 + bay.x1 - long) / 2, base = TRAY.top - TRAY.tall + 0.35 + (picked ? 0.1 : 0)
      const pitch = Math.min(0.32, 1.45 / Math.max(left, 1))
      if (bay.kind === 'thread') {
        // The spool: as many turns of string as there are threads left, between two balsa cheeks, and a loose end that sways.
        const mid = (bay.x0 + bay.x1) / 2
        for (let i = 0; i < left; i++) string(pen, ...at2([mid - 0.4, base + 0.12 + i * pitch * 0.9]), ...at2([mid + 0.4, base + 0.18 + i * pitch * 0.9]), cell * 1.5)
        this.part(pen, 'plank', 1.2, at2([mid - 0.6, base]), at2([mid + 0.6, base]), picked ? 1.8 : 1)
        this.part(pen, 'plank', 1.2, at2([mid - 0.6, base + 1.5]), at2([mid + 0.6, base + 1.5]), picked ? 1.8 : 1)
        const sway = stringSway(toy.seconds)
        if (left > 0) string(pen, ...at2([mid + 0.4, base + 0.14]), ...at2([mid + 0.4 + Math.cos(sway) * 0.85, base + 0.1 - Math.sin(sway) * 0.3]), cell, 0.12)
        drawn += left + 3
      } else {
        const kind = woodOf({ kind: bay.kind, turned: false })
        // The whole pile's shadow first, then the parts: one part's shadow never hides the part under it.
        const lie = (i: number) => { const skew = 0.05 * Math.sin(i * 2.4 + bay.x0); return [at2([x0 + skew, base + i * pitch]), at2([x0 + long + skew, base + i * pitch + 0.02 * Math.sin(i * 1.3)])] as const }
        for (let i = 0; i < left; i++) { const [a, b] = lie(i); woodShadow(pen, kind, a[0], a[1], b[0], b[1], cell, picked ? 1.8 : 1) }
        for (let i = 0; i < left; i++) { const [a, b] = lie(i); this.part(pen, kind, long, a, b, 0) }
        drawn += left
      }
      if (picked) this.brackets(pen, at2([bay.x0 + 0.18, TRAY.top - 0.18]), at2([bay.x1 - 0.18, TRAY.top - TRAY.tall + 0.18]), 0.95)
    }
    const glow = guidance ? guidance.glow * (0.6 + 0.4 * Math.sin(toy.seconds * 3)) : 0
    if (glow > 0.01) for (const bay of bays(at)) this.brackets(pen, at2([bay.x0 + 0.1, TRAY.top - 0.1]), at2([bay.x1 - 0.1, TRAY.top - TRAY.tall + 0.1]), glow * 0.9)

    // The parts where their springs have them. String lies under wood, wood under pins.
    const hand = toy.hand
    const pose = toy.bridge.map((part, index) => {
      const now = hand?.what === 'part' && hand.carried && hand.index === index ? toy.carriedEnds(hand) : ends(toy.moving[index], length(part))
      const dx = now.b[0] - now.a[0], dy = now.b[1] - now.a[1], long = Math.hypot(dx, dy) || 1
      // A plucked part shakes across its own length and dies away.
      const rung = toy.rung[index], shake = rung < RING ? SHAKE[part.kind].far * Math.exp(-rung / 0.22) * Math.sin(2 * Math.PI * SHAKE[part.kind].beat * rung) : 0
      // A part that was never turned has been "turning" for ever: every term below is taken only inside the turn.
      const turned = toy.turned[index] < 0.4 ? toy.turned[index] : 0.4, turning = 1 - turned / 0.4
      const hop = part.kind === 'plank' ? 0.12 * Math.sin(Math.PI * Math.min(turned / 0.3, 1)) : part.kind === 'tube' ? 0.05 * turning * Math.sin(2 * Math.PI * 6 * turned) : 0
      const off = part.kind === 'thread' ? 0 : shake + hop
      const ox = (-dy / long) * off, oy = (dx / long) * off
      return { a: at2([now.a[0] + ox, now.a[1] + oy]), b: at2([now.b[0] + ox, now.b[1] + oy]), shake, turning, turned }
    })
    toy.bridge.forEach((part, index) => {
      if (part.kind !== 'thread') return
      const p = pose[index], whirl = p.turning * 0.4 * Math.sin(2 * Math.PI * 3 * p.turned)
      string(pen, ...p.a, ...p.b, cell, (toy.rest[index].slack ? 0.3 : 0) + p.shake + whirl)
      drawn++
    })
    toy.bridge.forEach((part, index) => {
      if (part.kind === 'thread') return
      const p = pose[index], carried = hand?.what === 'part' && hand.carried && hand.index === index
      const landing = toy.laid[index] < 0.3 ? 2.5 * (1 - toy.laid[index] / 0.3) : 0
      // A plank turning swells or shrinks to its new depth; a stick spinning flickers thin and thick.
      const was = part.turned ? THICK.plank / THICK['plank-edge'] : THICK['plank-edge'] / THICK.plank
      const deep = part.kind === 'plank' ? 1 + (was - 1) * p.turning ** 2 : part.kind === 'stick' ? 1 - 0.5 * p.turning * Math.abs(Math.sin(2 * Math.PI * 4 * p.turned)) : 1
      this.part(pen, woodOf(part), length(part), p.a, p.b, carried ? 3 : 1 + landing, deep)
      drawn++
    })

    // A part being laid grows from its pin toward the finger, and a ring marks the grid point it will land on.
    if (hand?.what === 'lay') {
      const from = at2(hand.from), dx = hand.finger[0] - hand.from[0], dy = hand.finger[1] - hand.from[1]
      const far = Math.hypot(dx, dy), long = Math.min(far, length({ a: hand.from, b: hand.to }) + 0.5)
      if (far > 0.05) {
        const tip = at2([hand.from[0] + (dx / far) * long, hand.from[1] + (dy / far) * long])
        if (hand.kind === 'thread') string(pen, ...from, ...tip, cell, 0.15)
        else wood(pen, woodOf({ kind: hand.kind, turned: false }), from[0], from[1], tip[0], tip[1], cell, stream(7), true, this.grain)
      }
      this.ring(pen, at2(hand.to), 0.2, 0.95)
      pin(pen, from[0], from[1], cell, footing(hand.from))
      drawn += 3
    }

    // The pins: one at each pinned end, where the part is drawn now. A footing pin sits in its drafting triangle.
    const seen = new Set<string>()
    toy.bridge.forEach((part, index) => {
      for (const end of ['a', 'b'] as const) {
        const where = pose[index][end], name = `${Math.round(where[0] / 3)},${Math.round(where[1] / 3)}`
        if (part.loose === end) { this.ring(pen, at2(part[end]), 0.1, 0.8); drawn++; continue }
        if (seen.has(name)) continue
        seen.add(name)
        const since = toy.clicked.get(key(part[end]))
        pin(pen, where[0], where[1], cell * (since !== undefined && since < 0.18 ? 1 + 0.8 * (1 - since / 0.18) : 1), footing(part[end]) && toy.rest[index].how === 'firm')
        if (glow > 0.01) this.ring(pen, where, 0.24, glow * 0.8)
        drawn++
      }
    })
    // A pin that clicked in where no part is pinned shows for a moment and is gone.
    for (const [name, since] of toy.clicked) {
      const [gx, gy] = name.split(',').map(Number)
      if (toy.bridge.some((part) => (!part.loose || part[part.loose][0] !== gx || part[part.loose][1] !== gy) && (samePoint(part.a, [gx, gy]) || samePoint(part.b, [gx, gy])))) continue
      pen.globalAlpha = Math.max(0, 1 - since / 0.6)
      pin(pen, ...at2([gx, gy]), cell * (1 + 0.8 * Math.max(0, 1 - since / 0.18)), footing([gx, gy]))
      pen.globalAlpha = 1
      drawn++
    }
    if (glow > 0.01) for (const lip of [at.left, at.right]) this.ring(pen, at2(lip), 0.24, glow * 0.8)

    // A part taken off flies to its pile in the tray.
    for (const flight of toy.flying) {
      const bay = bays(at).find((b) => b.kind === flight.part.kind), t = Math.min(1, flight.since / FLIGHT), e = t * t * (3 - 2 * t)
      const home: [number, number] = bay ? [(bay.x0 + bay.x1) / 2, TRAY.top - TRAY.tall / 2] : [0, 0], half = length(flight.part) / 2
      const a = at2([flight.a[0] + (home[0] - half - flight.a[0]) * e, flight.a[1] + (home[1] - flight.a[1]) * e]), b = at2([flight.b[0] + (home[0] + half - flight.b[0]) * e, flight.b[1] + (home[1] - flight.b[1]) * e])
      if (flight.part.kind === 'thread') string(pen, ...a, ...b, cell, 0.2)
      else this.part(pen, woodOf(flight.part), length(flight.part), a, b, 3 - 2 * e)
      drawn++
    }

    // The crew chief and the small model it is fiddling with, on the near bank.
    const [cx, cy] = at2([CHIEF.x, at.left[1]])
    chief(pen, cx, cy, cell * 1.35, toy.chief.pose, stream(11))
    chiefModel(pen, cx + cell * 1.35, cy, cell * 1.35, stream(12))
    drawn += 2

    if (guidance && guidance.demo !== null) { this.ghost(pen, toy, guidance); drawn++ }
    return drawn
  }

  /** A thin white ring: the draughtsman's circle round a point. */
  private ring(pen: Pen, at: readonly [number, number], radius: number, alpha: number): void {
    pen.strokeStyle = INK.line
    pen.globalAlpha = alpha
    pen.lineWidth = Math.max(1, this.plot.cell * 0.035)
    pen.beginPath(); pen.arc(at[0], at[1], radius * this.plot.cell, 0, Math.PI * 2); pen.stroke()
    pen.globalAlpha = 1
  }

  /** Four corner marks round a box, as a draughtsman marks a selection. */
  private brackets(pen: Pen, a: readonly [number, number], b: readonly [number, number], alpha: number): void {
    const arm = this.plot.cell * 0.45
    pen.strokeStyle = INK.line
    pen.globalAlpha = alpha
    pen.lineWidth = Math.max(1.5, this.plot.cell * 0.06)
    pen.lineCap = 'round'
    pen.beginPath()
    for (const [x, sx] of [[a[0], 1], [b[0], -1]] as const) for (const [y, sy] of [[a[1], 1], [b[1], -1]] as const) {
      pen.moveTo(x + sx * arm, y); pen.lineTo(x, y); pen.lineTo(x, y + sy * arm)
    }
    pen.stroke()
    pen.globalAlpha = 1
  }

  /** The ghost hand: one move a child could make now, shown and never told. It lays a part on the bank, or it picks another pile. */
  private ghost(pen: Pen, toy: Toy, guidance: Guidance): void {
    const { cell } = this.plot, at = toy.at, piles = bays(at)
    const picking = guidance.demoIndex % 2 === 1 && piles.length > 1
    const pose = handPose(guidance.demo ?? 0, !picking, this.hand)
    let tip: [number, number]
    if (picking) {
      const other = piles[(piles.findIndex((bay) => bay.kind === toy.selected) + 1) % piles.length]
      tip = px(this.plot, (other.x0 + other.x1) / 2, TRAY.top - TRAY.tall / 2)
    } else {
      const move = demoMove(at), from = px(this.plot, ...move.from), to = px(this.plot, ...move.to)
      tip = [from[0] + (to[0] - from[0]) * pose.travel, from[1] + (to[1] - from[1]) * pose.travel]
      pen.globalAlpha = 0.55 * pose.opacity
      pin(pen, from[0], from[1], cell, false)
      if (pose.travel > 0.02) {
        if (toy.selected === 'thread') string(pen, ...from, ...tip, cell, 0.1)
        else wood(pen, woodOf({ kind: toy.selected, turned: false }), from[0], from[1], tip[0], tip[1], cell, stream(5), false, false)
      }
    }
    // The hand itself: a pale paper cut-out of a pointing finger, a little smaller while it presses.
    const s = cell * (1 - 0.12 * pose.press)
    pen.globalAlpha = 0.8 * pose.opacity
    pen.fillStyle = INK.paper
    pen.strokeStyle = INK.steelDark
    pen.lineWidth = Math.max(1, cell * 0.03)
    pen.beginPath()
    pen.roundRect(tip[0] - s * 0.16, tip[1] - s * 0.05, s * 0.32, s * 0.95, s * 0.16)
    pen.roundRect(tip[0] - s * 0.2, tip[1] + s * 0.62, s * 0.95, s * 0.8, s * 0.3)
    pen.fill(); pen.stroke()
    pen.globalAlpha = 1
  }
}
