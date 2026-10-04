import { describe, expect, it } from 'vitest'
import { FIRST_VISIT, LADDER } from './config'
import { CHARACTERS, CUSTOMERS } from './customers'
import { MOST, compare, harder, judge, layOrder, matches, outcomeFor, placeOf, refillDoor } from './order'
import { makeRng } from './rng'
import { MOST_KINDS, MOST_PIECES, MOST_TUBS } from './save'
import { finishCycle, firstPosition, freshState } from './state'
import { KINDS_PLAYED, LONGEST, ONE_BY_ONE, SHORTEST, planTasting } from './tasting'

const total = (wanted: { count: number }[]): number => wanted.reduce((n, w) => n + w.count, 0)

describe('the designed order', () => {
  it('has a place for every id of the ladder, and no id names a school year', () => {
    for (const id of LADDER) {
      expect(placeOf(id)).toBeDefined()
      expect(id).not.toMatch(/grade|groep|level|fase|year|kinder|\d/)
    }
    expect(LADDER.length).toBe(8)
  })

  it('adds one new thing at each place', () => {
    const p = LADDER.map(placeOf)
    // One kind, a few; then up to five; then a tub that is not wanted; then two kinds;
    // then past five; then two kinds past five; then three; then a picture with no rows.
    expect([p[0].kinds, p[0].pieces, p[0].spareTub]).toEqual([[1, 1], [1, 3], false])
    expect([p[1].kinds, p[1].pieces, p[1].spareTub]).toEqual([[1, 1], [2, 5], false])
    expect([p[2].kinds, p[2].pieces, p[2].spareTub]).toEqual([[1, 1], [2, 5], true])
    expect([p[3].kinds, p[3].pieces]).toEqual([[2, 2], [2, 5]])
    expect([p[4].kinds, p[4].pieces]).toEqual([[1, 1], [6, 10]])
    expect([p[5].kinds, p[5].pieces]).toEqual([[2, 2], [6, 10]])
    expect([p[6].kinds, p[6].pieces]).toEqual([[3, 3], [6, 10]])
    expect(p.slice(0, 7).every((place) => place.picture === 'rows')).toBe(true)
    expect(p[7].picture).toBe('scattered')
  })

  it('lays every order inside its place, never past ten pieces, with the tubs to make it', () => {
    for (const id of LADDER) {
      const place = placeOf(id)
      for (const who of CUSTOMERS) {
        for (let seed = 1; seed <= 60; seed++) {
          const order = layOrder(id, who, makeRng(seed))
          const n = total(order.wanted)
          expect(n).toBeGreaterThanOrEqual(place.pieces[0])
          expect(n).toBeLessThanOrEqual(place.pieces[1])
          expect(n).toBeLessThanOrEqual(MOST)
          expect(n).toBeLessThanOrEqual(MOST_PIECES)
          expect(order.wanted.length).toBeGreaterThanOrEqual(place.kinds[0])
          expect(order.wanted.length).toBeLessThanOrEqual(Math.min(place.kinds[1], MOST_KINDS))
          expect(new Set(order.wanted.map((w) => w.kind)).size).toBe(order.wanted.length)
          for (const w of order.wanted) {
            expect(w.count).toBeGreaterThanOrEqual(1)
            expect(order.tubs).toContain(w.kind)
          }
          expect(order.tubs.length).toBe(order.wanted.length + (place.spareTub ? 1 : 0))
          expect(order.tubs.length).toBeLessThanOrEqual(MOST_TUBS)
          expect(order.picture).toBe(place.picture)
        }
      }
    }
  })

  it('keeps every customer to its tastes: what it loves is on every card, what it cannot stand never is, and the spare tub holds that', () => {
    for (const id of LADDER) {
      for (const who of CUSTOMERS) {
        for (let seed = 1; seed <= 40; seed++) {
          const order = layOrder(id, who, makeRng(seed * 7))
          const taste = CHARACTERS[who]
          expect(order.wanted.map((w) => w.kind)).toContain(taste.loves)
          expect(order.wanted.map((w) => w.kind)).not.toContain(taste.cannotStand)
          if (placeOf(id).spareTub) expect(order.tubs).toContain(taste.cannotStand)
          else expect(order.tubs).not.toContain(taste.cannotStand)
        }
      }
    }
    for (const who of CUSTOMERS) expect(CHARACTERS[who].loves).not.toBe(CHARACTERS[who].cannotStand)
    // No two customers love the same kind or cannot stand the same kind.
    expect(new Set(CUSTOMERS.map((who) => CHARACTERS[who].loves)).size).toBe(CUSTOMERS.length)
    expect(new Set(CUSTOMERS.map((who) => CHARACTERS[who].cannotStand)).size).toBe(CUSTOMERS.length)
  })

  it('never lets the first showing complete the first order: it holds at least two pieces', () => {
    for (const row of FIRST_VISIT) for (let seed = 1; seed <= 80; seed++) expect(total(layOrder(row.position, 'bim', makeRng(seed), 2).wanted)).toBeGreaterThanOrEqual(2)
  })

  it('mixes what it asks for: every amount of a place turns up', () => {
    const seen = new Set<number>()
    for (let seed = 1; seed <= 200; seed++) seen.add(total(layOrder('to-five', 'mops', makeRng(seed)).wanted))
    expect([...seen].sort()).toEqual([2, 3, 4, 5])
  })

  it('starts a first visit by age, and at the first place for no age', () => {
    expect(firstPosition(null)).toBe('a-few')
    expect(firstPosition(2)).toBe('a-few')
    expect(firstPosition(4)).toBe('a-few')
    expect(firstPosition(5)).toBe('to-five')
    expect(firstPosition(6)).toBe('two-kinds')
    expect(firstPosition(7)).toBe('to-ten')
    expect(firstPosition(12)).toBe('to-ten')
  })
})

