import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { BACK, BELL, BOING, MET, PICKED, RANGE, SET_DOWN, SPOKEN, digVoice, landedVoice, lengthOf, pourVoice } from './voices'

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
