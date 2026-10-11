import { describe, expect, it } from 'vitest'
import { KINDS, TASTES, isKind, type Taste } from './kinds'

const MOTIONS = ['catch', 'refuse', 'liftOff', 'popped', 'poke'] as const satisfies readonly (keyof Taste)[]

describe('the kinds', () => {
  it('are four, each told from anything else', () => {
    expect(KINDS).toEqual(['duck', 'frog', 'hippo', 'crab'])
    for (const kind of KINDS) expect(isKind(kind)).toBe(true)
    for (const other of ['Duck', 'cat', '', 0, null, undefined, ['duck'], { kind: 'duck' }]) expect(isKind(other)).toBe(false)
  })
})

describe('the fixed tastes', () => {
  it('give every kind every motion', () => {
    expect(Object.keys(TASTES)).toEqual([...KINDS])
    for (const kind of KINDS) for (const motion of MOTIONS) expect(TASTES[kind][motion], `${kind} ${motion}`).toMatch(/^[a-z][A-Za-z]+$/)
  })

  it('share no motion between two kinds', () => {
    for (const motion of MOTIONS) {
      const ids = KINDS.map((kind) => TASTES[kind][motion])
      expect(new Set(ids).size, motion).toBe(KINDS.length)
    }
  })

  it('use every motion id once in the whole table', () => {
    const ids = KINDS.flatMap((kind) => MOTIONS.map((motion) => TASTES[kind][motion]))
    expect(new Set(ids).size).toBe(KINDS.length * MOTIONS.length)
  })

  it('end a refusal in a pop for every kind but the hippo', () => {
    expect(KINDS.filter((kind) => !TASTES[kind].refusalPops)).toEqual(['hippo'])
  })
})
