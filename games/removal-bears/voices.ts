import type { Note } from './audio'
import type { Kind } from './loads'

// Every sound of the game as plain numbers, so a machine that cannot hear can
// hold them to ranges (voices.test.ts). Each load has an instrument of its
// own, and each thing done to it is played on that instrument (ART.md, the
// grid). Nothing here is a word.

export type Cue = Note[]

export const RANGE = { frequency: [60, 3400], peak: 0.2, sum: 0.36, attack: [0.002, 0.1], length: 2 } as const

const tone = (delay: number, frequency: number, glideTo: number, peak: number, attack: number, decay: number, wave: 'sine' | 'triangle' = 'sine'): Note => ({ kind: 'tone', delay, frequency, glideTo, wave, peak, attack, decay })
const noise = (delay: number, frequency: number, glideTo: number, q: number, peak: number, attack: number, decay: number): Note => ({ kind: 'noise', delay, frequency, glideTo, q, peak, attack, decay })
const run = (many: number, gap: number, note: (n: number, at: number) => Note): Cue => Array.from({ length: many }, (_, n) => note(n, n * gap))
/** By turns a little higher or lower, so the same touch is never heard twice the same. */
export const vary = (count: number): number => [1, 1.06, 0.94, 1.12, 0.89][((count % 5) + 5) % 5]
const later = (cue: Cue, by: number): Cue => cue.map((note) => ({ ...note, delay: (note.delay ?? 0) + by }))

/** How each thing a load can have done to it is heard. A turn is heard by how the load then stands. */
export type Happening = 'turn' | 'swap' | 'bump' | 'in' | 'poke' | 'cub'
export type Standing = 'up' | 'side' | 'over'
export const standing = (turn: number): Standing => (turn === 0 ? 'up' : turn === 2 ? 'over' : 'side')

const glug = (n: number, at: number, p: number): Note => tone(at, (170 + (n % 3) * 40) * p, (330 + (n % 2) * 60) * p, 0.12, 0.012, 0.09)
const quack = (at: number, p: number): Cue => [tone(at, 560 * p, 400 * p, 0.12, 0.008, 0.13, 'triangle'), noise(at, 1100 * p, 800 * p, 5, 0.07, 0.006, 0.12)]
const key = (at: number, hz: number, peak = 0.11): Note => tone(at, hz, hz, peak, 0.003, 0.34, 'triangle')
const click = (at: number, hz: number): Note => noise(at, hz, hz * 0.8, 8, 0.1, 0.002, 0.03)
const snore = (at: number, up: boolean): Cue => [noise(at, up ? 220 : 420, up ? 480 : 190, 3, 0.15, 0.1, 0.5), tone(at, up ? 95 : 130, up ? 140 : 85, 0.08, 0.08, 0.45)]

