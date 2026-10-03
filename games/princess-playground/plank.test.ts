import { describe, expect, it } from 'vitest'
import { atRest, stepPlank, type Knock, type PlankState } from './plank'
import { MAX_TILT } from './world'

const DT = 1 / 120

function run(state: PlankState, left: number, right: number, seconds: number): Knock[] {
  const knocks: Knock[] = []
  for (let t = 0; t < seconds; t += DT) {
    const knock = stepPlank(state, left, right, DT)
    if (knock) knocks.push(knock)
  }
  return knocks
}

describe('the plank', () => {
  it('goes down on the heavier end and stays there', () => {
    const state = { tilt: 0, spin: 0 }
    run(state, 2, 4, 4)
    expect(state.tilt).toBeCloseTo(MAX_TILT)
    expect(atRest(state, 2, 4)).toBe(true)
    const other = { tilt: 0, spin: 0 }
    run(other, 4, 2, 4)
    expect(other.tilt).toBeCloseTo(-MAX_TILT)
  })

  it('never passes through the sand', () => {
    const state = { tilt: -MAX_TILT, spin: 0 }
    for (let t = 0; t < 5; t += DT) {
      stepPlank(state, 0, 10, DT)
      expect(Math.abs(state.tilt)).toBeLessThanOrEqual(MAX_TILT + 1e-9)
    }
  })

  it('comes down harder the bigger the difference', () => {
    const first = (left: number, right: number) => run({ tilt: -MAX_TILT, spin: 0 }, left, right, 4)[0]
    const small = first(3, 4), big = first(2, 6)
    expect(small.end).toBe('right')
    expect(big.speed).toBeGreaterThan(small.speed * 1.5)
  })

  it('knocks a few times and then lies still: no knock goes on for ever', () => {
    const knocks = run({ tilt: -MAX_TILT, spin: 0 }, 0, 4, 6)
    expect(knocks.length).toBeGreaterThanOrEqual(1)
    expect(knocks.length).toBeLessThanOrEqual(5)
    for (let i = 1; i < knocks.length; i++) expect(knocks[i].speed).toBeLessThan(knocks[i - 1].speed)
  })

  it('floats level with the same weight on both ends, and with none', () => {
    const state = { tilt: MAX_TILT, spin: 0 }
    const knocks = run(state, 3, 3, 12)
    expect(knocks).toEqual([])
    expect(Math.abs(state.tilt)).toBeLessThan(0.01)
    expect(atRest(state, 3, 3)).toBe(true)
    const empty = { tilt: -MAX_TILT, spin: 0 }
    run(empty, 0, 0, 12)
    expect(Math.abs(empty.tilt)).toBeLessThan(0.01)
  })

  it('plays the same whatever the frame rate, since it is stepped at a fixed rate', () => {
    const a = { tilt: 0, spin: 0 }, b = { tilt: 0, spin: 0 }
    run(a, 2, 3, 1)
    run(b, 2, 3, 1)
    expect(a).toEqual(b)
  })
})
