import { beforeEach, describe, expect, it, vi } from 'vitest'
import { noise, tone } from './audio'
import { GAIN_RANGE, PITCH_RANGE, VOICES, VOICE_NAMES, lengthOf, variant, voiceOf, type Note, type VoiceName, type VoiceSpec } from './voices'

// The building blocks are held by audio.test.ts. Here they only record what a voice asks of them.
vi.mock('./audio', () => ({ tone: vi.fn(), noise: vi.fn() }))

// Nobody who builds this game can hear it. These ranges stand in for the ear:
// a voice that leaves them is too shrill, too loud, too long or too thick for
// a small speaker in a child's hands.
const LOWEST_HZ = 40
const HIGHEST_HZ = 6000
const LOUDEST_PEAK = 0.3
const SHORTEST_ATTACK = 0.002
const SHORTEST_VOICE = 0.03
const LONGEST_VOICE = 0.6
const MOST_NOTES = 6
const LOUDEST_AT_ONCE = 0.5
/** A small speaker carries little under this, so every voice has a note that starts at or above it. */
const SPEAKER_FLOOR_HZ = 150
/** The push into dough repeats along a drag, so it is held tighter than the rest. */
const SQUISH_LONGEST = 0.2
const SQUISH_LOUDEST = 0.2

const NAMED: readonly string[] = [
  'flour-hiss', 'dry-scrape', 'gurgle', 'plip', 'glug', 'slap-ripple', 'wet-clod', 'sticky-smack', 'dull-flop', 'tear', 'dough-slap', 'squish',
  'stretch-rise', 'gather-pat', 'flour-whump', 'water-drips',
  'bench-knock', 'peel-knock', 'wall-tick', 'loaf-knock', 'frost-tinkle', 'sack-rustle', 'jug-clink', 'fire-crackle', 'fire-whoosh',
  'badger-sneeze', 'badger-grumble', 'badger-chuckle', 'badger-slurp', 'badger-hm', 'goat-tock', 'goat-bleat', 'goat-snort',
  'sparrow-chirp', 'sparrow-cheep', 'sparrow-flutter',
]

const all: [VoiceName, VoiceSpec][] = VOICE_NAMES.map((name) => [name, VOICES[name]])
const endOf = (note: Note): number => note.at + note.attack + note.decay
/** The most the peaks add up to at any instant. Notes only ever start, so the most is reached where one starts. */
const loudestAtOnce = (spec: VoiceSpec): number =>
  Math.max(...spec.map((from) => spec.filter((note) => note.at <= from.at && from.at < endOf(note)).reduce((sum, note) => sum + note.peak, 0)))

describe('the table of voices', () => {
  it('holds every voice the game names, and lists its own keys', () => {
    expect([...VOICE_NAMES].sort()).toEqual([...NAMED].sort())
    expect([...VOICE_NAMES]).toEqual(Object.keys(VOICES))
  })

  it.each(all)('%s stays inside what a small speaker and a small ear can take', (_, spec) => {
    expect(spec.length).toBeGreaterThan(0)
    expect(spec.length).toBeLessThanOrEqual(MOST_NOTES)
    for (const note of spec) {
      for (const hz of note.glideTo === undefined ? [note.frequency] : [note.frequency, note.glideTo]) {
        expect(hz).toBeGreaterThanOrEqual(LOWEST_HZ)
        expect(hz).toBeLessThanOrEqual(HIGHEST_HZ)
      }
      expect(note.peak).toBeGreaterThan(0)
      expect(note.peak).toBeLessThanOrEqual(LOUDEST_PEAK)
      expect(note.attack).toBeGreaterThanOrEqual(SHORTEST_ATTACK)
      expect(note.decay).toBeGreaterThan(0)
      expect(note.at).toBeGreaterThanOrEqual(0)
      if (note.kind === 'noise') expect(note.q).toBeGreaterThan(0)
    }
    expect(lengthOf(spec)).toBeGreaterThanOrEqual(SHORTEST_VOICE)
    expect(lengthOf(spec)).toBeLessThanOrEqual(LONGEST_VOICE)
    expect(loudestAtOnce(spec)).toBeLessThanOrEqual(LOUDEST_AT_ONCE)
    expect(Math.max(...spec.map((note) => note.frequency))).toBeGreaterThanOrEqual(SPEAKER_FLOOR_HZ)
  })

  it('starts every voice at once: the answer to a touch is not late', () => {
    for (const [name, spec] of all) expect(Math.min(...spec.map((note) => note.at)), name).toBe(0)
  })

  it('keeps the squish short and quiet, because it repeats along every drag', () => {
    expect(lengthOf(VOICES.squish)).toBeLessThanOrEqual(SQUISH_LONGEST)
    expect(Math.max(...VOICES.squish.map((note) => note.peak))).toBeLessThanOrEqual(SQUISH_LOUDEST)
  })

  it('gives no two voices the same first note', () => {
    const first = all.map(([, spec]) => JSON.stringify(spec[0]))
    expect(new Set(first).size).toBe(all.length)
  })

  it('tells the animals apart by how high they speak: the badger under the goat, the goat under the sparrows', () => {
    const tones = (prefix: string): number[] =>
      all.filter(([name]) => name.startsWith(prefix)).flatMap(([, spec]) => spec.filter((note) => note.kind === 'tone').map((note) => note.frequency))
    expect(Math.max(...tones('badger-'))).toBeLessThan(Math.min(...tones('goat-')))
    expect(Math.max(...tones('goat-'))).toBeLessThan(Math.min(...tones('sparrow-')))
  })

  it('measures a voice to the end of its last note', () => {
    expect(lengthOf([])).toBe(0)
    expect(lengthOf([{ kind: 'noise', at: 0, frequency: 500, q: 1, peak: 0.1, attack: 0.01, decay: 0.4 }, { kind: 'tone', at: 0.2, frequency: 500, wave: 'sine', peak: 0.1, attack: 0.01, decay: 0.09 }])).toBeCloseTo(0.41)
    expect(lengthOf(VOICES.plip)).toBeCloseTo(0.079)
  })
})

