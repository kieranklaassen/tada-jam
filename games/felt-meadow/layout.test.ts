import { describe, expect, it } from 'vitest'
import { BURROW, GRASS, groundY, HILL, onGrass, onPouch, PLOT_RADIUS, plotAt, PLOTS, plotTop, POUCH, POUCH_RADIUS, POUCH_SLOTS, restingSpot, SEED_RADIUS, SNAIL_PATH, type Point } from './layout'

describe('hillside layout', () => {
  it('puts every molehill, the pouch, the snail path, and the burrow on the open grass', () => {
    for (const plot of PLOTS) expect(onGrass(plot.x, plot.z)).toBe(true)
    expect(onGrass(POUCH.x, POUCH.z)).toBe(true)
    expect(onGrass(BURROW.x, BURROW.z)).toBe(true)
    expect(onGrass(SNAIL_PATH.left, SNAIL_PATH.z) && onGrass(SNAIL_PATH.right, SNAIL_PATH.z)).toBe(true)
  })

  it('keeps molehills and the pouch far enough apart for a small finger', () => {
    for (let i = 0; i < PLOTS.length; i++) {
      expect(Math.hypot(PLOTS[i].x - POUCH.x, PLOTS[i].z - POUCH.z)).toBeGreaterThan(PLOT_RADIUS + POUCH_RADIUS + 8)
      for (let j = i + 1; j < PLOTS.length; j++) expect(Math.hypot(PLOTS[i].x - PLOTS[j].x, PLOTS[i].z - PLOTS[j].z)).toBeGreaterThan(PLOT_RADIUS * 3)
    }
    for (const slot of POUCH_SLOTS) expect(onPouch(slot.x, slot.z)).toBe(true)
  })

  it('rises away from the child to a crest, so the whole slope faces the camera', () => {
    expect(groundY(0, HILL.near)).toBeLessThan(groundY(0, 0))
    expect(groundY(0, 0)).toBeLessThan(groundY(0, HILL.crestZ))
    for (let x = HILL.left; x <= HILL.right; x += 8) {
      for (let z = HILL.far; z <= HILL.near; z += 8) expect(Number.isFinite(groundY(x, z))).toBe(true)
    }
    for (let plot = 0; plot < PLOTS.length; plot++) expect(plotTop(plot)).toBeGreaterThan(groundY(PLOTS[plot].x, PLOTS[plot].z))
  })

  it('finds a molehill under a point, with slop', () => {
    expect(plotAt(PLOTS[2].x + 1, PLOTS[2].z)).toBe(2)
    expect(plotAt(PLOTS[0].x + PLOT_RADIUS + 2, PLOTS[0].z)).toBe(-1)
    expect(plotAt(PLOTS[0].x + PLOT_RADIUS + 2, PLOTS[0].z, 3)).toBe(0)
  })

  it('rests seeds on free grass, never on a molehill, the pouch, or another seed', () => {
    const taken: Point[] = []
    const asks: Point[] = [...PLOTS, POUCH, { x: 500, z: -500 }, { x: 0, z: 20 }, { x: 0, z: 20 }, { x: 0, z: 20 }, { x: 0, z: 20 }]
    for (const ask of asks) {
      const spot = restingSpot(ask.x, ask.z, taken, { x: 0, z: 0 })
      expect(onGrass(spot.x, spot.z)).toBe(true)
      expect(plotAt(spot.x, spot.z, SEED_RADIUS)).toBe(-1)
      expect(Math.hypot(spot.x - POUCH.x, spot.z - POUCH.z)).toBeGreaterThan(POUCH_RADIUS)
      for (const other of taken) expect(Math.hypot(spot.x - other.x, spot.z - other.z)).toBeGreaterThanOrEqual(SEED_RADIUS * 2)
      taken.push({ ...spot })
    }
    expect(GRASS.left).toBeLessThan(GRASS.right)
  })
})
