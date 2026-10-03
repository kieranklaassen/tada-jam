// template: cartridge/guidance.ts v2
import { TAP_PRESSES } from './config'

// Wordless guidance: show, never tell. When the child has been idle a while,
// whatever can be touched glows; a little later a ghost hand shows one move
// the child could make now. The demonstrations back off and stop after a few,
// the glow fades after the last one, and any touch clears everything at once,
// so an idle game goes quiet instead of nagging.
// The hand shows a move, never a solution: how a thing is picked up or where
// things can go, chosen from what is on screen, and not the answer to the
// task in front of the child.
// Time is the attended clock's seconds, passed in.

export const IDLE_BEFORE_GLOW = 3
export const GLOW_RAMP = 1.2
export const IDLE_BEFORE_DEMO = 5
export const DEMO_SECONDS = 3
export const MAX_DEMOS = 4
/** Seconds the glow takes to fade once the last demonstration is over. */
export const GLOW_FADE = 4

export type Guidance = {
  /** 0..1 strength of the glow on what can be touched. */
  glow: number
  /** 0..1 progress through the demonstration that is playing, or null. */
  demo: number | null
  /** Which demonstration of this idle stretch is playing (0-based), or -1. */
  demoIndex: number
}

export class IdleLadder {
  private idleSince: number
  private readonly guidance: Guidance = { glow: 0, demo: null, demoIndex: -1 }

  constructor(now: number) {
    this.idleSince = now
  }

  /** Any touch takes the ladder back to the bottom. */
  touch(now: number): void {
    this.idleSince = now
  }

  /** Updates and returns the same object every frame. */
  update(now: number): Guidance {
    const idle = now - this.idleSince
    const guidance = this.guidance
    guidance.demo = null
    guidance.demoIndex = -1
    let start = IDLE_BEFORE_DEMO
    let gap = IDLE_BEFORE_DEMO * 2
    let lastEnd = 0
    for (let i = 0; i < MAX_DEMOS; i++) {
      if (idle >= start && idle < start + DEMO_SECONDS) {
        guidance.demo = (idle - start) / DEMO_SECONDS
        guidance.demoIndex = i
      }
      lastEnd = start + DEMO_SECONDS
      start += DEMO_SECONDS + gap
      gap *= 2
    }
    guidance.glow = clamp01((idle - IDLE_BEFORE_GLOW) / GLOW_RAMP) * (1 - clamp01((idle - lastEnd) / GLOW_FADE))
    return guidance
  }
}

export type HandPose = {
  /** 0..1 of the way from where the move starts to where it ends; 0 throughout a tap. */
  travel: number
  /** 0..1 how far the hand is pressed down. */
  press: number
  opacity: number
}

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t))
}

function span(t: number, a: number, b: number): number {
  return clamp01((t - a) / (b - a))
}

/**
 * The ghost hand over one demonstration: it fades in, presses, lifts and fades out. Writes into `out`.
 * A drag is one press that carries. A tap is `presses` presses where it stands: the number config.ts gives
 * the game's band unless the game passes its own. A child may copy two presses as two taps, so wherever the
 * hand shows two, a second tap on the same thing must do no harm.
 */
export function handPose(progress: number, drag: boolean, out: HandPose, presses: 1 | 2 = TAP_PRESSES): HandPose {
  out.opacity = Math.min(span(progress, 0, 0.1), 1 - span(progress, 0.88, 1))
  if (!drag) {
    const bump = (a: number, b: number) => Math.sin(span(progress, a, b) * Math.PI)
    out.travel = 0
    // One press sits in the middle of the stretch that two presses share.
    out.press = presses === 1 ? bump(0.33, 0.53) : Math.max(bump(0.18, 0.38), bump(0.48, 0.68))
    return out
  }
  const t = span(progress, 0.26, 0.72)
  out.travel = t * t * (3 - 2 * t)
  out.press = Math.min(span(progress, 0.14, 0.22), 1 - span(progress, 0.76, 0.84))
  return out
}
