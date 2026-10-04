import type { CamperId, Supply } from './world'

// Every voice of the game, as plain numbers. Nobody on the machine that wrote
// them could hear them: they were written from the words of the design sheet
// ("The toy", and the sounds of the grid), kept short and quiet, and a test
// holds each one inside the ranges below. The loudness is the lead's to check
// on a real machine, and the owner is the first to listen.
//
// A voice is a short list of notes. A note is a tone (an oscillator) or a
// noise (a band of hiss), with its pitch, its peak, how fast it speaks and how
// long it rings, and how long after the touch it starts. sound.ts turns a
// list into something audio.ts can play.

export type Note = {
  readonly kind: 'tone' | 'noise'
  /** The oscillator's shape, for a tone. */
  readonly wave?: 'sine' | 'triangle' | 'square' | 'sawtooth'
  /** Pitch in hertz: the tone's frequency, or the centre of the noise band. */
  readonly hz: number
  /** Where the pitch glides to over the note, if it moves. */
  readonly to?: number
  /** How narrow the noise band is. */
  readonly q?: number
  /** The loudest the note gets, as a gain from 0 to 1. */
  readonly peak: number
  /** Seconds to reach the peak, and seconds to die away after it. */
  readonly attack: number
  readonly decay: number
  /** Seconds after the voice starts. */
  readonly delay: number
}

/** The ranges every note is held to. */
export const RANGES = { hz: [55, 4200], peak: [0.01, 0.24], attack: [0.002, 0.09], decay: [0.03, 0.6], delay: [0, 1.2], sum: 0.6, seconds: 1.5 } as const

const tone = (wave: Note['wave'], hz: number, peak: number, attack: number, decay: number, delay = 0, to?: number): Note => ({ kind: 'tone', wave, hz, peak, attack, decay, delay, ...(to ? { to } : {}) })
const hiss = (hz: number, q: number, peak: number, attack: number, decay: number, delay = 0, to?: number): Note => ({ kind: 'noise', hz, q, peak, attack, decay, delay, ...(to ? { to } : {}) })
const semis = (base: number, steps: number) => base * 2 ** (steps / 12)
/** Five notes to the octave, so any run of them sounds like a tune and never like a mistake. */
const PENTA = [0, 2, 4, 7, 9]
const penta = (base: number, n: number) => semis(base, PENTA[((n % 5) + 5) % 5] + 12 * Math.floor(n / 5))

/** The most pieces a wooden run climbs over: sixty logs rise three octaves, each a step higher than the last. */
export const LOG_STEPS = 60

/** One log coming out: a wood block, a step higher than the one before, with a deeper knock under every fifth. */
export function logOut(n: number): Note[] {
  const hz = 196 * 2 ** ((Math.max(1, n) - 1) / 20), notes = [tone('triangle', hz, 0.15, 0.003, 0.07, 0, hz * 0.94), hiss(hz * 2.2, 3, 0.05, 0.002, 0.03)]
  if (n % 5 === 0) notes.push(tone('sine', semis(82, (n / 5) % 12), 0.2, 0.004, 0.14, 0, semis(70, (n / 5) % 12)))
  return notes
}
/** One log hopping home: the same note, softer and shorter, so a row pushed back steps down the way it came. */
export function logHome(n: number): Note[] {
  const hz = 196 * 2 ** ((Math.max(1, n) - 1) / 20)
  return [tone('triangle', hz, 0.09, 0.003, 0.05, 0, hz * 0.9)]
}
/** A log that was tapped rolls half a turn and rings its own note, hollow. */
export function logTap(n: number): Note[] {
  const hz = 196 * 2 ** ((Math.max(1, n) - 1) / 20)
  return [tone('sine', hz, 0.16, 0.004, 0.2), tone('sine', hz * 2.7, 0.04, 0.004, 0.08), hiss(700, 2, 0.04, 0.01, 0.08, 0.05)]
}

/** The oil's band passing a flask mark: a glassy clink, climbing five notes to the octave. */
export function clink(n: number): Note[] {
  const hz = penta(523, n - 1)
  return [tone('sine', hz, 0.12, 0.002, 0.22), tone('sine', hz * 1.5, 0.04, 0.002, 0.1)]
}
/** The oil pouring: one small gurgle, of which a pull makes a string. */
export const GURGLE: Note[] = [hiss(520, 5, 0.06, 0.012, 0.07, 0, 880), tone('sine', 210, 0.04, 0.01, 0.06, 0.01, 300)]
/** A flask that was tapped wobbles and rings like glass. */
export const FLASK_TAP: Note[] = [tone('sine', 1568, 0.13, 0.002, 0.3), tone('sine', 4186, 0.03, 0.002, 0.12), tone('sine', 1568, 0.05, 0.002, 0.12, 0.14)]

