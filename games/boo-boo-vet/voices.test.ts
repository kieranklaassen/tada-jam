import { describe, expect, it } from 'vitest'
import { CAST, SPECIES, type Species } from './cast'
import { GIVEN, GRID, type Given } from './grid'
import { CARES, FITS, NEEDS, type Need } from './needs'
import { ALL_VOICES, call, carrier, cellVoice, drops, lamp, land, peel, rest, secret, showing, signVoice, squeak, steps, tap, well, whoosh, type Mood, type Note, type Notes } from './voices'

// The ranges every voice is held to. Nobody could listen while these were
// written, so the numbers are the only guard against a voice that is too
// loud, too long, too low for a small speaker or too high to be kind.
const NOTES_MIN = 1
const NOTES_MAX = 8
const PITCH_MIN = 60
const PITCH_MAX = 6000
const PEAK_MAX = 0.2
const ATTACK_MIN = 0.001
const ATTACK_MAX = 0.08
const LENGTH_MIN = 0.02
const LENGTH_MAX = 0.6
const LAST_START_MAX = 1.4
const VOICE_END_MAX = 2
/** The peaks of the notes that sound at one moment, added up, stay under this. */
const TOGETHER_MAX = 0.35
/** An ordinary touch tops out about here. */
const TOUCH_PEAK_MAX = 0.13
/** A landing or a glad call may reach this. */
const BIG_PEAK_MAX = 0.18
const WHOLE_TONE = 2 ** (2 / 12)
const STEP_CAP = 8
const DROP_CAP = 6

// The game's voices, on top of the toy's.
/** A cell of the grid is over by here, */
const CELL_END_MAX = 1.4
/** but for the one slow cell, the basket given to the one that hides: a hush, slow breaths, a yawn. */
const SLOW_CELL: readonly [Given, Need] = ['basket', 'scared']
const SLOW_CELL_END_MAX = 1.9
/** A sign's own sound: its top note at each step, how many notes, and how long. */
const SIGN_PEAK_MAX = [0.07, 0.085, 0.1] as const
const SIGN_NOTES_MIN = 2
const SIGN_NOTES_MAX = 5
const SIGN_END_MAX = 1
/** The mouse is tiny: no note of it is louder or lower than this. */
const MOUSE_PEAK_MAX = 0.07
const MOUSE_PITCH_MIN = 400
/** The cells in which the animal's own voice is heard, in its pitch and timbre, as in `call`. */
const VOICED_CELLS: readonly (readonly [Given, Need])[] = [
  ['plaster', 'thirsty'], // a "bleh"
  ['blanket', 'sore'], // a questioning hum
  ['blanket', 'cold'], // the hum the chatter fades into
  ['brush', 'sore'], // one "eep"
  ['brush', 'itchy'], // a purr
  ['bowl', 'thirsty'], // gulps and a hiccup
  ['basket', 'thirsty'], // a sigh
  ['basket', 'scared'], // a yawn
  ['hand', 'sore'], // a soft hum
]
/** The cells in which the animal is heard without its voice: its feet, its breath, its teeth, its tongue. */
const BODY_CELLS: readonly (readonly [Given, Need])[] = [
  ['plaster', 'sore'], // two stamps
  ['plaster', 'scared'], // a sniff
  ['blanket', 'itchy'], // muffled thumps
  ['blanket', 'thirsty'], // panting
  ['brush', 'cold'], // chatter
  ['bowl', 'cold'], // a lap
  ['bowl', 'scared'], // one lap
  ['basket', 'sore'], // three steps
  ['hand', 'cold'], // chatter
  ['hand', 'itchy'], // quick thumps
  ['hand', 'thirsty'], // a lick
  ['hand', 'scared'], // a sniff, soft steps
]
/** The cells in which only the thing is heard: the same for every animal. */
const THING_CELLS: readonly (readonly [Given, Need])[] = [
  ['plaster', 'cold'], // a papery flutter
  ['plaster', 'itchy'], // a stretchy creak, a pop
  ['blanket', 'scared'], // a rustle that does not stop
  ['brush', 'thirsty'], // strokes that sink
  ['brush', 'scared'], // one stroke, then quiet
  ['bowl', 'sore'], // a plop, drips
  ['bowl', 'itchy'], // a splash, a spraying shake
  ['basket', 'cold'], // a rattling wicker walk
  ['basket', 'itchy'], // creak, creak, a whirr
]
const SIGN_STEPS = [0, 1, 2] as const
const SECRETS = ['den', 'foam', 'boat', 'crackle', 'patch'] as const
const CARRIERS = ['blink', 'open', 'slide'] as const
const LAMPS = ['dim', 'bright'] as const

const MOODS: readonly Mood[] = ['glad', 'wow', 'bliss', 'wary', 'hum']
const VARIANTS = [0, 1, 2]
/** The six animals from the smallest to the biggest. */
const SMALL_TO_BIG: Species[] = [...SPECIES].sort((a, b) => CAST[a].size - CAST[b].size)

const end = (note: Note): number => note.at + note.attack + note.length
const voiceEnd = (notes: Notes): number => Math.max(...notes.map(end))
const top = (notes: Notes): number => Math.max(...notes.map((note) => note.peak))
/** Where a note finishes in pitch. */
const lands = (note: Note): number => note.to ?? note.pitch
/** The most that sounds at one moment: it can only grow at the start of a note, so those moments are enough. */
const together = (notes: Notes): number =>
  Math.max(...notes.map((first) => notes.filter((note) => note.at <= first.at && first.at < end(note)).reduce((sum, note) => sum + note.peak, 0)))
