import type { Note } from './audio'
import type { Body, Part } from './monster'

// Every sound of the board as numbers: plastic, marker felt, and creatures
// with no words. A part has one voice wherever it acts (on the shelf, on a
// monster, in the ostrich's mime), so it can be known by ear.

type More = { glide?: number; delay?: number; wave?: OscillatorType }
const t = (frequency: number, peak: number, attack: number, decay: number, more: More = {}): Note => ({ kind: 'tone', frequency, glideTo: more.glide, wave: more.wave ?? 'sine', peak, attack, decay, delay: more.delay ?? 0 })
const z = (frequency: number, q: number, peak: number, attack: number, decay: number, more: More = {}): Note => ({ kind: 'noise', frequency, glideTo: more.glide, q, peak, attack, decay, delay: more.delay ?? 0 })

export function later(notes: readonly Note[], delay: number): Note[] {
  return notes.map((note) => ({ ...note, delay: (note.delay ?? 0) + delay }))
}
export function quieter(notes: readonly Note[], by: number): Note[] {
  return notes.map((note) => ({ ...note, peak: note.peak * by }))
}

const PART: Record<Part, readonly Note[]> = {
  eye: [t(620, 0.12, 0.01, 0.1, { glide: 930, wave: 'triangle' }), t(930, 0.1, 0.01, 0.14, { glide: 560, delay: 0.14, wave: 'triangle' })],
  mouth: [z(950, 1.4, 0.2, 0.004, 0.06), t(170, 0.16, 0.004, 0.08), z(950, 1.4, 0.2, 0.004, 0.06, { delay: 0.17 }), t(150, 0.16, 0.004, 0.09, { delay: 0.17 }), z(760, 1.4, 0.2, 0.004, 0.08, { delay: 0.34 })],
  nose: [z(1600, 3, 0.07, 0.12, 0.05, { glide: 2600 }), z(1800, 3, 0.08, 0.1, 0.04, { delay: 0.2, glide: 3000 }), z(2400, 0.8, 0.26, 0.004, 0.16, { delay: 0.38, glide: 900 }), t(420, 0.12, 0.004, 0.14, { delay: 0.38, glide: 200 })],
  ear: [z(320, 1, 0.2, 0.03, 0.09), z(280, 1, 0.2, 0.03, 0.09, { delay: 0.17 }), z(240, 1, 0.2, 0.03, 0.12, { delay: 0.34 })],
  hand: [z(1300, 1.1, 0.24, 0.001, 0.05), z(1450, 1.1, 0.24, 0.001, 0.05, { delay: 0.16 }), z(1300, 1.1, 0.24, 0.001, 0.06, { delay: 0.32 })],
  foot: [t(96, 0.34, 0.004, 0.16, { glide: 52 }), z(240, 1, 0.12, 0.003, 0.08), t(90, 0.34, 0.004, 0.2, { delay: 0.24, glide: 48 }), z(240, 1, 0.12, 0.003, 0.08, { delay: 0.24 })],
  tail: [z(700, 2, 0.14, 0.09, 0.12, { glide: 2200 }), z(2200, 2, 0.14, 0.04, 0.16, { delay: 0.2, glide: 700 }), z(700, 2, 0.1, 0.06, 0.14, { delay: 0.38, glide: 1900 })],
}
export function partVoice(part: Part): Note[] {
  return [...PART[part]]
}

/** The note a place is given at the meeting; parts that agree share it, parts that differ rub. */
export function agree(step: number): Note[] {
  const f = 392 * [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2][step % 6]
  return [t(f, 0.12, 0.01, 0.34, { wave: 'triangle' }), t(f * 2, 0.04, 0.01, 0.26)]
}
export function rub(step: number): Note[] {
  const f = 262 * [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3][step % 6]
  return [t(f, 0.09, 0.02, 0.4, { wave: 'triangle' }), t(f * 1.06, 0.09, 0.02, 0.4, { wave: 'triangle', delay: 0.02 })]
}

