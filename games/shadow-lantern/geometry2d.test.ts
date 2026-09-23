import { describe, expect, it } from 'vitest'
import {
  chaikinClosed,
  createMask,
  maskArea,
  outlineFromSegments,
  perimeter,
  pointInPolygon,
  polygonArea,
  resampleClosed,
  simplifyClosed,
  traceMask,
  wobble,
  type Point,
} from './geometry2d'

const square: Point[] = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 4 },
  { x: 0, y: 4 },
]

function circleMask(r: number, cell: number) {
  const mask = createMask(-r - 2, -r - 2, r + 2, r + 2, cell)
  for (let j = 0; j < mask.h; j++) {
    for (let i = 0; i < mask.w; i++) {
      const x = mask.x0 + i * cell
      const y = mask.y0 + j * cell
      if (x * x + y * y <= r * r) mask.data[j * mask.w + i] = 1
    }
  }
  return mask
}

describe('geometry2d', () => {
  it('measures a counter-clockwise square', () => {
    expect(polygonArea(square)).toBeCloseTo(16)
    expect(polygonArea([...square].reverse())).toBeCloseTo(-16)
    expect(perimeter(square)).toBeCloseTo(16)
    expect(pointInPolygon(2, 2, square)).toBe(true)
    expect(pointInPolygon(5, 2, square)).toBe(false)
  })

  it('resamples a closed outline into evenly spaced points', () => {
    const dots = resampleClosed(square, 16)
    expect(dots).toHaveLength(16)
    for (let i = 0; i < dots.length; i++) {
      const a = dots[i]
      const b = dots[(i + 1) % dots.length]
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(1, 5)
    }
  })

  it('builds an outline of exactly the asked-for points, with a point on every corner', () => {
    const outline = outlineFromSegments({ x: 0, y: 0 }, [
      { kind: 'line', to: { x: 6, y: 0 } },
      { kind: 'arc', cx: 3, cy: 0, r: 3, from: 0, to: Math.PI },
    ], 40)
    expect(outline).toHaveLength(40)
    expect(outline.some((p) => Math.hypot(p.x - 6, p.y) < 1e-9)).toBe(true)
    expect(outline[0]).toEqual({ x: 0, y: 0 })
    // A half-disc of radius 3.
    expect(Math.abs(polygonArea(outline))).toBeCloseTo((Math.PI * 9) / 2, 0)
  })

  it('traces a rasterized circle to within 3% of its area, counter-clockwise', () => {
    const r = 10
    const mask = circleMask(r, 0.3)
    const outline = chaikinClosed(simplifyClosed(traceMask(mask), 0.2), 2)
    const area = polygonArea(outline)
    expect(area).toBeGreaterThan(0)
    expect(Math.abs(area - Math.PI * r * r) / (Math.PI * r * r)).toBeLessThan(0.03)
    expect(Math.abs(maskArea(mask) - Math.PI * r * r) / (Math.PI * r * r)).toBeLessThan(0.03)
  })

  it('a hand-cut wobble keeps the area within 5% and stays deterministic', () => {
    const outline = outlineFromSegments({ x: 0, y: 0 }, [
      { kind: 'line', to: { x: 8, y: 0 } },
      { kind: 'line', to: { x: 8, y: 8 } },
      { kind: 'line', to: { x: 0, y: 8 } },
      { kind: 'line', to: { x: 0, y: 0 } },
    ], 48)
    const cut = wobble(outline, 0.12, 3)
    expect(Math.abs(polygonArea(cut) - 64) / 64).toBeLessThan(0.05)
    expect(wobble(outline, 0.12, 3)).toEqual(cut)
    expect(wobble(outline, 0.12, 4)).not.toEqual(cut)
  })
})
