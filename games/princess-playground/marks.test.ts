import { describe, expect, it } from 'vitest'
import { DEEPEST, MARK_CELLS, MARK_COLS, bite, cellOf, centreOf, furrow, isSmooth, marksFromText, marksToText, rake, smoothSand, stamp } from './marks'
import { TRAY } from './world'

describe('the marks in the sand', () => {
  it('start smooth, and a poke leaves a mark where the finger was', () => {
    const marks = smoothSand()
    expect(isSmooth(marks)).toBe(true)
    stamp(marks, 2, 1.5, 0.24, 7)
    const { col, row } = cellOf(2, 1.5)
    expect(marks[row * MARK_COLS + col]).toBe(7)
    expect(isSmooth(marks)).toBe(false)
  })

  it('a bigger friend set down marks more cells than a poke', () => {
    const small = smoothSand(), big = smoothSand()
    stamp(small, 0, 2, 0.24, 6)
    stamp(big, 0, 2, 0.8, 6)
    const count = (marks: Uint8Array) => marks.reduce((sum, cell) => sum + (cell > 0 ? 1 : 0), 0)
    expect(count(big)).toBeGreaterThan(count(small) * 3)
  })

  it('a furrow marks every cell on its way, with no gap', () => {
    const marks = smoothSand()
    furrow(marks, -5, 2, 5, 2.6)
    const from = cellOf(-5, 2).col, to = cellOf(5, 2.6).col
    for (let col = from; col <= to; col++) {
      let marked = false
      for (let row = 0; row < 20; row++) if (marks[row * MARK_COLS + col] > 0) marked = true
      expect(marked, `column ${col}`).toBe(true)
    }
  })

  it('a mark never gets shallower by being drawn over, and never deeper than the deepest', () => {
    const marks = smoothSand()
    stamp(marks, 1, 1, 0.3, 8)
    stamp(marks, 1, 1, 0.3, 3)
    stamp(marks, 1, 1, 0.3, 40)
    const { col, row } = cellOf(1, 1)
    expect(marks[row * MARK_COLS + col]).toBe(DEEPEST)
  })

  it('marks at and beyond the rim stay inside the grid', () => {
    const marks = smoothSand()
    stamp(marks, 99, 99, 1, 5)
    stamp(marks, -99, -99, 1, 5)
    furrow(marks, -40, 0, 40, 0)
    bite(marks, TRAY.halfWidth)
    expect(marks.length).toBe(MARK_CELLS)
    expect(cellOf(centreOf(31, 19).x, centreOf(31, 19).z)).toEqual({ col: 31, row: 19 })
  })

  it('the rake leaves it smooth', () => {
    const marks = smoothSand()
    furrow(marks, -3, 2, 3, 2)
    rake(marks)
    expect(isSmooth(marks)).toBe(true)
  })

  it('goes to text and back unchanged, and anything else reads as smooth sand', () => {
    const marks = smoothSand()
    furrow(marks, -3, 2, 3, 2.4, 5)
    stamp(marks, 4, 1.2, 0.8, 9)
    const text = marksToText(marks)
    expect(text.length).toBe(MARK_CELLS)
    expect(Array.from(marksFromText(text))).toEqual(Array.from(marks))
    for (const bad of [null, 7, '', '123', 'x'.repeat(MARK_CELLS), '1'.repeat(MARK_CELLS + 1), { length: MARK_CELLS }]) expect(isSmooth(marksFromText(bad))).toBe(true)
  })
})