const LOW: Record<Body, number> = { round: 150, tall: 210, wide: 104 }
export function bodyVoice(body: Body): Note[] {
  const f = LOW[body]
  return [t(f, 0.26, 0.006, 0.26, { glide: f * 1.9 }), t(f * 1.5, 0.08, 0.02, 0.3, { glide: f * 2.2, delay: 0.06, wave: 'triangle' })]
}
/** How each body takes a difference, for ever. */
export function takes(body: Body): Note[] {
  switch (body) {
    case 'round': return [t(330, 0.14, 0.12, 0.3, { glide: 620, wave: 'triangle' }), t(620, 0.12, 0.04, 0.6, { glide: 300, delay: 0.42, wave: 'triangle' }), t(310, 0.06, 0.1, 0.5, { glide: 420, delay: 1.0 })]
    case 'tall': return [z(1400, 2, 0.2, 0.22, 0.08, { glide: 3200 }), t(520, 0.1, 0.16, 0.1, { glide: 1040 }), t(80, 0.4, 0.004, 0.3, { glide: 40, delay: 0.75 }), z(220, 1, 0.2, 0.003, 0.16, { delay: 0.75 })]
    case 'wide': return [0, 0.26, 0.5].flatMap((delay, i) => [t(230 - i * 20, 0.16, 0.02, 0.13, { glide: 150, delay, wave: 'sawtooth' }), z(1000, 2, 0.06, 0.05, 0.1, { delay: delay + 0.1 })])
  }
}
export function dance(): Note[] {
  return [0, 0.3, 0.6, 0.9, 1.2, 1.5].flatMap((delay, i) => [t(i % 2 ? 131 : 98, 0.26, 0.005, 0.16, { delay, glide: i % 2 ? 110 : 70 }), t([392, 494, 587, 494, 659, 784][i], 0.09, 0.01, 0.2, { delay, wave: 'triangle' })])
}

