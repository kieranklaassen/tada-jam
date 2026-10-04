import type { Customer } from './customers'
import { MANNERS } from './manner'
import type { Kind } from './kinds'

// Every sound of the game as plain numbers: pitch, peak, attack and length
// for each part of a voice. Nothing here touches Web Audio, so a test can
// hold each voice inside a stated range on a machine that cannot hear
// (voices.test.ts). sounds.ts turns a voice into nodes.

export type Part = {
  /** An oscillator shape, or a band of noise. */
  wave: 'sine' | 'triangle' | 'square' | 'sawtooth' | 'noise'
  /** Hz: the pitch, or the middle of the noise band. */
  freq: number
  /** 0 to 1 gain at the top of the envelope. */
  peak: number
  /** Seconds up to the peak, and seconds down from it. */
  attack: number
  decay: number
  /** Hz the pitch slides to over the whole part. */
  glideTo?: number
  /** For noise: how narrow the band is. */
  q?: number
  /** Seconds after the voice starts. */
  delay?: number
}

export type VoiceSpec = readonly Part[]

/** What every voice is held to. */
export const LIMITS = { minFreq: 60, maxFreq: 4200, maxPeak: 0.2, minAttack: 0.002, maxSeconds: 1.2 } as const

/** How long a voice sounds, in seconds. */
export function seconds(spec: VoiceSpec): number {
  return spec.reduce((end, p) => Math.max(end, (p.delay ?? 0) + p.attack + p.decay), 0)
}

/** The steps the count climbs: a major scale from middle C, one step for every piece on the pizza, whatever its kind. */
const SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19] as const
const MIDDLE_C = 261.63

/** The pitch of the `count`th piece on the pizza: one step higher for every piece, and the same for every kind. */
export function stepFreq(count: number): number {
  const i = Math.max(0, Math.min(SCALE.length - 1, Math.round(count) - 1))
  return MIDDLE_C * 2 ** (SCALE[i] / 12)
}

/** Touch-down on a tub or a piece: a small pop as the piece comes up. */
export const pop: VoiceSpec = [{ wave: 'sine', freq: 420, peak: 0.13, attack: 0.003, decay: 0.07, glideTo: 780 }]

/** How each kind lands: the same climbing note, in the kind's own voice, with the kind's own knock under it. */
export function plop(kind: Kind, count: number): VoiceSpec {
  const f = stepFreq(count)
  switch (kind) {
    case 'pepper':
      return [{ wave: 'triangle', freq: f, peak: 0.17, attack: 0.003, decay: 0.16 }, { wave: 'noise', freq: 3000, q: 4, peak: 0.07, attack: 0.002, decay: 0.03 }]
    case 'mushroom':
      return [{ wave: 'sine', freq: f, peak: 0.17, attack: 0.006, decay: 0.22, glideTo: f * 0.94 }, { wave: 'sine', freq: 110, peak: 0.14, attack: 0.003, decay: 0.09, glideTo: 80 }]
    case 'olive':
      return [{ wave: 'sine', freq: f, peak: 0.16, attack: 0.003, decay: 0.14 }, { wave: 'sine', freq: f * 2, peak: 0.1, attack: 0.002, decay: 0.05, glideTo: f }]
    case 'cheese':
      return [{ wave: 'triangle', freq: f, peak: 0.16, attack: 0.004, decay: 0.2 }, { wave: 'noise', freq: 900, q: 1, peak: 0.11, attack: 0.002, decay: 0.07 }]
    case 'sock':
      return [{ wave: 'sine', freq: f, peak: 0.15, attack: 0.008, decay: 0.24 }, { wave: 'noise', freq: 300, q: 0.8, peak: 0.13, attack: 0.004, decay: 0.13 }]
    case 'worm':
      return [{ wave: 'square', freq: f * 0.8, peak: 0.07, attack: 0.004, decay: 0.2, glideTo: f }, { wave: 'sine', freq: f, peak: 0.1, attack: 0.02, decay: 0.2, delay: 0.03 }]
  }
}