/** The water's band passing a can mark: a low clunk, a step higher for each can. */
export function clunk(n: number): Note[] {
  const hz = semis(110, (n - 1) * 2)
  return [tone('sine', hz, 0.2, 0.005, 0.16, 0, hz * 0.8), hiss(300, 1.5, 0.07, 0.004, 0.06)]
}
/** The water lagging behind the finger: one slosh. */
export const SLOSH: Note[] = [hiss(420, 1.2, 0.07, 0.04, 0.22, 0, 190), hiss(900, 2, 0.03, 0.06, 0.16, 0.05, 500)]
/** A can that was tapped: a slosh, and a cup that hops out and back. */
export const CAN_TAP: Note[] = [hiss(380, 1.4, 0.08, 0.03, 0.2, 0, 220), tone('sine', 620, 0.08, 0.004, 0.07, 0.12, 900), tone('sine', 900, 0.06, 0.004, 0.07, 0.3, 560)]

/** A pile rattling as the finger lands on it: each supply in its own material. */
export const RATTLE: Readonly<Record<Supply, Note[]>> = {
  logs: [hiss(900, 2.5, 0.1, 0.003, 0.04), hiss(700, 2.5, 0.08, 0.003, 0.04, 0.045), tone('triangle', 174, 0.14, 0.003, 0.09, 0.02, 150), hiss(1100, 2.5, 0.06, 0.003, 0.03, 0.09)],
  oil: [tone('sine', 1760, 0.08, 0.002, 0.12), tone('sine', 2093, 0.07, 0.002, 0.12, 0.05), tone('sine', 1397, 0.07, 0.002, 0.14, 0.1)],
  water: [hiss(260, 1.2, 0.1, 0.02, 0.18, 0, 160), tone('sine', 98, 0.16, 0.006, 0.14, 0.03, 82)],
}
/** A row settling after the finger lets go: a ripple of soft ticks running back to the pile. */
export const SETTLE: Readonly<Record<Supply, Note[]>> = {
  logs: [0, 1, 2, 3, 4].map((i) => hiss(1400 - i * 180, 4, 0.05 - i * 0.006, 0.003, 0.035, i * 0.045)),
  oil: [0, 1, 2].map((i) => tone('sine', semis(1319, -i * 3), 0.05, 0.003, 0.12, i * 0.07)),
  water: [hiss(340, 1.2, 0.07, 0.05, 0.26, 0, 150), tone('sine', 123, 0.08, 0.01, 0.16, 0.12, 98)],
}
/** Pieces tumbling into a heap past the end of a rod. */
export const TUMBLE: Note[] = [hiss(800, 2, 0.1, 0.003, 0.05), tone('triangle', 233, 0.1, 0.003, 0.07, 0.03), hiss(600, 2, 0.08, 0.003, 0.05, 0.08), tone('triangle', 185, 0.1, 0.003, 0.08, 0.12), hiss(500, 2, 0.06, 0.003, 0.06, 0.17)]
/** The mule sitting down: a thump and a long breath out. */
export const MULE_SITS: Note[] = [tone('sine', 78, 0.22, 0.008, 0.2, 0, 60), hiss(500, 0.8, 0.06, 0.08, 0.5, 0.1, 220)]

