import type { Note } from './audio'
import { HIT } from './moves'
import type { PlayEvent } from './play'
import type { Coat, Thing, Who, World } from './tale'

// Every sound as numbers. A thing is an instrument, and whoever it happens to
// has a voice and an answer of their own to each. Nothing here is praise or a
// verdict: a lie and the truth are told in the same voice.

const t = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'tone', frequency, peak, attack, decay, ...more })
const n = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'noise', frequency, peak, attack, decay, ...more })
const times = (count: number, gap: number, make: (i: number) => Note): Note[] => Array.from({ length: count }, (_, i) => {
  const note = make(i)
  return { ...note, delay: (note.delay ?? 0) + i * gap }
})
const later = (notes: readonly Note[], delay: number, quiet = 1): Note[] => notes.map((note) => ({ ...note, peak: note.peak * quiet, delay: (note.delay ?? 0) + delay }))

export const THING_SOUNDS: Record<Thing, Note[]> = {
  mud: [n(260, 0.3, 0.004, 0.2, { q: 0.8, glideTo: 120 }), t(120, 0.2, 0.004, 0.16, { glideTo: 60 }), ...times(3, 0.14, (i) => t(210 - i * 30, 0.06, 0.01, 0.08, { glideTo: 120, delay: 0.26 }))],
  water: [n(1600, 0.26, 0.01, 0.5, { q: 0.5, glideTo: 500 }), ...times(6, 0.07, (i) => t(900 + (i % 3) * 260, 0.05, 0.004, 0.06, { glideTo: 1500 + (i % 2) * 300, delay: 0.16 }))],
  jam: [t(170, 0.2, 0.05, 0.16, { glideTo: 320 }), t(130, 0.2, 0.05, 0.2, { glideTo: 280, delay: 0.17 }), n(400, 0.16, 0.02, 0.2, { q: 3, glideTo: 180, delay: 0.3 })],
  pillow: [n(480, 0.3, 0.01, 0.22, { q: 0.6, glideTo: 200 }), n(5200, 0.06, 0.15, 0.9, { q: 1.5 })],
  pants: [n(1400, 0.18, 0.005, 0.14, { q: 2.5, glideTo: 4200 }), t(240, 0.14, 0.004, 0.1, { wave: 'triangle', glideTo: 520, delay: 0.14 })],
  balloon: [...times(4, 0.07, (i) => t(760 + (i % 2) * 130, 0.08, 0.02, 0.06, { wave: 'triangle', glideTo: 1050 + i * 60 })), n(3000, 0.05, 0.1, 0.2, { q: 4, delay: 0.1 })],
}

const honk = (f: number, long: number, to = f * 0.82, delay = 0): Note[] => [
  t(f, 0.13, 0.02, long, { wave: 'sawtooth', glideTo: to, delay }), t(f * 1.5, 0.06, 0.02, long * 0.8, { wave: 'square', glideTo: to * 1.5, delay }),
]
const oink = (f: number, delay = 0): Note[] => [n(f * 2.2, 0.2, 0.02, 0.1, { q: 3, delay }), t(f * 0.5, 0.13, 0.02, 0.1, { wave: 'sawtooth', glideTo: f * 0.42, delay })]
const squeal = (f: number, long: number, to: number, delay = 0): Note[] => [t(f, 0.12, 0.03, long, { wave: 'triangle', glideTo: to, delay }), n(f * 2, 0.04, 0.03, long, { q: 6, glideTo: to * 2, delay })]
const hum = (f: number, long: number, to = f, delay = 0): Note[] => [t(f, 0.15, 0.05, long, { wave: 'triangle', glideTo: to, delay }), t(f * 2, 0.05, 0.05, long * 0.8, { glideTo: to * 2, delay })]
const deep = (f: number, long: number, to = f * 0.9, delay = 0): Note[] => [t(f, 0.16, 0.04, long, { wave: 'sawtooth', glideTo: to, delay }), t(f * 2, 0.12, 0.04, long, { glideTo: to * 2, delay })]
const bell = (f: number, long: number, delay = 0): Note[] => [t(f, 0.15, 0.006, long, { delay }), t(f * 2.76, 0.06, 0.004, long * 0.6, { delay })]

