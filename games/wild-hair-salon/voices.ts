import { MAX_LEN, MIN_LEN } from './rules'

// Every sound of the salon as plain numbers: what kind it is, its pitch, how
// loud its peak is, how fast it comes in and how long it lasts. Nobody could
// hear on the machine these were written on, so the numbers are held inside
// the ranges below by a test, and the loudness is the lead's to check on a
// real machine. The Mount turns a row into sound with the template's `tone`
// and `noise` (audio.ts); nothing here touches Web Audio.

export type VoiceSpec = {
  kind: 'tone' | 'noise'
  /** For a tone, the shape of the wave. */
  wave?: 'sine' | 'triangle' | 'square' | 'sawtooth'
  /** For a noise, how narrow the band is. */
  q?: number
  /** Hz: a tone's pitch, or the middle of a noise's band. */
  pitch: number
  /** Hz: where the pitch has slid to by the end. */
  glideTo?: number
  /** 0 to 1. */
  peak: number
  /** Seconds to reach the peak. */
  attack: number
  /** Seconds from the peak to silence. */
  length: number
}

/** The ranges every voice stays inside. */
export const VOICE_RANGE = {
  pitch: { min: 60, max: 4200 },
  peak: { min: 0.03, max: 0.25 },
  attack: { min: 0.001, max: 0.08 },
  length: { min: 0.04, max: 0.8 },
  q: { min: 0.5, max: 10 },
} as const

/** One voice for each cell of the grid, named object/action. No two are alike. */
export const CELL_VOICES = {
  'lock/pull': { kind: 'tone', wave: 'sawtooth', pitch: 300, glideTo: 180, peak: 0.1, attack: 0.012, length: 0.26 },
  'lock/snip': { kind: 'noise', q: 6, pitch: 3200, peak: 0.18, attack: 0.001, length: 0.07 },
  'lock/poke': { kind: 'tone', wave: 'triangle', pitch: 440, peak: 0.16, attack: 0.003, length: 0.5 },
  'lock/ruffle': { kind: 'noise', q: 0.8, pitch: 1800, peak: 0.08, attack: 0.02, length: 0.3 },
  'lock/ribbon': { kind: 'noise', q: 5, pitch: 1100, peak: 0.1, attack: 0.001, length: 0.05 },
  'model/pull': { kind: 'tone', wave: 'sine', pitch: 180, glideTo: 520, peak: 0.16, attack: 0.004, length: 0.35 },
  'model/snip': { kind: 'tone', wave: 'sine', pitch: 420, glideTo: 140, peak: 0.2, attack: 0.001, length: 0.12 },
  'model/poke': { kind: 'tone', wave: 'sine', pitch: 330, peak: 0.13, attack: 0.03, length: 0.45 },
  'model/ruffle': { kind: 'tone', wave: 'triangle', pitch: 660, glideTo: 880, peak: 0.1, attack: 0.01, length: 0.3 },
  'model/ribbon': { kind: 'tone', wave: 'sine', pitch: 300, glideTo: 170, peak: 0.08, attack: 0.01, length: 0.14 },
  'tuft/pull': { kind: 'tone', wave: 'sine', pitch: 400, glideTo: 1200, peak: 0.1, attack: 0.02, length: 0.4 },
  'tuft/snip': { kind: 'noise', q: 0.7, pitch: 500, peak: 0.14, attack: 0.005, length: 0.18 },
  'tuft/poke': { kind: 'tone', wave: 'triangle', pitch: 140, glideTo: 320, peak: 0.16, attack: 0.002, length: 0.4 },
  'tuft/ruffle': { kind: 'noise', q: 2, pitch: 4000, peak: 0.06, attack: 0.001, length: 0.5 },
  'tuft/ribbon': { kind: 'tone', wave: 'sine', pitch: 2093, peak: 0.09, attack: 0.001, length: 0.6 },
  'ribbon/pull': { kind: 'tone', wave: 'square', pitch: 90, peak: 0.06, attack: 0.001, length: 0.04 },
  'ribbon/snip': { kind: 'noise', q: 1.2, pitch: 2400, peak: 0.07, attack: 0.01, length: 0.6 },
  'ribbon/poke': { kind: 'noise', q: 1.5, pitch: 420, peak: 0.14, attack: 0.002, length: 0.09 },
  'ribbon/ruffle': { kind: 'noise', q: 5, pitch: 700, glideTo: 1800, peak: 0.08, attack: 0.03, length: 0.5 },
  'ribbon/ribbon': { kind: 'noise', q: 4, pitch: 1200, glideTo: 3000, peak: 0.09, attack: 0.005, length: 0.22 },
  'clipping/pull': { kind: 'noise', q: 3, pitch: 2100, peak: 0.05, attack: 0.01, length: 0.15 },
  'clipping/snip': { kind: 'noise', q: 8, pitch: 3800, peak: 0.12, attack: 0.001, length: 0.045 },
  'clipping/poke': { kind: 'tone', wave: 'square', pitch: 1800, peak: 0.05, attack: 0.001, length: 0.04 },
  'clipping/ruffle': { kind: 'noise', q: 1, pitch: 160, peak: 0.07, attack: 0.04, length: 0.45 },
  'clipping/ribbon': { kind: 'noise', q: 1, pitch: 300, peak: 0.08, attack: 0.003, length: 0.1 },
  'face/pull': { kind: 'tone', wave: 'sine', pitch: 520, glideTo: 160, peak: 0.2, attack: 0.004, length: 0.28 },
  'face/snip': { kind: 'noise', q: 9, pitch: 2600, peak: 0.1, attack: 0.001, length: 0.1 },
  'face/poke': { kind: 'tone', wave: 'triangle', pitch: 560, glideTo: 700, peak: 0.13, attack: 0.005, length: 0.22 },
  'face/ruffle': { kind: 'tone', wave: 'sine', pitch: 100, peak: 0.1, attack: 0.05, length: 0.7 },
  'face/ribbon': { kind: 'noise', q: 1, pitch: 1600, peak: 0.06, attack: 0.02, length: 0.35 },
} as const satisfies Record<string, VoiceSpec>

