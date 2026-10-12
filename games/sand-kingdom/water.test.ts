import { describe, expect, it } from 'vitest'
import { BUCKET_RADIUS, TIER_HEIGHT, type Field, basin, cellAt, deltaAt, dent, furrow, groove, heap, makeField, pat, peakNear, shave, sink, smoothUpTo, tower, isSmooth, beginStroke } from './field'
import { EVENING_SEA, GROOVE_GAP, drift, dugShare, flood, grooveTurn, grooves, tallest, wall } from './water'

function stroke(field: Field, points: readonly (readonly [number, number])[]): number {
  dent(field, points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) groove(field, points[i - 1][0], points[i - 1][1], points[i][0], points[i][1])
  return cellAt(points[0][0], points[0][1])
}
function ring(field: Field, x: number, z: number, radius: number, gap = 0): number {
  const points: [number, number][] = []
  for (let i = 0; i <= 24 - gap; i++) points.push([x + Math.cos((i / 24) * Math.PI * 2) * radius, z + Math.sin((i / 24) * Math.PI * 2) * radius])
  return stroke(field, points)
}

describe('the grooves', () => {
  it('finds each groove, in the order it was dug, with a line along it', () => {
    const field = makeField()
    const second = stroke(field, [[3, 5], [5, 5]])
    const first = stroke(field, [[-4, 3], [-1, 3], [-1, 6]])
    const found = grooves(field, [first, second])
    expect(found).toHaveLength(2)
    expect(found[0].path[0].x + found[0].path[found[0].path.length - 1].x).toBeCloseTo(-5, 0)
    expect(found[0].path.length).toBeGreaterThan(8)
    expect(found[1].cells).toContain(second)
    expect(found.every((one) => one.ring === null)).toBe(true)
  })

  it('knows a closed ring from one with a gap', () => {
    const closed = makeField()
    const found = grooves(closed, [ring(closed, 0, 4, 1.6)])
    expect(found[0].ring).not.toBeNull()
    for (const point of found[0].ring!) expect(Math.hypot(point.x, point.z - 4)).toBeGreaterThan(1.1)
    const open = makeField()
    expect(grooves(open, [ring(open, 0, 4, 1.6, 4)])[0].ring).toBeNull()
  })

  it('takes the ring round a tower far enough out to walk round it', () => {
    const field = makeField()
    const start = ring(field, 0, 4, 1.3)
    tower(field, 0, 4, 0, 1)
    for (const point of grooves(field, [start])[0].ring!) expect(Math.hypot(point.x, point.z - 4)).toBeGreaterThan(BUCKET_RADIUS * 0.72 + 0.6)
  })
})

describe('the evening water', () => {
  it('runs along a groove from the sea end, later the further it goes, and leaves a groove it cannot reach dry', () => {
    const field = makeField()
    const reached = stroke(field, [[0, -1], [0, 6]])
    const dry = stroke(field, [[4, 4], [6, 4]])
    const water = flood(field, EVENING_SEA, [reached, dry])
    const at = (x: number, z: number) => water.arrival[cellAt(x, z)]
    expect(at(0, 1)).toBeLessThan(at(0, 3))
    expect(at(0, 3)).toBeLessThan(at(0, 5.8))
    expect(at(5, 4)).toBe(Infinity)
    // Level sand up the beach holds no water; the sea's own reach does.
    expect(at(-3, 5)).toBe(Infinity)
    expect(at(-3, -2)).toBe(0)
    expect(water.grooves[1].arrives).toBe(Infinity)
  })

  it('takes the grooves in the order they were dug', () => {
    const field = makeField()
    const late = stroke(field, [[-3, -1], [-3, 4]])
    const early = stroke(field, [[3, -1], [3, 4]])
    const water = flood(field, EVENING_SEA, [early, late])
    expect(water.arrival[cellAt(3, 3.5)]).toBeLessThan(water.arrival[cellAt(-3, 3.5)])
    expect(water.grooves[1].arrives - water.grooves[0].arrives).toBeCloseTo(GROOVE_GAP)
    expect(water.last).toBeGreaterThan(GROOVE_GAP)
  })

  it('carries what floats on along the groove to where it ends', () => {
    const field = makeField()
    const start = stroke(field, [[0, -1], [0, 3], [3, 3], [3, 6]])
    const water = flood(field, EVENING_SEA, [start])
    const path = drift(water, field, { x: 0, z: 2 })
    const end = path[path.length - 1]
    expect(Math.hypot(end.x - 3, end.z - 6)).toBeLessThan(0.6)
    expect(drift(water, field, { x: -5, z: 5 })).toEqual([])
  })
})