export const VOICES: Record<Who, Record<Thing, Note[]>> = {
  goose: {
    mud: honk(330, 1.0, 190),
    water: times(7, 0.1, (i) => t(300 + (i % 2) * 90, 0.12, 0.008, 0.08, { wave: 'sawtooth', glideTo: 250 })),
    jam: [...hum(250, 0.35, 190), n(500, 0.14, 0.02, 0.3, { q: 5, delay: 0.2 })],
    pillow: [...honk(420, 0.1, 620), ...honk(560, 0.12, 420, 0.16)],
    pants: [...honk(300, 0.3, 300), ...honk(400, 0.55, 400, 0.4)],
    balloon: [...honk(620, 0.3, 780), ...honk(760, 0.5, 900, 0.36)],
  },
  pig: {
    mud: [...squeal(520, 0.3, 980), ...oink(300, 0.4), ...oink(340, 0.56)],
    water: [...oink(380), ...oink(330, 0.2), ...oink(280, 0.42)],
    jam: times(5, 0.15, (i) => n(700 + (i % 2) * 400, 0.2, 0.03, 0.07, { q: 5, glideTo: 1500 })),
    pillow: [n(900, 0.06, 0.4, 0.1, { q: 2, glideTo: 2400 }), n(1800, 0.28, 0.005, 0.25, { q: 0.7, glideTo: 600, delay: 0.5 }), ...squeal(700, 0.15, 420, 0.5)],
    pants: times(6, 0.11, (i) => n(620 + i * 60, 0.18, 0.015, 0.06, { q: 4 })),
    balloon: squeal(600, 1.0, 1500),
  },
  granny: {
    mud: [n(2600, 0.2, 0.002, 0.05, { q: 4 }), n(2400, 0.14, 0.002, 0.06, { q: 4, delay: 0.5 })],
    water: times(8, 0.09, (i) => t(230 + (i % 2) * 40, 0.12, 0.02, 0.07, { wave: 'triangle', glideTo: 300 })),
    jam: hum(250, 0.9, 340),
    pillow: [n(3200, 0.2, 0.02, 0.1, { q: 1.4 }), n(3600, 0.22, 0.02, 0.14, { q: 1.2, delay: 0.35 })],
    pants: [n(900, 0.1, 0.02, 0.12, { q: 2 }), ...hum(230, 0.3, 170, 0.1)],
    balloon: [...hum(340, 0.25, 700), ...hum(520, 0.6, 820, 0.4)],
  },
  grandpa: {
    mud: times(4, 0.15, (i) => t(120 - i * 8, 0.18, 0.02, 0.1, { wave: 'sawtooth', glideTo: 80 })),
    water: times(12, 0.06, (i) => n(700 + (i % 2) * 260, 0.18, 0.012, 0.04, { q: 3 })),
    jam: [...deep(110, 0.3, 120), ...deep(116, 0.5, 100, 0.42)],
    pillow: times(4, 0.2, (i) => t(i === 3 ? 340 : 210, 0.15, 0.02, i === 3 ? 0.3 : 0.08, { wave: 'sawtooth', glideTo: i === 3 ? 260 : 190 })),
    pants: deep(150, 0.7, 120),
    balloon: [...deep(150, 0.2, 210), ...deep(180, 0.2, 250, 0.3), ...deep(210, 0.5, 300, 0.6)],
  },
  moon: {
    mud: bell(262, 1.2),
    water: times(6, 0.11, (i) => t(700 - i * 24, 0.11, 0.004, 0.3)),
    jam: [...bell(392, 0.9), t(392, 0.1, 0.3, 0.6)],
    pillow: [t(523, 0.1, 0.12, 1.0), n(4000, 0.04, 0.2, 0.8)],
    pants: [...bell(587, 0.4), ...bell(440, 0.8, 0.3)],
    balloon: [...bell(784, 0.6), ...bell(1047, 0.9, 0.2)],
  },
}

const POKES: Record<Who, Note[]> = {
  goose: honk(380, 0.18, 320),
  pig: oink(330),
  granny: hum(280, 0.2, 240),
  grandpa: [...deep(130, 0.16, 150), ...deep(150, 0.2, 120, 0.2)],
  moon: bell(494, 0.9),
}

const BREATH: Record<Who, number> = { goose: 300, pig: 200, granny: 420, grandpa: 110, moon: 520 }
/** A snore is in and out, through whatever they are in. */
export function snoreOf(who: Who, coat: Coat, up: boolean): Note[] {
  const f = BREATH[who]
  if (up) return [t(f * 3, 0.06, 0.3, 0.2, { glideTo: f * 4 }), t(f * 4, 0.06, 0.1, 0.5, { glideTo: f * 2.6, delay: 0.55 })]
  if (coat === 'mud') return times(6, 0.12, (i) => t(f * (0.8 + (i % 3) * 0.16), 0.14, 0.02, 0.07, { glideTo: f * 1.6 }))
  if (coat === 'jam') return times(3, 0.24, () => n(f * 3, 0.2, 0.06, 0.08, { q: 5, glideTo: f * 6 }))
  if (coat === 'feathers') return times(4, 0.15, (i) => t(f * 1.5, 0.12, 0.012, i === 3 ? 0.22 : 0.07, { wave: 'sawtooth', glideTo: f * (i === 3 ? 2 : 1.3) }))
  return [n(f * 2.4, 0.18, 0.3, 0.25, { q: 2, glideTo: f * 4 }), t(f, 0.1, 0.2, 0.4, { wave: 'sawtooth', glideTo: f * 0.7, delay: 0.5 })]
}

