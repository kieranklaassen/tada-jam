import { describe, expect, it } from 'vitest'
import { clampWalk, insideWalk, onTurntable, TRAY, traySlot, TRAY_SLOT_RADIUS, TURNTABLE, WAKE_LANDING, WALK } from './layout'
import { PART_KINDS } from './parts'

describe('layout', () => {
  it('clamps any point into the walkable area, even right behind the turntable', () => {
    for (const margin of [0, 4, 6]) {
      for (let x = -80; x <= 60; x += 4) {
        for (let z = -50; z <= 50; z += 4) {
          const out = clampWalk({ x, z }, margin)
          expect(insideWalk(out, margin - 0.01)).toBe(true)
        }
      }
    }
    const behind = clampWalk({ x: TURNTABLE.x + 0.5, z: TURNTABLE.z - 2 }, 6)
    expect(behind.z).toBeGreaterThanOrEqual(WALK.minZ + 6)
  })

  it('keeps every tray slot inside the tray, apart from each other, and away from the walk', () => {
    for (const kind of PART_KINDS) {
      const slot = traySlot(kind)
      expect(Math.abs(slot.x - TRAY.x) + TRAY_SLOT_RADIUS).toBeLessThanOrEqual(TRAY.halfWidth + 0.5)
      expect(Math.abs(slot.z - TRAY.z) + TRAY_SLOT_RADIUS).toBeLessThanOrEqual(TRAY.halfDepth + 0.5)
      expect(slot.x - TRAY_SLOT_RADIUS).toBeGreaterThan(WALK.maxX)
    }
  })

  it('lands a woken critter on the bench, off the turntable', () => {
    expect(insideWalk(WAKE_LANDING, 2)).toBe(true)
    expect(onTurntable(WAKE_LANDING)).toBe(false)
  })
})
