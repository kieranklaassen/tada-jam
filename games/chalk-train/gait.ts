import { along, routeTo, type Happening, type Route, cut } from './ride'
import type { Pt } from './yard'

// How the engine rides its routes: the pace of each stretch, which way up it
// is, and where its wagons follow. Pure numbers on game time; the view maps
// them onto sprites. The one rule of the toy shows here as pace: chalk is
// smooth and fast, bare tar is slow, and the form of the line is the form of
// the ride.

/** Paces in tar units a second. */
export const PACE = { tar: 230, chalk: 430, run: 740, bend: 300, round: 520, squeeze: 240 } as const
const GATHER = 900
const BRAKE = 1500
/** While the line is still being drawn, the engine stays this far behind the chalk. */
export const BEHIND_PEN = 46
/** A climb slows the engine by up to this share, and a fall speeds it by as much. */
const SLOPE = 0.42
/** After a corner the engine has lost this share of its pace. */
const CORNER_KEEPS = 0.35
/** With more line waiting, it hurries: this much faster for each route that waits, up to a limit. */
const HURRY = 0.5
const HURRY_MOST = 2.5
/** No more routes than this wait at once. Past it the engine leaves out the middle ones and cuts across to the newest. */
export const PLAN_MOST = 4

/** Where the engine is and how it stands. `angle` turns a figure drawn facing right; `facing` -1 mirrors it first. */
export type Pose = { x: number; y: number; angle: number; facing: 1 | -1; on: 'chalk' | 'tar'; speed: number; round: boolean }

/** Something the toy wants to be told when the engine gets a distance along a route: who boards there, who gets home. */
export type Telling = { at: number }

/**
 * `done` is the end of one route of the plan, and `arrived` the end of the
 * last. `told` hands back a telling the engine has reached.
 */
export type Fired = { what: Happening['what'] | 'arrived' | 'set-off' | 'done' | 'told'; pose: Pose; live: boolean; told?: Telling; late?: boolean }

/** Something that has happened or been told on a route, by what it was and how far along. */
type Seen = { key: string; at: number }
type Planned = { route: Route; live: boolean; fired: number; tells: readonly Telling[]; told: number; seen?: Seen[]; late?: Fired[] }