/** A piece taken off: the note it landed on, falling to the one below. `count` is how many pieces are left on the pizza. */
export function pip(_kind: Kind, count: number): VoiceSpec {
  return [{ wave: 'triangle', freq: stepFreq(count + 1), peak: 0.13, attack: 0.003, decay: 0.12, glideTo: count > 0 ? stepFreq(count) : stepFreq(1) * 0.84 }]
}

/** A piece back in its tub. */
export const home: VoiceSpec = [{ wave: 'sine', freq: 230, peak: 0.09, attack: 0.003, decay: 0.08, glideTo: 160 }, { wave: 'noise', freq: 1400, q: 2, peak: 0.04, attack: 0.002, decay: 0.04 }]

/** A piece let go off the pizza touching the table: a small dull tap. */
export const tap: VoiceSpec = [{ wave: 'sine', freq: 190, peak: 0.11, attack: 0.003, decay: 0.06, glideTo: 120 }, { wave: 'noise', freq: 900, q: 2, peak: 0.05, attack: 0.002, decay: 0.03 }]

/** A piece bouncing off a full pizza. */
export const boing: VoiceSpec = [{ wave: 'sine', freq: 180, peak: 0.16, attack: 0.004, decay: 0.3, glideTo: 520 }, { wave: 'triangle', freq: 360, peak: 0.06, attack: 0.004, decay: 0.2, glideTo: 880, delay: 0.04 }]

/** The pizza tapped: a wobble, low and round. */
export const jiggle: VoiceSpec = [
  { wave: 'sine', freq: 150, peak: 0.13, attack: 0.005, decay: 0.1, glideTo: 190 },
  { wave: 'sine', freq: 190, peak: 0.1, attack: 0.005, decay: 0.1, glideTo: 150, delay: 0.09 },
  { wave: 'sine', freq: 150, peak: 0.07, attack: 0.005, decay: 0.12, glideTo: 180, delay: 0.18 },
]

/** The oven poked while it has nothing to do: a hollow knock. */
export const knock: VoiceSpec = [{ wave: 'sine', freq: 120, peak: 0.16, attack: 0.003, decay: 0.12, glideTo: 90 }, { wave: 'noise', freq: 500, q: 3, peak: 0.07, attack: 0.002, decay: 0.05 }]

/**
 * A customer's babble: a few notes on its own pitch with clear intonation and
 * no words. `shape` is the tune: rising asks, falling grumbles, a hop is glee.
 */
export function babble(voiceHz: number, shape: 'ask' | 'glee' | 'grumble' | 'giggle'): VoiceSpec {
  const tunes = { ask: [1, 1.12, 1.34], glee: [1.2, 1.5, 1.2, 1.6], grumble: [1, 0.86, 0.75], giggle: [1.5, 1.34, 1.5, 1.34, 1.6] } as const
  const each = shape === 'giggle' ? 0.07 : 0.11
  return tunes[shape].map((k, i) => ({ wave: i % 2 === 0 ? ('triangle' as const) : ('sine' as const), freq: voiceHz * k, peak: 0.13, attack: 0.012, decay: each, glideTo: voiceHz * k * (shape === 'grumble' ? 0.92 : 1.06), delay: i * each }))
}

// --- The game's own voices: the job, the tasting and the eating ----------------

/** A drawn piece appearing on the card: a dry tick on the step it counts. */
export function tickOn(count: number): VoiceSpec {
  return [{ wave: 'triangle', freq: stepFreq(count) * 2, peak: 0.09, attack: 0.002, decay: 0.05 }]
}

/** The roll opening into a card. */
export const unroll: VoiceSpec = [{ wave: 'noise', freq: 1800, q: 1.2, peak: 0.1, attack: 0.01, decay: 0.22, glideTo: 3200 }]

/** Something sliding over the worktop: the pizza, a base, the tubs. */
export const slide: VoiceSpec = [{ wave: 'noise', freq: 500, q: 0.9, peak: 0.1, attack: 0.03, decay: 0.3, glideTo: 900 }]

