import type { Note } from './audio'
import type { Cue, Poke } from './play'
import { hates, type Animal, type Snack, type Thing } from './things'
import type { Event } from './town'

// Every sound as numbers. Each animal has an instrument of its own, and a row
// of the graph has a pitch of its own, so a higher square sounds higher.

const t = (frequency: number, glideTo: number | undefined, peak: number, attack: number, decay: number, wave: Note['wave'] = 'sine', delay = 0): Note => ({ kind: 'tone', frequency, glideTo, peak, attack, decay, wave, delay })
const n = (frequency: number, glideTo: number | undefined, peak: number, attack: number, decay: number, q = 1, delay = 0): Note => ({ kind: 'noise', frequency, glideTo, peak, attack, decay, q, delay })
export const later = (notes: Note[], delay: number): Note[] => notes.map((x) => ({ ...x, delay: (x.delay ?? 0) + delay }))
export const softer = (notes: Note[], k: number): Note[] => notes.map((x) => ({ ...x, peak: x.peak * k }))
const times = (count: number, gap: number, make: (i: number) => Note[]): Note[] => Array.from({ length: count }, (_, i) => later(make(i), i * gap)).flat()
const vary = (turn: number, k = 0.07) => 1 + ((turn % 3) - 1) * k

export const CALL: Record<Animal, (v: number) => Note[]> = {
  pig: (v) => [n(380 * v, 240, 0.2, 0.01, 0.09, 4), t(150 * v, 120, 0.12, 0.01, 0.12, 'sawtooth'), n(460 * v, 260, 0.16, 0.01, 0.1, 4, 0.12)],
  elephant: (v) => [t(233 * v, 349, 0.12, 0.05, 0.16, 'sawtooth'), t(349 * v, 311, 0.1, 0.02, 0.3, 'sawtooth', 0.18)],
  cat: (v) => [t(520 * v, 820, 0.12, 0.05, 0.12, 'triangle'), t(820 * v, 480, 0.11, 0.02, 0.28, 'triangle', 0.14)],
  giraffe: (v) => [t(196 * v, 196, 0.16, 0.04, 0.18), t(247 * v, 244, 0.14, 0.04, 0.34, 'sine', 0.2)],
  goat: (v) => times(5, 0.055, () => [t(390 * v, 360, 0.11, 0.006, 0.05, 'square')]),
  mouse: (v) => [t(1700 * v, 2300, 0.09, 0.01, 0.06, 'triangle'), t(2000 * v, 2500, 0.07, 0.01, 0.05, 'triangle', 0.1)],
}
export const ROWS_HZ = [262, 294, 330, 392, 440, 523]
/** Stone on stone, a step higher for each row. */
export const clack = (row: number): Note[] => [t(ROWS_HZ[Math.min(5, row)] * 2, undefined, 0.16, 0.002, 0.22, 'triangle'), n(2200, 1200, 0.12, 0.002, 0.05, 1.2)]
const SQUEEZE: Record<Animal, Note[]> = {
  pig: [n(260, 180, 0.2, 0.004, 0.1, 1.5), t(170, 120, 0.12, 0.01, 0.12)],
  elephant: [n(160, 420, 0.12, 0.12, 0.2, 3), t(80, 60, 0.26, 0.01, 0.24)],
  cat: [n(3200, 2200, 0.05, 0.03, 0.1, 2)],
  giraffe: [t(300, 200, 0.08, 0.02, 0.1, 'triangle'), n(1800, 1000, 0.08, 0.002, 0.05, 1.2, 0.12)],
  goat: [n(900, 500, 0.18, 0.002, 0.07, 1)],
  mouse: [t(1400, 1700, 0.05, 0.004, 0.06, 'triangle')],
}

