import { describe, expect, it } from 'vitest'
import { COLUMNS, POND, ground } from './layout'
import { Snow } from './snow'

describe('the snow', () => {
  it('keeps every bit it is given, through heaps and slumps', () => {
    const snow = new Snow()
    let given = 0
    for (let i = 0; i < 90; i++) { snow.add(-14 + (i * 7.3) % 28, 0.0625); given += 0.0625; snow.settle() }
    for (let i = 0; i < 300; i++) snow.settle()
    expect(snow.total).toBeCloseTo(given, 9)
    expect(Math.min(...snow.depth)).toBeGreaterThanOrEqual(0)
    for (let i = 1; i < COLUMNS; i++) expect(Math.abs(snow.depth[i] - snow.depth[i - 1])).toBeLessThan(0.12)
    const half = snow.total / 2
    expect(snow.take(half)).toBeCloseTo(half, 9)
    expect(snow.total).toBeCloseTo(half, 9)
    snow.take(1e9)
    expect(snow.total).toBe(0)
  })
  it('falls where it is let go, and bridges the pond when it is deep', () => {
    const snow = new Snow(), mid = (POND.left + POND.right) / 2
    expect(snow.water(mid)).toBe(true)
    snow.add(-3, 0.06)
    expect(snow.at(-3)).toBeGreaterThan(0.1)
    expect(snow.at(0)).toBe(0)
    snow.depth.fill(0.4)
    expect(snow.water(mid)).toBe(false)
  })
  it('lies on a hill that runs down from the top', () => {
    expect(ground(-5)).toBeGreaterThan(ground(0))
    expect(ground(0)).toBeGreaterThan(ground(3))
    for (let x = -20; x < 20; x += 0.1) expect(Number.isFinite(ground(x))).toBe(true)
  })
})
