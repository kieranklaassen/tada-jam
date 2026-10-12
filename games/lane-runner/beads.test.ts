import { describe, expect, it } from 'vitest'
import { at, beadCount, blank, box, fromRows, inOnePiece, mirrored, outlined, oval, peak, put, stamp } from './beads'
import { BEADS, beadIndex, beadIndexOf, beadRgb } from './palette'

describe('the bead colours', () => {
  it('gives every colour one key of one character and a colour written as six hex digits', () => {
    const keys = BEADS.map((bead) => bead.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const bead of BEADS) {
      expect(bead.key.length).toBe(1)
      expect(bead.hex).toMatch(/^#[0-9a-f]{6}$/)
    }
    expect(new Set(BEADS.map((bead) => bead.hex)).size).toBe(BEADS.length)
  })

  it('stores a colour as its place plus one, and nothing as 0', () => {
    expect(beadIndex(BEADS[0].key)).toBe(1)
    expect(beadIndexOf('.')).toBe(0)
    expect(beadIndexOf(' ')).toBe(0)
    for (const bead of BEADS) {
      const rgb = beadRgb(beadIndex(bead.key))
      for (const part of rgb) expect(part >= 0 && part <= 1).toBe(true)
    }
  })

  it('fits in a plaque cell with room to spare', () => {
    expect(BEADS.length).toBeLessThan(255)
  })
})

describe('a plaque', () => {
  it('reads drawn rows from the top down, with anything that is no key as an empty peg', () => {
    const plaque = fromRows(['K.', 'WK?'])
    expect([plaque.w, plaque.h]).toEqual([3, 2])
    expect(at(plaque, 0, 0)).toBe(beadIndex('K'))
    expect(at(plaque, 1, 0)).toBe(0)
    expect(at(plaque, 2, 1)).toBe(0)
    expect(at(plaque, -1, 0)).toBe(0)
    expect(at(plaque, 0, 9)).toBe(0)
    expect(beadCount(plaque)).toBe(3)
  })

  it('draws with plain shapes and ignores a peg off the plaque', () => {
    const plaque = blank(9, 9)
    oval(plaque, 4, 4, 3, 3, 'O')
    expect(at(plaque, 4, 4)).toBe(beadIndex('O'))
    expect(at(plaque, 0, 0)).toBe(0)
    box(plaque, 0, 0, 1, 1, 'W')
    expect(beadCount(plaque)).toBeGreaterThan(4)
    peak(plaque, 4, 0, 2, 2, 'G')
    expect(at(plaque, 4, 0)).toBe(beadIndex('G'))
    put(plaque, 40, 40, 'K')
    put(plaque, 4, 4, null)
    expect(at(plaque, 4, 4)).toBe(0)
  })

  it('mirrors, and stamps one plaque onto another leaving what its empty pegs cover', () => {
    const plaque = fromRows(['KW.'])
    expect(Array.from(mirrored(plaque).cells)).toEqual([0, beadIndex('W'), beadIndex('K')])
    const sheet = fromRows(['OOO', 'OOO'])
    stamp(sheet, fromRows(['.K']), 1, 1)
    expect(Array.from(sheet.cells)).toEqual([...Array(3).fill(beadIndex('O')), beadIndex('O'), beadIndex('O'), beadIndex('K')])
  })

  it('puts a line round a figure: one peg larger each way, the figure untouched, the line only where it touches by an edge', () => {
    const lined = outlined(fromRows(['O']), 'K')
    expect([lined.w, lined.h]).toEqual([3, 3])
    const K = beadIndex('K'), O = beadIndex('O')
    expect(Array.from(lined.cells)).toEqual([0, K, 0, K, O, K, 0, K, 0])
  })

  it('knows a plaque in one piece from one that would fall apart', () => {
    expect(inOnePiece(fromRows(['KK', '.K']))).toBe(true)
    expect(inOnePiece(fromRows(['K.', '.K']))).toBe(false)
    expect(inOnePiece(blank(2, 2))).toBe(false)
  })
})
