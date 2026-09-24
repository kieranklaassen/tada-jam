import { describe, expect, it } from 'vitest'
import { SHAPES, type PieceKind, type Vec2 } from './pieces'
import { rect, slabCap, woodSlab } from './view/shapes'

function crosses(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const side = (p: Vec2, q: Vec2, r: Vec2) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  const d1 = side(c, d, a)
  const d2 = side(c, d, b)
  const d3 = side(a, b, c)
  const d4 = side(a, b, d)
  return ((d1 > 1e-12 && d2 < -1e-12) || (d1 < -1e-12 && d2 > 1e-12)) && ((d3 > 1e-12 && d4 < -1e-12) || (d3 < -1e-12 && d4 > 1e-12))
}

/** Edges that cross another non-adjacent edge of the same closed contour. */
function selfCrossings(contour: readonly Vec2[]): number {
  const n = contour.length
  let count = 0
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue
      if (crosses(contour[i], contour[(i + 1) % n], contour[j], contour[(j + 1) % n])) count++
    }
  }
  return count
}

const bevelOf = (kind: PieceKind) => (kind === 'plank' ? 0.04 : 0.055)

describe('wooden slabs', () => {
  it('inset every piece outline into a cap that never folds over itself', () => {
    for (const kind of Object.keys(SHAPES) as PieceKind[]) {
      const cap = slabCap(SHAPES[kind].outline, bevelOf(kind))
      expect(selfCrossings(cap), kind).toBe(0)
    }
  })

  it('inset the thin room boards and kite panels cleanly too', () => {
    for (const [outline, bevel] of [
      [rect(0.1, 4), 0.02],
      [rect(0.05, 1.8), 0.012],
      [rect(3.4, 0.12), 0.05],
      [
        [
          { x: 0, y: 0.25 },
          { x: 0, y: 0.95 },
          { x: -0.62, y: 0.25 },
        ],
        0.014,
      ],
    ] as [Vec2[], number][]) {
      expect(selfCrossings(slabCap(outline, bevel))).toBe(0)
    }
  })

  it('wind every front-cap triangle the same way, so no two cap triangles overlap', () => {
    for (const kind of Object.keys(SHAPES) as PieceKind[]) {
      const shape = SHAPES[kind]
      const g = woodSlab(shape.outline, shape.depth, shape.grain, { bevel: bevelOf(kind) })
      const position = g.getAttribute('position')
      const normal = g.getAttribute('normal')
      const index = g.getIndex()!
      let flipped = 0
      let area = 0
      for (let t = 0; t < index.count; t += 3) {
        const [i, j, k] = [index.getX(t), index.getX(t + 1), index.getX(t + 2)]
        if (normal.getZ(i) < 0.999 || normal.getZ(j) < 0.999 || normal.getZ(k) < 0.999) continue
        const cross = (position.getX(j) - position.getX(i)) * (position.getY(k) - position.getY(i)) - (position.getY(j) - position.getY(i)) * (position.getX(k) - position.getX(i))
        if (cross < -1e-12) flipped++
        area += cross / 2
      }
      const cap = slabCap(shape.outline, bevelOf(kind))
      let capArea = 0
      for (let i = 0; i < cap.length; i++) capArea += (cap[i].x * cap[(i + 1) % cap.length].y - cap[(i + 1) % cap.length].x * cap[i].y) / 2
      expect(flipped, kind).toBe(0)
      expect(area, kind).toBeCloseTo(capArea, 6)
    }
  })

  it('keep the outer silhouette exactly the physics outline', () => {
    for (const kind of Object.keys(SHAPES) as PieceKind[]) {
      const shape = SHAPES[kind]
      const g = woodSlab(shape.outline, shape.depth, shape.grain, { bevel: bevelOf(kind) })
      g.computeBoundingBox()
      const box = g.boundingBox!
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      for (const part of shape.parts) {
        for (const p of part) {
          minX = Math.min(minX, p.x)
          maxX = Math.max(maxX, p.x)
          minY = Math.min(minY, p.y)
          maxY = Math.max(maxY, p.y)
        }
      }
      expect(box.min.y, kind).toBeGreaterThanOrEqual(minY - 1e-6)
      expect(box.max.y, kind).toBeLessThanOrEqual(maxY + 1e-6)
      expect(box.min.x, kind).toBeGreaterThanOrEqual(minX - 1e-6)
      expect(box.max.x, kind).toBeLessThanOrEqual(maxX + 1e-6)
      expect(box.min.y - minY, kind).toBeLessThan(0.005)
      expect(box.max.z - box.min.z, kind).toBeCloseTo(shape.depth, 6)
    }
  })
})
