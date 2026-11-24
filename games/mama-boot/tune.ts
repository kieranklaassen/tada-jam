import { bars, patch, room, type Beat, type Score, type Section } from './score'

// A rocking tune for a farmyard: a nylon guitar turning over under a wooden recorder, a soft bass, and a glockenspiel
// that answers where the recorder takes a breath. G major, in six.

const EIGHTH = 60 / 66 / 3
const IN_BAR = 6

/** The bass of a bar and the three notes the guitar turns over. */
type Chord = readonly [bass: number, low: number, mid: number, high: number]

const CHORDS: Record<Section, readonly Chord[]> = {
  a: [[43, 55, 59, 62], [42, 57, 62, 66], [40, 55, 59, 64], [48, 55, 60, 64], [47, 55, 62, 67], [48, 55, 60, 64], [45, 55, 60, 64], [50, 57, 60, 66]],
  b: [[48, 55, 60, 64], [47, 55, 62, 67], [45, 57, 60, 64], [40, 55, 59, 64], [48, 55, 60, 64], [50, 55, 59, 62], [45, 55, 61, 64], [50, 57, 60, 66]],
  c: [[40, 55, 59, 64], [47, 54, 59, 62], [48, 55, 60, 64], [43, 55, 59, 62], [45, 57, 60, 64], [47, 55, 59, 62], [48, 55, 60, 64], [43, 55, 59, 62]],
}

const SONG: Record<Section, readonly (readonly Beat[])[]> = {
  a: [
    [[0, 74, 2], [2, 76, 1], [3, 74, 2], [5, 71, 1]], [[0, 69, 3], [3, 74, 3]], [[0, 79, 2], [2, 78, 1], [3, 76, 2], [5, 74, 1]], [[0, 76, 3.5]],
    [[0, 74, 2], [2, 76, 1], [3, 79, 2], [5, 83, 1]], [[0, 81, 2], [2, 79, 1], [3, 76, 3]], [[0, 79, 2], [2, 76, 1], [3, 72, 2], [5, 76, 1]], [[0, 74, 4]],
  ],
  b: [
    [[0, 76, 2], [2, 79, 1], [3, 79, 3]], [[0, 74, 2], [2, 79, 1], [3, 83, 3]], [[0, 81, 2], [2, 79, 1], [3, 76, 3]], [[0, 71, 2], [2, 76, 1], [3, 79, 3]],
    [[0, 76, 2], [2, 79, 1], [3, 81, 2], [5, 79, 1]], [[0, 83, 3], [3, 79, 3]], [[0, 81, 2], [2, 79, 1], [3, 76, 2], [5, 73, 1]], [[0, 74, 4]],
  ],
  c: [
    [[0, 71, 3], [3, 76, 3]], [[0, 78, 3], [3, 74, 3]], [[0, 76, 2], [2, 78, 1], [3, 79, 3]], [[0, 74, 4]],
    [[0, 72, 2], [2, 74, 1], [3, 76, 3]], [[0, 74, 2], [2, 76, 1], [3, 79, 3]], [[0, 81, 2], [2, 79, 1], [3, 78, 2], [5, 81, 1]], [[0, 79, 4]],
  ],
}

// The last bar but one of the soft section goes from C to D in its middle, so the tune can close.
const turn = (s: Section, i: number) => s === 'c' && i === 6
const bass = (s: Section): Beat[][] => CHORDS[s].map(([b], i) => turn(s, i) ? [[0, b - 12, 2.8], [3, 38, 2.8]] : [[0, b > 45 ? b - 12 : b, 5]])
const pattern = (s: Section): Beat[][] => CHORDS[s].map(([b, l, m, h], i) => {
  const [x, y, z] = turn(s, i) ? [66, 62, 57] : [h, m, l]
  return [[0, b, 5], [1, l, 4], [2, m, 3], [3, x, 3], [4, y, 2], [5, z, 1]]
})
const answer = (s: Section): Beat[][] => CHORDS[s].map(([, l, m, h], i) => i === 3 || i === 7 ? [[3, l + 24, 1], [4, m + 24, 1], [5, h + 24, 1]] : i % 2 === 1 ? [[2, m + 24, 1], [5, h + 24, 1]] : [])

const played = (lines: (s: Section) => readonly (readonly Beat[])[], gain: number, held?: number) => ({
  a: bars(lines('a'), IN_BAR, EIGHTH, gain, held), b: bars(lines('b'), IN_BAR, EIGHTH, gain, held), c: bars(lines('c'), IN_BAR, EIGHTH, gain, held),
})

export const SCORE: Score = {
  sectionSec: 8 * IN_BAR * EIGHTH,
  form: ['a', 'b', 'a', 'c', null],
  stems: {
    ground: [
      { patch: patch('acoustic-guitar', 'Nylon dusk', [room(0.2, 0.5)]), gainDb: 4, notes: played(pattern, 0.4, 1) },
      { patch: patch('string-bass', 'Dark soft upright', [room(0.1, 0.4)]), gainDb: -1, notes: played(bass, 0.5) },
    ],
    song: [{ patch: patch('flute', 'Soft recorder', [room(0.26, 0.55)]), gainDb: -5, notes: played((s) => SONG[s], 0.5) }],
    spark: [{ patch: patch('mallets', 'Glockenspiel', [room(0.32, 0.6)]), gainDb: 5, notes: played(answer, 0.3) }],
  },
}