describe('comparing a pizza with a card', () => {
  const wanted = [{ kind: 'pepper' as const, count: 3 }, { kind: 'cheese' as const, count: 2 }]
  const pizza = (...kinds: string[]) => kinds.map((kind) => ({ kind: kind as 'pepper' }))

  it('matches when every kind pairs off with none left over, wherever the pieces lie', () => {
    expect(matches(wanted, pizza('cheese', 'pepper', 'pepper', 'cheese', 'pepper'))).toBe(true)
    expect(compare(wanted, pizza('pepper', 'pepper', 'pepper', 'cheese', 'cheese'))).toEqual([])
  })

  it('says which kind is off, which way and by how many', () => {
    expect(compare(wanted, pizza('pepper', 'pepper', 'pepper', 'pepper', 'pepper', 'cheese'))).toEqual([
      { kind: 'pepper', wanted: 3, have: 5, off: 2 },
      { kind: 'cheese', wanted: 2, have: 1, off: -1 },
    ])
    expect(compare(wanted, [])).toEqual([{ kind: 'pepper', wanted: 3, have: 0, off: -3 }, { kind: 'cheese', wanted: 2, have: 0, off: -2 }])
  })

  it('counts a kind that is not on the card as too many of it', () => {
    expect(compare(wanted, pizza('pepper', 'pepper', 'pepper', 'cheese', 'cheese', 'sock'))).toEqual([{ kind: 'sock', wanted: 0, have: 1, off: 1 }])
  })

  it('cannot be matched by luck: of all the pizzas of up to twelve pieces from two tubs, one matches', () => {
    let hits = 0, all = 0
    for (let a = 0; a <= 12; a++) for (let b = 0; a + b <= 12; b++) {
      all++
      if (matches(wanted, [...Array(a).fill({ kind: 'pepper' }), ...Array(b).fill({ kind: 'cheese' })])) hits++
    }
    expect(hits).toBe(1)
    expect(all).toBe(91)
  })
})

describe('how a cycle goes', () => {
  it('goes well on the first pizza, mixed after one pushed back, badly after two', () => {
    expect([judge(0), judge(1), judge(2), judge(5)]).toEqual(['well', 'mixed', 'badly', 'badly'])
  })

  it('moves the position one place at a time, and only up for a big roll', () => {
    const at = (position: string) => ({ ...freshState(null), position })
    expect(finishCycle(at('to-five'), outcomeFor(0, false)).position).toBe('spare-tub')
    expect(finishCycle(at('to-five'), outcomeFor(1, false)).position).toBe('to-five')
    expect(finishCycle(at('to-five'), outcomeFor(2, false)).position).toBe('a-few')
    expect(finishCycle(at('to-five'), outcomeFor(0, true)).position).toBe('spare-tub')
    expect(finishCycle(at('to-five'), outcomeFor(2, true)).position).toBe('to-five')
    expect(finishCycle(at('a-few'), outcomeFor(2, false)).position).toBe('a-few')
    expect(finishCycle(at('scattered'), outcomeFor(0, false)).position).toBe('scattered')
  })

  it('offers one place higher with the big roll, and the same place at the top', () => {
    expect(harder('a-few')).toBe('to-five')
    expect(harder('three-kinds')).toBe('scattered')
    expect(harder('scattered')).toBe('scattered')
    expect(harder('nowhere')).toBe('a-few')
  })

  it('keeps two different customers at the door, neither the one at the counter nor the one who just ate', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = makeRng(seed)
      const first = refillDoor(null, null, null, null, rng)
      expect(first.small).not.toBe(first.big)
      const picked = seed % 2 === 0 ? 'small' : 'big'
      const called = first[picked]
      const next = refillDoor(first, picked, called, null, rng)
      expect(next.small).not.toBe(next.big)
      expect([next.small, next.big]).not.toContain(called)
      // The one who was not picked stays, with its roll.
      expect(picked === 'small' ? next.big : next.small).toBe(picked === 'small' ? first.big : first.small)
      const pickedAgain = seed % 3 === 0 ? 'small' : 'big'
      const calledAgain = next[pickedAgain]
      const after = refillDoor(next, pickedAgain, calledAgain, called, rng)
      expect([after.small, after.big]).not.toContain(calledAgain)
      expect([after.small, after.big]).not.toContain(called)
      expect(after.small).not.toBe(after.big)
    }
  })
})

