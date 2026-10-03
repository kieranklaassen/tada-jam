import { describe, expect, it } from 'vitest'
import { GIVEN, GRID, SECRETS, allCells, cell, helps, pairOf } from './grid'
import { CARES, FITS, NEEDS } from './needs'

describe('the object-by-action grid', () => {
  it('is six objects by five actions', () => {
    expect(GIVEN).toHaveLength(6)
    expect(allCells()).toHaveLength(30)
    for (const given of GIVEN) expect(Object.keys(GRID[given]).sort()).toEqual([...NEEDS].sort())
  })

  it('gives every cell a motion and a voice of its own', () => {
    const cells = allCells()
    expect(new Set(cells.map((entry) => entry.cell.motion)).size).toBe(30)
    expect(new Set(cells.map((entry) => entry.cell.voice)).size).toBe(30)
    for (const entry of cells) {
      expect(entry.cell.motion.length).toBeGreaterThan(0)
      expect(entry.cell.voice.length).toBeGreaterThan(0)
    }
  })

  it('has exactly one cell in each column that helps, and it is the care that fits', () => {
    for (const need of NEEDS) {
      const helping = GIVEN.filter((given) => helps(given, need))
      expect(helping).toEqual([FITS[need]])
    }
  })

  it('lets every care thing help exactly once and be the wrong thing four times, and each wrong use still works', () => {
    for (const care of CARES) {
      expect(NEEDS.filter((need) => helps(care, need))).toHaveLength(1)
      for (const need of NEEDS) expect(cell(care, need).motion).toBeTruthy()
    }
  })

  it('never counts the hand as the thing that helps', () => {
    for (const need of NEEDS) expect(helps('hand', need)).toBe(false)
  })
})

describe('the pairs of things', () => {
  it('has five, each making something of its own', () => {
    expect(SECRETS).toHaveLength(5)
    expect(new Set(SECRETS).size).toBe(5)
  })

  it('gives the same result in either order, every time', () => {
    for (const one of CARES) {
      for (const other of CARES) {
        expect(pairOf(one, other)).toBe(pairOf(other, one))
        expect(pairOf(one, other)).toBe(pairOf(one, other))
      }
    }
  })

  it('makes nothing of a thing with itself, and lets the other pairs come to rest', () => {
    for (const care of CARES) expect(pairOf(care, care)).toBeNull()
    const made = CARES.flatMap((one, a) => CARES.slice(a + 1).map((other) => pairOf(one, other)))
    expect(made).toHaveLength(10)
    expect(made.filter((secret) => secret !== null).sort()).toEqual([...SECRETS].sort())
  })

  it('names the five the sheet names', () => {
    expect(pairOf('blanket', 'basket')).toBe('den')
    expect(pairOf('bowl', 'brush')).toBe('foam')
    expect(pairOf('bowl', 'plaster')).toBe('boat')
    expect(pairOf('blanket', 'brush')).toBe('crackle')
    expect(pairOf('blanket', 'plaster')).toBe('patch')
  })
})
