// The crew: two who stand at the foot of the sheet and watch the job. Pure
// numbers, like the chief's (motion.ts): the view turns a pose into a drawing.
//
// - The beaver holds the flag. It cannot look when a vehicle sets off, and
//   looks all the same, through its fingers. Its tempo is quick and it ends
//   every move a little too early.
// - The mole holds the folding rule. It measures everything twice, the second
//   time the other way up, and is never surprised by what it finds. Its tempo
//   is slow and it never does a thing once.
//
// Neither looks at the child or has a view on a move: the beaver winces at
// every crossing, whatever the bridge, and the mole measures whatever was
// laid. Their eyes go where the work is: to the finger's part, to the vehicle
// on the road, to the splash.

export type CrewId = 'beaver' | 'mole'

/** Every channel of a crew member's face and body, each about a rest value of 0. */
export type CrewPose = {
  /** Where the eyes look, each from -1 to 1: across the sheet and up it. */
  lookX: number
  lookY: number
  /** The eyelids: 0 open, 1 shut. */
  lids: number
  /** The brows: -1 pinched and low, 1 lifted. */
  brow: number
  /** The mouth: -1 teeth clenched, 0 a flat line, 1 content. And an open round mouth, 0 to 1. */
  mouth: number
  gape: number
  /** The body: a lean in radians (forward is positive), a sag of the shoulders in cells, and a hop off the floor in cells. */
  lean: number
  sag: number
  hop: number
  /** The arm that holds the flag or the rule: 0 at its side, 1 held right up. */
  raise: number
  /** The free hand over the eyes, 0 to 1. */
  cover: number
  /** Each one's own: the beaver's tail off the floor, the mole's rule turned upright. 0 to 1. */
  own: number
}

export const AT_EASE: CrewPose = { lookX: 0, lookY: 0, lids: 0, brow: 0, mouth: 0, gape: 0, lean: 0, sag: 0, hop: 0, raise: 0, cover: 0, own: 0 }

/** What each does when nothing happens, in seconds. No two of these are the same length. */
export const IDLES = {
  beaver: {
    /** Straightens its flag and looks it over. */
    'flag-check': 2.3,
    /** Slaps its tail on the floor twice, out of nerves. */
    'tail-tap': 1.7,
    /** Chews at nothing, quickly, teeth showing. */
    chew: 2.0,
  },
  mole: {
    /** Measures the air in front of it, then again with the rule upright, and nods. */
    'measure-twice': 4.4,
    /** Takes a long look down at the rule itself, and a second one. */
    'read-rule': 3.6,
    /** Breathes on its spectacles: eyes shut, a slow lean forward and back. Twice. */
    polish: 5.0,
  },
} as const

/** What each does about what happens on the sheet, in seconds. */
export const REACTS = {
  beaver: {
    /** A vehicle has crossed: the hand comes down, the shoulders drop, one flat wave of the flag. */
    relief: 2.6,
    /** A vehicle went in: a start, both eyes covered, one eye out, a long look at the water, and a shrug that is only a sag. */
    flinch: 4.2,
    /** A finger poked it: it jumps and its tail slaps the floor. */
    poked: 1.2,
  },
  mole: {
    /** A part was laid: it holds the rule out toward it, and again upright. */
    laid: 2.4,
    /** A vehicle has crossed: it measures that too, twice, and nods once. */
    crossed: 3.2,
    /** A vehicle went in: water on its spectacles; it blinks twice, then holds the rule up to the splash, and again. */
    splashed: 4.6,
    /** A finger poked it: it lets go of the rule, catches it, and measures it against itself. Twice. */
    poked: 2.2,
  },
} as const

export type BeaverAct = keyof typeof IDLES.beaver | keyof typeof REACTS.beaver
export type MoleAct = keyof typeof IDLES.mole | keyof typeof REACTS.mole
export type CrewAct = BeaverAct | MoleAct | 'rest' | 'brace'