export type CellVoiceId = keyof typeof CELL_VOICES

/** The sounds that belong to no cell, or come second in one: the scissors arriving in the hand, a lock caught, the cape, the door, a piece that sticks on a face, fluff that blows away, the voice behind a blindfold. */
export const OTHER_VOICES = {
  scissors: { kind: 'tone', wave: 'triangle', pitch: 2600, glideTo: 3400, peak: 0.06, attack: 0.001, length: 0.12 },
  caught: { kind: 'tone', wave: 'sine', pitch: 900, glideTo: 1100, peak: 0.08, attack: 0.002, length: 0.06 },
  letGo: { kind: 'tone', wave: 'sine', pitch: 260, glideTo: 150, peak: 0.12, attack: 0.003, length: 0.2 },
  capeOff: { kind: 'noise', q: 0.7, pitch: 500, glideTo: 1500, peak: 0.14, attack: 0.03, length: 0.5 },
  capeOn: { kind: 'noise', q: 0.7, pitch: 1400, glideTo: 450, peak: 0.12, attack: 0.02, length: 0.4 },
  door: { kind: 'tone', wave: 'sine', pitch: 784, glideTo: 1047, peak: 0.1, attack: 0.004, length: 0.5 },
  hop: { kind: 'tone', wave: 'sine', pitch: 200, glideTo: 380, peak: 0.1, attack: 0.004, length: 0.14 },
  airSnip: { kind: 'noise', q: 7, pitch: 2900, peak: 0.07, attack: 0.001, length: 0.05 },
  smack: { kind: 'noise', q: 1, pitch: 600, peak: 0.2, attack: 0.002, length: 0.06 },
  sigh: { kind: 'noise', q: 0.6, pitch: 900, glideTo: 500, peak: 0.05, attack: 0.06, length: 0.5 },
  ooh: { kind: 'tone', wave: 'sine', pitch: 330, glideTo: 440, peak: 0.1, attack: 0.04, length: 0.3 },
} as const satisfies Record<string, VoiceSpec>