/** The beats of a call: its notes grouped by the moment they start, the leading note of each first. */
const beats = (notes: Notes): Note[] => notes.filter((note, i) => notes.findIndex((other) => other.at === note.at) === i)

describe('every voice', () => {
  const all = ALL_VOICES()

  it('is there for every argument, each under a name of its own', () => {
    const toy = CARES.length * 3 + CARES.length + CARES.length * SPECIES.length + CARES.length + SPECIES.length * MOODS.length * 3 + 3 + SPECIES.length * STEP_CAP + 1 + DROP_CAP
    const game = GIVEN.length * NEEDS.length * SPECIES.length + NEEDS.length * SPECIES.length * 3 + CARES.length + SECRETS.length + CARRIERS.length + LAMPS.length + SPECIES.length * NEEDS.length + 1 // and the cloth's rustle going on
    const expected = toy + game
    expect(all).toHaveLength(expected)
    expect(new Set(all.map((voice) => voice.name)).size).toBe(expected)
  })

  it.each(all.map((voice) => [voice.name, voice.notes] as const))('%s stays inside the ranges', (_, notes) => {
    expect(notes.length).toBeGreaterThanOrEqual(NOTES_MIN)
    expect(notes.length).toBeLessThanOrEqual(NOTES_MAX)
    for (const note of notes) {
      for (const value of [note.at, note.pitch, note.peak, note.attack, note.length]) expect(Number.isFinite(value)).toBe(true)
      expect(['tone', 'noise']).toContain(note.kind)
      expect(note.at).toBeGreaterThanOrEqual(0)
      expect(note.at).toBeLessThanOrEqual(LAST_START_MAX)
      expect(note.pitch).toBeGreaterThanOrEqual(PITCH_MIN)
      expect(note.pitch).toBeLessThanOrEqual(PITCH_MAX)
      if (note.to !== undefined) {
        expect(note.to).toBeGreaterThanOrEqual(PITCH_MIN)
        expect(note.to).toBeLessThanOrEqual(PITCH_MAX)
      }
      expect(note.peak).toBeGreaterThan(0)
      expect(note.peak).toBeLessThanOrEqual(PEAK_MAX)
      expect(note.attack).toBeGreaterThanOrEqual(ATTACK_MIN)
      expect(note.attack).toBeLessThanOrEqual(ATTACK_MAX)
      expect(note.length).toBeGreaterThanOrEqual(LENGTH_MIN)
      expect(note.length).toBeLessThanOrEqual(LENGTH_MAX)
      // A tone names its wave and a noise its band, and neither carries the other's.
      if (note.kind === 'tone') {
        expect(['sine', 'triangle', 'square', 'sawtooth']).toContain(note.wave)
        expect(note.q).toBeUndefined()
      } else {
        expect(note.q).toBeGreaterThan(0)
        expect(note.wave).toBeUndefined()
      }
    }
    expect(voiceEnd(notes)).toBeLessThanOrEqual(VOICE_END_MAX)
    expect(together(notes)).toBeLessThan(TOGETHER_MAX)
  })

  it('gives the same notes for the same arguments every time', () => {
    expect(ALL_VOICES()).toEqual(all)
    expect(call('cat', 'wow', 1)).toEqual(call('cat', 'wow', 1))
    expect(land('bowl', 'duck')).toEqual(land('bowl', 'duck'))
    expect(steps('dog', 5)).toEqual(steps('dog', 5))
    expect(cellVoice('bowl', 'thirsty', 'rabbit')).toEqual(cellVoice('bowl', 'thirsty', 'rabbit'))
    expect(signVoice('cold', 'cat', 1)).toEqual(signVoice('cold', 'cat', 1))
    expect(well('duck', 'scared')).toEqual(well('duck', 'scared'))
    expect(showing('basket')).toEqual(showing('basket'))
    expect(secret('foam')).toEqual(secret('foam'))
    expect(carrier('open')).toEqual(carrier('open'))
    expect(lamp('dim')).toEqual(lamp('dim'))
  })

  it('never hands out a list that a caller could change for the next one', () => {
    const first = land('brush', 'bear') as Note[]
    first[1].peak = 0.9
    first.pop()
    expect(land('brush', 'bear')).toEqual(ALL_VOICES().find((voice) => voice.name === 'land brush bear')!.notes)
    expect(top(land('brush', 'bear'))).toBeLessThanOrEqual(PEAK_MAX)
  })
})

describe('loudness', () => {
  it('of an ordinary touch is about 0.12 at its top', () => {
    const touches: Notes[] = [tap(), ...CARES.flatMap((care) => [...VARIANTS.map((v) => peel(care, v)), whoosh(care), rest(care)])]
    for (const notes of touches) expect(top(notes)).toBeLessThanOrEqual(TOUCH_PEAK_MAX)
    expect(top(tap())).toBeGreaterThanOrEqual(0.08)
    for (const care of CARES) expect(top(peel(care, 0))).toBeGreaterThanOrEqual(0.08)
  })

  it('of a landing and of a call stops at 0.18', () => {
    for (const care of CARES) for (const species of SPECIES) expect(top(land(care, species))).toBeLessThanOrEqual(BIG_PEAK_MAX)
    for (const species of SPECIES) for (const mood of MOODS) for (const v of VARIANTS) expect(together(call(species, mood, v))).toBeLessThanOrEqual(BIG_PEAK_MAX)
  })

  it('of a hum, a sigh and the mouse is under that of a glad call', () => {
    for (const species of SPECIES) {
      expect(top(call(species, 'hum', 0))).toBeLessThan(top(call(species, 'bliss', 0)))
      expect(top(call(species, 'bliss', 0))).toBeLessThan(top(call(species, 'glad', 0)))
    }
    for (const kind of ['duck', 'tidy', 'peek'] as const) expect(top(squeak(kind))).toBeLessThanOrEqual(0.07)
  })
})

