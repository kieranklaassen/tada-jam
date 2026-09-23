import type { Point } from './layout'

// Wordless guidance for a four-year-old: no text, no voice, no verdicts.
// When the child has been idle a while, one sleepy animal gets a breathing
// painted ring, the animals stop and look toward their homes, and then a
// ghost hand presses that one animal and carries it part of the way home:
// it shows the move (pick up, carry), never the whole answer. Demos back off
// and stop after a few, then the ring fades and the forest goes back to its
// evening; any touch clears everything at once. On first open, before any
// touch, one animal yawns a big invitation at the child.

export const IDLE_BEFORE_GLOW = 3
export const IDLE_BEFORE_HINT = 5
export const DEMO_SECONDS = 3
export const MAX_DEMOS_PER_IDLE = 4
/** How long the ring keeps breathing after the last demonstration before it fades. */
export const GLOW_AFTER_LAST_DEMO = 4
export const FIRST_INVITE_DELAY = 1.2
export const INVITE_EVERY = 6
export const MAX_INVITES = 3
/** How far toward its home the ghost hand carries the animal. */
export const DEMO_REACH = 0.55

export type HintCandidate = { index: number; x: number; z: number; homeX: number; homeZ: number }

/**
 * Which awake animal to show: the one nearest its home, so the carry the
 * ghost hand shows is short and readable. Returns -1 when nobody is free.
 */
export function chooseHint(candidates: readonly HintCandidate[], count: number): number {
  let best = -1
  let bestDistance = Infinity
  for (let i = 0; i < count; i++) {
    const c = candidates[i]
    const d = Math.hypot(c.homeX - c.x, c.homeZ - c.z)
    if (d < bestDistance) {
      best = c.index
      bestDistance = d
    }
  }
  return best
}

export type GuidanceTiming = {
  /** 0..1 progress through the current demonstration, or -1 when none is playing. */
  demo: number
  /** 0..1 strength of the breathing ring and the homeward gaze. */
  glow: number
  /** True on frames when a first-open invitation should start. */
  invite: boolean
}

export class HintScheduler {
  private idleSince: number
  private everTouched = false
  private readonly openedAt: number
  private invitesStarted = 0
  readonly timing: GuidanceTiming = { demo: -1, glow: 0, invite: false }

  constructor(now: number) {
    this.idleSince = now
    this.openedAt = now
  }

  touch(now: number): void {
    this.idleSince = now
    this.everTouched = true
  }

  get touched(): boolean {
    return this.everTouched
  }

  /** Guidance for this frame. `quiet` (night, nothing to do) turns it all off and holds the idle clock. */
  update(now: number, quiet: boolean): GuidanceTiming {
    const timing = this.timing
    timing.invite = false
    if (quiet) {
      this.idleSince = now
      timing.demo = -1
      timing.glow = 0
      return timing
    }
    const idle = now - this.idleSince
    timing.glow = idle < IDLE_BEFORE_GLOW ? 0 : Math.min(1, (idle - IDLE_BEFORE_GLOW) / 1.5) * (0.6 + 0.4 * Math.sin(now * 2.4))
    timing.demo = -1
    let start = this.idleSince + IDLE_BEFORE_HINT
    let gap = IDLE_BEFORE_HINT * 2
    let lastEnd = start
    for (let i = 0; i < MAX_DEMOS_PER_IDLE; i++) {
      if (now >= start && now < start + DEMO_SECONDS) timing.demo = (now - start) / DEMO_SECONDS
      lastEnd = start + DEMO_SECONDS
      start += DEMO_SECONDS + gap
      gap *= 2
    }
    // After the last demonstration the ring fades and the animals go back to their evening until the next touch.
    timing.glow *= 1 - Math.min(1, Math.max(0, (now - lastEnd - GLOW_AFTER_LAST_DEMO) / 2))
    if (!this.everTouched && this.invitesStarted < MAX_INVITES) {
      const due = this.openedAt + FIRST_INVITE_DELAY + this.invitesStarted * INVITE_EVERY
      if (now >= due) {
        this.invitesStarted += 1
        timing.invite = true
      }
    }
    return timing
  }
}

export type HandPose = { x: number; z: number; press: number; opacity: number }

function window01(t: number, start: number, end: number): number {
  return Math.min(1, Math.max(0, (t - start) / (end - start)))
}

function ease(t: number): number {
  const k = Math.min(1, Math.max(0, t))
  return k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
}

/** The ghost hand over one demonstration: fade in, press, carry part of the way, lift, fade out. */
export function handPose(from: Point, home: Point, progress: number, out: HandPose): HandPose {
  const fadeIn = window01(progress, 0, 0.12)
  const fadeOut = 1 - window01(progress, 0.86, 1)
  out.opacity = Math.min(fadeIn, fadeOut)
  out.press = progress < 0.14 ? 0 : progress < 0.24 ? window01(progress, 0.14, 0.24) : progress < 0.74 ? 1 : 1 - window01(progress, 0.74, 0.84)
  const travel = ease(window01(progress, 0.28, 0.72)) * DEMO_REACH
  out.x = from.x + (home.x - from.x) * travel
  out.z = from.z + (home.z - from.z) * travel
  return out
}
