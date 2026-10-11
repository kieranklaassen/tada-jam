import { describe, expect, it } from 'vitest'
import { VOICES, notesOf, type SoundName } from './voices'

// Nobody has heard these sounds. What a test can hold is that each is in a
// range a small speaker plays and a child can bear, that each is short, and
// that no two are the same sound.

const names = Object.keys(VOICES) as SoundName[]
const LEVELS = [0, 0.25, 0.5, 0.75, 1]

describe('the voices, as numbers', () => {
  it('keeps every note of every sound, at every level, in range', () => {
    for (const name of names) for (const level of LEVELS) {
      const notes = VOICES[name](level)
      expect(notes.length, name).toBeGreaterThanOrEqual(1)
      expect(notes.length, name).toBeLessThanOrEqual(3)
      for (const note of notes) {
        expect(note.frequency, name).toBeGreaterThanOrEqual(50)
        expect(note.frequency, name).toBeLessThanOrEqual(5500)
        if (note.glideTo !== undefined) {
          expect(note.glideTo, name).toBeGreaterThanOrEqual(50)
          expect(note.glideTo, name).toBeLessThanOrEqual(5500)
        }
        expect(note.peak, name).toBeGreaterThan(0.02)
        expect(note.peak, name).toBeLessThanOrEqual(0.3)
        expect(note.attack, name).toBeGreaterThanOrEqual(0.001)
        expect(note.attack, name).toBeLessThanOrEqual(0.15)
        expect(note.decay, name).toBeGreaterThanOrEqual(0.02)
        // The longest sound is over in under a second.
        expect(note.attack + note.decay, name).toBeLessThanOrEqual(0.75)
        if (note.kind === 'noise') expect(note.q ?? 1, name).toBeGreaterThan(0)
      }
      // All of a sound's notes at once stay well under full scale.
      expect(notes.reduce((sum, note) => sum + note.peak, 0), name).toBeLessThanOrEqual(0.5)
    }
  })

  it('hides no wait inside a sound: every note starts when the sound is asked for', () => {
    for (const name of names) for (const level of LEVELS) for (const note of VOICES[name](level)) expect(note.delay, name).toBeUndefined()
  })

  it('makes no two sounds the same', () => {
    const seen = new Map<string, string>()
    for (const name of names) {
      const key = JSON.stringify(VOICES[name](0.5))
      expect(seen.get(key), `${name} is the same sound as ${seen.get(key)}`).toBeUndefined()
      seen.set(key, name)
    }
  })

  it('raises the creak with the stretch and makes a harder twang and a harder landing louder', () => {
    expect(VOICES.creak(1)[0].frequency).toBeGreaterThan(VOICES.creak(0.2)[0].frequency)
    for (const name of ['twang', 'thunk', 'flop', 'whump', 'splash', 'knock'] as const) expect(VOICES[name](1)[0].peak, name).toBeGreaterThan(VOICES[name](0)[0].peak)
  })

  it('keeps the honk in the pouch apart from the muffled honk in the ice', () => {
    expect(VOICES.muffled(0.5)[0].frequency).toBeLessThan(VOICES.honk(0.5)[0].frequency * 0.7)
    expect(VOICES.muffled(0.5)[0].wave).toBe('sine')
  })

  it('gives the notes of everything asked for in one moment as one list, and holds a level to its range', () => {
    expect(notesOf([])).toEqual([])
    expect(notesOf([{ name: 'boing', level: 0.3 }, { name: 'bark', level: 0.8 }])).toEqual([...VOICES.boing(0.3), ...VOICES.bark(0.8)])
    expect(notesOf([{ name: 'twang', level: 7 }])).toEqual(VOICES.twang(1))
    expect(notesOf([{ name: 'twang', level: -2 }])).toEqual(VOICES.twang(0))
  })
})
