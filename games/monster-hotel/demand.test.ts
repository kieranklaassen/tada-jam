import { describe, expect, it } from 'vitest'
import { demandOf } from './demand'
import { GUEST_IDS } from './guests'
import { roomCount, type House } from './hotel'

const plain: House = { shape: 'long', fixtures: [], twins: [] }
const heated: House = { shape: 'long', fixtures: [{ kind: 'boiler', col: 0 }, { kind: 'snow', col: 2 }], twins: [] }

describe('the door a guest stares at', () => {
  it('in a house with nothing built in, everyone asks for the same room: the one with the view', () => {
    const doors = new Set(GUEST_IDS.map((id) => demandOf(plain, id)))
    expect([...doors]).toEqual([5])
  })

  it('a creature of the cold asks for the room under the snow hole and one of the warm for the room over the boiler', () => {
    expect(demandOf(heated, 'yeti')).toBe(5)
    expect(demandOf(heated, 'bat')).toBe(5)
    expect(demandOf(heated, 'singer')).toBe(5)
    expect(demandOf(heated, 'lizard')).toBe(0)
    // The rest ask for the mildest room, highest up and furthest along.
    expect(demandOf(heated, 'blob')).toBe(4)
    expect(demandOf(heated, 'troll')).toBe(4)
  })

  it('is always a room of the house, and the same each time', () => {
    for (const shape of ['square', 'long', 'tower'] as const) {
      const house: House = { shape, fixtures: [{ kind: 'boiler', col: 1 }, { kind: 'snow', col: 0 }], twins: [] }
      for (const id of GUEST_IDS) {
        const door = demandOf(house, id)
        expect(door).toBeGreaterThanOrEqual(0)
        expect(door).toBeLessThan(roomCount(shape))
        expect(demandOf(house, id)).toBe(door)
      }
    }
  })
})
