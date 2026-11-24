import { BED, R, grab, sideOf, sideOfSheep, type Side } from './bed'
import { actNow, advance, call, deal, hidden, knows, leap, milkOut, pull, wake, type Game } from './game'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { BOTTLE, CRATE, DOG, HALF, MOUSE, QUILT, bottleAt, hemAt, type Thing } from './layout'

// The Mount's path with no browser in it: fingers land, move, lift and are
// taken away here, in stage units, and the game plays its time here. The Mount
// and the tests make the same calls.
// - A sheep answers as the finger lands; it goes over the ridge on the lift,
//   and it comes along if the finger moves.
// - The lift ends a drag at once: a fling is let go where the finger leaves.
// - A finger that is taken away puts back what it had.

/** What a finger landed on, for the view and the voice. */
export type Poke = { thing: Thing; at: Point; second: boolean; near: number | null; slide?: boolean; speed?: number }

const REST_MS = 1000
/** How far a finger may slip and still have tapped. */
const SLIP = 44

export class Play {
  readonly touch = new ForgivingTouch()
  pokes: Poke[] = []
  /** Where the working finger is. */
  finger: Point | null = null
  /** The quilt in the hand: which half, and how far up it is. */
  hem: { side: Side; k: number } | null = null
  private pressed: Thing | null = null
  private landed = { id: -1, at: { x: 0, y: 0 }, t: 0 }
  private slid = 0
  /** How far the finger has been from where it landed. */
  private farthest = 0
  /** Who was acting under the quilt when a finger came for it. */
  private acting: number[] = []
  /** Where the straws hang that have nobody, for a finger that goes for one. */
  loose: Point[] = []

  constructor(readonly game: Game) {}

  down(id: number, at: Point, t: number): void {
    const rest = this.landed
    const held = this.game.bed.held !== null || this.hem !== null
    if (this.touch.active && this.touch.holds(rest.id) && rest.id !== id && !held && t - rest.t > REST_MS) this.act(this.touch.cancel(rest.id))
    if (this.touch.active && this.touch.holds(rest.id)) {
      // A second finger takes nothing from the first, and is answered where it lands.
      this.pokes.push({ thing: this.under(at), at, second: true, near: null })
      return
    }
    this.landed = { id, at, t }
    this.act(this.touch.down(id, at, t))
  }
  move(id: number, at: Point, t: number): void {
    if (this.touch.holds(id) && this.finger && Math.hypot(at.x - this.finger.x, at.y - this.finger.y) > 4) this.landed.t = t
    this.act(this.touch.move(id, at))
  }
  up(id: number, at: Point, t: number): void {
    this.act(this.touch.up(id, at, t))
    this.act(this.touch.letGo())
  }
  cancel(id: number): void { this.act(this.touch.cancel(id)) }
  clear(): void { this.act(this.touch.clear()) }
  advance(seconds: number, t: number): void {
    this.act(this.touch.advance(t))
    advance(this.game, seconds)
  }

  under(at: Point): Thing {
    const g = this.game, q = g.save.quilt
    if (q) {
      const h = HALF[q]
      if (at.x > h.left - 20 && at.x < h.right + 20) {
        if (at.y > QUILT.hem - 22 && at.y < QUILT.hem + QUILT.hemH + 14) return { kind: 'hem', side: q }
        if (at.y >= QUILT.hem + QUILT.hemH && at.y < QUILT.roll + QUILT.rollH && at.x > h.left && at.x < h.right) return { kind: 'hidden', side: q }
      }
    }
    let best = -1, near = R + 8
    g.bed.sheep.forEach((s, i) => {
      if (hidden(g, i)) return
      const d = Math.hypot(s.x - at.x, s.y - s.z * 0.55 - at.y)
      if (d < near) { near = d; best = i }
    })
    if (best >= 0) return { kind: 'sheep', who: best }
    if (at.y > QUILT.roll - 16 && at.y < QUILT.roll + QUILT.rollH + 10 && at.x > BED.left - 10 && at.x < BED.right + 10) return { kind: 'roll', side: sideOf(at.x) }
    const milk = milkOut(g)
    if (milk) for (let i = 0; i < milk.length; i++) {
      const p = bottleAt(milk[i].side, milk[i].slot, milk.filter((b) => b.side === milk[i].side).length)
      if (Math.abs(at.x - p.x) < BOTTLE.apart / 2 && at.y > p.y - BOTTLE.h - 12 && at.y < p.y + 12) return { kind: 'bottle', index: i }
    }
    if (this.loose.some((p) => Math.hypot(p.x - at.x, p.y - at.y) < 46)) return { kind: 'straw' }
    if (Math.abs(at.x - CRATE.x) < 100 && Math.abs(at.y - CRATE.y) < 90) return { kind: 'crate' }
    if (Math.abs(at.x - DOG.x) < 104 && Math.abs(at.y - DOG.y) < 140) return { kind: 'dog' }
    if (Math.hypot(at.x - MOUSE.x, at.y - MOUSE.y) < 64) return { kind: 'mouse' }
    const inBed = at.x > BED.left && at.x < BED.right && at.y > BED.top && at.y < BED.bottom
    if (inBed && Math.abs(at.x - BED.crest) < 34) return { kind: 'ridge' }
    if (inBed) return { kind: 'mattress', side: sideOf(at.x) }
    return { kind: 'rug' }
  }