const lower = (who: Animal, v: number, k: number): Note[] => CALL[who](v).map((x) => ({ ...x, frequency: x.frequency * k, glideTo: x.glideTo && x.glideTo * k }))
/** Its own cry at something it cannot stand. */
const CRY: Record<Animal, (v: number) => Note[]> = {
  pig: (v) => [t(900 * v, 1300, 0.1, 0.02, 0.28, 'sawtooth')],
  elephant: (v) => [t(260 * v, 520, 0.13, 0.03, 0.2, 'sawtooth'), t(520 * v, 300, 0.11, 0.02, 0.24, 'sawtooth', 0.2)],
  cat: (v) => [n(4000, 2600, 0.1, 0.03, 0.22, 1), t(700 * v, 1000, 0.1, 0.02, 0.18, 'triangle')],
  giraffe: (v) => times(4, 0.07, (i) => [t((230 - i * 12) * v, 210, 0.12, 0.01, 0.07, 'triangle')]),
  goat: (v) => times(7, 0.045, () => [t(470 * v, 420, 0.11, 0.004, 0.04, 'square')]),
  mouse: (v) => times(4, 0.06, () => [t(2300 * v, 1800, 0.08, 0.004, 0.05, 'triangle')]),
}

const ACT: Record<Thing, Record<Animal, (v: number) => Note[]>> = {
  bath: {
    pig: (v) => [t(800 * v, 1500, 0.09, 0.04, 0.24, 'sawtooth'), n(1400, 2400, 0.1, 0.02, 0.2, 1)],
    elephant: (v) => [n(700 * v, 2600, 0.2, 0.1, 0.5, 0.8)],
    cat: (v) => [t(330 * v, 260, 0.11, 0.1, 0.5, 'triangle')],
    giraffe: () => times(4, 0.11, (i) => [t(1800 + i * 160, undefined, 0.07, 0.002, 0.24)]),
    goat: () => times(3, 0.14, () => [n(600, 1500, 0.14, 0.03, 0.06, 5)]),
    mouse: () => times(6, 0.07, (i) => [t(900 + (i % 2) * 300, 1300, 0.05, 0.01, 0.06)]),
  },
  mud: {
    pig: (v) => times(3, 0.13, () => [n(340 * v, 220, 0.2, 0.01, 0.08, 4)]),
    elephant: () => [n(220, 700, 0.24, 0.22, 0.12, 4), t(90, 60, 0.2, 0.02, 0.2, 'sine', 0.3)],
    cat: (v) => [t(760 * v, 420, 0.12, 0.02, 0.4, 'triangle')],
    giraffe: (v) => times(5, 0.08, (i) => [t((190 + (i % 2) * 24) * v, 180, 0.13, 0.01, 0.07, 'triangle')]),
    goat: () => times(4, 0.12, () => [n(900, 400, 0.16, 0.006, 0.05, 3)]),
    mouse: () => [t(1500, 500, 0.1, 0.004, 0.1), t(700, 1600, 0.07, 0.01, 0.08, 'sine', 0.14)],
  },
  dance: {
    pig: () => times(2, 0.25, () => [t(130, 70, 0.26, 0.004, 0.14)]),
    elephant: () => [t(70, 42, 0.32, 0.004, 0.3), n(120, 80, 0.2, 0.004, 0.16, 1)],
    cat: () => times(4, 0.125, () => [n(3600, 3000, 0.12, 0.001, 0.025, 6)]),
    giraffe: (v) => [t(294 * v, 440, 0.1, 0.1, 0.2, 'sawtooth'), t(440 * v, 294, 0.09, 0.05, 0.24, 'sawtooth', 0.3)],
    goat: () => times(3, 0.17, () => [t(520, 900, 0.09, 0.004, 0.03, 'square'), t(400, 360, 0.08, 0.004, 0.05, 'square', 0.04)]),
    mouse: () => times(8, 0.05, (i) => [n(2600 + (i % 2) * 500, 2000, 0.08, 0.002, 0.025, 4)]),
  },
  fly: {
    pig: () => times(4, 0.12, (i) => [t(1100 - i * 190, 1000 - i * 190, 0.09, 0.02, 0.1, 'sawtooth')]),
    elephant: () => [t(300, 250, 0.1, 0.08, 0.16, 'sawtooth'), t(330, 240, 0.1, 0.06, 0.3, 'sawtooth', 0.24)],
    cat: (v) => [t(420 * v, 1250, 0.12, 0.2, 0.4, 'triangle')],
    giraffe: () => [t(523, undefined, 0.11, 0.06, 0.18), t(659, undefined, 0.1, 0.05, 0.2, 'sine', 0.2), t(784, undefined, 0.09, 0.05, 0.3, 'sine', 0.4)],
    goat: () => times(3, 0.16, (i) => [t(330 + i * 60, 326 + i * 60, 0.14, 0.002, 0.2, 'triangle')]),
    mouse: () => times(5, 0.06, (i) => [t(1500 + i * 220, undefined, 0.07, 0.008, 0.07)]),
  },
  sleep: {
    pig: () => [n(300, 260, 0.13, 0.25, 0.1, 5), t(1400, 900, 0.05, 0.05, 0.34, 'sine', 0.36)],
    elephant: () => [n(110, 80, 0.3, 0.4, 0.4, 4), t(64, 50, 0.16, 0.3, 0.5, 'sawtooth')],
    cat: () => times(7, 0.07, () => [n(420, 380, 0.07, 0.02, 0.04, 6)]),
    giraffe: () => [t(880, 700, 0.06, 0.2, 0.3), t(700, 900, 0.05, 0.1, 0.2, 'sine', 0.5)],
    goat: () => [n(700, 560, 0.1, 0.12, 0.34, 8)],
    mouse: () => [n(3800, 3400, 0.08, 0.001, 0.02, 8), t(1900, 2600, 0.05, 0.1, 0.16, 'sine', 0.16)],
  },
}
const OPEN: Record<Thing, Note[]> = {
  bath: [n(600, 2600, 0.24, 0.2, 0.7, 0.7), ...times(6, 0.11, (i) => [t(700 + i * 90, 1200, 0.05, 0.01, 0.08)])],
  mud: [n(260, 90, 0.34, 0.02, 0.5, 1), t(120, 50, 0.24, 0.01, 0.4), ...times(5, 0.09, () => [n(500, 260, 0.12, 0.01, 0.06, 3)])],
  dance: times(8, 0.25, (i) => [t(i % 4 ? 160 : 100, 60, 0.26, 0.004, 0.16), ...(i % 2 ? [n(2600, 2000, 0.08, 0.002, 0.06, 2)] : [])]),
  fly: [t(220, 880, 0.12, 0.3, 0.8, 'triangle'), n(900, 2200, 0.08, 0.3, 0.6, 1)],
  sleep: [t(523, 520, 0.1, 0.02, 0.5), t(392, 390, 0.1, 0.02, 0.6, 'sine', 0.45), t(330, 328, 0.1, 0.02, 0.9, 'sine', 0.9)],
}
const TWIST: Record<string, Note[]> = {
  'bath+mud': times(10, 0.06, (i) => [n(2400 + (i % 3) * 500, 3000, 0.05, 0.004, 0.04, 6)]),
  'bath+dance': [n(1200, 400, 0.14, 0.1, 0.5, 5), n(500, 1300, 0.12, 0.1, 0.4, 5, 0.7)],
  'bath+fly': times(3, 0.3, (i) => [t(300 + i * 120, 620 + i * 120, 0.09, 0.1, 0.14)]),
  'bath+sleep': times(4, 0.3, (i) => [t(180 + i * 20, 420, 0.1, 0.2, 0.04)]),
  'mud+dance': times(4, 0.25, () => [n(420, 180, 0.22, 0.01, 0.1, 2)]),
  'mud+fly': times(7, 0.12, (i) => [t(1500 - i * 110, 800, 0.06, 0.003, 0.07)]),
  'mud+sleep': [n(240, 130, 0.24, 0.3, 0.5, 2)],
  'dance+fly': [t(880, 220, 0.1, 0.1, 0.5, 'triangle'), t(220, 880, 0.1, 0.1, 0.5, 'triangle', 0.6)],
  'dance+sleep': times(5, 0.3, () => [n(300, 200, 0.12, 0.03, 0.1, 2)]),
  'fly+sleep': [t(180, 360, 0.1, 0.5, 0.3), t(360, 180, 0.1, 0.3, 0.5, 'sine', 0.9)],
}
const EAT: Record<Snack, Note[]> = {
  carrot: times(3, 0.14, () => [n(2400, 1500, 0.16, 0.002, 0.05, 2)]),
  cheese: times(4, 0.11, () => [n(900, 700, 0.1, 0.02, 0.06, 4)]),
  bun: times(3, 0.2, () => [n(420, 300, 0.14, 0.03, 0.1, 2)]),
}
const HOME: Record<Snack, Note[]> = {
  carrot: times(4, 0.13, (i) => [t(420 - i * 20, 380, 0.11, 0.002, 0.06, 'triangle')]),
  cheese: times(4, 0.15, (i) => [t(180 + i * 10, 320, 0.11, 0.01, 0.12)]),
  bun: times(4, 0.13, () => [n(300, 220, 0.12, 0.01, 0.07, 1.5)]),
}
const BELL: Note[] = [t(660, 657, 0.2, 0.003, 1.6), t(1320, 1314, 0.1, 0.003, 1.1), t(1780, 1770, 0.06, 0.003, 0.7), n(3000, 2600, 0.06, 0.002, 0.04, 2)]

