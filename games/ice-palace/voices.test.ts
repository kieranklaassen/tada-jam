import { describe, expect, it } from 'vitest'
import { SOUNDS, noteOfLength, notesOf, notesOfAll } from './voices'

// Nobody has heard these: the numbers are held in a range a small speaker can play and a child can bear.
describe('the voices', () => {
  it.each(SOUNDS)('%s is short, quiet enough and within hearing', (name) => {
    for (const pitch of [noteOfLength(64), noteOfLength(300)]) for (const lively of [0, 1]) {
      const notes = notesOf({ name, pitch, lively })
      expect(notes.length).toBeGreaterThan(0)
      expect(notes.length).toBeLessThanOrEqual(4)
      for (const note of notes) {
        expect(note.frequency).toBeGreaterThanOrEqual(60)
        expect(note.frequency).toBeLessThanOrEqual(12000)
        if (note.glideTo !== undefined) expect(note.glideTo).toBeGreaterThanOrEqual(60)
        expect(note.peak).toBeGreaterThan(0)
        expect(note.peak).toBeLessThanOrEqual(0.3)
        expect(note.attack).toBeGreaterThan(0)
        expect(note.attack + note.decay).toBeLessThanOrEqual(1.2)
      }
    }
  })

  it.each(SOUNDS)('%s starts all at once: no note waits inside its voice', (name) => {
    for (const note of notesOf({ name, pitch: 880, lively: 0.5 })) expect(note.delay ?? 0).toBe(0)
  })

  it('gives every sound its own notes', () => {
    const seen = new Map<string, string>()
    for (const name of SOUNDS) {
      const key = JSON.stringify(notesOf({ name, pitch: 880, lively: 0.5 }))
      expect(seen.get(key), `${name} sounds exactly like ${seen.get(key)}`).toBeUndefined()
      seen.set(key, name)
    }
  })

  it('tunes a block by its length: a long block is low, a short one high, an octave apart', () => {
    expect(noteOfLength(64)).toBeCloseTo(1760)
    expect(noteOfLength(300)).toBeCloseTo(880)
    expect(noteOfLength(180)).toBeLessThan(noteOfLength(120))
    expect(notesOf({ name: 'ring', pitch: noteOfLength(300) })[0].frequency).toBeCloseTo(880)
  })

  it('makes one voice of everything a step asked for', () => {
    expect(notesOfAll([{ name: 'plop' }, { name: 'giggle' }])).toHaveLength(notesOf({ name: 'plop' }).length + notesOf({ name: 'giggle' }).length)
  })
})
