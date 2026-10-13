import { describe, expect, it } from 'vitest'
import { deserialize, firstToys, fresh, serialize } from './save'
import { CAT_SEATS, KINDS, LAND_R } from './toys'

describe('a first visit', () => {
  it('finds the house standing for the youngest and for a child whose age is not known', () => {
    for (const age of [null, 1, 2, 3]) {
      const toys = firstToys(age)
      expect(toys.find((toy) => toy.kind === 'house')!.where).toBe('land')
      expect(toys.filter((toy) => toy.where === 'tray')).toHaveLength(4)
    }
  })

  it('finds a bare island and a full tray from four up, however old', () => {
    for (const age of [4, 5, 9, 12, 40]) expect(firstToys(age).every((toy) => toy.where === 'tray')).toBe(true)
  })

  it('stands the house on the land, clear of the first seat of the cat', () => {
    const house = firstToys(2).find((toy) => toy.kind === 'house')!
    expect(Math.hypot(house.x, house.z)).toBeLessThan(LAND_R)
  })

  it('starts at the one place, unturned', () => {
    const state = fresh(null)
    expect(state.position).toBe('island')
    expect(state.turn).toBe(0)
    expect(state.toys.map((toy) => toy.kind)).toEqual([...KINDS])
  })
})

describe('the saved island', () => {
  it('comes back as it was written', () => {
    const state = fresh(4)
    state.turn = 1.234
    state.toys[0] = { kind: 'lighthouse', where: 'land', x: 1.25, z: -0.5 }
    state.toys[1] = { kind: 'boat', where: 'sea', x: 5.45, z: 0 }
    state.toys[2] = { kind: 'sheep', where: 'boat', x: 0, z: 0 }
    const back = deserialize(JSON.parse(JSON.stringify(serialize(state))), 2)
    expect(back.turn).toBe(1.234)
    expect(back.toys).toEqual(state.toys)
    // The age chose nothing: the slot had a state.
    expect(back.toys[4].where).toBe('tray')
  })

  it('is small', () => {
    expect(JSON.stringify(serialize(fresh(2))).length).toBeLessThan(1024)
  })

  it('rounds what it writes', () => {
    const state = fresh(4)
    state.turn = 7 + 0.12345678
    state.toys[3] = { kind: 'tree', where: 'land', x: 0.123456, z: -1.98765 }
    const written = serialize(state)
    expect(written.turn).toBeCloseTo(7.12345678 - Math.PI * 2, 3)
    expect(written.toys[3]).toEqual({ kind: 'tree', where: 'land', x: 0.12, z: -1.99 })
  })

  it('is a first visit when the slot is empty or is not a state', () => {
    for (const raw of [null, undefined, 7, 'island', [], { v: 99 }, { toys: 3 }]) {
      const state = deserialize(raw, 4)
      expect(state.toys).toHaveLength(5)
      expect(state.toys.every((toy) => toy.where === 'tray')).toBe(true)
    }
  })

  it('repairs each toy by itself', () => {
    const good = serialize(fresh(4))
    const raw = JSON.parse(JSON.stringify(good)) as { toys: unknown[]; turn: unknown }
    raw.toys[0] = { kind: 'lighthouse', where: 'land', x: 99, z: 0 }
    raw.toys[1] = { kind: 'sheep', where: 'land', x: 0, z: 0 }
    raw.toys[2] = { kind: 'sheep', where: 'land', x: 1, z: 1 }
    raw.toys[3] = { kind: 'tree', where: 'boat', x: 0, z: 0 }
    raw.toys[4] = { kind: 'house', where: 'sea', x: Number.NaN, z: 'far' }
    raw.turn = 'round'
    const state = deserialize(raw, 4)
    expect(state.toys.map((toy) => toy.where)).toEqual(['tray', 'tray', 'land', 'tray', 'tray'])
    expect(state.turn).toBe(0)
  })

  it('takes the sheep out of a boat that is in the tray', () => {
    const raw = JSON.parse(JSON.stringify(serialize(fresh(4)))) as { toys: unknown[] }
    raw.toys[2] = { kind: 'sheep', where: 'boat', x: 0, z: 0 }
    expect(deserialize(raw, 4).toys[2].where).toBe('tray')
  })

  it("keeps the cat's seat when it is one, and leaves it out of a record that has none or has no seat there", () => {
    const written = JSON.parse(JSON.stringify(serialize({ ...fresh(4), cat: 3 })))
    expect(written.cat).toBe(3)
    expect(deserialize(written, 4).cat).toBe(3)
    // A record from before the cat kept its seat has no such field, and none is made up for it.
    expect('cat' in JSON.parse(JSON.stringify(serialize(fresh(4))))).toBe(false)
    expect(deserialize(JSON.parse(JSON.stringify(serialize(fresh(4)))), 4).cat).toBeUndefined()
    for (const cat of [-1, CAT_SEATS, 2.5, '3', null, {}, Number.NaN]) expect(deserialize({ ...written, cat }, 4).cat).toBeUndefined()
    for (let seat = 0; seat < CAT_SEATS; seat++) expect(deserialize({ ...written, cat: seat }, 4).cat).toBe(seat)
  })

  it('wraps a turn of any size', () => {
    const raw = JSON.parse(JSON.stringify(serialize(fresh(4)))) as { turn: number }
    raw.turn = -1
    expect(deserialize(raw, 4).turn).toBeCloseTo(Math.PI * 2 - 1, 6)
  })
})