const HIDE: Record<Animal, (v: number) => Note[]> = {
  pig: (v) => softer(lower('pig', v, 0.7), 0.6),
  elephant: (v) => lower('elephant', v, 0.6),
  cat: () => times(6, 0.06, () => [n(380, 350, 0.06, 0.02, 0.03, 6)]),
  giraffe: (v) => lower('giraffe', v, 1.5),
  goat: () => times(3, 0.1, () => [n(1500, 800, 0.14, 0.003, 0.05, 2)]),
  mouse: (v) => [...softer(CALL.mouse(v), 0.6), ...softer(later(CALL.mouse(v), 0.26), 0.3)],
}

/** A snack on its way back to its sill. */
export const voiceOfHome = (snack: Snack): Note[] => HOME[snack]

export function voiceOfEvent(e: Event, turn: number): Note[] {
  const v = vary(turn)
  switch (e.type) {
    case 'up': return [n(500, 1100, 0.07, 0.05, 0.14, 1)]
    case 'down': return [t(420 * v, 180, 0.12, 0.02, 0.24, 'triangle')]
    case 'bounce': return CRY[e.who](v)
    case 'hide': return [n(900, 500, 0.12, 0.01, 0.1, 3, 0.4), ...later(HIDE[e.who](v), 0.45)]
    case 'out': return [n(700, 1200, 0.12, 0.02, 0.1, 2), ...later(CALL[e.who](v), 0.1)]
    case 'fall': return []
    case 'bait': return [t(300 * v, 260, 0.12, 0.004, 0.1, 'triangle', 0.3), ...later(EAT[e.snack], 0.75)]
    case 'home': return HOME[e.snack]
    case 'eat': return [...EAT[e.snack], ...later(softer(CALL[e.who](v * 1.1), 0.6), 0.6)]
    case 'spit': return [n(1600, 500, 0.2, 0.02, 0.1, 1, 0.3), ...CRY[e.who](v), ...later(HOME[e.snack], 0.5)]
    case 'turn': return [n(1400, 2200, 0.1, 0.02, 0.08, 2), t(340, 300, 0.12, 0.003, 0.12, 'triangle', 0.2)]
    case 'return': return times(4, 0.07, (i) => [t(260 + i * 50, 400 + i * 50, 0.06, 0.02, 0.1, 'triangle')])
    case 'sweep': return e.was.flatMap((_, i) => [n(1500 - i * 110, 700, 0.12, 0.003, 0.09, 1.5, 0.16 + i * 0.07), t(700 - i * 60, 420, 0.07, 0.003, 0.08, 'triangle', 0.18 + i * 0.07)])
    case 'arrive': return later(CALL[e.who](v), 0.9)
    default: return e satisfies never
  }
}

