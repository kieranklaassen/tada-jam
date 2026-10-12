import { describe, expect, it } from 'vitest'
import { SOUND_KINDS, type SoundEvent } from './sounds'
import { BELLS, CHIMES, MOST_DELAY, MOST_NOTES, notesOf, voiceNotes } from './voices'

// Nobody has heard these sounds, so every number in them is held in range,
// and no voice hides a wait: a sound starts with its event.

const steps = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]

describe('every voice', () => {
  it('has a voice for every sound, for every value its event may carry, in a range a small speaker plays and a child can bear', () => {
    for (const kind of SOUND_KINDS) {
      for (const n of steps) {
        const notes = notesOf({ kind, at: 0, n })
        expect(notes.length, kind).toBeGreaterThan(0)
        expect(notes.length, kind).toBeLessThanOrEqual(6)
        for (const note of notes) {
          for (const pitch of [note.frequency, note.glideTo ?? note.frequency]) {
            expect(pitch, kind).toBeGreaterThanOrEqual(60)
            expect(pitch, kind).toBeLessThanOrEqual(6000)
          }
          expect(note.peak, kind).toBeGreaterThan(0)
          expect(note.peak, kind).toBeLessThanOrEqual(0.2)
          expect(note.attack, kind).toBeGreaterThan(0)
          expect(note.attack + note.decay, kind).toBeLessThanOrEqual(1.4)
        }
        // What starts together is never loud.
        expect(notes.filter((note) => (note.delay ?? 0) === 0).reduce((sum, note) => sum + note.peak, 0), kind).toBeLessThanOrEqual(0.3)
      }
    }
  })

  it('hides no wait: the first note of every voice starts with its event, and no note starts later than the tail of one sound', () => {
    for (const kind of SOUND_KINDS) {
      for (const n of steps) {
        const notes = notesOf({ kind, at: 0, n })
        expect(Math.min(...notes.map((note) => note.delay ?? 0)), kind).toBe(0)
        expect(Math.max(...notes.map((note) => note.delay ?? 0)), kind).toBeLessThanOrEqual(MOST_DELAY)
      }
    }
  })

  it('the bells climb from the left of the wood to the right, and the glow-worms\' chimes from the first worm to the last', () => {
    for (const scale of [BELLS, CHIMES]) for (let i = 1; i < scale.length; i++) expect(scale[i]).toBeGreaterThan(scale[i - 1])
    expect(notesOf({ kind: 'bell', at: 0, n: 0.05 })[0].frequency).toBeLessThan(notesOf({ kind: 'bell', at: 0, n: 0.95 })[0].frequency)
    expect(notesOf({ kind: 'chime', at: 0, n: 0 })[0].frequency).toBeLessThan(notesOf({ kind: 'chime', at: 0, n: 1 })[0].frequency)
  })
})

describe('one voice for a batch of events', () => {
  it('starts each event as late after the first as the game\'s own clock says, and no later', () => {
    const events: SoundEvent[] = [{ kind: 'ring', at: 2, n: 0 }, { kind: 'pad', at: 2.05, n: 0 }]
    const notes = voiceNotes(events)
    const ring = notesOf(events[0]).length
    expect(notes.slice(0, ring).map((note) => note.delay ?? 0)).toEqual(notesOf(events[0]).map((note) => note.delay ?? 0))
    expect(notes[ring].delay).toBeCloseTo(0.05 + (notesOf(events[1])[0].delay ?? 0), 9)
  })

  it('is never a wall of sound: a frame in which everything answers at once plays a bounded number of notes', () => {
    const events: SoundEvent[] = SOUND_KINDS.map((kind) => ({ kind, at: 1, n: 0.5 }))
    expect(voiceNotes(events)).toHaveLength(MOST_NOTES)
    expect(voiceNotes([])).toHaveLength(0)
  })
})
