// What the customers do, as data: every clip is a handful of keyframes for
// each figure of an animal and for the thing it was handed. cast.ts plays
// them. Times are seconds into the clip. A track that is not written rests,
// every track starts from rest, and it eases back to rest by the clip's end
// unless its last key is at the end. Animals face the bakery, to the right:
// a positive turn leans toward the peel, and a negative dy is up.

import { REACTIONS, type Occasion } from './consequence'
import type { Pose } from './motion'
import { FIGURE, FIGURES_OF } from './stage'
import type { Animal } from './tastes'

/** A stage direction: 'walk' is a gait in place that loops until `rest`; 'sniff' and 'bite' are the first beats of an ending; 'carry' is the gait of leaving with the bread. */
export type Direction = 'walk' | 'sniff' | 'bite' | 'carry'
/** Where the thing handed over is while a clip holds it: shares of the animal's main figure box (0,0 top left, 1,1 bottom right), how it is turned (radians) and scaled. */
export type Held = { u: number; v: number; turn: number; scale: number }

/** A value at a time. It is eased into smoothly, or with `HIT` reached at full speed: a blow, a landing, a snap. */
export type Key = readonly [at: number, value: number, ease?: number]
export const HIT = 1
/** One figure's part in a clip. Slides are reference units, scales are about 1, and `open` lists the spans with the mouth or beak open (frame 1). */
export type Part = { dx?: readonly Key[]; dy?: readonly Key[]; turn?: readonly Key[]; sx?: readonly Key[]; sy?: readonly Key[]; open?: readonly (readonly [number, number])[] }
/** The path of the thing. It rests on the ledge in front of the animal. */
export type Hold = { u?: readonly Key[]; v?: readonly Key[]; turn?: readonly Key[]; scale?: readonly Key[] }
export const LEDGE: Held = { u: 0.7, v: 1.02, turn: 0, scale: 1 }

export type Clip = {
  name: string
  length: number
  /** A part for each figure of the animal, in the order of `FIGURES_OF`; a figure with none rests. */
  figures: readonly (Part | undefined)[]
  /** With no `held` the clip holds nothing. */
  held?: Hold
  /** The thing stays where the clip leaves it, until the animal is told something else. */
  stays?: boolean
  loop?: boolean
  voices: readonly (readonly [number, string])[]
}
/** Something a figure does on its own, now and then: first at about `first` seconds on stage, then every so often. */
export type Habit = { first: number; every: readonly [number, number]; clips: readonly Clip[] }
export type Role = {
  /** The idle life that never stops: breathing, chewing. Adds to the pose; scales are sums about 0 here. */
  rest?: (t: number, figure: number, p: Pose) => void
  habits: readonly Habit[]
  pokes: readonly Clip[]
  reactions: Partial<Record<Occasion, Clip>>
  directions: Record<Direction, Clip>
}

// --- Shorthands ----------------------------------------------------------------

const TAU = Math.PI * 2
/** A shake about rest that dies away: `swings` of them between two times. */
const shake = (from: number, to: number, size: number, swings: number, about = 0): Key[] =>
  Array.from({ length: swings }, (_, i): Key => [from + ((i + 0.5) * (to - from)) / swings, about + (i % 2 ? -size : size) * (1 - i / (swings + 1))])
/** Bumps to one side and back: `count` of them between two times. */
const bobs = (from: number, to: number, size: number, count: number, about = 0): Key[] =>
  Array.from({ length: count }, (_, i): Key[] => [[from + ((i + 0.5) * (to - from)) / count, about + size], [from + ((i + 1) * (to - from)) / count, about]]).flat()
/** Blows that land at the given times, each wound up just before and let go of just after. */
const hits = (times: readonly number[], size: number, about = 0, wind = 0.1, back = 0.12): Key[] => times.flatMap((at): Key[] => [[at - wind, about], [at, about + size, HIT], [at + back, about]])
/** The same part, begun later: how a row of birds does one thing one after another. */
function late(part: Part, by: number): Part {
  const out: { -readonly [K in keyof Part]: Part[K] } = {}
  for (const channel of ['dx', 'dy', 'turn', 'sx', 'sy'] as const) if (part[channel]) out[channel] = part[channel].map(([at, value, ease]): Key => [at + by, value, ease])
  if (part.open) out.open = part.open.map(([from, to]) => [from + by, to + by] as const)
  return out
}
/** A clip for one figure of an animal, the others resting. */
const solo = (name: string, figure: number, length: number, part: Part, ...voices: [number, string][]): Clip => ({ name, length, figures: Object.assign([], { [figure]: part }), voices })
const all = (name: string, length: number, figures: Part[], ...voices: [number, string][]): Clip => ({ name, length, figures, voices })
const habit = (first: number, least: number, most: number, ...clips: Clip[]): Habit => ({ first, every: [least, most], clips })

/** What each occasion is voiced with: `<animal>-yes`, `-no` or `-huh`, once, at the clip's peak. */
const SAYS: Record<Occasion, string> = { wanted: 'yes', secret: 'yes', hated: 'no', crumb: 'no', shape: 'no', crust: 'no', seeds: 'no', nothing: 'huh', dust: 'huh', wet: 'huh', 'loose-seeds': 'huh', raw: 'huh' }
type Draft = { length: number; peak: number; figures: (Part | undefined)[]; held: Hold }
/** A reaction: how long, when its voice comes, the main figure's part, the path of the thing, and the parts of the other figures. */
const act = (length: number, peak: number, main: Part, held: Hold = {}, ...others: (Part | undefined)[]): Draft => ({ length, peak, figures: [main, ...others], held })
function reactions(animal: Animal, drafts: Partial<Record<Occasion, Draft>>): Partial<Record<Occasion, Clip>> {
  const out: Partial<Record<Occasion, Clip>> = {}
  for (const occasion of Object.keys(drafts) as Occasion[]) {
    const { length, peak, figures, held } = drafts[occasion]!
    // A wanted thing stays with the animal; a secret is played on the peel itself, so nothing is held.
    out[occasion] = { name: REACTIONS[animal][occasion] ?? `${animal}-${occasion}`, length, figures, held: occasion === 'secret' ? undefined : held, stays: occasion === 'wanted', voices: [[peak, `${animal}-${SAYS[occasion]}`]] }
  }
  return out
}

/** How an animal goes about the plain beats: how far its nose comes down to sniff, how hard it chomps, its gait and footfalls, and where it keeps a bread it carries. */
type Manner = { lean: number; drop: number; chomp: number; cycle: number; steps: readonly number[]; gait: Part[]; keep: readonly [number, number, number?, number?] }
function directions(animal: Animal, { lean, drop, chomp, cycle, steps, gait, keep }: Manner): Record<Direction, Clip> {
  const [mu, mv] = FIGURE[FIGURES_OF[animal][0]].mouth, feet = steps.map((at): [number, string] => [at, `${animal}-step`])
  return {
    sniff: { name: 'sniff', length: 0.7, figures: [{ turn: [[0.18, lean], [0.28, lean * 0.75], [0.38, lean], [0.48, lean * 0.75], [0.58, lean]], dy: [[0.18, drop], [0.58, drop]] }], held: {}, voices: [] },
    bite: {
      name: 'bite', length: 0.9, voices: [],
      figures: [{ open: [[0.08, 0.37]], turn: [[0.3, lean * 0.5], [0.5, lean * 0.5]], sy: [[0.3, 1.03], [0.38, 1 - chomp, HIT], [0.56, 1.02], [0.72, 1]] }],
      held: { u: [[0.3, mu], [0.52, mu]], v: [[0.3, mv], [0.52, mv]], scale: [[0.36, 1], [0.42, 0.86], [0.6, 0.9]] },
    },
    walk: { name: 'walk', length: cycle, loop: true, figures: gait, voices: feet },
    carry: { name: 'carry', length: cycle, loop: true, figures: gait, stays: true, voices: feet, held: { u: [[0, keep[0]]], v: [[0, keep[1]]], turn: [[0, keep[2] ?? 0]], scale: [[0, keep[3] ?? 1]] } },
  }
}
const at = (animal: Animal) => { const made = FIGURE[FIGURES_OF[animal][0]]; return { mu: made.mouth[0], mv: made.mouth[1], bu: made.basket[0], bv: made.basket[1] } }

// --- The goat: light, twitchy, quick. Everything is done with the head, and the horns are the point of it. ---

