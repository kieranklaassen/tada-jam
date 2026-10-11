import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { EARTH, MUD, ROCK, SAND, STONE } from './ground'
import type { ToyEvent } from './toy'
import { APART, BACK, BELL, BOING, CLICK, FIZZLE, GAVE, KNOCK, MARCH, MET, PICKED, POP, RANGE, SET_DOWN, SIGH, SPOKEN, TWANG, digVoice, landedVoice, lengthOf, pourVoice, voiceFor, voiceForGame, voiceForRaid } from './voices'

const MATERIALS = ['sand', 'mud', 'stone'] as const

/** Every voice the game can play, with the ends of each one that takes a number. */
const ALL: Record<string, Note[]> = {
  'dig slow': digVoice(0),
  'dig fast': digVoice(1),
  'dig past the ends': digVoice(7),
  back: BACK,
  bell: BELL,
  boing: BOING,
  'pour one': pourVoice(1),
  'pour many': pourVoice(40),
  ...Object.fromEntries(Object.entries(MET).map(([k, v]) => [`met ${k}`, v])),
  ...Object.fromEntries(Object.entries(PICKED).map(([k, v]) => [`picked ${k}`, v])),
  ...Object.fromEntries(Object.entries(SET_DOWN).map(([k, v]) => [`set ${k}`, v])),
  ...Object.fromEntries(MATERIALS.flatMap((m) => [[`landed ${m} near`, landedVoice(m, 1)], [`landed ${m} far`, landedVoice(m, 30)]])),
  ...Object.fromEntries(Object.entries(SPOKEN).map(([k, v]) => [`spoken ${k}`, v])),
}

for (const [name, notes] of Object.entries({ twang: TWANG, pop: POP, click: CLICK, knock: KNOCK, fizzle: FIZZLE, gave: GAVE, sigh: SIGH, march: MARCH })) ALL[name] = notes

const within = (value: number, [low, high]: readonly [number, number] | readonly number[]) => value >= low && value <= high
/** The pitch of the loudest note of a voice: what the ear takes it for. */
const mainPitch = (notes: readonly Note[]) => [...notes].sort((a, b) => b.peak - a.peak)[0].frequency

describe('every voice', () => {
  for (const [name, notes] of Object.entries(ALL)) {
    it(`${name}: is short, not loud, and inside the range of every number`, () => {
      expect(notes.length).toBeGreaterThan(0)
      expect(notes.length).toBeLessThanOrEqual(6)
      for (const note of notes) {
        expect(within(note.frequency, RANGE.frequency), `frequency ${note.frequency}`).toBe(true)
        if (note.glideTo !== undefined) expect(within(note.glideTo, RANGE.frequency), `glide ${note.glideTo}`).toBe(true)
        expect(within(note.peak, RANGE.peak), `peak ${note.peak}`).toBe(true)
        expect(within(note.attack, RANGE.attack), `attack ${note.attack}`).toBe(true)
        expect(within(note.decay, RANGE.decay), `decay ${note.decay}`).toBe(true)
        expect(note.delay ?? 0).toBeGreaterThanOrEqual(0)
      }
      expect(lengthOf(notes)).toBeLessThanOrEqual(RANGE.length)
      expect(notes.reduce((sum, note) => sum + note.peak, 0)).toBeLessThanOrEqual(RANGE.loudness)
    })
  }
})

describe('the three materials', () => {
  it('sound far apart when the dig meets them, when they are picked up and when they are set down', () => {
    for (const set of [MET, PICKED, SET_DOWN]) {
      const pitches = MATERIALS.map((m) => mainPitch(set[m])).sort((a, b) => a - b)
      expect(pitches[1] / pitches[0]).toBeGreaterThanOrEqual(1.5)
      expect(pitches[2] / pitches[1]).toBeGreaterThanOrEqual(1.5)
    }
  })

  it('sand is noise and high, a stone set down is a low tone, and mud glides down', () => {
    expect(SET_DOWN.sand.every((note) => note.kind === 'noise')).toBe(true)
    expect(mainPitch(SET_DOWN.sand)).toBeGreaterThan(1000)
    expect(mainPitch(SET_DOWN.stone)).toBeLessThan(120)
    expect(SET_DOWN.mud.every((note) => (note.glideTo ?? note.frequency) < note.frequency)).toBe(true)
  })

  it('a stone lands harder the further it fell, and sand pours fuller the more of it moves', () => {
    expect(landedVoice('stone', 8)[0].peak).toBeGreaterThan(landedVoice('stone', 1)[0].peak)
    expect(pourVoice(12)[0].peak).toBeGreaterThan(pourVoice(1)[0].peak)
    expect(lengthOf(pourVoice(12))).toBeGreaterThan(lengthOf(pourVoice(1)))
  })
})