describe('the bridge to the speaker', () => {
  const context = {} as AudioContext
  const out = {} as AudioNode
  const toneCalls = (): unknown[][] => vi.mocked(tone).mock.calls
  const noiseCalls = (): unknown[][] => vi.mocked(noise).mock.calls

  beforeEach(() => {
    vi.mocked(tone).mockClear()
    vi.mocked(noise).mockClear()
  })

  /** What `tone` or `noise` must be handed for a note, in the order audio.ts takes it. */
  const asked = (note: Note, at: number, pitch: number, gain: number): unknown[] =>
    [context, out, at + note.at, note.frequency * pitch, note.kind === 'tone' ? note.wave : note.q, note.peak * gain, note.attack, note.decay, note.glideTo === undefined ? undefined : note.glideTo * pitch]

  it.each(all)('%s plays exactly its notes, each at its own moment', (name, spec) => {
    voiceOf(name)(context, out, 2)
    expect(toneCalls()).toEqual(spec.filter((note) => note.kind === 'tone').map((note) => asked(note, 2, 1, 1)))
    expect(noiseCalls()).toEqual(spec.filter((note) => note.kind === 'noise').map((note) => asked(note, 2, 1, 1)))
  })

  it('plays nothing until the voice is called, and the same again on every call', () => {
    const voice = voiceOf('squish')
    expect(toneCalls().length + noiseCalls().length).toBe(0)
    voice(context, out, 0)
    voice(context, out, 1)
    expect(toneCalls().length + noiseCalls().length).toBe(2 * VOICES.squish.length)
  })

  it('moves every frequency by the pitch and every peak by the gain, and leaves the timing alone', () => {
    for (const name of ['squish', 'gurgle', 'badger-sneeze', 'jug-clink'] as const) {
      vi.mocked(tone).mockClear()
      vi.mocked(noise).mockClear()
      voiceOf(name, 1.1, 0.8)(context, out, 5)
      const spec: VoiceSpec = VOICES[name]
      expect(toneCalls()).toEqual(spec.filter((note) => note.kind === 'tone').map((note) => asked(note, 5, 1.1, 0.8)))
      expect(noiseCalls()).toEqual(spec.filter((note) => note.kind === 'noise').map((note) => asked(note, 5, 1.1, 0.8)))
    }
  })

  it('never hands the speaker a number it would throw on, whatever the game passes', () => {
    const [low, high] = PITCH_RANGE
    for (const [pitch, gain] of [[0, 1], [-3, -1], [NaN, NaN], [Infinity, Infinity], [1000, 1000]]) {
      vi.mocked(tone).mockClear()
      vi.mocked(noise).mockClear()
      voiceOf('gurgle', pitch, gain)(context, out, 0)
      for (const call of [...toneCalls(), ...noiseCalls()]) {
        const [, , at, frequency, , peak, , , glideTo] = call as number[]
        expect(Number.isFinite(at)).toBe(true)
        for (const hz of glideTo === undefined ? [frequency] : [frequency, glideTo]) {
          expect(hz).toBeGreaterThanOrEqual(LOWEST_HZ * low)
          expect(hz).toBeLessThanOrEqual(HIGHEST_HZ * high)
        }
        expect(peak).toBeGreaterThanOrEqual(0)
        expect(peak).toBeLessThanOrEqual(LOUDEST_PEAK * GAIN_RANGE[1])
      }
    }
  })
})

describe('the variants of a repeated voice', () => {
  const counts = Array.from({ length: 60 }, (_, i) => i - 20)

  it('are the same for the same count, every time', () => {
    for (const n of counts) expect(variant(n)).toEqual(variant(n))
    expect(counts.map(variant)).toEqual(counts.map(variant))
  })

  it('stay near the voice as written: a little higher or lower, never louder', () => {
    for (const n of counts) {
      const { pitch, gain } = variant(n)
      expect(pitch).toBeGreaterThanOrEqual(0.88)
      expect(pitch).toBeLessThanOrEqual(1.14)
      expect(gain).toBeGreaterThanOrEqual(0.8)
      expect(gain).toBeLessThanOrEqual(1)
    }
  })

  it('never give the same pair twice in a row, so a repeat is not a stamp', () => {
    for (const n of counts) expect(variant(n + 1), `${n}`).not.toEqual(variant(n))
    expect(new Set(counts.map((n) => variant(n).pitch)).size).toBeGreaterThanOrEqual(5)
  })

  it('answer a count that is not a whole number, or not a number, without throwing', () => {
    expect(variant(2.7)).toEqual(variant(2))
    expect(variant(-0.5)).toEqual(variant(-1))
    expect(variant(NaN)).toEqual(variant(0))
    expect(variant(Infinity)).toEqual(variant(0))
  })

  it('hand out a fresh pair, so a caller that changes one does not change the table', () => {
    const first = variant(3)
    first.pitch = 9
    expect(variant(3).pitch).not.toBe(9)
  })
})
