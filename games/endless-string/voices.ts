import type { Note } from './audio'
import { tuneOf, type Kind, type Where } from './kinds'
import type { HostId } from './layout'

// The sounds that are not a kind's own tune. All are numbers, and a test holds
// them in range.

const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]
const up = (base: number, step: number) => base * 2 ** (step / 12)

/** Each thing pops a step higher than the one before. */
export const pop = (n: number): Note[] => {
  const f = up(262, PENTA[n % PENTA.length])
  return [
    { kind: 'noise', frequency: 1400, q: 1.5, peak: 0.28, attack: 0.002, decay: 0.07, glideTo: 500 },
    { kind: 'tone', frequency: f * 0.6, glideTo: f * 1.6, wave: 'triangle', peak: 0.26, attack: 0.004, decay: 0.16 },
    { kind: 'tone', frequency: f * 2, wave: 'sine', peak: 0.07, attack: 0.01, decay: 0.2, delay: 0.06 },
  ]
}
/** The box strains: the fuller the pull, the higher. */
export const creak = (strain: number): Note[] => [{ kind: 'tone', frequency: 90 + 120 * strain, glideTo: 120 + 150 * strain, wave: 'sawtooth', peak: 0.06, attack: 0.02, decay: 0.09 }]
export const plop: Note[] = [{ kind: 'tone', frequency: 420, glideTo: 130, wave: 'sine', peak: 0.2, attack: 0.004, decay: 0.12 }]
export const grab: Note[] = [{ kind: 'tone', frequency: 520, glideTo: 640, wave: 'triangle', peak: 0.12, attack: 0.004, decay: 0.09 }]
export const twang: Note[] = [{ kind: 'tone', frequency: 180, glideTo: 110, wave: 'sawtooth', peak: 0.13, attack: 0.003, decay: 0.3 }, { kind: 'tone', frequency: 362, glideTo: 220, wave: 'triangle', peak: 0.09, attack: 0.003, decay: 0.25 }]
export const snow: Note[] = [{ kind: 'noise', frequency: 700, q: 0.7, peak: 0.14, attack: 0.01, decay: 0.2, glideTo: 300 }]
export const rattle: Note[] = [0, 1, 2, 3].map((i) => ({ kind: 'noise' as const, frequency: 900 + 180 * (i % 2), q: 4, peak: 0.16, attack: 0.003, decay: 0.05, delay: i * 0.07 }))
export const ratchet: Note[] = [0, 1, 2].map((i) => ({ kind: 'tone' as const, frequency: 300 + i * 60, wave: 'square' as const, peak: 0.08, attack: 0.002, decay: 0.04, delay: i * 0.06 }))
export const zip: Note[] = [{ kind: 'noise', frequency: 500, q: 3, peak: 0.14, attack: 0.02, decay: 0.25, glideTo: 2200 }]
export const switchOn: Note[] = [
  { kind: 'noise', frequency: 300, q: 1, peak: 0.35, attack: 0.002, decay: 0.09, glideTo: 120 },
  { kind: 'tone', frequency: 82, glideTo: 60, wave: 'square', peak: 0.2, attack: 0.003, decay: 0.12 },
  { kind: 'tone', frequency: 131, glideTo: 262, wave: 'triangle', peak: 0.16, attack: 0.2, decay: 0.5, delay: 0.08 },
]
export const switchOff: Note[] = [
  { kind: 'noise', frequency: 260, q: 1, peak: 0.3, attack: 0.002, decay: 0.07, glideTo: 120 },
  { kind: 'tone', frequency: 330, glideTo: 70, wave: 'triangle', peak: 0.18, attack: 0.02, decay: 0.5, delay: 0.04 },
]
export const star = (n: number): Note[] => [{ kind: 'tone', frequency: up(880, PENTA[n % 5]), wave: 'sine', peak: 0.07, attack: 0.005, decay: 0.35 }]

const TICKLE: Readonly<Record<HostId, readonly Note[]>> = {
  moose: [{ kind: 'tone', frequency: 110, glideTo: 150, wave: 'sawtooth', peak: 0.18, attack: 0.03, decay: 0.25 }, { kind: 'noise', frequency: 300, q: 1, peak: 0.1, attack: 0.03, decay: 0.3, delay: 0.1 }],
  house: [{ kind: 'tone', frequency: 196, wave: 'square', peak: 0.09, attack: 0.003, decay: 0.08 }, { kind: 'tone', frequency: 165, wave: 'square', peak: 0.09, attack: 0.003, decay: 0.1, delay: 0.12 }],
  tree: [{ kind: 'noise', frequency: 2400, q: 0.8, peak: 0.16, attack: 0.02, decay: 0.3, glideTo: 900 }],
  dog: [{ kind: 'tone', frequency: 560, glideTo: 900, wave: 'triangle', peak: 0.2, attack: 0.01, decay: 0.09 }, { kind: 'tone', frequency: 620, glideTo: 820, wave: 'triangle', peak: 0.14, attack: 0.01, decay: 0.07, delay: 0.16 }],
}
export const tickle = (host: HostId): Note[] => [...TICKLE[host]]
/** The string catches on somebody: a twang and the one it caught on. */
export const caught = (host: HostId): Note[] => [...twang, ...tickle(host)]
/** A thing asleep on the string mutters. */
export const mutter = (kind: Kind): Note[] => tuneOf(kind, 'air', 0.45).slice(0, 2).map((note) => ({ ...note, frequency: Math.max(60, note.frequency / 2), glideTo: undefined }))
/** A thing the light reaches. */
export const wake = (kind: Kind): Note[] => tuneOf(kind, 'air', 0.6).slice(0, 2)
export const turn = (kind: Kind, where: Where): Note[] => tuneOf(kind, where)
