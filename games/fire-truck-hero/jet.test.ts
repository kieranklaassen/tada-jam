import { describe, expect, it } from 'vitest'
import { COLS, ROWS } from './ground'
import { LONGEST_FLIGHT_S, SHORTEST_FLIGHT_S, apexOf, arcTo, flightSeconds, nozzleFor, pointOn } from './jet'
import { NOZZLE } from './layout'

const corners = [
  { x: 0.2, z: 0.2 },
  { x: COLS - 0.2, z: 0.2 },
  { x: 0.2, z: ROWS - 0.2 },
  { x: COLS - 0.2, z: ROWS - 0.2 },
]

describe('the arc of a gulp', () => {
  it('starts at the nozzle and ends on the ground where it was sent', () => {
    for (const to of [...corners, { x: 8, z: 5 }, { x: NOZZLE.x + 0.3, z: NOZZLE.z }]) {
      const arc = arcTo(NOZZLE, to)
      expect(pointOn(arc, 0)).toEqual({ x: NOZZLE.x, y: NOZZLE.y, z: NOZZLE.z })
      const end = pointOn(arc, arc.seconds)
      expect(end.x).toBeCloseTo(to.x, 6)
      expect(end.z).toBeCloseTo(to.z, 6)
      expect(end.y).toBeCloseTo(0, 6)
    }
  })

  it('reaches every corner of the yard within a third of a second or so', () => {
    for (const to of corners) {
      const arc = arcTo(NOZZLE, to)
      expect(arc.seconds).toBeGreaterThanOrEqual(SHORTEST_FLIGHT_S)
      expect(arc.seconds).toBeLessThanOrEqual(LONGEST_FLIGHT_S)
    }
    expect(LONGEST_FLIGHT_S).toBeLessThanOrEqual(0.35)
  })

  it('takes longer the farther it goes, up to the longest flight', () => {
    expect(flightSeconds(0)).toBe(SHORTEST_FLIGHT_S)
    expect(flightSeconds(6)).toBeGreaterThan(flightSeconds(2))
    expect(flightSeconds(1000)).toBe(LONGEST_FLIGHT_S)
  })

  it('stays above the ground all the way and never goes far overhead', () => {
    for (const to of [...corners, { x: 8, z: 5 }]) {
      const arc = arcTo(NOZZLE, to)
      for (let step = 1; step < 20; step++) expect(pointOn(arc, (arc.seconds * step) / 20).y).toBeGreaterThan(0)
      expect(apexOf(arc)).toBeLessThan(NOZZLE.y + 1.5)
      for (let step = 0; step <= 20; step++) expect(pointOn(arc, (arc.seconds * step) / 20).y).toBeLessThanOrEqual(apexOf(arc) + 1e-9)
      expect(apexOf(arc)).toBeGreaterThanOrEqual(NOZZLE.y)
    }
  })

  it('holds still before the start and after the end', () => {
    const arc = arcTo(NOZZLE, { x: 9, z: 3 })
    expect(pointOn(arc, -1)).toEqual(pointOn(arc, 0))
    expect(pointOn(arc, 99)).toEqual(pointOn(arc, arc.seconds))
  })

  it('writes into the point it is given, so the view makes no new ones', () => {
    const out = { x: 0, y: 0, z: 0 }
    expect(pointOn(arcTo(NOZZLE, { x: 9, z: 3 }), 0.1, out)).toBe(out)
  })

  it('points the nozzle the way the water goes', () => {
    const right = nozzleFor(arcTo(NOZZLE, { x: NOZZLE.x + 8, z: NOZZLE.z }))
    expect(right.turn).toBeCloseTo(0, 6)
    const near = nozzleFor(arcTo(NOZZLE, { x: NOZZLE.x, z: NOZZLE.z + 3 }))
    expect(near.turn).toBeCloseTo(Math.PI / 2, 6)
    // A near target is lobbed up steeply and a far one thrown flatter.
    expect(right.tilt).toBeLessThan(near.tilt)
    expect(right.tilt).toBeGreaterThan(0)
    expect(Number.isFinite(nozzleFor(arcTo(NOZZLE, { x: NOZZLE.x, z: NOZZLE.z })).tilt)).toBe(true)
  })
})
