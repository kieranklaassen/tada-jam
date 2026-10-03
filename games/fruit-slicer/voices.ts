// Every sound of the game as plain numbers: pitch, peak, attack and length.
// Nobody who builds on a machine without a sound card can hear them, so they
// are kept here in one pure module, each inside a range the test states, for
// the first person with ears to tune. audio.ts turns a note into sound; this
// module never touches it.
//
// One rule runs through all of them: a length rings as a string does. The
// shorter the thing that was cut, poked or struck, the higher it sounds, and
// half the length is an octave up.

export type Note = {
  /** A pitched tone, or a band of noise round a pitch. */
  kind: 'tone' | 'noise'
  hz: number
  /** Where the pitch glides to by the end of the note, if it moves. */
  to?: number
  wave?: 'sine' | 'triangle' | 'square' | 'sawtooth'
  /** Loudness at its peak, 0 to 1. */
  peak: number
  /** Seconds to reach the peak, and seconds to die away after it. */
  attack: number
  length: number
  /** Seconds after the touch at which the note starts. */
  after?: number
}

/** The lowest note in the game: the longest fruit, whole. */
export const LOW_HZ = 110
const LONGEST = 2400
/** The ranges every note stays in. */
export const RANGE = { hz: [50, 5000], peak: [0.02, 0.3], attack: [0.001, 0.08], length: [0.03, 0.9], after: [0, 0.6], total: 1.2 } as const

/** The note a length rings, in hertz: half the length, an octave up. Held inside the range the ear and a tablet's speaker manage. */
export function ringHz(length: number): number {
  const hz = length > 0 ? (LOW_HZ * LONGEST) / length : LOW_HZ
  return Math.max(LOW_HZ, Math.min(2640, hz))
}

/** A pitch held inside the range, however short the piece that set it. */
const held = (hz: number): number => Math.max(RANGE.hz[0], Math.min(RANGE.hz[1], hz))
const tone = (hz: number, peak: number, attack: number, length: number, wave: Note['wave'] = 'triangle', to?: number, after = 0): Note => ({ kind: 'tone', hz: held(hz), to: to === undefined ? undefined : held(to), wave, peak, attack, length, after })
const hiss = (hz: number, peak: number, attack: number, length: number, to?: number, after = 0): Note => ({ kind: 'noise', hz: held(hz), to: to === undefined ? undefined : held(to), peak, attack, length, after })
/** A run of the same short note, `count` times, each a step higher: one tick a part. */
const run = (count: number, hz: number, step: number, gap: number, peak: number, wave: Note['wave'] = 'square', length = 0.05): Note[] => {
  const ticks = Math.max(1, Math.min(12, Math.round(count)))
  // Many parts tick faster, so the whole run still ends inside the time a touch's answer may take.
  const apart = ticks > 1 ? Math.min(gap, 0.55 / (ticks - 1)) : 0
  return Array.from({ length: ticks }, (_, i) => tone(hz * step ** i, peak, 0.002, length, wave, undefined, i * apart))
}

/**
 * Each voice, from the length it is about (in points) and, where it counts something, a count. A voice that
 * has nothing to do with a length ignores it.
 */