  private nearest(at: Point, only: (who: number) => boolean): number | null {
    let best: number | null = null, d = Infinity
    this.game.bed.sheep.forEach((s, i) => {
      const k = Math.hypot(s.x - at.x, s.y - at.y)
      if (only(i) && k < d) { d = k; best = i }
    })
    return best
  }

  private act(gestures: Gesture[]): void {
    const g = this.game
    for (const e of gestures) switch (e.type) {
      case 'press': {
        const thing = this.under(e.at)
        // Who acts is asked before the touch ends the act: one uncovered in the middle of it is caught.
        this.acting = actNow(g)?.cast.filter((i) => hidden(g, i)) ?? []
        wake(g)
        this.pressed = thing
        this.finger = e.at
        const near = thing.kind === 'hidden' ? this.nearest(e.at, (i) => sideOfSheep(g.bed, i) === thing.side) : thing.kind === 'mattress' || thing.kind === 'ridge' ? this.nearest(e.at, (i) => !hidden(g, i)) : thing.kind === 'sheep' ? thing.who : null
        this.pokes.push({ thing, at: e.at, second: false, near })
        if (thing.kind === 'sheep') g.events.push({ type: 'squash', who: thing.who, hidden: false })
        else if (thing.kind === 'hidden' && near !== null) g.events.push({ type: 'squash', who: near, hidden: true })
        if (thing.kind === 'dog' || thing.kind === 'crate') deal(g)
        if (thing.kind === 'bottle' || thing.kind === 'straw') call(g)
        break
      }
      case 'tap':
        this.tap()
        break
      case 'pressEnd':
        this.pressed = null
        this.finger = null
        break
      case 'dragStart': {
        const p = this.pressed
        this.slid = 0
        this.farthest = 0
        this.begun()
        if (p?.kind === 'sheep') { grab(g.bed, p.who, e.from) }
        else if (p?.kind === 'hidden' || p?.kind === 'mattress') { g.bed.hand = { at: e.from, to: e.from } }
        else if (p?.kind === 'hem') this.hem = { side: p.side, k: 1 }
        else if (p?.kind === 'roll') this.hem = { side: p.side, k: 0 }
        break
      }
      case 'dragMove': {
        this.slid += this.finger ? Math.hypot(e.at.x - this.finger.x, e.at.y - this.finger.y) : 0
        this.finger = e.at
        this.farthest = Math.max(this.farthest, Math.hypot(e.at.x - this.landed.at.x, e.at.y - this.landed.at.y))
        if (g.bed.held) g.bed.held.at = e.at
        if (g.bed.hand) g.bed.hand.to = e.at
        if (this.hem) this.hem.k = Math.min(1, Math.max(0, (e.at.y - hemAt(0) - (this.pressed?.kind === 'hem' ? 24 : 30)) / (hemAt(1) - hemAt(0))))
        if (this.slid > 60) {
          this.slid = 0
          const p = this.pressed
          if (p?.kind === 'sheep' && g.bed.held) {
            const s = g.bed.sheep[p.who]
            this.pokes.push({ thing: p, at: e.at, second: false, near: null, slide: true, speed: Math.hypot(s.vx, s.vy) })
          } else if (p && p.kind !== 'sheep') this.pokes.push({ thing: p.kind === 'ridge' || p.kind === 'mattress' || p.kind === 'rug' ? this.under(e.at) : p, at: e.at, second: false, near: null, slide: true })
        }
        break
      }
      case 'dragLift':
        break
      case 'dragEnd': {
        const slip = this.farthest < SLIP
        const held = g.bed.held
        g.bed.held = null
        g.bed.hand = null
        const hem = this.hem
        this.hem = null
        this.finger = null
        if (hem) {
          if (slip) this.tap()
          else this.pull(hem.side, this.pressed?.kind === 'roll' ? hem.k > 0.3 : hem.k > 0.7)
        } else if (held && slip && sideOfSheep(g.bed, held.who) === sideOf(held.from.x)) this.tap()
        else if (held && sideOfSheep(g.bed, held.who) !== sideOf(held.from.x)) knows(g)
        else if (!held && slip && this.pressed?.kind === 'hidden') this.tap()
        this.pressed = null
        g.changed = true
        break
      }
      case 'dragCancel': {
        const held = g.bed.held
        g.bed.held = null
        g.bed.hand = null
        this.hem = null
        this.finger = null
        this.pressed = null
        if (held && sideOfSheep(g.bed, held.who) !== sideOf(held.from.x)) leap(g, held.who)
        g.changed = true
        break
      }
      default:
        e satisfies never
    }
  }

  /** A scene that began under a finger that was only resting ends when the finger does something. */
  private begun(): void {
    const k = this.pressed?.kind
    if (this.game.scene && k !== 'dog' && k !== 'crate') wake(this.game)
  }

  private pull(side: Side, up: boolean): void {
    const g = this.game
    pull(g, side, up)
    for (const who of this.acting) if (!hidden(g, who)) { g.stare = 1.6; g.events.push({ type: 'caught', who }) }
    this.acting = []
  }

  private tap(): void {
    const g = this.game, p = this.pressed
    this.begun()
    this.pressed = null
    this.finger = null
    if (p?.kind === 'sheep') leap(g, p.who)
    else if (p?.kind === 'roll') this.pull(p.side, true)
    else if (p?.kind === 'hem' || p?.kind === 'hidden') this.pull(p.side, false)
  }
}
