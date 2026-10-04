import { describe, expect, it } from 'vitest'
import { makeTerrain, seeded } from './terrain'

describe('the seeded generator', () => {
  it('gives the same run for the same seed, inside 0 to 1', () => {
    const a = seeded(7), b = seeded(7), c = seeded(8)
    const runA = Array.from({ length: 20 }, () => a()), runB = Array.from({ length: 20 }, () => b()), runC = Array.from({ length: 20 }, () => c())
    expect(runA).toEqual(runB)
    expect(runA).not.toEqual(runC)
    for (const value of runA) { expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThan(1) }
  })
})

describe('the terrain', () => {
  const levels = (min: number, max: number, count: number) => Array.from({ length: count }, (_, i) => min + ((i + 0.5) * (max - min)) / count)

  it('is the same for the same seed and differs for another', () => {
    const a = makeTerrain(1904), b = makeTerrain(1904), c = makeTerrain(1905)
    const points = [[0.1, 0.1], [0.5, 0.5], [0.83, 0.27], [0.34, 0.33], [0.99, 0.01]]
    for (const [x, y] of points) expect(a.height(x, y)).toBe(b.height(x, y))
    expect(points.some(([x, y]) => a.height(x, y) !== c.height(x, y))).toBe(true)
    const { min, max } = a.range(40, 28)
    expect(a.contourSegments(levels(min, max, 6), 40, 28)).toEqual(b.contourSegments(levels(min, max, 6), 40, 28))
    expect(a.stream).toEqual(b.stream)
  })

  it('traces segments that stay inside the unit square', () => {
    const terrain = makeTerrain(1904)
    const { min, max } = terrain.range(60, 42)
    expect(max).toBeGreaterThan(min)
    const segments = terrain.contourSegments(levels(min, max, 10), 60, 42)
    expect(segments.length).toBeGreaterThan(100)
    for (const s of segments) {
      for (const value of [s.x1, s.y1, s.x2, s.y2]) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
      expect(s.level).toBeGreaterThanOrEqual(0)
      expect(s.level).toBeLessThan(10)
      // No piece is longer than the cell it was traced in.
      expect(Math.abs(s.x2 - s.x1)).toBeLessThanOrEqual(1 / 60 + 1e-9)
      expect(Math.abs(s.y2 - s.y1)).toBeLessThanOrEqual(1 / 42 + 1e-9)
    }
  })

  it('gives no segment for a level outside the height range', () => {
    const terrain = makeTerrain(1904)
    const { min, max } = terrain.range(60, 42)
    expect(terrain.contourSegments([min - 1, max + 1], 60, 42)).toEqual([])
    expect(terrain.contourSegments([], 60, 42)).toEqual([])
  })

  it('puts the stream in a valley and keeps the shading within its bounds', () => {
    const terrain = makeTerrain(1904)
    // A point on the stream lies lower than the ground a little way to either side of it.
    const mid = terrain.stream[Math.floor(terrain.stream.length * 0.3)]
    const here = terrain.height(mid.x, mid.y)
    expect(here).toBeLessThan(terrain.height(mid.x - 0.09, mid.y))
    expect(here).toBeLessThan(terrain.height(mid.x + 0.09, mid.y))
    for (let j = 0; j <= 20; j++) for (let i = 0; i <= 20; i++) {
      const value = terrain.shade(i / 20, j / 20)
      expect(value).toBeGreaterThanOrEqual(-1)
      expect(value).toBeLessThanOrEqual(1)
    }
    expect(terrain.pool.rx).toBeGreaterThan(0)
  })
})
