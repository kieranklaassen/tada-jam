import { describe, expect, it } from 'vitest'
import { FIRST_VISIT, LADDER } from './config'
import { IN_VIEW, arrangementOf, dealPair, layOut } from './deal'
import { makeRng } from './rng'
import { CLOSE, MAX_LEN, MEET, MIN_LEN, MODEL_MAX, MODEL_MIN, NEAR, PLAIN, TUFTS } from './rules'
import { outcomeOf } from './showing'
import { CUSTOMERS } from './tastes'

const deals = (position: string, n = 400) => Array.from({ length: n }, (_, seed) => layOut(position, makeRng(seed)))

describe('the designed order', () => {
  it('has six positions whose ids name places in the salon, never a grade, a groep or a level', () => {
    expect(LADDER).toEqual(['beside-long', 'beside-short', 'beside-either', 'beside-close', 'across', 'across-close'])
    for (const id of LADDER) {
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/)
      expect(id).not.toMatch(/grade|groep|level|fase|kinder|tk|year|age|\d/)
    }
  })

  it('starts a first visit by age at a place on the ladder, later for an older child', () => {
    expect(FIRST_VISIT.map((row) => row.fromAge)).toEqual([4, 5, 6])
    const places = FIRST_VISIT.map((row) => LADDER.indexOf(row.position))
    expect(places).toEqual([0, 3, 4])
  })

  it('adds one new thing at a time', () => {
    const changed = (a: string, b: string) => {
      const x = arrangementOf(a), y = arrangementOf(b)
      return [x.seat !== y.seat, x.way !== y.way, x.gap !== y.gap].filter(Boolean).length
    }
    // Each step changes one thing, but for the last step onto the bench, which keeps the plain difference and both ways.
    expect(LADDER.slice(1).map((id, i) => changed(LADDER[i], id))).toEqual([1, 1, 1, 2, 1])
    expect(arrangementOf('across').gap).toBe(PLAIN)
    expect(arrangementOf('across').way).toBe('either')
  })

  it('opens with two lengths that differ plainly, the lock the longer', () => {
    for (const layout of deals('beside-long')) {
      expect(layout.seat).toBe('beside')
      expect(layout.lock - layout.model).toBeGreaterThanOrEqual(PLAIN.min)
      expect(layout.lock - layout.model).toBeLessThanOrEqual(PLAIN.max)
    }
    for (const layout of deals('beside-short')) expect(layout.model - layout.lock).toBeGreaterThanOrEqual(PLAIN.min)
  })

  it.each(LADDER)('lays out %s inside every limit, with the difference its row gives', (position) => {
    const { seat, way, gap } = arrangementOf(position)
    const ways = new Set<string>()
    for (const layout of deals(position)) {
      expect(layout.seat).toBe(seat)
      expect(layout.model).toBeGreaterThanOrEqual(MODEL_MIN)
      expect(layout.model).toBeLessThanOrEqual(MODEL_MAX)
      expect(layout.lock).toBeGreaterThanOrEqual(MIN_LEN)
      expect(layout.lock).toBeLessThanOrEqual(MAX_LEN)
      const by = Math.abs(layout.lock - layout.model)
      expect(by).toBeGreaterThanOrEqual(gap.min)
      expect(by).toBeLessThanOrEqual(gap.max)
      ways.add(layout.lock > layout.model ? 'longer' : 'shorter')
      expect(layout.mane).toHaveLength(TUFTS)
      for (const steps of layout.mane) expect(Number.isInteger(steps) && steps >= MIN_LEN && steps <= MAX_LEN).toBe(true)
      expect(Math.max(...layout.mane) - Math.min(...layout.mane)).toBeGreaterThanOrEqual(50)
      // One tuft is the longest and one the shortest, and both are where the friend never hides them.
      const longest = Math.max(...layout.mane), shortest = Math.min(...layout.mane)
      expect(layout.mane.filter((steps) => steps === longest)).toHaveLength(1)
      expect(layout.mane.filter((steps) => steps === shortest)).toHaveLength(1)
      expect(layout.mane.indexOf(longest)).toBeLessThan(IN_VIEW)
      expect(layout.mane.indexOf(shortest)).toBeLessThan(IN_VIEW)
    }
    expect([...ways].sort()).toEqual(way === 'either' ? ['longer', 'shorter'] : [way])
  })

  it('never lays out a lock that already meets its model: there is always something to do', () => {
    for (const position of LADDER) for (const layout of deals(position, 200)) expect(outcomeOf(layout.lock, layout.model)).not.toBe('well')
    expect(CLOSE.min).toBeGreaterThan(MEET)
    expect(PLAIN.min).toBeGreaterThan(NEAR)
  })

  it('lays out a position it does not know as the first one', () => {
    expect(arrangementOf('no-such-place')).toBe(arrangementOf(LADDER[0]))
    expect(layOut('no-such-place', makeRng(5))).toEqual(layOut(LADDER[0], makeRng(5)))
  })

  it('gives the same layout for the same seed', () => {
    for (const position of LADDER) expect(layOut(position, makeRng(77))).toEqual(layOut(position, makeRng(77)))
  })

  it('deals a pair of two different animals, and never the one just in the chair again', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 600; seed++) for (const last of CUSTOMERS) {
      const [customer, friend] = dealPair(makeRng(seed), last)
      expect(customer).not.toBe(last)
      expect(friend).not.toBe(customer)
      seen.add(`${customer}/${friend}`)
    }
    // Every pairing of two different animals turns up.
    expect(seen.size).toBe(12)
  })
})
