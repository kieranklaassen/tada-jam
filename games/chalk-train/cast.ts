import { between, type Rng } from './rng'
import { LOOPS, bearingOf, clipOf, type ClipName, type RiderBearing } from './riderMotion'
import type { RiderKind } from './tastes'
import type { Pt } from './yard'

// The riders as they are seen: where each one is, what it is in the middle
// of doing, and how it holds itself. Plain numbers on game time. The world
// says where a rider is once everything has come to rest; this is the rider
// on its way there, hopping aboard or getting out at home.

/** Where a rider is: standing at its stop, sitting in a wagon, or at its home. */
export type Seat = { in: 'stop' | 'home'; at: Pt } | { in: 'wagon'; index: number }

const same = (a: Seat, b: Seat): boolean =>
  a.in === 'wagon' || b.in === 'wagon' ? a.in === b.in && (a as { index: number }).index === (b as { index: number }).index : a.in === b.in && a.at.x === b.at.x && a.at.y === b.at.y

/** The piece a rider is in when it is doing nothing else. */
const standing = (seat: Seat): ClipName => (seat.in === 'wagon' ? 'ride' : seat.in === 'home' ? 'at-home' : 'wait')

export class RiderLife {
  readonly kind: RiderKind
  /** Where its feet are, in tar units. In a wagon this follows the wagon. */
  x = 0
  y = 0
  /** 0 to 1: how much of it is there, while it is drawn in or rubbed away. */
  shown: number
  leaving = false
  /** Where it looks, as a point on the tar: its home, while it has yet to get there. */
  gaze: Pt | null = null
  seat: Seat
  private from: Pt | null = null
  private moved = 1
  private moveSecs = 1
  private clip: ClipName
  private clipT = 0
  private reachIn: number
  private rng: Rng
  /** How it takes what it is doing: as something it likes (1), dislikes (-1), or neither. It colours how it gets out at home. */
  mood: 1 | -1 | 0 = 0
  private walking = false
  /** It is climbing into its wagon from its stop, as the train came to it. */
  climbing = false
  /** It has this moment landed in its wagon: the company sounds the thump, once. */
  justSat = false

  constructor(kind: RiderKind, seat: Seat, rng: Rng, drawnIn: boolean) {
    this.kind = kind
    this.seat = seat
    this.rng = rng
    this.shown = drawnIn ? 0 : 1
    this.clip = drawnIn ? 'drawn-in' : standing(seat)
    // Each starts somewhere else in its own waiting, so two riders never wait in step.
    this.clipT = drawnIn ? 0 : rng.next()
    this.reachIn = between(rng, 2, 4)
    if (seat.in !== 'wagon') { this.x = seat.at.x; this.y = seat.at.y }
  }

  /** Whether it is sitting in a wagon and has finished climbing in: the view then draws it with the wagon. */
  get settledIn(): number { return this.seat.in === 'wagon' && this.moved >= 1 ? this.seat.index : -1 }
  get moving(): boolean { return this.moved < 1 }
  /** Walking over to the train and not yet in its wagon. */
  get onItsWay(): boolean { return this.walking || this.climbing }
  get doing(): ClipName { return this.clip }

  /** Goes somewhere, acting `via` on the way: climbing aboard, getting out, hopping into its home. `secs` hurries it there in less time than the piece takes. */
  go(seat: Seat, via: ClipName, secs = Infinity): void {
    this.from = { x: this.x, y: this.y }
    this.seat = seat
    this.moved = 0
    this.moveSecs = Math.min(secs, clipOf(this.kind, via).secs)
    this.act(via)
  }

  /** Walks over to a seat in `secs` seconds, a step at a time, and climbs in when it gets there. */
  walk(seat: Seat, secs: number): void {
    this.from = { x: this.x, y: this.y }
    this.seat = seat
    this.moved = 0
    this.moveSecs = secs
    this.walking = true
    this.act('walk')
  }

  /** Is simply there: where the world says it is, with nothing acted. */
  put(seat: Seat): void {
    this.mood = 0
    this.walking = false
    this.climbing = false
    if (same(seat, this.seat) && this.moved >= 1) return
    this.seat = seat
    this.from = null
    this.moved = 1
    this.clip = standing(seat)
    if (seat.in !== 'wagon') { this.x = seat.at.x; this.y = seat.at.y }
  }

  /** Acts one piece, and then goes back to what it does when it is doing nothing else. */
  act(clip: ClipName): void {
    this.clip = clip
    this.clipT = 0
  }

