import type { Note } from './audio'
import type { PlaceId, Spot, Who } from './layout'
import { headOf } from './layout'
import { disliked } from './motion'
import type { Draped, Event } from './model'
import type { Poke, Refusal } from './play'

// Every sound as numbers. Each one has an instrument: the dog a rough sliding
// saw, the cat a thin bent triangle, the aunt a warbling square, the
// grandfather a low creak. `turn` picks a variant, so a sound is not the same
// twice in a row.

const t = (frequency: number, glideTo: number | undefined, peak: number, attack: number, decay: number, wave: Note['wave'] = 'sine', delay = 0): Note => ({ kind: 'tone', frequency, glideTo, peak, attack, decay, wave, delay })
const n = (frequency: number, glideTo: number | undefined, peak: number, attack: number, decay: number, q = 1, delay = 0): Note => ({ kind: 'noise', frequency, glideTo, peak, attack, decay, q, delay })
const later = (notes: Note[], delay: number): Note[] => notes.map((x) => ({ ...x, delay: (x.delay ?? 0) + delay }))

const vary = (turn: number, k = 0.08) => 1 + ((turn % 3) - 1) * k

const flump = (turn: number): Note[] => [n(420 * vary(turn), 160, 0.22, 0.03, 0.28, 0.7), t(120 * vary(turn), 70, 0.16, 0.02, 0.2)]
const whoosh = (turn: number): Note[] => [n(500, 2600 * vary(turn), 0.2, 0.06, 0.2, 1.2)]

const grunt: Record<Who, (v: number) => Note[]> = {
  dog: (v) => [t(210 * v, 150, 0.1, 0.02, 0.14, 'sawtooth', 0.12)],
  cat: (v) => [t(520 * v, 640, 0.07, 0.04, 0.16, 'triangle', 0.14)],
  aunt: (v) => [t(330 * v, 300, 0.06, 0.02, 0.1, 'square', 0.12), t(390 * v, 350, 0.05, 0.02, 0.12, 'square', 0.24)],
  grandpa: (v) => [t(120 * v, 90, 0.14, 0.05, 0.26, 'triangle', 0.14), n(260, 200, 0.06, 0.04, 0.2, 5, 0.16)],
}
const yelp: Record<Who, (v: number) => Note[]> = {
  dog: (v) => [t(380 * v, 760, 0.16, 0.01, 0.1, 'sawtooth', 0.06), t(420 * v, 820, 0.14, 0.01, 0.1, 'sawtooth', 0.22)],
  cat: (v) => [t(700 * v, 1150, 0.12, 0.05, 0.14, 'triangle', 0.06), t(1150 * v, 620, 0.1, 0.02, 0.22, 'triangle', 0.2)],
  aunt: (v) => [t(620 * v, 980, 0.09, 0.03, 0.12, 'square', 0.06), t(980 * v, 900, 0.08, 0.02, 0.3, 'square', 0.18)],
  grandpa: (v) => [t(190 * v, 330, 0.16, 0.03, 0.16, 'triangle', 0.06), t(300 * v, 160, 0.13, 0.02, 0.26, 'triangle', 0.24)],
}
const outrage: Record<Who, (v: number) => Note[]> = {
  dog: (v) => [t(300 * v, 560, 0.15, 0.2, 0.25, 'sawtooth'), t(560 * v, 260, 0.14, 0.05, 0.8, 'sawtooth', 0.42)],
  cat: (v) => [t(760 * v, 700, 0.09, 0.05, 0.12, 'triangle'), n(1600, 1200, 0.05, 0.02, 0.08, 3, 0.4), n(1600, 1200, 0.05, 0.02, 0.08, 3, 0.62), n(1600, 1200, 0.05, 0.02, 0.08, 3, 0.84)],
  aunt: (v) => [n(1400, 2600, 0.12, 0.2, 0.08, 1.5), ...[0, 1, 2, 3, 4, 5].map((i) => n(700, 500, 0.06, 0.02, 0.06, 1, 0.45 + i * (0.16 - i * 0.012))), t(520 * v, 430, 0.07, 0.04, 0.3, 'square', 0.36)],
  grandpa: (v) => [t(170 * v, 120, 0.14, 0.08, 0.5, 'triangle'), n(300, 1500, 0.2, 0.1, 0.4, 0.8, 0.7), t(90 * v, 80, 0.08, 0.02, 0.4, 'sawtooth', 0.7)],
}
const munch: Record<Who, () => Note[]> = {
  dog: () => [n(500, 250, 0.2, 0.01, 0.1, 2), n(420, 220, 0.2, 0.01, 0.1, 2, 0.16), t(240, 60, 0.22, 0.02, 0.24, 'sine', 0.38), t(300, 420, 0.08, 0.04, 0.14, 'sawtooth', 1.1)],
  cat: () => [0, 1, 2, 3].map((i) => n(2100 + i * 120, 1400, 0.06, 0.01, 0.07, 4, 0.3 + i * 0.5)),
  aunt: () => [...[0, 1, 2, 3, 4].map((i) => n(1200, 800, 0.09, 0.01, 0.06, 3, 0.3 + i * 0.38)), t(110, 70, 0.18, 0.03, 0.4, 'sawtooth', 2.65)],
  grandpa: () => [t(392, 440, 0.07, 0.05, 0.2, 'triangle', 0.2), t(440, 392, 0.07, 0.05, 0.24, 'triangle', 0.5), ...[0, 1].map((i) => n(340, 220, 0.16, 0.04, 0.2, 2, 1.6 + i * 0.8))],
}
const start: Record<Who, () => Note[]> = {
  dog: () => [0, 1, 2, 3, 4].map((i) => n(900, 500, 0.08, 0.01, 0.05, 2, i * 0.07)),
  cat: () => [0, 1, 2, 3].map((i) => t(900 + i * 90, 860 + i * 90, 0.04, 0.005, 0.06, 'triangle', i * 0.13)),
  aunt: () => [0, 1, 2].map((i) => t(130 + i * 20, 260 + i * 20, 0.14, 0.03, 0.18, 'sine', i * 0.36)),
  grandpa: () => [0, 1, 2].map((i) => n(1900 - i * 200, 2500, 0.05, 0.08, 0.1, 14, i * 0.3)),
}

