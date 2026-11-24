import { bars, patch, room, type Beat, type Score, type Section } from './score'

// A sly waltz for a front room: a plucked bass that creeps down a step a bar, short nylon chords on two and three, a
// clarinet with the tune, and a celesta that answers in the bars where the clarinet holds. D minor, with a sunny
// middle in F and a tiptoe in G minor that goes home by way of E flat.

const BEAT = 60 / 112
const IN_BAR = 3

/** The bass of a bar and the three notes plucked over it. */
type Chord = readonly [bass: number, low: number, mid: number, high: number]

const CHORDS: Record<Section, readonly Chord[]> = {
  a: [[38, 57, 62, 65], [37, 57, 61, 67], [36, 57, 60, 65], [35, 55, 62, 67], [34, 57, 62, 65], [33, 57, 62, 65], [43, 58, 62, 64], [45, 55, 61, 64]],
  b: [[41, 57, 60, 65], [40, 55, 58, 64], [38, 57, 62, 65], [34, 58, 62, 65], [33, 57, 60, 65], [43, 58, 62, 65], [36, 58, 60, 64], [41, 57, 60, 65]],
  c: [[43, 58, 62, 67], [41, 57, 62, 65], [39, 58, 63, 67], [45, 57, 61, 67], [34, 58, 62, 67], [33, 57, 62, 65], [45, 55, 61, 64], [38, 57, 62, 65]],
}

const SONG: Record<Section, readonly (readonly Beat[])[]> = {
  a: [
    [[1, 69, 0.5], [1.5, 74, 0.5], [2, 77, 1]], [[0, 76, 2], [2, 73, 0.5], [2.5, 76, 0.5]], [[0, 81, 1.5], [1.5, 79, 0.5], [2, 77, 1]], [[0, 74, 2]],
    [[1, 77, 0.5], [1.5, 76, 0.5], [2, 74, 1]], [[0, 69, 2], [2, 74, 1]], [[0, 70, 1], [1, 74, 1], [2, 79, 1]], [[0, 76, 1.5], [1.5, 73, 0.5], [2, 69, 0.6]],
  ],
  b: [
    [[0, 72, 1], [1, 77, 1], [2, 81, 1]], [[0, 79, 2], [2, 76, 1]], [[0, 77, 1.5], [1.5, 76, 0.5], [2, 74, 1]], [[0, 70, 2], [2, 74, 1]],
    [[0, 72, 1], [1, 77, 1], [2, 72, 1]], [[0, 74, 1.5], [1.5, 72, 0.5], [2, 70, 1]], [[0, 67, 1], [1, 70, 0.5], [1.5, 74, 0.5], [2, 76, 1]], [[0, 77, 2]],
  ],
  c: [
    [[0, 67, 0.5], [1, 70, 0.5], [2, 74, 0.5]], [[0, 77, 2], [2, 74, 1]], [[0, 75, 1.5], [1.5, 74, 0.5], [2, 70, 1]], [[0, 73, 2]],
    [[0, 74, 0.5], [1, 79, 0.5], [2, 82, 0.5]], [[0, 81, 2], [2, 77, 1]], [[0, 76, 1], [1, 73, 1], [2, 76, 1]], [[0, 74, 2.5]],
  ],
}

const bass = (s: Section): Beat[][] => CHORDS[s].map(([b], i) => i === 7 && s === 'b' ? [[0, b, 1.6], [2, 45, 0.8]] : [[0, b, 2.2]])
// The last beat of the middle leans on the dominant, so the tune falls back home.
const pluck = (s: Section): Beat[][] => CHORDS[s].map(([, l, m, h], i) => {
  const [x, y, z] = i === 7 && s === 'b' ? [57, 61, 67] : [l, m, h]
  return [[1, l, 0.5], [1, m, 0.5], [1, h, 0.5], [2, x, 0.5], [2, y, 0.5], [2, z, 0.5]]
})
const answer = (s: Section): Beat[][] => CHORDS[s].map(([, l, m, h], i) => i % 2 === 0 ? [] : [[1, l + 24, 0.5], [1.5, m + 24, 0.5], [2, h + 24, 0.5], [2.5, m + 24, 0.5]])

const played = (lines: (s: Section) => readonly (readonly Beat[])[], gain: number, held?: number) => ({
  a: bars(lines('a'), IN_BAR, BEAT, gain, held), b: bars(lines('b'), IN_BAR, BEAT, gain, held), c: bars(lines('c'), IN_BAR, BEAT, gain, held),
})

export const SCORE: Score = {
  sectionSec: 8 * IN_BAR * BEAT,
  form: ['a', 'b', 'a', 'c', 'b', 'a', null],
  stems: {
    ground: [
      { patch: patch('string-bass', 'Round upright', [room(0.12, 0.35)]), gainDb: 0, notes: played(bass, 0.62) },
      { patch: patch('acoustic-guitar', 'Nylon pizzicato', [room(0.2, 0.4)]), gainDb: 4, notes: played(pluck, 0.42) },
    ],
    song: [{ patch: patch('clarinet', 'Warm clarinet', [room(0.24, 0.5)]), gainDb: 0, notes: played((s) => SONG[s], 0.6) }],
    spark: [{ patch: patch('mallets', 'Celesta', [room(0.3, 0.6)]), gainDb: 3, notes: played(answer, 0.4) }],
  },
}
