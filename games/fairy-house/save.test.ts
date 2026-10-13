import { describe, expect, it } from 'vitest'
import { FOUND } from './kinds'
import { build } from './rest'
import { deserialize, firstHouse, freshSave, serialize } from './save'
import { STATE_VERSION } from './state'

// What the toy saves: the template's fields and the list of what lies in the hollow.

const isOf = (childAge: number | null): string[] => build(firstHouse(childAge)).map((r) => r.cell.is)

describe('what a first visit finds in the hollow', () => {
  it('is set by age, with both ends open and no age starting as the youngest does', () => {
    expect(isOf(null)).toEqual(['cushion', 'bed', 'stool'])
    for (const age of [2, 3, 4]) expect(isOf(age)).toEqual(isOf(null))
    for (const age of [5, 6]) expect(isOf(age)).toEqual(['cushion'])
    for (const age of [7, 9, 12]) expect(isOf(age)).toEqual([])
  })

  it('gates nothing: every thing is on screen at every age, in the hollow or on the forest floor', () => {
    for (const age of [null, 4, 6, 9]) {
      const laid = freshSave(age).things
      expect(new Set(laid.map((thing) => thing.id)).size).toBe(laid.length)
      for (const thing of laid) expect(FOUND[thing.id]).toBeDefined()
    }
  })
})

describe('the saved toy', () => {
  it('holds the version, the place, the ending and the list, and nothing else', () => {
    const saved = serialize(freshSave(null))
    expect(Object.keys(saved).sort()).toEqual(['asleep', 'finished', 'position', 'snapped', 'soaked', 'things', 'v'])
    expect(saved).toMatchObject({ v: STATE_VERSION, position: 'hollow', finished: false })
    for (const thing of saved.things) expect(Object.keys(thing).sort()).toEqual(['id', 'x'])
  })

  it('comes back as it was stored', () => {
    const save = { ...freshSave(7), finished: true, things: build([{ id: 13, x: 600 }, { id: 0, x: 610.4 }, { id: 5, x: 760 }, { id: 9, x: 420 }]).map(({ id, dropX }) => ({ id, x: dropX })), snapped: [9], soaked: [5, 13], asleep: [{ who: 'fat' as const, on: 0, x: 600 }, { who: 'tidy' as const, on: null, x: 720 }, { who: 'tiny' as const, on: null, x: 720 }] }
    const stored: unknown = JSON.parse(JSON.stringify(serialize(save)))
    expect(deserialize(stored, 4)).toEqual(save)
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'things'],
    ['an array', [{ id: 1, x: 500 }]],
    ['a version above the current one', { v: STATE_VERSION + 1, position: 'hollow', finished: false, things: [] }],
  ])('starts fresh for the age from %s', (_, raw) => {
    expect(deserialize(raw, 6)).toEqual(freshSave(6))
    expect(deserialize(raw, null)).toEqual(freshSave(null))
  })

  it('keeps an emptied hollow empty: a saved list wins over the age', () => {
    expect(deserialize({ v: STATE_VERSION, position: 'hollow', finished: false, things: [] }, 4).things).toEqual([])
  })

  it('repairs a damaged list entry by entry and never throws', () => {
    const base = { v: STATE_VERSION, position: 'hollow', finished: false }
    expect(deserialize({ ...base, things: 'many' }, 4).things).toEqual([])
    expect(deserialize(base, 4).things).toEqual([])
    const things = [null, 7, 'leaf', { id: 5 }, { x: 600 }, { id: 5.5, x: 600 }, { id: -1, x: 600 }, { id: 400, x: 600 }, { id: 5, x: Number.NaN }, { id: 5, x: 'left' }, { id: 5, x: 700 }, { id: 5, x: 500 }, { id: 6, x: 1e9 }]
    const read = deserialize({ ...base, things }, 4).things
    // One good entry, the same number named again is left out, and a place far outside is brought inside the walls by the resting rule.
    expect(read.map((thing) => thing.id)).toEqual([5, 6])
    expect(build(read).every((r) => r.x >= 352 && r.x <= 852)).toBe(true)
  })

  it('leaves what can no longer rest on the forest floor', () => {
    // A pebble saved on a leaf, which sheds it.
    const read = deserialize({ v: STATE_VERSION, position: 'hollow', finished: false, things: [{ id: 0, x: 600 }, { id: 5, x: 600 }] }, 4)
    expect(read.things).toEqual([{ id: 0, x: 600 }])
  })

  it('stays small: every thing in the hollow, snapped and soaked, with the three asleep, is under one kilobyte', () => {
    const all = FOUND.map((found, index) => ({ id: found.id, x: 352.1 + index * 27.7 }))
    const everyId = FOUND.map((found) => found.id)
    const asleep = (['fat', 'tidy', 'tiny'] as const).map((who, index) => ({ who, on: 10 + index, x: 612.3 }))
    expect(JSON.stringify(serialize({ ...freshSave(null), finished: true, things: all, snapped: everyId, soaked: everyId, asleep })).length).toBeLessThan(1024)
  })

  it('repairs what the evening saved, each field by itself, and never throws', () => {
    const base = { v: STATE_VERSION, position: 'hollow', things: [{ id: 9, x: 420 }, { id: 13, x: 640 }, { id: 0, x: 640 }] }
    // Only a twig that is in the hollow can be snapped, and only a thing that is in it soaked.
    const read = deserialize({ ...base, finished: true, snapped: [9, 9, 13, 10, 'twig', -1, 400], soaked: [0, 5, null, 13, 0.5], asleep: 'all' }, 4)
    expect(read.snapped).toEqual([9])
    expect(read.soaked).toEqual([0, 13])
    // At evening each of the three has one place, and one that names nothing in the hollow lies on the floor.
    expect(read.asleep.map((entry) => entry.who)).toEqual(['fat', 'tidy', 'tiny'])
    expect(read.asleep.every((entry) => entry.on === null && entry.x >= 352 && entry.x <= 852)).toBe(true)
    const beds = deserialize({ ...base, finished: true, asleep: [{ who: 'fat', on: 0, x: 640 }, { who: 'tiny', on: 5, x: 1e9 }, { who: 'nobody', on: 0, x: 3 }, 7, null] }, 4).asleep
    expect(beds).toEqual([{ who: 'fat', on: 0, x: 640 }, { who: 'tidy', on: null, x: 672 }, { who: 'tiny', on: null, x: 852 }])
    // By day nobody is asleep, whatever the record says.
    expect(deserialize({ ...base, finished: false, asleep: [{ who: 'fat', on: 0, x: 640 }] }, 4).asleep).toEqual([])
    expect(deserialize({ ...base, finished: 'yes', snapped: {}, soaked: 3 }, 4)).toMatchObject({ finished: false, snapped: [], soaked: [], asleep: [] })
  })
})