/** Two happenings of one kind this near each other along a line are the same one, read again as the line grew. */
const SAME_WITHIN = 36
const tellKey = (t: Telling): string => JSON.stringify(t, (k, v) => (k === 'at' ? undefined : (v as unknown)))

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

  /** How many routes are still planned, the one the engine is on included. A route is no longer planned from the step in which the engine reaches its end. */
  get queued(): number { return this.plan.length }

  /** Whether the route the engine is on is the line still being drawn. */
  get frontLive(): boolean { return this.plan.length > 0 && this.plan[0].live }

  /** The tellings of the plan that the engine has not reached yet, in order. */
  get waiting(): Telling[] { return this.plan.flatMap((p) => p.tells.slice(p.told)) }

  /**
   * Gives a planned route its tellings, and reads its happenings again. A
   * line is read again as it grows, and what it is can change behind the
   * engine: a loop is a loop only once the line has crossed itself, and a
   * straight run is a fast one only once it is long. So whatever lies behind
   * the engine and has not happened yet happens now, late, and nothing that
   * has happened happens twice.
   */
  private tell(planned: Planned, tells: readonly Telling[]): void {
    const past = planned === this.plan[0] ? this.s : -1
    const seen = (planned.seen ??= []), late = (planned.late ??= [])
    const was = (key: string, at: number): boolean => seen.some((one) => one.key === key && Math.abs(one.at - at) <= SAME_WITHIN)
    planned.tells = tells
    planned.told = tells.filter((t) => t.at <= past).length
    planned.fired = planned.route.happenings.filter((h) => h.at <= past).length
    for (const h of planned.route.happenings) {
      if (h.at >= past || was(h.what, h.at)) continue
      seen.push({ key: h.what, at: h.at })
      late.push({ what: h.what, pose: this.pose_, live: planned.live, late: true })
    }
    for (const t of tells) {
      // What is told at the very start of a line is told at once, though the engine has not moved along it yet.
      if (t.at > past || was(tellKey(t), t.at)) continue
      seen.push({ key: tellKey(t), at: t.at })
      late.push({ what: 'told', pose: this.pose_, live: planned.live, told: t, late: true })
    }
  }

  /**
   * A finished route joins the end of the plan, in place of the one being
   * drawn if there is one. Says whether it was planned, and how many waiting
   * routes were left out to make room: where any were, one short way across
   * the tar stands in their place, second in the plan.
   */
  add(route: Route, tells: readonly Telling[] = []): { planned: boolean; dropped: number } {
    const last = this.plan[this.plan.length - 1]
    if (last?.live) {
      last.route = route
      last.live = false
      this.tell(last, tells)
    } else if (route.length > 0 || tells.length > 0) this.plan.push({ route, live: false, fired: 0, tells, told: 0 })
    else return { planned: false, dropped: 0 }
    const over = this.plan.length - PLAN_MOST
    if (over <= 0) return { planned: true, dropped: 0 }
    // The engine finishes the route it is on, cuts across to where the newest ones begin, and rides those.
    // The way across takes a place itself, so one more route than the plan is over by makes room for it.
    const dropped = over + 1
    // A route with no way in it has no end to cut across from or start to cut across to: the engine's own place stands in.
    const from = endOf(this.plan[0].route) ?? { x: this.pose_.x, y: this.pose_.y }
    const to = this.plan.slice(dropped + 1).map((p) => startOf(p.route)).find((p) => p !== null) ?? from
    // What the train was to be told on the routes left out is told as it sets off across instead: a rider that
    // got home on one of them is still seen to get out, and whoever climbed aboard to climb in.
    const lost = this.plan.slice(1, 1 + dropped).flatMap((p) => p.tells.slice(p.told)).map((t) => ({ ...t, at: 0 }))
    this.plan.splice(1, dropped, { route: routeTo(from, to), live: false, fired: 0, tells: lost, told: 0 })
    return { planned: true, dropped }
  }

  /** Puts a route at the head of the plan, to be ridden before anything that waits. */
  first(route: Route): void {
    if (route.length > 0) this.plan.unshift({ route, live: false, fired: 0, tells: [], told: 0 })
  }

  /** The route of the line still being drawn, made again as the line grows; `null` drops it. */
  setLive(route: Route | null, tells: readonly Telling[] = []): void {
    const last = this.plan[this.plan.length - 1]
    if (last?.live) {
      if (route) {
        last.route = route
        this.tell(last, tells)
      } else this.plan.pop()
    } else if (route) this.plan.push({ route, live: true, fired: 0, tells, told: 0 })
    if (this.plan.length === 0) this.s = 0
  }

  /**
   * Jumps the engine to the end of the finished route it is on, as when a
   * touch ends a scene. Nothing on the way happens; what was to be told there
   * is told, and the route is done.
   */
  skip(): Fired[] {
    const now = this.plan[0], fired: Fired[] = []
    if (!now || now.live) return fired
    const spot = along(now.route, now.route.length)
    this.travelled += Math.max(0, now.route.length - this.s)
    if (now.route.legs.length) this.pose_ = { ...this.pose_, x: spot.x, y: spot.y, on: spot.on, speed: 0, round: false, angle: this.upright(spot.tx, spot.ty) }
    return this.finish(now, fired)
  }

  /** The engine is moved by something other than a route, as in a scene: it stands at `pose`, having gone `moved` further. */
  carry(pose: Pose, moved: number): void {
    this.pose_ = pose
    this.travelled += moved
  }

  private upright(tx: number, ty: number): number {
    if (Math.abs(tx) > 0.25) this.pose_.facing = tx > 0 ? 1 : -1
    return this.pose_.facing === 1 ? Math.atan2(ty, tx) : Math.atan2(-ty, -tx)
  }

  /** The route the engine is on is over: what was left to tell is told, and the plan moves on. */
  private finish(now: Planned, fired: Fired[]): Fired[] {
    for (; now.told < now.tells.length; now.told++) fired.push({ what: 'told', pose: this.pose_, live: false, told: now.tells[now.told] })
    this.plan.shift()
    this.s = 0
    fired.push({ what: 'done', pose: this.pose_, live: false })
    if (this.plan.length === 0) {
      this.pose_.speed = 0
      fired.push({ what: 'arrived', pose: this.pose_, live: false })
    }
    return fired
  }

  /**
   * Where the engine could roll on to and stand, on the line still being
   * drawn that it has set off along: the first spot ahead of it of which
   * `ok` holds, as a distance along that line, or -1 where there is none.
   */
  spotAhead(ok: (spot: Pt) => boolean, step = 12): number {
    const now = this.plan[0]
    if (!now || !now.live || this.plan.length !== 1) return -1
    for (let on = this.s; on <= now.route.length; on += step) if (ok(along(now.route, on))) return on
    return -1
  }

  /** The line being drawn is no longer the plan, but the engine rolls on along it as far as `to` and stops there. */
  rollOn(to: number): Pt {
    const now = this.plan[0]
    now.route = cut(now.route, to)
    now.live = false
    now.tells = []
    now.told = 0
    now.fired = now.route.happenings.length
    const end = along(now.route, now.route.length)
    return { x: end.x, y: end.y }
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
    // What the line turned out to be behind the engine happens first.
    if (now?.late?.length) {
      for (const late of now.late) fired.push({ ...late, pose: this.pose_ })
      now.late = []
    }
    if (!now || (now.live && !mayEnterLive && this.s === 0)) {
      this.pose_.speed = Math.max(0, this.pose_.speed - BRAKE * dt)
      // What is told at the very start of a line is told even while the engine holds back from it.
      if (now) for (; now.told < now.tells.length && now.tells[now.told].at <= 0; now.told++) {
        ;(now.seen ??= []).push({ key: tellKey(now.tells[now.told]), at: now.tells[now.told].at })
        fired.push({ what: 'told', pose: this.pose_, live: now.live, told: now.tells[now.told] })
      }
      return fired
    }
    const route = now.route, end = Math.max(0, now.live ? route.length - BEHIND_PEN : route.length)
    // A route with no way in it, as a tap where the engine already stands: it is over at once, and the engine stays put.
    if (route.legs.length === 0) return now.live ? fired : this.finish(now, fired)
    const here = along(route, this.s), ahead = along(route, Math.min(route.length, this.s + 60))
    const round = route.rounds.some((r) => this.s >= r.from && this.s <= r.to)
    // The pace this stretch asks for.
    const turn = Math.abs(Math.atan2(here.tx * ahead.ty - here.ty * ahead.tx, here.tx * ahead.tx + here.ty * ahead.ty))
    let want: number = here.on === 'tar' ? PACE.tar : turn < 0.1 ? PACE.run : Math.max(PACE.bend, PACE.chalk - turn * 220)
    if (here.on === 'chalk') want *= 1 + SLOPE * here.ty
    if (round) want = Math.max(want, PACE.round)
    // Through a scribble, a thicket or a knot, it squeezes slowly, whichever way the chalk turns.
    if (here.on === 'chalk' && route.happenings.some((h) => h.what === 'scribble')) want = Math.min(want, PACE.squeeze)
    if (this.plan.length > 1) want *= Math.min(HURRY_MOST, 1 + HURRY * (this.plan.length - 1))
    // It never arrives faster than it can stop, except onto more line.
    const left = end - this.s
    if (this.plan.length === 1) want = Math.min(want, Math.sqrt(2 * BRAKE * Math.max(0, left)) + 20)
    const was = this.pose_.speed
    let speed = was < want ? Math.min(want, was + GATHER * dt) : Math.max(want, was - BRAKE * dt)
    if (was <= 1 && speed > 1 && left > 1) fired.push({ what: 'set-off', pose: this.pose_, live: now.live })
    const step = Math.min(Math.max(0, left), speed * dt)
    this.s += step
    this.travelled += step
    // At the end of a route everything on it has happened, a happening at its very end included.
    const over = this.s >= route.length - 0.01 && !now.live
    const seen = (now.seen ??= [])
    for (; now.fired < route.happenings.length && (over || route.happenings[now.fired].at <= this.s); now.fired++) {
      const { what, at } = route.happenings[now.fired]
      if (what === 'corner') speed *= CORNER_KEEPS
      seen.push({ key: what, at })
      fired.push({ what, pose: this.pose_, live: now.live })
    }
    const spot = along(route, this.s)
    // Which way up: inside a round the engine keeps its facing and goes right over; outside it turns to stay upright.
    let facing = this.pose_.facing
    if (!round && Math.abs(spot.tx) > 0.25) facing = spot.tx > 0 ? 1 : -1
    const angle = facing === 1 ? Math.atan2(spot.ty, spot.tx) : Math.atan2(-spot.ty, -spot.tx)
    this.pose_ = { x: spot.x, y: spot.y, angle, facing, on: spot.on, speed: left <= 0.01 ? 0 : speed, round }
    for (; now.told < now.tells.length && (over || now.tells[now.told].at <= this.s); now.told++) {
      seen.push({ key: tellKey(now.tells[now.told]), at: now.tells[now.told].at })
      fired.push({ what: 'told', pose: this.pose_, live: now.live, told: now.tells[now.told] })
    }
    if (over) this.finish(now, fired)
    return fired
  }
}