const PICK: Record<Thing, Note[]> = {
  mud: [n(300, 0.16, 0.004, 0.09, { q: 2, glideTo: 520 })],
  water: [t(820, 0.1, 0.006, 0.1, { glideTo: 1300 })],
  jam: [t(230, 0.14, 0.01, 0.1, { wave: 'triangle', glideTo: 150 })],
  pillow: [n(700, 0.14, 0.02, 0.1, { q: 0.7 })],
  pants: [n(2600, 0.1, 0.01, 0.08, { q: 2 })],
  balloon: [t(980, 0.08, 0.01, 0.1, { wave: 'triangle', glideTo: 1180 })],
}

/** What a change in a picture is heard as, by what it has become. */
const turned = (event: { who: Who | null; thing: Thing | null }): Note[] => [n(event.who ? 1900 : 1300, 0.12, 0.003, 0.06, { q: 2 })]

export function soundOf(event: PlayEvent, world: World): Note[] {
  switch (event.kind) {
    case 'lift': return PICK[event.thing]
    case 'throw': return [n(500, 0.12, 0.05, 0.2, { q: 2, glideTo: 1700 })]
    case 'land': return event.small
      ? [...later(THING_SOUNDS[event.thing], HIT, 0.5), ...later(VOICES[event.who][event.thing], HIT + 0.2, 0.6)]
      : [...later(THING_SOUNDS[event.thing], HIT * 0.6), ...later(VOICES[event.who][event.thing], HIT + 0.22)]
    case 'splat': return later(THING_SOUNDS[event.thing], 0, 0.8)
    case 'poke': return POKES[event.who]
    case 'protest': return [...POKES[event.who], ...later(POKES[event.who], 0.4)]
    case 'snore': return snoreOf(event.who, world[event.who].coat, world[event.who].up)
    // A telling: a voice that rises and falls, with no words in it.
    case 'mutter': return [0, 1, 2, 3, 4, 5].flatMap((i) => deep((event.wide ? 128 : 112) * (1 + 0.16 * Math.sin(i * 2.1)), 0.12, 108 + (i % 3) * 18, i * 0.2)).map((note) => ({ ...note, peak: note.peak * 0.6 }))
    case 'change': return turned(event)
    case 'ponder': return later(deep(104, 0.18, 128), 0.7, 0.6)
    case 'knock': return [n(240, 0.12, 0.004, 0.08, { q: 1.4 })]
    case 'dusk': return [t(392, 0.1, 0.2, 0.7), t(330, 0.1, 0.2, 0.7, { delay: 0.4 }), t(262, 0.12, 0.3, 1.0, { delay: 0.8 }), n(900, 0.08, 0.3, 0.9, { q: 0.8, glideTo: 300, delay: 0.3 })]
    case 'cloth': return [n(380, 0.18, 0.01, 0.1, { q: 1 }), t(150, 0.1, 0.01, 0.1, { glideTo: 110, delay: 0.1 })]
    case 'lamp': return [t(1320, 0.07, 0.003, 0.2), t(1760, 0.04, 0.003, 0.16, { delay: 0.06 })]
    // Two licked fingers on a wick.
    case 'out': return [n(5200, 0.16, 0.01, 0.35, { q: 1.2, glideTo: 2600 }), t(200, 0.1, 0.1, 0.6, { glideTo: 90 })]
    case 'unravel': return times(14, 0.1, (i) => n(1400 + (i % 2) * 800 - i * 30, 0.1, 0.02, 0.06, { q: 3 }))
    case 'astonished': return later([...POKES.goose, ...later(POKES.pig, 0.12), ...later(POKES.granny, 0.24)], 1.35, 0.5)
    case 'remembers': return later([n(1100, 0.2, 0.002, 0.07, { q: 1 }), ...deep(140, 0.3, 240, 0.12)], 1.2)
    case 'swap': return [n(1200, 0.12, 0.01, 0.1, { q: 2, glideTo: 700 }), n(900, 0.12, 0.01, 0.1, { q: 2, glideTo: 1300, delay: 0.12 })]
    case 'night': return [t(262, 0.08, 0.4, 1.0), t(196, 0.09, 0.4, 1.2, { delay: 0.4 })]
    case 'crow': return [...honk(520, 0.12, 620), ...honk(700, 0.14, 820, 0.2), ...honk(940, 0.4, 820, 0.42), ...honk(760, 0.5, 520, 0.85)]
    case 'duck': return honk(700, 0.08, 520)
  }
}
