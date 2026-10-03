// Every sound of the bakery, held as plain numbers. Nobody who writes this game
// can hear it, so a voice is a short list of notes that a test can hold inside
// stated ranges (voices.test.ts): how high, how loud, how long, how many at
// once. `voiceOf` is the one bridge from the numbers to the speaker.
//
// The speaker is a small one in a child's hands, and loses most of what lies
// under 150 Hz. So every voice is short and soft, every thud carries a band of
// noise or a note from 150 Hz up, and the badger is low only next to the goat
// and the sparrows. Nothing here is a word: the animals have invented voices.

import { noise, tone, type Voice } from './audio'

/** One enveloped oscillator or one band of noise, starting `at` seconds into the voice. */
export type Note =
  | { kind: 'tone'; at: number; frequency: number; glideTo?: number; wave: OscillatorType; peak: number; attack: number; decay: number }
  | { kind: 'noise'; at: number; frequency: number; glideTo?: number; q: number; peak: number; attack: number; decay: number }
export type VoiceSpec = readonly Note[]

// The two rows of the table below, in the order `tone` and `noise` take them, so a row reads like the call it becomes.
const t = (at: number, frequency: number, wave: OscillatorType, peak: number, attack: number, decay: number, glideTo?: number): Note =>
  glideTo === undefined ? { kind: 'tone', at, frequency, wave, peak, attack, decay } : { kind: 'tone', at, frequency, glideTo, wave, peak, attack, decay }
const n = (at: number, frequency: number, q: number, peak: number, attack: number, decay: number, glideTo?: number): Note =>
  glideTo === undefined ? { kind: 'noise', at, frequency, q, peak, attack, decay } : { kind: 'noise', at, frequency, glideTo, q, peak, attack, decay }

