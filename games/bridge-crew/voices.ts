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
    case 'plank': return kept([{ wave: 'noise', pitch: 500, slideTo: 900, peak: 0.07, attack: 0.04, length: 0.25 }])
    case 'stick': return kept([{ wave: 'triangle', pitch: pitch * 2, slideTo: pitch * 3, peak: 0.08, attack: 0.002, length: 0.07 }])
    case 'tube': return kept([{ wave: 'sine', pitch: pitch * 0.6, slideTo: pitch * 0.45, peak: 0.1, attack: 0.01, length: 0.35 }])
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

/** Turns a voice into calls on the two builders of audio.ts. `at` is the audio clock's time now. */
export function play(voice: VoiceSpec, at: number, tone: (at: number, pitch: number, wave: OscillatorType, peak: number, attack: number, length: number, slideTo?: number) => void, noise: (at: number, pitch: number, q: number, peak: number, attack: number, length: number, slideTo?: number) => void): void {
  for (const sound of voice) {
    const when = at + (sound.after ?? 0)
    if (sound.wave === 'noise') noise(when, sound.pitch, 1.2, sound.peak, sound.attack, sound.length, sound.slideTo)
    else tone(when, sound.pitch, sound.wave, sound.peak, sound.attack, sound.length, sound.slideTo)
  }
}