/** The oven's door. */
export const door: VoiceSpec = [{ wave: 'sine', freq: 140, peak: 0.16, attack: 0.004, decay: 0.14, glideTo: 100 }, { wave: 'noise', freq: 700, q: 2, peak: 0.08, attack: 0.003, decay: 0.07, delay: 0.02 }]

/** How each kind bakes. */
export function bake(kind: Kind): VoiceSpec {
  switch (kind) {
    case 'pepper':
      return [{ wave: 'noise', freq: 3600, q: 1.4, peak: 0.1, attack: 0.02, decay: 0.5, glideTo: 2400 }]
    case 'mushroom':
      return [{ wave: 'sine', freq: 900, peak: 0.1, attack: 0.02, decay: 0.16, glideTo: 1500 }]
    case 'olive':
      return [{ wave: 'sine', freq: 320, peak: 0.16, attack: 0.002, decay: 0.05, glideTo: 180 }]
    case 'cheese':
      return [0, 0.11, 0.2, 0.33].map((delay, i) => ({ wave: 'sine' as const, freq: 150 + i * 28, peak: 0.12, attack: 0.01, decay: 0.07, glideTo: 240 + i * 30, delay }))
    case 'sock':
      return [{ wave: 'sine', freq: 1300, peak: 0.08, attack: 0.06, decay: 0.36, glideTo: 1900 }, { wave: 'noise', freq: 2600, q: 6, peak: 0.05, attack: 0.05, decay: 0.3 }]
    case 'worm':
      return [{ wave: 'sawtooth', freq: 300, peak: 0.07, attack: 0.004, decay: 0.16, glideTo: 1400 }]
  }
}

/** The lick. */
export const lick: VoiceSpec = [{ wave: 'noise', freq: 700, q: 2.5, peak: 0.13, attack: 0.05, decay: 0.34, glideTo: 2200 }, { wave: 'sine', freq: 260, peak: 0.08, attack: 0.04, decay: 0.3, glideTo: 520 }]

/** One piece too many, by kind. `big` is the one big version for more than three. */
export function tooMany(kind: Kind, big: boolean): VoiceSpec {
  const long = big ? 0.7 : 0.26
  switch (kind) {
    case 'pepper':
      // A puff of flame, with a whoomph: a low thump under the rush of it.
      return [{ wave: 'noise', freq: 900, q: 0.7, peak: 0.16, attack: 0.02, decay: long, glideTo: 2600 }, { wave: 'sawtooth', freq: 110, peak: 0.07, attack: 0.02, decay: long, glideTo: 180 }, { wave: 'sine', freq: 150, peak: 0.18, attack: 0.012, decay: 0.16, glideTo: 68 }]
    case 'mushroom':
      return [{ wave: 'sine', freq: 330, peak: 0.17, attack: 0.004, decay: 0.09, glideTo: 880 }, ...(big ? [0.18, 0.36, 0.54].map((delay) => ({ wave: 'sine' as const, freq: 330, peak: 0.15, attack: 0.004, decay: 0.09, glideTo: 880, delay })) : [])]
    case 'olive':
      // The eye rolls right round, with a rattle like a marble in a cup.
      return [
        { wave: 'sine', freq: 500, peak: 0.1, attack: 0.03, decay: long, glideTo: 1100 },
        ...[0, 1, 2, 3, 4, 5, 6, 7].slice(0, big ? 8 : 4).map((i) => ({ wave: 'triangle' as const, freq: i % 2 ? 1500 : 1750, peak: 0.1, attack: 0.002, decay: 0.03, delay: 0.03 + i * (big ? 0.085 : 0.06) })),
      ]
    case 'cheese':
      return [{ wave: 'triangle', freq: 190, peak: 0.16, attack: 0.003, decay: long + 0.12, glideTo: 380 }, { wave: 'triangle', freq: 760, peak: 0.07, attack: 0.003, decay: 0.12, delay: long * 0.6 }]
    case 'sock':
      // A stink cloud, with a parp.
      return [{ wave: 'sawtooth', freq: 150, peak: 0.14, attack: 0.01, decay: big ? 0.4 : 0.16, glideTo: 104 }, { wave: 'noise', freq: 240, q: 1.5, peak: 0.1, attack: 0.03, decay: long }]
    case 'worm':
      return [0, 1, 2, 3].slice(0, big ? 4 : 2).map((i) => ({ wave: 'sine' as const, freq: 520 - i * 60, peak: 0.12, attack: 0.02, decay: 0.1, glideTo: 700 - i * 60, delay: i * 0.12 }))
  }
}

