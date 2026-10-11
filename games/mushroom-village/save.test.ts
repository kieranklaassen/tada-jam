import { describe, expect, it } from 'vitest'
import { FULL, MOST } from './config'
import { MOST_POINTS, countPoints } from './paths'
import { FIRST_MUSHROOM, STATE_VERSION, deserialize, freshSave, serialize, type VillageSave } from './save'

const stored = (save: VillageSave): unknown => JSON.parse(JSON.stringify(serialize(save)))

describe('what a first visit opens on', () => {
  it('stands one squat red mushroom in the sun for a child of three or younger, and for no age', () => {
    for (const age of [null, 2, 3]) expect(freshSave(age).mushrooms).toEqual([FIRST_MUSHROOM])
    expect(FIRST_MUSHROOM.size).toBeLessThanOrEqual(4)
  })

  it('opens on bare moss for a child of four or older, with no upper end', () => {
    for (const age of [4, 5, 6, 9, 12]) expect(freshSave(age).mushrooms).toEqual([])
  })

  it('lets a saved village win over the age', () => {
    const bare = stored({ ...freshSave(6) })
    expect(deserialize(bare, 2).mushrooms).toEqual([])
    const one = stored({ ...freshSave(6), mushrooms: [{ id: 4, x: 300, y: 450, size: 9, door: false }] })
    expect(deserialize(one, 2).mushrooms).toEqual([{ id: 4, x: 300, y: 450, size: 9, door: false }])
  })
})

describe('the saved village', () => {
  const village: VillageSave = { ...freshSave(6), mushrooms: [{ id: 1, x: 300, y: 450, size: 12, door: false }, { id: 2, x: 1010, y: 500, size: 1, door: false }, { id: 7, x: 610, y: 400, size: 5, door: false }] }

  it('round-trips through serialize and deserialize', () => {
    expect(deserialize(stored(village), null)).toEqual(village)
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'glade'],
    ['an array', [1, 2]],
    ['a version above the current one', { v: STATE_VERSION + 1, position: 'glade', finished: false, mushrooms: [] }],
  ])('gives a first visit for %s', (_, raw) => {
    expect(deserialize(raw, 6)).toEqual(freshSave(6))
    expect(deserialize(raw, null)).toEqual(freshSave(null))
  })

  it('reads a record with no mushrooms field as a village with none, not as a first visit', () => {
    expect(deserialize({ v: STATE_VERSION, position: 'glade', finished: false }, null).mushrooms).toEqual([])
    expect(deserialize({ v: STATE_VERSION, position: 'glade', finished: false, mushrooms: 'many' }, null).mushrooms).toEqual([])
  })

  it('leaves out an entry that cannot be a mushroom and keeps the rest', () => {
    const good = { id: 3, x: 300, y: 450, size: 4, door: false }
    const raw = { v: STATE_VERSION, position: 'glade', finished: false, mushrooms: [
      good, null, 7, { id: 4, x: 300.5, y: 450, size: 4, door: false }, { id: 5, x: 300, y: 450, size: 0, door: false }, { id: 6, x: 300, y: 450, size: FULL + 1, door: false },
      { id: 8, x: 700, y: 360, size: 3, door: false }, { id: 9, x: 300, y: 90, size: 3, door: false }, { id: 3, x: 500, y: 450, size: 2, door: false }, { id: 0, x: 500, y: 450, size: 2, door: false }, { x: 500, y: 450, size: 2, door: false },
    ] }
    expect(deserialize(raw, null).mushrooms).toEqual([good])
  })

  it('keeps no more mushrooms than the glade holds, and is never finished', () => {
    const many = Array.from({ length: MOST + 5 }, (_, i) => ({ id: i + 1, x: 40 + i * 20, y: 400, size: 2, door: false }))
    const read = deserialize({ v: STATE_VERSION, position: 'glade', finished: true, mushrooms: many }, null)
    expect(read.mushrooms.length).toBeLessThanOrEqual(MOST)
    expect(read.finished).toBe(false)
  })

  it('keeps a largest legal state under half of the 64 KB cap', () => {
    const largest: VillageSave = { ...freshSave(6), mushrooms: Array.from({ length: MOST }, (_, i) => ({ id: 1_000_000 - i, x: 1154, y: 560, size: FULL, door: false })) }
    expect(JSON.stringify(serialize(largest)).length).toBeLessThan(32 * 1024)
  })
})

