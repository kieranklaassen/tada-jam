import type { Note } from './audio'
import type { What } from './castle'
import type { Who } from './layout'

// The sounds of the evening as plain numbers, written from the sheet's words
// (ART.md, the grid's fourth and fifth columns and the three scenes). The test
// beside this file holds every one to the limits of voices.ts.
//
// By day everything is wood on wool. In the evening each thing has the sound
// of what it has become: rope, iron, cloth, a latch, a light.

const tick = (frequency: number, delay: number, peak = 0.14, decay = 0.03): Note[] => [
  { kind: 'tone', wave: 'triangle', frequency, peak, attack: 0.001, decay, delay },
  { kind: 'noise', frequency: Math.min(4200, frequency * 4), q: 3, peak: peak * 0.5, attack: 0.001, decay: 0.015, delay },
]

/** A step up the scale for each block that stands under a thing, as by day, kept small so iron stays iron. */
const raised = (tier: number): number => 2 ** (Math.min(5, Math.max(0, tier)) / 12)

/** The bell: brass, struck once, ringing on. */
export const bell: Note[] = [
  { kind: 'tone', wave: 'sine', frequency: 784, peak: 0.24, attack: 0.002, decay: 1.2 },
  { kind: 'tone', wave: 'sine', frequency: 784 * 2.01, peak: 0.12, attack: 0.002, decay: 0.8 },
  { kind: 'tone', wave: 'sine', frequency: 784 * 2.99, peak: 0.07, attack: 0.002, decay: 0.45 },
  { kind: 'tone', wave: 'triangle', frequency: 784 * 4.2, peak: 0.05, attack: 0.001, decay: 0.12 },
  { kind: 'noise', frequency: 3000, q: 2, peak: 0.08, attack: 0.001, decay: 0.03 },
]

/** The sun sinks: a long soft fall. And comes back: the same, rising. */
export const dusk: Note[] = [
  { kind: 'tone', wave: 'sine', frequency: 392, glideTo: 262, peak: 0.07, attack: 0.4, decay: 0.9 },
  { kind: 'tone', wave: 'sine', frequency: 587, glideTo: 392, peak: 0.04, attack: 0.5, decay: 0.8 },
]
export const dawn: Note[] = [
  { kind: 'tone', wave: 'sine', frequency: 262, glideTo: 392, peak: 0.07, attack: 0.4, decay: 0.9 },
  { kind: 'tone', wave: 'sine', frequency: 392, glideTo: 587, peak: 0.04, attack: 0.5, decay: 0.8 },
]