describe('a tasting', () => {
  it('plays every piece that is off one by one up to three, too many first', () => {
    const plan = planTasting([{ kind: 'cheese', wanted: 2, have: 1, off: -1 }, { kind: 'pepper', wanted: 3, have: 5, off: 2 }])
    expect(plan.tastes.map((t) => [t.kind, t.way, t.index, t.big])).toEqual([['pepper', 'many', 0, false], ['pepper', 'many', 1, false], ['cheese', 'few', 0, false]])
    for (let i = 1; i < plan.tastes.length; i++) expect(plan.tastes[i].at).toBeGreaterThanOrEqual(plan.tastes[i - 1].at + plan.tastes[i - 1].lasts - 1e-9)
    expect(plan.tastes[0].at).toBeGreaterThanOrEqual(plan.lick.lasts)
    expect(plan.push.at).toBeGreaterThan(plan.tastes[2].at + plan.tastes[2].lasts)
  })

  it('always plays the kind a customer cannot stand, and first, when more kinds are off than a tasting plays', () => {
    const off = [{ kind: 'cheese', wanted: 0, have: 1, off: 1 }, { kind: 'olive', wanted: 0, have: 2, off: 2 }, { kind: 'worm', wanted: 0, have: 1, off: 1 }, { kind: 'sock', wanted: 0, have: 1, off: 1 }] as const
    expect(off.length).toBeGreaterThan(KINDS_PLAYED)
    // Left to the order they came in, the fourth kind is not played.
    expect(planTasting(off).tastes.some((t) => t.kind === 'sock')).toBe(false)
    const plan = planTasting(off, 'sock')
    expect(plan.tastes[0].kind).toBe('sock')
    expect(new Set(plan.tastes.map((t) => t.kind)).size).toBe(KINDS_PLAYED)
    // A kind that is only missing is not what it cannot stand being there: the order is left alone.
    const missing = [{ kind: 'cheese', wanted: 0, have: 1, off: 1 }, { kind: 'sock', wanted: 2, have: 1, off: -1 }] as const
    expect(planTasting(missing, 'sock').tastes.map((t) => t.kind)).toEqual(['cheese', 'sock'])
  })

  it('plays more than three as one big version, so nothing has to be counted to know there were far too many', () => {
    const plan = planTasting([{ kind: 'sock', wanted: 0, have: ONE_BY_ONE + 1, off: ONE_BY_ONE + 1 }])
    expect(plan.tastes.length).toBe(1)
    expect(plan.tastes[0].big).toBe(true)
  })

  it('lasts 4 to 8 seconds whatever is off', () => {
    const kinds = ['pepper', 'cheese', 'sock', 'worm', 'olive'] as const
    for (let a = -10; a <= 12; a++) {
      for (let b = -5; b <= 6; b++) {
        for (let c = -3; c <= 4; c += 7) {
          const differences = [a, b, c].map((off, i) => ({ kind: kinds[i], wanted: 0, have: 0, off })).filter((d) => d.off !== 0)
          if (differences.length === 0) continue
          const plan = planTasting(differences)
          expect(plan.seconds, `${a} ${b} ${c}`).toBeGreaterThanOrEqual(SHORTEST - 0.11)
          expect(plan.seconds, `${a} ${b} ${c}`).toBeLessThanOrEqual(LONGEST + 1e-9)
        }
      }
    }
  })
})
