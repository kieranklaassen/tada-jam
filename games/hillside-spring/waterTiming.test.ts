import { describe, expect, it } from 'vitest'
import { solveFlow } from './flow'
import type { Piece } from './pieces'
import { arriveAt, departAt, NEVER, retime, settled, WATER_SPEED } from './waterTiming'

const bend = (turn: number): Piece => ({ kind: 'bend', c: 3, r: 0, turn, open: true })

describe('retime', () => {
  it('opening water is already there', () => {
    const segments = settled(solveFlow([]).segments, 10)
    expect(segments.every((s) => arriveAt(s, s.d1) < 10 && s.tDepart === NEVER)).toBe(true)
  })

  it('new water runs from the change outward, and cut water drains downstream', () => {
    const before = settled(solveFlow([]).segments, 0)
    const { segments, dFresh, dCut } = retime(before, solveFlow([bend(0)]).segments, 5)
    expect(dFresh).toBe(0)
    expect(dCut).toBe(0)
    const fresh = segments.filter((s) => s.tDepart === NEVER)
    const cut = segments.filter((s) => s.tDepart < NEVER)
    expect(fresh.length).toBeGreaterThan(0)
    expect(cut.length).toBeGreaterThan(0)
    for (const s of fresh) expect(arriveAt(s, s.d0)).toBeCloseTo(5 + s.d0 / WATER_SPEED)
    for (const s of cut) expect(departAt(s, s.d1)).toBeCloseTo(5 + s.d1 / WATER_SPEED)
  })

  it('unchanged water keeps its timing', () => {
    const first = retime(settled(solveFlow([]).segments, 0), solveFlow([bend(0)]).segments, 5).segments
    const again = retime(first, solveFlow([bend(0)]).segments, 9)
    expect(again.dFresh).toBe(Infinity)
    const live = again.segments.filter((s) => s.tDepart === NEVER)
    for (const s of live) expect(s.tArrive).toBe(first.find((f) => f.key === s.key)!.tArrive)
  })

  it('drained water is dropped once its tail has gone', () => {
    const first = retime(settled(solveFlow([]).segments, 0), solveFlow([bend(0)]).segments, 5).segments
    const later = retime(first, solveFlow([bend(0)]).segments, 100).segments
    expect(later.every((s) => s.tDepart === NEVER)).toBe(true)
  })

  it('water that comes back after draining runs in again', () => {
    const first = retime(settled(solveFlow([]).segments, 0), solveFlow([bend(0)]).segments, 5).segments
    const back = retime(first, solveFlow([]).segments, 6).segments
    const keys = back.map((s) => s.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(back.filter((s) => s.tDepart === NEVER).every((s) => s.tArrive >= 6)).toBe(true)
  })
})
