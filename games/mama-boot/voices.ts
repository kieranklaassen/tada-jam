import type { Note } from './audio'
import { PAIRS, THINGS } from './layout'
import { GAITS } from './lineage'

// Every sound of the yard, as plain numbers, so a test can hold it in range.
// A mother has a voice of her own (leather thud, china and water, snort,
// snore, rubber, bell metal). Her chick tries the same shape an octave or more
// up, squeaky, and each step down a chain is higher again. Two things that do
// something together are heard as both.

type Opt = { to?: number; wave?: OscillatorType; at?: number; a?: number }
const n = (frequency: number, decay: number, peak: number, o: Opt = {}): Note => ({ kind: 'tone', frequency, glideTo: o.to, wave: o.wave ?? 'sine', peak, attack: o.a ?? 0.012, decay, delay: o.at ?? 0 })
const z = (frequency: number, decay: number, peak: number, q = 1, o: Opt = {}): Note => ({ kind: 'noise', frequency, glideTo: o.to, q, peak, attack: o.a ?? 0.012, decay, delay: o.at ?? 0 })
const many = (count: number, gap: number, make: (i: number) => Note[], from = 0): Note[] => Array.from({ length: count }, (_, i) => make(i).map((e) => ({ ...e, delay: (e.delay ?? 0) + from + i * gap }))).flat()

const thud = (f = 110, at = 0): Note[] => [n(f, 0.16, 0.42, { to: f * 0.55, at, a: 0.004 }), z(420, 0.06, 0.16, 0.8, { at, a: 0.003 })]
const china = (f: number, at = 0, peak = 0.14): Note[] => [n(f, 0.2, peak, { at, a: 0.003 }), n(f * 2.7, 0.12, peak * 0.5, { at, a: 0.003 })]
const glug = (at = 0): Note[] => many(4, 0.17, (i) => [n(300 + i * 34, 0.12, 0.2, { to: 520 + i * 40, at })])
const oink = (f = 190, at = 0): Note[] => [n(f, 0.14, 0.2, { to: f * 1.5, wave: 'sawtooth', at }), n(f * 1.4, 0.2, 0.16, { to: f * 0.8, wave: 'sawtooth', at: at + 0.15 }), z(900, 0.22, 0.1, 2, { at })]
const snort = (at = 0): Note[] => [z(520, 0.26, 0.24, 3, { to: 300, at }), n(140, 0.2, 0.14, { wave: 'sawtooth', to: 100, at })]
const snoreIn = (at = 0): Note[] => [z(210, 0.75, 0.26, 4, { to: 420, at, a: 0.3 }), n(88, 0.6, 0.12, { wave: 'sawtooth', to: 120, at, a: 0.2 })]
const whistleOut = (at = 0): Note[] => [n(1250, 0.5, 0.07, { to: 760, at, a: 0.08 })]
const mutter = (at = 0): Note[] => many(4, 0.15, (i) => [n([150, 190, 130, 165][i], 0.11, 0.2, { wave: 'triangle', to: [170, 150, 150, 120][i], at })])
const boing = (f = 180, at = 0): Note[] => [n(f, 0.42, 0.28, { to: f * 2.3, wave: 'triangle', at, a: 0.005 })]
const bop = (f: number, peak: number, at = 0): Note[] => [n(f, 0.11, peak, { to: f * 0.7, wave: 'triangle', at, a: 0.004 })]
const ding = (f: number, at = 0, peak = 0.16): Note[] => [n(f, 1.1, peak, { at, a: 0.003 }), n(f * 2.01, 0.7, peak * 0.5, { at, a: 0.003 }), n(f * 2.76, 0.4, peak * 0.35, { at, a: 0.003 })]
const cluck = (f = 420, at = 0, peak = 0.2): Note[] => [n(f, 0.09, peak, { to: f * 1.5, wave: 'triangle', at, a: 0.008 }), n(f * 1.2, 0.1, peak * 0.8, { to: f * 0.8, wave: 'triangle', at: at + 0.1, a: 0.008 })]
const squawk = (at = 0): Note[] => [n(480, 0.3, 0.2, { to: 900, wave: 'sawtooth', at }), n(700, 0.2, 0.12, { to: 420, wave: 'sawtooth', at: at + 0.3 })]
const peep = (f = 1500, at = 0, peak = 0.12): Note[] => [n(f, 0.12, peak, { to: f * 1.22, at, a: 0.01 })]
const splash = (at = 0): Note[] => [z(900, 0.3, 0.22, 0.7, { to: 2600, at }), n(380, 0.12, 0.14, { to: 800, at })]
const foil = (at = 0): Note[] => many(5, 0.05, (i) => [z(3800 + (i % 3) * 700, 0.035, 0.07, 4, { at, a: 0.004 })])
const flutter = (at = 0, count = 6): Note[] => many(count, 0.06, (i) => [z(700 + (i % 2) * 300, 0.045, 0.1, 1.4, { at, a: 0.008 })])

