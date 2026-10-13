import { BLUE, GREEN, RED, WHITE, YELLOW, type Colour } from './board'
import { BEAT } from './beam'
import { CATCH } from './fallers'
import type { Cue } from './voices'

// How the two large watchers move. Each has its own tempo, weight and
// funniest part: the spider is light and springy and acts with its thread,
// its feet and its two big eyes; the gecko is still for long stretches and
// then snaps, and acts with its tail, its tongue and its grip on the wall.
// No two acts share a curve. An act is a name, a length and the beats at
// which something is heard; its pose is a pure function of the time inside
// it, so a sound falls on the frame in which its motion is seen. Numbers
// only: the view turns a pose into lines.

export type Beat = { at: number; cue: Cue }
export type ActSpec = { length: number; beats: readonly Beat[] }

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const smooth = (t: number) => t * t * (3 - 2 * t)
/** Up to 1 and back down, over the stretch from `a` to `b`. */
const bump = (t: number, a: number, b: number) => Math.sin(span(t, a, b) * Math.PI)

// --- The spider --------------------------------------------------------------

export type SpiderAct = 'drum' | 'dream' | 'double' | 'bounce' | 'dazzle' | 'yoyo' | 'conduct' | 'ride' | 'pluck' | 'wind' | 'blink'

/** When each of the four drumming feet comes down, in seconds into the act. */
export const DRUM_HITS = [0.12, 0.27, 0.42, 0.57, 0.8, 0.95] as const
/** When the yo-yo reaches the end of its thread. */
export const YOYO_BOTTOM = 0.3
/** When the bouncing spider is lowest. */
export const BOUNCE_BOTTOMS = [0.15, 0.55, 0.9] as const
/**
 * The trapped beam: the spider conducts for this long, a foot down on every step the beam takes. The act
 * begins on a step of the beam, so its feet come down at whole beats of it; the game keeps the act's time on
 * the beam's and gives the tap in the very step the beam takes.
 */
export const CONDUCT_FOR = 6.1
export const CONDUCT_BEATS = Array.from({ length: Math.floor((CONDUCT_FOR - 0.3) / BEAT) }, (_, n) => (n + 1) * BEAT)
/** The clatter: how far down its thread the spider rides to watch, and for how long. */
export const RIDE_DROP = 120
export const RIDE_FOR = 4.6

export const SPIDER_ACTS: Record<SpiderAct, ActSpec> = {
  drum: { length: 1.25, beats: DRUM_HITS.map((at, n) => ({ at, cue: { name: 'drum', n: n % 4 } })) },
  dream: { length: 2.6, beats: [{ at: 0, cue: { name: 'spiderTaste', colour: BLUE } }] },
  double: { length: 1.7, beats: [{ at: 0, cue: { name: 'spiderTaste', colour: YELLOW } }] },
  bounce: { length: 1.3, beats: BOUNCE_BOTTOMS.map((at) => ({ at, cue: { name: 'spiderTaste', colour: GREEN } })) },
  dazzle: { length: 1.9, beats: [{ at: 0, cue: { name: 'spiderTaste', colour: WHITE } }] },
  yoyo: { length: 1.6, beats: [{ at: 0, cue: { name: 'boing' } }, { at: YOYO_BOTTOM, cue: { name: 'twang' } }] },
  // The two scenes. It conducts the trapped beam with its two front feet, one down on each beat, and rides its thread down to watch the pegs fall.
  conduct: { length: CONDUCT_FOR, beats: [] },
  ride: { length: RIDE_FOR, beats: [] },
  // What it does by itself. Idle acts are quiet: nothing beckons.
  pluck: { length: 0.95, beats: [] },
  wind: { length: 2.2, beats: [] },
  blink: { length: 0.3, beats: [] },
}

export const SPIDER_TASTE: Record<Colour, SpiderAct> = { [RED]: 'drum', [BLUE]: 'dream', [YELLOW]: 'double', [GREEN]: 'bounce', [WHITE]: 'dazzle' }
export const SPIDER_IDLE: readonly SpiderAct[] = ['pluck', 'wind', 'blink']

export type SpiderPose = {
  /** How far below its resting place it hangs, in stage units. */
  drop: number
  /** The swing of its thread about the anchor, in radians. */
  swing: number
  /** 0 round; above 0 flattened, below 0 stretched. */
  squash: number
  /** 0 eyes where they belong, 1 drifted apart. */
  eyeSpread: number
  /** 0 open, 1 shut. */
  lids: number
  /** 0 to 1: the two front feet over the eyes. */
  cover: number
  /** How high each of four feet is lifted, 0 on the web. */
  feet: [number, number, number, number]
  /** A shake of the head, in radians. */
  shake: number
  /** 0 to 1: how far the strand under its foot is pulled. */
  strand: number
}

