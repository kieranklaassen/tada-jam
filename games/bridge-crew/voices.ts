import { SPEC, type Kind } from './kit'

// Every sound of the game as plain numbers: pitch, peak, attack and length.
// Pure, so a test can hold each voice inside a stated range on a machine that
// cannot hear. The Mount turns a voice into Web Audio with `tone` and `noise`
// of audio.ts; nothing here touches a browser.

export type Sound = {
  /** A pitched tone, or a band of noise round the pitch. */
  wave: 'triangle' | 'sine' | 'square' | 'noise'
  /** In hertz. */
  pitch: number
  /** Where the pitch slides to by the end, when it slides. */
  slideTo?: number
  /** Loudness at its peak, 0 to 1 of full scale. */
  peak: number
  /** Seconds to the peak, and seconds from the peak to silence. */
  attack: number
  length: number
  /** Seconds after the voice starts. */
  after?: number
}

/** A voice is one or a few sounds played together. */
export type VoiceSpec = readonly Sound[]

/** The range every sound stays inside. The lead checks loudness on a real machine; the owner is the first to listen. */
export const RANGE = { pitch: [55, 3200], peak: [0.02, 0.2], attack: [0.001, 0.08], length: [0.03, 1.4], after: [0, 0.6] } as const

const clamp = (value: number, [low, high]: readonly [number, number]) => Math.max(low, Math.min(high, value))

/** Holds every number of a voice inside the range, whatever it was computed from. */
const kept = (voice: readonly Sound[]): VoiceSpec => voice.map((sound) => ({
  ...sound,
  pitch: clamp(sound.pitch, RANGE.pitch),
  ...(sound.slideTo === undefined ? {} : { slideTo: clamp(sound.slideTo, RANGE.pitch) }),
  peak: clamp(sound.peak, RANGE.peak), attack: clamp(sound.attack, RANGE.attack), length: clamp(sound.length, RANGE.length),
}))

/** A longer part sounds lower: each kind has its own pitch at one cell, falling as the part gets longer. */
const BASE: Readonly<Record<Kind, number>> = { plank: 330, stick: 880, tube: 440, thread: 660 }
const byLength = (kind: Kind, long: number) => clamp(BASE[kind] / Math.sqrt(Math.max(long, 0.5)), RANGE.pitch)

/** A pin goes into a grid point: a small click. */
export const pinClick: VoiceSpec = [{ wave: 'triangle', pitch: 1760, slideTo: 1320, peak: 0.1, attack: 0.002, length: 0.05 }]

/** The free end of a drag snaps to the next grid point. */
export const snapTick = (kind: Kind, long: number): VoiceSpec => [{ wave: 'triangle', pitch: 2 * byLength(kind, long), peak: 0.05, attack: 0.002, length: 0.04 }]

/** A part lands on the sheet, each kind in its own voice, pitched by its length. */
export function lay(kind: Kind, long: number): VoiceSpec {
  const pitch = byLength(kind, long)
  switch (kind) {
    // A broad clack: a low knock and the slap of its flat face.
    case 'plank': return kept([{ wave: 'triangle', pitch, slideTo: pitch * 0.7, peak: 0.16, attack: 0.003, length: 0.16 }, { wave: 'noise', pitch: 900, peak: 0.08, attack: 0.002, length: 0.06 }])
    // A light click.
    case 'stick': return kept([{ wave: 'triangle', pitch, slideTo: pitch * 0.8, peak: 0.12, attack: 0.002, length: 0.08 }])
    // A hollow tok.
    case 'tube': return kept([{ wave: 'sine', pitch, slideTo: pitch * 0.85, peak: 0.15, attack: 0.004, length: 0.2 }, { wave: 'noise', pitch: pitch * 2, peak: 0.04, attack: 0.004, length: 0.08 }])
    // A soft slither as it falls into its curve.
    case 'thread': return kept([{ wave: 'noise', pitch: 2400, slideTo: 1200, peak: 0.05, attack: 0.03, length: 0.22 }])
  }
}