const TAP: Record<string, Note[]> = {
  boot: [...thud(118, 0.28), ...thud(112, 0.62), ...thud(104, 0.95)],
  teapot: [...glug(0.25), ...china(1180, 0, 0.08)],
  pig: [...oink(), ...oink(210, 0.45)],
  farmer: [z(1600, 0.16, 0.07, 9, { to: 1100 }), ...mutter(0.2)],
  ball: [...boing(), ...bop(240, 0.2, 0.5), ...bop(280, 0.12, 0.75)],
  bell: [...ding(660), ...ding(528, 0.45)],
}
const SET: Record<string, Note[]> = {
  boot: [...thud(96), z(500, 0.1, 0.12, 1, { at: 0.18 })],
  teapot: many(5, 0.06, (i) => china(900 + (i % 2) * 260, 0, 0.09)),
  pig: [...snort(), n(150, 0.1, 0.2, { to: 90 })],
  farmer: [z(1300, 0.2, 0.08, 10, { to: 1700 }), ...many(2, 0.22, () => [n(240, 0.07, 0.16, { to: 380, wave: 'triangle' })], 0.28)],
  ball: [...bop(210, 0.3), ...bop(230, 0.19, 0.4), ...bop(250, 0.11, 0.72)],
  bell: [n(590, 0.22, 0.2, { wave: 'triangle', a: 0.003 }), n(1330, 0.14, 0.1, { a: 0.003 })],
}
const SEAT: Record<string, Note[]> = {
  boot: [z(380, 0.24, 0.22, 3, { to: 900 }), n(170, 0.2, 0.16, { to: 320, wave: 'triangle' })],
  teapot: china(1560),
  pig: many(4, 0.13, (i) => [n(170 + (i % 2) * 30, 0.1, 0.16, { wave: 'sawtooth', to: 220 })]),
  farmer: many(5, 0.12, (i) => [n(150 - i * 5, 0.09, 0.2, { wave: 'triangle', to: 175 })]),
  ball: many(6, 0.12, (i) => [n(820 + (i % 2) * 140, 0.11, 0.08, { to: 900 - (i % 2) * 100 })]),
  bell: many(6, 0.08, (i) => ding(1320 + (i % 3) * 160, 0, 0.06)),
}
const WET: Record<string, Note[]> = {
  boot: [...splash(), z(2200, 0.5, 0.14, 2, { at: 0.2, to: 4200 })],
  teapot: many(7, 0.14, (i) => [n(260 + (i % 3) * 60, 0.1, 0.18, { to: 480 + (i % 3) * 60 })]),
  pig: [...splash(), z(300, 1, 0.2, 3, { at: 0.3, to: 240, a: 0.2 }), n(110, 0.9, 0.14, { wave: 'sawtooth', at: 0.3, to: 150, a: 0.2 })],
  farmer: [...splash(), ...many(8, 0.08, (i) => [n(130 + (i % 2) * 22, 0.07, 0.2, { wave: 'triangle' })], 0.25)],
  ball: [n(420, 0.12, 0.24, { to: 900 }), n(520, 0.14, 0.2, { to: 1100, at: 0.4 })],
  bell: [n(660, 1.1, 0.18, { to: 430, a: 0.003 }), n(1320, 0.6, 0.07, { to: 860, a: 0.003 })],
}
const SEEN: Record<string, Note[]> = {
  boot: [...thud(150), n(210, 0.2, 0.16, { to: 320, wave: 'triangle', at: 0.16 })],
  teapot: [n(980, 0.5, 0.09, { to: 1500, a: 0.06 })],
  pig: oink(230),
  farmer: [...mutter(), ...whistleOut(0.6)],
  ball: boing(240),
  bell: ding(740),
}
const HEN: Record<string, Note[]> = {
  boot: [...SEAT.boot, ...cluck(460, 0.3), ...cluck(500, 0.8)],
  teapot: [n(760, 1, 0.1, { to: 1700, a: 0.2 }), ...squawk(0.5)],
  pig: [n(260, 0.2, 0.16, { to: 180, wave: 'triangle' }), ...cluck(230, 0.35, 0.16), ...snort(0.8)],
  farmer: [z(700, 0.7, 0.14, 0.8, { to: 300, a: 0.15 }), n(520, 0.25, 0.16, { to: 900, wave: 'triangle', at: 0.6 })],
  ball: [n(300, 0.5, 0.14, { to: 900, wave: 'triangle' }), ...cluck(520, 0.55)],
  bell: [...cluck(420), ...cluck(420, 0.35, 0.1), ...cluck(420, 0.7, 0.05), ...ding(528, 0, 0.08)],
}

