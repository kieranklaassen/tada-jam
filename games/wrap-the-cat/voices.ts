import type { Note } from './audio'
import type { Id, Paper } from './layout'
import type { Event, Kin } from './model'
import type { Poke } from './play'

// Every sound as numbers. Paper first: a crackle for each wedge, higher as a
// thing fills; a zip and a bow; a rip for each paper. Then each thing's own.

const t = (frequency: number, glideTo: number | undefined, peak: number, attack: number, decay: number, wave: OscillatorType = 'sine', delay = 0): Note => ({ kind: 'tone', frequency, glideTo, peak, attack, decay, wave, delay })
const n = (frequency: number, glideTo: number | undefined, peak: number, attack: number, decay: number, q = 1, delay = 0): Note => ({ kind: 'noise', frequency, glideTo, peak, attack, decay, q, delay })
const vary = (turn: number) => [1, 1.07, 0.94, 1.03, 0.97][turn % 5]
const kind = (id: Id) => (id === 'air0' || id === 'air1' ? ('air' as const) : id)
const quiet = (notes: Note[], k: number, delay = 0): Note[] => notes.map((x) => ({ ...x, peak: x.peak * k, delay: (x.delay ?? 0) + delay }))

const crackle: Record<Paper, (v: number) => Note[]> = {
  0: (v) => [n(2300 * v, 3400, 0.12, 0.004, 0.06, 2.5), n(3600 * v, 2600, 0.07, 0.003, 0.03, 4, 0.04)],
  1: (v) => [t(170 * v, 260 * v, 0.1, 0.01, 0.1, 'triangle'), n(900 * v, 1300, 0.07, 0.01, 0.07, 2)],
  2: (v) => [n(5200 * v, 6800, 0.08, 0.002, 0.04, 5), n(4300 * v, 5600, 0.06, 0.002, 0.03, 6, 0.03)],
}
const RIP: Record<Paper, (v: number) => Note[]> = {
  0: (v) => [n(1500 * v, 3800, 0.24, 0.01, 0.22, 0.9), n(2600 * v, 900, 0.12, 0.02, 0.14, 1.4, 0.06)],
  1: (v) => [t(150 * v, 420 * v, 0.16, 0.08, 0.14, 'sawtooth'), n(800, 1700, 0.12, 0.04, 0.16, 1.5)],
  2: (v) => [n(4200 * v, 6400, 0.13, 0.01, 0.2, 3), n(5600 * v, 3800, 0.08, 0.01, 0.14, 4, 0.08)],
}
const OFF: Record<Paper, Note[]> = {
  0: [n(1200, 4200, 0.3, 0.01, 0.4, 0.7), n(700, 300, 0.2, 0.01, 0.2, 0.8, 0.1)],
  1: [t(110, 520, 0.2, 0.12, 0.1, 'sawtooth'), t(520, 130, 0.22, 0.005, 0.4, 'triangle', 0.2), n(700, 2200, 0.16, 0.01, 0.16, 1, 0.2)],
  2: [n(4600, 7200, 0.16, 0.02, 0.5, 2.4), n(3400, 5600, 0.1, 0.02, 0.4, 3, 0.1)],
}

