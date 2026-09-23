import { describe, expect, it } from 'vitest'
import { pointInPolygon, polygonArea } from './geometry2d'
import { isShapeKind, OUTLINE_POINTS, SHAPE_KINDS, SHAPES } from './shapes'

describe('shapes', () => {
  it('every shape is a counter-clockwise outline of the same point count', () => {
    for (const kind of SHAPE_KINDS) {
      const spec = SHAPES[kind]
      expect(spec.outline, kind).toHaveLength(OUTLINE_POINTS)
      expect(polygonArea(spec.outline), kind).toBeGreaterThan(8)
    }
  })

  it('the analytic inside test agrees with the cut outline almost everywhere', () => {
    for (const kind of SHAPE_KINDS) {
      const spec = SHAPES[kind]
      let agree = 0
      let total = 0
      for (let v = -2; v <= 10; v += 0.25) {
        for (let u = -6; u <= 6; u += 0.25) {
          total++
          if (spec.inside(u, v) === pointInPolygon(u, v, spec.outline)) agree++
        }
      }
      expect(agree / total, kind).toBeGreaterThan(0.97)
    }
  })

  it('every pin sits on or just inside its card, and the touch circle covers the card', () => {
    for (const kind of SHAPE_KINDS) {
      const spec = SHAPES[kind]
      const nearest = Math.min(...spec.outline.map((p) => Math.hypot(p.x, p.y)))
      expect(nearest, kind).toBeLessThan(1.5)
      for (const p of spec.outline) expect(Math.hypot(p.x - spec.center.x, p.y - spec.center.y), kind).toBeLessThanOrEqual(spec.radius + 0.1)
    }
  })

  it('each paper has its own colour', () => {
    expect(new Set(SHAPE_KINDS.map((kind) => SHAPES[kind].color)).size).toBe(SHAPE_KINDS.length)
  })

  it('recognises shape kinds', () => {
    expect(isShapeKind('crescent')).toBe(true)
    expect(isShapeKind('moon')).toBe(false)
    expect(isShapeKind(3)).toBe(false)
  })
})