  /** Is rubbed away, with a wave. */
  leave(): void {
    if (this.leaving) return
    this.leaving = true
    this.act('wave')
  }

  /** Plays `dt` seconds. `wagonAt` says where the feet of a rider in each wagon are. */
  step(dt: number, wagonAt: (index: number) => Pt): void {
    const clip = clipOf(this.kind, this.clip)
    this.clipT += dt / clip.secs
    if (this.clipT >= 1) {
      if (LOOPS.includes(this.clip)) this.clipT -= 1
      else {
        this.clip = standing(this.seat)
        this.clipT = 0
      }
    }
    this.shown = Math.max(0, Math.min(1, this.shown + (this.leaving ? -dt / 0.9 : dt / 0.5)))
    // Waiting at its stop, it reaches for its home every so often.
    if (this.clip === 'wait' && this.gaze && (this.reachIn -= dt) <= 0) {
      this.reachIn = between(this.rng, 3.5, 6)
      this.act('reach')
    }
    const to = this.seat.in === 'wagon' ? wagonAt(this.seat.index) : this.seat.at
    if (this.moved < 1 && this.from) {
      this.moved = Math.min(1, this.moved + dt / this.moveSecs)
      if (this.moved >= 1 && this.seat.in === 'wagon') this.justSat = true
      if (this.moved >= 1) this.climbing = false
      // At the end of its walk it climbs in.
      if (this.moved >= 1 && this.walking) {
        this.walking = false
        this.act('board')
      }
      const t = this.moved * this.moved * (3 - 2 * this.moved)
      this.x = this.from.x + (to.x - this.from.x) * t
      this.y = this.from.y + (to.y - this.from.y) * t
    } else {
      this.x = to.x
      this.y = to.y
    }
  }

  /** How it holds itself this frame. */
  bearing(clock: number): RiderBearing {
    const bearing = bearingOf(clipOf(this.kind, this.clip), this.clipT, clock)
    if (this.mood > 0) {
      // Pleased with its ride: a higher hop and a spring in it, eyes open.
      bearing.hop = bearing.hop * 1.5 + Math.abs(Math.sin(clock * 9)) * 10
      if (bearing.eyes === 'shut') bearing.eyes = 'open'
    } else if (this.mood < 0) {
      // Put out by it: low, leaning, and its eyes shut where they were only open.
      bearing.hop *= 0.5
      bearing.squash += 0.1
      bearing.tilt += 0.14
      if (bearing.eyes === 'open') bearing.eyes = 'shut'
    }
    return bearing
  }
}

/** A rider on the tar, by who it is and where it waits and lives: the same kind of rider laid out again is a new rider. */
export type Wanted = { id: string; kind: RiderKind; seat: Seat; gaze: Pt | null }

/** Everyone on the tar, and whoever is on the way off it. */
export class Cast {
  readonly riders = new Map<string, RiderLife>()
  gone: RiderLife[] = []
  private rng: Rng

  constructor(rng: Rng) { this.rng = rng }

  /**
   * Makes the cast agree with who should be on the tar and where. A rider who
   * is not there yet is drawn in; one in the middle of going somewhere is left
   * to finish; one who should be elsewhere is simply put there; and one who
   * should not be there is rubbed away. `quietly` puts everyone in place with
   * nothing acted, as when the world is found as it was left.
   */
  agree(wanted: readonly Wanted[], quietly = false): RiderKind[] {
    const drawnIn: RiderKind[] = []
    // Whoever should not be there goes first, so that a new rider of the same kind is a new rider.
    for (const [id, life] of this.riders) {
      if (wanted.some((w) => w.id === id)) continue
      this.riders.delete(id)
      if (!quietly) {
        life.leave()
        this.gone.push(life)
      }
    }
    for (const want of wanted) {
      let life = this.riders.get(want.id)
      if (!life) {
        life = new RiderLife(want.kind, want.seat, this.rng, !quietly)
        this.riders.set(want.id, life)
        if (!quietly) drawnIn.push(want.kind)
      } else if (!life.moving) life.put(want.seat)
      life.gaze = want.gaze
    }
    return drawnIn
  }

  /** The rider of a kind that is on the tar now. */
  of(kind: RiderKind): RiderLife | undefined {
    for (const life of this.riders.values()) if (life.kind === kind) return life
    return undefined
  }

  step(dt: number, wagonAt: (index: number) => Pt): void {
    for (const life of this.riders.values()) life.step(dt, wagonAt)
    for (const life of this.gone) life.step(dt, wagonAt)
    this.gone = this.gone.filter((life) => life.shown > 0)
  }
}