type Own = { lay(v: number): Note[]; bow(v: number): Note[]; burst(v: number): Note[]; kin(): Note[] }
export const OWN: Record<ReturnType<typeof kind>, Own> = {
  bike: {
    lay: (v) => [t(1760 * v, 1740, 0.05, 0.002, 0.12)],
    bow: (v) => [t(880 * v, 860, 0.12, 0.004, 0.16), n(300, 160, 0.16, 0.005, 0.12, 1, 0.5)],
    burst: (v) => [0, 1, 2, 3].map((i) => t((i % 2 ? 2090 : 1760) * v, undefined, 0.09, 0.002, 0.34, 'sine', i * 0.11)),
    kin: () => [0, 1, 2].map((i) => t(1480, 1470, 0.07, 0.002, 0.14, 'sine', i * 0.2)),
  },
  cat: {
    lay: (v) => [t(150 * v, 120, 0.1, 0.03, 0.16, 'sawtooth')],
    bow: (v) => [t(520 * v, 340, 0.12, 0.04, 0.34, 'sawtooth', 0.15)],
    burst: (v) => [t(430 * v, 980, 0.14, 0.04, 0.3, 'sawtooth'), n(3000, 5200, 0.12, 0.02, 0.26, 1.2, 0.18)],
    kin: () => [n(3600, 5600, 0.12, 0.02, 0.24, 1.5), t(180, 110, 0.14, 0.02, 0.16, 'triangle', 0.3)],
  },
  grandpa: {
    lay: (v) => [n(180 * v, 320, 0.14, 0.05, 0.12, 3)],
    bow: (v) => [n(130 * v, 300, 0.16, 0.6, 0.6, 3, 0.2), t(150, 70, 0.22, 0.01, 0.4, 'sawtooth', 1.5), n(420, 180, 0.2, 0.01, 0.35, 2, 1.5)],
    burst: (v) => [n(700 * v, 1800, 0.1, 0.36, 0.06, 1), n(2600, 600, 0.3, 0.01, 0.22, 0.7, 0.5), t(300, 110, 0.14, 0.01, 0.18, 'sawtooth', 0.5)],
    kin: () => [n(110, 210, 0.2, 0.3, 0.4, 3)],
  },
  giraffe: {
    lay: (v) => [t(220 * v, 300 * v, 0.08, 0.04, 0.16, 'triangle')],
    bow: (v) => [0, 1, 2, 3].map((i) => t((i % 2 ? 300 : 170) * v, (i % 2 ? 170 : 300) * v, 0.14, 0.06, 0.22, 'triangle', i * 0.3)),
    burst: (v) => [t(150 * v, 640, 0.2, 0.01, 0.24, 'triangle'), t(640, 220, 0.12, 0.01, 0.4, 'triangle', 0.22)],
    kin: () => [n(900, 2400, 0.14, 0.2, 0.06, 2), t(240, 120, 0.14, 0.01, 0.12, 'sine', 0.3)],
  },
  tuba: {
    lay: (v) => [t(98 * v, 96, 0.12, 0.02, 0.12, 'triangle')],
    bow: (v) => [t(87 * v, 85, 0.2, 0.02, 0.24, 'sawtooth', 0.25), t(65 * v, 63, 0.2, 0.02, 0.3, 'sawtooth', 0.7)],
    burst: (v) => [t(98 * v, 94, 0.26, 0.02, 0.7, 'sawtooth'), t(147 * v, 142, 0.14, 0.02, 0.6, 'sawtooth')],
    kin: () => [t(70, 150, 0.22, 0.1, 0.6, 'sawtooth')],
  },
  tree: {
    lay: (v) => [n(3200 * v, 2200, 0.06, 0.01, 0.1, 2), t(2400 * v, 2380, 0.03, 0.002, 0.14)],
    bow: (v) => [0, 1, 2, 3, 4].map((i) => t([1568, 1976, 1760, 2093, 1568][i] * v, undefined, 0.05, 0.002, 0.14, 'sine', 0.2 + i * 0.12)),
    burst: (v) => [n(260, 900, 0.22, 0.03, 0.24, 0.8), ...[1047, 1319, 1568, 2093].map((f, i) => t(f * v, undefined, 0.06, 0.002, 0.6, 'sine', 0.1 + i * 0.03))],
    kin: () => [2093, 1760, 1568, 1319].map((f, i) => t(f, undefined, 0.05, 0.002, 0.2, 'sine', i * 0.1)),
  },
  air: {
    lay: () => [],
    bow: (v) => [n(1800 * v, 900, 0.1, 0.08, 0.3, 1.2)],
    burst: (v) => [n(500 * v, 200, 0.2, 0.01, 0.2, 0.8)],
    kin: () => [t(420, 180, 0.16, 0.003, 0.08), t(330, 470, 0.1, 0.1, 0.3, 'triangle', 0.4)],
  },
}

const TUG: Record<Kin, Note[]> = {
  aunt: [n(1300, 2600, 0.16, 0.02, 0.2, 1), n(1600, 3000, 0.14, 0.02, 0.2, 1, 0.3), t(520, 640, 0.07, 0.04, 0.2, 'triangle')],
  boy: [n(1800, 3200, 0.14, 0.01, 0.14, 1.2), n(2000, 3400, 0.14, 0.01, 0.14, 1.2, 0.2), n(2200, 3600, 0.14, 0.01, 0.14, 1.2, 0.4)],
  dog: [t(150, 130, 0.14, 0.05, 0.4, 'sawtooth'), n(1500, 2800, 0.14, 0.02, 0.2, 1, 0.3)],
}
/** A sash pulled: the other one answers half a beat later. */
export const TWANG: Note[] = [t(280, 180, 0.16, 0.004, 0.3, 'triangle', 0.2)]

