// How the crew chief moves. Pure numbers: the view turns a pose into a
// drawing. The chief is the toy's one character, and it moves like itself:
// a heron is slow, light and all neck, so its tempo is unhurried, nothing
// about it lands heavily, and the funniest part of it is the neck.
//
// It never looks at the child and never approves of a move. It has two
// tastes (vehicles.ts): a triangle, which it taps and listens to, and a shape
// that folds, which stands its feathers on end.

/** Every channel of the chief's body, each about a rest value of 0. */
export type ChiefPose = {
  /** The neck's reach forward and down toward its model: 0 upright, 1 right down at it, negative drawn back. */
  neck: number
  /** The head on one side, in radians. */
  tilt: number
  /** The body's rise and fall, in cells. */
  bob: number
  /** A hop back from where it stands, in cells: x is away from the gap, y is up. */
  hopX: number
  hopY: number
  /** The crest and body feathers standing up, 0 to 1. */
  crest: number
  /** The beak's tap downward, 0 to 1. */
  peck: number
  /** The eye closed, 0 to 1. */
  blink: number
  /** Weight on one leg: -1 on the back leg, 1 on the front. */
  lean: number
  /** The other leg drawn up under the body, 0 to 1. */
  tuck: number
  /** The head turned back into the wing to preen, 0 to 1. */
  preen: number
}

export const STILL: ChiefPose = { neck: 0, tilt: 0, bob: 0, hopX: 0, hopY: 0, crest: 0, peck: 0, blink: 0, lean: 0, tuck: 0, preen: 0 }

/** What it does when nothing happens, each with its own length in seconds and its own part of the body. */
export const IDLE = {
  /** Reaches down and peers at its model, head on one side. */
  peer: 2.6,
  /** Turns its head back and runs its beak through a wing. */
  preen: 3.2,
  /** Shifts its weight from one leg to the other and back. */
  shift: 2.2,
  /** Draws one leg up and stands on the other, as herons do, wobbling a little. */
  'one-leg': 4.2,
  /** Nudges its model once with the tip of its beak. */
  fiddle: 1.8,
} as const
export type Idle = keyof typeof IDLE

/** What it does about the bridge, each longer than a glance and shorter than a scene. */
export const REACT = {
  /** A triangle: three taps of the beak, one on each side, then it listens with its head on one side. */
  'taps-and-listens': 2.4,
  /** A shape that folds: it hops back with its crest and feathers on end, and settles. */
  'feathers-on-end': 1.9,
} as const
export type React = keyof typeof REACT

export type Act = Idle | React | 'rest'

const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
/** Rises from 0 to 1 and falls back, smoothly, over the span from a to b. */
const swell = (t: number, a: number, b: number) => Math.sin(Math.PI * clamp01((t - a) / (b - a))) ** 2
/** Eases from 0 to 1 over the span from a to b, with a little anticipation the other way first. */
const ease = (t: number, a: number, b: number) => { const u = clamp01((t - a) / (b - a)); return u * u * (3 - 2 * u) }

