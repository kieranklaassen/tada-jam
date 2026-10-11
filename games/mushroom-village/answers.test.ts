import { describe, expect, it } from 'vitest'
import { everyAnswer, notesOf, poke, swell } from './answers'
import { FULL } from './config'

// Nobody could listen while the sounds were written, so every note is held in range here.

describe('the notes of every answer', () => {
  it('stay in a range a small speaker plays and an ear can bear', () => {
    const answers = everyAnswer()
    expect(answers.length).toBeGreaterThan(50)
    for (const answer of answers) {
      const notes = notesOf(answer)
      expect(notes.length).toBeGreaterThan(0)
      for (const note of notes) {
        expect(note.frequency).toBeGreaterThanOrEqual(50)
        expect(note.frequency).toBeLessThanOrEqual(6000)
        if (note.glideTo !== undefined) { expect(note.glideTo).toBeGreaterThanOrEqual(50); expect(note.glideTo).toBeLessThanOrEqual(6000) }
        expect(note.peak).toBeGreaterThan(0)
        expect(note.peak).toBeLessThanOrEqual(0.2)
        expect(note.attack).toBeGreaterThan(0)
        expect(note.decay).toBeGreaterThan(0)
        expect(note.attack + note.decay).toBeLessThanOrEqual(1.5)
        expect(note.delay ?? 0).toBeLessThanOrEqual(2)
      }
    }
  })

  it('carry no delay of their own: a note sounds at its beat, and its beat is where the pose is set', () => {
    for (const answer of everyAnswer()) for (const beat of answer) for (const note of beat.notes ?? []) expect(note.delay).toBeUndefined()
  })

  it('never sound without something moving: every beat that has a note has a push', () => {
    for (const answer of everyAnswer()) for (const beat of answer) if ((beat.notes?.length ?? 0) > 0) expect(Object.keys(beat.kick ?? {}).length).toBeGreaterThan(0)
  })

  it('creak one step higher at every step of a swelling, in each kind', () => {
    for (const kind of ['red', 'bell', 'puff'] as const) {
      let last = 0
      for (let size = 1; size <= FULL; size++) {
        const pitch = notesOf(swell(kind, size))[0].frequency
        expect(pitch).toBeGreaterThan(last)
        last = pitch
      }
    }
  })

  it('gives each kind its own creak and its own poke', () => {
    const first = (kind: 'red' | 'bell' | 'puff') => { const note = notesOf(swell(kind, 6))[0]; return `${note.kind} ${note.wave ?? ''} ${Math.round(note.frequency)}` }
    expect(new Set([first('red'), first('bell'), first('puff')]).size).toBe(3)
    const pokes = (['red', 'bell', 'puff'] as const).map((kind) => JSON.stringify(notesOf(poke(kind, 6))))
    expect(new Set(pokes).size).toBe(3)
  })

  it('rings a bigger bell lower and boings a taller red one lower', () => {
    expect(notesOf(poke('bell', FULL))[0].frequency).toBeLessThan(notesOf(poke('bell', 1))[0].frequency)
    expect(notesOf(poke('red', FULL))[0].frequency).toBeLessThan(notesOf(poke('red', 1))[0].frequency)
  })
})
