import { describe, expect, it } from 'vitest'
import { POKES } from './creatures'
import { KINDS } from './parts'
import { RANGE, VOICES, lengthOf, type VoiceKey } from './voices'

// Nobody has heard these sounds. What a test can hold is that each one is in
// a range a small speaker and a small ear can take, that no two are the same
// sound, and that none of them hides a wait inside itself.

const keys = Object.keys(VOICES) as VoiceKey[]
const within = (value: number, [low, high]: readonly [number, number]): boolean => value >= low && value <= high

describe('the voices', () => {
  it('give every cell of the grid a sound of its own: each kind of part lifted, carried, pressed on and poked', () => {
    for (const kind of KINDS) for (const act of ['lift', 'carry', 'press', 'poke'] as const) expect(VOICES[`${act}-${kind}`]?.length, `${act}-${kind}`).toBeGreaterThan(0)
    // No two voices in the whole game are the same notes.
    const written = keys.map((key) => JSON.stringify(VOICES[key]))
    expect(new Set(written).size).toBe(keys.length)
  })

  it('stay in range: pitch, loudness, how fast a note comes in and how long it lasts', () => {
    for (const key of keys) {
      for (const note of VOICES[key]) {
        expect(within(note.frequency, RANGE.frequency), key).toBe(true)
        if (note.glideTo !== undefined) expect(within(note.glideTo, RANGE.frequency), key).toBe(true)
        expect(within(note.peak, RANGE.peak), key).toBe(true)
        expect(within(note.attack, RANGE.attack), key).toBe(true)
        expect(within(note.decay, RANGE.decay), key).toBe(true)
      }
      expect(lengthOf(key), key).toBeLessThanOrEqual(RANGE.length)
      // The notes of one voice together stay under full loudness.
      expect(VOICES[key].reduce((sum, note) => sum + note.peak, 0), key).toBeLessThan(0.45)
    }
  })

  it('hide no wait: every note of a voice starts when the voice starts, so a sound is heard in the frame that asked for it', () => {
    for (const key of keys) for (const note of VOICES[key]) expect(note.delay ?? 0, key).toBe(0)
  })

  it('are short where they repeat: a footstep, a rustle and a bounce are over before the next one', () => {
    for (const key of ['foot', 'beat', 'rock', 'sniff'] as const) expect(lengthOf(key), key).toBeLessThan(0.3)
    for (const kind of KINDS) expect(lengthOf(`carry-${kind}`), kind).toBeLessThan(0.3)
  })

  it('tell the kinds apart by ear in the hand: no two kinds are lifted at the same pitch', () => {
    const first = KINDS.map((kind) => Math.round(VOICES[`lift-${kind}`][0].frequency))
    expect(new Set(first).size).toBe(KINDS.length)
  })

  it('have the second sound of a poke as a voice of its own, asked for when its motion comes', () => {
    for (const kind of KINDS) {
      const second = POKES[kind].second
      if (!second) continue
      expect(VOICES[second.key].length, kind).toBeGreaterThan(0)
      expect(second.at, kind).toBeGreaterThan(0)
      expect(second.at, kind).toBeLessThan(POKES[kind].lasts)
    }
  })
})