/** Something round on the tar that a wagon at rest keeps out of. */
/** Something a wagon at rest keeps out of, as the box it takes up on the tar: its middle and half its width and height. */
export type Box = { at: Pt; w: number; h: number }
/** Half of what a wagon's body takes up as drawn. */
export const WAGON_HALF = { w: 58, h: 36 }
/** A wagon at rest swings aside from a figure in steps of this angle, and no further than this many of them. */
const ASIDE = 0.15
const ASIDE_STEPS = 13
/** A wagon at rest stands this clear of a rider or a home. */
const CLEAR_BY = 4
/** The middle of a wagon's body is this far above its spot on the rail. */
export const WAGON_UP = 34

const startOf = (route: Route): Pt | null => { const p = route.legs[0]?.pts[0]; return p ? { x: p.x, y: p.y } : null }
const endOf = (route: Route): Pt | null => { const pts = route.legs[route.legs.length - 1]?.pts, p = pts?.[pts.length - 1]; return p ? { x: p.x, y: p.y } : null }

/**
 * The wagons, each coupled to the one ahead at a fixed length and pulled
 * along by it. A wagon swings wide and cuts a tight corner as a trailer does,
 * so however the line twists, the train is never a heap: no wagon is ever
 * nearer the one ahead than its coupling.
 */