/** What a chick tries to say, by what it copies. */
const CRY: Record<string, Note[]> = {
  boot: [...peep(1350), n(330, 0.09, 0.2, { to: 190, at: 0.16, a: 0.004 })],
  teapot: [n(1150, 0.5, 0.12, { to: 2300, a: 0.03 })],
  pig: [n(620, 0.12, 0.1, { to: 1000, wave: 'sawtooth' }), n(900, 0.16, 0.1, { to: 520, wave: 'sawtooth', at: 0.14 })],
  farmer: [z(1150, 0.34, 0.12, 5, { to: 1700, a: 0.12 }), n(2100, 0.34, 0.07, { to: 1500, at: 0.42, a: 0.05 })],
  ball: [n(1000, 0.24, 0.12, { to: 1900, a: 0.02 }), n(1900, 0.26, 0.12, { to: 950, at: 0.25, a: 0.02 })],
  bell: [n(1568, 0.3, 0.12), n(1245, 0.4, 0.12, { at: 0.26 })],
  hen: [n(950, 0.07, 0.13, { to: 1300, wave: 'triangle' }), n(1150, 0.08, 0.12, { to: 820, wave: 'triangle', at: 0.1 })],
  egg: [n(820, 0.5, 0.1, { a: 0.08, wave: 'triangle' })],
  self: [...peep(1650), ...peep(1650, 0.24, 0.06), ...peep(1650, 0.48, 0.03)],
  lost: [...peep(1450), ...peep(1200, 0.16)],
}

const PAIR_EXTRA: Record<string, Note[]> = {
  'boot-teapot': [...glug(0.15), ...glug(0.8), n(150, 0.3, 0.2, { to: 240, wave: 'triangle', at: 1.2 })],
  'boot-pig': [z(900, 0.12, 0.14, 2, { to: 1500 }), z(900, 0.12, 0.14, 2, { to: 1500, at: 0.22 }), n(700, 0.5, 0.12, { to: 180, wave: 'triangle', at: 0.6 }), ...thud(84, 1)],
  'boot-farmer': [z(500, 0.5, 0.1, 1, { to: 300, a: 0.1 }), n(180, 0.6, 0.18, { to: 130, wave: 'triangle', at: 0.3, a: 0.1 })],
  'boot-ball': [...thud(130, 0.35), ...boing(170, 0.4)],
  'boot-bell': [n(200, 0.1, 0.3, { to: 120 }), ...ding(880), ...many(3, 0.3, () => thud(140), 0.3)],
  'teapot-pig': [...many(6, 0.15, (i) => [z(700 + (i % 2) * 200, 0.1, 0.14, 2, { to: 1400 })], 0.2), n(150, 0.4, 0.24, { to: 90, wave: 'sawtooth', at: 1.4 })],
  'teapot-farmer': [z(900, 0.5, 0.12, 2, { to: 1800, at: 0.2, a: 0.1 }), z(3200, 0.6, 0.09, 1, { at: 1.1, a: 0.2 })],
  'teapot-ball': [z(3000, 1.5, 0.09, 1, { a: 0.2 }), n(520, 1.3, 0.1, { to: 900, a: 0.3 })],
  'teapot-bell': [...china(1180), ...ding(660, 0.36), ...china(1180, 0.72), ...ding(660, 1.08)],
  'pig-farmer': [z(1200, 0.16, 0.12, 2, { to: 600 }), z(1200, 0.16, 0.12, 2, { to: 600, at: 0.35 }), ...many(6, 0.12, (i) => [n(190 + (i % 2) * 50, 0.09, 0.2, { wave: 'triangle' })], 0.5)],
  'pig-ball': [...snort(), ...boing(200, 0.3)],
  'pig-bell': [...many(8, 0.2, (i) => ding(i % 2 ? 990 : 792, 0, 0.07)), ...many(4, 0.4, () => [n(170, 0.1, 0.2, { to: 240, wave: 'sawtooth' })])],
  'farmer-ball': [...snoreIn(), ...whistleOut(0.95), ...bop(260, 0.2, 1.1)],
  'farmer-bell': [...ding(660), ...ding(660, 0.4), n(120, 0.5, 0.2, { to: 190, wave: 'triangle', at: 0.8, a: 0.1 }), ...whistleOut(2.2)],
  'ball-bell': [...bop(260, 0.3), ...ding(1056, 0.02)],
}

