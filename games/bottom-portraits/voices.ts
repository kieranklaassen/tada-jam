import type { Note } from './audio'
import type { Id } from './cast'
import type { Act } from './sight'
import { TEMPERS } from './motion'

// Every sound, as notes: tin, springs, a toy band. Nothing is recorded.

const t = (frequency: number, peak: number, attack: number, decay: number, delay = 0, wave: OscillatorType = 'triangle', glideTo?: number): Note => ({ kind: 'tone', frequency, peak, attack, decay, delay, wave, ...(glideTo ? { glideTo } : {}) })
const n = (frequency: number, peak: number, attack: number, decay: number, delay = 0, q = 1.5, glideTo?: number): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, delay, ...(glideTo ? { glideTo } : {}) })
const run = (count: number, gap: number, make: (i: number, at: number) => Note[]): Note[] => Array.from({ length: count }, (_, i) => make(i, i * gap)).flat()

/** Thin tin struck. */
const tin = (f: number, peak = 0.16, at = 0): Note[] => [t(f, peak, 0.002, 0.16, at, 'sine'), t(f * 2.76, peak * 0.5, 0.002, 0.09, at, 'sine'), n(f * 5, peak * 0.4, 0.001, 0.03, at, 2)]

export const ACTS: Readonly<Record<Id, Readonly<Record<Act, Note[]>>>> = {
  elephant: {
    front: [t(220, 0.12, 0.08, 0.3, 0, 'sawtooth', 440), t(440, 0.16, 0.05, 0.8, 0.35, 'sawtooth', 470), n(900, 0.06, 0.05, 0.8, 0.35, 2)],
    back: [t(330, 0.14, 0.05, 1.3, 0.1, 'sawtooth', 92), n(400, 0.05, 0.1, 1.2, 0.1, 1, 150)],
    side: run(4, 0.5, (i, at) => [t(i % 2 ? 130 : 116, 0.2, 0.06, 0.4, at, 'sine')]),
    cut: [t(150, 0.14, 0.1, 0.9, 0, 'sawtooth', 620), t(620, 0.1, 0.02, 0.3, 1.0, 'square', 640)],
    hole: run(3, 0.3, (_, at) => [t(300, 0.08, 0.03, 0.18, at, 'sawtooth', 330), n(1500, 0.06, 0.02, 0.16, at, 6)]),
  },
  hen: {
    front: run(4, 0.26, (_, at) => [...tin(1250, 0.12, at), n(2600, 0.08, 0.001, 0.03, at)]),
    back: [t(900, 0.16, 0.02, 0.5, 0, 'sawtooth', 240), ...tin(340, 0.22, 0.52), n(600, 0.14, 0.001, 0.12, 0.52), t(520, 0.06, 0.05, 0.2, 2.5, 'sawtooth', 640)],
    side: run(6, 0.22, (i, at) => [t(520 + i * 34, 0.09, 0.01, 0.1, at, 'sawtooth', 430 + i * 30)]),
    cut: run(3, 0.45, (_, at) => [t(700, 0.13, 0.01, 0.16, at, 'sawtooth', 1150), n(1800, 0.06, 0.005, 0.2, at + 0.1, 1)]),
    hole: [t(640, 0.12, 0.01, 0.12, 0.5, 'sawtooth', 520), ...tin(1900, 0.05, 0.05)],
  },
  hippo: {
    front: [t(170, 0.16, 0.5, 0.9, 0, 'sawtooth', 74), n(300, 0.07, 0.5, 0.9, 0, 0.8, 120)],
    back: run(9, 0.26, (i, at) => [t([98, 131, 98, 147, 98, 131, 165, 147, 196][i], 0.2, 0.02, 0.16, at, 'triangle', [110, 140, 104, 160, 104, 140, 170, 150, 208][i]), n(700, 0.04, 0.01, 0.06, at + 0.13, 4)]),
    side: [t(120, 0.2, 0.04, 0.35, 0.1, 'triangle', 110), t(98, 0.2, 0.04, 0.5, 0.8, 'triangle', 88)],
    cut: [n(260, 0.2, 0.2, 1.3, 0, 1.2, 90), t(82, 0.14, 0.2, 1.2, 0, 'sine', 60)],
    hole: [t(180, 0.1, 0.5, 0.1, 0, 'sine', 420), n(1100, 0.22, 0.001, 0.09, 0.75, 1.5), t(260, 0.14, 0.002, 0.12, 0.75, 'sine', 900)],
  },
  pig: {
    front: [t(150, 0.16, 0.02, 0.3, 0.3, 'sawtooth', 110), n(420, 0.12, 0.02, 0.28, 0.3, 3)],
    back: run(7, 0.28, (i, at) => [t(380 + (i % 3) * 60, 0.1, 0.01, 0.1, at, 'sawtooth', 620 + (i % 2) * 80), n(900, 0.1, 0.01, 0.08, at + 0.1, 5)]),
    side: run(8, 0.16, (i, at) => tin(i % 2 ? 620 : 760, 0.1, at)),
    cut: run(5, 0.32, (i, at) => [t(620, 0.12, 0.02, 0.2, at, 'sawtooth', 980 - i * 30), n(200, 0.12, 0.002, 0.08, at)]),
    hole: [n(700, 0.16, 0.02, 0.14, 0.35, 4), t(200, 0.1, 0.02, 0.14, 0.35, 'sawtooth', 240)],
  },
  giraffe: {
    front: run(7, 0.2, (i, at) => [t([1047, 1319, 1568, 1760, 1568, 1319, 2093][i], 0.07, 0.003, 0.5, at, 'sine')]),
    back: [t(210, 0.1, 0.3, 0.8, 0, 'sawtooth', 330), n(500, 0.06, 0.3, 0.8, 0, 8, 800), t(330, 0.08, 0.2, 0.5, 1.4, 'sawtooth', 200)],
    side: run(6, 0.3, (i, at) => [t(i % 2 ? 392 : 330, 0.18, 0.001, 0.07, at, 'sine'), n(1400, 0.06, 0.001, 0.03, at, 4)]),
    cut: [t(880, 0.12, 0.06, 1.1, 0, 'triangle', 165), t(196, 0.12, 0.04, 0.4, 1.5, 'triangle', 294)],
    hole: run(4, 0.4, (_, at) => [t(1100, 0.08, 0.04, 0.2, at, 'sine', 1400), n(2400, 0.02, 0.04, 0.2, at, 6)]),
  },
  crocodile: {
    front: run(2, 0.62, (_, at) => [n(1500, 0.3, 0.001, 0.06, at + 0.3, 1), ...tin(480, 0.22, at + 0.3)]),
    back: [n(2400, 0.1, 0.02, 0.7, 0, 5, 500), t(140, 0.08, 0.05, 0.6, 0.3, 'triangle', 90)],
    side: run(14, 0.115, (i, at) => [n(i % 2 ? 240 : 300, 0.14 + i * 0.005, 0.001, 0.07, at, 1), t(110, 0.1, 0.001, 0.05, at, 'sine')]),
    cut: [...tin(1400, 0.1, 0.3), ...tin(1250, 0.1, 1.1)],
    hole: run(6, 0.2, (i, at) => [...tin(500 + i * 120, 0.09, at)]),
  },
  board: {
    front: run(4, 0.36, (i, at) => [t(i % 2 ? 262 : 220, 0.14, 0.002, 0.4, at, 'sawtooth', i % 2 ? 254 : 214)]),
    back: run(9, 0.08, (i, at) => tin(380 - i * 12, 0.1 - i * 0.008, at)),
    side: [t(2300, 0.06, 0.002, 1.0, 0, 'sine'), t(2317, 0.06, 0.002, 1.0, 0, 'sine')],
    cut: [n(800, 0.28, 0.001, 0.12, 0.18, 0.8), ...tin(260, 0.2, 0.18), ...tin(300, 0.1, 1.0)],
    hole: run(10, 0.15, (i, at) => tin(i % 3 ? 1500 : 1100, 0.09, at)),
  },
}

