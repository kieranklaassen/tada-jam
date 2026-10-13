import { describe, expect, it } from 'vitest'
import { FADE, Spray } from './spray'
import { LENGTH } from './trail'

describe('loose beads', () => {
  it('never holds more than its limit', () => {
    const spray = new Spray(1, 12)
    for (let i = 0; i < 10; i++) spray.burst(100, 0, 8, 40, 60, 80)
    expect(spray.beads.length).toBe(12)
    spray.limit = 4
    spray.burst(100, 0, 8, 40, 60, 80)
    expect(spray.beads.length).toBeLessThanOrEqual(12)
  })

  it('flies, comes down, never goes into the board, and is gone within two seconds and a bit', () => {
    const spray = new Spray(7, 48)
    spray.burst(LENGTH - 2, 0, 20, 60, 80, 90)
    let highest = 0
    for (let t = 0; t < 2.2; t += 1 / 60) {
      spray.step(1 / 60)
      for (const bead of spray.beads) {
        expect(bead.y).toBeGreaterThanOrEqual(0.5)
        expect(bead.s).toBeGreaterThanOrEqual(0)
        expect(bead.s).toBeLessThan(LENGTH)
        highest = Math.max(highest, bead.y)
      }
    }
    expect(highest).toBeGreaterThan(4)
    expect(spray.beads.length).toBe(0)
    expect(FADE).toBeLessThan(1.1)
  })

  it('throws the same beads from the same seed and other beads from another', () => {
    const throwFrom = (seed: number) => {
      const spray = new Spray(seed, 48)
      spray.burst(10, 0, 6, 10, 30, 40)
      spray.step(0.1)
      return JSON.stringify(spray.beads)
    }
    expect(throwFrom(3)).toBe(throwFrom(3))
    expect(throwFrom(3)).not.toBe(throwFrom(4))
  })
})
