import type { Note } from './audio'
import { thingsOf, type Kind } from './kinds'

// Every sound of the game as plain numbers, written from the words of the
// sheet (ART.md, the grid). Nobody has listened to them yet: voices.test.ts
// holds each pitch, peak and length in range and keeps the cells of the grid
// apart. A snack of two or three things sounds as its things, together.
// Pure: audio.ts turns a list of notes into sound.

const tone = (frequency: number, glideTo: number | null, wave: OscillatorType, peak: number, attack: number, decay: number, delay = 0): Note =>
  ({ kind: 'tone', frequency, ...(glideTo ? { glideTo } : {}), wave, peak, attack, decay, delay })
const hiss = (frequency: number, q: number, peak: number, attack: number, decay: number, delay = 0, glideTo: number | null = null): Note =>
  ({ kind: 'noise', frequency, ...(glideTo ? { glideTo } : {}), q, peak, attack, decay, delay })

/** The rows of the grid are the six things in shelf order; each list below has one entry a thing. */
type Row = readonly (readonly Note[])[]

/** Slid along the rail: what each thing says as the claw starts for the finger. */
export const SLID: Row = [
  /* bread: one slow creak of the chain */ [tone(96, 82, 'sawtooth', 0.11, 0.03, 0.3), hiss(420, 6, 0.06, 0.02, 0.25)],
  /* cheese: a squeak */ [tone(880, 1320, 'sine', 0.13, 0.01, 0.11)],
  /* egg: blup */ [tone(300, 150, 'sine', 0.2, 0.008, 0.12)],
  /* chilli: a thin hiss */ [hiss(6500, 1.5, 0.09, 0.02, 0.3)],
  /* jelly: boing */ [tone(170, 240, 'sine', 0.2, 0.01, 0.09), tone(240, 170, 'sine', 0.16, 0.01, 0.12, 0.09), tone(170, 220, 'sine', 0.1, 0.01, 0.12, 0.2)],
  /* ice: ting */ [tone(2350, null, 'sine', 0.12, 0.002, 0.4), tone(3520, null, 'sine', 0.05, 0.002, 0.25)],
]

/** Let go and landed. */
export const LANDED: Row = [
  /* pomf */ [hiss(170, 0.8, 0.5, 0.006, 0.17), tone(105, 62, 'sine', 0.38, 0.005, 0.16)],
  /* boink */ [tone(300, 640, 'triangle', 0.3, 0.006, 0.15)],
  /* splat */ [hiss(1100, 0.7, 0.4, 0.004, 0.1, 0, 320), tone(230, 110, 'sine', 0.22, 0.005, 0.14)],
  /* tsst and a spark */ [hiss(6200, 2.2, 0.22, 0.002, 0.07), tone(1900, 2600, 'square', 0.05, 0.001, 0.035, 0.02)],
  /* blub-lub-lub */ [tone(205, 265, 'sine', 0.28, 0.01, 0.08), tone(190, 250, 'sine', 0.2, 0.01, 0.08, 0.11), tone(176, 236, 'sine', 0.13, 0.01, 0.09, 0.22)],
  /* tok */ [tone(1450, 1300, 'triangle', 0.26, 0.001, 0.045), hiss(3000, 3, 0.12, 0.001, 0.03)],
]

/** Touches a snack it cannot join. */
export const BUMPED: Row = [
  /* pfumf */ [hiss(260, 0.7, 0.4, 0.012, 0.2), tone(88, 60, 'sine', 0.22, 0.01, 0.2)],
  /* a high squeak, twice */ [tone(1250, 1700, 'sine', 0.16, 0.008, 0.07), tone(1350, 1850, 'sine', 0.13, 0.008, 0.07, 0.13)],
  /* a slurp */ [hiss(700, 2.5, 0.25, 0.03, 0.22, 0, 1900), tone(420, 210, 'sine', 0.1, 0.02, 0.2)],
  /* a yip, a puff, two short hisses */ [tone(700, 1500, 'triangle', 0.22, 0.006, 0.08), hiss(2500, 1, 0.12, 0.01, 0.14, 0.03), hiss(6000, 3, 0.1, 0.004, 0.04, 0.22), hiss(6000, 3, 0.1, 0.004, 0.04, 0.3)],
  /* thp and a pop */ [hiss(380, 1.2, 0.3, 0.02, 0.09), tone(330, 700, 'sine', 0.24, 0.004, 0.06, 0.2)],
  /* a clack and chattering teeth */ [tone(1900, null, 'square', 0.13, 0.001, 0.03), tone(1250, null, 'triangle', 0.2, 0.001, 0.04), ...[0, 1, 2, 3, 4].map((i) => hiss(2800, 6, 0.09, 0.001, 0.02, 0.12 + i * 0.05))],
]

