import { describe, expect, it } from 'vitest'
import { FOLK_SOUNDS } from './folkVoices'
import { WHO } from './hall'
import { CRAFTS } from './things'
import { HALL_SOUNDS, notesOf, notesOfAll, type Sound } from './voices'

/** Every sound the fair can make: each named one, and each shaped one at the ends of its range. */
const ALL: Sound[] = [
  ...HALL_SOUNDS.map((name) => ({ name })),
  ...FOLK_SOUNDS.map((name) => ({ name })),
  { name: 'gloop', fat: 0 }, { name: 'gloop', fat: 1 }, { name: 'lift', fat: 0 }, { name: 'lift', fat: 1 },
  ...[0, 1, 2].flatMap((variant) => [{ name: 'plip' as const, size: 3.5, variant }, { name: 'plip' as const, size: 5.5, variant }, { name: 'bubble' as const, variant }, { name: 'chime' as const, colour: variant }]),
  ...WHO.flatMap((who) => [{ name: 'poke' as const, who }, { name: 'take' as const, who }]),
  // An empty bell and a star on its rim honk alike, and his honk with a thing in the bell is the last note of his tune: both by the sheet.
  ...([null, 'candle', 'wreath', 'biscuit'] as const).flatMap((holds) => (['plain', 'like', 'dislike'] as const).flatMap((taste) => [0, 1, 2, 3].map((step) => ({ name: 'tune' as const, holds, taste, step })))),
]

describe('the voices', () => {
  it('keeps every note in a range a small speaker can play and a child can bear', () => {
    for (const sound of ALL) {
      const notes = notesOf(sound)
      expect(notes.length, sound.name).toBeGreaterThan(0)
      expect(notes.length, sound.name).toBeLessThanOrEqual(3)
      for (const note of notes) {
        expect(note.frequency, sound.name).toBeGreaterThanOrEqual(60)
        expect(note.frequency, sound.name).toBeLessThanOrEqual(6500)
        if (note.glideTo !== undefined) {
          expect(note.glideTo, sound.name).toBeGreaterThanOrEqual(60)
          expect(note.glideTo, sound.name).toBeLessThanOrEqual(6500)
        }
        expect(note.peak, sound.name).toBeGreaterThan(0)
        expect(note.peak, sound.name).toBeLessThanOrEqual(0.36)
        expect(note.attack, sound.name).toBeGreaterThan(0)
        // Short: the longest is the pot's ring, under a second.
        expect(note.attack + note.decay, sound.name).toBeLessThanOrEqual(0.95)
      }
    }
  })

  it('makes no note wait: every part of a sound starts when the game says so', () => {
    for (const sound of ALL) for (const note of notesOf(sound)) expect(note.delay ?? 0, sound.name).toBe(0)
  })

  it('gives every sound its own notes', () => {
    const seen = new Map<string, string>()
    for (const sound of ALL) {
      const key = JSON.stringify(notesOf(sound))
      expect(seen.has(key), `${JSON.stringify(sound)} sounds like ${seen.get(key)}`).toBe(false)
      seen.set(key, JSON.stringify(sound))
    }
  })

  it('makes the gloop lower the fatter the candle is, and a bigger drop lower than a small one', () => {
    expect(notesOf({ name: 'gloop', fat: 1 })[0].frequency).toBeLessThan(notesOf({ name: 'gloop', fat: 0 })[0].frequency * 0.6)
    expect(notesOf({ name: 'plip', size: 5.5, variant: 0 })[0].frequency).toBeLessThan(notesOf({ name: 'plip', size: 3.5, variant: 0 })[0].frequency)
  })

  it('gives each fair-goer a voice of its own, in its own register', () => {
    const pitch = Object.fromEntries(WHO.map((who) => [who, notesOf({ name: 'poke', who })[0].frequency]))
    expect(pitch.tuba).toBeLessThan(pitch.maker)
    expect(pitch.maker).toBeLessThan(pitch.goat)
    expect(pitch.goat).toBeLessThan(pitch.bundle)
    // What lies in the bell changes his honk, and his taste for its colour turns the note.
    const honk = (holds: (typeof CRAFTS)[number] | null) => JSON.stringify(notesOf({ name: 'poke', who: 'tuba', holds }))
    expect(new Set([honk(null), ...CRAFTS.map(honk)]).size).toBeGreaterThanOrEqual(4)
    const turn = (taste: 'plain' | 'like' | 'dislike') => JSON.stringify(notesOf({ name: 'tune', holds: 'wreath', taste, step: 0 }))
    expect(new Set([turn('plain'), turn('like'), turn('dislike')]).size).toBe(3)
  })

  it('joins everything one touch sets off into one list', () => {
    expect(notesOfAll([{ name: 'knock' }, { name: 'poke', who: 'goat' }])).toHaveLength(4)
    expect(notesOfAll([])).toEqual([])
  })
})
