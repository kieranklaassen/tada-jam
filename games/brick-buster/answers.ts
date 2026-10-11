import { MANNERS } from './motion'
import type { Beat as SceneBeat } from './scene'
import type { BallKind } from './save'
import * as v from './voices'
import type { Sound } from './voices'

// Every answer the table gives, written once as a list of timed beats. A beat
// sets a pose and plays its notes at one moment, so sight and sound share one
// clock: no sound carries a delay of its own (voices.ts has none to give), and
// no pose waits on a timer of its own. A beat may also cue the rules (the
// ball leaves the bumper, a brick stands up, a gate lets the ball out), on
// the same clock.
//
// One touch sets off a chain: an answer may run across several things, the
// bumper first, a brick, then a large toy with its own opinion of what
// happened, each beat naming whose pose it sets.

export type ToyName = 'dragon' | 'walrus' | 'elephant'

/** Whose pose a beat sets: a thing on the table, a brick by its place, or a fallen brick by its order in the rubble. */
export type Who = 'bumper' | 'drum' | 'lamps' | 'bell' | 'folded' | 'ball' | 'vine' | ToyName | 'ladybird' | `brick:${number}` | `rubble:${number}`

/** What a beat tells the rules, at its moment. */
export type Cue =
  | { type: 'launch' }
  | { type: 'settle' }
  | { type: 'stand'; place: number }
  | { type: 'fly' }
  | { type: 'land' }
  | { type: 'swept' }
  /** The gate lets the ball out, changed. */
  | { type: 'gateOut'; gate: ToyName }
  /** A ball that was held where it struck is let go and drops. */
  | { type: 'drop' }
  /** The jelly flings the ball it took in straight up. */
  | { type: 'fling'; place: number }
  /** A toy that reached for a ball at rest has hold of it, and lifts it. */
  | { type: 'fetched' }

export type Beat = {
  /** Seconds after the answer starts. */
  at: number
  who: Who
  /** The channels of that thing's pose and where each goes now. */
  pose: Readonly<Record<string, number>>
  /** With `lasts` the pose eases and arrives exactly then (0 is at once); without it the pose springs there in the thing's own manner. */
  lasts?: number
  /** The notes of this moment, all starting now. */
  notes?: Sound
  cue?: Cue
}

export type Answer = readonly Beat[]

const byTime = (beats: Beat[]): Answer => beats.sort((a, b) => a.at - b.at)
const brick = (place: number): Who => `brick:${place}`
const rubble = (heap: number): Who => `rubble:${heap}`

// --- What the three large toys do about what happens ----------------------------

/**
 * How long after a thing happens the toys start to answer it. Each toy adds its own lateness, and the slowest,
 * the elephant, still starts within a third of a second.
 */
export const TOY_AFTER = 0.05

/** The dragon loves a thing that breaks or pops, and puffs one smoke ring for it. */
function dragonRing(at: number): Beat[] {
  const from = at + MANNERS.dragon.late
  return [
    { at: from, who: 'dragon', pose: { neck: -0.6, jaw: 1 } },
    { at: from + 0.1, who: 'dragon', pose: { ring: 0 }, lasts: 0 },
    { at: from + 0.1, who: 'dragon', pose: { ring: 1 }, lasts: 0.7, notes: v.puff },
    { at: from + 0.2, who: 'dragon', pose: { neck: 0, jaw: 0 } },
    { at: from + 0.82, who: 'dragon', pose: { ring: 0 }, lasts: 0 },
  ]
}

/**
 * The walrus loves anything wet: it wallows in its tub, one way and back, so that the water slops over the rim,
 * and snorts through whiskers sprung out straight. It is about the water and is no applause: its flippers stay on
 * the rim, and no toy claps, here or anywhere. `size` is how much of it there is: for a boom, as much as the boom.
 */
function walrusWallow(at: number, size = 1): Beat[] {
  const from = at + MANNERS.walrus.late
  return [
    { at: from, who: 'walrus', pose: { wallow: size, whisk: size }, notes: v.softer(v.snort, size) },
    { at: from, who: 'walrus', pose: { slop: 0 }, lasts: 0 },
    { at: from, who: 'walrus', pose: { slop: 1 }, lasts: 0.5 },
    { at: from + 0.22, who: 'walrus', pose: { wallow: -size }, notes: v.softer(v.slosh, size) },
    { at: from + 0.5, who: 'walrus', pose: { wallow: 0, whisk: 0 } },
    { at: from + 0.5, who: 'walrus', pose: { slop: 0 }, lasts: 0 },
  ]
}

/** The walrus snorts through its whiskers, which spring out straight. */
function walrusSnort(at: number): Beat[] {
  const from = at + MANNERS.walrus.late
  return [
    { at: from, who: 'walrus', pose: { whisk: 1 }, notes: v.snort },
    { at: from + 0.3, who: 'walrus', pose: { whisk: 0 } },
  ]
}

/** The elephant loves a deep boom, and flaps its ears once for it, as large as the boom. */
function elephantFlap(at: number, size: number): Beat[] {
  const from = at + MANNERS.elephant.late
  return [
    { at: from, who: 'elephant', pose: { ears: 0.7 * size }, notes: v.earFlap(Math.min(1, size)) },
    { at: from + 0.2, who: 'elephant', pose: { ears: 0 } },
  ]
}

/** The elephant cannot stand a high tinkle: it folds its ears over its eyes and peeps through. */
function elephantCover(at: number): Beat[] {
  const from = at + MANNERS.elephant.late
  return [
    { at: from, who: 'elephant', pose: { cover: 1 }, notes: v.hush },
    { at: from + 0.7, who: 'elephant', pose: { cover: 0.6 } },
    { at: from + 1.3, who: 'elephant', pose: { cover: 0 } },
  ]
}

/** The walrus cannot stand heat: a hot ball going by curls its whiskers up tight and it sinks to its eyes in the tub. */
export function walrusHot(): Answer {
  const from = MANNERS.walrus.late
  return [
    { at: from, who: 'walrus', pose: { whisk: -1, sink: 1 }, notes: v.under },
    { at: from + 1.3, who: 'walrus', pose: { whisk: 0, sink: 0 } },
  ]
}

/** The dragon cannot stand wet: a wet ball going by puts its flame out, and it goes cross-eyed trying to light it again. */
export function dragonWet(): Answer {
  const from = MANNERS.dragon.late
  return [
    { at: from, who: 'dragon', pose: { flame: 0, cross: 1 }, notes: v.fizzle },
    { at: from + 0.45, who: 'dragon', pose: { flame: 0.5 }, notes: v.spark },
    { at: from + 0.55, who: 'dragon', pose: { flame: 0 } },
    { at: from + 0.85, who: 'dragon', pose: { flame: 0.5 }, notes: v.spark },
    { at: from + 0.95, who: 'dragon', pose: { flame: 0 } },
    { at: from + 1.3, who: 'dragon', pose: { flame: 1.5, cross: 0 }, notes: v.flare },
    { at: from + 1.45, who: 'dragon', pose: { flame: 1 } },
  ]
}

// --- The bumper --------------------------------------------------------------

/** How far the bumper gives under a finger, as a share of its height. */
export const PRESSED = 0.34
/** How long a heavy ball holds the bumper flat before it is sprung. */
export const HEAVY_HOLD = 0.18

/** The finger lands: the bumper gives under it, in that frame. */
export function press(): Answer {
  return [{ at: 0, who: 'bumper', pose: { squash: PRESSED, lean: 0 }, notes: v.creak }]
}

/** The finger lifts with the ball resting on the bumper: it is flicked up. A heavy ball squashes the bumper flat with a groan first. */
export function flick(aim: number, heavy: boolean): Answer {
  const from = heavy ? HEAVY_HOLD : 0
  const beats: Beat[] = [
    { at: from, who: 'bumper', pose: { squash: -0.3 }, notes: v.boing(aim), cue: { type: 'launch' } },
    { at: from + 0.09, who: 'bumper', pose: { squash: 0 } },
  ]
  if (heavy) beats.unshift({ at: 0, who: 'bumper', pose: { squash: 0.9 }, notes: v.groan })
  return beats
}

