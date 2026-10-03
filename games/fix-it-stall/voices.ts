// Every voice of the game as plain numbers, in one place, so each can be held
// inside a stated range by a test and tuned by ear on a real machine without
// reading any drawing or rule code. Nothing here makes a sound: audio.ts turns
// a note into nodes with `tone` and `noise`.
//
// A voice is one to three notes started together or a little apart.

export type Note = {
  /** A pitched oscillator, or band-passed noise for anything that rasps, hisses or thuds. */
  kind: 'tone' | 'noise'
  /** Oscillator shape for a tone. */
  wave?: 'sine' | 'triangle' | 'square' | 'sawtooth'
  /** Hz: the oscillator's pitch, or the centre of the noise band. */
  pitch: number
  /** Where the pitch has slid to by the end, in Hz. Left out for a steady note. */
  glideTo?: number
  /** Loudest gain, 0 to 1, before the master. */
  peak: number
  /** Seconds to reach the peak. */
  attack: number
  /** Seconds from the peak to silence. */
  length: number
  /** Seconds after the voice starts. Left out for 0. */
  after?: number
  /** Sharpness of the noise band. Left out for 1. */
  q?: number
}

/** The ranges every note is held to by voices.test.ts. Quiet enough to stack three, and none longer than a breath. */
export const RANGE = {
  pitch: [55, 4200],
  peak: [0.02, 0.3],
  attack: [0.001, 0.09],
  length: [0.03, 1.2],
  after: [0, 0.35],
  q: [0.5, 14],
} as const

const tone = (wave: Note['wave'], pitch: number, peak: number, attack: number, length: number, glideTo?: number, after?: number): Note =>
  ({ kind: 'tone', wave, pitch, peak, attack, length, ...(glideTo ? { glideTo } : {}), ...(after ? { after } : {}) })
const hiss = (pitch: number, q: number, peak: number, attack: number, length: number, glideTo?: number, after?: number): Note =>
  ({ kind: 'noise', pitch, q, peak, attack, length, ...(glideTo ? { glideTo } : {}), ...(after ? { after } : {}) })

