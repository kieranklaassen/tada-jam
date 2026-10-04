import { clamp01, easeInOut, lerp } from './fx'
import type { Point } from './hit'
import type { Layout } from './layout'
import type { VisitorLive } from './live'
import { AT_REST, poseOf, type Actor, type Channels, type Director } from './motion'
import type { VisitorId } from './visitors'

// One visitor on the page, in motion: which of its actions it is in, where
// it is on its way to, and what that makes of its body. The actions are data
// (cast.ts); this plays them one after another, lets the visitor live by
// itself between them, and turns an action's channels into a place and a
// pose for the view. It decides nothing about the page.

/** How big each visitor is drawn at scale 1: its width and height. The view draws them at these sizes (creatures.ts), and a test holds the two together. */
export const BODY: Record<VisitorId, { w: number; h: number }> = {
  snail: { w: 136, h: 104 },
  bee: { w: 84, h: 78 },
  moth: { w: 84, h: 62 },
  ladybird: { w: 70, h: 50 },
  ant: { w: 74, h: 52 },
}

/**
 * The snail's bite out of a leaf, in its ending. When each of its four bites falls, as shares of its use of the plant,
 * and where the bite is on a plant at scale 1: from the foot of its stem to the tip of the lowest leaf on the visitor's
 * side, and how big it gets. The game and the view both read these.
 */
export const SNAIL_BITES = [0.26, 0.4, 0.54, 0.68] as const
export const BITE = { x: 25, y: -42, r: 6.5 } as const

/** Where the visitor on the page stands, and how big it is drawn there. The view places it by the same numbers. */
export function visitorSpot(layout: Layout, who: VisitorId): { x: number; y: number; s: number } {
  const box = layout.visitor, body = BODY[who]
  // On a wide page it stands a little right of the middle of its place, which is the whole side column, and is never
  // wider than 46 hundredths of it: the plant it is offered needs room on its left and the plants it has kept on its right. On an upright page
  // it stands to the right of a narrower place.
  if (layout.wide) return { x: box.x + box.w * 0.58, y: box.y + box.h * 0.97, s: Math.min(2 * layout.k, (box.w * 0.46) / body.w, box.h / (body.h * 1.2)) }
  return { x: box.x + box.w * 0.66, y: box.y + box.h * 0.97, s: Math.min(1.3 * layout.k, (box.w * 0.6) / body.w, box.h / (body.h * 1.25)) }
}

/**
 * Where the next visitor waits at the edge. One that flies waits in the air. `first` is the very first visitor of a
 * page, while nobody has been let in yet: on a wide page it waits at the far end of the visitors' own ground, at
 * nearly the size it will stand at, so that the first thing a child sees there is someone, with its wish held up.
 */
export function waitingSpot(layout: Layout, who: VisitorId, first = false): { x: number; y: number; s: number } {
  const box = layout.waiting, body = BODY[who], flies = who === 'bee' || who === 'moth'
  if (first && layout.wide) {
    const ground = layout.visitor, on = visitorSpot(layout, who)
    return { x: ground.x + ground.w * 0.74, y: on.y - (flies ? ground.h * 0.1 : 0), s: on.s * 0.92 }
  }
  // On a wide page it waits at the foot of its place, under the sketch it holds open over its head (`placardOf`, folk.ts).
  // Its sketch has to end below the top right corner of the page, which is the grown-up's: so one that flies waits low, and none is taller than 42 hundredths of the place.
  if (layout.wide) return { x: box.x + box.w * 0.52, y: box.y + box.h * 0.97, s: Math.min(1.3 * layout.k, box.w / (body.w * 1.08), (box.h * 0.42) / body.h) }
  return { x: box.x + box.w * 0.56, y: box.y + box.h * (flies ? 0.62 : 0.8), s: Math.min(layout.k, box.w / (body.w * 0.9), box.h / (body.h * 1.3)) }
}

/** The plant a visitor is answering: the foot of its stem and the length of its stem, from the soil to the flower. */
export type Offered = { x: number; y: number; stem: number }

type Turn = { name: string; then?: () => void }

export class Walker {
  /** Where its feet are when it is not on its way somewhere. */
  at: Point
  away = false
  private action: string | null = null
  private idle = false
  private t = 0
  private queue: Turn[] = []
  private then: (() => void) | undefined
  private wait: number
  private going: { from: Point; to: Point; t: number; seconds: number; then?: () => void } | null = null
  private legs = 0
  private readonly pose: Channels = { ...AT_REST }

  constructor(readonly kind: VisitorId, private readonly actor: Actor, private readonly director: Director, at: Point) {
    this.at = { ...at }
    this.wait = director.pauseOf(actor) * 0.5
  }

