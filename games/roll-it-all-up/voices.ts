import type { Note } from './audio'
import type { PlaceId, ThingId } from './layout'
import type { Act } from './world'

// Every sound as numbers. Each thing has its own instrument, and what it does
// in each ball is another phrase on it.

const t = (frequency: number, glideTo: number | undefined, peak: number, attack: number, decay: number, wave: Note['wave'] = 'sine', delay = 0): Note => ({ kind: 'tone', frequency, glideTo, peak, attack, decay, wave, delay })
const n = (frequency: number, glideTo: number | undefined, peak: number, attack: number, decay: number, q = 1, delay = 0): Note => ({ kind: 'noise', frequency, glideTo, peak, attack, decay, q, delay })
const vary = (turn: number): number => 1 + ((turn % 5) - 2) * 0.04

/** What a thing says when it is touched or picked up. */
export const CRY: Record<ThingId, (v: number) => Note[]> = {
  boot: (v) => [n(260 * v, 160, 0.25, 0.005, 0.12, 1.4), t(130 * v, 80, 0.18, 0.005, 0.12)],
  wheel: (v) => [t(420 * v, 900, 0.09, 0.03, 0.25, 'triangle'), n(1300, 2400, 0.05, 0.05, 0.25, 5)],
  cat: (v) => [t(620 * v, 1050, 0.13, 0.05, 0.12, 'triangle'), t(1050 * v, 540, 0.12, 0.02, 0.3, 'triangle', 0.16)],
  tuba: (v) => [t(98 * v, 92, 0.2, 0.02, 0.35, 'sawtooth'), t(196 * v, 184, 0.09, 0.02, 0.3, 'triangle')],
  rake: (v) => [t(880 * v, 860, 0.09, 0.003, 0.22, 'triangle'), t(1320 * v, 1300, 0.07, 0.003, 0.2, 'triangle', 0.03), t(1760 * v, 1700, 0.05, 0.003, 0.25, 'sine', 0.06)],
  umbrella: (v) => [n(400, 2200 * v, 0.2, 0.06, 0.1, 0.9), n(700, 300, 0.2, 0.005, 0.14, 0.8, 0.14)],
  goose: (v) => [t(300 * v, 260, 0.13, 0.015, 0.14, 'sawtooth'), t(340 * v, 280, 0.13, 0.015, 0.2, 'sawtooth', 0.2)],
  spring: (v) => [t(180 * v, 640, 0.16, 0.01, 0.16, 'triangle'), t(560 * v, 240, 0.1, 0.01, 0.26, 'triangle', 0.16)],
}

