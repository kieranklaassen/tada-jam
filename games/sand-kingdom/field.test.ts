import { describe, expect, it } from 'vitest'
import { PATTED_LOW, TIER_HEIGHT, tower, COLS, DIG_DEPTH, DIG_RADIUS, HIGH, LOW, RAISED, RIM_HEIGHT, RIM_WIDTH, ROWS, SEA, X0, X1, Z0, Z1, base, beginStroke, cellAt, decode, deltaAt, dent, encode, groove, heightAt, isRaised, isSandText, isUnderSea, makeField, pat, profile } from './field'

describe('the smooth beach', () => {
  it('stands at the level of the sea a little way in from the sea edge and rises up the beach', () => {
    expect(base(-3)).toBeCloseTo(SEA)
    expect(base(Z0)).toBeLessThan(SEA)
    expect(base(Z1)).toBeGreaterThan(1)
    const field = makeField()
    expect(heightAt(field, 0, 2)).toBeCloseTo(base(2))
  })
})

describe('a finger on the sand', () => {
  it('leaves a dent with a rim round it, wider than the finger', () => {
    const field = makeField()
    dent(field, 0, 2)
    expect(deltaAt(field, 0, 2)).toBeLessThan(-DIG_DEPTH * 0.6)
    expect(deltaAt(field, DIG_RADIUS + RIM_WIDTH / 2, 2)).toBeGreaterThan(RIM_HEIGHT * 0.35)
    expect(deltaAt(field, DIG_RADIUS + RIM_WIDTH + 0.4, 2)).toBe(0)
    expect(field.version).toBe(1)
  })

  it('draws a groove that follows it, with a rim on both sides', () => {
    const field = makeField()
    dent(field, -2, 2)
    groove(field, -2, 2, 2, 2)
    for (const x of [-1.5, 0, 1.5]) {
      expect(deltaAt(field, x, 2), `the bottom at x ${x}`).toBeLessThan(-DIG_DEPTH * 0.6)
      expect(deltaAt(field, x, 2 - DIG_RADIUS - RIM_WIDTH / 2), `the sea side rim at x ${x}`).toBeGreaterThan(RIM_HEIGHT * 0.4)
      expect(deltaAt(field, x, 2 + DIG_RADIUS + RIM_WIDTH / 2), `the beach side rim at x ${x}`).toBeGreaterThan(RIM_HEIGHT * 0.4)
    }
  })

  it('digs no deeper for a finger that dawdles or doubles back, and deeper for a new stroke', () => {
    const field = makeField()
    dent(field, 0, 2)
    groove(field, 0, 2, 1, 2)
    const once = deltaAt(field, 0.5, 2)
    groove(field, 1, 2, 0, 2)
    groove(field, 0, 2, 1, 2)
    expect(deltaAt(field, 0.5, 2)).toBeCloseTo(once)
    dent(field, 0, 2)
    groove(field, 0, 2, 1, 2)
    expect(deltaAt(field, 0.5, 2)).toBeLessThan(once - DIG_DEPTH * 0.5)
  })

  it('never digs below the lowest or heaps above the highest a cell may stand', () => {
    const field = makeField()
    for (let i = 0; i < 12; i++) dent(field, 0, 2)
    // The grid holds single-precision numbers, so the bounds are met to that precision.
    expect(Math.min(...field.d)).toBeGreaterThanOrEqual(Math.fround(LOW))
    expect(Math.max(...field.d)).toBeLessThanOrEqual(Math.fround(HIGH))
    expect(deltaAt(field, 0, 2)).toBeCloseTo(LOW, 1)
  })

  it('leaves the edge of the grid level, so the beach beyond joins it without a step', () => {
    const field = makeField()
    dent(field, X0 + 0.1, Z0 + 0.1)
    groove(field, X0 + 0.1, Z0 + 0.1, X0 + 0.1, Z1 - 0.1)
    groove(field, X0 + 0.1, Z1 - 0.1, X1 - 0.1, Z1 - 0.1)
    for (let col = 0; col < COLS; col++) expect(field.d[col]).toBe(0), expect(field.d[(ROWS - 1) * COLS + col]).toBe(0)
    for (let row = 0; row < ROWS; row++) expect(field.d[row * COLS]).toBe(0), expect(field.d[row * COLS + COLS - 1]).toBe(0)
  })

  it('lets the sea into a groove dug down to its level', () => {
    const field = makeField()
    expect(isUnderSea(field, 0, -2)).toBe(false)
    dent(field, 0, -2)
    expect(isUnderSea(field, 0, -2)).toBe(true)
    // Higher up the beach one stroke does not reach the sea.
    dent(field, 0, 3)
    expect(isUnderSea(field, 0, 3)).toBe(false)
  })
})