const V = {
  tock: [t(430, 0.16, 0.002, 0.07, { glide: 350, wave: 'triangle' }), z(1800, 2, 0.06, 0.001, 0.03)],
  lift: [t(300, 0.12, 0.005, 0.09, { glide: 560 }), z(2400, 3, 0.05, 0.001, 0.03)],
  thup: [t(120, 0.2, 0.004, 0.09, { glide: 82 }), z(320, 1, 0.08, 0.004, 0.06)],
  tick: [z(2600, 5, 0.06, 0.001, 0.03)],
  suck: [z(700, 3, 0.16, 0.05, 0.05, { glide: 2000 }), t(220, 0.16, 0.02, 0.08, { glide: 520, delay: 0.04 })],
  clack: [z(2100, 2, 0.24, 0.001, 0.035), t(260, 0.22, 0.002, 0.09, { glide: 190, wave: 'triangle' }), t(120, 0.16, 0.01, 0.3, { glide: 168, delay: 0.04 })],
  swap: [z(2100, 2, 0.16, 0.001, 0.03), z(1700, 2, 0.16, 0.001, 0.04, { delay: 0.09 })],
  whistle: [t(700, 0.07, 0.03, 0.24, { glide: 1500 })],
  growLarge: [t(130, 0.26, 0.006, 0.16, { glide: 260 }), z(500, 1, 0.1, 0.004, 0.06)],
  goSmall: [t(760, 0.16, 0.004, 0.1, { glide: 1300 }), z(2200, 2, 0.06, 0.002, 0.04)],
  creak: [t(190, 0.06, 0.04, 0.16, { glide: 245, wave: 'sawtooth' })],
  rollUp: [0, 0.05, 0.1, 0.15, 0.2].map((delay, i) => z(900 + i * 220, 4, 0.13, 0.002, 0.04, { delay })),
  drop: [z(1800, 1, 0.16, 0.05, 0.2, { glide: 500 }), z(300, 1, 0.2, 0.01, 0.1, { delay: 0.2 })],
  flap: [z(420, 1, 0.16, 0.02, 0.08), z(380, 1, 0.13, 0.02, 0.1, { delay: 0.12 })],
  zip: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => z(1600 + i * 130, 6, 0.12, 0.002, 0.04, { delay: i * 0.065 })),
  zipBack: [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => z(2640 - i * 130, 6, 0.12, 0.002, 0.04, { delay: i * 0.065 })),
  cord: [t(240, 0.1, 0.004, 0.12, { glide: 300, wave: 'triangle' }), z(800, 2, 0.06, 0.02, 0.1)],
  squeal: [t(700, 0.07, 0.06, 0.5, { glide: 1500, wave: 'triangle' }), z(2600, 1, 0.18, 0.001, 0.05, { delay: 0.6 }), z(2100, 1, 0.14, 0.001, 0.06, { delay: 0.68 })],
  patter: [0, 1, 2, 3, 4, 5].map((i) => z(1500 + (i % 3) * 400, 2, 0.1, 0.001, 0.04, { delay: 0.2 + i * 0.07 })),
  rustle: [z(2400, 0.7, 0.09, 0.06, 0.2), z(2000, 0.7, 0.07, 0.05, 0.16, { delay: 0.16 })],
  glug: [t(420, 0.16, 0.02, 0.12, { glide: 160 }), t(260, 0.14, 0.02, 0.12, { glide: 110, delay: 0.14 })],
  pop: [t(300, 0.16, 0.004, 0.08, { glide: 900 })],
  honk: [t(330, 0.14, 0.02, 0.16, { wave: 'sawtooth', glide: 300 }), t(497, 0.06, 0.02, 0.16, { wave: 'sawtooth', glide: 452 })],
  bend: [t(260, 0.09, 0.05, 0.2, { glide: 390, wave: 'triangle' })],
  smack: [z(1200, 1, 0.24, 0.001, 0.06), t(240, 0.16, 0.003, 0.1, { glide: 130 })],
  coo: [t(500, 0.11, 0.06, 0.2, { glide: 640, wave: 'triangle' }), t(640, 0.11, 0.04, 0.3, { glide: 470, delay: 0.26, wave: 'triangle' })],
  hiccup: [t(400, 0.15, 0.01, 0.06, { glide: 840, delay: 0.1 }), t(380, 0.13, 0.01, 0.06, { glide: 900, delay: 0.42 })],
  cluck: [t(600, 0.1, 0.005, 0.06, { glide: 420, wave: 'square', delay: 0.08 }), t(640, 0.1, 0.005, 0.07, { glide: 430, wave: 'square', delay: 0.2 })],
  mumble: [0, 0.11, 0.2, 0.33].map((delay, i) => t([150, 178, 140, 166][i], 0.12, 0.02, 0.08, { delay, wave: 'triangle', glide: [170, 150, 160, 130][i] })),
  pat: [z(520, 1, 0.14, 0.004, 0.05), z(480, 1, 0.14, 0.004, 0.06, { delay: 0.12 })],
  giggle: [0, 0.1, 0.2, 0.3].map((delay, i) => t(520 + i * 40, 0.1, 0.01, 0.06, { delay: delay + 0.1, glide: 660 + i * 40, wave: 'triangle' })),
  hinge: [t(820, 0.07, 0.08, 0.3, { glide: 560, wave: 'sawtooth', delay: 0.1 })],
  snort: [z(260, 4, 0.3, 0.02, 0.1, { delay: 0.08 }), z(220, 4, 0.26, 0.02, 0.14, { delay: 0.24 })],
  slap: [z(900, 1, 0.22, 0.001, 0.06), z(860, 1, 0.2, 0.001, 0.07, { delay: 0.05 }), t(196, 0.05, 0.1, 0.7, { delay: 0.2, wave: 'triangle' })],
  peep: [z(2000, 6, 0.1, 0.001, 0.03), z(2300, 6, 0.1, 0.001, 0.03, { delay: 0.14 })],
  clang: [t(1240, 0.1, 0.001, 0.4), t(1870, 0.06, 0.001, 0.3), z(3200, 3, 0.1, 0.001, 0.05)],
  twang: [t(146, 0.2, 0.003, 0.5, { wave: 'sawtooth', glide: 140 }), t(294, 0.07, 0.003, 0.3)],
  knock: [t(180, 0.2, 0.003, 0.08, { glide: 130 }), t(160, 0.2, 0.003, 0.08, { glide: 120, delay: 0.13 }), t(190, 0.2, 0.003, 0.1, { glide: 130, delay: 0.24 })],
  hop: [t(220, 0.12, 0.01, 0.12, { glide: 440 })],
  sackIn: [z(600, 1, 0.14, 0.03, 0.14, { delay: 0.5 }), t(110, 0.26, 0.005, 0.2, { glide: 60, delay: 0.95 }), z(300, 1, 0.2, 0.01, 0.1, { delay: 1.15 }), z(340, 1, 0.16, 0.01, 0.1, { delay: 1.35 })],
  marker: [t(1250, 0.035, 0.02, 0.1, { glide: 1420, wave: 'triangle' }), z(3000, 4, 0.03, 0.01, 0.08)],
  rub: [z(800, 1, 0.14, 0.06, 0.12), z(700, 1, 0.14, 0.06, 0.14, { delay: 0.2 })],
  doodle: [t(1400, 0.05, 0.02, 0.08, { glide: 1700, wave: 'triangle' }), t(1650, 0.05, 0.02, 0.1, { glide: 1350, wave: 'triangle', delay: 0.12 })],
  peek: [t(300, 0.08, 0.05, 0.2, { glide: 520, wave: 'triangle' }), t(700, 0.09, 0.02, 0.16, { glide: 1150, delay: 0.5, wave: 'triangle' })],
  babble: [0, 0.1, 0.18, 0.3, 0.38].map((delay, i) => t([660, 780, 600, 840, 700][i], 0.09, 0.015, 0.07, { delay, glide: [780, 640, 700, 660, 880][i], wave: 'triangle' })),
  swell: [t(140, 0.2, 0.2, 0.3, { glide: 220 })],
  stretch: [t(300, 0.14, 0.2, 0.3, { glide: 900, wave: 'triangle' })],
  sink: [t(300, 0.16, 0.1, 0.5, { glide: 90, wave: 'triangle' })],
  shy: [t(520, 0.05, 0.05, 0.1, { glide: 640, wave: 'triangle' }), t(640, 0.05, 0.03, 0.12, { glide: 560, wave: 'triangle', delay: 0.16 })],
} satisfies Record<string, Note[]>
export type VoiceName = keyof typeof V
export const VOICE_NAMES = Object.keys(V) as VoiceName[]
export function voice(name: VoiceName): Note[] {
  return [...V[name]]
}
