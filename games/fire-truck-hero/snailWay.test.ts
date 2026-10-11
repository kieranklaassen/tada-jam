import { describe, expect, it } from 'vitest'
import { COLS, MUD_AT, PUDDLE_AT, ROWS, cellAt, centreOf, dryGround, pour, type Ground } from './ground'
import { distance, type Place } from './layout'
import { ACROSS, WAY_CLEAR, WAY_MOST, snailWay } from './snailWay'

/** A patch in the middle of the yard, with nothing else about. */
const HOME: Place = { x: 8.0, z: 5.2 }

const cell = (col: number, row: number) => row * COLS + col
const wet = (ground: Ground, cells: readonly number[], gulps: number): Ground => cells.reduce((g, at) => pour(g, centreOf(at).x, centreOf(at).z, gulps), ground)
/** The way as cells of the yard. */
const cellsOf = (way: readonly Place[]) => way.map((point) => cellAt(HOME.x + point.x, HOME.z + point.z))

describe("the snail's way along the wet", () => {
  it('is the short way across its patch when the sand is dry', () => {
    expect(snailWay(dryGround(), HOME, [])).toEqual([ACROSS])
    expect(Math.hypot(ACROSS.x, ACROSS.z)).toBeLessThan(0.8)
  })

  it('follows a line the child drew, cell by cell, in the shape it was drawn', () => {
    // A line that starts beside the patch, runs right, and turns toward the child: an L.
    const line = [cell(9, 5), cell(10, 5), cell(11, 5), cell(11, 6), cell(11, 7)]
    const way = snailWay(wet(dryGround(), line, 1), HOME, [])
    expect(cellsOf(way)).toEqual(line)
  })

  it('follows a line drawn fast, which leaves a gap of one cell between its blots', () => {
    const line = [cell(9, 5), cell(11, 5), cell(13, 5)]
    expect(cellsOf(snailWay(wet(dryGround(), line, 1), HOME, []))).toEqual(line)
  })

  it('does not cross dry sand: a puddle that no wet joins to the patch is left alone', () => {
    const ground = wet(dryGround(), [cell(13, 5)], PUDDLE_AT)
    expect(snailWay(ground, HOME, [])).toEqual([ACROSS])
    // Joined by a damp line it is where the way ends.
    const joined = wet(ground, [cell(9, 5), cell(10, 5), cell(11, 5), cell(12, 5)], 1)
    const way = cellsOf(snailWay(joined, HOME, []))
    expect(way[way.length - 1]).toBe(cell(13, 5))
  })

  it('ends on the wettest place it reaches, and goes no further', () => {
    // Damp, damp, mud, damp: it stops in the mud.
    const ground = wet(wet(dryGround(), [cell(9, 5), cell(10, 5), cell(12, 5)], 1), [cell(11, 5)], MUD_AT)
    const way = cellsOf(snailWay(ground, HOME, []))
    expect(way).toEqual([cell(9, 5), cell(10, 5), cell(11, 5)])
  })

  it('goes to the far end of a line that is as wet all along', () => {
    const line = [cell(9, 5), cell(10, 5), cell(11, 5), cell(12, 5)]
    expect(cellsOf(snailWay(wet(dryGround(), line, 1), HOME, []))).toEqual(line)
  })

  it('begins only near the patch: wet sand further off is not joined to it', () => {
    expect(snailWay(wet(dryGround(), [cell(11, 5), cell(12, 5)], 1), HOME, [])).toEqual([ACROSS])
  })

  it('never goes back onto its own patch, however wet the patch is', () => {
    // The patch has had its fill, so the cell under it is the wettest in the yard.
    const line = [cell(9, 5), cell(10, 5), cell(11, 5)]
    const ground = wet(wet(dryGround(), [cellAt(HOME.x, HOME.z)], PUDDLE_AT), line, 1)
    expect(cellsOf(snailWay(ground, HOME, []))).toEqual(line)
    // With nothing wet but the patch itself it stays on it.
    expect(snailWay(wet(dryGround(), [cellAt(HOME.x, HOME.z)], MUD_AT), HOME, [])).toEqual([ACROSS])
  })

  it('never turns back on itself in a wide wet place', () => {
    const blot: number[] = []
    for (let col = 9; col <= 14; col++) for (let row = 3; row <= 7; row++) blot.push(cell(col, row))
    const way = snailWay(wet(dryGround(), blot, 1), HOME, [])
    expect(way.length).toBeGreaterThan(2)
    expect(new Set(cellsOf(way)).size).toBe(way.length)
    // No point of the way lies beside one it passed three or more steps before: it may round a corner, and never doubles back.
    way.forEach((point, index) => {
      for (const earlier of way.slice(0, Math.max(0, index - 2))) expect(Math.max(Math.abs(point.x - earlier.x), Math.abs(point.z - earlier.z))).toBeGreaterThan(1.5)
    })
  })

  it('is never longer than a glide of a few seconds allows', () => {
    const everywhere = Array.from({ length: COLS * ROWS }, (_, at) => at)
    for (const gulps of [1, PUDDLE_AT]) {
      const way = snailWay(wet(dryGround(), everywhere, gulps), HOME, [])
      expect(way.length).toBeLessThanOrEqual(WAY_MOST)
      expect(way.length).toBeGreaterThan(0)
    }
  })

  it('passes nothing nearer than a snail may, at any point or at the middle of any leg', () => {
    const everywhere = Array.from({ length: COLS * ROWS }, (_, at) => at)
    const ground = wet(dryGround(), everywhere, 1)
    for (const other of [{ x: 10.5, z: 5.5 }, { x: 11.5, z: 3.5 }, { x: 6.5, z: 7.5 }, { x: 9.8, z: 6.9 }]) {
      const way = snailWay(ground, HOME, [other])
      let from: Place = { x: 0, z: 0 }
      for (const point of way) {
        const at = { x: HOME.x + point.x, z: HOME.z + point.z }
        expect(distance(at, other)).toBeGreaterThan(WAY_CLEAR)
        expect(distance({ x: HOME.x + (from.x + point.x) / 2, z: HOME.z + (from.z + point.z) / 2 }, other)).toBeGreaterThan(WAY_CLEAR)
        from = point
      }
    }
  })

  it('takes a patch outside the yard, or a damaged ground, without harm', () => {
    expect(snailWay(dryGround(), { x: -3, z: 40 }, [])).toEqual([ACROSS])
    expect(snailWay([], HOME, [])).toEqual([ACROSS])
    expect(snailWay(new Array(COLS * ROWS).fill(Number.NaN), HOME, [])).toEqual([ACROSS])
  })
})
