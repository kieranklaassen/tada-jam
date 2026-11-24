import type { Note } from './audio'
import type { Garment, Sleeper } from './things'

// Every sound as plain numbers. Five throats that could not be taken for one another, and nine garments, each
// with a sound for being touched, going on, coming off, breathing, walking and showing off by the lamp.

export const MOODS = ['snore', 'murmur', 'gasp', 'grump', 'joy', 'start', 'yawn', 'laugh', 'sneeze', 'bump', 'poke'] as const
export type Mood = (typeof MOODS)[number]

// Peaks below are relative. These were measured by rendering each sound: a band of noise comes out far below its peak.
const TONE = 1.5, NOISE = 2.7
const t = (frequency: number, glideTo: number, peak: number, attack: number, decay: number, delay = 0, wave: OscillatorType = 'sine'): Note => ({ kind: 'tone', frequency, glideTo, peak: peak * TONE, attack, decay, delay, wave })
const n = (frequency: number, q: number, peak: number, attack: number, decay: number, delay = 0, glideTo = frequency): Note => ({ kind: 'noise', frequency, q, peak: peak * NOISE, attack, decay, delay, glideTo })
const many = <T>(count: number, make: (i: number) => T[]): T[] => Array.from({ length: count }, (_, i) => make(i)).flat()

/** A bleat: one pitch that trembles. */
const bleat = (from: number, to: number, count: number, peak: number, delay = 0): Note[] => many(count, (i) => {
  const at = from + (to - from) * (i / Math.max(1, count - 1))
  return [t(at, at * 0.93, peak, 0.012, 0.05, delay + i * 0.062, 'sawtooth'), t(at * 2.4, at * 2.2, peak * 0.35, 0.012, 0.045, delay + i * 0.062, 'triangle')]
})
/** A cluck: a short rise that stops. */
const cluck = (pitch: number, peak: number, delay = 0): Note[] => [t(pitch * 0.72, pitch, peak, 0.008, 0.055, delay, 'square'), n(pitch * 2.2, 5, peak * 0.5, 0.004, 0.04, delay)]
/** A rumble with a belly under it. */
const rumble = (from: number, to: number, length: number, peak: number, delay = 0): Note[] => [
  t(from, to, peak, length * 0.35, length * 0.65, delay, 'sawtooth'), t(from * 1.5, to * 1.5, peak * 0.6, length * 0.4, length * 0.6, delay, 'triangle'), n(from * 3, 2, peak * 0.5, length * 0.4, length * 0.6, delay)]
const pop = (pitch: number, peak: number, delay = 0): Note[] => [t(pitch, pitch * 2.1, peak, 0.004, 0.05, delay)]
const whistle = (from: number, to: number, length: number, peak: number, delay = 0): Note[] => [t(from, to, peak, length * 0.3, length * 0.7, delay), n(from * 1.1, 14, peak * 0.4, length * 0.3, length * 0.7, delay, to * 1.1)]
const snap = (peak: number, delay = 0): Note[] => [n(2600, 1.2, peak, 0.002, 0.035, delay), t(420, 190, peak * 0.7, 0.002, 0.06, delay, 'square')]
const snort = (pitch: number, peak: number, length: number, delay = 0): Note[] => [n(pitch * 3, 2.4, peak, length * 0.2, length * 0.8, delay), t(pitch, pitch * 1.35, peak * 0.8, length * 0.2, length * 0.7, delay, 'sawtooth')]
const squeal = (from: number, to: number, length: number, peak: number, delay = 0): Note[] => [t(from, to, peak, 0.02, length, delay, 'sawtooth'), t(from * 1.02, to * 1.03, peak * 0.6, 0.02, length, delay, 'triangle')]