export class Wagons {
  poses: Pose[]

  /** They start in a straight line behind the engine, along the way it stands. */
  constructor(engine: Pose, couplings: readonly number[]) {
    const bx = Math.cos(engine.angle) * engine.facing, by = Math.sin(engine.angle) * engine.facing
    let back = 0
    this.poses = couplings.map((length) => {
      back += length
      return { ...engine, x: engine.x - bx * back, y: engine.y - by * back, speed: 0 }
    })
  }

  /**
   * Pulls each wagon after the one ahead of it. `couplings` are the lengths
   * this frame, a little shorter while they bunch. At rest `straighten` is the
   * angle, in radians, by which each wagon may swing round its coupling this
   * frame toward standing straight behind the one ahead, so a train that has
   * stopped draws itself up into a line. Where that would stand it in one of
   * the boxes in `keepOutOf`, it stands to one side instead, as far round as
   * it takes to be clear: a wagon at rest covers nothing the child aims at.
   */
  follow(engine: Pose, couplings: readonly number[], straighten = 0, keepOutOf: readonly Box[] = []): void {
    let ahead: Pose = engine
    this.poses = this.poses.map((wagon, i) => {
      let dx = wagon.x - ahead.x, dy = wagon.y - ahead.y
      const far = Math.hypot(dx, dy)
      if (far < 0.001) { dx = -Math.cos(ahead.angle) * ahead.facing; dy = -Math.sin(ahead.angle) * ahead.facing } else { dx /= far; dy /= far }
      if (straighten > 0) {
        const now = Math.atan2(dy, dx), behind = Math.atan2(-Math.sin(ahead.angle) * ahead.facing, -Math.cos(ahead.angle) * ahead.facing)
        // How far into a figure the wagon's body would stand, swung to an angle about its coupling.
        const into = (angle: number): number => {
          // The middle of its body, above its spot on the rail the way it would then be tilted.
          const cx = Math.cos(angle), cy = Math.sin(angle), faces = Math.abs(cx) > 0.25 ? (cx < 0 ? 1 : -1) : wagon.facing
          const tilt = faces === 1 ? Math.atan2(-cy, -cx) : Math.atan2(cy, cx)
          const x = ahead.x + cx * couplings[i] + Math.sin(tilt) * WAGON_UP, y = ahead.y + cy * couplings[i] - Math.cos(tilt) * WAGON_UP
          let deepest = 0
          for (const box of keepOutOf) deepest = Math.max(deepest, Math.min(box.w + WAGON_HALF.w + CLEAR_BY - Math.abs(x - box.at.x), box.h + WAGON_HALF.h + CLEAR_BY - Math.abs(y - box.at.y)))
          return deepest
        }
        // Where it will stand: straight behind the one ahead, or, where a figure is there, as near to that as stands
        // clear, a little to one side. On its way there it may pass in front of a figure; it does not stay in one.
        let goal = behind
        if (keepOutOf.length > 0 && into(behind) > 0) {
          for (let k = 1; k <= ASIDE_STEPS; k++) {
            const by = k * ASIDE
            if (into(behind + by) <= 0) { goal = behind + by; break }
            if (into(behind - by) <= 0) { goal = behind - by; break }
          }
        }
        let turn = goal - now
        while (turn > Math.PI) turn -= Math.PI * 2
        while (turn < -Math.PI) turn += Math.PI * 2
        const to = now + Math.max(-straighten, Math.min(straighten, turn))
        dx = Math.cos(to)
        dy = Math.sin(to)
      }
      const x = ahead.x + dx * couplings[i], y = ahead.y + dy * couplings[i]
      // It points at the one ahead, and turns over to stay the right way up.
      const facing: 1 | -1 = Math.abs(dx) > 0.25 ? (dx < 0 ? 1 : -1) : wagon.facing
      const angle = facing === 1 ? Math.atan2(-dy, -dx) : Math.atan2(dy, dx)
      const pose: Pose = { x, y, angle, facing, on: ahead.on, speed: engine.speed, round: false }
      ahead = pose
      return pose
    })
  }
}
