import type { Note, Voice } from './audio'
import type { Cue, CueName } from './model'
import { APPLE_FALLS, LEAF_SLIDES, POKE_AT, POTATO_KNOCKS } from './motion'

// Every sound of the toy as plain numbers, played through `voiceOf` in
// audio.ts. Nobody has listened to them: they were written from the design
// sheet's words on a machine with no speakers, so a test holds every pitch,
// peak and length in range, and the first person to hear them should expect
// to retune them.

const tone = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'tone', frequency, peak, attack, decay, ...more })
const hiss = (frequency: number, q: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, ...more })

/** The tiptoe tune, in semitones from its first note: one note a push of the wire. */
export const TIPTOE = [0, 2, 3, 2, 0, 2, 3, 5, 3, 2, 0, -2] as const
const semis = (base: number, steps: number): number => base * 2 ** (steps / 12)

/** Lifting each thing: ball, potato, clock, boot, cabbage, egg. */
const LIFT: readonly (readonly Note[])[] = [
  [tone(300, 0.2, 0.01, 0.14, { glideTo: 610 })],
  [tone(150, 0.22, 0.005, 0.1, { wave: 'triangle', glideTo: 185 }), hiss(420, 1, 0.1, 0.004, 0.08)],
  [tone(1568, 0.12, 0.002, 0.26), tone(2093, 0.07, 0.002, 0.2, { delay: 0.05 }), hiss(5200, 8, 0.07, 0.001, 0.02, { delay: 0.16 })],
  [hiss(700, 1.5, 0.2, 0.01, 0.12, { glideTo: 1100 }), tone(110, 0.14, 0.004, 0.09, { wave: 'triangle' })],
  [hiss(2600, 1, 0.16, 0.008, 0.07), hiss(3100, 1.2, 0.12, 0.008, 0.08, { delay: 0.07 })],
  [tone(1046, 0.14, 0.005, 0.11, { glideTo: 1320 }), tone(1568, 0.06, 0.004, 0.12, { delay: 0.08 })],
]

/** Each thing set down on bare floor, in time with how it comes to rest (motion.ts). */
const LAND: readonly (readonly Note[])[] = [
  [tone(430, 0.22, 0.004, 0.13, { glideTo: 250 }), tone(380, 0.16, 0.004, 0.11, { glideTo: 220, delay: 0.22 }), tone(330, 0.1, 0.004, 0.09, { glideTo: 200, delay: 0.4 })],
  [tone(122, 0.28, 0.004, 0.14, { wave: 'triangle', glideTo: 88 }), tone(205, 0.09, 0.003, 0.06, { wave: 'triangle', delay: POTATO_KNOCKS })],
  [hiss(3000, 2, 0.2, 0.002, 0.06), tone(1760, 0.14, 0.002, 0.4, { delay: 0.07 }), hiss(5200, 8, 0.06, 0.001, 0.02, { delay: 0.5 }), hiss(4700, 8, 0.06, 0.001, 0.02, { delay: 0.76 })],
  [tone(96, 0.3, 0.003, 0.16, { glideTo: 68 }), hiss(520, 1, 0.2, 0.004, 0.09)],
  [hiss(900, 0.7, 0.22, 0.01, 0.18), hiss(3000, 1, 0.08, 0.02, 0.2, { delay: LEAF_SLIDES.at })],
  [tone(880, 0.14, 0.002, 0.05), tone(830, 0.11, 0.002, 0.05, { delay: 0.18 }), tone(790, 0.08, 0.002, 0.05, { delay: 0.34 })],
]

/** Poking each empty place: nest, pond, scarecrow, bowl, line. */
const POKE: readonly (readonly Note[])[] = [
  [hiss(2200, 0.9, 0.16, 0.02, 0.2, { glideTo: 1500 }), hiss(2800, 1, 0.1, 0.02, 0.14, { delay: 0.12 })],
  [tone(900, 0.16, 0.004, 0.09, { glideTo: 1500 }), hiss(1200, 2, 0.1, 0.004, 0.12, { delay: 0.03 })],
  [tone(180, 0.08, 0.05, 0.25, { wave: 'sawtooth', glideTo: 240 }), tone(520, 0.12, 0.01, 0.16, { wave: 'sawtooth', glideTo: 400, delay: POKE_AT.caw })],
  [hiss(1500, 1.4, 0.1, 0.03, 0.1, { glideTo: 3000 }), tone(82, 0.12, 0.05, 0.4, { wave: 'sawtooth', glideTo: 70, delay: POKE_AT.growl })],
  [tone(196, 0.2, 0.003, 0.5, { wave: 'triangle', glideTo: 186 }), tone(392, 0.07, 0.003, 0.3, { glideTo: 380 })],
]

