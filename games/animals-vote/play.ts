import { ForgivingTouch, type Gesture, type Point } from './input'
import { dropAt, targetAt, type Standing, type Target } from './layout'
import type { Animal, Snack } from './things'
import { bait, feed, hasTools, here, hide, onGround, putOn, ring, snackHome, tapAnimal, tapSnack, toGround, turn, sweep, type Event, type Result, type Town } from './town'

// The Mount's path with no browser in it: fingers land, move, lift and are
// taken away here, in stage units. The Mount and the tests make the same calls.
// - Everything answers as the finger lands, and does what it does on the lift,
//   so a tap that slips is still a tap.
// - The rules are done with a bell ring at once. What is then shown takes its
//   time, and a touch ends it and does nothing more.
// - A finger that is taken away puts back what it carried.

export type Held = { kind: 'animal'; who: Animal } | { kind: 'snack'; snack: Snack }
export type Poke = { target: Target; at: Point }
/** A cue of what is being shown, for the view and the voices. */
export type Cue = { type: 'rush' } | { type: 'row'; row: number; cols: number[] } | { type: 'tall'; cols: number[] } | { type: 'result' } | { type: 'turnOf'; who: Animal; n: number } | { type: 'met' } | { type: 'end' } | { type: 'ring' } | { type: 'mole'; snack: Snack } | { type: 'back'; held: Held }

export const REST_MS = 1000
export const SLIP = 56
export const RUSH = 0.9
export const ROW = 0.5
export const TALL = 0.7
export const RESULT = 5.5
/** When in the result the mole's picture turns, and the coats are on. */
export const MET_AT = 3.6
export const COATED_AT = 1.2

export class Show {
  t = 0
  readonly rows: number
  readonly start: number
  readonly tallAt: number
  readonly resultAt: number
  readonly end: number
  readonly heights: number[]
  constructor(readonly result: Result, columns: readonly (readonly Animal[])[], readonly everyone: readonly Animal[]) {
    this.heights = columns.map((c) => c.length)
    this.rows = Math.max(...this.heights)
    this.start = result.ran.length ? RUSH : 0.25
    this.tallAt = this.start + this.rows * ROW
    this.resultAt = this.tallAt + TALL
    this.end = this.resultAt + RESULT
  }
  get into(): number { return this.t - this.resultAt }
  get coated(): boolean { return this.into >= COATED_AT }
}

export class Play {
  readonly touch = new ForgivingTouch()
  show: Show | null = null
  held: Held | null = null
  hand: Point | null = null
  pokes: Poke[] = []
  events: Event[] = []
  cues: Cue[] = []
  changed = false
  /** The last bell did not bring what the mole would like. */
  unmet = false
  private pressed: Target | null = null
  private slid: Target | null = null
  /** This touch ended a scene, or grew from one that did. */
  private spent = false
  private landed = { id: -1, at: { x: 0, y: 0 }, t: 0, dragging: false }

  constructor(readonly town: Town) {}

  /** Where things stand as a finger meets them. */
  standing(): Standing {
    const t = this.town, out = t.finished
    return { ground: out ? here(t) : onGround(t), columns: out ? [[], [], []] : t.columns, hidden: out ? null : t.hidden, snacks: t.snacks, tools: hasTools(t) }
  }

  down(id: number, at: Point, t: number): void {
    const rest = this.landed
    const idle = !this.held && (t - rest.t > REST_MS || rest.dragging || this.pressed?.kind === 'square')
    if (this.touch.active && this.touch.holds(rest.id) && rest.id !== id && idle) this.act(this.touch.cancel(rest.id))
    if (this.touch.active && this.touch.holds(rest.id)) {
      this.pokes.push({ target: { kind: 'square' }, at })
      return
    }
    this.landed = { id, at, t, dragging: false }
    this.act(this.touch.down(id, at, t))
  }
  move(id: number, at: Point): void { this.act(this.touch.move(id, at)) }
  up(id: number, at: Point, t: number): void { this.act(this.touch.up(id, at, t)) }
  cancel(id: number): void { this.act(this.touch.cancel(id)) }
  clear(): void { this.act(this.touch.clear()) }

