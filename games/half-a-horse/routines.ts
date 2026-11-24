import { BEAR, GOOSE } from './ends'

// What only two fingers can make. Each routine is read from a short history
// of both halves, and only while two fingers have hold of them, or at the
// moment both are let go. One finger alone never sets one off.

export const ROUTINES = ['trot', 'leap', 'twang', 'bow', 'seesaw', 'tower', 'squash', 'skip'] as const
export type Routine = (typeof ROUTINES)[number]

export type Seen = { x: number; y: number; vx: number; held: boolean }

/** A routine that has just happened does not happen again until this has passed. */
const AGAIN: Record<Routine, number> = { trot: 2.4, leap: 0.5, twang: 0.4, bow: 0.6, seesaw: 2, tower: 2.2, squash: 1, skip: 0.9 }

export class Routines {
  private readonly rest = new Map<Routine, number>()
  private trotting = 0
  private towering = 0
  private lean = 0
  private leans: number[] = []
  private low = true
  private peaks: number[] = []
  private landed: [number, number] = [-9, -9]
  private up: [number, number] = [0, 0]
  private upHeld: [boolean, boolean] = [false, false]
  private squashed = false
  private tied: boolean
  private now = 0
  /** Seconds since two fingers last had hold of both. */
  private since = 9

  constructor(tied: boolean) {
    this.tied = tied
  }

  step(dt: number, front: Seen, rear: Seen, tied: boolean, apart: number, snapped: boolean, soft: boolean, out: Routine[]): void {
    this.now += dt
    const both = front.held && rear.held
    this.since = both ? 0 : this.since + dt
    const lately = this.since < 0.7
    const fire = (routine: Routine): void => {
      if (this.now - (this.rest.get(routine) ?? -9) < AGAIN[routine]) return
      this.rest.set(routine, this.now)
      out.push(routine)
    }

    const along = both && Math.abs(front.vx) > 90 && Math.abs(rear.vx) > 90 && front.vx * rear.vx > 0 && Math.abs(front.y - rear.y) < 70
    this.trotting = along ? this.trotting + dt : Math.max(0, this.trotting - dt * 2)
    if (this.trotting > 0.55) { this.trotting = 0; fire('trot') }

    const tower = both && Math.abs(front.x - rear.x) < 105 && Math.abs(front.y - rear.y) > 165
    this.towering = tower ? this.towering + dt : 0
    if (this.towering > 0.3) { this.towering = 0; fire('tower') }

    // Up and down by turns: three changes of who is higher.
    if (both) {
      const diff = front.y - rear.y
      const lean = diff > 62 ? 1 : diff < -62 ? -1 : 0
      if (lean !== 0 && lean !== this.lean) {
        if (this.lean !== 0) this.leans.push(this.now)
        this.lean = lean
        this.leans = this.leans.filter((t) => this.now - t < 4)
        if (this.leans.length >= 3) { this.leans = []; fire('seesaw') }
      }
    } else if (!lately) {
      this.lean = 0
      this.leans = []
    }

    // Both up and both down again, twice, far apart: a rope.
    if (both && apart > 380) {
      const high = Math.min(front.y, rear.y)
      if (this.low && high > 75) { this.low = false; this.peaks.push(this.now); this.peaks = this.peaks.filter((t) => this.now - t < 3.2) }
      else if (!this.low && Math.max(front.y, rear.y) < 55) {
        this.low = true
        if (this.peaks.length >= 2) fire('skip')
      }
    } else if (!both) {
      this.low = true
      this.peaks = []
    }

    // Both dropped from a height and down at nearly the same moment.
    ;([front, rear] as const).forEach((half, who) => {
      if (half.y > 8) {
        this.up[who] = Math.max(this.up[who], half.y)
        if (half.held) this.upHeld[who] = true
      } else {
        if (this.up[who] > 85 && this.upHeld[who] && !soft) this.landed[who] = this.now
        this.up[who] = 0
        this.upHeld[who] = false
      }
    })
    if (Math.abs(this.landed[GOOSE] - this.landed[BEAR]) < 0.32 && this.now - Math.max(...this.landed) < 0.05) {
      this.landed = [-9, -9]
      fire('leap')
    }

    const squash = both && apart < 112 && Math.abs(front.y - rear.y) < 60
    if (squash && !this.squashed) fire('squash')
    this.squashed = squash || (this.squashed && apart < 150)

    if (tied && !this.tied && !soft && lately) fire('bow')
    this.tied = tied
    if (snapped && lately && !soft) fire('twang')
  }
}
