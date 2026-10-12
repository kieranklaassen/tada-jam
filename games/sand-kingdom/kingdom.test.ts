import { describe, expect, it } from 'vitest'
import { COLS, HIGH, ROWS, dent, encode, groove, makeField } from './field'
import { MOST_GROOVES, deserializeKingdom, serializeKingdom, type Kingdom } from './kingdom'
import { STATE_VERSION } from './state'
import { firstThings } from './things'

const stored = (state: Kingdom): unknown => JSON.parse(JSON.stringify(serializeKingdom(state)))

function dugBeach(): Kingdom {
  const field = makeField()
  dent(field, -2, 2)
  groove(field, -2, 2, 3, 4)
  return { v: STATE_VERSION, position: 'shore', finished: false, sand: encode(field), dug: [1234, 99], sun: 'up', ...firstThings(null) }
}

describe('the saved beach', () => {
  it('round-trips through storage', () => {
    const state = dugBeach()
    expect(deserializeKingdom(stored(state), null)).toEqual(state)
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'sand'],
    ['an array', [1, 2]],
    ['a version above the current one', { ...dugBeach(), v: STATE_VERSION + 1 }],
    ['no version', { position: 'shore', sand: '' }],
  ])('gives a smooth beach for %s, whatever the age', (_, raw) => {
    for (const age of [null, 3, 7]) expect(deserializeKingdom(raw, age)).toEqual({ v: STATE_VERSION, position: 'shore', finished: false, sand: '', dug: [], sun: 'up', ...firstThings(age) })
  })

  it('repairs each field by itself', () => {
    const good = dugBeach()
    // Damaged sand: the beach is smooth, and the order of grooves that are gone goes with it.
    expect(deserializeKingdom({ ...good, sand: 'not sand' }, null)).toEqual({ ...good, sand: '', dug: [] })
    expect(deserializeKingdom({ ...good, sand: 42 }, null)).toEqual({ ...good, sand: '', dug: [] })
    // Damaged order: the sand is kept.
    expect(deserializeKingdom({ ...good, dug: 'first' }, null)).toEqual({ ...good, dug: [] })
    expect(deserializeKingdom({ ...good, dug: [5, -1, 2.5, 'x', COLS * ROWS, 7] }, null).dug).toEqual([5, 7])
    // A record from before a field existed takes that field's default.
    expect(deserializeKingdom({ v: STATE_VERSION, position: 'shore', finished: false }, null)).toEqual({ ...good, sand: '', dug: [] })
    expect(deserializeKingdom({ ...good, position: 'retired-place' }, null).position).toBe('shore')
  })

  it('keeps the newest grooves when there are more than the water remembers', () => {
    const many = Array.from({ length: MOST_GROOVES + 6 }, (_, i) => i)
    expect(deserializeKingdom(stored({ ...dugBeach(), dug: many }), null).dug).toEqual(many.slice(6))
  })

  it('keeps a largest legal state under half of the 64 KB cap', () => {
    const field = makeField()
    field.d.fill(HIGH)
    const largest: Kingdom = { v: STATE_VERSION, position: 'shore', finished: true, sand: encode(field), dug: Array.from({ length: MOST_GROOVES }, () => COLS * ROWS - 1), sun: 'down', bucket: { x: -6.1, z: -2.2, holds: 'nothing', shell: false, side: false }, shells: [0, 1, 2].map(() => ({ x: -6.11, z: -2.22, up: false, state: 'pressed' as const })), wood: [0, 1].map(() => ({ x: -6.11, z: -2.22, turn: -3.14 })) }
    const size = JSON.stringify(serializeKingdom(largest)).length
    expect(size).toBeLessThan(16 * 1024)
    expect(size).toBeLessThan(32 * 1024)
  })
})