/** How each kind's rumble ends: a dry pant, a snuffle, a hollow hoot, a dull thrum, a chatter of teeth, a smack of the lips. `at` is when, in seconds. */
function rumbleEnd(kind: Kind, at: number): Part[] {
  switch (kind) {
    case 'pepper':
      return [{ wave: 'noise', freq: 1900, q: 0.9, peak: 0.11, attack: 0.03, decay: 0.13, delay: at }]
    case 'mushroom':
      return [0, 0.07].map((d) => ({ wave: 'noise' as const, freq: 620, q: 3, peak: 0.12, attack: 0.008, decay: 0.045, delay: at + d }))
    case 'olive':
      return [{ wave: 'sine', freq: 300, peak: 0.14, attack: 0.02, decay: 0.16, glideTo: 255, delay: at }]
    case 'cheese':
      return [{ wave: 'triangle', freq: 112, peak: 0.16, attack: 0.004, decay: 0.2, glideTo: 104, delay: at }]
    case 'sock':
      return [0, 0.04, 0.08, 0.12].map((d) => ({ wave: 'noise' as const, freq: 3000, q: 5, peak: 0.1, attack: 0.002, decay: 0.018, delay: at + d }))
    case 'worm':
      return [{ wave: 'noise', freq: 1500, q: 2, peak: 0.13, attack: 0.002, decay: 0.03, delay: at }, { wave: 'sine', freq: 520, peak: 0.1, attack: 0.003, decay: 0.05, glideTo: 250, delay: at + 0.01 }]
  }
}

/** One piece too few: the tummy rumbles, lower for a bigger customer, and each kind's rumble ends in its own sound. */
export function rumble(kind: Kind, voiceHz: number, big: boolean): VoiceSpec {
  const base = Math.max(LIMITS.minFreq + 12, voiceHz * 0.36)
  const n = big ? 5 : 3
  const beat = Math.min({ pepper: 0.07, mushroom: 0.1, olive: 0.13, cheese: 0.16, sock: 0.19, worm: 0.05 }[kind], 0.7 / n)
  const rolls: Part[] = Array.from({ length: n }, (_, i) => ({ wave: 'sawtooth' as const, freq: base * (1 + (i % 2) * 0.18), peak: 0.11, attack: 0.015, decay: beat, glideTo: Math.max(LIMITS.minFreq + 1, base * 0.86), delay: i * beat }))
  return [...rolls, ...rumbleEnd(kind, n * beat + 0.02)]
}

/** A pat on the card. */
export const pat: VoiceSpec = [{ wave: 'noise', freq: 1200, q: 1.5, peak: 0.1, attack: 0.002, decay: 0.04 }, { wave: 'sine', freq: 200, peak: 0.1, attack: 0.002, decay: 0.05 }]

/** Raw dough on the tongue: it stretches, and snaps back. */
export const stretch: VoiceSpec = [{ wave: 'sine', freq: 220, peak: 0.13, attack: 0.08, decay: 0.9, glideTo: 880 }]
export const snap: VoiceSpec = [{ wave: 'noise', freq: 2400, q: 1.2, peak: 0.16, attack: 0.002, decay: 0.05 }, { wave: 'sine', freq: 700, peak: 0.12, attack: 0.002, decay: 0.08, glideTo: 160 }]

