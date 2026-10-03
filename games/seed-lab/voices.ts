import type { CellKey } from './grid'
import type { Colour, Joints } from './plant'

// Every voice of the game as plain numbers, so that a machine that cannot
// hear can still hold each one inside a stated range (voices.test.ts). The
// view turns a part into one call of the template's `tone` or `noise`.
//
// Sound here says what happened, never how well: there is no cheer, no
// fanfare and no wrong sound. A wrong use sounds as funny as it looks.

export type Part = {
  source: 'tone' | 'noise'
  /** Hertz: the tone's pitch, or the centre of the noise band. */
  pitch: number
  /** Where the pitch glides to over the length, if it moves. */
  glideTo?: number
  /** For a tone, its wave; a noise has none. */
  wave?: 'sine' | 'triangle' | 'square' | 'sawtooth'
  /** For a noise, how narrow its band is; a tone has none. */
  q?: number
  /** Loudest point, as a gain from 0 to 1. */
  peak: number
  /** Seconds to reach the peak. */
  attack: number
  /** Seconds from the peak to silence. */
  length: number
  /** Seconds after the voice starts that this part starts. */
  after?: number
}

/** The ranges every part is held to. The template's own tick peaks at 0.12; nothing here is louder than 0.16. */
export const RANGE = {
  pitch: [90, 3600],
  peak: [0.02, 0.16],
  attack: [0.002, 0.09],
  length: [0.03, 0.7],
  after: [0, 0.6],
  /** A whole voice, from its start to the end of its last part. */
  whole: [0.04, 1.2],
} as const

const tone = (pitch: number, wave: Part['wave'], peak: number, attack: number, length: number, glideTo?: number, after?: number): Part => ({ source: 'tone', pitch, wave, peak, attack, length, ...(glideTo === undefined ? {} : { glideTo }), ...(after === undefined ? {} : { after }) })
const noise = (pitch: number, q: number, peak: number, attack: number, length: number, glideTo?: number, after?: number): Part => ({ source: 'noise', pitch, q, peak, attack, length, ...(glideTo === undefined ? {} : { glideTo }), ...(after === undefined ? {} : { after }) })

/**
 * One voice a cell of the grid, none shared, each built to the sound the design sheet names for that cell (a rising
 * creak, a raspberry, a hum like a top, a clink of clay). A plant's own note is added to `plant-poke` by `noteOf`,
 * a visitor's answer follows `plant-offer` in that visitor's own voice, and each seed of a burst adds `seedTick`.
 */
