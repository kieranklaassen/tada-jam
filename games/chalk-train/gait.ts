import { along, type Happening, type Route } from './ride'
import type { Pt } from './yard'

// How the engine rides its routes: the pace of each stretch, which way up it
// is, and where its wagons follow. Pure numbers on game time; the view maps
// them onto sprites. The one rule of the toy shows here as pace: chalk is
// smooth and fast, bare tar is slow, and the form of the line is the form of
// the ride.

/** Paces in tar units a second. */
export const PACE = { tar: 150, chalk: 430, run: 740, bend: 300, round: 520 } as const
const GATHER = 900
const BRAKE = 1500
/** While the line is still being drawn, the engine stays this far behind the chalk. */
export const BEHIND_PEN = 46
/** A climb slows the engine by up to this share, and a fall speeds it by as much. */
const SLOPE = 0.42
/** After a corner the engine has lost this share of its pace. */
const CORNER_KEEPS = 0.35
/** With more line waiting, it hurries. */
const HURRY = 1.5

/** Where the engine is and how it stands. `angle` turns a figure drawn facing right; `facing` -1 mirrors it first. */
export type Pose = { x: number; y: number; angle: number; facing: 1 | -1; on: 'chalk' | 'tar'; speed: number; round: boolean }

export type Fired = { what: Happening['what'] | 'arrived' | 'set-off'; pose: Pose }

type Planned = { route: Route; live: boolean; fired: number }

export class Journey {
  private plan: Planned[] = []
  private s = 0
  private pose_: Pose
  /** How far the engine has travelled in all, for wheels and wagons. */
  travelled = 0

  constructor(at: Pt, facing: 1 | -1) {
    this.pose_ = { x: at.x, y: at.y, angle: 0, facing, on: 'chalk', speed: 0, round: false }
  }

  get pose(): Pose { return this.pose_ }
  get moving(): boolean { return this.pose_.speed > 1 }
  /** Whether any line is left to ride, the one still being drawn included. */
  get busy(): boolean { return this.plan.length > 0 }
  /** How far into the line still being drawn the engine has got, or 0. */
  get intoLive(): number { return this.plan.length === 1 && this.plan[0].live ? this.s : 0 }

  /** A finished route joins the end of the plan, in place of the one being drawn if there is one. */
  add(route: Route): void {
    const last = this.plan[this.plan.length - 1]
    if (last?.live) { last.route = route; last.live = false } else if (route.length > 0) this.plan.push({ route, live: false, fired: 0 })
  }

  /** The route of the line still being drawn, made again as the line grows; `null` drops it. */
  setLive(route: Route | null): void {
    const last = this.plan[this.plan.length - 1]
    if (last?.live) {
      if (route) last.route = route
      else this.plan.pop()
    } else if (route) this.plan.push({ route, live: true, fired: 0 })
    if (this.plan.length === 0) this.s = 0
  }

  /** Starts again from where the engine stands: whatever was planned is dropped. */
  rebase(): void {
    this.plan = []
    this.s = 0
  }

  /** Plays `dt` seconds. `mayEnterLive` is false while the engine holds back from the line being drawn. */
  step(dt: number, mayEnterLive = true): Fired[] {
    const fired: Fired[] = []
    const now = this.plan[0]
    if (!now || (now.live && !mayEnterLive && this.s === 0)) {
      this.pose_.speed = Math.max(0, this.pose_.speed - BRAKE * dt)
      return fired
    }
    const route = now.route, end = Math.max(0, now.live ? route.length - BEHIND_PEN : route.length)
    const here = along(route, this.s), ahead = along(route, Math.min(route.length, this.s + 60))
    const round = route.rounds.some((r) => this.s >= r.from && this.s <= r.to)
    // The pace this stretch asks for.
    const turn = Math.abs(Math.atan2(here.tx * ahead.ty - here.ty * ahead.tx, here.tx * ahead.tx + here.ty * ahead.ty))
    let want: number = here.on === 'tar' ? PACE.tar : turn < 0.1 ? PACE.run : Math.max(PACE.bend, PACE.chalk - turn * 220)
    if (here.on === 'chalk') want *= 1 + SLOPE * here.ty
    if (round) want = Math.max(want, PACE.round)
    if (this.plan.length > 1) want *= HURRY
    // It never arrives faster than it can stop, except onto more line.
    const left = end - this.s
    if (this.plan.length === 1) want = Math.min(want, Math.sqrt(2 * BRAKE * Math.max(0, left)) + 20)
    const was = this.pose_.speed
    let speed = was < want ? Math.min(want, was + GATHER * dt) : Math.max(want, was - BRAKE * dt)
    if (was <= 1 && speed > 1 && left > 1) fired.push({ what: 'set-off', pose: this.pose_ })
    const step = Math.min(Math.max(0, left), speed * dt)
    this.s += step
    this.travelled += step
    for (; now.fired < route.happenings.length && route.happenings[now.fired].at <= this.s; now.fired++) {
      const what = route.happenings[now.fired].what
      if (what === 'corner') speed *= CORNER_KEEPS
      fired.push({ what, pose: this.pose_ })
    }
    const spot = along(route, this.s)
    // Which way up: inside a round the engine keeps its facing and goes right over; outside it turns to stay upright.
    let facing = this.pose_.facing
    if (!round && Math.abs(spot.tx) > 0.25) facing = spot.tx > 0 ? 1 : -1
    const angle = facing === 1 ? Math.atan2(spot.ty, spot.tx) : Math.atan2(-spot.ty, -spot.tx)
    this.pose_ = { x: spot.x, y: spot.y, angle, facing, on: spot.on, speed: left <= 0.01 ? 0 : speed, round }
    if (this.s >= route.length - 0.01 && !now.live) {
      this.plan.shift()
      this.s = 0
      if (this.plan.length === 0) {
        this.pose_.speed = 0
        fired.push({ what: 'arrived', pose: this.pose_ })
      }
    }
    return fired
  }
}

/** The way the engine came, so that its wagons can follow in its tracks, each standing as the engine stood there. */
export class Trail {
  private points: (Pose & { d: number })[] = []
  private keep: number

  constructor(start: Pose, keep = 700) {
    this.keep = keep
    // Before it has moved, the way it came is a straight line behind it.
    for (let d = keep; d >= 0; d -= 20) this.points.push({ ...start, x: start.x - start.facing * d, d: -d })
  }

  /** Notes where the engine is, having travelled `travelled` in all. */
  note(pose: Pose, travelled: number): void {
    const last = this.points[this.points.length - 1]
    if (travelled - last.d < 4) return
    this.points.push({ ...pose, d: travelled })
    while (this.points.length > 2 && this.points[1].d < travelled - this.keep) this.points.shift()
  }

  /** Where the engine was, `back` behind where it is now. */
  behind(back: number): Pose {
    const points = this.points, want = points[points.length - 1].d - back
    for (let i = points.length - 1; i > 0; i--) {
      const a = points[i - 1], b = points[i]
      if (a.d <= want) {
        const t = b.d === a.d ? 0 : (want - a.d) / (b.d - a.d)
        let turn = b.angle - a.angle
        while (turn > Math.PI) turn -= Math.PI * 2
        while (turn < -Math.PI) turn += Math.PI * 2
        return { ...b, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: a.angle + turn * t, facing: t < 0.5 ? a.facing : b.facing }
      }
    }
    return points[0]
  }
}
