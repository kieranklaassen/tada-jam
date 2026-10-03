import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import {
  LANE_PLACES, RACK_PLACES, callIn, candidates, carry, draw, feedBadger, freshBakery, fromRack, handOver, outcomeOf, thingAt, tick, tipOnto, toRack, work,
  type Bakery, type Happening, type Step,
} from './bakery'
import { BAKE_SECONDS, RISE_SECONDS, WORK_FULL, type Bread, type Ingredient } from './stuff'
import { IDEAS, POOLS, judge, reachableBreads, type Animal, type Group } from './tastes'

const start = (age: number | null = null, seed = 1): Bakery => freshBakery(age, seed).bakery
const then = (bakery: Bakery, ...acts: ((at: Bakery) => Step)[]): Bakery => acts.reduce((at, act) => act(at).bakery, bakery)
const tipAll = (...what: Ingredient[]) => (bakery: Bakery): Step => ({ bakery: what.reduce((at, next) => tipOnto(at, next).bakery, bakery), happened: [] })
const knead = (bakery: Bakery): Step => { for (let i = 0; i < WORK_FULL; i++) bakery = work(bakery, 'push').bakery; return { bakery, happened: [] } }
const bake = (bakery: Bakery): Step => ({ bakery: then(bakery, (at) => carry(at, 'oven'), (at) => tick(at, BAKE_SECONDS), (at) => carry(at, 'board')), happened: [] })
const brick = (bakery: Bakery): Bakery => then(bakery, tipAll('flour', 'water'), knead, bake)
const kinds = (step: Step): Happening['type'][] => step.happened.map((happening) => happening.type)
const animalsHere = (bakery: Bakery): Animal[] => [...(bakery.hatch?.group ?? []), ...bakery.lane.flatMap((visitor) => visitor.group)]
const breads = reachableBreads()
/** A bread the group came for: a secret pleases the hen too, and is not one. */
const wantedBy = (group: Group): Bread => breads.find((bread) => { const verdict = judge(group, bread); return verdict.wanted && !verdict.secret })!
const unwantedBy = (group: Group): Bread => breads.find((bread) => !judge(group, bread).wanted)!
const give = (bakery: Bakery, bread: Bread): Step => handOver({ ...bakery, peel: { at: 'board', load: bread } }, 'peel')
const at = (position: string, seed = 1): Bakery => {
  const bakery: Bakery = { ...start(null, seed), position, hatch: null, lane: [], finished: true }
  return callIn({ ...bakery, lane: candidates(bakery).slice(0, 1) }, 0).bakery
}
const frozen = <T>(value: T): T => { if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value) } return value }

describe('a first visit', () => {
  it('opens with the goat already at the hatch, the sparrows waiting, and the badger showing how dough is made', () => {
    const step = freshBakery(null)
    expect(step.bakery.position).toBe('dough')
    expect(step.bakery.hatch?.group).toEqual(['goat'])
    expect(step.bakery.lane.map((visitor) => visitor.group)).toEqual([['sparrows']])
    expect(step.happened).toEqual([{ type: 'stepped-up', visitor: step.bakery.hatch, showing: ['dough'], cameOut: [] }])
    expect(step.bakery.tools).toEqual({ jar: false, seeds: false })
    expect(step.bakery.finished).toBe(false)
  })

  it('starts by age as a default only: no age and the youngest start at dough, the oldest one step on', () => {
    expect(start(null).position).toBe('dough')
    expect(start(4).position).toBe('dough')
    expect(start(2).position).toBe('dough')
    const older = freshBakery(6)
    expect(older.bakery.position).toBe('shapes')
    expect(older.bakery.hatch?.group).toEqual(['dachshund'])
    expect(older.happened[0]).toMatchObject({ showing: ['dough', 'shapes'] })
    expect(start(12).position).toBe('shapes')
  })
})

