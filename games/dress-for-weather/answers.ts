import { TABS, type Garment, type SpotPart, type Wearer } from './kinds'
import { LANDS, POKES, SETTLES, WATCHES, WORN_TAPS, WRONGS, buttonCreak, buttonOut, buttonPop, clap, collarSnap, flick, frontOpens, paperTap, peg, riffle, sail, sliderPress, snap, stamp, tugSqueak, whup, zipTick, type Sound } from './voices'

// What the toy answers a touch with. An answer is written once, as a list of
// timed beats, and each beat sets what is seen (its cues) and what is heard
// (its notes) together. The hall plays the beats on its own clock, attended
// game time, so sight and sound cannot drift apart and nothing is heard while
// the game rests. No note carries a delay of its own: a later sound is a
// later beat.

/** The faces a figure can pull. The view draws each in the figure's own manner. */
export const FACES = ['rest', 'grin', 'oh', 'crossed', 'chin', 'down', 'wide', 'tongue', 'cosy', 'proud', 'giggle', 'huff'] as const
export type Face = (typeof FACES)[number]

/** What a beat sets. A cue on the wearer names another wearer when it is for someone who watches. */
export type Cue =
  /** That many of the garment's tabs are folded over from now. */
  | { on: 'garment'; tabs: number }
  /** A push on one of the garment's springs: it swings, pops bigger, sags, or turns right round. */
  | { on: 'garment'; kick: 'swing' | 'pop' | 'sag' | 'turn'; by: number }
  /** A push on one of a wearer's springs: it squashes on its stand, tips, hops, or bends. */
  | { on: 'wearer'; who?: Wearer; kick: 'squash' | 'tilt' | 'hop' | 'bend'; by: number }
  /** The wearer pulls a face and holds it. */
  | { on: 'wearer'; who?: Wearer; face: Face; hold: number }
  /** Everyone's eyes go to the garment for that long. */
  | { on: 'everyone'; look: number }

export type Beat = { at: number; cues: readonly Cue[]; notes: readonly Sound[] }
export type Answer = readonly Beat[]

const beat = (at: number, cues: readonly Cue[], notes: readonly Sound[]): Beat => ({ at, cues, notes })

/** Seconds from an answer's first beat to its last. */
export function lengthOf(answer: Answer): number {
  return answer.reduce((end, b) => Math.max(end, b.at), 0)
}

/** Seconds between one tab folding and the next. */
export const TAB_EVERY = 0.09
/** Seconds from a garment touching down to its first tab. */
export const FIRST_TAB = 0.1

/** The tabs fold over one after the other, each with its snap. */
function tabsFold(garment: Garment): Beat[] {
  return Array.from({ length: TABS[garment] }, (_, i) => beat(FIRST_TAB + i * TAB_EVERY, [{ on: 'garment', tabs: i + 1 }, { on: 'garment', kick: 'pop', by: 0.03 }], snap(i)))
}

/** When the last tab of a garment has folded, and a breath more. */
function afterTabs(garment: Garment): number {
  return FIRST_TAB + TABS[garment] * TAB_EVERY + 0.06
}

/** The face a figure pulls at each garment landing where it belongs. */
export const OWN_FACE: Record<Garment, Face> = { raincoat: 'grin', duffel: 'cosy', boots: 'down', hat: 'proud', scarf: 'giggle', mittens: 'wide', umbrella: 'oh' }
/** The face that belongs to each part when the wrong thing lands on it. */
export const PART_FACE: Record<SpotPart, Face> = { head: 'crossed', neck: 'chin', body: 'huff', hands: 'oh', feet: 'tongue', back: 'proud' }

/** How each watcher moves when someone else is dressed: each by its own spring, so no two answer alike. */
const WATCH_KICK: Record<Wearer, { on: 'wearer'; kick: 'squash' | 'tilt' | 'hop' | 'bend'; by: number }> = {
  child: { on: 'wearer', kick: 'hop', by: 0.5 },
  grandfather: { on: 'wearer', kick: 'bend', by: 0.5 },
  baby: { on: 'wearer', kick: 'tilt', by: 0.9 },
  dog: { on: 'wearer', kick: 'squash', by: 0.5 },
}