/**
 * A part plucked. The pitch follows the force in it, so a finished bridge is
 * an instrument that plays what it carries: a string sounds higher the harder
 * it is pulled and the shorter it is, as a real one does (pitch goes with the
 * root of the pull, over the length).
 */
export function pluck(kind: Kind, force: number, long: number, slack: boolean): VoiceSpec {
  const share = clamp(Math.abs(force) / SPEC[kind].pull, [0, 1])
  if (kind === 'thread') {
    if (slack) return kept([{ wave: 'noise', pitch: 300, peak: 0.05, attack: 0.02, length: 0.18 }])
    const pitch = clamp((220 * (1 + 5 * Math.sqrt(share))) / Math.sqrt(Math.max(long, 1) / 4), RANGE.pitch)
    return kept([{ wave: 'triangle', pitch, peak: 0.14, attack: 0.002, length: 0.7 }, { wave: 'sine', pitch: pitch * 2, peak: 0.04, attack: 0.002, length: 0.3 }])
  }
  const pitch = byLength(kind, long) * (force >= 0 ? 1 + 0.5 * share : 1 - 0.3 * share)
  switch (kind) {
    // A low groan that whips: the pitch dips and comes back.
    case 'plank': return kept([{ wave: 'triangle', pitch: pitch * 0.5, slideTo: pitch * 0.4, peak: 0.15, attack: 0.02, length: 0.5 }, { wave: 'sine', pitch: pitch * 0.5 * 1.5, peak: 0.05, attack: 0.02, length: 0.3 }])
    // A ping when stretched, a knock when squeezed.
    case 'stick': return kept(force >= 0 ? [{ wave: 'triangle', pitch: pitch * 1.5, peak: 0.12, attack: 0.002, length: 0.35 }] : [{ wave: 'triangle', pitch: pitch * 0.5, slideTo: pitch * 0.4, peak: 0.14, attack: 0.002, length: 0.09 }, { wave: 'noise', pitch: 700, peak: 0.05, attack: 0.002, length: 0.05 }])
    // A hoot, like a blown bottle.
    case 'tube': return kept([{ wave: 'sine', pitch: pitch * 0.5, peak: 0.16, attack: 0.03, length: 0.45 }, { wave: 'noise', pitch, peak: 0.03, attack: 0.03, length: 0.2 }])
  }
}

/** A part turned. Each kind answers a turn in its own way (grid.ts). */
export function turn(kind: Kind, long: number): VoiceSpec {
  const pitch = byLength(kind, long)
  switch (kind) {
    case 'plank': return kept([{ wave: 'triangle', pitch: pitch * 0.8, peak: 0.15, attack: 0.003, length: 0.1 }, { wave: 'triangle', pitch: pitch * 1.2, peak: 0.13, attack: 0.003, length: 0.14, after: 0.11 }])
    case 'stick': return kept([{ wave: 'noise', pitch: 1400, slideTo: 500, peak: 0.07, attack: 0.05, length: 0.4 }])
    case 'tube': return kept([{ wave: 'noise', pitch: 260, slideTo: 180, peak: 0.08, attack: 0.06, length: 0.6 }])
    case 'thread': return kept([{ wave: 'noise', pitch: 1800, slideTo: 2600, peak: 0.05, attack: 0.08, length: 0.5 }])
  }
}

