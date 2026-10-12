import type { Note } from './audio'
import type { SoundEvent, SoundKind } from './sounds'

// Every sound of the game as plain numbers. Nobody has heard them: they are
// written from the design sheet's words, kept short and quiet, and
// voices.test.ts holds every pitch, peak and length in range. A sound has no
// clock of its own: it is made from an event of a model, and the event's own
// time on the model's clock sets when it starts. No note waits inside its
// voice for longer than MOST_DELAY: a sound that belongs to a later motion is
// a later event.

/** The notes a swinging lantern rings, low at the left of the wood and high at the right. */
export const BELLS = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3, 784] as const
/** One note a glow-worm, each higher than the last. */
export const CHIMES = [784, 880, 1174.7, 1318.5, 1568] as const
/** The longest a note may start after its event, in seconds: the tail of one sound, never a second one. */
export const MOST_DELAY = 0.2

const pickOf = (list: readonly number[], n: number): number => list[Math.min(list.length - 1, Math.floor(n * list.length))]
/** Which of three: the yellow way, the red way or the blue way. */
const manner = (n: number): 0 | 1 | 2 => (n < 0.25 ? 0 : n < 0.75 ? 1 : 2)

type More = { glideTo?: number; wave?: OscillatorType; delay?: number }
const T = (frequency: number, peak: number, attack: number, decay: number, more: More = {}): Note => ({ kind: 'tone', frequency, peak, attack, decay, ...more })
const N = (frequency: number, q: number, peak: number, attack: number, decay: number, more: Omit<More, 'wave'> = {}): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, ...more })