/** Joins another snack: the sound of what each thing gives. */
export const GIVEN: Row = [
  /* a dry crunch */ [hiss(2400, 1.2, 0.2, 0.002, 0.035), hiss(1700, 1.5, 0.18, 0.002, 0.04, 0.045), hiss(2900, 1.4, 0.13, 0.002, 0.03, 0.085)],
  /* schlorp */ [tone(260, 130, 'sawtooth', 0.1, 0.02, 0.2), hiss(500, 3, 0.2, 0.02, 0.2, 0, 1400)],
  /* plip */ [tone(980, 1500, 'sine', 0.2, 0.004, 0.06)],
  /* fwoosh */ [hiss(900, 0.8, 0.26, 0.05, 0.28, 0, 3200)],
  /* blorp */ [tone(120, 62, 'sine', 0.36, 0.012, 0.22), tone(250, 140, 'sine', 0.12, 0.012, 0.15, 0.03)],
  /* a crackle of freezing */ [0, 1, 2, 3, 4].map((i) => hiss(4200 + i * 500, 8, 0.13, 0.001, 0.022, i * 0.035)),
]

/** Burped out: what each thing says as it leaves the jar. */
export const THROWN_OUT: Row = [
  /* a slow whoosh */ [hiss(300, 0.6, 0.1, 0.1, 0.5)],
  /* a long squeal */ [tone(900, 2200, 'sine', 0.14, 0.05, 0.6)],
  /* flap, flap */ [hiss(500, 2, 0.14, 0.02, 0.08), hiss(520, 2, 0.14, 0.02, 0.08, 0.22)],
  /* a rising whistle on a jet */ [tone(800, 3000, 'sine', 0.1, 0.03, 0.45), hiss(1200, 0.8, 0.15, 0.03, 0.4)],
  /* a slow boing */ [tone(150, 210, 'sine', 0.18, 0.02, 0.2), tone(210, 150, 'sine', 0.14, 0.02, 0.24, 0.2)],
  /* a long shh */ [hiss(5000, 1.2, 0.1, 0.05, 0.6)],
]

/** Burped out: how each thing comes down on the counter. */
export const SET_DOWN: Row = [
  /* flump */ [hiss(200, 0.7, 0.4, 0.01, 0.22), tone(80, 55, 'sine', 0.3, 0.008, 0.2)],
  /* two bounces */ [tone(340, 700, 'triangle', 0.26, 0.006, 0.12), tone(380, 760, 'triangle', 0.16, 0.006, 0.1, 0.2)],
  /* splat */ [hiss(900, 0.7, 0.4, 0.004, 0.13, 0, 260), tone(200, 100, 'sine', 0.2, 0.005, 0.16)],
  /* a last tsst */ [hiss(5600, 2, 0.2, 0.002, 0.12)],
  /* splodge */ [hiss(300, 1, 0.35, 0.01, 0.2, 0, 150), tone(140, 90, 'sine', 0.24, 0.01, 0.3)],
  /* a clink */ [tone(2600, null, 'sine', 0.2, 0.001, 0.2), tone(3900, null, 'sine', 0.08, 0.001, 0.14)],
]

export const POP: readonly Note[] = [tone(420, 980, 'sine', 0.3, 0.004, 0.07), hiss(1800, 1, 0.14, 0.002, 0.04)]