/** `n` notes one after another, `gap` seconds apart. */
const seq = (n: number, gap: number, make: (i: number, delay: number) => Note | readonly Note[], from = 0): Note[] =>
  Array.from({ length: n }, (_, i) => make(i, from + i * gap)).flat()
const ringing = (low: number, high: number, n: number, peak: number): Note[] => seq(n, 0.09, (i, delay) => tone(i % 2 ? high : low, peak, 0.002, 0.06, { delay }))
const rip = (from: number, to: number): Note[] => [hiss(from, 1, 0.18, 0.004, 0.14, { glideTo: to })]

/**
 * The sounds of the thirty pairings and of the five ways a place sends a thing on, by the names the grid gives
 * them (pairings.ts). Each starts with the act that makes it and is over within a second and a quarter.
 */
export const ACTS: Record<string, readonly Note[]> = {
  putIn: [hiss(1600, 2, 0.12, 0.004, 0.06), tone(330, 0.1, 0.004, 0.08, { wave: 'triangle', glideTo: 260 })],
  tipRoll: [tone(180, 0.12, 0.02, 0.3, { wave: 'triangle', glideTo: 120 }), hiss(900, 1, 0.1, 0.05, 0.35, { glideTo: 500 })],
  frogKick: [tone(260, 0.2, 0.003, 0.09, { glideTo: 520 }), hiss(1400, 2, 0.12, 0.003, 0.06)],
  tossWhoop: [tone(300, 0.16, 0.03, 0.36, { glideTo: 900 }), hiss(700, 1, 0.08, 0.02, 0.2)],
  slideDown: [tone(1400, 0.1, 0.02, 0.4, { glideTo: 500 }), hiss(3000, 3, 0.06, 0.02, 0.35, { glideTo: 1500 })],
  carryFlaps: seq(3, 0.13, (_, delay) => hiss(1100, 1.2, 0.12, 0.01, 0.07, { delay })),
  // The ball.
  featherSettle: [hiss(2600, 0.8, 0.1, 0.04, 0.3, { glideTo: 1600 }), hiss(3000, 1, 0.06, 0.03, 0.2, { delay: 0.2 })],
  rubberSqueaks: seq(3, 0.36, (i, delay) => tone(900 + i * 120, 0.12, 0.02, 0.12, { glideTo: 1300 + i * 120, delay })),
  proudHonk: [tone(392, 0.2, 0.02, 0.5, { wave: 'sawtooth', glideTo: 440 }), tone(196, 0.08, 0.02, 0.5, { wave: 'square' })],
  plop: [tone(520, 0.2, 0.004, 0.12, { glideTo: 180 }), hiss(1500, 1.5, 0.1, 0.004, 0.1)],
  frogBoing: [tone(180, 0.2, 0.004, 0.3, { wave: 'triangle', glideTo: 420 })],
  patter: seq(8, 0.14, (i, delay) => tone(700 + (i % 2) * 90, 0.07, 0.003, 0.04, { wave: 'triangle', delay })),
  pegPop: [tone(880, 0.18, 0.002, 0.07, { glideTo: 1300 }), hiss(2500, 4, 0.1, 0.002, 0.03)],
  crowFlap: seq(3, 0.1, (_, delay) => hiss(900, 1, 0.12, 0.01, 0.06, { delay })),
  boings: seq(5, 0.24, (i, delay) => tone(240 + i * 14, 0.13, 0.004, 0.16, { wave: 'triangle', glideTo: 420 + i * 14, delay })),
  thump: [tone(90, 0.3, 0.003, 0.16, { glideTo: 60 }), hiss(400, 1, 0.14, 0.003, 0.08)],
  squirt: [tone(600, 0.14, 0.01, 0.2, { glideTo: 1800 }), hiss(4000, 2, 0.06, 0.01, 0.14)],
  threeYaps: seq(3, 0.4, (_, delay) => tone(620, 0.18, 0.006, 0.09, { wave: 'sawtooth', glideTo: 760, delay })),
  dogSigh: [hiss(700, 0.7, 0.1, 0.1, 0.6, { glideTo: 350 }), tone(150, 0.05, 0.1, 0.5, { glideTo: 110 })],
  pegClip: [hiss(3200, 5, 0.14, 0.002, 0.03), tone(1500, 0.07, 0.002, 0.05)],
  wind: [hiss(600, 0.6, 0.1, 0.4, 0.8, { glideTo: 1100 }), hiss(1500, 0.8, 0.05, 0.3, 0.6, { delay: 0.2 })],
  bonk: [tone(330, 0.22, 0.003, 0.18, { wave: 'triangle' }), hiss(900, 3, 0.1, 0.002, 0.04)],
  bonkLower: [tone(262, 0.22, 0.003, 0.18, { wave: 'triangle' }), hiss(800, 3, 0.1, 0.002, 0.04)],
  // The potato.
  tokTok: seq(2, 0.3, (_, delay) => tone(900, 0.1, 0.002, 0.05, { wave: 'square', delay })),
  shrugHm: [tone(280, 0.1, 0.04, 0.2, { wave: 'sawtooth', glideTo: 360 })],
  lowCluck: [tone(220, 0.12, 0.01, 0.12, { wave: 'sawtooth', glideTo: 180 }), tone(200, 0.08, 0.01, 0.1, { wave: 'sawtooth', delay: 0.2 })],
  glug: [tone(160, 0.2, 0.01, 0.2, { glideTo: 90 }), tone(240, 0.1, 0.01, 0.12, { glideTo: 140, delay: 0.22 })],
  blip: [tone(900, 0.12, 0.003, 0.07, { glideTo: 1400 })],
  blipHigher: [tone(1100, 0.12, 0.003, 0.07, { glideTo: 1700 })],
  nosePop: [tone(1300, 0.16, 0.002, 0.06, { glideTo: 2000 }), hiss(3000, 4, 0.08, 0.002, 0.04)],
  pat: [tone(200, 0.12, 0.003, 0.06, { wave: 'triangle' }), hiss(1200, 1, 0.06, 0.003, 0.05)],
  crowSteps: seq(6, 0.19, (_, delay) => hiss(2800, 6, 0.07, 0.002, 0.03, { delay })),
  tkTkTk: seq(3, 0.4, (_, delay) => [hiss(3600, 7, 0.16, 0.001, 0.03, { delay }), tone(1900, 0.05, 0.001, 0.03, { delay })]),
  crunch: [hiss(1800, 0.8, 0.22, 0.003, 0.12), hiss(900, 1, 0.14, 0.003, 0.1, { delay: 0.05 })],
  whine: [tone(700, 0.1, 0.08, 0.6, { glideTo: 520 })],
  pthoo: [hiss(1200, 1, 0.2, 0.01, 0.12, { glideTo: 3000 }), tone(240, 0.08, 0.01, 0.1)],
  scrape: [hiss(500, 2, 0.14, 0.05, 0.6, { glideTo: 800 })],
  creakDown: [tone(420, 0.08, 0.1, 0.7, { wave: 'sawtooth', glideTo: 160 })],
  zip: [hiss(1200, 3, 0.14, 0.02, 0.5, { glideTo: 4200 }), tone(500, 0.05, 0.02, 0.5, { glideTo: 1600 })],
  lowBoing: [tone(110, 0.2, 0.005, 0.6, { wave: 'triangle', glideTo: 140 })],
  // The alarm clock: one bell, played differently in every place.
  muffledTicks: seq(6, 0.2, (_, delay) => tone(500, 0.05, 0.002, 0.03, { delay })),
  ring: ringing(1568, 1760, 10, 0.14),
  squawk: [tone(520, 0.26, 0.01, 0.3, { wave: 'sawtooth', glideTo: 900 }), tone(260, 0.1, 0.01, 0.3, { wave: 'square' })],
  hmphLow: [tone(200, 0.1, 0.02, 0.22, { wave: 'sawtooth', glideTo: 140 })],
  gargledRing: [...seq(8, 0.1, (i, delay) => tone(i % 2 ? 620 : 560, 0.1, 0.004, 0.07, { glideTo: i % 2 ? 540 : 480, delay })), hiss(400, 1, 0.06, 0.05, 0.6)],
  ting: [tone(2093, 0.1, 0.002, 0.2)],
  tingHigher: [tone(2349, 0.1, 0.002, 0.2)],
  tingHighest: [tone(2637, 0.1, 0.002, 0.2)],
  clink: [tone(1400, 0.12, 0.002, 0.1), tone(2100, 0.06, 0.002, 0.08, { delay: 0.03 })],
  loudTocks: seq(4, 0.38, (i, delay) => tone(i % 2 ? 330 : 440, 0.12, 0.002, 0.07, { wave: 'square', delay })),
  ringHigh: ringing(2093, 2349, 9, 0.12),
  clatter: [...seq(4, 0.09, (i, delay) => hiss(1500 + i * 400, 2, 0.16, 0.002, 0.05, { delay })), tone(140, 0.14, 0.003, 0.1, { delay: 0.4 })],
  bowlTicks: seq(5, 0.2, (_, delay) => [tone(1200, 0.07, 0.002, 0.04, { delay }), tone(400, 0.03, 0.002, 0.1, { delay })]),
  ringRising: seq(10, 0.11, (i, delay) => tone(1400 + i * 70 + (i % 2) * 180, 0.12, 0.002, 0.07, { delay })),
  howl: [tone(300, 0.16, 0.15, 0.9, { wave: 'sawtooth', glideTo: 620 })],
  clunk: [tone(180, 0.22, 0.003, 0.1), tone(900, 0.08, 0.002, 0.08)],
  tailThumps: seq(5, 0.15, (_, delay) => tone(110, 0.14, 0.003, 0.06, { delay })),
  tickTock: seq(4, 0.38, (i, delay) => tone(i % 2 ? 700 : 1000, 0.1, 0.002, 0.05, { delay })),
  ringThin: ringing(2600, 2800, 10, 0.07),
  pegChatter: seq(8, 0.12, (_, delay) => hiss(3400, 6, 0.08, 0.001, 0.025, { delay })),
  // The boot.
  pokeIn: [hiss(800, 1, 0.1, 0.02, 0.15), tone(300, 0.08, 0.02, 0.12, { glideTo: 220 })],
  hollowHonks: seq(3, 0.42, (_, delay) => [tone(250, 0.12, 0.02, 0.2, { wave: 'square', glideTo: 230, delay }), hiss(350, 2, 0.08, 0.02, 0.2, { delay })]),
  bootFlop: [tone(110, 0.22, 0.004, 0.14, { glideTo: 80 }), hiss(600, 1, 0.14, 0.004, 0.1)],
  deepPlop: [tone(300, 0.24, 0.005, 0.2, { glideTo: 90 }), hiss(900, 1, 0.12, 0.005, 0.16)],
  hornCroak: [tone(150, 0.2, 0.03, 0.5, { wave: 'sawtooth', glideTo: 130 }), tone(300, 0.06, 0.03, 0.4, { wave: 'square' })],
  trickle: seq(6, 0.16, (i, delay) => tone(1500 + ((i * 137) % 500), 0.05, 0.003, 0.05, { glideTo: 1300 + ((i * 137) % 500), delay })),
  clomp: [tone(120, 0.28, 0.003, 0.12, { glideTo: 80 }), hiss(500, 1.2, 0.16, 0.003, 0.07)],
  creakUp: [tone(180, 0.08, 0.1, 0.6, { wave: 'sawtooth', glideTo: 420 })],
  caw: [tone(600, 0.18, 0.01, 0.24, { wave: 'sawtooth', glideTo: 480 }), hiss(1800, 1.5, 0.08, 0.01, 0.2)],
  greatSplash: [hiss(1200, 0.5, 0.34, 0.005, 0.6, { glideTo: 500 }), hiss(3500, 0.8, 0.16, 0.01, 0.5, { delay: 0.05 }), tone(120, 0.2, 0.004, 0.2, { glideTo: 60 })],
  shakeDry: seq(5, 0.12, (_, delay) => hiss(2600, 1, 0.1, 0.01, 0.06, { delay })),
  snap: [hiss(2000, 3, 0.2, 0.002, 0.04), tone(500, 0.1, 0.002, 0.05)],
  growlFlaps: [tone(110, 0.1, 0.05, 0.9, { wave: 'sawtooth', glideTo: 130 }), ...seq(4, 0.3, (_, delay) => hiss(700, 1, 0.14, 0.006, 0.07, { delay }), 0.1)],
  flopDown: [tone(100, 0.22, 0.004, 0.2, { glideTo: 70 }), hiss(500, 0.8, 0.1, 0.01, 0.2)],
  chews: seq(4, 0.24, (_, delay) => hiss(900, 1.5, 0.1, 0.01, 0.08, { delay })),
  flutter: seq(5, 0.09, (_, delay) => hiss(2200, 1.5, 0.08, 0.006, 0.04, { delay })),
  tweet: [tone(2600, 0.1, 0.006, 0.07, { glideTo: 3400 }), tone(3000, 0.08, 0.006, 0.08, { glideTo: 2500, delay: 0.12 })],
  plink: [tone(1760, 0.12, 0.002, 0.14, { glideTo: 1500 })],
  plinkLower: [tone(1320, 0.12, 0.002, 0.14, { glideTo: 1100 })],
  // The cabbage.
  rip: rip(2200, 3600),
  ripHigher: rip(2700, 4200),
  ripLower: rip(1800, 2800),
  ripHighest: rip(3200, 5000),
  munch: [hiss(1000, 1.5, 0.14, 0.004, 0.07), hiss(1200, 1.5, 0.1, 0.004, 0.06, { delay: 0.14 })],
  munchLower: [hiss(800, 1.5, 0.14, 0.004, 0.07), hiss(950, 1.5, 0.1, 0.004, 0.06, { delay: 0.14 })],
  burp: [tone(160, 0.18, 0.02, 0.22, { wave: 'sawtooth', glideTo: 110 })],
  softPlop: [tone(360, 0.14, 0.006, 0.14, { glideTo: 200 }), hiss(1000, 1, 0.06, 0.006, 0.1)],
  leafyFlop: [hiss(1500, 0.8, 0.14, 0.006, 0.14, { glideTo: 800 }), tone(200, 0.08, 0.004, 0.08)],
  ribbit: [tone(210, 0.1, 0.01, 0.1, { wave: 'square', glideTo: 300 }), tone(240, 0.1, 0.01, 0.14, { wave: 'square', glideTo: 340, delay: 0.14 })],
  flump: [hiss(700, 0.7, 0.18, 0.008, 0.18), tone(140, 0.1, 0.005, 0.1)],
  sniffs: seq(2, 0.4, (_, delay) => hiss(2400, 2, 0.1, 0.03, 0.1, { glideTo: 3400, delay })),
  ahh: [tone(400, 0.1, 0.2, 0.25, { wave: 'triangle', glideTo: 640 })],
  sneeze: [hiss(2400, 0.6, 0.36, 0.004, 0.3, { glideTo: 900 }), tone(700, 0.14, 0.004, 0.14, { glideTo: 300 })],
  tumble: seq(4, 0.2, (i, delay) => [tone(170 - i * 14, 0.14, 0.004, 0.1, { wave: 'triangle', delay }), hiss(600, 1, 0.06, 0.004, 0.06, { delay })]),
  unroll: seq(5, 0.22, (i, delay) => hiss(1800 + i * 300, 2, 0.1, 0.006, 0.08, { delay })),
  flapRustle: seq(6, 0.2, (i, delay) => hiss(i % 2 ? 2400 : 1900, 1, 0.08, 0.01, 0.08, { delay })),
  // The egg.
  eggRoll: [tone(700, 0.08, 0.03, 0.4, { wave: 'triangle', glideTo: 820 }), hiss(2000, 3, 0.04, 0.03, 0.4)],
  wiggle: seq(4, 0.14, (_, delay) => hiss(2600, 1, 0.08, 0.01, 0.06, { delay })),
  coo: [tone(330, 0.12, 0.15, 0.9, { wave: 'triangle', glideTo: 300 }), tone(336, 0.08, 0.15, 0.9, { glideTo: 306 })],
  plip: [tone(1300, 0.14, 0.003, 0.07, { glideTo: 1900 })],
  tap: [hiss(2600, 6, 0.12, 0.002, 0.03), tone(1000, 0.06, 0.002, 0.04)],
  bloop: [tone(300, 0.2, 0.006, 0.16, { glideTo: 820 })],
  eggTok: [tone(1100, 0.14, 0.002, 0.05), hiss(3000, 5, 0.06, 0.002, 0.03)],
  softSettle: [hiss(2000, 0.8, 0.08, 0.05, 0.3)],
  fluff: [hiss(2800, 0.8, 0.12, 0.03, 0.25, { glideTo: 3600 })],
  softCaw: [tone(520, 0.08, 0.03, 0.26, { wave: 'sawtooth', glideTo: 440 })],
  scrabble: seq(7, 0.13, (i, delay) => hiss(1400 + (i % 3) * 300, 1.5, 0.12, 0.004, 0.05, { delay })),
  thud: [tone(100, 0.26, 0.003, 0.14, { glideTo: 70 })],
  shuffle: [hiss(800, 1, 0.12, 0.08, 0.5, { glideTo: 500 })],
  pats: seq(3, 0.19, (_, delay) => tone(150, 0.16, 0.003, 0.06, { delay })),
  honkHop: [tone(440, 0.2, 0.01, 0.2, { wave: 'sawtooth', glideTo: 420 }), tone(160, 0.1, 0.003, 0.07, { delay: 0.3 })],
  honkHopHigher: [tone(494, 0.2, 0.01, 0.2, { wave: 'sawtooth', glideTo: 470 }), tone(170, 0.1, 0.003, 0.07, { delay: 0.3 })],
}