const RIDERS: Record<Kind, Record<Standing | 'swap' | 'bump' | 'in', Cue>> = {
  bath: {
    up: [...run(3, 0.1, (n, at) => glug(n, at, 1.25)), ...quack(0.34, 1.1)],
    side: run(7, 0.085, (n, at) => glug(n, at, 1 - n * 0.05)),
    over: [tone(0, 1500, 2100, 0.1, 0.01, 0.1), tone(0.2, 1650, 2300, 0.09, 0.01, 0.1), tone(0.42, 1400, 2000, 0.08, 0.01, 0.12)],
    swap: [tone(0, 180, 420, 0.08, 0.05, 0.3), ...quack(0.4, 0.72)],
    bump: [noise(0, 700, 260, 1, 0.18, 0.01, 0.4), tone(0.06, 240, 480, 0.1, 0.02, 0.22)],
    in: [noise(0, 300, 1500, 4, 0.14, 0.1, 0.5), ...quack(0.62, 1)],
  },
  sofa: {
    up: [tone(0, 150, 210, 0.13, 0.008, 0.2, 'triangle'), ...snore(0.28, false)],
    side: [noise(0, 700, 2300, 7, 0.12, 0.02, 0.2), ...snore(0.3, false)],
    over: snore(0.1, true),
    swap: run(5, 0.13, (n, at) => tone(at, 130 + (n % 2) * 14, 90, 0.16, 0.004, 0.09)),
    bump: run(4, 0.11, (n, at) => tone(at, 230 + n * 70, 130 + n * 50, 0.13, 0.004, 0.26, 'triangle')),
    in: [tone(0, 110, 300, 0.15, 0.006, 0.28, 'triangle'), ...snore(0.4, false)],
  },
  granny: {
    up: [...run(4, 0.1, (n, at) => click(at, n % 2 ? 1900 : 1500)), tone(0.44, 500, 560, 0.07, 0.05, 0.24)],
    side: run(7, 0.065, (n, at) => click(at, n % 3 ? 2300 : 1700)),
    over: [...run(9, 0.045, (n, at) => click(at, 700 + n * 60)), ...run(3, 0.22, (n, at) => tone(at + 0.4, [392, 440, 494][n], [392, 440, 494][n], 0.1, 0.05, 0.22))],
    swap: run(3, 0.2, (n, at) => tone(at, [294, 262, 247][n], [294, 262, 247][n], 0.11, 0.05, 0.2)),
    bump: [tone(0, 520, 920, 0.14, 0.02, 0.24), tone(0.26, 900, 560, 0.08, 0.02, 0.22), click(0.5, 2600)],
    in: [noise(0, 420, 300, 9, 0.12, 0.05, 0.25), noise(0.36, 340, 450, 9, 0.1, 0.05, 0.22), click(0.66, 1800), click(0.78, 1500)],
  },
  lamp: {
    up: [click(0, 2400), tone(0.04, 660, 990, 0.1, 0.005, 0.3), tone(0.3, 1760, 2200, 0.04, 0.005, 0.1)],
    side: run(6, 0.06, (n, at) => tone(at, 120 + (n % 2) * 10, 118, 0.13, 0.01, 0.07, 'triangle')),
    over: [noise(0, 2800, 900, 3, 0.1, 0.02, 0.7), ...run(6, 0.1, (n, at) => click(at, 3000 - n * 190))],
    swap: run(5, 0.13, (n, at) => click(at, n === 4 ? 1500 : 2700)),
    bump: [tone(0, 1240, 1240, 0.12, 0.003, 0.9), tone(0, 1865, 1860, 0.07, 0.003, 0.6)],
    in: [click(0, 2000), tone(0.08, 1320, 1320, 0.1, 0.003, 0.5), tone(0.3, 2640, 2640, 0.06, 0.003, 0.3)],
  },
  piano: {
    up: [392, 494, 587].map((hz, n) => key(n * 0.1, hz)),
    side: [784, 698, 587, 523, 440, 392, 330].map((hz, n) => key(n * 0.07, hz, 0.1)),
    over: [noise(0, 900, 300, 1, 0.16, 0.003, 0.1), key(0.12, 98, 0.12), key(0.2, 92, 0.1), key(0.28, 82, 0.1)],
    swap: run(8, 0.06, (n, at) => noise(at, 480 + (n % 3) * 120, 400, 6, 0.1, 0.003, 0.04)),
    bump: [277, 294, 349, 415].map((hz, n) => key(n * 0.012, hz, 0.08)),
    in: [...[262, 330, 392].map((hz) => key(0, hz, 0.09)), ...[523, 587, 659, 784].map((hz, n) => key(0.3 + n * 0.08, hz, 0.08))],
  },
  giraffe: {
    up: [tone(0, 1180, 1180, 0.1, 0.003, 0.4), noise(0.1, 330, 280, 5, 0.1, 0.01, 0.12), noise(0.32, 300, 260, 5, 0.1, 0.01, 0.12)],
    side: run(9, 0.06, (n, at) => tone(at, [1180, 1330, 1490][n % 3], [1180, 1330, 1490][n % 3], 0.08, 0.003, 0.16)),
    over: [tone(0, 110, 180, 0.12, 0.05, 0.14), tone(0.2, 170, 300, 0.12, 0.05, 0.14), tone(0.4, 280, 520, 0.11, 0.05, 0.2)],
    swap: [noise(0, 1300, 2500, 2, 0.1, 0.09, 0.14), noise(0.28, 2500, 1200, 2, 0.1, 0.09, 0.14)],
    bump: [tone(0, 620, 1500, 0.1, 0.03, 0.3, 'triangle'), tone(0.36, 1400, 700, 0.07, 0.02, 0.2, 'triangle')],
    in: run(4, 0.17, (n, at) => noise(at, n % 2 ? 460 : 360, 280, 5, 0.14, 0.004, 0.08)),
  },
}