export const VOICES = {
  // ---- The stuff on the board (ART.md, "The toy" and the grid) ----

  // A heap of flour slumping out: a wide hiss that falls, with a little body under it.
  'flour-hiss': [n(0, 4200, 0.7, 0.14, 0.02, 0.23, 1800), n(0.02, 1400, 0.8, 0.06, 0.03, 0.18, 700)],
  // A finger furrowing dry dust: a narrow band that scrapes up, and a grain catching.
  'dry-scrape': [n(0, 2600, 2.5, 0.13, 0.008, 0.11, 3400), n(0.03, 3100, 3, 0.07, 0.005, 0.06, 2400)],
  // Water poured: three bubbles gliding up over a faint wash.
  'gurgle': [t(0, 180, 'sine', 0.14, 0.01, 0.09, 300), t(0.1, 150, 'sine', 0.13, 0.01, 0.1, 270), t(0.21, 200, 'sine', 0.12, 0.01, 0.12, 360), n(0, 900, 1.2, 0.05, 0.03, 0.3, 600)],
  // One drop.
  'plip': [t(0, 700, 'sine', 0.14, 0.004, 0.075, 1300)],
  // Thick batter creeping: a slow double blip, down and then up.
  'glug': [t(0, 180, 'sine', 0.17, 0.02, 0.1, 130), t(0.16, 150, 'sine', 0.16, 0.02, 0.12, 200)],
  // A slap on batter: the thud, then the wet of it closing over.
  'slap-ripple': [t(0, 170, 'sine', 0.18, 0.004, 0.09, 100), n(0.005, 1500, 1.5, 0.12, 0.005, 0.17, 700)],
  // A wet clod dropping: dull, with a little splat.
  'wet-clod': [t(0, 120, 'triangle', 0.17, 0.005, 0.16, 70), n(0, 600, 1, 0.07, 0.005, 0.08, 350)],
  // A finger on streaky dough: the sticky pull slides down, then a low pat.
  'sticky-smack': [n(0, 2200, 3, 0.13, 0.004, 0.1, 700), t(0.03, 190, 'sine', 0.14, 0.005, 0.11, 130)],
  // A shaggy lump flopping. The quiet triangle is what a small speaker carries of it.
  'dull-flop': [t(0, 105, 'sine', 0.2, 0.008, 0.18, 62), t(0, 210, 'triangle', 0.05, 0.006, 0.07, 140)],
  // Rough dough ripping short: two ragged bursts falling, and the lobe dropping back.
  'tear': [n(0, 1900, 1.8, 0.14, 0.003, 0.05, 1200), n(0.035, 1300, 2.2, 0.1, 0.003, 0.06, 700), t(0.06, 160, 'sine', 0.12, 0.004, 0.06, 95)],
  // Smooth dough slapped down: round and low, with a tiny edge.
  'dough-slap': [t(0, 150, 'sine', 0.2, 0.004, 0.17, 90), n(0, 2400, 1.2, 0.06, 0.002, 0.03)],
  // The push into dough, heard hundreds of times. Wide and low so it has no pitch to tire of, and the quietest of the thuds.
  'squish': [n(0, 560, 0.8, 0.16, 0.008, 0.13, 190), t(0, 130, 'sine', 0.1, 0.01, 0.12, 95)],
  // Worked dough stretching: a faint note rising a fifth.
  'stretch-rise': [t(0, 300, 'sine', 0.08, 0.06, 0.29, 450)],
  // A long lump gathered round: two quick pats, the second a little higher.
  'gather-pat': [t(0, 200, 'sine', 0.13, 0.004, 0.07, 140), n(0, 900, 1, 0.05, 0.003, 0.04), t(0.11, 230, 'sine', 0.12, 0.004, 0.08, 160), n(0.11, 1000, 1, 0.05, 0.003, 0.04)],
  // A scoop of flour landing on the badger: a low whump and the puff after it.
  'flour-whump': [t(0, 110, 'sine', 0.18, 0.01, 0.16, 65), n(0.02, 3000, 0.7, 0.11, 0.04, 0.24, 1500)],
  // Water running off the board onto the floor: five drops, each lower, not quite in time.
  'water-drips': [t(0, 1000, 'sine', 0.12, 0.004, 0.07, 1500), t(0.09, 900, 'sine', 0.11, 0.004, 0.07, 1350), t(0.2, 800, 'sine', 0.1, 0.004, 0.07, 1200), t(0.29, 700, 'sine', 0.09, 0.004, 0.07, 1050), t(0.41, 620, 'sine', 0.08, 0.004, 0.07, 930)],

  // ---- The room ----

  // A knuckle on the bench.
  'bench-knock': [t(0, 250, 'triangle', 0.2, 0.003, 0.067, 150), n(0, 1800, 2, 0.06, 0.002, 0.02)],
  // The peel is thinner wood: higher and drier.
  'peel-knock': [t(0, 330, 'triangle', 0.18, 0.002, 0.05, 210), n(0, 2600, 3, 0.07, 0.002, 0.015)],
  'wall-tick': [n(0, 3800, 6, 0.1, 0.002, 0.03)],
  // A knock on a crust: two partials, so it sounds hollow.
  'loaf-knock': [t(0, 290, 'sine', 0.17, 0.003, 0.11, 240), t(0, 610, 'sine', 0.08, 0.003, 0.07, 540)],
  'frost-tinkle': [t(0, 3100, 'sine', 0.06, 0.002, 0.05), t(0.06, 3900, 'sine', 0.05, 0.002, 0.05), t(0.13, 3500, 'sine', 0.05, 0.002, 0.06)],
  // Cloth: one brush up and one back.
  'sack-rustle': [n(0, 1500, 1.2, 0.1, 0.03, 0.08, 2100), n(0.09, 1900, 1.2, 0.08, 0.03, 0.08, 1300)],
  // A glazed jug touched: one clear ping, and the glaze over it.
  'jug-clink': [t(0, 1200, 'sine', 0.13, 0.002, 0.16), t(0, 2850, 'sine', 0.04, 0.002, 0.07)],
  'fire-crackle': [n(0, 2400, 4, 0.11, 0.002, 0.018), n(0.05, 1700, 4, 0.08, 0.002, 0.018)],
  // The oven breathing: a slow low swell.
  'fire-whoosh': [n(0, 260, 0.7, 0.16, 0.16, 0.24, 420)],

  // ---- The animals (ART.md, "The characters") ----

  // The badger is the low voice of the room. A sneeze is the breath in, a beat, and the burst.
  'badger-sneeze': [n(0, 700, 3, 0.07, 0.24, 0.04, 2200), n(0.3, 2600, 0.8, 0.2, 0.006, 0.14, 1100), t(0.3, 220, 'triangle', 0.1, 0.006, 0.12, 140)],
  // A wobble that ends by asking.
  'badger-grumble': [t(0, 150, 'triangle', 0.14, 0.02, 0.08, 135), t(0.09, 142, 'triangle', 0.14, 0.02, 0.08, 158), t(0.18, 152, 'triangle', 0.14, 0.02, 0.08, 137), t(0.27, 147, 'triangle', 0.15, 0.02, 0.11, 225)],
  // Four short hops, the last one sinking.
  'badger-chuckle': [t(0, 190, 'triangle', 0.14, 0.008, 0.06, 160), t(0.1, 205, 'triangle', 0.14, 0.008, 0.06, 170), t(0.2, 190, 'triangle', 0.13, 0.008, 0.06, 155), t(0.3, 170, 'triangle', 0.12, 0.008, 0.08, 130)],
  // Dough licked off a paw: a narrow band sweeping up, and the pop of the lips.
  'badger-slurp': [n(0, 500, 5, 0.13, 0.03, 0.27, 2800), t(0.32, 240, 'sine', 0.17, 0.004, 0.07, 140)],
  'badger-hm': [t(0, 160, 'triangle', 0.14, 0.03, 0.15, 148)],
  // Horn on the hatch post. One knock: the game plays it twice.
  'goat-tock': [t(0, 480, 'triangle', 0.2, 0.002, 0.055, 380), t(0, 1150, 'sine', 0.08, 0.002, 0.03)],
  // The goat is reedy. The wobble is four stepped notes, and the saw is kept quiet because it is the harshest wave here.
  'goat-bleat': [t(0, 330, 'sawtooth', 0.07, 0.02, 0.08), t(0.09, 352, 'sawtooth', 0.07, 0.02, 0.08), t(0.18, 322, 'sawtooth', 0.07, 0.02, 0.08), t(0.27, 345, 'sawtooth', 0.07, 0.02, 0.11, 300)],
  'goat-snort': [n(0, 800, 1.5, 0.15, 0.008, 0.08, 450)],
  // The sparrows are the highest thing in the room.
  'sparrow-chirp': [t(0, 2500, 'sine', 0.1, 0.004, 0.056, 3200)],
  'sparrow-cheep': [t(0, 3400, 'sine', 0.09, 0.004, 0.07, 2700), t(0.11, 3000, 'sine', 0.09, 0.004, 0.08, 2300)],
  // Wings: four soft ticks.
  'sparrow-flutter': [n(0, 1400, 2, 0.08, 0.004, 0.025), n(0.05, 1600, 2, 0.08, 0.004, 0.025), n(0.1, 1300, 2, 0.07, 0.004, 0.025), n(0.15, 1500, 2, 0.06, 0.004, 0.025)],
} as const satisfies Record<string, VoiceSpec>

