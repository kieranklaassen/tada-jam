import { describe, expect, it } from 'vitest'
import { COAT, FATTEST, PARTS, RUN_DOWN_FROM, WARM_COAT, bareWick, coatPart, girth, isBare, isFattest, meltPart, readCandle, sizeOf } from './candle'

describe('the candle', () => {
  it('starts as a bare wick of twelve parts', () => {
    const wick = bareWick()
    expect(wick.r).toHaveLength(PARTS)
    expect(isBare(wick)).toBe(true)
    expect(sizeOf(wick)).toBe(0)
  })

  it('takes a full coat on a cool part and a thin one on a warm part', () => {
    const candle = bareWick()
    expect(coatPart(candle, 2, 0, 0)).toBe(COAT)
    expect(coatPart(candle, 3, 0, 1)).toBe(WARM_COAT)
    expect(candle.r[2]).toBe(COAT)
    expect(candle.r[3]).toBe(WARM_COAT)
  })

  it('grows a teardrop: the lowest parts take a little more', () => {
    const candle = bareWick()
    for (let dip = 0; dip < 5; dip++) for (let i = 0; i < PARTS; i++) coatPart(candle, i, 0, 0)
    expect(candle.r[PARTS - 1]).toBeGreaterThan(candle.r[0])
    expect(candle.r[RUN_DOWN_FROM - 1]).toBe(candle.r[0])
  })

  it('keeps the colour of the pot a part was last dipped in, part by part', () => {
    const candle = bareWick()
    for (let i = 0; i < PARTS; i++) coatPart(candle, i, 0, 0)
    for (let i = 8; i < PARTS; i++) coatPart(candle, i, 1, 0)
    expect(candle.c.slice(0, 8)).toEqual(new Array(8).fill(0))
    expect(candle.c.slice(8)).toEqual(new Array(4).fill(1))
  })

  it('goes from thin through middling to fat, and takes no more at its fattest', () => {
    const candle = bareWick()
    const seen = new Set<number>()
    let dips = 0
    while (!isFattest(candle) && dips < 40) {
      for (let i = 0; i < PARTS; i++) coatPart(candle, i, 0, 0)
      seen.add(sizeOf(candle))
      dips += 1
    }
    expect([...seen]).toEqual([0, 1, 2])
    // About a dozen dips to the fattest: enough to feel it grow, few enough to finish.
    expect(dips).toBeGreaterThanOrEqual(9)
    expect(dips).toBeLessThanOrEqual(14)
    expect(coatPart(candle, 0, 0, 0)).toBe(0)
    expect(Math.max(...candle.r)).toBe(FATTEST)
    expect(girth(candle)).toBe(FATTEST)
  })

  it('melts back to the bare wick, one step at a time, and no further', () => {
    const candle = bareWick()
    coatPart(candle, 5, 0, 0)
    let steps = 0
    while (meltPart(candle, 5)) steps += 1
    expect(steps).toBe(COAT)
    expect(isBare(candle)).toBe(true)
    expect(meltPart(candle, 5)).toBe(false)
  })

  it('reads a saved candle part by part, and anything else as a bare wick', () => {
    for (const raw of [undefined, null, 7, 'candle', [], {}, { r: 'fat' }]) expect(isBare(readCandle(raw))).toBe(true)
    const read = readCandle({ r: [3, -1, 99, 2.5, 'x', 10], c: [1, 2, 3, -1, 0, 2] })
    expect(read.r).toEqual([3, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0])
    expect(read.c).toEqual([1, 2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0])
  })
})