/** A part taken off and back to the tray. */
export function takeOff(kind: Kind, long: number): VoiceSpec {
  const pitch = byLength(kind, long)
  switch (kind) {
    // A long wooden scrape.
    case 'plank': return kept([{ wave: 'noise', pitch: 500, slideTo: 900, peak: 0.07, attack: 0.04, length: 0.45 }])
    // A flick, and the rattle of the sticks it lands among.
    case 'stick': return kept([{ wave: 'triangle', pitch: pitch * 2, slideTo: pitch * 3, peak: 0.08, attack: 0.002, length: 0.07 }, ...[0.09, 0.13, 0.19].map((after, i) => ({ wave: 'triangle' as const, pitch: 900 + 180 * i, peak: 0.04, attack: 0.001, length: 0.04, after }))])
    // It rolls away down the sheet, drumming as it goes: five hollow beats, each a little lower and softer.
    case 'tube': return kept([0, 0.07, 0.15, 0.24, 0.34].map((after, i) => ({ wave: 'sine' as const, pitch: pitch * (0.62 - 0.04 * i), peak: 0.1 - 0.012 * i, attack: 0.004, length: 0.06, after })))
    case 'thread': return kept([{ wave: 'noise', pitch: 1500, slideTo: 3000, peak: 0.07, attack: 0.01, length: 0.18 }])
  }
}

/** A part under strain creaks, more often and higher the nearer it is to giving. `use` is the share of its strength in use. */
export const creak = (use: number): VoiceSpec => [{ wave: 'square', pitch: clamp(90 + 260 * use, RANGE.pitch), slideTo: clamp(70 + 200 * use, RANGE.pitch), peak: clamp(0.03 + 0.07 * use, RANGE.peak), attack: 0.01, length: 0.09 }]

/** A part gives: each way of giving has its own sound. */
export function give(how: 'bend' | 'bow' | 'squeeze' | 'pull', kind: Kind): VoiceSpec {
  // A thread parts with a ping; a tube end pops from its pin.
  if (kind === 'thread') return kept([{ wave: 'triangle', pitch: 2400, slideTo: 900, peak: 0.16, attack: 0.001, length: 0.25 }])
  if (kind === 'tube' && how === 'pull') return kept([{ wave: 'sine', pitch: 520, slideTo: 180, peak: 0.18, attack: 0.002, length: 0.12 }])
  const crack: Sound = { wave: 'noise', pitch: how === 'bend' ? 1100 : 1700, peak: 0.18, attack: 0.001, length: how === 'bend' ? 0.16 : 0.09 }
  return kept([crack, { wave: 'triangle', pitch: how === 'bend' ? 160 : 240, slideTo: 80, peak: 0.14, attack: 0.002, length: 0.2 }, { wave: 'noise', pitch: 2600, peak: 0.06, attack: 0.002, length: 0.3, after: 0.05 }])
}

/** A shape that is not held folds: slow wooden knocks, one for each part that lies down. */
export const fold = (parts: number): VoiceSpec => Array.from({ length: Math.min(Math.max(parts, 1), 5) }, (_, i) => ({ wave: 'triangle' as const, pitch: 300 - 35 * i, peak: 0.1, attack: 0.004, length: 0.12, after: 0.11 * i }))

/** The splash at the end of every failed run, larger for a heavier vehicle. */
export const splash = (crates: number): VoiceSpec => [{ wave: 'noise', pitch: clamp(700 - 60 * crates, RANGE.pitch), slideTo: 220, peak: clamp(0.1 + 0.015 * crates, RANGE.peak), attack: 0.01, length: 0.6 }, { wave: 'sine', pitch: 140, slideTo: 70, peak: 0.12, attack: 0.005, length: 0.25 }]

/** The trolley: one bell note for each weight on it, rising. */
export const trolleyBells = (weights: number): VoiceSpec => Array.from({ length: Math.min(Math.max(Math.round(weights), 1), 6) }, (_, i) => ({ wave: 'sine' as const, pitch: 880 * 2 ** ((2 * i) / 12), peak: 0.07, attack: 0.002, length: 0.4, after: 0.08 * i }))

/** The bridge springs back when the load leaves it: the notes of its own parts, lowest first. */
export const chord = (pitches: readonly number[]): VoiceSpec => [...pitches].sort((a, b) => a - b).slice(0, 5).map((pitch, i) => ({ wave: 'triangle' as const, pitch: clamp(pitch, RANGE.pitch), peak: 0.09, attack: 0.004, length: 0.8, after: 0.05 * i }))

