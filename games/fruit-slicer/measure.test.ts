import { describe, expect, it } from 'vitest'
import { FRUITS, GIVE_PARTS, PARTS, RAIL, WHOLE, commonParts, compareShares, fitOf, gcd, giveOf, inParts, lcm, pitchOf, reduced, sameSize, shareLength, wholeParts } from './measure'

describe('lengths', () => {
  it('give every share in play a whole number of points, on every fruit', () => {
    for (const fruit of FRUITS) for (const den of PARTS) for (let num = 1; num <= 2 * den; num++) expect(Number.isInteger(shareLength(fruit, { num, den })), `${num}/${den} of the ${fruit} fruit`).toBe(true)
  })

  it('give each twin a whole number of points too: half of any share in play', () => {
    for (const fruit of FRUITS) for (const den of PARTS) expect(Number.isInteger(WHOLE[fruit] / (2 * den))).toBe(true)
  })

  it('make the three fruits three different lengths, the longest of which fits the rail', () => {
    expect(new Set(FRUITS.map((fruit) => WHOLE[fruit])).size).toBe(3)
    expect(Math.max(...FRUITS.map((fruit) => WHOLE[fruit]))).toBeLessThanOrEqual(RAIL)
    expect(RAIL).toBe(2 * WHOLE.short)
  })

  it('make a share of a long fruit longer than the same share of a short one', () => {
    expect(shareLength('long', { num: 1, den: 2 })).toBeGreaterThan(shareLength('short', { num: 1, den: 2 }))
  })

  it('lay two quarters exactly on a half, and three thirds exactly on the whole', () => {
    for (const fruit of FRUITS) {
      expect(2 * shareLength(fruit, { num: 1, den: 4 })).toBe(shareLength(fruit, { num: 1, den: 2 }))
      expect(3 * shareLength(fruit, { num: 1, den: 3 })).toBe(WHOLE[fruit])
    }
  })
})

describe('shares', () => {
  it('are compared by size, whatever their parts', () => {
    expect(sameSize({ num: 2, den: 4 }, { num: 1, den: 2 })).toBe(true)
    expect(sameSize({ num: 2, den: 3 }, { num: 3, den: 4 })).toBe(false)
    expect(compareShares({ num: 2, den: 3 }, { num: 3, den: 4 })).toBe(-1)
    expect(compareShares({ num: 5, den: 6 }, { num: 3, den: 4 })).toBe(1)
    expect(compareShares({ num: 4, den: 8 }, { num: 3, den: 6 })).toBe(0)
  })

  it('reduce to the fewest parts and rule into more', () => {
    expect(reduced({ num: 6, den: 8 })).toEqual({ num: 3, den: 4 })
    expect(reduced({ num: 5, den: 4 })).toEqual({ num: 5, den: 4 })
    expect(inParts({ num: 2, den: 3 }, 12)).toEqual({ num: 8, den: 12 })
    expect(inParts({ num: 1, den: 3 }, 4)).toBeNull()
    expect(commonParts({ num: 2, den: 3 }, { num: 3, den: 4 })).toBe(12)
    expect(gcd(12, 18)).toBe(6)
    expect(lcm(4, 6)).toBe(12)
  })
})

describe('the give of a tin', () => {
  it('is one part in twenty-four of the fruit, a whole number of points', () => {
    for (const fruit of FRUITS) {
      expect(giveOf(fruit)).toBe(WHOLE[fruit] / GIVE_PARTS)
      expect(Number.isInteger(giveOf(fruit))).toBe(true)
    }
  })

  it('takes up a little slack either way and no more', () => {
    const ordered = shareLength('long', { num: 3, den: 4 }), give = giveOf('long')
    expect(fitOf(ordered, ordered, give)).toEqual({ kind: 'fit', by: 0 })
    expect(fitOf(ordered + give, ordered, give).kind).toBe('fit')
    expect(fitOf(ordered - give, ordered, give).kind).toBe('fit')
    expect(fitOf(ordered + give + 1, ordered, give)).toEqual({ kind: 'over', by: give + 1 })
    expect(fitOf(ordered - give - 1, ordered, give)).toEqual({ kind: 'under', by: -give - 1 })
  })

  it('lets a cut at random fit one order about one time in twelve', () => {
    const whole = WHOLE.long, ordered = shareLength('long', { num: 2, den: 3 })
    let fits = 0
    for (let at = 0; at <= whole; at++) if (fitOf(at, ordered, giveOf('long')).kind === 'fit') fits++
    expect(fits / (whole + 1)).toBeCloseTo(1 / 12, 2)
  })

  it('never lets one piece fit two neighbouring orders except on the line between them', () => {
    const give = giveOf('middle')
    for (let num = 1; num < 12; num++) {
      const a = shareLength('middle', { num, den: 12 }), b = shareLength('middle', { num: num + 1, den: 12 })
      for (let at = a; at <= b; at++) {
        const both = fitOf(at, a, give).kind === 'fit' && fitOf(at, b, give).kind === 'fit'
        expect(both).toBe(at === a + give)
      }
    }
  })
})

describe('whole parts', () => {
  it('counts the marks a piece covers and refuses one that ends between two', () => {
    const quarter = shareLength('long', { num: 1, den: 4 })
    expect(wholeParts(quarter, 'long', 4)).toBe(1)
    expect(wholeParts(2 * quarter, 'long', 4)).toBe(2)
    expect(wholeParts(2 * quarter + giveOf('long'), 'long', 4)).toBe(2)
    expect(wholeParts(1.5 * quarter, 'long', 4)).toBeNull()
    expect(wholeParts(giveOf('long'), 'long', 4)).toBeNull()
  })

  it('still tells a twelfth from a twelfth and a half', () => {
    const twelfth = shareLength('short', { num: 1, den: 12 })
    expect(wholeParts(twelfth, 'short', 12)).toBe(1)
    expect(wholeParts(1.5 * twelfth, 'short', 12)).toBeNull()
  })
})

describe('the note a length rings', () => {
  it('is an octave up at half the length and a fifth up at two thirds', () => {
    expect(pitchOf(1200, 2400, 110)).toBe(220)
    expect(pitchOf(1600, 2400, 110)).toBeCloseTo(165)
    expect(pitchOf(2400, 2400, 110)).toBe(110)
  })

  it('rises as the piece gets shorter and never divides by nothing', () => {
    expect(pitchOf(600, 2400, 110)).toBeGreaterThan(pitchOf(1200, 2400, 110))
    expect(pitchOf(0, 2400, 110)).toBe(110)
  })
})