function goat(): Role {
  const { mu, mv } = at('goat'), hu = mu - 0.36, hv = mv - 0.38
  return {
    // Chewing, in spells.
    rest: (t, _figure, p) => { const chew = Math.sin(TAU * 2.3 * t) * (0.65 + 0.35 * Math.sin((TAU * t) / 5.3)); p.dx += 2 * chew; p.turn += 0.007 * chew },
    // Its want, always on show: two knocks of the horns on the post, each heard as it lands.
    habits: [habit(3.2, 6, 9, solo('knock', 0, 0.8, { turn: [[0.02, 0], [0.11, 0.1, HIT], [0.27, 0], [0.32, 0], [0.41, 0.1, HIT], [0.6, -0.02]], dx: [[0.02, 0], [0.11, 5, HIT], [0.27, 0], [0.32, 0], [0.41, 5, HIT], [0.6, 0]] }, [0.11, 'goat-tock'], [0.41, 'goat-tock']))],
    pokes: [
      solo('head-toss', 0, 0.8, { turn: [[0.09, -0.14], [0.2, -0.14], [0.36, 0.03], [0.47, -0.07], [0.6, 0.02]], dy: [[0.16, -6], [0.3, 0, HIT]], open: [[0.05, 0.3]] }, [0.04, 'goat-huh']),
      solo('beard-waggle', 0, 0.7, { dx: shake(0.1, 0.7, 5, 7), turn: shake(0.1, 0.7, 0.03, 7), sy: [[0.06, 0.94, HIT], [0.24, 1]] }, [0.03, 'goat-huh']),
    ],
    reactions: reactions('goat', {
      // Up onto the horns, a rear back, and two cracks; then it crunches, with the rest still up there.
      wanted: act(2.8, 1, { turn: [[0.5, -0.1], [0.78, -0.13], [1, 0.14, HIT], [1.25, -0.08], [1.5, 0.14, HIT], [1.8, 0]], dy: [[0.9, 0], [1, 4, HIT], [1.15, 0], [1.4, 0], [1.5, 4, HIT], [1.65, 0]], sy: bobs(1.9, 2.6, -0.05, 3, 1), open: [[1.9, 2.02], [2.14, 2.26], [2.38, 2.5]] },
        { u: [[0.5, hu]], v: [[0.5, hv - 0.08], [0.95, hv - 0.12], [1, hv, HIT], [1.22, hv - 0.1], [1.5, hv, HIT], [1.7, hv - 0.01]], turn: [[0.9, 0], [1, 0.2, HIT], [1.5, -0.15, HIT], [1.9, 0.05]] }),
      // It lands on a horn like a hat and squashes there; the goat goes quite still, then nods it off.
      hated: act(1.8, 0.5, { turn: [[0.3, -0.04], [0.45, 0.02], [1.25, 0.02], [1.5, 0.12], [1.7, 0]], sy: [[0.32, 1], [0.42, 0.95, HIT], [0.6, 1.02], [1.25, 1.02]], open: [[0.45, 0.8]] },
        { u: [[0.4, hu - 0.08], [1.3, hu - 0.08], [1.55, mu]], v: [[0.4, hv + 0.02, HIT], [1.3, hv + 0.02], [1.55, mv + 0.1]], scale: [[0.4, 1], [0.48, 0.84], [0.7, 0.9], [1.3, 0.9], [1.5, 1]], turn: [[1.3, 0], [1.55, 0.5]] }),
      nothing: act(1.5, 0.4, { turn: [[0.35, 0.16], [1.15, 0.15]], dy: [[0.35, 6], [1.15, 6]], sy: bobs(0.44, 1.16, -0.04, 3, 1), open: [[0.44, 0.56], [0.68, 0.8], [0.92, 1.04]] }, { u: [[0.5, 0.73], [0.74, 0.68], [0.98, 0.73], [1.2, 0.7]] }),
      // A long breath in, a sneeze straight down into the flour, and a beard to shake out.
      dust: act(1.6, 0.82, { turn: [[0.7, -0.08], [0.82, 0.2, HIT], [1, 0.02], ...shake(1.02, 1.5, 0.04, 5)], sy: [[0.7, 1.06], [0.82, 0.9, HIT], [1.05, 1]], open: [[0.68, 0.96]] }, { u: [[0.76, 0.7], [0.86, 0.84, HIT], [1.3, 0.72]], scale: [[0.78, 1], [0.9, 1.14], [1.3, 1]] }),
      wet: act(1.5, 0.45, { turn: [[0.3, 0.1], [0.42, 0.06], ...shake(0.45, 1.4, 0.12, 9)], dx: shake(0.45, 1.4, 6, 9) }, { v: [[0.3, 1.02], [0.36, 1.04], [0.5, 1.02]], scale: bobs(0.45, 1.25, 0.05, 4, 1) }),
      // One seed goes up into the beard; a look down the nose, and the chin wags it out.
      'loose-seeds': act(1.7, 0.5, { turn: [[0.4, 0.09], [0.6, 0.09], ...bobs(0.62, 1.22, -0.05, 4, 0.09), [1.4, 0]], sy: [[0.45, 1.03], [0.6, 1.03]] }, { u: [[0.4, mu - 0.02], [1.22, mu - 0.02]], v: [[0.4, mv + 0.2], ...bobs(0.62, 1.22, 0.015, 4, mv + 0.2), [1.45, 0.95]], scale: [[0.4, 0.5], [1.22, 0.5], [1.5, 1]] }),
      // Hooked on a horn and pulled: the dough stretches as the head goes back, and snaps home.
      raw: act(1.8, 1.15, { turn: [[0.35, 0.1], [1, -0.15], [1.15, 0.08, HIT], [1.35, -0.04], [1.55, 0.02]], dy: [[0.35, 4], [1, -3], [1.15, 2, HIT], [1.3, 0]], open: [[1.1, 1.4]] },
        { v: [[0.4, 0.92], [1, 0.62], [1.15, 1.02, HIT]], u: [[0.4, 0.68], [1, 0.6], [1.15, 0.7, HIT]], scale: [[0.4, 1], [1, 1.3], [1.15, 0.9, HIT], [1.35, 1]], turn: [[0.4, 0], [1, -0.3], [1.15, 0, HIT]] }),
      // Set proudly on the horns, it wobbles, tips and drops, and bounces once on the ledge.
      crumb: act(1.6, 1.25, { dy: [[0.35, -5], [0.9, -5], [1.1, 0]], turn: [[0.35, -0.05], [0.9, -0.03], [1.3, 0.1], [1.45, 0.1]], open: [[1, 1.3]] },
        { u: [[0.35, hu], [0.9, hu + 0.04], [1.25, 0.72]], v: [[0.35, hv - 0.04], [0.9, hv - 0.02], [1.25, 1.02, HIT], [1.36, 0.92], [1.48, 1.02, HIT]], turn: [...shake(0.42, 0.9, 0.22, 4), [1.25, 0.6, HIT], [1.48, 0]] }),
    }),
    // A trot: two quick springs to the cycle.
    directions: directions('goat', { lean: 0.12, drop: 5, chomp: 0.07, cycle: 0.52, steps: [0, 0.26], gait: [{ dy: [[0.13, -8], [0.26, 0, HIT], [0.39, -8], [0.52, 0, HIT]], turn: [[0.13, 0.04], [0.39, -0.04]] }], keep: [hu, hv - 0.01] }),
  }
}

// --- The sparrows: the lightest and the fastest. Three birds, each on its own beat. ---

function sparrows(): Role {
  const { mu, mv, bu, bv } = at('sparrows')
  const peck = (from: number): Part => ({ turn: [[from, 0], [from + 0.06, 0.13, HIT], [from + 0.16, 0]], open: [[from + 0.04, from + 0.12]] })
  const pecks = (...times: number[]): Part => ({ turn: times.flatMap((from) => peck(from).turn!), open: times.flatMap((from) => peck(from).open!) })
  const hop = (from: number, high: number, far = 0): Part => ({ dy: [[from, 0], [from + 0.11, -high], [from + 0.22, 0, HIT]], dx: [[from, 0], [from + 0.22, far]], sy: [[from + 0.2, 1], [from + 0.25, 0.87], [from + 0.38, 1]], sx: [[from + 0.2, 1], [from + 0.25, 1.08], [from + 0.38, 1]] })
  // Each bird: its beat, when it first stirs, and how high it hops.
  const birds = [[2.6, 2.1, 6], [1.7, 0.9, 10], [2.1, 1.4, 12]] as const
  return {
    habits: birds.flatMap(([beat, first, high], bird) => [
      habit(first, beat * 0.7, beat * 1.4, solo('hop', bird, 0.4, hop(0, high)), solo('peck', bird, 0.2, peck(0)), solo('two-pecks', bird, 0.4, pecks(0, 0.2))),
      habit(first + beat * 2.5, beat * 3, beat * 6, solo('chirp', bird, 0.5, { sy: [[0.25, 1.1]], turn: [[0.25, -0.07]], open: [[0.1, 0.32]] }, [0.12, 'sparrow-chirp'])),
    ]),
    pokes: [
      all('scatter', 0.9, [hop(0.1, 20), hop(0, 14), hop(0.22, 24)].map((part, i) => ({ ...part, turn: [[0.1 * i + 0.1, -0.1], [0.1 * i + 0.3, 0]] })), [0, 'sparrows-huh']),
      all('heads-cocked', 0.9, [0.08, 0, 0.16].map((by) => late({ turn: [[0.08, -0.16, HIT], [0.5, -0.16], [0.62, 0.03]], sy: [[0.08, 1.06], [0.5, 1.06]] }, by)), [0.05, 'sparrows-huh']),
    ],
    reactions: reactions('sparrows', {
      // It comes down to their feet in crumbs and all three go at it, each in its own time, with a hop for joy.
      wanted: act(2.4, 1.72, { ...pecks(0.35, 0.58, 0.8, 1.05, 1.28), dy: [[1.6, 0], [1.74, -18], [1.9, 0, HIT], [2.02, -7], [2.14, 0, HIT]], sy: [[1.88, 1], [1.93, 0.86], [2.05, 1]] },
        { u: [[0.3, bu]], v: [[0.3, bv]], scale: [[0.3, 1], [1.5, 0.8]] },
        { ...pecks(0.42, 0.62, 0.95, 1.14, 1.4), dy: [[1.7, 0], [1.84, -14], [2, 0, HIT]] }, { ...pecks(0.5, 0.78, 0.98, 1.3), dy: [[1.78, 0], [1.94, -22], [2.12, 0, HIT]] }),
      // Tink, tink, tink: and the row bounces off it backwards, one after another.
      hated: act(1.7, 0.72, { ...pecks(0.24, 0.44, 0.64), dx: [[0.72, 0], [0.98, -16], [1.3, -16], [1.52, 0]], dy: [[0.72, 0], [0.84, -18], [0.98, 0, HIT], [1.3, 0], [1.4, -8], [1.52, 0, HIT]], sy: [[0.96, 1], [1.02, 0.85], [1.16, 1]] },
        { turn: [[0.3, 0.04], [0.5, -0.04], [0.7, 0.05], [0.9, 0]], v: [[0.3, 1.03], [0.4, 1.02], [0.5, 1.03], [0.6, 1.02], [0.7, 1.035], [0.85, 1.02]] },
        late({ ...pecks(0.24, 0.44, 0.64), dx: [[0.72, 0], [0.98, -14], [1.2, -14], [1.4, 0]], dy: [[0.72, 0], [0.84, -14], [0.98, 0, HIT], [1.2, 0], [1.3, -8], [1.4, 0, HIT]] }, 0.14),
        late({ ...pecks(0.24, 0.44, 0.64), dx: [[0.72, 0], [0.98, 12], [1.1, 12], [1.3, 0]], dy: [[0.72, 0], [0.84, -22], [0.98, 0, HIT], [1.1, 0], [1.2, -8], [1.3, 0, HIT]] }, 0.26)),
      nothing: act(1.4, 0.9, { ...pecks(0.25, 0.46, 0.66), dx: [[0.1, 0], [0.22, 8], [1.1, 8]], dy: [[0.1, 0], [0.16, -7], [0.22, 0, HIT]], turn: [...pecks(0.25, 0.46, 0.66).turn!, [0.86, 0], [0.94, -0.14, HIT], [1.2, -0.12]] }, {}, late(pecks(0.3, 0.6), 0.1), late(pecks(0.2, 0.75), 0.2)),
      // A dust bath: in with a hop, and a shimmy that goes thin and wide.
      dust: act(1.8, 0.5, { dx: [[0.12, 0], [0.34, 12], [1.5, 12]], dy: [[0.12, 0], [0.23, -12], [0.34, 3, HIT], [1.45, 3], [1.56, -8], [1.68, 0, HIT]], sx: shake(0.45, 1.45, 0.14, 8, 1), turn: shake(0.5, 1.45, 0.1, 6), sy: [[0.4, 0.88], [1.4, 0.9]] },
        { scale: bobs(0.4, 1.4, 0.12, 4, 1), u: shake(0.45, 1.45, 0.025, 8, 0.7) }, hop(0.3, 10, 0), hop(0.6, 8, 0)),
      // Up in the air all at once, wings going, and down wet.
      wet: act(1.3, 0.2, { dy: [[0.14, 0], [0.34, -30], [0.62, -26], [0.82, 0, HIT]], sx: shake(0.26, 0.74, 0.16, 6, 1), sy: [[0.1, 0.9], [0.2, 1.05], [0.8, 1], [0.86, 0.84], [1.02, 1]], turn: [[0.34, -0.1], [0.7, -0.06], ...shake(0.9, 1.25, 0.05, 3)], open: [[0.16, 0.6]] },
        { scale: [[0.2, 1], [0.3, 1.1], [0.5, 0.96], [0.7, 1]], v: [[0.2, 1.02], [0.3, 1.04], [0.45, 1.02]] }, late(hop(0.14, 22), 0.05), late(hop(0.14, 30), 0.1)),
      // One seed, flicked from beak to beak down the row and back.
      'loose-seeds': act(1.9, 0.3, { turn: [[0.22, 0.12], [0.3, -0.16, HIT], [0.6, -0.1], [0.9, 0.04], [1.25, 0.1], [1.5, -0.12, HIT], [1.7, 0]], dy: [[0.3, 0], [0.38, -5], [0.46, 0, HIT]], open: [[0.24, 0.34], [1.2, 1.5]] },
        { u: [[0.25, mu], [0.6, -0.2], [0.75, -0.3], [1.15, mu + 0.6], [1.3, mu + 0.7], [1.5, mu], [1.75, 0.7]], v: [[0.25, mv], [0.42, -0.35], [0.6, mv - 0.05, HIT], [0.75, mv], [0.95, -0.5], [1.15, mv - 0.05, HIT], [1.3, mv], [1.4, 0.1], [1.5, mv, HIT]], scale: [[0.2, 0.5], [1.6, 0.5]], turn: [[0.25, 0], [1.5, 6.283], [1.9, 6.283]] },
        { turn: [[0.5, 0], [0.62, -0.16, HIT], [0.74, 0.1, HIT], [0.9, 0]], open: [[0.56, 0.78]] }, { turn: [[1.05, 0], [1.17, -0.16, HIT], [1.3, 0.1, HIT], [1.45, 0]], open: [[1.1, 1.34]] }),
      // Beak in, and stuck: it pulls itself tall, the dough comes too, and it pops off backwards.
      raw: act(1.8, 0.4, { turn: [[0.22, 0], [0.3, 0.2, HIT], [0.5, 0.2], [1.1, 0.08], [1.2, -0.14, HIT], [1.5, 0]], sy: [[0.5, 1], [1.1, 1.22], [1.2, 0.9, HIT], [1.4, 1]], dy: [[1.2, 0], [1.32, -14], [1.46, 0, HIT]], dx: [[1.18, 0], [1.46, -12], [1.6, -12]], open: [[0.26, 1.2]] },
        { v: [[0.5, 1.02], [1.1, 0.86], [1.2, 1.02, HIT]], scale: [[0.5, 1], [1.1, 1.26], [1.2, 0.92, HIT], [1.4, 1]], turn: [[0.5, 0], [1.1, 0.15], [1.2, 0, HIT]] }, late(pecks(0.3), 0.2), late(pecks(0.3), 0.45)),
      // Up onto the crust, and it cannot stay there: a long slide off the far side.
      crumb: act(1.5, 0.75, { dx: [[0.12, 0], [0.36, 14], [0.6, 15], [1, 26], [1.15, 26], [1.4, 0]], dy: [[0.12, 0], [0.24, -26], [0.36, -15, HIT], [0.6, -15], [1, 0], [1.15, 0], [1.28, -10], [1.4, 0, HIT]], turn: [[0.36, 0], [0.6, 0.06], [1, 0.3], [1.15, 0]], sx: shake(0.56, 1, 0.1, 4, 1), open: [[0.6, 1]] },
        { v: [[0.34, 1.02], [0.4, 1.045], [0.6, 1.03], [1.02, 1.02]], turn: [[0.36, 0], [0.42, 0.06], [1, 0.03]] }),
    }),
    // They never walk: every bird hops, each a moment after the last.
    directions: directions('sparrows', { lean: 0.14, drop: 2, chomp: 0.1, cycle: 0.42, steps: [0.22], gait: [hop(0, 11), late(hop(0, 9), 0.03), late(hop(0, 13), 0.01)], keep: [bu, bv - 0.05] }),
  }
}