type Phrase = { every: number; notes: (v: number) => Note[] }
/** What it plays while he walks, and how many seconds apart. */
export const PHRASE: Record<ThingId, Record<PlaceId, Phrase>> = {
  boot: { base: { every: 0.5, notes: (v) => [n(180 * v, 110, 0.24, 0.005, 0.12, 1.2), t(95 * v, 60, 0.2, 0.005, 0.12)] }, belly: { every: 0.83, notes: (v) => [n(1500 * v, 700, 0.2, 0.003, 0.07, 1.1)] }, head: { every: 0.66, notes: (v) => [n(2300 * v, 1800, 0.15, 0.003, 0.05, 2), n(2100 * v, 1700, 0.12, 0.003, 0.05, 2, 0.12)] } },
  wheel: { base: { every: 0.32, notes: (v) => [n(140 * v, 190, 0.2, 0.08, 0.26, 2)] }, belly: { every: 0.4, notes: (v) => [n(900 * v, 1600, 0.1, 0.12, 0.22, 4), t(240 * v, 260, 0.04, 0.1, 0.2, 'triangle')] }, head: { every: 1, notes: (v) => [t(1250 * v, 1500, 0.06, 0.1, 0.3, 'triangle')] } },
  cat: { base: { every: 0.2, notes: (v) => [n(1100 * v, 800, 0.1, 0.004, 0.04, 3)] }, belly: { every: 0.62, notes: (v) => Array.from({ length: 6 }, (_, i) => t(88 * v, 80, 0.12, 0.01, 0.06, 'triangle', i * 0.09)) }, head: { every: 1.3, notes: CRY.cat } },
  tuba: { base: { every: 1, notes: (v) => [t(62 * v, 58, 0.28, 0.02, 0.4, 'sawtooth'), n(220, 120, 0.12, 0.02, 0.3)] }, belly: { every: 0.66, notes: (v) => [t(98 * v, 96, 0.17, 0.02, 0.18, 'sawtooth'), t(147 * v, 145, 0.1, 0.02, 0.14, 'sawtooth', 0.3)] }, head: { every: 1.11, notes: (v) => [t(196 * v, 294, 0.14, 0.3, 0.3, 'sawtooth'), t(392 * v, 330, 0.08, 0.02, 0.2, 'sawtooth', 0.64)] } },
  rake: { base: { every: 0.34, notes: (v) => [n(3200 * v, 2200, 0.11, 0.06, 0.18, 2.4)] }, belly: { every: 0.5, notes: (v) => [n(2100 * v, 2700, 0.1, 0.02, 0.09, 4), n(2700 * v, 2000, 0.1, 0.02, 0.09, 4, 0.16)] }, head: { every: 0.9, notes: CRY.rake } },
  umbrella: { base: { every: 0.7, notes: (v) => [n(700 * v, 2600, 0.15, 0.2, 0.2, 1)] }, belly: { every: 1, notes: (v) => [n(500 * v, 240, 0.24, 0.008, 0.16, 0.8), n(380, 800, 0.14, 0.1, 0.2, 0.8, 0.5)] }, head: { every: 2.5, notes: (v) => [n(300, 1900 * v, 0.14, 0.7, 0.4, 2), t(520 * v, 180, 0.15, 0.004, 0.09, 'sine', 1.3)] } },
  goose: { base: { every: 0.31, notes: (v) => [n(900 * v, 500, 0.17, 0.004, 0.07, 1.6)] }, belly: { every: 0.34, notes: (v) => [n(600, 1100 * v, 0.12, 0.04, 0.08, 1.2), n(1000, 600, 0.1, 0.03, 0.08, 1.2, 0.16)] }, head: { every: 0.72, notes: CRY.goose } },
  spring: { base: { every: 0.77, notes: CRY.spring }, belly: { every: 0.91, notes: (v) => [t(220 * v, 880, 0.12, 0.2, 0.3, 'triangle')] }, head: { every: 1, notes: (v) => Array.from({ length: 5 }, (_, i) => t((700 - i * 70) * v, 400, 0.09, 0.004, 0.07, 'triangle', i * 0.1)) } },
}
const PLAIN: Record<PlaceId, Phrase> = {
  base: { every: 0.67, notes: (v) => [n(520 * v, 300, 0.16, 0.02, 0.16, 0.8)] },
  belly: { every: 1.33, notes: (v) => [n(380 * v, 300, 0.07, 0.04, 0.16, 1)] },
  head: { every: 1.33, notes: (v) => [t(330 * v, 300, 0.05, 0.04, 0.2, 'triangle', 0.3)] },
}
export const phrasesOf = (place: PlaceId, things: readonly { id: ThingId }[]): Phrase[] => (things.length ? things.map((s) => PHRASE[s.id][place]) : [PLAIN[place]])

/** The crunch of a stretch of rolling: bigger balls are deeper. */
export const crunch = (r: number, turn: number): Note[] => [n((1500 - r * 8) * vary(turn), 600, 0.1 + r / 1400, 0.012, 0.09, 0.9), t((170 - r * 0.7) * vary(turn + 2), 70, 0.05 + r / 1500, 0.01, 0.1)]

