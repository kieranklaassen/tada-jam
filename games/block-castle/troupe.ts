import { clamp01, smooth } from './motion'
import type { Who } from './layout'

// How the folk get about in the evening. Pure: positions as numbers on game
// time. They are toys, so they travel as a toy is moved by a hand: lifted
// straight up, carried over everything, set straight down, and now and then
// hopped or slid along something.
//
// A stance is where one of them is and how he lies. A route is a list of
// legs between stances, each with its own times. A scene plays a route by
// seeking to a time; a tap in the evening lets one run by itself.

export type Vec3 = [number, number, number]

export type Stance = {
  /** The point he stands on (or, lying, the foot of his axis); for the dragon, where his shoulders lie. */
  at: Vec3
  /** The cook: how far he has tipped over toward his head's side, from 0 upright to -1 or 1 lying. */
  lie: number
  /** The dragon: the line his body lies along from his shoulders back, as offsets from `at`. Empty for the others. */
  path: Vec3[]
}

export type RouteEvent =
  | { type: 'step'; who: Who; n: number }
  | { type: 'boing'; who: Who }
  /** He has landed on the end of a board that hangs in the air: it dips under him, and at the boing throws him up. */
  | { type: 'bend'; who: Who; thing: number; end: -1 | 1 }
  | { type: 'whee'; who: Who }
  | { type: 'bump'; who: Who }
  | { type: 'splash'; who: Who; at: Vec3 }
  | { type: 'door'; who: Who; thing: number }
  | { type: 'window'; who: Who; thing: number }
  | { type: 'home'; who: Who }
  | { type: 'hup'; who: Who }
  /** He is set in a tower under its lifted roof, looks out and makes his own noise. */
  | { type: 'peek'; who: Who }
  /** The dragon's smoke ring, where it rises. */
  | { type: 'puff'; at: Vec3 }

export type Leg = {
  to: Stance
  /** Seconds after the route starts that he leaves, and that he arrives. */
  start: number
  end: number
  /** How high he rises over the higher of the two ends (a carry), or over the straight line (a hop); 0 for a slide along something. */
  arc: number
  /** A carry: straight up, across at the top, straight down. Otherwise a hop in one arc, or a slide. */
  carry: boolean
  /** A carry that goes round something: the point on the floor plan it passes over on the way across. */
  via?: Vec3
  /** What happens as he leaves and as he arrives. */
  begin: RouteEvent[]
  done: RouteEvent[]
}

/** A straight dragon: his body runs back from his shoulders along x, away from the side his head is on. */
export function straight(headTo: 1 | -1): Vec3[] {
  return [[0, 0, 0], [-8 * headTo, 0, 0]]
}

/** The offsets of a line in the room from its first point. */
export function fromFirst(path: readonly Vec3[]): Vec3[] {
  const [x, y, z] = path[0]
  return path.map((p) => [p[0] - x, p[1] - y, p[2] - z])
}

/** The point at a distance along a line of points, and the way the line runs there. Past the end it runs straight on. */
export function along(path: readonly Vec3[], distance: number, out: { p: Vec3; t: Vec3 }): { p: Vec3; t: Vec3 } {
  let left = distance
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i], b = path[i + 1]
    const long = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])
    if (long < 1e-6) continue
    if (left <= long || i + 2 === path.length) {
      const share = left / long
      out.p[0] = a[0] + (b[0] - a[0]) * share; out.p[1] = a[1] + (b[1] - a[1]) * share; out.p[2] = a[2] + (b[2] - a[2]) * share
      out.t[0] = (b[0] - a[0]) / long; out.t[1] = (b[1] - a[1]) / long; out.t[2] = (b[2] - a[2]) / long
      return out
    }
    left -= long
  }
  out.p[0] = path[0]?.[0] ?? 0; out.p[1] = path[0]?.[1] ?? 0; out.p[2] = path[0]?.[2] ?? 0
  out.t[0] = -1; out.t[1] = 0; out.t[2] = 0
  return out
}

/** Where one of the folk is right now, for the view. */
export type Placing = {
  at: Vec3
  lie: number
  /** The dragon's body: the line he is leaving, the line he is taking, and how far he is between them. */
  pathFrom: Vec3[]
  pathTo: Vec3[]
  mix: number
  /** 0 on the ground, up to 1 at the top of an arc: he stretches as he is lifted. */
  air: number
  /** The dragon: how far his head is pulled in, 0 to 1. He pulls it in before he is lifted and puts it out once he is down. */
  tuck: number
}

/** The share of a carry the dragon spends pulling his head in, and again putting it out. */
const HEAD_IN = 0.14

export class Actor {
  readonly placing: Placing
  private from: Stance
  private legs: Leg[] = []
  private clock = 0
  private fired: boolean[] = []

  constructor(readonly who: Who, stance: Stance) {
    this.from = stance
    this.placing = { at: [...stance.at], lie: stance.lie, pathFrom: stance.path, pathTo: stance.path, mix: 1, air: 0, tuck: 0 }
  }

  /** On his way somewhere. */
  get busy(): boolean {
    return this.legs.length > 0
  }

  /** Seconds the route he is on takes. */
  get length(): number {
    return this.legs.length ? this.legs[this.legs.length - 1].end : 0
  }

  /** Seconds he has been on his route. */
  get elapsed(): number {
    return this.clock
  }

  /** Where the route he is on ends, as a stance; where he is, when he is on none. */
  goal(): Stance {
    return this.legs.length ? this.legs[this.legs.length - 1].to : this.stance()
  }