describe('the peel', () => {
  it('takes ingredients only on the board: with the peel away they land on the bench and change nothing', () => {
    const away = carry(start(), 'nook').bakery
    expect(tipOnto(away, 'flour')).toEqual({ bakery: away, happened: [{ type: 'effect', effect: 'flour-over' }] })
    expect(tipOnto(away, 'water').happened).toEqual([{ type: 'effect', effect: 'water-over' }])
  })

  it('has no jar and no seed dish until someone who needs them has stepped up, and keeps them after', () => {
    const early = start()
    expect(tipOnto(early, 'bubbly')).toEqual({ bakery: early, happened: [] })
    expect(tipOnto(early, 'seeds')).toEqual({ bakery: early, happened: [] })
    const withBear = at('rising')
    expect(withBear.hatch?.group).toEqual(['bear'])
    expect(withBear.tools).toEqual({ jar: true, seeds: false })
    expect(tipOnto(withBear, 'bubbly').happened).toEqual([{ type: 'effect', effect: 'plop' }])
    const later = give(withBear, wantedBy(['bear'])).bakery
    expect(later.tools.jar).toBe(true)
  })

  it('bakes raw stuff in the oven in its own time, and waiting longer changes nothing', () => {
    const inOven = then(start(), tipAll('flour', 'water'), knead, (b) => carry(b, 'oven'))
    expect(tick(inOven, BAKE_SECONDS / 2).happened).toEqual([])
    const done = tick(inOven, BAKE_SECONDS)
    expect(done.happened).toEqual([{ type: 'baked', bread: { raw: false, crumb: 'dense', shape: 'round', crust: 'gold', seeds: false } }])
    expect(tick(done.bakery, 3600)).toEqual({ bakery: done.bakery, happened: [] })
  })

  it('darkens a bread each time it is carried back into the oven, and never while it waits there', () => {
    const gold = brick(start())
    const again = carry(gold, 'oven')
    expect(kinds(again)).toEqual(['carried', 'darkened'])
    expect((again.bakery.peel.load as Bread).crust).toBe('dark')
    expect(tick(again.bakery, 3600).bakery).toBe(again.bakery)
    expect((then(again.bakery, (b) => carry(b, 'board'), (b) => carry(b, 'oven')).peel.load as Bread).crust).toBe('black')
  })

  it('leaves only steam of a puddle', () => {
    const step = tick(then(start(), tipAll('water'), (b) => carry(b, 'oven')), BAKE_SECONDS)
    expect(step.happened).toEqual([{ type: 'baked', bread: null }])
    expect(step.bakery.peel.load).toBeNull()
  })

  it('rises in the nook only, on attended seconds handed in, and is out of reach behind the oven door', () => {
    const risen = then(at('rising'), tipAll('flour', 'water', 'bubbly'), knead, (b) => carry(b, 'nook'), (b) => tick(b, RISE_SECONDS))
    expect(risen.peel.load).toMatchObject({ rise: 100 })
    expect(work(risen, 'push').happened).toEqual([{ type: 'effect', effect: 'sigh' }])
    const shut = carry(risen, 'oven').bakery
    expect(work(shut, 'push')).toEqual({ bakery: shut, happened: [] })
    expect(thingAt(shut, 'peel')).toBeNull()
    expect(handOver(shut, 'peel')).toEqual({ bakery: shut, happened: [] })
  })

  it('does nothing by itself: with no seconds handed in, nothing moves', () => {
    const resting = then(at('rising'), tipAll('flour', 'water', 'bubbly'), knead, (b) => carry(b, 'nook'))
    expect(tick(resting, 0).bakery).toBe(resting)
  })
})

describe('the rack and the badger', () => {
  it('keeps the breads the child puts there, and gives them back to an empty peel on the board', () => {
    const racked = toRack(brick(start()), 2)
    expect(racked.happened).toEqual([{ type: 'racked', place: 2 }])
    expect(racked.bakery.peel.load).toBeNull()
    const back = fromRack(racked.bakery, 2)
    expect(back.happened).toEqual([{ type: 'unracked', place: 2 }])
    expect(back.bakery.rack.every((place) => place === null)).toBe(true)
    const busy = tipOnto(racked.bakery, 'flour').bakery
    expect(fromRack(busy, 2)).toEqual({ bakery: busy, happened: [] })
  })

  it('takes baked things only, and a full rack leaves the bread on the peel', () => {
    const raw = then(start(), tipAll('flour', 'water'))
    expect(toRack(raw, 0)).toEqual({ bakery: raw, happened: [] })
    let bakery = start()
    for (let i = 0; i < RACK_PLACES; i++) bakery = toRack(brick(bakery), 0).bakery
    expect(bakery.rack.every((place) => place !== null)).toBe(true)
    const fifth = brick(bakery)
    expect(toRack(fifth, 0)).toEqual({ bakery: fifth, happened: [] })
  })

  it('lets the badger eat or clear away anything, from the peel or the rack', () => {
    const dusty = then(start(), tipAll('flour'))
    expect(feedBadger(dusty, 'peel').bakery.peel.load).toBeNull()
    const racked = toRack(brick(start()), 0).bakery
    expect(kinds(feedBadger(racked, 0))).toEqual(['eaten'])
    expect(feedBadger(racked, 0).bakery.rack[0]).toBeNull()
    expect(feedBadger(start(), 'peel').happened).toEqual([])
  })
})

