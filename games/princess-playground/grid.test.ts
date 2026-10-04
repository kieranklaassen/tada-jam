import { describe, expect, it } from 'vitest'
import { CELLS, DEEDS, THINGS, WRONG_USES } from './grid'

describe('the object-by-action grid', () => {
  const cells = THINGS.flatMap((thing) => DEEDS.map((deed) => ({ thing, deed, ...CELLS[thing][deed] })))

  it('is six things by five deeds, every cell filled', () => {
    expect(THINGS.length).toBe(6)
    expect(DEEDS.length).toBe(5)
    expect(cells.length).toBe(30)
    for (const cell of cells) {
      expect(cell.seen.length, `${cell.thing} ${cell.deed}`).toBeGreaterThan(8)
      expect(cell.heard.length, `${cell.thing} ${cell.deed}`).toBeGreaterThan(4)
      expect(cell.heard, `${cell.thing} ${cell.deed}`).not.toMatch(/nothing|silen|no sound/i)
    }
  })

  it('the column for a friend dropped in the sand is heard in every row, and Dot has cells of its own, borrowed from nobody', () => {
    for (const thing of THINGS) expect(CELLS[thing]['in-the-sand'].heard.length).toBeGreaterThan(4)
    for (const deed of DEEDS) {
      expect(CELLS.dot[deed].heard).not.toBe(CELLS.mog[deed].heard)
      expect(CELLS.dot[deed].seen).not.toBe(CELLS.mog[deed].seen)
    }
  })

  it('no two cells look alike and no two sound alike', () => {
    expect(new Set(cells.map((cell) => cell.seen)).size).toBe(30)
    expect(new Set(cells.map((cell) => cell.heard)).size).toBe(30)
  })

  it('every friend has a wrong use that works, and it is a cell of the grid', () => {
    for (const use of Object.values(WRONG_USES)) {
      expect(CELLS[use.thing][use.deed]).toBeDefined()
      expect(use.why.length).toBeGreaterThan(10)
    }
  })

  it('no cell refuses, buzzes or scolds: every result is something that happens', () => {
    for (const cell of cells) expect(`${cell.seen} ${cell.heard}`).not.toMatch(/refus|buzz|wrong|no response|cannot|not allowed|error|fail/i)
  })
})
