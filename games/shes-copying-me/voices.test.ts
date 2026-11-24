import { describe, expect, it } from 'vitest'
import { THROWS } from './fx'
import { GESTURES, GUESTS, THINGS, type Mood } from './rules'
import { ACT_SOUNDS, ANTIC_SOUNDS, guestSound } from './voices'

describe('every cell is heard and seen as itself', () => {
  it('has a sound of its own for each thing in each act, each coat by effect, and each guest in each mood', () => {
    const acts = THINGS.flatMap((thing) => GESTURES.map((act) => JSON.stringify(ACT_SOUNDS[thing][act])))
    expect(new Set(acts).size).toBe(30)
    const antics = Object.values(ANTIC_SOUNDS).map((notes) => JSON.stringify(notes))
    expect(antics).toHaveLength(42)
    expect(new Set(antics).size).toBe(42)
    const moods: Mood[] = ['delight', 'outrage', 'puzzled', 'giggle', 'sneeze', 'sing', 'salute', 'chase', 'faint']
    expect(new Set(GUESTS.flatMap((g) => moods.map((m) => JSON.stringify(guestSound(g, m))))).size).toBe(36)
  })
  it('throws bits of its own for each thing in each act', () => {
    expect(new Set(THINGS.flatMap((thing) => GESTURES.map((act) => JSON.stringify(THROWS[thing][act])))).size).toBe(30)
  })
  it('keeps every note in range', () => {
    const all = [...THINGS.flatMap((thing) => GESTURES.flatMap((act) => ACT_SOUNDS[thing][act])), ...Object.values(ANTIC_SOUNDS).flat(), ...GUESTS.flatMap((g) => guestSound(g, 'sing'))]
    for (const note of all) {
      expect(note.frequency).toBeGreaterThanOrEqual(50)
      expect(note.frequency).toBeLessThanOrEqual(8000)
      expect(note.peak).toBeGreaterThan(0)
      expect(note.peak).toBeLessThanOrEqual(0.35)
      expect((note.delay ?? 0) + note.attack + note.decay).toBeLessThan(2.5)
    }
  })
})