/** The finger lifts from a bumper with no ball on it: it only comes back up. */
export function release(): Answer {
  return [{ at: 0, who: 'bumper', pose: { squash: 0 } }]
}

/** How long the bumper holds a ball that lands on it before it springs it off. */
export const CATCH_SECONDS = 0.06

/**
 * The ball lands on the bumper while the finger is on it: the rubber takes it, then springs it off. The last beat
 * cues the rules to settle the bumper, which stays pressed under a finger that is still on it and comes up under
 * none. A heavy ball squashes it flat with a groan first.
 */
export function bounce(aim: number, heavy: boolean): Answer {
  const hold = heavy ? HEAVY_HOLD : CATCH_SECONDS
  return [
    { at: 0, who: 'bumper', pose: { squash: heavy ? 0.9 : 0.5 }, notes: heavy ? v.groan : v.creak },
    { at: hold, who: 'bumper', pose: { squash: -0.3 }, notes: v.boing(aim), cue: { type: 'launch' } },
    { at: hold + 0.09, who: 'bumper', pose: {}, cue: { type: 'settle' } },
  ]
}

/** The ball lands on the bumper while no finger is on it: it sinks into the rubber, rocks once and comes to rest. */
export function sinkIn(heavy: boolean): Answer {
  return [
    { at: 0, who: 'bumper', pose: { squash: heavy ? 0.7 : 0.45, lean: 0.7 }, notes: heavy ? [...v.pfff, ...v.groan] : v.pfff },
    { at: 0.14, who: 'bumper', pose: { squash: 0.1, lean: -0.5 } },
    { at: 0.3, who: 'bumper', pose: { squash: 0, lean: 0 } },
  ]
}

/** The bumper slid into a ball that was low beside it. */
export function knock(): Answer {
  return [
    { at: 0, who: 'bumper', pose: { lean: 1 }, notes: v.bonk },
    { at: 0.08, who: 'bumper', pose: { lean: 0 } },
  ]
}

// --- The ball on the table ---------------------------------------------------

/** Each boom of a ball left bouncing is this much of the one before it, for every kind of ball. */
export const BOOM_SOFTER = 0.8
/** A boom softer than this moves nothing: no brick hops, no toy jumps or flaps, and nothing is left on the skin. */
export const BOOM_MOVES = 0.3
/** How large the `nth` boom in a row is, from 1 for the first. */
export const boomSize = (nth: number): number => BOOM_SOFTER ** Math.max(0, nth)

/**
 * The ball lands on the drum-skin floor at `x`, and the floor answers each kind of ball in its own way. `nth`
 * counts the booms of a ball left bouncing, from 0: each is softer than the last, for every kind of ball, and
 * what moves with a boom fades with it, so nothing goes on without end. `standing` are the places of the bricks
 * that stand, which hop under a heavy ball. The elephant flaps its ears for a boom, most of all under a heavy ball.
 */
export function boom(x: number, nth: number, kind: BallKind, standing: readonly number[]): Answer {
  const size = boomSize(nth), moves = size >= BOOM_MOVES
  const heard = (sound: Sound): Sound | undefined => {
    const notes = v.softer(sound, size)
    return notes.length > 0 ? notes : undefined
  }
  const beats: Beat[] = [{ at: 0, who: 'drum', pose: { x }, lasts: 0 }, { at: 0.07, who: 'drum', pose: { dip: 0 } }]
  if (kind === 'wet') {
    // A wet slap: a ring of drops jumps off the skin and leaves a damp patch that dries. The walrus wallows for it.
    beats.push({ at: 0, who: 'drum', pose: { dip: size }, notes: heard(v.wetSlap) })
    if (moves) {
      beats.push({ at: 0, who: 'drum', pose: { drops: 0, damp: size }, lasts: 0 })
      beats.push({ at: 0, who: 'drum', pose: { drops: 1 }, lasts: 0.4 })
      beats.push({ at: 0.4, who: 'drum', pose: { drops: 0 }, lasts: 0 })
      beats.push({ at: 0.4, who: 'drum', pose: { damp: 0 }, lasts: 2.4 })
      beats.push(...walrusWallow(0, size), ...elephantFlap(0, size * 0.6))
    }
  } else if (kind === 'hot') {
    // A sizzle and a puff of steam: the skin tightens, the bounce sounds a note higher, and a scorch ring fades.
    beats.push({ at: 0, who: 'drum', pose: { dip: size * 0.7 }, notes: heard(v.sizzle) })
    if (moves) {
      beats.push({ at: 0, who: 'drum', pose: { steam: 0, scorch: size }, lasts: 0 })
      beats.push({ at: 0, who: 'drum', pose: { steam: 1 }, lasts: 0.6 })
      beats.push({ at: 0.6, who: 'drum', pose: { steam: 0 }, lasts: 0 })
      beats.push({ at: 0.3, who: 'drum', pose: { scorch: 0 }, lasts: 2 })
      beats.push(...elephantFlap(0, size * 0.6))
    }
  } else if (kind === 'heavy') {
    // A deep boom: every standing brick hops in its place and the three large toys jump, each less than the time before.
    beats.push({ at: 0, who: 'drum', pose: { dip: 1.6 * size }, notes: heard(v.deepBoom) })
    if (moves) {
      for (const place of standing) {
        beats.push({ at: 0.03, who: brick(place), pose: { hop: size } })
        beats.push({ at: 0.12, who: brick(place), pose: { hop: 0 } })
      }
      for (const toy of ['dragon', 'walrus', 'elephant'] as const) {
        const late = 0.03 + MANNERS[toy].late
        beats.push({ at: late, who: toy, pose: { hop: size } })
        beats.push({ at: late + 0.14, who: toy, pose: { hop: 0 }, notes: toy === 'elephant' ? heard(v.stomp) : undefined })
      }
      beats.push(...elephantFlap(0, 1.4 * size))
    }
  } else {
    beats.push({ at: 0, who: 'drum', pose: { dip: size }, notes: heard(v.doom) })
    if (moves) beats.push(...elephantFlap(0, size))
  }
  return byTime(beats)
}

/** One turn of the rumble of a ball that rolls off the wall by itself. `speed` is 0 to 1. */
export function rolling(speed: number): Answer {
  return [{ at: 0, who: 'ball', pose: {}, notes: v.rollTick(speed) }]
}

/** A finger pats the drum skin at `x`; the bumper answers the same touch. */
export function pat(x: number): Answer {
  return [
    { at: 0, who: 'drum', pose: { x }, lasts: 0 },
    { at: 0, who: 'drum', pose: { dip: 0.5 }, notes: v.dum },
    { at: 0.07, who: 'drum', pose: { dip: 0 } },
  ]
}

/** The ball clicks off a chrome rail. The toy that stands there starts: each in its own part. */
export function rail(toy: ToyName, speed: number): Answer {
  const part = toy === 'dragon' ? 'neck' : toy === 'walrus' ? 'whisk' : 'trunk'
  const jump = toy === 'dragon' ? -0.5 : toy === 'walrus' ? 0.8 : -0.5
  const late = MANNERS[toy].late
  return byTime([
    { at: 0, who: 'lamps', pose: { [toy]: 1 }, notes: v.railTick(speed) },
    { at: 0.1, who: 'lamps', pose: { [toy]: 0 } },
    { at: late, who: toy, pose: { [part]: jump } },
    { at: late + 0.16, who: toy, pose: { [part]: 0 } },
  ])
}

/** The ball knocks on the roof rail, and the lamps along the apron blink. A ball a jelly flung lands there with a thud. */
export function roof(speed: number, flung: boolean): Answer {
  return [
    { at: 0, who: 'lamps', pose: { apron: 1 }, notes: flung ? v.roofThud : v.roofTok(speed) },
    { at: 0.14, who: 'lamps', pose: { apron: 0 } },
  ]
}

// --- The gates ----------------------------------------------------------------

/** How long a gate keeps the ball. */
export const GATE_SECONDS = 1.0

