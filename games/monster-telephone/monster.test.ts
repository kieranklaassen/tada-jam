import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { BODIES, PARTS, PLACES, alike, bare, compare, copy, count, fillSacks, isUsual, make, moved, share } from './monster'
import { makeRng } from './rng'

const many = (at: (typeof LADDER)[number]) => Array.from({ length: 300 }, (_, i) => make(at, makeRng(i * 97 + 3)))

describe('the designed order', () => {
  it('starts with three different large parts where a child expects them, on the round body', () => {
    for (const m of [...many('in-view'), ...many('a-few')]) {
      const on = PLACES.filter((p) => m.on[p])
      expect(on).toHaveLength(3)
      expect(m.body).toBe('round')
      expect(new Set(on.map((p) => m.on[p]!.part)).size).toBe(3)
      for (const p of on) { expect(m.on[p]!.large).toBe(true); expect(isUsual(p, m.on[p]!.part)).toBe(true) }
    }
  })
  it('adds both sizes, then bodies, then odd places, then a crowd', () => {
    for (const at of LADDER.slice(2, 4)) for (const m of many(at)) {
      const sizes = PLACES.flatMap((p) => (m.on[p] ? [m.on[p]!.large] : []))
      expect(new Set(sizes).size).toBe(2)
      if (at === 'small-and-large') { expect(m.body).toBe('round'); expect(count(m)).toBe(3) } else expect([3, 4]).toContain(count(m))
    }
    expect(new Set(many('bodies').map((m) => m.body)).size).toBe(BODIES.length)
    for (const m of many('odd-places')) { expect(count(m)).toBe(4); expect(PLACES.filter((p) => m.on[p] && !isUsual(p, m.on[p]!.part)).length).toBeGreaterThanOrEqual(2) }
    for (const m of many('crowd')) expect([5, 6]).toContain(count(m))
  })
  it('puts a harder one in the lumpy sack', () => {
    for (let i = 0; i < 50; i++) {
      const [p, q] = fillSacks('crowd', makeRng(i))
      expect([count(p), count(q)]).toEqual([5, 6])
      const [r, s] = fillSacks('bodies', makeRng(i))
      expect(count(r)).toBeLessThanOrEqual(4)
      expect(count(s)).toBe(4)
    }
  })
})

describe('comparing', () => {
  it('names every place where either has a part, from the top down', () => {
    const a = bare(), b = bare()
    a.on.top = { part: 'ear', large: true }; b.on.top = { part: 'ear', large: false }
    a.on.lower = { part: 'mouth', large: true }; b.on.bottom = { part: 'foot', large: true }
    a.on.left = { part: 'hand', large: true }; b.on.left = { part: 'hand', large: true }
    expect(compare(a, b).map((c) => [c.place, c.likeness])).toEqual([['top', 'size'], ['left', 'same'], ['lower', 'other'], ['bottom', 'other']])
    expect(alike(a, b)).toBe(false)
    expect(alike(a, copy(a))).toBe(true)
    expect(share(a, copy(a))).toBe(1)
  })
  it('moves the place up for a near twin, down for a stranger, and not for the child\'s own', () => {
    const a = make('bodies', makeRng(4))
    expect(moved('bodies', a, copy(a), false)).toBe('odd-places')
    expect(moved('bodies', a, copy(a), true)).toBe('bodies')
    expect(moved('crowd', a, copy(a), false)).toBe('crowd')
    expect(moved('bodies', a, bare(), false)).toBe('bodies')
    const odd = bare(BODIES.find((x) => x !== a.body)!)
    for (const p of PLACES) odd.on[p] = { part: PARTS.find((x) => x !== a.on[p]?.part)!, large: true }
    expect(moved('bodies', a, odd, false)).toBe('small-and-large')
    expect(moved('a-few', a, odd, false)).toBe('in-view')
    expect(moved('in-view', a, odd, false)).toBe('in-view')
  })
})