// --- The dachshund: long and low. Whatever it does travels down the whole length of it. ---

function dachshund(): Role {
  const { mu, mv, bu, bv } = at('dachshund')
  return {
    // A quick pant.
    rest: (t, _figure, p) => { p.sy += 0.008 * Math.sin((TAU * t) / 0.9) * (0.5 + 0.5 * Math.sin((TAU * t) / 7.1)) },
    // Its want: it makes itself as long as it can, low to the ground, and then shakes the stretch out.
    habits: [habit(2.6, 5, 8,
      solo('long-stretch', 0, 2.3, { sx: [[0.5, 1.15], [1.2, 1.16], [1.5, 0.97], [1.7, 1]], sy: [[0.5, 0.9], [1.2, 0.89], [1.5, 1.02], [1.7, 1]], turn: [[0.5, 0.04], [1.2, 0.05], [1.5, 0], ...shake(1.6, 2.25, 0.05, 6)], dx: [[0.5, 6], [1.2, 7], [1.5, 0]] }),
      solo('bow-stretch', 0, 1.9, { sx: [[0.6, 1.12], [1.1, 1.13], [1.4, 1]], sy: [[0.6, 0.92], [1.1, 0.92], [1.4, 1]], turn: [[0.6, 0.09], [1.1, 0.09], [1.4, -0.02], [1.6, 0]] }))],
    pokes: [
      solo('wag', 0, 0.8, { sx: bobs(0.05, 0.75, 0.05, 4, 1), dx: shake(0.05, 0.75, 3, 8) }, [0.04, 'dachshund-huh']),
      solo('look-round', 0, 0.9, { sx: [[0.18, 0.87], [0.55, 0.87], [0.75, 1.02]], turn: [[0.18, -0.06], [0.55, -0.05]], open: [[0.2, 0.5]] }, [0.1, 'dachshund-huh']),
    ],
    reactions: reactions('dachshund', {
      // The long loaf across its jaws: it trots at the lane and stops dead, twice; then turns the whole thing sideways and is through.
      wanted: act(3, 2.6, { dx: [[0.5, 0], [0.9, -16, HIT], [1.02, -6], [1.2, -6], [1.45, -18, HIT], [1.6, -8], [2.2, -8], [2.6, -20], [2.9, 0]], turn: [[1.6, 0], [1.8, -0.12], [2.1, -0.12], [2.3, 0]], sx: [[2.15, 1], [2.45, 0.78], [2.65, 0.8], [2.9, 1]], sy: [[0.9, 0.95, HIT], [1.05, 1], [1.45, 0.94, HIT], [1.6, 1]], dy: [[2.55, 0], [2.68, -8], [2.8, 0, HIT]], open: [[0.25, 0.42]] },
        { u: [[0.4, mu], [0.9, mu - 0.05, HIT], [1.02, mu - 0.02], [1.2, mu - 0.02], [1.45, mu - 0.055, HIT], [1.6, mu - 0.02], [2.6, mu - 0.06], [2.9, mu]], v: [[0.4, mv]], turn: [[2.15, 0], [2.5, 1.45]] }),
      // Off the basket it rolls, down the back and round the tail, with the dog spinning after it.
      hated: act(1.9, 0.9, { sx: [[0.75, 1], [0.95, 0.77], [1.15, 1.04], [1.35, 0.78], [1.55, 1]], turn: [[0.3, -0.05], [0.7, -0.08], [0.95, 0.08], [1.35, -0.08], [1.6, 0.04]], dx: [[0.75, 0], [1.15, -14], [1.55, 4], [1.75, 0]], open: [[0.72, 1.5]] },
        { u: [[0.3, bu], [0.45, bu], [0.85, 0.02], [1.2, 0.25], [1.6, 0.7]], v: [[0.3, bv - 0.08], [0.45, bv - 0.08], [0.85, 0.96, HIT], [1.2, 1.04], [1.6, 1.02]], turn: [[0.45, 0], [0.85, -3], [1.6, -6.283], [1.9, -6.283]] }),
      nothing: act(1.6, 0.5, { turn: [[0.3, 0.1], [1.25, 0.1]], dy: [[0.3, 4], [1.25, 4]], dx: [[0.3, 0], [0.7, 20], [1.15, -8], [1.4, 0]], sy: bobs(0.34, 1.22, -0.03, 5, 1) }, { u: [[0.4, 0.7], [0.7, 0.74], [1.15, 0.68]] }),
      // The sneeze sends the whole dog backwards; it sits down, and trundles back.
      dust: act(1.5, 0.7, { turn: [[0.6, -0.06], [0.7, 0.13, HIT], [0.9, 0]], sy: [[0.6, 1.05], [0.7, 0.93, HIT], [0.95, 0.92], [1.15, 1]], dx: [[0.66, 0], [0.82, -32, HIT], [1, -30], [1.12, -20], [1.24, -12], [1.36, -4]], dy: [[1, 0], [1.06, -3], [1.12, 0, HIT], [1.18, -3], [1.24, 0, HIT], [1.3, -3], [1.36, 0, HIT]], open: [[0.58, 0.86]] },
        { u: [[0.68, 0.7], [0.78, 0.77, HIT], [1.2, 0.71]], scale: [[0.68, 1], [0.8, 1.1], [1.2, 1]] }),
      // A shake that starts at the nose and runs to the tail.
      wet: act(1.7, 0.25, { turn: shake(0.2, 0.9, 0.11, 7), dx: [[0.5, 0], ...shake(0.52, 1.35, 6, 8)], sx: [[0.3, 1.1], [0.7, 0.92], [1.1, 1.08], [1.4, 0.97]], sy: [[0.3, 0.96], [0.7, 1.03], [1.1, 0.97]] }, { scale: bobs(0.3, 1.3, 0.04, 5, 1), v: [[0.2, 1.02], [0.26, 1.035], [0.4, 1.02]] }),
      // A seed on the very end of the nose: it goes cross-eyed and still, lifts it slowly, and flicks.
      'loose-seeds': act(1.8, 0.45, { turn: [[0.4, 0.03], [1.1, -0.11], [1.22, -0.12], [1.32, 0.1, HIT], [1.55, 0]], sy: [[0.45, 1.02], [1.2, 1.03]], dx: shake(0.6, 1.2, 1.5, 6), open: [[1.3, 1.6]] },
        { u: [[0.4, mu + 0.07], [1.1, mu + 0.08], [1.32, mu + 0.07], [1.52, mu + 0.02], [1.74, 0.7]], v: [[0.4, mv - 0.06], [1.1, mv - 0.16], [1.22, mv - 0.16], [1.32, mv - 0.05, HIT], [1.52, mv - 0.5], [1.74, 1.02, HIT]], scale: [[0.4, 0.5], [1.74, 0.5]] }),
      // Nose down, and both ears in it. The head comes up and the dough comes with it, until the ears let go.
      raw: act(1.8, 0.4, { turn: [[0.35, 0.2], [0.5, 0.2], [1.1, 0.04], [1.3, 0.05], [1.36, -0.16, HIT], [1.55, 0.04]], dy: [[0.35, 5], [0.5, 5], [1.1, -2], [1.36, -4], [1.5, 0]], dx: [[0.6, 0], ...shake(0.62, 1.28, 4, 6)], sy: [[1.1, 1.05], [1.36, 1.06], [1.5, 0.97]] },
        { v: [[0.5, 1.02], [1.1, 0.84], [1.3, 0.84], [1.36, 1.02, HIT]], scale: [[0.5, 1], [1.1, 1.26], [1.3, 1.27], [1.36, 0.92, HIT], [1.56, 1]], u: [[0.6, 0.7], ...shake(0.62, 1.28, 0.02, 6, 0.7)] }),
      // The round one in the long basket: it rocks from end to end, and the dog looks back at it over its shoulder.
      shape: act(1.6, 0.6, { sx: [[0.45, 1], [0.65, 0.9], [1.15, 0.9], [1.35, 1]], turn: [[0.45, -0.04], ...shake(0.5, 1.2, -0.05, 4, -0.04), [1.4, 0]], sy: [[0.38, 0.97, HIT], [0.5, 1]] },
        { u: [[0.35, bu], ...shake(0.42, 1.2, 0.09, 4, bu), [1.25, bu]], v: [[0.35, bv - 0.06, HIT], [1.25, bv - 0.06]], turn: [[0.35, 0], ...shake(0.42, 1.2, 0.34, 4), [1.25, 0]] }),
    }),
    // A trundle: it goes long and short like a caterpillar, close to the ground.
    directions: directions('dachshund', { lean: 0.07, drop: 4, chomp: 0.05, cycle: 0.56, steps: [0.14, 0.42], gait: [{ sx: [[0.14, 1.06], [0.28, 0.97], [0.42, 1.05], [0.56, 1]], dy: [[0.14, 2], [0.28, -2], [0.42, 2]] }], keep: [mu, mv, 1.45] }),
  }
}

