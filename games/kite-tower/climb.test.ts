import { describe, expect, it } from 'vitest'
import { canGrab, planClimb, standableSpots } from './climb'
import { pieceShape, worldParts, type Placed } from './pieces'

// Piece ids by kind: cubes 0, 1, 3, 8; archL 2; plank 4, 11; half 5, 9; pillar 6, 10; archM 7.
function place(id: number, x: number, y: number, angle = 0): Placed {
  return { id, parts: worldParts(pieceShape(id), { x, y, angle }) }
}

const LOW_KITE = { x: 5.2, grabY: 3.95 }

describe('planClimb', () => {
  it('climbs one cube beside the doll to reach the lowest kite', () => {
    const plan = planClimb([place(0, 5, 0.5)], { x: 3.8, y: 0, on: null }, LOW_KITE)
    expect(plan?.reachesKite).toBe(true)
    expect(plan?.goal.on).toBe(0)
    expect(plan?.moves.some((m) => m.kind === 'climb')).toBe(true)
  })

  it('cannot reach the lowest kite from the bare rug', () => {
    const plan = planClimb([], { x: 3.8, y: 0, on: null }, LOW_KITE)
    expect(plan?.reachesKite).toBe(false)
    expect(plan?.goal.y).toBe(0)
  })

  it('cannot pull itself up a lone pillar', () => {
    const plan = planClimb([place(6, 5, 0.95)], { x: 3.8, y: 0, on: null }, LOW_KITE)
    expect(plan?.reachesKite).toBe(false)
    expect(plan?.goal.on).toBeNull()
  })

  it('climbs stairs two high', () => {
    const placed = [place(0, 2, 0.5), place(1, 3, 0.5), place(3, 3, 1.5)]
    const plan = planClimb(placed, { x: 0, y: 0, on: null }, { x: 3, grabY: 5 })
    expect(plan?.reachesKite).toBe(true)
    expect(plan?.goal.y).toBeCloseTo(2)
    expect(plan?.moves.filter((m) => m.kind === 'climb').length).toBeGreaterThanOrEqual(2)
  })

  it('needs the step: two stacked cubes alone are too tall', () => {
    const placed = [place(1, 3, 0.5), place(3, 3, 1.5)]
    expect(planClimb(placed, { x: 0, y: 0, on: null }, { x: 3, grabY: 5 })?.reachesKite).toBe(false)
  })

  it('walks up a plank ramp onto a pillar', () => {
    const angle = Math.atan2(1.9, Math.sqrt(3.4 ** 2 - 1.9 ** 2))
    const placed = [place(6, 5, 0.95), place(4, 3.1, 1.08, angle)]
    const plan = planClimb(placed, { x: 0, y: 0, on: null }, { x: 5, grabY: 4.85 })
    expect(plan?.reachesKite).toBe(true)
    expect(plan?.moves.some((m) => m.to.on === 4)).toBe(true)
  })

  it('cannot cross a gap wider than a hop to a higher ledge', () => {
    const placed = [place(0, 1, 0.5), place(6, 3.1, 0.95)]
    const plan = planClimb(placed, { x: 1.2, y: 1, on: 0 }, { x: 3.1, grabY: 4.85 })
    expect(plan?.reachesKite).toBe(false)
  })

  it('pulls up to a higher ledge across a small gap', () => {
    const placed = [place(0, 1, 0.5), place(6, 2.3, 0.95)]
    const plan = planClimb(placed, { x: 1.2, y: 1, on: 0 }, { x: 2.3, grabY: 4.85 })
    expect(plan?.reachesKite).toBe(true)
  })

  it('crosses the wide gap on a plank bridge', () => {
    const angle = Math.atan2(0.9, 1.2)
    const bridge = place(4, 2.1 - Math.sin(angle) * 0.16, 1.45 + Math.cos(angle) * 0.16, angle)
    const placed = [place(0, 1, 0.5), place(6, 3.1, 0.95), bridge]
    const plan = planClimb(placed, { x: 1.2, y: 1, on: 0 }, { x: 3.1, grabY: 4.85 })
    expect(plan?.reachesKite).toBe(true)
    expect(plan?.goal.on).toBe(4)
  })

  it('never stands on a covered surface', () => {
    const spots = standableSpots([place(0, 0, 0.5), place(1, 0, 1.5)])
    expect(spots.some((s) => s.on === 0)).toBe(false)
    expect(spots.some((s) => s.on === 1 && Math.abs(s.y - 2) < 1e-6)).toBe(true)
  })

  it('stands on the top of an arch but not inside its hole', () => {
    const spots = standableSpots([place(2, 0, 0.7)])
    const onArch = spots.filter((s) => s.on === 2)
    expect(onArch.length).toBeGreaterThan(0)
    expect(Math.min(...onArch.map((s) => s.y))).toBeGreaterThan(1)
  })

  it('climbs as high as it can near the kite when the kite is out of reach', () => {
    const plan = planClimb([place(0, 1, 0.5)], { x: 0, y: 0, on: null }, { x: 1, grabY: 8 })
    expect(plan?.reachesKite).toBe(false)
    expect(plan?.goal.on).toBe(0)
  })

  it('ignores a climbable block far from the kite', () => {
    const plan = planClimb([place(0, -5, 0.5)], { x: 4.8, y: 0, on: null }, { x: 5, grabY: 8 })
    expect(plan?.moves.length).toBe(0)
  })

  it('reports nothing underfoot when the support is gone', () => {
    expect(planClimb([], { x: 0, y: 2, on: 3 }, LOW_KITE)).toBeNull()
  })

  it('plans a full set quickly', () => {
    const placed = [
      place(0, -4, 0.5),
      place(1, -3, 0.5),
      place(3, -3, 1.5),
      place(8, -2, 0.5),
      place(6, 0, 0.95),
      place(10, 1, 0.95),
      place(2, 0.5, 2.6),
      place(5, 3, 0.4),
      place(9, 4.5, 0.4),
      place(7, 6, 0.3),
    ]
    const start = performance.now()
    for (let i = 0; i < 10; i++) planClimb(placed, { x: -6, y: 0, on: null }, { x: 5.6, grabY: 6.6 })
    expect((performance.now() - start) / 10).toBeLessThan(20)
  })

  it('grabs only when close and high enough', () => {
    expect(canGrab({ x: 5, y: 1, on: 0 }, LOW_KITE)).toBe(true)
    expect(canGrab({ x: 3.5, y: 1, on: 0 }, LOW_KITE)).toBe(false)
    expect(canGrab({ x: 5, y: 0, on: null }, LOW_KITE)).toBe(false)
  })
})
