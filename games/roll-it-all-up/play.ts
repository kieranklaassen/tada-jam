import { FIELD, HALF, HOUSE, ROBIN, THINGS, TREE, type Point, type ThingId } from './layout'
import { aim, hurry, onMan, press, quiet, ready, release, startWalk, step, STEP, type Act, type World } from './world'

// The finger. One finger works at a time; a palm or a second finger is nothing.
// A finger that goes away leaves the ball rolling to where it last was, so a
// lifted drag loses nothing and a tap is a whole move.

type On = Extract<Act, { type: 'press' }>['on']

export function hit(world: World, p: Point): On {
  for (const id of THINGS) {
    const q = world.loose[id]
    if (q && Math.abs(p.x - q.x) < 52 && p.y < q.y + 16 && p.y > q.y - HALF[id] * 2 - 14) return id
  }
  if (onMan(world, p)) return 'man'
  if (p.y >= FIELD.y0 - 56) return 'snow'
  if (p.x > ROBIN.left - 50 && p.x < ROBIN.right + 60 && p.y > ROBIN.y - 130 && p.y < ROBIN.y + 56) return 'robin'
  if (Math.abs(p.x - HOUSE.x) < 120 && p.y > HOUSE.y - 170) return 'house'
  if ((Math.abs(p.x - TREE.x) < 150 && p.y > 230) || (p.x > 1040 && p.y > 330)) return 'tree'
  return 'sky'
}

export class Play {
  readonly world: World
  private id: number | null = null
  private steers = false
  /** Where the working finger is, or last was. */
  at: Point | null = null
  private left = 0
  private from: Point = { x: 0, y: 0 }
  changed = false
  /** The robin's round: seconds into it, or -1. */
  robin = -1
  /** A press that came while there was no ball to send. */
  private waiting = false

  constructor(world: World) { this.world = world }

  get active(): boolean { return this.id !== null }
  holds(id: number): boolean { return this.id === id }

  down(id: number, p: Point): void {
    if (this.id !== null) return
    this.id = id
    this.at = p
    this.from = p
    const w = this.world, on = hit(w, p)
    w.events.push({ type: 'press', on })
    if (on !== 'sky' && on !== 'tree' && on !== 'house') this.robin = -1
    this.steers = false
    if (on === 'robin') { this.showRound(); return }
    if (on !== 'snow' && on !== 'man' && !(on in w.loose)) return
    if (w.walk) { hurry(w); return }
    if (ready(w)) {
      // Only he himself sets off, so that what was touched is what moved.
      if (on === 'man') { startWalk(w); this.changed = true }
      return
    }
    this.steers = true
    this.waiting = !w.ball
    // A touch on a thing means that thing, wherever on it the finger came down.
    const thing = on !== 'snow' && on !== 'man' ? w.loose[on as ThingId] : undefined
    press(w, p)
    if (thing && w.ball) { w.target = { ...thing }; w.forMan = false }
  }
  move(id: number, p: Point): void {
    if (this.id !== id) return
    this.at = p
    if (Math.hypot(p.x - this.from.x, p.y - this.from.y) < 10) return
    this.from = { x: 1e9, y: 0 }
    if (this.steers) aim(this.world, p)
  }
  up(id: number): void {
    if (this.id !== id) return
    this.id = null
    if (this.steers) release(this.world)
  }
  /** The browser or the shell took the finger: the ball stops where it is. */
  clear(): void {
    if (this.id === null) return
    this.id = null
    release(this.world)
    this.world.freed = false
    this.world.target = null
    this.changed = true
  }
  /** The game rests: the touch ends, and whatever was under way is worth a save. */
  rest(): void {
    this.clear()
    if (!quiet(this.world)) this.changed = true
    this.world.target = null
    this.waiting = false
  }
  showRound(): void {
    this.robin = 0
    if (!this.world.shown) { this.world.shown = true; this.changed = true }
  }

  advance(seconds: number): void {
    this.left = Math.min(0.12, this.left + seconds)
    while (this.left >= STEP) {
      this.left -= STEP
      step(this.world)
      for (const e of this.world.events) {
        // Whoever has put a ball on knows the round: the robin's showing is no longer owed.
        // The finger that brought it is done: the next ball wants a new touch.
        if (e.type === 'hop') { this.world.shown = true; this.steers = false }
        if (e.type === 'drop' && this.waiting && this.at) { if (this.steers) press(this.world, this.at); else aim(this.world, this.at); this.waiting = false }
        if (e.type === 'stick' || e.type === 'hop' || e.type === 'land' || e.type === 'drop') this.changed = true
      }
      if (!quiet(this.world)) this.moving = true
      else if (this.moving) { this.moving = false; this.changed = true }
    }
    if (this.robin >= 0) { this.robin += seconds; if (this.robin > ROUND) this.robin = -1 }
  }
  private moving = false
}
/** How long the robin's round lasts. */
export const ROUND = 5.4
