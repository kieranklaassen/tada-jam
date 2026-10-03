import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { LANE_MOST, RACK_PLACES, callIn, carry, freshBakery, handOver, sendBack, tick, tipOnto, toRack, work, type Bakery } from './bakery'
import { open, restore, serialize } from './save'
import { STATE_VERSION } from './state'
import { BAKE_SECONDS, MOST, RISE_SECONDS, WORK_FULL, type Bread, type Stuff } from './stuff'
import { IDEAS, POOLS, judge, reachableBreads } from './tastes'

const start = (): Bakery => freshBakery(null).bakery
const throughStorage = (bakery: Bakery): Bakery => restore(JSON.parse(JSON.stringify(serialize(bakery))), null)!
const breads = reachableBreads()
const serve = (bakery: Bakery): Bakery => {
  const wanted = breads.find((bread) => { const verdict = judge(bakery.hatch!.group, bread); return verdict.wanted && !verdict.secret })!
  return handOver({ ...bakery, peel: { at: 'board', load: wanted } }, 'peel').bakery
}
const knead = (bakery: Bakery): Bakery => { for (let i = 0; i < WORK_FULL; i++) bakery = work(bakery, 'push').bakery; return bakery }
const dough = (bakery: Bakery): Bakery => knead(tipOnto(tipOnto(bakery, 'flour').bakery, 'water').bakery)

describe('found as left', () => {
  it('opens a first visit when nothing is saved, with the first customer stepping up', () => {
    for (const nothing of [undefined, null, 'x', 7, [], {}, { v: STATE_VERSION + 1 }, { position: 'dough' }]) {
      const step = open(nothing, null)
      expect(step.bakery.hatch?.group).toEqual(['goat'])
      expect(step.happened.map((happening) => happening.type)).toEqual(['stepped-up'])
    }
    expect(open(null, 6).bakery.position).toBe('shapes')
  })

  it('opens a saved bakery exactly as it was left, with nothing happening', () => {
    const left = dough(start())
    const step = open(JSON.parse(JSON.stringify(serialize(left))), 6)
    expect(step.bakery).toEqual(left)
    expect(step.happened, 'no scene replays').toEqual([])
    expect(step.bakery.position, 'a saved position wins over the age').toBe('dough')
  })

  it('comes back the same from every moment of a long play', () => {
    let bakery = start()
    for (let turn = 0; turn < 80; turn++) {
      bakery = dough(bakery)
      expect(throughStorage(bakery)).toEqual(bakery)
      bakery = tick(carry(bakery, 'oven').bakery, BAKE_SECONDS).bakery
      expect(throughStorage(bakery)).toEqual(bakery)
      bakery = toRack(carry(bakery, 'board').bakery, turn % RACK_PLACES).bakery
      bakery = serve(bakery)
      expect(throughStorage(bakery), 'an ending in the save: the hatch is empty and stays so').toEqual(bakery)
      bakery = callIn(bakery, 0).bakery
      expect(throughStorage(bakery)).toEqual(bakery)
    }
    expect(bakery.position).toBe(LADDER[LADDER.length - 1])
  })

  it('keeps a customer who was sent back, in the lane with its count, and the hatch empty', () => {
    const refused = handOver(tipOnto(start(), 'flour').bakery, 'peel').bakery
    const sent = sendBack(refused).bakery
    const back = throughStorage(sent)
    expect(back).toEqual(sent)
    expect(back.hatch).toBeNull()
    expect(back.lane).toContainEqual({ group: ['goat'], from: 'dough', handedBack: 1 })
    expect(throughStorage(callIn(back, 0).bakery).lane).toContainEqual({ group: ['goat'], from: 'dough', handedBack: 1 })
  })

  it('keeps rising and baking as two numbers that only attended time moves', () => {
    const rising = tick(carry(tipOnto(dough({ ...start(), tools: { jar: true, seeds: false } }), 'bubbly').bakery, 'nook').bakery, 0).bakery
    const half = tick(knead(carry(rising, 'board').bakery), 0).bakery
    const inNook = tick(carry(half, 'nook').bakery, RISE_SECONDS / 3).bakery
    const back = throughStorage(inNook)
    expect((back.peel.load as Stuff).rise).toBeCloseTo((inNook.peel.load as Stuff).rise, 1)
    expect(back.peel.at).toBe('nook')
    // Parked for any length of time: no seconds are handed in, so nothing has moved.
    expect(throughStorage(back)).toEqual(back)
    const baking = tick(carry(inNook, 'oven').bakery, BAKE_SECONDS / 2).bakery
    expect((throughStorage(baking).peel.load as Stuff).bake).toBeCloseTo(50, 1)
  })

  it('saves an ending when it starts: a put-away in the middle of it loses nothing', () => {
    const ended = serve(start())
    const reopened = open(JSON.parse(JSON.stringify(serialize(ended))), null)
    expect(reopened.bakery).toMatchObject({ hatch: null, finished: true, position: 'shapes' })
    expect(reopened.happened).toEqual([])
    expect(reopened.bakery.lane.length, 'the next one is waiting').toBeGreaterThan(0)
  })
})