/** What each camper says to a poke: invented, wordless, and each in a voice of its own. */
export const POKED: Readonly<Record<CamperId, Note[]>> = {
  // A small questioning hum, going up.
  reader: [tone('sine', 330, 0.12, 0.03, 0.14, 0, 349), tone('sine', 392, 0.12, 0.03, 0.2, 0.2, 440)],
  // A snort, late, and a long sinking snore.
  sleeper: [hiss(240, 2, 0.12, 0.02, 0.1, 0.3), tone('sawtooth', 98, 0.09, 0.08, 0.5, 0.42, 65)],
  // The pan rings as the spoon comes up.
  cook: [tone('sine', 587, 0.15, 0.002, 0.32), tone('sine', 1481, 0.06, 0.002, 0.2), tone('sine', 2217, 0.03, 0.002, 0.12)],
  // A low, slow, satisfied note.
  scout: [tone('triangle', 147, 0.14, 0.09, 0.5, 0.1, 165)],
  // Three quick squeaks, each smaller.
  small: [tone('sine', 988, 0.12, 0.01, 0.07, 0, 1175), tone('sine', 1175, 0.1, 0.01, 0.07, 0.14, 1319), tone('sine', 1319, 0.07, 0.01, 0.08, 0.28, 1568)],
}
export const DOG_YIP: Note[] = [tone('square', 620, 0.07, 0.006, 0.06, 0, 930), tone('square', 700, 0.06, 0.006, 0.07, 0.13, 1040)]
export const DOG_SNIFF: Note[] = [hiss(1800, 3, 0.05, 0.02, 0.05), hiss(2100, 3, 0.05, 0.02, 0.05, 0.13), hiss(1900, 3, 0.04, 0.02, 0.06, 0.26)]
/** A croak, a plop into the pool, and a smaller plop back out. */
export const FROG_HOP: Note[] = [tone('square', 175, 0.07, 0.01, 0.12, 0, 120), tone('sine', 420, 0.14, 0.004, 0.12, 0.38, 110), hiss(1200, 1, 0.05, 0.01, 0.12, 0.4), tone('sine', 520, 0.07, 0.004, 0.08, 1.1, 260)]
/** The bray, after a pause: two heaves, the second lower. */
export const MULE_BRAY: Note[] = [tone('sawtooth', 311, 0.08, 0.05, 0.26, 0.32, 233), tone('sawtooth', 247, 0.1, 0.06, 0.4, 0.85, 175)]
export const KETTLE_LID: Note[] = [0, 1, 2, 3].map((i) => tone('square', 2350 + (i % 2) * 320, 0.035, 0.002, 0.035, i * 0.06))
export const FIRE_STONES: Note[] = [hiss(950, 3, 0.1, 0.003, 0.05), hiss(760, 3, 0.09, 0.003, 0.05, 0.09), hiss(1150, 3, 0.07, 0.003, 0.04, 0.2)]
/** The compass needle swinging round and settling: ticks that slow down. */
export const COMPASS_SPIN: Note[] = [0, 0.05, 0.11, 0.19, 0.3, 0.45, 0.66].map((delay, i) => tone('sine', 3100 - i * 120, 0.05 - i * 0.004, 0.002, 0.03, delay))
/** A tent's guy lines twanging: one pitch a tent, so the five make a chord. */
export const TENT_TWANG: Readonly<Record<CamperId, Note[]>> = {
  cook: [tone('triangle', 196, 0.14, 0.003, 0.3, 0, 190), tone('triangle', 392, 0.04, 0.003, 0.15)],
  reader: [tone('triangle', 220, 0.14, 0.003, 0.3, 0, 213), tone('triangle', 440, 0.04, 0.003, 0.15)],
  sleeper: [tone('triangle', 165, 0.14, 0.003, 0.34, 0, 160), tone('triangle', 330, 0.04, 0.003, 0.15)],
  small: [tone('triangle', 294, 0.13, 0.003, 0.26, 0, 285), tone('triangle', 588, 0.04, 0.003, 0.13)],
  scout: [tone('triangle', 247, 0.14, 0.003, 0.3, 0, 240), tone('triangle', 494, 0.04, 0.003, 0.15)],
}

// --- The game on the toy: the grid's other cells, the kit, and the night ----------------------------------------
// Written from the paragraph of sounds under the grid in the design sheet. Nobody has heard these either.

