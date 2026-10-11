import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CELLS, COLS, KINDS, ROWS, onCloth } from './cloth'
import { LEANS, hideStitchesOf, mudStitchesOf, slant, type MudStitch } from './figures'
import { CLOTH, FRIEND_KINDS } from './layout'
import { HIDE_COLS } from './taste'
import { beginSeeds, crosses, seeds, type Ctx } from './stitch'

// The embroidery has no cross-stitch: two crossed stitches read as a sign, and
// the kid side of this game shows none. Mud is laid as short stitches, and so
// are the flecks in the grass, the hedge and the trees. These tests hold that
// no two of them cross, whatever mud lies where.

const pairs = (stitches: readonly MudStitch[]): number => {
  let crossed = 0
  for (let a = 0; a < stitches.length; a++) for (let b = a + 1; b < stitches.length; b++) if (crosses(stitches[a], stitches[b])) crossed += 1
  return crossed
}

describe('no two stitches cross', () => {
  it('knows a crossing: through each other or end on, and not side by side or along one line', () => {
    expect(crosses({ x0: 0, y0: 0, x1: 10, y1: 10 }, { x0: 0, y0: 10, x1: 10, y1: 0 })).toBe(true)
    expect(crosses({ x0: 0, y0: 0, x1: 10, y1: 0 }, { x0: 5, y0: 0, x1: 5, y1: 8 })).toBe(true)
    expect(crosses({ x0: 0, y0: 0, x1: 10, y1: 0 }, { x0: 0, y0: 3, x1: 10, y1: 3 })).toBe(false)
    expect(crosses({ x0: 0, y0: 0, x1: 10, y1: 0 }, { x0: 4, y0: 0, x1: 14, y1: 0 })).toBe(false)
    expect(crosses({ x0: 0, y0: 0, x1: 4, y1: 4 }, { x0: 6, y0: 4, x1: 10, y1: 0 })).toBe(false)
  })

  it('on a garment: with every cell at every step of mud, no stitch crosses another, in its own cell or in any other', () => {
    for (const kind of KINDS) {
      const lies = mudStitchesOf(kind)
      expect(lies).toHaveLength(CELLS)
      // Every stitch of every cell at once is the deepest mud everywhere, and holds every shallower patch within it.
      expect(pairs(lies.flat()), kind).toBe(0)
      const cell = CLOTH.w / COLS
      lies.forEach((stitches, i) => {
        expect(stitches).toHaveLength(6)
        const left = (i % COLS) * cell, top = Math.floor(i / COLS) * (CLOTH.w / ROWS)
        for (const lie of stitches) {
          // Each keeps to its own cell, which is why it cannot reach a neighbour's.
          for (const [x, y] of [[lie.x0, lie.y0], [lie.x1, lie.y1]]) {
            expect(x).toBeGreaterThanOrEqual(left); expect(x).toBeLessThanOrEqual(left + cell)
            expect(y).toBeGreaterThanOrEqual(top); expect(y).toBeLessThanOrEqual(top + cell)
          }
          // On the cloth the middle of a stitch is on it and so are both ends, wherever the cell's own middle is.
          const mx = (lie.x0 + lie.x1) / 2 / CLOTH.w, my = (lie.y0 + lie.y1) / 2 / CLOTH.w
          if (onCloth(kind, mx, my)) expect(onCloth(kind, lie.x0 / CLOTH.w, lie.y0 / CLOTH.w) && onCloth(kind, lie.x1 / CLOTH.w, lie.y1 / CLOTH.w)).toBe(true)
        }
      })
    }
  })

  it('on a hide: with every cell at every step of mud, no stitch crosses another', () => {
    for (const kind of FRIEND_KINDS) {
      const lies = hideStitchesOf(kind)
      expect(pairs(lies.flat()), kind).toBe(0)
      for (const stitches of lies) {
        expect(stitches).toHaveLength(3)
        // Each is a thread long enough to be seen.
        for (const lie of stitches) expect(Math.hypot(lie.x1 - lie.x0, lie.y1 - lie.y0)).toBeGreaterThan(5)
      }
    }
  })

  it('mud is scruffy without a crossing: a cell lies at another angle than the cells beside and above it, and its stitches differ in length and in how far apart they lie', () => {
    // Two angles as threads lie: a thread turned half round is the same thread.
    const between = (a: number, b: number) => { const d = Math.abs(a - b) % Math.PI; return Math.min(d, Math.PI - d) }
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) for (const r of [0, 0.5, 1]) for (const q of [0, 0.5, 1]) {
      const here = slant(col, row, r)
      // Never near the level.
      expect(Math.abs(Math.sin(here))).toBeGreaterThan(0.55)
      for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) expect(between(here, slant(col + dc, row + dr, q))).toBeGreaterThan(0.12)
    }
    expect(LEANS).toBe(5)
    const lean = (lie: MudStitch) => Math.atan2(lie.y1 - lie.y0, lie.x1 - lie.x0)
    const long = (lie: MudStitch) => Math.hypot(lie.x1 - lie.x0, lie.y1 - lie.y0)
    // As laid on a hide, where nothing is shortened: each cell against the one beside it and the one below it.
    for (const kind of FRIEND_KINDS) {
      const lies = hideStitchesOf(kind)
      lies.forEach((stitches, i) => {
        const col = i % HIDE_COLS
        if (col + 1 < HIDE_COLS) expect(between(lean(stitches[0]), lean(lies[i + 1][0]))).toBeGreaterThan(0.12)
        if (i + HIDE_COLS < lies.length) expect(between(lean(stitches[0]), lean(lies[i + HIDE_COLS][0]))).toBeGreaterThan(0.12)
        // The three are of three lengths.
        const lengths = stitches.map(long)
        expect(Math.max(...lengths) - Math.min(...lengths)).toBeGreaterThan(0.5)
      })
    }
    // As laid on a garment: in most cells the longest stitch is well longer than the shortest, and the gaps between neighbours differ.
    for (const kind of KINDS) {
      const lies = mudStitchesOf(kind).filter((stitches) => stitches.every((lie) => long(lie) > 2))
      expect(lies.length).toBeGreaterThan(20)
      let ragged = 0, uneven = 0
      for (const stitches of lies) {
        const lengths = stitches.map(long)
        if (Math.max(...lengths) > Math.min(...lengths) * 1.3) ragged += 1
        // How far each lies to the side of the first, across the cell's lean.
        const a = lean(stitches[0]), mid = (lie: MudStitch) => -((lie.x0 + lie.x1) / 2) * Math.sin(a) + ((lie.y0 + lie.y1) / 2) * Math.cos(a)
        const sides = stitches.map(mid).sort((x, y) => x - y)
        const gaps = sides.slice(1).map((side, n) => side - sides[n])
        expect(Math.min(...gaps)).toBeGreaterThan(1)
        if (Math.max(...gaps) > Math.min(...gaps) * 1.25) uneven += 1
      }
      expect(ragged, kind).toBeGreaterThan(lies.length * 0.8)
      expect(uneven, kind).toBeGreaterThan(lies.length * 0.8)
    }
  })

  describe('the scattered seeds', () => {
    const threads: MudStitch[] = []
    let had: unknown
    class Recorder {
      private x = 0
      private y = 0
      moveTo(x: number, y: number) { this.x = x; this.y = y }
      lineTo(x: number, y: number) { threads.push({ x0: this.x, y0: this.y, x1: x, y1: y }) }
    }
    const canvas = { stroke: () => {}, lineWidth: 0, strokeStyle: '' } as unknown as Ctx
    beforeAll(() => { had = (globalThis as Record<string, unknown>).Path2D; (globalThis as Record<string, unknown>).Path2D = Recorder })
    afterAll(() => { (globalThis as Record<string, unknown>).Path2D = had })

    it('no seed stitch crosses another, in one scatter or between scatters laid on the same picture', () => {
      threads.length = 0
      beginSeeds()
      seeds(canvas, { x: 0, y: 0, w: 300, h: 120 }, 400, '#336633', 52, 12, 2.6)
      seeds(canvas, { x: 0, y: 0, w: 300, h: 120 }, 160, '#88aa66', 53, 10, 2.4)
      seeds(canvas, { x: 100, y: 60, w: 300, h: 120 }, 200, '#557755', 33, 10, 3)
      expect(threads.length).toBeGreaterThan(500)
      expect(pairs(threads)).toBe(0)
    })

    it('a new picture begins with nothing laid, and is stitched the same every time', () => {
      threads.length = 0
      beginSeeds()
      seeds(canvas, { x: 0, y: 0, w: 200, h: 80 }, 150, '#336633', 7)
      const first = threads.map((thread) => ({ ...thread }))
      threads.length = 0
      beginSeeds()
      seeds(canvas, { x: 0, y: 0, w: 200, h: 80 }, 150, '#336633', 7)
      expect(threads).toEqual(first)
    })
  })
})
