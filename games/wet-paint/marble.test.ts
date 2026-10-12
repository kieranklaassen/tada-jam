import { describe, expect, it } from 'vitest'
import { bulge, makeFlow, pack, pull, readOff, spreadInto, stillFlow, swell, tally, union, unpack } from './marble'

const W = 60, H = 40

function disc(colour: number, cx: number, cy: number, r: number): Uint8Array {
  const cells = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < r) cells[y * W + x] = colour
  return cells
}

describe('a drop spreading', () => {
  it('takes the area it was given, as a round bloom', () => {
    const out = new Uint8Array(W * H)
    spreadInto(new Uint8Array(W * H), out, W, H, [{ x: 30, y: 20, added: 64, colour: 3 }])
    const area = tally(out, 8)[3]
    expect(area).toBeGreaterThan(Math.PI * 64 * 0.9)
    expect(area).toBeLessThan(Math.PI * 64 * 1.1)
    expect(out[20 * W + 30]).toBe(3)
    expect(out[20 * W + 45]).toBe(0)
  })

  it('pushes the colour that was there outward into a ring, and loses none of it', () => {
    const base = disc(1, 30, 20, 6), out = new Uint8Array(W * H)
    const before = tally(base, 8)[1]
    spreadInto(base, out, W, H, [{ x: 30, y: 20, added: 36, colour: 2 }])
    expect(out[20 * W + 30]).toBe(2)
    // What was the middle of the old colour is now beyond the new one's rim.
    expect(out[20 * W + 37]).toBe(1)
    expect(out[20 * W + 40]).toBe(0)
    const after = tally(out, 8)[1]
    expect(Math.abs(after - before)).toBeLessThan(before * 0.12)
  })

  it('undoes the newest drop first, so a later drop pushes an earlier one', () => {
    const out = new Uint8Array(W * H)
    spreadInto(new Uint8Array(W * H), out, W, H, [{ x: 30, y: 20, added: 25, colour: 1 }, { x: 30, y: 20, added: 25, colour: 2 }])
    expect(out[20 * W + 30]).toBe(2)
    expect(out[20 * W + 36]).toBe(1)
    expect(tally(out, 8)[1]).toBeGreaterThan(Math.PI * 25 * 0.8)
  })

  it('leaves every cell one of the values it was given: nothing is blended', () => {
    const base = disc(5, 20, 20, 9), out = new Uint8Array(W * H)
    spreadInto(base, out, W, H, [{ x: 28, y: 18, added: 30, colour: 6 }])
    for (const value of out) expect([0, 5, 6]).toContain(value)
  })
})

/** A pull of many short pieces along a row, on a flow, read off once at the end. */
function drawn(cells: Uint8Array, fromX: number, toX: number, y: number, reach: number, core: number): Uint8Array {
  const flow = makeFlow(W * H), out = new Uint8Array(W * H)
  stillFlow(flow, W, H)
  for (let x = fromX; x < toX; x += 1) pull(flow, W, H, x, y, x + 1, y, reach, core)
  readOff(flow, cells, out, W, H, null)
  return out
}