export const VOICE: Record<Sleeper, Record<Mood, Note[]>> = {
  goat: {
    snore: bleat(300, 268, 7, 0.05), murmur: bleat(330, 372, 5, 0.1), gasp: bleat(430, 600, 4, 0.13),
    grump: [...bleat(470, 360, 8, 0.15), n(900, 2, 0.12, 0.004, 0.06, 0.1), n(900, 2, 0.12, 0.004, 0.06, 0.34)], joy: [...bleat(380, 470, 5, 0.11), ...bleat(470, 520, 5, 0.11, 0.4)],
    start: [...bleat(330, 330, 2, 0.08), ...bleat(560, 700, 9, 0.16, 1.4)], yawn: bleat(420, 270, 10, 0.07), laugh: [...bleat(420, 400, 2, 0.1), ...bleat(440, 410, 2, 0.1, 0.2), ...bleat(470, 420, 3, 0.1, 0.4)],
    sneeze: [...bleat(420, 520, 3, 0.07), n(3200, 1, 0.16, 0.004, 0.1, 0.22)], bump: [...bleat(260, 230, 4, 0.1, 0.12)], poke: [...bleat(360, 450, 4, 0.12)],
  },
  hippo: {
    snore: [...rumble(112, 138, 1.1, 0.085), ...pop(330, 0.06, 1.1)], murmur: [...rumble(128, 176, 0.6, 0.15), ...pop(380, 0.08, 0.6)], gasp: rumble(140, 290, 0.6, 0.16),
    grump: [...rumble(220, 118, 1.1, 0.19), ...pop(300, 0.1, 1.1)], joy: [...rumble(150, 200, 0.4, 0.14), ...rumble(190, 250, 0.6, 0.14, 0.45)],
    start: [...rumble(140, 160, 0.5, 0.08), ...rumble(180, 120, 1, 0.2, 1.45)], yawn: rumble(230, 115, 1.2, 0.1), laugh: many(4, (i) => rumble(190 - i * 12, 150 - i * 8, 0.24, 0.14, i * 0.26)),
    sneeze: [...rumble(140, 220, 0.4, 0.08), n(700, 1, 0.24, 0.01, 0.22, 0.42)], bump: [...rumble(150, 120, 0.5, 0.14, 0.12)], poke: [...pop(300, 0.1), ...rumble(160, 210, 0.45, 0.16, 0.04)],
  },
  hen: {
    snore: many(4, (i) => cluck(520 + i * 60, 0.04, i * 0.13)), murmur: [...cluck(560, 0.08), ...cluck(620, 0.08, 0.12), ...cluck(760, 0.1, 0.3)], gasp: [...cluck(700, 0.1), ...cluck(1080, 0.13, 0.1)],
    grump: [...many(4, (i) => cluck(680 + i * 30, 0.11, i * 0.1)), t(900, 1300, 0.13, 0.02, 0.4, 0.42, 'square')], joy: many(8, (i) => cluck(640 + (i % 3) * 110, 0.09, i * 0.09)),
    start: [...cluck(560, 0.06), ...cluck(560, 0.06, 0.7), ...many(7, (i) => cluck(800 + i * 60, 0.12, 1.3 + i * 0.07))], yawn: [t(900, 480, 0.06, 0.2, 0.5, 0, 'square')], laugh: many(7, (i) => cluck(820 - i * 40, 0.09, i * 0.08)),
    sneeze: [...cluck(620, 0.06), n(4200, 1.2, 0.14, 0.003, 0.07, 0.16)], bump: [...cluck(440, 0.1, 0.12)], poke: [...cluck(720, 0.1), ...cluck(900, 0.12, 0.09), ...cluck(640, 0.1, 0.2)],
  },
  croc: {
    snore: [...whistle(1150, 1480, 0.8, 0.03), ...snap(0.05, 0.95)], murmur: [...whistle(1200, 900, 0.35, 0.05), ...snap(0.12, 0.4)], gasp: whistle(700, 1700, 0.4, 0.09),
    grump: [...whistle(1600, 620, 0.5, 0.09), ...snap(0.22, 0.62), t(250, 180, 0.12, 0.03, 0.4, 0.75, 'sawtooth')], joy: [...whistle(880, 1320, 0.3, 0.08), ...whistle(1180, 1760, 0.5, 0.08, 0.36)],
    start: [...whistle(1000, 1060, 0.5, 0.05), ...whistle(700, 2100, 0.7, 0.1, 1.45), ...snap(0.2, 2.2)], yawn: [...whistle(1500, 500, 0.9, 0.05), ...snap(0.1, 1)], laugh: many(4, (i) => [...snap(0.1, i * 0.16), ...whistle(1250 + i * 70, 1000, 0.1, 0.05, i * 0.16)]),
    sneeze: [...whistle(900, 1500, 0.3, 0.05), n(2400, 1, 0.18, 0.004, 0.12, 0.34), ...snap(0.12, 0.44)], bump: [...snap(0.14, 0.12)], poke: [...snap(0.16), ...whistle(1300, 980, 0.3, 0.06, 0.1)],
  },
  pig: {
    snore: [...snort(150, 0.08, 0.5), n(1500, 4, 0.04, 0.2, 0.45, 0.7, 800)], murmur: [...snort(170, 0.14, 0.26), ...snort(210, 0.12, 0.2, 0.3)], gasp: squeal(420, 820, 0.28, 0.08),
    grump: [...squeal(600, 1150, 0.5, 0.1), ...squeal(1150, 760, 0.45, 0.1, 0.5)], joy: [...snort(220, 0.12, 0.14), ...squeal(500, 760, 0.18, 0.07, 0.16), ...snort(240, 0.12, 0.14, 0.4), ...squeal(540, 860, 0.2, 0.07, 0.56)],
    start: [...snort(200, 0.1, 0.2), ...snort(200, 0.1, 0.2, 0.5), ...squeal(520, 1300, 0.8, 0.11, 1.25)], yawn: [...squeal(520, 230, 0.8, 0.04), ...snort(160, 0.08, 0.3, 0.85)], laugh: many(4, (i) => snort(230 + (i % 2) * 40, 0.12, 0.13, i * 0.18)),
    sneeze: [...snort(220, 0.1, 0.3), n(1800, 1, 0.22, 0.004, 0.16, 0.34)], bump: [...snort(180, 0.12, 0.3, 0.12)], poke: [...snort(230, 0.15, 0.2), ...squeal(480, 640, 0.14, 0.06, 0.2)],
  },
}

