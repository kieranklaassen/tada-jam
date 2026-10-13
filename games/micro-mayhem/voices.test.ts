import { describe, expect, it } from 'vitest'
import { VOICES, notesOf, type Cue } from './voices'

// Nobody has listened to these voices yet, so every number is held in a range a small speaker and a child's ear
// can take, and no voice may carry a delay: a sound starts in the frame that lights its pose.

const CUES = Object.keys(VOICES) as Cue[]

describe('the voices', () => {
  it('each have at least one note, and at most three', () => {
    for (const cue of CUES) {
      expect(VOICES[cue].length, cue).toBeGreaterThan(0)
      expect(VOICES[cue].length, cue).toBeLessThanOrEqual(3)
    }
  })

  it('hide no delay inside themselves: every note starts when its voice starts', () => {
    for (const cue of CUES) for (const note of VOICES[cue]) expect('delay' in note && note.delay !== 0, cue).toBe(false)
  })

  it('stay in range: pitch, loudness and length', () => {
    for (const cue of CUES) {
      for (const note of VOICES[cue]) {
        for (const pitch of [note.frequency, note.glideTo ?? note.frequency]) {
          expect(pitch, cue).toBeGreaterThanOrEqual(45)
          expect(pitch, cue).toBeLessThanOrEqual(5200)
        }
        expect(note.peak, cue).toBeGreaterThan(0)
        expect(note.peak, cue).toBeLessThanOrEqual(0.26)
        expect(note.attack, cue).toBeGreaterThan(0)
        expect(note.decay, cue).toBeGreaterThan(0)
        // Short: a voice is over while its pose is still lit.
        expect(note.attack + note.decay, cue).toBeLessThanOrEqual(0.95)
      }
      // The notes of one voice sound together, so their peaks add up.
      expect(VOICES[cue].reduce((sum, note) => sum + note.peak, 0), cue).toBeLessThanOrEqual(0.48)
    }
  })

  it('are quiet where nobody touched: the sounds the room makes by itself', () => {
    for (const cue of ['dogSnore', 'bakerSnore', 'bakerWhistle', 'flyHop', 'dogSnap'] as const) for (const note of VOICES[cue]) expect(note.peak, cue).toBeLessThanOrEqual(0.035)
  })

  it('are told apart: no two voices are the same notes', () => {
    const seen = new Map<string, string>()
    for (const cue of CUES) {
      const key = JSON.stringify(VOICES[cue])
      expect(seen.get(key), cue).toBeUndefined()
      seen.set(key, cue)
    }
  })

  it('join the cues of one moment into one list, in order', () => {
    expect(notesOf([])).toEqual([])
    expect(notesOf(['lampClick', 'dogYawn'])).toEqual([...VOICES.lampClick, ...VOICES.dogYawn])
  })
})