export const VOICES = {
  // The slice and what surrounds it.
  ring: () => [tone(2600, 0.07, 0.002, 0.16, 'triangle', 1900)],
  tickEnd: () => [tone(1500, 0.05, 0.001, 0.04, 'square')],
  // A finger takes hold of a piece: a small wet pop, at the pitch of its length.
  pick: (length: number) => [tone(ringHz(length) * 1.5, 0.12, 0.002, 0.05, 'sine', ringHz(length) * 2.2), hiss(1200, 0.04, 0.002, 0.03)],
  // A customer steps up to the window: two soft footfalls.
  step: () => [tone(150, 0.14, 0.004, 0.09, 'sine', 110), tone(170, 0.12, 0.004, 0.09, 'sine', 120, 0.16)],
  whistle: () => [hiss(900, 0.08, 0.02, 0.2, 2600)],
  curl: () => [hiss(3200, 0.06, 0.004, 0.12, 4200), tone(1800, 0.04, 0.002, 0.2, 'sine', 2500, 0.05)],
  thwack: (length: number) => [hiss(ringHz(length) * 3, 0.24, 0.002, 0.14, ringHz(length) * 1.2), tone(ringHz(length), 0.2, 0.003, 0.22, 'triangle', ringHz(length) * 0.7), hiss(600, 0.08, 0.03, 0.3, 240, 0.05)],
  snick: (length: number) => [hiss(ringHz(length) * 3, 0.18, 0.002, 0.08, ringHz(length) * 1.5), tone(ringHz(length), 0.18, 0.002, 0.14, 'triangle', ringHz(length) * 0.8)],
  // A fruit or a piece, struck, laid, flung or rolled.
  quiver: (length: number) => [tone(ringHz(length), 0.2, 0.006, 0.5, 'sine', ringHz(length) * 0.94), tone(ringHz(length) * 2, 0.05, 0.006, 0.3, 'sine')],
  pluck: (length: number) => [tone(ringHz(length), 0.22, 0.002, 0.42, 'triangle'), tone(ringHz(length) * 2, 0.06, 0.002, 0.2, 'sine')],
  lay: (length: number) => [tone(ringHz(length) * 0.5, 0.16, 0.004, 0.12, 'sine', ringHz(length) * 0.4), hiss(400, 0.05, 0.004, 0.08)],
  // A wet smack as two cut ends meet.
  butt: (length: number) => [hiss(700, 0.2, 0.001, 0.07, 300), tone(ringHz(length) * 0.75, 0.12, 0.002, 0.09, 'sine', ringHz(length) * 0.5)],
  boing: (length: number) => [tone(ringHz(length) * 0.6, 0.2, 0.004, 0.45, 'sine', ringHz(length) * 1.3)],
  clack: (length: number) => [tone(ringHz(length) * 2, 0.16, 0.001, 0.05, 'square'), hiss(2200, 0.08, 0.001, 0.04)],
  ticks: (_: number, count = 4) => run(count, 700, 1.06, 0.07, 0.08),
  // One tick a part, higher the shorter the piece the parts are pressed into.
  press: (length: number, count = 4) => run(count, Math.max(900, Math.min(2400, ringHz(length) * 4)), 1.05, 0.05, 0.07),
  // The tin.
  skid: (length: number) => [hiss(4200, 0.14, 0.001, 0.1, 3000), tone(ringHz(length) * 2, 0.14, 0.001, 0.6, 'square', ringHz(length) * 1.98)],
  castanet: () => [tone(1300, 0.14, 0.001, 0.04, 'square'), tone(1300, 0.12, 0.001, 0.04, 'square', undefined, 0.09)],
  rattle: () => [hiss(1800, 0.1, 0.002, 0.05), hiss(1700, 0.08, 0.002, 0.05, undefined, 0.07), hiss(1900, 0.06, 0.002, 0.05, undefined, 0.15)],
  spring: (length: number) => [tone(ringHz(length), 0.16, 0.004, 0.3, 'sawtooth', ringHz(length) * 2), tone(ringHz(length) * 2, 0.1, 0.001, 0.05, 'square', undefined, 0.26)],
  bong: (length: number) => [tone(ringHz(length) * 1.5, 0.2, 0.002, 0.7, 'sine'), tone(ringHz(length) * 4.1, 0.06, 0.002, 0.3, 'sine')],
  // The ruled parts answer one by one, a hollow knock each; on a shut tin the roller only drums along the lid.
  rule: (_: number, count = 4) => run(count, 300, 1.09, 0.11, 0.14, 'sine', 0.09),
  drum: () => Array.from({ length: 5 }, (_, i) => hiss(260, 0.1, 0.002, 0.05, 200, i * 0.06)),
  clang: (length: number) => [tone(ringHz(length) * 3, 0.2, 0.001, 0.4, 'square', ringHz(length) * 2.9), tone(ringHz(length) * 3, 0.12, 0.001, 0.2, 'square', undefined, 0.16)],
  slide: () => [hiss(700, 0.08, 0.03, 0.22, 1100), tone(900, 0.08, 0.001, 0.04, 'square', undefined, 0.22)],
  click: () => [tone(1900, 0.12, 0.001, 0.03, 'square'), tone(950, 0.14, 0.002, 0.09, 'triangle', undefined, 0.02)],
  // A customer.
  // A snip, and the tuft pops back.
  pop: () => [hiss(3400, 0.1, 0.001, 0.03), tone(500, 0.16, 0.002, 0.07, 'sine', 1400, 0.12)],
  babble: () => [tone(320, 0.14, 0.01, 0.1, 'sawtooth', 420), tone(380, 0.12, 0.01, 0.12, 'sawtooth', 300, 0.12)],
  gulp: (length: number) => [tone(260, 0.2, 0.01, 0.16, 'sine', 120), tone(ringHz(length) * 0.5, 0.1, 0.01, 0.12, 'sine', undefined, 0.16)],
  splat: () => [hiss(900, 0.24, 0.001, 0.12, 300), hiss(400, 0.1, 0.02, 0.3, 200, 0.06)],
  honk: () => [tone(230, 0.2, 0.008, 0.26, 'square', 210), tone(345, 0.08, 0.008, 0.26, 'square')],
  // The crate.
  split: () => [hiss(1400, 0.22, 0.001, 0.09, 600), tone(180, 0.18, 0.002, 0.2, 'triangle', 90), tone(140, 0.14, 0.002, 0.14, 'triangle', undefined, 0.2), tone(120, 0.12, 0.002, 0.14, 'triangle', undefined, 0.34)],
  thump: (length: number) => [tone(ringHz(length) * 0.5, 0.26, 0.003, 0.24, 'sine', ringHz(length) * 0.3), hiss(300, 0.1, 0.002, 0.1)],
  burp: () => [tone(110, 0.22, 0.02, 0.3, 'sawtooth', 70), hiss(260, 0.06, 0.02, 0.2)],
  // A creak one way and back, then the fruit that jumped out.
  rock: () => [tone(150, 0.12, 0.04, 0.2, 'sawtooth', 210), tone(200, 0.1, 0.04, 0.2, 'sawtooth', 140, 0.22), tone(200, 0.16, 0.003, 0.12, 'sine', undefined, 0.48)],
  washboard: () => Array.from({ length: 6 }, (_, i) => hiss(2400 + (i % 2) * 500, 0.08, 0.002, 0.04, undefined, i * 0.05)),
  // The dog.
  chomp: () => [tone(700, 0.16, 0.001, 0.04, 'square', 300), hiss(1500, 0.1, 0.001, 0.05)],
  bark: () => [tone(480, 0.24, 0.006, 0.12, 'sawtooth', 340), hiss(1200, 0.06, 0.004, 0.08)],
  // A long slurp, longer for a longer piece.
  munch: (length: number) => [hiss(500, 0.14, 0.06, 0.2 + 0.3 * Math.min(1, length / LONGEST), 1700), tone(ringHz(length) * 0.5, 0.08, 0.01, 0.1, 'sine', undefined, 0.5)],
  // The piece through the air, and a yip as it is caught.
  catch: (length: number) => [hiss(500, 0.08, 0.04, 0.24, 1600), tone(ringHz(length) + 500, 0.18, 0.004, 0.09, 'sawtooth', ringHz(length) + 1100, 0.26)],
  // Ears ironed flat with a squeak, springing up one at a time, a pop each.
  sproing: () => [tone(1900, 0.08, 0.01, 0.14, 'sine', 2500), tone(300, 0.16, 0.003, 0.08, 'sine', 900, 0.26), tone(380, 0.14, 0.003, 0.08, 'sine', 1100, 0.42)],
} as const satisfies Record<string, (length: number, count?: number) => Note[]>

export type VoiceId = keyof typeof VOICES

/** The notes of a voice for a length in points (the longest fruit when none is given) and a count. */
export function notesOf(id: VoiceId, length = LONGEST, count?: number): Note[] {
  return (VOICES[id] as (length: number, count?: number) => Note[])(length, count)
}