describe('a pat', () => {
  it('takes a flat tower top down a little each time, and stops at a low flat wall', () => {
    const field = makeField()
    tower(field, 0, 4, 0, 1)
    pat(field, 0, 4)
    const once = deltaAt(field, 0, 4)
    expect(once).toBeLessThan(TIER_HEIGHT - 0.05)
    expect(once).toBeGreaterThan(TIER_HEIGHT * 0.8)
    for (let i = 0; i < 40; i++) pat(field, 0, 4)
    expect(deltaAt(field, 0, 4)).toBeCloseTo(PATTED_LOW, 2)
  })

  /** Two grooves side by side heap a ridge between them. */
  const ridged = () => {
    const field = makeField()
    for (const z of [2, 2 + (DIG_RADIUS + RIM_WIDTH / 2) * 2]) {
      dent(field, -2, z)
      groove(field, -2, z, 2, z)
    }
    return { field, top: 2 + DIG_RADIUS + RIM_WIDTH / 2 }
  }

  it('is what a finger does on raised sand, and a dent is what it does on level sand', () => {
    const { field, top } = ridged()
    expect(deltaAt(field, 0, top)).toBeGreaterThan(RAISED)
    expect(isRaised(field, 0, top)).toBe(true)
    expect(isRaised(field, 0, 6)).toBe(false)
    expect(isRaised(field, 0, 2)).toBe(false)
  })

  it('leaves the top flat, shorter and no lower than level, and fills no ditch beside it', () => {
    const { field, top } = ridged()
    const before = deltaAt(field, 0, top), ditch = deltaAt(field, 0, 2)
    pat(field, 0, top)
    const after = deltaAt(field, 0, top)
    expect(after).toBeLessThan(before)
    expect(after).toBeGreaterThan(0)
    // Flat: the top a little to either side stands as high as the middle.
    expect(Math.abs(deltaAt(field, 0.2, top) - after)).toBeLessThan(0.012)
    expect(deltaAt(field, 0, 2)).toBeCloseTo(ditch)
  })
})

describe('the stroke profile', () => {
  it('is deepest in the middle, level at the edge of the ditch, raised in the rim and nothing beyond', () => {
    expect(profile(0)).toBe(-DIG_DEPTH)
    expect(profile(DIG_RADIUS)).toBeCloseTo(0)
    expect(profile(DIG_RADIUS + RIM_WIDTH / 2)).toBeCloseTo(RIM_HEIGHT)
    expect(profile(DIG_RADIUS + RIM_WIDTH)).toBeCloseTo(0)
    expect(profile(9)).toBe(0)
  })
})

describe('the saved beach', () => {
  it('is the empty text while the beach is smooth', () => {
    expect(encode(makeField())).toBe('')
    const field = makeField()
    expect(decode('', field)).toBe(true)
    expect(Math.max(...field.d.map(Math.abs))).toBe(0)
  })

  it('comes back as it was dug, to within a thousandth of a unit, and smooth sand comes back exactly smooth', () => {
    const field = makeField()
    dent(field, -3, 1)
    groove(field, -3, 1, 4, 5)
    pat(field, 0, 3.4)
    const text = encode(field)
    expect(text).toHaveLength(COLS * ROWS * 2)
    const back = makeField()
    expect(decode(text, back)).toBe(true)
    for (let i = 0; i < field.d.length; i++) expect(Math.abs(back.d[i] - field.d[i])).toBeLessThan(0.001)
    expect(back.d[cellAt(10, 7)]).toBe(0)
    // Saved again, the text is the same: nothing creeps from one visit to the next.
    expect(encode(back)).toBe(text)
  })

  it('reads anything that is not a beach as a smooth one', () => {
    const dug = makeField()
    dent(dug, 0, 2)
    const text = encode(dug)
    for (const bad of [undefined, null, 7, {}, 'sand', text.slice(2), `${text}AA`, `${text.slice(0, 100)}!${text.slice(101)}`]) {
      expect(isSandText(bad), String(bad).slice(0, 12)).toBe(false)
      const field = makeField()
      dent(field, 1, 1)
      expect(decode(bad, field)).toBe(false)
      expect(Math.max(...field.d.map(Math.abs))).toBe(0)
    }
  })

  it('starts each stroke afresh after a load', () => {
    const field = makeField()
    dent(field, 0, 2)
    decode(encode(field), field)
    const once = deltaAt(field, 0, 2)
    beginStroke(field)
    groove(field, 0, 2, 0.01, 2)
    expect(deltaAt(field, 0, 2)).toBeLessThan(once)
  })
})