// --- The bear: slow and heavy, with a long wind-up and a long way back. The belly is the funny part. ---

function bear(): Role {
  const { mu, mv, bu, bv } = at('bear')
  return {
    rest: (t, _figure, p) => { const breath = Math.sin((TAU * t) / 4.4); p.sy += 0.018 * breath; p.sx -= 0.006 * breath },
    // Its want: it puffs itself round and pats the belly twice.
    habits: [habit(2.2, 5, 8, solo('puff-and-pat', 0, 2.2, { sy: [[0.7, 1.08], [1.1, 1.08], [1.22, 1.03, HIT], [1.36, 1.08], [1.5, 1.08], [1.62, 1.03, HIT], [1.78, 1.07]], sx: [[0.7, 1.05], [1.1, 1.05], [1.22, 1.08, HIT], [1.36, 1.05], [1.5, 1.05], [1.62, 1.08, HIT], [1.78, 1.04]] }))],
    pokes: [
      solo('belly-wobble', 0, 1.3, { sx: shake(0.1, 1.3, 0.06, 6, 1), sy: shake(0.1, 1.3, -0.04, 6, 1) }, [0.1, 'bear-huh']),
      solo('slow-nod', 0, 1.4, { turn: [[0.5, 0.07], [0.8, 0.07], [1.15, -0.015]], sy: [[0.5, 0.97], [0.8, 0.97]], open: [[0.3, 0.8]] }, [0.3, 'bear-huh']),
    ],
    reactions: reactions('bear', {
      // It gathers the loaf to its belly, squeezes, and rolls right back with it, rocking.
      wanted: act(3.2, 1, { sx: [[0.6, 1], [0.95, 0.9], [1.3, 0.94], [3, 0.97]], sy: [[0.95, 1.05], [1.3, 1.02], [3, 1.01]], turn: [[1, 0.03], [1.7, -0.3], [2.25, 0.09], [2.75, -0.13], [3.05, 0.02]], dy: [[1, 0], [1.7, 8], [2.25, 0], [2.75, 4]], open: [[0.9, 1.4]] },
        { u: [[0.6, bu], [1.7, bu - 0.1], [2.25, bu + 0.03], [2.75, bu - 0.05], [3.1, bu]], v: [[0.6, bv - 0.16], [0.95, bv - 0.18]], turn: [[1, 0], [1.7, -0.3], [2.25, 0.09], [2.75, -0.13], [3.05, 0]], scale: [[0.6, 1], [0.95, 0.9], [1.3, 0.95]] }),
      // Up to the mouth and a dead stop: clonk. The head rings. Then it knocks on the thing, twice.
      hated: act(1.9, 0.38, { turn: [[0.3, -0.03], ...shake(0.38, 1.1, 0.11, 8)], sy: [[1.2, 1], [1.38, 0.95, HIT], [1.46, 1], [1.54, 0.95, HIT], [1.66, 1]], open: [[0.24, 0.42]] },
        { u: [[0.38, mu, HIT], [0.5, mu + 0.04], [1.2, bu + 0.06]], v: [[0.38, mv, HIT], [0.5, mv + 0.03], [1.2, bv - 0.08], [1.38, bv - 0.06, HIT], [1.46, bv - 0.08], [1.54, bv - 0.06, HIT], [1.62, bv - 0.08]] }),
      // Nothing on it: it bends right over and lifts the edge to look underneath.
      nothing: act(1.7, 0.9, { turn: [[0.5, 0.2], [0.75, 0.2], [0.95, 0.27], [1.2, 0.26], [1.55, -0.03]], dy: [[0.5, 10], [1.2, 12]], sy: [[0.5, 0.9], [1.2, 0.89]], dx: [[0.75, 0], [0.95, 8], [1.2, 8]] }, { v: [[0.7, 1.02], [0.95, 0.94], [1.2, 0.94], [1.35, 1.02, HIT]], turn: [[0.7, 0], [0.95, -0.16], [1.2, -0.16], [1.35, 0, HIT]] }),
      // The longest breath in of anyone, a sneeze that folds it double, and a paw up for the cap.
      dust: act(1.8, 0.95, { sy: [[0.8, 1.1], [0.95, 0.85, HIT], [1.15, 0.98], [1.35, 1.06], [1.55, 1.06]], turn: [[0.8, -0.1], [0.95, 0.23, HIT], [1.2, 0.02], [1.4, -0.05], [1.6, -0.04]], dy: [[1.15, 0], [1.35, -6], [1.55, -6]], open: [[0.72, 1.06]] }, { u: [[0.9, 0.7], [1, 0.82, HIT], [1.5, 0.72]], scale: [[0.9, 1], [1.04, 1.18], [1.5, 1]] }),
      // One paw in, out, and wrung like a cloth.
      wet: act(1.6, 0.3, { turn: [[0.3, 0.1], [0.5, 0], [0.7, -0.04], [0.92, 0.04], [1.14, -0.04], [1.36, 0.03]], sx: [[0.5, 1], [0.7, 0.9], [0.81, 1.03], [0.92, 0.9], [1.03, 1.03], [1.14, 0.91], [1.3, 1.02]], sy: [[0.3, 0.96], [0.5, 1], [0.7, 1.04], [1.14, 1.04]] }, { v: [[0.3, 1.04, HIT], [0.45, 1.02]], scale: [[0.3, 1.07, HIT], [0.5, 0.97], [0.7, 1]] }),
      // The seed is gone into the fur. It looks down, pats here, pats there, and out it pops.
      'loose-seeds': act(1.9, 0.5, { sy: [[0.45, 0.94], [1.5, 0.95]], turn: [[0.45, 0.08], [0.7, -0.07], [0.9, -0.07], [1.1, 0.11], [1.3, 0.11], [1.5, 0.04]], dx: [[0.5, 0], [0.7, -6], [0.9, -6], [1.1, 6], [1.3, 6], [1.5, 0]], sx: [[0.76, 1], [0.8, 1.04, HIT], [0.9, 1], [1.16, 1], [1.2, 1.04, HIT], [1.3, 1]] },
        { u: [[0.4, bu - 0.05], [1.5, bu - 0.05]], v: [[0.4, bv - 0.2], [1.5, bv - 0.2], [1.58, bv - 0.34], [1.78, 1.02, HIT]], scale: [[0.4, 0.5], [0.5, 0.2], [1.5, 0.2], [1.58, 0.5]] }),
      // Both paws in it, and they will not come apart: a slow wide pull, and they clap back together.
      raw: act(1.8, 0.6, { sx: [[0.5, 1], [1, 1.13], [1.15, 0.9, HIT], [1.3, 1.08], [1.42, 0.94, HIT], [1.6, 1]], sy: [[1, 0.97], [1.15, 1.05, HIT], [1.42, 1.03]], dx: [[1.42, 0], ...shake(1.44, 1.78, 3, 4)], open: [[1.15, 1.5]] },
        { u: [[0.4, bu], [1.6, bu]], v: [[0.4, bv - 0.1], [1.6, bv - 0.1]], scale: [[0.5, 1], [1, 1.3], [1.15, 0.86, HIT], [1.3, 1.16], [1.42, 0.9, HIT], [1.6, 1]] }),
      // It closes its paws on the loaf and the loaf is not there: it has gone through them, in crumbs.
      crumb: act(1.5, 0.75, { sx: [[0.45, 1], [0.55, 0.92, HIT], [1.25, 0.93]], sy: [[0.85, 1], [1, 0.95], [1.3, 0.95]], turn: [[0.85, 0], [1, 0.1], [1.3, 0.1]], open: [[0.8, 1.3]] },
        { u: [[0.4, bu + 0.04], [0.56, bu + 0.04], [0.8, 0.68]], v: [[0.4, bv - 0.12], [0.56, bv - 0.12], [0.8, 1.02, HIT], [0.88, 0.99], [0.96, 1.02, HIT]], scale: [[0.5, 1], [0.6, 0.86], [1.3, 0.86]] }),
    }),
    // A waddle: the weight goes from one foot to the other, and each foot is put down.
    directions: directions('bear', { lean: 0.09, drop: 8, chomp: 0.06, cycle: 1.1, steps: [0.27, 0.82], gait: [{ turn: [[0.27, -0.07], [0.82, 0.07]], dy: [[0.17, 0], [0.27, 3, HIT], [0.45, 0], [0.72, 0], [0.82, 3, HIT], [1, 0]], dx: [[0.27, -4], [0.82, 4]] }], keep: [bu, bv - 0.18, 0, 0.95] }),
  }
}

// --- The crow: upright, sharp and proud. It moves in clean cuts and holds each one. ---

