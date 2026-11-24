import type { Note } from './audio'
import type { Bump } from './bed'
import type { Event } from './game'
import type { Poke } from './play'

// Every sound as numbers. Each sheep has a pitch of its own in one scale of
// five, and a way of its own to say it.

const t = (frequency: number, glideTo: number | undefined, peak: number, attack: number, decay: number, wave: Note['wave'] = 'sine', delay = 0): Note => ({ kind: 'tone', frequency, glideTo, peak, attack, decay, wave, delay })
const n = (frequency: number, glideTo: number | undefined, peak: number, attack: number, decay: number, q = 1, delay = 0): Note => ({ kind: 'noise', frequency, glideTo, peak, attack, decay, q, delay })

/** G, D, G, E, B: one scale, Tup lowest and Pip highest. */
const PITCH = [196, 294, 392, 330, 247] as const
const bleats: ((f: number, v: number) => Note[])[] = [
  (f, v) => [t(f * v, f * 0.86 * v, 0.2, 0.05, 0.4, 'sawtooth'), t(f * 2 * v, f * 1.7 * v, 0.05, 0.05, 0.3, 'triangle')],
  (f, v) => [0, 1].map((i) => t(f * v * 1.1, f * 1.16 * v, 0.1, 0.01, 0.09, 'square', i * 0.11)),
  (f, v) => [t(f * 2 * v, f * 2.6 * v, 0.15, 0.01, 0.1, 'triangle')],
  (f, v) => [t(f * v, f * 1.25 * v, 0.15, 0.1, 0.22, 'triangle'), t(f * 1.25 * v, f * v, 0.12, 0.06, 0.3, 'triangle', 0.24)],
  (f, v) => [0, 1, 2, 3].map((i) => t(f * 1.2 * v * (1 + (i % 2) * 0.12), f * 1.1 * v, 0.13, 0.008, 0.06, 'sawtooth', i * 0.075)),
]
const muffled = (notes: Note[]): Note[] => notes.map((x) => ({ ...x, frequency: x.frequency * 0.7, glideTo: x.glideTo && x.glideTo * 0.6, peak: x.peak * 0.4, wave: x.kind === 'tone' ? 'sine' : x.wave }))
const vary = (turn: number): number => 1 + ((turn % 5) - 2) * 0.025
export const bleat = (who: number, turn: number, hid: boolean): Note[] => {
  const notes = bleats[who](PITCH[who], vary(turn))
  return hid ? muffled(notes) : notes
}

const CUES: Record<string, (f: number) => Note[]> = {
  snore: (f) => [n(180, 320, 0.2, 0.35, 0.12, 4), n(700, 300, 0.07, 0.05, 0.35, 2, 0.5), t(f * 0.4, f * 0.32, 0.12, 0.3, 0.2, 'sawtooth')],
  pop: () => [t(900, 1600, 0.2, 0.002, 0.05), n(2000, 800, 0.14, 0.002, 0.05)],
  bonk: () => [n(500, 180, 0.3, 0.01, 0.2, 0.8), n(2400, 900, 0.08, 0.02, 0.5, 0.6, 0.06)],
  giggle: (f) => [0, 1, 2].map((i) => t(f * (1.5 - i * 0.12), f * (1.7 - i * 0.12), 0.1, 0.01, 0.06, 'triangle', i * 0.09)),
  hic: (f) => [t(f * 1.6, f * 3, 0.16, 0.006, 0.07, 'triangle')],
  cork: () => [t(220, 1200, 0.24, 0.004, 0.09), n(1600, 400, 0.16, 0.002, 0.07), t(700, 1900, 0.06, 0.2, 0.5, 'sine', 0.1)],
  whirl: (f) => [t(f, f * 2, 0.08, 0.3, 0.3, 'triangle'), n(500, 1400, 0.06, 0.3, 0.3, 1.4)],
  hum: (f) => [t(f, f, 0.1, 0.06, 0.24, 'triangle'), t(f * 1.25, f * 1.25, 0.09, 0.06, 0.3, 'triangle', 0.32)],
  shriek: (f) => [t(f * 2, f * 3.4, 0.12, 0.02, 0.16, 'sawtooth'), t(f * 3.4, f * 2.4, 0.1, 0.02, 0.3, 'sawtooth', 0.16)],
  boing: (f) => [t(f * 0.8, f * 1.8, 0.16, 0.01, 0.16), t(f * 1.8, f, 0.08, 0.01, 0.2, 'sine', 0.14)],
  squeal: (f) => [t(f * 1.6, f * 2.8, 0.1, 0.2, 0.4, 'triangle')],
  thud: () => [t(110, 60, 0.26, 0.004, 0.16), n(300, 140, 0.16, 0.004, 0.12)],
}

