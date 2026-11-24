import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { Play } from './play'
import { PAIRS, copyWorld, deserialize, firstPlace, freshWorld, refill, serialize } from './save'
import { count, make } from './monster'
import { makeRng } from './rng'

const round = (w: ReturnType<typeof freshWorld>) => deserialize(JSON.parse(JSON.stringify(serialize(w))), null, 99)

describe('saving', () => {
  it('comes back as it was', () => {
    const w = freshWorld(7, 5)
    w.b = make('crowd', makeRng(3)); w.open = true; w.own = true; refill(w); w.worn = { ostrich: 'nose', mole: 'eye' }; w.shown = true
    for (let i = 0; i < 3; i++) w.pairs.push([make('crowd', makeRng(i)), make('crowd', makeRng(i + 9))])
    expect(round(w)).toEqual(w)
    expect(JSON.stringify(serialize(w)).length).toBeLessThan(1500)
  })
  it('a copy shares nothing with the world', () => {
    const w = freshWorld(5, 5), c = copyWorld(w)
    c.a.on.top = { part: 'tail', large: true }; c.worn.mole = 'ear'
    expect(w.a.on.top?.part === 'tail' && w.worn.mole === 'ear').toBe(false)
  })
  it('starts by age as a hint, and a saved place wins', () => {
    expect([null, 2, 4, 5, 6, 7, 30].map(firstPlace)).toEqual(['a-few', 'a-few', 'a-few', 'small-and-large', 'bodies', 'odd-places', 'odd-places'])
    const raw = serialize(freshWorld(4, 1))
    expect(deserialize({ ...raw, place: 'crowd' }, 4, 1).place).toBe('crowd')
  })
  it('survives anything', () => {
    const good = serialize(freshWorld(6, 8)), junk = [null, undefined, 0, 'x', [], {}, { v: 2 }, { v: 1 }, NaN]
    for (const raw of junk) { const w = deserialize(raw, 5, 3); expect(count(w.a)).toBeGreaterThan(0); expect(LADDER).toContain(w.place); new Play(w).step(0.1) }
    for (const key of Object.keys(good)) for (const bad of [...junk, '9', -1, { ostrich: 3 }, [['q']], [1, 2]]) {
      const w = deserialize({ ...good, [key]: bad }, 5, 3)
      expect(w.pairs.length).toBeLessThanOrEqual(PAIRS)
      expect(w.open === (w.sacks !== null)).toBe(true)
      expect(round(w)).toEqual(w)
    }
  })
})