/**
 * A part carrying a load, each kind in its own voice (grid.ts, the Load
 * column): a plank creaks lower as its curve deepens, a squeezed stick squeaks
 * higher as it bows, a tube crackles like a paper cup, and a pulled thread
 * hums. `use` is the share of the part's strength in use.
 */
export function load(kind: Kind, use: number): VoiceSpec {
  const share = clamp(use, [0, 1])
  switch (kind) {
    case 'plank': return kept([{ wave: 'square', pitch: 220 - 110 * share, slideTo: 180 - 100 * share, peak: 0.04 + 0.06 * share, attack: 0.02, length: 0.3 }])
    case 'stick': return kept([{ wave: 'triangle', pitch: 1400 + 900 * share, slideTo: 1700 + 1100 * share, peak: 0.04 + 0.05 * share, attack: 0.01, length: 0.18 }])
    case 'tube': return kept([0, 0.04, 0.09, 0.16].map((after, i) => ({ wave: 'noise' as const, pitch: 1800 + 300 * i, peak: 0.03 + 0.03 * share, attack: 0.001, length: 0.03, after })))
    case 'thread': return kept([{ wave: 'sine', pitch: 110 + 110 * share, peak: 0.05 + 0.04 * share, attack: 0.06, length: 0.9 }])
  }
}

/** Something drops into the water: the plop after a tube rolls its load off. */
export const plop: VoiceSpec = [{ wave: 'sine', pitch: 520, slideTo: 140, peak: 0.14, attack: 0.004, length: 0.14 }, { wave: 'noise', pitch: 900, slideTo: 300, peak: 0.05, attack: 0.01, length: 0.2, after: 0.05 }]

/** Wheels in the water on a thread used as a road: a gurgle. */
export const gurgle: VoiceSpec = [0, 0.09, 0.17, 0.28].map((after, i) => ({ wave: 'sine' as const, pitch: 300 + 70 * ((i * 3) % 4), slideTo: 420 + 60 * i, peak: 0.07, attack: 0.01, length: 0.09, after }))

/** A hinge in the air ticks when a part on it shifts. */
export const pinTick: VoiceSpec = [{ wave: 'triangle', pitch: 2600, peak: 0.05, attack: 0.001, length: 0.03 }]

/** Every part on a plucked pin rattles at once: a few quick knocks at the pitches of those parts. */
export const pinRattle = (pitches: readonly number[]): VoiceSpec => kept((pitches.length ? pitches : [600]).slice(0, 5).map((pitch, i) => ({ wave: 'triangle' as const, pitch, peak: 0.07, attack: 0.002, length: 0.06, after: 0.03 * i })))

/** A lone part swings round its one pin like a clock hand, ticking. */
export const pinSwing: VoiceSpec = [0, 0.14, 0.28, 0.42].map((after, i) => ({ wave: 'triangle' as const, pitch: i % 2 ? 1500 : 1900, peak: 0.06, attack: 0.001, length: 0.035, after }))

/** A pin comes out with a pop, and the ends it held clatter loose: one knock for each. */
export const pinPop = (ends: number): VoiceSpec => [{ wave: 'sine', pitch: 700, slideTo: 1500, peak: 0.13, attack: 0.002, length: 0.06 }, ...Array.from({ length: Math.min(Math.max(ends, 0), 4) }, (_, i) => ({ wave: 'triangle' as const, pitch: 420 - 50 * i, peak: 0.08, attack: 0.002, length: 0.07, after: 0.1 + 0.07 * i }))]

/** The trolley hung from a pin swings like a pendulum, with a squeak at each end of the swing. */
export const pendulum: VoiceSpec = [0, 0.5].map((after, i) => ({ wave: 'triangle' as const, pitch: i ? 1250 : 1100, slideTo: i ? 1100 : 1250, peak: 0.05, attack: 0.03, length: 0.16, after }))

/** The trolley set down on a plank: a clink of its weights and the trundle of its wheels to the low point. */
export const trolleySet: VoiceSpec = [{ wave: 'sine', pitch: 1900, peak: 0.08, attack: 0.001, length: 0.1 }, { wave: 'noise', pitch: 420, slideTo: 320, peak: 0.05, attack: 0.05, length: 0.5, after: 0.08 }]

