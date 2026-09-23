import { suggestColour } from './pattern'

// Wordless guidance for a five-year-old: no text, no voice, no verdicts.
// When the child stops, whatever can be touched breathes with a glow ring,
// then a ghost hand shows one next act chosen from the loom's state: tap the
// yarn ball that would carry the stripe pattern on, or carry the finished
// scarf to the cold animal. Demonstrations back off with doubling gaps and
// stop after four per idle stretch; any touch clears everything at once.

export type LoomSummary = {
  /** The colour each row of the loom's scarf reads as. */
  colours: readonly number[]
  balls: number
  canOffer: boolean
  full: boolean
  /** An animal is standing by the loom. */
  recipient: boolean
  /** A scarf is flying, an animal is walking, or a row is still being knitted. */
  busy: boolean
}

export type Hint = { kind: 'knit'; colour: number } | { kind: 'give' }

export function chooseHint(loom: LoomSummary): Hint | null {
  if (loom.busy) return null
  if (loom.canOffer && loom.recipient) return { kind: 'give' }
  if (loom.full) return null
  return { kind: 'knit', colour: suggestColour(loom.colours, loom.balls) }
}

export const IDLE_BEFORE_GLOW = 3
export const IDLE_BEFORE_DEMO = 5
export const DEMO_SECONDS = 2.8
export const MAX_DEMOS_PER_IDLE = 4
export const FIRST_PEEK_DELAY = 1.2
export const PEEK_SECONDS = 1.4
export const PEEK_EVERY = 6
export const MAX_PEEKS = 3

export type GuidanceFrame = {
  /** 0..1 through the current ghost-hand demonstration, or -1 when none is playing. */
  demo: number
  /** 0..1 breathing strength of the glow on what can be touched now. */
  glow: number
  /** 0..1 through the first-open ball peek, or -1. */
  peek: number
  /** How long the child has been idle, in seconds. */
  idle: number
}

/** When to show guidance. Time is attended seconds; any touch restarts the idle clock. */
export class HintScheduler {
  private idleSince: number
  private everTouched = false
  private readonly openedAt: number
  private readonly starts: number[] = new Array<number>(MAX_DEMOS_PER_IDLE).fill(0)

  constructor(now: number) {
    this.idleSince = now
    this.openedAt = now
    this.plan()
  }

  touch(now: number): void {
    this.idleSince = now
    this.everTouched = true
    this.plan()
  }

  get touched(): boolean {
    return this.everTouched
  }

  /** Demonstrations at 5 s idle, then after gaps of 10, 20 and 40 s. */
  private plan(): void {
    let at = this.idleSince + IDLE_BEFORE_DEMO
    let gap = IDLE_BEFORE_DEMO * 2
    for (let i = 0; i < MAX_DEMOS_PER_IDLE; i++) {
      this.starts[i] = at
      at += DEMO_SECONDS + gap
      gap *= 2
    }
  }

  /** Writes this instant's guidance into `out` (no allocation per frame). */
  frame(now: number, out: GuidanceFrame): GuidanceFrame {
    const idle = now - this.idleSince
    out.idle = idle
    out.glow = idle < IDLE_BEFORE_GLOW ? 0 : Math.max(0, Math.min(1, (idle - IDLE_BEFORE_GLOW) / 1.5) * (0.6 + 0.4 * Math.sin(now * 2.4)))
    out.demo = -1
    for (const start of this.starts) if (now >= start && now < start + DEMO_SECONDS) out.demo = (now - start) / DEMO_SECONDS
    out.peek = -1
    if (!this.everTouched) {
      const since = now - this.openedAt - FIRST_PEEK_DELAY
      if (since >= 0) {
        const cycle = Math.floor(since / PEEK_EVERY)
        const within = since - cycle * PEEK_EVERY
        if (cycle < MAX_PEEKS && within < PEEK_SECONDS) out.peek = within / PEEK_SECONDS
      }
    }
    return out
  }
}

export type Point3 = { x: number; y: number; z: number }
export type HandPose = Point3 & { press: number; opacity: number }

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t))
}

function window01(t: number, start: number, end: number): number {
  return clamp01((t - start) / (end - start))
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

/** The ghost hand through one demonstration: fade in, press (twice for a tap), carry for a drag, lift, fade out. */
export function handPose(out: HandPose, from: Point3, to: Point3 | null, progress: number): HandPose {
  out.opacity = Math.min(window01(progress, 0, 0.12), 1 - window01(progress, 0.86, 1))
  if (!to) {
    const tap = (a: number, b: number) => Math.sin(window01(progress, a, b) * Math.PI)
    out.press = Math.max(tap(0.22, 0.42), tap(0.52, 0.72))
    out.x = from.x
    out.y = from.y
    out.z = from.z
    return out
  }
  out.press = progress < 0.14 ? 0 : progress < 0.22 ? window01(progress, 0.14, 0.22) : progress < 0.72 ? 1 : 1 - window01(progress, 0.72, 0.8)
  const travel = easeInOut(window01(progress, 0.24, 0.7))
  out.x = from.x + (to.x - from.x) * travel
  out.y = from.y + (to.y - from.y) * travel
  out.z = from.z + (to.z - from.z) * travel
  return out
}
