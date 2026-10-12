import { describe, expect, it } from 'vitest'
import { CELLS, lieOf, settleOf } from './cells'
import { FOUND, FOUND_COUNTS_HOLD, HOME_CONTROL, KINDS, SUPPORTS, ceilingY, groundY, overHollow, HOLLOW } from './kinds'
import { LAND } from './voices'

describe('the grid of seven things by five supports', () => {
  const cells = KINDS.flatMap((kind) => SUPPORTS.map((on) => ({ kind, on, cell: CELLS[kind][on] })))

  it('has a cell for every thing on every support, each with a name of its own', () => {
    expect(cells).toHaveLength(35)
    expect(new Set(cells.map(({ cell }) => cell.is)).size).toBe(35)
  })

  it('lies differently in every cell', () => {
    expect(new Set(cells.map(({ kind, cell }) => `${kind} ${lieOf(cell)}`)).size).toBe(35)
    // Within one kind at least four cells differ in form, lean, sink or place along the support, and not in size alone.
    for (const kind of KINDS) expect(new Set(SUPPORTS.map((on) => `${CELLS[kind][on].form} ${CELLS[kind][on].tilt} ${CELLS[kind][on].sink} ${CELLS[kind][on].shift}`)).size, kind).toBeGreaterThanOrEqual(4)
  })

  it('sounds different in every cell, and no row or column is one sound', () => {
    const sound = (kind: (typeof KINDS)[number], on: (typeof SUPPORTS)[number]) => JSON.stringify(LAND[kind][on])
    expect(new Set(cells.map(({ kind, on }) => sound(kind, on))).size).toBe(35)
    for (const kind of KINDS) expect(new Set(SUPPORTS.map((on) => sound(kind, on))).size, kind).toBe(5)
    for (const on of SUPPORTS) expect(new Set(KINDS.map((kind) => sound(kind, on))).size, on).toBe(7)
  })

  it('comes to rest in more than one way within every row', () => {
    for (const kind of KINDS) expect(new Set(SUPPORTS.map((on) => settleOf(CELLS[kind][on]))).size, kind).toBeGreaterThanOrEqual(2)
  })

  it('gives every cell room it can be taken hold of by', () => {
    for (const { cell } of cells) {
      expect(cell.w).toBeGreaterThanOrEqual(16)
      expect(cell.h).toBeGreaterThanOrEqual(10)
      expect(cell.sink).toBeLessThan(cell.h + 12)
    }
  })
})

describe('the found things and the hollow', () => {
  it('numbers eighteen things, kind by kind, and holds the count of each', () => {
    expect(FOUND).toHaveLength(18)
    expect(FOUND_COUNTS_HOLD).toBe(true)
    expect(FOUND.map((thing) => thing.id)).toEqual(FOUND.map((_, index) => index))
    expect(FOUND.map((thing) => thing.kind)).toEqual([...FOUND].sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) || a.id - b.id).map((thing) => thing.kind))
  })

  it('lays no thing on the forest floor under the home control, inside the hollow or on another', () => {
    for (const thing of FOUND) {
      expect(Math.hypot(thing.home.x - HOME_CONTROL.x, thing.home.y - HOME_CONTROL.y), `thing ${thing.id}`).toBeGreaterThan(200)
      expect(overHollow(thing.home.x, thing.home.y - 20), `thing ${thing.id}`).toBe(false)
      for (const other of FOUND) if (other.id > thing.id && other.home.y === thing.home.y) expect(Math.abs(other.home.x - thing.home.x), `${thing.id} and ${other.id}`).toBeGreaterThanOrEqual(78)
    }
  })

  it('has a step that stands higher than the floor, and an arch over both', () => {
    expect(groundY(HOLLOW.left + 10)).toBe(HOLLOW.stepY)
    expect(groundY(HOLLOW.right - 10)).toBe(HOLLOW.floorY)
    expect(HOLLOW.stepY).toBeLessThan(HOLLOW.floorY)
    expect(ceilingY(HOLLOW.archX)).toBeLessThan(HOLLOW.stepY - 200)
    expect(overHollow(600, 500)).toBe(true)
    expect(overHollow(600, 720)).toBe(false)
    expect(overHollow(200, 500)).toBe(false)
  })
})
