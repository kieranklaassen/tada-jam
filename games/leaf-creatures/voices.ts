import type { Note } from './audio'
import { KINDS, type Kind } from './parts'

// Every sound of the game as plain numbers. Nobody has heard them yet: they
// are written from the words of the design sheet, and the test beside this
// file holds each pitch, peak and length in range.
//
// Sight and sound run on one clock. No note here starts later than the voice
// it belongs to: a sound with two parts in time (a bounce and the next
// bounce, a breath in and the sneeze) is two voices, and the toy asks for
// each in the step in which its motion happens.

const t = (frequency: number, peak: number, attack: number, decay: number, wave: OscillatorType = 'sine', glideTo?: number): Note => ({ kind: 'tone', frequency, peak, attack, decay, wave, glideTo })
const n = (frequency: number, q: number, peak: number, attack: number, decay: number, glideTo?: number): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, glideTo })

/** The finger lands on a part: the row "lifted" of the grid. */
const LIFT: Record<Kind, readonly Note[]> = {
  twig: [n(2600, 2.2, 0.16, 0.002, 0.045), t(1250, 0.07, 0.002, 0.04, 'square', 700)],
  maple: [n(3400, 0.8, 0.12, 0.004, 0.11, 1800), n(900, 1.4, 0.05, 0.004, 0.07)],
  willow: [n(1500, 1.6, 0.1, 0.03, 0.2, 3200)],
  round: [t(1320, 0.1, 0.004, 0.32, 'sine', 1300), t(1985, 0.045, 0.004, 0.22)],
  feather: [n(620, 0.7, 0.09, 0.05, 0.22, 380)],
  seed: [n(4200, 5, 0.1, 0.002, 0.03), n(3600, 5, 0.08, 0.02, 0.05), t(820, 0.04, 0.003, 0.05, 'triangle')],
  cap: [t(430, 0.14, 0.003, 0.12, 'sine', 330), n(700, 3, 0.05, 0.003, 0.05)],
}

/** A part is carried: one rustle for every stretch of the way, the row "carried". */
const CARRY: Record<Kind, readonly Note[]> = {
  twig: [t(1700, 0.045, 0.002, 0.025, 'square', 1500)],
  maple: [n(2800, 1.1, 0.07, 0.006, 0.09), n(5200, 2, 0.03, 0.004, 0.05)],
  willow: [n(5200, 1.2, 0.05, 0.04, 0.16, 4200)],
  round: [t(520, 0.05, 0.01, 0.12, 'triangle', 640), n(1200, 4, 0.03, 0.01, 0.1)],
  feather: [n(900, 0.5, 0.035, 0.07, 0.2)],
  seed: [t(2300, 0.05, 0.002, 0.03, 'triangle'), n(5000, 6, 0.03, 0.002, 0.02)],
  cap: [t(210, 0.09, 0.012, 0.14, 'sine', 180), n(380, 2, 0.04, 0.01, 0.1)],
}

/** A part touches down and is pressed on: the row "pressed on". A bounce plays the same voice again, higher. */
const PRESS: Record<Kind, readonly Note[]> = {
  twig: [t(310, 0.15, 0.002, 0.07, 'triangle', 240), n(1800, 3, 0.06, 0.002, 0.03)],
  maple: [n(1100, 0.7, 0.16, 0.002, 0.07), t(190, 0.08, 0.003, 0.08)],
  willow: [n(2200, 0.9, 0.08, 0.05, 0.3, 900)],
  round: [t(1175, 0.11, 0.003, 0.14, 'sine', 1150), t(1760, 0.04, 0.003, 0.09)],
  feather: [n(480, 0.6, 0.07, 0.06, 0.26, 300)],
  seed: [t(1500, 0.1, 0.002, 0.035, 'triangle', 1100)],
  cap: [t(540, 0.16, 0.002, 0.09, 'sine', 300), n(240, 1.5, 0.08, 0.002, 0.05)],
}

