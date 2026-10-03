import { describe, expect, it } from 'vitest'
import { BELL, NEAR_STRIP_FROM_Z, SPOTS, TRUCK, TRUCK_REACH, distance } from './layout'
import { NEST, NESTED_REACH, ROOF, placeOf, reachOf, targetAt } from './places'
import { gulpOn } from './world'
import { ARRANGEMENTS, layOut } from './yards'

const everyYard = Object.entries(ARRANGEMENTS).flatMap(([place, plans]) => plans.map((_, number) => layOut(place, number)))

describe('where a thing is', () => {
  it('is its spot for a thing that stands on one', () => {
    const yard = layOut('two-things', 0)
    yard.things.forEach((thing, index) => expect(placeOf(yard, index)).toEqual(SPOTS[thing.spot as number]))
  })

  it('is inside the pool for the boat, and on the boat for the cat who naps in it', () => {
    const yard = layOut('afloat', 2)
    const pool = placeOf(yard, 0), boat = placeOf(yard, 1), cat = placeOf(yard, 2)
    expect(distance(pool, boat)).toBeGreaterThan(0.3)
    expect(distance(pool, boat)).toBeLessThan(0.7)
    // The middle of the pool is the pool's own: a tap there fills the pool, not the boat.
    expect(targetAt(yard, pool.x, pool.z)).toEqual({ on: 'thing', index: 0 })
    expect(distance(boat, cat)).toBeLessThan(0.2)
  })

  it('is on the truck for the cat on the roof, and there she takes no water', () => {
    let yard = layOut('two-things', 0)
    for (let gulp = 0; gulp < 4; gulp++) yard = gulpOn(yard, 1).yard
    expect(yard.things[1].spot).toBe('roof')
    expect(placeOf(yard, 1)).toEqual(ROOF)
    expect(distance(ROOF, TRUCK)).toBeLessThan(TRUCK_REACH)
    expect(reachOf(yard, 1)).toBe(0)
  })

  it('is beside the pool, clear of the near strip, for a boat carried over the rim', () => {
    for (const yard of everyYard) {
      const boat = yard.things.findIndex((thing) => thing.kind === 'boat')
      if (boat < 0) continue
      let wet = yard
      for (let gulp = 0; gulp < 5; gulp++) wet = gulpOn(wet, 0).yard
      expect(wet.things[boat].in).toBeUndefined()
      const at = placeOf(wet, boat), pool = placeOf(wet, 0)
      expect(distance(at, pool)).toBeGreaterThan(1.7)
      expect(at.z).toBeLessThan(NEAR_STRIP_FROM_Z)
      // It lies on no other thing.
      wet.things.forEach((_, index) => {
        if (index !== boat && index !== 0 && wet.things[index].in === undefined) expect(distance(at, placeOf(wet, index))).toBeGreaterThan(1.8)
      })
    }
  })
})

describe('what a point of the yard is', () => {
  it('is the thing itself at the middle of every thing in every yard, or on its open side where it holds another', () => {
    for (const yard of everyYard) {
      yard.things.forEach((_, index) => {
        const at = placeOf(yard, index)
        const holds = yard.things.some((other) => other.in === index)
        // What is in a thing lies toward +x, so its -x side is its own.
        const x = holds ? at.x - (yard.things[index].kind === 'pool' ? 0.4 : 0.42) : at.x
        expect(targetAt(yard, x, at.z)).toEqual({ on: 'thing', index })
      })
    }
  })

  it('is the smallest thing that holds the point: the cat, then the boat, then the pool', () => {
    const yard = layOut('afloat', 2)
    const pool = placeOf(yard, 0), boat = placeOf(yard, 1)
    expect(targetAt(yard, boat.x + NEST.catInBoat.x, boat.z)).toEqual({ on: 'thing', index: 2 })
    expect(targetAt(yard, boat.x + NESTED_REACH.cat + 0.1, boat.z)).toEqual({ on: 'thing', index: 1 })
    expect(targetAt(yard, pool.x - 0.8, pool.z)).toEqual({ on: 'thing', index: 0 })
  })

  it('is the truck on the truck, the bell under the bell, and open ground elsewhere', () => {
    const yard = layOut('one-thing', 0)
    expect(targetAt(yard, TRUCK.x, TRUCK.z)).toEqual({ on: 'truck' })
    expect(targetAt(yard, BELL.x, BELL.z)).toEqual({ on: 'bell' })
    expect(targetAt(yard, 12, 8)).toEqual({ on: 'ground' })
    // A spot with nothing on it is open ground too.
    expect(targetAt(yard, SPOTS[4].x, SPOTS[4].z)).toEqual({ on: 'ground' })
  })

  it('answers for any point, also far outside the yard', () => {
    const yard = layOut('whole-garden', 0)
    expect(targetAt(yard, -50, 99)).toEqual({ on: 'ground' })
    expect(targetAt(yard, Number.NaN, 0)).toEqual({ on: 'ground' })
  })
})