export function voiceOf(a: Act, turn: number): Note[] {
  const v = vary(turn)
  switch (a.type) {
    case 'press':
      switch (a.on) {
        case 'snow': return [n(900 * v, 400, 0.14, 0.006, 0.09, 0.9)]
        case 'man': return [n(300 * v, 200, 0.18, 0.02, 0.16, 0.8), t(240 * v, 180, 0.09, 0.02, 0.2, 'triangle')]
        case 'robin': return [t(1900 * v, 2500, 0.07, 0.02, 0.07), t(2400 * v, 1900, 0.06, 0.01, 0.1, 'sine', 0.1)]
        case 'house': return [t(660 * v, 655, 0.1, 0.004, 0.4, 'triangle'), t(880 * v, 875, 0.07, 0.004, 0.5, 'triangle', 0.1)]
        case 'tree': return [n(3000 * v, 1800, 0.1, 0.03, 0.22, 1.2), n(500, 250, 0.12, 0.02, 0.2, 0.8, 0.16)]
        case 'sky': return [n(1300 * v, 900, 0.07, 0.004, 0.05, 3), n(1700 * v, 1200, 0.05, 0.004, 0.05, 3, 0.07)]
        default: return CRY[a.on](v)
      }
    case 'stick': return [n(700 * v, 260, 0.2, 0.004, 0.1, 0.9), ...CRY[a.id](v).map((x) => ({ ...x, delay: (x.delay ?? 0) + 0.05 }))]
    case 'full': return [t(180, 320, 0.12, 0.03, 0.25, 'triangle')]
    case 'hop': return [t(160, 620, 0.16, 0.06, 0.5, 'sine'), n(300, 1500, 0.1, 0.1, 0.5, 1)]
    case 'land': return [n(a.place === 'head' ? 300 : 180, 90, 0.34, 0.005, 0.3, 0.7), t(a.place === 'head' ? 140 : a.place === 'belly' ? 100 : 75, 45, 0.28, 0.005, 0.3), n(2600, 5000, 0.04, 0.2, 0.6, 1, 0.1)]
    case 'drop': return [n(1400, 500, 0.12, 0.05, 0.3, 1), t(300, 150, 0.14, 0.01, 0.14, 'sine', 0.55)]
    case 'wake': return [t(330, 520, 0.12, 0.06, 0.16, 'triangle', 0.35), t(520, 660, 0.12, 0.04, 0.22, 'triangle', 0.6)]
    case 'walk': return [t(220, 440, 0.14, 0.1, 0.2, 'triangle'), t(440, 390, 0.12, 0.04, 0.24, 'triangle', 0.26)]
    case 'turn': return [n(600, 1200, 0.1, 0.1, 0.2, 1.4)]
    case 'shiver': return Array.from({ length: 8 }, (_, i) => t(300 + (i % 2) * 60, 280, 0.07, 0.01, 0.05, 'triangle', i * 0.09))
    case 'leap': return a.id ? [...CRY[a.id](1.15), n(400, 1800, 0.12, 0.04, 0.2, 1)] : [n(800, 2600, 0.12, 0.3, 0.06, 1), n(1600, 300, 0.3, 0.005, 0.3, 0.8, 0.36)]
    case 'flop': return [n(500, 90, 0.36, 0.02, 0.6, 0.6), t(200, 46, 0.3, 0.02, 0.5), t(420, 120, 0.1, 0.1, 0.7, 'triangle', 0.1)]
    case 'home': return [n(800 * v, 400, 0.08, 0.005, 0.08, 1, (turn % 5) * 0.04)]
    case 'jolt': return [n(400 * v, 200, 0.16, 0.01, 0.12, 0.9)]
    case 'crunch': return []
    default: return []
  }
}
export const ROBIN_STEPS: Record<string, Note[]> = {
  roll: [n(2400, 1500, 0.06, 0.02, 0.1, 1)], stick: [t(1500, 1900, 0.06, 0.005, 0.08)], hop: [t(700, 1500, 0.07, 0.05, 0.25)], land: [n(700, 300, 0.12, 0.005, 0.1)], step: [n(1200, 800, 0.07, 0.005, 0.06, 2)], flop: [n(900, 250, 0.14, 0.01, 0.25), t(700, 260, 0.06, 0.02, 0.3, 'triangle')],
}
