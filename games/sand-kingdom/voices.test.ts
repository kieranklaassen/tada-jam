import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { HISS_TOP_SPEED, LONG_VOICES, THUD_PITCHES, VOICES, hiss, thud, tick } from './voices'

/** Every voice of the game by name, the variants included. */
const all: [string, readonly Note[]][] = [
  ...Object.entries(VOICES),
  ...THUD_PITCHES.map((_, i): [string, Note[]] => [`thud ${i}`, thud(i)]),
  ...[0, 3, HISS_TOP_SPEED].map((speed): [string, Note[]] => [`hiss at ${speed}`, hiss(speed)]),
  ...[0, 1, 2, 3, 4].map((i): [string, Note[]] => [`tick ${i}`, tick(i)]),
]

describe('the voices', () => {
  it.each(all)('%s is short and quiet, and every pitch can be heard', (name, notes) => {
    expect(notes.length).toBeGreaterThan(0)
    let end = 0
    for (const note of notes) {
      for (const pitch of [note.frequency, note.glideTo ?? note.frequency]) {
        expect(pitch).toBeGreaterThanOrEqual(60)
        expect(pitch).toBeLessThanOrEqual(6000)
      }
      expect(note.peak).toBeGreaterThan(0)
      expect(note.peak).toBeLessThanOrEqual(0.32)
      expect(note.attack).toBeGreaterThan(0)
      expect(note.decay).toBeGreaterThan(0)
      end = Math.max(end, (note.delay ?? 0) + note.attack + note.decay)
    }
    // The sun's second note and the tide's sounds are slow; nothing else outlasts three quarters of a second.
    expect(end).toBeLessThanOrEqual(LONG_VOICES.includes(name) ? 3.6 : 0.75)
  })

  it('no two named voices are the same sound', () => {
    const seen = new Map<string, string>()
    for (const [name, notes] of Object.entries(VOICES)) {
      const key = JSON.stringify(notes)
      expect(seen.get(key), `${name} is the same as ${seen.get(key)}`).toBeUndefined()
      seen.set(key, name)
    }
  })

  it('has four thuds of four pitches', () => {
    expect(new Set(THUD_PITCHES.map((_, i) => thud(i)[0].frequency)).size).toBe(4)
  })

  it('makes the hiss higher and louder the faster the finger goes, up to a top speed', () => {
    const slow = hiss(1)[0], fast = hiss(8)[0]
    expect(fast.frequency).toBeGreaterThan(slow.frequency)
    expect(fast.peak).toBeGreaterThan(slow.peak)
    expect(hiss(99)).toEqual(hiss(HISS_TOP_SPEED))
    expect(hiss(-1)).toEqual(hiss(0))
  })

  it('has no buzzer: a sawtooth is only in the gull, and nothing else falls on a harsh wave', () => {
    for (const [name, notes] of Object.entries(VOICES)) {
      for (const note of notes) if (note.wave === 'sawtooth' || note.wave === 'square') expect(name).toBe('squawk')
    }
  })
})