/** The square's landing: the row's pitch, and the weight of who landed. */
export const voiceOfClack = (who: Animal, row: number, fell: boolean): Note[] => fell ? [t(110, 70, 0.16, 0.003, 0.12), ...softer(clack(row), 0.4)] : [...clack(row), ...SQUEEZE[who]]

export function voiceOfCue(c: Cue, won: readonly Thing[], pairs: readonly string[], turn: number): Note[] {
  switch (c.type) {
    case 'ring': return BELL
    case 'rush': return times(6, 0.09, (i) => [n(600 + i * 60, 400, 0.09, 0.005, 0.05, 2)])
    case 'row': return c.cols.flatMap((col, i) => [t(ROWS_HZ[Math.min(5, c.row)] * [1, 1.25, 1.5][col], undefined, 0.17, 0.004, 0.36, 'triangle', i * 0.012), n(2000, 1200, 0.05, 0.002, 0.04, 1.5)])
    case 'tall': return c.cols.flatMap((col) => [t(262 * [1, 1.25, 1.5][col], 524 * [1, 1.25, 1.5][col], 0.11, 0.2, 0.36, 'triangle')])
    case 'result': return [...softer(won.flatMap((x) => OPEN[x]), won.length > 1 ? 0.7 : 1), ...later(softer(pairs.flatMap((p) => TWIST[p] ?? []), won.length > 2 ? 0.6 : 0.9), 1)]
    case 'turnOf': {
      const thing = won[(c.n + c.round) % Math.max(1, won.length)]
      return thing ? softer(hates(c.who, thing) && c.round > 0 ? CRY[c.who](vary(turn)) : ACT[thing][c.who](vary(turn)), 0.85) : []
    }
    case 'met': return times(8, 0.09, (i) => [n(260, 160, 0.15, 0.003, 0.05, 1.5), ...(i % 2 ? [] : [t(150, 110, 0.12, 0.003, 0.06)])])
    case 'mole': return c.snack === 'carrot' ? later([t(1500, 1300, 0.08, 0.005, 0.05, 'square')], 0.5) : c.snack === 'cheese' ? [t(196, 220, 0.12, 0.1, 0.5)] : [t(700, 300, 0.08, 0.06, 0.4, 'sawtooth')]
    case 'back': return c.held.kind === 'animal' ? [t(300, 420, 0.08, 0.02, 0.14, 'triangle')] : HOME[c.held.snack]
    case 'end': return []
    default: return c satisfies never
  }
}

/** A finger landing is heard at once, whatever it goes on to do. */
export function voiceOfPoke(p: Poke, turn: number): Note[] {
  const v = vary(turn)
  switch (p.target.kind) {
    case 'animal': return CALL[p.target.who](v)
    case 'snack': return softer(EAT[p.target.snack].slice(0, 1), 0.7)
    case 'plaque': return [t(520 * v, 500, 0.1, 0.003, 0.1, 'triangle')]
    case 'bell': return [t(1320 * v, 1310, 0.04, 0.003, 0.3)]
    case 'mole': return [t(240 * v, 300, 0.1, 0.03, 0.08), t(300 * v, 250, 0.1, 0.02, 0.1, 'sine', 0.1)]
    case 'basket': return [n(800 * v, 500, 0.12, 0.01, 0.1, 3), n(900 * v, 600, 0.09, 0.01, 0.08, 3, 0.1)]
    case 'column': return [n(1800 * v, 1300, 0.09, 0.003, 0.05, 1.5)]
    case 'square': return [t(380 * v, 340, 0.08, 0.003, 0.08, 'triangle'), n(1200, 800, 0.06, 0.003, 0.06, 1.5)]
    default: return p.target satisfies never
  }
}
