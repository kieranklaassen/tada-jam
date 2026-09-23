import { describe, expect, it } from 'vitest'
import { ARRIVE_DELAY, LEAVE_DELAY, Presence, TRAVEL_SECONDS, wantedSpot } from './creatures'
import { solveFlow } from './flow'
import { cellIndex, PLOTS } from './layout'
import type { Piece } from './pieces'

const bend = (turn: number): Piece => ({ kind: 'bend', c: 3, r: 0, turn, open: true })
const noGrowth = PLOTS.map(() => 0)

describe('wantedSpot', () => {
  it('the frog wants the rice paddy only while it is wet', () => {
    expect(wantedSpot('frog', solveFlow([]), noGrowth, [])).toBeNull()
    const wet = solveFlow([bend(3), { kind: 'straight', c: 2, r: 0, turn: 1, open: true }])
    expect(wantedSpot('frog', wet, noGrowth, [])).toEqual({ c: 1, r: 3 })
  })

  it('the sparrow wants the fullest flowers in bloom', () => {
    expect(wantedSpot('sparrow', solveFlow([]), noGrowth, [])).toBeNull()
    expect(wantedSpot('sparrow', solveFlow([]), [0.8, 0, 0, 0.95], [])).toEqual({ c: 2, r: 4 })
  })

  it('the tanuki naps by a turning wheel, or else a ripe pumpkin', () => {
    const wheel: Piece = { kind: 'wheel', c: 3, r: 1, turn: 0, open: true }
    expect(wantedSpot('tanuki', solveFlow([wheel]), noGrowth, [cellIndex(3, 1)])).toEqual({ c: 3, r: 1 })
    expect(wantedSpot('tanuki', solveFlow([]), [0, 0, 1, 0], [])).toEqual({ c: 5, r: 4 })
    expect(wantedSpot('tanuki', solveFlow([]), noGrowth, [])).toBeNull()
  })
})

describe('Presence', () => {
  it('arrives a moment after its reason appears, and leaves a while after it goes', () => {
    const frog = new Presence('frog')
    const spot = { c: 1, r: 3 }
    frog.update(0, spot)
    expect(frog.phase).toBe('away')
    frog.update(ARRIVE_DELAY.frog + 0.01, spot)
    expect(frog.phase).toBe('arriving')
    frog.update(ARRIVE_DELAY.frog + TRAVEL_SECONDS.frog + 0.02, spot)
    expect(frog.phase).toBe('here')
    frog.update(20, null)
    expect(frog.phase).toBe('here')
    frog.update(20 + LEAVE_DELAY + 0.01, null)
    expect(frog.phase).toBe('leaving')
    frog.update(40, null)
    expect(frog.phase).toBe('away')
  })

  it('a reason that flickers away and back does not send it off', () => {
    const tanuki = new Presence('tanuki')
    tanuki.settle({ c: 3, r: 1 }, 0)
    tanuki.update(1, null)
    tanuki.update(2, { c: 3, r: 1 })
    tanuki.update(10, { c: 3, r: 1 })
    expect(tanuki.phase).toBe('here')
  })

  it('walks over when its spot moves', () => {
    const sparrow = new Presence('sparrow')
    sparrow.settle({ c: 4, r: 2 }, 0)
    sparrow.update(1, { c: 2, r: 4 })
    expect(sparrow.phase).toBe('arriving')
    expect(sparrow.spot).toEqual({ c: 2, r: 4 })
  })
})