describe('peel', () => {
  /** The pitch the corner pops free at. */
  const pop = (notes: Notes): number => notes.find((note) => note.kind === 'tone')!.pitch

  it('gives each of the five things a pitch a whole tone or more from every other, in any variant', () => {
    for (const a of CARES) for (const b of CARES) {
      if (a === b) continue
      for (const va of VARIANTS) for (const vb of VARIANTS) {
        const [low, high] = [pop(peel(a, va)), pop(peel(b, vb))].sort((x, y) => x - y)
        expect(high / low).toBeGreaterThanOrEqual(WHOLE_TONE)
      }
    }
  })

  it('has three variants that differ, a little', () => {
    for (const care of CARES) {
      const [a, b, c] = VARIANTS.map((v) => peel(care, v))
      expect(a).not.toEqual(b)
      expect(b).not.toEqual(c)
      expect(a).not.toEqual(c)
      const pops = [a, b, c].map(pop)
      expect(Math.max(...pops) / Math.min(...pops)).toBeLessThan(2 ** (1 / 12))
    }
  })

  it('takes any whole number as a variant', () => {
    expect(peel('bowl', 3)).toEqual(peel('bowl', 0))
    expect(peel('bowl', 7)).toEqual(peel('bowl', 1))
    expect(peel('bowl', -1)).toEqual(peel('bowl', 2))
  })
})

describe('whoosh and rest', () => {
  it('are short and light', () => {
    for (const care of CARES) {
      expect(voiceEnd(whoosh(care))).toBeLessThanOrEqual(0.2)
      expect(top(whoosh(care))).toBeLessThanOrEqual(0.06)
      expect(voiceEnd(rest(care))).toBeLessThanOrEqual(0.3)
      expect(top(rest(care))).toBeLessThanOrEqual(0.08)
    }
  })

  it('are not the same for any two things', () => {
    for (const voice of [whoosh, rest]) expect(new Set(CARES.map((care) => JSON.stringify(voice(care)))).size).toBe(CARES.length)
  })
})

describe('land', () => {
  it('thumps lower the bigger the animal, strictly, over the six, whatever lands', () => {
    for (const care of CARES) {
      const thumps = SMALL_TO_BIG.map((species) => land(care, species)[0])
      for (const note of thumps) expect(note.kind).toBe('tone')
      for (let i = 1; i < thumps.length; i++) expect(thumps[i].pitch).toBeLessThan(thumps[i - 1].pitch)
    }
  })

  it('is a low thump on the bear and a tick on the hedgehog', () => {
    const [bear] = land('plaster', 'bear')
    const [hedgehog] = land('plaster', 'hedgehog')
    expect(bear.pitch).toBeLessThan(120)
    expect(hedgehog.pitch).toBeGreaterThan(500)
    expect(hedgehog.length).toBeLessThan(0.06)
    expect(bear.length).toBeGreaterThan(hedgehog.length * 3)
    expect(bear.peak).toBeGreaterThan(hedgehog.peak)
  })

  it('sounds of what the thing is made of: the same on every animal, and different for every thing', () => {
    const material = (care: (typeof CARES)[number], species: Species): string => JSON.stringify(land(care, species).slice(1))
    for (const care of CARES) for (const species of SPECIES) expect(material(care, species)).toBe(material(care, 'bear'))
    expect(new Set(CARES.map((care) => material(care, 'bear'))).size).toBe(CARES.length)
    for (const care of CARES) expect(land(care, 'bear').length).toBeGreaterThan(1)
  })
})

