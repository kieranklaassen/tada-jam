import type { Note } from './audio'
import type { Folk } from './tree'
import type { Kind } from './ways'

// The sounds as plain numbers, written from the design sheet's words: nobody
// has heard them. Wood knocks are triangle tones, paper and bark are bands of
// noise, rope creaks are low saws, bells are sines, and each walker has a
// register of its own: the squirrel chirps high, the owl hoots low and round,
// the twins squeak a note apart, the beetle hums at the bottom.

export const tone = (frequency: number, peak: number, attack: number, decay: number, delay = 0, glideTo?: number, wave: OscillatorType = 'triangle'): Note =>
  ({ kind: 'tone', frequency, peak, attack, decay, delay, wave, ...(glideTo ? { glideTo } : {}) })
export const hiss = (frequency: number, q: number, peak: number, attack: number, decay: number, delay = 0, glideTo?: number): Note =>
  ({ kind: 'noise', frequency, q, peak, attack, decay, delay, ...(glideTo ? { glideTo } : {}) })

/** What a piece is made of, as the pitch of one knock on it. */
export const WOOD: Record<Kind, number> = { plank: 330, ladder: 392, bridge: 294, bucket: 262, swing: 220, lanterns: 1319, slide: 196 }

/** One knock of wood: a short tone, its overtone, and the tick of the hit. */
export const knock = (pitch: number, peak = 0.2, delay = 0): Note[] => [
  tone(pitch, peak, 0.003, 0.11, delay, pitch * 0.94),
  tone(pitch * 2.4, peak * 0.4, 0.002, 0.05, delay, undefined, 'sine'),
  hiss(2200, 1.5, peak * 0.3, 0.002, 0.03, delay),
]
export const paper = (delay = 0, peak = 0.07): Note => hiss(3200, 0.8, peak, 0.004, 0.07, delay, 1800)
/** A small bell: a lantern's glass. */
export const bell = (pitch: number, peak = 0.09, delay = 0, ring = 0.4): Note[] => [tone(pitch, peak, 0.004, ring, delay, undefined, 'sine'), tone(Math.min(5600, pitch * 2.76), peak * 0.3, 0.003, ring * 0.4, delay, undefined, 'sine')]
/** A rope under load: a low saw that bends. */
export const creak = (from: number, to: number, seconds: number, peak = 0.06, delay = 0): Note => tone(from, peak, Math.min(0.08, seconds * 0.3), seconds, delay, to, 'sawtooth')
/** A dull bump: a body on wood or on the page. */
export const thump = (pitch = 120, peak = 0.16, delay = 0): Note[] => [tone(pitch, peak, 0.004, 0.13, delay, Math.max(72, pitch * 0.7), 'sine'), hiss(500, 1.2, peak * 0.4, 0.003, 0.05, delay)]
/** Claws on wood: a dry tick. */
export const tick = (pitch: number, peak = 0.08, delay = 0): Note => hiss(pitch, 4, peak, 0.002, 0.035, delay)

/** Each walker's own voice: a chirp, a hoot, two squeaks, a hum. `lift` bends it up for asking and down for a refusal. */
export function say(folk: Folk, lift: number, delay = 0): Note[] {
  switch (folk) {
    case 'squirrel': return [tone(1500, 0.09, 0.006, 0.08, delay, 1500 * lift, 'sine'), tone(1800, 0.07, 0.006, 0.06, delay + 0.09, 1800 * lift, 'sine')]
    case 'owl': return [tone(330, 0.16, 0.05, 0.3, delay, 330 * lift, 'sine'), tone(660, 0.03, 0.05, 0.2, delay, 660 * lift, 'sine')]
    case 'mice': return [tone(2300, 0.06, 0.004, 0.07, delay, 2300 * lift, 'sine'), tone(2590, 0.06, 0.004, 0.07, delay + 0.11, 2590 * lift, 'sine')]
    case 'beetle': return [tone(147, 0.18, 0.04, 0.22, delay, 147 * lift, 'triangle'), hiss(700, 6, 0.04, 0.01, 0.05, delay)]
  }
}
/** One squeak of one twin: `second` is the twin a note higher. */
export const squeak = (second: boolean, delay = 0, lift = 1.15, peak = 0.06): Note => tone(second ? 2590 : 2300, peak, 0.004, 0.07, delay, (second ? 2590 : 2300) * lift, 'sine')
/** One hoot of the owl. */
export const hoot = (pitch: number, seconds: number, delay = 0, to = pitch, peak = 0.15): Note[] => [tone(pitch, peak, 0.05, seconds, delay, to, 'sine'), tone(pitch * 2, peak * 0.2, 0.05, seconds * 0.7, delay, to * 2, 'sine')]
/** One hum of the beetle. */
export const hum = (pitch: number, seconds: number, delay = 0, to = pitch, peak = 0.16): Note[] => [tone(pitch, peak, 0.04, seconds, delay, to, 'triangle')]
/** One chirp of the squirrel. */
export const chirp = (pitch: number, delay = 0, to = pitch * 1.2, peak = 0.09): Note => tone(pitch, peak, 0.005, 0.07, delay, to, 'sine')

/** The same notes, starting later. */
export const later = (notes: readonly Note[], delay: number): Note[] => notes.map((note) => ({ ...note, delay: (note.delay ?? 0) + delay }))
/** `count` sounds spread evenly over `seconds`, the first at once: one for each step, rung or swing. */
export const each = (count: number, seconds: number, make: (index: number) => Note | Note[]): Note[] =>
  Array.from({ length: count }, (_, index) => later([make(index)].flat(), (index * seconds) / count)).flat()
