import { IdleLadder, type Guidance } from './guidance'
import { nextDemo } from './guide'
import { cancel, lift, move, nudge, park, press } from './hands'
import { FRONT_Z, HOME, faceAt, onPlane } from './layout'
import { cuttable, fromHome, inCorner, targetAt } from './targets'
import type { Toy } from './toy'

// The Mount's path with no browser in it: fingers land, move, lift and are
// taken away here, and the game plays its time here. The Mount passes pointer
// events in by their ids and surface pixels; a test does the same.
// - One finger works at a time. A finger that rests hands the work to the
//   next one that lands: one that landed where nothing is, one that holds
//   nothing, or one that has been down a second without moving. A finger
//   that is cutting or carrying is never interrupted: a second finger that
//   lands meanwhile is answered where it landed and changes nothing.
// - The lift and the cancel are handed to the game. A lift leaves a cut
//   waiting where it stopped and lets go of what is carried; a cancel never
//   acts for the child.
// - The grown-up's corner answers nothing and does not count as a touch.
// - The idle ladder is on the game's own clock. Only the child's touch takes
//   it back to the bottom: nothing a character does by itself resets it, and
//   a put-away does.

/** Surface pixels a finger may slip and still be tapping. */
export const TAP_SLOP = 14
/** Seconds on the game's clock a finger may lie still before it counts as resting. */
export const REST_S = 1

type Contact = { x: number; y: number; landed: number; moved: boolean; air: boolean }

export class Play {
  width = 0
  height = 0
  readonly ladder = new IdleLadder(0)
  private readonly contacts = new Map<number, Contact>()
  private working: number | null = null
  /** Which demonstration of the idle stretch is showing, and how far through it the last frame was. */
  private showing = -1
  private seen = 0

  constructor(readonly toy: Toy) {}

  /** The surface as it is measured now. */
  size(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  get busy(): boolean {
    return this.working !== null
  }

  /** Whether the working finger has started something it must not be taken from. */
  private atWork(): boolean {
    const toy = this.toy
    return (toy.stroke !== null && toy.stroke.length > 0) || (toy.hand !== null && toy.hand.lifted === null && toy.hand.travelled > 0.05)
  }

  private rests(contact: Contact): boolean {
    const toy = this.toy
    if (this.atWork()) return false
    const holdsNothing = !toy.stroke && !toy.hand && toy.scissors.mode !== 'held'
    return holdsNothing || contact.air || (!contact.moved && toy.time - contact.landed >= REST_S)
  }

  /** A finger lands. Returns whether the game answered it. */
  down(id: number, x: number, y: number): boolean {
    const toy = this.toy
    // The grown-up's corner and the home control are not the game's: nothing answers there, and the ladder does not notice.
    if (inCorner(x, y, this.width) || fromHome(x, y, this.width) <= HOME.radius || this.width <= 0) return false
    this.ladder.touch(toy.time)
    const working = this.working === null ? null : this.contacts.get(this.working)
    if (working) {
      // A finger that is cutting or carrying keeps the work. The second finger is answered where it landed, and changes nothing.
      if (!this.rests(working)) { nudge(toy, targetAt(toy, x, y, this.width, this.height), onPlane(x, y, this.width, this.height, FRONT_Z)); return true }
      // The resting finger gives up what it held, as if it had been taken away: nothing is cut and nothing is moved.
      cancel(toy)
      this.contacts.delete(this.working!)
    }
    const target = targetAt(toy, x, y, this.width, this.height)
    this.working = id
    this.contacts.set(id, { x, y, landed: toy.time, moved: false, air: target.kind === 'air' })
    press(toy, target, onPlane(x, y, this.width, this.height, FRONT_Z))
    return true
  }

  move(id: number, x: number, y: number): void {
    const contact = id === this.working ? this.contacts.get(id) : undefined
    if (!contact) return
    // A tap may slip a little: nothing moves until the finger has gone further than that.
    if (!contact.moved && Math.hypot(x - contact.x, y - contact.y) <= TAP_SLOP) return
    contact.moved = true
    const where = onPlane(x, y, this.width, this.height, FRONT_Z)
    move(this.toy, where, faceAt(where, cuttable(this.toy)))
    this.ladder.touch(this.toy.time)
  }

  /** The finger lets go: a tap pokes its hole, a line waits, or the thing in the hand is let go over whatever lies under the finger. */
  up(id: number, x: number, y: number): void {
    if (id !== this.working) return
    this.working = null
    this.contacts.delete(id)
    lift(this.toy, targetAt(this.toy, x, y, this.width, this.height, true))
    this.ladder.touch(this.toy.time)
  }

  /** The finger was taken away, which is not the child letting go. */
  cancel(id: number): void {
    if (id !== this.working) return
    this.working = null
    this.contacts.delete(id)
    cancel(this.toy)
  }

  /** Plays `dt` seconds and returns what the idle ladder shows now. */
  step(dt: number): Guidance {
    const toy = this.toy
    toy.step(dt)
    if (this.working !== null && this.atWork()) this.ladder.touch(toy.time)
    const guidance = this.ladder.update(toy.time)
    // Each demonstration is chosen as it starts; one that has been shown to its end is not shown again this visit.
    if (guidance.demoIndex !== this.showing) {
      if (this.showing >= 0 && this.seen > 0.95 && toy.demo !== 'cut') toy.shown.add(toy.demo)
      this.showing = guidance.demoIndex
      if (guidance.demoIndex >= 0) toy.demo = nextDemo(toy)
    }
    this.seen = guidance.demo ?? this.seen
    return guidance
  }

  /** The game is put away: every finger is gone, the game is as a load would find it, and the ladder starts again. */
  park(): void {
    this.working = null
    this.contacts.clear()
    park(this.toy)
    this.ladder.touch(this.toy.time)
  }
}
