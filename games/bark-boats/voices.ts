import type { Note } from './audio'
import { MORE_VOICES } from './voicesMore'

// Every sound of the toy as plain numbers, since nobody has heard them yet:
// voices.test.ts holds each pitch, peak and length in range. A sound is one
// short event with no delay inside it. Whatever comes later (the second
// pulse of a croak, the snap after the creak, the knock of a thing washed
// ashore) is a sound of its own, which the toy queues on the frame its
// motion happens, so sight and sound run on one clock (sync.test.ts).

/** One part of a sound. It starts when the sound starts: there is no `delay`. */
export type Part = Omit<Note, 'delay'>

const t = (frequency: number, peak: number, attack: number, decay: number, glideTo?: number, wave: OscillatorType = 'sine'): Part => ({ kind: 'tone', frequency, peak, attack, decay, glideTo, wave })
const n = (frequency: number, q: number, peak: number, attack: number, decay: number, glideTo?: number): Part => ({ kind: 'noise', frequency, q, peak, attack, decay, glideTo })

const TOY_VOICES = {
  // The finger lands on a thing: each making has its own lift.
  'lift-twig': [t(1250, 0.1, 0.003, 0.05, 900, 'triangle'), n(2600, 3, 0.05, 0.002, 0.04)],
  'lift-birch': [n(4200, 1.2, 0.07, 0.01, 0.09, 5200)],
  'lift-maple': [n(2600, 0.9, 0.09, 0.015, 0.14, 3400)],
  'lift-berry': [t(880, 0.11, 0.004, 0.07, 1180)],
  'lift-pebble': [n(520, 2.2, 0.11, 0.01, 0.13, 380), t(170, 0.08, 0.006, 0.1)],
  'lift-boat': [t(190, 0.1, 0.02, 0.2, 240, 'triangle'), n(900, 4, 0.05, 0.02, 0.16, 1300)],
  // A part pulled off the boat.
  pop: [t(420, 0.13, 0.003, 0.07, 760), n(1800, 2, 0.05, 0.002, 0.04)],
  // Pressed in: the twig creaks as it turns and snaps home; the leaf rustles down and zips tight.
  creak: [t(310, 0.07, 0.03, 0.1, 430, 'sawtooth'), n(1500, 6, 0.04, 0.02, 0.1, 2100)],
  snap: [t(690, 0.14, 0.002, 0.06, 420, 'triangle'), n(3200, 2, 0.08, 0.001, 0.03)],
  rustle: [n(3600, 0.8, 0.08, 0.02, 0.12, 2500)],
  zip: [n(1800, 5, 0.08, 0.004, 0.07, 4600), t(1500, 0.05, 0.004, 0.05, 2300)],
  flump: [n(420, 0.7, 0.12, 0.02, 0.2, 240), t(120, 0.07, 0.01, 0.14)],
  pip: [t(1040, 0.12, 0.003, 0.06, 780)],
  tick: [t(1560, 0.07, 0.002, 0.035, 1300, 'triangle')],
  clunk: [t(118, 0.16, 0.004, 0.22, 90), n(700, 1.6, 0.1, 0.003, 0.09, 420)],
  groan: [t(92, 0.09, 0.06, 0.3, 124, 'sawtooth'), n(360, 5, 0.04, 0.05, 0.22)],
  // Laid on the bank.
  'lie-twig': [t(980, 0.08, 0.002, 0.04, 720, 'triangle'), n(2000, 3, 0.04, 0.002, 0.04)],
  'lie-birch': [n(3000, 1, 0.05, 0.006, 0.08)],
  'lie-maple': [n(1900, 0.9, 0.07, 0.008, 0.12)],
  'lie-berry': [t(620, 0.09, 0.003, 0.07, 470)],
  'lie-pebble': [t(140, 0.14, 0.003, 0.12, 100), n(900, 2, 0.07, 0.002, 0.05)],
  // Let go in the water.
  'plop-twig': [t(520, 0.1, 0.004, 0.09, 300), n(1400, 1.4, 0.06, 0.004, 0.1)],
  'plop-birch': [n(2400, 1, 0.07, 0.004, 0.07), t(900, 0.04, 0.004, 0.05, 700)],
  'plop-maple': [n(1500, 0.9, 0.09, 0.005, 0.1), t(640, 0.05, 0.004, 0.07, 480)],
  'plop-berry': [t(1320, 0.11, 0.003, 0.08, 620)],
  'plop-pebble': [t(230, 0.15, 0.005, 0.26, 92), n(600, 1, 0.09, 0.006, 0.18, 300)],
  knock: [t(360, 0.1, 0.002, 0.07, 300, 'triangle'), n(1200, 4, 0.04, 0.002, 0.04)],
  // The boat.
  splash: [n(1300, 0.6, 0.2, 0.008, 0.42, 520), t(150, 0.12, 0.01, 0.3, 94)],
  thock: [t(170, 0.15, 0.003, 0.14, 120, 'triangle'), n(820, 3, 0.07, 0.002, 0.06)],
  drip: [t(1480, 0.07, 0.003, 0.06, 2100)],
  lap: [n(880, 2.4, 0.07, 0.03, 0.2, 620), t(300, 0.04, 0.03, 0.16, 250)],
  // A finger in the water, and on bare ground.
  ring: [t(700, 0.11, 0.004, 0.14, 420), n(1700, 1.2, 0.05, 0.005, 0.12, 900)],
  trickle: [t(1180, 0.05, 0.004, 0.06, 1500), n(2400, 2, 0.03, 0.004, 0.06)],
  ground: [t(240, 0.11, 0.002, 0.08, 190, 'triangle'), n(1500, 1.4, 0.05, 0.002, 0.07)],
  // The frog: two pulses of a croak, a gulp when a ring passes under him, the tongue and the spit.
  'croak-a': [t(150, 0.13, 0.01, 0.12, 118, 'sawtooth'), t(302, 0.06, 0.01, 0.1, 240, 'square')],
  'croak-b': [t(178, 0.13, 0.01, 0.2, 104, 'sawtooth'), t(356, 0.06, 0.01, 0.16, 212, 'square')],
  ulp: [t(250, 0.1, 0.01, 0.1, 420), n(500, 3, 0.04, 0.01, 0.08)],
  thwip: [n(3400, 3, 0.1, 0.003, 0.07, 1500), t(1900, 0.06, 0.003, 0.05, 700)],
  ptoo: [n(900, 1.6, 0.13, 0.004, 0.09, 2200), t(340, 0.08, 0.004, 0.08, 620)],
  // The kingfisher: a ruffle of feathers, and one clap of the beak for each note of his rattle.
  ruffle: [n(2900, 0.8, 0.08, 0.03, 0.2, 1900)],
  rattle: [t(2350, 0.09, 0.002, 0.035, 2050, 'square'), n(5200, 4, 0.04, 0.001, 0.025)],
  // The sprite: a breath in, a breath out, and what the breath does to a sail and to a bare hull.
  inhale: [n(700, 1.2, 0.07, 0.2, 0.08, 2300)],
  blow: [n(1900, 0.7, 0.14, 0.05, 0.7, 760), t(540, 0.03, 0.06, 0.5, 430)],
  flap: [n(950, 0.8, 0.14, 0.006, 0.16, 520), t(210, 0.07, 0.006, 0.12, 160)],
  whiff: [n(2600, 1.4, 0.05, 0.02, 0.14, 1700)],
  // The gnome: his hat, his jump aboard, and his fixed opinion of each thing put on his boat.
  squeak: [t(1150, 0.09, 0.01, 0.09, 1620, 'triangle')],
  pat: [n(1100, 1.2, 0.06, 0.003, 0.06), t(330, 0.05, 0.003, 0.05)],
  hup: [t(520, 0.1, 0.01, 0.14, 930, 'triangle')],
  sit: [t(210, 0.1, 0.004, 0.09, 170), n(700, 1.5, 0.05, 0.003, 0.06)],
  whoop: [t(620, 0.12, 0.02, 0.3, 1480, 'triangle'), t(930, 0.05, 0.02, 0.28, 2200)],
  mmm: [t(390, 0.1, 0.04, 0.3, 470, 'triangle'), t(585, 0.04, 0.04, 0.26, 700)],
  grumble: [t(132, 0.11, 0.03, 0.34, 96, 'sawtooth'), t(198, 0.05, 0.03, 0.3, 150, 'square')],
  giggle: [t(980, 0.08, 0.01, 0.07, 1320, 'triangle'), t(1470, 0.04, 0.01, 0.06, 1900)],
  hm: [t(440, 0.09, 0.02, 0.16, 400, 'triangle')],
  ha: [t(560, 0.1, 0.008, 0.11, 700, 'triangle'), n(1600, 2, 0.03, 0.006, 0.07)],
} as const satisfies Record<string, readonly Part[]>

