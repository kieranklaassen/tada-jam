import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import type { PlayEvent } from './play'
import { CAST, COATS, THINGS, morning } from './tale'
import { THING_SOUNDS, VOICES, snoreOf, soundOf } from './voices'

describe('sounds', () => {
  it('are each their own: six instruments, thirty answers, a snore by coat', () => {
    const own = (all: Note[][]) => new Set(all.map((notes) => JSON.stringify(notes))).size
    expect(own(THINGS.map((thing) => THING_SOUNDS[thing]))).toBe(6)
    expect(own(CAST.flatMap((who) => THINGS.map((thing) => VOICES[who][thing])))).toBe(30)
    expect(own(CAST.flatMap((who) => COATS.map((coat) => snoreOf(who, coat, false))))).toBe(20)
  })
  it('answer every event, every note in range', () => {
    const plain = ['ponder', 'knock', 'dusk', 'cloth', 'out', 'unravel', 'night', 'crow', 'duck', 'astonished', 'remembers', 'swap', 'lamp'] as const
    const events: PlayEvent[] = [
      ...plain.map((kind) => ({ kind }) as PlayEvent),
      ...THINGS.flatMap((thing): PlayEvent[] => [{ kind: 'lift', thing }, { kind: 'throw', thing }, { kind: 'splat', thing, at: { x: 0, y: 0 } }, { kind: 'change', thing, who: null }, ...CAST.flatMap((who): PlayEvent[] => [true, false].map((small) => ({ kind: 'land', thing, who, small })))]),
      ...CAST.flatMap((who): PlayEvent[] => [{ kind: 'poke', who }, { kind: 'snore', who }, { kind: 'protest', who }, { kind: 'change', who, thing: null }]),
      { kind: 'mutter', wide: true }, { kind: 'mutter', wide: false },
    ]
    for (const event of events) {
      const notes = soundOf(event, morning())
      expect(notes.length, event.kind).toBeGreaterThan(0)
      for (const note of notes) {
        expect(note.frequency).toBeGreaterThanOrEqual(40)
        expect(note.frequency).toBeLessThanOrEqual(8000)
        expect(note.peak).toBeGreaterThan(0)
        expect(note.peak).toBeLessThanOrEqual(0.32)
        expect((note.delay ?? 0) + note.attack + note.decay).toBeLessThan(2.6)
      }
    }
  })
})
