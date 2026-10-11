import type { Note } from './audio'
import { MUD, ROCK, SAND, STONE, type Kind } from './ground'
import type { ToyEvent } from './toy'

// Every sound of the game as plain numbers: pitch, peak, attack and length. Nobody has heard them: they are written
// from the design sheet's words (ART.md, the grid), kept short, and a test holds each inside a stated range. The
// Mount turns a list into one voice with `voiceOf` (audio.ts) and plays it inside the touch that caused it.

/** The ranges every note is held to. */
export const RANGE = {
  frequency: [40, 5000],
  peak: [0.02, 0.3],
  attack: [0.001, 0.08],
  decay: [0.03, 0.9],
  /** The longest a whole voice lasts, in seconds, and the most its peaks add up to. */
  length: 1.3,
  loudness: 0.62,
} as const

const tone = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'tone', frequency, peak, attack, decay, ...more })
const hiss = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'noise', frequency, peak, attack, decay, ...more })

export type Material = 'sand' | 'mud' | 'stone'

/** A mouthful of earth: a crunch whose pitch follows the speed of the finger, from 0 (a tap) to 1 (a fast drag). */
export function digVoice(speed: number): Note[] {
  const s = Math.max(0, Math.min(1, speed))
  return [hiss(320 + 520 * s, 0.16, 0.003, 0.09, { q: 1.4, glideTo: 240 + 300 * s }), tone(96 - 20 * s, 0.1, 0.004, 0.08, { glideTo: 62 })]
}

/** What the dig meets and cannot bite: sand trickles, mud squelches, a stone clinks, and the rock rings dull. */
export const MET: Record<Material | 'rock', Note[]> = {
  sand: [hiss(3200, 0.07, 0.01, 0.2, { q: 0.8 })],
  mud: [tone(180, 0.12, 0.012, 0.16, { glideTo: 92 }), hiss(520, 0.06, 0.01, 0.12, { q: 2.2, glideTo: 300 })],
  stone: [tone(1900, 0.12, 0.002, 0.07, { wave: 'triangle' }), tone(2850, 0.06, 0.002, 0.05)],
  rock: [tone(142, 0.12, 0.004, 0.2), hiss(220, 0.05, 0.004, 0.1, { q: 3 })],
}

/** Taking a lump in the jaws: sand patters, mud smacks wetly, a stone grinds. */
export const PICKED: Record<Material, Note[]> = {
  sand: [hiss(2400, 0.06, 0.002, 0.04, { q: 1.2 }), hiss(2700, 0.05, 0.002, 0.04, { q: 1.2, delay: 0.06 }), hiss(2200, 0.04, 0.002, 0.05, { q: 1.2, delay: 0.13 })],
  mud: [hiss(700, 0.1, 0.006, 0.12, { q: 1.8, glideTo: 300 }), tone(150, 0.1, 0.02, 0.14, { glideTo: 110 })],
  stone: [hiss(260, 0.12, 0.02, 0.3, { q: 3.2, glideTo: 200 }), tone(74, 0.07, 0.02, 0.2)],
}

/** Setting a lump down: sand lands with a puff, mud with a splat, a stone with a thud. */
export const SET_DOWN: Record<Material, Note[]> = {
  sand: [hiss(1800, 0.08, 0.02, 0.16, { q: 0.6 })],
  mud: [hiss(420, 0.14, 0.004, 0.11, { q: 1.6, glideTo: 180 }), tone(120, 0.1, 0.006, 0.12, { glideTo: 70 })],
  stone: [tone(85, 0.2, 0.003, 0.22, { glideTo: 50 }), hiss(160, 0.08, 0.003, 0.08, { q: 2 })],
}

/** A lump that fell comes to rest: sand hushes, mud plops, a stone thuds harder the further it fell (1 to 8 cells). */
export function landedVoice(material: Material, fell: number): Note[] {
  const far = Math.max(0, Math.min(1, (fell - 1) / 7))
  if (material === 'sand') return [hiss(2600, 0.05 + 0.03 * far, 0.02, 0.22, { q: 0.7 })]
  if (material === 'mud') return [tone(300, 0.1 + 0.04 * far, 0.004, 0.1, { glideTo: 120 })]
  return [tone(70, 0.18 + 0.1 * far, 0.003, 0.26 + 0.1 * far, { glideTo: 42 }), hiss(140, 0.06 + 0.04 * far, 0.003, 0.1, { q: 2 })]
}