/**
 * How each toy draws the ball in from the rail to where it holds it, each in its own manner. The dragon snaps it
 * up at once, straight into its mouth. The walrus lets it roll over the rim of the tub and drop into the water,
 * gathering speed. The elephant is late: the ball waits at the rail for a moment, and is then sucked up the trunk,
 * faster and faster. `wait` is how long the ball stays at the rail, `seconds` how long the way in takes after
 * that, `gain` how much faster it ends than it starts, and `over` how far above the straight way the ball goes.
 */
export const GATE_IN = {
  dragon: { wait: 0, seconds: 0.07, gain: 1, over: 0 },
  walrus: { wait: 0, seconds: 0.3, gain: 3, over: 46 },
  elephant: { wait: MANNERS.elephant.late, seconds: 0.22, gain: 6, over: 0 },
} as const

/**
 * The ball goes into a toy's gate and comes out changed: the toy takes it in, in its own manner (`GATE_IN`); a
 * beat of holding; the ball comes out and falls towards the floor. `undo` is a ball that already is what this
 * gate makes: it comes out plain again, rubbed dry, blown cool or shaken empty.
 */
export function gate(toy: ToyName, undo: boolean): Answer {
  const out: Cue = { type: 'gateOut', gate: toy }
  const inAt = GATE_IN[toy].wait + GATE_IN[toy].seconds
  if (toy === 'dragon') {
    const beats: Beat[] = [
      { at: 0, who: 'dragon', pose: { jaw: 1, neck: 0.7 }, notes: v.gulp },
      { at: 0.2, who: 'dragon', pose: { jaw: 0, gulp: 1, neck: -0.4 } },
    ]
    if (undo) {
      // The dragon blows it cool with a wheeze.
      beats.push({ at: 0.5, who: 'dragon', pose: { jaw: 0.6, neck: 0.3 }, notes: v.wheeze })
      beats.push({ at: 0.5, who: 'dragon', pose: { blowing: 1 }, lasts: 0.4 })
      beats.push({ at: GATE_SECONDS, who: 'dragon', pose: { jaw: 1, gulp: 0, neck: 0.7 }, cue: out })
      beats.push({ at: GATE_SECONDS, who: 'dragon', pose: { blowing: 0 }, lasts: 0 })
    } else {
      // The dragon hiccups it out hot, in a smoke ring.
      beats.push({ at: GATE_SECONDS, who: 'dragon', pose: { jaw: 1, gulp: 0, neck: 0.7, flame: 1.8 }, notes: [...v.hic, ...v.flare], cue: out })
      beats.push({ at: GATE_SECONDS, who: 'dragon', pose: { ring: 0 }, lasts: 0 })
      beats.push({ at: GATE_SECONDS, who: 'dragon', pose: { ring: 1 }, lasts: 0.7, notes: v.puff })
      beats.push({ at: GATE_SECONDS + 0.72, who: 'dragon', pose: { ring: 0 }, lasts: 0 })
    }
    beats.push({ at: GATE_SECONDS + 0.2, who: 'dragon', pose: { jaw: 0, neck: 0, flame: 1 } })
    return byTime(beats)
  }
  if (toy === 'walrus') {
    // The walrus leans back to let the ball roll in over the rim, and the water jumps where it lands.
    const beats: Beat[] = [
      { at: 0, who: 'walrus', pose: { belly: 1 }, notes: v.under },
      { at: inAt, who: 'walrus', pose: { belly: 0, sink: 0.35 }, notes: v.plunge },
      { at: inAt, who: 'walrus', pose: { plop: 0 }, lasts: 0 },
      { at: inAt, who: 'walrus', pose: { plop: 1 }, lasts: 0.3 },
      { at: inAt + 0.3, who: 'walrus', pose: { plop: 0 }, lasts: 0 },
    ]
    if (undo) {
      // The walrus rubs it dry on its chest with one flipper, with a squeak, twice.
      beats.push({ at: 0.62, who: 'walrus', pose: { rub: 1, sink: 0 }, notes: v.rubDry })
      beats.push({ at: 0.74, who: 'walrus', pose: { rub: 0.4 } })
      beats.push({ at: 0.84, who: 'walrus', pose: { rub: 1 }, notes: v.rubDry })
      beats.push({ at: GATE_SECONDS, who: 'walrus', pose: { rub: 0 }, cue: out })
    } else {
      // The walrus spits it out wet, in a spout of water, and snorts the water out of its whiskers.
      beats.push({ at: GATE_SECONDS, who: 'walrus', pose: { sink: 0 }, notes: v.spout, cue: out })
      beats.push({ at: GATE_SECONDS, who: 'walrus', pose: { spout: 0 }, lasts: 0 })
      beats.push({ at: GATE_SECONDS, who: 'walrus', pose: { spout: 1 }, lasts: 0.5 })
      beats.push({ at: GATE_SECONDS + 0.5, who: 'walrus', pose: { spout: 0 }, lasts: 0 })
      beats.push(...walrusSnort(GATE_SECONDS + 0.3))
    }
    return byTime(beats)
  }
  // The elephant: it is late with everything. Its trunk comes round to the ball, which waits at the rail, and then sucks it up.
  const late = MANNERS.elephant.late
  const beats: Beat[] = [
    { at: 0, who: 'elephant', pose: { trunk: -0.5 }, notes: v.suck },
    { at: 0, who: 'elephant', pose: { bulge: 0 }, lasts: 0 },
    { at: inAt, who: 'elephant', pose: { bulge: 1 }, lasts: 0.45 },
  ]
  if (undo) {
    // It shakes the ball empty with a rattle.
    for (let shake = 0; shake < 3; shake++) {
      beats.push({ at: 0.62 + shake * 0.13, who: 'elephant', pose: { shake: shake % 2 ? -1 : 1 }, notes: v.rattle(shake) })
    }
    beats.push({ at: 1.01, who: 'elephant', pose: { shake: 0 } })
    beats.push({ at: GATE_SECONDS + late, who: 'elephant', pose: { trunk: 0.5 }, cue: out })
  } else {
    // It blows the ball out heavy, grey and dull.
    beats.push({ at: GATE_SECONDS + late, who: 'elephant', pose: { trunk: 0.8, ears: 0.5 }, notes: v.blow, cue: out })
  }
  beats.push({ at: GATE_SECONDS + late, who: 'elephant', pose: { bulge: 0 }, lasts: 0.12 })
  beats.push({ at: GATE_SECONDS + late + 0.25, who: 'elephant', pose: { trunk: 0, ears: 0 } })
  return byTime(beats)
}

// --- A ball at rest where nothing rolls it down -----------------------------------

/**
 * How each toy that can fetch a ball does it, in its own manner: the dragon whips its tail out in a moment and
 * is quick with the ball; the elephant starts late, stretches its trunk out slowly and carries the ball slowly.
 * `reach` is how long the tail or the trunk takes to get to the ball, `speed` how fast it carries it, in stage
 * units a second, and `back` how long it takes to draw back.
 */
export const FETCH = {
  dragon: { late: MANNERS.dragon.late, reach: 0.2, speed: 560, back: 0.25 },
  elephant: { late: MANNERS.elephant.late, reach: 0.55, speed: 300, back: 0.6 },
} as const
export type Fetcher = keyof typeof FETCH

/**
 * A ball has come to rest where no way leads down: the nearer toy reaches over the table for it, the dragon with
 * its tail and the elephant with its trunk, seen and heard, and has hold of it when the last beat cues the rules.
 */
export function fetchReach(toy: Fetcher): Answer {
  const { late, reach } = FETCH[toy]
  if (toy === 'dragon') {
    return [
      { at: late, who: 'dragon', pose: { neck: -0.5 }, notes: v.tailWhip },
      { at: late, who: 'dragon', pose: { fetch: 1 }, lasts: reach },
      { at: late + reach, who: 'dragon', pose: { neck: 0, curl: 1 }, notes: v.tailCurl },
      { at: late + reach, who: 'ball', pose: { lift: 1 }, lasts: 0.1, cue: { type: 'fetched' } },
    ]
  }
  return [
    { at: late, who: 'elephant', pose: { ears: 0.5 }, notes: v.trunkStretch },
    { at: late, who: 'elephant', pose: { fetch: 1 }, lasts: reach },
    { at: late + reach, who: 'elephant', pose: { ears: 0, curl: 1 }, notes: v.trunkHold },
    { at: late + reach, who: 'ball', pose: { lift: 1 }, lasts: 0.16, cue: { type: 'fetched' } },
  ]
}

