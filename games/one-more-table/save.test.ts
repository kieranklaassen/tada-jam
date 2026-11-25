import { describe, expect, it } from 'vitest'
import { deserialize, freshState, serialize } from './save'

describe('the save', () => {
  it('reads back what it wrote', () => {
    const s = freshState()
    s.order = ['baby', 'granny', 'grandpa', 'aunt']
    s.dishes.corn.at = 'baby'; s.dishes.milk.at = 'granny'
    s.ate = { baby: 'jelly' }; s.fed = true; s.rounds = 0; s.shown = true
    expect(deserialize(serialize(s))).toEqual(s)
  })
  it('opens on anything', () => {
    for (const raw of [null, 3, 'x', [], {}, { v: 2 }, { v: 1, order: 'a', dishes: 4, ate: [], rounds: -1 }, { v: 1, order: ['moose', 'moose', 'cat'], dishes: { corn: { at: 'moose' } } }]) {
      const s = deserialize(raw)
      expect(s.order).toContain('granny')
      expect(s.order).not.toContain('moose')
      expect(s.dishes.corn.at).toBe('granny')
    }
  })
  it('puts two dishes in one place apart', () => {
    const s = freshState()
    s.dishes.corn.at = 'grandpa'
    expect(deserialize(serialize(s)).dishes.corn.at).toBe('granny')
  })
})