/** Sand on the move: a long hiss, fuller the more cells are pouring (1 to 12). */
export function pourVoice(cells: number): Note[] {
  const many = Math.max(0, Math.min(1, (cells - 1) / 11))
  return [hiss(3600, 0.05 + 0.07 * many, 0.04, 0.34 + 0.2 * many, { q: 0.7, glideTo: 2800 })]
}

/** A lump let go where it cannot lie goes back with a small step down. */
export const BACK: Note[] = [tone(500, 0.08, 0.004, 0.07, { wave: 'triangle', glideTo: 380 })]

/** The dewdrop bell. */
export const BELL: Note[] = [tone(1320, 0.14, 0.003, 0.8), tone(1980, 0.07, 0.003, 0.5), tone(2640, 0.03, 0.003, 0.3)]

/** The hill, a toadstool or the log, poked: a soft boing. */
export const BOING: Note[] = [tone(220, 0.12, 0.006, 0.22, { glideTo: 440 })]

export type Speaker = 'ant' | 'worker' | 'queen' | 'raider' | 'beetle' | 'fly' | 'dungBeetle' | 'dungFly' | 'dungBall'

/** Each creature's own voice when it is poked: invented babble, never a word. */
export const SPOKEN: Record<Speaker, Note[]> = {
  ant: [tone(880, 0.1, 0.004, 0.07, { wave: 'triangle', glideTo: 1180 }), tone(1320, 0.08, 0.004, 0.08, { wave: 'triangle', delay: 0.09 })],
  worker: [tone(360, 0.09, 0.01, 0.08, { glideTo: 300 }), tone(330, 0.08, 0.01, 0.08, { delay: 0.1, glideTo: 280 }), tone(300, 0.07, 0.01, 0.12, { delay: 0.2, glideTo: 240 })],
  queen: [tone(520, 0.1, 0.02, 0.16, { glideTo: 700 }), tone(700, 0.1, 0.02, 0.24, { delay: 0.16, glideTo: 430 })],
  raider: [tone(1500, 0.08, 0.003, 0.05, { wave: 'square' }), tone(1750, 0.07, 0.003, 0.05, { wave: 'square', delay: 0.07 })],
  beetle: [tone(110, 0.14, 0.03, 0.3, { wave: 'triangle', glideTo: 84 })],
  fly: [tone(196, 0.07, 0.01, 0.26, { wave: 'sawtooth', glideTo: 262 }), hiss(900, 0.03, 0.01, 0.2, { q: 4 })],
  dungBeetle: [tone(240, 0.11, 0.02, 0.12, { wave: 'triangle', glideTo: 200 }), tone(200, 0.1, 0.02, 0.18, { wave: 'triangle', delay: 0.14, glideTo: 150 })],
  dungFly: [tone(620, 0.08, 0.005, 0.06, { wave: 'sawtooth' }), tone(780, 0.08, 0.005, 0.06, { wave: 'sawtooth', delay: 0.08 }), tone(930, 0.08, 0.005, 0.2, { wave: 'sawtooth', delay: 0.16 })],
  dungBall: [tone(64, 0.14, 0.004, 0.16, { glideTo: 48 }), hiss(300, 0.04, 0.004, 0.06, { q: 2 })],
}

/** How long a voice lasts, in seconds. */
export const lengthOf = (notes: readonly Note[]): number => Math.max(0, ...notes.map((note) => (note.delay ?? 0) + note.attack + note.decay))

const materialOf = (kind: Kind): Material | null => (kind === SAND ? 'sand' : kind === MUD ? 'mud' : kind === STONE ? 'stone' : null)

/** The voice of something the toy says happened, or null where it makes no sound. */
export function voiceFor(event: ToyEvent): Note[] | null {
  switch (event.type) {
    case 'dug':
      return digVoice(event.speed)
    case 'met': {
      const material = materialOf(event.kind)
      return material ? MET[material] : event.kind === ROCK ? MET.rock : null
    }
    case 'picked':
      return PICKED[materialOf(event.kind)!]
    case 'set':
      return SET_DOWN[materialOf(event.kind)!]
    case 'back':
      return BACK
    case 'landed':
      return landedVoice(materialOf(event.kind)!, event.fell)
    case 'pour':
      return pourVoice(event.cells)
    case 'buried':
      return SPOKEN.ant
  }
}

/** The least time between two voices of the same kind of event, in seconds, so a fast drag crunches and does not roar. */
export const APART: Record<ToyEvent['type'], number> = { dug: 0.07, met: 0.12, picked: 0, set: 0, back: 0, landed: 0.09, pour: 0.28, buried: 0.5 }