export function spiderPose(act: SpiderAct | null, t: number, out: SpiderPose): SpiderPose {
  out.drop = 0; out.swing = 0; out.squash = 0; out.eyeSpread = 0; out.lids = 0; out.cover = 0; out.shake = 0; out.strand = 0
  out.feet[0] = out.feet[1] = out.feet[2] = out.feet[3] = 0
  switch (act) {
    case 'drum':
      // Each foot lifts before its hit and is down on it, so the web is struck on the beat.
      DRUM_HITS.forEach((hit, n) => { out.feet[n % 4] = Math.max(out.feet[n % 4], bump(t, hit - 0.11, hit) * (t <= hit ? 1 : 0)) })
      out.squash = 0.1 * Math.max(...DRUM_HITS.map((hit) => bump(t, hit, hit + 0.1)))
      out.strand = Math.max(...DRUM_HITS.map((hit) => bump(t, hit, hit + 0.12)))
      break
    case 'dream':
      // A slow swing, small enough that the body stays well inside its own place; the legs are drawn in on the side it swings to.
      out.swing = 0.16 * Math.sin(t * 2.6) * bump(t, 0, 2.6)
      out.lids = 0.65 * smooth(Math.min(span(t, 0, 0.5), 1 - span(t, 2.1, 2.6)))
      break
    case 'double':
      out.eyeSpread = smooth(Math.min(span(t, 0, 0.35), 1 - span(t, 0.9, 1.1)))
      out.shake = 0.3 * Math.sin((t - 1.1) * 26) * bump(t, 1.1, 1.6)
      break
    case 'bounce': {
      // Three bounces on the thread, each smaller, lowest on its beat.
      const sizes = [34, 22, 12]
      BOUNCE_BOTTOMS.forEach((bottom, n) => { out.drop += sizes[n] * bump(t, bottom - 0.15, bottom + 0.15) })
      out.squash = -0.12 * bump(t, 0, 0.3) + 0.14 * Math.max(...BOUNCE_BOTTOMS.map((bottom) => bump(t, bottom - 0.05, bottom + 0.1)))
      break
    }
    case 'dazzle':
      // Covered at once, a peek, covered again, then slowly uncovered.
      out.cover = Math.min(span(t, 0, 0.12), 1 - span(t, 1.5, 1.9)) * (1 - 0.45 * bump(t, 0.8, 1.15))
      out.squash = 0.12 * bump(t, 0, 0.3)
      break
    case 'yoyo':
      // Falls fast, snaps at the bottom, climbs back hand over hand.
      out.drop = t < YOYO_BOTTOM ? 170 * (t / YOYO_BOTTOM) ** 2 : 170 * (1 - smooth(span(t, YOYO_BOTTOM + 0.12, 1.6))) + 6 * Math.sin(t * 30) * span(t, 0.5, 0.7) * (1 - span(t, 1.3, 1.6))
      out.squash = -0.25 * bump(t, 0, YOYO_BOTTOM) + 0.3 * bump(t, YOYO_BOTTOM, YOYO_BOTTOM + 0.18)
      out.eyeSpread = 0.4 * bump(t, YOYO_BOTTOM, 0.9)
      break
    case 'conduct': {
      // The two front feet in turn: each is high just before its beat and down on it. It sways with the bar.
      const live = Math.min(span(t, 0, 0.2), 1 - span(t, CONDUCT_FOR - 0.3, CONDUCT_FOR))
      CONDUCT_BEATS.forEach((at, n) => { out.feet[n % 2] = Math.max(out.feet[n % 2], 2.2 * live * bump(t, at - BEAT * 0.9, at) * (t <= at ? 1 : 0)) })
      out.swing = 0.03 * live * Math.sin((t / (BEAT * 2)) * Math.PI)
      out.eyeSpread = 0.25 * live
      break
    }
    case 'ride':
      // Down the thread, a long look, and back up hand over hand.
      out.drop = RIDE_DROP * smooth(Math.min(span(t, 0, 0.5), 1 - span(t, RIDE_FOR - 1.1, RIDE_FOR)))
      out.eyeSpread = 0.5 * bump(t, 0.3, RIDE_FOR - 0.8)
      // It leans out towards the board, and back, and out again, to see the pegs go by.
      out.swing = (0.03 + 0.03 * Math.sin(t * 2.1)) * bump(t, 0.3, RIDE_FOR - 0.6)
      break
    case 'pluck':
      out.feet[0] = bump(t, 0, 0.3)
      out.strand = bump(t, 0.25, 0.4) * (1 - span(t, 0.4, 0.9)) + 0.35 * Math.sin(t * 60) * bump(t, 0.4, 0.9)
      break
    case 'wind':
      out.drop = 22 * smooth(Math.min(span(t, 0, 0.9), 1 - span(t, 1.3, 2.2)))
      break
    case 'blink':
      out.lids = bump(t, 0, 0.3)
      break
    case null:
      break
  }
  return out
}

