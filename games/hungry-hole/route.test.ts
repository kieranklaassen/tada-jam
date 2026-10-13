import { describe, expect, it } from 'vitest'
import { ENTRY } from './places'
import { ELBOW, along, clearAlong, routeIn, type Block } from './route'

/** The least room between a walker of this width and anything that stands, along the whole of a way. */
function leastRoom(points: readonly { x: number; z: number }[], width: number, standing: readonly Block[]): number {
  let least = Infinity
  const at = { x: 0, z: 0, dirX: 0, dirZ: 0 }
  let long = 0
  for (let i = 1; i < points.length; i++) long += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z)
  for (let far = 0; far <= long; far += 0.05) {
    along(points, far, at)
    for (const other of standing) least = Math.min(least, Math.hypot(other.x - at.x, other.z - at.z) - (other.wide + width) / 2)
  }
  return least
}

describe('the way in from the gate', () => {
  it('is straight when nothing stands in it', () => {
    const way = routeIn({ x: -3, z: 2 }, 1, [])
    expect(way.points).toEqual([{ ...ENTRY }, { x: -3, z: 2 }])
    expect(way.long).toBeCloseTo(Math.hypot(ENTRY.x + 3, ENTRY.z - 2), 5)
    expect(way.over).toBe(false)
  })

  it('goes round what stands in it, never through it, and is longer for that', () => {
    const block: Block = { x: 1.2, z: 0.3, wide: 2.2 }, to = { x: -3, z: 2 }
    expect(clearAlong({ ...ENTRY }, to, 1, [block])).toBe(false)
    const way = routeIn(to, 1, [block])
    expect(way.over).toBe(false)
    expect(way.points.length).toBeGreaterThan(2)
    expect(way.points[0]).toEqual({ ...ENTRY })
    expect(way.points[way.points.length - 1]).toEqual(to)
    expect(way.long).toBeGreaterThan(Math.hypot(ENTRY.x - to.x, ENTRY.z - to.z))
    expect(leastRoom(way.points, 1, [block])).toBeGreaterThanOrEqual(0)
  })

  it('says so when the street leaves no way round', () => {
    // A wall of things across the whole street.
    const wall: Block[] = Array.from({ length: 9 }, (_, i) => ({ x: 2, z: -3 + i * 0.8, wide: 1.2 }))
    expect(routeIn({ x: -3, z: 0 }, 1, wall).over).toBe(true)
  })

  it('keeps a little room between the walker and what stands', () => {
    expect(ELBOW).toBeGreaterThan(0)
    expect(clearAlong({ x: 0, z: 0 }, { x: 4, z: 0 }, 1, [{ x: 2, z: 1 + ELBOW / 2, wide: 1 }])).toBe(false)
    expect(clearAlong({ x: 0, z: 0 }, { x: 4, z: 0 }, 1, [{ x: 2, z: 1 + ELBOW * 2, wide: 1 }])).toBe(true)
  })
})

describe('a walker on its way', () => {
  it('is where its distance puts it, facing the way the leg runs, and stops at the end', () => {
    const points = [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 2, z: 3 }], at = { x: 9, z: 9, dirX: 0, dirZ: 0 }
    along(points, 1, at)
    expect(at).toEqual({ x: 1, z: 0, dirX: 1, dirZ: 0 })
    along(points, 3.5, at)
    expect(at).toEqual({ x: 2, z: 1.5, dirX: 0, dirZ: 1 })
    along(points, 99, at)
    expect(at).toMatchObject({ x: 2, z: 3 })
  })
})