function bump(b: Bump): Note[] {
  const k = Math.min(1, b.speed / 900)
  if (b.what === 'ridge') return [t(150, 330 + k * 120, 0.08 + k * 0.08, 0.01, 0.18)]
  if (b.what === 'land') return [t(120, 62, 0.22, 0.004, 0.16), n(340, 160, 0.14, 0.004, 0.14)]
  if (b.what === 'wall') return b.wall === 'top' ? [n(900, 500, 0.06 + k * 0.1, 0.004, 0.1, 2), ...[0, 1].map((i) => t(1500 + i * 220, undefined, 0.03 + k * 0.03, 0.003, 0.14, 'sine', i * 0.05)), ...(k > 0.3 ? [t(2400, 2900, 0.03, 0.01, 0.06, 'triangle', 0.12)] : [])] : [n(260, 140, 0.08 + k * 0.14, 0.004, 0.12)]
  // Two hard toys: a knock, pitched by how fast, and a squeak from the one that was hit.
  return [t(300 + k * 420, 220 + k * 260, 0.08 + k * 0.14, 0.002, 0.07, 'triangle'), ...(k > 0.25 ? [t(PITCH[b.with] * 2.4, PITCH[b.with] * 3, 0.05, 0.01, 0.07, 'triangle', 0.04)] : [])]
}

export function voiceOfEvent(e: Event, turn: number): Note[] {
  switch (e.type) {
    case 'bump': {
      const x = bump(e.bump)
      return e.hidden ? muffled(x) : x
    }
    case 'call': return bleat(e.who, turn, e.hidden)
    case 'squash': return bleat(e.who, turn, e.hidden)
    case 'leap': { const x = [t(PITCH[e.who] * 0.9, PITCH[e.who] * 2.2, 0.11, 0.02, 0.26), n(400, 1200, 0.06, 0.1, 0.3, 1)]; return e.hidden ? muffled(x) : x }
    case 'bottleOut': return [t(1047 + e.index * 4, 1040, 0.12, 0.002, 0.3), t(1960, 1950, 0.05, 0.002, 0.2), n(300, 200, 0.08, 0.002, 0.05)]
    case 'bottlesHome': return [0, 1, 2, 3, 4].map((i) => t(1200 - i * 60, 1190 - i * 60, 0.06, 0.002, 0.14, 'sine', 0.05 + i * 0.09))
    case 'straws': return [...Array.from({ length: e.joined }, (_, i) => t(700, 1100, 0.07, 0.002, 0.05, 'sine', i * 0.09)), ...(e.loose ? [t(520, 300, 0.08, 0.01, 0.2, 'triangle', e.joined * 0.09 + 0.06)] : [])]
    case 'misfit': return [0, 1, 2, 3].map((i) => t(240 + i * 40, 340 + i * 60, 0.06, 0.01, 0.07, 'sine', 0.55 + i * 0.12))
    case 'drink': return [0, 1, 2, 3, 4, 5].map((i) => n(500 + i * 60, 800 + i * 70, 0.11, 0.08, 0.14, 3, 0.3 + i * 0.28))
    case 'burp': { const x = [t(PITCH[e.who] * 0.5, PITCH[e.who] * 0.38, 0.22, 0.02, 0.17, 'sawtooth'), t(PITCH[e.who], PITCH[e.who] * 0.8, 0.1, 0.01, 0.14, 'triangle')]; return e.hidden ? muffled(x) : x }
    case 'cue': { const x = CUES[e.what](PITCH[e.who]); return e.hidden ? muffled(x) : x }
    case 'bleat': return bleat(e.who, turn, e.hidden)
    case 'quilt': return [...(e.first ? [n(500, 200, 0.16, 0.02, 0.18, 0.7)] : []), ...(e.up ? [n(300, 900, 0.18, 0.16, 0.2, 0.8, e.first ? 0.2 : 0), t(110, 70, 0.18, 0.01, 0.2, 'sine', e.first ? 0.5 : 0.3)] : [n(500, 2200, 0.2, 0.06, 0.24, 1)])]
    case 'caught': return [t(PITCH[e.who] * 2, PITCH[e.who] * 3, 0.12, 0.005, 0.1, 'triangle', 0.15)]
    case 'worn': return [t(1568, 1560, 0.12, 0.002, 0.4), t(2093, 2080, 0.07, 0.002, 0.3, 'sine', 0.1)]
    case 'dogIn': return [t(180, 260, 0.14, 0.04, 0.14, 'sawtooth'), t(90, 60, 0.26, 0.01, 0.24, 'sine', 0.85), n(400, 200, 0.12, 0.2, 0.5, 0.8, 1.2)]
    case 'dogOut': return [t(320, 520, 0.13, 0.01, 0.1, 'sawtooth'), n(500, 1100, 0.08, 0.04, 0.2)]
    case 'asleep': return [0, 1, 2].map((i) => t([392, 330, 262][i], undefined, 0.06, 0.08, 0.5, 'sine', i * 0.3))
    default: return e satisfies never
  }
}

