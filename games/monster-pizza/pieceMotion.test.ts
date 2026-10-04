import { describe, expect, it } from 'vitest'
import { KINDS, LOOKS, SOFT } from './kinds'
import { OLIVE_ROLLS, PEPPER_SKIDS, bakingMove, landing, rollsIn, type PieceMove } from './pieceMotion'

const flat = (m: PieceMove): number[] => [m.turn * 3, m.hop / 8, m.wide * 8, m.tall * 8, m.roll / 8, m.shine, m.steam, m.soft]

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

  it('rolls an olive a finger-width to its spot and stops it there, and skids a pepper a little', () => {
    expect(OLIVE_ROLLS).toBeGreaterThanOrEqual(12)
    expect(OLIVE_ROLLS).toBeLessThanOrEqual(24)
    // It comes down that far short, so the roll starts where the flight ended.
    expect(landing('olive', 0, 0).roll).toBe(-rollsIn('olive'))
    let last = -Infinity
    for (let age = 0; age <= 0.5; age += 1 / 60) {
      const roll = landing('olive', 0, age).roll
      expect(roll).toBeGreaterThanOrEqual(last)
      last = roll
    }
    expect(Math.abs(landing('olive', 0, 0.4).roll)).toBe(0)
    expect(Math.abs(landing('olive', 0, 0.4).turn)).toBe(0)
    // It turns as it rolls.
    expect(Math.abs(landing('olive', 0, 0.05).turn)).toBeGreaterThan(0.5)
    // A pepper skids a little and stops, without rolling over; nothing else moves off its spot.
    expect(landing('pepper', 0, 0).roll).toBe(-PEPPER_SKIDS)
    expect(PEPPER_SKIDS).toBeLessThan(OLIVE_ROLLS / 2)
    expect(Math.abs(landing('pepper', 0, 0).turn)).toBe(0)
    expect(Math.abs(landing('pepper', 0, 0.4).roll)).toBe(0)
    for (const kind of KINDS) if (kind !== 'olive' && kind !== 'pepper') for (const age of [0, 0.1, 1]) expect(Math.abs(landing(kind, 0.5, age).roll), kind).toBe(0)
  })

  it('curls the worm up and softens the cheese\'s corners for their baking move: each goes into another outline and springs back', () => {
    for (const kind of ['worm', 'cheese'] as const) {
      expect(bakingMove(kind, 0.5).soft).toBeGreaterThan(0.9)
      for (const u of [0, 1]) expect(bakingMove(kind, u).soft).toBeLessThan(1e-9)
      // The soft outline is another shape, not the same one turned or squashed, and fits the same circle.
      const own = LOOKS[kind].ring, soft = SOFT[kind]!
      expect(soft.length).not.toBe(own.length)
      for (let i = 0; i < soft.length; i += 2) expect(Math.hypot(soft[i], soft[i + 1])).toBeLessThanOrEqual(1.2)
    }
    // The cheese's soft outline has no thin tip: its narrowest reach from the middle is more than the wedge's.
    const reach = (ring: readonly number[]) => { let least = Infinity; for (let i = 0; i < ring.length; i += 2) least = Math.min(least, Math.hypot(ring[i], ring[i + 1])); return least }
    expect(reach(SOFT.cheese!)).toBeGreaterThan(reach(LOOKS.cheese.ring))
    for (const kind of KINDS) if (kind !== 'worm' && kind !== 'cheese') expect(bakingMove(kind, 0.5).soft, kind).toBe(0)
  })

  it('makes a baked olive glisten and a baked sock steam, as the pizza slides out and not after', () => {
    expect(bakingMove('olive', 0.5).shine).toBeGreaterThan(0.9)
    expect(bakingMove('sock', 0.5).steam).toBeGreaterThan(0.9)
    for (const u of [0, 1]) {
      expect(bakingMove('olive', u).shine).toBeLessThan(1e-9)
      expect(bakingMove('sock', u).steam).toBeLessThan(1e-9)
    }
    for (const kind of KINDS) {
      if (kind !== 'olive') expect(bakingMove(kind, 0.5).shine, kind).toBe(0)
      if (kind !== 'sock') expect(bakingMove(kind, 0.5).steam, kind).toBe(0)
    }
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
