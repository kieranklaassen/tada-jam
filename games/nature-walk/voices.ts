import type { Note } from './audio'
import { CELL_SOUNDS } from './cellVoices'
import { n, t, type Mark, type Sound } from './notes'
import type { FindId } from './wood'

// Every sound of the wood as plain numbers, written from the words of the
// design sheet. Nobody has listened to them yet: a test holds every pitch,
// peak and length in range, and that no mark comes after the motion it
// rides on is over. Each sound is the sound of one motion that is seen, and
// the model says when: nothing here knows the time, and no note carries a
// delay (notes.ts).

const WORLD = {
  // The six covers, opening and shutting, each in its own material.
  grassOpen: { rides: 0.55, marks: [n(3200, 0.8, 0.09, 0.01, 0.2, { glideTo: 1800 }), n(2400, 0.9, 0.05, 0.02, 0.16, { at: 0.1 })] },
  grassShut: { rides: 0.45, marks: [n(1700, 0.8, 0.08, 0.02, 0.2, { glideTo: 2900 })] },
  logOpen: { rides: 0.7, marks: [t(170, 0.07, 0.03, 0.2, { wave: 'sawtooth', glideTo: 300 }), t(210, 0.06, 0.03, 0.22, { wave: 'sawtooth', glideTo: 350, at: 0.24 })] },
  logShut: { rides: 0.45, marks: [t(330, 0.05, 0.03, 0.3, { wave: 'sawtooth', glideTo: 180 })] },
  logClap: { rides: 0.25, marks: [t(150, 0.16, 0.004, 0.11, { wave: 'triangle' }), n(520, 2, 0.1, 0.003, 0.07)] },
  stoneOpen: { rides: 0.8, marks: [n(210, 1.2, 0.13, 0.05, 0.6, { glideTo: 150 }), n(900, 4, 0.03, 0.05, 0.5)] },
  stoneShut: { rides: 0.7, marks: [n(150, 1.2, 0.13, 0.05, 0.5, { glideTo: 210 }), n(800, 4, 0.03, 0.05, 0.4)] },
  stoneLand: { rides: 0.3, marks: [t(72, 0.24, 0.005, 0.2, { glideTo: 44 }), n(160, 1, 0.12, 0.004, 0.1)] },
  puddleOpen: { rides: 0.9, marks: [t(420, 0.08, 0.02, 0.16, { glideTo: 760 }), n(1100, 3, 0.05, 0.05, 0.5, { glideTo: 1500 })] },
  puddleShut: { rides: 0.8, marks: [n(1500, 3, 0.05, 0.05, 0.4, { glideTo: 1000 }), t(330, 0.09, 0.01, 0.18, { glideTo: 170, at: 0.3 })] },
  branchOpen: { rides: 0.5, marks: [n(4300, 0.7, 0.06, 0.005, 0.07), n(3800, 0.7, 0.06, 0.005, 0.07, { at: 0.09 }), n(4600, 0.7, 0.05, 0.005, 0.09, { at: 0.18 })] },
  branchShut: { rides: 0.45, marks: [n(4200, 0.7, 0.05, 0.005, 0.08), n(3300, 0.7, 0.06, 0.005, 0.1, { at: 0.1 })] },
  burrowOpen: { rides: 0.6, marks: [t(230, 0.08, 0.01, 0.1, { wave: 'triangle', glideTo: 340 }), n(1300, 6, 0.06, 0.004, 0.05, { at: 0.12 }), n(1100, 6, 0.05, 0.004, 0.05, { at: 0.22 })] },
  burrowShut: { rides: 0.5, marks: [t(300, 0.07, 0.01, 0.1, { wave: 'triangle', glideTo: 210 }), t(190, 0.12, 0.004, 0.08, { wave: 'triangle', at: 0.3 })] },
  // A cover touched while the year is turning shakes on its pin before it opens again.
  // What was found comes up to be seen.
  hello: { rides: 0.4, marks: [t(620, 0.07, 0.008, 0.09, { wave: 'triangle' }), t(830, 0.07, 0.008, 0.12, { wave: 'triangle', at: 0.1 })] },
  // The hedgehog: quick and snuffling.
  hogRoll: { rides: 0.4, marks: [t(540, 0.1, 0.008, 0.2, { wave: 'triangle', glideTo: 170 }), n(2600, 3, 0.05, 0.004, 0.03, { at: 0.05 }), n(2200, 3, 0.05, 0.004, 0.03, { at: 0.11 }), n(1800, 3, 0.05, 0.004, 0.03, { at: 0.17 })] },
  // Poked again as a ball: a short huff through his nose, and a low grumble under it.
  hogHuff: { rides: 0.7, marks: [n(900, 1.2, 0.09, 0.03, 0.22, { glideTo: 480 }), t(210, 0.05, 0.02, 0.18, { wave: 'triangle', glideTo: 150, at: 0.05 })] },
  hogUnroll: { rides: 0.7, marks: [t(190, 0.09, 0.02, 0.3, { wave: 'triangle', glideTo: 560 }), t(720, 0.1, 0.004, 0.08, { at: 0.34 })] },
  hogSniff: { rides: 0.6, marks: [n(2100, 4, 0.06, 0.02, 0.07), n(2500, 4, 0.06, 0.02, 0.07, { at: 0.16 }), n(2900, 4, 0.05, 0.02, 0.08, { at: 0.32 })] },
  // The jay: sharp and stepped.
  jayScold: { rides: 1, marks: [t(980, 0.05, 0.004, 0.05, { wave: 'sawtooth', glideTo: 880 }), t(1040, 0.05, 0.004, 0.05, { wave: 'sawtooth', glideTo: 900, at: 0.09 }), t(980, 0.05, 0.004, 0.05, { wave: 'sawtooth', glideTo: 860, at: 0.18 }), t(1100, 0.05, 0.004, 0.09, { wave: 'sawtooth', glideTo: 820, at: 0.27 }), n(3000, 2, 0.04, 0.004, 0.3, { at: 0.02 })] },
  jayOoh: { rides: 0.7, marks: [t(1300, 0.06, 0.02, 0.12, { glideTo: 1700 }), t(1500, 0.06, 0.02, 0.2, { glideTo: 2100, at: 0.18 })] },
  // The toad: slow and heavy.
  toadPuff: { rides: 0.5, marks: [t(88, 0.09, 0.3, 0.15, { glideTo: 140 }), n(500, 1, 0.03, 0.3, 0.15)] },
  toadCroak: { rides: 0.5, marks: [t(118, 0.1, 0.01, 0.07, { wave: 'sawtooth' }), t(112, 0.1, 0.01, 0.07, { wave: 'sawtooth', at: 0.08 }), t(106, 0.1, 0.01, 0.07, { wave: 'sawtooth', at: 0.16 }), t(100, 0.1, 0.01, 0.07, { wave: 'sawtooth', at: 0.24 }), t(92, 0.1, 0.01, 0.16, { wave: 'sawtooth', glideTo: 70, at: 0.32 })] },
  toadLand: { rides: 0.3, marks: [t(84, 0.2, 0.004, 0.16, { glideTo: 52 }), t(260, 0.07, 0.003, 0.05, { wave: 'triangle', at: 0.04 })] },
  // The wood itself.
  knock: { rides: 0.5, marks: [t(300, 0.13, 0.003, 0.07, { wave: 'triangle', glideTo: 236 }), n(820, 3, 0.06, 0.003, 0.05)] },
  clack: { rides: 0.2, marks: [t(430, 0.09, 0.002, 0.03, { wave: 'square' }), n(2500, 5, 0.06, 0.002, 0.03)] },
  wheelStop: { rides: 0.3, marks: [t(250, 0.13, 0.003, 0.1, { wave: 'triangle' }), n(600, 2, 0.05, 0.003, 0.06)] },
  nestRustle: { rides: 0.5, marks: [n(3600, 1.5, 0.05, 0.005, 0.05), n(3000, 1.5, 0.05, 0.005, 0.05, { at: 0.08 }), n(3900, 1.5, 0.04, 0.005, 0.06, { at: 0.17 })] },
} satisfies Record<string, Sound>