export type VoiceName = keyof typeof VOICES
export const VOICE_NAMES: readonly VoiceName[] = Object.keys(VOICES) as VoiceName[]

/** How far a caller may bend a voice. Past these a voice stops being itself, or stops being soft. */
export const PITCH_RANGE: readonly [number, number] = [0.5, 2]
export const GAIN_RANGE: readonly [number, number] = [0, 1.5]

// A sound is played inside a touch handler, and Web Audio throws on a frequency that is zero or not a number: a bad factor must never stop the touch.
const within = (value: number, [low, high]: readonly [number, number]): number =>
  Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : 1

/** The bridge from numbers to sound: plays the notes with every frequency times `pitch` and every peak times `gain`. */
export function voiceOf(name: VoiceName, pitch = 1, gain = 1): Voice {
  const spec: VoiceSpec = VOICES[name]
  const p = within(pitch, PITCH_RANGE)
  const g = within(gain, GAIN_RANGE)
  return (context, out, at) => {
    for (const note of spec) {
      const glideTo = note.glideTo === undefined ? undefined : note.glideTo * p
      if (note.kind === 'tone') tone(context, out, at + note.at, note.frequency * p, note.wave, note.peak * g, note.attack, note.decay, glideTo)
      else noise(context, out, at + note.at, note.frequency * p, note.q, note.peak * g, note.attack, note.decay, glideTo)
    }
  }
}

// Seven, so a voice played on every second or third count still walks the whole table, and in no order of pitch, so a run of repeats is not a tune.
const VARIANTS: readonly { pitch: number; gain: number }[] = [
  { pitch: 1, gain: 1 }, { pitch: 1.06, gain: 0.92 }, { pitch: 0.94, gain: 0.96 }, { pitch: 1.1, gain: 0.88 },
  { pitch: 0.9, gain: 0.9 }, { pitch: 1.03, gain: 0.95 }, { pitch: 0.97, gain: 0.86 },
]

/**
 * A few variants of one voice so repeats do not sound stamped: `n` is any whole number (a counter); returns a pitch
 * and gain near 1 from a fixed small table, never the same twice in a row. Pure.
 */
export function variant(n: number): { pitch: number; gain: number } {
  const count = Number.isFinite(n) ? Math.floor(n) : 0
  const { pitch, gain } = VARIANTS[((count % VARIANTS.length) + VARIANTS.length) % VARIANTS.length]
  return { pitch, gain }
}

/** Total length in seconds of a spec (latest at + attack + decay). */
export function lengthOf(spec: VoiceSpec): number {
  return spec.reduce((length, note) => Math.max(length, note.at + note.attack + note.decay), 0)
}
