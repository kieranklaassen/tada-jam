import { describe, expect, it } from 'vitest'
import { everySound, notesOf } from './voices'

// Nobody has heard these. The test holds every one inside a range that cannot hurt or startle: no pitch a small
// speaker cannot play or an ear finds shrill, nothing loud, nothing long.

describe('the voices', () => {
  const sounds = everySound()

  it('keeps every note in range: pitch, loudness and length', () => {
    for (const sound of sounds) {
      const notes = notesOf(sound)
      expect(notes.length, JSON.stringify(sound)).toBeGreaterThan(0)
      for (const note of notes) {
        const label = JSON.stringify(sound)
        expect(note.frequency, label).toBeGreaterThanOrEqual(50)
        expect(note.frequency, label).toBeLessThanOrEqual(4200)
        if (note.glideTo !== undefined) { expect(note.glideTo, label).toBeGreaterThanOrEqual(50); expect(note.glideTo, label).toBeLessThanOrEqual(4200) }
        expect(note.peak, label).toBeGreaterThan(0)
        expect(note.peak, label).toBeLessThanOrEqual(0.18)
        expect(note.attack, label).toBeGreaterThan(0)
        expect((note.delay ?? 0) + note.attack + note.decay, label).toBeLessThanOrEqual(0.9)
      }
    }
  })

  it('gives each wash thing its own voice in the hand, in the stroke and going home', () => {
    for (const id of ['grab', 'home'] as const) {
      const voices = (['soap', 'jug', 'towel'] as const).map((thing) => JSON.stringify(notesOf({ id, thing })))
      expect(new Set(voices).size).toBe(3)
    }
    const strokes = (['soap', 'jug', 'towel'] as const).map((thing) => JSON.stringify(notesOf({ id: 'stroke', thing, speed: 0.5, v: 0 })))
    expect(new Set(strokes).size).toBe(3)
  })

  it('lets the soap, the jug and the towel follow the speed of the finger, and varies a repeated sound', () => {
    for (const thing of ['soap', 'jug', 'towel'] as const) expect(notesOf({ id: 'stroke', thing, speed: 1, v: 0 })[0].frequency).toBeGreaterThan(notesOf({ id: 'stroke', thing, speed: 0, v: 0 })[0].frequency)
    for (const id of ['giggle', 'shudder', 'pop', 'squeak'] as const) expect(JSON.stringify(notesOf({ id, v: 0 }))).not.toBe(JSON.stringify(notesOf({ id, v: 1 })))
    // The hum climbs for as long as the towel stays on him.
    expect(notesOf({ id: 'hum', step: 4 })[0].frequency).toBeGreaterThan(notesOf({ id: 'hum', step: 0 })[0].frequency)
  })

  it('tells the lamp going down from the lamp coming up', () => {
    const down = notesOf({ id: 'lampDown' })[1], up = notesOf({ id: 'lampUp' })[1]
    expect(down.glideTo!).toBeLessThan(down.frequency)
    expect(up.glideTo!).toBeGreaterThan(up.frequency)
  })
})