const plop: Record<PlaceId, (v: number) => Note[]> = {
  dish: (v) => [t(1250 * v, 1240, 0.12, 0.003, 0.6), t(1890 * v, 1880, 0.06, 0.003, 0.4)],
  teapot: (v) => [t(380 * v, 900, 0.16, 0.01, 0.12), t(1650 * v, 1640, 0.07, 0.003, 0.2, 'sine', 0.14)],
  boot: (v) => [n(300 * v, 200, 0.24, 0.01, 0.12, 1.5), t(420 * v, 560, 0.08, 0.03, 0.14, 'sawtooth', 0.12)],
  pot: (v) => [0, 1, 2, 3, 4].map((i) => n(2400 * v - i * 260, 1800, 0.09, 0.005, 0.05, 2, i * 0.05)),
  gramophone: (v) => [t(230 * v, 240, 0.16, 0.02, 0.28, 'sawtooth'), n(1400, 1300, 0.04, 0.02, 0.4, 6)],
}
const smothered: Record<Draped, () => Note[]> = {
  dish: () => [...flump(0), t(620, 600, 0.06, 0.01, 0.2)],
  teapot: () => [...flump(1), t(800, 780, 0.05, 0.01, 0.12, 'sine', 0.1)],
  boot: () => [...flump(2), t(90, 60, 0.2, 0.01, 0.16, 'sine', 0.06)],
  pot: () => [...flump(0), n(1500, 900, 0.07, 0.02, 0.2, 1, 0.08)],
  gramophone: () => [...flump(1), ...[0, 1, 2].map((i) => t([262, 330, 392][i], undefined, 0.04, 0.03, 0.16, 'triangle', 0.1 + i * 0.16))],
  fish: () => [...flump(2), t(300, 130, 0.14, 0.02, 0.2, 'sine', 0.12)],
}
const rummage = (spot: Spot): Note[] => {
  if (headOf(spot)) return [n(300, 140, 0.24, 0.01, 0.2, 0.7), t(140, 70, 0.2, 0.01, 0.2)]
  switch (spot) {
    case 'dish': return [0, 1, 2].map((i) => t(2100 - i * 130, 1800, 0.05, 0.02, 0.16, 'triangle', 0.1 + i * 0.25))
    case 'teapot': return [t(260, 190, 0.16, 0.06, 0.5), t(1500, 1490, 0.08, 0.004, 0.3), t(1320, 1310, 0.07, 0.004, 0.3, 'sine', 0.4)]
    case 'boot': return [0, 1, 2].map((i) => n(260, 160, 0.2, 0.01, 0.1, 2, 0.1 + i * 0.28))
    case 'pot': return [0, 1, 2, 3, 4, 5].map((i) => n(1900 - i * 120, 900, 0.09, 0.01, 0.1, 1.5, i * 0.14))
    case 'gramophone': return [t(180, 150, 0.2, 0.03, 0.4, 'sawtooth'), t(140, 120, 0.16, 0.03, 0.4, 'sawtooth', 0.5)]
    default: return [0, 1, 2].map((i) => t(170, 460, 0.16, 0.02, 0.2, 'sine', i * 0.4))
  }
}

