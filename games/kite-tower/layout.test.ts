import { describe, expect, it } from 'vitest'
import { LAMP, PEG_RAIL, SHELF, WALL_Z } from './layout'
import { PERCHES } from './perches'
import { SHAPES } from './pieces'

const SKIRTING_FRONT = WALL_Z + 0.1
const HELD_SCALE = 1.035
const deepestBack = -Math.max(...Object.values(SHAPES).map((s) => s.depth / 2)) * HELD_SCALE

describe('room furniture stays out of everything near it', () => {
  it('keeps the lamp shade off the wall and in front of nothing a block can reach', () => {
    expect(LAMP.z - LAMP.shade).toBeGreaterThan(WALL_Z + 0.05)
    expect(LAMP.z + LAMP.shade).toBeLessThan(deepestBack - 0.2)
  })

  it('keeps the peg rail beside the shade, not through it', () => {
    const shadeTop = LAMP.shadeY + 0.42
    const shadeBottom = LAMP.shadeY - 0.4
    const railOverlapsInHeight = PEG_RAIL.y - 0.17 < shadeTop && PEG_RAIL.y + 0.17 > shadeBottom
    expect(railOverlapsInHeight).toBe(true)
    expect(PEG_RAIL.x0 - (LAMP.x + LAMP.shade)).toBeGreaterThan(0.1)
  })

  it('stands the lamp base clear of the skirting board and of the blocks', () => {
    expect(LAMP.z - LAMP.base).toBeGreaterThan(SKIRTING_FRONT)
    expect(LAMP.z + LAMP.base).toBeLessThan(deepestBack - 0.2)
  })

  it('hangs a lamp or shelf kite in front of what it is caught on', () => {
    const lamp = PERCHES.find((p) => p.place === 'lamp')!
    expect(lamp.kite.z).toBeGreaterThan(LAMP.z + LAMP.shade + 0.1)
    for (const perch of PERCHES.filter((p) => p.place === 'shelfBoard' || p.place === 'shelfTop')) {
      const leanedTop = perch.kite.z + Math.sin(perch.kite.lean) * 0.95
      expect(leanedTop, perch.place).toBeGreaterThan(SHELF.back + 0.1)
      expect(perch.kite.z, perch.place).toBeLessThan(SHELF.front)
    }
  })
})
