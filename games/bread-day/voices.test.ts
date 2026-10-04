import { beforeEach, describe, expect, it, vi } from 'vitest'
import { noise, tone } from './audio'
import { ACTS, GRID, WHATS } from './grid'
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

/** A footfall, hop or wingbeat repeats as an animal walks up, so it is held shorter and quieter than anything else. */
const STEP_LONGEST = 0.08
const STEP_LOUDEST = 0.1

/** The eight customers, from the lowest voice to the highest, and what each of them can say. */
const ANIMALS = ['bear', 'goat', 'crow', 'duck', 'dachshund', 'hen', 'mole', 'sparrows'] as const
const SAYS = ['yes', 'no', 'huh', 'step'] as const
const GRID_VOICES: readonly string[] = WHATS.flatMap((what) => ACTS.map((act) => GRID[what][act].voice))

const NAMED: readonly string[] = [
  ...GRID_VOICES,
  ...ANIMALS.flatMap((animal) => SAYS.map((say) => `${animal}-${say}`)),
  'chick-peep', 'door-clang', 'door-rattle', 'jar-clink', 'peel-slide', 'peel-set', 'rack-set', 'badger-eat', 'badger-cough',
  'stretch-rise', 'gather-pat', 'flour-whump', 'water-drips',
  'bench-knock', 'peel-knock', 'wall-tick', 'loaf-knock', 'frost-tinkle', 'sack-rustle', 'jug-clink', 'fire-crackle', 'fire-whoosh',
  'badger-sneeze', 'badger-grumble', 'badger-chuckle', 'badger-slurp', 'badger-hm', 'goat-tock', 'goat-bleat', 'goat-snort',
  'sparrow-chirp', 'sparrow-cheep', 'sparrow-flutter',
]

const all: [VoiceName, VoiceSpec][] = VOICE_NAMES.map((name) => [name, VOICES[name]])
const table: Record<string, VoiceSpec> = VOICES
/** The loudest note of a voice, the first of them where two are as loud: where it sits is the register of the voice. */
const loudest = (spec: VoiceSpec): Note => spec.reduce((most, note) => (note.peak > most.peak ? note : most))

type Tone = Extract<Note, { kind: 'tone' }>
const semitones = (from: number, to: number): number => Math.round(12 * Math.log2(to / from))
/** A major chord climbed one note at a time, from any of its three notes: major third then minor third, minor third then fourth, fourth then major third. */
const MAJOR_CLIMBS: readonly (readonly [number, number])[] = [[4, 3], [3, 5], [5, 4]]
/**
 * Whether a voice holds the shape of a reward jingle: three tones, each starting after the one before (so one after
 * another, not a chord), each higher, that spell a major chord to the nearest semitone. Any three count, not only
 * neighbours, so a four-note or five-note climb is caught by the three inside it. It is asked twice, of where each
 * tone starts and of where it lands, because a glide is heard as the note it arrives at.
 */
function jingles(spec: VoiceSpec): boolean {
  const tones = spec.filter((note): note is Tone => note.kind === 'tone')
  return [(note: Tone) => note.frequency, (note: Tone) => note.glideTo ?? note.frequency].some((pitch) =>
    tones.some((a) => tones.some((b) => tones.some((c) =>
      a.at < b.at && b.at < c.at && MAJOR_CLIMBS.some(([first, second]) => semitones(pitch(a), pitch(b)) === first && semitones(pitch(b), pitch(c)) === second)))))
}
const endOf = (note: Note): number => note.at + note.attack + note.decay
/** The most the peaks add up to at any instant. Notes only ever start, so the most is reached where one starts. */
const loudestAtOnce = (spec: VoiceSpec): number =>
  Math.max(...spec.map((from) => spec.filter((note) => note.at <= from.at && from.at < endOf(note)).reduce((sum, note) => sum + note.peak, 0)))

