// The hose: what the finger does, turned into gulps of water. Numbers only, no
// renderer and no DOM. It is the toy of the game (ART.md, "The toy"):
// - a tap is one gulp, which leaves the nozzle in the step the finger lands;
// - a held finger is a stream, one gulp about every third of a second, and the
//   landing point trails the finger a little, like a real hose;
// - a lifted finger loses nothing: water in the air still lands;
// - a stream taken up again soon is the same watering.
// Times are the attended clock's seconds, so nothing here runs while the game
// rests.

import { COLS, ROWS } from './ground'
import { arcTo, type Arc, type Ground2 } from './jet'
import { NOZZLE } from './layout'
import { follow } from './springs'

/** A stream gives one gulp this often. */
export const GULP_EVERY_S = 1 / 3
/** How far behind the finger the landing point trails, as a time. */
export const AIM_LAG_S = 0.09
/** A stream that stops for no longer than this and starts again is the same watering. */
export const SAME_WATERING_S = 1.2
/** Water lands no nearer the edge of the yard than this. */
export const EDGE = 0.25

export type Gulp = {
  /** Counts up from 1 within a mount, so the view can tell gulps apart. It is never shown and never saved. */
  id: number
  arc: Arc
  launchedAt: number
  landsAt: number
  /** The first gulp of a touch: a tap, or the start of a stream. */
  first: boolean
}

export type HoseStep = {
  /** Gulps of a stream that left the nozzle in this step. The first gulp of a touch is not among them: `press` returns it, in the frame the finger lands. */
  launched: Gulp[]
  /** Gulps that reached the ground in this step, oldest first. */
  landed: Gulp[]
  /** The watering is over: the stream stopped and stayed stopped. True in one step only. */
  rested: boolean
}

/** A point of the screen can be anywhere. Water lands inside the yard, at its nearest point. */
export function intoYard(point: Ground2): Ground2 {
  const x = Number.isFinite(point.x) ? point.x : COLS / 2
  const z = Number.isFinite(point.z) ? point.z : ROWS / 2
  return { x: Math.min(COLS - EDGE, Math.max(EDGE, x)), z: Math.min(ROWS - EDGE, Math.max(EDGE, z)) }
}

export class Hose {
  /** The finger is down and water is leaving. */
  holding = false
  /** Where the finger is, in the yard. */
  readonly target: Ground2 = { x: COLS / 2, z: ROWS / 2 }
  /** Where the water is being sent: it trails the finger. */
  readonly aim: Ground2 = { x: COLS / 2, z: ROWS / 2 }
  /** How fast the landing point is moving, in yard units a second: a sweep is fast, a soak is still. */
  aimSpeed = 0
  /** Gulps in the air, oldest first. */
  readonly flying: Gulp[] = []
  private nextId = 1
  private nextGulpAt = 0
  private lastLaunchAt = -Infinity
  private watering = false

  /** The finger lands: the nozzle is on it at once and the first gulp leaves now. */
  press(point: Ground2, now: number): Gulp {
    const at = intoYard(point)
    this.target.x = this.aim.x = at.x
    this.target.z = this.aim.z = at.z
    this.aimSpeed = 0
    this.holding = true
    return this.launch(now, true)
  }

  /** The finger moves: the water follows it. */
  move(point: Ground2): void {
    if (!this.holding) return
    const at = intoYard(point)
    this.target.x = at.x
    this.target.z = at.z
  }

  /** The finger lifts. Water already in the air still lands. */
  lift(): void {
    this.holding = false
  }

  /** One frame of `seconds`, ending at `now`. */
  step(now: number, seconds: number): HoseStep {
    const launched: Gulp[] = []
    if (this.holding && seconds > 0) {
      const x = follow(this.aim.x, this.target.x, AIM_LAG_S, seconds)
      const z = follow(this.aim.z, this.target.z, AIM_LAG_S, seconds)
      this.aimSpeed = Math.hypot(x - this.aim.x, z - this.aim.z) / seconds
      this.aim.x = x
      this.aim.z = z
      // A frame is never long enough for two, but a slow one must not lose a gulp.
      while (now >= this.nextGulpAt) launched.push(this.launch(this.nextGulpAt, false))
    }
    const landed: Gulp[] = []
    while (this.flying.length > 0 && this.flying[0].landsAt <= now) landed.push(this.flying.shift()!)
    let rested = false
    if (this.watering && !this.holding && this.flying.length === 0 && now - this.lastLaunchAt > SAME_WATERING_S) {
      this.watering = false
      rested = true
    }
    return { launched, landed, rested }
  }

  /** The game goes to rest under the finger: the stream stops, and what was in the air lands at once so nothing is lost. */
  clear(): Gulp[] {
    this.holding = false
    return this.flying.splice(0)
  }

  private launch(at: number, first: boolean): Gulp {
    const arc = arcTo(NOZZLE, this.aim)
    const gulp: Gulp = { id: this.nextId++, arc, launchedAt: at, landsAt: at + arc.seconds, first }
    // Flights differ in length, so a later gulp to a near place can land before an earlier one to a far place.
    let index = this.flying.length
    while (index > 0 && this.flying[index - 1].landsAt > gulp.landsAt) index--
    this.flying.splice(index, 0, gulp)
    this.nextGulpAt = at + GULP_EVERY_S
    this.lastLaunchAt = at
    this.watering = true
    return gulp
  }
}