/** The trolley flipped to ride under the plank: a clank. */
export const trolleyFlip: VoiceSpec = [{ wave: 'square', pitch: 330, slideTo: 250, peak: 0.07, attack: 0.002, length: 0.12 }, { wave: 'sine', pitch: 1500, peak: 0.06, attack: 0.001, length: 0.2, after: 0.03 }]

/** One more weight on the trolley: a clunk, lower the more weights it carries. */
export const trolleyWeight = (weights: number): VoiceSpec => kept([{ wave: 'triangle', pitch: 260 - 22 * weights, slideTo: 200 - 20 * weights, peak: 0.14, attack: 0.002, length: 0.12 }])

/** The trolley taken off: the deck springs back up and the weights jingle. */
export const trolleyOff = (weights: number): VoiceSpec => [{ wave: 'triangle', pitch: 180, slideTo: 360, peak: 0.1, attack: 0.01, length: 0.25 }, ...Array.from({ length: Math.min(Math.max(Math.round(weights), 1), 5) }, (_, i) => ({ wave: 'sine' as const, pitch: 2100 + 190 * ((i * 5) % 6), peak: 0.04, attack: 0.001, length: 0.12, after: 0.05 + 0.035 * i }))]

/** The crew chief taps a triangle, once on each side: three knocks at the pitches of the three parts. */
export const chiefTaps = (pitches: readonly number[]): VoiceSpec => kept([0, 1, 2].map((i) => ({ wave: 'triangle' as const, pitch: (pitches[i] ?? 700) * 1.5, peak: 0.09, attack: 0.002, length: 0.07, after: 0.34 + 0.29 * i })))

/** Its feathers stand on end: a quick dry ruffle that rises. */
export const chiefRuffle: VoiceSpec = [{ wave: 'noise', pitch: 1500, slideTo: 3000, peak: 0.07, attack: 0.02, length: 0.22 }, { wave: 'noise', pitch: 2400, peak: 0.04, attack: 0.01, length: 0.1, after: 0.2 }]

/** Poked, it gives one short dry croak. */
export const chiefCroak: VoiceSpec = [{ wave: 'square', pitch: 190, slideTo: 150, peak: 0.07, attack: 0.008, length: 0.16 }, { wave: 'noise', pitch: 800, peak: 0.03, attack: 0.008, length: 0.12 }]

/** A part put back where it came from: a soft knock, quieter than laying it. */
export const putBack = (kind: Kind, long: number): VoiceSpec => kept([{ wave: 'triangle', pitch: byLength(kind, long) * 0.9, peak: 0.06, attack: 0.004, length: 0.08 }])

/** A swinging part knocks against the bank: a wooden knock, louder the faster it came. `speed` is in radians a second. */
export const knock = (kind: Kind, long: number, speed: number): VoiceSpec => kept([{ wave: kind === 'tube' ? 'sine' : 'triangle', pitch: byLength(kind, long) * 0.7, slideTo: byLength(kind, long) * 0.5, peak: 0.04 + 0.03 * Math.min(speed, 4), attack: 0.002, length: 0.09 }])

/** A pile in the tray picked: the parts of that kind stir. */
export const pick = (kind: Kind): VoiceSpec => kept([{ wave: kind === 'tube' ? 'sine' : kind === 'thread' ? 'noise' : 'triangle', pitch: BASE[kind] * 1.5, peak: 0.07, attack: 0.003, length: 0.07 }, { wave: 'triangle', pitch: BASE[kind] * 2, peak: 0.04, attack: 0.002, length: 0.05, after: 0.06 }])

