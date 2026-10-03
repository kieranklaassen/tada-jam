import { draw } from './jobs'

// How things move. Numbers only: the view maps them onto what it draws.
//
// Springs, the director that picks what a character does next, and the old
// hand, who is heavy and slow: a long breath, an ear that flicks in her
// sleep, whiskers that stand out at a short and take their time to settle.
// The customers are in folk.ts. No motion is shared between any two of them:
// their variants have different names, different tempos and different
// springs, and tests hold that.

// --- Springs ---------------------------------------------------------------------

export type Spring = { x: number; v: number }

/** One damped spring toward `target`, stepped in slices of at most 1/120 s so a long frame cannot blow it up. */
export function stepSpring(s: Spring, target: number, stiffness: number, damping: number, dt: number): void {
  let left = Math.min(dt, 0.1)
  while (left > 1e-9) {
    const h = Math.min(left, 1 / 120)
    s.v += (-(s.x - target) * stiffness - s.v * damping) * h
    s.x += s.v * h
    left -= h
  }
}

/** How a lead swings: light, a little under-damped, so it overshoots and settles. */
export const LEAD_SPRING = { stiffness: 90, damping: 7 } as const

// --- The director ----------------------------------------------------------------

/** Picks the next variant from a seeded stream, never the one just played. */
export class Director {
  private state: number
  constructor(seed: number) {
    this.state = seed >>> 0
  }
  next(): number {
    const [value, state] = draw(this.state)
    this.state = state
    return value
  }
  pick<T>(variants: readonly T[], last: T | null): T {
    const others = variants.filter((v) => v !== last)
    return others[Math.min(others.length - 1, Math.floor(this.next() * others.length))]
  }
  between(low: number, high: number): number {
    return low + this.next() * (high - low)
  }
}

// --- The old hand ----------------------------------------------------------------

export const RACCOON = {
  /** Breaths a second: slow. */
  breath: 0.2,
  /** Her whiskers: heavy and well damped. */
  whiskers: { stiffness: 14, damping: 4.2 },
  /** The tea in her mug. */
  slosh: { stiffness: 60, damping: 4 },
  idle: ['ear-flick-left', 'ear-flick-right', 'tail-tip-curl', 'snore-puff', 'paw-twitch'],
  /** Seconds between two things she does in her sleep. */
  rest: [3.5, 8],
} as const

export type RaccoonIdle = (typeof RACCOON.idle)[number]

export class Raccoon {
  /** -1 to 1: out and in. */
  breath = 0
  /** 0 at rest, 1 standing straight out. */
  readonly whiskers: Spring = { x: 0, v: 0 }
  readonly slosh: Spring = { x: 0, v: 0 }
  /** What she is doing in her sleep now, and how far through it she is, 0 to 1. */
  doing: RaccoonIdle | null = null
  progress = 0
  /** One eye open: after a pop, for a moment. */
  eye = 0
  private seconds = 0
  private wait: number
  private startled = 0

  constructor(private readonly director: Director) {
    this.wait = director.between(1.5, 4)
  }

  /** A cell's flag popped: her whiskers stand out, the tea jumps, and one eye opens for a moment. */
  pop(): void {
    this.whiskers.v += 9
    this.slosh.v += 7
    this.startled = 1.6
  }

  /** Poked in her sleep: an ear flicks at once, whatever she was doing, and she breathes out. */
  poke(): void {
    this.doing = this.director.pick(['ear-flick-left', 'ear-flick-right', 'snore-puff'] as const, this.doing)
    this.progress = 0
  }

  step(dt: number): void {
    this.seconds += dt
    this.breath = Math.sin(this.seconds * RACCOON.breath * Math.PI * 2)
    stepSpring(this.whiskers, 0, RACCOON.whiskers.stiffness, RACCOON.whiskers.damping, dt)
    stepSpring(this.slosh, 0, RACCOON.slosh.stiffness, RACCOON.slosh.damping, dt)
    this.startled = Math.max(0, this.startled - dt)
    // The eye opens fast and shuts slowly.
    this.eye += ((this.startled > 0.5 ? 1 : 0) - this.eye) * Math.min(1, dt * (this.startled > 0.5 ? 14 : 2.5))
    if (this.doing) {
      this.progress += dt / 0.9
      if (this.progress >= 1) {
        this.wait = this.director.between(RACCOON.rest[0], RACCOON.rest[1])
        this.lastDone = this.doing
        this.doing = null
        this.progress = 0
      }
    } else if ((this.wait -= dt) <= 0) {
      this.doing = this.director.pick(RACCOON.idle, this.lastDone)
      this.progress = 0
    }
  }
  private lastDone: RaccoonIdle | null = null
}
