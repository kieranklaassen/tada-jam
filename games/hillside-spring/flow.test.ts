import { describe, expect, it } from 'vitest'
import { CENTRE, incomingSide, INTO_POND, LAND_OFF, LAND_PLOT, solveFlow } from './flow'
import { cellIndex, E, N, PLOTS, S, W } from './layout'
import type { Piece, PieceKind } from './pieces'

const piece = (kind: PieceKind, c: number, r: number, turn = 0, open = true): Piece => ({ kind, c, r, turn, open })
const plot = (kind: string) => PLOTS.find((p) => p.kind === kind)!.id

describe('solveFlow', () => {
  it('with nothing built, the spring runs straight down the middle into the pond', () => {
    const result = solveFlow([])
    expect(result.pondFlow).toBeCloseTo(1)
    expect(result.plotFlow.every((f) => f === 0)).toBe(true)
    const trickles = result.segments.filter((s) => s.kind === 'trickle')
    expect(trickles.map((s) => s.c)).toEqual([3, 3, 3, 3, 3])
    expect(result.segments.some((s) => s.kind === 'fall' && s.r === 4 && s.b === INTO_POND)).toBe(true)
  })

  it('a bend under the spring turns the water east, and it falls onto the sunflowers', () => {
    const result = solveFlow([piece('bend', 3, 0, 0)])
    expect(result.plotFlow[plot('sunflower')]).toBeCloseTo(1)
    expect(result.pondFlow).toBe(0)
  })

  it('the same bend turned to face west waters the cosmos instead', () => {
    const result = solveFlow([piece('bend', 3, 0, 3)])
    expect(result.plotFlow[plot('cosmos')]).toBeCloseTo(1)
    expect(result.plotFlow[plot('sunflower')]).toBe(0)
  })

  it('a split halves the flow both ways', () => {
    const result = solveFlow([piece('split', 3, 0, 0)])
    expect(result.plotFlow[plot('sunflower')]).toBeCloseTo(0.5)
    expect(result.plotFlow[plot('cosmos')]).toBeCloseTo(0.5)
  })

  it('water never climbs: a bend that only opens uphill from its entry spills where it is', () => {
    // Bend W–N at (4,0) fed from the west: its only other opening is uphill.
    const result = solveFlow([piece('bend', 3, 0, 0), piece('bend', 4, 0, 3)])
    const spill = result.segments.find((s) => s.kind === 'channel' && s.c === 4 && s.r === 0)
    expect(spill).toMatchObject({ a: W, b: CENTRE })
    expect(result.segments.some((s) => s.kind === 'drop' && s.c === 4 && s.r === 0)).toBe(true)
    expect(result.plotFlow[plot('sunflower')]).toBeCloseTo(1)
  })

  it('a pipe that does not face uphill lets falling water run under it', () => {
    const result = solveFlow([piece('straight', 3, 1, 1)])
    expect(result.pondFlow).toBeCloseTo(1)
    expect(result.segments.some((s) => s.kind === 'trickle' && s.c === 3 && s.r === 1)).toBe(true)
  })

  it('a run of pipe carries water across the slope to a far plot', () => {
    const result = solveFlow([piece('bend', 3, 0, 3), piece('straight', 2, 0, 1)])
    expect(result.plotFlow[plot('rice')]).toBeCloseTo(1)
    expect(result.plotFlow[plot('cosmos')]).toBe(0)
  })

  it('a split turned on its side sends water both along and down', () => {
    // Split E–S–W (turn 2 of N–E–W) fed from the west at (4,0): half goes on east and pours down column 5, half goes down.
    const result = solveFlow([piece('bend', 3, 0, 0), piece('split', 4, 0, 2)])
    expect(result.plotFlow[plot('sunflower')]).toBeCloseTo(0.5)
    expect(result.plotFlow[plot('pumpkin')]).toBeCloseTo(0.5)
  })

  it('a shut sluice spills the water where it stands; an open one lets it through', () => {
    const shut = solveFlow([piece('bend', 3, 0, 3), piece('sluice', 2, 0, 1, false)])
    expect(shut.plotFlow[plot('cosmos')]).toBeCloseTo(1)
    expect(shut.plotFlow[plot('rice')]).toBe(0)
    const open = solveFlow([piece('bend', 3, 0, 3), piece('sluice', 2, 0, 1, true)])
    expect(open.plotFlow[plot('rice')]).toBeCloseTo(1)
  })

  it('a waterwheel turns with the water through it and pours it out beneath', () => {
    const result = solveFlow([piece('wheel', 3, 1)])
    expect(result.wheelFlow.get(cellIndex(3, 1))).toBeCloseTo(1)
    expect(result.pondFlow).toBeCloseTo(1)
  })

  it('water poured off the edge of the hill is lost over the side', () => {
    const result = solveFlow([piece('bend', 3, 0, 0), piece('straight', 4, 0, 1), piece('straight', 5, 0, 1), piece('straight', 6, 0, 1)])
    expect(result.offGrid).toBeCloseTo(1)
    expect(result.segments.some((s) => s.kind === 'pourSide' && s.b === LAND_OFF)).toBe(true)
  })

  it('a pipe that pours straight into a plot waters it', () => {
    const result = solveFlow([piece('bend', 3, 2, 0)])
    expect(result.segments.some((s) => s.kind === 'pourSide' && s.b === LAND_PLOT)).toBe(true)
    expect(result.plotFlow[plot('sunflower')]).toBeCloseTo(1)
  })

  it('flows that meet add up', () => {
    // Split at (3,0) sends half each way; bends one row down bring both halves back to the middle.
    const result = solveFlow([piece('split', 3, 0, 0), piece('bend', 2, 1, 0), piece('bend', 4, 1, 3), piece('split', 3, 1, 2)])
    const merged = result.segments.filter((s) => s.kind === 'channel' && s.c === 3 && s.r === 1 && s.b !== CENTRE)
    expect(merged.reduce((sum, s) => sum + s.flow, 0)).toBeCloseTo(1)
    expect(result.pondFlow + result.plotFlow.reduce((a, b) => a + b, 0) + result.offGrid).toBeCloseTo(1)
  })

  it('conserves water whatever is built', () => {
    const kinds: PieceKind[] = ['bend', 'straight', 'split', 'sluice', 'wheel']
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let trial = 0; trial < 200; trial++) {
      const pieces: Piece[] = []
      for (let i = 0; i < 12; i++) {
        const c = Math.floor(rand() * 7)
        const r = Math.floor(rand() * 5)
        if (PLOTS.some((p) => p.c === c && p.r === r) || pieces.some((p) => p.c === c && p.r === r)) continue
        pieces.push(piece(kinds[Math.floor(rand() * kinds.length)], c, r, Math.floor(rand() * 4), rand() > 0.3))
      }
      const result = solveFlow(pieces)
      const total = result.pondFlow + result.offGrid + result.plotFlow.reduce((a, b) => a + b, 0)
      expect(total).toBeCloseTo(1, 6)
      for (const segment of result.segments) expect(segment.d1).toBeGreaterThan(segment.d0)
    }
  })

  it('knows which side water reaches a cell from', () => {
    expect(incomingSide(solveFlow([]), 3, 0)).toBe(N)
    expect(incomingSide(solveFlow([]), 3, 2)).toBe(N)
    expect(incomingSide(solveFlow([piece('bend', 3, 0, 0), piece('straight', 4, 0, 1)]), 5, 0)).toBe(W)
    expect(incomingSide(solveFlow([]), 0, 0)).toBe(null)
    expect([E, S]).not.toContain(incomingSide(solveFlow([]), 3, 1))
  })
})
