import { describe, expect, it } from 'vitest'
import { FIRST, FOG_ALL, ROOMS, type House } from './house'
import { deserialize, freshSave, houseOf, serialize } from './save'

// What is saved: small plain JSON, read field by field, the same at every age.

const FULL: House = { place: 'bakery', day: true, dog: 3, full: true, balloon: 3, fly: 1, eggs: 3, pies: 3, fog: FOG_ALL, weed: 2, flower: true, soup: 3, served: true }

describe('the saved house', () => {
  it('comes back as it was saved, through plain JSON', () => {
    const save = { ...freshSave(null), ...FULL }
    const back = deserialize(JSON.parse(JSON.stringify(serialize(save))))
    expect(houseOf(back)).toEqual(FULL)
    expect(back).toMatchObject({ position: 'house', finished: false })
  })

  it('gives a first visit for anything that is not its record', () => {
    for (const raw of [null, undefined, 7, 'house', [], [1, 2], {}, { v: 99, place: 'fair' }, { place: 'fair' }]) {
      expect(houseOf(deserialize(raw)), JSON.stringify(raw)).toEqual(FIRST)
    }
  })

  it('repairs each damaged field by itself and keeps the rest', () => {
    const good = serialize({ ...freshSave(null), ...FULL }) as unknown as Record<string, unknown>
    const damage: [string, unknown, unknown][] = [
      ['place', 'cellar', 'bedroom'],
      ['dog', 9, 0],
      ['dog', '3', 0],
      ['full', 'yes', false],
      ['balloon', -1, 0],
      ['fly', 2, 0],
      ['eggs', 2.5, 0],
      ['pies', null, 0],
      ['fog', -3, FOG_ALL],
      ['fog', FOG_ALL + 1, FOG_ALL],
      ['fog', 1.5, FOG_ALL],
      ['weed', 3, 0],
      ['flower', 1, false],
      ['soup', {}, 0],
    ]
    for (const [field, bad, repaired] of damage) {
      const back = houseOf(deserialize({ ...good, [field]: bad })) as unknown as Record<string, unknown>
      expect(back[field], `${field} = ${JSON.stringify(bad)}`).toEqual(repaired)
      for (const other of Object.keys(FULL)) if (other !== field) expect(back[other], `${other} beside a damaged ${field}`).toEqual((FULL as unknown as Record<string, unknown>)[other])
    }
    // A missing field takes its first value too.
    for (const field of Object.keys(FULL)) {
      const less = { ...good }
      delete less[field]
      const back = houseOf(deserialize(less)) as unknown as Record<string, unknown>
      const first = field === 'day' ? true : (FIRST as unknown as Record<string, unknown>)[field]
      expect(back[field], field).toEqual(first)
    }
  })

  it('never opens a room by night but the bedroom', () => {
    for (const place of ROOMS) {
      const back = deserialize({ ...serialize({ ...freshSave(null), ...FIRST, place }), day: false })
      expect(back.day, place).toBe(place !== 'bedroom')
    }
  })

  it('holds nothing but its fields, and the largest legal state is far below half of the 64 KB cap', () => {
    const largest = serialize({ ...freshSave(12), ...FULL, extra: 'x'.repeat(100000) } as never)
    expect(Object.keys(largest).sort()).toEqual(['balloon', 'day', 'dog', 'eggs', 'finished', 'flower', 'fly', 'fog', 'full', 'pies', 'place', 'position', 'served', 'soup', 'v', 'weed'])
    expect(JSON.stringify(largest).length).toBeLessThan(1024)
    expect(JSON.stringify(largest).length).toBeLessThan(32 * 1024)
  })
})

describe('lesson 8: the age is a first-visit default at most, and here it sets nothing', () => {
  it('starts a first visit the same at every age, and with no age', () => {
    const none = freshSave(null)
    for (const age of [0, 2, 5, 6, 7, 10, 12, 40]) {
      expect(freshSave(age), String(age)).toEqual(none)
      expect(deserialize(null, age)).toEqual(none)
      expect(deserialize({ v: 99 }, age)).toEqual(none)
    }
    expect(houseOf(none)).toEqual(FIRST)
  })

  it('reads a saved house the same at every age: a saved step is never moved by the age', () => {
    const saved = JSON.parse(JSON.stringify(serialize({ ...freshSave(null), ...FULL })))
    const none = deserialize(saved, null)
    for (const age of [2, 6, 8, 10, 12]) expect(deserialize(saved, age)).toEqual(none)
  })
})