/** The claw starts for the finger, and opens. */
export const ZIP: readonly Note[] = [hiss(2600, 4, 0.07, 0.004, 0.05, 0, 5200), tone(1300, 2100, 'square', 0.03, 0.004, 0.05)]
export const CLICK: readonly Note[] = [tone(2100, null, 'square', 0.06, 0.001, 0.02), hiss(3500, 4, 0.08, 0.001, 0.02)]

/** The jar: the rumble before a burp, the burp, the hiccup after it, and a knock on its handle. */
export const RUMBLE: readonly Note[] = [tone(60, 48, 'sawtooth', 0.2, 0.3, 0.6), hiss(120, 2, 0.2, 0.3, 0.6)]
export const BURP: readonly Note[] = [tone(140, 70, 'sawtooth', 0.34, 0.02, 0.34), tone(96, 60, 'square', 0.14, 0.02, 0.3, 0.04), hiss(260, 1.5, 0.2, 0.02, 0.3)]
export const HICCUP: readonly Note[] = [tone(330, 620, 'triangle', 0.2, 0.004, 0.06)]
export const CLINK: readonly Note[] = [tone(1750, null, 'sine', 0.2, 0.001, 0.3), tone(2630, null, 'sine', 0.1, 0.001, 0.2), tone(3400, null, 'sine', 0.05, 0.001, 0.14)]

/** The shop and those in it, each poked. */
export const RUSTLE: readonly Note[] = [hiss(4200, 0.8, 0.16, 0.01, 0.07), hiss(3600, 0.8, 0.13, 0.01, 0.06, 0.08), hiss(4600, 0.8, 0.1, 0.01, 0.08, 0.16)]
export const TUP: readonly Note[] = [tone(210, 150, 'sine', 0.12, 0.003, 0.06)]
export const TINK: readonly Note[] = [tone(3100, null, 'sine', 0.09, 0.001, 0.18)]
export const DING: readonly Note[] = [tone(1320, null, 'sine', 0.18, 0.002, 0.7), tone(1980, null, 'sine', 0.07, 0.002, 0.5)]
export const SQUEAK: readonly Note[] = [tone(2300, 3300, 'sine', 0.12, 0.004, 0.05), tone(2600, 3600, 'sine', 0.09, 0.004, 0.05, 0.07)]
export const GRUNT: readonly Note[] = [tone(92, 64, 'sawtooth', 0.26, 0.03, 0.26), hiss(180, 2, 0.12, 0.03, 0.22)]
export const KNOCK: readonly Note[] = [tone(520, 430, 'triangle', 0.22, 0.001, 0.045), hiss(900, 3, 0.1, 0.001, 0.03), tone(520, 430, 'triangle', 0.2, 0.001, 0.045, 0.18), hiss(900, 3, 0.09, 0.001, 0.03, 0.18)]
/** The monster at the jar licks its lips when a snack pops into a new one. */
export const LICK: readonly Note[] = [hiss(900, 3, 0.07, 0.04, 0.16, 0.12, 2400)]
/** A snack with fire in it breathes its small flame. */
export const FLAME: readonly Note[] = [hiss(1100, 0.9, 0.05, 0.05, 0.2, 0, 2600)]