/** What each find does when it is touched, in the words of the sheet's table. */
const FINDS: Record<FindId, Sound> = {
  worm: { rides: 0.7, marks: [t(300, 0.09, 0.03, 0.4, { wave: 'triangle', glideTo: 780 })] },
  snail: { rides: 0.9, marks: [t(210, 0.12, 0.004, 0.07, { wave: 'triangle' }), t(880, 0.06, 0.006, 0.06, { at: 0.5 }), t(1040, 0.06, 0.006, 0.07, { at: 0.68 })] },
  feather: { rides: 0.9, marks: [n(2600, 6, 0.05, 0.12, 0.5, { glideTo: 1500 }), t(1320, 0.03, 0.12, 0.5, { glideTo: 760 })] },
  acorn: { rides: 0.7, marks: [t(520, 0.08, 0.003, 0.04, { wave: 'triangle' }), t(470, 0.08, 0.003, 0.04, { wave: 'triangle', at: 0.09 }), t(540, 0.08, 0.003, 0.04, { wave: 'triangle', at: 0.18 }), t(380, 0.11, 0.003, 0.07, { wave: 'triangle', at: 0.46 })] },
  button: { rides: 0.9, marks: [t(1760, 0.08, 0.004, 0.7, { glideTo: 1660 }), t(2640, 0.04, 0.004, 0.5), t(1700, 0.03, 0.004, 0.2, { at: 0.4 })] },
  apple: { rides: 0.8, marks: [t(196, 0.14, 0.006, 0.16, { glideTo: 150 }), t(174, 0.1, 0.006, 0.18, { glideTo: 140, at: 0.26 })] },
  ladybird: { rides: 0.9, marks: [t(1500, 0.05, 0.002, 0.03, { wave: 'square' }), n(700, 8, 0.07, 0.06, 0.5, { glideTo: 1100, at: 0.08 })] },
  mushroom: { rides: 0.8, marks: [n(900, 0.6, 0.07, 0.08, 0.4, { glideTo: 500, at: 0.2 })] },
  sleeper: { rides: 1.2, marks: [t(130, 0.05, 0.12, 0.2, { glideTo: 110 }), n(2800, 5, 0.04, 0.003, 0.03, { at: 0.45 }), n(3100, 5, 0.04, 0.003, 0.03, { at: 0.53 }), n(2700, 5, 0.04, 0.003, 0.03, { at: 0.61 }), n(3000, 5, 0.04, 0.003, 0.03, { at: 0.69 })] },
  tadpole: { rides: 0.8, marks: [t(700, 0.08, 0.004, 0.08, { glideTo: 1050 }), t(620, 0.08, 0.004, 0.08, { glideTo: 980, at: 0.36 })] },
  skater: { rides: 0.7, marks: [t(2100, 0.04, 0.002, 0.02, { wave: 'square' }), t(2300, 0.04, 0.002, 0.02, { wave: 'square', at: 0.18 }), t(2000, 0.04, 0.002, 0.02, { wave: 'square', at: 0.36 })] },
  leafboat: { rides: 0.9, marks: [n(3400, 1, 0.05, 0.02, 0.3), t(900, 0.06, 0.004, 0.09, { glideTo: 1300, at: 0.55 })] },
  bubble: { rides: 0.8, marks: [t(1500, 0.05, 0.03, 0.25, { glideTo: 2300 }), t(2200, 0.04, 0.03, 0.25, { glideTo: 1500, at: 0.4 })] },
  caterpillar: { rides: 1, marks: [t(330, 0.08, 0.06, 0.25, { wave: 'triangle', glideTo: 500 }), t(500, 0.08, 0.06, 0.25, { wave: 'triangle', glideTo: 330, at: 0.5 })] },
  beetle: { rides: 0.9, marks: [0, 1, 2, 3, 4, 5, 6].map((i) => t(1150 + (i % 3) * 90, 0.04, 0.002, 0.02, { wave: 'square', at: i * 0.11 })) },
  moth: { rides: 0.9, marks: [0, 1, 2, 3, 4].map((i) => n(1700, 2, 0.05, 0.02, 0.05, { at: i * 0.15 })) },
}

