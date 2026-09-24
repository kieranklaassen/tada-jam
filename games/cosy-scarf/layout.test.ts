import { describe, expect, it } from 'vitest'
import { cellAt, cellCentre, FELT, feltBottom, LOOM, needlesY, SCARF } from './layout'
import { MAX_ROWS, WIDTH } from './state'

describe('layout', () => {
  it('finds the cell back from its centre', () => {
    for (const [row, column] of [
      [0, 0],
      [3, 2],
      [7, WIDTH - 1],
    ]) {
      const c = cellCentre(row, column)
      expect(cellAt(c.x, c.y, 8)).toEqual({ row, column })
    }
  })

  it('only knitted rows are cells', () => {
    const c = cellCentre(5, 1)
    expect(cellAt(c.x, c.y, 5)).toBeNull()
    expect(cellAt(SCARF.x + SCARF.halfWidth + 1, SCARF.top - 1, 5)).toBeNull()
  })

  it('moves the needles down as the scarf grows', () => {
    expect(needlesY(4)).toBeLessThan(needlesY(3))
  })

  it('unrolls the felt just past the needles, down to the loom foot for the longest scarf', () => {
    for (let rows = 0; rows < MAX_ROWS; rows++) {
      expect(feltBottom(rows + 1)).toBeLessThanOrEqual(feltBottom(rows))
      expect(feltBottom(rows)).toBeLessThan(needlesY(rows) - FELT.roll)
    }
    expect(feltBottom(0)).toBeGreaterThan(LOOM.rodY - 12)
    expect(feltBottom(MAX_ROWS)).toBe(FELT.bottom)
  })
})
