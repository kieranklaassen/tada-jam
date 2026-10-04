import { describe, expect, it } from 'vitest'
import { bounds, handEdge, lathe, mirror, oval, seedFor, shade, soften, stream, toHsl, zigzag, type Pt } from './tissue'

const take = (rand: () => number, count: number) => Array.from({ length: count }, rand)

describe('the seeded stream', () => {
  it('gives the same numbers for the same seed, every time', () => {
    expect(take(stream(7), 20)).toEqual(take(stream(7), 20))
    expect(take(stream(7), 20)).not.toEqual(take(stream(8), 20))
  })

  it('stays from 0 up to but not 1, and spreads', () => {
    const numbers = take(stream(0x7155e5), 4000)
    expect(Math.min(...numbers)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...numbers)).toBeLessThan(1)
    const mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length
    expect(mean).toBeGreaterThan(0.47)
    expect(mean).toBeLessThan(0.53)
  })

  it('gives every named thing a seed of its own', () => {
    expect(seedFor(1, 'hill')).toBe(seedFor(1, 'hill'))
    expect(seedFor(1, 'hill')).not.toBe(seedFor(1, 'ground'))
    expect(seedFor(1, 'hill')).not.toBe(seedFor(2, 'hill'))
    expect(Number.isInteger(seedFor(1, 'pip/3'))).toBe(true)
    expect(seedFor(1, 'pip/3')).toBeGreaterThanOrEqual(0)
  })
})

describe('shapes to cut', () => {
  it('makes an oval about its middle', () => {
    const box = bounds(oval(30, 20, 5, -4, 12))
    expect(box.x).toBeCloseTo(-25)
    expect(box.w).toBeCloseTo(60)
    expect(box.y).toBeCloseTo(-24)
    expect(box.h).toBeCloseTo(40)
  })

  it('turns a profile into a shape whose left half mirrors its right', () => {
    const shape = lathe([[-10, 0, 1], [-6, 4], [0, 5], [2, 0]])
    // The two points on the middle line are not doubled.
    expect(shape).toHaveLength(6)
    for (const [x, y] of shape) expect(shape.some(([mx, my]) => mx === -x && my === y)).toBe(true)
    expect(shape[0]).toEqual([0, -10, 1])
  })

  it('folds a spring with a sharp corner at every fold', () => {
    const spring = zigzag(40, 5, 4, 2)
    expect(spring).toHaveLength(10)
    expect(spring.every(([, , sharp]) => sharp === 1)).toBe(true)
    const box = bounds(spring)
    expect(box.h).toBeCloseTo(40)
    expect(box.w).toBeCloseTo(12)
  })

  it('mirrors a shape left to right and keeps its corners', () => {
    const flag: Pt[] = [[0, 0, 1], [10, 2], [3, 8]]
    expect(mirror(flag)).toEqual([[-3, 8, undefined], [-10, 2, undefined], [-0, 0, 1]])
    expect(bounds(mirror(flag)).x).toBeCloseTo(-10)
  })
})

describe('softening an outline', () => {
  const square: Pt[] = [[0, 0], [10, 0], [10, 10], [0, 10]]

  it('cuts every corner and stays inside the shape it was given', () => {
    const soft = soften(square, 2)
    expect(soft).toHaveLength(16)
    const box = bounds(soft)
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.x + box.w).toBeLessThanOrEqual(10)
    expect(box.y + box.h).toBeLessThanOrEqual(10)
    expect(soft.some(([x, y]) => x === 0 && y === 0)).toBe(false)
  })

  it('leaves a sharp corner where it is', () => {
    const drop = soften([[0, -10, 1], [6, 4], [-6, 4]], 3)
    expect(drop.filter(([x, y]) => x === 0 && y === -10)).toHaveLength(1)
    expect(soften(square, 0)).toEqual(square)
  })
})

describe('the edge a hand leaves', () => {
  const ring = soften(oval(50, 40), 2)

  it('is the same edge for the same seed', () => {
    expect(handEdge(ring, 6, 1.5, stream(3))).toEqual(handEdge(ring, 6, 1.5, stream(3)))
    expect(handEdge(ring, 6, 1.5, stream(3))).not.toEqual(handEdge(ring, 6, 1.5, stream(4)))
  })

  it('never strays further from the outline than its wobble', () => {
    const wobble = 2, box = bounds(ring), edge = bounds(handEdge(ring, 4, wobble, stream(11)))
    expect(edge.x).toBeGreaterThanOrEqual(box.x - wobble)
    expect(edge.y).toBeGreaterThanOrEqual(box.y - wobble)
    expect(edge.x + edge.w).toBeLessThanOrEqual(box.x + box.w + wobble)
    expect(edge.y + edge.h).toBeLessThanOrEqual(box.y + box.h + wobble)
  })

  it('takes shorter steps for a tear than for scissors', () => {
    const long: Pt[] = [[0, 0], [200, 0], [200, 100], [0, 100]]
    expect(handEdge(long, 4, 1, stream(1)).length).toBeGreaterThan(handEdge(long, 12, 1, stream(1)).length * 2)
  })

  it('keeps a sharp corner exactly', () => {
    const edge = handEdge([[0, -10, 1], [60, 40], [-60, 40]], 5, 3, stream(5))
    expect(edge[0]).toEqual([0, -10])
  })
})

describe('paint', () => {
  it('reads a hex colour as hue, saturation and lightness', () => {
    expect(toHsl('#ff0000')).toEqual([0, 1, 0.5])
    expect(toHsl('#808080')[1]).toBe(0)
    const [hue, saturation, light] = toHsl('#2d6fdb')
    expect(hue).toBeGreaterThan(210)
    expect(hue).toBeLessThan(225)
    expect(saturation).toBeGreaterThan(0.6)
    expect(light).toBeCloseTo(0.52, 1)
  })

  it('gives back the same paint when nothing is changed', () => {
    for (const hex of ['#f6b100', '#e63e2b', '#2d6fdb', '#8d4bd0', '#ee4c9b', '#1cc4cf', '#56a83f', '#4b362d']) expect(shade(hex, 0, 0)).toBe(hex)
  })

  it('turns the hue and lifts the lightness, and stays a colour', () => {
    const lighter = shade('#2d6fdb', 0, 0.12), turned = shade('#2d6fdb', 30, 0)
    expect(toHsl(lighter)[2]).toBeCloseTo(toHsl('#2d6fdb')[2] + 0.12, 1)
    expect(toHsl(turned)[0]).toBeCloseTo(toHsl('#2d6fdb')[0] + 30, 0)
    expect(shade('#f6b100', -500, 2)).toMatch(/^#[0-9a-f]{6}$/)
    expect(shade('#f6b100', 500, -2)).toMatch(/^#[0-9a-f]{6}$/)
  })
})
