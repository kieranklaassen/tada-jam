import { describe, expect, it } from 'vitest'
import { BALL_RADIUS, ballRest, BASKET, cellAt, cellCentre, FELT, feltBottom, LOOM, needlesY, SCARF } from './layout'
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

  it('keeps balls apart and inside the basket for every basket size', () => {
    for (let count = 4; count <= 6; count++) {
      const rests = Array.from({ length: count }, (_, i) => ballRest(i, count))
      for (const rest of rests) expect(Math.abs(rest.x - BASKET.x)).toBeLessThan(BASKET.radius)
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const a = rests[i]
          const b = rests[j]
          expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeGreaterThan(BALL_RADIUS * 1.8)
        }
      }
    }
  })
})
