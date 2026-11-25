import { describe, expect, it } from 'vitest'
import { caughtSide, held, place, sameCells, size, swapped, turned, type Cell } from './cells'
import { LADDER } from './config'
import { cellsOf, FIRST, goesIn, layHouse, sided, solvable, ways } from './houses'
import { CELLS, KINDS } from './loads'

describe('cells', () => {
  it('four turns and two changes of ends give the same thing back', () => {
    for (const kind of KINDS) for (const way of ways(null)) {
      const cells = held(CELLS[kind], way)
      expect(sameCells(turned(turned(turned(turned(cells)))), cells)).toBe(true)
      expect(swapped(swapped(way))).toEqual(way)
      // Seen from behind is the mirror of what was seen.
      const mirror = cells.map(([x, y]) => [size(cells).w - 1 - x, y] as Cell)
      expect(sameCells(held(CELLS[kind], swapped(way)), mirror)).toBe(true)
    }
  })
  it('only the piano and the grandmother have a side', () => {
    expect(KINDS.filter(sided)).toEqual(['granny', 'piano'])
  })
  it('a load goes in exactly when some placing lies inside', () => {
    for (const a of KINDS) for (const wa of ways(null)) for (const b of KINDS) for (const wb of ways(null)) {
      const load = held(CELLS[a], wa), opening = held(CELLS[b], wb), open = new Set(opening.map(String))
      let any = false
      for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) if (load.every(([x, y]) => open.has(`${x + dx},${y + dy}`))) any = true
      expect(place(load, opening).fits).toBe(any)
    }
  })
  it('a load that catches names the wall cells in the way and the side they are on', () => {
    const bar = CELLS.bath, notch: Cell[] = [[0, 0], [1, 0]]
    const at = place(bar, notch)
    expect(at.fits).toBe(false)
    expect(at.blocked).toHaveLength(1)
    expect(caughtSide(bar, at)).not.toBe(0)
    const both = place(bar, [[0, 0]])
    expect(both.blocked).toHaveLength(2)
    expect(caughtSide(bar, both)).toBe(0)
  })
})

describe('houses', () => {
  const houses = LADDER.flatMap((position) => Array.from({ length: 200 }, (_, seed) => ({ position, house: layHouse(position, seed * 7919 + 1) })))
  it('every load of every house has a way in', () => {
    for (const { position, house } of [...houses, { position: 'first', house: FIRST }]) {
      expect(house.loads).toHaveLength(3)
      for (const laid of house.loads) {
        const way = solvable(laid, house.openings)
        expect(way.byTurning || way.bySwap, `${position} ${laid.kind}`).toBe(true)
        if (position !== 'other-side' && position !== 'full-house') expect(way.byTurning, position).toBe(true)
        expect(goesIn(laid.kind, laid.way, house.openings), `${position} ${laid.kind} starts as it must be turned`).toBe(false)
      }
      expect(new Set(house.loads.map((laid) => laid.kind)).size).toBe(3)
    }
  })
  it('the first position takes half of the turns of each load', () => {
    for (const { position, house } of houses) if (position === 'wide-opening') for (const { kind } of house.loads) {
      expect(ways(false).filter((way) => goesIn(kind, way, house.openings))).toHaveLength(2)
    }
  })
  it('the other side needs the bears to change ends for one load', () => {
    for (const { position, house } of houses) if (position === 'other-side') expect(house.loads.filter((laid) => !solvable(laid, house.openings).byTurning)).toHaveLength(1)
  })
  it('openings stay inside their own three by three and apart', () => {
    for (const { house } of houses) for (const opening of house.openings) {
      const { w, h } = size(opening.cells)
      expect(Math.max(w, h)).toBeLessThanOrEqual(3)
    }
    expect(cellsOf(FIRST.loads[0])).toHaveLength(5)
  })
})

describe('the loose opening', () => {
  it('takes each of two of the loads in at least two of their turns', () => {
    for (const position of ['three-openings', 'full-house']) for (let seed = 1; seed < 200; seed++) {
      const house = layHouse(position, seed)
      const loose = house.openings.filter((o) => o.cells.length === 6)
      expect(loose).toHaveLength(1)
      const takes = house.loads.filter(({ kind }) => ways(false).filter((way) => goesIn(kind, way, loose)).length >= 2)
      expect(takes.length).toBeGreaterThanOrEqual(2)
    }
  })
})