type Played = Exclude<CueName, 'act' | 'hush'>

const VOICES: Record<Played, (n: number) => readonly Note[]> = {
  // The raccoon chirps and the first note of the tiptoe tune is plucked, lower when its paws are full (1 and 3);
  // on bare floor (0 and 1) the peg drops in with a tok as well.
  aim: (n) => [
    ...(n < 2 ? [hiss(1800, 3, 0.22, 0.002, 0.05), tone(520, 0.12, 0.003, 0.09, { wave: 'triangle', glideTo: 380 })] : []),
    tone(n % 2 ? 262 : 392, 0.14, 0.004, 0.13, { wave: 'triangle', delay: 0.02 }),
    tone(n % 2 ? 660 : 880, 0.07, 0.01, 0.07, { glideTo: n % 2 ? 880 : 1240, delay: 0.03 }),
  ],
  // One plucked note a push; the second dozen is the same tune lower, for a raccoon that carries.
  step: (n) => [tone(semis(n >= 12 ? 262 : 392, TIPTOE[n % 12]), 0.16, 0.004, 0.13, { wave: 'triangle' }), hiss(2400, 5, 0.035, 0.002, 0.03)],
  // Set down in another groove with a clack, a little lower towards the front.
  hop: (n) => [hiss(2400, 4, 0.18, 0.002, 0.04), tone(360 - n * 30, 0.1, 0.002, 0.06, { wave: 'triangle' })],
  rustle: () => [hiss(3200, 0.8, 0.14, 0.02, 0.22, { glideTo: 1800 }), hiss(2500, 0.9, 0.08, 0.02, 0.16, { delay: 0.1 })],
  lift: (n) => LIFT[n % LIFT.length],
  land: (n) => LAND[n % LAND.length],
  poke: (n) => POKE[n % POKE.length],
  // "Hm?", rising.
  notice: () => [tone(300, 0.12, 0.03, 0.22, { wave: 'sawtooth', glideTo: 520 })],
  // "Hmph", falling.
  hmph: () => [tone(260, 0.1, 0.02, 0.18, { wave: 'sawtooth', glideTo: 170 })],
  honk: () => [tone(440, 0.26, 0.01, 0.32, { wave: 'sawtooth', glideTo: 415 }), tone(466, 0.2, 0.01, 0.3, { wave: 'sawtooth' }), tone(220, 0.1, 0.01, 0.3, { wave: 'square' })],
  // The boot, then a slide whistle up and over.
  kick: () => [tone(92, 0.4, 0.002, 0.12, { glideTo: 52 }), hiss(800, 1, 0.2, 0.002, 0.08), tone(500, 0.13, 0.2, 0.26, { glideTo: 1700, delay: 0.14 }), tone(1700, 0.11, 0.05, 0.42, { glideTo: 420, delay: 0.6 })],
  crash: () => [hiss(2000, 0.6, 0.3, 0.005, 0.35), hiss(4000, 0.8, 0.12, 0.01, 0.3, { delay: 0.15 }), tone(140, 0.2, 0.004, 0.14, { glideTo: 90 })],
  // Three pleased clucks.
  gloat: () => [0, 0.14, 0.3].map((delay, i) => tone(380 + i * 24, 0.08, 0.008, 0.07, { wave: 'sawtooth', glideTo: 330, delay: 0.5 + delay })),
  pluck: () => [tone(660, 0.2, 0.002, 0.2, { wave: 'triangle', glideTo: 330 }), tone(520, 0.26, 0.01, 0.28, { wave: 'sawtooth', glideTo: 760, delay: 0.08 })],
  // The half-door bangs open, as the finger lands.
  door: () => [hiss(300, 1, 0.3, 0.003, 0.12), tone(120, 0.2, 0.003, 0.1, { glideTo: 90 })],
  // Out of the door he whistles: two notes when there is something to tidy, one falling note when there is not.
  whistle: (n) => (n ? [tone(1320, 0.1, 0.03, 0.16), tone(1760, 0.1, 0.03, 0.2, { delay: 0.2 })] : [tone(990, 0.09, 0.03, 0.3, { glideTo: 780 })]),
  // Woken by a tap: a snort, and his hat creaks back.
  wake: () => [tone(150, 0.12, 0.02, 0.16, { wave: 'sawtooth', glideTo: 240 }), hiss(1400, 3, 0.05, 0.05, 0.2, { glideTo: 2000, delay: 0.1 })],
  // A cloud's wire squeaks, each cloud at its own pitch.
  cloud: (n) => [tone(1900 + n * 260, 0.05, 0.03, 0.1, { glideTo: 2400 + n * 260 }), tone(2100 + n * 260, 0.04, 0.03, 0.12, { glideTo: 1700 + n * 260, delay: 0.12 })],
  curtain: () => [hiss(500, 0.6, 0.12, 0.08, 0.4, { glideTo: 320 })],
  // The sun whirled on its pin: a bright whirr up and down again.
  sun: () => [tone(1320, 0.06, 0.05, 0.5, { glideTo: 2640 }), tone(2640, 0.04, 0.02, 0.3, { glideTo: 1760, delay: 0.5 })],
  // An apple out of the tree: a rustle of leaves, and a soft thud in the grass.
  apple: () => [hiss(2600, 1, 0.1, 0.02, 0.18), tone(140, 0.16, 0.004, 0.12, { glideTo: 100, delay: APPLE_FALLS * 0.9 })],
  // The picket fence rattled: three dry knocks running up, and a tweet.
  fence: () => [tone(520, 0.12, 0.002, 0.05, { wave: 'triangle' }), tone(600, 0.11, 0.002, 0.05, { wave: 'triangle', delay: 0.08 }), tone(690, 0.1, 0.002, 0.05, { wave: 'triangle', delay: 0.16 }), tone(3100, 0.06, 0.01, 0.08, { glideTo: 3700, delay: 0.3 })],
  // A bird flushed out of the far hills: three thin chirps going away.
  hill: () => [tone(3400, 0.05, 0.008, 0.07, { glideTo: 3900 }), tone(3600, 0.04, 0.008, 0.07, { glideTo: 4100, delay: 0.16 }), tone(3800, 0.03, 0.008, 0.07, { glideTo: 4300, delay: 0.32 })],
  // A knock on the barn wall: hollow boards.
  knock: () => [tone(170, 0.22, 0.003, 0.14, { wave: 'triangle', glideTo: 120 }), tone(150, 0.18, 0.003, 0.14, { wave: 'triangle', glideTo: 110, delay: 0.16 })],
  // A knock on the gilt frame: the apron low, the pelmet higher.
  frame: (n) => [tone(n ? 310 : 230, 0.2, 0.003, 0.12, { wave: 'triangle', glideTo: n ? 260 : 190 }), hiss(n ? 2400 : 1600, 3, 0.05, 0.002, 0.05)],
  // The half-door pushed ajar: a slow dry creak up and a shorter one back.
  creak: () => [tone(210, 0.3, 0.04, 0.07, { wave: 'sawtooth', glideTo: 330 }), tone(320, 0.18, 0.02, 0.05, { wave: 'sawtooth', glideTo: 230, delay: 0.3 })],
  ruffle: () => [hiss(2500, 1.2, 0.1, 0.01, 0.12), tone(330, 0.06, 0.01, 0.1, { wave: 'sawtooth', glideTo: 300, delay: 0.04 })],
  // Her feet, very quietly, one after the other.
  waddle: (n) => [tone(170 + (n % 2) * 30, 0.03, 0.004, 0.05)],
  // A cluck with each nod at her egg, the second a little higher.
  nestCluck: (n) => [tone(300 + n * 34, 0.1, 0.008, 0.08, { wave: 'sawtooth', glideTo: 260 + n * 34 })],
  // One puzzled honk at an empty nest, rising like a question.
  nestPuzzled: () => [tone(330, 0.14, 0.02, 0.3, { wave: 'sawtooth', glideTo: 470 })],
}

