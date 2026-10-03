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

/** Every fixed voice by name, for the checks. The numbered ones are checked over their whole run. */
export const FIXED: Readonly<Record<string, readonly Note[]>> = {
  gurgle: GURGLE, 'flask-tap': FLASK_TAP, slosh: SLOSH, 'can-tap': CAN_TAP, 'rattle-logs': RATTLE.logs, 'rattle-oil': RATTLE.oil, 'rattle-water': RATTLE.water,
  'settle-logs': SETTLE.logs, 'settle-oil': SETTLE.oil, 'settle-water': SETTLE.water, tumble: TUMBLE, 'mule-sits': MULE_SITS,
  'poked-reader': POKED.reader, 'poked-sleeper': POKED.sleeper, 'poked-cook': POKED.cook, 'poked-scout': POKED.scout, 'poked-small': POKED.small,
  'dog-yip': DOG_YIP, 'dog-sniff': DOG_SNIFF, 'frog-hop': FROG_HOP, 'mule-bray': MULE_BRAY, 'kettle-lid': KETTLE_LID, 'fire-stones': FIRE_STONES, 'compass-spin': COMPASS_SPIN,
  'tent-cook': TENT_TWANG.cook, 'tent-reader': TENT_TWANG.reader, 'tent-sleeper': TENT_TWANG.sleeper, 'tent-small': TENT_TWANG.small, 'tent-scout': TENT_TWANG.scout,
}
