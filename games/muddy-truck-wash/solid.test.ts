import { describe, expect, it } from 'vitest'
import { ROSTER } from './cycle'
import { rayMeets, solidOf } from './solid'

describe('a vehicle as the triangles it is drawn from', () => {
  it('is met by a ray at its side, from the child\'s side, at the depth the side stands at', () => {
    for (const def of ROSTER) {
      const solid = solidOf(def)
      // Straight at the middle of the body, from in front of its near side.
      const hit = rayMeets(solid, 0.2, 1.0, 6, 0, 0, -1)
      expect(hit, def.id).not.toBeNull()
      expect(hit!.z).toBeGreaterThan(0.3)
      expect(hit!.z).toBeLessThan(1.3)
      expect(hit!.t).toBeCloseTo(6 - hit!.z, 6)
    }
  })

  it('is missed by a ray that passes over it, beside it or away from it', () => {
    for (const def of ROSTER) {
      const solid = solidOf(def)
      expect(rayMeets(solid, 0, def.side.y1 + 1.5, 6, 0, 0, -1), def.id).toBeNull()
      expect(rayMeets(solid, def.side.x1 + 0.5, 1, 6, 0, 0, -1), def.id).toBeNull()
      expect(rayMeets(solid, 0.2, 1.0, 6, 0, 0, 1), def.id).toBeNull()
    }
  })

  it('has its wheels: a ray low at a wheel meets the tyre, proud of the body', () => {
    for (const def of ROSTER) {
      const wheel = def.wheels[0]
      const hit = rayMeets(solidOf(def), wheel.x, wheel.r, 6, 0, 0, -1)
      expect(hit!.z, def.id).toBeGreaterThan(wheel.z)
    }
  })

  it('is built once', () => {
    expect(solidOf(ROSTER[0])).toBe(solidOf(ROSTER[0]))
  })
})
