import { describe, expect, it } from 'vitest'
import { VOICES, voice, type VoiceName } from './voices'

describe('voices', () => {
  const names = Object.keys(VOICES) as VoiceName[]
  it('are in range for every pitch and step', () => {
    for (const name of names) for (const p of [0.6, 1, 1.6]) for (const n of [0, 1, 7, 40]) {
      const notes = voice(name, p, n)
      expect(notes.length, name).toBeGreaterThan(0)
      for (const q of notes) {
        for (const f of [q.frequency, q.glideTo ?? q.frequency]) { expect(f, name).toBeGreaterThan(25); expect(f, name).toBeLessThan(9000) }
        expect(q.peak, name).toBeLessThanOrEqual(0.35)
        expect((q.delay ?? 0) + q.attack + q.decay, name).toBeLessThan(6)
      }
    }
  })
  it('no two are the same', () => {
    expect(new Set(names.map((n) => JSON.stringify(voice(n)))).size).toBe(names.length)
  })
})
