import { describe, expect, it } from 'vitest'
import { COLUMNS, GRID, ROWS } from './grid'
import { KINDS, TASTES } from './kinds'

const pairOf = (cell: { motion: string; voice: string }): string => `${cell.motion} with ${cell.voice}`

describe('the object-by-action grid', () => {
  it('is six rows by five columns, every cell filled in', () => {
    expect(ROWS).toHaveLength(6)
    expect(COLUMNS).toHaveLength(5)
    expect(Object.keys(GRID)).toEqual([...ROWS])
    for (const row of ROWS) {
      expect(Object.keys(GRID[row]), row).toEqual([...COLUMNS])
      for (const column of COLUMNS) {
        expect(GRID[row][column].motion, `${row} ${column}`).toMatch(/^[a-z][A-Za-z]+$/)
        expect(GRID[row][column].voice, `${row} ${column}`).toMatch(/^[a-z][A-Za-z]+$/)
      }
    }
  })

  it('gives the four kinds a different motion and a different sound in every row', () => {
    for (const row of ROWS) {
      expect(new Set(KINDS.map((kind) => GRID[row][kind].motion)).size, `${row} motions`).toBe(KINDS.length)
      expect(new Set(KINDS.map((kind) => GRID[row][kind].voice)).size, `${row} sounds`).toBe(KINDS.length)
    }
  })

  it('gives every kind six cells that differ in what is seen and heard together', () => {
    for (const kind of KINDS) expect(new Set(ROWS.map((row) => pairOf(GRID[row][kind]))).size, kind).toBe(ROWS.length)
  })

  it('uses no motion and no sound in two cells of the four kinds', () => {
    const cells = ROWS.flatMap((row) => KINDS.map((kind) => GRID[row][kind]))
    expect(new Set(cells.map((cell) => cell.motion)).size).toBe(cells.length)
    expect(new Set(cells.map((cell) => cell.voice)).size).toBe(cells.length)
  })

  it('takes each kind\'s motions from its fixed tastes', () => {
    for (const kind of KINDS) {
      const taste = TASTES[kind]
      expect(ROWS.map((row) => GRID[row][kind].motion)).toEqual([taste.catch, taste.refuse, `${taste.catch}Together`, taste.liftOff, taste.popped, taste.poke])
    }
  })

  it('keeps one family of sounds per kind', () => {
    for (const kind of KINDS) {
      const family = GRID.ownColour[kind].voice
      expect(family.startsWith(kind)).toBe(true)
      for (const row of ROWS) expect(GRID[row][kind].voice.startsWith(family), `${row} ${kind}`).toBe(true)
    }
  })

  it('answers a troop that already has its balloons with the lift-off for fun, whatever of its colour is sent', () => {
    expect(GRID.ownColour.served).toEqual({ motion: 'liftOffForFun', voice: GRID.tooMany.served.voice })
    expect(GRID.fittingBunch.served).toEqual(GRID.tooMany.served)
    expect(GRID.tooMany.served.motion).toBe('liftOffForFun')
  })

  it('still tells the other rows of a served troop apart, in what is seen and in what is heard', () => {
    expect(GRID.otherColour.served.motion).toBe('refusesStill')
    expect(GRID.popHeld.served.motion).toBe('reachesAgain')
    expect(GRID.poke.served.motion).toBe('pokeWithBalloon')
    const differing = [GRID.tooMany.served, GRID.otherColour.served, GRID.popHeld.served, GRID.poke.served]
    expect(new Set(differing.map((cell) => cell.motion)).size).toBe(differing.length)
    expect(new Set(differing.map((cell) => cell.voice)).size).toBe(differing.length)
    // Nothing in the served column is one kind's own id: it stands for whichever kind is there.
    const ofKinds = new Set(ROWS.flatMap((row) => KINDS.flatMap((kind) => [GRID[row][kind].motion, GRID[row][kind].voice])))
    for (const row of ROWS) {
      expect(ofKinds.has(GRID[row].served.motion)).toBe(false)
      expect(ofKinds.has(GRID[row].served.voice)).toBe(false)
    }
  })
})