/** What a load, or whoever rides on it, says when something is done to it. */
function rider(kind: Kind, what: Happening, turn: number, wait: number): Cue {
  const own = RIDERS[kind]
  return later(what === 'swap' || what === 'bump' || what === 'in' ? own[what] : own[standing(turn)], wait)
}

export const voices = {
  rider,
  /** The cream gives under the finger. */
  squeeze: (n: number): Cue => [noise(0, 420 * vary(n), 250, 3, 0.1, 0.004, 0.1), tone(0, 230 * vary(n), 150, 0.1, 0.004, 0.09)],
  bear: (who: 0 | 1, n: number): Cue => (who === 0
    ? [tone(0, 105 * vary(n), 145 * vary(n), 0.17, 0.02, 0.16, 'triangle'), tone(0.16, 118 * vary(n), 92, 0.13, 0.02, 0.2, 'triangle')]
    : [tone(0, 250 * vary(n), 360 * vary(n), 0.13, 0.01, 0.1, 'triangle'), tone(0.1, 340 * vary(n), 290, 0.1, 0.01, 0.12, 'triangle')]),
  knock: (i: number, n: number): Cue => [tone(0, (330 + i * 70) * vary(n), 260 + i * 60, 0.13, 0.003, 0.09), noise(0, 1500, 900, 2, 0.07, 0.002, 0.06)],
  mouse: (n: number): Cue => [tone(0, 1250 * vary(n), 1750 * vary(n), 0.09, 0.006, 0.07), tone(0.1, 1450 * vary(n), 1900 * vary(n), 0.08, 0.006, 0.07)],
  cub: (n: number): Cue => [tone(0, 480 * vary(n), 760 * vary(n), 0.12, 0.01, 0.12, 'triangle'), tone(0.14, 640 * vary(n), 900 * vary(n), 0.08, 0.01, 0.1, 'triangle')],
  sugar: (n: number): Cue => [noise(0, 1900 * vary(n), 1200, 3, 0.1, 0.003, 0.07), ...run(3, 0.04, (k, at) => noise(at + 0.05, 2900 - k * 200, 2500, 8, 0.035, 0.002, 0.03))],
  cloth: (n: number): Cue => [noise(0, 320 * vary(n), 200, 1, 0.12, 0.01, 0.14)],
  jar: (u: number, n: number): Cue => [tone(0, (880 + Math.round(Math.abs(u) * 7) % 5 * 110) * vary(n), 870, 0.08, 0.003, 0.36)],
  lift: (n: number): Cue => [tone(0, 160 * vary(n), 260 * vary(n), 0.1, 0.02, 0.14)],
  down: (n: number): Cue => [tone(0, 190 * vary(n), 120, 0.12, 0.004, 0.13)],
  toss: (lasts: number): Cue => [tone(0, 130, 200, 0.13, 0.01, 0.1, 'triangle'), noise(lasts * 0.2, 500, 1300, 2, 0.08, 0.06, lasts * 0.5)],
  caught: (n: number): Cue => [tone(0, 170 * vary(n), 95, 0.18, 0.003, 0.15), noise(0, 420, 220, 2, 0.1, 0.004, 0.12)],
  shuffle: (): Cue => run(6, 0.14, (n, at) => noise(at, n % 2 ? 360 : 280, 200, 1.5, 0.12, 0.006, 0.08)),
  step: (n: number): Cue => [tone(0, (n % 2 ? 120 : 165) * vary(n), 80, 0.12, 0.003, 0.08), noise(0, 900, 600, 2, 0.04, 0.003, 0.05)],
  /** They bend, they groan, they throw. */
  heave: (): Cue => [tone(0, 92, 120, 0.14, 0.04, 0.16, 'triangle'), tone(0.02, 210, 300, 0.09, 0.04, 0.16, 'triangle'), noise(0.2, 400, 1500, 2, 0.1, 0.06, 0.3)],
  pop: (): Cue => [tone(0, 320, 900, 0.18, 0.003, 0.1), noise(0, 1500, 700, 2, 0.08, 0.003, 0.08)],
  thump: (): Cue => [tone(0, 130, 66, 0.2, 0.003, 0.26), noise(0, 320, 160, 1, 0.12, 0.004, 0.16)],
  /** More of it in the way, more of a crunch. */
  bump: (blocked: number): Cue => [tone(0, 210, 85, 0.17, 0.003, 0.2), ...run(Math.min(4, blocked), 0.08, (n, at) => noise(at, 1500 - n * 180, 800, 2, 0.1, 0.003, 0.08))],
  cork: (): Cue => [tone(0, 260, 1150, 0.18, 0.004, 0.14), tone(0.02, 130, 420, 0.1, 0.004, 0.12)],
  peel: (): Cue => [noise(0, 900, 320, 4, 0.12, 0.02, 0.3), tone(0.06, 520, 240, 0.08, 0.03, 0.26, 'triangle')],
  /** Cream comes out of the sides of a bear: the wide one low, the tall one high. */
  squashed: (who: 0 | 1): Cue => [tone(0, who ? 120 : 90, 62, 0.16, 0.003, 0.22), noise(0.03, who ? 620 : 380, who ? 1100 : 620, 3, 0.15, 0.02, 0.34), ...(who ? [tone(0.14, 700, 420, 0.09, 0.02, 0.2, 'triangle')] : [tone(0.24, 100, 130, 0.12, 0.02, 0.12, 'triangle'), tone(0.4, 112, 96, 0.12, 0.02, 0.14, 'triangle')])],
  boing: (who: 0 | 1 | 2): Cue => (who === 2
    ? [tone(0, 150, 420, 0.13, 0.01, 0.2), tone(0.12, 260, 620, 0.1, 0.01, 0.22)]
    : who === 1 ? run(4, 0.1, (n, at) => tone(at, 300 - n * 26, 520 - n * 50, 0.12 - n * 0.02, 0.006, 0.08, 'triangle')) : [tone(0, 110, 240, 0.16, 0.02, 0.24), tone(0.3, 180, 260, 0.07, 0.02, 0.1)]),
  spring: (): Cue => [tone(0, 180, 820, 0.14, 0.006, 0.24, 'triangle'), noise(0.2, 700, 1600, 2, 0.06, 0.08, 0.4)],
  rumble: (): Cue => [...run(9, 0.16, (n, at) => noise(at, n % 2 ? 170 : 210, 130, 1.5, 0.14, 0.02, 0.14)), tone(0.1, 900, 600, 0.06, 0.1, 0.5)],
  open: (): Cue => [noise(0, 500, 1300, 2, 0.12, 0.1, 0.9), ...run(4, 0.22, (n, at) => tone(at + 0.1, 330 + n * 82, 332 + n * 82, 0.08, 0.02, 0.36))],
  flop: (): Cue => [tone(0, 110, 64, 0.18, 0.004, 0.24), noise(0.04, 420, 240, 2, 0.1, 0.02, 0.3), tone(0.3, 150, 72, 0.15, 0.004, 0.2)],
  howl: (wait: number): Cue => [tone(wait, 340, 520, 0.1, 0.1, 0.3, 'triangle'), tone(wait + 0.4, 520, 380, 0.1, 0.05, 0.5, 'triangle')],
}

export const voiceLength = (cue: Cue): number => Math.max(...cue.map((n) => (n.delay ?? 0) + n.attack + n.decay))
