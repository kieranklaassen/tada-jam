import type { Note } from './audio'
import type { Turn } from './cast'
import type { Kind } from './row'

// Every sound as plain numbers. `p` is a pitch factor (a customer's own voice
// or a size) and `n` a step, so a thing done again is never quite the same.

const t = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'tone', frequency, peak, attack, decay, ...more })
const z = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'noise', frequency, peak, attack, decay, ...more })
const times = (n: number, gap: number, make: (i: number) => Note[]): Note[] => Array.from({ length: n }, (_, i) => make(i).map((note) => ({ ...note, delay: (note.delay ?? 0) + i * gap }))).flat()

/** Foil under a finger: dry little crackles. */
const crackle = (n = 3, at = 0): Note[] => times(n, 0.034, (i) => [z(3600 + 700 * ((i * 5) % 3), 0.07, 0.001, 0.024, { q: 2.5, delay: at })])
const quack = (p: number, delay = 0): Note[] => [t(470 * p, 0.1, 0.008, 0.11, { wave: 'sawtooth', glideTo: 330 * p, delay }), z(1200 * p, 0.05, 0.01, 0.09, { q: 4, delay })]

type Make = (p: number, n: number) => Note[]
export const VOICES = {
  // The pieces: a press, a skid, a bump, a flop, a scoot, a hop home.
  pressSausage: () => [...crackle(3), t(250, 0.1, 0.004, 0.1, { glideTo: 320 })],
  pressShoe: () => [...crackle(2), z(900, 0.1, 0.002, 0.05, { q: 3 }), t(150, 0.1, 0.003, 0.06)],
  pressDuck: () => [...crackle(2), ...quack(1.25)],
  skidSausage: (p, n) => [t(620 * p + 40 * (n % 3), 0.035, 0.015, 0.07, { glideTo: 700 * p + 40 * (n % 3) }), z(1500 * p, 0.02, 0.01, 0.06, { q: 6 })],
  skidShoe: (p, n) => [z(430 * p + 50 * (n % 3), 0.07, 0.01, 0.08, { q: 2.4 })],
  skidDuck: (p, n) => quack(1.1 * p + 0.08 * (n % 3)).map((note) => ({ ...note, peak: note.peak * 0.6 })),
  bump: (p, n) => [z(1700, 0.13, 0.001, 0.035, { q: 5 }), t(330 * p + 34 * (n % 5), 0.13, 0.002, 0.08, { wave: 'triangle' })],
  kiss: () => [t(760, 0.06, 0.004, 0.05, { glideTo: 1250 }), z(2600, 0.05, 0.002, 0.03, { q: 6, delay: 0.03 })],
  layDown: () => [...crackle(2), t(170, 0.11, 0.004, 0.09, { glideTo: 120 })],
  flopSausage: () => [t(130, 0.16, 0.004, 0.36, { glideTo: 340 }), t(260, 0.06, 0.02, 0.28, { delay: 0.08, glideTo: 480 })],
  flopShoe: () => [t(86, 0.26, 0.003, 0.17, { glideTo: 54 }), z(500, 0.13, 0.002, 0.07), ...crackle(3, 0.1)],
  flopDuck: () => [...quack(1.5), ...quack(0.75, 0.15)],
  scootSausage: () => [t(260, 0.08, 0.02, 0.34, { glideTo: 720 }), t(220, 0.13, 0.003, 0.1, { delay: 0.36, glideTo: 170 })],
  scootShoe: () => [z(1250, 0.13, 0.001, 0.045, { q: 6 }), z(1000, 0.13, 0.001, 0.05, { q: 6, delay: 0.17 }), t(140, 0.14, 0.002, 0.08, { delay: 0.35 })],
  scootDuck: () => [...quack(1.2), ...quack(1.35, 0.16), t(1150, 0.07, 0.002, 0.06, { delay: 0.36, glideTo: 1400 })],
  stuck: (p) => [t(190 * p, 0.09, 0.004, 0.1, { wave: 'square', glideTo: 160 * p }), ...crackle(2)],
  hopHome: (p) => [t(420 * p, 0.08, 0.006, 0.16, { glideTo: 840 * p }), ...crackle(2, 0.24), t(190, 0.09, 0.003, 0.08, { delay: 0.3 })],
  full: () => [t(120, 0.14, 0.004, 0.34, { glideTo: 420 }), t(190, 0.08, 0.004, 0.12, { delay: 0.34, glideTo: 130 })],
  tear: () => [z(1300, 0.17, 0.02, 0.5, { q: 1.3, glideTo: 5200 }), ...crackle(6, 0.1), t(520, 0.06, 0.01, 0.18, { delay: 0.5, glideTo: 780 })],
  coverPress: () => [...crackle(5), t(95, 0.1, 0.004, 0.1)],
  // Customers.
  ...({
    tickleCroc: (p) => times(4, 0.13, (i) => [z(2100, 0.15, 0.001, 0.04, { q: 4 }), t((210 + 26 * i) * p * 1.6, 0.07, 0.01, 0.08, { wave: 'triangle' })]),
    tickleDog: (p) => [...times(6, 0.075, () => [t(140, 0.13, 0.002, 0.05)]), t(620 * p, 0.08, 0.03, 0.3, { glideTo: 900 * p, delay: 0.1 })],
    tickleSnail: (p) => [t(520 * p, 0.1, 0.004, 0.09, { glideTo: 240 * p }), t(240 * p, 0.1, 0.004, 0.12, { delay: 0.42, glideTo: 640 * p })],
    tickleSeal: (p) => times(3, 0.17, (i) => [z(900, 0.2, 0.001, 0.06, { q: 1.5 }), t((330 + 30 * i) * p, 0.1, 0.02, 0.12, { wave: 'sawtooth', glideTo: 290 * p })]),
    ticklePython: (p) => [z(4200, 0.09, 0.05, 0.4, { q: 2 }), t(300 * p, 0.06, 0.05, 0.3, { glideTo: 620 * p, delay: 0.2 }), t(620 * p, 0.06, 0.02, 0.2, { glideTo: 300 * p, delay: 0.52 })],
  } satisfies Record<string, Make>),
  purr: (p, n) => [t(88 * p + 8 * (n % 3), 0.1, 0.02, 0.13, { wave: 'triangle' }), t(176 * p, 0.04, 0.02, 0.1)],
  noseRub: () => times(4, 0.11, (i) => [t(700 + 90 * (i % 2), 0.08, 0.01, 0.08, { glideTo: 560 + 90 * (i % 2) })]),
  bellies: (p) => [t(78, 0.28, 0.004, 0.22, { glideTo: 46 }), t(300 * p, 0.08, 0.03, 0.24, { delay: 0.16, wave: 'triangle', glideTo: 380 * p }), t(440 * p, 0.08, 0.03, 0.24, { delay: 0.3, wave: 'triangle', glideTo: 520 * p })],
  noRoom: () => [t(96, 0.2, 0.004, 0.5, { wave: 'triangle', glideTo: 380 }), t(150, 0.1, 0.004, 0.4, { delay: 0.1, glideTo: 520 })],
  call: (p) => [t(390 * p, 0.12, 0.04, 0.2, { wave: 'triangle', glideTo: 560 * p }), t(560 * p, 0.12, 0.03, 0.26, { wave: 'triangle', delay: 0.26, glideTo: 420 * p })],
  chatter: () => times(9, 0.07, (i) => [z(2700 + 250 * (i % 2), 0.1, 0.001, 0.022, { q: 7 })]),
  smell: (p) => [z(1800, 0.06, 0.12, 0.12, { q: 1.5 }), t(330 * p, 0.09, 0.1, 0.5, { delay: 0.3, glideTo: 240 * p })],
  groan: (p) => [t(210 * p, 0.1, 0.08, 0.6, { wave: 'sawtooth', glideTo: 130 * p })],
  hum: (p) => [t(262 * p, 0.09, 0.05, 0.24), t(330 * p, 0.09, 0.05, 0.24, { delay: 0.26 }), t(294 * p, 0.09, 0.05, 0.34, { delay: 0.52 })],
  // How they take a piece.
  lick: () => [z(700, 0.15, 0.08, 0.3, { q: 2, glideTo: 2400 }), t(340, 0.07, 0.05, 0.2, { delay: 0.3, glideTo: 620 })],
  gulp: () => [t(240, 0.18, 0.01, 0.14, { glideTo: 80 }), t(150, 0.1, 0.1, 0.5, { delay: 0.3, glideTo: 90 }), z(600, 0.16, 0.01, 0.12, { delay: 1.1, q: 1.5 }), t(90, 0.16, 0.005, 0.16, { delay: 1.1, glideTo: 260 })],
  gasp: () => [z(1400, 0.16, 0.16, 0.06, { q: 1, glideTo: 3600 }), t(1100, 0.09, 0.02, 0.4, { delay: 0.26, glideTo: 700 })],
  poke: () => [t(980, 0.09, 0.002, 0.07), t(820, 0.09, 0.002, 0.07, { delay: 0.3 }), t(1240, 0.07, 0.01, 0.16, { delay: 0.55, glideTo: 1500 })],
  spit: () => [z(900, 0.14, 0.04, 0.1, { q: 2 }), z(3000, 0.18, 0.002, 0.08, { delay: 0.18, q: 1.2 }), t(300, 0.1, 0.01, 0.2, { delay: 0.2, glideTo: 900 })],
  chew: () => [t(105, 0.12, 0.05, 0.6, { wave: 'sawtooth', glideTo: 90 }), ...times(4, 0.15, () => [z(520, 0.12, 0.004, 0.07, { q: 1.5 })])],
  kissShoe: () => [t(540, 0.1, 0.06, 0.1, { glideTo: 900 }), z(2400, 0.16, 0.001, 0.05, { q: 3, delay: 0.2 }), t(700, 0.08, 0.02, 0.22, { delay: 0.3, glideTo: 980 })],
  sneeze: () => [t(220, 0.09, 0.2, 0.16, { glideTo: 420 }), z(2000, 0.3, 0.004, 0.28, { q: 0.8, delay: 0.5, glideTo: 500 }), t(160, 0.16, 0.004, 0.14, { delay: 0.5, glideTo: 70 })],
  shut: () => [t(420, 0.1, 0.01, 0.12, { glideTo: 150 }), z(2900, 0.16, 0.001, 0.04, { q: 8, delay: 0.16 }), t(680, 0.05, 0.03, 0.12, { delay: 0.9, glideTo: 820 })],
  search: () => [z(5200, 0.1, 0.1, 0.9, { q: 2, glideTo: 3000 }), t(200, 0.05, 0.2, 0.5, { glideTo: 260 })],
  hat: () => [t(1568, 0.1, 0.003, 0.5), t(1976, 0.07, 0.003, 0.6, { delay: 0.12 }), ...quack(1.4, 0.4)],
  stiff: () => [t(520, 0.09, 0.02, 0.8, { glideTo: 640 }), t(528, 0.05, 0.02, 0.8, { glideTo: 618 }), ...quack(1.1, 0.5)],
  bark: () => [t(300, 0.16, 0.005, 0.09, { wave: 'square', glideTo: 210 }), ...quack(1.2, 0.26), t(320, 0.16, 0.005, 0.09, { wave: 'square', delay: 0.52, glideTo: 220 }), ...quack(1.35, 0.78)],
  balance: () => [t(880, 0.09, 0.1, 0.2, { glideTo: 1040 }), t(1040, 0.09, 0.05, 0.2, { delay: 0.3, glideTo: 840 }), t(840, 0.09, 0.05, 0.4, { delay: 0.55, glideTo: 1180 })],
  cross: () => times(8, 0.1, (i) => [z(3400 - 160 * i, 0.07, 0.002, 0.05, { q: 5 })]),
  // The jumper.
  puffSausage: () => [t(300, 0.12, 0.003, 0.1, { glideTo: 620 }), ...crackle(4)],
  puffShoe: () => [z(1050, 0.12, 0.001, 0.05, { q: 5 }), t(210, 0.1, 0.002, 0.07), ...crackle(4, 0.04)],
  puffDuck: () => [...quack(1.35), ...crackle(4, 0.05)],
  ripple: (_p, n) => crackle(3).map((note) => ({ ...note, frequency: note.frequency * (1 + 0.06 * (n % 6)) })),
  off: () => [t(180, 0.2, 0.004, 0.16, { glideTo: 760 }), ...crackle(9, 0.1)],
  tinsel: () => [z(6200, 0.06, 0.2, 1, { q: 1.6 }), ...times(6, 0.15, () => crackle(2))],
  whistle: () => [t(1180, 0.06, 0.2, 0.5, { glideTo: 1420 }), t(1400, 0.05, 0.1, 0.5, { delay: 0.6, glideTo: 1100 })],
  air: () => [z(4400, 0.1, 0.001, 0.03, { q: 6 }), z(4000, 0.1, 0.001, 0.03, { q: 6, delay: 0.2 }), t(620, 0.08, 0.02, 0.2, { delay: 0.5, glideTo: 480, wave: 'triangle' })],
  closeUp: (_p, n) => [z(4200, 0.09, 0.001, 0.03, { q: 6 }), z(3600, 0.07, 0.002, 0.04, { q: 3, delay: 0.07 }), t(262 + 30 * (n % 4), 0.1, 0.02, 0.2, { glideTo: 392 + 30 * (n % 4), delay: 0.14 }), ...crackle(4, 0.16)],
  short: () => [...times(7, 0.08, (i) => [z(2500 + 200 * (i % 2), 0.1, 0.001, 0.022, { q: 7 })]), t(1500, 0.06, 0.02, 0.3, { delay: 0.5, glideTo: 1900 })],
  long: () => [t(700, 0.09, 0.02, 0.2, { glideTo: 320 }), z(400, 0.2, 0.004, 0.14, { delay: 0.28 }), t(1500, 0.08, 0.004, 0.09, { delay: 0.4, wave: 'square', glideTo: 1900 }), t(1700, 0.08, 0.004, 0.09, { delay: 0.54, wave: 'square', glideTo: 1400 })],
  hole: () => [t(1000, 0.07, 0.1, 0.4, { glideTo: 1300 })],
  bulge: () => [t(230, 0.1, 0.05, 0.18, { wave: 'sawtooth', glideTo: 340 }), t(340, 0.07, 0.02, 0.16, { delay: 0.2, wave: 'sawtooth', glideTo: 220 })],
  warm: (p) => [t(240 * p, 0.12, 0.1, 0.5, { glideTo: 180 * p }), t(360 * p, 0.05, 0.1, 0.5, { glideTo: 270 * p })],
  // The magpie and the shop.
  trill: () => times(6, 0.05, (i) => [t(1300 + 180 * (i % 2), 0.08, 0.003, 0.04)]),
  click: () => [z(3000, 0.14, 0.001, 0.02, { q: 9 })],
  scarf: () => times(5, 0.07, () => [t(150, 0.1, 0.02, 0.05, { wave: 'triangle' })]),
  toot: () => [t(392, 0.13, 0.02, 0.26, { wave: 'square', glideTo: 380 })],
  argue: () => [...times(5, 0.07, () => [z(2600, 0.1, 0.001, 0.03, { q: 4 })]), ...quack(1.2, 0.4), ...times(4, 0.07, (i) => [z(2900 + 100 * i, 0.1, 0.001, 0.03, { q: 4, delay: 0.62 })]), ...quack(1.5, 0.96)],
  rustle: () => [z(3000, 0.12, 0.04, 0.4, { q: 1 }), ...crackle(5, 0.1)],
  gust: () => [t(190, 0.06, 0.05, 0.2, { wave: 'sawtooth', glideTo: 260 }), z(500, 0.18, 0.3, 1.3, { q: 1, glideTo: 900 })],
  rollHum: () => [t(98, 0.1, 0.1, 0.6)],
  laces: () => [z(2400, 0.14, 0.001, 0.04, { q: 3, delay: 0.3 }), z(2000, 0.14, 0.001, 0.04, { q: 3, delay: 0.46 })],
  cock: () => [t(880, 0.05, 0.05, 0.3, { wave: 'triangle', glideTo: 1180, delay: 0.2 })],
  squeak: (_p, n) => [t(1500 + 120 * (n % 3), 0.09, 0.004, 0.08, { glideTo: 2000 }), t(1800, 0.08, 0.004, 0.08, { delay: 0.13, glideTo: 1500 }), t(120, 0.08, 0.003, 0.08, { delay: 0.24 })],
  tick: () => crackle(2),
  wall: (_p, n) => [t(210 + 30 * (n % 3), 0.06, 0.003, 0.08), z(800, 0.04, 0.002, 0.05)],
  goOff: (p) => [...times(6, 0.2, (i) => [t(120 + 14 * (i % 2), 0.1, 0.004, 0.07), z(2600, 0.04, 0.001, 0.04)]), t(380 * p, 0.09, 0.04, 0.3, { delay: 0.2, wave: 'triangle', glideTo: 520 * p })],
  comeIn: (p) => [t(420 * p, 0.1, 0.04, 0.26, { wave: 'triangle', glideTo: 560 * p, delay: 2.5 }), t(86, 0.2, 0.004, 0.18, { delay: 4, glideTo: 50 })],
  scrap: () => times(3, 0.9, (i) => [...crackle(3), t(900 + 90 * i, 0.05, 0.004, 0.06, { delay: 0.5 })]),
} satisfies Record<string, Make>
export type VoiceName = keyof typeof VOICES

export const voice = (name: VoiceName, p = 1, n = 0): Note[] => (VOICES[name] as Make)(p, n)

export const cap = (k: Kind): 'Sausage' | 'Shoe' | 'Duck' => (k === 'sausage' ? 'Sausage' : k === 'shoe' ? 'Shoe' : 'Duck')
/** The voice of each way to take a piece. */
export const TURN_VOICE: Record<Turn, VoiceName> = { lick: 'lick', gulp: 'gulp', gasp: 'gasp', poke: 'poke', spit: 'spit', chew: 'chew', kiss: 'kissShoe', sneeze: 'sneeze', shut: 'shut', search: 'search', hat: 'hat', stiff: 'stiff', bark: 'bark', balance: 'balance', cross: 'cross' }
export const TICKLE: Record<string, VoiceName> = { croc: 'tickleCroc', dog: 'tickleDog', snail: 'tickleSnail', seal: 'tickleSeal', python: 'ticklePython' }