// --- The gecko ---------------------------------------------------------------

export type GeckoAct = 'bask' | 'shiver' | 'lick' | 'wag' | 'fright' | 'chirp' | 'roll' | 'flick' | 'blinkLeft' | 'blinkRight' | 'curl'

/** When the frightened gecko lets go of the wall, and when its mouth opens for each chirp: the first as the finger lands. */
export const FRIGHT_SLIP = 0.16
export const CHIRPS = [0, 0.22, 0.44] as const
/** When the tongue reaches the eye. */
export const LICK_TOUCH = 0.3
/** How far the frightened gecko slides: short of the loudspeaker under its tail. */
export const FRIGHT_SLIDE = 40
/** The trapped beam: its eyes roll round for this long. */
export const ROLL_FOR = 5.9
/** The clatter: the peg it catches lands on its nose at `CATCH.fly` and is flicked off after `CATCH.sit`. */
export const FLICK_FOR = CATCH.fly + CATCH.sit + 0.45

export const GECKO_ACTS: Record<GeckoAct, ActSpec> = {
  bask: { length: 2.4, beats: [{ at: 0, cue: { name: 'geckoTaste', colour: RED } }] },
  shiver: { length: 1.2, beats: [{ at: 0, cue: { name: 'geckoTaste', colour: BLUE } }] },
  lick: { length: 0.9, beats: [{ at: LICK_TOUCH, cue: { name: 'geckoTaste', colour: YELLOW } }] },
  wag: { length: 1.0, beats: [0, 0.22, 0.44, 0.66].map((at) => ({ at, cue: { name: 'geckoTaste', colour: GREEN } })) },
  fright: { length: 2.3, beats: [{ at: 0, cue: { name: 'geckoTaste', colour: WHITE } }, { at: FRIGHT_SLIP, cue: { name: 'slip' } }] },
  chirp: { length: 0.85, beats: CHIRPS.map((at, n) => ({ at, cue: { name: 'chirp', n } })) },
  // The two scenes. Its eyes roll round after the trapped beam; it catches one falling peg on its nose and flicks it off. The peg's own path sounds the catch and the flick.
  roll: { length: ROLL_FOR, beats: [] },
  flick: { length: FLICK_FOR, beats: [] },
  blinkLeft: { length: 0.35, beats: [] },
  // The right eye is the lazy one: it shuts slower and stays shut longer.
  blinkRight: { length: 0.6, beats: [] },
  curl: { length: 1.8, beats: [] },
}

export const GECKO_TASTE: Record<Colour, GeckoAct> = { [RED]: 'bask', [BLUE]: 'shiver', [YELLOW]: 'lick', [GREEN]: 'wag', [WHITE]: 'fright' }
export const GECKO_IDLE: readonly GeckoAct[] = ['blinkLeft', 'blinkRight', 'curl']

export type GeckoPose = {
  /** How far it has slid down the wall, in stage units. */
  slide: number
  /** A sideways tremble, in stage units. */
  tremble: number
  /** 0 to 1: the tongue out to its own eye. */
  tongue: number
  /** -1 to 1: the tail's curl; 1 is wound up tight. */
  curl: number
  /** The tail's swing, in radians. */
  wag: number
  /** 0 to 1: how much its belly glows. */
  belly: number
  /** 0 open, 1 shut, for the left and the right eye. */
  lids: [number, number]
  /** 1 round pupils, towards 0 a slit. */
  pupil: number
  /** 0 to 1: the mouth open. */
  mouth: number
  /** 0 to 1: one foot off the wall. */
  slip: number
  /** 0 to 1: how far its pupils have left its gaze for a roll round the eye, and the angle they are at. */
  rolling: number
  roll: number
  /** 0 to 1: both eyes turned in to the tip of its nose. */
  cross: number
  /** How far its head is thrown back, in stage units: under a peg that lands on it, and at the flick. */
  nod: number
}