/** A block becomes its thing. `capped` is a tower with a block on it: battlements and no roof. */
export function become(what: What, capped: boolean, tier: number): Note[] {
  const up = raised(tier)
  switch (what) {
    case 'bridge': {
      // Boards and rope rails unroll: a rattle of slats, and the rope pulled tight.
      const notes: Note[] = []
      for (let i = 0; i < 6; i++) notes.push(...tick(520 * up * (1 + 0.04 * (i % 3)), 0.045 * i, 0.12, 0.025))
      notes.push({ kind: 'noise', frequency: 700, glideTo: 1100, q: 8, peak: 0.07, attack: 0.05, decay: 0.12, delay: 0.28 })
      return notes
    }
    case 'gate':
      // The grille drops: clack, clack, clack, each lower.
      return [0, 1, 2].flatMap((i) => [
        { kind: 'tone' as const, wave: 'square' as const, frequency: 233 * up * 0.89 ** i, peak: 0.1, attack: 0.001, decay: 0.05, delay: 0.11 * i },
        { kind: 'noise' as const, frequency: 2600, q: 5, peak: 0.12, attack: 0.001, decay: 0.03, delay: 0.11 * i },
      ])
    case 'tower':
      if (capped) return [0, 1, 2].flatMap((i) => tick(1100 * up, 0.075 * i, 0.13, 0.02))
      // The roof opens like an umbrella: fwoop, and a pop as it locks.
      return [
        { kind: 'noise', frequency: 320, glideTo: 1500, q: 1.4, peak: 0.16, attack: 0.12, decay: 0.08 },
        { kind: 'tone', wave: 'sine', frequency: 196 * up, glideTo: 330 * up, peak: 0.08, attack: 0.1, decay: 0.08 },
        { kind: 'tone', wave: 'sine', frequency: 520 * up, glideTo: 1150 * up, peak: 0.2, attack: 0.002, decay: 0.06, delay: 0.24 },
      ]
    case 'pole':
      // The flag unrolls and snaps twice in the wind.
      return [
        { kind: 'noise', frequency: 900, glideTo: 1800, q: 0.8, peak: 0.08, attack: 0.08, decay: 0.06 },
        { kind: 'noise', frequency: 2400, q: 0.7, peak: 0.18, attack: 0.001, decay: 0.04, delay: 0.17 },
        { kind: 'noise', frequency: 2100, q: 0.7, peak: 0.14, attack: 0.001, decay: 0.05, delay: 0.31 },
        { kind: 'tone', wave: 'triangle', frequency: 880 * up, peak: 0.05, attack: 0.002, decay: 0.05, delay: 0.17 },
      ]
    case 'room':
      // Two shutters clap open, and the light comes on: pim.
      return [
        { kind: 'noise', frequency: 950, q: 1.2, peak: 0.16, attack: 0.001, decay: 0.03 },
        { kind: 'noise', frequency: 1150, q: 1.2, peak: 0.14, attack: 0.001, decay: 0.03, delay: 0.09 },
        { kind: 'tone', wave: 'sine', frequency: 1047 * up, peak: 0.14, attack: 0.003, decay: 0.3, delay: 0.22 },
        { kind: 'tone', wave: 'sine', frequency: 1568 * up, peak: 0.06, attack: 0.003, decay: 0.2, delay: 0.22 },
      ]
    case 'slide':
      // Its face shines: zip. The ladder drops at its heel: two rungs.
      return [
        { kind: 'noise', frequency: 1200, glideTo: 4200, q: 2.2, peak: 0.13, attack: 0.05, decay: 0.08 },
        { kind: 'tone', wave: 'sine', frequency: 660 * up, glideTo: 1480 * up, peak: 0.08, attack: 0.04, decay: 0.08 },
        ...tick(440 * up, 0.2, 0.1), ...tick(392 * up, 0.27, 0.1),
      ]
  }
}

/** A castle thing answers a tap. `clang` is the cook in the room, with his spoon on his pot. */
export function act(what: What, clang = false): Note[] {
  switch (what) {
    case 'bridge':
      // The ropes take the weight.
      return [{ kind: 'noise', frequency: 600, glideTo: 950, q: 9, peak: 0.12, attack: 0.03, decay: 0.1 }, ...tick(494, 0.08, 0.08)]
    case 'gate': {
      // The grille ratchets up, tooth by tooth, and falls: clunk.
      const notes: Note[] = []
      for (let i = 0; i < 6; i++) notes.push(...tick(300 + 45 * i, 0.07 * i, 0.11, 0.02))
      notes.push({ kind: 'tone', wave: 'sine', frequency: 110, glideTo: 70, peak: 0.24, attack: 0.002, decay: 0.16, delay: 0.82 }, { kind: 'noise', frequency: 2200, q: 4, peak: 0.14, attack: 0.001, decay: 0.04, delay: 0.82 })
      return notes
    }
    case 'tower':
      // The roof lifts like a lid, on a dry hinge.
      return [
        { kind: 'noise', frequency: 620, glideTo: 1250, q: 12, peak: 0.16, attack: 0.1, decay: 0.14 },
        { kind: 'noise', frequency: 1250, glideTo: 700, q: 12, peak: 0.1, attack: 0.08, decay: 0.14, delay: 0.55 },
        ...tick(700, 0.86, 0.1),
      ]
    case 'pole':
      // The flag runs down and up on a pulley that wants oil.
      return [0, 1, 2, 3, 4, 5].map((i) => ({ kind: 'tone' as const, wave: 'sine' as const, frequency: i % 2 ? 2350 : 1900, glideTo: i % 2 ? 1900 : 2350, peak: 0.07, attack: 0.02, decay: 0.06, delay: 0.14 * i }))
    case 'room': {
      // The light goes out and comes on again: click, click.
      const notes: Note[] = [
        { kind: 'noise', frequency: 3200, q: 3, peak: 0.16, attack: 0.001, decay: 0.012 },
        { kind: 'noise', frequency: 3600, q: 3, peak: 0.16, attack: 0.001, decay: 0.012, delay: 0.32 },
        { kind: 'tone', wave: 'sine', frequency: 1047, peak: 0.08, attack: 0.003, decay: 0.2, delay: 0.33 },
      ]
      if (clang) notes.push(
        { kind: 'tone', wave: 'sine', frequency: 1320, peak: 0.2, attack: 0.001, decay: 0.4, delay: 0.42 },
        { kind: 'tone', wave: 'sine', frequency: 1973, peak: 0.12, attack: 0.001, decay: 0.3, delay: 0.42 },
        { kind: 'tone', wave: 'sine', frequency: 2861, peak: 0.07, attack: 0.001, decay: 0.16, delay: 0.42 },
      )
      return notes
    }
    case 'slide':
      // A finger down its polished face.
      return [{ kind: 'tone', wave: 'sine', frequency: 1175, glideTo: 2350, peak: 0.1, attack: 0.01, decay: 0.12 }, { kind: 'noise', frequency: 3000, q: 2, peak: 0.06, attack: 0.02, decay: 0.08 }]
  }
}

