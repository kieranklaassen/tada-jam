import type { Point } from './input'

// Wordless guidance (R10, R11). When the child has been idle for a while the
// thing worth touching next glows; a little later a ghost hand shows the verb
// once (turning that handle part of the way, nudging that platform, tapping
// that tile or the door). It never shows how far. Demonstrations back off
// with doubling gaps and stop after four in one idle stretch; any touch
// makes it all vanish. Until the first touch the wanderer lifts its lantern
// toward the door now and then: the want, shown by the character itself.

export type Timing = { glow: number; demo: number }

/** 7 or unknown: quick help; 8: a little later; 9 and up: time to think first. */
export function timingFor(age: number | null): Timing {
  if (age === null || age <= 7) return { glow: 3, demo: 5 }
  if (age === 8) return { glow: 4, demo: 7 }
  return { glow: 6, demo: 10 }
}

export const DEMO_SECONDS = 2.6
export const MAX_DEMOS = 4
export const INVITE_DELAY = 1.1
export const INVITE_SECONDS = 2.4
export const INVITE_EVERY = 6.5
export const MAX_INVITES = 3

export type GuidanceState = {
  /** 0..1 breathing strength of the glow on the thing worth touching. */
  glow: number
  /** 0..1 progress through a ghost-hand demonstration, or null. */
  demo: number | null
  /** 0..1 progress of the wanderer's lantern invitation, or null. */
  invite: number | null
}

export class HintScheduler {
  private idleSince: number
  private openedAt: number
  private touched = false
  private readonly timing: Timing
  readonly state: GuidanceState = { glow: 0, demo: null, invite: null }

  constructor(now: number, timing: Timing) {
    this.idleSince = now
    this.openedAt = now
    this.timing = timing
  }

  /** The child touched something: guidance vanishes and the idle clock restarts. */
  touch(now: number): void {
    this.idleSince = now
    this.touched = true
  }

  /** The world is busy (walking, settling, travelling): not idle, but not a touch either. */
  hold(now: number): void {
    this.idleSince = now
  }

  /** A new diorama opened: the first-open invitation plays again until the next touch. */
  reopen(now: number): void {
    this.idleSince = now
    this.openedAt = now
    this.touched = false
  }

  idleFor(now: number): number {
    return now - this.idleSince
  }

  update(now: number): GuidanceState {
    const idle = now - this.idleSince
    const { glow, demo } = this.timing
    const rise = Math.min(1, Math.max(0, (idle - glow) / 1.2))
    this.state.glow = rise * (0.62 + 0.38 * Math.sin(now * 2.4))
    this.state.demo = null
    let start = demo
    let gap = demo * 2
    for (let i = 0; i < MAX_DEMOS && start <= idle; i++) {
      if (idle < start + DEMO_SECONDS) this.state.demo = (idle - start) / DEMO_SECONDS
      start += DEMO_SECONDS + gap
      gap *= 2
    }
    this.state.invite = null
    if (!this.touched) {
      const since = now - this.openedAt - INVITE_DELAY
      if (since >= 0) {
        const cycle = Math.floor(since / INVITE_EVERY)
        const within = since - cycle * INVITE_EVERY
        if (cycle < MAX_INVITES && within < INVITE_SECONDS) this.state.invite = within / INVITE_SECONDS
      }
    }
    return this.state
  }
}

/** A demonstration in screen pixels: a tap on one spot, or a press-and-drag along a short path. */
export type DemoPath = { kind: 'tap'; at: Point } | { kind: 'drag'; points: readonly Point[] }

export type HandPose = { x: number; y: number; press: number; opacity: number }

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t))
}

function span(t: number, a: number, b: number): number {
  return clamp01((t - a) / (b - a))
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

/** Where the ghost hand is during a demonstration. Writes into `out` so the frame loop allocates nothing. */
export function handPose(path: DemoPath, progress: number, out: HandPose): HandPose {
  out.opacity = Math.min(span(progress, 0, 0.12), 1 - span(progress, 0.86, 1))
  if (path.kind === 'tap') {
    out.x = path.at.x
    out.y = path.at.y
    const tap = (a: number, b: number) => Math.sin(span(progress, a, b) * Math.PI)
    out.press = Math.max(tap(0.22, 0.42), tap(0.5, 0.7))
    return out
  }
  const points = path.points
  out.press = progress < 0.16 ? 0 : progress < 0.24 ? span(progress, 0.16, 0.24) : progress < 0.74 ? 1 : 1 - span(progress, 0.74, 0.82)
  const travel = smooth(span(progress, 0.26, 0.72)) * (points.length - 1)
  const index = Math.min(points.length - 2, Math.floor(travel))
  const k = travel - index
  out.x = points[index].x + (points[index + 1].x - points[index].x) * k
  out.y = points[index].y + (points[index + 1].y - points[index].y) * k
  return out
}
