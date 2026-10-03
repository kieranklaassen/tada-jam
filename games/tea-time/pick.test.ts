import { describe, expect, it } from 'vitest'
import { LEAST_REACH, pick, type Target } from './pick'

const targets: Target[] = [
  { id: 'saucer', x: 500, y: 400, reach: 95, rank: 1 },
  { id: 'cup', x: 500, y: 392, reach: 60, rank: 2 },
  { id: 'pot', x: 680, y: 470, reach: 100, rank: 3 },
  { id: 'spoon', x: 300, y: 420, reach: 12, rank: 2 },
]

describe('picking a thing with a finger', () => {
  it('takes the cup in the middle of its saucer and the saucer at its rim', () => {
    expect(pick(targets, 500, 395)).toBe('cup')
    expect(pick(targets, 500, 400 + 80)).toBe('saucer')
    expect(pick(targets, 500 - 85, 400)).toBe('saucer')
  })

  it('takes the pot where it overlaps the saucer', () => {
    expect(pick(targets, 590, 430)).toBe('pot')
  })

  it('gives the bare cloth where nothing is', () => {
    expect(pick(targets, 100, 100)).toBe(null)
    expect(pick([], 500, 400)).toBe(null)
  })

  it('never makes a small thing smaller than a fingertip', () => {
    expect(pick(targets, 300 + LEAST_REACH - 1, 420)).toBe('spoon')
    expect(pick(targets, 300 + LEAST_REACH + 1, 420)).toBe(null)
    expect(LEAST_REACH * 2).toBeGreaterThanOrEqual(48)
  })

  it('takes the nearer of two things of one rank', () => {
    const two: Target[] = [{ id: 'a', x: 100, y: 100, reach: 60, rank: 2 }, { id: 'b', x: 170, y: 100, reach: 60, rank: 2 }]
    expect(pick(two, 120, 100)).toBe('a')
    expect(pick(two, 150, 100)).toBe('b')
  })
})
