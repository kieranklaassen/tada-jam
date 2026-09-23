import { describe, expect, it } from 'vitest'
import { ballsForAge, deserialize, initialState, MAX_ROWS, MAX_SCARVES, offerRowsForAge, WIDTH } from './state'

const row = (colour: number) => new Array<number>(WIDTH).fill(colour)

describe('age dial', () => {
  it('sets basket size and offer length as defaults only', () => {
    expect(ballsForAge(5)).toBe(4)
    expect(ballsForAge(6)).toBe(5)
    expect(ballsForAge(9)).toBe(6)
    expect(ballsForAge(null)).toBe(5)
    expect(offerRowsForAge(5)).toBe(8)
    expect(offerRowsForAge(7)).toBe(10)
    expect(offerRowsForAge(10)).toBe(12)
    expect(offerRowsForAge(null)).toBe(10)
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
    expect(deserialize(JSON.parse(JSON.stringify(state)))).toEqual(state)
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