const LOOK: Record<string, Note[]> = {
  boot: [z(1800, 0.3, 0.1, 2, { to: 2600, a: 0.1 })],
  teapot: [n(420, 0.45, 0.14, { to: 760, wave: 'triangle' })],
  pig: [n(900, 0.6, 0.12, { to: 260, wave: 'triangle' })],
  farmer: many(3, 0.2, () => [z(2000, 0.05, 0.14, 3)]),
  ball: [n(460, 0.3, 0.12, { to: 700, wave: 'triangle' }), n(700, 0.3, 0.12, { to: 460, wave: 'triangle', at: 0.3 })],
  bell: many(3, 0.5, () => [n(440, 0.1, 0.14, { to: 560, wave: 'triangle' })]),
  hen: [n(320, 0.7, 0.18, { to: 380, wave: 'triangle', a: 0.15 })],
  egg: [n(440, 0.12, 0.14, { wave: 'triangle' }), n(600, 0.12, 0.14, { wave: 'triangle', at: 0.5 }), n(440, 0.12, 0.14, { wave: 'triangle', at: 1 })],
  chick: [n(420, 0.1, 0.14, { wave: 'triangle' }), n(420, 0.1, 0.1, { wave: 'triangle', at: 0.2 }), n(520, 0.25, 0.2, { to: 860, wave: 'triangle', at: 0.6 })],
  self: [n(380, 0.8, 0.12, { to: 520, wave: 'triangle', a: 0.2 })],
}