function crow(): Role {
  const { mu, mv } = at('crow'), wu = mu - 0.5, wv = mv + 0.24
  return {
    // Its want: it preens the black wing, and then holds it out to be seen.
    habits: [habit(2.4, 4.5, 7.5,
      solo('preen', 0, 1.7, { turn: [[0.3, 0.14], [0.5, 0.12], [0.7, 0.15], [0.9, 0.12], [1.5, -0.02]], sy: [[0.3, 0.95], [0.9, 0.95], [1.3, 1.02]] }),
      solo('wing-out', 0, 1.8, { sx: [[0.25, 1.15, HIT], [1.3, 1.14], [1.5, 0.98]], turn: [[0.25, -0.05, HIT], [1.3, -0.05]], sy: [[0.25, 1.03], [1.3, 1.03]] }))],
    pokes: [
      solo('hop-aside', 0, 0.6, { dx: [[0.2, -9], [0.4, -9]], dy: [[0.1, -9], [0.2, 0, HIT], [0.4, 0], [0.48, -5], [0.56, 0, HIT]], open: [[0.02, 0.2]] }, [0.02, 'crow-huh']),
      solo('ruffle', 0, 0.9, { sx: [[0.12, 1.13, HIT], ...shake(0.2, 0.7, 0.04, 5, 1.1), [0.8, 0.98]], sy: [[0.12, 1.05], [0.7, 1.04]] }, [0.1, 'crow-huh']),
    ],
    reactions: reactions('crow', {
      // The dark loaf in its beak, a crouch, and up; it comes down slowly, as a feather would.
      wanted: act(2.6, 1, { sy: [[0.7, 0.87], [0.9, 0.86], [1, 1.12, HIT], [1.4, 1]], dy: [[0.9, 0], [1.3, -52], [1.5, -50], [2.45, 0]], sx: [[0.95, 1], ...shake(1, 1.6, 0.2, 6, 1), [1.7, 1.06], [2.4, 1.05]], dx: [[1.5, 0], [1.75, 7], [2, -6], [2.25, 4], [2.45, 0]], turn: [[1.5, 0], [1.75, 0.05], [2, -0.05], [2.25, 0.03]], open: [[0.2, 0.34]] },
        { u: [[0.35, mu + 0.02], [1.5, mu + 0.02], [1.75, mu + 0.05], [2, mu - 0.01], [2.25, mu + 0.04], [2.45, mu + 0.02]], v: [[0.35, mv + 0.04], [0.7, mv + 0.09], [0.9, mv + 0.09], [1.3, mv - 0.17], [1.5, mv - 0.16], [2.45, mv + 0.04]] }),
      // Held against the wing: gold, and the wing is black. It puts it down and turns its back.
      hated: act(1.8, 1.2, { turn: [[0.5, -0.06], [0.8, -0.06], [1.1, 0.04], [1.3, -0.12], [1.62, -0.12]], sx: [[1.1, 1], [1.3, 0.76, HIT], [1.62, 0.76]], sy: [[1.3, 1.04], [1.62, 1.04]] },
        { u: [[0.4, wu], [0.8, wu], [1.1, 0.7]], v: [[0.4, wv], [0.8, wv], [1.1, 1.02, HIT]], turn: [[0.4, -0.2], [0.8, -0.2], [1.1, 0]] }),
      // Three sharp taps on bare wood, and one eye turned to listen.
      nothing: act(1.3, 0.72, { turn: [...hits([0.22, 0.42, 0.62], 0.18, 0, 0.08, 0.1), [0.82, 0], [0.9, -0.1, HIT], [1.15, -0.1]], dy: hits([0.22, 0.42, 0.62], 3, 0, 0.08, 0.1) }, { v: hits([0.22, 0.42, 0.62], 0.015, 1.02, 0.02, 0.1) }),
      // The flour goes up over it and it does not sneeze: it stands there, grey, and shudders once.
      dust: act(1.7, 0.4, { sy: [[0.35, 0.95, HIT], [1.4, 0.95]], sx: [[0.85, 1], ...shake(0.9, 1.3, 0.07, 6, 1)], turn: [[0.35, -0.03], [1.4, -0.03]], open: [[0.3, 0.62]] }, { u: [[0.4, 0.62], [1.3, 0.6]], v: [[0.4, 0.55], [0.9, 0.5], [1.3, 0.62], [1.6, 1.02]], scale: [[0.4, 1.3], [1.3, 1.24]] }),
      // Every feather out at once, a fast shake, and down they go again.
      wet: act(1.5, 0.3, { sx: [[0.3, 1], [0.4, 1.2, HIT], [1, 1.17], [1.2, 0.95]], sy: [[0.4, 1.1, HIT], [1, 1.08], [1.2, 0.97]], turn: [[0.4, 0], ...shake(0.42, 1, 0.08, 9)] }, { scale: [[0.3, 1], [0.4, 1.08, HIT], [0.6, 0.97], [0.8, 1]], u: [[0.3, 0.7], [0.4, 0.73, HIT], [0.7, 0.7]] }),
      // It carries the seed up as high as a crow can stretch, lets go, and watches it land.
      'loose-seeds': act(1.8, 1.15, { dy: [[0.3, 0], [0.8, -20], [1.05, -20], [1.3, 0]], sy: [[0.3, 1], [0.8, 1.16], [1.05, 1.16], [1.3, 1]], turn: [[0.3, 0.1], [0.5, 0], [1.1, 0], [1.25, 0.15], [1.6, 0.14]], open: [[0.2, 0.3], [1.02, 1.3]] },
        { u: [[0.3, mu + 0.02], [1.05, mu + 0.02], [1.18, mu + 0.02]], v: [[0.3, mv + 0.04], [0.8, mv - 0.16], [1.05, mv - 0.16], [1.18, 1.02, HIT], [1.32, 0.9], [1.46, 1.02, HIT]], scale: [[0.3, 0.5], [1.5, 0.5]] }),
      // One claw comes up with a string of dough on it, and no amount of shaking the foot will do.
      raw: act(1.7, 0.6, { dy: [[0.3, 0], [0.5, -8], [1.15, -8], [1.22, 0, HIT]], turn: [[0.5, -0.1], [1.15, -0.11], [1.22, 0.03, HIT]], dx: [[0.55, 0], ...shake(0.6, 1.14, 5, 7)], open: [[0.5, 0.9]] },
        { v: [[0.3, 1.02], [0.5, 0.93], [1.15, 0.92], [1.22, 1.02, HIT]], scale: [[0.3, 1], [0.5, 1.26], [1.15, 1.28], [1.22, 0.92, HIT], [1.4, 1]], u: [[0.55, 0.66], ...shake(0.6, 1.14, 0.02, 7, 0.66)], turn: [[0.5, -0.2], [1.15, -0.2], [1.22, 0, HIT]] }),
      // The wing held out beside the crust: it looks at one, then at the other, and they are not the same.
      crust: act(1.6, 0.95, { sx: [[0.45, 1], [0.6, 1.16, HIT], [1.15, 1.15], [1.35, 1]], turn: [[0.7, -0.08, HIT], [0.82, -0.08], [0.95, 0.06, HIT], [1.1, 0.06]], sy: [[0.6, 1.03], [1.15, 1.03]] }, { u: [[0.45, wu - 0.05], [1.15, wu - 0.05]], v: [[0.45, wv - 0.05], [1.15, wv - 0.05]], turn: [[0.45, 0.15], [1.15, 0.15]] }),
    }),
    // A strut: the head goes first and the rest of the crow arrives after it.
    directions: directions('crow', { lean: 0.13, drop: 3, chomp: 0.06, cycle: 0.7, steps: [0.1, 0.45], gait: [{ dx: [[0.1, 5, HIT], [0.3, 0], [0.35, 0], [0.45, 5, HIT], [0.65, 0]], turn: [[0.1, 0.05, HIT], [0.3, -0.02], [0.45, 0.05, HIT], [0.65, -0.02]], dy: [[0.2, -3], [0.3, 0], [0.55, -3], [0.65, 0]] }], keep: [mu + 0.02, mv + 0.04] }),
  }
}

// --- The hen: round, fussy and never still for long. Her three chicks do everything a moment apart. ---