/** The notes of one cue. A cue that only hushes has none. */
export function notesOf(cue: Cue): readonly Note[] {
  if (cue.name === 'hush') return []
  if (cue.name === 'act') return ACTS[cue.sound ?? ''] ?? []
  return VOICES[cue.name](cue.n)
}

/** Everything one moment set off, as the notes of one voice. */
export function notesOfAll(cues: readonly Cue[]): Note[] {
  return cues.flatMap((cue) => notesOf(cue))
}

/** Every cue with how many variants it has, for the test that holds them in range. */
export const VARIANTS: Record<Played, number> = {
  aim: 4, step: 24, hop: 4, rustle: 1, lift: 6, land: 6, poke: 5, notice: 1, hmph: 1, honk: 1, kick: 1, crash: 1,
  gloat: 1, pluck: 1, door: 1, whistle: 2, wake: 1, creak: 1, cloud: 3, curtain: 1, sun: 1, apple: 1, fence: 1, knock: 1, frame: 2, hill: 1, ruffle: 1, waddle: 2, nestCluck: 2, nestPuzzled: 1,
}

type Gain = { gain: { value: number; cancelScheduledValues(at: number): unknown; setValueAtTime(value: number, at: number): unknown; setTargetAtTime(value: number, at: number, over: number): unknown }; connect(to: AudioNode): unknown; disconnect(): unknown }