  /** Where he is, as a stance: a route started now starts from here. */
  stance(): Stance {
    const { at, lie, pathFrom, pathTo, mix } = this.placing
    return { at: [...at], lie, path: mix >= 0.5 ? pathTo : pathFrom }
  }

  /** Put him somewhere at once: on load, and when a touch ends a scene. */
  set(stance: Stance): void {
    this.from = stance
    this.legs = []
    this.fired = []
    this.clock = 0
    this.show(stance, stance, 1, 0)
  }

  /** Send him along a route from where he is. */
  send(legs: Leg[]): void {
    this.from = this.stance()
    this.legs = legs
    this.fired = legs.flatMap(() => [false, false])
    this.clock = 0
  }

  private show(a: Stance, b: Stance, t: number, arc: number, carry = false, via?: Vec3): void {
    const p = this.placing
    let across: number, height: number
    p.tuck = 0
    if (carry) {
      // Straight up, across at the top, straight down: he is over nothing but his own place until he is at the top.
      const still = this.who === 'dragon' ? HEAD_IN : 0
      const u = clamp01((t - still) / (1 - 2 * still))
      if (still > 0) p.tuck = clamp01(Math.min(t / still, (1 - t) / still))
      const up = smooth(clamp01(u / 0.3)), down = smooth(clamp01((u - 0.7) / 0.3))
      across = smooth(clamp01((u - 0.3) / 0.4))
      const top = Math.max(a.at[1], b.at[1]) + arc
      height = u < 0.5 ? a.at[1] + (top - a.at[1]) * up : top + (b.at[1] - top) * down
      p.air = u < 0.5 ? up : 1 - down
    } else {
      across = arc > 0 ? smooth(t) : t
      height = a.at[1] + (b.at[1] - a.at[1]) * across + arc * 4 * t * (1 - t)
      p.air = arc > 0 ? Math.sin(clamp01(t) * Math.PI) : 0
    }
    if (via) {
      // Round by way of a point: the same share of the whole way, along its two stretches.
      const first = Math.hypot(via[0] - a.at[0], via[2] - a.at[2]), second = Math.hypot(b.at[0] - via[0], b.at[2] - via[2])
      const gone = across * (first + second)
      const [fx, fz, tx, tz, share] = gone <= first ? [a.at[0], a.at[2], via[0], via[2], first > 0 ? gone / first : 1] : [via[0], via[2], b.at[0], b.at[2], second > 0 ? (gone - first) / second : 1]
      p.at[0] = fx + (tx - fx) * share
      p.at[2] = fz + (tz - fz) * share
    } else {
      p.at[0] = a.at[0] + (b.at[0] - a.at[0]) * across
      p.at[2] = a.at[2] + (b.at[2] - a.at[2]) * across
    }
    p.at[1] = height
    p.lie = a.lie + (b.lie - a.lie) * across
    p.pathFrom = a.path
    p.pathTo = b.path
    p.mix = across
  }

  /**
   * Shows him where he is `seconds` into his route, and gives back what
   * happened on the way there since the last call. Past the end he is at the
   * route's last stance, and the route is over.
   */
  seek(seconds: number): RouteEvent[] {
    const events: RouteEvent[] = []
    if (this.legs.length === 0) return events
    this.clock = seconds
    let stood = this.from
    let shown = false
    this.legs.forEach((leg, i) => {
      if (seconds >= leg.start && !this.fired[i * 2]) { this.fired[i * 2] = true; events.push(...leg.begin) }
      if (seconds >= leg.end && !this.fired[i * 2 + 1]) { this.fired[i * 2 + 1] = true; events.push(...leg.done) }
      if (!shown && seconds < leg.end) {
        shown = true
        if (seconds <= leg.start) this.show(stood, stood, 1, 0)
        else this.show(stood, leg.to, (seconds - leg.start) / (leg.end - leg.start), leg.arc, leg.carry, leg.via)
      }
      stood = leg.to
    })
    if (!shown) this.set(stood)
    return events
  }

  /** Lets a route run by itself. */
  step(dt: number): RouteEvent[] {
    return this.legs.length ? this.seek(this.clock + dt) : []
  }

  /** Ends the route at its last stance, silently. */
  finish(): void {
    if (this.legs.length) this.set(this.legs[this.legs.length - 1].to)
  }

  /** Stops him where he is. */
  halt(): void {
    this.set(this.stance())
  }
}

/** Builds a route leg by leg: each leg leaves when the one before has arrived and he has stood a moment. */
export class RouteMaker {
  readonly legs: Leg[] = []
  private clock: number

  constructor(startAt = 0) {
    this.clock = startAt
  }

  wait(seconds: number): this {
    this.clock += seconds
    return this
  }

  /** A hop in one arc that rises `arc` over the straight line, or with no arc a slide. */
  go(to: Stance, seconds: number, arc: number, done: RouteEvent[] = [], begin: RouteEvent[] = []): this {
    this.legs.push({ to, start: this.clock, end: this.clock + seconds, arc, carry: false, begin, done })
    this.clock += seconds
    return this
  }

  /** A carry: straight up to `arc` over the higher end, across, and straight down. */
  carry(to: Stance, seconds: number, arc: number, done: RouteEvent[] = [], begin: RouteEvent[] = [], via?: Vec3): this {
    this.legs.push({ to, start: this.clock, end: this.clock + seconds, arc, carry: true, begin, done, via })
    this.clock += seconds
    return this
  }
}