  /** It does this now, in place of whatever it was doing, and then what is queued after it. `then` runs when the action ends. */
  play(name: string, then?: () => void): void {
    this.queue = []
    this.begin({ name, then })
  }

  /** It does this after what it is doing and what is already queued. */
  after(name: string, then?: () => void): void {
    if (this.action === null || this.idle) this.begin({ name, then })
    else this.queue.push({ name, then })
  }

  private begin(turn: Turn): void {
    this.action = this.actor.answer[turn.name] || this.actor.idle[turn.name] ? turn.name : null
    this.idle = false
    this.t = 0
    this.then = turn.then
    // An action the cast does not have is over at once, and what follows it still follows.
    if (this.action === null) this.end()
  }

  private end(): void {
    const then = this.then
    this.then = undefined
    this.action = null
    this.idle = false
    this.t = 0
    then?.()
    // `then` may have started something itself.
    if (this.action !== null) return
    const next = this.queue.shift()
    if (next) this.begin(next)
    else this.wait = this.director.pauseOf(this.actor)
  }

  /** It goes to another place over some seconds, whatever its body is doing meanwhile. */
  walk(to: Point, seconds: number, then?: () => void): void {
    this.going = { from: { ...this.at }, to: { ...to }, t: 0, seconds: Math.max(0.01, seconds), then }
  }

  /** Everything it was going to do is dropped and it stands at rest: none of the dropped actions' `then` runs. */
  rest(): void {
    this.queue = []
    this.then = undefined
    this.action = null
    this.idle = false
    this.t = 0
    this.wait = this.director.pauseOf(this.actor)
  }

  /** It is doing something it was told to do, or going somewhere: not just living. */
  get busy(): boolean {
    return (this.action !== null && !this.idle) || this.queue.length > 0 || this.going !== null
  }

  /** The action it is in, or none. */
  get doing(): string | null {
    return this.action
  }

  step(dt: number): void {
    if (this.going) {
      this.going.t += dt / this.going.seconds
      const u = easeInOut(this.going.t)
      this.at.x = lerp(this.going.from.x, this.going.to.x, u)
      this.at.y = lerp(this.going.from.y, this.going.to.y, u)
      if (this.going.t >= 1) {
        const then = this.going.then
        this.at = { ...this.going.to }
        this.going = null
        then?.()
      }
    }
    if (this.action !== null) {
      this.t += dt
      const action = this.actor.answer[this.action] ?? this.actor.idle[this.action]
      if (!action || this.t >= action.seconds) this.end()
    } else if ((this.wait -= dt) <= 0) {
      // Nothing asked of it: it does one of its own things, never the same twice running.
      this.action = this.director.nextOf(this.kind, this.actor)
      this.idle = true
      this.t = 0
    }
    poseOf(this.actor, this.action ?? '', this.t, this.pose)
    this.legs = (this.legs + (this.pose.legs + (this.going ? 1.4 : 0)) * dt) % 1
  }

  /**
   * Its place and pose now, for the view. `s` is the scale it is drawn at;
   * `offered` is the plant it is answering, if any, which `shift` and `climb`
   * are measured against; `time` drives its idle sway.
   */
  fill(out: VisitorLive, s: number, offered: Offered | null, time: number): VisitorLive {
    const pose = this.pose, body = BODY[this.kind]
    // A step of -1 puts its feet at the foot of the plant; with no plant, a step is one and a half of its own lengths.
    const reach = offered ? this.at.x - offered.x : body.w * s * 1.5
    out.kind = this.kind
    out.x = this.at.x + pose.shift * reach
    out.y = this.at.y - clamp01(pose.climb) * (offered?.stem ?? 0)
    out.lift = pose.lift * body.h * s
    out.turn = pose.turn
    out.pose.lean = pose.lean
    out.pose.look = pose.look
    out.pose.breath = this.action === null ? 0.5 - 0.5 * Math.cos(time * 1.7) : pose.breath
    out.pose.sway = (time * 0.21) % 1
    out.part = pose.part
    out.part2 = pose.part2
    out.legs = this.legs
    out.away = this.away
    out.s = s
    return out
  }
}

/** One that has all it asked for has sat down: lower by a tenth, a little broader, leant back, its eyes up. */
export const SAT = { wide: 0.05, low: 0.1, lean: 0.08, look: 0.5 }

export function restingVisitor(kind: VisitorId): VisitorLive {
  return { kind, x: 0, y: 0, lift: 0, turn: 0, pose: { lean: 0, look: 0, breath: 0, sway: 0 }, part: 0, part2: 0, legs: 0, away: false }
}
