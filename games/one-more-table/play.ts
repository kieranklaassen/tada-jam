import { IdleLadder, type Guidance } from './guidance'
import { inCorner } from './overlay'
import { fit, toStage, type Point } from './stage'
import type { Table, Target } from './table'

// The Mount's path with no browser in it: fingers land, move, lift and are
// taken away here by their ids and surface pixels, and the table plays its
// time here. The Mount passes pointer events in; a test does the same.
// - One finger works at a time. A finger that has lain still for a second, or
//   that landed where nothing is, hands the work to the next that lands.
// - A second finger takes nothing and leaves a brush flower.
// - A carry survives a short lift. The knob does not: letting it go is the act.
// - A slipped tap is a tap. A finger taken away is not a let-go.

export const TAP_SLOP = 14
export const SMEAR_PX = 30
export const SMEAR_S = 0.3
export const LIFT_GRACE_S = 0.3
export const REGRAB_PX = 130
export const REST_S = 1
export const DEAD_S = 4

type Work = { id: number | null; x: number; y: number; x0: number; y0: number; landed: number; target: Target; moved: boolean; carrying: boolean; lifted: number; still: number }

export class Play {
  width = 0
  height = 0
  private time = 0
  private work: Work | null = null
  private last = 0
  readonly ladder = new IdleLadder(0)

  constructor(readonly table: Table) {}

  size(width: number, height: number): void {
    this.width = width
    this.height = height
  }
  get active(): boolean {
    return this.work !== null
  }
  private touched(): void {
    this.last = this.time
    this.ladder.touch(this.time)
  }
  holds(id: number): boolean {
    return this.work?.id === id
  }
  private stage(x: number, y: number): Point {
    return toStage({ x, y }, fit(this.width, this.height))
  }

  down(id: number, x: number, y: number): void {
    if (this.width <= 0 || this.height <= 0) return
    this.touched()
    if (inCorner(x, y, this.width)) { this.table.dab(this.stage(x, y)); return }
    const work = this.work
    if (work && work.id === null) {
      if (Math.hypot(x - work.x, y - work.y) <= REGRAB_PX) {
        work.id = id
        work.x = x
        work.y = y
        work.still = this.time
        this.table.waiting = false
        this.table.move(this.stage(x, y))
        return
      }
      this.letGo()
    } else if (work) {
      const rests = this.time - work.still
      const idle = work.carrying ? rests >= DEAD_S : work.target.kind === 'ground' || rests >= REST_S
      if (!idle) { this.table.dab(this.stage(x, y)); return }
      if (work.carrying) { this.work = null; this.table.cancel() }
      else this.table.release()
    }
    const p = this.stage(x, y)
    this.table.endShows()
    const target = this.table.at(p)
    this.work = { id, x, y, x0: x, y0: y, landed: this.time, target, moved: false, carrying: false, lifted: 0, still: this.time }
    this.table.lastX = p.x
    this.table.lastY = p.y
    this.table.press(target, p)
  }

  move(id: number, x: number, y: number): void {
    const work = this.work
    if (!work || work.id !== id) return
    if (Math.hypot(x - work.x, y - work.y) > 3) work.still = this.time
    work.x = x
    work.y = y
    this.touched()
    const p = this.stage(x, y)
    this.table.lastX = p.x
    this.table.lastY = p.y
    if (!work.moved) {
      if (Math.hypot(x - work.x0, y - work.y0) <= TAP_SLOP) return
      work.moved = true
      // Taken where it was touched, so nothing jumps by the slop.
      work.carrying = this.table.take(work.target, this.stage(work.x0, work.y0))
    }
    if (work.carrying) this.table.move(p)
  }

  up(id: number, x: number, y: number): void {
    const work = this.work
    if (!work || work.id !== id) return
    this.touched()
    const slipped = Math.hypot(x - work.x0, y - work.y0)
    if (!work.carrying) {
      this.work = null
      if (!work.moved || (slipped < SMEAR_PX && this.time - work.landed < SMEAR_S)) this.table.tap(work.target)
      else this.table.release()
      return
    }
    if (slipped < SMEAR_PX && this.time - work.landed < SMEAR_S) {
      this.work = null
      this.table.cancel()
      this.table.tap(work.target)
      return
    }
    this.table.move(this.stage(x, y))
    if (work.target.kind === 'knob' || work.target.kind === 'bell') { this.letGo(); return }
    work.id = null
    work.x = x
    work.y = y
    work.lifted = this.time
    this.table.waiting = true
  }

  cancel(id: number): void {
    if (this.work?.id !== id) return
    const { carrying } = this.work
    this.work = null
    if (carrying) this.table.cancel()
    else this.table.release()
  }

  private letGo(): void {
    this.work = null
    this.table.waiting = false
    this.table.drop()
  }

  step(dt: number): Guidance {
    this.time += dt
    if (this.work && this.work.id === null && this.time - this.work.lifted > LIFT_GRACE_S) this.letGo()
    if (this.work && this.work.target.kind !== 'ground') this.touched()
    this.table.idle = this.time - this.last
    this.table.asking = this.table.idle < 58
    this.table.step(dt)
    if (this.table.busy) this.touched()
    return this.ladder.update(this.time)
  }

  /** Put away: a carry the finger had let go of lands where it hung, anything still under a finger goes back. */
  park(): void {
    if (this.work && this.work.id === null) this.letGo()
    this.work = null
    this.table.waiting = false
    this.table.settle()
    this.touched()
  }
}
