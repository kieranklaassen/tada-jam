import { describe, expect, it } from 'vitest'
import { CLOTH_COL, COLS, NEXT_COL, ROWS, isSeat, moverOn } from './board'
import { HOPS, RIGHT, playUntil, visitAt } from './careful'
import { LADDER } from './config'
import { hop } from './play'
import { below, makeRng } from './rng'
import { boardOf, type Saved } from './save'
import { emptyShare, sceneryOf } from './scenery'

const taken = (saved: Saved) => {
  const board = boardOf(saved)
  return (c: number, r: number) => board.family.some((pawn) => pawn.c === c && pawn.r === r) || moverOn(board.lanes[c], r) !== null
}

describe('what stands still in the frame', () => {
  it('is the same on every hop of a crossing, whatever moves', () => {
    for (const position of ['cars', 'turtle', 'all']) {
      const rng = makeRng(9)
      let saved = visitAt(position, 4)
      const first = sceneryOf(saved)
      for (let n = 0; n < 60; n++) {
        const turn = hop(saved, HOPS[below(rng, HOPS.length)])
        if (turn.slide) break
        saved = turn.saved
        expect(sceneryOf(saved)).toEqual(first)
      }
    }
  })

  it('comes along when the board slides: the cloth is the same as the home bank, and the lane beyond it the same as the first lane', () => {
    for (const position of ['cars', 'logs', 'bell']) {
      const reached = playUntil(visitAt(position, 1), (turn) => turn.saved.family[0].c === CLOTH_COL)!
      const before = sceneryOf(reached.turn.saved)
      const turn = hop(reached.turn.saved, RIGHT)
      expect(turn.slide).not.toBeNull()
      const after = sceneryOf(turn.saved)
      expect(after.columns[0]).toEqual(before.columns[CLOTH_COL])
      expect(after.columns[NEXT_COL - CLOTH_COL]).toEqual(before.columns[NEXT_COL])
    }
  })

  it('keeps the middle of every square plain: at most two prints, each in a corner, and none where a seat, a plate or a zebra lies', () => {
    for (const position of LADDER) {
      for (let seed = 1; seed <= 6; seed++) {
        const scenery = sceneryOf(visitAt(position, seed))
        expect(scenery.columns).toHaveLength(COLS)
        scenery.columns.forEach((column, c) => {
          for (let r = 0; r < ROWS; r++) {
            const here = column.prints.filter((print) => print.r === r)
            expect(here.length).toBeLessThanOrEqual(2)
            if (r === column.plate || r === column.zebra || (isSeat(c, r) && (column.kind === 'cloth' || column.kind === 'bank'))) expect(here).toEqual([])
            for (const print of here) {
              expect(Math.abs(print.dx)).toBeGreaterThanOrEqual(0.6)
              expect(Math.abs(print.dy)).toBeGreaterThanOrEqual(0.6)
              expect(Math.abs(print.dx)).toBeLessThanOrEqual(0.8)
              expect(Math.abs(print.dy)).toBeLessThanOrEqual(0.8)
            }
            if (here.length === 2) expect(Math.sign(here[0].dx) * Math.sign(here[0].dy)).toBe(Math.sign(here[1].dx) * Math.sign(here[1].dy))
          }
        })
      }
    }
  })

  it('never stands the same onlooker at the ends of two lanes side by side', () => {
    for (const position of LADDER) {
      for (let seed = 1; seed <= 6; seed++) {
        const { columns } = sceneryOf(visitAt(position, seed))
        for (let c = 1; c < CLOTH_COL - 1; c++) {
          if (columns[c].kind === 'grass' && columns[c + 1].kind === 'grass') expect(columns[c].far).not.toBe(columns[c + 1].far)
        }
      }
    }
  })

  it('leaves less than a third of the squares with nothing of their own on any first board, and about a sixth on most', () => {
    const shares: number[] = []
    for (const position of LADDER) for (let seed = 1; seed <= 12; seed++) shares.push(emptyShare(sceneryOf(visitAt(position, seed)), taken(visitAt(position, seed))))
    expect(Math.max(...shares)).toBeLessThan(1 / 3)
    expect(shares.reduce((sum, share) => sum + share, 0) / shares.length).toBeLessThan(0.2)
  })
})
