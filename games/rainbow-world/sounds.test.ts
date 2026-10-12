import { describe, expect, it } from 'vitest'
import { PIECES, PIECE_IDS } from './pieces'
import { SOUND_NAMES, notesFor, notesOf } from './sounds'

// Nobody has listened to these sounds, so their numbers are held in range here.

describe('the sounds, as numbers', () => {
  const every = SOUND_NAMES.flatMap((name) => [...PIECE_IDS.map((piece) => ({ name, piece, gain: 1 })), { name, gain: 1 }, { name, gain: 0 }])

  it('gives every sound at least one note, each short, quiet enough and in a range a small speaker plays', () => {
    for (const sound of every) {
      const notes = notesFor(sound)
      expect(notes.length, sound.name).toBeGreaterThan(0)
      for (const note of notes) {
        expect(note.frequency, sound.name).toBeGreaterThanOrEqual(80)
        expect(note.frequency, sound.name).toBeLessThanOrEqual(6000)
        if (note.glideTo !== undefined) {
          expect(note.glideTo, sound.name).toBeGreaterThanOrEqual(80)
          expect(note.glideTo, sound.name).toBeLessThanOrEqual(6000)
        }
        expect(note.peak, sound.name).toBeGreaterThan(0)
        expect(note.peak, sound.name).toBeLessThanOrEqual(0.32)
        expect(note.attack, sound.name).toBeGreaterThan(0)
        expect(note.attack + note.decay, sound.name).toBeLessThanOrEqual(1)
      }
    }
  })

  it('starts every note with its voice: nothing is timed on the audio clock', () => {
    for (const sound of every) for (const note of notesFor(sound)) expect(note.delay ?? 0, sound.name).toBe(0)
  })

  it('gives each thing a knock of its own pitch, the arches lowest and the largest lowest of all', () => {
    const pitch = (piece: (typeof PIECE_IDS)[number]): number => notesFor({ name: 'knock', piece, gain: 1 })[0].frequency
    expect(new Set(PIECE_IDS.map(pitch)).size).toBe(PIECE_IDS.length)
    expect(pitch('arch-large')).toBeLessThan(pitch('arch-middle'))
    expect(pitch('arch-middle')).toBeLessThan(pitch('arch-small'))
    expect(pitch('arch-small')).toBeLessThan(pitch('doll-tall'))
    expect(pitch('doll-tall')).toBeLessThan(pitch('doll-round'))
    expect(pitch('doll-round')).toBeLessThan(pitch('doll-small'))
    // A thing lifts on its own note an octave up.
    for (const piece of PIECE_IDS) expect(notesFor({ name: 'pick', piece, gain: 1 })[0].frequency).toBeCloseTo(PIECES[piece].note * 2, 5)
  })

  it('plays a harder landing louder, and never silent', () => {
    const loud = notesFor({ name: 'knock', piece: 'doll-tall', gain: 1 })[0].peak, soft = notesFor({ name: 'knock', piece: 'doll-tall', gain: 0.5 })[0].peak
    expect(loud).toBeGreaterThan(soft)
    expect(notesFor({ name: 'knock', piece: 'doll-tall', gain: 0 })[0].peak).toBeGreaterThan(0.02)
  })

  it('joins everything one moment sets off into the notes of one voice', () => {
    const both = notesOf([{ name: 'pick', piece: 'horse', gain: 1 }, { name: 'tink', gain: 1 }])
    expect(both.length).toBe(notesFor({ name: 'pick', piece: 'horse', gain: 1 }).length + notesFor({ name: 'tink', gain: 1 }).length)
  })

  it('makes the ghost a soft hoot and no wail: low, slow to come, quiet and round', () => {
    expect(SOUND_NAMES as readonly string[]).not.toContain('wail')
    for (const step of [0, 1]) for (const note of notesFor({ name: 'hoot', gain: 1, step })) {
      expect(note.kind).toBe('tone')
      expect(note.kind === 'tone' && note.wave).toBe('sine')
      expect(note.frequency).toBeLessThanOrEqual(500)
      expect(note.glideTo ?? note.frequency).toBeLessThanOrEqual(500)
      expect(note.peak).toBeLessThanOrEqual(0.07)
      expect(note.attack).toBeGreaterThanOrEqual(0.1)
    }
    // A giggle is a doll's own small voice, quieter than its hiccup.
    for (const piece of ['doll-tall', 'doll-round', 'doll-small'] as const) {
      const loudest = (name: 'giggle' | 'hic'): number => Math.max(...notesFor({ name, piece, gain: 1 }).map((note) => note.peak))
      expect(loudest('giggle')).toBeLessThanOrEqual(loudest('hic'))
    }
  })
})