/** A finger landing on something: heard at once. A sheep's own answer is its bleat. */
export function voiceOfPoke(p: Poke, turn: number): Note[] {
  const v = vary(turn), k = p.thing.kind
  if (p.slide) switch (k) {
    case 'sheep': case 'hidden': { const r = Math.min(1, (p.speed ?? 300) / 900); return [n((110 + 130 * r) * v, 120, 0.05 + 0.1 * r, 0.03, 0.14, 1.4)] }
    case 'straw': return [t(500 * v, 900, 0.04, 0.04, 0.1)]
    case 'ridge': return [t(74 * v, 70, 0.14, 0.01, 0.2, 'triangle')]
    case 'bottle': return [t(1900 * v, 2300, 0.03, 0.03, 0.08)]
    case 'dog': case 'crate': return [n(700 * v, 500, 0.05, 0.02, 0.1, 9)]
    case 'mouse': return [0, 1, 2].map((i) => n(2600, 2200, 0.04, 0.003, 0.03, 4, i * 0.05))
    default: return [n(900 * v, 700, 0.05, 0.03, 0.14, 0.8)]
  }
  switch (k) {
    case 'sheep': return p.second ? bleat(p.thing.who, turn, false).map((x) => ({ ...x, peak: x.peak * 0.5 })) : []
    case 'hidden': return p.near === null ? [n(340 * v, 200, 0.14, 0.006, 0.12, 0.8)] : [n(340 * v, 200, 0.06, 0.006, 0.1, 0.8)]
    case 'hem': return [n(700 * v, 1000, 0.08, 0.02, 0.1)]
    case 'roll': return [n(380 * v, 260, 0.12, 0.01, 0.12, 0.8)]
    case 'bottle': return [t([1047, 1175, 1319, 1568, 1760][p.thing.index % 5], undefined, 0.13, 0.002, 0.4), t(2600, 2580, 0.03, 0.002, 0.2)]
    case 'straw': return [t(640 * v, 1300, 0.09, 0.004, 0.07), n(1400, 900, 0.03, 0.01, 0.1, 5)]
    case 'dog': return [t(300 * v, 560, 0.14, 0.01, 0.09, 'sawtooth'), n(700, 900, 0.04, 0.01, 0.06, 3)]
    case 'crate': return [...[0, 1, 2].map((i) => t(1300 + i * 170, undefined, 0.06, 0.002, 0.12, 'sine', i * 0.05)), n(220, 140, 0.16, 0.003, 0.08)]
    case 'mouse': return [t(1500, 2600, 0.09, 0.004, 0.05), t(2200 * v, 2700, 0.06, 0.01, 0.07, 'triangle', 0.5)]
    case 'ridge': return [t(98 * v, 93, 0.24, 0.004, 0.5, 'triangle'), t(196 * v, 188, 0.08, 0.004, 0.3)]
    case 'mattress': return [t(240 * v, 330, 0.07, 0.03, 0.1, 'triangle'), t(300 * v, 220, 0.06, 0.02, 0.12, 'triangle', 0.1), n(260, 180, 0.1, 0.004, 0.1)]
    case 'rug': return [n(480 * v, 300, 0.12, 0.01, 0.14, 0.7)]
    default: return p.thing satisfies never
  }
}

export const DRIP: Note[] = [t(900, 1500, 0.05, 0.002, 0.06)]
export const SNEEZE: Note[] = [n(1800, 3400, 0.05, 0.14, 0.05, 1), n(3000, 1200, 0.1, 0.01, 0.1, 1, 0.22)]
export const BARK: Note[] = [t(260, 480, 0.14, 0.01, 0.1, 'sawtooth')]
