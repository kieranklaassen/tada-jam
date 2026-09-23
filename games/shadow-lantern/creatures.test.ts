import { describe, expect, it } from 'vitest'
import { buildCreature, CREATURE_ORDER, CREATURES, isCreatureKind } from './creatures'
import { polygonArea } from './geometry2d'
import { SCREEN } from './projection'

describe('creatures', () => {
  it('every sleeping outline fits on the screen with a margin', () => {
    for (const kind of CREATURE_ORDER) {
      const { bounds } = buildCreature(kind)
      expect(bounds.x0, kind).toBeGreaterThan(SCREEN.left + 1)
      expect(bounds.x1, kind).toBeLessThan(SCREEN.right - 1)
      expect(bounds.y0, kind).toBeGreaterThan(SCREEN.bottom + 1)
      expect(bounds.y1, kind).toBeLessThan(SCREEN.top - 1)
    }
  })

  it('the traced outline matches the mask, and the samples match the area', () => {
    for (const kind of CREATURE_ORDER) {
      const built = buildCreature(kind)
      const traced = polygonArea(built.outline)
      expect(Math.abs(traced - built.area) / built.area, kind).toBeLessThan(0.04)
      const sampled = (built.inside.length / 2) * built.insideCell * built.insideCell
      expect(Math.abs(sampled - built.area) / built.area, kind).toBeLessThan(0.08)
      // Big enough to need several shapes, small enough to leave room for spill to show.
      expect(built.area, kind).toBeGreaterThan(250)
      expect(built.area, kind).toBeLessThan(900)
    }
  })

  it('the dotted outline is evenly spaced, and the moving part owns some of its dots', () => {
    for (const kind of CREATURE_ORDER) {
      const built = buildCreature(kind)
      expect(built.dots.length, kind).toBeGreaterThanOrEqual(24)
      expect(built.dots.length, kind).toBeLessThan(220)
      const partDots = built.dotPart.filter((p) => p >= 0).length
      expect(partDots, kind).toBeGreaterThan(3)
      expect(partDots, kind).toBeLessThan(built.dots.length)
    }
  })

  it('the eye and the snore point sit where they belong', () => {
    for (const kind of CREATURE_ORDER) {
      const built = buildCreature(kind)
      const def = CREATURES[kind]
      expect(def.eye.x, kind).toBeGreaterThan(built.bounds.x0)
      expect(def.eye.x, kind).toBeLessThan(built.bounds.x1)
      expect(def.snore.y, kind).toBeGreaterThan(def.eye.y)
    }
  })

  it('builds once per page', () => {
    expect(buildCreature('whale')).toBe(buildCreature('whale'))
  })

  it('recognises creature kinds', () => {
    expect(isCreatureKind('dragon')).toBe(true)
    expect(isCreatureKind('unicorn')).toBe(false)
  })
})
