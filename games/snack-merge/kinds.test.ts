import { describe, expect, it } from 'vitest'
import { ALL_KINDS, BREAD, CHEESE, CHILLI, EGG, ICE, JELLY, MOST, THINGS, bumpThing, canJoin, countOf, isKind, join, mannerOf, radiusOf, thingsOf } from './kinds'

describe('the snacks', () => {
  it('are the six, the fifteen pairs and the twenty of three', () => {
    expect(ALL_KINDS.filter((k) => countOf(k) === 1)).toHaveLength(6)
    expect(ALL_KINDS.filter((k) => countOf(k) === 2)).toHaveLength(15)
    expect(ALL_KINDS.filter((k) => countOf(k) === 3)).toHaveLength(20)
    expect(ALL_KINDS).toHaveLength(41)
  })

  it('tells a snack from anything else', () => {
    for (const value of [0, -1, 1.5, 64, BREAD | CHEESE | EGG | CHILLI, '3', null, undefined, NaN]) expect(isKind(value)).toBe(false)
    for (const k of ALL_KINDS) expect(isKind(k)).toBe(true)
  })

  it('joins two that share nothing and hold at most three, and always into the same snack', () => {
    for (const a of ALL_KINDS) {
      for (const b of ALL_KINDS) {
        const may = canJoin(a, b)
        expect(may).toBe((a & b) === 0 && countOf(a) + countOf(b) <= MOST)
        expect(canJoin(b, a)).toBe(may)
        if (!may) continue
        expect(join(a, b)).toBe(join(b, a))
        expect(isKind(join(a, b))).toBe(true)
        expect(thingsOf(join(a, b)).sort()).toEqual([...thingsOf(a), ...thingsOf(b)].sort())
      }
    }
  })

  it('never joins a thing with itself, and joins every two different things', () => {
    for (let i = 0; i < THINGS.length; i++) {
      for (let j = 0; j < THINGS.length; j++) expect(canJoin(1 << i, 1 << j)).toBe(i !== j)
    }
  })

  it('grows with what it holds', () => {
    expect(radiusOf(BREAD)).toBeLessThan(radiusOf(BREAD | CHEESE))
    expect(radiusOf(BREAD | CHEESE)).toBeLessThan(radiusOf(BREAD | CHEESE | CHILLI))
  })

  it('answers a bump as the first thing both hold, and else as the first thing of the one that arrived', () => {
    expect(bumpThing(BREAD, BREAD)).toBe(0)
    expect(bumpThing(CHEESE | JELLY, EGG | JELLY)).toBe(4)
    expect(bumpThing(BREAD | CHEESE, CHEESE | EGG)).toBe(1)
    expect(bumpThing(EGG | ICE, BREAD | CHEESE)).toBe(2)
  })

  it('gives each thing its own manner, and a snack the mean of its things', () => {
    const singles = THINGS.map((_, i) => JSON.stringify(mannerOf(1 << i)))
    expect(new Set(singles).size).toBe(THINGS.length)
    expect(mannerOf(ICE).swing).toBe(0)
    expect(mannerOf(BREAD | CHEESE).bounce).toBeCloseTo((mannerOf(BREAD).bounce + mannerOf(CHEESE).bounce) / 2)
    expect(mannerOf(BREAD | JELLY).wobble).toBe(1)
    for (const k of ALL_KINDS) for (const value of Object.values(mannerOf(k))) expect(Number.isFinite(value)).toBe(true)
  })
})
