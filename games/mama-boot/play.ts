import { IdleLadder, type Guidance } from './guidance'
import { inCorner } from './overlay'
import { fit, toStage } from './stage'
import type { Target, Yard } from './yard'

// The Mount's path with no browser in it: fingers land, move, lift and are
// taken away here by their ids and surface pixels, and the yard plays its time
// here. The Mount passes pointer events in; a test does the same.
// - One finger works at a time. A finger that has lain still for a second, or
//   that landed where nothing is, hands the work to the next one that lands.
//   A finger that is carrying is never interrupted.
// - A second finger takes nothing and gets a small answer of its own.
// - A carry survives a short lift: a finger that lands near in that time
//   carries on. After it, the thing is let go where it hung.
// - A slipped tap is a tap: a finger that went a little way and came up soon.
// - A finger taken away is not a let-go: what it carried goes back.

/** Surface pixels a finger may slip and still be tapping. */
export const TAP_SLOP = 16
/** A carry this short, in pixels and seconds, was a smeared tap. */
export const SMEAR_PX = 34
export const SMEAR_S = 0.32
export const LIFT_GRACE_S = 0.3
export const REGRAB_PX = 140
export const REST_S = 1
/** A hand that lies still this long on a thing it has slid along lets go of it for the next finger. */
export const DEAD_S = 4

type Work = { id: number | null; x: number; y: number; x0: number; y0: number; landed: number; target: Target; moved: boolean; carrying: boolean; lifted: number; still: number }

export class Play {
  width = 0
  height = 0
  private time = 0
  private work: Work | null = null
  readonly ladder = new IdleLadder(0)
  private lastTouch = 0

  constructor(readonly yard: Yard) {}

  size(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  get active(): boolean {
    return this.work !== null
  }

  /** Whether that pointer is the one at work. */
  holds(id: number): boolean {
    return this.work?.id === id
  }

  private stage(x: number, y: number): { x: number; y: number } {
    return toStage({ x, y }, fit(this.width, this.height))
  }

  private touched(): void {
    this.ladder.touch(this.time)
    this.lastTouch = this.time
  }

  down(id: number, x: number, y: number): void {
    if (this.width <= 0 || this.height <= 0) return
    this.touched()
    // The grown-up's corner is answered and holds nothing.
    if (inCorner(x, y, this.width)) { if (this.work) this.yard.dab(this.stage(x, y)); else this.yard.pat(this.stage(x, y)); return }
    const work = this.work
    if (work && work.id === null) {
      if (Math.hypot(x - work.x, y - work.y) <= REGRAB_PX) {
        work.id = id
        work.still = this.time
        this.yard.waiting = false
        work.x = x
        work.y = y
        this.yard.move(this.stage(x, y))
        return
      }
      this.letGo()
    } else if (work) {
      const rests = this.time - work.still
      const idle = work.carrying ? rests >= DEAD_S : work.target.kind === 'ground' || rests >= REST_S
      if (!idle) { this.yard.dab(this.stage(x, y)); return }
      if (work.carrying) this.letGo()
    }
    const p = this.stage(x, y)
    const target = this.yard.at(p)
    this.work = { id, x, y, x0: x, y0: y, landed: this.time, target, moved: false, carrying: false, lifted: 0, still: this.time }
    this.yard.press(target, p)
  }

  move(id: number, x: number, y: number): void {
    const work = this.work
    if (!work || work.id !== id) return
    if (Math.hypot(x - work.x, y - work.y) > 3) work.still = this.time
    work.x = x
    work.y = y
    this.touched()
    if (!work.moved) {
      if (Math.hypot(x - work.x0, y - work.y0) <= TAP_SLOP) return
      work.moved = true
      work.carrying = this.yard.take(work.target, this.stage(x, y))
    }
    if (work.carrying) this.yard.move(this.stage(x, y))
    else { const p = this.stage(x, y); this.yard.finger = p; if (work.target.kind === 'puddle') this.yard.crease(p) }
  }

  up(id: number, x: number, y: number): void {
    const work = this.work
    if (!work || work.id !== id) return
    this.touched()
    if (!work.carrying) {
      this.work = null
      this.yard.finger = null
      const slipped = Math.hypot(x - work.x0, y - work.y0)
      if (!work.moved || (slipped < SMEAR_PX && this.time - work.landed < SMEAR_S)) this.yard.tap(work.target)
      return
    }
    if (Math.hypot(x - work.x0, y - work.y0) < SMEAR_PX && this.time - work.landed < SMEAR_S) {
      this.work = null
      this.yard.cancel()
      this.yard.tap(work.target)
      return
    }
    work.id = null
    work.x = x
    work.y = y
    work.lifted = this.time
    this.yard.waiting = true
    this.yard.move(this.stage(x, y))
  }

  cancel(id: number): void {
    if (this.work?.id !== id) return
    this.work = null
    this.yard.cancel()
  }

  private letGo(): void {
    this.work = null
    this.yard.waiting = false
    this.yard.drop()
    this.yard.finger = null
  }

  /** Plays `dt` seconds and returns what the idle ladder shows now. */
  step(dt: number): Guidance {
    this.time += dt
    if (this.work && this.work.id === null && this.time - this.work.lifted > LIFT_GRACE_S) this.letGo()
    if (this.work?.carrying) this.touched()
    this.yard.knocking = this.time - this.lastTouch < 92
    this.yard.step(dt)
    if (this.yard.brood.some((c) => c.opening !== null || c.tucking !== null || c.laying !== null) || this.yard.gag) this.ladder.touch(this.time)
    return this.ladder.update(this.time)
  }

  /** Put away: a carry the finger had let go of lands where it hung, anything still under a finger goes back, and the yard is as a load would find it. */
  park(): void {
    if (this.work && this.work.id === null) this.letGo()
    this.work = null
    this.yard.waiting = false
    this.yard.settle()
    this.touched()
  }
}
