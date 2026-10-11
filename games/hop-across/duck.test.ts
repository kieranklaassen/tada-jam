import { describe, expect, it } from 'vitest'
import { ROWS, faults, type Pawn } from './board'
import { LADDER } from './config'
import { LAYOUTS, THINGS, layout } from './crossing'
import { duckShow, type DuckEnd } from './duck'
import { boardLanes } from './solver'

const HOME: Pawn[] = [2, 3, 4, 5].map((r) => ({ c: 0, r, flat: false, on: null, dry: { c: 0, r } }))
const ENDS: Record<string, DuckEnd> = { cars: 'flat', lorry: 'arch', logs: 'edge', turtle: 'sunk', bell: 'train' }

describe('the duck goes first', () => {
  it('has a showing of the new thing in every layout of the position that brings it, and the thing does to the duck what it does', () => {
    for (const thing of THINGS) {
      for (let which = 0; which < LAYOUTS; which++) {
        const lanes = boardLanes(layout(thing, which))
        const show = duckShow(lanes, THINGS.slice(0, THINGS.indexOf(thing)), HOME)
        const label = `${thing}, layout ${which}`
        expect(show, label).not.toBeNull()
        expect(show!.thing, label).toBe(thing)
        expect(show!.end, label).toBe(ENDS[thing])
        expect(show!.steps.length, label).toBeGreaterThanOrEqual(3)
        expect(show!.steps.length, label).toBeLessThanOrEqual(4)
        // A car flattens it in the lane of the cars, never a lorry.
        if (thing === 'cars') expect(show!.by, label).toBe('car')
        for (const step of show!.steps) {
          expect(step.r, label).toBeGreaterThanOrEqual(0)
          expect(step.r, label).toBeLessThan(ROWS)
          // The lane after each of its steps is one the board could hold.
          expect(faults({ lanes: lanes.map((lane, c) => (c === show!.col ? step.lane : lane)), family: HOME }), label).toEqual([])
        }
      }
    }
  })

  it('shows nothing that has been shown, and nothing in a lane where one of the family stands', () => {
    for (const position of LADDER) {
      for (let which = 0; which < LAYOUTS; which += 5) {
        const lanes = boardLanes(layout(position, which))
        expect(duckShow(lanes, THINGS, HOME)).toBeNull()
        const show = duckShow(lanes, [], HOME)
        if (!show) continue
        const there: Pawn[] = HOME.map((pawn, who) => (who === 0 ? { ...pawn, c: show.col, r: show.steps[0].r } : pawn))
        const other = duckShow(lanes, [], there)
        if (other) expect(other.col).not.toBe(show.col)
      }
    }
  })
})
