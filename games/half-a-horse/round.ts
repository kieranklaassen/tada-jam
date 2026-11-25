// The opening round. On a first visit, before the child has touched anything,
// the ghost hand plays one whole round of the game for real: the same fingers,
// the same rules, the same answer. A child who cannot be told what the game is
// sees what is done and what comes of it. Any touch ends it at once, it plays
// once, and nothing it did is saved until the child has touched something.

export type Spot = { x: number; y: number }
export type Beat = {
  /** Seconds to wait once `ready`, so that what came of the last beat is seen. */
  wait: number
  /** Whether what came of the last beat is over. */
  ready?: () => boolean
  from: () => Spot
  /** Where the hand carries it, for a drag. */
  to?: () => Spot
  /** Seconds the carry takes. */
  carry?: number
}
export type Finger = {
  down(id: number, at: Spot, ms: number): void
  move(id: number, at: Spot, ms: number): void
  up(id: number, at: Spot, ms: number): void
  cancel(id: number): void
}
export type RoundHand = { x: number; y: number; press: number; opacity: number }

/** The finger no browser hands out. */
export const ROUND_FINGER = -77
/** A beat that is never ready ends the round. */
export const PATIENCE = 45
const COME = 0.55, PRESS = 0.2, HOLD = 0.16, GO = 0.35

export class OpeningRound {
  private at = 0
  private t = 0
  private readonly beats: readonly Beat[]
  private readonly finger: Finger
  private stage: 'wait' | 'come' | 'press' | 'carry' | 'hold' | 'go' | 'done' = 'wait'
  private from: Spot = { x: 0, y: 0 }
  private to: Spot = { x: 0, y: 0 }
  private readonly pose: RoundHand = { x: 0, y: 0, press: 0, opacity: 0 }

  constructor(beats: readonly Beat[], finger: Finger) {
    this.beats = beats
    this.finger = finger
  }

  get active(): boolean {
    return this.stage !== 'done'
  }

  /** The hand as it is to be drawn, or null when it is not on the screen. */
  get hand(): RoundHand | null {
    return this.stage === 'wait' || this.stage === 'done' ? null : this.pose
  }

  /** The child touched something, or the game is put away: the hand lets go and never comes back. */
  stop(): void {
    const down = this.stage === 'carry' || this.stage === 'hold'
    this.stage = 'done'
    if (down) this.finger.cancel(ROUND_FINGER)
  }

  /** Plays the seconds of a frame. `ms` is the clock the fingers are timed in. */
  advance(dt: number, ms: number): void {
    if (this.stage === 'done') return
    this.t += dt
    const beat = this.beats[this.at], pose = this.pose
    switch (this.stage) {
      case 'wait': {
        if (beat.ready && !beat.ready()) {
          if (this.t > PATIENCE) this.stage = 'done'
          // The wait is counted from when it is ready.
          else this.late = this.t
          return
        }
        if (this.t - this.late < beat.wait) return
        this.from = beat.from()
        this.to = beat.to?.() ?? this.from
        this.next('come')
        break
      }
      case 'come': {
        const k = Math.min(1, this.t / COME)
        pose.opacity = k
        pose.press = 0
        pose.x = this.from.x + (1 - k) * (1 - k) * 60
        pose.y = this.from.y + (1 - k) * (1 - k) * 90
        if (k >= 1) this.next('press')
        break
      }
      case 'press':
        pose.press = Math.min(1, this.t / PRESS)
        if (this.t < PRESS) break
        this.finger.down(ROUND_FINGER, { ...this.from }, ms)
        this.next(beat.to ? 'carry' : 'hold')
        break
      case 'carry': {
        const u = Math.min(1, this.t / (beat.carry ?? 1)), k = u * u * (3 - 2 * u)
        pose.x = this.from.x + (this.to.x - this.from.x) * k
        pose.y = this.from.y + (this.to.y - this.from.y) * k
        this.finger.move(ROUND_FINGER, { x: pose.x, y: pose.y }, ms)
        if (u >= 1) this.next('hold')
        break
      }
      case 'hold':
        if (this.t < HOLD) break
        this.finger.up(ROUND_FINGER, { x: pose.x, y: pose.y }, ms)
        this.next('go')
        break
      case 'go':
        pose.press = Math.max(0, 1 - this.t / 0.12)
        pose.opacity = Math.max(0, 1 - this.t / GO)
        if (this.t < GO) break
        this.at++
        this.late = 0
        this.next(this.at < this.beats.length ? 'wait' : 'done')
        break
    }
  }
  private late = 0

  private next(stage: OpeningRound['stage']): void {
    this.stage = stage
    this.t = 0
  }
}
