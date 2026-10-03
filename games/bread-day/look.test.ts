import { describe, expect, it } from 'vitest'
import { curve, gouge, mulberry32, offset, ribbon, slab, type Pt } from './lookCut'
import { MARGIN, REF_H, REF_W, SPOTS, layout, type Box } from './lookLayout'

// The pure parts of the look: the seeded stream, the layout and the cutting
// geometry. Nothing here makes a canvas; the picture itself is judged from stills.

const SURFACES: readonly (readonly [number, number])[] = [[1180, 820], [1024, 768], [820, 1180]]

describe('the seeded generator', () => {
  it('gives the same stream for the same seed, so the print is the same on every load', () => {
    const a = mulberry32(7), b = mulberry32(7)
    for (let i = 0; i < 200; i++) expect(a()).toBe(b())
  })

  it('gives another stream for another seed, and stays in [0, 1)', () => {
    const a = mulberry32(7), b = mulberry32(8)
    let same = 0
    for (let i = 0; i < 200; i++) {
      const x = a(), y = b()
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
      if (x === y) same++
    }
    expect(same).toBe(0)
  })
})

describe('the layout', () => {
  it.each(SURFACES)('keeps every box on a %i by %i surface', (width, height) => {
    const plan = layout(width, height)
    const boxes: Box[] = [...Object.values(plan.boxes), ...plan.rack, ...plan.sparrows]
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.w).toBeLessThanOrEqual(width)
      expect(box.y + box.h).toBeLessThanOrEqual(height)
    }
  })

  it('makes what a child touches at least 96 pixels across on the reference surface', () => {
    const plan = layout(REF_W, REF_H)
    expect(plan.scale).toBe(1)
    for (const name of ['dough', 'peel', 'sack', 'jug', 'goat', 'badger', 'nook', 'mouth'] as const) {
      expect(Math.min(plan.boxes[name].w, plan.boxes[name].h), name).toBeGreaterThanOrEqual(96)
    }
    // The dough is the working object: about 200 across.
    expect(plan.boxes.dough.w).toBeGreaterThanOrEqual(200)
  })

  it('fits and centres the designed sheet, and lets the printed block run on to fill the surface', () => {
    const wide = layout(REF_W, REF_H), tall = layout(820, 1180)
    expect(wide.view).toEqual({ x0: MARGIN, y0: MARGIN, x1: REF_W - MARGIN, y1: REF_H - MARGIN })
    expect(tall.scale).toBeCloseTo(820 / REF_W)
    expect(tall.ox).toBeCloseTo(0)
    expect(tall.oy).toBeCloseTo((1180 - REF_H * tall.scale) / 2)
    expect(tall.view.y0).toBeLessThan(0)
    expect(tall.view.y1).toBeGreaterThan(REF_H)
    // The margin is the same share of the sheet on every side.
    expect((tall.view.y0 * tall.scale + tall.oy)).toBeCloseTo(MARGIN * tall.scale)
  })

  it('puts four places on the rack and three sparrows on the fence, left to right', () => {
    const plan = layout(REF_W, REF_H)
    expect(plan.rack).toHaveLength(4)
    expect(plan.sparrows).toHaveLength(3)
    for (let i = 1; i < 4; i++) expect(plan.rack[i].x).toBeGreaterThan(plan.rack[i - 1].x)
    expect(plan.rack[0]).toEqual({ x: SPOTS.loaf[0], y: SPOTS.loaf[1], w: SPOTS.loaf[2], h: SPOTS.loaf[3] })
  })
})

describe('the cutting geometry', () => {
  const area = (pts: readonly Pt[]) => Math.abs(pts.reduce((sum, a, i) => { const b = pts[(i + 1) % pts.length]; return sum + a[0] * b[1] - b[0] * a[1] }, 0)) / 2

  it('draws a curve through its control points', () => {
    const ctrl: Pt[] = [[0, 0], [40, 10], [60, 50], [10, 70]], pts = curve(ctrl)
    for (const [cx, cy] of ctrl) expect(pts.some(([x, y]) => Math.hypot(x - cx, y - cy) < 1e-9)).toBe(true)
  })

  it('makes a gouge mark that is as long as asked, no wider than asked, and pointed at its far end', () => {
    const mark = gouge(10, 20, 0, 60, 8)
    const xs = mark.map((p) => p[0]), ys = mark.map((p) => p[1])
    expect(Math.min(...xs)).toBeCloseTo(10)
    expect(Math.max(...xs)).toBeCloseTo(70)
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(8 + 1e-9)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(6)
    const far = mark.filter((p) => p[0] > 69.9)
    expect(Math.max(...far.map((p) => p[1])) - Math.min(...far.map((p) => p[1]))).toBeCloseTo(0)
  })

  it('gives a line a width that changes along it', () => {
    const line: Pt[] = [[0, 0], [10, 0], [20, 0]], pts = ribbon(line, (t) => 2 + 4 * t)
    expect(pts).toHaveLength(6)
    expect(pts[0][1] - pts[5][1]).toBeCloseTo(-2)
    expect(pts[2][1] - pts[3][1]).toBeCloseTo(-6)
  })

  it('moves an outline outward or inward whichever way it was drawn', () => {
    const box = slab(0, 0, 100, 60, 10), turned = [...box].reverse()
    for (const pts of [box, turned]) {
      expect(area(offset(pts, () => 5))).toBeGreaterThan(area(pts))
      expect(area(offset(pts, () => -5))).toBeLessThan(area(pts))
    }
  })
})
