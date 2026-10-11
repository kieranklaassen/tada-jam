import { describe, expect, it } from 'vitest'
import { FIRST_VISIT, LADDER } from './config'
import { MOST } from './kinds'
import { FIRST_SEED, PLANS, draw, layCrew, layFirstCrew, planFor } from './layout'
import { applyChange, bareSpots, changeDue, hatsInTile, placeOf, ready, tapCreature, tapHat, type World } from './rules'

const SEEDS = Array.from({ length: 120 }, (_, i) => FIRST_SEED + i * 7919)

/** A child who looks: sends a loose hat or a tower's top where it belongs, gives a bare head a hat, and stops there. Returns the taps it took, or -1 if it never got there. */
function carefulChild(start: World): { taps: number; world: World } {
  let world = start
  for (let taps = 0; taps <= 30; taps++) {
    while (changeDue(world)) world = applyChange(world).world
    if (ready(world)) return { taps, world }
    const tower = world.crew.find((creature) => creature.hats.length > 1)
    const bare = bareSpots(world)
    if (tower) world = tapHat(world, tower.hats[tower.hats.length - 1]).world
    else if (world.loose.length > 0) world = tapHat(world, world.loose[0].hat).world
    else if (bare.length > 0 && hatsInTile(world).length > 0) world = tapCreature(world, bare[0]).world
    else return { taps: -1, world }
  }
  return { taps: -1, world: start }
}

describe('the designed order', () => {
  it('has a plan for every id of the ladder and no other', () => {
    expect(Object.keys(PLANS).sort()).toEqual([...LADDER].sort())
    expect(new Set(LADDER).size).toBe(LADDER.length)
    for (const row of FIRST_VISIT) expect(LADDER).toContain(row.position)
    expect(planFor('no-such-place')).toBe(PLANS[LADDER[0]])
  })

  it('names places in the game, never a grade, a groep, a level or a number', () => {
    for (const id of LADDER) {
      expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/)
      expect(id).not.toMatch(/grade|groep|level|fase|stage|class|year|age|easy|hard|kinder|peuter|tk/)
    }
  })

  it('starts where nothing can come out uneven, and brings one new thing at a time', () => {
    for (const id of LADDER.slice(0, 2)) {
      const plan = PLANS[id]
      expect(plan.changes).toEqual([])
      for (const heads of plan.heads) expect(plan.hats(heads)).toBe(heads)
    }
    const told = LADDER.map((id) => { const plan = PLANS[id]; return `${plan.heads} ${plan.heads.map((heads) => plan.hats(heads) - heads)} ${plan.changes}` })
    expect(new Set(told).size).toBe(LADDER.length)
    // A change is always one creature at a time, and a cycle holds two at most.
    for (const id of LADDER) expect(PLANS[id].changes.length).toBeLessThanOrEqual(2)
  })
})

describe('a crew laid out', () => {
  it('keeps every set at five or fewer, with every creature different and everyone on a spot of their own', () => {
    for (const id of LADDER) for (const seed of SEEDS) {
      const { world } = layCrew(id, seed)
      expect(world.crew.length).toBeGreaterThanOrEqual(2)
      expect(world.crew.length + world.changes.filter((change) => change === 'come').length).toBeLessThanOrEqual(MOST)
      expect(world.tile.length).toBeGreaterThanOrEqual(1)
      expect(world.tile.length).toBeLessThanOrEqual(MOST)
      const kinds = [...world.crew.map((creature) => creature.kind), ...(world.guest ? [world.guest] : [])]
      expect(new Set(kinds).size).toBe(kinds.length)
      const spots = world.crew.map((creature) => creature.spot)
      expect(new Set(spots).size).toBe(spots.length)
      for (const spot of spots) expect(spot >= 0 && spot < MOST).toBe(true)
      expect(world.crew.every((creature) => creature.hats.length === 0)).toBe(true)
      expect(world.guest !== null).toBe(world.changes.includes('come'))
      if (world.changes.includes('leave')) expect(spots).toContain(world.leaver)
      else expect(world.leaver).toBe(null)
      expect(world.slips).toBe(0)
    }
  })

  it('is the same crew from the same seed, and another from the next', () => {
    for (const id of LADDER) {
      const once = layCrew(id, FIRST_SEED), again = layCrew(id, FIRST_SEED)
      expect(again).toEqual(once)
      expect(once.seed).not.toBe(FIRST_SEED)
    }
    const crews = new Set(SEEDS.map((seed) => JSON.stringify(layCrew('one-comes', seed).world)))
    expect(crews.size).toBeGreaterThan(20)
  })

  it('shows every kind of hat before any kind twice', () => {
    for (const id of LADDER) for (const seed of SEEDS) {
      const { tile } = layCrew(id, seed).world
      expect(new Set(tile.slice(0, 3)).size).toBe(Math.min(3, tile.length))
    }
  })

  it('draws numbers from 0 up to 1 and never the same seed twice in a row', () => {
    let seed = FIRST_SEED
    for (let i = 0; i < 500; i++) {
      const drawn = draw(seed)
      expect(drawn.value >= 0 && drawn.value < 1).toBe(true)
      expect(drawn.seed).not.toBe(seed)
      seed = drawn.seed
    }
  })
})

describe('every cycle', () => {
  it('can be finished by a child who looks, with no slip, in a handful of taps', () => {
    for (const id of LADDER) for (const seed of SEEDS) {
      const { taps, world } = carefulChild(layCrew(id, seed).world)
      expect(taps, `${id} ${seed}`).toBeGreaterThanOrEqual(2)
      expect(taps, `${id} ${seed}`).toBeLessThanOrEqual(8)
      expect(world.slips).toBe(0)
      expect(world.crew.every((creature) => creature.hats.length === 1)).toBe(true)
      expect(world.loose).toEqual([])
    }
  })

  it('cannot be finished by tapping every hat once, from the first spare hat on', () => {
    for (const id of LADDER) for (const seed of SEEDS.slice(0, 30)) {
      let world = layCrew(id, seed).world
      const spare = world.tile.length > world.crew.length
      for (let hat = 0; hat < world.tile.length; hat++) world = tapHat(world, hat).world
      if (PLANS[id].changes.length === 0 && !spare) expect(ready(world), id).toBe(true)
      if (spare) {
        expect(ready(world), id).toBe(false)
        expect(world.loose.length, id).toBeGreaterThan(0)
        expect(world.slips, id).toBeGreaterThan(0)
      }
    }
  })
})

describe('the first crew ever', () => {
  it('has one creature and one hat more than its position, and the leader already wears that hat', () => {
    for (const row of FIRST_VISIT) for (const seed of SEEDS.slice(0, 40)) {
      const plain = layCrew(row.position, seed).world, first = layFirstCrew(row.position, seed)
      expect(first.leader).toBeGreaterThanOrEqual(0)
      expect(first.world.crew.length).toBe(plain.crew.length + 1)
      expect(first.world.tile.length).toBe(plain.tile.length + 1)
      expect(placeOf(first.world, first.hat)).toEqual({ at: 'head', spot: first.leader, level: 0 })
      // What is left for the child is the position as designed.
      expect(bareSpots(first.world).length).toBe(plain.crew.length)
      expect(hatsInTile(first.world).length).toBe(plain.tile.length)
      expect(new Set(first.world.crew.map((creature) => creature.kind)).size).toBe(first.world.crew.length)
      expect(carefulChild(first.world).taps).toBeGreaterThanOrEqual(2)
    }
  })
})
