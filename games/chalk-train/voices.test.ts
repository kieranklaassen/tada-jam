import { describe, expect, it } from 'vitest'
import { GRID, THINGS } from './grid'
import { KINDS } from './marks'
import { RIDERS } from './tastes'
import { CUES, OWN_SOUNDS, RANGE, VOICES, isVoice, lengthOf, ownVoice, type VoiceKey } from './voices'

const keys = Object.keys(VOICES) as VoiceKey[]
/** The rows of the grid whose sounds are the same whoever is there: everything but the riders. */
const held = THINGS.filter((thing) => thing !== 'rider')

describe('the voices, as plain numbers', () => {
  it('keeps every note inside the stated ranges: pitch, peak, attack, decay and delay', () => {
    const within = (value: number, [lo, hi]: readonly [number, number]) => value >= lo && value <= hi
    for (const key of keys) for (const note of VOICES[key]) {
      expect(within(note.f, RANGE.f), `${key} pitch`).toBe(true)
      if (note.to !== undefined) expect(within(note.to, RANGE.f), `${key} glide`).toBe(true)
      expect(within(note.peak, RANGE.peak), `${key} peak`).toBe(true)
      expect(within(note.attack, RANGE.attack), `${key} attack`).toBe(true)
      expect(within(note.decay, RANGE.decay), `${key} decay`).toBe(true)
      expect(within(note.at, RANGE.at), `${key} delay`).toBe(true)
    }
  })

  it('keeps every voice short, and a voice that answers a landing finger very short', () => {
    for (const key of keys) expect(lengthOf(key), key).toBeLessThanOrEqual(RANGE.length)
    for (const key of keys.filter((k) => k.startsWith('land-'))) expect(lengthOf(key), key).toBeLessThanOrEqual(0.2)
  })

  it('never stacks a voice louder than the loudest single note allows', () => {
    // Notes that sound together add up: the sum of the peaks that start within 20 ms of each other stays modest.
    for (const key of keys) for (const note of VOICES[key]) {
      const together = VOICES[key].filter((other) => Math.abs(other.at - note.at) < 0.02).reduce((sum, other) => sum + other.peak, 0)
      expect(together, key).toBeLessThanOrEqual(0.24)
    }
  })

  it('gives no two voices the same notes', () => {
    const seen = new Set(keys.map((key) => JSON.stringify(VOICES[key])))
    expect(seen.size).toBe(keys.length)
  })

  it('has a voice for the sound of every grid cell, and a cue for when it is heard', () => {
    for (const thing of held) for (const kind of KINDS) {
      const sound = GRID[thing][kind].sound
      expect(isVoice(sound), `${thing} ${kind}: ${sound}`).toBe(true)
      expect(CUES[sound as VoiceKey], sound).toBeDefined()
    }
    // A rider's cells are heard in the rider's own voice: every rider has every one of them.
    for (const kind of KINDS) {
      const sound = GRID.rider[kind].sound
      if (isVoice(sound)) expect(CUES[sound]).toBeDefined()
      else for (const rider of RIDERS) expect(isVoice(ownVoice(rider, OWN_SOUNDS[sound])), `${rider} ${sound}`).toBe(true)
    }
    for (const rider of RIDERS) for (const which of ['call', 'squeak', 'grumble', 'hum', 'sneeze'] as const) expect(isVoice(ownVoice(rider, which))).toBe(true)
  })

  it('gives every rider a voice of its own: no two riders call, squeak, grumble, hum or sneeze at the same pitch', () => {
    for (const which of ['call', 'squeak', 'grumble', 'hum', 'sneeze'] as const) {
      const pitches = RIDERS.map((rider) => VOICES[ownVoice(rider, which)].find((note) => note.kind === 'tone')?.f ?? VOICES[ownVoice(rider, which)][0].f).sort((a, b) => a - b)
      for (let i = 1; i < pitches.length; i++) expect(pitches[i] / pitches[i - 1], which).toBeGreaterThan(1.25)
    }
  })

  it('cues a mark that gives no ride the moment it is made', () => {
    for (const thing of held) for (const kind of KINDS) {
      const cell = GRID[thing][kind]
      if (!cell.rides) expect(CUES[cell.sound as VoiceKey], cell.sound).toBe('made')
      else expect(CUES[cell.sound as VoiceKey], cell.sound).not.toBe(undefined)
    }
  })
})