/** The toy has set the ball on the bumper: it lets go and draws its tail or its trunk back. */
export function fetchBack(toy: Fetcher): Answer {
  return [
    { at: 0, who: 'ball', pose: { lift: 0 }, lasts: 0.06 },
    { at: 0, who: toy, pose: { curl: 0 } },
    { at: 0.08, who: toy, pose: { fetch: 0 }, lasts: FETCH[toy].back },
  ]
}

// --- What has fallen -----------------------------------------------------------

/** How long a brick's shards take to fall into the rubble. */
export const FALL_SECONDS = 0.44

/** The shards of a glass brick fall into the tray with a tinkle, and its face comes up there. */
function shards(heap: number, from: number): Beat[] {
  const who = rubble(heap)
  return [
    { at: from, who, pose: { fall: 1 }, lasts: FALL_SECONDS, notes: v.tinkle(0) },
    { at: from + 0.11, who, pose: { glint: 1 }, notes: v.tinkle(1) },
    { at: from + 0.22, who, pose: { glint: 2 }, notes: v.tinkle(2) },
    { at: from + 0.33, who, pose: { glint: 3 }, notes: v.tinkle(3) },
    { at: from + FALL_SECONDS, who, pose: { peek: 1 }, notes: v.settle },
  ]
}

// --- Glass -------------------------------------------------------------------

/** A plain ball on a whole glass brick: it rings its own note like a tapped tumbler and takes a crack. */
export function ringAndCrack(place: number, col: number, row: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { pop: 1 }, notes: [...v.ring(col, row), ...v.crack] },
    { at: 0.07, who: brick(place), pose: { pop: 0 } },
  ]
}

/**
 * A plain ball on a cracked glass brick: it rings once more and falls in shards with a tinkle. The dragon loves a
 * thing that breaks and puffs one smoke ring for it; the elephant cannot stand the tinkle.
 */
export function shatter(heap: number, col: number, row: number): Answer {
  return byTime([
    { at: 0, who: rubble(heap), pose: {}, notes: [...v.ring(col, row), ...v.crack] },
    ...shards(heap, 0.06),
    ...dragonRing(TOY_AFTER),
    ...elephantCover(TOY_AFTER),
  ])
}

/** A wet ball on glass: it squeaks like a wiped window and comes up so clean that the face behind it is seen pressed flat against it. */
export function wipe(place: number, at = 0): Answer {
  return [
    { at, who: brick(place), pose: { shine: 1, flat: 1 }, lasts: 0.14, notes: v.squeak },
    { at: at + 1.1, who: brick(place), pose: { flat: 0 }, lasts: 0.2 },
    { at: at + 1.1, who: brick(place), pose: { shine: 0 }, lasts: 1.6 },
  ]
}

/** A hot ball on glass: it glows orange and sags into a long drip, with a glass-blower's low note. */
export function sag(place: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { glow: 1 }, lasts: 0.1, notes: v.bwoom },
    { at: 0, who: brick(place), pose: { sag: 1 }, lasts: 0.5 },
    { at: 0.5, who: brick(place), pose: { glow: 0 }, lasts: 1.4 },
  ]
}

/** Any ball on the drip pops it like a bubble, and the dragon puffs a ring for it. */
export function popDrip(heap: number): Answer {
  return byTime([
    { at: 0, who: rubble(heap), pose: { pop: 1 }, notes: v.pock },
    { at: 0, who: rubble(heap), pose: { fall: 1 }, lasts: 0.3 },
    { at: 0.3, who: rubble(heap), pose: { peek: 1, pop: 0 }, notes: v.settle },
    ...dragonRing(TOY_AFTER),
  ])
}

/** A heavy ball goes straight through: every glass brick in its line breaks at once, with a crash. One smoke ring for each, and the elephant hides. */
export function crashThrough(heaps: readonly number[]): Answer {
  const beats: Beat[] = [{ at: 0, who: 'lamps', pose: { apron: 1 }, notes: v.crash }, { at: 0.14, who: 'lamps', pose: { apron: 0 } }]
  heaps.forEach((heap, index) => {
    beats.push(...shards(heap, 0.04 + index * 0.05))
    beats.push(...dragonRing(TOY_AFTER + index * 0.9))
  })
  beats.push(...elephantCover(TOY_AFTER))
  return byTime(beats)
}

/** A finger on a glass brick: the tink of a nail; the face behind blinks and fogs the glass with one breath. */
export function tinkGlass(place: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { pop: 0.5, blink: 1 }, notes: v.tink },
    { at: 0, who: brick(place), pose: { fog: 1 }, lasts: 0.25 },
    { at: 0.14, who: brick(place), pose: { pop: 0, blink: 0 } },
    { at: 0.9, who: brick(place), pose: { fog: 0 }, lasts: 0.7 },
  ]
}

// --- Jelly ---------------------------------------------------------------------

/** A plain ball on a jelly: it wobbles with a wet sound and throws the ball sideways. `count` is how many throws it had made before. */
export function jellyThrow(place: number, count: number, dir: number, col: number, row: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { wobble: dir, tilt: count + 1 }, notes: v.jellyBlub(count, col, row) },
    { at: 0.09, who: brick(place), pose: { wobble: 0 } },
  ]
}

/** The third throw shakes it off its plate, and it lands in the rubble with a splat, still wobbling. */
export function jellyOff(heap: number, dir: number, col: number, row: number): Answer {
  return [
    { at: 0, who: rubble(heap), pose: { wobble: dir }, notes: v.jellyBlub(2, col, row) },
    { at: 0, who: rubble(heap), pose: { fall: 1 }, lasts: 0.5 },
    { at: 0.5, who: rubble(heap), pose: { peek: 1, wobble: 1 }, notes: v.splat },
    { at: 0.6, who: rubble(heap), pose: { wobble: 0 } },
  ]
}

/** A wet ball slips round the jelly with a slurp, and the jelly is left shining. */
export function slip(place: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { shine: 1 }, lasts: 0.14, notes: v.slurp },
    { at: 0, who: brick(place), pose: { wobble: 0.4 } },
    { at: 0.1, who: brick(place), pose: { wobble: 0 } },
    { at: 1.1, who: brick(place), pose: { shine: 0 }, lasts: 1.6 },
  ]
}

/** A hot ball melts the jelly into syrup that runs down the board to the rubble; the ball comes away trailing a sticky thread that twangs. */
export function jellyMelt(heap: number): Answer {
  return [
    { at: 0, who: rubble(heap), pose: { fall: 1 }, lasts: 0.8, notes: v.glorp },
    { at: 0, who: 'ball', pose: { thread: 1 }, lasts: 0 },
    { at: 0.36, who: 'ball', pose: { thread: 0 }, lasts: 0, notes: v.threadTwang },
    { at: 0.8, who: rubble(heap), pose: { peek: 1 } },
  ]
}

/** How long a heavy ball is deep in the jelly before it is flung. */
export const SINK_SECONDS = 0.24

/** A heavy ball sinks deep into the jelly and is flung straight up into the roof with a long spring; the jelly goes on shaking. */
export function jellyFling(place: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { squash: 1 }, notes: v.boi(0) },
    { at: 0.12, who: brick(place), pose: { squash: 1.2 }, notes: v.boi(1) },
    { at: SINK_SECONDS, who: brick(place), pose: { squash: -0.7, wobble: 1 }, notes: v.boi(2), cue: { type: 'fling', place } },
    { at: SINK_SECONDS + 0.1, who: brick(place), pose: { squash: 0, wobble: -1 } },
    { at: SINK_SECONDS + 0.25, who: brick(place), pose: { wobble: 1 } },
    { at: SINK_SECONDS + 0.4, who: brick(place), pose: { wobble: 0 } },
  ]
}

