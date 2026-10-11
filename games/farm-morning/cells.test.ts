import { describe, expect, it } from 'vitest'
import { BROUGHT, CELLS, GRID, RIGHT, SOAKED, SPRAY_REACHES, cellOf } from './cells'
import { THINGS } from './layout'
import { ANIMALS } from './state'

describe('the grid', () => {
  it('has a cell for every thing, and the bare finger, on every animal', () => {
    expect(GRID).toHaveLength(BROUGHT.length * ANIMALS.length)
    expect(new Set(GRID).size).toBe(20)
    for (const cell of GRID) expect(CELLS[cell], cell).toBeDefined()
  })

  it('gives each animal one right thing, and each thing one animal', () => {
    expect(Object.keys(RIGHT).sort()).toEqual([...ANIMALS].sort())
    expect(Object.values(RIGHT).sort()).toEqual([...THINGS].sort())
    expect(RIGHT).toEqual({ hens: 'scoop', pony: 'brush', goat: 'fork', pig: 'bucket' })
  })

  it('keeps every answer between one and five seconds, and a use longer than a poke', () => {
    for (const cell of GRID) {
      expect(CELLS[cell].lasts, cell).toBeGreaterThanOrEqual(1)
      expect(CELLS[cell].lasts, cell).toBeLessThanOrEqual(5)
    }
    for (const animal of ANIMALS) for (const thing of THINGS) expect(CELLS[cellOf(thing, animal)].lasts).toBeGreaterThan(CELLS[cellOf('finger', animal)].lasts)
  })

  it('throws something into the air in every cell where a thing is tipped out, inside the answer', () => {
    for (const thing of ['scoop', 'bucket', 'fork'] as const) for (const animal of ANIMALS) expect(CELLS[cellOf(thing, animal)].bursts.length, `${thing} on ${animal}`).toBeGreaterThan(0)
    for (const [id, cell] of Object.entries(CELLS)) for (const burst of cell.bursts) {
      expect(burst.at, id).toBeLessThan(cell.lasts)
      expect(burst.count, id).toBeLessThanOrEqual(30)
    }
  })

  it('gives no two cells of a row or a column the same bursts and length', () => {
    const shape = (id: keyof typeof CELLS): string => JSON.stringify(CELLS[id])
    for (const brought of BROUGHT) expect(new Set(ANIMALS.map((animal) => shape(cellOf(brought, animal)))).size, brought).toBe(ANIMALS.length)
    for (const animal of ANIMALS) expect(new Set(BROUGHT.map((brought) => shape(cellOf(brought, animal)))).size, animal).toBe(BROUGHT.length)
  })

  it('sends the spray from the pony to the goat while the pony is still shaking', () => {
    expect(SPRAY_REACHES).toBeLessThan(CELLS['bucket-pony'].lasts)
    expect(CELLS[SOAKED].lasts).toBeGreaterThan(1)
  })
})