/** What each kind adds to a bite, `at` seconds into it: a snap, a squeak, a tok, a squelch, a flump, a twang. */
function crunch(kind: Kind, at: number): Part {
  switch (kind) {
    case 'pepper':
      return { wave: 'noise', freq: 3400, q: 4, peak: 0.12, attack: 0.002, decay: 0.04, delay: at }
    case 'mushroom':
      return { wave: 'sine', freq: 900, peak: 0.08, attack: 0.01, decay: 0.07, glideTo: 1300, delay: at }
    case 'olive':
      return { wave: 'sine', freq: 640, peak: 0.12, attack: 0.003, decay: 0.05, glideTo: 320, delay: at }
    case 'cheese':
      return { wave: 'noise', freq: 520, q: 1, peak: 0.11, attack: 0.02, decay: 0.09, glideTo: 900, delay: at }
    case 'sock':
      return { wave: 'noise', freq: 260, q: 0.8, peak: 0.13, attack: 0.006, decay: 0.11, delay: at }
    case 'worm':
      return { wave: 'square', freq: 240, peak: 0.06, attack: 0.004, decay: 0.1, glideTo: 520, delay: at }
  }
}

/** A bite: the crust, and the crunch of the kinds that were on it, one after another. */
export function bite(n: number, kinds: readonly Kind[] = []): VoiceSpec {
  return [...kinds.slice(0, 3).map((kind, i) => crunch(kind, 0.04 + i * 0.06)), { wave: 'noise', freq: 1500 + n * 300, q: 0.8, peak: 0.17, attack: 0.003, decay: 0.09 }, { wave: 'noise', freq: 700, q: 1.2, peak: 0.12, attack: 0.003, decay: 0.07, delay: 0.1 }, { wave: 'sine', freq: 130, peak: 0.12, attack: 0.004, decay: 0.08, glideTo: 90 }]
}

/** The burp after a whole pizza, on the customer's own pitch. */
export function burp(voiceHz: number): VoiceSpec {
  const f = Math.max(LIMITS.minFreq + 10, voiceHz * 0.5)
  return [{ wave: 'sawtooth', freq: f * 1.3, peak: 0.13, attack: 0.02, decay: 0.38, glideTo: Math.max(LIMITS.minFreq + 2, f * 0.7) }, { wave: 'noise', freq: 260, q: 1, peak: 0.07, attack: 0.02, decay: 0.3 }]
}

/**
 * How much longer or shorter a reaction's sound is in its owner's manner, as a factor: stretched, the longest part
 * still ends inside the longest a voice may last. A scene that shows what the sound tells of takes this factor for
 * its own length, so the two stay together.
 */
export function mannerLength(spec: VoiceSpec, who: Customer): number {
  return Math.min(MANNERS[who].length, LIMITS.maxSeconds / Math.max(0.01, seconds(spec)))
}

/**
 * A reaction's sound in its owner's manner: higher and shorter for the quick
 * ones, lower and longer for the slow ones, and never outside what a voice
 * may be.
 */
export function inManner(spec: VoiceSpec, who: Customer): VoiceSpec {
  const m = MANNERS[who]
  const pitch = (hz: number): number => Math.min(LIMITS.maxFreq, Math.max(LIMITS.minFreq, hz * m.pitch))
  const length = mannerLength(spec, who)
  return spec.map((p) => {
    const part: Part = { ...p, freq: pitch(p.freq), decay: p.decay * length }
    if (p.glideTo !== undefined) part.glideTo = pitch(p.glideTo)
    if (p.delay !== undefined) part.delay = p.delay * length
    return part
  })
}

