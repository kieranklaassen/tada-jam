import { describe, expect, it } from 'vitest'
import { BESIDE_X, CAPE, CHAIR, COLLAR_Y, FLOOR_Y, LOCK_X, SCENE, STEP, STRIP_W, capeHalfWidthAt, fit, tipY } from './layout'

describe('the salon layout', () => {
  it('fits the whole scene into any surface, centred', () => {
    for (const [w, h] of [[1180, 820], [1024, 768], [820, 1180], [2360, 1640], [400, 300]]) {
      const f = fit(w, h)
      expect(SCENE.w * f.scale).toBeLessThanOrEqual(w + 1e-6)
      expect(SCENE.h * f.scale).toBeLessThanOrEqual(h + 1e-6)
      expect(f.dx).toBeCloseTo((w - SCENE.w * f.scale) / 2)
      expect(f.dy).toBeCloseTo((h - SCENE.h * f.scale) / 2)
      expect(Math.min(f.dx, f.dy)).toBeCloseTo(0)
    }
  })

  it('draws nothing on a surface with no size', () => {
    for (const [w, h] of [[0, 0], [0, 500], [500, 0], [-3, 9], [Number.NaN, 5]]) expect(fit(w, h).scale).toBe(0)
  })

  it('reaches from the collar to the floor in a hundred steps', () => {
    expect(tipY(0)).toBe(COLLAR_Y)
    expect(tipY(100)).toBeGreaterThanOrEqual(FLOOR_Y)
    expect(tipY(100)).toBeLessThan(SCENE.h)
    expect(STEP).toBeGreaterThan(0)
  })

  it('hangs the lock and the strip beside it over the cape, side by side and not touching', () => {
    for (const x of [LOCK_X, BESIDE_X]) {
      expect(Math.abs(x - CHAIR.x) + STRIP_W / 2).toBeLessThanOrEqual(capeHalfWidthAt(COLLAR_Y))
    }
    const gap = BESIDE_X - LOCK_X - STRIP_W
    expect(gap).toBeGreaterThan(0)
    expect(gap).toBeLessThan(STRIP_W)
  })

  it('widens the cape from the collar to the hem and never narrows', () => {
    let last = 0
    for (let y = COLLAR_Y - 20; y <= CAPE.hemY + 20; y += 5) {
      const half = capeHalfWidthAt(y)
      expect(half).toBeGreaterThanOrEqual(last)
      last = half
    }
    expect(capeHalfWidthAt(COLLAR_Y)).toBe(CAPE.collarHalf)
    expect(capeHalfWidthAt(CAPE.hemY)).toBe(CAPE.hemHalf)
  })
})