describe('call', () => {
  it('starts lower the bigger the animal, in every mood and variant', () => {
    for (const mood of MOODS) for (const v of VARIANTS) {
      const firsts = SMALL_TO_BIG.map((species) => call(species, mood, v)[0].pitch)
      for (let i = 1; i < firsts.length; i++) expect(firsts[i]).toBeLessThan(firsts[i - 1])
    }
  })

  it('spans about two and a half octaves from the bear to the hedgehog', () => {
    const octaves = Math.log2(call('hedgehog', 'hum', 0)[0].pitch / call('bear', 'hum', 0)[0].pitch)
    expect(octaves).toBeGreaterThan(2.3)
    expect(octaves).toBeLessThan(2.7)
  })

  it('is two to five notes', () => {
    for (const species of SPECIES) for (const mood of MOODS) for (const v of VARIANTS) {
      const count = beats(call(species, mood, v)).length
      expect(count).toBeGreaterThanOrEqual(2)
      expect(count).toBeLessThanOrEqual(5)
    }
  })

  it('has three variants of every mood for every animal, no two the same', () => {
    for (const species of SPECIES) for (const mood of MOODS) {
      expect(new Set(VARIANTS.map((v) => JSON.stringify(call(species, mood, v)))).size).toBe(3)
      expect(call(species, mood, 4)).toEqual(call(species, mood, 1))
      expect(call(species, mood, -3)).toEqual(call(species, mood, 0))
    }
  })

  it('sounds like nobody else: no two animals share a timbre', () => {
    const timbre = (species: Species): string => {
      const notes = call(species, 'glad', 0)
      const first = notes.filter((note) => note.at === 0)
      return first.map((note) => `${note.kind} ${note.wave ?? note.q} ${(note.pitch / first[0].pitch).toFixed(2)}`).join(' + ')
    }
    expect(new Set(SPECIES.map(timbre)).size).toBe(SPECIES.length)
  })

  it('takes its time from the tempo: the bear\'s glad call is longer than the hedgehog\'s, and slower animals hold a note longer', () => {
    for (const v of VARIANTS) expect(voiceEnd(call('bear', 'glad', v))).toBeGreaterThan(voiceEnd(call('hedgehog', 'glad', v)) * 2)
    const slowToQuick = [...SPECIES].sort((a, b) => CAST[a].tempo - CAST[b].tempo)
    for (const mood of MOODS) {
      const gaps = slowToQuick.map((species) => beats(call(species, mood, 0))[1].at)
      for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeLessThan(gaps[i - 1])
    }
  })

  it('never runs one beat into the next', () => {
    for (const species of SPECIES) for (const mood of MOODS) for (const v of VARIANTS) {
      const leading = beats(call(species, mood, v))
      for (let i = 1; i < leading.length; i++) expect(end(leading[i - 1])).toBeLessThanOrEqual(leading[i].at)
    }
  })

  it('rises for glad: it ends higher than it starts, and never steps down', () => {
    for (const species of SPECIES) for (const v of VARIANTS) {
      const leading = beats(call(species, 'glad', v))
      const last = leading[leading.length - 1]
      expect(last.pitch).toBeGreaterThan(leading[0].pitch)
      expect(lands(last)).toBeGreaterThan(leading[0].pitch)
      for (let i = 1; i < leading.length; i++) expect(leading[i].pitch).toBeGreaterThan(leading[i - 1].pitch)
    }
  })

  it('jumps up and wobbles for wow', () => {
    for (const species of SPECIES) for (const v of VARIANTS) {
      const pitches = beats(call(species, 'wow', v)).map((note) => note.pitch)
      // The jump is a sixth or more, and after it the melody turns at least once.
      expect(pitches[1] / pitches[0]).toBeGreaterThanOrEqual(2 ** (9 / 12) * 0.99)
      const moves = pitches.slice(2).map((pitch, i) => Math.sign(pitch - pitches[i + 1]))
      expect(moves.length).toBeGreaterThanOrEqual(2)
      expect(new Set(moves).size).toBe(2)
    }
  })

  it('falls and then settles for bliss, slowly', () => {
    for (const species of SPECIES) for (const v of VARIANTS) {
      const leading = beats(call(species, 'bliss', v))
      expect(lands(leading[0])).toBeLessThan(leading[0].pitch)
      expect(leading[1].pitch).toBeLessThan(leading[0].pitch)
      const last = leading[leading.length - 1]
      // It comes to rest on the animal's own note, not below it.
      expect(lands(last)).toBeGreaterThanOrEqual(last.pitch)
      expect(lands(last)).toBeCloseTo(call(species, 'hum', 0)[0].pitch, 0)
      expect(voiceEnd(call(species, 'bliss', v))).toBeGreaterThan(voiceEnd(call(species, 'glad', 0)))
    }
  })

  it('asks for wary: it ends lower than its highest note, below where it began, and away from home', () => {
    for (const species of SPECIES) for (const v of VARIANTS) {
      const leading = beats(call(species, 'wary', v))
      const last = leading[leading.length - 1]
      const highest = Math.max(...leading.map((note) => note.pitch))
      expect(last.pitch).toBeLessThan(highest)
      expect(lands(last)).toBeLessThan(highest)
      expect(lands(last)).toBeLessThan(leading[0].pitch)
      // A question: the last note lifts, and stops short of the animal's own note.
      expect(lands(last)).toBeGreaterThan(last.pitch)
      const home = call(species, 'hum', 0)[0].pitch
      expect(Math.abs(Math.log2(lands(last) / home)) * 12).toBeGreaterThan(0.5)
      // Suspicious, never afraid: short, and no louder than a touch.
      expect(top(call(species, 'wary', v))).toBeLessThanOrEqual(TOUCH_PEAK_MAX)
    }
  })

  it('is two soft level notes for hum', () => {
    for (const species of SPECIES) for (const v of VARIANTS) {
      const notes = call(species, 'hum', v)
      expect(beats(notes)).toHaveLength(2)
      for (const note of notes) expect(note.to).toBeUndefined()
    }
  })
})

describe('squeak', () => {
  it('is tiny and high, and different for each thing the mouse does', () => {
    const kinds = ['duck', 'tidy', 'peek'] as const
    for (const kind of kinds) {
      const notes = squeak(kind)
      for (const note of notes) expect(note.pitch).toBeGreaterThanOrEqual(1500)
      expect(voiceEnd(notes)).toBeLessThanOrEqual(0.25)
    }
    expect(new Set(kinds.map((kind) => JSON.stringify(squeak(kind)))).size).toBe(3)
    // It ducks downwards and peeks upwards.
    expect(lands(squeak('duck')[0])).toBeLessThan(squeak('duck')[0].pitch)
    const peek = squeak('peek')
    expect(lands(peek[peek.length - 1])).toBeGreaterThan(peek[0].pitch)
  })
})