describe('a pull', () => {
  it('carries what is under the finger to where the finger goes, and changes nothing beyond its reach', () => {
    const cells = disc(4, 20, 20, 3), flow = makeFlow(W * H), out = new Uint8Array(W * H)
    stillFlow(flow, W, H)
    const box = pull(flow, W, H, 20, 20, 23, 20, 8, 1.3)!
    readOff(flow, cells, out, W, H, null)
    expect(out[20 * W + 23]).toBe(4)
    expect(box.x0).toBeGreaterThanOrEqual(23 - 9)
    expect(box.x1).toBeLessThanOrEqual(23 + 10)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot(x + 0.5 - 23, y + 0.5 - 20) >= 8) expect(out[y * W + x]).toBe(cells[y * W + x])
  })

  it('brings clear water in from beyond the edge, and is nothing when the finger has not moved', () => {
    const cells = new Uint8Array(W * H).fill(2), flow = makeFlow(W * H), out = new Uint8Array(W * H)
    stillFlow(flow, W, H)
    pull(flow, W, H, 0.5, 20, 3.5, 20, 6, 1)
    readOff(flow, cells, out, W, H, null)
    expect(out[20 * W + 2]).toBe(0)
    expect(pull(flow, W, H, 10, 10, 10, 10, 6, 1)).toBeNull()
  })

  it('draws a line of what it started in the whole way, however many pieces it is made of', () => {
    const out = drawn(disc(4, 12, 20, 5), 12, 50, 20, 9, 1.3)
    for (let x = 12; x < 50; x++) expect(out[20 * W + x]).toBe(4)
    // Beyond the line's end the water is as it was.
    expect(out[20 * W + 58]).toBe(0)
  })

  it('leaves a feather and not a ragged line: the line narrows toward its tip and its edge never jumps', () => {
    const out = drawn(disc(4, 12, 20, 5), 12, 50, 20, 9, 1.3)
    const width = (x: number): number => {
      let cellsOf = 0
      for (let y = 0; y < H; y++) if (out[y * W + x] === 4) cellsOf += 1
      return cellsOf
    }
    for (let x = 14; x < 49; x++) {
      // From one column to the next the line is never wider, and loses at most a cell from each side.
      expect(width(x + 1)).toBeLessThanOrEqual(width(x))
      expect(width(x) - width(x + 1)).toBeLessThanOrEqual(2)
    }
    expect(width(16)).toBeGreaterThan(width(44))
    // And every column of it is one run of cells: nothing is torn off.
    for (let x = 12; x < 50; x++) {
      let runs = 0
      for (let y = 0; y < H; y++) if (out[y * W + x] === 4 && (y === 0 || out[(y - 1) * W + x] !== 4)) runs += 1
      expect(runs).toBe(1)
    }
  })

  it('is the same made of pieces half as long: fractions are kept, not rounded at every piece', () => {
    const cells = disc(4, 12, 20, 5), whole = drawn(cells, 12, 44, 20, 9, 1.3)
    const flow = makeFlow(W * H), halves = new Uint8Array(W * H)
    stillFlow(flow, W, H)
    for (let x = 12; x < 44; x += 0.5) pull(flow, W, H, x, 20, x + 0.5, 20, 9, 1.3)
    readOff(flow, cells, halves, W, H, null)
    let differ = 0
    for (let i = 0; i < whole.length; i++) if (whole[i] !== halves[i]) differ += 1
    expect(differ).toBeLessThan(40)
  })
})

describe('a breath and a drop that grows', () => {
  it('swells what lies under a breath outward, adds nothing and moves nothing beyond its reach', () => {
    const cells = disc(3, 30, 20, 4), flow = makeFlow(W * H), out = new Uint8Array(W * H)
    stillFlow(flow, W, H)
    for (let i = 0; i < 30; i++) bulge(flow, W, H, 30, 20, 12, 0.02, 7, 1)
    readOff(flow, cells, out, W, H, null)
    expect(tally(out, 8)[3]).toBeGreaterThan(tally(cells, 8)[3] * 1.3)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot(x + 0.5 - 30, y + 0.5 - 20) >= 12) expect(out[y * W + x]).toBe(cells[y * W + x])
    expect(tally(out, 8)[0] + tally(out, 8)[3]).toBe(W * H)
  })

  it('pushes the water outward by what a drop already on it takes more, in the colour of its middle', () => {
    const cells = disc(2, 30, 20, 4), flow = makeFlow(W * H), out = new Uint8Array(W * H)
    stillFlow(flow, W, H)
    swell(flow, W, H, 30, 20, 20)
    readOff(flow, cells, out, W, H, null)
    const area = tally(out, 8)[2]
    expect(area).toBeGreaterThan(Math.PI * 36 * 0.9)
    expect(area).toBeLessThan(Math.PI * 36 * 1.1)
    expect(out[20 * W + 30]).toBe(2)
  })
})

describe('boxes', () => {
  it('joins two boxes into the smallest that holds both', () => {
    expect(union(null, null)).toBeNull()
    expect(union({ x0: 1, y0: 2, x1: 3, y1: 4 }, null)).toEqual({ x0: 1, y0: 2, x1: 3, y1: 4 })
    expect(union({ x0: 1, y0: 2, x1: 3, y1: 4 }, { x0: 0, y0: 3, x1: 9, y1: 5 })).toEqual({ x0: 0, y0: 2, x1: 9, y1: 5 })
  })
})

describe('a grid as text', () => {
  it('comes back as it went in, for every value', () => {
    const cells = new Uint8Array(W * H)
    for (let i = 0; i < cells.length; i++) cells[i] = (i * 7 + (i >> 3)) % 8
    const text = pack(cells)
    expect(text).toHaveLength((W * H) / 2)
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(unpack(text, W * H)).toEqual(cells)
  })

  it('is refused when it is not a grid of that size', () => {
    const text = pack(new Uint8Array(W * H))
    for (const bad of [undefined, null, 7, [], text.slice(1), `${text}A`, `${text.slice(1)}*`]) expect(unpack(bad, W * H)).toBeNull()
  })
})