/** The others answer what just landed, one after the other, each in its own way. */
function watchers(from: number, others: readonly Wearer[]): Beat[] {
  return others.map((who, i) => beat(from + 0.12 + i * 0.11, [{ ...WATCH_KICK[who], who }], WATCHES[who]))
}

/** The finger lands on a garment: it flicks up and every eye turns to it. */
export function lifted(garment: Garment): Answer {
  return [beat(0, [{ on: 'garment', kick: 'pop', by: 0.14 }, { on: 'everyone', look: 1.2 }], flick(garment))]
}

/** A garment lands where it was cut for: it touches, its tabs fold, the wearer squashes and pulls that garment's face. */
export function landedOwn(garment: Garment, others: readonly Wearer[] = []): Answer {
  const then = afterTabs(garment)
  const settle: Cue[] = garment === 'hat' ? [{ on: 'garment', kick: 'pop', by: 0.16 }] : garment === 'scarf' ? [{ on: 'garment', kick: 'swing', by: 1.1 }] : garment === 'boots' ? [{ on: 'garment', kick: 'swing', by: 0.5 }] : []
  return [
    beat(0, [{ on: 'wearer', kick: 'squash', by: 1 }, { on: 'garment', kick: 'pop', by: 0.1 }, { on: 'everyone', look: 1.4 }], LANDS[garment]),
    ...tabsFold(garment),
    beat(then, [{ on: 'wearer', face: OWN_FACE[garment], hold: 1.6 }, { on: 'wearer', kick: 'hop', by: 0.6 }, ...settle], SETTLES[garment]),
    ...watchers(then, others),
  ]
}

/** What each garment does on a part it was not cut for, beat by beat. */
const WRONG_KICKS: Record<Garment, readonly Cue[][]> = {
  raincoat: [[{ on: 'garment', kick: 'swing', by: 1.4 }], [{ on: 'garment', kick: 'swing', by: -1 }], [{ on: 'garment', kick: 'swing', by: 0.7 }]],
  duffel: [[{ on: 'garment', kick: 'sag', by: 1.6 }, { on: 'wearer', kick: 'squash', by: 1.4 }], [{ on: 'garment', kick: 'swing', by: 0.4 }], [{ on: 'garment', kick: 'swing', by: -0.4 }]],
  boots: [[{ on: 'garment', kick: 'swing', by: 2 }], [{ on: 'garment', kick: 'pop', by: 0.2 }], [{ on: 'garment', kick: 'pop', by: 0.16 }]],
  hat: [[{ on: 'garment', kick: 'swing', by: 1.6 }], [{ on: 'garment', kick: 'swing', by: -1.4 }], [{ on: 'garment', kick: 'swing', by: 1 }]],
  scarf: [[{ on: 'garment', kick: 'sag', by: 2.2 }], [{ on: 'garment', kick: 'swing', by: 0.8 }]],
  mittens: [[{ on: 'garment', kick: 'swing', by: 2.2 }], [{ on: 'garment', kick: 'swing', by: -2.2 }]],
  umbrella: [[{ on: 'garment', kick: 'turn', by: 1 }]],
}

/** Seconds between the beats of what a garment does where it does not belong. */
export const WRONG_EVERY = 0.2