/** How often a jelly under a finger wobbles again. */
export const WOBBLE_GAP = 0.2

/** One wobble of a jelly under a finger, with its rubbery sound and a bubbling titter. `index` counts the wobbles of this press. */
export function jellyWobble(place: number, index: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { wobble: index % 2 ? -0.8 : 0.8, titter: 1 }, notes: [...v.bwub(index), ...v.titter(index)] },
    { at: WOBBLE_GAP * 0.6, who: brick(place), pose: { wobble: 0, titter: 0 } },
  ]
}

/** A jelly that the pool splashed swells to twice its size. */
export function swell(place: number): Answer {
  return [{ at: 0, who: brick(place), pose: { swell: 1 } }]
}

// --- Ice ----------------------------------------------------------------------

/** A plain ball skates off the ice with a dry sound and a spray of frost chips; the ice shivers and stays whole. */
export function skate(place: number, col: number, row: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { shiver: 1 }, notes: [...v.tsk, ...v.chink(col, row)] },
    { at: 0, who: brick(place), pose: { chips: 0 }, lasts: 0 },
    { at: 0, who: brick(place), pose: { chips: 1 }, lasts: 0.4 },
    { at: 0.07, who: brick(place), pose: { shiver: 0 } },
    { at: 0.4, who: brick(place), pose: { chips: 0 }, lasts: 0 },
  ]
}

/** How long a wet ball sticks to the ice. */
export const STICK_SECONDS = 0.4

/** The water on a wet ball freezes: it sticks for a breath with a rising crackle and drops off plain, wearing a cap of frost, and the ice has grown an icicle. */
export function freeze(place: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { shiver: 0.5 }, notes: v.freeze(0) },
    { at: 0.13, who: brick(place), pose: { shiver: -0.5 }, notes: v.freeze(1) },
    { at: 0.26, who: brick(place), pose: { shiver: 0, icicle: 1 }, notes: v.freeze(2) },
    { at: STICK_SECONDS, who: 'ball', pose: { frost: 1 }, lasts: 0, notes: v.frostTick, cue: { type: 'drop' } },
    { at: STICK_SECONDS + 2.5, who: 'ball', pose: { frost: 0 }, lasts: 1.5 },
  ]
}

/** A hot ball melts the ice with a long hiss into a pool that lies where it stood. The walrus loves the pool, and wallows. */
export function melt(place: number): Answer {
  return byTime([
    { at: 0, who: brick(place), pose: { melt: 1 }, lasts: 0.9, notes: v.meltHiss },
    ...walrusWallow(TOY_AFTER),
  ])
}

/** The ice stops a heavy ball dead with an anvil's note and takes one dimple; the ball drops straight down. */
export function anvil(place: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { dimple: 1, shiver: 0.6 }, notes: v.donk },
    { at: 0.07, who: brick(place), pose: { shiver: 0 } },
  ]
}

/** A finger on ice: a cold squeak, and a clear fingerprint that frosts over again. */
export function fingerIce(place: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { print: 1 }, lasts: 0, notes: v.coldSqueak },
    { at: 0.35, who: brick(place), pose: { print: 0 }, lasts: 1.4 },
  ]
}

// --- A seed ---------------------------------------------------------------------

/** A plain ball knocks on the seed like a wooden block; where it had no vine, a short one uncurls with a creak. */
export function knockSeed(place: number, grows: boolean, col: number, row: number): Answer {
  const beats: Beat[] = [
    { at: 0, who: brick(place), pose: { pop: 1 }, notes: v.tock(col, row) },
    { at: 0.07, who: brick(place), pose: { pop: 0 } },
  ]
  if (grows) beats.push({ at: 0.05, who: 'vine', pose: { grow: 1 }, lasts: 0.3, notes: v.vineCreak })
  return byTime(beats)
}

/** A vine takes a ball and carries it up. */
export function vineRide(): Answer {
  return [
    { at: 0, who: 'vine', pose: { sway: 1 }, notes: v.vineCreak },
    { at: 0.2, who: 'vine', pose: { sway: 0 } },
  ]
}

/** A wet ball on the seed: the vine shoots to the roof with a rising slide-whistle, and its leaves stay. */
export function vineShoot(place: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { pop: 1 }, notes: v.slideWhistle },
    { at: 0, who: 'vine', pose: { grow: 1, tall: 1 }, lasts: 0.55 },
    { at: 0.07, who: brick(place), pose: { pop: 0 } },
  ]
}

/** A hot ball curls the vine's leaves brown with a crackle. */
export function vineBrown(): Answer {
  return [{ at: 0, who: 'vine', pose: { brown: 1 }, lasts: 0.5, notes: v.brownCrackle }]
}

/** How long the puffed flower floats down. */
export const FLOAT_SECONDS = 1.2

/** A hot ball pops the seed like popcorn, and a puffed white flower jumps off and floats down to the tray. A vine that had grown stays where it grew. */
export function popSeed(heap: number): Answer {
  return byTime([
    { at: 0, who: rubble(heap), pose: { pop: 1 }, notes: v.popBang },
    { at: 0, who: rubble(heap), pose: { fall: 1 }, lasts: FLOAT_SECONDS },
    { at: 0.12, who: rubble(heap), pose: { pop: 0 } },
    { at: FLOAT_SECONDS, who: rubble(heap), pose: { peek: 1 } },
    ...dragonRing(TOY_AFTER),
  ])
}

/** How long after the peg is driven in the sprout comes up. */
export const SPROUT_AFTER = 0.6

/** A heavy ball drives the seed into the board like a peg; a moment later a fat sprout comes up through the rubble below. */
export function driveSeed(heap: number): Answer {
  return [
    { at: 0, who: rubble(heap), pose: { drive: 1 }, lasts: 0.12, notes: v.thunk },
    { at: SPROUT_AFTER, who: rubble(heap), pose: { fall: 1 }, lasts: 0 },
    { at: SPROUT_AFTER, who: rubble(heap), pose: { sprout: 1, peek: 1 }, notes: v.pip },
  ]
}

/** A finger on a seed: it rattles like a maraca, and a leaf peeps out and ducks back. */
export function fingerSeed(place: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { rattle: 1 }, notes: v.maraca(0) },
    { at: 0.09, who: brick(place), pose: { rattle: -1 }, notes: v.maraca(1) },
    { at: 0.18, who: brick(place), pose: { rattle: 0, leaf: 1 }, notes: v.maraca(2) },
    { at: 0.7, who: brick(place), pose: { leaf: 0 } },
  ]
}

// --- A sleepy brick ----------------------------------------------------------------

/** How long a sleepy brick takes to shuffle over one place, and when it sets off. */
export const SHUFFLE_AT = 0.34
export const SHUFFLE_SECONDS = 0.3

/**
 * A plain ball on a sleepy brick: it yawns and shuffles over one place, away from the ball. `place` is where it
 * is going, which the rules have already given it; `dir` is the way it goes.
 */
export function yawnShuffle(place: number, dir: number, col: number, row: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { slide: -dir }, lasts: 0 },
    { at: 0, who: brick(place), pose: { yawn: 1 }, notes: [...v.yawnAah, ...v.hum(col, row)] },
    { at: SHUFFLE_AT, who: brick(place), pose: { yawn: 0.5 }, notes: v.yawnOm },
    { at: SHUFFLE_AT, who: brick(place), pose: { slide: 0 }, lasts: SHUFFLE_SECONDS },
    { at: SHUFFLE_AT + SHUFFLE_SECONDS, who: brick(place), pose: { yawn: 0 } },
  ]
}

/** With no gap beside it, it yawns, leans that way and snores once. */
export function yawnLean(place: number, dir: number, col: number, row: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { yawn: 1 }, notes: [...v.yawnAah, ...v.hum(col, row)] },
    { at: SHUFFLE_AT, who: brick(place), pose: { yawn: 0.5, lean: dir }, notes: v.yawnOm },
    { at: SHUFFLE_AT + 0.4, who: brick(place), pose: { yawn: 0, snore: 1 }, notes: v.snore(false) },
    { at: SHUFFLE_AT + 0.8, who: brick(place), pose: { snore: 0, lean: 0 } },
  ]
}

