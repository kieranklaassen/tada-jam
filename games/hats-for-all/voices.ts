import type { CreatureKind, HatKind } from './kinds'

// Every sound of the game as plain numbers, so the sounds can be held to
// stated ranges by a test on a machine that cannot hear. A voice is a few
// partials; each is a tone or a band of noise with a pitch that may glide, a
// peak, an attack and a length. The Mount turns them into Web Audio with the
// template's `tone` and `noise`.

export type Partial = {
  kind: 'tone' | 'noise'
  /** Seconds after the voice starts. */
  at: number
  /** Hz: the pitch of a tone, or the middle of a band of noise. */
  frequency: number
  /** Hz the pitch glides to by the end, if it moves. */
  glideTo?: number
  /** The oscillator of a tone. */
  wave?: 'sine' | 'triangle'
  /** How narrow a band of noise is. */
  q?: number
  /** The loudest it gets, as gain. */
  peak: number
  /** Seconds to reach the peak. */
  attack: number
  /** Seconds to die away after it. */
  decay: number
}

/** The ranges every voice is held to (voices.test.ts). */
export const RANGE = {
  frequency: [70, 3200],
  /** One partial is never louder than this, and the partials sounding at once never add up to more than `sum`. */
  peak: 0.2,
  sum: 0.3,
  attack: [0.002, 0.08],
  /** No voice is longer than this, start to silence. */
  length: 0.9,
} as const

const tone = (at: number, frequency: number, glideTo: number, peak: number, attack: number, decay: number, wave: 'sine' | 'triangle' = 'sine'): Partial => ({ kind: 'tone', at, frequency, glideTo, wave, peak, attack, decay })
const noise = (at: number, frequency: number, glideTo: number, q: number, peak: number, attack: number, decay: number): Partial => ({ kind: 'noise', at, frequency, glideTo, q, peak, attack, decay })

/** Each kind of hat sounds its own size: the small dome highest, the tall cone lowest. */
const HAT_PITCH: Record<HatKind, number> = { cone: 0.84, brim: 1, dome: 1.19 }

/** The same thing never sounds twice the same: a small step up or down by turns, from a count the caller keeps. */
export function vary(count: number): number {
  return [1, 1.06, 0.95, 1.12, 0.9][((count % 5) + 5) % 5]
}

/** The foam gives under the finger: answered when the finger lands. */
export function creak(count: number): Partial[] {
  const v = vary(count)
  return [noise(0, 340 * v, 210 * v, 3, 0.1, 0.004, 0.09), tone(0, 190 * v, 140 * v, 0.07, 0.004, 0.07)]
}

/** A hat pops out of its hole. */
export function pok(hat: HatKind, count: number): Partial[] {
  const p = HAT_PITCH[hat] * vary(count)
  return [tone(0, 430 * p, 900 * p, 0.17, 0.003, 0.08), noise(0, 1900, 1900, 2, 0.06, 0.002, 0.03), tone(0.05, 700 * p, 1150 * p, 0.05, 0.03, 0.2, 'triangle')]
}

/** A hat lifts off a head. */
export function pip(hat: HatKind, count: number): Partial[] {
  const p = HAT_PITCH[hat] * vary(count)
  return [tone(0, 760 * p, 1240 * p, 0.12, 0.003, 0.07), tone(0.04, 980 * p, 620 * p, 0.05, 0.02, 0.18, 'triangle')]
}

/** A hat lands on a head. */
export function bap(hat: HatKind, count: number): Partial[] {
  const p = HAT_PITCH[hat] * vary(count)
  return [tone(0, 340 * p, 190 * p, 0.17, 0.003, 0.14), noise(0, 620, 380, 1, 0.07, 0.003, 0.06)]
}

/** A hat is pressed home into its hole. */
export function fwump(hat: HatKind, count: number): Partial[] {
  const p = HAT_PITCH[hat] * vary(count)
  return [noise(0, 250 * p, 120 * p, 1.2, 0.15, 0.006, 0.2), tone(0, 160 * p, 100 * p, 0.12, 0.005, 0.16)]
}

