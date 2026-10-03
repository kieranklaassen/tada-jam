import { describe, expect, it } from 'vitest'
import { KINDS, LOOKS, pieceRing } from './kinds'
import { INK } from './marker'
import { Recording } from './recording'
import { TOASTED, paintPiece } from './scenery'
import { makeRng, seedFrom } from './rng'
import { bounds, ellipse, inside, roundRect, smooth, streaks, wobble } from './shapes'

describe('shapes', () => {
  it('cuts a marker fill where it crosses the outline, give or take the hand', () => {
    const ring = ellipse(100, 80, 60, 40)
    const lines = streaks(ring, -0.5, 10, 6, makeRng(1))
    expect(lines.length).toBeGreaterThan(6)
    for (const l of lines) {
      // The middle of every stroke is inside the shape; only its ends miss the edge.
      expect(inside(ring, (l.x0 + l.x1) / 2, (l.y0 + l.y1) / 2)).toBe(true)
      for (const [x, y] of [[l.x0, l.y0], [l.x1, l.y1]]) expect(Math.hypot((x - 100) / 60, (y - 80) / 40)).toBeLessThan(1.3)
    }
  })

  it('fills both lobes of a shape that a stroke crosses twice', () => {
    // A wide U: a stroke along x crosses the two arms.
    const u = [0, 0, 20, 0, 20, 60, 80, 60, 80, 0, 100, 0, 100, 80, 0, 80]
    const lines = streaks(u, 0, 10, 0, makeRng(2))
    const high = lines.filter((l) => l.y0 < 55)
    expect(high.some((l) => l.x1 <= 21)).toBe(true)
    expect(high.some((l) => l.x0 >= 79)).toBe(true)
  })

  it('draws the same wobble from the same seed', () => {
    const ring = roundRect(0, 0, 100, 50, 10)
    expect(wobble(ring, 2, makeRng(seedFrom('a')))).toEqual(wobble(ring, 2, makeRng(seedFrom('a'))))
    expect(wobble(ring, 2, makeRng(seedFrom('a')))).not.toEqual(wobble(ring, 2, makeRng(seedFrom('b'))))
  })

  it('runs a smooth curve through its control points', () => {
    const control = [0, 0, 10, 0, 10, 10, 0, 10]
    const ring = smooth(control, 4)
    for (let i = 0; i < 4; i++) {
      expect(ring[i * 8]).toBeCloseTo(control[i * 2])
      expect(ring[i * 8 + 1]).toBeCloseTo(control[i * 2 + 1])
    }
  })
})

describe('the six kinds', () => {
  it('are all of one size, inside the same circle', () => {
    for (const kind of KINDS) {
      const ring = LOOKS[kind].ring
      let far = 0
      for (let i = 0; i < ring.length; i += 2) far = Math.max(far, Math.hypot(ring[i], ring[i + 1]))
      expect(far, kind).toBeLessThanOrEqual(1.08)
      expect(far, kind).toBeGreaterThanOrEqual(0.78)
      const box = bounds(ring)
      expect(Math.max(box.w, box.h), kind).toBeGreaterThan(1.5)
    }
  })

  it('keep their size, outline and colour when baked: only the outline is toasted dark', () => {
    for (const kind of KINDS) {
      const raw = new Recording(), baked = new Recording()
      paintPiece(raw as unknown as CanvasRenderingContext2D, kind, 20)
      paintPiece(baked as unknown as CanvasRenderingContext2D, kind, 20, true)
      expect(baked.fillStyle, kind).toBe(LOOKS[kind].fill)
      expect(raw.fillStyle, kind).toBe(LOOKS[kind].fill)
      expect([raw.strokeStyle, baked.strokeStyle]).toEqual([INK, TOASTED])
      // Nothing was scaled or turned: a point lands where it would for the raw piece.
      expect(baked.at(7, 3)).toEqual(raw.at(7, 3))
      expect([baked.fills, baked.strokes]).toEqual([raw.fills, raw.strokes])
    }
  })

  it('differ in colour and in shape, so a kind is never told by colour alone', () => {
    expect(new Set(KINDS.map((k) => LOOKS[k].fill)).size).toBe(KINDS.length)
    // Shape: how much of the circle each outline covers, sampled on a grid, differs between every two kinds.
    const cover = KINDS.map((kind) => {
      const ring = pieceRing(kind, 0, 0, 1)
      const cells: boolean[] = []
      for (let y = -1; y <= 1; y += 0.125) for (let x = -1; x <= 1; x += 0.125) cells.push(inside(ring, x, y))
      return cells
    })
    for (let a = 0; a < cover.length; a++) {
      for (let b = a + 1; b < cover.length; b++) {
        const differing = cover[a].reduce((n, cell, i) => n + (cell !== cover[b][i] ? 1 : 0), 0)
        expect(differing / cover[a].length, `${KINDS[a]} and ${KINDS[b]}`).toBeGreaterThan(0.1)
      }
    }
  })
})