/** How long it leans on the rail before it shuffles back. */
export const RAIL_LEAN = 0.9

/**
 * At the end of its row it has no neighbour to lean on: it yawns, and the rules shuffle it over to the rail, away
 * from the ball (`toTheRail` in table.ts).
 */
export function yawnToRail(place: number, col: number, row: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { yawn: 1 }, notes: [...v.yawnAah, ...v.hum(col, row)] },
    { at: SHUFFLE_AT, who: brick(place), pose: { yawn: 0.5 }, notes: v.yawnOm },
  ]
}

/** It has reached the rail: it leans on it, snores once, and straightens up to shuffle back. */
export function leanOnRail(place: number, dir: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { yawn: 0, lean: dir, snore: 1 }, notes: v.snore(false) },
    { at: 0.4, who: brick(place), pose: { snore: 0 } },
    { at: RAIL_LEAN, who: brick(place), pose: { lean: 0 } },
  ]
}

/** Touched by a plain ball while it is over at the rail, it only hums in its sleep, its own note of the wall. */
export function sleepyHum(place: number, col: number, row: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { pop: 0.5 }, notes: v.hum(col, row) },
    { at: 0.07, who: brick(place), pose: { pop: 0 } },
  ]
}

/** A deep sleeper touched by a ball that is not hot stirs back to ordinary sleep. */
export function stir(place: number, col: number, row: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { pop: 0.6 }, notes: [...v.snrk, ...v.hum(col, row)] },
    { at: 0, who: brick(place), pose: { warm: 0 }, lasts: 0.4 },
    { at: 0.08, who: brick(place), pose: { pop: 0 } },
  ]
}

/** How long a woken brick takes to climb down the wall. */
export const CLIMB_SECONDS = 1.1

/** A wet ball wakes it with a splutter: it shakes itself dry like a dog, climbs down the wall by itself and lies down in the rubble. */
export function wake(heap: number, at = 0): Answer {
  const who = rubble(heap)
  return [
    { at, who, pose: { awake: 1, shake: 1 }, notes: v.splutter },
    { at, who, pose: { fall: 1 }, lasts: CLIMB_SECONDS },
    { at: at + 0.1, who, pose: { shake: -1 }, notes: v.shakeDry(0) },
    { at: at + 0.2, who, pose: { shake: 1 }, notes: v.shakeDry(1) },
    { at: at + 0.3, who, pose: { shake: -1 }, notes: v.shakeDry(2) },
    { at: at + 0.4, who, pose: { shake: 0 } },
    { at: at + CLIMB_SECONDS, who, pose: { awake: 0, peek: 1 } },
  ]
}

/** A hot ball: it snuggles, glows warm and snores twice as deep. */
export function snuggle(place: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { snug: 1 }, notes: v.mmm },
    { at: 0, who: brick(place), pose: { warm: 1 }, lasts: 0.5 },
    { at: 0.5, who: brick(place), pose: { snug: 0, snore: 1 }, notes: v.snore(true) },
    { at: 1.0, who: brick(place), pose: { snore: 0 } },
  ]
}

/** How long a sleepy brick takes to drop one row. */
export const TIP_SECONDS = 0.2

/** A heavy ball tips it out of bed: it drops one row onto its mattress, still asleep. `place` is where it lands. */
export function tipOut(place: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { sink: -1 }, lasts: 0, notes: v.bedSpring },
    { at: 0, who: brick(place), pose: { sink: 0 }, lasts: TIP_SECONDS },
    { at: TIP_SECONDS, who: brick(place), pose: { pop: 1 }, notes: v.whumpf },
    { at: TIP_SECONDS + 0.08, who: brick(place), pose: { pop: 0 } },
    { at: TIP_SECONDS + 0.4, who: brick(place), pose: { snore: 1 }, notes: v.snore(false) },
    { at: TIP_SECONDS + 0.8, who: brick(place), pose: { snore: 0 } },
  ]
}

/** From the lowest row it can reach it drops into the rubble, snoring. */
export function tipToRubble(heap: number): Answer {
  const who = rubble(heap)
  return [
    { at: 0, who, pose: { fall: 1 }, lasts: 0.4, notes: v.bedSpring },
    { at: 0.4, who, pose: { peek: 1 }, notes: v.whumpf },
    { at: 0.8, who, pose: { snore: 1 }, notes: v.snore(false) },
    { at: 1.2, who, pose: { snore: 0 } },
  ]
}

/** A finger on a sleepy brick: one eye opens, it grumbles and turns over. `to` is which way it lies afterwards, 0 or 1. */
export function fingerSleepy(place: number, to: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { eye: 1 }, notes: v.hrmf },
    { at: 0.25, who: brick(place), pose: { turn: to } },
    { at: 0.7, who: brick(place), pose: { eye: 0 } },
  ]
}

// --- The pool an ice brick melts into ----------------------------------------------

/** A plain ball rolls through the pool with a small sound and leaves wet tracks. */
export function poolPlip(place: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { ripple: 1 }, notes: v.plip },
    { at: 0.08, who: brick(place), pose: { ripple: 0 } },
  ]
}

/** A wet ball splashes the pool across the bricks on either side, and the pool is gone. The walrus wallows for the splash. */
export function poolSplash(place: number): Answer {
  return byTime([
    { at: 0, who: brick(place), pose: { splash: 0 }, lasts: 0 },
    { at: 0, who: brick(place), pose: { splash: 1 }, lasts: 0.4, notes: v.splash },
    ...walrusWallow(TOY_AFTER),
  ])
}

/** A hot ball boils the pool off into a cloud that fogs every glass brick. `glass` are the places of the glass bricks. */
export function poolBoil(place: number, glass: readonly number[]): Answer {
  const beats: Beat[] = [
    { at: 0, who: brick(place), pose: { boil: 0 }, lasts: 0 },
    { at: 0, who: brick(place), pose: { boil: 1 }, lasts: 0.8, notes: v.pshh },
  ]
  for (const other of glass) {
    beats.push({ at: 0.25, who: brick(other), pose: { fog: 1.6 }, lasts: 0.5 })
    beats.push({ at: 2.4, who: brick(other), pose: { fog: 0 }, lasts: 1.6 })
  }
  return byTime(beats)
}

/** A heavy ball lands in the pool with a great splash that soaks the three large toys, each of which takes it as itself. */
export function poolSploosh(place: number): Answer {
  const late = MANNERS.elephant.late
  return byTime([
    { at: 0, who: brick(place), pose: { ripple: 2 }, notes: v.sploosh },
    { at: 0, who: brick(place), pose: { splash: 0 }, lasts: 0 },
    { at: 0, who: brick(place), pose: { splash: 1 }, lasts: 0.5 },
    { at: 0.5, who: brick(place), pose: { splash: 0 }, lasts: 0 },
    { at: 0.1, who: brick(place), pose: { ripple: 0 } },
    { at: TOY_AFTER, who: 'walrus', pose: { soak: 1 }, lasts: 0 },
    { at: TOY_AFTER, who: 'dragon', pose: { soak: 1 }, lasts: 0 },
    { at: TOY_AFTER, who: 'elephant', pose: { soak: 1 }, lasts: 0 },
    { at: 0.5, who: 'walrus', pose: { soak: 0 }, lasts: 1.2 },
    { at: 0.5, who: 'dragon', pose: { soak: 0 }, lasts: 1.2 },
    { at: 0.5, who: 'elephant', pose: { soak: 0 }, lasts: 1.2 },
    ...walrusWallow(TOY_AFTER),
    ...dragonWet().map((beat) => ({ ...beat, at: beat.at + TOY_AFTER })),
    { at: TOY_AFTER + late, who: 'elephant', pose: { shake: 1, ears: 0.8 }, notes: v.earFlap(1) },
    { at: TOY_AFTER + 0.16 + late, who: 'elephant', pose: { shake: -1, ears: -0.6 }, notes: v.earFlap(0.7) },
    { at: TOY_AFTER + 0.32 + late, who: 'elephant', pose: { shake: 0, ears: 0 } },
  ])
}