export const SOUNDS = { ...WORLD, ...FINDS, ...CELL_SOUNDS } satisfies Record<string, Sound>
export type SoundId = keyof typeof SOUNDS

/** The parts of a sound: the marks that share a moment, in the order of their moments. */
export function partsOf(id: SoundId): { at: number; marks: Mark[] }[] {
  const sound: Sound = SOUNDS[id], parts: { at: number; marks: Mark[] }[] = []
  for (const mark of sound.marks) {
    const at = mark.at ?? 0
    let part = parts.find((other) => other.at === at)
    if (!part) { part = { at, marks: [] }; parts.push(part) }
    part.marks.push(mark)
  }
  return parts.sort((a, b) => a.at - b.at)
}

/** The notes of one part of a sound at a pitch: 1 is as written. They all start together: none carries a delay. */
export function notesOf(id: SoundId, part = 0, pitch = 1): Note[] {
  const marks = partsOf(id)[part]?.marks ?? []
  return marks.map(({ at: _at, ...mark }) => ({ ...mark, frequency: mark.frequency * pitch, ...(mark.glideTo === undefined ? {} : { glideTo: mark.glideTo * pitch }) }))
}

/** How long a sound takes from its first mark to the end of its last. */
export function lengthOf(id: SoundId): number {
  const sound: Sound = SOUNDS[id]
  return Math.max(...sound.marks.map((mark) => (mark.at ?? 0) + mark.attack + mark.decay))
}