/** The small answer of each thing in the street when it is touched: the sun rings, a cloud puffs, the bird cheeps, the tree rustles, the house is knocked at. */
export function streetVoice(what: 'sun' | 'tree' | 'house' | 'cloud' | 'bird'): VoiceSpec {
  switch (what) {
    case 'sun':
      return [{ wave: 'sine', freq: 880, peak: 0.1, attack: 0.005, decay: 0.3 }, { wave: 'sine', freq: 1320, peak: 0.07, attack: 0.005, decay: 0.34, delay: 0.07 }]
    case 'cloud':
      return [{ wave: 'noise', freq: 520, q: 0.8, peak: 0.09, attack: 0.03, decay: 0.22 }, { wave: 'sine', freq: 300, peak: 0.05, attack: 0.02, decay: 0.16, glideTo: 220 }]
    case 'bird':
      return [{ wave: 'sine', freq: 2400, peak: 0.1, attack: 0.004, decay: 0.06, glideTo: 3100 }, { wave: 'sine', freq: 2700, peak: 0.1, attack: 0.004, decay: 0.07, glideTo: 3400, delay: 0.11 }]
    case 'tree':
      return [{ wave: 'noise', freq: 2600, q: 1.5, peak: 0.08, attack: 0.02, decay: 0.26, glideTo: 1700 }, { wave: 'noise', freq: 3400, q: 2, peak: 0.05, attack: 0.02, decay: 0.2, delay: 0.09 }]
    case 'house':
      return [{ wave: 'sine', freq: 190, peak: 0.13, attack: 0.003, decay: 0.07, glideTo: 150 }, { wave: 'sine', freq: 190, peak: 0.13, attack: 0.003, decay: 0.07, glideTo: 150, delay: 0.15 }]
  }
}

/** Each customer's own sound for the kind it cannot stand, as it reaches its tongue. */
export function cannotStandVoice(who: Customer): VoiceSpec {
  switch (who) {
    case 'bim':
      // The stalk twists into its knot: two rubbery creaks, the second tighter.
      return [{ wave: 'sawtooth', freq: 300, peak: 0.08, attack: 0.01, decay: 0.16, glideTo: 520 }, { wave: 'sawtooth', freq: 420, peak: 0.08, attack: 0.01, decay: 0.14, glideTo: 760, delay: 0.2 }]
    case 'grum':
      // Steam whistles from both ears, a kettle on the boil.
      return [{ wave: 'sine', freq: 1900, peak: 0.1, attack: 0.06, decay: 0.7, glideTo: 2350 }, { wave: 'sine', freq: 1960, peak: 0.06, attack: 0.06, decay: 0.7, glideTo: 2420 }, { wave: 'noise', freq: 3400, q: 5, peak: 0.06, attack: 0.05, decay: 0.7 }]
    case 'fizz':
      // The neck gives way: a long slide down.
      return [{ wave: 'triangle', freq: 760, peak: 0.13, attack: 0.02, decay: 0.6, glideTo: 170 }]
    case 'mops':
      // Every hair springs up at once.
      return [{ wave: 'sine', freq: 480, peak: 0.13, attack: 0.004, decay: 0.24, glideTo: 1900 }, { wave: 'noise', freq: 3600, q: 5, peak: 0.05, attack: 0.004, decay: 0.12 }]
    case 'ooze':
      // It runs down into a puddle with two wet glubs.
      return [{ wave: 'sine', freq: 190, peak: 0.15, attack: 0.02, decay: 0.3, glideTo: 90 }, { wave: 'sine', freq: 130, peak: 0.13, attack: 0.02, decay: 0.26, glideTo: 70, delay: 0.3 }]
  }
}

/** One step of a customer's walk, on its own pitch. */
export function footstep(voiceHz: number): VoiceSpec {
  return [{ wave: 'sine', freq: Math.max(70, voiceHz * 0.5), peak: 0.1, attack: 0.003, decay: 0.07, glideTo: Math.max(64, voiceHz * 0.36) }]
}

/**
 * A piece taken from the hand, each kind in its own way: a pepper is gulped
 * and a spark pops out of an ear; a mushroom is chewed slowly and one pops up
 * on the head and drops off; an olive goes down whole with a plunk, like a
 * pebble down a well; cheese is pulled into a string and played like a harp;
 * a sock is pulled on with a snap; a worm is slurped and its tail flicks the
 * nose.
 */