export function voiceOfEvent(e: Event, turn: number, tied: Id | null): Note[] {
  const v = vary(turn)
  switch (e.type) {
    case 'lay': return [...crackle[e.paper](0.8 + (e.laid / 16) * 0.5), ...(e.laid % 3 === 1 ? OWN[kind(e.id)].lay(v) : [])]
    // A zip as it pulls tight, the bow, and what its wearer makes of it.
    case 'bow': return [n(900, 3600, 0.16, 0.06, 0.06, 2), t(620, 1240, 0.14, 0.01, 0.14, 'triangle', 0.14), ...quiet(OWN[kind(e.id)].bow(v), 1, 0.2)]
    case 'tie': return TWANG
    case 'tear': return [...RIP[e.paper](v), ...quiet(OWN[kind(e.id)].bow(v), 0.5), ...(tied ? [...TWANG, ...quiet(OWN[kind(tied)].bow(v), 0.5, 0.3)] : [])]
    case 'burst': return [...OFF[e.paper], ...quiet(e.by ? OWN[kind(e.id)].kin() : OWN[kind(e.id)].burst(v), 1, 0.12)]
    case 'moth': return [0, 1, 2, 3, 4].map((i) => n(900 + i * 60, 700, 0.06, 0.01, 0.06, 3, 0.2 + i * 0.12))
    case 'paper': return [t([330, 440, 587][e.paper], [350, 520, 600][e.paper], 0.1, 0.01, 0.1, 'triangle'), ...crackle[e.paper](1)]
    case 'bump': return [t(196, 170, 0.2, 0.004, 0.14, 'triangle'), t(1760, 1740, 0.06, 0.002, 0.2, 'sine', 0.05)]
    case 'sit': return [n(500, 220, 0.14, 0.04, 0.3, 1.4)]
    case 'stir': return [n(2000 * v, 1300, 0.07, 0.01, 0.08, 2)]
    case 'eat': return [n(700, 300, 0.12, 0.02, 0.1, 2, 0.45), n(760, 300, 0.12, 0.02, 0.1, 2, 0.7), t(200, 120, 0.1, 0.02, 0.12, 'sine', 0.95)]
    case 'visit': return [n(240, 160, 0.2, 0.005, 0.14, 1), t(440, 700, 0.1, 0.02, 0.18, 'triangle', 0.1), t(560, 860, 0.1, 0.02, 0.18, 'triangle', 0.25), t(210, 300, 0.12, 0.01, 0.1, 'sawtooth', 0.4)]
    case 'noses': return [t(300, 420, 0.1, 0.06, 0.2, 'triangle'), t(420, 560, 0.08, 0.06, 0.2, 'triangle', 0.3), n(500, 900, 0.08, 0.06, 0.08, 2, 0.6)]
    case 'tug': return TUG[e.who]
    case 'out': return [n(260, 140, 0.22, 0.005, 0.2, 1)]
    case 'squeak': return [
      [t(1100, 1300, 0.06, 0.02, 0.1, 'triangle'), n(2600, 3400, 0.06, 0.01, 0.3, 2, 0.2), n(2600, 3400, 0.06, 0.01, 0.3, 2, 0.9)],
      [t(900, 1500, 0.07, 0.01, 0.12, 'triangle')],
      [n(1800, 4200, 0.12, 0.01, 0.3, 1)],
      [n(900, 500, 0.1, 0.01, 0.08, 2), t(1400, 1700, 0.06, 0.02, 0.1, 'triangle', 0.2)],
      [],
    ][e.beat] ?? []
    default: return e satisfies never
  }
}

/** A finger landing on something, heard at once, whatever it goes on to do. */
export function voiceOfPoke(p: Poke, turn: number): Note[] {
  const v = vary(turn)
  switch (p.touched.kind) {
    // The paper's own sound follows from what it did.
    case 'thing': return [n(900 * v, 600, 0.06, 0.003, 0.05, 2)]
    case 'roll': return []
    case 'door': return [n(220, 150, 0.2, 0.004, 0.1, 1), t(130, 100, 0.12, 0.004, 0.1)]
    case 'mouse': return [t(1500 * v, 1900, 0.07, 0.01, 0.08, 'triangle')]
    case 'room': return [n(420 * v, 260, 0.09, 0.005, 0.08, 1)]
    default: return p.touched satisfies never
  }
}

/** The bicycle, left alone half wrapped. */
export const SHIVER: Note[] = [t(1760, 1740, 0.04, 0.002, 0.2)]