/** How heavy each of the folk sounds on his feet. */
const WEIGHT: Record<Who, number> = { king: 0.75, cook: 1.26, dragon: 0.56 }

/** One step on the boards of a bridge: trip, trap, each board its own note. */
export function step(who: Who, n: number): Note[] {
  const f = [330, 392, 440][n % 3] * WEIGHT[who]
  return [
    { kind: 'tone', wave: 'triangle', frequency: f, peak: 0.2, attack: 0.002, decay: 0.07 },
    { kind: 'tone', wave: 'sine', frequency: f * 2.76, peak: 0.06, attack: 0.002, decay: 0.04 },
    { kind: 'noise', frequency: 1500, q: 2.5, peak: 0.1, attack: 0.001, decay: 0.02 },
  ]
}

/** The end of a board with air under it bends, and throws him back. */
export function boing(who: Who): Note[] {
  const f = 147 * WEIGHT[who]
  return [
    { kind: 'tone', wave: 'sine', frequency: f, glideTo: f * 3, peak: 0.22, attack: 0.01, decay: 0.3 },
    { kind: 'tone', wave: 'triangle', frequency: f * 2, glideTo: f * 4.5, peak: 0.08, attack: 0.01, decay: 0.22, delay: 0.03 },
  ]
}

/** Down the slide, each in his own voice: a wheee that falls as he does. */
export function whee(who: Who): Note[] {
  if (who === 'king') return [{ kind: 'tone', wave: 'sawtooth', frequency: 330, glideTo: 165, peak: 0.1, attack: 0.08, decay: 0.3 }, { kind: 'tone', wave: 'sine', frequency: 660, glideTo: 330, peak: 0.07, attack: 0.08, decay: 0.3 }]
  if (who === 'cook') return [{ kind: 'tone', wave: 'sine', frequency: 1900, glideTo: 900, peak: 0.14, attack: 0.06, decay: 0.34 }, { kind: 'tone', wave: 'sine', frequency: 900, glideTo: 700, peak: 0.07, attack: 0.02, decay: 0.12, delay: 0.38 }]
  return [{ kind: 'tone', wave: 'triangle', frequency: 520, glideTo: 220, peak: 0.13, attack: 0.1, decay: 0.34 }, { kind: 'noise', frequency: 1600, glideTo: 700, q: 0.8, peak: 0.07, attack: 0.1, decay: 0.3 }]
}

