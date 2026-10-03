import type { Pictured } from './card'
import { CHARACTERS, type Customer } from './customers'
import { handPose, type Guidance, type HandPose } from './guidance'
import type { Kind } from './kinds'
import { COUNTER_Y, CUSTOMER, OVEN, PIZZA, onPizza } from './layout'
import { MotionDirector } from './motion'
import type { Save, SavedPiece } from './save'
import { spring, stepSpring } from './spring'
import { carry, dropHand, flightAt, jigglePizza, makeTable, pressPiece, pressTub, releaseHand, restingPieces, stepTable, tapHand, tubAt, waitHand, whatIsAt, type Table } from './table'
import type { Show } from './view'
import { babble, boing, home, jiggle, knock, pip, plop, pop, type VoiceSpec } from './voices'

// The kitchen as the child plays it: what a touch lands on and what it does,
// one step of game time, and what a frame shows. Framework-free: the Mount
// hands it gestures in stage units and the attended clock's steps, and takes
// back the voices to sound and a hint when something should be saved.
//
// This is the toy: a pizza, a few tubs and a customer who watches, with no
// order and no goal. The rules of the game are built on it.

/** The kinds on the table while there is no order. */
export const TOY_TUBS: readonly Kind[] = ['pepper', 'cheese', 'olive']
export const TOY_CUSTOMER: Customer = 'grum'

type Held = 'tub' | 'piece' | 'pizza' | 'customer' | 'oven' | null

export class Kitchen {
  readonly table: Table
  /** Voices to sound, in order. The Mount plays and empties it every frame. */
  readonly sounds: VoiceSpec[] = []
  /** Something changed that a save should hold: `soon` for a piece set down, `now` for an outcome. The Mount clears it. */
  dirty: 'no' | 'soon' | 'now' = 'no'
  private now = 0
  private held: Held = null
  private readonly customer: Customer
  private readonly director: MotionDirector
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  private readonly shown: Show
  /** The oven's door rattles when it is poked with nothing to bake. */
  private readonly ovenShake = spring()

  constructor(save: Save, seed: number) {
    this.customer = save.customer ?? TOY_CUSTOMER
    this.table = makeTable(save.tubs.length > 0 ? save.tubs : TOY_TUBS, seed)
    for (const p of save.pizza.pieces) this.table.pieces.push({ id: this.table.nextId++, kind: p.kind, x: p.x, y: p.y, turn: p.turn, settle: spring() })
    this.director = new MotionDirector(this.customer, seed ^ 0x51ed)
    this.shown = { table: this.table, baked: false, customer: { who: this.customer, pose: this.director.pose }, card: null as Pictured[] | null, waiting: [], glow: 0, time: 0, ghost: null, ovenShake: 0 }
  }

  /** The pieces a save holds: at rest, never in the air. */
  pieces(): SavedPiece[] {
    return restingPieces(this.table)
  }

  private mark(how: 'soon' | 'now'): void {
    if (this.dirty !== 'now') this.dirty = how
  }

  /** Touch-down. Whatever is under the finger answers here, in this frame. */
  press(x: number, y: number): void {
    const at = whatIsAt(this.table, x, y)
    if (at?.what === 'tub') {
      this.held = 'tub'
      pressTub(this.table, at.index)
    } else if (at?.what === 'piece') {
      this.held = 'piece'
      pressPiece(this.table, at.id)
    } else if (at?.what === 'pizza') {
      this.held = 'pizza'
      jigglePizza(this.table)
    } else if (this.overCustomer(x, y)) {
      this.held = 'customer'
      this.director.trigger('poke', this.now)
      this.sounds.push(babble(CHARACTERS[this.customer].voice, 'giggle'))
    } else if (Math.abs(x - OVEN.x) < OVEN.w / 2 && Math.abs(y - OVEN.y) < OVEN.h / 2) {
      this.held = 'oven'
      this.ovenShake.v += 9
      this.sounds.push(knock)
    } else this.held = null
  }

  /** The finger lifted where it landed. */
  tap(): void {
    if (this.held === 'tub' || this.held === 'piece') {
      tapHand(this.table)
      this.mark('soon')
    }
    this.held = null
  }

  dragMove(x: number, y: number): void {
    if (this.held === 'tub' || this.held === 'piece') carry(this.table, x, y)
  }

  /** The finger let go mid-carry and may come back. */
  dragLift(): void {
    if (this.held === 'tub' || this.held === 'piece') waitHand(this.table)
  }

  dragEnd(): void {
    if (this.held === 'tub' || this.held === 'piece') {
      dropHand(this.table)
      this.mark('soon')
    }
    this.held = null
  }

  /** The press ended and was not a tap: everything in hand goes back where it came from. */
  pressEnd(): void {
    if (this.held === 'tub' || this.held === 'piece') releaseHand(this.table)
    this.held = null
  }

  private overCustomer(x: number, y: number): boolean {
    const c = CHARACTERS[this.customer]
    return Math.abs(x - CUSTOMER.x) < c.halfWidth && y < COUNTER_Y && y > CUSTOMER.y - c.height - 40
  }

  /** Where the customer's eyes go: the piece in the air, the piece in the hand, or the pizza. */
  private watched(): { x: number; y: number } {
    const flight = this.table.flights[this.table.flights.length - 1]
    if (flight) return flightAt(flight)
    if (this.table.hand) return this.table.hand
    const last = this.table.pieces[this.table.pieces.length - 1]
    return last ? onPizza(last.x, last.y) : PIZZA
  }

  /** Plays `dt` seconds of game time. */
  step(dt: number): void {
    this.now += dt
    stepTable(this.table, dt)
    stepSpring(this.ovenShake, 0, dt, 240, 10)
    for (const event of this.table.events) {
      if (event.type === 'pop') this.sounds.push(pop)
      else if (event.type === 'plop') {
        this.sounds.push(plop(event.kind, event.count))
        if (!this.director.busy) this.director.trigger('react', this.now)
      } else if (event.type === 'pip') this.sounds.push(pip(event.kind, event.count))
      else if (event.type === 'home') this.sounds.push(home)
      else if (event.type === 'boing') this.sounds.push(boing)
      else this.sounds.push(jiggle)
    }
    this.table.events.length = 0
    const c = CHARACTERS[this.customer]
    const eye = { x: CUSTOMER.x, y: CUSTOMER.y - c.height * 0.8 }
    const look = this.watched()
    this.director.want = Math.min(1, this.table.pieces.length / 4)
    this.director.update(this.now, dt, { x: Math.max(-1, Math.min(1, (look.x - eye.x) / 360)), y: Math.max(-1, Math.min(1, (look.y - eye.y) / 260)) })
  }

  /** What this frame shows, with the idle ladder's glow and its ghost hand. The same object every frame. */
  show(guidance: Guidance): Show {
    const show = this.shown
    show.time = this.now
    show.glow = guidance.glow
    show.ovenShake = this.ovenShake.x
    show.ghost = null
    if (guidance.demo !== null && this.table.tubs.length > 0) {
      // One move a child could make now: a tap on a tub. Never the answer to anything.
      const at = tubAt(this.table, guidance.demoIndex % this.table.tubs.length)
      const pose = handPose(guidance.demo, false, this.hand)
      show.ghost = { x: at.x + 18, y: at.y - 4, press: pose.press, opacity: pose.opacity }
    }
    return show
  }
}
