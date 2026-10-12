import { describe, expect, it } from 'vitest'
import { WAVE_PERIOD, curlsOf } from './sceneryArt'
import { MEET } from './layout'
import { BELOW_FALL } from './placesArt'

// Lookalikes a reader found: a row of the water's lines must have no step to
// it, or it reads as a row of signs. What can be held as numbers is held
// here; the fall, the needles and the rest are held by the stills and listed
// under "Reader" in REFINEMENT.md.

describe('the water lines', () => {
  it('differ within a row in length, in gap and in curve: no two neighbours alike, and no exact step', () => {
    for (const far of [true, false]) {
      const rows = curlsOf(far)
      expect(rows.length).toBe(far ? 5 : 4)
      for (const curls of rows) {
        expect(curls.length).toBeGreaterThanOrEqual(3)
        // Round the period: the last curl's neighbour is the first of the next period.
        const steps = curls.map((curl, i) => (i + 1 < curls.length ? curls[i + 1][0] : curls[0][0] + WAVE_PERIOD) - curl[0])
        const gaps = curls.map((curl, i) => steps[i] - curl[1])
        for (let i = 0; i < curls.length; i++) {
          const next = curls[(i + 1) % curls.length]
          expect(Math.abs(curls[i][1] - next[1]) + Math.abs(curls[i][2] - next[2]) * 40 + Math.abs(curls[i][3] - next[3]) * 20, 'two neighbours').toBeGreaterThan(6)
          expect(gaps[i], 'a gap between two curls').toBeGreaterThan(12)
        }
        const spread = (values: number[]): number => Math.max(...values) - Math.min(...values)
        expect(spread(steps), 'the step from curl to curl').toBeGreaterThan(30)
        expect(spread(curls.map((curl) => curl[1])), 'the lengths').toBeGreaterThan(20)
        expect(spread(gaps), 'the gaps').toBeGreaterThan(10)
        expect(spread(curls.map((curl) => curl[2])), 'the height of the backs').toBeGreaterThan(0.15)
      }
      // No two rows are the same row.
      expect(new Set(rows.map((curls) => curls.map((curl) => Math.round(curl[0])).join(','))).size).toBe(rows.length)
    }
  })

  it('come round again only after a stretch far longer than any one curl', () => {
    for (const far of [true, false]) for (const curls of curlsOf(far)) for (const curl of curls) expect(WAVE_PERIOD).toBeGreaterThan(curl[1] * 3.5)
  })
})

describe('where two frames of the brook join', () => {
  it('the pool below the fall and the bank\'s face above it run out before the frame\'s downstream end: no edge stands in the water there', () => {
    for (const [name, points] of Object.entries(BELOW_FALL)) {
      const xs = points.filter((_, i) => i % 2 === 0)
      expect(Math.min(...xs), name).toBeGreaterThanOrEqual(60)
      expect(Math.max(...xs), name).toBeLessThanOrEqual(MEET.fall.at)
    }
  })
})
