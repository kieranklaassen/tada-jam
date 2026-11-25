import type { Note } from './audio'
import { OWNER, OWNERS } from './owners'
import { THINGS, type ThingId } from './things'

// Every sound of the room as plain numbers, so a test can hold it in range.
// Each thing has one material and each owner one voice; a result is heard as
// the two together.

type Opt = { to?: number; wave?: OscillatorType; at?: number; a?: number }
const n = (frequency: number, decay: number, peak: number, o: Opt = {}): Note => ({ kind: 'tone', frequency, glideTo: o.to, wave: o.wave ?? 'sine', peak, attack: o.a ?? 0.01, decay, delay: o.at ?? 0 })
const z = (frequency: number, decay: number, peak: number, q = 1, o: Opt = {}): Note => ({ kind: 'noise', frequency, glideTo: o.to, q, peak, attack: o.a ?? 0.01, decay, delay: o.at ?? 0 })
const many = (count: number, gap: number, make: (i: number) => Note[]): Note[] => Array.from({ length: count }, (_, i) => make(i).map((e) => ({ ...e, delay: (e.delay ?? 0) + i * gap }))).flat()
const later = (notes: Note[], by: number): Note[] => notes.map((e) => ({ ...e, delay: (e.delay ?? 0) + by }))

const thud = (f = 105): Note[] => [n(f, 0.2, 0.4, { to: f * 0.8, a: 0.004 }), z(380, 0.08, 0.16, 0.8, { a: 0.003 })]
const ding = (f: number, peak = 0.14): Note[] => [n(f, 0.9, peak, { a: 0.003 }), n(f * 2.01, 0.6, peak * 0.45, { a: 0.003 }), n(f * 2.76, 0.3, peak * 0.3, { a: 0.003 })]
const croak = (f = 170): Note[] => many(3, 0.07, (i) => [n(f + i * 12, 0.07, 0.22, { wave: 'sawtooth', to: f * 1.4 })])
const squeak = (f = 1700): Note[] => [n(f, 0.09, 0.1, { to: f * 1.3 }), n(f * 1.1, 0.1, 0.09, { to: f * 0.85, at: 0.11 })]
const glop = (f = 190): Note[] => [n(f, 0.16, 0.26, { to: f * 2.1 }), z(600, 0.12, 0.16, 1.4, { to: 260 })]
const crunch = (): Note[] => many(3, 0.06, (i) => [z(1900 + i * 500, 0.05, 0.2, 1.6, { a: 0.003 }), n(240, 0.04, 0.1, { wave: 'triangle' })])
const pat = (f = 260): Note[] => [n(f, 0.09, 0.2, { to: f * 0.7, wave: 'triangle', a: 0.004 })]
const boing = (f = 150): Note[] => [n(f, 0.42, 0.3, { to: f * 2.6, wave: 'triangle', a: 0.005 })]

const ABOUT: Record<ThingId, () => Note[]> = {
  mandarin: () => [n(330, 0.14, 0.24, { to: 250, wave: 'triangle' }), z(700, 0.07, 0.1, 1)],
  carrot: () => [n(620, 0.07, 0.2, { wave: 'triangle', to: 520, a: 0.003 }), n(930, 0.05, 0.1, { wave: 'triangle', a: 0.003 })],
  biscuit: () => [z(2600, 0.06, 0.18, 2, { a: 0.003 }), n(420, 0.05, 0.12, { wave: 'triangle' })],
  frog: () => croak(), mouse: () => squeak(), porridge: () => glop(), bell: () => ding(1180, 0.11),
}
const VOICE: Record<string, (f: number) => { yelp: Note[]; giggle: Note[]; snort: Note[]; loves: Note[]; minds: Note[] }> = Object.fromEntries(OWNERS.map((o) => {
  const wave: OscillatorType = o === 'goose' || o === 'elephant' ? 'sawtooth' : 'triangle', k = o === 'goose' || o === 'elephant' ? 0.7 : 1
  return [o, (f: number) => ({
    yelp: [n(f, 0.16, 0.26 * k, { to: f * 1.9, wave }), n(f * 1.8, 0.28, 0.2 * k, { to: f * 1.1, wave, at: 0.16 })],
    giggle: many(o === 'bear' || o === 'elephant' ? 3 : 5, 0.11 / OWNER[o].tempo + 0.02, (i) => [n(f * (1.3 - i * 0.05), 0.09, 0.2 * k, { to: f * 1.5, wave })]),
    snort: [z(300, 0.35, 0.22, 3, { to: 520, a: 0.14 }), n(Math.max(80, f * 0.5), 0.3, 0.12, { wave, at: 0.1 })],
    loves: [n(f * 0.9, 0.5, 0.2 * k, { to: f * 1.35, wave, a: 0.12 }), n(f * 1.35, 0.7, 0.2 * k, { to: f, wave, at: 0.5, a: 0.1 })],
    minds: many(8, 0.11, (i) => [n(f * (i % 2 ? 1.2 : 1), 0.09, 0.16 * k, { wave })]),
  })]
}))