export const USES = ['touch', 'on', 'off', 'breath', 'step', 'show'] as const
export type Use = (typeof USES)[number]

const ting = (pitch: number, peak: number, delay = 0, ring = 0.5): Note[] => [t(pitch, pitch, peak, 0.003, ring, delay), t(pitch * 2.76, pitch * 2.76, peak * 0.4, 0.002, ring * 0.5, delay)]
const bong = (pitch: number, peak: number, delay = 0, ring = 0.7): Note[] => [t(pitch, pitch * 0.99, peak, 0.003, ring, delay, 'triangle'), t(pitch * 2.32, pitch * 2.3, peak * 0.5, 0.002, ring * 0.6, delay), n(pitch * 6, 2, peak * 0.4, 0.002, 0.03, delay)]
const clank = (pitch: number, peak: number, delay = 0): Note[] => [t(pitch, pitch, peak * 0.7, 0.002, 0.14, delay, 'square'), t(pitch * 1.47, pitch * 1.46, peak * 0.5, 0.002, 0.12, delay, 'square'), n(3400, 1.6, peak * 0.7, 0.002, 0.04, delay)]
const rustle = (length: number, peak: number, delay = 0, to = 2400): Note[] => [n(4600, 0.8, peak, length * 0.3, length * 0.7, delay, to)]
const twang = (pitch: number, peak: number, delay = 0, ring = 0.5): Note[] => [t(pitch * 1.6, pitch, peak, 0.004, ring, delay, 'triangle'), t(pitch * 3.1, pitch * 2, peak * 0.4, 0.004, ring * 0.6, delay), t(pitch * 1.02, pitch * 0.94, peak * 0.5, 0.004, ring, delay, 'triangle')]
const squelch = (peak: number, delay = 0): Note[] => [n(500, 3, peak, 0.02, 0.14, delay, 1500), t(180, 420, peak * 0.7, 0.02, 0.12, delay)]
const squeak = (pitch: number, peak: number, delay = 0): Note[] => [t(pitch, pitch * 1.4, peak, 0.02, 0.1, delay, 'triangle')]
const flap = (peak: number, delay = 0): Note[] => [n(760, 1.4, peak, 0.003, 0.07, delay, 320), t(230, 150, peak * 0.5, 0.003, 0.06, delay)]
const whirr = (from: number, to: number, length: number, peak: number, delay = 0): Note[] => [n(from * 5, 3, peak, length * 0.2, length * 0.8, delay, to * 5), t(from, to, peak * 0.5, length * 0.2, length * 0.8, delay, 'sawtooth')]
const click = (peak: number, delay = 0): Note[] => [n(3000, 3, peak, 0.002, 0.025, delay), t(900, 700, peak * 0.4, 0.002, 0.02, delay)]
const brush = (peak: number, delay = 0, length = 0.22): Note[] => [n(6200, 1.2, peak, length * 0.4, length * 0.6, delay, 7600)]

