import { describe, expect, it } from 'vitest'
import { cappedDpr, fitField, toLogical } from './canvas.ts'
import { FIELD_H, FIELD_W } from './sim.ts'

describe('fitField', () => {
  it('ignores a 0x0 measurement', () => {
    expect(fitField(0, 0)).toBeNull()
  })

  it('ignores a measurement with one empty side, or one that is not finite', () => {
    expect(fitField(0, 500)).toBeNull()
    expect(fitField(500, 0)).toBeNull()
    expect(fitField(-10, 500)).toBeNull()
    expect(fitField(Number.NaN, 500)).toBeNull()
    expect(fitField(500, Number.POSITIVE_INFINITY)).toBeNull()
  })

  it('fits the exact field with no bars', () => {
    expect(fitField(FIELD_W, FIELD_H)).toEqual({ scale: 1, offsetX: 0, offsetY: 0 })
  })

  it('letterboxes into a wide viewport with bars left and right', () => {
    const fit = fitField(2000, FIELD_H)!
    expect(fit.scale).toBe(1)
    expect(fit.offsetY).toBe(0)
    expect(fit.offsetX).toBe((2000 - FIELD_W) / 2)
  })

  it('letterboxes into a tall viewport with bars above and below', () => {
    const fit = fitField(FIELD_W / 2, 1000)!
    expect(fit.scale).toBe(0.5)
    expect(fit.offsetX).toBe(0)
    expect(fit.offsetY).toBe((1000 - FIELD_H / 2) / 2)
  })

  it('always keeps the whole field inside the viewport', () => {
    for (const [w, h] of [
      [320, 480],
      [768, 1024],
      [1024, 768],
      [1920, 1080],
      [4000, 300],
      [300, 4000],
    ] as const) {
      const fit = fitField(w, h)!
      expect(fit.offsetX).toBeGreaterThanOrEqual(-1e-9)
      expect(fit.offsetY).toBeGreaterThanOrEqual(-1e-9)
      expect(fit.offsetX + FIELD_W * fit.scale).toBeLessThanOrEqual(w + 1e-9)
      expect(fit.offsetY + FIELD_H * fit.scale).toBeLessThanOrEqual(h + 1e-9)
    }
  })
})

describe('toLogical', () => {
  const rect = { left: 100, top: 50, width: 1600, height: 900 }

  it('round trips logical -> client -> logical', () => {
    const fit = fitField(rect.width, rect.height)!
    for (const [x, y] of [
      [0, 0],
      [FIELD_W, FIELD_H],
      [300, 200],
      [FIELD_W / 2, FIELD_H / 2],
    ] as const) {
      const clientX = rect.left + fit.offsetX + x * fit.scale
      const clientY = rect.top + fit.offsetY + y * fit.scale
      const back = toLogical(clientX, clientY, rect)!
      expect(back.x).toBeCloseTo(x, 9)
      expect(back.y).toBeCloseTo(y, 9)
    }
  })

  it('maps the rect centre to the field centre', () => {
    const centre = toLogical(rect.left + rect.width / 2, rect.top + rect.height / 2, rect)!
    expect(centre.x).toBeCloseTo(FIELD_W / 2, 9)
    expect(centre.y).toBeCloseTo(FIELD_H / 2, 9)
  })

  it('does not clamp a touch in the letterbox bars', () => {
    const inBar = toLogical(rect.left + 1, rect.top + 1, rect)!
    expect(inBar.x).toBeLessThan(0)
  })

  it('returns null while the element has no size', () => {
    expect(toLogical(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toBeNull()
  })
})

describe('cappedDpr', () => {
  it('caps at 2 and never goes below 1', () => {
    expect(cappedDpr(3)).toBe(2)
    expect(cappedDpr(2)).toBe(2)
    expect(cappedDpr(1.5)).toBe(1.5)
    expect(cappedDpr(0.5)).toBe(1)
    expect(cappedDpr(0)).toBe(1)
    expect(cappedDpr(Number.NaN)).toBe(1)
  })
})
