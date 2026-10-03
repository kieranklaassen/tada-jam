// The work of the heaviest moment, counted. The stage keeps to a budget of
// under about 80 draw calls a frame, with no shadow maps and no post pass. It
// can do so because everything that comes in numbers is drawn in one call for
// the whole set (the drops, the puffs of steam, the ripples) and every set has
// a fixed most, and because a yard holds at most five things and never two of
// one kind, so the stage keeps one model of each kind.
//
// No clock is read here and no milliseconds are measured. This test counts
// what the pure modules can count: how many drops, puffs and rings are alive,
// how many slots a step looks at, and how many things stand in a yard. The
// renderer's own counts (draw calls, triangles, frame time) are read on a real
// device by the shared probe, which is where they can be true.

import { describe, expect, it } from 'vitest'
import { CAPACITY, Drops } from './drops'
import { arcTo } from './jet'
import { NOZZLE } from './layout'
import { placeOf } from './places'
import { restChannels } from './scenes'
import { ACTIONS, KINDS, THINGS } from './things'
import { gulpOn, type Yard } from './world'
import { ARRANGEMENTS, layOut } from './yards'
import { PUFFS, RINGS, YardMotion } from './yardMotion'

const FRAME = 1 / 60
const REST = restChannels()

/** The most things a yard may hold: the stage has a place and a model for no more. */
const MOST_THINGS = 5

type Counts = { drops: number; visited: number; puffs: number; rings: number; landings: number; results: number }

/**
 * Plays the heaviest moment a yard can have: a held stream that never stops (a
 * small drop every frame and a gulp every third of a second, sent to each thing
 * in turn), and something in the yard answering every sixth of a second, each
 * thing in turn with each of the five ways water can reach it. Returns the most
 * of everything that was alive at once.
 */
function heaviest(yard: Yard, seconds: number): Counts {
  const motion = new YardMotion(yard)
  motion.settle(yard, REST)
  const drops = new Drops()
  const arcs = yard.things.map((_, index) => arcTo(NOZZLE, placeOf(yard, index)))
  const most: Counts = { drops: 0, visited: 0, puffs: 0, rings: 0, landings: 0, results: 0 }
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
    const arc = arcs[Math.floor(frame / 20) % arcs.length]
    drops.trickle(arc)
    if (frame % 20 === 0) drops.gulp(arc)
    if (frame % 10 === 0) {
      const index = most.results % yard.things.length
      // Five ways and a number of things that is not always five: every thing meets every way in turn.
      const action = ACTIONS[Math.floor(most.results / yard.things.length) % ACTIONS.length]
      motion.result(index, action, yard)
      // A wheel that spins and a cat that shakes fling drops of their own, as in the game.
      const { kind } = yard.things[index]
      const at = placeOf(yard, index)
      if (kind === 'wheel' && (action === 'fill' || action === 'too-much')) drops.burst(at.x, 1.3, at.z, 12, 3.6)
      if (kind === 'cat' && action === 'fill') drops.burst(at.x, 0.9, at.z, 10, 2.4)
      most.results++
    }
    drops.step(FRAME, () => { most.landings++ })
    motion.step(FRAME, yard, REST)
    most.drops = Math.max(most.drops, drops.alive)
    most.visited = Math.max(most.visited, drops.visited)
    most.puffs = Math.max(most.puffs, motion.steam.alive, motion.steam.puffs.filter((puff) => puff.alive).length)
    most.rings = Math.max(most.rings, motion.ripples.rings.filter((ring) => ring.alive).length)
  }
  return most
}

/** A yard with every thing in it watered by the rules to the fill of its kind, one after another. */
function full(yard: Yard): Yard {
  let now = yard
  yard.things.forEach((thing, index) => {
    for (let gulp = 0; gulp < THINGS[thing.kind].fill; gulp++) now = gulpOn(now, index).yard
  })
  return now
}

