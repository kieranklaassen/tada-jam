import { describe, expect, it } from 'vitest'
import { DEEPEST, MARK_CELLS, MARK_COLS, RAKED, SHALLOWEST, bite, biteDepth, cellOf, centreOf, furrow, marksFromText, marksToText, rake, rakeIsOut, rakedSand, stamp, swirl, swirlPoint, SWIRL_TURNS } from './marks'
import { TRAY } from './world'

describe('the marks in the sand', () => {
  it('start raked with the rake put away, and a poke leaves a mark where the finger was and brings the rake out', () => {
    const marks = rakedSand()
    expect(rakeIsOut(marks)).toBe(false)
    expect(marks.every((cell) => cell === RAKED)).toBe(true)
    stamp(marks, 2, 1.5, 0.24, 7)
    const { col, row } = cellOf(2, 1.5)
    expect(marks[row * MARK_COLS + col]).toBe(7)
    expect(rakeIsOut(marks)).toBe(true)
  })

  it('a bigger friend set down marks more cells than a poke', () => {
    const small = rakedSand(), big = rakedSand()
    stamp(small, 0, 2, 0.24, 6)
    stamp(big, 0, 2, 0.8, 6)
    const count = (marks: Uint8Array) => marks.reduce((sum, cell) => sum + (cell > RAKED ? 1 : 0), 0)
    expect(count(big)).toBeGreaterThan(count(small) * 3)
  })

  it('a furrow marks every cell on its way, with no gap', () => {
    const marks = rakedSand()
    furrow(marks, -5, 2, 5, 2.6)
    const from = cellOf(-5, 2).col, to = cellOf(5, 2.6).col
    for (let col = from; col <= to; col++) {
      let marked = false
      for (let row = 0; row < 20; row++) if (marks[row * MARK_COLS + col] > RAKED) marked = true
      expect(marked, `column ${col}`).toBe(true)
    }
  })

  it('a mark never gets shallower by being drawn over, and never deeper than the deepest', () => {
    const marks = rakedSand()
    stamp(marks, 1, 1, 0.3, 8)
    stamp(marks, 1, 1, 0.3, 3)
    stamp(marks, 1, 1, 0.3, 40)
    const { col, row } = cellOf(1, 1)
    expect(marks[row * MARK_COLS + col]).toBe(DEEPEST)
  })

  it('marks at and beyond the rim stay inside the grid', () => {
    const marks = rakedSand()
    stamp(marks, 99, 99, 1, 5)
    stamp(marks, -99, -99, 1, 5)
    furrow(marks, -40, 0, 40, 0)
    bite(marks, TRAY.halfWidth)
    expect(marks.length).toBe(MARK_CELLS)
    expect(cellOf(centreOf(31, 19).x, centreOf(31, 19).z)).toEqual({ col: 31, row: 19 })
  })

  it('every kind of mark the sheet names is kept: a dimple, a groove, a bite, a crater, a hollow and Dot’s swirl', () => {
    const kinds: [string, (marks: Uint8Array) => void][] = [
      ['dimple', (m) => stamp(m, 0, 2, 0.24, 6)],
      ['groove', (m) => furrow(m, -2, 2, 2, 2.4)],
      ['bite', (m) => bite(m, 3.5, biteDepth(4))],
      ['crater', (m) => stamp(m, 4, 2, 0.8, 8)],
      ['hollow', (m) => stamp(m, -4, 2, 0.6, 4)],
      ['swirl', (m) => swirl(m, 4.6, -2.5, 0.5)],
    ]
    for (const [name, draw] of kinds) {
      const marks = rakedSand()
      draw(marks)
      expect(rakeIsOut(marks), name).toBe(true)
      expect(Array.from(marksFromText(JSON.parse(JSON.stringify(marksToText(marks))))), name).toEqual(Array.from(marks))
    }
  })

  it('Dot’s mark is a swirl and no ring: an open line wound more than twice round, from near the middle outward', () => {
    expect(SWIRL_TURNS).toBeGreaterThan(2)
    const inner = swirlPoint(0), outer = swirlPoint(1)
    expect(Math.hypot(inner.dx, inner.dz)).toBeLessThan(0.4)
    expect(Math.hypot(outer.dx, outer.dz)).toBeCloseTo(1, 6)
    // It never closes on itself: every point is further out than the one a full turn before it.
    for (let t = 1 / SWIRL_TURNS; t <= 1; t += 0.05) {
      const now = swirlPoint(t), before = swirlPoint(t - 1 / SWIRL_TURNS)
      expect(Math.hypot(now.dx, now.dz)).toBeGreaterThan(Math.hypot(before.dx, before.dz) + 0.2)
    }
    const marks = rakedSand()
    swirl(marks, 0, 2, 0.9)
    expect(marks.reduce((sum, cell) => sum + (cell > RAKED ? 1 : 0), 0)).toBeGreaterThanOrEqual(6)
  })

  it('and as it is saved it is a whole patch, never a loop of cells round an unmarked middle: a load draws no ring', () => {
    // Dot's places at the rim on either side, and a few others.
    for (const [x, z] of [[4.68, -2.55], [-4.68, -2.55], [0, 2], [2.3, 1.1], [-3.1, 0.4]] as const) {
      const marks = rakedSand()
      swirl(marks, x, z, 0.74 * 1.25)
      const marked = (col: number, row: number) => col >= 0 && col < MARK_COLS && row >= 0 && row * MARK_COLS + col < MARK_CELLS && marks[row * MARK_COLS + col] > RAKED
      const middle = cellOf(x, z)
      expect(marked(middle.col, middle.row), `${x}, ${z}`).toBe(true)
      // No unmarked cell has marked cells on all four sides of it.
      for (let i = 0; i < MARK_CELLS; i++) {
        const col = i % MARK_COLS, row = Math.floor(i / MARK_COLS)
        if (marked(col, row)) continue
        const walled = [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dc, dr]) => {
          for (let k = 1; k < MARK_COLS; k++) if (marked(col + dc * k, row + dr * k)) return true
          return false
        })
        expect(walled, `${x}, ${z}: cell ${col}, ${row}`).toBe(false)
      }
    }
  })

  it('an end bites deeper the heavier it is, and no mark is shallower than the shallowest', () => {
    expect(biteDepth(9)).toBeGreaterThan(biteDepth(4))
    expect(biteDepth(4)).toBeGreaterThan(biteDepth(2) - 1)
    expect(biteDepth(12)).toBeLessThanOrEqual(DEEPEST)
    const marks = rakedSand()
    stamp(marks, 0, 2, 0.24, 0)
    const { col, row } = cellOf(0, 2)
    expect(marks[row * MARK_COLS + col]).toBe(SHALLOWEST)
  })

  it('the rake leaves even raked lines, no mark, and is put away again', () => {
    const marks = rakedSand()
    furrow(marks, -3, 2, 3, 2)
    rake(marks)
    expect(marks.every((cell) => cell === RAKED)).toBe(true)
    expect(rakeIsOut(marks)).toBe(false)
  })

  it('goes to text and back unchanged, and anything else reads as the tray as it starts', () => {
    const marks = rakedSand()
    furrow(marks, -3, 2, 3, 2.4, 5)
    stamp(marks, 4, 1.2, 0.8, 9)
    const text = marksToText(marks)
    expect(text.length).toBe(MARK_CELLS)
    expect(Array.from(marksFromText(text))).toEqual(Array.from(marks))
    for (const bad of [null, 7, '', '123', 'x'.repeat(MARK_CELLS), '1'.repeat(MARK_CELLS + 1), { length: MARK_CELLS }]) expect(Array.from(marksFromText(bad))).toEqual(Array.from(rakedSand()))
  })
})
