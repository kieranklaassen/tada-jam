import { describe, expect, it } from 'vitest'
import { CARES, FACE, FITS, MOVEMENT, NEEDS, OPEN, PLACE, PLAIN, QUIET, fits, isCare, isNeed, isStep, needFor, plainer } from './needs'

describe('needs and cares', () => {
  it('has five needs and five cares, the quantities a three-year-old can hold', () => {
    expect(NEEDS).toHaveLength(5)
    expect(CARES).toHaveLength(5)
  })

  it('gives every need exactly one care that fits, and every care exactly one need', () => {
    expect(new Set(Object.values(FITS)).size).toBe(CARES.length)
    for (const care of CARES) expect(NEEDS.filter((need) => fits(care, need))).toHaveLength(1)
    for (const need of NEEDS) expect(CARES.filter((care) => fits(care, need))).toHaveLength(1)
  })

  it('brings each need into play with its care, at the same place in the order', () => {
    NEEDS.forEach((need, index) => expect(FITS[need]).toBe(CARES[index]))
    for (const care of CARES) expect(FITS[needFor(care)]).toBe(care)
  })

  it('starts with water, the one care the records name', () => {
    expect(CARES[0]).toBe('bowl')
    expect(NEEDS[0]).toBe('thirsty')
  })

  it('shows every need with its own movement, place and face', () => {
    for (const table of [MOVEMENT, PLACE, FACE]) expect(new Set(Object.values(table)).size).toBe(NEEDS.length)
  })

  it('moves a sign one step plainer and never past open', () => {
    expect(plainer(QUIET)).toBe(PLAIN)
    expect(plainer(PLAIN)).toBe(OPEN)
    expect(plainer(OPEN)).toBe(OPEN)
  })

  it('tells its own values from anything else in a save', () => {
    expect(isCare('bowl')).toBe(true)
    expect(isCare('needle')).toBe(false)
    expect(isNeed('scared')).toBe(true)
    expect(isNeed(3)).toBe(false)
    expect(isStep(2)).toBe(true)
    expect(isStep(3)).toBe(false)
    expect(isStep('1')).toBe(false)
  })
})
