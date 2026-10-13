import { describe, expect, it } from 'vitest'
import { KINDS, SUPPORTS } from './kinds'
import { LAND, LIMITS, allVoices, knock, seconds, softer } from './voices'

// Nobody has heard these on the machine that wrote them, so every voice is
// held to a range a small speaker can play and a small ear can take.

describe('the voices, as numbers', () => {
  const voices = allVoices()

  it.each(voices)('%s stays in range', (_, voice) => {
    expect(voice.length).toBeGreaterThan(0)
    expect(voice.length).toBeLessThanOrEqual(3)
    for (const note of voice) {
      expect(note.frequency).toBeGreaterThanOrEqual(LIMITS.minFreq)
      expect(note.frequency).toBeLessThanOrEqual(LIMITS.maxFreq)
      if (note.glideTo !== undefined) {
        expect(note.glideTo).toBeGreaterThanOrEqual(LIMITS.minFreq)
        expect(note.glideTo).toBeLessThanOrEqual(LIMITS.maxFreq)
      }
      expect(note.peak).toBeGreaterThan(0)
      expect(note.peak).toBeLessThanOrEqual(LIMITS.maxPeak)
      expect(note.attack).toBeGreaterThanOrEqual(LIMITS.minAttack)
      expect(note.attack).toBeLessThanOrEqual(LIMITS.maxAttack)
    }
    expect(seconds(voice)).toBeLessThanOrEqual(LIMITS.maxSeconds)
  })

  it('hides no delay inside a voice: every note starts when the voice does', () => {
    for (const [name, voice] of voices) for (const note of voice) expect(note.delay, name).toBeUndefined()
  })

  it('names every voice once, and no two lifts or landings are the same sound', () => {
    expect(new Set(voices.map(([name]) => name)).size).toBe(voices.length)
    const lifts = voices.filter(([name]) => name.startsWith('lift ')).map(([, voice]) => JSON.stringify(voice))
    expect(new Set(lifts).size).toBe(KINDS.length)
  })

  it('makes each knock after the first softer than the one before', () => {
    for (const kind of KINDS) for (const on of SUPPORTS) {
      const peaks = [1, 2, 3].map((nth) => Math.max(...knock(kind, on, nth).map((note) => note.peak)))
      expect(peaks[1]).toBeLessThan(peaks[0])
      expect(peaks[2]).toBeLessThan(peaks[1])
    }
    expect(softer(LAND.pebble.ground, 0.5)[0].peak).toBeCloseTo(LAND.pebble.ground[0].peak / 2)
  })
})