/** He lands on the wool. */
export function bump(who: Who): Note[] {
  return [
    { kind: 'tone', wave: 'sine', frequency: 104 * (0.6 + 0.4 * WEIGHT[who]), glideTo: 62, peak: 0.24, attack: 0.003, decay: 0.12 },
    { kind: 'noise', frequency: 260, q: 0.8, peak: 0.16, attack: 0.003, decay: 0.07 },
  ]
}

/** He lands in the moat. */
export const splash: Note[] = [
  { kind: 'noise', frequency: 1100, glideTo: 320, q: 0.6, peak: 0.24, attack: 0.008, decay: 0.34 },
  { kind: 'tone', wave: 'sine', frequency: 1400, glideTo: 2300, peak: 0.08, attack: 0.004, decay: 0.05, delay: 0.16 },
  { kind: 'tone', wave: 'sine', frequency: 1750, glideTo: 2700, peak: 0.06, attack: 0.004, decay: 0.05, delay: 0.25 },
  { kind: 'tone', wave: 'sine', frequency: 1200, glideTo: 2000, peak: 0.05, attack: 0.004, decay: 0.05, delay: 0.36 },
]

/** Out of the moat he shakes himself like a dog. */
export const shake: Note[] = [0, 1, 2, 3, 4, 5].map((i) => ({ kind: 'noise' as const, frequency: 1500 + 180 * (i % 2), q: 1, peak: 0.1, attack: 0.004, decay: 0.03, delay: 0.5 + 0.075 * i }))

/** The dragon under a bridge that feet have crossed puffs one ring of smoke. */
export const puff: Note[] = [
  { kind: 'noise', frequency: 520, glideTo: 240, q: 0.7, peak: 0.16, attack: 0.08, decay: 0.3 },
  { kind: 'tone', wave: 'triangle', frequency: 131, glideTo: 98, peak: 0.08, attack: 0.06, decay: 0.2 },
]

/** He is lifted off his feet: a small breath of air. */
export const hup: Note[] = [{ kind: 'noise', frequency: 320, glideTo: 760, q: 1.4, peak: 0.07, attack: 0.03, decay: 0.07 }]

/** He goes in at the gate, and its grille rattles behind him. */
export const door: Note[] = [...tick(262, 0, 0.1), ...tick(233, 0.08, 0.1), { kind: 'tone', wave: 'sine', frequency: 98, glideTo: 70, peak: 0.14, attack: 0.002, decay: 0.1, delay: 0.16 }]

/** He goes in by a window: set on the room, a squeeze and a pop. */
export const squeeze: Note[] = [
  { kind: 'tone', wave: 'sine', frequency: 520, glideTo: 300, peak: 0.1, attack: 0.03, decay: 0.12 },
  { kind: 'tone', wave: 'sine', frequency: 300, glideTo: 780, peak: 0.16, attack: 0.002, decay: 0.05, delay: 0.17 },
]

/** He is set down where he belongs. */
export const home: Note[] = [{ kind: 'tone', wave: 'sine', frequency: 131, glideTo: 92, peak: 0.12, attack: 0.003, decay: 0.08 }, { kind: 'noise', frequency: 420, q: 0.9, peak: 0.06, attack: 0.003, decay: 0.04 }]

/** The basket goes over: a long creak of cane. */
export const tip: Note[] = [
  { kind: 'noise', frequency: 440, glideTo: 820, q: 11, peak: 0.18, attack: 0.16, decay: 0.24 },
  { kind: 'noise', frequency: 760, glideTo: 520, q: 9, peak: 0.08, attack: 0.1, decay: 0.2, delay: 0.2 },
]

/** Its side comes down on the boards: played when it does, so a basket set upright by a touch makes no thump. */
export const tipped: Note[] = [
  { kind: 'tone', wave: 'sine', frequency: 98, glideTo: 68, peak: 0.2, attack: 0.003, decay: 0.12 },
  { kind: 'noise', frequency: 600, q: 0.9, peak: 0.1, attack: 0.003, decay: 0.06 },
]