/** Setting off from a step, each with its own noise. */
export const HOPS: Readonly<Record<Id, Note[]>> = {
  elephant: [t(98, 0.24, 0.01, 0.3, 0, 'sine', 140), n(300, 0.08, 0.05, 0.3)],
  hen: run(7, 0.085, (i, at) => [n(1500 + (i % 2) * 500, 0.1, 0.004, 0.05, at, 1.5)]),
  hippo: [t(82, 0.2, 0.01, 0.22, 0, 'triangle', 165), t(110, 0.14, 0.02, 0.2, 0.3, 'triangle', 196)],
  pig: [t(420, 0.12, 0.05, 0.3, 0, 'sawtooth', 900), t(900, 0.1, 0.02, 0.35, 0.36, 'sawtooth', 380)],
  giraffe: run(4, 0.2, (i, at) => [t(300 + i * 40, 0.14, 0.001, 0.09, at, 'sine')]),
  crocodile: run(9, 0.07, (i, at) => [n(1800 + i * 60, 0.08, 0.001, 0.03, at, 4)]),
  board: run(5, 0.15, (i, at) => tin(420 + (i % 2) * 160, 0.12, at)),
}

/** Coming down, by weight. */
export const landing = (id: Id): Note[] => {
  const p = TEMPERS[id].pitch
  return [t(150 * p + 40, 0.26, 0.002, 0.18, 0, 'sine', 70 * p + 30), ...tin(420 * p + 160, 0.16), n(500, 0.12, 0.002, 0.08)]
}