describe('the rest of the village: doors, paths, homes, the hat, the night and the showings', () => {
  const base = { v: STATE_VERSION, position: 'glade', finished: false }
  const houses = [{ id: 1, x: 1010, y: 510, size: 2, door: true }, { id: 2, x: 640, y: 400, size: 9, door: true }, { id: 3, x: 300, y: 450, size: 5, door: false }]
  const whole: VillageSave = { ...freshSave(6), mushrooms: houses, paths: [[{ x: 520, y: 560 }, { x: 520, y: 540 }], [{ x: 900, y: 620 }]], homes: { tall: 1, sleepy: null, sneezy: null, baker: 2 }, hatOff: true, night: true, shown: ['cart', 'pebbles'] }

  it('round-trips every field', () => {
    expect(deserialize(stored(whole), 3)).toEqual(whole)
  })

  it('reads an older record that has none of them as a village by day with nobody housed and both showings still owed', () => {
    const read = deserialize({ ...base, mushrooms: houses }, null)
    expect(read).toMatchObject({ paths: [], homes: { tall: null, sleepy: null, sneezy: null, baker: null }, hatOff: false, night: false, shown: [] })
    expect(read.mushrooms).toEqual(houses)
  })

  it.each([
    ['a number', 7], ['a string', 'x'], ['null', null], ['a list of numbers', [1, 2, 3]], ['a record', { a: 1 }],
  ])('reads %s in the place of any of them as nothing there, and keeps the mushrooms', (_, junk) => {
    const read = deserialize({ ...base, mushrooms: houses, paths: junk, homes: junk, hatOff: junk, night: junk, shown: junk }, null)
    expect(read.mushrooms).toEqual(houses)
    expect(read.paths).toEqual([])
    expect(read.homes).toEqual({ tall: null, sleepy: null, sneezy: null, baker: null })
    expect(read.hatOff).toBe(false)
    expect(read.night).toBe(false)
    expect(read.shown).toEqual([])
  })

  it('leaves out a pebble that is off the grid, in the sky or under the cart, and a path with none left', () => {
    const read = deserialize({ ...base, paths: [[{ x: 520, y: 560 }, { x: 521, y: 560 }, { x: 520.5, y: 540 }, null, { x: 520, y: 100 }, { x: 1100, y: 620 }], [{ x: 3, y: 3 }], 'path', [{ x: 900, y: 620 }]] }, null)
    expect(read.paths).toEqual([[{ x: 520, y: 560 }], [{ x: 900, y: 620 }]])
  })

  it('keeps no more pebbles than the glade holds', () => {
    const rows = [360, 380, 400, 420, 440, 460].map((y) => Array.from({ length: 56 }, (_, i) => ({ x: 40 + 20 * i, y })))
    expect(countPoints(deserialize({ ...base, paths: rows }, null).paths)).toBe(MOST_POINTS)
  })

  it('gives no home to a gnome whose house is gone, has no door, or is already another gnome\'s', () => {
    const read = deserialize({ ...base, mushrooms: houses, homes: { tall: 9, sleepy: 3, sneezy: 2, baker: 2, snail: 1 } }, null)
    expect(read.homes).toEqual({ tall: null, sleepy: null, sneezy: 2, baker: null })
  })

  it('lays the hat on the step only where the tall gnome lives in a low house, whatever was stored', () => {
    expect(deserialize({ ...base, mushrooms: houses, homes: { tall: 1 }, hatOff: false }, null).hatOff).toBe(true)
    expect(deserialize({ ...base, mushrooms: houses, homes: { tall: 2 }, hatOff: true }, null).hatOff).toBe(false)
    expect(deserialize({ ...base, mushrooms: houses, homes: { baker: 1 }, hatOff: true }, null).hatOff).toBe(false)
  })

  it('keeps only the showings it knows, once each', () => {
    expect(deserialize({ ...base, shown: ['pebbles', 'cart', 'cart', 'moon', 4] }, null).shown).toEqual(['cart', 'pebbles'])
  })

  it('keeps the largest legal village, with every door, every pebble and every gnome housed, under half of the 64 KB cap', () => {
    const largest: VillageSave = {
      ...freshSave(6), mushrooms: Array.from({ length: MOST }, (_, i) => ({ id: 1_000_000 - i, x: 1154, y: 540, size: FULL, door: true })),
      paths: Array.from({ length: MOST_POINTS }, () => [{ x: 1140, y: 700 }]), homes: { tall: 1_000_000, sleepy: 999_999, sneezy: 999_998, baker: 999_997 }, hatOff: true, night: true, shown: ['cart', 'pebbles'],
    }
    expect(JSON.stringify(serialize(largest)).length).toBeLessThan(32 * 1024)
  })
})