/** A head rub is answered by each customer in its own way, and each answer has its sound: a purr, a huff, a groan, a drumming foot. */
export const RUB_VOICES = {
  lion: { kind: 'tone', wave: 'sine', pitch: 100, peak: 0.1, attack: 0.05, length: 0.7 },
  poodle: { kind: 'noise', q: 1, pitch: 750, peak: 0.08, attack: 0.02, length: 0.2 },
  yak: { kind: 'tone', wave: 'sawtooth', pitch: 90, glideTo: 68, peak: 0.09, attack: 0.08, length: 0.8 },
  rabbit: { kind: 'tone', wave: 'square', pitch: 150, peak: 0.08, attack: 0.001, length: 0.05 },
} as const satisfies Record<string, VoiceSpec>

/** What a customer answers with the cape off: to its lock, its mane, a bow, and something on its face. */
export const SAID = ['lockTooLong', 'lockTooShort', 'lockAsLong', 'maneLiked', 'maneHated', 'bowLoved', 'bowHated', 'wearing', 'blindfolded'] as const
export type Said = (typeof SAID)[number]
type Spoken = VoiceSpec & { after?: number }

const ooh = (pitch: number): Spoken[] => [{ kind: 'tone', wave: 'sine', pitch, glideTo: pitch * 1.33, peak: 0.1, attack: 0.04, length: 0.3 }]
const taps = (spec: VoiceSpec, ...at: number[]): Spoken[] => at.map((after) => ({ ...spec, after }))

/**
 * Each of those answers has a sound of the customer's own, the one the sheet
 * names for it: the lion rumbles, the poodle sneezes three times and gasps,
 * the yak chuckles, snorts and hums, the rabbit thumps. None is a cheer and
 * none a buzzer: each is the noise that animal makes about its hair. At most
 * four notes each.
 */
