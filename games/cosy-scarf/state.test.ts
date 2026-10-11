import { describe, expect, it } from 'vitest'
import { ballsFor, ballsForAge, COLOURS, deserialize, initialState, MAX_ROWS, MAX_SCARVES, offerRowsForAge, WIDTH } from './state'

const row = (colour: number) => new Array<number>(WIDTH).fill(colour)

describe('age dial', () => {
  it('sets basket size and offer length as defaults only', () => {
    expect(ballsForAge(5)).toBe(4)
    expect(ballsForAge(6)).toBe(5)
    expect(ballsForAge(9)).toBe(6)
    expect(offerRowsForAge(5)).toBe(8)
    expect(offerRowsForAge(7)).toBe(10)
    expect(offerRowsForAge(10)).toBe(12)
  })

  it('gives an unknown age the youngest defaults', () => {
    expect(ballsForAge(null)).toBe(ballsForAge(5))
    expect(offerRowsForAge(null)).toBe(offerRowsForAge(5))
  })

  it('differs across the band and holds at its ends', () => {
    expect([5, 6, 7, 8, 9, 10].map(ballsForAge)).toEqual([4, 5, 5, 6, 6, 6])
    expect([5, 6, 7, 8, 9, 10].map(offerRowsForAge)).toEqual([8, 10, 10, 12, 12, 12])
    expect(offerRowsForAge(3)).toBe(8)
    expect(offerRowsForAge(12)).toBe(12)
  })

  it('lets the balls the child brought out win over the age', () => {
    const state = initialState()
    expect(ballsFor(state, 5)).toBe(4)
    expect(ballsFor(state, 9)).toBe(6)
    state.balls = 5
    expect(ballsFor(state, 5)).toBe(5)
    expect(ballsFor(state, 9)).toBe(5)
    expect(ballsFor(state, null)).toBe(5)
  })

  it('keeps the youngest and oldest buckets open-ended', () => {
    expect(ballsForAge(2)).toBe(4)
    expect(ballsForAge(12)).toBe(6)
  })
})

describe('deserialize', () => {
  it('opens a fresh hillside with the bunny at the loom', () => {
    expect(deserialize(null)).toEqual(initialState())
    expect(deserialize('nonsense')).toEqual(initialState())
    expect(deserialize(42).atLoom).toBe('bunny')
  })

  it('round-trips a saved state', () => {
    const state = initialState()
    state.loom = [row(0), row(1)]
    state.mirror = true
    state.scarves.bunny = [[row(2), row(3)]]
    state.atLoom = 'penguin'
    state.balls = 6
    expect(deserialize(JSON.parse(JSON.stringify(state)))).toEqual(state)
  })

  it('opens a save from before the basket could be tipped, and drops a ball count that makes no sense', () => {
    expect(deserialize({ v: 1, loom: [row(1)], mirror: false, scarves: {}, atLoom: 'bunny' }).balls).toBeNull()
    expect(deserialize({ balls: 5 }).balls).toBe(5)
    expect(deserialize({ balls: COLOURS }).balls).toBe(COLOURS)
    for (const balls of [3, COLOURS + 1, 4.5, '5', {}]) expect(deserialize({ balls }).balls).toBeNull()
  })

  it('drops bad rows one by one and keeps every valid stitch', () => {
    const saved = { loom: [row(1), [1, 2], row(9), 'x', [0, 0, 0, 0, 1.5], row(2)], mirror: 'yes' }
    const state = deserialize(saved)
    expect(state.loom).toEqual([row(1), row(2)])
    expect(state.mirror).toBe(false)
  })

  it('caps the loom and the scarf stack', () => {
    const loom = Array.from({ length: MAX_ROWS + 5 }, () => row(0))
    const scarves = { fox: [[row(1)], [row(2)], [row(3)], [row(4)], []] }
    const state = deserialize({ loom, scarves })
    expect(state.loom).toHaveLength(MAX_ROWS)
    expect(state.scarves.fox).toHaveLength(MAX_SCARVES)
    expect(state.scarves.fox[0]).toEqual([row(2)])
  })

  it('always keeps a cold animal at the loom', () => {
    expect(deserialize({ atLoom: null }).atLoom).toBe('bunny')
    expect(deserialize({ atLoom: 'dragon', scarves: { bunny: [[row(0)]] } }).atLoom).toBe('penguin')
    expect(deserialize({ atLoom: 'fox' }).atLoom).toBe('fox')
  })

  it('lets a fully cosy hillside leave the loom empty', () => {
    const one = [[row(0)]]
    const state = deserialize({ atLoom: null, scarves: { bunny: one, penguin: one, fox: one, bear: one } })
    expect(state.atLoom).toBeNull()
  })
})
