import { describe, expect, it } from 'vitest'
import { LANES, LANE_WIDTH, LENGTH, PLACES, START, STEP, STEPS, TRAIL_HALF, laneX, offset, shownAt, wrap } from './trail'

describe('the trail', () => {
  it('is a ring of whole steps with three lanes inside its width', () => {
    expect(LENGTH).toBe(STEP * STEPS)
    expect(LANES).toEqual([0, 1, 2])
    expect(LANES.map(laneX)).toEqual([-LANE_WIDTH, 0, LANE_WIDTH])
    expect(TRAIL_HALF).toBeGreaterThan(laneX(2) + LANE_WIDTH / 2)
  })

  it('wraps a place into the ring', () => {
    expect(wrap(0)).toBe(0)
    expect(wrap(LENGTH)).toBe(0)
    expect(wrap(-1)).toBe(LENGTH - 1)
    expect(wrap(LENGTH * 3 + 7)).toBe(7)
  })

  it('measures the shorter way round, ahead and behind', () => {
    expect(offset(10, 30)).toBe(20)
    expect(offset(30, 10)).toBe(-20)
    expect(offset(LENGTH - 10, 10)).toBe(20)
    expect(offset(10, LENGTH - 10)).toBe(-20)
  })

  it('draws a thing ahead as far as the reach and behind beyond it', () => {
    expect(shownAt(100, 400, 600)).toBe(300)
    expect(shownAt(100, 60, 600)).toBe(-40)
    expect(shownAt(LENGTH - 50, 100, 600)).toBe(150)
    expect(shownAt(0, 700, 600)).toBe(700 - LENGTH)
  })

  it('keeps the six obstacles of the sheet at whole steps, in order, ten steps apart, with the clearing where the ends meet', () => {
    const along = [PLACES.stream, PLACES.branch, PLACES.mud, PLACES.brambles, PLACES.goose, PLACES.log]
    for (const place of along) expect(place % STEP).toBe(0)
    for (let i = 1; i < along.length; i++) expect(along[i] - along[i - 1]).toBe(10 * STEP)
    expect(offset(PLACES.handOver, PLACES.shelf)).toBe(STEP)
    expect(START).toEqual({ at: PLACES.shelf, lane: 1 })
  })
})