/** What a place adds when somebody comes out of it with nothing: a sneeze, a stamp, a honk. */
const AFTER: Partial<Record<PlaceId, Note[]>> = {
  pot: [n(1200, 2600, 0.08, 0.16, 0.05, 1.2, 0.1), n(2400, 700, 0.2, 0.01, 0.16, 0.8, 0.3)],
  boot: [t(110, 60, 0.22, 0.005, 0.12, 'sine', 0.05)],
  gramophone: [t(220, 215, 0.16, 0.02, 0.2, 'sawtooth')],
}

export function voiceOfEvent(e: Event, turn: number): Note[] {
  const v = vary(turn)
  switch (e.type) {
    case 'cover': return [...flump(turn), ...grunt[e.who](v), ...(e.askew ? [n(700, 300, 0.12, 0.02, 0.1, 1, 0.34), n(640, 280, 0.1, 0.02, 0.1, 1, 0.5)] : [])]
    case 'uncover': return [...whoosh(turn), ...yelp[e.who](v)]
    case 'run': return start[e.who]()
    case 'hunt': return rummage(e.spot)
    case 'empty': return [...(AFTER[e.spot as PlaceId] ?? []), ...(disliked(e.who, e.spot) ? [...outrage[e.who](v * 0.8), n(900, 500, 0.06, 0.02, 0.3, 2, 0.3)] : outrage[e.who](v))]
    case 'miss': return [t(420, 120, 0.16, 0.01, 0.4, 'triangle'), ...later(outrage[e.who](v), 0.3)]
    case 'found': case 'gift': return munch[e.who]()
    case 'bowled': return [n(240, 120, 0.26, 0.01, 0.24, 0.8), ...grunt[e.who](v * 1.3)]
    case 'lost': return [t(500 * v, 520, 0.06, 0.04, 0.16, 'triangle', 0.5), t(400 * v, 330, 0.06, 0.04, 0.3, 'triangle', 0.8)]
    case 'ghost': return [t(300, 480, 0.08, 0.2, 0.4, 'sine'), t(480, 280, 0.08, 0.1, 0.5, 'sine', 0.5)]
    case 'squeak': return [t(950 * v, 1500, 0.1, 0.02, 0.1, 'triangle')]
    case 'put': {
      const who = headOf(e.spot)
      return who || e.spot === 'hook' ? [t(800 * v, 1300, 0.1, 0.02, 0.12, 'triangle', 0.16)] : later(plop[e.spot as PlaceId](v), 0.18)
    }
    case 'peek': return [t(900 * v, 1400, 0.11, 0.015, 0.08, 'triangle'), t(1300 * v, 1000, 0.08, 0.01, 0.1, 'triangle', 0.1)]
    case 'back': return [t(250, 620, 0.12, 0.02, 0.18, 'triangle'), t(620, 420, 0.08, 0.01, 0.12, 'triangle', 0.2)]
    case 'drape': return smothered[e.on]()
    case 'undrape': return whoosh(turn)
    case 'flap': return [n(700, 300, 0.14, 0.02, 0.1, 1), n(640, 280, 0.12, 0.02, 0.1, 1, 0.14)]
    case 'bell': return [t(1180, 1176, 0.2, 0.002, 1.2), t(1770, 1766, 0.1, 0.002, 0.9), t(2960, 2950, 0.05, 0.002, 0.5)]
    case 'down': return [t(330, 220, 0.16, 0.005, 0.3, 'triangle'), n(1600, 700, 0.05, 0.02, 0.14, 2)]
    case 'pick': return e.what === 'sausage' ? [t(700 * v, 980, 0.09, 0.01, 0.08, 'triangle')] : [n(600, 1300, 0.1, 0.03, 0.12, 1)]
    case 'wind': case 'gulp': case 'seated': case 'copy': return []
    default: return e satisfies never
  }
}