/** Each vehicle's own horn, toot or bell: what it answers a touch with, and what it sets off with. */
export function honk(id: string): VoiceSpec {
  switch (id) {
    // A bicycle bell, twice.
    case 'post-van': return [{ wave: 'sine', pitch: 1760, peak: 0.09, attack: 0.002, length: 0.14 }, { wave: 'sine', pitch: 1760, peak: 0.08, attack: 0.002, length: 0.2, after: 0.13 }]
    // A wobbling two-tone toot.
    case 'jelly-truck': return [{ wave: 'triangle', pitch: 392, slideTo: 440, peak: 0.1, attack: 0.02, length: 0.22 }, { wave: 'triangle', pitch: 330, slideTo: 300, peak: 0.08, attack: 0.02, length: 0.2, after: 0.16 }]
    // Two low piano notes, a fifth apart.
    case 'piano-mover': return [{ wave: 'triangle', pitch: 131, peak: 0.13, attack: 0.004, length: 0.5 }, { wave: 'triangle', pitch: 196, peak: 0.1, attack: 0.004, length: 0.5, after: 0.09 }]
    // A long rising hoot.
    case 'giraffe-bus': return [{ wave: 'sine', pitch: 294, slideTo: 587, peak: 0.1, attack: 0.05, length: 0.45 }]
    // A quick patter of little feet: six ticks.
    case 'caterpillar-bus': return [0, 1, 2, 3, 4, 5].map((i) => ({ wave: 'triangle' as const, pitch: 900 + 60 * i, peak: 0.05, attack: 0.002, length: 0.04, after: 0.05 * i }))
    default: return [{ wave: 'triangle', pitch: 440, peak: 0.08, attack: 0.01, length: 0.15 }]
  }
}

/**
 * How a vehicle sounds about the ride, in its own voice: a like, a dislike or
 * neither. It is the cargo and the driver that sound, never a verdict.
 */
/**
 * How a vehicle took its ride, heard: each vehicle has its own sound for each
 * thing it does, by the same name the reaction has (vehicles.ts). The van's
 * driver whistles, or its parcels thud off one by one. The jelly rolls in one
 * slow wave, or jumps and lands, or its driver yawns. The piano's keys ripple
 * in a chord, or it rumbles backward. The bus's necks stretch, or duck in a
 * wave. The caterpillar's feet tick in time while it hums a scale, or tick out
 * of step with a hiccup between. Anything else is one plain note of its horn.
 */