describe('a damaged save', () => {
  const good = (): Record<string, unknown> => JSON.parse(JSON.stringify(serialize(dough(start()))))

  it('repairs each field by itself and keeps the rest', () => {
    const cases: [string, Record<string, unknown>][] = [
      ['position', { position: 'grade-1' }], ['shown', { shown: 'all' }], ['tools', { tools: 3 }], ['peel', { peel: null }], ['rack', { rack: { 0: 'bread' } }],
      ['hatch', { hatch: { group: ['dragon'] } }], ['lane', { lane: 'queue' }], ['seed', { seed: 'x' }], ['finished', { finished: 'yes' }],
    ]
    for (const [field, damage] of cases) {
      const bakery = restore({ ...good(), ...damage }, null)!
      expect(bakery, field).not.toBeNull()
      expect(LADDER, field).toContain(bakery.position)
      expect(bakery.rack.length, field).toBe(RACK_PLACES)
      if (field !== 'peel') expect(bakery.peel.load, `${field}: the dough is still there`).toMatchObject({ raw: true, flour: 1, water: 1 })
    }
  })

  it('never opens on something the rules could not have made', () => {
    const wild = restore({
      ...good(),
      shown: ['dough', 'dough', 'cheat', 7],
      peel: { at: 'moon', load: { raw: true, flour: 99, water: -4, bubbly: 'yes', seeds: 1, work: 1e9, long: true, rise: Infinity, bake: 250 } },
      rack: [{ raw: false, crumb: 'pancake', shape: 'long', crust: 'gold', seeds: false }, { raw: false, crumb: 'gold', shape: 'round', crust: 'gold' }, { raw: true, flour: 1 }, null, null, null, null],
      hatch: { group: ['goat', 'bear'], from: 'dough', handedBack: 0 },
      lane: [{ group: ['hen'], from: 'nowhere', handedBack: -3 }, { group: ['hen'], from: 'seeds', handedBack: 2 }, { group: ['crow'] }, { group: ['duck'] }],
      seed: -1.5,
    }, null)!
    expect(wild.shown).toEqual(['dough'])
    expect(wild.peel).toEqual({ at: 'board', load: { raw: true, flour: MOST, water: 0, bubbly: false, seeds: false, work: 0, long: false, rise: 0, bake: 99.99 } })
    expect(wild.rack).toEqual([{ raw: false, crumb: 'pancake', shape: 'flat', crust: 'gold', seeds: false }, null, null, null])
    expect(wild.hatch, 'the goat and the bear cannot share a bread').toBeNull()
    expect(wild.finished).toBe(true)
    expect(wild.lane.length).toBeLessThanOrEqual(LANE_MOST)
    expect(wild.lane[0]).toEqual({ group: ['hen'], from: 'dough', handedBack: 0 })
    const animals = wild.lane.flatMap((visitor) => visitor.group)
    expect(new Set(animals).size).toBe(animals.length)
    expect(Number.isInteger(wild.seed) && wild.seed >= 0).toBe(true)
  })

  it('keeps the hatch and the cycle in step, brings out the tools of whoever is there, and leaves someone to call in', () => {
    const odd = restore({ ...good(), finished: true, hatch: { group: ['bear', 'hen'], from: 'pairs', handedBack: 1 }, lane: [], tools: {}, shown: [] }, null)!
    expect(odd.finished).toBe(false)
    expect(odd.tools).toEqual({ jar: true, seeds: true })
    expect(odd.shown).toEqual(['dough', 'rising', 'seeds'])
    expect(odd.lane.length).toBeGreaterThan(0)
    const empty = restore({ ...good(), hatch: null, lane: [] }, null)!
    expect(empty.finished).toBe(true)
    expect(empty.lane.length).toBeGreaterThan(0)
  })

  it('does not throw on anything', () => {
    const junk: unknown[] = [null, undefined, 0, '', [], {}, { v: STATE_VERSION }, { v: STATE_VERSION, peel: [], rack: 'x', hatch: 5, lane: [null, 3, {}], tools: [], shown: {} }, { v: STATE_VERSION, peel: { load: { raw: false } } }]
    for (const raw of junk) expect(() => open(raw, null)).not.toThrow()
  })
})

describe('size', () => {
  it('serializes the largest legal bakery far under half the 64 KB cap', () => {
    const longest = [...LADDER].sort((a, b) => b.length - a.length)[0]
    const trio = [...POOLS.trios].sort((a, b) => b.join().length - a.join().length)
    const biggestBread: Bread = { raw: false, crumb: 'crumbly', shape: 'round', crust: 'black', seeds: true }
    const largest: Bakery = {
      position: longest, finished: false, shown: [...IDEAS], tools: { jar: true, seeds: true },
      peel: { at: 'board', load: { raw: true, flour: MOST, water: MOST, bubbly: true, seeds: true, work: WORK_FULL, long: true, rise: 99.99, bake: 99.99 } },
      rack: Array<Bread>(RACK_PLACES).fill(biggestBread),
      hatch: { group: trio[0], from: longest, handedBack: 99 },
      lane: Array.from({ length: LANE_MOST }, (_, at) => ({ group: trio[at + 1], from: longest, handedBack: 99 })),
      seed: 0xffffffff,
    }
    const bytes = new TextEncoder().encode(JSON.stringify(serialize(largest))).length
    expect(bytes).toBeLessThan(32 * 1024)
    expect(bytes, 'in fact a small record').toBeLessThan(2 * 1024)
  })
})