export const VOICES: Record<string, Note[]> = {
  plunge: [z(500, 0.22, 0.26, 1, { to: 160 }), ...later(thud(90), 0.05)],
  'find.none': [n(200, 0.3, 0.14, { to: 150 })],
  pull: [z(300, 0.18, 0.2, 2, { to: 900 }), n(220, 0.14, 0.22, { to: 520, wave: 'triangle', at: 0.06 })],
  toe: [n(900, 0.06, 0.1, { to: 1200 })], leather: [z(420, 0.14, 0.2, 2.4, { to: 640 }), n(140, 0.1, 0.2, { to: 110 })],
  pat: pat(190), step: thud(130), cat: [n(560, 0.16, 0.12, { to: 820, wave: 'triangle', a: 0.04 }), n(800, 0.3, 0.12, { to: 480, wave: 'triangle', at: 0.18 })],
  sun: [n(392, 0.4, 0.14, { a: 0.05 }), n(494, 0.4, 0.1, { at: 0.06, a: 0.05 })], moon: [n(330, 0.5, 0.12, { a: 0.06 }), n(415, 0.5, 0.09, { at: 0.08, a: 0.05 })],
  dusk: many(5, 0.24, (i) => [n([523, 440, 392, 330, 262][i], 0.5, 0.13, { a: 0.04 })]), dawn: many(6, 0.2, (i) => [n([262, 330, 392, 440, 523, 659][i], 0.5, 0.14, { a: 0.04 })]),
  sneeze: [z(900, 0.16, 0.1, 1, { to: 1800, a: 0.12 }), ...later([z(2400, 0.2, 0.3, 0.7, { to: 700 })], 0.22)],
  squirt: many(6, 0.1, (i) => [z(1500 + i * 120, 0.12, 0.14, 2, { to: 2600 })]), gulp: [n(300, 0.1, 0.26, { to: 160 }), n(180, 0.14, 0.24, { to: 360, at: 0.12 })],
  pop: [n(260, 0.07, 0.32, { to: 900, a: 0.003 }), z(1400, 0.05, 0.14)], whirl: many(6, 0.09, (i) => [z(700 + i * 160, 0.08, 0.1, 4)]),
  crunch: [...crunch(), ...later(crunch(), 0.28), ...later(crunch(), 0.56)], patter: many(8, 0.09, (i) => [z(3200 + (i % 3) * 500, 0.03, 0.09, 3, { a: 0.003 })]),
  boing: boing(), croak: croak(150), burp: [n(120, 0.5, 0.34, { wave: 'sawtooth', to: 86 }), z(260, 0.4, 0.14, 2)],
  scurry: many(9, 0.07, (i) => [z(2200 + (i % 2) * 900, 0.03, 0.12, 3, { a: 0.003 })]), squeak: squeak(), nibble: many(5, 0.09, () => [z(2400, 0.04, 0.16, 2, { a: 0.003 })]),
  gurgle: many(5, 0.13, (i) => [n(150 + i * 34, 0.12, 0.24, { to: 260 + i * 50 })]), splurt: [z(400, 0.5, 0.28, 0.8, { to: 1300 }), n(180, 0.3, 0.2, { to: 420 })], splat: [z(900, 0.16, 0.3, 0.7, { to: 250 }), ...glop(150)],
  ring: ding(1046, 0.13), bong: [...ding(392, 0.24), n(196, 1.2, 0.2)], puff: [z(800, 0.4, 0.14, 0.7, { to: 300, a: 0.06 })], flit: many(7, 0.08, (i) => [z(1600 + (i % 2) * 400, 0.04, 0.07, 3)]),
}
for (const id of THINGS) {
  const a = ABOUT[id]
  VOICES[`pick.${id}`] = a()
  VOICES[`leap.${id}`] = [z(500, 0.22, 0.1, 1.4, { to: 1300 })]
  VOICES[`in.${id}`] = [...thud(92), ...later(a(), 0.08)]
  VOICES[`drop.${id}`] = [...pat(220), ...later(a(), 0.02)]
  VOICES[`find.${id}`] = a().map((e) => ({ ...e, peak: e.peak * 0.7 }))
  VOICES[`head.${id}`] = [...a(), ...later(a(), 0.45)]
}
VOICES['head.carrot'] = [n(330, 0.5, 0.2, { wave: 'triangle', a: 0.03 }), n(440, 0.4, 0.16, { wave: 'triangle', at: 0.55, a: 0.03 })]
VOICES['head.mandarin'] = [n(220, 1.1, 0.16, { to: 290, a: 0.1 })]
VOICES['head.biscuit'] = VOICES.patter
for (const o of OWNERS) { const v = VOICE[o](OWNER[o].voice); for (const k of ['yelp', 'giggle', 'snort', 'loves', 'minds'] as const) VOICES[`${k}.${o}`] = v[k] }

export function notesOf(name: string): Note[] { return VOICES[name] ?? [] }
