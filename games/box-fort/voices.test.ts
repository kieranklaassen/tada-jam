import { describe, expect, it } from 'vitest'
import { SOUNDS, VOICES, notesOf, variantsOf } from './voices'

// The sounds the sheet calls long: a hush, a hiss, a hum, a wheeze, a tread, a roll that rings down.
const LONG: readonly string[] = ['trundle', 'settle', 'hiss', 'warm', 'tread', 'wheeze']

// Nobody has heard these: the numbers are held in a range that cannot hurt or drone.
describe('the voices', () => {
  it('starts every voice at once: no wait is hidden in a voice before its first note', () => {
    for (const sound of SOUNDS) for (let variant = 0; variant < variantsOf(sound); variant++) {
      expect(Math.min(...notesOf(sound, variant).map((note) => note.delay ?? 0)), sound).toBe(0)
    }
  })

  it('keeps every note in a pitch a tablet can play and quiet enough to stack, short unless the sheet calls the sound long', () => {
    for (const sound of SOUNDS) for (let variant = 0; variant < variantsOf(sound); variant++) {
      const notes = notesOf(sound, variant)
      expect(notes.length, sound).toBeGreaterThan(0)
      let ends = 0
      for (const note of notes) {
        for (const pitch of [note.frequency, note.glideTo ?? note.frequency]) { expect(pitch, sound).toBeGreaterThanOrEqual(50); expect(pitch, sound).toBeLessThanOrEqual(7000) }
        expect(note.peak, sound).toBeGreaterThan(0); expect(note.peak, sound).toBeLessThanOrEqual(0.3)
        expect(note.attack, sound).toBeGreaterThan(0)
        ends = Math.max(ends, (note.delay ?? 0) + note.attack + note.decay)
      }
      expect(ends, sound).toBeLessThanOrEqual(LONG.includes(sound) ? 1.5 : 0.6)
    }
  })

  it('gives no two sounds the same notes', () => {
    const written = SOUNDS.map((sound) => JSON.stringify(VOICES[sound][0]))
    expect(new Set(written).size).toBe(SOUNDS.length)
  })

  it('raises every pitch with the speed of the cut and never the length', () => {
    const slow = notesOf('snip', 0, 0.85), fast = notesOf('snip', 0, 1.35)
    slow.forEach((note, i) => { expect(fast[i].frequency).toBeGreaterThan(note.frequency); expect(fast[i].decay).toBe(note.decay) })
    expect(notesOf('snip', 5)).toEqual(notesOf('snip', 5 % variantsOf('snip')))
  })
})