export function gulp(kind: Kind): VoiceSpec {
  switch (kind) {
    case 'pepper':
      return [
        { wave: 'sine', freq: 420, peak: 0.15, attack: 0.01, decay: 0.1, glideTo: 200 },
        // The spark out of the ear: a crackle and a bright ping.
        { wave: 'noise', freq: 3600, q: 5, peak: 0.12, attack: 0.002, decay: 0.05, delay: 0.56 },
        { wave: 'sine', freq: 1800, peak: 0.1, attack: 0.002, decay: 0.09, glideTo: 2600, delay: 0.58 },
      ]
    case 'mushroom':
      return [
        // Three slow chews, then the pop on its head and the small thud as it drops off.
        { wave: 'sine', freq: 170, peak: 0.13, attack: 0.02, decay: 0.09, glideTo: 120 },
        { wave: 'sine', freq: 160, peak: 0.12, attack: 0.02, decay: 0.09, glideTo: 115, delay: 0.24 },
        { wave: 'sine', freq: 150, peak: 0.11, attack: 0.02, decay: 0.09, glideTo: 110, delay: 0.48 },
        { wave: 'sine', freq: 520, peak: 0.12, attack: 0.004, decay: 0.07, glideTo: 980, delay: 0.3 },
        { wave: 'sine', freq: 140, peak: 0.1, attack: 0.004, decay: 0.06, glideTo: 90, delay: 0.96 },
      ]
    case 'olive':
      return [
        { wave: 'sine', freq: 340, peak: 0.15, attack: 0.01, decay: 0.12, glideTo: 170 },
        // A drop, and its echo from far below.
        { wave: 'sine', freq: 760, peak: 0.16, attack: 0.003, decay: 0.09, glideTo: 190, delay: 0.3 },
        { wave: 'sine', freq: 380, peak: 0.07, attack: 0.004, decay: 0.16, glideTo: 150, delay: 0.5 },
      ]
    case 'cheese':
      return [
        // The pull into a string, then four plucked notes going up.
        { wave: 'sine', freq: 260, peak: 0.1, attack: 0.05, decay: 0.2, glideTo: 520 },
        { wave: 'triangle', freq: 392, peak: 0.14, attack: 0.003, decay: 0.22, delay: 0.3 },
        { wave: 'triangle', freq: 494, peak: 0.14, attack: 0.003, decay: 0.22, delay: 0.46 },
        { wave: 'triangle', freq: 587, peak: 0.14, attack: 0.003, decay: 0.22, delay: 0.62 },
        { wave: 'triangle', freq: 784, peak: 0.14, attack: 0.003, decay: 0.3, delay: 0.78 },
      ]
    case 'sock':
      return [
        { wave: 'noise', freq: 300, q: 0.8, peak: 0.12, attack: 0.02, decay: 0.2, glideTo: 700 },
        // Pulled on with a snap.
        { wave: 'noise', freq: 2400, q: 1.4, peak: 0.15, attack: 0.002, decay: 0.045, delay: 0.42 },
        { wave: 'sine', freq: 640, peak: 0.1, attack: 0.002, decay: 0.06, glideTo: 180, delay: 0.42 },
      ]
    case 'worm':
      return [
        // A long slurp that climbs, and the flick of the tail on its nose.
        { wave: 'noise', freq: 500, q: 3, peak: 0.14, attack: 0.05, decay: 0.55, glideTo: 2600 },
        { wave: 'sine', freq: 300, peak: 0.08, attack: 0.05, decay: 0.5, glideTo: 900 },
        { wave: 'sine', freq: 1500, peak: 0.12, attack: 0.002, decay: 0.04, glideTo: 900, delay: 0.72 },
      ]
  }
}

/** The base that puffed up in the oven, sinking. */
export const wheeze: VoiceSpec = [{ wave: 'noise', freq: 1600, q: 3, peak: 0.11, attack: 0.05, decay: 0.75, glideTo: 500 }, { wave: 'sine', freq: 600, peak: 0.06, attack: 0.05, decay: 0.7, glideTo: 200 }]

/** The oven handing a baked pizza straight back. */
export const hiccup: VoiceSpec = [{ wave: 'sine', freq: 200, peak: 0.16, attack: 0.004, decay: 0.08, glideTo: 620 }, { wave: 'noise', freq: 900, q: 1, peak: 0.08, attack: 0.01, decay: 0.16, delay: 0.08 }]