const clamp = (t: number, low = 0, high = 1) => Math.max(low, Math.min(high, t))
/** Rises from 0 to 1 and falls back, smoothly, over the span from a to b. */
const swell = (t: number, a: number, b: number) => Math.sin(Math.PI * clamp((t - a) / (b - a))) ** 2
/** Eases from 0 to 1 over the span from a to b. */
const ease = (t: number, a: number, b: number) => { const u = clamp((t - a) / (b - a)); return u * u * (3 - 2 * u) }
/** Up between a and b, held, and down between c and d. */
const hold = (t: number, a: number, b: number, c: number, d: number) => ease(t, a, b) - ease(t, c, d)

/**
 * The pose of an act at a share `t` of the way through it, 0 to 1. Every act
 * begins and ends at ease. 'brace' is the one act with no end of its own: `t`
 * there is how far into the wince it is, and it stays at 1 for as long as the
 * vehicle is on the road.
 */
export function crewPose(who: CrewId, act: CrewAct, t: number, out: CrewPose = { ...AT_EASE }): CrewPose {
  Object.assign(out, AT_EASE)
  if (who === 'beaver') {
    switch (act as BeaverAct | 'rest' | 'brace') {
      case 'rest': break
      case 'brace':
        // It cannot look: shoulders up, brows pinched, teeth clenched, a hand over its eyes, and one eye not quite shut.
        out.cover = ease(t, 0, 0.7)
        out.brow = -ease(t, 0, 0.5)
        out.mouth = -ease(t, 0.1, 0.6)
        out.lids = 0.55 * ease(t, 0.2, 0.9)
        out.sag = -0.07 * ease(t, 0, 0.6)
        out.lean = -0.1 * ease(t, 0, 0.8)
        out.own = 0.25 * ease(t, 0.3, 1)
        break
      case 'flag-check':
        out.raise = 0.55 * hold(t, 0.05, 0.3, 0.75, 1)
        out.lookY = 0.7 * hold(t, 0.1, 0.3, 0.7, 0.9)
        out.lookX = -0.5 * hold(t, 0.1, 0.3, 0.7, 0.9)
        out.brow = 0.4 * swell(t, 0.3, 0.7)
        break
      case 'tail-tap':
        out.own = swell(t, 0.1, 0.4) + swell(t, 0.45, 0.75)
        out.lookX = -0.6 * hold(t, 0, 0.15, 0.8, 1)
        out.mouth = -0.4 * swell(t, 0.1, 0.8)
        break
      case 'chew':
        out.mouth = -0.8 * Math.abs(Math.sin(t * Math.PI * 9)) * swell(t, 0, 1)
        out.brow = -0.2 * swell(t, 0, 1)
        out.lean = 0.04 * Math.sin(t * Math.PI * 9) * swell(t, 0, 1)
        break
      case 'relief':
        // The breath it was holding: the shoulders drop further than they were, and come back. Then the flag, once.
        out.sag = 0.12 * swell(t, 0.0, 0.45)
        out.gape = 0.7 * swell(t, 0.02, 0.35)
        out.lids = swell(t, 0.05, 0.4)
        out.brow = 0.6 * hold(t, 0.1, 0.3, 0.8, 1)
        out.mouth = 0.6 * hold(t, 0.35, 0.5, 0.85, 1)
        out.raise = swell(t, 0.5, 0.85)
        break
      case 'flinch':
        out.hop = 0.25 * swell(t, 0, 0.14)
        out.cover = hold(t, 0.02, 0.1, 0.5, 0.62)
        // One eye comes out from behind the hand before the hand comes down.
        out.lids = hold(t, 0.02, 0.1, 0.28, 0.36) + 0.5 * hold(t, 0.66, 0.74, 0.9, 1)
        out.brow = -hold(t, 0, 0.08, 0.45, 0.6)
        out.mouth = -hold(t, 0, 0.08, 0.5, 0.62)
        out.lookY = -0.5 * hold(t, 0.34, 0.42, 0.9, 1)
        out.own = swell(t, 0, 0.16)
        // And then nothing: it stands and looks at the water, a little lower than before.
        out.sag = 0.1 * hold(t, 0.6, 0.72, 0.92, 1)
        break
      case 'poked':
        out.hop = 0.3 * swell(t, 0, 0.35)
        out.own = swell(t, 0.05, 0.5)
        out.gape = swell(t, 0, 0.4)
        out.brow = hold(t, 0, 0.1, 0.5, 0.8)
        break
    }
    return out
  }
  switch (act as MoleAct | 'rest' | 'brace') {
    case 'rest': case 'brace': break
    case 'measure-twice':
      // Out level, a look, down. Out again upright, a look, down. A nod.
      out.raise = 0.8 * (hold(t, 0.04, 0.16, 0.34, 0.42) + hold(t, 0.48, 0.6, 0.78, 0.86))
      out.own = hold(t, 0.44, 0.52, 0.86, 0.94)
      out.lean = 0.12 * (swell(t, 0.14, 0.36) + swell(t, 0.58, 0.8))
      out.lookY = 0.3 * (swell(t, 0.14, 0.36) + swell(t, 0.58, 0.8))
      out.sag = 0.05 * swell(t, 0.88, 1)
      break
    case 'read-rule':
      out.lookY = -0.9 * (hold(t, 0.05, 0.15, 0.4, 0.48) + hold(t, 0.55, 0.65, 0.88, 0.96))
      out.lookX = 0.4 * (hold(t, 0.05, 0.15, 0.4, 0.48) + hold(t, 0.55, 0.65, 0.88, 0.96))
      out.raise = 0.3 * hold(t, 0.02, 0.12, 0.9, 1)
      out.brow = 0.5 * swell(t, 0.5, 0.7)
      break
    case 'polish':
      out.lids = hold(t, 0.05, 0.12, 0.42, 0.48) + hold(t, 0.55, 0.62, 0.9, 0.96)
      out.lean = 0.16 * (swell(t, 0.1, 0.44) + swell(t, 0.6, 0.94))
      out.gape = 0.6 * (swell(t, 0.14, 0.3) + swell(t, 0.64, 0.8))
      break
    case 'laid':
      out.raise = hold(t, 0.03, 0.2, 0.36, 0.46) + hold(t, 0.52, 0.68, 0.86, 0.97)
      out.own = hold(t, 0.46, 0.56, 0.9, 0.98)
      out.lean = 0.1 * (swell(t, 0.1, 0.4) + swell(t, 0.6, 0.9))
      break
    case 'crossed':
      out.raise = hold(t, 0.03, 0.15, 0.3, 0.38) + hold(t, 0.42, 0.54, 0.7, 0.78)
      out.own = hold(t, 0.38, 0.46, 0.76, 0.84)
      out.sag = 0.07 * swell(t, 0.82, 1)
      out.mouth = 0.5 * hold(t, 0.78, 0.86, 0.94, 1)
      break
    case 'splashed':
      // Two slow blinks behind wet glass. Then business.
      out.lids = swell(t, 0.03, 0.17) + swell(t, 0.2, 0.34)
      out.brow = 0.3 * hold(t, 0, 0.06, 0.34, 0.4)
      out.raise = hold(t, 0.4, 0.5, 0.62, 0.68) + hold(t, 0.72, 0.82, 0.92, 0.98)
      out.own = hold(t, 0.68, 0.74, 0.94, 0.99)
      out.lean = 0.08 * swell(t, 0.4, 0.98)
      break
    case 'poked':
      out.hop = 0.1 * swell(t, 0, 0.2)
      // The rule goes down out of its paw and comes back; then it is laid along its own arm, and again.
      out.raise = -0.5 * swell(t, 0.02, 0.3) + 0.5 * (hold(t, 0.36, 0.46, 0.58, 0.64) + hold(t, 0.68, 0.78, 0.9, 0.97))
      out.lookY = -0.7 * hold(t, 0.04, 0.14, 0.9, 1)
      out.gape = 0.5 * swell(t, 0, 0.22)
      break
  }
  return out
}