describe('a cycle', () => {
  it('ends when the customer leaves with a bread it wants: the hatch stands empty and nothing starts by itself', () => {
    const step = handOver(brick(start()), 'peel')
    expect(step.happened).toEqual([{ type: 'ending', visitor: { group: ['goat'], from: 'dough', handedBack: 0 }, taken: { raw: false, crumb: 'dense', shape: 'round', crust: 'gold', seeds: false }, secret: false, outcome: 'well' }])
    expect(step.bakery).toMatchObject({ hatch: null, finished: true, position: 'shapes', peel: { load: null } })
    expect(step.bakery.lane.map((visitor) => visitor.group)).toEqual([['sparrows']])
    expect(tick(step.bakery, 3600).bakery).toBe(step.bakery)
  })

  it('hands an unwanted thing back unharmed, where it was, and the customer stays wanting the same', () => {
    const dough = then(start(), tipAll('flour', 'water'), knead)
    const step = handOver(dough, 'peel')
    expect(step.happened[0]).toMatchObject({ type: 'handed-back', verdict: { wanted: false, reason: 'raw', by: 'goat' } })
    expect(step.bakery.peel).toEqual(dough.peel)
    expect(step.bakery.hatch).toEqual({ group: ['goat'], from: 'dough', handedBack: 1 })
    expect(step.bakery.position).toBe('dough')
    expect(handOver(bake(step.bakery).bakery, 'peel').happened[0]).toMatchObject({ type: 'ending', outcome: 'well' })
  })

  it('judges by the breads handed back first: none or one is well, two mixed, three or more badly', () => {
    expect([0, 1, 2, 3, 7].map((count) => outcomeOf(count, false))).toEqual(['well', 'well', 'mixed', 'badly', 'badly'])
    expect(outcomeOf(0, true), 'a secret is not a bread it came for').toBe('mixed')
    const play = (handBacks: number): Bakery => {
      let bakery = at('rising')
      for (let i = 0; i < handBacks; i++) bakery = give(bakery, unwantedBy(['bear'])).bakery
      return give(bakery, wantedBy(['bear'])).bakery
    }
    expect([0, 1, 2, 3].map((count) => play(count).position)).toEqual(['crust', 'crust', 'rising', 'shapes'])
  })

  it('moves one step at a time and stops at both ends of the order', () => {
    let bottom = start()
    for (let i = 0; i < 3; i++) bottom = handOver(then(bottom, tipAll('flour')), 'peel').bakery
    expect(handOver(brick(feedBadger(bottom, 'peel').bakery), 'peel').bakery.position).toBe('dough')
    const top = at('trios')
    expect(give(top, wantedBy(top.hatch!.group)).bakery.position).toBe('trios')
  })

  it('shows a new position on the customer after next', () => {
    const served = handOver(brick(start()), 'peel').bakery
    expect(served.position).toBe('shapes')
    const next = callIn(served, 0)
    expect(next.bakery.hatch).toMatchObject({ group: ['sparrows'], from: 'dough' })
    expect(next.bakery.lane[0]).toMatchObject({ group: ['dachshund'], from: 'shapes' })
    const unjudged = give(next.bakery, wantedBy(['sparrows']))
    expect(unjudged.happened[0]).toMatchObject({ type: 'ending', outcome: null })
    expect(unjudged.bakery.position).toBe('shapes')
  })

  it('lets the child send the one at the hatch back to the lane, with nothing judged and nothing forgotten', () => {
    const refused = handOver(then(start(), tipAll('flour')), 'peel').bakery
    const swapped = callIn(refused, 0)
    expect(kinds(swapped)).toEqual(['sent-back', 'stepped-up'])
    expect(swapped.bakery.hatch?.group).toEqual(['sparrows'])
    expect(swapped.bakery.lane).toContainEqual({ group: ['goat'], from: 'dough', handedBack: 1 })
    expect(swapped.bakery.position).toBe('dough')
    expect(swapped.bakery.peel).toEqual(refused.peel)
    expect(callIn(refused, 5)).toEqual({ bakery: refused, happened: [] })
  })

  it('takes a bread from the rack as well as from the peel', () => {
    const racked = toRack(brick(start()), 1).bakery
    const step = handOver(racked, 1)
    expect(kinds(step)).toEqual(['ending'])
    expect(step.bakery.rack[1]).toBeNull()
  })

  it('keeps the two secrets: they send the customer off and move nothing', () => {
    const hen = at('seeds')
    const step = handOver(then(hen, tipAll('seeds')), 'peel')
    expect(step.happened[0]).toMatchObject({ type: 'ending', secret: true, outcome: 'mixed' })
    expect(step.bakery.position).toBe('seeds')
  })
})