export const CELL_VOICES: Record<CellKey, Part[]> = {
  // A plant in bloom.
  'plant-poke': [noise(2400, 1.2, 0.05, 0.004, 0.09)],
  'plant-dust': [tone(180, 'sawtooth', 0.05, 0.06, 0.34, 420), noise(900, 2, 0.04, 0.03, 0.2, 1800)],
  'plant-wet': [noise(1500, 0.8, 0.07, 0.01, 0.12), noise(3000, 3, 0.05, 0.004, 0.05, undefined, 0.16), noise(2600, 3, 0.05, 0.004, 0.05, undefined, 0.24), noise(3300, 3, 0.04, 0.004, 0.05, undefined, 0.31)],
  'plant-carry': [tone(150, 'triangle', 0.12, 0.006, 0.14, 110), noise(520, 1, 0.05, 0.02, 0.16, 380, 0.12)],
  'plant-offer': [tone(520, 'sine', 0.08, 0.02, 0.18, 660)],
  // A pod.
  'pod-poke': [noise(700, 0.9, 0.14, 0.003, 0.11), tone(240, 'triangle', 0.1, 0.003, 0.12, 120)],
  'pod-dust': [tone(118, 'sawtooth', 0.07, 0.02, 0.5, 92), noise(260, 1.2, 0.06, 0.02, 0.45)],
  'pod-wet': [tone(200, 'sine', 0.08, 0.08, 0.3, 600), noise(1200, 0.7, 0.12, 0.004, 0.25, 2800, 0.34)],
  'pod-carry': [noise(240, 0.9, 0.11, 0.006, 0.12), noise(900, 1.5, 0.04, 0.004, 0.05, undefined, 0.16), noise(1100, 1.5, 0.04, 0.004, 0.05, undefined, 0.24), noise(800, 1.5, 0.04, 0.004, 0.05, undefined, 0.33)],
  'pod-offer': [noise(3200, 4, 0.06, 0.003, 0.04), noise(2900, 4, 0.06, 0.003, 0.04, undefined, 0.09), noise(3400, 4, 0.06, 0.003, 0.04, undefined, 0.17), noise(700, 0.9, 0.13, 0.003, 0.11, undefined, 0.27)],
  // A packet seed.
  'seed-poke': [tone(1400, 'triangle', 0.08, 0.002, 0.04, 1000), tone(700, 'sine', 0.06, 0.004, 0.1, 900, 0.07)],
  'seed-dust': [tone(233, 'sine', 0.07, 0.05, 0.6, 196), tone(466, 'sine', 0.03, 0.05, 0.5, 392)],
  'seed-wet': [tone(260, 'sawtooth', 0.04, 0.05, 0.22, 180), tone(620, 'triangle', 0.06, 0.004, 0.05, undefined, 0.26), tone(660, 'triangle', 0.06, 0.004, 0.05, undefined, 0.36)],
  'seed-carry': [noise(2800, 3, 0.04, 0.01, 0.2, 3400), tone(500, 'sine', 0.07, 0.01, 0.16, 760, 0.12)],
  'seed-offer': [tone(990, 'sine', 0.05, 0.01, 0.2, 940), tone(620, 'square', 0.05, 0.002, 0.04, 500, 0.3), noise(450, 1.2, 0.06, 0.004, 0.07, undefined, 0.42)],
  // A runner bud.
  'bud-poke': [tone(300, 'triangle', 0.1, 0.003, 0.35, 340), tone(604, 'sine', 0.04, 0.003, 0.3, 680)],
  'bud-dust': [noise(3300, 5, 0.1, 0.002, 0.03), tone(420, 'sine', 0.05, 0.03, 0.12, 360, 0.08)],
  'bud-wet': [tone(220, 'sine', 0.07, 0.09, 0.5, 330), noise(800, 1.5, 0.03, 0.05, 0.4)],
  'bud-carry': [noise(340, 2.5, 0.08, 0.03, 0.14, 200), tone(392, 'sine', 0.07, 0.01, 0.22, undefined, 0.12)],
  'bud-offer': [tone(250, 'sawtooth', 0.04, 0.03, 0.12, 300), tone(196, 'triangle', 0.1, 0.003, 0.3, 185, 0.16)],
  // A pot of soil.
  'soil-poke': [noise(300, 0.8, 0.09, 0.004, 0.1), tone(760, 'sine', 0.04, 0.03, 0.12, 900, 0.2)],
  'soil-dust': [noise(3500, 1.5, 0.03, 0.03, 0.4)],
  'soil-wet': [tone(140, 'sine', 0.12, 0.01, 0.16, 100), tone(190, 'sine', 0.08, 0.01, 0.12, 130, 0.12)],
  'soil-carry': [tone(1240, 'triangle', 0.08, 0.002, 0.07), tone(1660, 'triangle', 0.06, 0.002, 0.06, undefined, 0.05)],
  'soil-offer': [tone(480, 'sine', 0.05, 0.04, 0.2, 430), tone(210, 'sine', 0.1, 0.003, 0.09, 170, 0.34)],
  // The beetle.
  'beetle-poke': [noise(1000, 2, 0.08, 0.003, 0.05), tone(1800, 'square', 0.03, 0.002, 0.03, undefined, 0.5)],
  'beetle-dust': [tone(1320, 'sine', 0.05, 0.03, 0.25, 1760), noise(2200, 2, 0.09, 0.004, 0.06, 1000, 0.3)],
  'beetle-wet': [tone(900, 'square', 0.03, 0.002, 0.03), noise(1700, 3, 0.05, 0.003, 0.04, undefined, 0.08), noise(1500, 3, 0.05, 0.003, 0.04, undefined, 0.17), noise(1900, 3, 0.05, 0.003, 0.04, undefined, 0.24), noise(1600, 3, 0.04, 0.003, 0.04, undefined, 0.33)],
  'beetle-carry': [noise(350, 1.5, 0.07, 0.01, 0.2), noise(350, 1.5, 0.06, 0.01, 0.15, undefined, 0.25), tone(110, 'sawtooth', 0.04, 0.03, 0.14, 95, 0.46)],
  'beetle-offer': [tone(165, 'sawtooth', 0.05, 0.02, 0.1, 140), tone(123, 'sawtooth', 0.05, 0.02, 0.1, 104, 0.24)],
}

// --- A plant's own note ---------------------------------------------------------

/** The lower the note, the taller the plant: pitch follows size. */
const HEIGHT_HZ: Record<Joints, number> = { 1: 784, 2: 587.3, 4: 392 }
/** Colour moves the note within one five-note scale, so any brood plays a phrase that sits together. */
const COLOUR_STEP: Record<Colour, number> = { white: 1, pink: 9 / 8, red: 5 / 4 }

/** The pitch of a plant's own pluck, in hertz. */
export function pitchOf(joints: Joints, colour: Colour): number {
  return HEIGHT_HZ[joints] * COLOUR_STEP[colour]
}

/** A plant's pluck: when it is poked, and when it opens in a brood. `variant` picks one of three plucks so that a brood does not repeat a sound. */
export function noteOf(joints: Joints, colour: Colour, variant = 0): Part[] {
  const pitch = pitchOf(joints, colour)
  const length = [0.32, 0.26, 0.38][((variant % 3) + 3) % 3]
  const wave = (['triangle', 'sine', 'triangle'] as const)[((variant % 3) + 3) % 3]
  return [tone(pitch, wave, 0.1, 0.004, length), tone(pitch * 2, 'sine', 0.03, 0.004, length * 0.6)]
}

/** The tick of one seed landing, a little higher for each seed of the pod, so six seeds run up a short scale. */
export function seedTick(index: number): Part[] {
  return [tone(880 * 2 ** (Math.max(0, Math.min(5, index)) / 12), 'triangle', 0.06, 0.002, 0.05)]
}

/** How long a voice lasts, from its start to the end of its last part. */
export function wholeLength(parts: readonly Part[]): number {
  return Math.max(...parts.map((part) => (part.after ?? 0) + part.attack + part.length))
}