describe('steps', () => {
  it('is one footfall for each step, up to eight', () => {
    for (const species of SPECIES) {
      for (let count = 1; count <= STEP_CAP; count++) expect(steps(species, count)).toHaveLength(count)
      expect(steps(species, 9)).toEqual(steps(species, STEP_CAP))
      expect(steps(species, 500)).toEqual(steps(species, STEP_CAP))
      expect(steps(species, Infinity)).toEqual(steps(species, STEP_CAP))
      expect(steps(species, 0)).toEqual([])
      expect(steps(species, -2)).toEqual([])
      expect(steps(species, NaN)).toEqual([])
      expect(steps(species, 2.9)).toEqual(steps(species, 2))
    }
  })

  it('is spaced by the tempo: the slower the animal, the wider the gap', () => {
    const slowToQuick = [...SPECIES].sort((a, b) => CAST[a].tempo - CAST[b].tempo)
    const gaps = slowToQuick.map((species) => steps(species, 2)[1].at)
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeLessThan(gaps[i - 1])
    for (const species of SPECIES) {
      const walk = steps(species, STEP_CAP)
      for (let i = 2; i < walk.length; i++) expect(walk[i].at - walk[i - 1].at).toBeCloseTo(walk[1].at, 2)
    }
  })

  it('is heavy and low for the bear, a patter for the hedgehog, and flat slaps for the duck', () => {
    const [bear] = steps('bear', 1)
    const [hedgehog] = steps('hedgehog', 1)
    expect(bear.pitch).toBeLessThan(120)
    expect(bear.peak).toBeGreaterThan(hedgehog.peak)
    expect(bear.length).toBeGreaterThan(hedgehog.length * 3)
    expect(hedgehog.pitch).toBeGreaterThan(500)
    expect(steps('hedgehog', 2)[1].at).toBeLessThan(0.1)
    for (const note of steps('duck', STEP_CAP)) expect(note.kind).toBe('noise')
    for (const species of SPECIES) if (species !== 'duck') for (const note of steps(species, STEP_CAP)) expect(note.kind).toBe('tone')
  })

  it('puts down a left foot and a right foot that differ', () => {
    for (const species of SPECIES) {
      const [left, right, again] = steps(species, 3)
      expect(right.pitch).not.toBe(left.pitch)
      expect(again.pitch).toBe(left.pitch)
    }
  })
})

describe('tap', () => {
  it('is one soft knock: it starts at once and is over in a tenth of a second', () => {
    const notes = tap()
    for (const note of notes) expect(note.at).toBe(0)
    expect(voiceEnd(notes)).toBeLessThanOrEqual(0.1)
  })
})

describe('drops', () => {
  it('is one drop for each count, up to six', () => {
    for (let count = 1; count <= DROP_CAP; count++) expect(drops(count)).toHaveLength(count)
    expect(drops(7)).toEqual(drops(DROP_CAP))
    expect(drops(99)).toEqual(drops(DROP_CAP))
    expect(drops(0)).toEqual([])
    expect(drops(NaN)).toEqual([])
  })

  it('adds drops without changing the ones before', () => {
    for (let count = 2; count <= DROP_CAP; count++) expect(drops(count).slice(0, count - 1)).toEqual(drops(count - 1))
  })

  it('scatters them in time and in pitch: no even beat, no scale', () => {
    const all = drops(DROP_CAP)
    const gaps = all.slice(1).map((note, i) => +(note.at - all[i].at).toFixed(3))
    for (const gap of gaps) expect(gap).toBeGreaterThan(0)
    expect(new Set(gaps).size).toBeGreaterThan(2)
    const moves = all.slice(1).map((note, i) => Math.sign(note.pitch - all[i].pitch))
    expect(moves).toContain(1)
    expect(moves).toContain(-1)
    expect(new Set(all.map((note) => note.pitch)).size).toBe(DROP_CAP)
    for (const note of all) expect(note.peak).toBeLessThanOrEqual(0.05)
  })
})

// ── The game's voices ────────────────────────────────────────────────────────

/** The lowest a list of notes goes, counting where a note glides to. */
const lowest = (notes: Notes): number => Math.min(...notes.flatMap((note) => [note.pitch, lands(note)]))
/** The notes of one list that are in no way in another: what is this animal's own in a cell. */
const own = (notes: Notes, others: Notes): Note[] => {
  const theirs = new Set(others.map((note) => JSON.stringify(note)))
  return notes.filter((note) => !theirs.has(JSON.stringify(note)))
}
const same = (a: readonly [Given, Need], b: readonly [Given, Need]): boolean => a[0] === b[0] && a[1] === b[1]

