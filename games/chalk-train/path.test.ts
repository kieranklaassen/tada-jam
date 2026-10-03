import { describe, expect, it } from 'vitest'
import { crossings, inside, middle, nearestOn, pathLength, resample, spotAt } from './path'

const L = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }]

describe('a mark as a path', () => {
  it('measures a path', () => {
    expect(pathLength(L)).toBe(150)
    expect(pathLength([{ x: 3, y: 4 }])).toBe(0)
    expect(pathLength([])).toBe(0)
  })

  it('resamples to an even step and keeps both ends', () => {
    const even = resample(L, 12)
    expect(even[0]).toEqual({ x: 0, y: 0 })
    expect(even[even.length - 1]).toEqual({ x: 100, y: 50 })
    for (let i = 1; i < even.length - 1; i++) {
      const d = Math.hypot(even[i].x - even[i - 1].x, even[i].y - even[i - 1].y)
      // Round a corner the chord is a little shorter than the step along the path.
      expect(d).toBeLessThanOrEqual(12.001)
      expect(d).toBeGreaterThan(8)
    }
    expect(Math.abs(pathLength(even) - 150)).toBeLessThan(4)
  })

  it('leaves a single point and repeated points alone', () => {
    expect(resample([{ x: 5, y: 5 }], 12)).toEqual([{ x: 5, y: 5 }])
    expect(resample([{ x: 5, y: 5 }, { x: 5, y: 5 }], 12).length).toBe(1)
  })

  it('finds the spot a distance along, held at the ends', () => {
    expect(spotAt(L, 50)).toEqual({ x: 50, y: 0, tx: 1, ty: 0 })
    expect(spotAt(L, 125)).toEqual({ x: 100, y: 25, tx: 0, ty: 1 })
    expect(spotAt(L, -9)).toMatchObject({ x: 0, y: 0 })
    expect(spotAt(L, 999)).toMatchObject({ x: 100, y: 50 })
    expect(spotAt([{ x: 7, y: 8 }], 3)).toMatchObject({ x: 7, y: 8 })
  })

  it('finds the nearest point of a path', () => {
    expect(nearestOn(L, { x: 40, y: 30 })).toEqual({ s: 40, gap: 30 })
    expect(nearestOn(L, { x: 130, y: 20 })).toEqual({ s: 120, gap: 30 })
    expect(nearestOn([{ x: 0, y: 0 }], { x: 3, y: 4 })).toEqual({ s: 0, gap: 5 })
  })

  it('tells inside a closed shape from outside', () => {
    const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]
    expect(inside(square, { x: 5, y: 5 })).toBe(true)
    expect(inside(square, { x: 15, y: 5 })).toBe(false)
    expect(inside(square, { x: 5, y: -1 })).toBe(false)
  })

  it('counts where two paths cross', () => {
    const flat = [{ x: 0, y: 0 }, { x: 100, y: 0 }]
    expect(crossings(flat, [{ x: 50, y: -10 }, { x: 50, y: 10 }])).toBe(1)
    expect(crossings(flat, [{ x: 20, y: -10 }, { x: 40, y: 10 }, { x: 60, y: -10 }, { x: 80, y: 10 }])).toBe(3)
    expect(crossings(flat, [{ x: 0, y: 5 }, { x: 100, y: 5 }])).toBe(0)
  })

  it('finds the middle of a path', () => {
    expect(middle(L)).toEqual({ x: 50, y: 25 })
  })
})