describe('the heaviest moment', () => {
  it('in the fullest yard never has more in the air or on the water than the stage draws in one call each', () => {
    const yard = layOut('whole-garden', 0)
    expect(yard.things).toHaveLength(MOST_THINGS)
    const most = heaviest(yard, 20)
    expect(most.drops).toBeLessThanOrEqual(CAPACITY)
    expect(most.visited).toBeLessThanOrEqual(CAPACITY)
    expect(most.puffs).toBeLessThanOrEqual(PUFFS)
    expect(most.rings).toBeLessThanOrEqual(RINGS)
    // It was a heavy moment: water in the air all the time, rings on the pool, and every thing answering every way.
    expect(most.drops).toBeGreaterThan(20)
    expect(most.rings).toBeGreaterThan(2)
    expect(most.landings).toBeGreaterThan(20 * 60)
    expect(most.results).toBeGreaterThanOrEqual(yard.things.length * ACTIONS.length * 4)
  })

  it('keeps to the same counts in every yard of the last place, dry or with every thing at its fill', () => {
    let steamed = 0
    ARRANGEMENTS['whole-garden'].forEach((_, arrangement) => {
      for (const yard of [layOut('whole-garden', arrangement), full(layOut('whole-garden', arrangement))]) {
        const most = heaviest(yard, 20)
        const name = `whole-garden ${arrangement}`
        expect(most.drops, name).toBeLessThanOrEqual(CAPACITY)
        expect(most.visited, name).toBeLessThanOrEqual(CAPACITY)
        expect(most.puffs, name).toBeLessThanOrEqual(PUFFS)
        expect(most.rings, name).toBeLessThanOrEqual(RINGS)
        steamed = Math.max(steamed, most.puffs)
      }
    })
    // The yard with the fire in it did raise steam.
    expect(steamed).toBeGreaterThan(5)
  })

  it('keeps to the same counts when every thing answers every frame, faster than any play', () => {
    const yard = layOut('whole-garden', 1)
    const motion = new YardMotion(yard)
    motion.settle(yard, REST)
    const drops = new Drops()
    const arc = arcTo(NOZZLE, { x: 15.7, z: 0.3 })
    for (let frame = 0; frame < 60 * 5; frame++) {
      for (let burst = 0; burst < 4; burst++) drops.gulp(arc)
      yard.things.forEach((_, index) => {
        for (const action of ACTIONS) motion.result(index, action, yard)
      })
      drops.step(FRAME, () => {})
      motion.step(FRAME, yard, REST)
      expect(drops.alive).toBeLessThanOrEqual(CAPACITY)
      expect(drops.visited).toBeLessThanOrEqual(CAPACITY)
      expect(motion.steam.alive).toBeLessThanOrEqual(PUFFS)
      expect(motion.steam.puffs.filter((puff) => puff.alive).length).toBeLessThanOrEqual(PUFFS)
      expect(motion.ripples.rings.filter((ring) => ring.alive).length).toBeLessThanOrEqual(RINGS)
    }
    // The sets are fixed in size: nothing was added to hold the rush.
    expect(motion.steam.puffs).toHaveLength(PUFFS)
    expect(motion.ripples.rings).toHaveLength(RINGS)
  })

  it('does the same work for the drops whether the air is empty or full', () => {
    const drops = new Drops()
    drops.step(FRAME, () => {})
    const empty = drops.visited
    for (let tap = 0; tap < 100; tap++) drops.gulp(arcTo(NOZZLE, { x: 9, z: 4 }))
    drops.step(FRAME, () => {})
    expect(drops.visited).toBe(empty)
    expect(drops.visited).toBeLessThanOrEqual(CAPACITY)
  })
})

describe('what the stage has to draw', () => {
  const everyYard = Object.entries(ARRANGEMENTS).flatMap(([place, plans]) => plans.map((_, arrangement) => layOut(place, arrangement)))

  it('is at most five things in any yard', () => {
    for (const yard of everyYard) expect(yard.things.length, `${yard.place} ${yard.arrangement}`).toBeLessThanOrEqual(MOST_THINGS)
    expect(Math.max(...everyYard.map((yard) => yard.things.length))).toBe(MOST_THINGS)
  })

  it('is never two things of one kind, so one model of each kind is enough', () => {
    for (const yard of everyYard) {
      const kinds = yard.things.map((thing) => thing.kind)
      expect(new Set(kinds).size, `${yard.place} ${yard.arrangement}`).toBe(kinds.length)
      // The motion has one place for each kind, and each thing of the yard is in its own.
      const motion = new YardMotion(yard)
      const held = KINDS.map((kind) => motion.has[kind]).filter((index) => index >= 0)
      expect([...held].sort()).toEqual(yard.things.map((_, index) => index))
    }
  })

  it('stays so however the yard is played: water moves things and never adds one', () => {
    for (const start of everyYard) {
      let yard = start
      for (let round = 0; round < 6; round++) {
        for (let index = 0; index < start.things.length; index++) yard = gulpOn(yard, index).yard
      }
      expect(yard.things.map((thing) => thing.kind), `${start.place} ${start.arrangement}`).toEqual(start.things.map((thing) => thing.kind))
    }
  })
})
