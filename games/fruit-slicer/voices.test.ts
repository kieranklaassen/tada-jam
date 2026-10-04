import { describe, expect, it } from 'vitest'
import { LOW_HZ, RANGE, VOICES, notesOf, ringHz, type VoiceId } from './voices'

const IDS = Object.keys(VOICES) as VoiceId[]
/** Lengths in points from the shortest piece there is to the longest order. */
const LENGTHS = [60, 100, 240, 600, 1200, 1440, 1920, 2400, 2880]
const within = (value: number, [low, high]: readonly [number, number]) => value >= low && value <= high

describe('every voice', () => {
  it('keeps every note inside the stated ranges, for every length and count', () => {
    for (const id of IDS)
      for (const length of LENGTHS)
        for (const count of [1, 4, 12, 40]) {
          const notes = notesOf(id, length, count)
          expect(notes.length, id).toBeGreaterThan(0)
          expect(notes.length, id).toBeLessThanOrEqual(24)
          for (const note of notes) {
            const where = `${id} at ${length}: ${JSON.stringify(note)}`
            expect(within(note.hz, RANGE.hz), where).toBe(true)
            if (note.to !== undefined) expect(within(note.to, RANGE.hz), where).toBe(true)
            expect(within(note.peak, RANGE.peak), where).toBe(true)
            expect(within(note.attack, RANGE.attack), where).toBe(true)
            expect(within(note.length, RANGE.length), where).toBe(true)
            expect(within(note.after ?? 0, RANGE.after), where).toBe(true)
            expect((note.after ?? 0) + note.attack + note.length, where).toBeLessThanOrEqual(RANGE.total)
          }
        }
  })

  it('is never louder than a touch should be: what starts together stays under a peak of 0.6', () => {
    for (const id of IDS)
      for (const length of LENGTHS) {
        const notes = notesOf(id, length, 12)
        for (const note of notes) {
          const together = notes.filter((other) => Math.abs((other.after ?? 0) - (note.after ?? 0)) < 0.02).reduce((sum, other) => sum + other.peak, 0)
          expect(together, id).toBeLessThanOrEqual(0.6)
        }
      }
  })

  it('gives each of the five customers its own noise and its own gulp', () => {
    for (const id of ['babble', 'gulp'] as const) {
      const prints = [0, 1, 2, 3, 4].map((who) => JSON.stringify(notesOf(id, 1200, who)))
      expect(new Set(prints).size, id).toBe(5)
    }
    // The pelican is the lowest and the ants the highest.
    expect(notesOf('babble', 1200, 0)[0].hz).toBeLessThan(notesOf('babble', 1200, 4)[0].hz)
    expect(notesOf('babble', 1200, 2)[0].hz).toBeGreaterThan(notesOf('babble', 1200, 1)[0].hz)
  })

  it('differs from every other voice', () => {
    const prints = IDS.map((id) => JSON.stringify(notesOf(id, 1200, 4)))
    expect(new Set(prints).size).toBe(IDS.length)
  })
})

describe('a length rings as a string does', () => {
  it('an octave up at half the length, and never out of range', () => {
    expect(ringHz(2400)).toBe(LOW_HZ)
    expect(ringHz(1200)).toBe(2 * LOW_HZ)
    expect(ringHz(800)).toBeCloseTo(3 * LOW_HZ)
    expect(ringHz(2880)).toBe(LOW_HZ)
    expect(ringHz(0)).toBe(LOW_HZ)
    expect(ringHz(1)).toBe(2640)
  })

  it('so a fruit cut down from whole to slivers climbs a scale', () => {
    for (const id of ['thwack', 'snick', 'pluck', 'quiver'] as const) {
      const pitches = [2400, 1200, 600, 300, 150].map((length) => notesOf(id, length).find((note) => note.kind === 'tone')!.hz)
      for (let i = 1; i < pitches.length; i++) expect(pitches[i], id).toBeGreaterThan(pitches[i - 1])
    }
  })

  it('and a roller ticks once for each part', () => {
    expect(notesOf('ticks', 2400, 3)).toHaveLength(3)
    expect(notesOf('rule', 2400, 12)).toHaveLength(12)
    expect(notesOf('press', 2400, 0)).toHaveLength(1)
    // Pressed into a shorter piece, the ticks are higher.
    expect(notesOf('press', 300, 4)[0].hz).toBeGreaterThan(notesOf('press', 1200, 4)[0].hz)
  })
})