/** A finger landing on something: heard at once, whatever it goes on to do. A sitter's own answer is its cover or its yelp. */
export function voiceOfPoke(p: Poke, turn: number, hung: boolean): Note[] {
  const v = vary(turn)
  switch (p.thing.kind) {
    case 'sitter': return []
    case 'sausage': return [t(620 * v, 760, 0.07, 0.008, 0.06, 'triangle')]
    case 'place': {
      switch (p.thing.id) {
        case 'dish': return [t(1500 * v, 1490, 0.05, 0.003, 0.2)]
        case 'teapot': return [t(1700 * v, 1690, 0.05, 0.003, 0.12)]
        case 'boot': return [t(110 * v, 80, 0.14, 0.005, 0.1), t(110 * v, 80, 0.12, 0.005, 0.1, 'sine', 0.14)]
        case 'pot': return [n(2000 * v, 1500, 0.06, 0.005, 0.08, 2)]
        case 'gramophone': return [n(3000, 2600, 0.03, 0.01, 0.3, 3), ...[0, 1, 2, 3].map((i) => t([392, 494, 587, 494][(i + turn) % 4], undefined, 0.05, 0.02, 0.12, 'triangle', 0.05 + i * 0.13))]
        default: return p.thing.id satisfies never
      }
    }
    case 'hook': return hung ? [t(300 * v, 290, 0.08, 0.004, 0.16, 'triangle')] : [t(240 * v, 250, 0.12, 0.004, 0.3, 'triangle'), n(1200, 900, 0.03, 0.02, 0.2, 4)]
    case 'bell': return [t(2300 * v, 2290, 0.04, 0.002, 0.16)]
    case 'fish': return [t(420 * v, 820, 0.12, 0.02, 0.08), t(600 * v, 1200, 0.1, 0.01, 0.06, 'sine', 0.24)]
    case 'basket': return [n(800 * v, 500, 0.1, 0.01, 0.1, 3), n(900 * v, 600, 0.08, 0.01, 0.08, 3, 0.1)]
    case 'room': return [n(340 * v, 220, 0.1, 0.005, 0.09, 1)]
    default: return p.thing satisfies never
  }
}

/** Something let go where it cannot stay. */
export function voiceOfRefusal(r: Refusal): Note[] {
  if (r.thing.kind === 'bell') return r.what === 'sausage' ? [t(1900, 1890, 0.1, 0.002, 0.5)] : [t(300, 220, 0.16, 0.004, 0.16)]
  if (r.thing.kind === 'fish') return [t(200, 560, 0.16, 0.02, 0.14), n(900, 1600, 0.08, 0.02, 0.2, 1, 0.14)]
  if (r.thing.kind === 'hook') return [t(330, 300, 0.12, 0.004, 0.3, 'triangle')]
  return []
}

/** Somebody running past knocks them. */
export const SLOSH: Note[] = [n(700, 350, 0.1, 0.06, 0.2, 1.2), t(240, 420, 0.06, 0.03, 0.1, 'sine', 0.12)]
export const TINKLE: Note[] = [t(2500, 2490, 0.05, 0.002, 0.2), t(2700, 2690, 0.04, 0.002, 0.2, 'sine', 0.12)]