/** A tap on an awake creature's part: the row "poked". */
const POKE: Record<Kind, readonly Note[]> = {
  twig: [t(190, 0.13, 0.004, 0.3, 'triangle', 420), t(382, 0.05, 0.004, 0.22, 'sine', 800)],
  maple: [n(2000, 0.9, 0.11, 0.01, 0.16), n(3800, 1.5, 0.06, 0.03, 0.2)],
  willow: [t(150, 0.1, 0.05, 0.3, 'sine', 95), n(700, 2, 0.03, 0.05, 0.25, 400)],
  round: [t(330, 0.09, 0.08, 0.7, 'triangle', 760), t(336, 0.05, 0.08, 0.7, 'sine', 420)],
  feather: [t(1050, 0.07, 0.02, 0.4, 'triangle', 1400), t(1323, 0.04, 0.05, 0.36, 'sine', 1760)],
  seed: [n(1400, 1.2, 0.06, 0.2, 0.08, 2600), t(500, 0.04, 0.18, 0.08, 'sine', 760)],
  cap: [t(900, 0.1, 0.008, 0.16, 'sine', 1700)],
}

/** Everything else, each heard in the step of the motion it belongs to. */
const WORLD = {
  /** A twig leg comes down. */
  foot: [t(980, 0.06, 0.002, 0.022, 'triangle', 760)],
  /** A wing beats. */
  beat: [n(520, 0.8, 0.11, 0.02, 0.12, 260)],
  /** A hop lands. */
  land: [t(120, 0.16, 0.003, 0.12, 'sine', 80), n(600, 0.8, 0.07, 0.002, 0.06)],
  /** A willow back swings into its next curve. */
  curve: [n(6200, 1.4, 0.05, 0.05, 0.18, 4600)],
  /** A wheel turns over. */
  turn: [t(98, 0.13, 0.006, 0.1, 'sine', 70)],
  /** A feather is fanned. */
  fan: [n(3000, 2.4, 0.08, 0.004, 0.09, 6000)],
  /** A seed nose sniffs. */
  sniff: [n(1800, 3, 0.05, 0.03, 0.06, 2400)],
  /** A cap rocks on to its other side. */
  rock: [t(390, 0.08, 0.003, 0.06, 'sine', 350)],
  /** A coiled willow springs open. */
  boing: [t(110, 0.14, 0.004, 0.42, 'sine', 300), t(222, 0.05, 0.004, 0.3, 'triangle', 620)],
  /** The sneeze itself, after the breath in. */
  sneeze: [n(3200, 0.7, 0.16, 0.004, 0.2, 900), t(640, 0.05, 0.004, 0.1, 'sawtooth', 300)],
  /** The wind children blow. */
  gust: [n(500, 0.5, 0.13, 0.12, 0.8, 1500), n(2400, 0.9, 0.05, 0.2, 0.6, 3600)],
  /** A cap turns over into an eye. */
  blink: [t(700, 0.09, 0.003, 0.07, 'sine', 1250)],
  /** A wind child, touched, lets out a little breath. */
  puff: [n(900, 0.6, 0.1, 0.02, 0.24, 500)],
  /** The toad, touched. */
  croak: [t(92, 0.15, 0.01, 0.22, 'sawtooth', 70), t(184, 0.04, 0.01, 0.18, 'square', 150)],
  /** The fern, touched. */
  frond: [n(4200, 0.8, 0.07, 0.03, 0.26, 2600)],
  /** A finger on the bare ground. */
  pat: [t(160, 0.11, 0.003, 0.07, 'sine', 110), n(300, 1, 0.05, 0.002, 0.04)],
  /** A part flutters back to its heap, or is shaken off. */
  back: [n(1300, 0.9, 0.06, 0.04, 0.2, 2200)],
  /** A part lands back in its heap. */
  home: [n(800, 1.2, 0.07, 0.004, 0.06)],
  /** A finger lands on a creature: the soft give of it, before the tap is a poke. */
  feel: [t(260, 0.07, 0.006, 0.09, 'sine', 300), n(520, 1.4, 0.03, 0.004, 0.05)],
  /** A stroke along a creature: it leans in. */
  purr: [t(74, 0.1, 0.06, 0.4, 'triangle', 82), n(260, 2, 0.03, 0.08, 0.3)],
  /** A drowsy creature yawns. */
  yawn: [t(420, 0.08, 0.14, 0.5, 'sine', 210), n(1200, 1, 0.025, 0.2, 0.4, 500)],
  /** It has settled under the fern. */
  hush: [n(1500, 0.7, 0.05, 0.16, 0.6, 500)],
  /** A seed nose whistles in its sleep, once, as it settles. */
  whistle: [t(1650, 0.045, 0.06, 0.4, 'sine', 2100)],
  /** A creature whose eyes came off breathes out. */
  sigh: [n(820, 0.8, 0.07, 0.1, 0.5, 300), t(196, 0.04, 0.08, 0.4, 'sine', 130)],
  /** Its parts let go of one another. */
  drop: [n(2400, 1.1, 0.07, 0.004, 0.1, 1200), t(240, 0.05, 0.003, 0.06, 'triangle')],
  /** A crawler spins round to look. */
  spin: [t(520, 0.07, 0.01, 0.2, 'triangle', 900), n(3400, 2, 0.03, 0.01, 0.12)],
  /** A roller bowls a creature over. */
  bonk: [t(150, 0.16, 0.003, 0.16, 'sine', 84), n(900, 0.9, 0.09, 0.002, 0.08), t(700, 0.04, 0.003, 0.1, 'triangle', 380)],
  /** Nine legs and nobody trips over its own. */
  trip: [n(2900, 2, 0.1, 0.002, 0.05), t(880, 0.06, 0.002, 0.05, 'square', 440), n(1400, 2.4, 0.06, 0.03, 0.08)],
  /** A nose digs. */
  dig: [n(340, 1.3, 0.11, 0.004, 0.09, 200), n(1900, 2, 0.03, 0.004, 0.05)],
  /** An acorn pops out of the earth. */
  pop: [t(300, 0.15, 0.003, 0.11, 'sine', 620), n(1000, 1.6, 0.05, 0.002, 0.04)],
  /** An acorn is pushed along. */
  roll: [t(132, 0.09, 0.02, 0.2, 'triangle', 118), n(420, 2.2, 0.04, 0.02, 0.16)],
  /** The toad gulps and the hat slides off. */
  gulp: [t(128, 0.13, 0.02, 0.14, 'sine', 210), t(64, 0.06, 0.02, 0.12, 'sine', 96)],
  /** The big wind child strains at something heavy. */
  strain: [t(104, 0.08, 0.2, 0.6, 'sawtooth', 138), n(600, 3, 0.03, 0.2, 0.5, 900)],
  /** Its cheeks pop. */
  pfft: [n(1700, 0.6, 0.15, 0.003, 0.2, 500), t(240, 0.06, 0.003, 0.12, 'square', 120)],
  /** The small wind child spins itself round. */
  whirl: [t(620, 0.07, 0.04, 0.5, 'sine', 1240), n(4400, 3, 0.025, 0.05, 0.4, 5800)],
  /** It peeks over its hands. */
  peek: [t(1480, 0.05, 0.004, 0.06, 'sine', 1900)],
  /** A creature shakes itself awake. */
  shake: [n(3600, 1.3, 0.08, 0.004, 0.06), n(2600, 1.3, 0.07, 0.05, 0.07), n(4200, 1.6, 0.05, 0.1, 0.08)],
} as const satisfies Record<string, readonly Note[]>

export type WorldSound = keyof typeof WORLD
export type VoiceKey = WorldSound | `lift-${Kind}` | `carry-${Kind}` | `press-${Kind}` | `poke-${Kind}`

const rows = (prefix: string, row: Record<Kind, readonly Note[]>): [string, readonly Note[]][] => KINDS.map((kind) => [`${prefix}-${kind}`, row[kind]])

export const VOICES = Object.fromEntries([...rows('lift', LIFT), ...rows('carry', CARRY), ...rows('press', PRESS), ...rows('poke', POKE), ...Object.entries(WORLD)]) as Record<VoiceKey, readonly Note[]>

/** The ranges every note stays inside. */
export const RANGE = { frequency: [60, 6500], peak: [0.02, 0.17], attack: [0.002, 0.2], decay: [0.02, 0.8], length: 1 } as const

export function lengthOf(key: VoiceKey): number {
  return Math.max(...VOICES[key].map((note) => note.attack + note.decay))
}

/** A sound the toy has asked for: which voice, how much higher or lower than written, and how loud. */
export type Asked = { key: VoiceKey; pitch: number; level: number; /** It belongs to a scene: a touch that ends the scene silences it. */ scene: boolean }