/** How soon the eyes get to where they are going, as a share a second, and how far off a thing is when the eyes are right over at it, in cells. */
const GAZE = { quick: 7, far: 7 } as const

/**
 * Plays one crew member: an idle act, a rest, another, never the same twice
 * running; a reaction takes over at once. While a vehicle is on the road the
 * beaver braces and nothing else. The eyes follow whatever the work is, when
 * the act in hand leaves them free. Time is the attended clock's.
 */
export class CrewDirector {
  act: CrewAct = 'rest'
  private into = 0
  private span: number
  private last: string | null = null
  private bracing = false
  private blinkIn: number
  private blinking = 1
  private eyes: [number, number] = [0, 0]
  readonly pose: CrewPose = { ...AT_EASE }

  /** `head` is where its eyes are on the sheet, in cells: what its gaze is measured from. */
  constructor(readonly who: CrewId, public head: readonly [number, number], private readonly random: () => number) {
    this.span = 1 + 2.5 * random()
    this.blinkIn = 1 + 3 * random()
  }

  /** Something happened on the sheet that this one has a move for. */
  react(what: BeaverAct | MoleAct): void {
    const spans: Record<string, number> = REACTS[this.who]
    if (!(what in spans)) return
    this.bracing = false
    this.act = what
    this.into = 0
    this.span = spans[what]
  }

