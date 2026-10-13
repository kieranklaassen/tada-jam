import { describe, expect, it } from 'vitest'
import { STARTER_STRIP_UP_TO_AGE } from './config'
import { FIELD, HOME_PLACE, OUT_PLACE, STARTER, TOY_IDS, TOY_SIZE } from './layout'
import { PEGS, deserializeTown, freshTown, serializeTown, type TownState } from './save'
import { STATE_VERSION } from './state'
import { MAX_STRIPS, nearestOn, type Strip } from './tape'

/** What ctx.storage hands back on the next visit. */
const stored = (state: TownState): unknown => JSON.parse(JSON.stringify(serializeTown(state)))

const strip = (i: number): Strip => ({ kind: (i % 4) as 0 | 1 | 2 | 3, ax: 300 + i * 3, ay: 120 + i * 8, bx: 950 - i * 2, by: 650 - i * 8 })

describe('a first visit', () => {
  it('opens for a child of four or younger, or of no known age, on one grey strip with the car standing on it', () => {
    for (const age of [null, 2, 3, STARTER_STRIP_UP_TO_AGE]) {
      const town = freshTown(age)
      expect(town.strips, `age ${age}`).toEqual([{ kind: 0, ...STARTER }])
      expect(nearestOn(town.strips[0], town.toys.car).off).toBeLessThan(1)
    }
  })

  it('opens for a child of five or older on a bare floor with the car beside the box', () => {
    for (const age of [STARTER_STRIP_UP_TO_AGE + 1, 6, 7, 9, 12]) {
      const town = freshTown(age)
      expect(town.strips, `age ${age}`).toEqual([])
      expect(town.toys.car).toEqual(OUT_PLACE.car)
    }
  })

  it('has the box tipped, every toy out, the grey roll in use and nobody on the bus, at every age', () => {
    for (const age of [null, 3, 7]) {
      const town = freshTown(age)
      expect(town).toMatchObject({ v: STATE_VERSION, position: 'town', finished: false, out: true, roll: 0, riding: { pegA: false, pegB: false, pegC: false } })
      for (const id of TOY_IDS) if (id !== 'car') expect(town.toys[id]).toEqual(OUT_PLACE[id])
    }
  })

  it('hides and locks nothing by age: the two first visits differ in the strip and the car and nothing else', () => {
    const young = freshTown(3), old = freshTown(7)
    expect({ ...young, strips: [], toys: { ...young.toys, car: OUT_PLACE.car } }).toEqual(old)
  })
})