export const CLOTHES: Record<Garment, Record<Use, Note[]>> = {
  bell: {
    touch: [...ting(1480, 0.1), ...ting(1660, 0.07, 0.14)], on: [...ting(1480, 0.1), ...ting(1660, 0.09, 0.1), ...ting(1480, 0.07, 0.2), ...ting(1108, 0.1, 0.5, 0.7)], off: [...ting(1108, 0.08), ...ting(1480, 0.1, 0.12)],
    breath: ting(1480, 0.045, 0, 0.3), step: ting(1568, 0.08, 0, 0.3), show: [...ting(1318, 0.14, 0, 0.7), ...ting(988, 0.14, 0.35, 0.7), ...ting(1318, 0.14, 0.7, 0.7)],
  },
  pan: {
    touch: bong(392, 0.14), on: [n(1800, 1.4, 0.16, 0.002, 0.06), ...bong(330, 0.18, 0.02, 0.9), ...bong(311, 0.07, 0.26, 0.5)], off: [...bong(440, 0.12, 0, 0.5), n(2200, 2, 0.06, 0.02, 0.12)],
    breath: bong(294, 0.035, 0, 0.5), step: bong(370, 0.1, 0, 0.35), show: [...whirr(150, 260, 0.6, 0.05), ...many(5, (i) => bong(392 + i * 24, 0.1, i * 0.14, 0.5))],
  },
  armour: {
    touch: clank(620, 0.1), on: many(4, (i) => clank(720 - i * 90, 0.13, i * 0.16)), off: many(3, (i) => clank(480 + i * 90, 0.1, i * 0.1)),
    breath: [t(340, 430, 0.03, 0.12, 0.2, 0, 'sawtooth')], step: clank(560, 0.09), show: [t(300, 520, 0.05, 0.2, 0.16, 0, 'sawtooth'), ...clank(820, 0.2, 0.36)],
  },
  tutu: {
    touch: twang(260, 0.12), on: [...rustle(0.2, 0.07), ...twang(300, 0.14, 0.18, 0.9), ...twang(240, 0.07, 0.4, 0.7)], off: [...twang(220, 0.1, 0, 0.4), ...rustle(0.2, 0.06, 0.05)],
    breath: [t(176, 190, 0.035, 0.2, 0.4, 0, 'triangle'), t(181, 195, 0.03, 0.2, 0.4, 0, 'triangle')], step: twang(330, 0.08, 0, 0.22), show: [...twang(196, 0.17, 0, 1.4), ...many(5, (i) => twang(220, 0.05, 0.25 + i * 0.13, 0.12))],
  },
  boots: {
    touch: squeak(620, 0.08), on: [...squelch(0.16), ...squelch(0.16, 0.34)], off: [...pop(260, 0.14, 0.1), ...squelch(0.1), ...pop(300, 0.14, 0.4)],
    breath: squeak(700, 0.028), step: squelch(0.1), show: [...flap(0.15), ...squelch(0.1, 0.02), ...flap(0.15, 0.24), ...squelch(0.1, 0.26), ...flap(0.15, 0.48)],
  },
  feather: {
    touch: brush(0.09), on: [...brush(0.1), ...brush(0.08, 0.16)], off: [...brush(0.09, 0, 0.3)],
    breath: brush(0.03, 0, 0.3), step: brush(0.06, 0, 0.16), show: [t(1760, 620, 0.07, 0.1, 1.1), ...brush(0.06, 0.2, 0.8)],
  },
  gown: {
    touch: rustle(0.24, 0.1), on: [...rustle(0.7, 0.12, 0, 900), ...rustle(0.2, 0.06, 0.6, 3200)], off: [...rustle(0.4, 0.1, 0, 5200)],
    breath: rustle(0.5, 0.028, 0, 1800), step: rustle(0.2, 0.06, 0, 1600), show: many(4, (i) => rustle(0.12, 0.12, i * 0.15, 5200)),
  },
  slippers: {
    touch: flap(0.12), on: [...flap(0.14), ...flap(0.14, 0.24)], off: [...flap(0.1), ...rustle(0.1, 0.04, 0.05)],
    breath: [...flap(0.028), ...flap(0.022, 0.12)], step: [n(620, 1, 0.08, 0.05, 0.14, 0, 380)], show: many(6, (i) => flap(0.12, i * 0.12)),
  },
  skates: {
    touch: whirr(200, 130, 0.5, 0.07), on: [...click(0.14), ...click(0.14, 0.18), ...whirr(160, 320, 0.5, 0.09, 0.32)], off: [...click(0.12), ...whirr(240, 110, 0.3, 0.05, 0.05)],
    breath: click(0.04), step: [...whirr(230, 250, 0.3, 0.06), ...click(0.05)], show: [...whirr(140, 560, 1.1, 0.1), ...click(0.12, 1.15)],
  },
}

