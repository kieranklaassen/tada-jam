import { describe, expect, it } from 'vitest'
import { kiteTarget, nextPerch, PERCHES, perchIndex, startPerch } from './perches'
import { PIECES, PLAY_MAX_X } from './pieces'
import { defaultState, deserialize, serialize, STATE_VERSION } from './state'

describe('perches', () => {
  it('starts the youngest at the lowest perch and older children higher', () => {
    expect(startPerch(5)).toBe(0)
    expect(startPerch(null)).toBe(0)
    expect(startPerch(8)).not.toBe(0)
    const lowest = Math.min(...PERCHES.map((p) => p.grabY))
    expect(PERCHES[startPerch(5)].grabY).toBe(lowest)
    expect(PERCHES[startPerch(8)].grabY).toBeGreaterThan(lowest)
  })

  it('always drifts to a different place at a different height', () => {
    for (let i = 0; i < PERCHES.length; i++) {
      const next = nextPerch(i)
      expect(next).not.toBe(i)
      expect(PERCHES[next].place).not.toBe(PERCHES[i].place)
      expect(PERCHES[next].grabY).not.toBeCloseTo(PERCHES[i].grabY, 1)
    }
  })

  it('reads perch indices defensively', () => {
    expect(perchIndex(2)).toBe(2)
    expect(perchIndex(99)).toBe(0)
    expect(perchIndex('2')).toBe(0)
    expect(perchIndex(1.5)).toBe(0)
    expect(kiteTarget(-1)).toEqual({ x: PERCHES[0].x, grabY: PERCHES[0].grabY })
  })
})

describe('saved state', () => {
  it('starts with every piece in the tray', () => {
    const state = defaultState(5)
    expect(state.pieces).toHaveLength(PIECES.length)
    expect(state.pieces.every((p) => p.tray)).toBe(true)
    expect(state.perch).toBe(0)
  })

  it('round-trips losslessly', () => {
    const state = defaultState(6)
    state.pieces[3] = { id: 3, tray: false, x: 1.25, y: 0.5, a: Math.PI / 2 }
    state.perch = 2
    const back = deserialize(JSON.parse(JSON.stringify(serialize(state))), 6)
    expect(back.perch).toBe(2)
    expect(back.pieces[3]).toEqual({ id: 3, tray: false, x: 1.25, y: 0.5, a: Math.round((Math.PI / 2) * 1000) / 1000 })
    expect(back.pieces[0]).toEqual({ id: 0, tray: true })
  })

  it('falls back on garbage without throwing', () => {
    for (const raw of [null, undefined, 42, 'x', [], { v: 99 }, { v: STATE_VERSION, pieces: 'no' }]) {
      const state = deserialize(raw, 5)
      expect(state.pieces).toHaveLength(PIECES.length)
      expect(state.perch).toBe(0)
    }
  })

  it('drops unknown pieces, fixes bad numbers, and clamps into the play area', () => {
    const state = deserialize(
      {
        v: STATE_VERSION,
        perch: 7,
        pieces: [
          { id: 99, tray: false, x: 0, y: 0, a: 0 },
          { id: 1, tray: false, x: Number.NaN, y: 1, a: 0 },
          { id: 2, tray: false, x: 500, y: -4, a: 0 },
          { id: 2, tray: false, x: 0, y: 0, a: 0 },
          'junk',
        ],
      },
      8,
    )
    expect(state.perch).toBe(0)
    expect(state.pieces[1]).toEqual({ id: 1, tray: true })
    const arch = state.pieces[2]
    expect(arch.tray).toBe(false)
    if (!arch.tray) {
      expect(arch.x).toBeLessThan(PLAY_MAX_X)
      expect(arch.y).toBe(0)
    }
  })

  it('keeps the age default perch when an older save has none', () => {
    expect(deserialize({ v: STATE_VERSION, pieces: [] }, 8).perch).toBe(startPerch(8))
  })
})