/** A log on the fire: a stony crunch at dusk; at night a crackle and one loud pop. */
export const LOG_ON_FIRE: Note[] = [hiss(700, 3, 0.11, 0.003, 0.06), hiss(520, 3, 0.1, 0.003, 0.08, 0.07), tone('triangle', 131, 0.14, 0.004, 0.12, 0.05, 110)]
export const LOG_FLARE: Note[] = [hiss(2400, 1.5, 0.06, 0.004, 0.05), hiss(1900, 1.5, 0.05, 0.004, 0.05, 0.08), hiss(2800, 1.5, 0.05, 0.004, 0.04, 0.15), tone('square', 420, 0.12, 0.002, 0.05, 0.24, 180)]
export const LOG_ON_LANTERN: Note[] = [tone('sine', 380, 0.14, 0.004, 0.12, 0.5, 100), hiss(3000, 1, 0.07, 0.02, 0.4, 0.58, 1500)]
/** A log on a camper: a creak, a soft thump, a wooden clonk, a scrape, a rocking creak. */
export const LOG_ON_CAMPER: Readonly<Record<CamperId, Note[]>> = {
  reader: [tone('sawtooth', 160, 0.06, 0.05, 0.22, 0, 120)],
  sleeper: [tone('sine', 90, 0.16, 0.01, 0.16, 0, 70), hiss(300, 1, 0.05, 0.01, 0.1)],
  cook: [tone('triangle', 440, 0.13, 0.003, 0.09), tone('triangle', 392, 0.1, 0.003, 0.09, 0.16), tone('triangle', 440, 0.08, 0.003, 0.09, 0.32)],
  scout: [hiss(1500, 4, 0.07, 0.02, 0.09), hiss(1700, 4, 0.06, 0.02, 0.09, 0.2), hiss(1500, 4, 0.05, 0.02, 0.09, 0.4)],
  small: [tone('sawtooth', 220, 0.05, 0.04, 0.14, 0, 260), tone('sawtooth', 260, 0.05, 0.04, 0.14, 0.22, 220), tone('sawtooth', 220, 0.04, 0.04, 0.14, 0.44, 260)],
}
/** A flask on the fire: a deep whoomph and the flap of hats. */
export const FLASK_ON_FIRE: Note[] = [tone('sine', 70, 0.22, 0.03, 0.4, 0, 55), hiss(400, 0.7, 0.14, 0.03, 0.35, 0, 1200), hiss(900, 2, 0.05, 0.01, 0.06, 0.3), hiss(1000, 2, 0.05, 0.01, 0.06, 0.38), hiss(850, 2, 0.04, 0.01, 0.06, 0.46)]
export const FLASK_ON_LANTERN: Note[] = [tone('sine', 300, 0.1, 0.01, 0.08, 0, 220), tone('sine', 260, 0.1, 0.01, 0.08, 0.12, 190), tone('sine', 230, 0.1, 0.01, 0.08, 0.24, 170), tone('square', 110, 0.07, 0.02, 0.16, 0.5, 80)]
export const FLASK_ON_CAMPER: Note[] = [hiss(2000, 3, 0.05, 0.03, 0.08), hiss(2300, 3, 0.05, 0.03, 0.08, 0.18), hiss(1200, 0.8, 0.14, 0.01, 0.2, 0.75, 500), tone('square', 330, 0.06, 0.01, 0.1, 0.75, 180)]
/** Water on the fire: a splat and one croak at dusk; a long hiss at night. */
export const CAN_ON_FIRE: Note[] = [hiss(500, 1, 0.14, 0.005, 0.14, 0, 250), tone('square', 165, 0.07, 0.01, 0.14, 0.5, 115)]
export const CAN_STEAM: Note[] = [hiss(3200, 0.8, 0.1, 0.03, 0.55, 0, 1400), hiss(1500, 0.8, 0.05, 0.05, 0.5, 0.05, 700)]
export const CAN_ON_LANTERN: Note[] = [tone('sine', 240, 0.06, 0.02, 0.06), tone('sine', 300, 0.06, 0.02, 0.06, 0.1), tone('sine', 260, 0.06, 0.02, 0.06, 0.2), tone('sine', 330, 0.06, 0.02, 0.06, 0.3), tone('sine', 900, 0.1, 0.003, 0.05, 0.7, 1500)]
export const CAN_ON_CAMPER: Note[] = [hiss(600, 0.8, 0.14, 0.005, 0.2, 0, 300), hiss(1800, 2, 0.06, 0.01, 0.07, 0.4), hiss(2000, 2, 0.05, 0.01, 0.07, 0.55), hiss(2200, 2, 0.04, 0.01, 0.07, 0.7)]
/** The lantern: its handle squeaks as it is carried and it sets down with a tick; and its four wrong uses. */
export const LANTERN_SQUEAK: Note[] = [tone('sine', 1250, 0.04, 0.02, 0.06, 0, 1500)]
export const LANTERN_SET: Note[] = [tone('square', 1900, 0.05, 0.002, 0.03), tone('sine', 180, 0.08, 0.004, 0.06)]
export const LANTERN_ON_FIRE: Note[] = [tone('sine', 1500, 0.07, 0.08, 0.5, 0, 2300), tone('sine', 2250, 0.03, 0.08, 0.45, 0.05, 3400)]
export const LANTERN_ON_LANTERN: Note[] = [tone('sine', 1760, 0.1, 0.002, 0.12), tone('sine', 1976, 0.09, 0.002, 0.12, 0.12), tone('sine', 1200, 0.07, 0.03, 0.4, 0.4, 400)]
/** A lantern worn as a hat: a hollow tonk on the head. Then the reader, who reads on, turns a page, and the sleeper pulls the bag over with a long zip; the others only wear it. */
export const LANTERN_ON_CAMPER: Note[] = [tone('sine', 300, 0.14, 0.004, 0.16, 0, 240)]
export const LANTERN_ON_READER: Note[] = [...LANTERN_ON_CAMPER, hiss(2600, 2, 0.05, 0.03, 0.1, 0.45)]
export const LANTERN_ON_SLEEPER: Note[] = [...LANTERN_ON_CAMPER, hiss(1400, 6, 0.05, 0.05, 0.3, 0.45, 2600)]
export const WICK_CLICK: Note[] = [tone('square', 2600, 0.05, 0.002, 0.03), tone('sine', 660, 0.06, 0.004, 0.08, 0.02)]
/** The amount card: stamped, flipped, rubbed out, and its three wrong uses. */
export const CARD_STAMP: Note[] = [tone('sine', 140, 0.16, 0.004, 0.09, 0, 100), hiss(3000, 4, 0.04, 0.03, 0.14, 0.1)]
export const CARD_FLIP: Note[] = [hiss(2600, 3, 0.07, 0.003, 0.04), tone('triangle', 880, 0.05, 0.003, 0.05, 0.03)]
export const RUB_OUT: Note[] = [hiss(1800, 2, 0.05, 0.03, 0.09), hiss(1600, 2, 0.04, 0.03, 0.09, 0.1)]
export const CARD_ON_FIRE: Note[] = [hiss(2600, 1.5, 0.06, 0.005, 0.06), hiss(2200, 1.5, 0.05, 0.005, 0.06, 0.1), hiss(900, 1.5, 0.08, 0.01, 0.1, 0.5)]
export const CARD_ON_LANTERN: Note[] = [hiss(1400, 1.2, 0.12, 0.003, 0.07)]
export const CARD_ON_CAMPER: Note[] = [0, 1, 2, 3, 4, 5].map((i) => hiss(900 + (i % 2) * 200, 4, 0.05, 0.004, 0.03, i * 0.07)).concat([hiss(500, 1, 0.1, 0.01, 0.12, 0.9)])
/** The marshmallow: laid on the trail, the tin's lid, and its three wrong uses. */
export const MARSH_LAID: Note[] = [tone('sine', 520, 0.08, 0.004, 0.05, 0, 700)]
export const TIN_POP: Note[] = [tone('square', 700, 0.08, 0.002, 0.04, 0, 1100), tone('sine', 520, 0.07, 0.004, 0.06, 0.1, 760)]
export const MARSH_ON_FIRE: Note[] = [tone('sine', 400, 0.09, 0.09, 0.5, 0, 1300), hiss(600, 0.8, 0.07, 0.06, 0.4, 0.75, 250)]
export const MARSH_ON_LANTERN: Note[] = [hiss(450, 1.5, 0.09, 0.06, 0.4, 0, 250), hiss(3000, 5, 0.04, 0.01, 0.05, 0.55), hiss(3300, 5, 0.04, 0.01, 0.05, 0.65), hiss(3000, 5, 0.03, 0.01, 0.05, 0.75)]
export const MARSH_ON_CAMPER: Note[] = [hiss(500, 1.5, 0.08, 0.02, 0.09), hiss(450, 1.5, 0.08, 0.02, 0.09, 0.22)]
export const MARSH_ON_SLEEPER: Note[] = [tone('sawtooth', 100, 0.07, 0.08, 0.4, 0, 75), tone('sine', 200, 0.1, 0.01, 0.07, 0.3, 120)]
/** The fire's dial: one click a notch, higher for a bigger fire. */
export function dialClick(setting: number): Note[] {
  return [tone('square', semis(1500, setting * 2), 0.05, 0.002, 0.03), tone('triangle', semis(196, setting * 4), 0.12, 0.004, 0.14)]
}
/** The night: the cursor pushed off, the owl at every hour, a light going out, a pin dropping, and dawn. */
export const NIGHT_BEGINS: Note[] = [tone('sine', 110, 0.14, 0.05, 0.4, 0, 165), hiss(1800, 1, 0.05, 0.05, 0.3, 0.1)]
export const HOOT: Note[] = [tone('sine', 392, 0.08, 0.04, 0.14, 0, 370), tone('sine', 330, 0.08, 0.04, 0.24, 0.22, 310)]
export const GUTTERS: Note[] = [hiss(900, 1, 0.09, 0.02, 0.3, 0, 300), tone('sine', 220, 0.06, 0.02, 0.2, 0, 110)]
export const PIN_DROPS: Note[] = [tone('sine', 1320, 0.07, 0.002, 0.05), tone('triangle', 196, 0.14, 0.003, 0.1, 0.03)]
export const DAWN: Note[] = [tone('sine', 1568, 0.07, 0.01, 0.07, 0, 1976), tone('sine', 1760, 0.07, 0.01, 0.07, 0.14, 2217), tone('sine', 1568, 0.06, 0.01, 0.09, 0.4, 2093)]
export const CURSOR_TAKEN: Note[] = [tone('sine', 880, 0.06, 0.003, 0.05), hiss(1200, 5, 0.04, 0.004, 0.04)]
/** The ruler unfolding a section and folding it back; the fold of the map pulled, and the camp packed up. */
export const UNFOLDS: Note[] = [tone('triangle', 330, 0.12, 0.003, 0.08), tone('triangle', 440, 0.12, 0.003, 0.1, 0.09)]
export const FOLDS_BACK: Note[] = [tone('triangle', 440, 0.1, 0.003, 0.08), tone('triangle', 330, 0.12, 0.003, 0.1, 0.09)]
export const CORNER_RUSTLE: Note[] = [hiss(2400, 0.8, 0.06, 0.02, 0.12, 0, 1500)]
export const PACKS_UP: Note[] = [hiss(1600, 0.7, 0.1, 0.06, 0.5, 0, 700), hiss(2600, 0.8, 0.06, 0.05, 0.4, 0.3, 1200), tone('triangle', 147, 0.1, 0.01, 0.2, 0.75, 196)]
/** The sled: a piece that does not fit slides off its tail; the straps of a given load twang. */
export const SLIDES_OFF: Note[] = [hiss(1100, 2, 0.08, 0.03, 0.2, 0, 500), tone('triangle', 233, 0.1, 0.003, 0.07, 0.24)]
export const STRAP_TWANG: Note[] = [tone('sawtooth', 123, 0.09, 0.003, 0.3, 0, 117), tone('triangle', 246, 0.05, 0.003, 0.2)]
/** The kettle's round: a mug poured hot, a mug poured cold, and an empty one turned over. */
export const MUG: Note[] = [tone('sine', 988, 0.08, 0.003, 0.1), tone('sine', 330, 0.05, 0.02, 0.1, 0.04, 440)]
export const COLD_MUG: Note[] = [tone('sine', 740, 0.07, 0.003, 0.06), tone('sine', 196, 0.05, 0.02, 0.12, 0.05, 165)]
export const EMPTY_MUG: Note[] = [tone('triangle', 520, 0.08, 0.003, 0.06), hiss(3200, 5, 0.04, 0.01, 0.04, 0.2), hiss(3500, 5, 0.04, 0.01, 0.04, 0.28)]
export const RACCOON: Note[] = [tone('square', 900, 0.04, 0.005, 0.04, 0, 1200), tone('square', 1000, 0.04, 0.005, 0.04, 0.07, 800), tone('square', 950, 0.04, 0.005, 0.04, 0.14, 1250)]
/** A thing let go where it has no use hops back to where it came from. */
export const HOPS_BACK: Note[] = [tone('sine', 330, 0.08, 0.005, 0.1, 0, 520)]
/** A camper waking: rested, one easy rising note; frazzled, a small sliding groan. */
export const WAKES_RESTED: Note[] = [tone('sine', 440, 0.07, 0.04, 0.2, 0, 587)]
export const WAKES_FRAZZLED: Note[] = [tone('sawtooth', 196, 0.05, 0.05, 0.3, 0, 139)]