export function reactVoice(id: string, mood: 'like' | 'dislike' | 'plain', act = ''): VoiceSpec {
  const base = honk(id)[0].pitch
  const run = (count: number, make: (i: number) => Sound): VoiceSpec => kept(Array.from({ length: count }, (_, i) => make(i)))
  switch (act) {
    case 'parcels-stand': return kept([{ wave: 'sine', pitch: 1568, slideTo: 1976, peak: 0.07, attack: 0.02, length: 0.2 }, { wave: 'sine', pitch: 2093, slideTo: 1760, peak: 0.07, attack: 0.02, length: 0.3, after: 0.24 }])
    case 'parcels-slide': return run(3, (i) => ({ wave: 'triangle', pitch: 170 - 22 * i, slideTo: 110, peak: 0.1, attack: 0.002, length: 0.09, after: 0.05 + 0.2 * i }))
    case 'jelly-rolls': return kept([{ wave: 'sine', pitch: 196, slideTo: 262, peak: 0.1, attack: 0.08, length: 0.5 }, { wave: 'sine', pitch: 262, slideTo: 196, peak: 0.08, attack: 0.08, length: 0.5, after: 0.45 }])
    case 'jelly-jumps': return kept([{ wave: 'sine', pitch: 240, slideTo: 720, peak: 0.12, attack: 0.004, length: 0.18 }, { wave: 'noise', pitch: 500, slideTo: 260, peak: 0.1, attack: 0.004, length: 0.14, after: 0.42 }])
    case 'driver-yawns': return kept([{ wave: 'sine', pitch: 330, slideTo: 440, peak: 0.07, attack: 0.08, length: 0.5 }, { wave: 'sine', pitch: 440, slideTo: 196, peak: 0.07, attack: 0.06, length: 0.9, after: 0.5 }])
    case 'keys-ripple': return run(5, (i) => ({ wave: 'triangle', pitch: 262 * 2 ** ([0, 4, 7, 12, 16][i] / 12), peak: 0.07, attack: 0.004, length: 0.5, after: 0.07 * i }))
    case 'piano-rolls-back': return kept([{ wave: 'noise', pitch: 180, slideTo: 120, peak: 0.1, attack: 0.05, length: 0.6 }, ...[0.1, 0.3, 0.52].map((after, i) => ({ wave: 'triangle' as const, pitch: 131 * (1 + 0.5 * i), peak: 0.06, attack: 0.004, length: 0.2, after }))])
    case 'necks-stretch': return run(3, (i) => ({ wave: 'sine', pitch: 392 * (1 + 0.12 * i), slideTo: 587 * (1 + 0.12 * i), peak: 0.06, attack: 0.05, length: 0.4, after: 0.15 * i }))
    case 'necks-duck': return run(3, (i) => ({ wave: 'sine', pitch: 587 - 40 * i, slideTo: 294 - 20 * i, peak: 0.07, attack: 0.01, length: 0.18, after: 0.18 * i }))
    case 'hums-a-scale': return run(6, (i) => (i % 2 ? { wave: 'triangle', pitch: 1900, peak: 0.03, attack: 0.001, length: 0.03, after: 0.1 * i } : { wave: 'sine', pitch: 262 * 2 ** ([0, 2, 4][i / 2] / 12), peak: 0.07, attack: 0.03, length: 0.26, after: 0.1 * i }))
    case 'loses-step': return kept([{ wave: 'triangle', pitch: 1900, peak: 0.035, attack: 0.001, length: 0.03 }, { wave: 'triangle', pitch: 1900, peak: 0.035, attack: 0.001, length: 0.03, after: 0.13 }, { wave: 'triangle', pitch: 1900, peak: 0.035, attack: 0.001, length: 0.03, after: 0.19 }, { wave: 'triangle', pitch: 620, peak: 0.1, attack: 0.002, length: 0.05, after: 0.26 }, { wave: 'triangle', pitch: 1900, peak: 0.035, attack: 0.001, length: 0.03, after: 0.37 }, { wave: 'triangle', pitch: 880, peak: 0.1, attack: 0.002, length: 0.05, after: 0.5 }])
  }
  if (mood === 'like') return kept([0, 4, 7, 12].map((semis, i) => ({ wave: 'triangle' as const, pitch: base * 2 ** (semis / 12), peak: 0.07, attack: 0.01, length: 0.22, after: 0.14 * i })))
  if (mood === 'dislike') return kept([{ wave: 'triangle', pitch: base * 1.5, slideTo: base * 0.7, peak: 0.1, attack: 0.01, length: 0.35 }, { wave: 'noise', pitch: 900, peak: 0.06, attack: 0.005, length: 0.12, after: 0.3 }, { wave: 'triangle', pitch: base * 0.6, peak: 0.07, attack: 0.01, length: 0.18, after: 0.45 }])
  return kept([{ wave: 'triangle', pitch: base, peak: 0.06, attack: 0.02, length: 0.3 }])
}

/** The barge under the bridge: a long low toot for open water, and a scrape and a plop for a prop in its way. */
export const bargeHorn = (clear: boolean): VoiceSpec => (clear ? [{ wave: 'sine', pitch: 147, peak: 0.12, attack: 0.08, length: 0.7 }, { wave: 'sine', pitch: 220, peak: 0.06, attack: 0.08, length: 0.6, after: 0.1 }] : [{ wave: 'noise', pitch: 400, slideTo: 250, peak: 0.1, attack: 0.05, length: 0.6 }, { wave: 'sine', pitch: 480, slideTo: 150, peak: 0.1, attack: 0.004, length: 0.13, after: 0.5 }])

/** Under a whole arch the barge's toot comes back as a chord: three soft notes on the horn's own, after it. */
export const hornEcho: VoiceSpec = [0, 4, 7].map((semis) => ({ wave: 'sine' as const, pitch: 294 * 2 ** (semis / 12), peak: 0.06, attack: 0.08, length: 0.9, after: 0.55 }))

