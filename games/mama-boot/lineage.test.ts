import { describe, expect, it } from 'vitest'
import { childrenOf, gaitOf, lineOf, ringOf, stepsOf, type Mothers } from './lineage'
import type { BroodId, Id } from './layout'

const of = (m: Partial<Record<BroodId, Id | null>>): Mothers => new Map(Object.entries(m)) as Mothers

describe('who belongs to whom', () => {
  it('follows a chain to its root', () => {
    const m = of({ c0: 'boot', c1: 'c0', c2: 'c1' })
    expect(lineOf('c2', m)).toMatchObject({ kind: 'root', root: 'boot' })
    expect([gaitOf('c2', m), stepsOf('c0', m), stepsOf('c2', m)]).toEqual(['boot', 1, 3])
    expect(childrenOf('c0', m)).toEqual(['c1'])
  })
  it('finds rings and what hangs on them', () => {
    const m = of({ c0: 'c1', c1: 'c2', c2: 'c0', c3: 'c0', c4: 'c4' })
    expect(ringOf('c1', m)!.sort()).toEqual(['c0', 'c1', 'c2'])
    expect(ringOf('c3', m)).toBeNull()
    expect([gaitOf('c0', m), gaitOf('c3', m), gaitOf('c4', m)]).toEqual(['lost', 'lost', 'self'])
  })
  it('walks like an egg after an egg', () => {
    expect(gaitOf('c1', of({ c0: null, c1: 'c0' }))).toBe('egg')
  })
})