// --- The bell, the folded wall and the wall's ending ---------------------------

/** Who rang the bell: a finger, or the ball as the kind it is. */
export type Ringer = 'finger' | BallKind

function bellBeats(by: Ringer): Beat[] {
  const size = by === 'finger' ? 0.5 : by === 'heavy' ? 1.4 : 1
  const notes = by === 'finger' ? v.ting : by === 'wet' ? v.bellWet : by === 'hot' ? v.bellHot : by === 'heavy' ? v.gong : v.bell
  const beats: Beat[] = [
    { at: 0, who: 'bell', pose: { swing: size }, notes },
    { at: 0.3, who: 'bell', pose: { swing: -0.5 * size } },
    { at: 0.6, who: 'bell', pose: { swing: 0 } },
  ]
  // A wet ball leaves it dripping, a hot one glowing.
  if (by === 'hot') beats.push({ at: 0, who: 'bell', pose: { glow: 1 }, lasts: 0.1 }, { at: 0.4, who: 'bell', pose: { glow: 0 }, lasts: 1.2 })
  if (by === 'wet') beats.push({ at: 0, who: 'bell', pose: { drip: 0 }, lasts: 0 }, { at: 0, who: 'bell', pose: { drip: 1 }, lasts: 0.6 }, { at: 0.6, who: 'bell', pose: { drip: 0 }, lasts: 0 })
  return beats
}

/** The bell rung while bricks still stand: the folded wall rustles and stays folded. */
export function bellStanding(by: Ringer): Answer {
  return byTime([
    ...bellBeats(by),
    { at: 0.12, who: 'folded', pose: { shake: 1 }, notes: v.rustle },
    { at: 0.3, who: 'folded', pose: { shake: 0 } },
  ])
}

/** The bell rung over a cleared wall by the flight that took the last brick: it rings as a bell and unfolds nothing. */
export function bellOnly(by: Ringer): Answer {
  return byTime(bellBeats(by))
}

/** How long after the bell the first brick of the new wall stands up, and the gap from one brick to the next. */
export const STAND_FROM = 1.15
export const STAND_GAP = 0.085

/**
 * The bell rung over a cleared wall: the faces duck down into the rubble, the rubble is swept off by the folded
 * wall's own shadow, the concertina drops open row by row, and each brick of the new wall stands up in its place
 * with its own note, low to high. `places` are the places that hold a brick.
 */
export function unfold(by: Ringer, heaps: number, places: readonly number[], cols: number, rows: number): Answer {
  const beats: Beat[] = [...bellBeats(by)]
  beats.push({ at: 0, who: 'folded', pose: { lift: 0 } })
  for (let heap = 0; heap < heaps; heap++) beats.push({ at: 0.04 + heap * 0.02, who: rubble(heap), pose: { peek: 0 } })
  beats.push({ at: 0.3, who: 'folded', pose: { sweep: 1 }, lasts: 0.45, notes: v.rustle })
  beats.push({ at: 0.75, who: 'folded', pose: { sweep: 0 }, lasts: 0, cue: { type: 'swept' } })
  for (let row = 0; row < rows; row++) beats.push({ at: 0.45 + row * 0.2, who: 'folded', pose: { open: row + 1 }, lasts: 0.18, notes: v.flap(row) })
  // Low to high: the foot row first, left to right.
  const order = [...places].sort((a, b) => (Math.floor(b / cols) - Math.floor(a / cols)) || (a % cols) - (b % cols))
  order.forEach((place, index) => {
    // Its moment to stand. The rules stand it up if the ball is out of its way, and its pop and its note are played
    // then (`stood`), once: a brick that has to wait makes no sound here.
    beats.push({ at: STAND_FROM + index * STAND_GAP, who: brick(place), pose: {}, cue: { type: 'stand', place } })
  })
  const end = STAND_FROM + order.length * STAND_GAP + 0.1
  beats.push({ at: end, who: 'folded', pose: { open: 0 }, lasts: 0.3 })
  // The toys have watched the sheet unfold and the wall stand, and turn back to the ball.
  for (const toy of WATCHERS) beats.push({ at: end + MANNERS[toy].late * 2, who: toy, pose: { watch: 0 } })
  return byTime(beats)
}

/** A brick stands up in its place: it pops, with its own note of the wall. Played once for each brick, when it stands. */
export function stood(place: number, col: number, row: number): Answer {
  return [
    { at: 0, who: brick(place), pose: { pop: 1 }, notes: v.standUp(col, row) },
    { at: 0.07, who: brick(place), pose: { pop: 0 } },
  ]
}

/** How long after the hit that takes the last brick the faces in the rubble start to look up. */
export const CLEARED_FROM = 1.3

/** The three large toys, in the order they turn to look: each after its own manner's delay. */
const WATCHERS: readonly ToyName[] = ['dragon', 'walrus', 'elephant']

/** How long after the faces in the rubble the folded wall lifts its corner. */
const CORNER_AFTER = 1.7

/**
 * The hit that takes the last brick off a wall. Once the brick has landed, the faces in the rubble look up one
 * after another, in the order they fell. No toy answers the clearing: each turns, after its own delay, to watch the
 * folded wall, in its own posture and without a sound, and goes on watching until the next wall stands. Then the
 * folded wall lifts its near corner towards the bell and keeps it lifted, and the bell swings once and hangs still.
 * The bell and the unfolding are the scene.
 */
export function cleared(heaps: number): Answer {
  const beats: Beat[] = []
  for (let heap = 0; heap < heaps; heap++) {
    beats.push({ at: CLEARED_FROM + heap * 0.07, who: rubble(heap), pose: { peek: 1.5, look: 1 } })
    beats.push({ at: CLEARED_FROM + heap * 0.07 + 0.3, who: rubble(heap), pose: { peek: 1 } })
  }
  const toys = CLEARED_FROM + heaps * 0.07 + 0.3
  for (const toy of WATCHERS) beats.push({ at: toys + MANNERS[toy].late * 2, who: toy, pose: { watch: 1 } })
  const after = toys + CORNER_AFTER
  beats.push({ at: after, who: 'folded', pose: { lift: 1 }, notes: v.rustle })
  beats.push({ at: after + 0.35, who: 'bell', pose: { swing: 0.45 }, notes: v.ting })
  beats.push({ at: after + 0.65, who: 'bell', pose: { swing: 0 } })
  return byTime(beats)
}

// --- The first showings ---------------------------------------------------------

/**
 * The hot gate, shown once: the dragon coughs up a spare ball of its own, which glows; it rolls once round the
 * dragon's feet, leaving a scorched ring that fades, and the dragon swallows it again. `spare` is how far the
 * spare ball is along its way: out of the mouth by 0.2, round the feet to 0.85, back in at 1. The scorch is laid
 * where the ball has been: the view draws it from where the ball set off up to the ball, and whole once it is round.
 */
export function showHotGate(): Answer {
  return [
    { at: 0, who: 'dragon', pose: { spare: 0, scorched: 0 }, lasts: 0 },
    { at: 0, who: 'dragon', pose: { jaw: 1, neck: 0.6 }, notes: v.cough },
    { at: 0, who: 'dragon', pose: { spare: 0.2 }, lasts: 0.35 },
    { at: 0.35, who: 'dragon', pose: { jaw: 0, neck: 0 } },
    { at: 0.4, who: 'dragon', pose: { scorched: 1 }, lasts: 0, notes: v.scorch },
    { at: 0.4, who: 'dragon', pose: { spare: 0.85 }, lasts: 1.5 },
    { at: 1.9, who: 'dragon', pose: { jaw: 1, neck: 0.6 } },
    { at: 1.9, who: 'dragon', pose: { spare: 1 }, lasts: 0.4 },
    { at: 2.3, who: 'dragon', pose: { jaw: 0, neck: 0, gulp: 1 }, notes: v.gulp },
    { at: 2.3, who: 'dragon', pose: { spare: 0 }, lasts: 0 },
    { at: 2.3, who: 'dragon', pose: { scorched: 0 }, lasts: 1 },
    { at: 2.6, who: 'dragon', pose: { gulp: 0 } },
    { at: 3.3, who: 'dragon', pose: {} },
  ]
}

