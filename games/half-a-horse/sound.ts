import type { Note } from './audio'
import type { Who } from './ends'

// Every sound as plain numbers. One named voice for each thing that happens;
// who is inside (the quick high goose or the slow low bear) shifts an end's
// own voices, and `n` picks a variant or follows a size.

type Make = (pitch: number, slow: number, n: number) => Note[]
const t = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'tone', frequency, peak, attack, decay, ...more })
const z = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'noise', frequency, peak, attack, decay, ...more })

const VOICES = {
  // The toy.
  pat: (p, s) => [t(190 * p, 0.16, 0.004, 0.11 * s, { glideTo: 120 * p }), z(700 * p, 0.06, 0.002, 0.06)],
  clop: (p, s, n) => [z(1500 * p + 160 * (n % 3), 0.09, 0.002, 0.045 * s, { q: 6 }), t(320 * p + 24 * (n % 3), 0.05, 0.002, 0.04)],
  shuffle: (p, s, n) => [z(420 * p + 60 * (n % 3), 0.06, 0.02, 0.1 * s, { q: 2 })],
  flutter: (p) => [z(900 * p, 0.05, 0.02, 0.1, { q: 3 }), z(1100 * p, 0.04, 0.02, 0.1, { q: 3, delay: 0.09 })],
  grumble: () => [t(98, 0.12, 0.04, 0.34, { wave: 'sawtooth', glideTo: 78 })],
  thump: (p, s, n) => [t(120 * p - 10 * Math.min(3, n), 0.16 + 0.03 * Math.min(3, n), 0.004, 0.16 * s, { glideTo: 60 }), z(260, 0.08, 0.003, 0.1)],
  plump: (p, s, n) => [t(92 * p, 0.2, 0.005, 0.22 * s, { glideTo: 48 }), t(150 * p, 0.05, 0.02, 0.24, { delay: 0.06 + 0.01 * (n % 3), glideTo: 110 * p })],
  creak: (_p, _s, n) => [t(180 + 46 * n, 0.035, 0.02, 0.12, { wave: 'triangle', glideTo: 205 + 50 * n }), z(900 + 120 * n, 0.018, 0.02, 0.09, { q: 8 })],
  // The eight acts.
  act0: (p, s) => [t(720 * p, 0.14, 0.03, 0.5 * s, { wave: 'sawtooth', glideTo: 330 * p }), t(960 * p, 0.06, 0.02, 0.35, { delay: 0.06, wave: 'triangle', glideTo: 500 * p }), z(500, 0.07, 0.04, 0.22, { delay: 0.45 * s, q: 2 })],
  act1: (p, s) => [0, 0.22, 0.44].map((delay) => z(2400 * p, 0.11, 0.001, 0.03, { q: 9, delay: delay * s + 0.06 })).concat([t(560 * p, 0.08, 0.02, 0.16, { delay: 0.6 * s, wave: 'square', glideTo: 430 * p })]),
  act2: (p, s) => [t(220 * p, 0.14, 0.05, 0.6 * s, { wave: 'sawtooth', glideTo: 440 * p }), t(331 * p, 0.09, 0.05, 0.6 * s, { wave: 'sawtooth', glideTo: 662 * p }), z(1200, 0.05, 0.1, 0.5)],
  act3: (p, s) => [t(130 * p, 0.09, 0.2, 0.22 * s, { wave: 'sawtooth', glideTo: 260 * p }), z(3000 * p, 0.2, 0.001, 0.05, { q: 3, delay: 0.5 * s }), t(240 * p, 0.14, 0.001, 0.07, { delay: 0.5 * s })],
  act4: (p, s) => [z(1900 * p, 0.14, 0.001, 0.05, { q: 7, delay: 0.24 * s }), z(1500 * p, 0.14, 0.001, 0.06, { q: 7, delay: 0.32 * s }), z(600, 0.05, 0.05, 0.16, { delay: 0.1 })],
  act5: (p, s) => [t(420 * p, 0.09, 0.02, 0.1, { wave: 'square', glideTo: 470 * p }), t(430 * p, 0.09, 0.02, 0.1, { wave: 'square', delay: 0.2 * s, glideTo: 480 * p }), t(520 * p, 0.12, 0.02, 0.26, { wave: 'square', delay: 0.5 * s, glideTo: 760 * p })],
  act6: (p, s) => [t(70 * p, 0.34, 0.004, 0.5 * s, { delay: 0.26 * s, glideTo: 34 }), z(160, 0.2, 0.004, 0.3, { delay: 0.26 * s }), t(300 * p, 0.04, 0.05, 0.2, { glideTo: 200 * p })],
  act7: (p, s) => [z(500 * p, 0.13, 0.08, 0.5 * s, { q: 1.4, delay: 0.14, glideTo: 2200 * p }), t(180 * p, 0.05, 0.05, 0.3, { wave: 'triangle', delay: 0.2 })],
  // The cloth.
  wobble: (_p, _s, n) => [t(260 + 14 * n, 0.12, 0.004, 0.3, { glideTo: 225 + 14 * n }), t(392 + 20 * n, 0.05, 0.01, 0.24, { delay: 0.05 })],
  bend: () => [t(160, 0.08, 0.03, 0.14, { wave: 'triangle', glideTo: 240 })],
  boing: () => [t(150, 0.18, 0.004, 0.34, { glideTo: 420 }), t(300, 0.06, 0.02, 0.26, { delay: 0.08, glideTo: 520 })],
  // The routines.
  trot: () => [0, 0.11, 0.2, 0.44, 0.55, 0.64].map((delay, i) => z(1300 + 250 * (i % 3), 0.13, 0.002, 0.05, { q: 6, delay })),
  leap: () => [t(500, 0.12, 0.05, 0.22, { glideTo: 1500 }), t(1500, 0.1, 0.02, 0.28, { delay: 0.28, glideTo: 480 }), t(80, 0.3, 0.004, 0.3, { glideTo: 40 })],
  twang: () => [t(98, 0.3, 0.003, 0.7, { wave: 'sawtooth', glideTo: 92 }), t(196, 0.12, 0.003, 0.5, { wave: 'triangle' }), t(620, 0.1, 0.003, 0.16, { glideTo: 180 })],
  bow: () => [z(1200, 0.14, 0.04, 0.3, { q: 5, glideTo: 4200 }), t(660, 0.09, 0.005, 0.18, { delay: 0.32 })],
  unbow: () => [z(4200, 0.12, 0.03, 0.28, { q: 5, glideTo: 1000 })],
  seesaw: () => [t(640, 0.1, 0.03, 0.22, { wave: 'triangle', glideTo: 900 }), t(420, 0.12, 0.03, 0.3, { wave: 'triangle', delay: 0.26, glideTo: 300 })],
  tower: () => [262, 330, 392, 523, 659].map((frequency, i) => t(frequency, 0.09, 0.01, 0.16, { delay: i * 0.08, wave: 'triangle', glideTo: frequency * 1.06 })),
  squash: () => [t(150, 0.2, 0.02, 0.6, { wave: 'sawtooth', glideTo: 74 }), z(240, 0.14, 0.03, 0.55, { q: 4, glideTo: 130 }), t(88, 0.1, 0.02, 0.16, { delay: 0.64, wave: 'sawtooth', glideTo: 62 })],
  skip: () => [z(700, 0.1, 0.08, 0.16, { q: 3, glideTo: 1500 }), z(1500, 0.08, 0.03, 0.16, { q: 3, delay: 0.2, glideTo: 600 }), t(880, 0.07, 0.01, 0.09, { wave: 'square', delay: 0.22, glideTo: 1100 })],
  // Food.
  squeak: (_p, _s, n) => [t(880 + 60 * (n % 4), 0.09, 0.004, 0.09, { glideTo: 1200 + 60 * (n % 4) })],
  rumble: (_p, _s, n) => [z(180 + 20 * (n % 4), 0.06, 0.02, 0.1, { q: 3 })],
  tock: (_p, _s, n) => [t(520 - 30 * Math.min(4, n), 0.1, 0.002, 0.06, { glideTo: 420 })],
  pip: () => [t(1050, 0.08, 0.002, 0.06, { wave: 'square', glideTo: 1250 })],
  munch: () => [0, 0.16, 0.32].map((delay) => z(1100, 0.12, 0.004, 0.08, { q: 1.5, delay })).concat([t(110, 0.12, 0.03, 0.3, { delay: 0.55, wave: 'triangle', glideTo: 80 })]),
  plop: () => [t(700, 0.12, 0.005, 0.12, { glideTo: 260 })],
  rustle: (_p, _s, n) => [z(2200 + 200 * (n % 4), 0.04, 0.02, 0.08, { q: 1 })],
  // The line.
  ping: () => [t(1320, 0.1, 0.002, 0.24), z(3000, 0.05, 0.002, 0.05, { q: 4 })],
  snap: () => [z(2600, 0.16, 0.001, 0.03, { q: 5 }), t(440, 0.1, 0.002, 0.1)],
  snapHigh: () => [z(3100, 0.16, 0.001, 0.03, { q: 5 }), t(554, 0.1, 0.002, 0.1)],
  flap: () => [z(800, 0.08, 0.02, 0.1), z(700, 0.07, 0.02, 0.1, { delay: 0.13 })],
  pants: (p) => [t(500 * p, 0.08, 0.01, 0.12, { glideTo: 760 * p })],
  lace: () => [t(300, 0.07, 0.004, 0.2, { wave: 'triangle' }), t(305, 0.05, 0.004, 0.3, { wave: 'triangle', delay: 0.07 })],
  // The farmer.
  whoop: () => [t(260, 0.13, 0.05, 0.3, { wave: 'triangle', glideTo: 560 })],
  braces: (_p, _s, n) => [t(230 + 18 * (n % 3), 0.06, 0.03, 0.14, { wave: 'sawtooth', glideTo: 280 })],
  bracesPing: () => [t(900, 0.1, 0.002, 0.2, { wave: 'triangle', glideTo: 700 })],
  halloo: () => [t(294, 0.12, 0.04, 0.22, { wave: 'triangle' }), t(392, 0.12, 0.04, 0.36, { wave: 'triangle', delay: 0.26 })],
  mumble: () => [0, 0.17, 0.34, 0.51].map((delay, i) => t(150 - 12 * (i % 2), 0.09, 0.03, 0.12, { wave: 'triangle', delay })),
  hum: () => [196, 220, 247, 196].map((frequency, i) => t(frequency, 0.09, 0.04, 0.26, { delay: i * 0.28, wave: 'sine' })),
  plunk: () => [t(146, 0.2, 0.003, 0.4, { wave: 'triangle', glideTo: 140 })],
  meet0: () => [0, 0.2, 0.4].map((delay) => z(1700, 0.16, 0.002, 0.1, { q: 1, delay })),
  meet1: () => [0.1, 0.42, 0.74].map((delay, i) => z(3600 - 300 * i, 0.12, 0.001, 0.03, { q: 12, delay })),
  meet2: () => [t(240, 0.14, 0.01, 0.1, { glideTo: 760 }), t(760, 0.07, 0.05, 0.2, { delay: 1.5, glideTo: 240 })],
  meet3: () => [z(3800, 0.18, 0.001, 0.04, { q: 4 }), z(3000, 0.1, 0.001, 0.04, { q: 4, delay: 0.07 })],
  meet4: () => [z(900, 0.06, 0.1, 0.2, { glideTo: 1500 }), z(2600, 0.2, 0.01, 0.22, { delay: 0.8, glideTo: 500 }), t(330, 0.12, 0.01, 0.16, { delay: 0.8, wave: 'sawtooth', glideTo: 160 })],
  meet5: () => [t(1568, 0.12, 0.001, 0.4, { delay: 0.5 }), t(2093, 0.06, 0.001, 0.3, { delay: 0.5 })],
  meet6: () => [t(130, 0.12, 0.2, 0.5, { wave: 'sawtooth', glideTo: 96 }), z(700, 0.06, 0.2, 0.4, { q: 9, glideTo: 420 })],
  meet7: () => [0, 0.14, 0.28, 0.42, 0.56].map((delay, i) => z(1400 + 300 * (i % 2), 0.12, 0.002, 0.06, { q: 8, delay })),
  // The rest of the yard.
  moo: () => [t(150, 0.14, 0.1, 0.6, { wave: 'sawtooth', glideTo: 118 })],
  squawk: () => [t(900, 0.1, 0.01, 0.1, { wave: 'square', glideTo: 1300 }), t(1100, 0.08, 0.01, 0.12, { wave: 'square', delay: 0.14, glideTo: 700 })],
  splat: () => [t(170, 0.13, 0.02, 0.16, { wave: 'sawtooth', glideTo: 120 }), z(340, 0.16, 0.01, 0.2, { delay: 0.14 })],
  splash: (_p, _s, n) => [z(1800 + 150 * (n % 3), 0.11, 0.01, 0.26, { q: 0.7, glideTo: 700 })],
  leaves: () => [z(3200, 0.08, 0.05, 0.3, { q: 0.6 }), t(700, 0.05, 0.01, 0.12, { delay: 0.12, glideTo: 480 })],
  fence: (_p, _s, n) => [t(240 + 30 * (n % 4), 0.1, 0.002, 0.09, { wave: 'triangle' }), z(900, 0.06, 0.002, 0.05)],
  post: () => [t(196, 0.13, 0.002, 0.14, { wave: 'triangle' }), t(294, 0.06, 0.002, 0.1)],
  door: () => [z(500, 0.08, 0.1, 0.3, { q: 6, glideTo: 260 }), t(110, 0.16, 0.004, 0.14, { delay: 0.4 })],
  pit: (_p, _s, n) => [z(600 + 80 * (n % 4), 0.07, 0.004, 0.08)],
  extra: (_p, _s, n) => [t(440 + 40 * (n % 3), 0.05, 0.004, 0.07)],
  patter: (p) => [0, 0.09, 0.18].map((delay) => z(1100 * p, 0.06, 0.002, 0.04, { q: 5, delay })),
  yawn: (p, s) => [t(300 * p, 0.12, 0.2, 0.7 * s, { wave: 'triangle', glideTo: 150 * p })],
  snoreHigh: () => [t(900, 0.05, 0.3, 0.4, { glideTo: 1250 })],
  snoreLow: () => [z(120, 0.16, 0.3, 0.5, { q: 5 }), t(70, 0.08, 0.3, 0.5, { wave: 'sawtooth', glideTo: 62 })],
} satisfies Record<string, Make>

export type Sound = keyof typeof VOICES
export const SOUNDS = Object.keys(VOICES) as Sound[]

/** The goose is high and quick, the bear low and slow; what belongs to neither is as written. */
export function notes(sound: Sound, who: Who | null = null, n = 0): Note[] {
  return (VOICES[sound] as Make)(who === 0 ? 1.22 : who === 1 ? 0.72 : 1, who === 0 ? 0.9 : who === 1 ? 1.2 : 1, n)
}
