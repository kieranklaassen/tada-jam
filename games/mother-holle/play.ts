import { HALF_H, HALF_W } from './layout'
import { IdleLadder, type Guidance } from './guidance'
import { inCorner } from './overlay'
import type { Target, Village } from './village'

// The Mount's path with no browser in it: fingers land, move, lift and are
// taken away here by their ids and surface pixels, and the village plays its
// time here. The Mount passes pointer events in; a test does the same.
// - One finger works at a time. A second one takes nothing from it, and gives
//   the quilt a small shake of its own.
// - A finger that lies still for a second hands the work to the next one.
// - A carry survives a short lift.
// - A finger taken away is not a let-go: what it carried goes back.

export const TAP_SLOP = 16
export const LIFT_GRACE_S = 0.3
export const REGRAB_PX = 140
export const REST_S = 1

export type Point = { x: number; y: number }
/** How the village sits in a surface: pixels for one unit. What is always in view fits whole; the rest of the surface shows more of the land. */
export const scaleOf = (w: number, h: number): number => Math.min(w / (HALF_W * 2), h / (HALF_H * 2))

type Work = { id: number | null; x: number; y: number; x0: number; y0: number; target: Target; moved: boolean; carrying: boolean; lifted: number; still: number }

export class Play {
  width = 0
  height = 0
  private time = 0
  private work: Work | null = null
  readonly ladder = new IdleLadder(0)

  constructor(readonly village: Village) {}

  size(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  holds(id: number): boolean {
    return this.work?.id === id
  }

  toWorld(x: number, y: number): Point {
    const s = scaleOf(this.width, this.height)
    return { x: (x - this.width / 2) / s, y: -(y - this.height / 2) / s }
  }

  down(id: number, x: number, y: number): void {
    if (this.width <= 0 || this.height <= 0) return
    this.ladder.touch(this.time)
    const p = this.toWorld(x, y)
    const work = this.work
    if (work && work.id === null) {
      if (Math.hypot(x - work.x, y - work.y) <= REGRAB_PX) {
        work.id = id
        work.still = this.time
        this.village.waiting = false
        this.village.carry(p)
        return
      }
      this.letGo()
    } else if (work) {
      if (work.carrying || this.time - work.still < REST_S) {
        // A small answer of its own, for whoever it lands on.
        const on = this.village.at(p)
        if (on.kind === 'body') this.village.poke(on.id)
        else if (!inCorner(x, y, this.width)) this.village.nudge()
        return
      }
      this.village.letGoQuilt()
    }
    const target: Target = inCorner(x, y, this.width) ? { kind: 'quilt' } : this.village.at(p)
    this.work = { id, x, y, x0: x, y0: y, target, moved: false, carrying: false, lifted: 0, still: this.time }
    this.village.press(target, p)
  }

  move(id: number, x: number, y: number): void {
    const work = this.work
    if (!work || work.id !== id) return
    if (Math.hypot(x - work.x, y - work.y) > 3) work.still = this.time
    work.x = x
    work.y = y
    this.ladder.touch(this.time)
    const p = this.toWorld(x, y)
    if (!work.moved) {
      if (work.target.kind === 'quilt') work.moved = true
      else if (Math.hypot(x - work.x0, y - work.y0) <= TAP_SLOP) return
      else {
        work.moved = true
        if (work.target.kind === 'body') work.carrying = this.village.lift(work.target.id, p)
        // The sun has answered; a finger that wobbles on it does not undo that.
        if (work.target.kind === 'sun') return
        // Not to be had (it hops): the finger is a shake from here.
        if (!work.carrying) { work.target = { kind: 'quilt' }; this.village.grab(p) }
      }
    }
    if (work.carrying) this.village.carry(p)
    else this.village.drag(p)
  }

  up(id: number, x: number, y: number): void {
    const work = this.work
    if (!work || work.id !== id) return
    this.ladder.touch(this.time)
    if (work.carrying) {
      work.id = null
      work.x = x
      work.y = y
      work.lifted = this.time
      this.village.waiting = true
      return
    }
    this.work = null
    if (work.target.kind === 'quilt') this.village.letGoQuilt()
    else if (!work.moved) this.village.tap(work.target)
  }

  cancel(id: number): void {
    if (this.work?.id !== id) return
    this.work = null
    this.village.cancel()
  }

  private letGo(): void {
    this.work = null
    this.village.waiting = false
    this.village.drop()
  }

  step(dt: number): Guidance {
    this.time += dt
    const work = this.work
    if (work && work.id === null && this.time - work.lifted > LIFT_GRACE_S) this.letGo()
    if (work?.carrying) this.ladder.touch(this.time)
    this.village.step(dt)
    // While something the child set off is still going, nothing is shown.
    if (this.village.busy) this.ladder.touch(this.time)
    return this.ladder.update(this.time)
  }

  park(): void {
    if (this.work && this.work.id === null) this.letGo()
    this.work = null
    this.village.waiting = false
    this.village.settle()
    this.ladder.touch(this.time)
  }
}