describe('the badger shows each idea once', () => {
  it('shows what a group needs and has not seen when it steps up, and never again', () => {
    let bakery = start()
    const seen: string[] = ['dough']
    for (let turn = 0; turn < 200 && seen.length < IDEAS.length; turn++) {
      bakery = give(bakery, wantedBy(bakery.hatch!.group)).bakery
      const step = callIn(bakery, 0)
      for (const happening of step.happened) if (happening.type === 'stepped-up') {
        for (const idea of happening.showing) { expect(seen, `${idea} is shown once`).not.toContain(idea); seen.push(idea) }
      }
      bakery = step.bakery
    }
    expect(seen).toEqual([...IDEAS])
    expect(bakery.shown).toEqual([...IDEAS])
  })
})

describe('the lane', () => {
  it('never holds an animal twice, never more than two groups, and always someone to call in', () => {
    for (const seed of [1, 2, 3, 99, 4096]) {
      let bakery = start(null, seed)
      const met = new Set<string>()
      for (let turn = 0; turn < 300; turn++) {
        const here = animalsHere(bakery)
        expect(new Set(here).size, `seed ${seed} turn ${turn}`).toBe(here.length)
        expect(bakery.lane.length).toBeLessThanOrEqual(LANE_PLACES)
        expect(bakery.lane.length, 'someone waits').toBeGreaterThan(0)
        met.add(bakery.hatch!.group.join('+'))
        // Mostly the wanted bread, now and then the wrong one first, as a child would.
        const slip = draw(turn * 7 + seed, 4).value === 0
        if (slip) bakery = give(bakery, unwantedBy(bakery.hatch!.group)).bakery
        bakery = give(bakery, wantedBy(bakery.hatch!.group)).bakery
        expect(bakery.hatch).toBeNull()
        bakery = callIn(bakery, draw(turn + seed, bakery.lane.length).value).bakery
      }
      expect(bakery.position, 'play that goes well climbs to the top').toBe(LADDER[LADDER.length - 1])
      for (const animal of ['goat', 'sparrows', 'dachshund', 'bear', 'crow', 'hen', 'duck', 'mole']) expect([...met].some((group) => group.split('+').includes(animal)), animal).toBe(true)
    }
  })

  it('fills from the current position first and from earlier ones otherwise', () => {
    const pairs = at('pairs')
    expect(pairs.hatch?.from).toBe('pairs')
    for (const visitor of pairs.lane) expect(LADDER.indexOf(visitor.from)).toBeLessThanOrEqual(LADDER.indexOf('pairs'))
    const crust = at('crust')
    expect(crust.hatch?.group).toEqual(['crow'])
    for (const visitor of crust.lane) expect(LADDER.indexOf(visitor.from)).toBeLessThan(LADDER.indexOf('crust'))
  })

  it('is laid out by its own seeded stream: the same seed gives the same lane, and nothing else draws from it', () => {
    const play = (seed: number) => {
      let bakery = at('pairs', seed)
      for (let turn = 0; turn < 20; turn++) bakery = callIn(give(bakery, wantedBy(bakery.hatch!.group)).bakery, 0).bakery
      return bakery
    }
    expect(play(7)).toEqual(play(7))
    const before = at('pairs', 7)
    expect(then(before, tipAll('flour', 'water'), knead, bake, (b) => toRack(b, 0)).seed).toBe(before.seed)
    expect(POOLS.pairs.length).toBeGreaterThan(LANE_PLACES)
  })
})

describe('plain data', () => {
  it('never changes the bakery it was given', () => {
    const bakery = frozen(brick(at('pairs')))
    expect(() => {
      tipOnto(bakery, 'flour'); work(bakery, 'push'); carry(bakery, 'oven'); tick(bakery, 1); toRack(bakery, 0); fromRack(bakery, 0)
      feedBadger(bakery, 'peel'); handOver(bakery, 'peel'); callIn(bakery, 0)
    }).not.toThrow()
  })

  it('survives a trip through JSON at every step of a long play', () => {
    let bakery = start()
    for (let turn = 0; turn < 60; turn++) {
      bakery = then(bakery, tipAll('flour', 'water'), knead, (b) => carry(b, 'oven'), (b) => tick(b, BAKE_SECONDS / 2))
      expect(JSON.parse(JSON.stringify(bakery))).toEqual(bakery)
      bakery = then(bakery, (b) => tick(b, BAKE_SECONDS), (b) => carry(b, 'board'), (b) => toRack(b, turn % RACK_PLACES), (b) => feedBadger(b, (turn + 1) % RACK_PLACES))
      bakery = callIn(give(bakery, wantedBy(bakery.hatch!.group)).bakery, 0).bakery
    }
  })
})
