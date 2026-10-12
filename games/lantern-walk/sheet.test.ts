import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { MARGIN, MOST_POINTS, MOST_WINDOWS, PAPERS, copySheet, middleOf, outlineOf, readSheet, sheetOf, windowAt, within } from './sheet'

describe('the sheets the positions lay ready', () => {
  it('three windows backed in three colours, one yellow window, and a blank sheet', () => {
    expect(sheetOf('three-windows').map((window) => window.paper).sort()).toEqual([...PAPERS].sort())
    expect(sheetOf('one-window').map((window) => window.paper)).toEqual(['yellow'])
    expect(sheetOf('blank-sheet')).toEqual([])
    expect(sheetOf('no such position')).toEqual([])
    for (const position of LADDER) for (const window of sheetOf(position)) expect(window.cut).toBe(false)
  })

  it('every ready window lies inside the sheet, and no two lie on each other', () => {
    for (const position of LADDER) {
      const sheet = sheetOf(position)
      for (const window of sheet) {
        expect(window.outline.length).toBeLessThanOrEqual(MOST_POINTS * 2)
        for (const value of window.outline) { expect(value).toBeGreaterThanOrEqual(1); expect(value).toBeLessThanOrEqual(99) }
      }
      for (let a = 0; a < sheet.length; a++) for (let b = 0; b < sheet.length; b++) {
        if (a === b) continue
        for (let i = 0; i < sheet[a].outline.length; i += 2) expect(within(sheet[b].outline, sheet[a].outline[i], sheet[a].outline[i + 1])).toBe(false)
      }
    }
  })
})

describe('a cut', () => {
  it('is the path the scissors took, thinned to twenty points and kept inside the sheet', () => {
    const path: number[] = []
    for (let i = 0; i < 90; i++) path.push(50 + Math.cos(i / 14) * 60, 50 + Math.sin(i / 14) * 30)
    const outline = outlineOf(path)!
    expect(outline.length).toBeLessThanOrEqual(MOST_POINTS * 2)
    for (const value of outline) { expect(value).toBeGreaterThanOrEqual(MARGIN); expect(value).toBeLessThanOrEqual(100 - MARGIN) }
    const middle = middleOf(outline)
    expect(within(outline, middle.x, middle.y)).toBe(true)
  })

  it('that encloses nothing is no window: a snip, a straight line, a line there and back', () => {
    expect(outlineOf([10, 10])).toBeNull()
    expect(outlineOf([10, 10, 10.2, 10.1, 10.3, 10.2])).toBeNull()
    expect(outlineOf([10, 10, 30, 10, 50, 10, 70, 10])).toBeNull()
    expect(outlineOf([10, 10, 30, 10, 50, 10, 30, 10, 10, 10])).toBeNull()
  })

  it('the window cut last is on top', () => {
    const big = { outline: [10, 10, 90, 10, 90, 90, 10, 90], paper: null, cut: true }, small = { outline: [40, 40, 60, 40, 60, 60, 40, 60], paper: null, cut: true }
    expect(windowAt([big, small], 50, 50)).toBe(1)
    expect(windowAt([big, small], 20, 20)).toBe(0)
    expect(windowAt([big, small], 5, 5)).toBe(-1)
  })
})

describe('a sheet read from a save', () => {
  it('is repaired window by window: a damaged window is dropped and the rest are kept', () => {
    const good = { outline: [10, 10, 30, 10, 20, 30], paper: 'red', cut: true }
    const read = readSheet([good, null, { outline: 'no' }, { outline: [1, 2, 3] }, { outline: [10, 10, Number.NaN, 4, 5, 6, 7, 8] }, { outline: [-40, 10, 300, 10, 20, 30.4], paper: 'green' }])!
    expect(read).toEqual([good, { outline: [0, 10, 100, 10, 20, 30], paper: null, cut: false }])
  })

  it('holds eight windows of twenty points at most, whatever the save holds', () => {
    const outline = Array.from({ length: 200 }, (_, i) => (i * 7) % 100)
    const read = readSheet(Array.from({ length: 30 }, () => ({ outline, paper: 'blue', cut: true })))!
    expect(read).toHaveLength(MOST_WINDOWS)
    for (const window of read) expect(window.outline).toHaveLength(MOST_POINTS * 2)
  })

  it('is no sheet at all when it is not a list', () => {
    for (const raw of [null, undefined, 4, 'sheet', {}]) expect(readSheet(raw)).toBeNull()
  })

  it('a copy shares nothing with the sheet it was copied from', () => {
    const sheet = sheetOf('three-windows'), copy = copySheet(sheet)
    expect(copy).toEqual(sheet)
    copy[0].outline[0] = -1; copy[0].paper = null
    expect(sheet[0].outline[0]).not.toBe(-1)
    expect(sheet[0].paper).toBe('yellow')
  })
})