describe('cellVoice', () => {
  const cells = GIVEN.flatMap((given) => NEEDS.map((need) => [given, need] as const))

  it('has a voice for each of the thirty cells of the grid, each sorted once: the animal speaks, or is heard, or only the thing is', () => {
    expect(cells).toHaveLength(30)
    const sorted = [...VOICED_CELLS, ...BODY_CELLS, ...THING_CELLS]
    expect(sorted).toHaveLength(30)
    for (const each of cells) expect(sorted.filter((other) => same(each, other))).toHaveLength(1)
    for (const [given, need] of cells) expect(GRID[given][need].voice).not.toBe('')
  })

  it('is thirty voices that differ from one another, for every animal', () => {
    for (const species of SPECIES) expect(new Set(cells.map(([given, need]) => JSON.stringify(cellVoice(given, need, species)))).size).toBe(30)
  })

  it('is over by 1.4 s, but for the basket given to the one that hides, which may run to 1.9 s', () => {
    let longest = 0
    for (const each of cells) for (const species of SPECIES) {
      const ends = voiceEnd(cellVoice(each[0], each[1], species))
      if (same(each, SLOW_CELL)) {
        expect(ends).toBeLessThanOrEqual(SLOW_CELL_END_MAX)
        longest = Math.max(longest, ends)
      } else expect(ends).toBeLessThanOrEqual(CELL_END_MAX)
    }
    // The allowance is used: that cell is the slow one.
    expect(longest).toBeGreaterThan(CELL_END_MAX)
  })

  it('follows the size where the animal is in it: what is the bear\'s own goes lower than what is the hedgehog\'s own', () => {
    for (const [given, need] of [...VOICED_CELLS, ...BODY_CELLS]) {
      const bear = cellVoice(given, need, 'bear')
      const hedgehog = cellVoice(given, need, 'hedgehog')
      const bears = own(bear, hedgehog)
      const hedgehogs = own(hedgehog, bear)
      expect(bears.length).toBeGreaterThan(0)
      expect(hedgehogs.length).toBeGreaterThan(0)
      expect(lowest(bears)).toBeLessThan(lowest(hedgehogs))
      // And through the six: no two animals sound the same in the cell.
      expect(new Set(SPECIES.map((species) => JSON.stringify(cellVoice(given, need, species)))).size).toBe(SPECIES.length)
    }
  })

  it('goes down with size through all six, where the animal is in it', () => {
    for (const [given, need] of [...VOICED_CELLS, ...BODY_CELLS]) {
      // Against the thing alone: what is left of a cell when the notes every animal shares are taken out.
      const shared = SPECIES.map((species) => cellVoice(given, need, species)).reduce((kept, notes) => kept.filter((note) => own([note], notes).length === 0))
      const lows = SMALL_TO_BIG.map((species) => lowest(own(cellVoice(given, need, species), shared)))
      for (let i = 1; i < lows.length; i++) expect(lows[i]).toBeLessThan(lows[i - 1])
    }
  })

  it('speaks in the animal\'s own timbre where it has a voice in it: the wave the animal calls with is there', () => {
    for (const [given, need] of VOICED_CELLS) for (const species of SPECIES) {
      const voice = call(species, 'hum', 0)[0]
      // What no other animal has in this cell is this animal's, not the thing's.
      const mine = SPECIES.filter((other) => other !== species).reduce((kept, other) => own(kept, cellVoice(given, need, other)), [...cellVoice(given, need, species)])
      // An "eep" is high and a purr is low, but each is within an octave and a bit of where the animal calls from.
      const spoken = mine.filter((note) => note.kind === 'tone' && note.wave === voice.wave && Math.abs(Math.log2(note.pitch / voice.pitch)) <= 1.25)
      expect(spoken.length).toBeGreaterThan(0)
    }
  })

  it('is the same for every animal where only the thing is heard', () => {
    for (const [given, need] of THING_CELLS) for (const species of SPECIES) expect(cellVoice(given, need, species)).toEqual(cellVoice(given, need, 'bear'))
  })

  it('gives no verdict: the cell that helps is no louder than a landing, and the ones that do not are no harsher than it', () => {
    for (const [given, need] of cells) for (const species of SPECIES) {
      const notes = cellVoice(given, need, species)
      expect(top(notes)).toBeLessThanOrEqual(BIG_PEAK_MAX)
      // No buzzer: a square or sawtooth note is the dog's or the duck's own voice, the growl under the bear's, or a quiet strain in a thing, never a loud flat blare.
      for (const note of notes) if (note.wave === 'square' || note.wave === 'sawtooth') expect(note.peak).toBeLessThanOrEqual(0.06)
    }
    const helping = cells.filter(([given, need]) => given !== 'hand' && FITS[need] === given)
    expect(helping).toHaveLength(5)
    for (const [given, need] of helping) for (const species of SPECIES) {
      const loudestOther = Math.max(...cells.filter((each) => !helping.includes(each)).map((each) => top(cellVoice(each[0], each[1], species))))
      expect(top(cellVoice(given, need, species))).toBeLessThanOrEqual(Math.max(loudestOther, 0.15) + 0.001)
    }
  })

  it('never presses the one that hides: every cell of that column is quiet but for the blanket\'s own whump', () => {
    for (const given of GIVEN) for (const species of SPECIES) {
      const notes = cellVoice(given, 'scared', species)
      const cap = given === 'blanket' ? 0.1 : 0.09
      expect(top(notes)).toBeLessThanOrEqual(cap)
    }
  })

  it('keeps its own list: a caller that changes one changes no other', () => {
    const first = cellVoice('blanket', 'cold', 'cat') as Note[]
    first[0].peak = 0.9
    first.pop()
    expect(top(cellVoice('blanket', 'cold', 'cat'))).toBeLessThanOrEqual(PEAK_MAX)
    expect(top(cellVoice('blanket', 'sore', 'cat'))).toBeLessThanOrEqual(PEAK_MAX)
  })
})