/** A garment lands on a part it was not cut for: it goes on all the same, does its own wrong thing there, and the wearer pulls the face of that part. */
export function landedWrong(garment: Garment, part: SpotPart, others: readonly Wearer[] = []): Answer {
  const then = afterTabs(garment)
  const kicks = WRONG_KICKS[garment], sounds = WRONGS[garment]
  return [
    beat(0, [{ on: 'wearer', kick: 'squash', by: 0.8 }, { on: 'garment', kick: 'pop', by: 0.1 }, { on: 'everyone', look: 1.6 }], flick(garment)),
    ...tabsFold(garment),
    ...kicks.map((cues, i) => beat(then + i * WRONG_EVERY, i === 0 ? [...cues, { on: 'wearer', face: PART_FACE[part], hold: 2 }, { on: 'wearer', kick: 'tilt', by: 0.7 }] : cues, sounds[i] ?? [])),
    ...watchers(then + kicks.length * WRONG_EVERY, others),
  ]
}

/** A worn garment is lifted off: its tabs spring open. */
export function takenOff(garment: Garment): Answer {
  return [beat(0, [{ on: 'garment', tabs: 0 }, { on: 'garment', kick: 'pop', by: 0.14 }, { on: 'wearer', kick: 'squash', by: -0.6 }, { on: 'everyone', look: 1.2 }], [...riffle, ...flick(garment)])]
}

/** A garment let go over nothing sets off for the rack. */
export const sailsHome: Answer = [beat(0, [{ on: 'garment', tabs: 0 }], sail)]

/** A garment is back on its peg and knocks against the rail. */
export function hung(garment: Garment): Answer {
  return [beat(0, [{ on: 'garment', kick: 'swing', by: 1.2 }, { on: 'garment', tabs: 0 }], peg(garment))]
}

/** The finger lands on the zip's slider. */
export const sliderHeld: Answer = [beat(0, [{ on: 'garment', kick: 'pop', by: 0.03 }], sliderPress)]

/** One tooth closes or opens; `teeth` is how many are closed after it. */
export function zipTooth(teeth: number): Answer {
  return [beat(0, [{ on: 'garment', kick: 'pop', by: 0.012 }], zipTick(teeth))]
}

/** The zip reaches the top: the collar snaps shut and the wearer tucks its chin. */
export const zippedUp: Answer = [beat(0, [{ on: 'garment', kick: 'pop', by: 0.08 }, { on: 'wearer', face: 'chin', hold: 1.4 }, { on: 'wearer', kick: 'hop', by: 0.8 }], collarSnap)]

/** The zip reaches the bottom: the front falls open. */
export const unzipped: Answer = [beat(0, [{ on: 'garment', kick: 'swing', by: 0.5 }, { on: 'wearer', face: 'oh', hold: 0.9 }], frontOpens)]

/** The finger lands on a button. */
export const buttonHeld: Answer = [beat(0, [{ on: 'garment', kick: 'pop', by: 0.03 }], buttonCreak)]

/** A button goes through its slit, or comes back out. */
export function buttoned(index: number, through: boolean): Answer {
  return through
    ? [beat(0, [{ on: 'garment', kick: 'pop', by: 0.06 }, { on: 'wearer', kick: 'squash', by: 0.5 }, { on: 'wearer', face: 'cosy', hold: 1 }], buttonPop(index))]
    : [beat(0, [{ on: 'garment', kick: 'swing', by: 0.3 }], buttonOut(index))]
}

/** One tug of the boots; `step` is how many tugs they have had after it. The last one ends in a stamp, a moment later. */
export function tugged(step: number, last: boolean): Answer {
  const pull = beat(0, [{ on: 'garment', kick: 'pop', by: 0.16 }, { on: 'wearer', kick: 'squash', by: -0.8 }, { on: 'wearer', face: 'down', hold: 0.8 }], tugSqueak(step))
  return last ? [pull, beat(0.2, [{ on: 'wearer', kick: 'squash', by: 1.3 }, { on: 'wearer', kick: 'hop', by: 0.8 }, { on: 'wearer', face: 'grin', hold: 1.2 }], stamp)] : [pull]
}

