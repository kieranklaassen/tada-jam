// How the crew chief moves. Pure numbers: the view turns a pose into a
// drawing. The chief is the toy's one character, and it moves like itself:
// a heron is slow, light and all neck, so its tempo is unhurried, nothing
// about it lands heavily, and the funniest part of it is the neck.
//
// It never looks at the child and never approves of a move. It has two
// tastes (vehicles.ts): a triangle, which it taps and listens to, and a shape
// that folds, which stands its feathers on end. When a vehicle goes into the
// water it looks up from its model, at the gap.

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
  /** The lid half down over the eye, 0 to 1: it has seen this before. */
  lid: number
  /** Weight on one leg: -1 on the back leg, 1 on the front. */
  lean: number
  /** The other leg drawn up under the body, 0 to 1. */
  tuck: number
  /** The head turned back into the wing to preen, 0 to 1. */
  preen: number
}

export const STILL: ChiefPose = { neck: 0, tilt: 0, bob: 0, hopX: 0, hopY: 0, crest: 0, peck: 0, blink: 0, lid: 0, lean: 0, tuck: 0, preen: 0 }

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
  /** Something went into the water: it looks up from its model toward the gap, its lid comes half down, it holds, and goes back to its model. */
  'looks-up': 2.9,
} as const
export type React = keyof typeof REACT

/** Poked by a finger, it starts, glances up at nothing and goes back to its model. Seconds. */
export const POKED = 1.3

/**
 * The two showings, each given once: the neat way of a sheet's idea, where it
 * pins a small model together the way that fails and then the way that holds
 * and stands on it; and the one change, where it sets two small models side
 * by side, loads both, swaps one part back and loads them again. Seconds.
 */
export const SHOWING = { shows: 7.5, compares: 9 } as const
export type Showing = keyof typeof SHOWING

export type Act = Idle | React | Showing | 'poked' | 'rest'

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
    case 'shows':
      // Head down, pinning: four pecks for the way that fails; it draws back as that folds; four more for the way that
      // holds; then up onto the model, where it stands and looks down at it.
      out.neck = 0.8 * (ease(t, 0, 0.06) - ease(t, 0.3, 0.36)) + 0.8 * (ease(t, 0.46, 0.52) - ease(t, 0.72, 0.78)) - 0.35 * swell(t, 0.34, 0.46) + 0.35 * swell(t, 0.84, 0.98)
      for (let i = 0; i < 4; i++) out.peck += swell(t, 0.07 + 0.055 * i, 0.12 + 0.055 * i) + swell(t, 0.53 + 0.045 * i, 0.575 + 0.045 * i)
      out.crest = 0.6 * swell(t, 0.34, 0.46)
      out.hopY = 0.3 * swell(t, 0.76, 0.84) + 0.42 * (ease(t, 0.8, 0.84) - ease(t, 0.96, 1))
      out.hopX = -0.9 * (ease(t, 0.76, 0.84) - ease(t, 0.96, 1))
      break
    case 'compares':
      // It looks at one model, then the other, and again: its head goes from side to side. In the middle it swaps a part.
      out.tilt = 0.4 * (swell(t, 0.05, 0.2) - swell(t, 0.2, 0.36)) + 0.4 * (swell(t, 0.62, 0.76) - swell(t, 0.76, 0.92))
      out.neck = 0.5 * (ease(t, 0.02, 0.1) - ease(t, 0.92, 1))
      out.peck = swell(t, 0.42, 0.48) + swell(t, 0.5, 0.56)
      out.lean = 0.8 * (swell(t, 0.05, 0.2) - swell(t, 0.2, 0.36) + swell(t, 0.62, 0.76) - swell(t, 0.76, 0.92))
      break
    case 'poked':
      // A start: the whole bird lifts a little, the head whips up and back, and it blinks it off.
      out.hopY = 0.12 * swell(t, 0, 0.3)
      out.neck = -0.6 * swell(t, 0.02, 0.6)
      out.tilt = -0.3 * swell(t, 0.2, 0.8)
      out.crest = 0.5 * swell(t, 0, 0.5)
      break
    case 'looks-up':
      // The neck comes up straight and a little back, the head goes over to the side of the gap, and the crest lifts and lies down again.
      out.neck = -0.5 * (ease(t, 0, 0.14) - ease(t, 0.72, 1))
      out.tilt = -0.28 * (ease(t, 0.1, 0.24) - ease(t, 0.66, 0.9))
      out.crest = 0.3 * swell(t, 0, 0.45)
      // Having looked, its lid comes half down, and stays there until it has gone back to its model.
      out.lid = ease(t, 0.3, 0.42) - ease(t, 0.85, 0.97)
      break
    case 'feathers-on-end':
      // It steps back to its place by the end: every act ends where it began.
      out.hopX = 0.45 * (ease(t, 0, 0.16) - ease(t, 0.6, 1))
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
  /** The pose of this instant: the view draws from it. */
  readonly pose: ChiefPose = { ...STILL }

  constructor(private readonly random: () => number) {}

  /** The bridge did something the chief has a taste about. */
  react(what: React): void {
    this.act = what
    this.into = 0
    this.span = REACT[what]
  }

  /** One of its two showings begins. */
  showing(what: Showing): void {
    this.act = what
    this.into = 0
    this.span = SHOWING[what]
  }

  /** Whatever it was doing, it stops and stands at rest: a touch ended a showing. */
  rest(): void {
    this.act = 'rest'
    this.into = 0
    this.span = 1.5
  }

  /** A finger poked it. */
  poke(): void {
    this.act = 'poked'
    this.into = 0
    this.span = POKED
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
