import { ForgivingTouch, type Gesture, type Point } from './input'
import { SEATS, dropAt, headOf, sausageAt, thingAt, type PlaceId, type Thing, type Who, SITTERS } from './layout'
import { STEP, footing, topOf, cover, drop, inBasket, peek, pickBlanket, pickSausage, putBack, putSausage, ringBell, sausageSpot, step, tapHook, uncover, undrape, type World } from './model'

// The Mount's path with no browser in it: fingers land, move, lift and are
// taken away here, in stage units, and the game plays its time here. The Mount
// and the tests make the same calls.
// - A blanket answers as the finger lands: on an uncovered sitter it drops, on
//   a covered one it comes off, and a finger that then moves has it in hand.
// - Everything else that changes the room waits for the lift: a tap that slips
//   is still a tap, and nothing is given away by passing over it.
// - A finger that is taken away puts back what it carried.

/** A touch that changed nothing in the room still shows and sounds: what it landed on, for the view. */
export type Poke = { thing: Thing; at: Point }

/** What was let go where it cannot stay: the view shows it bounce, and the sound is the thing's own. */
export type Refusal = { thing: Thing; what: 'sausage' | 'blanket' }

/** How long a resting finger keeps the next one out, in ms. */
export const REST_MS = 1000

/** How far a finger may slip from where it landed and still have tapped, in stage units. */
export const SLIP = 56

export class Play {
  readonly touch = new ForgivingTouch()
  /** Where the carried thing is. */
  hand: Point | null = null
  pokes: Poke[] = []
  refusals: Refusal[] = []
  /** The room changed in a way worth saving. */
  changed = false
  private pressed: Thing | null = null
  /** What a finger slid on that took nothing up: a short slide was a tap. */
  private slid: Thing | null = null
  /** The press took a blanket off somebody, who may be followed by that blanket coming along in the hand. */
  private whipped: Who | null = null
  private owed = 0
  private landed = { id: -1, at: { x: 0, y: 0 }, t: 0, dragging: false }

  constructor(readonly world: World) {}

  down(id: number, at: Point, t: number): void {
    // A finger with nothing in hand that rests or only slides hands the work to the one that lands.
    const rest = this.landed
    const idle = !this.world.held && (t - rest.t > REST_MS || rest.dragging || this.pressed?.kind === 'room')
    if (this.touch.active && this.touch.holds(rest.id) && rest.id !== id && idle) this.act(this.touch.cancel(rest.id))
    if (this.touch.active && this.touch.holds(rest.id)) {
      // A second finger takes nothing from the first, and is answered where it lands.
      this.pokes.push({ thing: { kind: 'room' }, at })
      return
    }
    this.landed = { id, at, t, dragging: false }
    this.act(this.touch.down(id, at, t))
  }

  move(id: number, at: Point): void {
    this.act(this.touch.move(id, at))
  }

  up(id: number, at: Point, t: number): void {
    this.act(this.touch.up(id, at, t))
  }

  cancel(id: number): void {
    this.act(this.touch.cancel(id))
  }

  clear(): void {
    this.act(this.touch.clear())
  }

  /** The seconds of a frame. Times of lifts are in the clock `t` the touches are in. */
  advance(seconds: number, t: number): void {
    this.act(this.touch.advance(t))
    this.owed += seconds
    while (this.owed >= STEP) {
      this.owed -= STEP
      step(this.world)
    }
  }

  private out(): Partial<Record<Who, Point>> {
    const out: Partial<Record<Who, Point>> = {}
    for (const who of SITTERS) {
      const s = this.world.sitters[who]
      if (s.at.x !== SEATS[who].x || s.at.y !== SEATS[who].y) out[who] = footing(who, s)
    }
    return out
  }

  private under(at: Point): Thing {
    const spot = sausageSpot(this.world)
    const out = this.out()
    const wearer = spot === null ? null : headOf(spot)
    // One that is worn goes where its wearer goes, and one under a blanket is the blanket's.
    const hidden = spot === null || spot === 'hook' || (!wearer && this.world.draped.includes(spot as PlaceId))
    const lies = hidden ? null : wearer ? topOf(this.world, wearer) : sausageAt(spot)
    return thingAt(at, lies, out)
  }

