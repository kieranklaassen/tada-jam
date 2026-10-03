import { describe, expect, it } from 'vitest'
import { CELLS, GRID, cellOf } from './grid'
import { ACTIONS, KINDS } from './things'

const KEBAB = /^[a-z]+(-[a-z]+)*$/

describe('the object-by-action grid', () => {
  it('has a cell for every kind and every action: 35 in all', () => {
    expect(CELLS).toHaveLength(35)
    for (const kind of KINDS) {
      expect(Object.keys(GRID[kind]).sort()).toEqual([...ACTIONS].sort())
      for (const action of ACTIONS) {
        const cell = cellOf(kind, action)
        for (const cue of [cell.id, cell.look, cell.voice]) expect(cue).toMatch(KEBAB)
      }
    }
    expect(Object.keys(GRID).sort()).toEqual([...KINDS].sort())
  })

  it('gives every result an id of its own, which starts with its kind', () => {
    expect(new Set(CELLS.map((cell) => cell.id)).size).toBe(35)
    for (const cell of CELLS) expect(cell.id.startsWith(`${cell.kind}-`)).toBe(true)
  })

  it('never shows or sounds two cells of one row alike', () => {
    for (const kind of KINDS) {
      const row = ACTIONS.map((action) => cellOf(kind, action))
      expect(new Set(row.map((cell) => cell.look)).size).toBe(ACTIONS.length)
      expect(new Set(row.map((cell) => cell.voice)).size).toBe(ACTIONS.length)
    }
  })

  it('gives every cell a look of its own and a sound of its own: none is used twice in the whole grid', () => {
    expect(new Set(CELLS.map((cell) => cell.look)).size).toBe(35)
    expect(new Set(CELLS.map((cell) => cell.voice)).size).toBe(35)
  })

  it('gives every cell of the whole grid a pair of look and voice of its own', () => {
    expect(new Set(CELLS.map((cell) => `${cell.look} + ${cell.voice}`)).size).toBe(35)
  })

  it('answers the wrong use of every kind, its too much, with a result', () => {
    for (const kind of KINDS) {
      const cell = cellOf(kind, 'too-much')
      expect(cell.id.length).toBeGreaterThan(kind.length + 1)
      expect(cell.look.length).toBeGreaterThan(0)
      expect(cell.voice.length).toBeGreaterThan(0)
    }
  })

  it('lists the cells row by row in the order of the sheet', () => {
    expect(CELLS[0]).toEqual({ kind: 'fire', action: 'gulp', ...GRID.fire.gulp })
    expect(CELLS[34]).toEqual({ kind: 'cat', action: 'neighbour', ...GRID.cat.neighbour })
    expect(CELLS.map((cell) => cell.kind).filter((kind, at, all) => all.indexOf(kind) === at)).toEqual([...KINDS])
  })
})
