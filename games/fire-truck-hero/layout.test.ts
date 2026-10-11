import { describe, expect, it } from 'vitest'
import { COLS, ROWS } from './ground'
import { BELL, BELL_REACH, GATE, LEAST_GAP, NEAR_STRIP_FROM_Z, NOZZLE, SPOTS, THING_REACH, TRUCK, TRUCK_REACH, aimAt, distance } from './layout'

const places = [TRUCK, ...SPOTS, BELL]

describe('the places of a yard', () => {
  it('has five spots for things, which is the most a yard holds', () => {
    expect(SPOTS).toHaveLength(5)
  })

  it('keeps every place inside the yard and out of the near strip', () => {
    for (const place of places) {
      expect(place.x).toBeGreaterThan(1)
      expect(place.x).toBeLessThan(COLS - 0.5)
      expect(place.z).toBeGreaterThan(0)
      expect(place.z).toBeLessThan(NEAR_STRIP_FROM_Z)
    }
    // Things stand clear of the far fence. Only the bell is at it, on the gate.
    for (const place of [TRUCK, ...SPOTS]) expect(place.z).toBeGreaterThan(1.5)
    expect(NEAR_STRIP_FROM_Z).toBeLessThan(ROWS)
  })

  it('stands every place well apart from every other', () => {
    for (let a = 0; a < places.length; a++) {
      for (let b = a + 1; b < places.length; b++) expect(distance(places[a], places[b])).toBeGreaterThanOrEqual(LEAST_GAP)
    }
  })

  it('never lets two reaches overlap, so a touch belongs to one thing', () => {
    for (let a = 0; a < SPOTS.length; a++) {
      for (let b = a + 1; b < SPOTS.length; b++) expect(distance(SPOTS[a], SPOTS[b])).toBeGreaterThan(2 * THING_REACH)
      expect(distance(SPOTS[a], TRUCK)).toBeGreaterThan(THING_REACH + TRUCK_REACH)
      expect(distance(SPOTS[a], BELL)).toBeGreaterThan(THING_REACH + BELL_REACH)
    }
  })

  it('puts the nozzle on the truck', () => {
    expect(distance(NOZZLE, TRUCK)).toBeLessThan(TRUCK_REACH)
    expect(NOZZLE.y).toBeGreaterThan(1)
  })
})

describe('the way on', () => {
  it('lies straight ahead of the truck and crosses no spot', () => {
    expect(GATE.x).toBe(TRUCK.x)
    // The truck is about three units wide. Nothing stands within its lane up to the gate.
    for (const spot of SPOTS) expect(Math.abs(spot.x - GATE.x)).toBeGreaterThan(1.5 + THING_REACH)
    expect(GATE.half).toBeGreaterThan(1.5)
  })

  it('hangs the bell beside the gate and out of the truck\'s lane', () => {
    expect(BELL.x).toBeGreaterThan(GATE.x + GATE.half)
    expect(BELL.x - GATE.x).toBeLessThan(GATE.half + 1)
  })
})

describe('what a point of the yard is', () => {
  it('is the truck on the truck', () => {
    expect(aimAt(TRUCK)).toEqual({ on: 'truck' })
    expect(aimAt({ x: TRUCK.x + TRUCK_REACH - 0.01, z: TRUCK.z })).toEqual({ on: 'truck' })
  })

  it('is a spot anywhere within its reach, and generous about it', () => {
    SPOTS.forEach((spot, index) => {
      expect(aimAt(spot)).toEqual({ on: 'spot', spot: index })
      expect(aimAt({ x: spot.x + THING_REACH - 0.01, z: spot.z })).toEqual({ on: 'spot', spot: index })
      expect(aimAt({ x: spot.x, z: spot.z - THING_REACH + 0.01 })).toEqual({ on: 'spot', spot: index })
    })
  })

  it('is the bell on the gate post', () => {
    expect(aimAt(BELL)).toEqual({ on: 'bell' })
  })

  it('is open ground everywhere else, so every touch is answered by something', () => {
    expect(aimAt({ x: 4.6, z: 8.8 })).toEqual({ on: 'ground' })
    expect(aimAt({ x: 8.1, z: 4.3 })).toEqual({ on: 'ground' })
    expect(aimAt({ x: -5, z: 40 })).toEqual({ on: 'ground' })
  })
})