describe('the table of voices', () => {
  it('holds every voice the game names, and lists its own keys', () => {
    for (const name of ['flour-hiss', 'dry-scrape', 'gurgle', 'plip', 'glug', 'slap-ripple', 'wet-clod', 'sticky-smack', 'dull-flop', 'tear', 'dough-slap', 'squish']) expect(GRID_VOICES, name).toContain(name)
    expect(new Set(NAMED).size).toBe(NAMED.length)
    expect([...VOICE_NAMES].sort()).toEqual([...NAMED].sort())
    expect([...VOICE_NAMES]).toEqual(Object.keys(VOICES))
  })

  it('has a voice for every cell of the grid: no act on any thing is answered in silence', () => {
    expect(GRID_VOICES.length).toBe(WHATS.length * ACTS.length)
    for (const what of WHATS) for (const act of ACTS) expect(Object.keys(VOICES), `${what} ${act}`).toContain(GRID[what][act].voice)
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
    expect(Math.max(...tones('goat-'))).toBeLessThan(Math.min(...tones('sparrow')))
  })

  it('never plays a reward: no voice climbs a major chord, so nothing says well done', () => {
    const climb = (...hz: number[]): VoiceSpec => hz.map((frequency, i) => ({ kind: 'tone', at: i * 0.1, frequency, wave: 'sine', peak: 0.1, attack: 0.01, decay: 0.08 }))
    // The check itself: it hears a jingle in each turn of the chord, in a longer climb, and in glides that land on one.
    expect(jingles(climb(262, 330, 392))).toBe(true)
    expect(jingles(climb(330, 392, 523))).toBe(true)
    expect(jingles(climb(392, 523, 659))).toBe(true)
    expect(jingles(climb(262, 294, 330, 392, 523))).toBe(true)
    expect(jingles(climb(200, 200, 200).map((note, i) => ({ ...note, glideTo: [262, 330, 392][i] })))).toBe(true)
    // And not in a fall, a minor climb, a chord struck at once, or noise.
    expect(jingles(climb(392, 330, 262))).toBe(false)
    expect(jingles(climb(262, 311, 392))).toBe(false)
    expect(jingles(climb(262, 330, 392).map((note) => ({ ...note, at: 0 })))).toBe(false)
    expect(jingles(climb(262, 330, 392).map((note) => ({ kind: 'noise', at: note.at, frequency: note.frequency, q: 2, peak: 0.1, attack: 0.01, decay: 0.08 })))).toBe(false)
    for (const [name, spec] of all) expect(jingles(spec), name).toBe(false)
  })
})

describe('the customers', () => {
  const said = (animal: string, say: string): VoiceSpec => table[`${animal}-${say}`]

  it('each have the same four things to say', () => {
    for (const animal of ANIMALS) for (const say of SAYS) expect(said(animal, say), `${animal}-${say}`).toBeDefined()
    expect(table['chick-peep']).toBeDefined()
  })

  it.each(['yes', 'no', 'huh'])('say "%s" each in a register of their own, from the bear up to the sparrows', (say) => {
    const first = ANIMALS.map((animal) => JSON.stringify(said(animal, say)[0]))
    expect(new Set(first).size).toBe(ANIMALS.length)
    const registers = ANIMALS.map((animal) => loudest(said(animal, say)).frequency)
    for (let i = 1; i < registers.length; i++) expect(registers[i], `${ANIMALS[i]} over ${ANIMALS[i - 1]}`).toBeGreaterThan(registers[i - 1])
  })

  it('keep to their own register whatever they say: no animal reaches into the next one', () => {
    const registers = ANIMALS.map((animal) => ['yes', 'no', 'huh'].map((say) => loudest(said(animal, say)).frequency))
    for (let i = 1; i < registers.length; i++) expect(Math.min(...registers[i]), `${ANIMALS[i]} over ${ANIMALS[i - 1]}`).toBeGreaterThan(Math.max(...registers[i - 1]))
  })

  it('each have a timbre of their own, so two that sit near each other still differ', () => {
    // The wave of the loudest note, and whether a band of noise (breath, or roughness) goes with every word.
    const timbre: Record<(typeof ANIMALS)[number], [OscillatorType, boolean]> = {
      bear: ['sine', false], goat: ['sawtooth', false], crow: ['sawtooth', true], duck: ['square', false],
      dachshund: ['triangle', false], hen: ['triangle', false], mole: ['sine', true], sparrows: ['sine', false],
    }
    for (const animal of ANIMALS) for (const say of ['yes', 'no', 'huh']) {
      const spec = said(animal, say)
      const top = loudest(spec)
      expect(top.kind === 'tone' && top.wave, `${animal}-${say}`).toBe(timbre[animal][0])
      if (timbre[animal][1]) expect(spec.some((note) => note.kind === 'noise'), `${animal}-${say}`).toBe(true)
    }
    // The two triangles are told apart by what they do: the hen says a thing more than once, the dachshund's yap flicks up.
    for (const say of ['yes', 'no', 'huh']) expect(said('hen', say).length, say).toBeGreaterThanOrEqual(2)
    expect(said('dachshund', 'yes').every((note) => note.kind === 'noise' || (note.glideTo ?? 0) > note.frequency)).toBe(true)
  })

  it('say no by falling and ask by rising', () => {
    const last = (spec: VoiceSpec): Tone => spec.filter((note): note is Tone => note.kind === 'tone').reduce((latest, note) => (note.at >= latest.at ? note : latest))
    for (const animal of ANIMALS) {
      expect(last(said(animal, 'no')).glideTo ?? Infinity, `${animal}-no`).toBeLessThan(last(said(animal, 'no')).frequency)
      expect(last(said(animal, 'huh')).glideTo ?? 0, `${animal}-huh`).toBeGreaterThan(last(said(animal, 'huh')).frequency)
    }
  })

  it('step lightly: every step is very short and quiet, because it repeats', () => {
    const steps = all.filter(([name]) => name.endsWith('-step'))
    expect(steps.length).toBe(ANIMALS.length)
    for (const [name, spec] of steps) {
      expect(lengthOf(spec), name).toBeLessThan(STEP_LONGEST)
      expect(Math.max(...spec.map((note) => note.peak)), name).toBeLessThanOrEqual(STEP_LOUDEST)
    }
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
