import { ForgivingTouch, type Gesture, type Point } from './input'
import { SEATS, dropAt, headOf, sausageAt, thingAt, type Thing, type Who, SITTERS } from './layout'
import { footing } from './motion'
import { STEP, cover, drop, inBasket, peek, pickBlanket, pickSausage, putBack, putSausage, ringBell, sausageSpot, step, tapHook, uncover, undrape, type World } from './model'

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

export class Play {
  readonly touch = new ForgivingTouch()
  /** Where the carried thing is. */
  hand: Point | null = null
  pokes: Poke[] = []
  refusals: Refusal[] = []
  /** The room changed in a way worth saving. */
  changed = false
  private pressed: Thing | null = null
  /** The press took a blanket off somebody, who may be followed by that blanket coming along in the hand. */
  private whipped: Who | null = null
  private owed = 0
  private landed = { id: -1, at: { x: 0, y: 0 }, t: 0, dragging: false }

  constructor(readonly world: World) {}

  down(id: number, at: Point, t: number): void {
    // A finger that only rests hands the work to the one that lands.
    const rest = this.landed
    if (this.touch.active && this.touch.holds(rest.id) && !rest.dragging && rest.id !== id && (t - rest.t > REST_MS || this.pressed?.kind === 'room')) this.act(this.touch.cancel(rest.id))
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
      if (s.phase === 'run' || s.phase === 'hunt' || s.phase === 'sulk' || s.phase === 'home' || (s.phase === 'eat' && s.at.x !== SEATS[who].x)) out[who] = footing(who, s)
    }
    return out
  }

  private under(at: Point): Thing {
    const spot = sausageSpot(this.world)
    const out = this.out()
    const wearer = spot === null ? null : headOf(spot)
    const worn = wearer ? out[wearer] : undefined
    // One that is worn goes where its wearer goes.
    const lies = spot === null || spot === 'hook' ? null : wearer && worn ? { x: worn.x, y: worn.y + SEATS[wearer].top.y - SEATS[wearer].y } : sausageAt(spot)
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
    if (!held) return
    const thing = dropAt(at, this.out())
    const on = thing.kind === 'sitter' ? { who: thing.who } : thing.kind === 'place' ? { place: thing.id } : thing.kind === 'fish' ? 'fish' as const : 'elsewhere' as const
    const before = this.world.events.length
    drop(this.world, on)
    if (this.world.events.slice(before).some((e) => e.type === 'back' || e.type === 'flap')) this.refusals.push({ thing, what: held.kind })
    this.changed = true
  }
}
