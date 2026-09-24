import { describe, expect, it } from 'vitest'
import { HELD_SCALE, PIECES, pieceShape, pointInConvex, quarter, restHeight, restSliver, SHAPES, skylineAt, slideClear, spanAt, worldParts, type Placed } from './pieces'

function place(id: number, x: number, y: number, angle = 0): Placed {
  return { id, parts: worldParts(pieceShape(id), { x, y, angle }) }
}

describe('piece shapes', () => {
  it('centres every kind on its centre of mass', () => {
    for (const shape of Object.values(SHAPES)) {
      let area = 0
      let mx = 0
      let my = 0
      for (const part of shape.parts) {
        for (let i = 0; i < part.length; i++) {
          const a = part[i]
          const b = part[(i + 1) % part.length]
          const cross = a.x * b.y - b.x * a.y
          area += cross / 2
          mx += ((a.x + b.x) * cross) / 6
          my += ((a.y + b.y) * cross) / 6
        }
      }
      expect(area).toBeGreaterThan(0)
      expect(Math.abs(mx / area)).toBeLessThan(1e-6)
      expect(Math.abs(my / area)).toBeLessThan(1e-6)
    }
  })

  it('keeps every part convex and counter-clockwise', () => {
    for (const shape of Object.values(SHAPES)) {
      for (const part of shape.parts) {
        for (let i = 0; i < part.length; i++) {
          const a = part[i]
          const b = part[(i + 1) % part.length]
          const c = part[(i + 2) % part.length]
          expect((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)).toBeGreaterThanOrEqual(-1e-9)
        }
      }
    }
  })

  it('has a full rainbow set with unique ids in tray order', () => {
    expect(PIECES.map((p) => p.id)).toEqual(PIECES.map((_, i) => i))
    expect(new Set(PIECES.map((p) => p.kind)).size).toBe(6)
  })

  it('puts a cube resting on the rug half a unit up', () => {
    const cube = place(0, 0, 0.5)
    const span = spanAt(cube.parts[0], 0)
    expect(span?.[0]).toBeCloseTo(0)
    expect(span?.[1]).toBeCloseTo(1)
    expect(spanAt(cube.parts[0], 0.8)).toBeNull()
  })

  it('finds points inside convex parts', () => {
    const cube = place(0, 0, 0.5)
    expect(pointInConvex(cube.parts[0], { x: 0.2, y: 0.4 })).toBe(true)
    expect(pointInConvex(cube.parts[0], { x: 0.7, y: 0.4 })).toBe(false)
  })

  it('reads the skyline over an arch and through its hole', () => {
    const arch = place(2, 0, 0)
    const shape = SHAPES.archL
    const apex = Math.max(...shape.outline.map((p) => p.y))
    expect(skylineAt([arch], 0)).toBeCloseTo(apex, 1)
    expect(skylineAt([arch], 5)).toBe(0)
  })

  it('snaps angles to quarter turns', () => {
    expect(quarter(0.3)).toBe(0)
    expect(quarter(1.4)).toBeCloseTo(Math.PI / 2)
    expect(quarter(-3.0)).toBeCloseTo(-Math.PI)
  })
})

describe('restHeight', () => {
  it('hovers a cube just above the empty rug', () => {
    expect(restHeight(SHAPES.cube, 0, 0, [])).toBeCloseTo(0.56)
  })

  it('hovers a cube above the cube under it', () => {
    expect(restHeight(SHAPES.cube, 0, 0, [place(1, 0, 0.5)])).toBeCloseTo(1.56)
  })

  it('clears the tallest thing under any part of the held piece', () => {
    const pillar = place(6, 0.6, 0.95)
    expect(restHeight(SHAPES.cube, 0, 0, [pillar])).toBeCloseTo(1.9 + 0.56)
  })

  it('works for a plank turned upright', () => {
    expect(restHeight(SHAPES.plank, Math.PI / 2, 0, [])).toBeCloseTo(1.7 + 0.06)
  })

  it('clears a corner poking up between any two columns, so a release never starts inside the piece below', () => {
    // A cube stood on its corner under a plank: the gap is narrowest right over that corner, wherever the plank is.
    const diamond = place(0, 0, Math.SQRT1_2, Math.PI / 4)
    for (let x = -1.2; x <= 1.2; x += 0.07) {
      expect(restHeight(SHAPES.plank, 0, x, [diamond]), `plank at ${x.toFixed(2)}`).toBeCloseTo(Math.SQRT2 + 0.16 + 0.06, 6)
    }
  })

  it('reaches as far down as the held piece is drawn', () => {
    expect(restHeight(SHAPES.cube, 0, 0, [], HELD_SCALE)).toBeCloseTo(0.5 * HELD_SCALE + 0.06)
    expect(restHeight(SHAPES.cube, 0, 0, [place(1, 0, 0.5)], HELD_SCALE)).toBeCloseTo(1 + 0.5 * HELD_SCALE + 0.06)
  })
})

describe('slideClear', () => {
  it('sets a block down flush beside a neighbour it lands a sliver over, instead of on its corner', () => {
    const neighbour = place(1, 0, 0.5)
    const x = slideClear(SHAPES.cube, 0, 0.97, [neighbour])
    expect(x).toBeGreaterThan(1)
    expect(x).toBeLessThan(1.01)
    expect(restHeight(SHAPES.cube, 0, x, [neighbour])).toBeCloseTo(0.56)
    expect(restSliver.left + restSliver.right).toBe(0)
  })

  it('leaves a block that overlaps its neighbour by more than a sliver where it is, riding over it', () => {
    const neighbour = place(1, 0, 0.5)
    expect(slideClear(SHAPES.cube, 0, 0.8, [neighbour])).toBe(0.8)
    expect(restHeight(SHAPES.cube, 0, 0.8, [neighbour])).toBeCloseTo(1.56)
  })

  it('rides over a gap narrower than the block instead of wedging into it', () => {
    const left = place(1, -0.98, 0.5)
    const right = place(3, 0.98, 0.5)
    expect(slideClear(SHAPES.cube, 0, 0, [left, right])).toBe(0)
    expect(restHeight(SHAPES.cube, 0, 0, [left, right])).toBeCloseTo(1.56)
  })
})
