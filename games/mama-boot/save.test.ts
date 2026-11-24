import { describe, expect, it } from 'vitest'
import { deserialize, firstEggs, freshState, serialize } from './save'

describe('the save', () => {
  it('starts with three eggs for the youngest and for no age, five from four up', () => {
    expect([null, 0, 2, 3, 4, 5, 9].map(firstEggs)).toEqual([3, 3, 3, 3, 5, 5, 5])
  })
  it('reads back what it wrote', () => {
    const s = freshState(5)
    expect(deserialize(JSON.parse(JSON.stringify(serialize(s))), null)).toEqual(s)
    expect(JSON.stringify(s).length).toBeLessThan(2000)
  })
  it.each([[null], [undefined], [7], ['x'], [[]], [{}], [{ v: 2 }], [{ v: 1, things: 3, brood: 'no' }], [{ v: 1, things: { boot: { x: NaN, y: 'a', dir: 4 } }, brood: [null, { id: 'c9' }] }]])('reads %j as a yard that can be played', (raw) => {
    expect(deserialize(raw, 3).brood.length).toBeGreaterThan(0)
  })
  it('mends riders in a circle, two to a seat, and chicks with no mother', () => {
    const s = freshState(5)
    const raw = { ...s, brood: s.brood.map((b, i) => ({ ...b, kind: 'chick', mother: i === 4 ? 'nobody' : 'boot', host: ['c1', 'c0', 'pig', 'pig', 'c4'][i], dizzy: true })) }
    const got = deserialize(raw, null)
    expect(got.brood[4].kind).toBe('egg')
    expect(got.brood[3].host).toBeNull()
    expect(got.brood[0].host === null || got.brood[1].host === null).toBe(true)
    expect(got.brood.some((b) => b.dizzy)).toBe(false)
  })
})