/** A snore inside a saucepan: the same snore, and its own echo off the bottom. */
export function hollow(notes: readonly Note[]): Note[] {
  return [...notes, ...[1, 2].flatMap((i) => notes.map((note) => ({ ...note, peak: note.peak * (0.55 / i), delay: (note.delay ?? 0) + i * 0.13, frequency: note.frequency * 1.005 }))), { kind: 'tone', frequency: 294, peak: 0.02, attack: 0.1, decay: 0.6, wave: 'triangle' }]
}

/** The room's own sounds. */
export const ROOM = {
  cordOn: [...click(0.16), ...ting(880, 0.05, 0.02, 0.2), t(520, 660, 0.05, 0.02, 0.5, 0.03)],
  cordOff: [...click(0.16), t(520, 260, 0.06, 0.02, 0.5, 0.03)],
  open: [t(260, 420, 0.04, 0.2, 0.5, 0, 'sawtooth'), n(1400, 3, 0.04, 0.2, 0.5, 0, 2600), ...many(4, (i) => rustle(0.2, 0.06, 0.6 + i * 0.1))],
  creak: [t(300, 250, 0.04, 0.1, 0.25, 0, 'sawtooth')],
  moon: [...ting(1046, 0.06, 0, 1.1), ...ting(1568, 0.04, 0.12, 1.2)],
  floor: [n(420, 2, 0.09, 0.003, 0.08, 0, 240), t(170, 130, 0.08, 0.003, 0.1)],
  wall: [...brush(0.05, 0, 0.14)],
  peg: twang(520, 0.05, 0, 0.14),
  lift: [...rustle(0.12, 0.06), t(520, 700, 0.03, 0.02, 0.12)],
  home: [...click(0.06), ...rustle(0.12, 0.05)],
  hem: [n(900, 0.9, 0.05, 0.06, 0.14, 0, 1500)],
  quilt: [n(600, 0.8, 0.09, 0.05, 0.22, 0, 300)],
  bump: [n(700, 1.5, 0.16, 0.002, 0.06), t(240, 150, 0.16, 0.003, 0.16, 0, 'triangle')],
  shiver: many(5, (i) => [n(2200, 4, 0.018, 0.01, 0.03, i * 0.07)]),
  asleep: [t(392, 294, 0.05, 0.3, 0.9), t(588, 441, 0.03, 0.3, 0.9, 0.2)],
} satisfies Record<string, Note[]>

const STEPS: Record<Sleeper, Note[]> = {
  goat: click(0.08), hippo: [n(260, 1.2, 0.14, 0.006, 0.12, 0, 160), t(150, 110, 0.1, 0.004, 0.12)], hen: [...click(0.03), ...click(0.03, 0.03)],
  croc: [n(1200, 2, 0.07, 0.02, 0.07), t(200, 160, 0.04, 0.004, 0.06)], pig: [t(320, 220, 0.09, 0.003, 0.05, 0, 'triangle')],
}

export const stepOf = (sleeper: Sleeper): Note[] => STEPS[sleeper]