/** Boots that are on: a tap stamps both feet, one after the other. */
export const stamped: Answer = [
  beat(0, [{ on: 'wearer', kick: 'squash', by: 1.1 }, { on: 'garment', kick: 'swing', by: 0.6 }, { on: 'wearer', face: 'grin', hold: 1 }], WORN_TAPS.boots[0]),
  beat(0.16, [{ on: 'wearer', kick: 'squash', by: 0.9 }, { on: 'garment', kick: 'swing', by: -0.6 }], WORN_TAPS.boots[1]),
]

/** The umbrella opens or shuts under a tap. */
export function umbrella(open: boolean): Answer {
  return open
    ? [beat(0, [{ on: 'garment', kick: 'pop', by: 0.2 }, { on: 'wearer', face: 'oh', hold: 1 }, { on: 'wearer', kick: 'tilt', by: -0.5 }, { on: 'everyone', look: 1 }], whup)]
    : [beat(0, [{ on: 'garment', kick: 'pop', by: -0.12 }, { on: 'wearer', face: 'wide', hold: 0.7 }], clap)]
}

/** What a tap does to each worn garment that has no fastening under the finger, beat by beat. */
const WORN_KICKS: Record<Garment, readonly Cue[][]> = {
  raincoat: [[{ on: 'garment', kick: 'swing', by: 0.5 }], [{ on: 'garment', kick: 'swing', by: -0.4 }]],
  duffel: [[{ on: 'garment', kick: 'sag', by: 0.6 }, { on: 'wearer', kick: 'squash', by: 0.5 }]],
  boots: [[{ on: 'garment', kick: 'swing', by: 1.2 }], [{ on: 'garment', kick: 'swing', by: -1.2 }]],
  hat: [[{ on: 'garment', kick: 'pop', by: 0.2 }], [{ on: 'garment', kick: 'pop', by: 0.14 }]],
  scarf: [[{ on: 'garment', kick: 'swing', by: 1.3 }]],
  mittens: [[{ on: 'garment', kick: 'swing', by: 1.4 }], [{ on: 'garment', kick: 'swing', by: -1.4 }]],
  umbrella: [[{ on: 'garment', kick: 'swing', by: 0.6 }]],
}

/** A tap on a worn garment: it does its own small thing. */
export function wornTapped(garment: Garment): Answer {
  return WORN_KICKS[garment].map((cues, i) => beat(i * 0.15, cues, WORN_TAPS[garment][i] ?? []))
}

/** How each figure takes a poke: by its own spring and with its own face, in two breaths. */
const POKE_CUES: Record<Wearer, readonly Cue[][]> = {
  child: [[{ on: 'wearer', kick: 'hop', by: 1 }, { on: 'wearer', face: 'giggle', hold: 1.2 }], [{ on: 'wearer', kick: 'tilt', by: 0.8 }]],
  grandfather: [[{ on: 'wearer', kick: 'bend', by: 1.2 }, { on: 'wearer', face: 'huff', hold: 1.6 }], [{ on: 'wearer', kick: 'bend', by: -0.5 }]],
  baby: [[{ on: 'wearer', kick: 'tilt', by: 1.6 }, { on: 'wearer', face: 'wide', hold: 1.2 }], [{ on: 'wearer', kick: 'squash', by: 0.8 }, { on: 'wearer', face: 'grin', hold: 1.2 }]],
  dog: [[{ on: 'wearer', kick: 'hop', by: 0.9 }, { on: 'wearer', face: 'tongue', hold: 1.4 }], [{ on: 'wearer', kick: 'squash', by: 0.7 }]],
}

/** Seconds between a poked figure's two breaths: each takes its own time. */
export const POKE_EVERY: Record<Wearer, number> = { child: 0.12, grandfather: 0.42, baby: 0.26, dog: 0.1 }

/** A finger on a figure or the dog, with no garment under it. */
export function poked(who: Wearer): Answer {
  return POKE_CUES[who].map((cues, i) => beat(i * POKE_EVERY[who], cues, POKES[who][i] ?? []))
}

/** A finger on the printed hall. */
export const paperTapped: Answer = [beat(0, [], paperTap)]