/** Every fixed voice by name, for the checks. The numbered ones are checked over their whole run. */
export const FIXED: Readonly<Record<string, readonly Note[]>> = {
  gurgle: GURGLE, 'flask-tap': FLASK_TAP, slosh: SLOSH, 'can-tap': CAN_TAP, 'rattle-logs': RATTLE.logs, 'rattle-oil': RATTLE.oil, 'rattle-water': RATTLE.water,
  'settle-logs': SETTLE.logs, 'settle-oil': SETTLE.oil, 'settle-water': SETTLE.water, tumble: TUMBLE, 'mule-sits': MULE_SITS,
  'poked-reader': POKED.reader, 'poked-sleeper': POKED.sleeper, 'poked-cook': POKED.cook, 'poked-scout': POKED.scout, 'poked-small': POKED.small,
  'dog-yip': DOG_YIP, 'dog-sniff': DOG_SNIFF, 'frog-hop': FROG_HOP, 'mule-bray': MULE_BRAY, 'kettle-lid': KETTLE_LID, 'fire-stones': FIRE_STONES, 'compass-spin': COMPASS_SPIN,
  'tent-cook': TENT_TWANG.cook, 'tent-reader': TENT_TWANG.reader, 'tent-sleeper': TENT_TWANG.sleeper, 'tent-small': TENT_TWANG.small, 'tent-scout': TENT_TWANG.scout,
  'log-on-fire': LOG_ON_FIRE, 'log-flare': LOG_FLARE, 'log-on-lantern': LOG_ON_LANTERN, 'log-on-reader': LOG_ON_CAMPER.reader, 'log-on-sleeper': LOG_ON_CAMPER.sleeper, 'log-on-cook': LOG_ON_CAMPER.cook,
  'log-on-scout': LOG_ON_CAMPER.scout, 'log-on-small': LOG_ON_CAMPER.small, 'flask-on-fire': FLASK_ON_FIRE, 'flask-on-lantern': FLASK_ON_LANTERN, 'flask-on-camper': FLASK_ON_CAMPER,
  'can-on-fire': CAN_ON_FIRE, 'can-steam': CAN_STEAM, 'can-on-lantern': CAN_ON_LANTERN, 'can-on-camper': CAN_ON_CAMPER, 'lantern-squeak': LANTERN_SQUEAK, 'lantern-set': LANTERN_SET,
  'lantern-on-fire': LANTERN_ON_FIRE, 'lantern-on-lantern': LANTERN_ON_LANTERN, 'lantern-on-camper': LANTERN_ON_CAMPER, 'lantern-on-reader': LANTERN_ON_READER, 'lantern-on-sleeper': LANTERN_ON_SLEEPER, 'wick-click': WICK_CLICK, 'card-stamp': CARD_STAMP, 'card-flip': CARD_FLIP,
  'rub-out': RUB_OUT, 'card-on-fire': CARD_ON_FIRE, 'card-on-lantern': CARD_ON_LANTERN, 'card-on-camper': CARD_ON_CAMPER, 'marsh-laid': MARSH_LAID, 'tin-pop': TIN_POP, 'marsh-on-fire': MARSH_ON_FIRE,
  'marsh-on-lantern': MARSH_ON_LANTERN, 'marsh-on-camper': MARSH_ON_CAMPER, 'marsh-on-sleeper': MARSH_ON_SLEEPER, 'dial-0': dialClick(0), 'dial-1': dialClick(1), 'dial-2': dialClick(2), 'dial-3': dialClick(3),
  'night-begins': NIGHT_BEGINS, hoot: HOOT, gutters: GUTTERS, 'pin-drops': PIN_DROPS, dawn: DAWN, 'cursor-taken': CURSOR_TAKEN, unfolds: UNFOLDS, 'folds-back': FOLDS_BACK, 'corner-rustle': CORNER_RUSTLE,
  'packs-up': PACKS_UP, 'slides-off': SLIDES_OFF, 'strap-twang': STRAP_TWANG, mug: MUG, 'cold-mug': COLD_MUG, 'empty-mug': EMPTY_MUG, raccoon: RACCOON, 'hops-back': HOPS_BACK,
  'wakes-rested': WAKES_RESTED, 'wakes-frazzled': WAKES_FRAZZLED,
}