  advance(seconds: number, t: number): void {
    this.act(this.touch.advance(t))
    const s = this.show
    if (!s) return
    const was = s.t
    s.t += seconds
    const passed = (at: number) => was < at && s.t >= at
    for (let row = 0; row < s.rows; row++) if (passed(s.start + row * ROW)) this.cues.push({ type: 'row', row, cols: [0, 1, 2].filter((c) => s.heights[c] > row) })
    if (passed(s.tallAt)) this.cues.push({ type: 'tall', cols: [0, 1, 2].filter((c) => s.heights[c] === s.rows) })
    if (passed(s.resultAt)) this.cues.push({ type: 'result' })
    for (let n = 0; n < TURNS; n++) if (passed(s.resultAt + 0.5 + n * TURN)) this.cues.push({ type: 'turnOf', who: s.everyone[n % s.everyone.length], n })
    if (s.result.met && passed(s.resultAt + MET_AT)) this.cues.push({ type: 'met' })
    if (s.t >= s.end) this.finish()
  }

  private finish(): void {
    if (!this.show) return
    this.show = null
    this.cues.push({ type: 'end' })
  }

  private act(gestures: Gesture[]): void {
    for (const g of gestures) {
      switch (g.type) {
        case 'press': {
          const target = targetAt(g.at, this.standing())
          this.pokes.push({ target, at: g.at })
          this.spent = this.show !== null
          this.finish()
          this.pressed = target
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
          const p = this.pressed
          if (!this.spent && p?.kind === 'animal') this.held = { kind: 'animal', who: p.who }
          else if (!this.spent && p?.kind === 'snack') this.held = { kind: 'snack', snack: p.snack }
          this.hand = this.held ? g.from : null
          this.slid = this.held ? null : p
          this.pressed = null
          break
        }
        case 'dragMove':
          if (this.held) this.hand = g.at
          break
        case 'dragLift':
          break
        case 'dragEnd':
          this.letGo(g.at)
          break
        case 'dragCancel':
          if (this.held) this.cues.push({ type: 'back', held: this.held })
          this.held = this.hand = this.slid = null
          break
        default:
          g satisfies never
      }
    }
  }

  private tell(events: Event[]): void {
    this.events.push(...events)
    this.changed = true
  }

  private bell(): void {
    const { events, result } = ring(this.town)
    this.cues.push({ type: 'ring' })
    if (result) {
      this.unmet = !result.met
      this.show = new Show(result, this.town.columns, here(this.town))
      if (result.ran.length) this.cues.push({ type: 'rush' })
    }
    this.tell(events)
  }

  private tap(): void {
    const p = this.pressed
    if (!p || this.spent) return
    switch (p.kind) {
      case 'animal': return this.tell(tapAnimal(this.town, p.who))
      case 'snack': return this.tell(tapSnack(this.town, p.snack))
      case 'plaque': return this.tell(turn(this.town, p.slot))
      case 'bell': return this.bell()
      case 'mole': return this.town.finished ? this.tell(sweep(this.town)) : undefined
      case 'basket': case 'column': case 'square': return
      default: p satisfies never
    }
  }

  private letGo(at: Point): void {
    const held = this.held, near = Math.hypot(at.x - this.landed.at.x, at.y - this.landed.at.y) < SLIP
    this.held = this.hand = null
    if (!held || near) {
      this.pressed = held ? (held.kind === 'animal' ? { kind: 'animal', who: held.who } : { kind: 'snack', snack: held.snack }) : near ? this.slid : null
      this.slid = null
      this.tap()
      this.pressed = null
      return
    }
    const on = dropAt(at, this.standing()), town = this.town
    if (held.kind === 'animal') {
      if (on.kind === 'column') this.tell(putOn(town, held.who, on.col))
      else if (on.kind === 'basket' && hasTools(town)) this.tell(hide(town, held.who))
      else this.tell(toGround(town, held.who))
      return
    }
    if (on.kind === 'column') this.tell(bait(town, held.snack, on.col))
    else if (on.kind === 'animal') this.tell(feed(town, held.snack, on.who))
    else {
      if (on.kind === 'mole' || on.kind === 'bell') this.cues.push({ type: 'mole', snack: held.snack })
      this.tell(snackHome(town, held.snack))
    }
  }
}
/** Each animal is heard in turn while the result lasts. */
export const TURN = 0.42
const TURNS = 11
