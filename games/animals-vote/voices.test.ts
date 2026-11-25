import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { pairsOf } from './motion'
import { ANIMALS, SNACKS, THINGS } from './things'
import { ROWS_HZ, clack, voiceOfClack, voiceOfCue, voiceOfEvent, voiceOfPoke } from './voices'

const sound = (notes: Note[]): void => {
  expect(notes.length).toBeGreaterThan(0)
  for (const n of notes) {
    expect(n.frequency).toBeGreaterThan(30)
    expect(n.frequency).toBeLessThan(6000)
    expect(n.peak).toBeGreaterThan(0)
    expect(n.peak).toBeLessThanOrEqual(0.4)
    expect((n.delay ?? 0) + n.attack + n.decay).toBeLessThan(4)
  }
}
describe('voices', () => {
  it('answers every touch', () => {
    const at = { x: 0, y: 0 }
    for (let turn = 0; turn < 3; turn++) {
      for (const who of ANIMALS) sound(voiceOfPoke({ target: { kind: 'animal', who }, at }, turn))
      for (const snack of SNACKS) sound(voiceOfPoke({ target: { kind: 'snack', snack }, at }, turn))
      for (const kind of ['bell', 'mole', 'basket', 'square'] as const) sound(voiceOfPoke({ target: { kind }, at }, turn))
      sound(voiceOfPoke({ target: { kind: 'plaque', slot: 0 }, at }, turn))
      sound(voiceOfPoke({ target: { kind: 'column', col: 1 }, at }, turn))
    }
  })
  it('lands a higher square on a higher pitch, and gives each animal its own landing', () => {
    for (let row = 1; row < 6; row++) expect(clack(row)[0].frequency).toBeGreaterThan(clack(row - 1)[0].frequency)
    expect([...ROWS_HZ].sort((a, b) => a - b)).toEqual(ROWS_HZ)
    expect(new Set(ANIMALS.map((who) => JSON.stringify(voiceOfClack(who, 0, false)))).size).toBe(6)
  })
  it('has a sound of its own for every animal in everything, and every pair', () => {
    const heard = new Set<string>()
    for (const thing of THINGS) for (const who of ANIMALS) {
      const notes = voiceOfCue({ type: 'turnOf', who, n: 0, round: 0 }, [thing], [], 0)
      sound(notes)
      heard.add(JSON.stringify(notes))
    }
    expect(heard.size).toBe(30)
    for (const a of THINGS) for (const b of THINGS) if (a !== b) sound(voiceOfCue({ type: 'result' }, [a, b], pairsOf([a, b]), 0))
    for (const who of ANIMALS) for (const snack of SNACKS) { sound(voiceOfEvent({ type: 'eat', snack, who }, 0)); sound(voiceOfEvent({ type: 'spit', snack, who }, 1)) }
  })
})