export const SAID_VOICES: Record<'lion' | 'poodle' | 'yak' | 'rabbit', Record<Said, readonly Spoken[]>> = {
  lion: {
    // He stamps with a thud and goes down in a long low "oof".
    lockTooLong: [{ kind: 'tone', wave: 'sine', pitch: 110, glideTo: 70, peak: 0.12, attack: 0.002, length: 0.2 }, { kind: 'tone', wave: 'triangle', pitch: 150, glideTo: 90, peak: 0.1, attack: 0.05, length: 0.6, after: 0.35 }],
    lockTooShort: [{ kind: 'tone', wave: 'sine', pitch: 196, glideTo: 262, peak: 0.1, attack: 0.03, length: 0.3 }, ...taps({ kind: 'noise', q: 3, pitch: 2000, peak: 0.05, attack: 0.001, length: 0.04 }, 0.5, 0.62, 0.74)],
    // One note for each way of the toss, the second a little under the first: it does not rise where his other two fall.
    lockAsLong: [{ kind: 'tone', wave: 'sine', pitch: 196, peak: 0.1, attack: 0.04, length: 0.4 }, { kind: 'tone', wave: 'sine', pitch: 185, peak: 0.1, attack: 0.04, length: 0.4, after: 0.55 }],
    // The rumble.
    maneLiked: [{ kind: 'tone', wave: 'sawtooth', pitch: 72, glideTo: 62, peak: 0.1, attack: 0.08, length: 0.8 }],
    maneHated: [{ kind: 'tone', wave: 'sine', pitch: 180, glideTo: 110, peak: 0.09, attack: 0.04, length: 0.5 }],
    bowLoved: ooh(196),
    // Three swipes of a paw.
    bowHated: taps({ kind: 'noise', q: 1, pitch: 900, peak: 0.07, attack: 0.005, length: 0.06 }, 0.3, 0.6, 0.9),
    wearing: ooh(175),
    blindfolded: ooh(220),
  },
  poodle: {
    // She spins out of it and holds the pose.
    lockTooLong: [{ kind: 'tone', wave: 'sine', pitch: 523, glideTo: 1047, peak: 0.09, attack: 0.02, length: 0.45, after: 0.15 }, { kind: 'tone', wave: 'triangle', pitch: 784, peak: 0.08, attack: 0.005, length: 0.2, after: 0.7 }],
    // A gasp, and the flutter of a paw.
    lockTooShort: [{ kind: 'noise', q: 0.8, pitch: 1400, glideTo: 2400, peak: 0.09, attack: 0.08, length: 0.25 }, ...taps({ kind: 'noise', q: 2, pitch: 900, peak: 0.05, attack: 0.002, length: 0.04 }, 0.35, 0.47, 0.59)],
    lockAsLong: [{ kind: 'tone', wave: 'sine', pitch: 523, glideTo: 659, peak: 0.09, attack: 0.03, length: 0.5 }],
    // Tiptoe.
    maneLiked: taps({ kind: 'tone', wave: 'sine', pitch: 1047, peak: 0.07, attack: 0.002, length: 0.06 }, 0, 0.28, 0.56, 0.84),
    // Three sneezes, each bigger.
    maneHated: [{ kind: 'noise', q: 1.5, pitch: 1800, peak: 0.05, attack: 0.004, length: 0.08, after: 0.1 }, { kind: 'noise', q: 1.5, pitch: 1700, peak: 0.08, attack: 0.004, length: 0.1, after: 0.4 }, { kind: 'noise', q: 1.5, pitch: 1500, peak: 0.13, attack: 0.004, length: 0.16, after: 0.75 }],
    bowLoved: taps({ kind: 'tone', wave: 'sine', pitch: 659, glideTo: 784, peak: 0.08, attack: 0.02, length: 0.22 }, 0, 0.35, 0.7),
    bowHated: [{ kind: 'noise', q: 2, pitch: 2200, peak: 0.07, attack: 0.005, length: 0.12, after: 0.15 }],
    wearing: ooh(587),
    blindfolded: [{ kind: 'tone', wave: 'sine', pitch: 880, glideTo: 1320, peak: 0.09, attack: 0.01, length: 0.2, after: 0.35 }],
  },
  yak: {
    // He chews, thinking.
    lockTooLong: taps({ kind: 'noise', q: 2, pitch: 260, peak: 0.08, attack: 0.01, length: 0.08 }, 0.4, 0.75, 1.1),
    // The snort.
    lockTooShort: [{ kind: 'noise', q: 0.7, pitch: 500, peak: 0.13, attack: 0.01, length: 0.18, after: 0.5 }],
    // The low hum.
    lockAsLong: [{ kind: 'tone', wave: 'sine', pitch: 131, peak: 0.1, attack: 0.08, length: 0.8 }, { kind: 'tone', wave: 'sine', pitch: 123, peak: 0.09, attack: 0.08, length: 0.7, after: 0.7 }],
    // The low chuckle.
    maneLiked: taps({ kind: 'tone', wave: 'sine', pitch: 110, peak: 0.1, attack: 0.01, length: 0.12 }, 0.55, 0.7, 0.85),
    maneHated: [{ kind: 'tone', wave: 'sawtooth', pitch: 120, glideTo: 80, peak: 0.08, attack: 0.08, length: 0.8 }],
    // Two pats of a hoof.
    bowLoved: taps({ kind: 'noise', q: 1, pitch: 300, peak: 0.08, attack: 0.003, length: 0.05 }, 0.3, 0.7),
    bowHated: [{ kind: 'noise', q: 0.6, pitch: 400, peak: 0.08, attack: 0.08, length: 0.8 }],
    wearing: ooh(120),
    blindfolded: [{ kind: 'tone', wave: 'sine', pitch: 131, glideTo: 175, peak: 0.1, attack: 0.05, length: 0.4, after: 0.9 }],
  },
  rabbit: {
    // Wound up one way, and back the other.
    lockTooLong: [{ kind: 'noise', q: 5, pitch: 700, glideTo: 1800, peak: 0.08, attack: 0.02, length: 0.35 }, { kind: 'noise', q: 5, pitch: 1800, glideTo: 700, peak: 0.08, attack: 0.02, length: 0.35, after: 0.45 }],
    // The ears shoot up, and one droops.
    lockTooShort: [{ kind: 'tone', wave: 'sine', pitch: 784, glideTo: 1175, peak: 0.09, attack: 0.002, length: 0.1 }, { kind: 'tone', wave: 'sine', pitch: 587, glideTo: 330, peak: 0.08, attack: 0.02, length: 0.4, after: 0.3 }],
    lockAsLong: [{ kind: 'tone', wave: 'sine', pitch: 392, glideTo: 784, peak: 0.1, attack: 0.004, length: 0.2 }],
    maneLiked: taps({ kind: 'tone', wave: 'sine', pitch: 880, glideTo: 1175, peak: 0.08, attack: 0.002, length: 0.08 }, 0, 0.15, 0.3),
    maneHated: [{ kind: 'tone', wave: 'sine', pitch: 392, glideTo: 196, peak: 0.08, attack: 0.02, length: 0.3 }, ...taps({ kind: 'tone', wave: 'sine', pitch: 200, glideTo: 380, peak: 0.08, attack: 0.004, length: 0.1 }, 0.1, 0.35, 0.6)],
    bowLoved: ooh(440),
    // A hind foot, four times.
    bowHated: taps({ kind: 'tone', wave: 'square', pitch: 120, peak: 0.09, attack: 0.001, length: 0.05 }, 0, 0.12, 0.24, 0.36),
    wearing: ooh(494),
    blindfolded: [{ kind: 'tone', wave: 'sine', pitch: 660, glideTo: 990, peak: 0.09, attack: 0.01, length: 0.15, after: 0.3 }],
  },
}

