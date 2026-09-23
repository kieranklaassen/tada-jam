import { describe, expect, it } from 'vitest'
import { completedRepeat, continuation, stripeColours, suggestColour } from './pattern'

describe('stripeColours', () => {
  it('reads each row as its most common stitch colour', () => {
    expect(
      stripeColours([
        [1, 1, 1, 1, 1, 1, 1, 1],
        [2, 3, 3, 2, 3, 2, 3, 3],
        [4, 5, 4, 5, 4, 5, 4, 5],
      ]),
    ).toEqual([1, 3, 4])
  })
})

describe('completedRepeat', () => {
  it('finds AB, ABB and ABC once two copies sit back to back', () => {
    expect(completedRepeat([0, 1, 0, 1])).toEqual([0, 1])
    expect(completedRepeat([0, 1, 1, 0, 1, 1])).toEqual([0, 1, 1])
    expect(completedRepeat([2, 0, 1, 2, 0, 1])).toEqual([2, 0, 1])
    expect(completedRepeat([0, 1, 2, 3, 0, 1, 2, 3])).toEqual([0, 1, 2, 3])
  })

  it('keeps finding the pattern as it carries on', () => {
    expect(completedRepeat([0, 1, 0, 1, 0])).toEqual([1, 0])
  })

  it('ignores single-colour runs and broken patterns', () => {
    expect(completedRepeat([0, 0, 0, 0])).toBeNull()
    expect(completedRepeat([0, 1, 0, 2])).toBeNull()
    expect(completedRepeat([0, 1, 0])).toBeNull()
  })
})

describe('continuation', () => {
  it('names the colour that carries a pattern on', () => {
    expect(continuation([0, 1, 0])).toBe(1)
    expect(continuation([0, 1, 0, 1])).toBe(0)
    expect(continuation([0, 1, 1, 0])).toBe(1)
    expect(continuation([2, 0, 1, 2, 0])).toBe(1)
  })

  it('stays quiet without a repeated element', () => {
    expect(continuation([])).toBeNull()
    expect(continuation([0, 1])).toBeNull()
    expect(continuation([0, 0, 0])).toBeNull()
    expect(continuation([0, 1, 2])).toBeNull()
  })
})

describe('suggestColour', () => {
  it('carries a pattern on when the basket has that colour', () => {
    expect(suggestColour([0, 1, 0], 4)).toBe(1)
  })

  it('suggests starting a stripe otherwise', () => {
    expect(suggestColour([], 4)).toBe(0)
    expect(suggestColour([2], 4)).toBe(3)
    expect(suggestColour([3], 4)).toBe(0)
    expect(suggestColour([1, 2], 4)).toBe(1)
    expect(suggestColour([2, 2, 2], 4)).toBe(3)
  })

  it('never points at a ball the basket does not hold', () => {
    expect(suggestColour([5, 1, 5], 4)).toBeLessThan(4)
    expect(suggestColour([5], 4)).toBeLessThan(4)
  })
})
