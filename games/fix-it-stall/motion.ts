import { draw } from './jobs'

// How things move. Numbers only: the view maps them onto what it draws.
//
// Two of the stall's folk are in the toy, and each moves like itself.
// The old hand is heavy and slow: a long breath, an ear that flicks in her
// sleep, whiskers that stand out at a short and take their time to settle.
// The moth is light and quick: a blur of wings, a wobbling line to the lamp
// the moment it lights, and a ring round it that it cannot leave.
// No motion here is shared between them: their variants have different names,
// different tempos and different springs, and a test holds that.

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

// --- The moth --------------------------------------------------------------------

export const MOTH = {
  /** Wing beats a second in flight: a blur. */
  flutter: 11,
  /** How it is pulled along: light and quick. */
  pull: { stiffness: 22, damping: 5 },
  perched: ['wing-fan', 'feeler-comb', 'sideways-shuffle', 'head-tilt'],
  circling: ['tight-ring', 'figure-of-eight', 'bump-the-glass', 'hover-and-stare'],
  rest: [2, 5],
} as const

export type MothPerched = (typeof MOTH.perched)[number]
export type MothCircling = (typeof MOTH.circling)[number]
type XY = { x: number; y: number }

export class Moth {
  readonly x: Spring
  readonly y: Spring
  /** 0 folded, 1 spread. */
  wings = 0.3
  /** Lean into the turn, in radians. */
  tilt = 0
  flying = false
  doing: MothPerched | MothCircling | null = null
  progress = 0
  private seconds = 0
  private wait: number
  private lastPerched: MothPerched | null = null
  private lastCircling: MothCircling | null = null
  private scared = 0

  constructor(private readonly director: Director, private readonly perch: XY) {
    this.x = { x: perch.x, v: 0 }
    this.y = { x: perch.y, v: 0 }
    this.wait = director.between(1, 3)
  }

  /** A pop: it darts back to its perch, whatever the lamp is doing, and stays a moment. */
  pop(): void {
    this.scared = 2.2
  }

  /** `lamp` is where a lit lamp is, or null while none is lit. */
  step(dt: number, lamp: XY | null): void {
    this.seconds += dt
    this.scared = Math.max(0, this.scared - dt)
    const drawn = lamp !== null && this.scared === 0
    let tx = this.perch.x, ty = this.perch.y
    if (drawn) {
      // It rings the lamp, each way of ringing it with its own figure.
      if (!this.doing || !(MOTH.circling as readonly string[]).includes(this.doing) || this.progress >= 1) {
        this.lastCircling = this.director.pick(MOTH.circling, this.lastCircling)
        this.doing = this.lastCircling
        this.progress = 0
      }
      this.progress += dt / 3.2
      const a = this.seconds * 2.6
      if (this.doing === 'tight-ring') { tx = lamp.x + Math.cos(a) * 58; ty = lamp.y + Math.sin(a) * 46 }
      else if (this.doing === 'figure-of-eight') { tx = lamp.x + Math.sin(a) * 96; ty = lamp.y + Math.sin(a * 2) * 40 }
      else if (this.doing === 'bump-the-glass') { const r = 30 + 60 * Math.abs(Math.sin(this.progress * Math.PI * 3)); tx = lamp.x + Math.cos(0.9) * r; ty = lamp.y - Math.sin(0.9) * r }
      else { tx = lamp.x + 74 + Math.sin(a * 3) * 4; ty = lamp.y - 30 + Math.cos(a * 2.3) * 4 }
    }
    const away = Math.hypot(this.x.x - this.perch.x, this.y.x - this.perch.y)
    this.flying = drawn || away > 6
    if (this.flying) {
      stepSpring(this.x, tx, MOTH.pull.stiffness, MOTH.pull.damping, dt)
      stepSpring(this.y, ty, MOTH.pull.stiffness, MOTH.pull.damping, dt)
      this.wings = 0.5 + 0.5 * Math.sin(this.seconds * MOTH.flutter * Math.PI * 2)
      this.tilt = Math.max(-0.5, Math.min(0.5, this.x.v / 400))
      if (!drawn) { this.doing = null; this.progress = 0 }
      return
    }
    // Perched: settled exactly on its place, wings near shut, doing the small things a moth does.
    this.x.x = this.perch.x; this.x.v = 0; this.y.x = this.perch.y; this.y.v = 0
    this.tilt = 0
    if (this.doing && (MOTH.perched as readonly string[]).includes(this.doing)) {
      this.progress += dt / 1.3
      if (this.progress >= 1) { this.doing = null; this.progress = 0; this.wait = this.director.between(MOTH.rest[0], MOTH.rest[1]) }
    } else {
      this.doing = null
      if ((this.wait -= dt) <= 0) { this.lastPerched = this.director.pick(MOTH.perched, this.lastPerched); this.doing = this.lastPerched; this.progress = 0 }
    }
    this.wings = this.doing === 'wing-fan' ? 0.3 + 0.6 * Math.sin(this.progress * Math.PI) : 0.3
  }
}