describe('signVoice', () => {
  it('is two to five notes, under a second, and no louder than the cap of its step', () => {
    for (const need of NEEDS) for (const species of SPECIES) for (const step of SIGN_STEPS) {
      const notes = signVoice(need, species, step)
      expect(notes.length).toBeGreaterThanOrEqual(SIGN_NOTES_MIN)
      expect(notes.length).toBeLessThanOrEqual(SIGN_NOTES_MAX)
      expect(voiceEnd(notes)).toBeLessThan(SIGN_END_MAX)
      expect(top(notes)).toBeLessThanOrEqual(SIGN_PEAK_MAX[step])
      expect(together(notes)).toBeLessThanOrEqual(SIGN_PEAK_MAX[2] + 0.02)
    }
  })

  it('is a little clearer at each step: louder, and never fewer notes', () => {
    for (const need of NEEDS.filter((other) => other !== 'scared')) for (const species of SPECIES) {
      const [quiet, plain, open] = SIGN_STEPS.map((step) => signVoice(need, species, step))
      expect(top(plain)).toBeGreaterThan(top(quiet))
      expect(top(open)).toBeGreaterThan(top(plain))
      expect(top(open)).toBeGreaterThanOrEqual(top(quiet))
      expect(plain.length).toBeGreaterThanOrEqual(quiet.length)
      expect(open.length).toBeGreaterThanOrEqual(plain.length)
    }
  })

  it('never grows for the one that hides: no louder and no longer at a plainer step, and still a voice of its own at each', () => {
    for (const species of SPECIES) {
      const [quiet, plain, open] = SIGN_STEPS.map((step) => signVoice('scared', species, step))
      expect(top(plain)).toBe(top(quiet))
      expect(top(open)).toBe(top(quiet))
      expect(plain.length).toBe(quiet.length)
      expect(open.length).toBe(quiet.length)
      expect(JSON.stringify(plain)).not.toBe(JSON.stringify(quiet))
      expect(JSON.stringify(open)).not.toBe(JSON.stringify(plain))
    }
  })

  it('is quietest for the one that hides, at every step and for every animal', () => {
    for (const species of SPECIES) for (const step of SIGN_STEPS) {
      const scared = top(signVoice('scared', species, step))
      for (const need of NEEDS) if (need !== 'scared') expect(scared).toBeLessThan(top(signVoice(need, species, step)))
      // Almost nothing, and it does not grow into more: under half of what a touch sounds like.
      expect(scared).toBeLessThanOrEqual(0.04)
    }
  })

  it('differs for each need, for each animal', () => {
    for (const species of SPECIES) for (const step of SIGN_STEPS) expect(new Set(NEEDS.map((need) => JSON.stringify(signVoice(need, species, step)))).size).toBe(NEEDS.length)
    for (const need of NEEDS) for (const step of SIGN_STEPS) expect(new Set(SPECIES.map((species) => JSON.stringify(signVoice(need, species, step)))).size).toBe(SPECIES.length)
  })

  it('for the sore one is a small question and never a whimper: the only voiced sign, at the animal\'s own note, level and then a little up', () => {
    for (const species of SPECIES) for (const step of SIGN_STEPS) {
      const leading = beats(signVoice('sore', species, step))
      expect(leading).toHaveLength(2)
      expect(leading[0].pitch).toBe(call(species, 'hum', 0)[0].pitch)
      expect(leading[0].to).toBeUndefined()
      expect(leading[1].pitch).toBeGreaterThan(leading[0].pitch)
      expect(lands(leading[1])).toBeGreaterThan(leading[1].pitch)
      // Small: it stays within a major third of the animal's note.
      expect(lands(leading[1]) / leading[0].pitch).toBeLessThanOrEqual(2 ** (4 / 12) + 0.001)
    }
  })

  it('is air, teeth and claws for the others: breath for the thirsty and the frightened, clicks for the cold, dry scratches for the itchy', () => {
    for (const species of SPECIES) for (const step of SIGN_STEPS) {
      for (const note of signVoice('thirsty', species, step)) expect(note.kind).toBe('noise')
      for (const note of signVoice('scared', species, step)) expect(note.kind).toBe('noise')
      for (const note of signVoice('itchy', species, step)) expect(note.kind).toBe('noise')
      for (const note of signVoice('cold', species, step)) expect(note.length).toBeLessThanOrEqual(0.03)
    }
  })

  it('pants slowly and scratches quickly', () => {
    for (const species of SPECIES) {
      const pant = signVoice('thirsty', species, 2)
      const scratch = signVoice('itchy', species, 2)
      expect(pant[1].at - pant[0].at).toBeGreaterThan((scratch[1].at - scratch[0].at) * 2)
    }
  })
})

describe('showing', () => {
  it('is tiny and high: the thing in miniature and a pleased squeak that goes up', () => {
    for (const care of CARES) {
      const notes = showing(care)
      expect(top(notes)).toBeLessThanOrEqual(MOUSE_PEAK_MAX)
      for (const note of notes) expect(note.pitch).toBeGreaterThanOrEqual(MOUSE_PITCH_MIN)
      expect(voiceEnd(notes)).toBeLessThanOrEqual(0.7)
      const squeaks = notes.filter((note) => note.kind === 'tone' && note.pitch >= 2200)
      expect(squeaks.length).toBeGreaterThanOrEqual(2)
      expect(squeaks[squeaks.length - 1].pitch).toBeGreaterThan(squeaks[squeaks.length - 2].pitch)
      // The thing comes first: the mouse uses it, then is pleased.
      expect(notes[0]).not.toEqual(squeaks[0])
      // Smaller than the thing itself landing on an animal.
      expect(top(notes)).toBeLessThan(top(land(care, 'hedgehog')))
    }
  })

  it('differs for each of the five things', () => {
    expect(new Set(CARES.map((care) => JSON.stringify(showing(care)))).size).toBe(CARES.length)
  })
})