const VOICES: Record<SoundKind, (n: number) => Note[]> = {
  // --- The lantern ---
  // The finger lands on a lit lantern: struck glass.
  ring: (n) => [T(1100 + 500 * n, 0.13, 0.003, 0.24), T((1100 + 500 * n) * 1.5, 0.05, 0.003, 0.12)],
  // The finger lands on a dark one: wood, not glass.
  tock: (n) => [T(210 + 40 * n, 0.15, 0.004, 0.09, { wave: 'triangle', glideTo: 170 }), N(900, 2, 0.05, 0.002, 0.04)],
  // The lantern swings through the middle.
  bell: (n) => [T(pickOf(BELLS, n), 0.1, 0.006, 0.9), T(pickOf(BELLS, n) * 2, 0.028, 0.004, 0.4)],
  // The wire ticks as a wide swing turns.
  wire: (n) => [N(3200, 9, 0.02 + 0.03 * n, 0.002, 0.04)],
  // A spark, and the wick catches with a "fwoom".
  strike: () => [N(4200, 1.2, 0.09, 0.002, 0.05), N(600, 0.8, 0.1, 0.08, 0.3, { glideTo: 1400, delay: 0.06 }), T(196, 0.06, 0.05, 0.3, { glideTo: 262, delay: 0.06 })],
  // The hung lantern knocked on its hook.
  hookRing: (n) => [T(700 + 200 * n, 0.1, 0.003, 0.3), N(2400, 6, 0.04, 0.002, 0.05)],

  // --- Moths ---
  // A moth lands on the yellow: dry wings, each moth a little higher.
  patter: (n) => [N(2400 + 1400 * n, 3, 0.07, 0.002, 0.035), N(2000 + 1400 * n, 3, 0.04, 0.002, 0.03, { delay: 0.045 })],
  // The ring of moths goes round the red.
  whirr: () => [N(1500, 5, 0.05, 0.12, 0.3, { glideTo: 1900 }), T(180, 0.03, 0.1, 0.3, { wave: 'triangle' })],
  // One bumps the glass.
  tink: () => [T(2100, 0.09, 0.002, 0.12), T(3150, 0.03, 0.002, 0.07)],
  // A moth folds up and falls.
  pff: (n) => [N(1100 - 300 * n, 1.2, 0.05, 0.02, 0.12, { glideTo: 500 })],
  // The sleepers breathe in together.
  mothSnore: (n) => [N(2200, 6, 0.02 + 0.02 * n, 0.14, 0.16), N(1700, 6, 0.02, 0.1, 0.14, { delay: 0.18 })],
  // Tumbled head over tail: a flutter-roll that falls away.
  tumble: () => [0, 0.05, 0.1, 0.15, 0.2].map((delay, i) => N(2600 - i * 320, 3, 0.06 - i * 0.008, 0.003, 0.04, { delay })),
  // A moth lands on the cold lantern: paper.
  rustle: (n) => [N(3400 + 500 * n, 1.5, 0.045, 0.006, 0.07)],
  // The wire creaks under them.
  sag: () => [T(120, 0.07, 0.08, 0.4, { wave: 'sawtooth', glideTo: 92 })],
  // The leader's feet on the bark.
  tinyFeet: (n) => [N(3000 + 600 * n, 7, 0.03, 0.002, 0.018)],
  // A moth is back on its bark.
  settle: (n) => [N(1300 + 300 * n, 3, 0.04, 0.003, 0.045)],

  // --- Fox ---
  // A sniff that rises.
  sniff: () => [N(700, 1.5, 0.06, 0.3, 0.3, { glideTo: 2200 })],
  // The burst, and a yip on the end of it.
  sneeze: () => [N(1800, 0.7, 0.16, 0.004, 0.12), T(900, 0.1, 0.01, 0.1, { wave: 'triangle', glideTo: 1300, delay: 0.1 })],
  // One pad of a fox's paw.
  pad: (n) => [N(180 + 40 * n, 1.2, 0.08, 0.004, 0.06), T(88 + 8 * n, 0.07, 0.004, 0.07)],
  // It sits and pretends: a low tune to itself.
  hum: () => [T(174.6, 0.07, 0.12, 0.6, { glideTo: 165 }), T(220, 0.04, 0.1, 0.4, { glideTo: 207, delay: 0.2 })],
  // A paw in the puddle.
  plip: () => [T(1500, 0.09, 0.003, 0.07, { glideTo: 900 }), T(2300, 0.03, 0.002, 0.04, { delay: 0.03 })],
  // The paw shaken dry.
  shake: () => [0, 0.05, 0.1, 0.15].map((delay) => N(2800, 2, 0.045, 0.003, 0.03, { delay })),
  // It takes off.
  hop: () => [T(300, 0.07, 0.02, 0.12, { wave: 'triangle', glideTo: 620 })],
  // And lands.
  thud: () => [T(84, 0.14, 0.004, 0.14, { glideTo: 60 }), N(160, 1, 0.08, 0.003, 0.07)],
  // Claws on the ground before the pounce.
  scrabble: () => [0, 0.04, 0.08, 0.12, 0.16].map((delay, i) => N(1900 + (i % 2) * 500, 4, 0.05, 0.002, 0.025, { delay })),
  // Nose first.
  thump: () => [T(110, 0.14, 0.004, 0.12, { glideTo: 70 }), N(420, 1.2, 0.07, 0.003, 0.05)],
  squeak: () => [T(1700, 0.07, 0.01, 0.12, { glideTo: 2500 })],
  // A sniff at the cold lantern.
  noseSniff: (n) => [N(1300 + 400 * n, 2.2, 0.05, 0.03, 0.07)],
  // Its nose on the glass.
  dong: () => [T(392, 0.12, 0.004, 0.6), T(784, 0.03, 0.004, 0.3), T(196, 0.05, 0.004, 0.4)],
  // The head goes over, and the whine goes up.
  whine: () => [T(520, 0.06, 0.2, 0.9, { glideTo: 980 })],
  // Onto its side.
  flop: () => [N(260, 0.8, 0.1, 0.006, 0.12), T(96, 0.08, 0.006, 0.12)],

  // --- Owl ---
  // One long hoot, a short one (the model makes two, the second higher, as the head goes over), or one that trembles and sinks: two tones a hair apart, so it beats.
  hoot: (n) =>
    manner(n) === 0
      ? [T(330, 0.16, 0.06, 0.75, { glideTo: 300 }), T(660, 0.02, 0.06, 0.5, { wave: 'triangle', glideTo: 600 })]
      : manner(n) === 1
        ? [T(350 + (n - 0.5) * 420, 0.15, 0.02, 0.16, { glideTo: 336 + (n - 0.5) * 420 })]
        : [T(340, 0.13, 0.05, 0.5, { glideTo: 250 }), T(346, 0.06, 0.05, 0.5, { glideTo: 258 })],
  // The head goes round like a top: a hoo that speeds up.
  spin: () => [0, 0.09, 0.16, 0.2].map((delay, i) => T(320 + i * 22, 0.11, 0.02, 0.08, { delay })),
  // The feather lands.
  feather: () => [N(5200, 8, 0.03, 0.002, 0.02)],
  clack: () => [N(2000, 5, 0.09, 0.002, 0.02), T(900, 0.04, 0.002, 0.02, { wave: 'square' })],
  // A short question.
  hm: () => [T(290, 0.11, 0.04, 0.2, { glideTo: 380 })],

  // --- Glow-worms ---
  // A lamp flips, on or off.
  click: (n) => [T(1900 + 700 * n, 0.04, 0.002, 0.025, { wave: 'square' })],
  plop: () => [T(520, 0.1, 0.004, 0.1, { glideTo: 180 })],
  // Under the leaf.
  duck: (n) => [N(2600 + 300 * n, 2, 0.04, 0.004, 0.06)],
  // And a peep out from under it.
  eep: (n) => [T(1500 + 300 * n, 0.06, 0.01, 0.07, { glideTo: 2100 + 300 * n })],
  // A glow-worm lights its lamp.
  chime: (n) => [T(pickOf(CHIMES, n), 0.1, 0.004, 0.7), T(pickOf(CHIMES, n) * 2, 0.024, 0.003, 0.3)],
  // The wave along the fern: the same scale, quick and thin.
  trill: (n) => [T(pickOf(CHIMES, n) * 1.5, 0.05, 0.003, 0.12)],
  // A worm reaches the end of its thread.
  bead: (n) => [T(1250 + 90 * n, 0.045, 0.002, 0.03, { wave: 'triangle' })],
  // A knock on a lamp that will not light: dull, and no chime.
  knock: (n) => [T(250 + 14 * n, 0.07, 0.003, 0.05, { wave: 'triangle' }), N(700, 2, 0.03, 0.002, 0.03)],

  // --- Hedgehog ---
  feet: (n) => [N(640 + 180 * n, 2, 0.05, 0.002, 0.03)],
  snuffle: () => [N(900, 1.5, 0.06, 0.04, 0.08, { glideTo: 1500 }), N(1000, 1.5, 0.05, 0.03, 0.07, { glideTo: 1600, delay: 0.14 })],
  // Something goes onto a spine.
  spike: (n) => [T(480 + 60 * n, 0.11, 0.003, 0.06, { wave: 'triangle' }), N(1300, 3, 0.04, 0.002, 0.03)],
  // The same feet on tiptoe in the cold.
  tiptoe: (n) => [T(1200 + 220 * n, 0.04, 0.002, 0.05), N(2500, 4, 0.02, 0.002, 0.03)],
  // A rattle of spines.
  shiver: () => [0, 0.04, 0.08, 0.12, 0.16].map((delay, i) => N(3000 + i * 120, 6, 0.035, 0.002, 0.02, { delay })),
  // Into a ball.
  pop: () => [T(700, 0.12, 0.003, 0.05, { glideTo: 1400 }), N(1800, 1.5, 0.05, 0.002, 0.03)],
  // Half a turn of the ball.
  rumble: (n) => [N(130 + 30 * n, 1.5, 0.09, 0.02, 0.1), T(70 + 10 * n, 0.05, 0.02, 0.1)],
  // The root stops it.
  root: () => [T(180, 0.13, 0.003, 0.07, { wave: 'triangle', glideTo: 130 }), N(600, 2, 0.06, 0.002, 0.04)],
  // Its nose on the pole.
  bonk: () => [T(260, 0.12, 0.003, 0.09, { wave: 'triangle' }), T(520, 0.03, 0.003, 0.05)],
  peep: () => [T(2000, 0.06, 0.01, 0.09, { glideTo: 1500 })],

  // --- Badger ---
  // It draws breath: cheeks that creak, a thin whistle that drops, or a yawn.
  cheeks: (n) =>
    manner(n) === 0
      ? [T(90, 0.05, 0.25, 0.3, { wave: 'sawtooth', glideTo: 150 })]
      : manner(n) === 1
        ? [T(1400, 0.05, 0.1, 0.8, { glideTo: 900 })]
        : [N(700, 1, 0.07, 0.3, 0.7, { glideTo: 400 }), T(240, 0.06, 0.3, 0.7, { glideTo: 170 })],
  // And the candle goes out: a whoosh, the end of the whistle, or a flutter.
  blow: (n) =>
    manner(n) === 0
      ? [N(500, 0.7, 0.2, 0.03, 0.35, { glideTo: 2200 })]
      : manner(n) === 1
        ? [N(2600, 3, 0.1, 0.01, 0.25, { glideTo: 1200 })]
        : [0, 0.07, 0.14].map((delay) => N(800, 1, 0.08, 0.005, 0.06, { delay })),
  // A puff at nothing.
  miss: () => [N(900, 0.8, 0.12, 0.02, 0.16, { glideTo: 1600 })],
  raspberry: () => [0, 0.035, 0.07, 0.105, 0.14, 0.175].map((delay) => T(105, 0.09, 0.004, 0.022, { wave: 'sawtooth', delay })),
  // In, and the start of out.
  snore: () => [N(140, 2, 0.1, 0.5, 0.5), T(95, 0.06, 0.5, 0.4)],
  grunt: () => [T(110, 0.1, 0.02, 0.16, { wave: 'sawtooth', glideTo: 80 }), T(124, 0.08, 0.02, 0.14, { wave: 'sawtooth', glideTo: 86, delay: 0.17 })],
  // A puff from far off, which does nothing.
  farBlow: () => [N(700, 0.8, 0.06, 0.04, 0.3, { glideTo: 1500 })],

  // The spider pulls itself up its thread.
  zip: () => [T(500, 0.05, 0.01, 0.16, { glideTo: 1800 })],

  // --- The table ---
  snip: (n) => [N(3600 + 500 * n, 6, 0.07, 0.002, 0.025), T(1500 + 200 * n, 0.03, 0.002, 0.02, { wave: 'square', delay: 0.02 })],
  // A scrap falls off the table.
  scrap: () => [N(2600, 1.5, 0.04, 0.03, 0.2, { glideTo: 1200 })],
  // The cat's paw on it.
  bat: () => [N(700, 1.5, 0.08, 0.004, 0.05), N(2400, 2, 0.04, 0.02, 0.1, { delay: 0.04 })],
  // Paper over wood.
  slide: (n) => [N(1700 + 500 * n, 1.2, 0.045, 0.02, 0.1)],
  // A paper goes behind its window.
  tuck: (n) => [N(2100, 1.5, 0.05, 0.01, 0.07), T(520 + 130 * n, 0.07, 0.006, 0.16)],
  // It slides back to its place.
  back: (n) => [N(1500 - 300 * n, 1.2, 0.045, 0.04, 0.2, { glideTo: 900 })],
  // Four soft feet under the table.
  scamper: () => [0, 0.05, 0.1, 0.15].map((delay, i) => N(300 + (i % 2) * 60, 1.5, 0.06, 0.003, 0.03, { delay })),
  // The sheet rolls up.
  roll: () => [N(1300, 1, 0.07, 0.08, 0.3, { glideTo: 2400 })],
  // The candle stands in.
  set: () => [T(300, 0.09, 0.004, 0.06, { wave: 'triangle' }), N(900, 2, 0.04, 0.002, 0.04)],
  // A knock on bare wood.
  tap: (n) => [T(150 + 60 * n, 0.1, 0.003, 0.06, { wave: 'triangle' }), N(500, 2, 0.04, 0.002, 0.03)],
  // A fresh sheet lands.
  land: () => [N(1900, 1, 0.06, 0.006, 0.09), T(200, 0.05, 0.004, 0.06)],
  // The old one slides off.
  off: () => [N(1200, 1, 0.05, 0.05, 0.3, { glideTo: 600 })],
  // Something upright is knocked and rocks.
  wobble: (n) => [T(240 + 160 * n, 0.07, 0.004, 0.08, { wave: 'triangle' }), T(250 + 160 * n, 0.04, 0.004, 0.08, { wave: 'triangle', delay: 0.11 })],

  // --- The scenes ---
  // The flame catches.
  catch: () => [N(4200, 1.2, 0.08, 0.002, 0.05), N(600, 0.8, 0.09, 0.08, 0.3, { glideTo: 1500, delay: 0.05 }), T(220, 0.05, 0.05, 0.3, { glideTo: 294, delay: 0.05 })],
  door: () => [T(170, 0.06, 0.1, 0.5, { wave: 'sawtooth', glideTo: 250 }), N(500, 3, 0.03, 0.1, 0.4)],
  // A pair of eyes opens.
  eyes: (n) => [T(660 + 520 * n, 0.06, 0.004, 0.12, { wave: 'triangle' })],
  // The wire goes over the hook.
  hang: () => [T(880, 0.1, 0.003, 0.3), N(2600, 5, 0.05, 0.002, 0.04), T(1320, 0.03, 0.003, 0.15, { delay: 0.05 })],
  // The flame is pinched out.
  pinch: () => [N(5200, 2, 0.07, 0.003, 0.09, { glideTo: 2600 })],
  // The paper unrolls flat.
  unroll: () => [N(2200, 1, 0.06, 0.1, 0.4, { glideTo: 1100 })],
}

/** The notes of one event. */
export function notesOf(event: SoundEvent): Note[] {
  return VOICES[event.kind](event.n)
}

/** The most notes one batch plays: a frame in which everything answers at once must not be a wall of sound. */
export const MOST_NOTES = 18

/**
 * One voice for a batch of events, oldest first. Each event starts as late after the first as the model's own
 * clock says, so two things seen a moment apart are heard a moment apart.
 */
export function voiceNotes(events: readonly SoundEvent[]): Note[] {
  const notes: Note[] = []
  if (events.length === 0) return notes
  const first = events[0].at
  for (const event of events) {
    const late = Math.max(0, event.at - first)
    for (const note of notesOf(event)) {
      if (notes.length >= MOST_NOTES) return notes
      notes.push({ ...note, delay: (note.delay ?? 0) + late })
    }
  }
  return notes
}
