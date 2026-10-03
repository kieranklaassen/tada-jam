import { describe, expect, it } from 'vitest'
import { KINDS } from './kinds'
import { bakingMove, landing, type PieceMove } from './pieceMotion'

const flat = (m: PieceMove): number[] => [m.turn * 3, m.hop / 8, m.wide * 8, m.tall * 8]

function curve(at: (u: number) => PieceMove): number[] {
  const out: number[] = []
  for (let i = 1; i < 16; i++) out.push(...flat(at(i / 16)))
  return out
}

function apart(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0) / a.length)
}

describe('how a piece moves', () => {
  it('gives every kind a baking move of its own', () => {
    const curves = KINDS.map((kind) => curve((u) => bakingMove(kind, u)))
    for (let a = 0; a < curves.length; a++) for (let b = a + 1; b < curves.length; b++) expect(apart(curves[a], curves[b]), `${KINDS[a]} and ${KINDS[b]}`).toBeGreaterThan(0.1)
  })

  it('gives every kind a landing of its own', () => {
    const moves = KINDS.map((kind) => flat(landing(kind, 1)))
    for (let a = 0; a < moves.length; a++) for (let b = a + 1; b < moves.length; b++) expect(apart(moves[a], moves[b]), `${KINDS[a]} and ${KINDS[b]}`).toBeGreaterThan(0.04)
  })

  it('leaves every piece exactly as it was: no move at rest, none when the baking move is over, and never a different size for good', () => {
    for (const kind of KINDS) {
      for (const v of flat(landing(kind, 0))) expect(Math.abs(v)).toBe(0)
      for (const u of [0, 1]) for (const v of flat(bakingMove(kind, u))) expect(Math.abs(v), `${kind} at ${u}`).toBeLessThan(1e-9)
      // While it plays it stays a piece: never less than three quarters of its size, never more than a quarter over.
      for (let i = 0; i <= 40; i++) {
        const m = bakingMove(kind, i / 40)
        for (const grow of [m.wide, m.tall]) {
          expect(grow).toBeGreaterThan(-0.25)
          expect(grow).toBeLessThan(0.25)
        }
      }
    }
  })
})
