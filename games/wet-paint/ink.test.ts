import { describe, expect, it } from 'vitest'
import { INKS } from './colours'
import { Raster, changedBox } from './ink'

const W = 24, H = 16, FINE = 4

function scene(): Uint8Array {
  const cells = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (Math.hypot(x - 8, y - 8) < 5) cells[y * W + x] = 1
    if (Math.hypot(x - 15, y - 7) < 4) cells[y * W + x] = 3
  }
  return cells
}

const pixel = (raster: Raster, x: number, y: number): number[] => Array.from(raster.rgba.slice((y * raster.width + x) * 4, (y * raster.width + x) * 4 + 4))
const inked = (raster: Raster, x: number, y: number): boolean => raster.rgba[(y * raster.width + x) * 4 + 3] !== 0

describe('the colour on the water as a picture', () => {
  it('is flat colour inside an ink, clear over plain water, and a darker line at an edge', () => {
    const raster = new Raster(W, H, FINE)
    raster.paint(scene(), INKS, null, true)
    expect(raster.width).toBe(W * FINE)
    expect(pixel(raster, 6 * FINE, 8 * FINE)).toEqual([...INKS[1].face, 255])
    expect(pixel(raster, 1, 1)[3]).toBe(0)
    let edges = 0
    for (let i = 0; i < raster.rgba.length; i += 4) if (raster.rgba[i + 3] === 255 && raster.rgba[i] === INKS[1].edge[0] && raster.rgba[i + 1] === INKS[1].edge[1]) edges += 1
    expect(edges).toBeGreaterThan(20)
  })

  it('never blends two colours: every pixel is clear, a face or an edge', () => {
    const raster = new Raster(W, H, FINE)
    raster.paint(scene(), INKS, null, true)
    const allowed = new Set<string>()
    for (const ink of INKS) {
      allowed.add(ink.face.join())
      allowed.add(ink.edge.join())
    }
    for (let i = 0; i < raster.rgba.length; i += 4) {
      if (raster.rgba[i + 3] === 0) continue
      expect(raster.rgba[i + 3]).toBe(255)
      expect(allowed.has(`${raster.rgba[i]},${raster.rgba[i + 1]},${raster.rgba[i + 2]}`)).toBe(true)
    }
  })

  // The look's claim. An edge of the grid is a staircase; the picture's outline must not be one, at any angle.
  // Down each column of pixels the outline is found, and from one column to the next it may move by a pixel or
  // two and never by a whole cell.
  for (const [name, run] of [['steep', 1], ['at one in two', 2], ['at one in three', 3], ['shallow', 5], ['nearly level', 9]] as const) {
    it(`has no stepped edge on a slant that is ${name}, at every fineness a tier has`, () => {
      const w = 60, h = 40
      const cells = new Uint8Array(w * h)
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (y > 12 + Math.floor(x / run)) cells[y * w + x] = 2
      for (const fine of [3, 4]) {
        const raster = new Raster(w, h, fine)
        raster.paint(cells, INKS, null, true)
        const top = (px: number): number => {
          for (let py = 0; py < raster.height; py++) if (inked(raster, px, py)) return py
          return raster.height
        }
        let worst = 0
        for (let px = 6 * fine; px < (w - 6) * fine - 1; px++) worst = Math.max(worst, Math.abs(top(px + 1) - top(px)))
        // A staircase would jump by a whole cell (`fine` pixels) wherever the grid steps. A steep slant moves a
        // pixel across for a pixel down; no slant jumps further than that and one pixel more.
        expect(worst).toBeLessThanOrEqual(run === 1 ? 2 : 1)
        expect(worst).toBeLessThan(fine)
      }
    })
  }

  it('draws a vein along every edge between two colours, on both sides of it, and none inside a colour', () => {
    const w = 30, h = 20, cells = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells[y * w + x] = x < 15 ? 1 : 3
    const raster = new Raster(w, h, FINE)
    raster.paint(cells, INKS, null, true)
    for (let py = 4 * FINE; py < 16 * FINE; py++) {
      expect(pixel(raster, 15 * FINE - 1, py)).toEqual([...INKS[1].edge, 255])
      expect(pixel(raster, 15 * FINE, py)).toEqual([...INKS[3].edge, 255])
      expect(pixel(raster, 15 * FINE - 2, py)).toEqual([...INKS[1].face, 255])
      expect(pixel(raster, 15 * FINE + 1, py)).toEqual([...INKS[3].face, 255])
      expect(pixel(raster, 6 * FINE, py)).toEqual([...INKS[1].face, 255])
    }
  })

  it('keeps a line of colour one cell wide on the water, and loses no colour that is two cells wide inside another', () => {
    const w = 30, h = 20, cells = new Uint8Array(w * h)
    for (let x = 0; x < w; x++) cells[6 * w + x] = 1
    for (let y = 12; y < 20; y++) for (let x = 0; x < w; x++) cells[y * w + x] = y === 15 || y === 16 ? 2 : 3
    const raster = new Raster(w, h, FINE)
    raster.paint(cells, INKS, null, true)
    const column = 15 * FINE
    let red = 0, yellow = 0
    for (let py = 0; py < raster.height; py++) {
      const [r, g, b, a] = pixel(raster, column, py)
      if (a === 0) continue
      if (`${r},${g},${b}` === INKS[1].face.join() || `${r},${g},${b}` === INKS[1].edge.join()) red += 1
      if (`${r},${g},${b}` === INKS[2].face.join() || `${r},${g},${b}` === INKS[2].edge.join()) yellow += 1
    }
    expect(red).toBeGreaterThanOrEqual(2)
    expect(yellow).toBeGreaterThanOrEqual(FINE)
  })

  it('painted again only where the water changed, comes out as if painted whole', () => {
    const cells = scene(), part = new Raster(W, H, FINE), whole = new Raster(W, H, FINE), before = cells.slice()
    part.paint(cells, INKS, null, true)
    for (let y = 5; y < 9; y++) for (let x = 10; x < 14; x++) cells[y * W + x] = 2
    const box = changedBox(before, cells, W, H)
    expect(box).toEqual({ x0: 10, y0: 5, x1: 14, y1: 9 })
    const wrote = part.paint(cells, INKS, box, true)
    whole.paint(cells, INKS, null, true)
    expect(Array.from(part.rgba)).toEqual(Array.from(whole.rgba))
    expect(wrote).toEqual({ x0: 8 * FINE, y0: 3 * FINE, x1: 16 * FINE, y1: 11 * FINE })
    expect(changedBox(cells, cells, W, H)).toBeNull()
  })

  it('paints value 0 too where the sheet is a paper and not water', () => {
    const raster = new Raster(W, H, 2)
    raster.paint(new Uint8Array(W * H), [{ face: [1, 2, 3], edge: [0, 0, 0] }], null, false)
    expect(pixel(raster, 5, 5)).toEqual([1, 2, 3, 255])
  })
})