describe('the dig', () => {
  it('crunches at a pitch that follows the speed of the finger', () => {
    const pitches = [0, 0.25, 0.5, 0.75, 1].map((speed) => digVoice(speed)[0].frequency)
    for (let n = 1; n < pitches.length; n++) expect(pitches[n]).toBeGreaterThan(pitches[n - 1])
    expect(digVoice(-3)).toEqual(digVoice(0))
    expect(digVoice(9)).toEqual(digVoice(1))
  })
})

describe('the creatures', () => {
  it('each speak in a voice of their own', () => {
    const shapes = Object.values(SPOKEN).map((notes) => notes.map((n) => `${n.kind}:${n.frequency}:${n.wave ?? ''}`).join(','))
    expect(new Set(shapes).size).toBe(shapes.length)
    const pitches = Object.values(SPOKEN).map(mainPitch)
    expect(new Set(pitches).size).toBe(pitches.length)
  })

  it('a beetle is low, a raider ant is high, and the fly buzzes', () => {
    expect(mainPitch(SPOKEN.beetle)).toBeLessThan(150)
    expect(mainPitch(SPOKEN.raider)).toBeGreaterThan(1000)
    expect(SPOKEN.fly[0].wave).toBe('sawtooth')
  })
})

describe('what the toy says happened', () => {
  const events: ToyEvent[] = [
    { type: 'dug', x: 1, y: 1, cells: 4, speed: 0.5 },
    { type: 'met', kind: SAND, x: 1, y: 1 },
    { type: 'met', kind: MUD, x: 1, y: 1 },
    { type: 'met', kind: STONE, x: 1, y: 1 },
    { type: 'met', kind: ROCK, x: 1, y: 1 },
    { type: 'picked', kind: SAND, cell: 3 },
    { type: 'set', kind: MUD, cell: 3 },
    { type: 'back', kind: STONE, cell: 3 },
    { type: 'landed', kind: STONE, cell: 3, fell: 4 },
    { type: 'pour', cells: 5 },
    { type: 'buried', cell: 3 },
  ]

  it('has a voice for every event, and none two of them share', () => {
    const voices = events.map((event) => JSON.stringify(voiceFor(event)))
    for (const voice of voices) expect(voice).not.toBe('null')
    expect(new Set(voices).size).toBe(events.length)
  })

  it('says nothing for earth the dig only passes', () => {
    expect(voiceFor({ type: 'met', kind: EARTH, x: 0, y: 0 })).toBeNull()
  })

  it('keeps fast events apart and lets a set-down sound at once', () => {
    expect(APART.dug).toBeGreaterThan(0.03)
    expect(APART.pour).toBeGreaterThan(APART.dug)
    expect([APART.picked, APART.set, APART.back]).toEqual([0, 0, 0])
  })
})

describe('what the game and a raid say happened', () => {
  it('gives the two machines voices of their own, and a voice to every act that changes something', () => {
    expect(voiceForGame({ type: 'fired', machine: 'catapult', shot: 'mud' })).toBe(TWANG)
    expect(voiceForGame({ type: 'fired', machine: 'cannon', shot: 'mud' })).toBe(POP)
    for (const event of [{ type: 'bell' }, { type: 'called', party: ['ant'] }, { type: 'loaded', machine: 'cannon', shot: 'sand' }, { type: 'turned', machine: 'cannon' }, { type: 'machineSet', machine: 'cannon' }, { type: 'shotLanded', shot: 'stone', cell: 3 }] as const) {
      expect(voiceForGame(event), event.type).not.toBeNull()
    }
  })

  it('never sounds a verdict: a raid that is judged makes no sound of its own', () => {
    for (const verdict of ['well', 'not-well', 'not-judged'] as const) expect(voiceForGame({ type: 'judged', verdict })).toBeNull()
    expect(voiceForRaid({ type: 'over' })).toBeNull()
  })

  it('lets each kind speak in its own voice when it gets in, acts and is hit', () => {
    const voices = (['ant', 'beetle', 'fly'] as const).map((kind) => voiceForRaid({ type: 'acted', id: 0, kind }))
    expect(new Set(voices).size).toBe(3)
    expect(voiceForRaid({ type: 'hit', id: 0, kind: 'beetle', shot: 'stone', answer: 'x' })).toBe(SPOKEN.beetle)
  })
})