/** A string is lower the longer it is: two octaves from a stub to a lock that reaches the floor. */
export function pitchForLength(steps: number): number {
  const t = Math.max(0, Math.min(1, (steps - MIN_LEN) / (MAX_LEN - MIN_LEN)))
  return 880 * 2 ** (-2 * t)
}

/** A voice moved onto a customer's own pitch, for the giggles, hums and squeaks that are in that animal's voice. */
export function inVoice(spec: VoiceSpec, voiceHz: number, base = 330): VoiceSpec {
  const ratio = voiceHz / base
  const clamp = (hz: number): number => Math.max(VOICE_RANGE.pitch.min, Math.min(VOICE_RANGE.pitch.max, hz))
  return { ...spec, pitch: clamp(spec.pitch * ratio), ...(spec.glideTo === undefined ? {} : { glideTo: clamp(spec.glideTo * ratio) }) }
}

/** Whether two voices could be taken for each other: the same kind, nearly the same pitch, moving the same way, for nearly as long. */
export function alike(a: VoiceSpec, b: VoiceSpec): boolean {
  if (a.kind !== b.kind) return false
  const slide = (v: VoiceSpec): number => (v.glideTo === undefined ? 0 : Math.sign(v.glideTo - v.pitch))
  const near = (x: number, y: number, by: number): boolean => Math.max(x, y) / Math.min(x, y) < by
  return near(a.pitch, b.pitch, 1.12) && slide(a) === slide(b) && near(a.length, b.length, 1.5)
}