  private act(gestures: Gesture[]): void {
    const w = this.world
    for (const g of gestures) {
      switch (g.type) {
        case 'press': {
          const thing = this.under(g.at)
          this.pressed = thing
          this.whipped = null
          this.pokes.push({ thing, at: g.at })
          if (thing.kind === 'sitter') {
            if (w.sitters[thing.who].covered) {
              uncover(w, thing.who)
              this.whipped = thing.who
            } else cover(w, thing.who)
            this.changed = true
          }
          break
        }
        case 'tap':
          this.tap()
          this.pressed = null
          break
        case 'pressEnd':
          this.pressed = null
          break
        case 'dragStart': {
          this.landed.dragging = true
          this.hand = g.from
          const p = this.pressed
          if (p?.kind === 'sausage') pickSausage(w)
          else if (p?.kind === 'hook' && sausageSpot(w) === 'hook') pickSausage(w)
          else if (p?.kind === 'basket') pickBlanket(w, 'basket')
          else if (p?.kind === 'sitter' && this.whipped) this.take(this.whipped)
          else if (p?.kind === 'place' && w.draped.includes(p.id)) pickBlanket(w, { on: p.id })
          else if (p?.kind === 'fish' && w.draped.includes('fish')) pickBlanket(w, { on: 'fish' })
          this.pressed = null
          this.slid = w.held ? null : p
          break
        }
        case 'dragMove':
          this.hand = g.at
          break
        case 'dragLift':
          break
        case 'dragEnd':
          this.letGo(g.at)
          break
        case 'dragCancel':
          this.slid = null
          putBack(w)
          this.hand = null
          this.changed = true
          break
        default:
          g satisfies never
      }
    }
  }

  /** The blanket that has just come off somebody is in the hand. Taken away, it goes back on them. */
  private take(who: Who): void {
    if (inBasket(this.world) <= 0 || this.world.held) return
    this.world.held = { kind: 'blanket', origin: { who } }
    this.world.events.push({ type: 'pick', what: 'blanket' })
  }

  private tap(): void {
    const w = this.world, p = this.pressed
    if (!p) return
    switch (p.kind) {
      case 'sausage':
        peek(w)
        break
      case 'place':
        if (w.draped.includes(p.id)) undrape(w, p.id)
        else if (sausageSpot(w) === p.id) peek(w)
        else putSausage(w, p.id)
        break
      case 'fish':
        undrape(w, 'fish')
        break
      case 'hook':
        tapHook(w)
        break
      case 'bell':
        ringBell(w)
        break
      case 'sitter':
      case 'basket':
      case 'room':
        return
      default:
        p satisfies never
    }
    this.changed = true
  }

  private letGo(at: Point): void {
    const held = this.world.held
    this.hand = null
    const near = Math.hypot(at.x - this.landed.at.x, at.y - this.landed.at.y) < SLIP
    if (!held) {
      if (near && this.slid) {
        this.pressed = this.slid
        this.tap()
      }
      this.slid = this.pressed = null
      return
    }
    if (near && held.kind === 'blanket' && typeof held.origin === 'object' && 'who' in held.origin) {
      // The finger that took a blanket off somebody slipped a little: that was a tap, and it stays off.
      this.world.held = null
      this.world.events.push({ type: 'flap' })
      return
    }
    const thing = dropAt(at, this.out())
    const on = thing.kind === 'sitter' ? { who: thing.who } : thing.kind === 'place' ? { place: thing.id } : thing.kind === 'fish' ? 'fish' as const : 'elsewhere' as const
    const before = this.world.events.length
    drop(this.world, on)
    if (this.world.events.slice(before).some((e) => e.type === 'back' || e.type === 'flap')) this.refusals.push({ thing, what: held.kind })
    this.changed = true
  }
}
