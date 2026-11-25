import type { Note } from './audio'
import type { Happened } from './village'

// Every sound of the village, as plain numbers, so a test can hold it in
// range. Cloth and feathers for the quilt; a trombone of a walrus, a dry quick
// grandmother, a snore with springs, a pan and a cow, a hen, a small brass mayor.

type Opt = { to?: number; wave?: OscillatorType; at?: number; a?: number }
const n = (frequency: number, decay: number, peak: number, o: Opt = {}): Note => ({ kind: 'tone', frequency, glideTo: o.to, wave: o.wave ?? 'sine', peak, attack: o.a ?? 0.012, decay, delay: o.at ?? 0 })
const z = (frequency: number, decay: number, peak: number, q = 1, o: Opt = {}): Note => ({ kind: 'noise', frequency, glideTo: o.to, q, peak, attack: o.a ?? 0.012, decay, delay: o.at ?? 0 })
const many = (count: number, gap: number, make: (i: number) => Note[], from = 0): Note[] => Array.from({ length: count }, (_, i) => make(i).map((e) => ({ ...e, delay: (e.delay ?? 0) + from + i * gap }))).flat()

const horn = (f: number, s: number, p: number, o: Opt = {}): Note[] => [n(f, s, p, { wave: 'sawtooth', a: 0.04, ...o }), n(f * 2, s * 0.8, p * 0.3, { a: 0.05, ...o, to: o.to ? o.to * 2 : undefined })]
const thud = (f: number, p = 0.34, at = 0): Note[] => [n(f, 0.18, p, { to: f * 0.5, at, a: 0.004 }), z(380, 0.08, p * 0.4, 0.8, { at, a: 0.003 })]
const cluck = (f: number, at = 0, p = 0.18): Note[] => [n(f, 0.08, p, { to: f * 1.5, wave: 'triangle', at }), n(f * 1.2, 0.1, p * 0.8, { to: f * 0.8, wave: 'triangle', at: at + 0.1 })]
const boing = (f: number, at = 0): Note[] => [n(f, 0.5, 0.2, { to: f * 2.1, wave: 'triangle', at, a: 0.005 }), n(f * 2.1, 0.5, 0.09, { to: f * 1.2, wave: 'triangle', at: at + 0.16 })]
const clang = (f: number, at = 0, p = 0.14): Note[] => [n(f, 0.8, p, { at, a: 0.003 }), n(f * 2.76, 0.5, p * 0.45, { at, a: 0.003 }), n(f * 5.4, 0.2, p * 0.2, { at, a: 0.003 })]
const snore = (at = 0, p = 0.2): Note[] => [z(220, 0.6, p, 4, { to: 420, at, a: 0.25 }), n(90, 0.5, p * 0.6, { wave: 'sawtooth', to: 120, at, a: 0.2 }), n(1150, 0.4, p * 0.25, { to: 720, at: at + 0.75, a: 0.08 })]
const moo = (f: number, s: number, to: number, at = 0): Note[] => [n(f, s, 0.17, { wave: 'sawtooth', to, at, a: 0.12 }), n(f * 1.5, s, 0.07, { wave: 'triangle', to: to * 1.5, at, a: 0.12 })]
const splash = (p: number, at = 0): Note[] => [z(800, 0.5, p, 0.7, { to: 2400, at }), z(300, 0.4, p, 0.8, { to: 120, at }), ...many(4, 0.09, (i) => [n(420 + i * 90, 0.09, p * 0.4, { to: 760 + i * 80 })], at + 0.22)]
const bell = (f: number, at = 0): Note[] => [n(f, 0.3, 0.12, { at, a: 0.003, wave: 'triangle' }), n(f * 2.4, 0.16, 0.06, { at, a: 0.003 })]

