import { describe, expect, it } from 'vitest'
import { BOARD, COLS, HOLES, MOTH_RADIUS, PEG_RADIUS, PITCH, ROWS, centreOf, colOf, echoes, holeAt, holeUnder, holesAlong, perchOf, rowOf, stepOf, type Mirror } from './board'

describe('the board', () => {
  it('has 77 holes, each the middle of its own cell', () => {
    expect(HOLES).toBe(77)
    for (let hole = 0; hole < HOLES; hole++) {
      const at = centreOf(hole)
      expect(holeUnder(at.x, at.y)).toBe(hole)
      expect(holeAt(colOf(hole), rowOf(hole))).toBe(hole)
    }
  })

  it('gives every point of the board to one hole, and no point outside it to any', () => {
    expect(holeUnder(BOARD.x, BOARD.y)).toBe(0)
    expect(holeUnder(BOARD.x + BOARD.width - 0.5, BOARD.y + BOARD.height - 0.5)).toBe(HOLES - 1)
    for (const [x, y] of [[BOARD.x - 1, BOARD.y + 10], [BOARD.x + BOARD.width, BOARD.y + 10], [BOARD.x + 10, BOARD.y - 1], [BOARD.x + 10, BOARD.y + BOARD.height]]) expect(holeUnder(x, y)).toBe(-1)
  })

  it('gives a hole a target of a cell, well over the jam\'s floor of 48', () => {
    expect(PITCH).toBeGreaterThanOrEqual(48)
    expect(PEG_RADIUS * 2).toBeLessThan(PITCH)
  })

  it('walks every hole a fast drag crosses, in order and once', () => {
    const from = centreOf(holeAt(1, 3)), to = centreOf(holeAt(9, 3))
    expect(holesAlong(from.x, from.y, to.x, to.y)).toEqual([2, 3, 4, 5, 6, 7, 8, 9].map((col) => holeAt(col, 3)))
    // A drag that leaves the board and comes back skips nothing on it and adds nothing off it.
    const out = holesAlong(from.x, from.y, from.x, BOARD.y - 200)
    expect(out).toEqual([holeAt(1, 2), holeAt(1, 1), holeAt(1, 0)])
    expect(holesAlong(from.x, from.y, from.x + 3, from.y + 3)).toEqual([])
  })

  it('sounds higher rows higher', () => {
    expect(stepOf(holeAt(0, ROWS - 1))).toBe(0)
    expect(stepOf(holeAt(0, 0))).toBe(ROWS - 1)
  })
})

describe('the mirrors', () => {
  it('give the hole alone with no mirror, a pair two ways and four holes four ways', () => {
    const hole = holeAt(2, 1)
    expect(echoes(hole, 0)).toEqual([hole])
    expect(echoes(hole, 1)).toEqual([hole, holeAt(COLS - 3, 1)])
    expect(echoes(hole, 2)).toEqual([hole, holeAt(COLS - 3, 1), holeAt(2, ROWS - 2), holeAt(COLS - 3, ROWS - 2)])
  })

  it('never name a hole twice, on the middle column, the middle row or the very middle', () => {
    const middle = holeAt(5, 3)
    expect(echoes(middle, 2)).toEqual([middle])
    expect(echoes(holeAt(5, 1), 2)).toEqual([holeAt(5, 1), holeAt(5, 5)])
    expect(echoes(holeAt(2, 3), 2)).toEqual([holeAt(2, 3), holeAt(8, 3)])
    for (let hole = 0; hole < HOLES; hole++) for (const mirror of [0, 1, 2] as Mirror[]) expect(new Set(echoes(hole, mirror)).size).toBe(echoes(hole, mirror).length)
  })

  it('are their own undoing: an echo of an echo is the hole again', () => {
    for (let hole = 0; hole < HOLES; hole++) for (const echo of echoes(hole, 2)) expect(echoes(echo, 2)).toContain(hole)
  })
})

describe('where the moth sits', () => {
  it('is beside every hole and on none: no peg and no hole is under the sitting moth', () => {
    for (let hole = 0; hole < HOLES; hole++) {
      const perch = perchOf(hole)
      for (let other = 0; other < HOLES; other++) {
        const at = centreOf(other)
        expect(Math.hypot(at.x - perch.x, at.y - perch.y), `the perch of hole ${hole} against hole ${other}`).toBeGreaterThanOrEqual(PEG_RADIUS + MOTH_RADIUS)
      }
      // It sits on the board's own ground, at a corner where cells meet.
      expect(perch.x).toBeGreaterThan(BOARD.x)
      expect(perch.x).toBeLessThan(BOARD.x + BOARD.width)
      expect(perch.y).toBeGreaterThan(BOARD.y)
      expect(perch.y).toBeLessThan(BOARD.y + BOARD.height)
    }
  })
})