describe('what the bucket makes', () => {
  it('drags a wide flat furrow with lumpy banks', () => {
    const field = makeField()
    beginStroke(field)
    furrow(field, -2, 4, 2, 4)
    expect(deltaAt(field, 0, 4)).toBeCloseTo(-0.17, 2)
    expect(deltaAt(field, 0, 4.3)).toBeCloseTo(-0.17, 2)
    expect(peakNear(field, 0, 4 + BUCKET_RADIUS + 0.3, 0.3)).toBeGreaterThan(0.15)
  })

  it('scoops a groove into a basin, which is a pool and not a groove to bridge', () => {
    const field = makeField()
    stroke(field, [[-2, 4], [2, 4]])
    expect(dugShare(field, 0, 4)).toBeLessThan(0.7)
    expect(Math.abs(Math.cos(grooveTurn(field, 0, 4)!))).toBeGreaterThan(0.95)
    basin(field, 0, 4)
    expect(deltaAt(field, 0, 4)).toBeLessThan(-0.35)
    expect(dugShare(field, 0, 4)).toBeGreaterThan(0.75)
    expect(grooveTurn(field, 5, 7)).toBeNull()
  })

  it('turns out a tower, a narrower tier on it, and brings a stack down to one heap', () => {
    const field = makeField()
    tower(field, 0, 4, 0, 1)
    expect(deltaAt(field, 0, 4)).toBeCloseTo(TIER_HEIGHT, 2)
    expect(deltaAt(field, BUCKET_RADIUS + 0.3, 4)).toBe(0)
    expect(tallest(field)!.height).toBeCloseTo(TIER_HEIGHT, 2)
    expect(Math.hypot(tallest(field)!.x, tallest(field)!.z - 4)).toBeLessThan(0.2)
    tower(field, 0, 4, TIER_HEIGHT, 0.7)
    expect(deltaAt(field, 0, 4)).toBeGreaterThan(TIER_HEIGHT + 0.4)
    expect(deltaAt(field, 0.5, 4)).toBeLessThan(TIER_HEIGHT + 0.05)
    heap(field, 0, 4, 1.3, 0.5)
    expect(deltaAt(field, 0, 4)).toBeLessThan(0.52)
    expect(deltaAt(field, 0.9, 4)).toBeGreaterThan(0.05)
  })

  it('shaves raised sand level', () => {
    const field = makeField()
    tower(field, 0, 4, 0, 1)
    shave(field, 0, 4)
    expect(peakNear(field, 0, 4, BUCKET_RADIUS)).toBeLessThan(TIER_HEIGHT * 0.5)
    expect(peakNear(field, 0, 4, BUCKET_RADIUS)).toBeGreaterThan(0.1)
  })
})

describe('walls and towers', () => {
  it('finds no wall in a groove and its rims, and none in one tower', () => {
    const field = makeField()
    stroke(field, [[-3, 4], [3, 4]])
    tower(field, 4, 6, 0, 1)
    expect(wall(field)).toBeNull()
  })

  it('finds three flat places on a row of towers, and a furrow bank lumpy until it is patted', () => {
    const towers = makeField()
    for (const x of [-1, 0, 1]) tower(towers, x, 5, 0, 1)
    const row = wall(towers)!
    expect(row.flat).toBe(true)
    expect(row.perches).toHaveLength(3)
    expect(row.perches[2].x - row.perches[0].x).toBeGreaterThan(1.2)
    const bank = makeField()
    beginStroke(bank)
    furrow(bank, -3, 3, 3, 3)
    furrow(bank, 3, 3, -3, 3)
    const lumpy = wall(bank)
    expect(lumpy).not.toBeNull()
    expect(lumpy!.flat).toBe(false)
    // Patted along the top of one bank, that bank holds all three.
    const top = 3 + BUCKET_RADIUS + 0.3
    for (let x = -2.6; x <= 2.6; x += 0.3) pat(bank, x, top)
    const patted = wall(bank)!
    expect(patted.flat).toBe(true)
    for (const perch of patted.perches) expect(Math.abs(perch.z - top)).toBeLessThan(0.5)
    // Patted again and again, it stays a wall.
    for (let i = 0; i < 6; i++) for (let x = -2.6; x <= 2.6; x += 0.3) pat(bank, x, top)
    expect(wall(bank)!.flat).toBe(true)
  })
})

describe('the tide over the sand', () => {
  it('sinks raised sand the evening sea covers to a mound and leaves an island standing', () => {
    const field = makeField()
    stroke(field, [[-4, -1.5], [-1, -1.5]])
    tower(field, 3, -1, 0, 1)
    const rim = peakNear(field, -2.5, -1.0, 0.25)
    expect(rim).toBeGreaterThan(0.04)
    const sunk = sink(field, EVENING_SEA)
    expect(sunk.length).toBeGreaterThan(0)
    expect(peakNear(field, -2.5, -1.0, 0.25)).toBeLessThan(rim * 0.5)
    expect(deltaAt(field, 3, -1)).toBeCloseTo(TIER_HEIGHT, 2)
    // Up the beach, out of the sea's reach, nothing sinks.
    const high = makeField()
    tower(high, 0, 5, 0, 1)
    expect(sink(high, EVENING_SEA)).toEqual([])
  })

  it('smooths everything the long wave has passed', () => {
    const field = makeField()
    stroke(field, [[-3, 0], [3, 6]])
    tower(field, 4, 2, 0, 1)
    smoothUpTo(field, 3)
    expect(deltaAt(field, -2.5, 0.5)).toBe(0)
    expect(deltaAt(field, 4, 2)).toBeLessThan(TIER_HEIGHT * 0.5)
    expect(deltaAt(field, 2.5, 5.5)).toBeLessThan(-0.1)
    smoothUpTo(field, 12)
    expect(isSmooth(field)).toBe(true)
  })
})
