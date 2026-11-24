import { describe, expect, it } from 'vitest'
import { PLACES, THINGS, BUTLER } from './things'
import { VOICES, landVoice, pokeVoice } from './voices'

const kinds = [...new Set([...THINGS, BUTLER].map((one) => one.kind))]
const all = [...Object.values(VOICES), ...kinds.flatMap((kind) => [0, 1, 2].map((turn) => pokeVoice(kind, turn))), ...kinds.flatMap((kind) => PLACES.map((place) => landVoice(kind, place)))]

describe('the voices', () => {
  it('stay in range', () => {
    for (const voice of all) for (const note of voice) {
      expect(note.frequency).toBeGreaterThanOrEqual(50)
      expect(note.frequency).toBeLessThanOrEqual(4000)
      expect(note.peak).toBeLessThanOrEqual(0.5)
      expect(note.attack).toBeGreaterThan(0)
      expect((note.delay ?? 0) + note.attack + note.decay).toBeLessThan(2.5)
    }
  })
  it('are different for each kind in each place, and for each poke', () => {
    const land = kinds.flatMap((kind) => PLACES.map((place) => JSON.stringify(landVoice(kind, place))))
    expect(new Set(land).size).toBe(land.length)
    expect(new Set(kinds.map((kind) => JSON.stringify(pokeVoice(kind, 0)))).size).toBe(kinds.length)
  })
})