export const VOICES = {
  // --- Cell ------------------------------------------------------------------
  /** The loop goes live: a low hum comes up. */
  'cell-clip': [tone('sine', 110, 0.12, 0.06, 0.7), tone('triangle', 220, 0.05, 0.08, 0.6)],
  /** It tumbles end over end. */
  'cell-turn': [hiss(180, 1.2, 0.2, 0.004, 0.14), tone('sine', 95, 0.14, 0.004, 0.16, 70, 0.09)],
  /** A second cell nose to tail: the hum steps up a fifth. */
  'cell-second': [tone('sine', 165, 0.13, 0.05, 0.6), tone('triangle', 330, 0.05, 0.07, 0.5)],
  /** A short: the flag pops. */
  'cell-across': [tone('square', 620, 0.16, 0.002, 0.07, 240), hiss(900, 0.8, 0.14, 0.01, 0.4, 300, 0.03)],
  /** It hops on the mat. A flat one is `cell-flat-flick`. */
  'cell-flick': [tone('sine', 150, 0.2, 0.003, 0.13, 90)],
  /** A flat cell bounces twice, hollow. */
  'cell-flat-flick': [tone('triangle', 420, 0.14, 0.002, 0.07, 300), tone('triangle', 380, 0.09, 0.002, 0.06, 280, 0.16)],
  /** Two cells nose to nose lean on each other. */
  'cell-nose-to-nose': [tone('sawtooth', 82, 0.08, 0.08, 0.5, 78), tone('sawtooth', 87, 0.08, 0.08, 0.5, 91)],

  // --- Lead ------------------------------------------------------------------
  /** A clip bites: the second clack of a lead that closes a gap. */
  'lead-clip': [hiss(2400, 5, 0.2, 0.001, 0.045), tone('triangle', 1250, 0.07, 0.001, 0.05)],
  /** The clips swap ends: a double clack with a flourish. */
  'lead-turn': [hiss(2100, 5, 0.16, 0.001, 0.04), hiss(2700, 5, 0.16, 0.001, 0.04, undefined, 0.11), tone('sine', 700, 0.05, 0.02, 0.2, 1100, 0.14)],
  /** End to end with another: the longer way round, a lower clack. */
  'lead-second': [hiss(1700, 4, 0.18, 0.001, 0.055), tone('triangle', 880, 0.06, 0.001, 0.06)],
  /** Two leads plait together. */
  'lead-across': [tone('triangle', 520, 0.08, 0.004, 0.22, 660), tone('triangle', 660, 0.07, 0.004, 0.22, 520, 0.05)],
  /** A slack string: twang. Lower for a longer lead; this is a lead one unit long. */
  'lead-flick': [tone('triangle', 196, 0.16, 0.003, 0.5, 185)],
  /** Both clips on one pad: a loop of nothing sags. */
  'lead-loop-of-nothing': [tone('triangle', 147, 0.13, 0.004, 0.55, 110)],

  // --- Switch ----------------------------------------------------------------
  /** It seats in the loop. */
  'switch-clip': [hiss(1500, 3, 0.16, 0.001, 0.05), tone('square', 310, 0.05, 0.001, 0.04)],
  /** It spins on its base: a ratchet. */
  'switch-turn': [hiss(3200, 9, 0.11, 0.001, 0.03), hiss(3200, 9, 0.11, 0.001, 0.03, undefined, 0.06), hiss(3200, 9, 0.11, 0.001, 0.03, undefined, 0.12)],
  /** A second switch. */
  'switch-second': [hiss(1500, 3, 0.15, 0.001, 0.05), tone('square', 415, 0.05, 0.001, 0.04, undefined, 0.07)],
  /** A lead across it: the lever clicks to no effect. */
  'switch-across': [hiss(2600, 8, 0.1, 0.001, 0.03), tone('sine', 240, 0.06, 0.01, 0.18, 200, 0.04)],
  /** The lever throws. */
  'switch-flick': [hiss(1900, 6, 0.24, 0.001, 0.035), tone('square', 520, 0.07, 0.001, 0.03)],

  // --- Lamp ------------------------------------------------------------------
  /** The glass rings once as it lights. */
  'lamp-clip': [tone('sine', 1568, 0.12, 0.002, 0.7), tone('sine', 3136, 0.03, 0.002, 0.4)],
  /** Unscrewed and screwed back: a squeak. */
  'lamp-turn': [tone('sine', 1900, 0.06, 0.03, 0.12, 2500), tone('sine', 2500, 0.06, 0.03, 0.12, 1900, 0.17)],
  /** A second lamp: a second, lower ring. */
  'lamp-second': [tone('sine', 1175, 0.11, 0.002, 0.7), tone('sine', 2350, 0.03, 0.002, 0.4)],
  /** A lead across it: it goes dark with a falling ring. */
  'lamp-across': [tone('sine', 1568, 0.09, 0.002, 0.3, 780)],
  /** It rings like a glass. A blown one is `lamp-blown-flick`. */
  'lamp-flick': [tone('sine', 2093, 0.14, 0.001, 0.5)],
  /** A blown lamp rattles. */
  'lamp-blown-flick': [hiss(3600, 10, 0.1, 0.001, 0.03), hiss(3900, 10, 0.08, 0.001, 0.03, undefined, 0.05), hiss(3300, 10, 0.06, 0.001, 0.03, undefined, 0.11)],
  /** It flares and blows: pik. */
  'lamp-blow': [tone('square', 2800, 0.16, 0.001, 0.035), hiss(1400, 1.5, 0.1, 0.004, 0.3, 500, 0.02)],

  // --- Motor -----------------------------------------------------------------
  /** It spins up. */
  'motor-clip': [tone('sawtooth', 90, 0.09, 0.09, 0.8, 180), hiss(700, 1, 0.07, 0.09, 0.7, 1300)],
  /** Turned round: it spins the other way, a whirr that falls and comes back. */
  'motor-turn': [tone('sawtooth', 180, 0.09, 0.03, 0.4, 80), tone('sawtooth', 80, 0.09, 0.08, 0.5, 170, 0.3)],
  /** A second motor. */
  'motor-second': [tone('sawtooth', 120, 0.08, 0.09, 0.7, 150), hiss(600, 1, 0.06, 0.09, 0.6, 900)],
  /** A lead across it: it coasts down. */
  'motor-across': [tone('sawtooth', 170, 0.09, 0.01, 0.9, 60), hiss(1200, 1, 0.06, 0.01, 0.8, 400)],
  /** The blade freewheels and ticks to a stop. */
  'motor-flick': [hiss(2200, 6, 0.1, 0.001, 0.03), hiss(2000, 6, 0.09, 0.001, 0.03, undefined, 0.09), hiss(1800, 6, 0.07, 0.001, 0.03, undefined, 0.22)],
  /** Too many cells: it screams. */
  'motor-wild': [tone('sawtooth', 260, 0.13, 0.05, 0.9, 520), hiss(1800, 1.5, 0.1, 0.05, 0.8, 3200)],

  // --- Buzzer ----------------------------------------------------------------
  /** It rasps. */
  'buzzer-clip': [tone('square', 233, 0.1, 0.004, 0.6), hiss(2600, 2, 0.06, 0.004, 0.5)],
  /** It hops round on its feet: a tinny rattle. */
  'buzzer-turn': [hiss(2900, 12, 0.11, 0.001, 0.03), hiss(3100, 12, 0.09, 0.001, 0.03, undefined, 0.07), tone('square', 233, 0.05, 0.002, 0.1, undefined, 0.16)],
  /** Two side by side throb against each other. */
  'buzzer-second': [tone('square', 233, 0.09, 0.004, 0.9), tone('square', 239, 0.09, 0.004, 0.9)],
  /** Cut off in the middle of a rasp: a hiccup. */
  'buzzer-across': [tone('square', 233, 0.1, 0.002, 0.06, 466)],
  /** One dull tink of its tin cap. */
  'buzzer-flick': [tone('triangle', 980, 0.1, 0.001, 0.09), hiss(4000, 12, 0.05, 0.001, 0.03)],

  // --- Bench odds ------------------------------------------------------------
  /** It is laid in the gap. */
  'odd-clip': [hiss(1100, 2, 0.16, 0.002, 0.07), tone('triangle', 440, 0.05, 0.002, 0.08)],
  /** Turned end for end: a clatter. */
  'odd-turn': [hiss(1300, 2.5, 0.14, 0.002, 0.05), hiss(950, 2.5, 0.12, 0.002, 0.06, undefined, 0.09)],
  /** A second odd beside or after the first. */
  'odd-second': [hiss(800, 2, 0.15, 0.002, 0.08), tone('triangle', 330, 0.05, 0.002, 0.09)],
  /** A lead across it: it stops mattering, with a shrug of a slide. */
  'odd-across': [tone('sine', 392, 0.08, 0.01, 0.25, 294)],
  /** Each sounds as its material when flicked. */
  'odd-flick-spoon': [tone('sine', 2637, 0.13, 0.001, 0.9), tone('sine', 3951, 0.04, 0.001, 0.5)],
  'odd-flick-key': [tone('triangle', 3300, 0.09, 0.001, 0.12), tone('triangle', 3700, 0.08, 0.001, 0.12, undefined, 0.06), tone('triangle', 3000, 0.06, 0.001, 0.14, undefined, 0.13)],
  'odd-flick-foil': [hiss(3800, 3, 0.1, 0.001, 0.04), hiss(3200, 3, 0.09, 0.001, 0.05, undefined, 0.05), hiss(4100, 3, 0.07, 0.001, 0.04, undefined, 0.1)],
  'odd-flick-pencil': [tone('triangle', 740, 0.13, 0.001, 0.07), hiss(1600, 4, 0.07, 0.001, 0.04)],
  /** The rubber wobbles and makes next to nothing: a soft thud. */
  'odd-flick-rubber': [hiss(160, 0.8, 0.05, 0.01, 0.12)],
  'odd-flick-stick': [tone('triangle', 520, 0.13, 0.001, 0.06), hiss(1100, 3, 0.09, 0.001, 0.05)],
  'odd-flick-string': [hiss(500, 0.7, 0.06, 0.02, 0.18)],
} as const satisfies Record<string, readonly Note[]>

export type VoiceId = keyof typeof VOICES
export const VOICE_IDS = Object.keys(VOICES) as VoiceId[]
