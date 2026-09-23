import { PADS, partnerPad } from './layout'

// Wordless guidance for a four-year-old: show, never tell. When the child
// has been idle a while, the frogs' pads breathe with a glow; a little
// later a ghost hand shows one next act, chosen from the pond as it is.
// First it taps a frog (they sing when touched). Once the child has tapped,
// it drags a frog to the other pad in its column instead (moving a frog
// changes its note). Demonstrations back off and stop after a few, the glow
// fades after the last one, and any touch clears everything at once, so an
// idle pond goes quiet instead of nagging: only the firefly's song goes on.
// Before the very first touch, the frog nearest the child puffs
// its throat and bounces toward them, at most three times.

export const IDLE_BEFORE_GLOW = 3
export const GLOW_RAMP = 1.2
export const IDLE_BEFORE_DEMO = 5
export const DEMO_SECONDS = 3.2
export const MAX_DEMOS = 4
/** Seconds the glow takes to fade once the last demonstration is over. */
export const GLOW_FADE = 4
export const INVITE_DELAY = 1.2
export const INVITE_SECONDS = 1.4
export const INVITE_EVERY = 6
export const MAX_INVITES = 3

export type HintKind = 'tapFrog' | 'dragFrog'

export type Hint = { kind: HintKind; frog: number; fromPad: number; toPad: number | null }

export type PondSummary = {
  /** Pad per frog; null while a frog is lifted or hopping. */
  frogs: readonly (number | null)[]
  everTapped: boolean
}

function nearestFirst(frogs: readonly (number | null)[]): number[] {
  const seated = frogs.flatMap((pad, frog) => (pad === null ? [] : [frog]))
  return seated.sort((a, b) => PADS[frogs[b]!].z - PADS[frogs[a]!].z || PADS[frogs[a]!].x - PADS[frogs[b]!].x)
}

/** The frog nearest the child: the one that invites on first open and is tapped in the first demonstration. */
export function nearestFrog(frogs: readonly (number | null)[]): number | null {
  return nearestFirst(frogs)[0] ?? null
}

/** One next act worth showing. `demo` rotates the drag demonstration between frogs across demonstrations. */
export function chooseHint(pond: PondSummary, demo: number): Hint | null {
  const order = nearestFirst(pond.frogs)
  if (order.length === 0) return null
  if (!pond.everTapped) {
    const frog = order[0]
    return { kind: 'tapFrog', frog, fromPad: pond.frogs[frog]!, toPad: null }
  }
  const movable = order.filter((frog) => !pond.frogs.includes(partnerPad(pond.frogs[frog]!).index))
  if (movable.length === 0) {
    const frog = order[demo % order.length]
    return { kind: 'tapFrog', frog, fromPad: pond.frogs[frog]!, toPad: null }
  }
  const frog = movable[demo % movable.length]
  const fromPad = pond.frogs[frog]!
  return { kind: 'dragFrog', frog, fromPad, toPad: partnerPad(fromPad).index }
}

export type GuidanceTiming = {
  /** 0..1 progress through the current demonstration, or null. */
  demo: number | null
  /** Which demonstration of this idle stretch is playing (0-based), or -1. */
  demoIndex: number
  /** 0..1 strength of the breathing glow on what can be touched. */
  glow: number
  /** 0..1 progress of the first-open invitation, or null. */
  invite: number | null
}

/** When to show guidance, in seconds of attended time. Any touch restarts the idle clock. */
export class HintScheduler {
  private idleSince: number
  private readonly openedAt: number
  private touched = false
  readonly timing: GuidanceTiming = { demo: null, demoIndex: -1, glow: 0, invite: null }

  constructor(now: number) {
    this.idleSince = now
    this.openedAt = now
  }

  get everTouched(): boolean {
    return this.touched
  }

  touch(now: number): void {
    this.idleSince = now
    this.touched = true
  }

  /** Updates and returns `timing` in place. */
  update(now: number): GuidanceTiming {
    const idle = now - this.idleSince
    const timing = this.timing
    timing.demo = null
    timing.demoIndex = -1
    let start = IDLE_BEFORE_DEMO
    let gap = IDLE_BEFORE_DEMO * 2
    let lastEnd = 0
    for (let i = 0; i < MAX_DEMOS; i++) {
      if (idle >= start && idle < start + DEMO_SECONDS) {
        timing.demo = (idle - start) / DEMO_SECONDS
        timing.demoIndex = i
      }
      lastEnd = start + DEMO_SECONDS
      start += DEMO_SECONDS + gap
      gap *= 2
    }
    const ramp = clamp01((idle - IDLE_BEFORE_GLOW) / GLOW_RAMP) * (1 - clamp01((idle - lastEnd) / GLOW_FADE))
    timing.glow = ramp * (0.62 + 0.38 * Math.sin(now * 2.4))
    timing.invite = null
    if (!this.touched) {
      const since = now - this.openedAt - INVITE_DELAY
      if (since >= 0) {
        const cycle = Math.floor(since / INVITE_EVERY)
        const within = since - cycle * INVITE_EVERY
        if (cycle < MAX_INVITES && within < INVITE_SECONDS && timing.demo === null) timing.invite = within / INVITE_SECONDS
      }
    }
    return timing
  }
}

export type HandPose = { x: number; z: number; press: number; opacity: number; carry: boolean }

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t))
}

function span(t: number, a: number, b: number): number {
  return clamp01((t - a) / (b - a))
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

/** The ghost hand during one demonstration. Writes into `out`. */
export function handPose(hint: Hint, progress: number, out: HandPose): HandPose {
  const from = PADS[hint.fromPad]
  out.opacity = Math.min(span(progress, 0, 0.1), 1 - span(progress, 0.88, 1))
  if (hint.toPad === null) {
    const bump = (a: number, b: number) => Math.sin(span(progress, a, b) * Math.PI)
    out.x = from.x
    out.z = from.z
    out.press = Math.max(bump(0.18, 0.38), bump(0.48, 0.68))
    out.carry = false
    return out
  }
  const to = PADS[hint.toPad]
  const travel = smooth(span(progress, 0.26, 0.72))
  out.x = from.x + (to.x - from.x) * travel
  out.z = from.z + (to.z - from.z) * travel
  out.press = progress < 0.14 ? 0 : progress < 0.22 ? span(progress, 0.14, 0.22) : progress < 0.76 ? 1 : 1 - span(progress, 0.76, 0.84)
  out.carry = progress >= 0.2 && progress < 0.8
  return out
}