type Who = NonNullable<Happened['id']>
export const VOICES: Record<string, Note[]> = {
  grab: [z(420, 0.16, 0.16, 0.8, { to: 260 })],
  shake: [z(260, 0.22, 0.34, 0.7, { to: 130, a: 0.01 }), n(88, 0.2, 0.28, { to: 60 }), z(1800, 0.6, 0.1, 0.6, { to: 3600, at: 0.1, a: 0.12 })],
  puff: [z(340, 0.13, 0.2, 0.8, { to: 180 }), z(2600, 0.24, 0.05, 0.7, { a: 0.06 })],
  land: [z(3800, 0.09, 0.04, 0.8, { a: 0.02 })],
  flat: [z(700, 0.7, 0.14, 0.8, { to: 180, a: 0.05 }), n(392, 0.5, 0.1, { to: 262, wave: 'triangle', at: 0.15, a: 0.08 })],
  pat: [...thud(120, 0.32), z(900, 0.7, 0.12, 0.7, { to: 3400, at: 0.06, a: 0.2 }), n(294, 0.35, 0.1, { to: 440, wave: 'triangle', at: 0.1, a: 0.1 })],
  fat: [...thud(96, 0.34), n(330, 0.3, 0.12, { wave: 'triangle', to: 392 }), n(440, 0.5, 0.12, { wave: 'triangle', to: 494, at: 0.22 }), z(400, 0.4, 0.12, 0.8, { to: 900 })],
  call: [n(392, 0.14, 0.12, { to: 523, wave: 'triangle' }), n(523, 0.18, 0.1, { to: 587, wave: 'triangle', at: 0.16 })],
  night: [n(523, 0.8, 0.1, { to: 392, wave: 'triangle' }), n(392, 1, 0.1, { to: 262, wave: 'triangle', at: 0.5 }), z(200, 1, 0.1, 3, { to: 320, at: 1.3, a: 0.4 })],
  morning: [n(330, 0.3, 0.1, { to: 440, wave: 'triangle' }), ...cluck(520, 0.25), n(523, 0.5, 0.1, { to: 659, wave: 'triangle', at: 0.4 })],
  hay: [z(2200, 0.3, 0.2, 0.6, { to: 900 }), ...thud(90, 0.3, 0.03)],
  spill: [n(500, 0.5, 0.14, { to: 180, wave: 'triangle' }), ...thud(120, 0.2, 0.55)],

  'walrus.go': [z(160, 0.9, 0.22, 1, { to: 260, a: 0.2 }), ...horn(110, 0.5, 0.1, { to: 165, at: 0.1 })],
  'walrus.stop': [z(240, 0.4, 0.22, 0.8, { to: 120 }), ...horn(147, 0.7, 0.15, { to: 82, at: 0.05 }), ...splash(0.08, 0.35)],
  'walrus.fly': horn(131, 1.1, 0.16, { to: 311 }),
  'walrus.land': [...thud(84, 0.4), ...clang(310, 0.02, 0.14)],
  'walrus.splash': [...splash(0.3), ...thud(82, 0.34), z(1500, 0.8, 0.1, 2, { to: 2600, at: 0.8, a: 0.1 })],
  'walrus.meet': horn(98, 0.35, 0.18, { to: 82 }),
  'walrus.poke': [...many(5, 0.08, (i) => [n(200 + (i % 2) * 60, 0.08, 0.18, { to: 320, wave: 'triangle' })]), z(1800, 0.6, 0.14, 1.5, { to: 3000, at: 0.35 })],
  'walrus.sneeze': [...horn(196, 0.45, 0.09, { to: 330, a: 0.2 }), ...horn(147, 0.6, 0.24, { to: 65, at: 0.56 }), z(900, 0.45, 0.3, 0.6, { to: 200, at: 0.56 })],
  'walrus.home': many(3, 0.3, (i) => clang(250 + i * 20, 0, 0.1)),

  'granny.go': [z(2400, 0.7, 0.12, 0.8, { to: 4200, a: 0.1 }), n(660, 0.25, 0.1, { to: 990, wave: 'triangle' })],
  'granny.stop': [z(700, 0.16, 0.16, 2, { to: 300 }), ...many(5, 0.09, (i) => [n(880 - i * 60, 0.07, 0.1, { to: 700 - i * 50, wave: 'triangle' })], 0.05)],
  'granny.fly': [n(700, 0.8, 0.13, { to: 1500, wave: 'triangle', a: 0.04 })],
  'granny.land': [...thud(170, 0.3), z(1200, 0.06, 0.2, 1, { a: 0.003 })],
  'granny.splash': [z(1500, 0.08, 0.24, 1), z(1500, 0.08, 0.2, 1, { at: 0.2 }), ...splash(0.16, 0.36), ...many(3, 0.25, () => [z(600, 0.1, 0.12, 3, { to: 1100 })], 0.8)],
  'granny.meet': [n(620, 0.16, 0.14, { to: 880, wave: 'triangle' }), n(620, 0.2, 0.14, { to: 930, wave: 'triangle', at: 0.22 })],
  'granny.poke': [...many(2, 0.16, () => thud(210, 0.3)), ...many(2, 0.18, () => thud(130, 0.22), 0.6)],
  'granny.sneeze': many(3, 0.24, () => [z(3200, 0.09, 0.2, 1), n(900, 0.07, 0.12, { to: 600, wave: 'triangle' })]),
  'granny.home': many(3, 0.28, () => thud(190, 0.2)),

  'grandpa.go': [z(500, 0.8, 0.1, 1, { to: 900, a: 0.2 }), n(880, 0.7, 0.07, { to: 1320, at: 0.15, a: 0.1 })],
  'grandpa.stop': [...boing(130), ...snore(0.45, 0.22)],
  'grandpa.fly': [n(220, 0.9, 0.1, { to: 660, a: 0.1 }), ...snore(0.1, 0.14)],
  'grandpa.land': [...boing(98), ...many(3, 0.12, (i) => [n(196 + i * 50, 0.1, 0.1, { wave: 'triangle' })], 0.15)],
  'grandpa.splash': [...splash(0.24), ...many(7, 0.12, (i) => [n(180 + i * 45, 0.09, 0.15, { to: 300 + i * 60 })], 0.4), ...snore(1.4, 0.18)],
  'grandpa.meet': many(3, 0.16, () => [z(1400, 0.05, 0.16, 4, { to: 700 })]),
  'grandpa.poke': [...many(7, 0.06, (i) => [z(1700 + i * 60, 0.03, 0.16, 3, { a: 0.003 })]), ...boing(150, 0.6)],
  'grandpa.sneeze': [z(240, 0.5, 0.2, 4, { to: 500, a: 0.3 }), z(1200, 0.5, 0.2, 0.8, { to: 300, at: 0.6 }), n(1300, 0.4, 0.08, { to: 700, at: 0.7 })],
  'grandpa.home': many(4, 0.24, (i) => [n(i % 2 ? 165 : 147, 0.12, 0.16, { wave: 'triangle' })]),

  'cow.go': [...clang(420, 0, 0.1), ...bell(700, 0.2), ...bell(620, 0.5)],
  'cow.stop': many(8, 0.12, (i) => clang(460 - i * 18, 0, 0.1 - i * 0.008)),
  'cow.fly': moo(150, 1.1, 330),
  'cow.land': [...clang(370, 0, 0.2), ...thud(90, 0.28), ...bell(660, 0.1)],
  'cow.splash': [...splash(0.2), z(5000, 1.2, 0.12, 0.6, { to: 2500, at: 0.15, a: 0.03 }), ...moo(130, 0.9, 110, 0.7)],
  'cow.meet': [...moo(180, 0.45, 290), ...bell(700, 0.3)],
  'cow.poke': many(5, 0.11, (i) => bell(i % 2 ? 620 : 700)),
  'cow.sneeze': [z(500, 0.9, 0.2, 2, { to: 1500, a: 0.3 }), ...bell(660, 0.7)],
  'cow.home': many(3, 0.3, (i) => clang(400 + i * 30, 0, 0.08)),

  'hen.stop': many(4, 0.12, () => [z(2800, 0.03, 0.14, 3, { a: 0.003 })]),
  'hen.land': many(3, 0.13, () => [z(2600, 0.03, 0.14, 3, { a: 0.003 })]),
  'hen.fly': many(9, 0.06, (i) => [z(800 + (i % 2) * 300, 0.045, 0.14, 1.4)]),
  'hen.splash': [...splash(0.1), ...many(4, 0.18, () => [n(1500, 0.1, 0.1, { to: 1800 })], 0.3)],
  'hen.meet': [...cluck(440), ...cluck(490, 0.26)],
  'hen.lay': [n(300, 0.12, 0.24, { to: 700, a: 0.004 }), ...cluck(560, 0.2), ...cluck(620, 0.5, 0.2)],
  'hen.poke': many(3, 0.18, (i) => cluck(420 + i * 60, 0, 0.16)),
  'hen.sneeze': [n(420, 0.35, 0.12, { to: 760, wave: 'sawtooth', at: 0.48 }), n(760, 0.25, 0.1, { to: 420, wave: 'sawtooth', at: 0.8 }), z(1500, 0.3, 0.16, 0.8, { at: 0.5 })],
  'hen.home': many(4, 0.2, () => cluck(460, 0, 0.1)),

  'mayor.stop': [...thud(150, 0.24), n(130, 0.2, 0.16, { wave: 'triangle', to: 110, at: 0.2 })],
  'mayor.land': [...thud(160, 0.24), n(140, 0.22, 0.16, { wave: 'triangle', to: 115, at: 0.2 })],
  'mayor.fly': horn(392, 0.4, 0.1, { to: 523 }),
  'mayor.splash': [n(500, 0.09, 0.14, { to: 900 }), n(620, 0.09, 0.14, { to: 1100, at: 0.2 }), n(150, 0.3, 0.14, { wave: 'triangle', to: 190, at: 0.5 })],
  'mayor.meet': [...horn(392, 0.14, 0.12), ...horn(523, 0.3, 0.12, { at: 0.18 })],
  'mayor.poke': [...boing(330), n(900, 0.08, 0.16, { to: 500, at: 0.85, a: 0.004 })],
  'mayor.sneeze': [n(260, 0.3, 0.1, { wave: 'triangle', to: 330 }), ...horn(349, 0.3, 0.14, { at: 0.5 }), z(900, 0.2, 0.18, 0.8, { at: 0.5 })],
  'mayor.home': many(4, 0.2, () => [z(1900, 0.05, 0.1, 5, { to: 2400 })]),
}

const MUTED: Partial<Record<Happened['type'], true>> = { knock: true }

/** What one happening sounds like; nothing for what makes no sound of its own. */
export function notesOf(e: Happened): Note[] {
  if (MUTED[e.type]) return []
  const own = e.id ? VOICES[`${e.id as Who}.${e.type}`] : undefined
  if (own) return own
  // A body's happening it has no voice for is silent; the village's own are by name.
  return e.id && !['puff', 'call', 'spill', 'hay'].includes(e.type) ? [] : VOICES[e.type] ?? []
}