describe('secret, carrier and lamp', () => {
  it('have a voice of their own for each kind', () => {
    const all = [...SECRETS.map((kind) => secret(kind)), ...CARRIERS.map((kind) => carrier(kind)), ...LAMPS.map((kind) => lamp(kind))]
    expect(new Set(all.map((notes) => JSON.stringify(notes))).size).toBe(all.length)
    for (const notes of all) {
      expect(top(notes)).toBeLessThanOrEqual(TOUCH_PEAK_MAX)
      expect(voiceEnd(notes)).toBeLessThanOrEqual(0.7)
    }
  })

  it('are what the sheet says two things make: bubbles that rise, a bob down and up, a crackle with no even beat', () => {
    const bubbles = secret('foam').filter((note) => note.kind === 'tone')
    expect(bubbles.length).toBeGreaterThanOrEqual(4)
    for (let i = 1; i < bubbles.length; i++) expect(bubbles[i].pitch).toBeGreaterThan(bubbles[i - 1].pitch)
    const bob = secret('boat').slice(-2)
    expect(lands(bob[0])).toBeLessThan(bob[0].pitch)
    expect(lands(bob[1])).toBeGreaterThan(bob[1].pitch)
    const crackle = secret('crackle')
    for (const note of crackle) expect(note.kind).toBe('noise')
    expect(new Set(crackle.slice(1).map((note, i) => +(note.at - crackle[i].at).toFixed(3))).size).toBeGreaterThan(3)
    for (const note of secret('den')) expect(note.pitch).toBeLessThanOrEqual(500)
  })

  it('blinks with two tiny clicks, and opens with a latch and then a creak', () => {
    const blink = carrier('blink')
    expect(blink).toHaveLength(2)
    for (const note of blink) expect(note.attack + note.length).toBeLessThanOrEqual(0.03)
    expect(blink[1].at).toBeGreaterThan(end(blink[0]))
    const open = carrier('open')
    const creak = open[open.length - 1]
    expect(creak.kind).toBe('noise')
    expect(creak.at).toBeGreaterThan(open[0].at)
    expect(creak.length).toBeGreaterThan(open[0].length * 3)
  })

  it('dims the lamp with a soft falling hum and brings it back with a rising one, the same hum turned round', () => {
    const dim = lamp('dim')
    const bright = lamp('bright')
    for (const note of dim) expect(lands(note)).toBeLessThan(note.pitch)
    for (const note of bright) expect(lands(note)).toBeGreaterThan(note.pitch)
    expect(dim.map((note) => note.pitch)).toEqual(bright.map((note) => note.to))
    expect(top(dim)).toBeLessThanOrEqual(0.07)
    for (const note of [...dim, ...bright]) expect(note.wave).toBe('sine')
  })
})

describe('well', () => {
  it('is a rising figure in the animal\'s own voice: it ends higher than it starts, and starts lower the bigger the animal', () => {
    for (const need of NEEDS) {
      for (const species of SPECIES) {
        const notes = well(species, need)
        const leading = beats(notes)
        const last = leading[leading.length - 1]
        expect(leading.length).toBeGreaterThanOrEqual(2)
        expect(last.pitch).toBeGreaterThan(leading[0].pitch)
        expect(lands(last)).toBeGreaterThan(leading[0].pitch)
        expect(notes[0].wave).toBe(call(species, 'glad', 0)[0].wave)
        expect(together(notes)).toBeLessThanOrEqual(BIG_PEAK_MAX)
      }
      const firsts = SMALL_TO_BIG.map((species) => well(species, need)[0].pitch)
      for (let i = 1; i < firsts.length; i++) expect(firsts[i]).toBeLessThan(firsts[i - 1])
    }
  })

  it('is different for each need, and is none of the animal\'s calls', () => {
    for (const species of SPECIES) {
      const wells = NEEDS.map((need) => JSON.stringify(well(species, need)))
      expect(new Set(wells).size).toBe(NEEDS.length)
      const calls = MOODS.flatMap((mood) => VARIANTS.map((v) => JSON.stringify(call(species, mood, v))))
      for (const each of wells) expect(calls).not.toContain(each)
    }
  })

  it('is the thing the animal could not do: a leap, a long stretch, a still sigh, a tall call, steady steps', () => {
    for (const species of SPECIES) {
      // The one that limped leaps an octave.
      const leap = beats(well(species, 'sore'))
      expect(leap[1].pitch / leap[0].pitch).toBeCloseTo(2, 1)
      // The one that shook stretches: the longest of the five, every note sliding up.
      const stretch = well(species, 'cold')
      for (const need of NEEDS) if (need !== 'cold' && need !== 'scared') expect(voiceEnd(stretch)).toBeGreaterThan(voiceEnd(well(species, need)))
      for (const note of stretch) expect(lands(note)).toBeGreaterThan(note.pitch)
      // The one that scratched is still: the quietest of the five.
      for (const need of NEEDS) if (need !== 'itchy') expect(top(well(species, 'itchy'))).toBeLessThan(top(well(species, need)))
      // The one that drooped stands tall: its last note is level, and the longest note of the figure.
      const tall = beats(well(species, 'thirsty'))
      expect(tall[tall.length - 1].to).toBeUndefined()
      expect(tall[tall.length - 1].length).toBeGreaterThan(tall[0].length)
      // The one that hid walks out: four level notes, evenly spaced, each a step above the last.
      const bold = beats(well(species, 'scared'))
      expect(bold).toHaveLength(4)
      for (const note of bold) expect(note.to).toBeUndefined()
      for (let i = 1; i < bold.length; i++) {
        expect(bold[i].pitch).toBeGreaterThan(bold[i - 1].pitch)
        expect(bold[i].pitch / bold[i - 1].pitch).toBeLessThanOrEqual(WHOLE_TONE + 0.001)
        expect(bold[i].at - bold[i - 1].at).toBeCloseTo(bold[1].at, 2)
      }
    }
  })

  it('is no fanfare: no louder than a glad call, and never the three notes of a chord going up', () => {
    for (const species of SPECIES) for (const need of NEEDS) {
      expect(top(well(species, need))).toBeLessThanOrEqual(top(call(species, 'glad', 0)))
      const pitches = beats(well(species, need)).map((note) => Math.round(12 * Math.log2(note.pitch / call(species, 'hum', 0)[0].pitch)))
      const leaps = pitches.slice(1).map((pitch, i) => pitch - pitches[i])
      // A bugle call is thirds and fourths stacked: two leaps of three semitones or more, one after the other.
      for (let i = 1; i < leaps.length; i++) expect(leaps[i] >= 3 && leaps[i - 1] >= 3).toBe(false)
    }
  })
})