export function geckoPose(act: GeckoAct | null, t: number, out: GeckoPose): GeckoPose {
  out.slide = 0; out.tremble = 0; out.tongue = 0; out.curl = 0; out.wag = 0; out.belly = 0; out.pupil = 1; out.mouth = 0; out.slip = 0
  out.rolling = 0; out.roll = 0; out.cross = 0; out.nod = 0
  out.lids[0] = out.lids[1] = 0
  switch (act) {
    case 'bask': {
      const warm = smooth(Math.min(span(t, 0, 0.6), 1 - span(t, 1.8, 2.4)))
      out.belly = warm
      out.lids[0] = out.lids[1] = warm
      out.curl = warm
      break
    }
    case 'shiver':
      out.tremble = 3.2 * Math.sin(t * 150) * bump(t, 0, 1.2)
      out.slip = bump(t, 0.45, 0.8)
      out.curl = -0.4 * bump(t, 0, 1.2)
      break
    case 'lick':
      out.tongue = t < LICK_TOUCH ? smooth(t / LICK_TOUCH) : 1 - smooth(span(t, LICK_TOUCH + 0.2, 0.9))
      out.mouth = 0.5 * bump(t, 0, 0.9)
      out.lids[1] = bump(t, LICK_TOUCH - 0.05, LICK_TOUCH + 0.3)
      break
    case 'wag':
      out.wag = 0.55 * Math.sin((t / 0.22) * Math.PI) * (1 - span(t, 0.8, 1.0))
      break
    case 'fright':
      out.pupil = 1 - 0.8 * Math.min(span(t, 0, 0.06), 1 - span(t, 1.6, 2.3))
      // It lets go, slides, hangs, and climbs back in four pulls.
      out.slide = t < FRIGHT_SLIP ? 0 : FRIGHT_SLIDE * smooth(span(t, FRIGHT_SLIP, 0.5)) * (1 - Math.floor(span(t, 1.0, 2.2) * 4) / 4)
      out.slip = Math.min(span(t, FRIGHT_SLIP - 0.04, FRIGHT_SLIP), 1 - span(t, 0.5, 0.7))
      out.mouth = 0.7 * bump(t, 0, 0.6)
      out.curl = -0.7 * bump(t, 0.1, 1.0)
      break
    case 'chirp':
      out.mouth = Math.max(...CHIRPS.map((at) => (t >= at ? 1 - span(t, at, at + 0.16) : 0)))
      break
    case 'roll':
      // Round and round, one turn every four beats, the tail keeping time.
      out.rolling = Math.min(span(t, 0, 0.3), 1 - span(t, ROLL_FOR - 0.4, ROLL_FOR))
      out.roll = (t / (BEAT * 4)) * Math.PI * 2
      out.wag = 0.25 * out.rolling * Math.sin((t / BEAT) * Math.PI)
      break
    case 'flick': {
      const lands = CATCH.fly, flicks = CATCH.fly + CATCH.sit
      // It sees the peg coming, takes it on the nose with a dip, goes cross-eyed at it, and throws its head to flick it off.
      out.cross = Math.min(span(t, 0.1, lands), 1 - span(t, flicks, flicks + 0.2))
      out.nod = 9 * bump(t, lands, lands + 0.25) - 16 * bump(t, flicks - 0.06, flicks + 0.22)
      out.pupil = 1 - 0.5 * bump(t, lands, lands + 0.3)
      out.curl = 0.5 * bump(t, lands, flicks)
      out.mouth = 0.6 * bump(t, flicks, flicks + 0.35)
      break
    }
    case 'blinkLeft':
      out.lids[0] = bump(t, 0, 0.35)
      break
    case 'blinkRight':
      out.lids[1] = Math.min(1, 1.6 * bump(t, 0, 0.6))
      break
    case 'curl':
      out.curl = 0.6 * bump(t, 0, 1.8)
      break
    case null:
      break
  }
  return out
}

// --- One who acts ------------------------------------------------------------

/**
 * A watcher in time: the act it is in, and what it does by itself when left alone. `step` plays the act on and
 * hands back the cues whose beats fall inside the step, so each is heard on the frame its motion is seen.
 */
export class Actor<A extends string> {
  act: A | null = null
  t = 0
  private idleIn: number
  private lastIdle = -1

  constructor(private readonly acts: Record<A, ActSpec>, private readonly idle: readonly A[], private readonly chance: () => number) {
    this.idleIn = 2 + chance() * 3
  }

  /** Starts an act now. Beats at its very start are handed back; the rest come from `step`. */
  begin(act: A): Cue[] {
    this.act = act
    this.t = 0
    return this.acts[act].beats.filter((beat) => beat.at <= 0).map((beat) => beat.cue)
  }

  /** Ends whatever it is doing, at rest, with no sound: a scene given up, or the game put away. */
  rest(): void {
    this.act = null
    this.t = 0
  }

  step(dt: number): Cue[] {
    if (this.act === null) {
      this.idleIn -= dt
      if (this.idleIn > 0) return []
      // A different idle act each time, so it never loops like a machine.
      let pick = Math.min(this.idle.length - 1, Math.floor(this.chance() * this.idle.length))
      if (pick === this.lastIdle) pick = (pick + 1) % this.idle.length
      this.lastIdle = pick
      this.idleIn = 3 + this.chance() * 4
      return this.begin(this.idle[pick])
    }
    const spec = this.acts[this.act]
    const before = this.t
    this.t += dt
    const cues = spec.beats.filter((beat) => beat.at > before && beat.at <= this.t).map((beat) => beat.cue)
    if (this.t >= spec.length) {
      this.act = null
      this.t = 0
    }
    return cues
  }
}
