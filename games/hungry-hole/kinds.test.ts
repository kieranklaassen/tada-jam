import { describe, expect, it } from 'vitest'
import { EMPTY_MOUTH, FIT, GROW, KIND, KINDS, fits, heightOf, isKind, mouthOf, seatOf, widthOf } from './kinds'

describe('the six things', () => {
  it('are named smallest first, and no two are the same width', () => {
    const widths = KINDS.map((kind) => KIND[kind].width)
    for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeGreaterThan(widths[i - 1])
  })

  it('are told from anything else a save might hold', () => {
    for (const kind of KINDS) expect(isKind(kind)).toBe(true)
    for (const other of ['', 'Pie', 'cake', 3, null, undefined, {}]) expect(isKind(other)).toBe(false)
  })
})

describe('the mouth', () => {
  it('of an empty hole takes a pie and nothing else', () => {
    expect(mouthOf([])).toBe(EMPTY_MOUTH)
    expect(fits(KIND.pie.width, EMPTY_MOUTH)).toBe(true)
    for (const kind of KINDS.slice(1)) expect(fits(KIND[kind].width, EMPTY_MOUTH)).toBe(false)
  })

  it('widens with each thing by a share of that thing, whatever the order', () => {
    expect(mouthOf(['pie'])).toBeCloseTo(EMPTY_MOUTH + GROW * KIND.pie.width)
    expect(mouthOf(['pie', 'tuba'])).toBeCloseTo(mouthOf(['tuba', 'pie']))
    expect(mouthOf(['pie', 'tuba'])).toBeGreaterThan(mouthOf(['pie']))
  })

  it('takes a thing only when it is wider than the thing by a margin', () => {
    expect(fits(1, 1 / FIT + 0.001)).toBe(true)
    expect(fits(1, 1)).toBe(false)
  })
})

describe('a stack', () => {
  it('is as wide as its widest part', () => {
    expect(widthOf(['pie', 'tuba', 'hat'])).toBe(KIND.tuba.width)
    expect(widthOf([])).toBe(0)
  })

  it('seats only its bottom thing the wrong way', () => {
    expect(seatOf(['hat', 'dog', 'pie'], 0)).toBe(0)
    expect(seatOf(['hat', 'dog', 'pie'], 1)).toBeCloseTo(KIND.hat.seatUnder)
    expect(seatOf(['hat', 'dog', 'pie'], 2)).toBeCloseTo(KIND.hat.seatUnder + KIND.dog.seat)
  })

  it('stands as high as its top thing reaches, and a thing alone as high as itself', () => {
    for (const kind of KINDS) expect(heightOf([kind])).toBe(KIND[kind].height)
    expect(heightOf(['dog', 'hat'])).toBeCloseTo(KIND.dog.seatUnder + KIND.hat.height)
    expect(heightOf([])).toBe(0)
  })

  it('never seats a thing higher than the thing below it stands', () => {
    for (const kind of KINDS) {
      expect(KIND[kind].seat).toBeLessThanOrEqual(KIND[kind].height)
      expect(KIND[kind].seatUnder).toBeLessThanOrEqual(KIND[kind].height)
      expect(KIND[kind].seatUnder).toBeGreaterThan(0)
    }
  })
})