/** Every sound of the game: the toy's (above) and those of the two grids, the brook and the pond (voicesMore.ts). */
export const VOICES = { ...TOY_VOICES, ...MORE_VOICES } as const satisfies Record<string, readonly Part[]>

export type SoundName = keyof typeof VOICES

/** A sound the toy asks for: which, and how far its pitch is bent (1 is as written), so no two rings sound alike. */
export type Sound = { name: SoundName; rate: number }

/** How far a sound may be bent either way. */
export const RATE = { low: 0.7, high: 1.5 } as const

/** The notes of everything queued in one handler or one frame, as one list for `voiceOf`. */
export function notesOf(sounds: readonly Sound[]): Note[] {
  const notes: Note[] = []
  for (const sound of sounds) {
    const rate = Math.min(RATE.high, Math.max(RATE.low, sound.rate))
    for (const part of VOICES[sound.name] as readonly Part[]) {
      notes.push({ ...part, frequency: part.frequency * rate, glideTo: part.glideTo === undefined ? undefined : part.glideTo * rate })
    }
  }
  return notes
}

/** How long the notes of a list ring, in seconds. */
export function lengthOf(notes: readonly Note[]): number {
  return notes.reduce((most, note) => Math.max(most, (note.delay ?? 0) + note.attack + note.decay), 0)
}