/** The jar tipped over to a mouth: glass on wood, the snacks sliding out, and the swallow. */
export const TIPPED: readonly Note[] = [tone(180, 120, 'triangle', 0.2, 0.01, 0.16), hiss(3000, 2, 0.08, 0.05, 0.3, 0.05, 1500)]
export const SLIDE_OUT: readonly Note[] = [hiss(2200, 1.5, 0.1, 0.03, 0.22, 0, 900), tone(260, 150, 'sine', 0.16, 0.006, 0.09, 0.24)]
export const GULP: readonly Note[] = [tone(210, 90, 'sine', 0.3, 0.01, 0.14), tone(120, 170, 'sine', 0.16, 0.01, 0.1, 0.16)]
/** One grain of sugar on a tongue. */
export const TICK: readonly Note[] = [tone(3400, null, 'sine', 0.1, 0.001, 0.05)]
/** The fed monster pats its belly and shuffles out; the shop bell; the next one sits down. */
export const PAT: readonly Note[] = [hiss(210, 1.4, 0.26, 0.004, 0.08), hiss(190, 1.4, 0.22, 0.004, 0.08, 0.22)]
export const SHUFFLE: readonly Note[] = [0, 1, 2, 3].map((i) => hiss(700, 1.2, 0.09, 0.03, 0.12, i * 0.32))
export const BELL: readonly Note[] = [tone(2090, null, 'sine', 0.16, 0.002, 0.5), tone(2640, null, 'sine', 0.12, 0.002, 0.45, 0.16), tone(3140, null, 'sine', 0.05, 0.002, 0.3, 0.16)]
export const SAT: readonly Note[] = [hiss(150, 0.9, 0.34, 0.006, 0.16), tone(74, 52, 'sine', 0.3, 0.006, 0.2)]
/** The jar rocks back when a pull is let go too soon. */
export const ROCK_BACK: readonly Note[] = [tone(150, 110, 'triangle', 0.16, 0.005, 0.12), tone(1750, null, 'sine', 0.06, 0.001, 0.2, 0.03)]

/** A poke at the one at the jar: Mumf grunts, Pib peeps, Oon murmurs. */
export const POKED: readonly (readonly Note[])[] = [
  GRUNT,
  [tone(1500, 2100, 'sine', 0.16, 0.004, 0.07)],
  [tone(130, 105, 'sine', 0.2, 0.06, 0.3), tone(196, 150, 'sine', 0.07, 0.06, 0.26, 0.05)],
]

/**
 * What each monster says to each thing: three rows of six, in the round's order and in shelf order
 * (ART.md, "The characters and their fixed tastes"). The move that goes with each is in cast.ts and view.ts.
 */
