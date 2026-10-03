import { describe, expect, it } from 'vitest'
import { CHARACTERS, FEELS, FELT_CAP, RIDERS, feel, isRiderKind, mostFelt, noFeels, taste } from './tastes'

describe('the riders and their fixed tastes', () => {
  it('gives each rider two likes and two dislikes that do not overlap', () => {
    for (const kind of RIDERS) {
      const c = CHARACTERS[kind]
      expect(new Set([...c.likes, ...c.dislikes]).size).toBe(4)
    }
  })

  it('has for every feel a rider that likes it and a rider that dislikes it', () => {
    for (const f of FEELS) {
      expect(RIDERS.some((kind) => taste(kind, f) === 'like')).toBe(true)
      expect(RIDERS.some((kind) => taste(kind, f) === 'dislike')).toBe(true)
    }
  })

  it('answers the same every time: a taste never changes', () => {
    for (const kind of RIDERS) for (const f of FEELS) expect(taste(kind, f)).toBe(taste(kind, f))
    expect(taste('frog', 'corner')).toBe('like')
    expect(taste('frog', 'fast')).toBe('dislike')
    expect(taste('chick', 'loop')).toBe('like')
    expect(taste('snail', 'loop')).toBe('dislike')
    expect(taste('snail', 'bump')).toBe('like')
    expect(taste('cat', 'splash')).toBe('dislike')
    expect(taste('cat', 'loop')).toBe('plain')
  })

  it('gives no two riders the same tastes, the same home or the same way of moving', () => {
    const tastes = RIDERS.map((kind) => FEELS.map((f) => taste(kind, f)).join())
    expect(new Set(tastes).size).toBe(RIDERS.length)
    expect(new Set(RIDERS.map((kind) => CHARACTERS[kind].home)).size).toBe(RIDERS.length)
    expect(new Set(RIDERS.map((kind) => CHARACTERS[kind].funniest)).size).toBe(RIDERS.length)
    const tempos = RIDERS.map((kind) => CHARACTERS[kind].tempo).sort((a, b) => a - b)
    // No two share a tempo, or come near enough to move alike.
    for (let i = 1; i < tempos.length; i++) expect(tempos[i] / tempos[i - 1]).toBeGreaterThan(1.3)
  })

  it('tallies what a ride does, up to a small cap', () => {
    let felt = noFeels()
    for (let i = 0; i < 30; i++) felt = feel(felt, 'corner')
    expect(felt.corner).toBe(FELT_CAP)
    expect(felt.loop).toBe(0)
  })

  it('finds what the ride did most, which is how the rider gets out', () => {
    expect(mostFelt('frog', noFeels())).toBe(null)
    expect(mostFelt('frog', { ...noFeels(), corner: 3, loop: 1 })).toBe('corner')
    // A tie goes to what the rider has a taste for.
    expect(mostFelt('chick', { ...noFeels(), corner: 2, loop: 2 })).toBe('loop')
    expect(mostFelt('cat', { ...noFeels(), fast: 1, splash: 1 })).toBe('fast')
  })

  it('knows a rider kind from anything else', () => {
    expect(isRiderKind('snail')).toBe(true)
    expect(isRiderKind('dog')).toBe(false)
    expect(isRiderKind(null)).toBe(false)
  })
})