  /** A vehicle is on the road, or has left it: only the beaver minds. */
  brace(on: boolean): void {
    if (this.who !== 'beaver' || on === this.bracing) return
    this.bracing = on
    this.act = on ? 'brace' : 'rest'
    this.into = 0
    this.span = on ? 0.45 : 0.8
  }

  /** How far through its act it is, 0 to 1. A brace stays at 1. */
  get progress(): number { return clamp(this.into / this.span) }

  /** True while it is doing something about the sheet, and not passing the time. */
  get busy(): boolean { return this.act === 'brace' || this.act in REACTS[this.who] }

  /** One step of time. `work` is where the work is on the sheet now, in cells, or null when there is none to watch. */
  step(dt: number, work: readonly [number, number] | null): CrewPose {
    this.into += dt
    if (this.into >= this.span && this.act !== 'brace') {
      this.into = 0
      if (this.act === 'rest') {
        const all = Object.keys(IDLES[this.who]), choices = all.filter((idle) => idle !== this.last)
        const next = choices[Math.min(choices.length - 1, Math.floor(this.random() * choices.length))]
        this.act = next as CrewAct; this.last = next; this.span = (IDLES[this.who] as Record<string, number>)[next]
      } else {
        this.act = 'rest'
        this.span = (this.who === 'beaver' ? 1.6 : 2.8) + 3 * this.random()
      }
    }
    crewPose(this.who, this.act, this.progress, this.pose)
    // The eyes go to the work, unless the act has them: an act that moves the eyes itself keeps them.
    const want: [number, number] = work ? [clamp((work[0] - this.head[0]) / GAZE.far, -1, 1), clamp((work[1] - this.head[1]) / GAZE.far, -1, 1)] : [0, 0]
    const share = Math.min(1, dt * GAZE.quick)
    this.eyes[0] += (want[0] - this.eyes[0]) * share; this.eyes[1] += (want[1] - this.eyes[1]) * share
    if (this.pose.lookX === 0 && this.pose.lookY === 0) { this.pose.lookX = this.eyes[0]; this.pose.lookY = this.eyes[1] }
    this.blinkIn -= dt
    if (this.blinkIn <= 0) { this.blinking = 0; this.blinkIn = (this.who === 'beaver' ? 1.4 : 3.1) + 3 * this.random() }
    this.blinking = Math.min(1, this.blinking + dt / 0.15)
    this.pose.lids = Math.max(this.pose.lids, Math.sin(Math.PI * this.blinking))
    return this.pose
  }
}

/** How large the crew are drawn: this many cells to one unit of their figures. Large enough for a face to be read across a table. */
export const CREW_SCALE = 1.2
/** How tall and wide each stands, in cells, and how far from its feet its eyes are: what a touch can reach and where its gaze starts. */
export const BUILD: Readonly<Record<CrewId, { tall: number; wide: number; eyes: number }>> = { beaver: { tall: 2.0 * CREW_SCALE, wide: 1.5 * CREW_SCALE, eyes: 1.45 * CREW_SCALE }, mole: { tall: 1.4 * CREW_SCALE, wide: 1.5 * CREW_SCALE, eyes: 1.0 * CREW_SCALE } }
