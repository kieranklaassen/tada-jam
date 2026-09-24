import { describe, expect, it } from 'vitest'
import { ANIMAL_KEYS, ANIMAL_SCALE, ANIMALS } from '../layout'
import { buildAnimal } from './animals'

describe('footprints', () => {
  it('each animal’s footprint holds its whole drawn body, and hardly more', () => {
    for (const key of ANIMAL_KEYS) {
      const { back, front, reach, top } = ANIMALS[key].footprint
      const position = buildAnimal(key).fill.attributes.position
      let far = 0
      let high = 0
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i) * ANIMAL_SCALE
        const z = position.getZ(i) * ANIMAL_SCALE
        far = Math.max(far, Math.hypot(x, z - Math.max(back, Math.min(front, z))))
        high = Math.max(high, position.getY(i) * ANIMAL_SCALE)
      }
      expect(far, key).toBeLessThanOrEqual(reach + 0.01)
      expect(far, key).toBeGreaterThan(reach - 0.4)
      expect(high, key).toBeLessThanOrEqual(top + 0.01)
      expect(high, key).toBeGreaterThan(top - 0.4)
    }
  })
})
