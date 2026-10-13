import { describe, expect, it } from 'vitest'
import { BEATS, EARLY, JUMP_BEATS, LATE, PLACES, aim, beatOf, onBeat, pitchOf, placeOf } from './beat'

describe('the grid of the loop', () => {
  it('has thirty-two places to a lap: sixteen beats and the sixteen halves between them', () => {
    expect(BEATS).toBe(16)
    expect(PLACES).toBe(32)
    expect([0, 2, 30].every(onBeat)).toBe(true)
    expect([1, 3, 31].some(onBeat)).toBe(false)
    expect([0, 1, 2, 31].map(beatOf)).toEqual([0, 0, 1, 15])
  })

  it('counts places on round the ring, lap after lap', () => {
    expect(placeOf(0)).toBe(0)
    expect(placeOf(31)).toBe(31)
    expect(placeOf(32)).toBe(0)
    expect(placeOf(32 * 7 + 5)).toBe(5)
  })

  it('takes a tap for the place ahead up to three tenths of a beat early, and holds it', () => {
    expect(aim(3.71)).toEqual({ half: 8, at: 4, late: false })
    expect(aim(3.99)).toEqual({ half: 8, at: 4, late: false })
    expect(aim(4.21)).toEqual({ half: 9, at: 4.5, late: false })
  })

  it('takes a tap for the place just passed up to two tenths of a beat late, and launches at once', () => {
    expect(aim(4)).toEqual({ half: 8, at: 4, late: true })
    expect(aim(4.19)).toEqual({ half: 8, at: 4, late: true })
    expect(aim(4.69)).toEqual({ half: 9, at: 4.5, late: true })
  })

  it('leaves no moment between two places that belongs to neither', () => {
    expect(EARLY + LATE).toBeCloseTo(0.5, 10)
    for (let i = 0; i < 4000; i++) {
      const pos = i / 250, target = aim(pos)
      expect(target.at - pos).toBeLessThanOrEqual(EARLY + 1e-9)
      expect(pos - target.at).toBeLessThan(LATE + 1e-9)
      expect(target.late).toBe(pos >= target.at)
    }
  })

  it('makes a jump last one beat, so a jump from a place comes down on a place', () => {
    expect(JUMP_BEATS).toBe(1)
    for (let half = 0; half < 70; half++) expect(Number.isInteger((half / 2 + JUMP_BEATS) * 2)).toBe(true)
  })

  it('gives every beat a note of one five-note scale, so any springs at all are in tune', () => {
    const scale = new Set([0, 2, 4, 7, 9])
    for (let beat = 0; beat < BEATS; beat++) {
      const semitones = Math.round(12 * Math.log2(pitchOf(beat) / pitchOf(0)))
      expect(scale.has(((semitones % 12) + 12) % 12), `beat ${beat}`).toBe(true)
      expect(pitchOf(beat)).toBeGreaterThan(200)
      expect(pitchOf(beat)).toBeLessThan(700)
    }
    expect(pitchOf(BEATS)).toBe(pitchOf(0))
    // No two neighbours share a note, so a run of jumps is a tune and not a drone.
    for (let beat = 0; beat < BEATS; beat++) expect(pitchOf(beat)).not.toBe(pitchOf(beat + 1))
  })
})
