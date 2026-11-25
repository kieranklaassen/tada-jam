import { describe, expect, it } from 'vitest'
import { IDS } from './layout'
import { VOICES, notesOf } from './voices'

describe('the sounds', () => {
  it('stay gentle, short and within what a tablet can sound', () => {
    for (const [name, notes] of Object.entries(VOICES)) {
      expect(notes.length, name).toBeGreaterThan(0)
      expect(Math.max(...notes.map((e) => (e.delay ?? 0) + e.attack + e.decay)), name).toBeLessThan(3.2)
      for (const e of notes) {
        expect(e.peak, name).toBeLessThanOrEqual(0.45)
        expect(Math.min(e.frequency, e.glideTo ?? 99), name).toBeGreaterThanOrEqual(39)
        expect(e.frequency, name).toBeLessThan(5400)
        if (e.kind === 'tone') expect(Math.max(e.frequency, e.glideTo ?? 0), name).toBeLessThan(2600)
      }
    }
  })
  it('belong to one each: no two are the same', () => {
    const all = Object.values(VOICES).map((v) => JSON.stringify(v))
    expect(new Set(all).size).toBe(all.length)
    for (const id of IDS) for (const type of ['poke', 'sneeze', 'splash', 'meet', 'stop', 'land', 'home'] as const) expect(notesOf({ type, id }).length, `${id} ${type}`).toBeGreaterThan(0)
  })
  it('answer a touch at once', () => {
    for (const name of ['grab', 'shake', 'pat', 'night', 'morning', ...IDS.map((id) => `${id}.poke`)]) expect(Math.min(...VOICES[name].map((e) => e.delay ?? 0)), name).toBe(0)
  })
})