/** A part growing from its pin under the finger: a dry creak, lower the longer the part has grown. */
export const growCreak = (kind: Kind, long: number): VoiceSpec => kept([{ wave: 'square', pitch: clamp((kind === 'thread' ? 520 : 430) - 42 * long, RANGE.pitch), slideTo: clamp((kind === 'thread' ? 480 : 390) - 42 * long, RANGE.pitch), peak: 0.03, attack: 0.004, length: 0.07 }])

/** The trolley on its hook, at one end of a swing: a squeak up at one end and down at the other. */
export const pendulumSqueak = (back: boolean): VoiceSpec => [{ wave: 'triangle', pitch: back ? 1250 : 1100, slideTo: back ? 1100 : 1250, peak: 0.05, attack: 0.03, length: 0.16 }]

/** The crew. The beaver: its tail on the floor, its teeth when it cannot look, and the breath it lets go. The mole: its rule laid on a thing, lower the first time and higher the second, and the rule dropped. */
export const beaverSlap: VoiceSpec = [{ wave: 'noise', pitch: 500, slideTo: 200, peak: 0.12, attack: 0.002, length: 0.09 }, { wave: 'triangle', pitch: 150, slideTo: 95, peak: 0.1, attack: 0.002, length: 0.12 }]
export const beaverChatter: VoiceSpec = [0, 0.06, 0.12, 0.18, 0.24].map((after) => ({ wave: 'triangle' as const, pitch: 1150, peak: 0.04, attack: 0.001, length: 0.03, after }))
export const beaverSigh: VoiceSpec = [{ wave: 'noise', pitch: 1400, slideTo: 500, peak: 0.05, attack: 0.08, length: 0.5 }]
export const moleRule = (again: boolean): VoiceSpec => [{ wave: 'triangle', pitch: again ? 830 : 690, peak: 0.07, attack: 0.002, length: 0.05 }, { wave: 'triangle', pitch: again ? 1245 : 1035, peak: 0.03, attack: 0.002, length: 0.04, after: 0.05 }]
export const moleDrop: VoiceSpec = [0, 0.08, 0.2].map((after, i) => ({ wave: 'triangle' as const, pitch: 900 - 160 * i, peak: 0.07, attack: 0.002, length: 0.04, after }))

/** The bridge goes back as it was built: a soft run of knocks upward. */
export const restore: VoiceSpec = [0, 1, 2].map((i) => ({ wave: 'triangle' as const, pitch: 300 + 90 * i, peak: 0.06, attack: 0.004, length: 0.09, after: 0.08 * i }))

/** Paper: a roll touched (0) and a sheet unrolled or a roll sliding in (1). */
export const unrollVoice = (how: 0 | 1): VoiceSpec => (how === 0 ? [{ wave: 'noise', pitch: 2200, peak: 0.05, attack: 0.004, length: 0.06 }] : [{ wave: 'noise', pitch: 1200, slideTo: 2600, peak: 0.07, attack: 0.05, length: 0.4 }, { wave: 'noise', pitch: 600, peak: 0.05, attack: 0.004, length: 0.07, after: 0.42 }])

/** Turns a voice into calls on the two builders of audio.ts. `at` is the audio clock's time now. */
export function play(voice: VoiceSpec, at: number, tone: (at: number, pitch: number, wave: OscillatorType, peak: number, attack: number, length: number, slideTo?: number) => void, noise: (at: number, pitch: number, q: number, peak: number, attack: number, length: number, slideTo?: number) => void): void {
  for (const sound of voice) {
    const when = at + (sound.after ?? 0)
    if (sound.wave === 'noise') noise(when, sound.pitch, 1.2, sound.peak, sound.attack, sound.length, sound.slideTo)
    else tone(when, sound.pitch, sound.wave, sound.peak, sound.attack, sound.length, sound.slideTo)
  }
}
