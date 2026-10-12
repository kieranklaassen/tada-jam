import { describe, expect, it } from 'vitest'
import { EDGING, LINE_MARKS, TRAIL_TILE, TRAIL_WIDE, lineAt, trailBead } from './trailBeads'
import { LANE_WIDTH, STEP } from './trail'

// The lane lines are beads seen down their holes: rings. This holds that no
// two of them ever make a figure that could be read.

describe('the beads the trail is laid in', () => {
  /** Whether the bead at a peg stands out from the sand: a bead of a lane line or of a seam. */
  const marked = (x: number, y: number): boolean => x >= EDGING && x < TRAIL_WIDE - EDGING && trailBead(x, y) !== 't'

  it('marks the lanes with single beads: none has another bead of a line or of a seam beside it, over it, under it or cornerwise, so no two rings stand as a pair', () => {
    let beads = 0
    // Two tiles, so the place where the picture repeats is looked at too.
    for (let y = 0; y < TRAIL_TILE * 2; y++) {
      for (let x = EDGING; x < TRAIL_WIDE - EDGING; x++) {
        if (lineAt(x, y) < 0) continue
        beads += 1
        expect(y % STEP, `a bead of a line in a seam at ${x}, ${y}`).not.toBe(0)
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            expect(marked(x + dx, y + dy), `the bead at ${x}, ${y} has one at ${x + dx}, ${y + dy}`).toBe(false)
          }
        }
      }
    }
    expect(beads).toBe(LINE_MARKS.flat().length * 2)
  })

  it('lays each line at uneven steps, on both sides of the seam between two lanes, and the two lines differently', () => {
    LINE_MARKS.forEach((marks, line) => {
      const steps = marks.map((at, i) => (marks[(i + 1) % marks.length] - at + TRAIL_TILE) % TRAIL_TILE)
      expect(new Set(steps).size, `line ${line}`).toBeGreaterThanOrEqual(3)
      for (const step of steps) expect(step, `line ${line}`).toBeGreaterThanOrEqual(3)
      // Close enough together to be seen as a line down the trail.
      expect(marks.length, `line ${line}`).toBeGreaterThanOrEqual(8)
      const columns = new Set<number>()
      for (const y of marks) for (let x = 0; x < TRAIL_WIDE; x++) if (lineAt(x, y) === line) columns.add(x - EDGING)
      expect([...columns].sort((a, b) => a - b)).toEqual([LANE_WIDTH * (line + 1) - 1, LANE_WIDTH * (line + 1)])
    })
    expect(LINE_MARKS[0]).not.toEqual(LINE_MARKS[1])
    expect(LINE_MARKS[0].some((at) => LINE_MARKS[1].includes(at))).toBe(false)
  })

  it('keeps the trail plain: sand everywhere else, a seam across at every step and an edging down each side', () => {
    let sand = 0, all = 0
    for (let y = 0; y < TRAIL_TILE; y++) {
      for (let x = 0; x < TRAIL_WIDE; x++) {
        all += 1
        const bead = trailBead(x, y)
        if (bead === 't') sand += 1
        if (x < EDGING || x >= TRAIL_WIDE - EDGING) expect(['B', 'D']).toContain(bead)
        else if (y % STEP === 0) expect(bead).toBe('T')
      }
    }
    expect(sand / all).toBeGreaterThan(0.8)
  })
})
