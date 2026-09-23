import { TAP_TURN } from './coverage'
import { PIN_HEIGHT, type CardPose } from './projection'

// Wordless guidance for a six-year-old: no text, no voice, no verdicts.
// When the child has been idle for a while, the shapes and the sleeping
// outline breathe, then a paper ghost hand shows one good next move: it
// lifts a see-through copy of a shape and carries it (turning it first if
// that helps), so the copy's pale shadow lands inside the outline. The real
// arrangement never moves on its own. Any touch clears it all at once, and
// demonstrations back off within an idle stretch and stop after four, so an
// idle theatre goes quiet instead of nagging.

export const IDLE_BEFORE_GLOW = 3
export const IDLE_BEFORE_DEMO = 5
/** Pauses between demonstrations in one idle stretch. */
export const DEMO_GAPS = [10, 20, 40] as const
export const DEMO_SECONDS = 3.4
export const MAX_DEMOS = DEMO_GAPS.length + 1
/** First open only: a shape hops so its shadow hops too, before the child has touched anything. */
export const FIRST_INVITE_DELAY = 1.2
export const INVITE_EVERY = 6
export const INVITE_SECONDS = 1.3
export const MAX_INVITES = 3

export type GuidanceState = {
  /** 0..1 progress through the current demonstration, or null when none is playing. */
  demo: number | null
  /** Which demonstration of this idle stretch is playing (0-based), or -1. */
  demoNumber: number
  /** 0..1 strength of the breathing glow on the shapes and the outline. */
  glow: number
  /** 0..1 progress of the first-open invite hop, or null. */
  invite: number | null
}

/** When to show guidance. Time is in seconds of attended play; any touch resets the idle clock. */
export class HintScheduler {
  private idleSince: number
  private everTouched = false
  private readonly openedAt: number
  private readonly starts = new Float64Array(MAX_DEMOS)

  constructor(now: number, everTouched = false) {
    this.idleSince = now
    this.openedAt = now
    this.everTouched = everTouched
    this.plan()
  }

  touch(now: number): void {
    this.idleSince = now
    this.everTouched = true
    this.plan()
  }

  idleFor(now: number): number {
    return now - this.idleSince
  }

  private plan(): void {
    let at = this.idleSince + IDLE_BEFORE_DEMO
    for (let i = 0; i < MAX_DEMOS; i++) {
      this.starts[i] = at
      at += DEMO_SECONDS + (DEMO_GAPS[i] ?? 0)
    }
  }

  /** Writes into `out` (no allocation per frame). */
  state(now: number, out: GuidanceState): GuidanceState {
    const idle = now - this.idleSince
    const rise = Math.min(1, Math.max(0, (idle - IDLE_BEFORE_GLOW) / 1.2))
    out.glow = rise * (0.6 + 0.4 * Math.sin(now * 2.4))
    out.demo = null
    out.demoNumber = -1
    for (let i = 0; i < MAX_DEMOS; i++) {
      const start = this.starts[i]
      if (now >= start && now < start + DEMO_SECONDS) {
        out.demo = (now - start) / DEMO_SECONDS
        out.demoNumber = i
      }
    }
    out.invite = null
    if (!this.everTouched) {
      const since = now - this.openedAt - FIRST_INVITE_DELAY
      if (since >= 0) {
        const cycle = Math.floor(since / INVITE_EVERY)
        const within = since - cycle * INVITE_EVERY
        if (cycle < MAX_INVITES && within < INVITE_SECONDS) out.invite = within / INVITE_SECONDS
      }
    }
    return out
  }
}

/** One demonstrated move: shape `index` goes from `from` to `to`, turning by `turn` (one or two taps) first. */
export type Demo = { index: number; from: CardPose; to: CardPose; turn: number }

export type DemoPose = {
  /** The ghost hand's fingertip in the world (cm). */
  hand: { x: number; y: number; z: number }
  /** 0 hovering .. 1 pressed. */
  press: number
  opacity: number
  /** Where the see-through copy of the shape is, or null before it appears. */
  ghost: CardPose
  ghostOpacity: number
}

function ease(t: number): number {
  const k = Math.min(1, Math.max(0, t))
  return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2
}

function window01(t: number, start: number, end: number): number {
  return Math.min(1, Math.max(0, (t - start) / (end - start)))
}

/** Where the fingertip grips a card: a little above its pin. */
export const GRIP_HEIGHT = 3

const TAP_SPAN = 0.12

/**
 * The ghost hand over one demonstration: fade in over the shape, tap it once
 * per turn step (if the move turns), press, carry, lift, fade out. Writes
 * into `out`.
 */
export function demoPose(demo: Demo, progress: number, out: DemoPose): DemoPose {
  const taps = Math.round(Math.abs(demo.turn) / TAP_TURN)
  const fadeIn = window01(progress, 0, 0.1)
  const fadeOut = 1 - window01(progress, 0.9, 1)
  out.opacity = Math.min(fadeIn, fadeOut)
  const tapEnd = taps > 0 ? 0.16 + taps * TAP_SPAN : 0.1
  let tap = 0
  let turned = 0
  for (let k = 0; k < taps; k++) {
    const start = 0.12 + k * TAP_SPAN
    tap = Math.max(tap, Math.sin(window01(progress, start, start + 0.1) * Math.PI))
    turned += ease(window01(progress, start + 0.06, start + TAP_SPAN)) / taps
  }
  const grip = window01(progress, tapEnd + 0.02, tapEnd + 0.1)
  const release = window01(progress, 0.78, 0.86)
  out.press = Math.max(tap, grip * (1 - release))
  const travel = ease(window01(progress, tapEnd + 0.1, 0.78))
  out.ghost.x = demo.from.x + (demo.to.x - demo.from.x) * travel
  out.ghost.z = demo.from.z + (demo.to.z - demo.from.z) * travel
  out.ghost.angle = demo.from.angle + demo.turn * turned
  out.ghost.yaw = 0
  out.ghost.lift = Math.sin(travel * Math.PI) * 1.4 + grip * (1 - release) * 0.6
  out.ghostOpacity = out.opacity * Math.max(taps > 0 ? Math.min(1, turned * 2) : 0, grip)
  out.hand.x = out.ghost.x
  // The hand reaches up from the child's side, so it never covers the screen the move is about.
  out.hand.y = PIN_HEIGHT + GRIP_HEIGHT + out.ghost.lift - (1 - out.press) * 1.6
  out.hand.z = out.ghost.z + 0.6
  return out
}

export function blankDemoPose(): DemoPose {
  return { hand: { x: 0, y: 0, z: 0 }, press: 0, opacity: 0, ghost: { x: 0, z: 0, angle: 0, yaw: 0, lift: 0 }, ghostOpacity: 0 }
}
