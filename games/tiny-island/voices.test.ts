import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { KINDS } from './toys'
import { TAP, VOICES, notesOf, type VoiceName } from './voices'

const names = Object.keys(VOICES) as VoiceName[]

describe('the voices', () => {
  it('keeps every note in a range a small speaker can play and a small ear can bear', () => {
    for (const name of names) {
      const notes = VOICES[name] as Note[]
      expect(notes.length, name).toBeGreaterThan(0)
      for (const note of notes) {
        expect(note.frequency, name).toBeGreaterThanOrEqual(50)
        expect(note.frequency, name).toBeLessThanOrEqual(5000)
        if (note.glideTo !== undefined) {
          expect(note.glideTo, name).toBeGreaterThanOrEqual(50)
          expect(note.glideTo, name).toBeLessThanOrEqual(5000)
        }
        expect(note.peak, name).toBeGreaterThan(0)
        expect(note.peak, name).toBeLessThanOrEqual(0.4)
        expect(note.attack, name).toBeGreaterThan(0)
        expect((note.delay ?? 0) + note.attack + note.decay, name).toBeLessThanOrEqual(2.2)
      }
    }
  })

  it('never lets one voice add up to more than the output can carry', () => {
    for (const name of names) {
      // The loudest moment is no more than every note that starts within a tenth of a second of another, together.
      const notes = VOICES[name] as Note[]
      for (const note of notes) {
        const together = notes.filter((other) => Math.abs((other.delay ?? 0) - (note.delay ?? 0)) < 0.1).reduce((sum, other) => sum + other.peak, 0)
        expect(together, name).toBeLessThanOrEqual(0.9)
      }
    }
  })

  it("holds no delayed note inside any voice of a toy's answer to a tap: each sound waits for its pose on the game's clock", () => {
    // Walked from the table the game sounds a tap from, so a voice added to an answer is held too.
    let walked = 0
    for (const kind of KINDS) for (const where of ['land', 'sea'] as const) {
      const cues = TAP[kind][where]
      expect(cues.length, `${kind} ${where}`).toBeGreaterThan(1)
      // Something sounds in the frame of the touch.
      expect(cues.some((cue) => cue.at === 0), `${kind} ${where}`).toBe(true)
      for (const cue of cues) {
        expect(cue.at, `${kind} ${cue.name}`).toBeGreaterThanOrEqual(0)
        for (const note of VOICES[cue.name] as Note[]) {
          expect(note.delay ?? 0, `${kind} ${where}: ${cue.name}`).toBe(0)
          walked += 1
        }
      }
    }
    expect(walked).toBeGreaterThan(40)
  })

  it('has no two voices alike', () => {
    const seen = new Map<string, string>()
    for (const name of names) {
      const key = JSON.stringify(VOICES[name])
      expect(seen.get(key), `${name} is the same as ${seen.get(key)}`).toBeUndefined()
      seen.set(key, name)
    }
  })

  it('plays what one touch set off as one list, each sound at its own pitch, loudness and moment', () => {
    const notes = notesOf([{ name: 'tok' }, { name: 'knock', pitch: 0.5, gain: 0.5, delay: 0.3 }])
    expect(notes).toHaveLength(VOICES.tok.length + VOICES.knock.length)
    const knock = notes[VOICES.tok.length]
    expect(knock.frequency).toBe(VOICES.knock[0].frequency * 0.5)
    expect(knock.peak).toBe(VOICES.knock[0].peak * 0.5)
    expect(knock.delay).toBe(0.3)
    expect(notes[0].frequency).toBe(VOICES.tok[0].frequency)
  })
})
