import { describe, expect, it } from 'vitest'
import { ACTIONS, GRID, OBJECTS, PUT_ONTO, cellOf, type Cell } from './grid'

const cells: Cell[] = OBJECTS.flatMap((object) => ACTIONS.map((action) => cellOf(object, action)))

/** Small letters in words joined by single hyphens: no digit, no capital, no space. */
const KEBAB = /^[a-z]+(-[a-z]+)*$/

describe('the object-by-action grid', () => {
  it('has six things, five actions and a cell for every pair', () => {
    expect(OBJECTS).toHaveLength(6)
    expect(ACTIONS).toHaveLength(5)
    expect(cells).toHaveLength(30)
    expect(Object.keys(GRID).sort()).toEqual([...OBJECTS].sort())
    for (const object of OBJECTS) expect(Object.keys(GRID[object]).sort()).toEqual([...ACTIONS].sort())
  })

  it('leaves no cell empty: every wrong use works', () => {
    for (const cell of cells) {
      expect(cell).toBeDefined()
      for (const id of [cell.result, cell.motion, cell.voice]) expect(id.length).toBeGreaterThan(0)
    }
  })

  it('gives every cell a result, a motion and a voice of its own', () => {
    for (const part of ['result', 'motion', 'voice'] as const) {
      const ids = cells.map((cell) => cell[part])
      expect(new Set(ids).size, part).toBe(30)
    }
  })

  it('names everything in kebab-case, with no digit', () => {
    for (const cell of cells) for (const id of [cell.result, cell.motion, cell.voice]) expect(id).toMatch(KEBAB)
    for (const object of OBJECTS) for (const id of Object.values(PUT_ONTO[object])) expect(id).toMatch(KEBAB)
  })

  it('keeps the cup row as the sheet has it', () => {
    expect(ACTIONS.map((action) => cellOf('cup', action).result)).toEqual(['ring-and-drop', 'fill', 'slide-and-slosh', 'seat-or-tip-or-hat', 'whirlpool'])
    expect(cellOf('guest', 'rub')).toBe(GRID.guest.rub)
  })
})

describe('putting one thing on another', () => {
  it('names at least one target for every thing', () => {
    for (const object of OBJECTS) expect(Object.keys(PUT_ONTO[object]).length).toBeGreaterThan(0)
  })

  it('names only things, the stack and the bowl as targets', () => {
    const targets: readonly string[] = [...OBJECTS, 'stack', 'bowl']
    for (const object of OBJECTS) for (const target of Object.keys(PUT_ONTO[object])) expect(targets).toContain(target)
  })

  it('has what the sheet says of each target', () => {
    expect(PUT_ONTO).toEqual({
      cup: { saucer: 'seat', cup: 'tip-in', bowl: 'tip-in', pot: 'tip-in', guest: 'hat' },
      saucer: { stack: 'stack', cup: 'cup-hops-on', guest: 'flat-hat' },
      spoon: { cup: 'stir', saucer: 'rest', guest: 'nose-balance' },
      pot: { guest: 'drink-from-spout', bowl: 'empty-bowl' },
      sponge: { cup: 'dab', guest: 'wipe-face' },
      guest: { guest: 'swap-seats' },
    })
  })
})