describe('the saved town', () => {
  const town: TownState = {
    v: STATE_VERSION, position: 'town', finished: false, roll: 2, out: true,
    strips: [strip(0), strip(1), strip(5)],
    toys: { ...freshTown(7).toys, car: { x: 612, y: 344, a: Math.PI / 2 }, duck: { x: 480, y: 500, a: -Math.PI / 4 } },
    riding: { pegA: false, pegB: true, pegC: false },
    tail: { train: true },
  }

  it('comes back as it was left', () => {
    const back = deserializeTown(stored(town), 3)
    expect(back.strips).toEqual(town.strips)
    expect(back).toMatchObject({ roll: 2, out: true, position: 'town', finished: false, riding: town.riding })
    for (const id of TOY_IDS) {
      expect(back.toys[id].x).toBe(Math.round(town.toys[id].x))
      expect(back.toys[id].y).toBe(Math.round(town.toys[id].y))
      expect(back.toys[id].a).toBeCloseTo(town.toys[id].a, 1)
    }
  })

  it('keeps who travels its tape tail first with that toy, in the eight fields the record has: read only as a plain true, and from a toy whose place can be read', () => {
    const record = stored(town) as Record<string, Record<string, Record<string, unknown>>>
    expect(Object.keys(record).sort()).toEqual(['finished', 'out', 'position', 'riding', 'roll', 'strips', 'toys', 'v'])
    expect(record.toys.train.back).toBe(true)
    expect('back' in record.toys.car).toBe(false)
    expect(deserializeTown(record, 3).tail).toEqual({ train: true })
    record.toys.car.back = 'yes'
    record.toys.duck.back = true
    record.toys.duck.x = 'far'
    record.toys.train.back = 1
    expect(deserializeTown(record, 3).tail).toEqual({})
  })

  it('wins over the age: a saved town is never given a first road, and a saved bare floor stays bare', () => {
    expect(deserializeTown(stored(freshTown(7)), 3).strips).toEqual([])
    expect(deserializeTown(stored(town), 3).strips).toHaveLength(3)
    expect(deserializeTown(stored(freshTown(3)), 9).strips).toHaveLength(1)
  })

  it('stays the same through any number of visits in which nothing is touched', () => {
    let saved = stored(town)
    const first = saved
    for (let visit = 0; visit < 10; visit++) saved = stored(deserializeTown(saved, visit))
    expect(saved).toEqual(first)
  })

  it('holds every toy in its place in the box when the box is upright, whatever the record says of them', () => {
    const back = deserializeTown({ ...(stored(town) as object), out: false }, null)
    expect(back.out).toBe(false)
    for (const id of TOY_IDS) expect(back.toys[id]).toEqual(HOME_PLACE[id])
    for (const peg of PEGS) expect(back.riding[peg]).toBe(false)
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'town'],
    ['a number', 7],
    ['an array', [1, 2, 3]],
    ['a version above the current one', { v: STATE_VERSION + 1, strips: [strip(0)], out: false }],
    ['no version', { strips: [strip(0)], out: false }],
  ])('gives a first visit for %s', (_, raw) => {
    expect(deserializeTown(raw, null)).toEqual(freshTown(null))
    expect(deserializeTown(raw, 8)).toEqual(freshTown(8))
  })

  it('repairs each damaged field by itself and keeps the rest', () => {
    const good = stored(town) as Record<string, unknown>
    expect(deserializeTown({ ...good, strips: 'none' }, null)).toMatchObject({ strips: [], roll: 2, out: true })
    expect(deserializeTown({ ...good, strips: [strip(0), 'tape', { kind: 9 }, strip(1)] }, null).strips).toEqual([strip(0), strip(1)])
    expect(deserializeTown({ ...good, roll: 'blue' }, null)).toMatchObject({ roll: 0, strips: town.strips })
    expect(deserializeTown({ ...good, out: 'yes' }, null).out).toBe(true)
    expect(deserializeTown({ ...good, riding: [true] }, null).riding).toEqual({ pegA: false, pegB: false, pegC: false })
    expect(deserializeTown({ ...good, position: 'somewhere-else', finished: true }, null)).toMatchObject({ position: 'town', finished: false, strips: town.strips })
    // One toy's place is damaged, another lies off the bare floor: each stands where it would have landed, and the others where they were.
    const toys = { ...(good.toys as Record<string, unknown>), car: { x: 'far', y: 3 }, duck: { x: 5000, y: 300, a: 0 } }
    const back = deserializeTown({ ...good, toys }, null)
    expect(back.toys.car).toEqual(OUT_PLACE.car)
    expect(back.toys.duck).toEqual(OUT_PLACE.duck)
    expect(back.toys.bus).toEqual(deserializeTown(good, null).toys.bus)
    expect(deserializeTown({ ...good, toys: 7 }, null).toys).toEqual(freshTown(7).toys)
  })

  it('keeps no more strips than the floor holds, and of too many keeps the newest', () => {
    const many = Array.from({ length: MAX_STRIPS + 9 }, (_, i) => strip(i % 60))
    const back = deserializeTown({ ...(stored(town) as object), strips: many }, null)
    expect(back.strips).toHaveLength(MAX_STRIPS)
    expect(back.strips[MAX_STRIPS - 1]).toEqual(many[many.length - 1])
  })

  it('keeps a largest legal town under half of the 64 KB cap', () => {
    const largest: TownState = { ...town, strips: Array.from({ length: MAX_STRIPS }, () => ({ kind: 3 as const, ax: FIELD.x1, ay: FIELD.y1, bx: FIELD.x0, by: FIELD.y0 })), riding: { pegA: true, pegB: true, pegC: true } }
    for (const id of TOY_IDS) largest.toys[id] = { x: FIELD.x1 - TOY_SIZE[id].r, y: FIELD.y1 - TOY_SIZE[id].r, a: -Math.PI }
    expect(JSON.stringify(serializeTown(largest)).length).toBeLessThan(32 * 1024)
  })

  it('is plain JSON in whole numbers', () => {
    const record = serializeTown({ ...town, toys: { ...town.toys, car: { x: 612.4, y: 343.7, a: 1.234 } } })
    expect(JSON.parse(JSON.stringify(record))).toEqual(record)
    const numbers: number[] = []
    JSON.stringify(record, (_, value) => { if (typeof value === 'number') numbers.push(value); return value })
    expect(numbers.every(Number.isInteger)).toBe(true)
  })
})
