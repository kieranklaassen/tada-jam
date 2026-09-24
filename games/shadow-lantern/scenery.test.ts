import type * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { wobble, type Point } from './geometry2d'
import { buildScenery, CUT_WOBBLE, meadowTufts } from './view/scenery'

type Face = { n: [number, number, number]; d: number; axis: 0 | 1 | 2; tri: [Point, Point, Point]; box: [number, number, number, number]; at: [number, number, number] }

function crosses(a: Point, b: Point, c: Point, d: Point): boolean {
  const side = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0
}

/** No two edges of the closed outline cross. */
function simple(outline: readonly Point[]): boolean {
  const n = outline.length
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue
      if (crosses(outline[i], outline[(i + 1) % n], outline[j], outline[(j + 1) % n])) return false
    }
  }
  return true
}

function area2(p: readonly Point[]): number {
  let a = 0
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length]
    a += p[i].x * q.y - q.x * p[i].y
  }
  return a / 2
}

/** Area of the overlap of two triangles in one plane (Sutherland–Hodgman). */
function overlap(a: readonly Point[], b: readonly Point[]): number {
  const turn = Math.sign(area2(b))
  let poly: Point[] = [...a]
  for (let i = 0; i < 3 && poly.length > 0; i++) {
    const p = b[i]
    const q = b[(i + 1) % 3]
    const inside = (r: Point) => turn * ((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)) >= 0
    const next: Point[] = []
    for (let k = 0; k < poly.length; k++) {
      const r = poly[k]
      const s = poly[(k + 1) % poly.length]
      if (inside(r)) next.push(r)
      if (inside(r) !== inside(s)) {
        const dx = s.x - r.x
        const dy = s.y - r.y
        const den = (q.x - p.x) * dy - (q.y - p.y) * dx
        const t = ((q.x - p.x) * (p.y - r.y) - (q.y - p.y) * (p.x - r.x)) / den
        next.push({ x: r.x + dx * t, y: r.y + dy * t })
      }
    }
    poly = next
  }
  return poly.length < 3 ? 0 : Math.abs(area2(poly))
}

/**
 * Faces of one merged mesh that face the same way in the same plane and
 * overlap: the depth test cannot order them, so they flicker.
 */
function sharedPlanes(geometry: THREE.BufferGeometry, epsilon = 1e-3): { at: [number, number, number]; area: number }[] {
  const p = geometry.getAttribute('position')
  const faces = new Map<string, Face[]>()
  for (let t = 0; t < p.count / 3; t++) {
    const v = [0, 1, 2].map((k) => [p.getX(t * 3 + k), p.getY(t * 3 + k), p.getZ(t * 3 + k)])
    const e1 = [v[1][0] - v[0][0], v[1][1] - v[0][1], v[1][2] - v[0][2]]
    const e2 = [v[2][0] - v[0][0], v[2][1] - v[0][1], v[2][2] - v[0][2]]
    const c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const length = Math.hypot(c[0], c[1], c[2])
    if (length < 1e-9) continue
    const n: [number, number, number] = [c[0] / length, c[1] / length, c[2] / length]
    const axis = Math.abs(n[0]) > Math.abs(n[1]) ? (Math.abs(n[0]) > Math.abs(n[2]) ? 0 : 2) : Math.abs(n[1]) > Math.abs(n[2]) ? 1 : 2
    const [i, j] = axis === 0 ? [1, 2] : axis === 1 ? [2, 0] : [0, 1]
    const tri = v.map((w) => ({ x: w[i], y: w[j] })) as [Point, Point, Point]
    const box: [number, number, number, number] = [Math.min(...tri.map((q) => q.x)), Math.max(...tri.map((q) => q.x)), Math.min(...tri.map((q) => q.y)), Math.max(...tri.map((q) => q.y))]
    const at: [number, number, number] = [(v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3, (v[0][2] + v[1][2] + v[2][2]) / 3]
    const key = n.map((x) => Math.round(x * 1000)).join(',')
    const list = faces.get(key) ?? []
    list.push({ n, d: n[0] * v[0][0] + n[1] * v[0][1] + n[2] * v[0][2], axis, tri, box, at })
    faces.set(key, list)
  }
  const found: { at: [number, number, number]; area: number }[] = []
  for (const list of faces.values()) {
    list.sort((a, b) => a.d - b.d || a.box[0] - b.box[0])
    for (let a = 0; a < list.length; a++) {
      const f = list[a]
      for (let b = a + 1; b < list.length && list[b].d - f.d < epsilon; b++) {
        const g = list[b]
        if (g.box[0] >= f.box[1] || g.box[1] <= f.box[0] || g.box[2] >= f.box[3] || g.box[3] <= f.box[2]) continue
        const shared = overlap(f.tri, g.tri)
        if (shared > 1e-4) found.push({ at: f.at, area: shared })
      }
    }
  }
  return found
}

describe('scenery', () => {
  it('cuts every grass tuft as an outline that never crosses itself', () => {
    const tufts = meadowTufts()
    expect(tufts.length).toBeGreaterThan(10)
    for (const { outline, seed, z } of tufts) expect(simple(wobble(outline, CUT_WOBBLE, seed)), `tuft at z ${z.toFixed(1)}`).toBe(true)
  })

  it('has no two faces lying in one plane over each other, so nothing of the theatre flickers', () => {
    const { geometry } = buildScenery()
    const shared = sharedPlanes(geometry)
    expect(shared.map(({ at, area }) => `${area.toFixed(3)} cm² at ${at.map((x) => x.toFixed(1)).join(', ')}`)).toEqual([])
    geometry.dispose()
  })
})