/**
 * Everything the yard sounds goes out through one gain node, so that what is still ringing can be hushed. When a
 * touch ends a scene, a punt or the tidy, the notes already started are faded out in a few hundredths of a second
 * and the sounds of the touch itself go out through a fresh node: no sound of a scene outlasts the scene.
 */
export class Bus {
  private live: { context: AudioContext; gain: Gain } | null = null

  /**
   * Cuts whatever is sounding, at once and for good: the node is silenced and taken off the output, with no fade
   * left to finish later. For a game that is put away, whose sound is suspended in the same moment: nothing of
   * what was sounding is left to be heard when it comes back.
   */
  cut(): void {
    if (!this.live) return
    const { gain } = this.live
    gain.gain.cancelScheduledValues(0)
    gain.gain.value = 0
    gain.disconnect()
    this.live = null
  }

  /** The voice, sent through the bus. With `hush`, whatever was sounding is faded first. */
  through(voice: Voice, hush: boolean): Voice {
    return (context, out, at) => {
      if (hush && this.live && this.live.context === context) {
        this.live.gain.gain.cancelScheduledValues(at)
        this.live.gain.gain.setTargetAtTime(0, at, 0.02)
        this.live = null
      }
      if (!this.live || this.live.context !== context) {
        const gain = context.createGain() as unknown as Gain
        gain.gain.setValueAtTime(1, at)
        gain.connect(out)
        this.live = { context, gain }
      }
      voice(context, this.live.gain as unknown as AudioNode, at)
    }
  }
}
