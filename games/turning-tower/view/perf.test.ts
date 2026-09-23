import { describe, expect, it } from 'vitest'
import { CORNER_PX, CornerTaps } from './perf'

describe('grown-up corner', () => {
  it('opens on three quick taps in the top-left corner', () => {
    const corner = new CornerTaps()
    expect(corner.tap(20, 30, 0)).toBe(false)
    expect(corner.tap(24, 28, 200)).toBe(false)
    expect(corner.tap(18, 33, 420)).toBe(true)
    expect(corner.tap(20, 30, 900)).toBe(false)
  })

  it('ignores slow taps, taps elsewhere, and a hand landing with three fingers at once', () => {
    const slow = new CornerTaps()
    expect([0, 400, 800].map((t) => slow.tap(10, 10, t))).toEqual([false, false, false])
    const elsewhere = new CornerTaps()
    expect(elsewhere.tap(10, 10, 0)).toBe(false)
    expect(elsewhere.tap(CORNER_PX + 40, 10, 150)).toBe(false)
    expect(elsewhere.tap(10, 10, 300)).toBe(false)
    const palm = new CornerTaps()
    expect([0, 6, 11].map((t) => palm.tap(10 + t, 20, t))).toEqual([false, false, false])
  })
})