function hen(): Role {
  // Where the chicks' backs are, in shares of the hen's own box: they stand to her right, low.
  const cu = 1.2, cv = 0.76
  const peck = (from: number, deep = 0.2): Part => ({ turn: [[from, 0], [from + 0.05, deep, HIT], [from + 0.13, 0]], open: [[from + 0.03, from + 0.1]] })
  const pecks = (...times: number[]): Part => ({ turn: times.flatMap((from) => peck(from).turn!), open: times.flatMap((from) => peck(from).open!) })
  const hop = (from: number, high: number, far = 0, stay = 0): Part => ({ dy: [[from, 0], [from + 0.09, -high], [from + 0.18, 0, HIT]], dx: [[from, 0], [from + 0.18, far], ...(stay ? [[from + 0.18 + stay, far] as const] : [])], sy: [[from + 0.16, 1], [from + 0.2, 0.85], [from + 0.3, 1]] })
  /** The same thing done by all three chicks, each a little after the last. */
  const chicks = (part: Part, gap: number, first = 0): Part[] => [0, 1, 2].map((i) => late(part, first + gap * i))
  // Each chick: its beat and when it first stirs.
  const beats = [[1.5, 0.7], [2.2, 1.6], [1.8, 1.1]] as const
  return {
    rest: (t, figure, p) => { if (figure === 0) { const fluff = Math.sin((TAU * t) / 2.7); p.sx += 0.012 * fluff; p.sy -= 0.006 * fluff } },
    // Her want is at her feet: she settles and fluffs, and the chicks peck round her, each on its own beat.
    habits: [
      habit(3, 6, 9, solo('settle-and-fluff', 0, 1.6, { sy: [[0.4, 0.92], [0.7, 0.93], [0.9, 1.02], [1.3, 1.01]], sx: [[0.4, 1.04], [0.7, 1.04], [0.8, 1.1, HIT], ...shake(0.85, 1.4, 0.03, 5, 1.07)], dy: [[0.4, 3], [0.7, 3], [0.9, 0]] })),
      ...beats.flatMap(([beat, first], chick) => [
        habit(first, beat * 0.6, beat * 1.3, solo('chick-peck', chick + 1, 0.16, peck(0)), solo('chick-pecks', chick + 1, 0.34, pecks(0, 0.17)), solo('chick-hop', chick + 1, 0.32, hop(0, 7))),
        habit(first + beat * 3, beat * 4, beat * 8, solo('peep', chick + 1, 0.4, { sy: [[0.15, 1.14], [0.3, 1.1]], turn: [[0.15, -0.12], [0.3, -0.1]], open: [[0.06, 0.3]] }, [0.08, 'chick-peep'])),
      ]),
    ],
    pokes: [
      all('cluck-and-fluff', 0.9, [{ sx: [[0.12, 1.12, HIT], [0.5, 1.1], [0.7, 0.98]], sy: [[0.12, 1.06, HIT], [0.5, 1.05], [0.7, 0.99]], open: [[0.05, 0.3]] }, ...chicks(hop(0.1, 9), 0.07)], [0.05, 'hen-huh']),
      all('chicks-run-in', 1.1, [{ dx: shake(0.1, 0.9, 4, 4), turn: shake(0.1, 0.9, 0.04, 4) }, hop(0.05, 8, 26, 0.6), hop(0.12, 8, -20, 0.55), hop(0.2, 10, -30, 0.5)], [0.08, 'hen-huh']),
    ],
    reactions: reactions('hen', {
      // One peck at the seeds, a proud fluff, and the loaf is off on three small backs.
      wanted: act(3, 0.8, { turn: [[0.22, 0], [0.3, 0.3, HIT], [0.45, 0], [1.3, 0], ...shake(1.4, 2.8, 0.05, 6)], sx: [[0.6, 1], [0.8, 1.1, HIT], [1.2, 1.06], [1.5, 1]], sy: [[0.8, 1.08, HIT], [1.2, 1.04], [1.5, 1]], dx: [[1.3, 0], ...shake(1.4, 2.8, 5, 6)], open: [[0.26, 0.4], [0.75, 1.1]] },
        { u: [[0.9, 0.7], [1.3, cu], ...shake(1.4, 2.9, 0.03, 8, cu), [2.95, cu]], v: [[0.9, 1.02], [1.1, cv - 0.12], [1.3, cv, HIT], ...bobs(1.4, 2.9, -0.035, 6, cv)], turn: [[1.3, 0], ...shake(1.4, 2.9, 0.08, 8)] },
        { dx: [[0.9, 0], [1.3, 52], [2.5, 52], [2.95, 0]], dy: bobs(1.0, 2.92, -5, 8) }, { dy: bobs(1.3, 2.9, -5, 7), sy: [[1.3, 0.9, HIT], [2.8, 0.92]] }, { dy: bobs(1.36, 2.96, -5, 7), sy: [[1.3, 0.9, HIT], [2.8, 0.92]] }),
      // Loose seeds, and no bread under them: the chicks are onto the peel, riding it and pecking it clean, while she fusses up and down.
      secret: act(4.8, 1.2, { dx: [[0.5, 0], ...shake(0.6, 3.9, 9, 9), [4.2, 0]], turn: [[0.4, 0.1], ...shake(0.6, 3.9, 0.07, 9), [4.2, 0.06]], sx: [[1.1, 1], [1.2, 1.1, HIT], [1.6, 1], [3, 1], [3.1, 1.1, HIT], [3.5, 1]], dy: bobs(0.6, 3.9, -3, 9), open: [[1.1, 1.5], [3, 3.4]] }, {},
        { ...hop(0.2, 14, 58, 3.6), turn: bobs(0.6, 3.7, 0.24, 12), dy: [[0.2, 0], [0.29, -14], [0.38, -6, HIT], ...bobs(0.5, 3.7, -3, 8, -6), [3.98, -6], [4.1, -16], [4.25, 0, HIT]] },
        { ...hop(0.5, 14, 44, 3.2), turn: bobs(0.9, 3.6, 0.24, 10), dy: [[0.5, 0], [0.59, -14], [0.68, -6, HIT], ...bobs(0.8, 3.6, -3, 7, -6), [3.88, -6], [4, -16], [4.15, 0, HIT]] },
        { ...hop(0.8, 16, 30, 2.9), turn: bobs(1.2, 3.5, 0.24, 9), dy: [[0.8, 0], [0.89, -16], [0.98, -6, HIT], ...bobs(1.1, 3.5, -3, 6, -6), [3.78, -6], [3.9, -16], [4.05, 0, HIT]] }),
      // A bare crust. She bends to watch them peck it; they stop, and every head tips up at once.
      hated: act(1.8, 1.1, { turn: [[0.3, 0.13], [0.95, 0.13], [1.1, -0.07, HIT], [1.5, -0.07]], dy: [[0.3, 3], [0.95, 3], [1.1, 0]], sx: [[1.05, 1], [1.15, 1.07, HIT], [1.5, 1.05]], open: [[1.1, 1.5]] },
        { v: hits([0.3, 0.5, 0.7, 0.86], 0.012, 1.02, 0.02, 0.08), turn: [[0.3, 0.03], [0.5, -0.03], [0.7, 0.03], [0.9, 0]] },
        ...[[0.2, 0.42, 0.6, 0.8], [0.26, 0.44, 0.7, 0.84], [0.22, 0.5, 0.66, 0.86]].map((times, i): Part => ({ dx: [[0.15, i ? -18 : 30], [1.6, i ? -18 : 30]], turn: [...pecks(...times).turn!, [1.02, 0], [1.1, -0.28, HIT], [1.5, -0.28]], sy: [[1.02, 1], [1.1, 1.14, HIT], [1.5, 1.14]], open: pecks(...times).open }))),
      // Nothing there, so she scratches at the wood, the way a hen looks for anything.
      nothing: act(1.5, 0.4, { turn: [[0.25, 0.1], [0.95, 0.1], [1.1, 0.17], [1.3, 0.16]], dx: [[0.3, 0], [0.4, -7, HIT], [0.5, 2], [0.6, -7, HIT], [0.7, 2], [0.8, -7, HIT], [0.92, 0]], dy: hits([0.4, 0.6, 0.8], 2.5, 0, 0.06, 0.08) },
        { u: [[0.34, 0.7], [0.4, 0.67, HIT], [0.5, 0.69], [0.6, 0.66, HIT], [0.7, 0.68], [0.8, 0.65, HIT], [1.2, 0.7]] }, ...chicks({ turn: [[0.3, -0.12], [1, -0.12]] }, 0.08, 0.1)),
      // Three sneezes down the row, smallest first, and she jumps at each.
      dust: act(1.9, 0.4, { sy: [...hits([0.42, 0.74, 1.06], -0.05, 1, 0.03, 0.14), [1.3, 1], [1.4, 1.05], [1.7, 1.03]], sx: [[1.3, 1], [1.4, 1.11, HIT], [1.7, 1.06]], dy: hits([0.42, 0.74, 1.06], -4, 0, 0.03, 0.14), open: [[0.42, 0.56], [0.74, 0.88], [1.06, 1.2]] },
        { scale: hits([0.42, 0.74, 1.06], 0.12, 1, 0.03, 0.2), u: hits([0.42, 0.74, 1.06], 0.03, 0.7, 0.03, 0.2) },
        ...chicks({ sy: [[0.3, 1.16], [0.4, 0.84, HIT], [0.6, 1]], turn: [[0.3, -0.12], [0.4, 0.3, HIT], [0.6, 0]], dx: [[0.36, 0], [0.5, -8, HIT], [0.9, -8]], open: [[0.26, 0.5]] }, 0.32)),
      // The chicks are in the puddle before she can stop them, and out they come, one at a time, by the scruff.
      wet: act(1.8, 0.3, { turn: [[0.35, 0.2], [0.5, 0.2], [0.7, -0.05], [0.85, 0.2], [1, 0.2], [1.2, -0.05], [1.35, 0.18], [1.48, 0.18], [1.66, -0.04]], dy: [[0.35, 6], [0.5, 6], [0.7, -8], [0.85, 6], [1, 6], [1.2, -8], [1.35, 5], [1.48, 5], [1.66, -6]], open: [[0.4, 0.75], [0.9, 1.25], [1.4, 1.7]] },
        { v: bobs(0.3, 1.7, 0.02, 6, 1.02), scale: bobs(0.5, 1.7, 0.06, 3, 1) },
        ...[0.5, 1, 1.38].map((lift, i): Part => ({ dx: [[0.12, i ? -16 - 12 * i : 34], [lift, i ? -16 - 12 * i : 34], [lift + 0.2, 0]], dy: [[0.06, -6], [0.12, 2, HIT], [lift, 2], [lift + 0.14, -24], [lift + 0.28, 0, HIT]], sy: [[lift, 1], [lift + 0.14, 1.2], [lift + 0.28, 0.88, HIT], [lift + 0.4, 1]] }))),
      // Not alone at the hatch, and the chicks do not care: they are past her and at the seeds, and she flaps after them.
      'loose-seeds': act(1.7, 0.35, { dx: [[0.3, 0], [0.45, 8], [0.6, -6], [0.75, 8], [0.9, -6], [1.05, 7], [1.3, 0]], sx: [[0.3, 1], [0.4, 1.14, HIT], [0.55, 0.97], [0.7, 1.13, HIT], [0.85, 0.97], [1, 1.12, HIT], [1.2, 1]], turn: [[0.3, 0.06], [1.1, 0.08]], open: [[0.3, 1.1]] },
        { scale: [[0.4, 1], [1.1, 0.78], [1.5, 1]] }, ...chicks({ ...pecks(0.3, 0.46, 0.62, 0.78, 0.94), dx: [[0.1, 0], [0.26, 1], [1.1, 1], [1.3, 0]] }, 0.06).map((part, i) => ({ ...part, dx: part.dx!.map(([when, far]): Key => [when, far * (i ? -22 - 10 * i : 34)]) }))),
      // One chick is on the dough and going down. She takes it by the tail feathers and leans back until it comes.
      raw: act(1.8, 0.6, { turn: [[0.6, 0.19], [0.75, 0.19], [1.15, -0.09], [1.22, -0.14, HIT], [1.5, 0.02]], dy: [[0.6, 5], [0.75, 5], [1.15, -4], [1.22, -4], [1.4, 0]], sx: [[1.15, 0.94], [1.22, 1.06, HIT], [1.45, 1]], open: [[0.3, 0.6]] },
        { v: [[0.4, 1.02], [0.46, 1.04, HIT], [0.75, 1.03], [1.15, 0.92], [1.22, 1.02, HIT]], scale: [[0.75, 1], [1.15, 1.25], [1.22, 0.92, HIT], [1.4, 1]] },
        undefined, { dx: [[0.2, 0], [0.4, -40], [1.15, -40], [1.4, 0]], dy: [[0.2, 0], [0.3, -18], [0.4, -8, HIT], [0.75, -2], [1.15, -12], [1.22, -26, HIT], [1.4, 0, HIT]], sy: [[0.4, 1], [0.75, 0.8], [1.15, 1.2], [1.22, 1.1], [1.4, 0.86, HIT], [1.55, 1]], turn: [[0.45, 0], ...shake(0.5, 1.1, 0.2, 6)], open: [[0.4, 1.3]] }),
      // No seeds on top. She pecks once, flips the whole loaf over to look underneath, and flips it back.
      seeds: act(1.6, 0.36, { turn: [[0.2, 0], [0.28, 0.15, HIT], [0.4, 0.04], [0.52, 0.2], [0.66, -0.08, HIT], [0.9, 0], [1.05, 0.2], [1.2, 0.2], [1.34, -0.06, HIT]], dy: [[1.05, 4], [1.2, 4], [1.34, 0]], open: [[0.24, 0.36], [0.5, 0.66], [1.2, 1.34]] },
        { u: [[0.52, 0.7], [0.74, 0.76], [0.92, 0.7], [1.2, 0.7], [1.36, 0.75], [1.5, 0.7]], v: [[0.52, 1.02], [0.74, 0.74], [0.92, 1.02, HIT], [1.2, 1.02], [1.36, 0.8], [1.5, 1.02, HIT]], turn: [[0.52, 0], [0.92, 3.1416], [1.2, 3.1416], [1.5, 6.2832], [1.6, 6.2832]] }),
    }),
    // A bustle: short quick steps, with the chicks scurrying behind in ones and twos.
    directions: directions('hen', { lean: 0.15, drop: 4, chomp: 0.08, cycle: 0.5, steps: [0.06, 0.31], gait: [{ dy: [[0.06, 2, HIT], [0.18, -5], [0.31, 2, HIT], [0.43, -5]], sx: [[0.06, 1.05], [0.18, 0.98], [0.31, 1.05], [0.43, 0.98]], turn: [[0.06, 0.035], [0.31, -0.035]] }, ...[0, 0.11, 0.05].map((by) => late({ dy: [[0.02, 0], [0.09, -6], [0.16, 0, HIT], [0.2, 0], [0.27, -4], [0.34, 0, HIT]] }, by))], keep: [cu, cv] }),
  }
}