export const VOICES: Record<string, Note[]> = {
  'press.egg': [z(1500, 0.07, 0.1, 6, { to: 900 }), n(520, 0.06, 0.08, { to: 430, wave: 'triangle' })],
  'press.chick': peep(1700, 0, 0.07),
  'press.hen': [n(380, 0.07, 0.12, { to: 460, wave: 'triangle' })],
  'press.thing': [n(250, 0.07, 0.14, { to: 190, wave: 'triangle' })],
  'press.ground': [z(340, 0.09, 0.12, 1)],
  dab: [n(620, 0.06, 0.07, { to: 700 })],
  lift: [n(300, 0.12, 0.12, { to: 480, wave: 'triangle' })],
  bump: [n(200, 0.1, 0.2, { to: 140 }), n(240, 0.08, 0.12, { to: 180, at: 0.22 })],
  thread: [n(340, 0.16, 0.14, { to: 900, wave: 'triangle', a: 0.004 })],
  'egg.crack': [z(2600, 0.04, 0.24, 1.5, { a: 0.002 }), z(1900, 0.05, 0.2, 1.5, { at: 0.07, a: 0.002 }), z(3100, 0.03, 0.14, 2, { at: 0.16, a: 0.002 })],
  'egg.lid': [n(480, 0.12, 0.22, { to: 1100, a: 0.004 }), z(2400, 0.07, 0.12, 1.5)],
  'egg.out': [z(1500, 0.16, 0.12, 1.2), n(700, 0.12, 0.1, { to: 1100 })],
  'egg.knock': many(3, 0.23, () => [n(420, 0.05, 0.14, { to: 330, wave: 'triangle', a: 0.003 })]),
  'egg.set': [n(520, 0.09, 0.18, { to: 430, wave: 'triangle', a: 0.003 })],
  'egg.tok': [n(600, 0.07, 0.2, { wave: 'triangle', a: 0.003 }), n(680, 0.07, 0.18, { wave: 'triangle', a: 0.003, at: 0.11 })],
  'egg.wet': [n(940, 1.2, 0.1, { a: 0.2 }), n(946, 1.2, 0.08, { a: 0.2 })],
  'set.chick': [...flutter(), ...many(4, 0.09, () => [z(1200, 0.03, 0.08, 2)], 0.4)],
  'seat.chick': [...peep(1300), ...peep(1900, 0.15)],
  'wet.chick': [...splash(), ...many(6, 0.08, (i) => peep(1500 + (i % 2) * 260, 0, 0.08), 0.15)],
  'ring.sit': [n(1200, 0.5, 0.12, { to: 480, wave: 'triangle' }), ...many(3, 0.09, () => [n(240, 0.06, 0.14, { to: 180 })], 0.4)],
  'ring.go': [n(520, 0.3, 0.12, { to: 1200, wave: 'triangle' }), ...peep(1500, 0.28)],
  puddle: [...splash(), ...foil(0.1)],
  'puddle.rustle': foil(),
  'hen.back': [...cluck(520), ...peep(1500, 0.2)],
  'hen.lay': [n(300, 0.6, 0.16, { to: 640, wave: 'triangle', a: 0.2 }), n(260, 0.14, 0.26, { to: 520, at: 0.66 })],
  'hen.wing': [z(500, 0.34, 0.2, 0.8, { to: 1300, a: 0.08 }), n(300, 0.4, 0.14, { to: 260, wave: 'triangle', at: 0.25, a: 0.05 })],
  'hen.tuck': [...flutter(0, 8), n(320, 0.6, 0.12, { to: 600, wave: 'triangle', at: 0.5, a: 0.2 })],
  'hen.pop': [n(280, 0.12, 0.26, { to: 620, a: 0.004 })],
  'hen.egg': [n(300, 0.9, 0.18, { to: 250, wave: 'triangle', a: 0.12 })],
  'hen.stretch': squawk(),
  'seen.hen': cluck(380),
  'scenery.sheep': many(5, 0.09, (i) => [n(330 - i * 6, 0.09, 0.14, { wave: 'sawtooth', to: 300 })]),
  'scenery.cow': [z(900, 0.2, 0.1, 1, { to: 500, a: 0.06 }), z(900, 0.2, 0.1, 1, { to: 500, a: 0.06, at: 0.3 })],
  'round.cow': [n(150, 1.3, 0.24, { to: 120, wave: 'sawtooth', a: 0.15 }), n(300, 1.2, 0.08, { to: 240, a: 0.15 })],
  'scenery.sun': many(6, 0.07, (i) => [z(2200 + i * 160, 0.04, 0.1, 5, { a: 0.004 })]),
  'scenery.cloudA': [z(500, 0.5, 0.14, 0.6, { to: 260, a: 0.1 })],
  'scenery.cloudB': [z(800, 0.4, 0.12, 0.6, { to: 420, a: 0.08 })],
  'scenery.tree': many(6, 0.06, (i) => [z(1000 + (i % 2) * 500, 0.05, 0.12, 1)]),
  'scenery.fence': many(7, 0.055, (i) => [n(420 + i * 24, 0.05, 0.14, { wave: 'triangle', a: 0.003 })]),
  ...Object.fromEntries(THINGS.flatMap((k) => [[`tap.${k}`, TAP[k]], [`set.${k}`, SET[k]], [`seat.${k}`, SEAT[k]], [`wet.${k}`, WET[k]], [`seen.${k}`, SEEN[k]], [`hen.${k}`, HEN[k]]])),
  ...Object.fromEntries(Object.entries(LOOK).map(([k, v]) => [`look.${k}`, v])),
  ...Object.fromEntries(GAITS.map((g) => [`cry.${g}`, CRY[g]])),
  ...Object.fromEntries(PAIRS.map(([a, b]) => [`pair.${a}-${b}`, PAIR_EXTRA[`${a}-${b}`]])),
}

/** A sound as it is heard now: a chick's cry goes up with each step down its chain. */
export function notesOf(name: string, steps = 0): Note[] {
  const notes = VOICES[name] ?? []
  if (steps <= 1) return notes
  const up = Math.pow(1.13, Math.min(4, steps - 1))
  return notes.map((e) => ({ ...e, frequency: e.frequency * up, glideTo: e.glideTo === undefined ? undefined : e.glideTo * up, peak: e.peak * 0.92 }))
}
