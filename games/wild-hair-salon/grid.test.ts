import { describe, expect, it } from 'vitest'
import { ACTIONS, GRID, OBJECTS, cellOf } from './grid'
import { CELL_VOICES } from './voices'

const cells = OBJECTS.flatMap((object) => ACTIONS.map((action) => ({ object, action, cell: cellOf(object, action) })))

describe('the object-by-action grid', () => {
  it('is six objects by five actions with every cell filled', () => {
    expect(OBJECTS).toHaveLength(6)
    expect(ACTIONS).toHaveLength(5)
    expect(cells).toHaveLength(30)
    for (const { cell } of cells) expect(cell.result.length).toBeGreaterThan(8)
  })

  it('gives every cell a result of its own', () => {
    expect(new Set(cells.map(({ cell }) => cell.result)).size).toBe(30)
  })

  it('gives every cell a voice of its own, and uses every cell voice', () => {
    const used = cells.map(({ cell }) => cell.voice)
    expect(new Set(used).size).toBe(30)
    expect([...used].sort()).toEqual(Object.keys(CELL_VOICES).sort())
    for (const { object, action, cell } of cells) expect(cell.voice).toBe(`${object}/${action}`)
  })

  it('has a wrong use for every object, and each one works', () => {
    for (const object of OBJECTS) expect(ACTIONS.some((action) => GRID[object][action].wrongUse), object).toBe(true)
    for (const { cell } of cells.filter(({ cell }) => cell.wrongUse)) {
      expect(cell.result.length).toBeGreaterThan(8)
      expect(CELL_VOICES[cell.voice]).toBeDefined()
    }
  })

  it('lets pulling and snipping undo each other on everything that keeps a length', () => {
    for (const object of ['lock', 'tuft', 'ribbon'] as const) {
      expect(GRID[object].pull.changes).toBe('longer')
      expect(GRID[object].snip.changes).toBe('shorter')
    }
  })

  it('never lets the model keep a change: its length is the one thing the child cannot move', () => {
    for (const action of ACTIONS) expect(['longer', 'shorter']).not.toContain(GRID.model[action].changes)
  })

  it('never changes a face', () => {
    for (const action of ['pull', 'snip', 'poke', 'ruffle'] as const) expect(GRID.face[action].changes).toBe('nothing')
  })
})
