import { describe, expect, it } from 'vitest'
import { COLS, GROUNDS, OPEN, ROWS, TIN, WATER, boxCells, isHot, isRock, kindOf, type Box, type GroundKind } from './cells'
import { LADDER } from './config'
import { CLOUD_BOTTOM, Ground, WATER_FROM } from './ground'
import { VARIANTS, groundsOf, layHill } from './hills'
import { sandWay } from './testing'

// Every layout of every hill is walked for the rules the design sheet gives
// them: a way through sand alone, the bath in the lowest place, the sky clear
// at the top, no stone over a resident, and each ground beside whoever shows it.

const each = (run: (id: string, variant: number) => void): void => {
  for (const id of LADDER) for (let variant = 0; variant < VARIANTS; variant++) run(id, variant)
}
const overlap = (a: Box, b: Box): boolean => a.col0 <= b.col1 && b.col0 <= a.col1 && a.row0 <= b.row1 && b.row0 <= a.row1

const holds = (cells: Uint8Array): Set<GroundKind> => {
  const kinds = new Set<GroundKind>()
  for (const code of cells) { const kind = kindOf(code); if ((GROUNDS as readonly string[]).includes(kind)) kinds.add(kind as GroundKind) }
  return kinds
}

describe('the hills', () => {
  it('every layout has a way through sand alone from the pond to the bath', () => {
    each((id, variant) => {
      const { layout, cells } = layHill(id, variant)
      expect(sandWay(layout, cells), `${id} ${variant}`).not.toBeNull()
    })
  })

  it('the bath is the lowest place of every hill, and holds between 300 and 400 cells', () => {
    each((id, variant) => {
      const { layout } = layHill(id, variant)
      expect(layout.bath.row1, `${id} ${variant}`).toBe(ROWS - 1)
      expect(boxCells(layout.bath)).toBeGreaterThanOrEqual(300)
      expect(boxCells(layout.bath)).toBeLessThanOrEqual(400)
    })
  })

  it('the sky is open above every hill, well below where a cloud gathers', () => {
    each((id, variant) => {
      const { layout, cells } = layHill(id, variant)
      for (let col = 0; col < COLS; col++) {
        expect(layout.surface[col], `${id} ${variant} column ${col}`).toBeGreaterThan(CLOUD_BOTTOM + 6)
        for (let row = 0; row < layout.surface[col]; row++) expect(cells[row * COLS + col] === OPEN || cells[row * COLS + col] === WATER).toBe(true)
      }
    })
  })

  it('the rooms, the chamber and the pond lie apart, and the duck and the chain share the bath without touching', () => {
    each((id, variant) => {
      const { layout, hall } = layHill(id, variant), name = `${id} ${variant}`
      const { pond, moleRoom, wormRoom, chamber, bath, seat, chain } = layout
      const bowl: Box = { col0: pond.col - pond.half, row0: pond.brim, col1: pond.col + pond.half, row1: pond.brim + pond.depth + 3 }
      const boxes = [bowl, moleRoom, wormRoom, chamber, hall]
      for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) if (!(boxes[a] === moleRoom && boxes[b] === hall)) expect(overlap(boxes[a], boxes[b]), `${name}: boxes ${a} and ${b}`).toBe(false)
      for (const box of boxes) { expect(box.col0, name).toBeGreaterThanOrEqual(0); expect(box.col1, name).toBeLessThan(COLS) }
      expect(seat.col0 >= bath.col0 && seat.col1 <= bath.col1 && chain.col0 >= bath.col0 && chain.col1 <= bath.col1, name).toBe(true)
      // A gap between them wide enough for a stone to drop into.
      expect(Math.min(Math.abs(seat.col0 - chain.col1), Math.abs(chain.col0 - seat.col1)) - 1, name).toBeGreaterThanOrEqual(7)
    })
  })

  it('no rock or hot stone lies over a resident, the duck or the chain, and what can drop into the bath leaves room for a fifth of water', () => {
    each((id, variant) => {
      const { layout, cells } = layHill(id, variant), name = `${id} ${variant}`
      const { moleRoom, wormRoom, bath, seat, chain } = layout
      let overBath = 0
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const code = cells[row * COLS + col]
          if (!isRock(code) && !isHot(code)) continue
          for (const room of [moleRoom, wormRoom]) if (row < room.row0) expect(col < room.col0 || col > room.col1, `${name}: a stone at ${col},${row} over a room`).toBe(true)
          expect(col < seat.col0 || col > seat.col1, `${name}: a stone at ${col},${row} over the duck`).toBe(true)
          expect(col < chain.col0 || col > chain.col1, `${name}: a stone at ${col},${row} over the chain`).toBe(true)
          if (col >= bath.col0 && col <= bath.col1) overBath++
        }
      }
      expect(boxCells(bath) - overBath, name).toBeGreaterThanOrEqual(Math.ceil((WATER_FROM + 0.05) * boxCells(bath)))
    })
  })

  it('each hill holds the grounds its id names, and each of them once more beside the resident who shows it', () => {
    const one: Record<string, GroundKind> = { claypit: 'clay', scree: 'rock', fen: 'moss', 'hot-spring': 'hot', orchard: 'earth' }
    const threes = new Set<string>()
    each((id, variant) => {
      const { layout, cells } = layHill(id, variant), name = `${id} ${variant}`
      const kinds = holds(cells)
      kinds.delete('sand')
      expect([...kinds].sort(), name).toEqual(groundsOf(layout).sort())
      if (id === 'dune') expect(kinds.size, name).toBe(0)
      if (one[id]) expect([...kinds], name).toEqual([one[id]])
      if (id === 'foothills') { expect(kinds.size, name).toBe(3); threes.add([...kinds].sort().join()) }
      if (id === 'massif') expect(kinds.size, name).toBe(5)
      for (const kind of kinds) {
        const spot = layout.spots[kind]!
        expect(spot.col >= 0 && spot.col < COLS && spot.row >= 0 && spot.row < ROWS, `${name}: the ${kind} spot`).toBe(true)
      }
    })
    expect(threes.size, 'a different three in each layout of the foothills').toBe(VARIANTS)
  })

  it('a hill as laid is at rest: nothing falls, runs or grows until it is touched', () => {
    each((id, variant) => {
      const { layout, cells } = layHill(id, variant)
      const ground = new Ground(layout, cells)
      for (let i = 0; i < 90; i++) ground.step()
      let moved = 0
      for (let i = 0; i < cells.length; i++) if (ground.cells[i] !== cells[i]) moved++
      expect(moved, `${id} ${variant}`).toBe(0)
    })
  })

  it('the tin of the bath stands on both sides of it and nowhere else', () => {
    each((id, variant) => {
      const { layout, cells } = layHill(id, variant)
      for (let i = 0; i < cells.length; i++) {
        if (cells[i] !== TIN) continue
        const col = i % COLS
        expect(col === layout.bath.col0 - 1 || col === layout.bath.col1 + 1, `${id} ${variant}`).toBe(true)
      }
    })
  })
})