/** A hat lands on the floor with nobody under it: a plop and a small bounce after it. */
export function plop(hat: HatKind, count: number): Partial[] {
  const p = HAT_PITCH[hat] * vary(count)
  return [tone(0, 270 * p, 150 * p, 0.14, 0.003, 0.12), tone(0.13, 320 * p, 210 * p, 0.07, 0.003, 0.08)]
}

/** The foam floor dimples under a finger. */
export function squeak(count: number): Partial[] {
  const v = vary(count)
  return [tone(0, 880 * v, 1480 * v, 0.07, 0.006, 0.1), noise(0, 420, 300, 2, 0.05, 0.004, 0.08)]
}

/** One step of a loose hat scuttling. */
export function scuttle(count: number): Partial[] {
  return [noise(0, 2300 * vary(count), 1700, 6, 0.035, 0.002, 0.035)]
}

/** A hat skids across the foam to a round spot: a long rubbery squeal that sinks as it slows. */
export function squeal(count: number): Partial[] {
  const v = vary(count)
  return [tone(0, 1250 * v, 520 * v, 0.07, 0.02, 0.34, 'triangle'), noise(0, 900, 500, 4, 0.04, 0.01, 0.3)]
}

/** A hat spins like a coin as it settles: a whirr in beats that come quicker and quicker. */
export function whirr(count: number): Partial[] {
  const v = vary(count), beats: Partial[] = []
  let at = 0
  for (let beat = 0; beat < 7; beat++) {
    beats.push(tone(at, (420 + beat * 60) * v, (520 + beat * 60) * v, 0.06, 0.004, 0.05, 'triangle'))
    at += 0.11 * 0.78 ** beat
  }
  return beats
}

/** A tower of three topples: a whistle that falls. */
export function whistle(count: number): Partial[] {
  const v = vary(count)
  return [tone(0, 1700 * v, 380 * v, 0.1, 0.01, 0.5)]
}

/** The arch, tapped. */
export function hoot(count: number): Partial[] {
  const v = vary(count)
  return [tone(0, 228 * v, 168 * v, 0.13, 0.02, 0.36, 'triangle'), tone(0.02, 456 * v, 340 * v, 0.04, 0.02, 0.2)]
}

/** What a creature's babble means, heard in its tune and never in a word. */
export type Mood = 'glad' | 'grump' | 'ask' | 'plain'

/** Each creature's own voice: where its pitch sits, how many syllables it says, how long each is, and its wave. */
const VOICE: Record<CreatureKind, { pitch: number; syllables: number; each: number; wave: 'sine' | 'triangle' }> = {
  bop: { pitch: 620, syllables: 3, each: 0.09, wave: 'sine' },
  lanky: { pitch: 215, syllables: 2, each: 0.2, wave: 'triangle' },
  flop: { pitch: 350, syllables: 2, each: 0.15, wave: 'sine' },
  wig: { pitch: 132, syllables: 1, each: 0.42, wave: 'triangle' },
  pip: { pitch: 1040, syllables: 4, each: 0.06, wave: 'sine' },
}

/** How each mood moves the pitch from one syllable to the next, and inside the last one. */
const TUNE: Record<Mood, { step: number; last: number }> = {
  glad: { step: 1.16, last: 1.2 },
  grump: { step: 0.9, last: 0.74 },
  ask: { step: 1.0, last: 1.42 },
  plain: { step: 1.05, last: 0.94 },
}

/** A creature's babble: invented syllables with a clear tune and no word in them. */
export function babble(creature: CreatureKind, mood: Mood, count: number): Partial[] {
  const voice = VOICE[creature], tune = TUNE[mood], v = vary(count), partials: Partial[] = []
  let pitch = voice.pitch * v
  for (let syllable = 0; syllable < voice.syllables; syllable++) {
    const last = syllable === voice.syllables - 1
    partials.push(tone(syllable * voice.each * 1.15, pitch, pitch * (last ? tune.last : 1.04), 0.13, 0.012, voice.each, voice.wave))
    pitch *= tune.step
  }
  return partials
}

/** When a voice has died away, in seconds from its start. */
export function voiceLength(partials: readonly Partial[]): number {
  return partials.reduce((end, partial) => Math.max(end, partial.at + partial.attack + partial.decay), 0)
}