/** The pose of an act at a share `t` of the way through it, 0 to 1. Every act begins and ends at rest. */
export function poseOf(act: Act, t: number, out: ChiefPose = { ...STILL }): ChiefPose {
  Object.assign(out, STILL)
  switch (act) {
    case 'rest': break
    case 'peer':
      // It draws its neck back a little first, then reaches down and holds, head tilting once it is there.
      out.neck = -0.12 * swell(t, 0, 0.18) + 0.85 * (ease(t, 0.12, 0.4) - ease(t, 0.78, 1))
      out.tilt = 0.35 * swell(t, 0.38, 0.8)
      break
    case 'preen':
      out.preen = ease(t, 0.05, 0.3) - ease(t, 0.8, 1)
      // Three short strokes of the beak through the feathers.
      out.peck = 0.5 * (swell(t, 0.32, 0.44) + swell(t, 0.46, 0.58) + swell(t, 0.6, 0.72))
      out.crest = 0.25 * swell(t, 0.3, 0.8)
      break
    case 'shift':
      out.lean = Math.sin(2 * Math.PI * t) * swell(t, 0, 1)
      out.bob = -0.04 * Math.abs(Math.sin(2 * Math.PI * t))
      break
    case 'one-leg': {
      const up = ease(t, 0.08, 0.28) - ease(t, 0.84, 1)
      out.tuck = up
      out.lean = -0.6 * up
      // It wobbles while it stands, and nearly loses it once.
      out.tilt = 0.06 * up * Math.sin(2 * Math.PI * 5 * t) + 0.22 * swell(t, 0.52, 0.66)
      out.neck = -0.2 * swell(t, 0.52, 0.7)
      break
    }
    case 'fiddle':
      out.neck = 0.7 * (ease(t, 0.05, 0.4) - ease(t, 0.7, 1))
      out.peck = swell(t, 0.42, 0.6)
      break
    case 'taps-and-listens':
      out.neck = 0.9 * (ease(t, 0, 0.14) - ease(t, 0.86, 1))
      out.peck = swell(t, 0.14, 0.24) + swell(t, 0.26, 0.36) + swell(t, 0.38, 0.48)
      // Then it holds still with its head well over to one side, listening.
      out.tilt = 0.55 * (ease(t, 0.5, 0.6) - ease(t, 0.84, 0.96))
      break
    case 'feathers-on-end':
      out.hopX = 0.45 * (ease(t, 0, 0.16) - 0.6 * ease(t, 0.6, 1))
      out.hopY = 0.35 * swell(t, 0, 0.26)
      out.crest = ease(t, 0, 0.1) - ease(t, 0.5, 1)
      out.neck = -0.45 * (ease(t, 0, 0.12) - ease(t, 0.55, 1))
      out.bob = -0.06 * swell(t, 0.22, 0.4)
      break
  }
  return out
}

/**
 * Picks what the chief does next and plays it: an idle act, then a rest of a
 * few seconds, then another, never the same twice running. A reaction to the
 * bridge takes over at once from whatever it was doing. The blink runs on its
 * own clock. Time is the attended clock's, passed in as steps.
 */
export class ChiefDirector {
  act: Act = 'rest'
  private into = 0
  private span = 1.2
  private last: Idle | null = null
  private blinkIn = 2
  private blinking = 1
  private readonly pose: ChiefPose = { ...STILL }

  constructor(private readonly random: () => number) {}

  /** The bridge did something the chief has a taste about. */
  react(what: React): void {
    this.act = what
    this.into = 0
    this.span = REACT[what]
  }

  /** How far through its act it is, 0 to 1. */
  get progress(): number {
    return clamp01(this.into / this.span)
  }

  step(dt: number): ChiefPose {
    this.into += dt
    if (this.into >= this.span) {
      this.into = 0
      if (this.act === 'rest') {
        const choices = (Object.keys(IDLE) as Idle[]).filter((idle) => idle !== this.last)
        const next = choices[Math.min(choices.length - 1, Math.floor(this.random() * choices.length))]
        this.act = next; this.last = next; this.span = IDLE[next]
      } else {
        this.act = 'rest'
        this.span = 1.4 + 2.4 * this.random()
      }
    }
    poseOf(this.act, this.progress, this.pose)
    // It breathes all the time, slowly.
    this.pose.bob += 0.012 * Math.sin(this.breath += dt * 1.9)
    this.blinkIn -= dt
    if (this.blinkIn <= 0) { this.blinking = 0; this.blinkIn = 2.2 + 3.5 * this.random() }
    this.blinking = Math.min(1, this.blinking + dt / 0.16)
    this.pose.blink = Math.sin(Math.PI * this.blinking)
    return this.pose
  }

  private breath = 0
}

/** The slow drift of the water's dashes, in cells: each row slides at its own pace and comes round again. */
export const waterDrift = (seconds: number, row: number): number => ((seconds * (0.11 + 0.05 * row)) % 1.6) * (row % 2 ? -1 : 1)

/** The loose end of the string on the spool, swaying: an angle in radians. */
export const stringSway = (seconds: number): number => 0.22 * Math.sin(seconds * 1.3) + 0.07 * Math.sin(seconds * 3.1 + 1)