/**
 * The wet gate, shown once: the walrus lifts a spare ball out of its tub on its nose, dripping, drops it back with
 * a splash and snorts. `spare` is how far the spare ball is along its way: up on the nose by 0.5, back in the
 * water at 1.
 */
export function showWetGate(): Answer {
  return byTime([
    { at: 0, who: 'walrus', pose: { spare: 0 }, lasts: 0 },
    { at: 0, who: 'walrus', pose: { sink: 0.5 }, notes: v.under },
    { at: 0.45, who: 'walrus', pose: { sink: 0 } },
    { at: 0.45, who: 'walrus', pose: { spare: 0.5 }, lasts: 0.4 },
    { at: 1.0, who: 'walrus', pose: { dripping: 1 }, lasts: 0, notes: v.drip },
    { at: 1.35, who: 'walrus', pose: { dripping: 2 }, lasts: 0, notes: v.drip },
    { at: 1.7, who: 'walrus', pose: { dripping: 3 }, lasts: 0, notes: v.drip },
    { at: 1.9, who: 'walrus', pose: { spare: 1 }, lasts: 0.3 },
    { at: 2.2, who: 'walrus', pose: { spare: 0, dripping: 0 }, lasts: 0, notes: v.plunge },
    { at: 2.2, who: 'walrus', pose: { plop: 0 }, lasts: 0 },
    { at: 2.2, who: 'walrus', pose: { plop: 1 }, lasts: 0.3 },
    { at: 2.5, who: 'walrus', pose: { plop: 0 }, lasts: 0 },
    ...walrusSnort(2.45),
    { at: 3.0, who: 'walrus', pose: {} },
  ])
}

// --- A finger on a large toy, or on the ladybird ------------------------------

/** The walrus's whiskers twang, and it slaps its belly with one flipper. The other stays on the rim: it is no clap. */
export function pokeWalrus(): Answer {
  return [
    { at: 0, who: 'walrus', pose: { whisk: 1 }, notes: v.twang },
    { at: 0.36, who: 'walrus', pose: { pat: 1, belly: 1, whisk: 0 }, notes: v.slap },
    { at: 0.52, who: 'walrus', pose: { pat: 0, belly: 0 } },
  ]
}

/** The dragon hiccups a smoke ring. */
export function pokeDragon(): Answer {
  return [
    { at: 0, who: 'dragon', pose: { neck: -0.8, jaw: 0.25 }, notes: v.hic },
    { at: 0.13, who: 'dragon', pose: { neck: 0.5, jaw: 1, flame: 1.6 }, notes: v.flare },
    { at: 0.13, who: 'dragon', pose: { ring: 1 }, lasts: 0.85 },
    { at: 0.3, who: 'dragon', pose: { neck: 0, jaw: 0, flame: 1 }, notes: v.puff },
    { at: 1.0, who: 'dragon', pose: { ring: 0 }, lasts: 0 },
  ]
}

/** The elephant toots a short raspberry and flaps both ears. */
export function pokeElephant(): Answer {
  return [
    { at: 0, who: 'elephant', pose: { trunk: 1, hop: 1 }, notes: v.toot },
    { at: 0.28, who: 'elephant', pose: { ears: 1, hop: 0 }, notes: v.earFlap(1) },
    { at: 0.48, who: 'elephant', pose: { ears: -0.6, trunk: 0 }, notes: v.earFlap(0.6) },
    { at: 0.68, who: 'elephant', pose: { ears: 0 } },
  ]
}

/** How long the ladybird is in the air. */
export const FLIGHT_SECONDS = 0.55

/** The ladybird opens its wings with a whirr and settles further along. */
export function pokeLadybird(): Answer {
  return [
    { at: 0, who: 'ladybird', pose: { wings: 1 }, notes: v.whirr, cue: { type: 'fly' } },
    { at: 0, who: 'ladybird', pose: { flight: 1 }, lasts: FLIGHT_SECONDS },
    { at: FLIGHT_SECONDS, who: 'ladybird', pose: { wings: 0 }, notes: v.tap, cue: { type: 'land' } },
    { at: FLIGHT_SECONDS, who: 'ladybird', pose: { flight: 0 }, lasts: 0 },
  ]
}

// --- Playing an answer ---------------------------------------------------------

type Running = { beats: Answer; age: number; next: number; born: number }

/** What the player hands each beat to: the pose, the notes and the cue, in that order, at one moment. */
export type Stage = {
  pose(who: Who, channels: Readonly<Record<string, number>>, lasts: number | undefined): void
  sound(notes: Sound): void
  /** `finishing` is true when a touch is ending the scene the cue belongs to: the cue is obeyed and nothing is played for it. */
  cue(cue: Cue, finishing?: boolean): void
}

/** Plays answers on game time. Any number run at once, and none blocks a touch. */
export class AnswerPlayer {
  private running: Running[] = []
  private readonly stage: Stage
  private steps = 0

  constructor(stage: Stage) {
    this.stage = stage
  }

  /** Starts an answer. Its first beats play now, in the caller's frame. */
  start(answer: Answer): void {
    const run: Running = { beats: answer, age: 0, next: 0, born: this.steps }
    this.play(run)
    if (run.next < run.beats.length) this.running.push(run)
  }

  step(seconds: number): void {
    this.steps += 1
    for (const run of this.running) {
      run.age += seconds
      this.play(run)
    }
    this.running = this.running.filter((run) => run.next < run.beats.length)
  }

  get busy(): boolean {
    return this.running.length > 0
  }

  /** How many steps have been played: an answer started now is `born` in this one. */
  get now(): number {
    return this.steps
  }

  /**
   * The answers that were started in step `born` make no more sound: their poses and cues go on, unheard. A touch
   * that ends a scene asks this for the step the scene's hit was made in, so what that hit set off (the fall of
   * the last brick) is silent with the scene, and everything else that is playing keeps its sound.
   */
  hush(born: number): void {
    for (const run of this.running) {
      if (run.born !== born) continue
      run.beats = run.beats.map((beat, index) => (index < run.next || !beat.notes ? beat : { ...beat, notes: undefined }))
    }
  }

  /**
   * Whatever is still to come for one thing is dropped: it has moved on, and a late beat must not find it. With
   * `keepCues`, a beat that cues the rules stays, since the rules wait for it.
   */
  forget(who: Who, keepCues = false): void {
    for (const run of this.running) {
      const left = run.beats.filter((beat, index) => index < run.next || beat.who !== who || (keepCues && beat.cue !== undefined))
      if (left.length !== run.beats.length) run.beats = left
    }
    this.running = this.running.filter((run) => run.next < run.beats.length)
  }

  private play(run: Running): void {
    while (run.next < run.beats.length && run.beats[run.next].at <= run.age + 1e-9) {
      const beat = run.beats[run.next++]
      this.stage.pose(beat.who, beat.pose, beat.lasts)
      if (beat.notes) this.stage.sound(beat.notes)
      if (beat.cue) this.stage.cue(beat.cue)
    }
  }
}

/**
 * An answer as the beats of a scene (scene.ts): each beat happens once, at its moment, and sets its pose, plays
 * its notes and cues the rules together. A touch that ends the scene lands every beat that is left with its pose
 * at its end and its cue given, and plays none of its notes: the scene is silent from that frame.
 */
export function sceneBeats(answer: Answer, stage: Stage): SceneBeat[] {
  return answer.map((beat) => ({
    at: beat.at,
    lasts: 0,
    play: (_progress: number, finishing: boolean) => {
      stage.pose(beat.who, beat.pose, finishing ? 0 : beat.lasts)
      if (beat.notes && !finishing) stage.sound(beat.notes)
      if (beat.cue) stage.cue(beat.cue, finishing)
    },
  }))
}