/** The finger lands on one: its tin gives, and its ratchet takes up. */
export const press = (id: Id): Note[] => [...tin(520 * TEMPERS[id].pitch + 180, 0.12), n(1900, 0.06, 0.001, 0.02)]

/** A quarter turn: its own number of clicks in its own pitch, and the spring left humming. */
export const winding = (id: Id): Note[] => {
  const { clicks, pitch } = TEMPERS[id]
  return [...run(clicks, 0.32 / clicks, (i, at) => [n(1700 + 260 * pitch + i * 90, 0.15, 0.001, 0.025, at, 3), t(300 * pitch + 220 + i * 22, 0.08, 0.001, 0.05, at, 'square')]), t(180 * pitch + 90, 0.07, 0.01, 0.5, 0.34, 'triangle', 170 * pitch + 80)]
}

export const SOUNDS = {
  measure: [t(392, 0.1, 0.04, 0.3, 0, 'triangle', 440)],
  dab: run(3, 0.14, (i, at) => [n(700 + i * 160, 0.14, 0.01, 0.09, at, 1.2), t(180 + i * 25, 0.05, 0.005, 0.06, at, 'sine')]),
  back: [n(400, 0.08, 0.1, 0.3, 0, 1), t(262, 0.07, 0.05, 0.3, 0.05, 'triangle', 294)],
  spin: [n(500, 0.16, 0.2, 0.35, 0, 0.8, 1600), ...tin(780, 0.16, 0.5), t(523, 0.1, 0.005, 0.5, 0.52, 'triangle'), t(659, 0.1, 0.005, 0.5, 0.6, 'triangle')],
  monocle: [t(1400, 0.1, 0.002, 0.2, 0, 'sine', 500), t(300, 0.12, 0.005, 0.35, 0.16, 'square', 180)],
  proud: [t(196, 0.1, 0.03, 0.18, 0, 'sawtooth', 247), t(294, 0.09, 0.03, 0.26, 0.16, 'sawtooth', 300)],
  hmm: [t(165, 0.12, 0.05, 0.4, 0, 'sawtooth', 147)],
  duck: [t(500, 0.1, 0.02, 0.3, 0, 'triangle', 130), n(300, 0.08, 0.01, 0.1, 0.25)],
  crane: [t(147, 0.08, 0.1, 0.35, 0, 'sawtooth', 196), t(196, 0.08, 0.1, 0.35, 0.45, 'sawtooth', 147)],
  hang: [n(600, 0.12, 0.1, 0.3, 0, 0.8, 1200), ...tin(360, 0.2, 0.66), n(240, 0.12, 0.002, 0.06, 0.66)],
  drop: [t(600, 0.12, 0.02, 0.5, 0, 'triangle', 120), n(240, 0.2, 0.002, 0.16, 0.5)],
  table: [...run(10, 0.06, (i, at) => [n(900 + i * 40, 0.12, 0.001, 0.03, at, 2), t(140 + i * 6, 0.1, 0.002, 0.06, at, 'triangle')]), ...run(4, 0.15, (i, at) => [t([523, 659, 784, 659][i], 0.06, 0.004, 0.3, at, 'triangle')])],
  keyUp: [t(300, 0.08, 0.03, 0.25, 0, 'triangle', 620), ...tin(900, 0.1, 0.24)],
  swivel: [t(120, 0.1, 0.05, 0.6, 0, 'sawtooth', 180), n(600, 0.06, 0.1, 0.5, 0, 6)],
  flap: [...tin(700, 0.1), t(87, 0.28, 0.02, 0.55, 0.25, 'sawtooth', 74), n(160, 0.14, 0.03, 0.5, 0.25, 1)],
  wood: [...tin(240, 0.1), n(300, 0.1, 0.001, 0.06)],
  floor: [t(110, 0.14, 0.002, 0.14, 0, 'sine', 80), n(260, 0.1, 0.001, 0.07)],
  glass: [t(1568, 0.08, 0.002, 0.5, 0, 'sine'), t(2349, 0.05, 0.002, 0.4, 0.06, 'sine')],
  pots: run(3, 0.08, (i, at) => [t([740, 932, 620][i], 0.1, 0.002, 0.18, at, 'triangle')]),
  swing: [...tin(520, 0.1), t(220, 0.06, 0.02, 0.4, 0.05, 'triangle', 200)],
  lift: [t(240, 0.1, 0.02, 0.2, 0, 'triangle', 420)],
  refuse: [t(300, 0.1, 0.02, 0.14, 0, 'triangle', 220), t(220, 0.1, 0.02, 0.2, 0.16, 'triangle', 165)],
} satisfies Record<string, Note[]>

export type SoundName = keyof typeof SOUNDS
