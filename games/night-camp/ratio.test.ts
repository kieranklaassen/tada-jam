import { describe, expect, it } from 'vitest'
import { compare, forOneHour, fraction, gcd, isAmount, isWhole, lastsHours, least, neededFor, sameAmount, stampedStrip, strip, times, usedIn, value, whole } from './ratio'

describe('fractions', () => {
  it('are kept in lowest terms with a positive denominator', () => {
    expect(fraction(6, 4)).toEqual({ num: 3, den: 2 })
    expect(fraction(3, -6)).toEqual({ num: -1, den: 2 })
    expect(fraction(0, 5)).toEqual({ num: 0, den: 1 })
    expect(gcd(0, 0)).toBe(1)
  })

  it('refuse a zero denominator and a part number', () => {
    expect(() => fraction(1, 0)).toThrow()
    expect(() => fraction(1.5, 2)).toThrow()
  })

  it('compare exactly', () => {
    expect(compare(fraction(8, 3), fraction(5, 2))).toBeGreaterThan(0)
    expect(compare(fraction(2, 4), fraction(1, 2))).toBe(0)
    expect(least(whole(3), fraction(8, 3))).toEqual({ num: 8, den: 3 })
    expect(isWhole(fraction(8, 4))).toBe(true)
    expect(value(fraction(7, 2))).toBe(3.5)
  })
})

describe('an amount for a span of time', () => {
  const fire = { pieces: 3, hours: 1 }, lantern = { pieces: 1, hours: 2 }, tarnFire = { pieces: 5, hours: 2 }

  it('is whole pieces for whole hours, neither zero', () => {
    expect(isAmount(fire)).toBe(true)
    expect(isAmount({ pieces: 0, hours: 1 })).toBe(false)
    expect(isAmount({ pieces: 1, hours: 0 })).toBe(false)
    expect(isAmount({ pieces: 2.5, hours: 1 })).toBe(false)
  })

  it('gives the amount for one hour as a fraction of two whole numbers', () => {
    expect(forOneHour(fire)).toEqual({ num: 3, den: 1 })
    expect(forOneHour(lantern)).toEqual({ num: 1, den: 2 })
    expect(forOneHour(tarnFire)).toEqual({ num: 5, den: 2 })
  })

  it('says how long a stock lasts, exactly', () => {
    expect(lastsHours(24, fire)).toEqual({ num: 8, den: 1 })
    expect(lastsHours(8, fire)).toEqual({ num: 8, den: 3 })
    expect(lastsHours(3, lantern)).toEqual({ num: 6, den: 1 })
    expect(lastsHours(0, fire)).toEqual({ num: 0, den: 1 })
  })

  it('says what a span uses, and what a night needs with a part piece meaning one more', () => {
    expect(usedIn(whole(7), lantern)).toEqual({ num: 7, den: 2 })
    expect(neededFor(7, lantern)).toBe(4)
    expect(neededFor(8, lantern)).toBe(4)
    expect(neededFor(8, fire)).toBe(24)
    expect(neededFor(7, tarnFire)).toBe(18)
  })

  it('needs exactly what lasts: the needed stock reaches dawn and one piece fewer does not', () => {
    for (const amount of [fire, lantern, tarnFire, { pieces: 2, hours: 3 }, { pieces: 6, hours: 1 }])
      for (let night = 4; night <= 16; night++) {
        const needed = neededFor(night, amount)
        expect(compare(lastsHours(needed, amount), whole(night)), `${needed} at ${amount.pieces} for ${amount.hours}`).toBeGreaterThanOrEqual(0)
        expect(compare(lastsHours(needed - 1, amount), whole(night))).toBeLessThan(0)
      }
  })

  it('keeps the same amount when a card is doubled', () => {
    expect(times(fire, 2)).toEqual({ pieces: 6, hours: 2 })
    expect(sameAmount(times(tarnFire, 3), tarnFire)).toBe(true)
    expect(sameAmount(fire, lantern)).toBe(false)
  })
})

describe('the strip a card stamps along the ruler', () => {
  it('lays running totals span by span', () => {
    expect(strip({ pieces: 3, hours: 1 }, 4)).toEqual([{ hours: 1, pieces: 3 }, { hours: 2, pieces: 6 }, { hours: 3, pieces: 9 }, { hours: 4, pieces: 12 }])
  })

  it('ends with the stamp that covers dawn, so a night that is not a multiple shows the part span', () => {
    expect(strip({ pieces: 1, hours: 2 }, 7)).toEqual([{ hours: 2, pieces: 1 }, { hours: 4, pieces: 2 }, { hours: 6, pieces: 3 }, { hours: 8, pieces: 4 }])
  })

  it('ends on the whole cards that cover the night', () => {
    for (const amount of [{ pieces: 3, hours: 1 }, { pieces: 1, hours: 3 }, { pieces: 5, hours: 2 }])
      for (let night = 4; night <= 16; night++) {
        const rows = strip(amount, night)
        expect(rows[rows.length - 1].pieces).toBe(Math.ceil(night / amount.hours) * amount.pieces)
      }
  })
})

describe('a strip stamped from a card on any of its sides', () => {
  const card = { pieces: 5, hours: 2 }

  it('runs its totals on from stamp to stamp, whatever side each was made with', () => {
    expect(stampedStrip(card, ['single', 'doubled', 'single'], 10)).toEqual([
      { hours: { num: 2, den: 1 }, pieces: { num: 5, den: 1 } },
      { hours: { num: 6, den: 1 }, pieces: { num: 15, den: 1 } },
      { hours: { num: 8, den: 1 }, pieces: { num: 20, den: 1 } },
    ])
  })

  it('carries halves under a halved card: the amount for one hour, laid out', () => {
    expect(stampedStrip(card, ['halved', 'halved', 'halved'], 10).map((row) => [row.hours, row.pieces])).toEqual([
      [{ num: 1, den: 1 }, { num: 5, den: 2 }],
      [{ num: 2, den: 1 }, { num: 5, den: 1 }],
      [{ num: 3, den: 1 }, { num: 15, den: 2 }],
    ])
  })

  it('agrees with the plain strip when every stamp is single', () => {
    for (const amount of [{ pieces: 3, hours: 1 }, { pieces: 1, hours: 3 }, card])
      expect(stampedStrip(amount, Array(40).fill('single'), 9).map((row) => ({ hours: row.hours.num, pieces: row.pieces.num }))).toEqual(strip(amount, 9))
  })

  it('lays no stamp that would start at dawn or after', () => {
    expect(stampedStrip({ pieces: 3, hours: 1 }, ['doubled', 'doubled', 'doubled', 'single'], 4).length).toBe(2)
    expect(stampedStrip({ pieces: 3, hours: 1 }, ['halved', 'halved'], 0)).toEqual([])
  })
})
