import { describe, expect, it } from 'vitest'
import { CROSSINGS, part } from './bridges.fixture'
import { run, type Ride } from './run'
import { site, type VehicleId } from './sites'
import { TASTE, VEHICLES, bargeReaction, chiefReaction, reaction, trainOf, trolleyTrain } from './vehicles'

const ride = (over: Partial<Ride> = {}): Ride => ({ dip: 0, dipAt: 0, kink: 0, slope: 0, low: [[], [], [], []], blocked: [], held: [4, 4], ...over })
const ids = Object.keys(VEHICLES) as VehicleId[]

describe('the characters and their fixed tastes', () => {
  it('every vehicle shares its crates between its axles, half-cells apart', () => {
    for (const id of ids) {
      const train = trainOf(VEHICLES[id])
      expect(train.reduce((sum, axle) => sum + axle.weight, 0)).toBeCloseTo(VEHICLES[id].crates)
      for (const axle of train) expect(Number.isInteger(axle.behind * 2)).toBe(true)
    }
    expect(trolleyTrain(0)[0].weight).toBe(1)
    expect(trolleyTrain(9)[0].weight).toBe(6)
  })

  it('each has a like and a dislike that a bridge can cause, and they never change', () => {
    const cases: [VehicleId, Ride, string, Ride, string][] = [
      ['post-van', ride({ dip: TASTE.van.level / 2 }), 'parcels-stand', ride({ dip: 2 * TASTE.van.deep }), 'parcels-slide'],
      ['jelly-truck', ride({ dip: 2 * TASTE.jelly.soft }), 'jelly-rolls', ride({ dip: 2 * TASTE.jelly.soft, kink: 2 * TASTE.jelly.kink }), 'jelly-jumps'],
      ['piano-mover', ride({ slope: TASTE.piano.level / 2 }), 'keys-ripple', ride({ slope: 2 * TASTE.piano.steep }), 'piano-rolls-back'],
      ['giraffe-bus', ride(), 'necks-stretch', ride({ low: [[], [], [3, 5], [3, 5]] }), 'necks-duck'],
      ['caterpillar-bus', ride({ held: [3, 3, 3] }), 'hums-a-scale', ride({ held: [2, 4, 3] }), 'loses-step'],
    ]
    const acts = new Set<string>()
    for (const [id, liked, likeAct, disliked, dislikeAct] of cases) {
      expect(reaction(id, liked)).toMatchObject({ mood: 'like', act: likeAct })
      expect(reaction(id, disliked)).toMatchObject({ mood: 'dislike', act: dislikeAct })
      expect(reaction(id, liked)).toEqual(reaction(id, liked))
      acts.add(likeAct); acts.add(dislikeAct)
    }
    // No two characters share a piece of acting.
    expect(acts.size).toBe(2 * cases.length)
    expect(cases.map(([id]) => id).sort()).toEqual([...ids].sort())
  })

  it('a dislike is about the bridge: the hats hang on the parts that knocked them off', () => {
    expect(reaction('giraffe-bus', ride({ low: [[], [], [3, 5], [3, 5]] })).parts).toEqual([3, 5])
    expect(bargeReaction(ride({ blocked: [2] }))).toMatchObject({ mood: 'dislike', act: 'scrapes-past', parts: [2] })
    expect(bargeReaction(ride())).toMatchObject({ mood: 'like', act: 'toots' })
    expect(chiefReaction({ closedTriangle: true, folded: false })).toMatchObject({ mood: 'like', act: 'taps-and-listens' })
    expect(chiefReaction({ closedTriangle: true, folded: true })).toMatchObject({ mood: 'dislike' })
    expect(chiefReaction({ closedTriangle: false, folded: false })).toBeNull()
  })

  it('more of the cause gives more of the reaction, and never more than all of it', () => {
    const shallow = reaction('post-van', ride({ dip: 1.2 * TASTE.van.deep })), deep = reaction('post-van', ride({ dip: 2.5 * TASTE.van.deep }))
    expect(deep.amount).toBeGreaterThan(shallow.amount)
    expect(reaction('post-van', ride({ dip: 99 })).amount).toBe(1)
    expect(reaction('piano-mover', ride({ slope: 99 })).amount).toBe(1)
  })

  it('opposite tastes: one bridge that the van likes bores the jelly, and one the jelly likes spills the van', () => {
    const gap = site('plank-gap', 1)
    const stiff = run(gap, [part('plank', 10, 6, 13, 6, true)], trainOf(VEHICLES['post-van'])).ride
    expect(reaction('post-van', stiff).mood).toBe('like')
    expect(reaction('jelly-truck', stiff).act).toBe('driver-yawns')
    const soft = run(site('high-thread', 0), CROSSINGS['high-thread'], trainOf(VEHICLES['jelly-truck'])).ride
    expect(reaction('jelly-truck', soft).mood).toBe('like')
    expect(reaction('post-van', soft).mood).toBe('dislike')
  })

  it('the bus that needs headroom dislikes the stays overhead and likes the same gap braced from below', () => {
    const at = site('tall-bus', 0), bus = trainOf(VEHICLES['giraffe-bus'])
    expect(reaction('giraffe-bus', run(at, CROSSINGS['high-thread'], bus).ride)).toMatchObject({ mood: 'dislike', parts: [2, 3] })
    expect(reaction('giraffe-bus', run(at, CROSSINGS['tall-bus'], bus).ride).mood).toBe('like')
  })
})