export const ANSWERS: readonly Row[] = [
  // Mumf
  [
    /* bread: slow chewing under a hum */ [tone(110, 104, 'sine', 0.14, 0.1, 1.1), hiss(240, 1.2, 0.2, 0.02, 0.12), hiss(220, 1.2, 0.2, 0.02, 0.12, 0.45), hiss(240, 1.2, 0.18, 0.02, 0.12, 0.9)],
    /* cheese: two honks through a pinched nose */ [tone(233, 220, 'square', 0.1, 0.02, 0.3), tone(466, 440, 'sawtooth', 0.04, 0.02, 0.3), tone(247, 208, 'square', 0.1, 0.02, 0.36, 0.48)],
    /* egg: a long gurgle */ [0, 1, 2, 3, 4, 5].map((i) => tone(i % 2 ? 170 : 215, i % 2 ? 250 : 150, 'sine', 0.2, 0.02, 0.1, i * 0.14)),
    /* chilli: one long roar of flame */ [tone(72, 55, 'sawtooth', 0.26, 0.2, 1.1), hiss(600, 0.8, 0.26, 0.2, 1.1, 0, 2400)],
    /* jelly: wub-wub */ [tone(84, 50, 'sine', 0.4, 0.03, 0.24), tone(84, 50, 'sine', 0.36, 0.03, 0.24, 0.36), tone(84, 50, 'sine', 0.3, 0.03, 0.24, 0.72)],
    /* ice: chattering teeth, and the creak of an icicle */ [...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => hiss(3000, 6, 0.12, 0.001, 0.02, i * 0.07)), tone(300, 345, 'sawtooth', 0.07, 0.1, 0.55, 0.62)],
  ],
  // Pib
  [
    /* bread: two bored chews and a yawn with a squeak */ [hiss(900, 1.5, 0.12, 0.01, 0.07), hiss(900, 1.5, 0.12, 0.01, 0.07, 0.24), tone(430, 300, 'sine', 0.12, 0.2, 0.5, 0.5), tone(1900, 2500, 'sine', 0.08, 0.01, 0.07, 1.2)],
    /* cheese: a rising squeal */ [tone(600, 2400, 'sine', 0.16, 0.05, 0.8)],
    /* egg: three hiccups */ [0, 1, 2].map((i) => tone(400, 900, 'triangle', 0.2, 0.004, 0.06, i * 0.7)),
    /* chilli: a kettle's whistle */ [tone(2000, 2900, 'sine', 0.12, 0.3, 1), hiss(5200, 2, 0.1, 0.3, 0.9)],
    /* jelly: a giggle in quick high steps */ [900, 1010, 1130, 1270, 1130, 1420].map((f, i) => tone(f, f * 1.06, 'triangle', 0.13, 0.004, 0.06, i * 0.09)),
    /* ice: a tinkle of frost and a cold sigh */ [...[3100, 3700, 4200, 3500].map((f, i) => tone(f, null, 'sine', 0.07, 0.001, 0.14, i * 0.08)), hiss(1500, 1, 0.1, 0.2, 0.6, 0.5, 700)],
  ],
  // Oon
  [
    /* bread: a snore, and the bubble's pop */ [tone(70, 92, 'sawtooth', 0.18, 0.3, 0.4), hiss(210, 2, 0.14, 0.3, 0.4), tone(620, 500, 'sine', 0.05, 0.2, 0.4, 0.8), tone(900, 1500, 'sine', 0.14, 0.002, 0.04, 1.5)],
    /* cheese: a long stretch and a twang */ [tone(210, 120, 'sawtooth', 0.08, 0.3, 0.4), tone(160, 320, 'triangle', 0.28, 0.002, 0.3, 0.75), tone(322, 160, 'triangle', 0.14, 0.002, 0.3, 0.85)],
    /* egg: three clucks */ [0, 1, 2].map((i) => tone(700 + i * 90, 500 + i * 90, 'square', 0.09, 0.003, 0.05, 0.25 + i * 0.25)),
    /* chilli: a shriek */ [tone(900, 2600, 'sawtooth', 0.14, 0.02, 0.5), tone(1800, 3000, 'sine', 0.1, 0.02, 0.5), hiss(1400, 1, 0.08, 0.05, 0.3, 0.5, 3000)],
    /* jelly: a purr */ [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => tone(58, 52, 'sawtooth', 0.15, 0.02, 0.08, i * 0.11)),
    /* ice: a crack */ [hiss(2500, 1, 0.4, 0.001, 0.05), tone(1800, 900, 'square', 0.1, 0.001, 0.04), tone(2900, null, 'sine', 0.06, 0.001, 0.3, 0.05)],
  ],
]

/** What a monster says to one mouthful: its answers to the things in that snack, all at once. */
export function answered(monster: number, kind: Kind, gain = 1): Note[] {
  return said(ANSWERS[monster], kind, gain)
}

/** A list of notes at another pitch: `by` times as high. */
export function pitched(notes: readonly Note[], by: number): Note[] {
  return notes.map((note) => ({ ...note, frequency: note.frequency * by, ...(note.glideTo ? { glideTo: note.glideTo * by } : {}) }))
}

/** A list of notes, louder or softer, and later. */
export function shaped(notes: readonly Note[], gain = 1, delay = 0): Note[] {
  return notes.map((note) => ({ ...note, peak: note.peak * gain, delay: (note.delay ?? 0) + delay }))
}

/** What a snack says in one cell of the grid: the sounds of its things, together, none louder than one alone. */
export function said(row: Row, kind: Kind, gain = 1): Note[] {
  const things = thingsOf(kind)
  return things.flatMap((thing) => shaped(row[thing], gain / Math.sqrt(things.length)))
}

/** The call of a snack: a pop, then the joining sounds of its things in shelf order. No two snacks call alike. */
export function call(kind: Kind, gain = 1): Note[] {
  return [...shaped(POP, gain), ...thingsOf(kind).flatMap((thing, i) => shaped(GIVEN[thing], gain, 0.09 + i * 0.13))]
}

/** How long a list of notes sounds, in seconds. */
export function lengthOf(notes: readonly Note[]): number {
  return notes.reduce((end, note) => Math.max(end, (note.delay ?? 0) + note.attack + note.decay), 0)
}
