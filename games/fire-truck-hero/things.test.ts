import { describe, expect, it } from 'vitest'
import { MOST } from './ground'
import { ACTIONS, KINDS, THINGS, WANTING, actionOf, isKind } from './things'

describe('the seven kinds of thing', () => {
  it('has seven kinds and five actions, none named twice', () => {
    expect(KINDS).toHaveLength(7)
    expect(new Set(KINDS).size).toBe(7)
    expect(ACTIONS).toEqual(['gulp', 'fill', 'too-much', 'sweep', 'neighbour'])
  })

  it('gives each kind the fill of the design sheet', () => {
    expect(KINDS.map((kind) => THINGS[kind].fill)).toEqual([3, 4, 3, 3, 3, 3, 3])
  })

  it('holds no fill and no most above five', () => {
    for (const kind of KINDS) {
      const { fill, most } = THINGS[kind]
      expect(Number.isInteger(fill)).toBe(true)
      expect(fill).toBeGreaterThanOrEqual(1)
      expect(fill).toBeLessThanOrEqual(5)
      expect(most).toBe(fill + 1)
      expect(most).toBeLessThanOrEqual(5)
      expect(most).toBeLessThanOrEqual(MOST)
    }
  })

  it('lets only the cat and the boat leave their spot', () => {
    expect(KINDS.filter((kind) => THINGS[kind].moves)).toEqual(['boat', 'cat'])
  })

  it('puts the duck with the pool, the bee with the seed, the snail with the patch and the truck with the fire', () => {
    expect(THINGS.pool.with).toBe('duck')
    expect(THINGS.seed.with).toBe('bee')
    expect(THINGS.patch.with).toBe('snail')
    expect(THINGS.fire.with).toBe('truck')
    for (const kind of ['boat', 'wheel', 'cat'] as const) expect(THINGS[kind].with).toBeNull()
    expect(WANTING).toEqual(['fire', 'pool', 'seed', 'patch'])
  })

  it('knows a kind from anything else', () => {
    for (const kind of KINDS) expect(isKind(kind)).toBe(true)
    for (const other of ['', 'duck', 'Fire', 3, null, undefined, {}, ['fire']]) expect(isKind(other)).toBe(false)
  })

  it('names the column of an aimed gulp: below the fill, reaching it, and past it', () => {
    expect(actionOf('fire', 0, 1)).toBe('gulp')
    expect(actionOf('fire', 1, 2)).toBe('gulp')
    expect(actionOf('fire', 2, 3)).toBe('fill')
    expect(actionOf('fire', 3, 4)).toBe('too-much')
    expect(actionOf('fire', 4, 4)).toBe('too-much')
    expect(actionOf('pool', 2, 3)).toBe('gulp')
    expect(actionOf('pool', 3, 4)).toBe('fill')
    expect(actionOf('pool', 4, 5)).toBe('too-much')
  })
})