// --- The duck: wide and flat-footed. It rocks from side to side, and its feet are heard. ---

function duck(): Role {
  const { mu, mv, bu } = at('duck'), tu = mu - 0.18, tv = mv - 0.24, fu = bu + 0.12, fv = 0.96
  return {
    // Its want: one flat foot slapped down, then the other; and the bill hanging open.
    habits: [
      habit(1.8, 3.5, 5.5, solo('foot-slaps', 0, 1.1, { turn: [[0.2, -0.08], [0.3, 0.03, HIT], [0.42, 0], [0.62, 0.08], [0.72, -0.03, HIT], [0.86, 0]], dx: [[0.2, -4], [0.3, 0, HIT], [0.62, 4], [0.72, 0, HIT]], dy: [[0.2, -2], [0.3, 1, HIT], [0.42, 0], [0.62, -2], [0.72, 1, HIT], [0.86, 0]] }, [0.3, 'duck-step'], [0.72, 'duck-step'])),
      habit(3.4, 4, 7, solo('bill-open', 0, 0.9, { turn: [[0.15, -0.05], [0.7, -0.05]], sy: [[0.15, 1.03], [0.7, 1.03]], open: [[0.12, 0.72]] })),
    ],
    pokes: [
      solo('tail-wag', 0, 0.7, { dx: shake(0.04, 0.7, 5, 9), turn: shake(0.04, 0.7, 0.04, 9), sy: [[0.06, 0.95, HIT], [0.2, 1]] }, [0.03, 'duck-huh']),
      solo('bill-clap', 0, 0.8, { turn: hits([0.14, 0.4], 0.07, 0, 0.08, 0.14), sy: hits([0.14, 0.4], -0.04, 1, 0.08, 0.14), open: [[0.02, 0.14], [0.26, 0.4]] }, [0.14, 'duck-huh']),
    ],
    reactions: reactions('duck', {
      // The bill goes under it, and up it flips, over once, to land flat on its head: a hat. And the duck is proud of it.
      wanted: act(2.6, 1.05, { turn: [[0.3, 0.15], [0.42, -0.1, HIT], [0.7, 0], [1.3, 0], ...shake(1.4, 2.3, 0.06, 6)], sy: [[0.92, 1], [1, 0.9, HIT], [1.25, 1.08], [2.3, 1.06]], dx: [[1.3, 0], ...shake(1.4, 2.3, 4, 6)], open: [[0.2, 0.46], [1.08, 1.4]] },
        { u: [[0.3, mu], [0.7, tu + 0.05], [1, tu], ...shake(1.4, 2.3, 0.025, 6, tu), [2.4, tu]], v: [[0.3, mv + 0.3], [0.42, mv, HIT], [0.7, tv - 0.3], [1, tv, HIT], [1.25, tv - 0.02]], turn: [[0.42, 0], [1, 3.1416], [1.4, 3.1416], ...shake(1.4, 2.3, 0.06, 6, 3.1416), [2.4, 3.1416]], scale: [[0.95, 1], [1.02, 0.86, HIT], [1.25, 0.95]] }),
      // A puddle: it is in it at once, rocking and paddling, and out again with a shake of the tail.
      secret: act(4.6, 0.9, { dx: [[0.3, 0], [0.7, 44], [3.3, 46], [3.75, 0], ...shake(3.8, 4.5, 6, 8)], dy: [[0.3, 0], [0.5, -22], [0.7, -4, HIT], ...bobs(0.8, 3.2, -4, 9, -4), [3.3, -4], [3.5, -20], [3.75, 0, HIT]], turn: [[0.7, 0], ...shake(0.8, 3.3, 0.11, 13), ...shake(3.8, 4.5, 0.05, 8)], sx: [[0.7, 1], ...hits([0.9, 1.45, 2, 2.55, 3.1], 0.12, 1, 0.1, 0.25)], open: [[0.7, 1.3], [1.9, 2.4], [3.75, 4.2]] }),
      // Balanced on the bill, and not for long: it slides to the end, and off.
      hated: act(1.7, 1, { turn: [[0.4, -0.08], [0.6, -0.1], [0.9, 0.04], [1.15, 0.12], [1.35, 0.1]], dx: [[0.6, 0], [0.9, 5], [1.15, 9], [1.4, 0]], sy: [[0.4, 1.03], [0.9, 1.04], [1.2, 0.97]], open: [[0.95, 1.4]] },
        { u: [[0.4, mu + 0.02], [0.6, mu + 0.03], [0.95, mu + 0.17], [1.2, mu + 0.2], [1.6, 0.7]], v: [[0.4, mv - 0.07], [0.6, mv - 0.07], [0.95, mv - 0.02], [1.2, 1.02, HIT], [1.3, 0.97], [1.4, 1.02, HIT]], turn: [[0.6, 0], [0.95, 0.3], [1.2, 1.2], [1.4, 0]] }),
      // Nothing on the peel, so the peel gets a foot: slap, slap, slap.
      nothing: act(1.4, 0.38, { turn: [[0.22, -0.09], [0.38, 0.05, HIT], [0.56, -0.09], [0.72, 0.05, HIT], [0.9, -0.09], [1.04, 0.05, HIT], [1.2, 0]], dy: [[0.22, -3], [0.38, 3, HIT], [0.56, -3], [0.72, 3, HIT], [0.9, -3], [1.04, 3, HIT], [1.2, 0]], dx: [[0.38, 3, HIT], [0.56, -2], [0.72, 3, HIT], [0.9, -2], [1.04, 3, HIT]] }, { v: hits([0.38, 0.72, 1.04], 0.02, 1.02, 0.02, 0.12), turn: hits([0.38, 0.72, 1.04], 0.04, 0, 0.02, 0.12) }),
      // A sneeze that comes out as a quack, with a smaller one after it.
      dust: act(1.4, 0.5, { sy: [[0.4, 1.08], [0.5, 0.92, HIT], [0.7, 1], [0.84, 1.04], [0.92, 0.95, HIT], [1.1, 1]], turn: [[0.4, -0.05], [0.5, 0.16, HIT], [0.7, 0], [0.84, -0.02], [0.92, 0.09, HIT], [1.1, 0]], dx: [[0.5, 0], [0.62, -8, HIT], [0.84, -8], [0.92, -12, HIT], [1.25, 0]], open: [[0.44, 0.74], [0.9, 1.08]] },
        { scale: [[0.48, 1], [0.56, 1.14], [0.84, 1], [0.92, 1], [1, 1.08], [1.2, 1]], u: [[0.48, 0.7], [0.56, 0.76, HIT], [0.9, 0.72], [0.98, 0.75, HIT]] }),
      // Not alone, and still a puddle is a puddle: both feet, and wings out at every splash.
      wet: act(1.6, 0.4, { dy: [[0.2, -8], [0.36, 2, HIT], [0.5, -6], [0.66, 2, HIT], [0.8, -6], [0.96, 2, HIT], [1.1, -5], [1.26, 0, HIT]], sx: [[0.3, 1], [0.38, 1.16, HIT], [0.52, 1], [0.6, 1], [0.68, 1.16, HIT], [0.82, 1], [0.9, 1], [0.98, 1.15, HIT], [1.2, 1]], turn: [[0.36, -0.04], [0.66, 0.04], [0.96, -0.04], [1.26, 0.02]], open: [[0.3, 1.2]] },
        { scale: [[0.3, 1], [0.38, 1.2, HIT], [0.52, 1.02], [0.6, 1.02], [0.68, 1.18, HIT], [0.82, 1.02], [0.9, 1.02], [0.98, 1.14, HIT], [1.3, 1]], v: hits([0.36, 0.66, 0.96], 0.02, 1.02, 0.02, 0.1) }),
      // Bill down flat, and it dabbles the seeds along the peel and back, never getting one.
      'loose-seeds': act(1.8, 0.3, { turn: [[0.3, 0.25], ...bobs(0.34, 1.34, 0.045, 6, 0.24), [1.5, 0], ...shake(1.5, 1.78, 0.05, 3)], dx: [[0.3, 0], [0.8, 11], [1.34, -4], [1.5, 0]], dy: [[0.3, 4], [1.34, 4], [1.5, 0]], open: [[0.34, 0.42], [0.5, 0.58], [0.67, 0.75], [0.84, 0.92], [1, 1.08], [1.17, 1.25]] },
        { u: [[0.34, 0.7], [0.8, 0.78], [1.34, 0.66]], scale: [[0.34, 1], [0.8, 0.78], [1.34, 0.82], [1.6, 1]] }),
      // One bite of dough, and the bill is stuck shut. Eyes wide; a great deal of head shaking; and pop.
      raw: act(1.7, 0.42, { sy: [[0.42, 1], [0.55, 1.07], [0.66, 1.01], [0.76, 1.07], [0.86, 1]], turn: [[0.3, 0.08], [0.42, 0], [0.86, 0], ...shake(0.88, 1.38, 0.13, 6), [1.42, -0.08, HIT]], dy: [[1.36, 0], [1.42, -5, HIT], [1.55, 0]], open: [[0.18, 0.34], [1.42, 1.65]] },
        { u: [[0.3, mu], [0.86, mu], ...shake(0.88, 1.38, 0.04, 6, mu), [1.42, mu + 0.02], [1.6, 0.7]], v: [[0.3, mv + 0.03], [1.42, mv + 0.03], [1.6, 1.02, HIT]], scale: [[0.34, 1], [0.6, 1.18], [1.38, 1.2], [1.42, 0.9, HIT], [1.6, 1]] }),
      // It sets the round bread on one flat foot to look at it, and the bread rolls off, away and back.
      crumb: act(1.5, 0.6, { dy: [[0.3, 0], [0.5, -4], [0.62, 0, HIT]], turn: [[0.3, 0.06], [0.5, -0.07], [0.7, -0.03], [1, 0.1], [1.3, 0.04]], dx: [[0.7, 0], [1, -12], [1.2, -12], [1.4, 0]], open: [[0.6, 1]] },
        { u: [[0.3, fu], [0.5, fu], [0.95, 0.28], [1.1, 0.28], [1.45, 0.7]], v: [[0.3, fv - 0.06], [0.5, fv - 0.08], [0.62, fv, HIT], [0.95, 1.02]], turn: [[0.5, 0], [0.95, -2.6], [1.1, -2.6], [1.45, 0]] }),
    }),
    // A waddle, wide: all of it tips over each foot in turn.
    directions: directions('duck', { lean: 0.14, drop: 3, chomp: 0.07, cycle: 0.8, steps: [0.2, 0.6], gait: [{ turn: [[0.2, -0.11, HIT], [0.6, 0.11, HIT]], dx: [[0.2, -5, HIT], [0.6, 5, HIT]], dy: [[0.1, -2], [0.2, 1, HIT], [0.5, -2], [0.6, 1, HIT]] }], keep: [tu, tv - 0.02, 3.1416, 0.95] }),
  }
}

// --- The mole: small, soft and slow, and it finds things out with its paws. Nothing it does is sudden but a sneeze. ---

function mole(): Role {
  const { mu, mv, bu, bv } = at('mole')
  return {
    rest: (t, _figure, p) => { p.sy += 0.01 * Math.sin((TAU * t) / 3.1) },
    // Its want: it hugs the round basket and lays its cheek on the down; and it squeezes its eyes shut now and then.
    habits: [
      habit(2.8, 4, 7, solo('hug-the-basket', 0, 2.4, { turn: [[0.8, 0.09], [1.6, 0.1], [2.2, 0]], sx: [[0.8, 0.95], [1.6, 0.94], [2.2, 1]], sy: [[0.8, 0.97], [1.6, 0.97]], dx: [[0.8, 2], [1.6, 2]] })),
      habit(1.6, 2.5, 5, solo('squeeze', 0, 0.3, { sy: [[0.08, 0.955], [0.18, 0.96]], sx: [[0.08, 1.02], [0.18, 1.02]] })),
    ],
    pokes: [
      solo('start', 0, 0.7, { dy: [[0.08, -5, HIT], [0.2, 0]], sy: [[0.08, 1.06, HIT], [0.3, 0.97], [0.5, 1]], open: [[0.04, 0.3]] }, [0.03, 'mole-huh']),
      solo('glasses', 0, 1.1, { turn: [[0.3, -0.06], [0.7, -0.06]], sy: [[0.3, 1.02], ...bobs(0.36, 0.72, -0.03, 2, 1.02)], dx: [[0.3, -2], [0.7, -2]] }, [0.25, 'mole-huh']),
    ],
    reactions: reactions('mole', {
      // Into the basket, a cheek laid on it, and the whole mole curls round the loaf and breathes.
      wanted: act(3.2, 1.2, { turn: [[0.6, 0], [1.1, 0.12], [1.3, 0.1], [1.5, 0.13], [2.2, 0.2], [2.8, 0.2]], sy: [[1.1, 0.94], [1.5, 0.94], [2.2, 0.8], [2.5, 0.83], [2.8, 0.8]], sx: [[1.5, 1], [2.2, 1.1], [2.5, 1.08], [2.8, 1.1]], dy: [[1.5, 0], [2.2, 4], [2.8, 4]] },
        { u: [[0.6, bu]], v: [[0.6, bv + 0.02], [0.75, bv]], scale: [[1.5, 1], [2.2, 0.95]] }),
      // Black crust: one sniff leaves it with a sooty nose, and then the smallest, sharpest sneeze.
      hated: act(1.9, 1.3, { turn: [[0.4, 0.06], [0.7, 0], [1.2, -0.07], [1.3, 0.15, HIT], [1.48, 0], ...shake(1.5, 1.85, 0.03, 4)], sy: [[0.7, 1], [1.2, 1.07], [1.3, 0.9, HIT], [1.5, 1]], dx: [[1.48, 0], ...shake(1.5, 1.85, 3, 4)], open: [[1.16, 1.44]] },
        { u: [[0.4, mu + 0.03], [0.5, mu + 0.03], [0.75, 0.7], [1.28, 0.7], [1.36, 0.76, HIT], [1.7, 0.7]], v: [[0.4, mv - 0.02], [0.5, mv - 0.02], [0.75, 1.02]] }),
      // It cannot see that there is nothing there: a pat to one side, a pat to the other, a pat in the middle.
      nothing: act(1.6, 1.15, { dx: [[0.3, -10], [0.45, -10], [0.65, 10], [0.8, 10], [1, 0]], sy: hits([0.3, 0.65, 1], -0.05, 1, 0.08, 0.12), turn: [[0.3, -0.04], [0.65, 0.07], [1, 0.03], [1.15, 0.11], [1.4, 0.1]] }, { v: hits([0.3, 0.65, 1], 0.012, 1.02, 0.02, 0.1) }),
      // A heap of flour is a thing to dig in, and it does, both paws going.
      dust: act(1.7, 0.4, { turn: [[0.35, 0.25], [1.3, 0.24], [1.5, -0.03]], dy: [[0.35, 6], [1.3, 6], [1.5, -5], [1.62, 0]], dx: [[0.42, 0], ...shake(0.45, 1.3, 4, 12, 0)], sy: [[0.45, 1], ...bobs(0.45, 1.3, -0.04, 6, 1), [1.5, 1.06]] },
        { scale: bobs(0.45, 1.3, 0.2, 3, 1), u: [[0.42, 0.7], ...shake(0.45, 1.3, 0.03, 12, 0.7)], v: [[0.45, 1.02], [0.9, 0.97], [1.3, 1.02]] }),
      // A splash on its glasses. Off they come, a careful polish, and back on to look again.
      wet: act(1.8, 0.2, { turn: [[0.12, 0], [0.2, -0.1, HIT], [0.5, -0.05], [1.4, -0.04], [1.6, 0.08]], sy: [[0.5, 0.95], [1.4, 0.95]], dx: [[0.55, 0], [0.7, 3], [0.9, -3], [1.1, 3], [1.3, -3], [1.45, 0]], dy: [[0.6, 0], [0.8, -2], [1, 2], [1.2, -2], [1.4, 0]] }, { v: [[0.14, 1.02], [0.2, 1.045, HIT], [0.4, 1.02]], scale: [[0.14, 1], [0.2, 1.1, HIT], [0.45, 1]] }),
      // One seed, held up close to its glasses, and then quietly put in a pocket, with a look each way.
      'loose-seeds': act(1.6, 0.45, { turn: [[0.4, -0.05], [0.8, -0.05], [1, 0.03], [1.2, -0.06], [1.32, 0.06], [1.45, 0]], sy: [[1.08, 1], [1.15, 0.96, HIT], [1.25, 1]] },
        { u: [[0.4, mu], [0.8, mu], [1, bu - 0.14], [1.2, bu - 0.14], [1.5, 0.7]], v: [[0.4, mv - 0.08], [0.8, mv - 0.08], [1, bv - 0.06], [1.2, bv - 0.06], [1.5, 1.02]], scale: [[0.4, 0.5], [1, 0.4], [1.2, 0.4], [1.5, 0.8]] }),
      // A paw goes in to feel it, and goes on going in. It has to stand up tall to get them back.
      raw: act(1.9, 1.55, { turn: [[0.4, 0.15], [0.9, 0.17], [1.4, -0.08], [1.55, -0.1, HIT], [1.75, 0.02]], dy: [[0.4, 8], [0.9, 14], [1.4, 0], [1.55, -3, HIT]], sy: [[0.4, 0.97], [0.9, 0.9], [1.4, 1.1], [1.55, 1.12], [1.7, 0.96]], open: [[1.5, 1.8]] },
        { v: [[0.9, 1.03], [1.4, 0.9], [1.55, 1.02, HIT]], scale: [[0.4, 1], [0.9, 0.94], [1.4, 1.3], [1.55, 0.92, HIT], [1.75, 1]] }),
      // Two prods with one paw. It falls apart a little each time; and the mole frowns.
      crumb: act(1.4, 0.8, { turn: [...hits([0.3, 0.55], 0.1, 0, 0.1, 0.1), [0.8, -0.05], [1.2, -0.05]], sy: [[0.68, 1], [0.8, 0.93], [1.2, 0.93]], sx: [[0.8, 1.04], [1.2, 1.04]] }, { u: hits([0.3, 0.55], 0.02, 0.7, 0.02, 0.1), scale: [[0.28, 1], [0.3, 0.96, HIT], [0.53, 0.96], [0.55, 0.92, HIT], [1.2, 0.92]] }),
      // A long loaf, and short arms: wider, wider, up on its toes, and they still do not meet.
      shape: act(1.7, 1.3, { sx: [[0.4, 1], [0.7, 1.2], [0.85, 1.18], [1.05, 1.27], [1.2, 1.26], [1.35, 0.95]], dy: [[0.85, 0], [1.05, -5], [1.2, -5], [1.35, 0]], sy: [[1.2, 1], [1.35, 0.94], [1.55, 0.95]], open: [[1.3, 1.6]] },
        { u: [[0.4, bu], [1.25, bu]], v: [[0.4, bv - 0.1], [1.25, bv - 0.1]], turn: [[1.2, 0], [1.35, 0.3], [1.6, 0]] }),
      // A dark crust held up to its face: two slow blinks, a lean away from it, and it is pushed back across the ledge.
      crust: act(1.5, 1, { sy: [[0.5, 1], [0.6, 0.94], [0.7, 1], [0.78, 1], [0.88, 0.94], [0.98, 1]], turn: [[0.88, 0], [1.05, -0.11], [1.3, -0.1]], dx: [[0.88, 0], [1.05, -4], [1.3, -4]] },
        { u: [[0.4, mu + 0.02], [0.95, mu + 0.02], [1.12, 0.88], [1.4, 0.7]], v: [[0.4, mv + 0.04], [0.95, mv + 0.04], [1.12, 1.02]] }),
    }),
    // A shuffle: it never lifts a foot, it only leans and slides.
    directions: directions('mole', { lean: 0.1, drop: 5, chomp: 0.04, cycle: 0.9, steps: [0.25, 0.7], gait: [{ dx: [[0.25, 5], [0.45, 0], [0.7, -5]], sy: [[0.25, 0.95], [0.45, 1], [0.7, 0.95]], turn: [[0.25, 0.05], [0.7, -0.05]] }], keep: [bu, bv] }),
  }
}

export const ROLES: Record<Animal, Role> = { goat: goat(), sparrows: sparrows(), dachshund: dachshund(), bear: bear(), crow: crow(), hen: hen(), duck: duck(), mole: mole() }
