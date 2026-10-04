import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { BAKE_SECONDS, RISE_SECONDS, WORK_FULL, darker, pull, push, rest, tip, type Bread, type Ingredient, type Load } from './stuff'
import { ANIMALS, IDEAS, MOST_WANTS, POOLS, TASTES, canShare, ideasOf, judge, reachableBreads, wantsOf, type Animal, type Verdict } from './tastes'

const make = (...what: Ingredient[]): Load => what.reduce<Load>((at, next) => tip(at, next).load, null)
const worked = (load: Load): Load => { for (let i = 0; i < WORK_FULL; i++) load = push(load).load; return load }
const bake = (load: Load): Bread => { const out = rest(load, 'oven', BAKE_SECONDS); if (!out || out.raw) throw new Error('not baked'); return out }
const brick = bake(worked(make('flour', 'water')))
const crumbly = bake(make('flour', 'water'))
const airy = bake(rest(worked(make('flour', 'water', 'bubbly')), 'nook', RISE_SECONDS))
const longBrick = bake(pull(worked(make('flour', 'water'))).load)
const pancake = bake(make('flour', 'water', 'water'))
const seeded = (bread: Bread): Bread => ({ ...bread, seeds: true })
const no = (verdict: Verdict) => { if (verdict.wanted) throw new Error('wanted'); return verdict }

describe('fixed tastes', () => {
  it('gives every customer a bread it wants, and every bread a customer', () => {
    const breads = reachableBreads()
    for (const animal of ANIMALS) expect(breads.some((bread) => judge([animal], bread).wanted), animal).toBe(true)
    for (const bread of breads.filter((bread) => bread.crumb !== 'dust' && bread.crumb !== 'seeds'))
      expect(ANIMALS.some((animal) => judge([animal], bread).wanted), JSON.stringify(bread)).toBe(true)
  })

  it('makes the brick the goat\'s favourite and the bear\'s least', () => {
    expect(judge(['goat'], brick)).toEqual({ wanted: true, secret: false })
    expect(judge(['bear'], brick)).toEqual({ wanted: false, reason: 'crumb', by: 'bear', hated: true })
    expect(judge(['bear'], airy)).toEqual({ wanted: true, secret: false })
    expect(judge(['goat'], airy)).toEqual({ wanted: false, reason: 'crumb', by: 'goat', hated: true })
    expect(judge(['sparrows'], crumbly).wanted).toBe(true)
    expect(no(judge(['sparrows'], brick)).hated).toBe(true)
  })

  it('reads each of the four properties', () => {
    expect(judge(['dachshund'], longBrick).wanted).toBe(true)
    expect(no(judge(['dachshund'], brick)).reason).toBe('shape')
    expect(no(judge(['crow'], brick)).reason).toBe('crust')
    expect(judge(['crow'], darker(brick)).wanted).toBe(true)
    expect(judge(['crow'], darker(darker(brick))).wanted).toBe(true)
    expect(no(judge(['hen'], brick)).reason).toBe('seeds')
    expect(judge(['hen'], seeded(brick)).wanted).toBe(true)
    expect(judge(['duck'], pancake).wanted).toBe(true)
    expect(judge(['mole'], airy).wanted).toBe(true)
    expect(no(judge(['mole'], darker(airy))).reason).toBe('crust')
  })

  it('judges the same thing the same way every time', () => {
    for (const animal of ANIMALS) for (const bread of reachableBreads()) expect(judge([animal], bread)).toEqual(judge([animal], { ...bread }))
  })

  it('hands back what is no bread with a reason of its own, and harms nothing', () => {
    expect(no(judge(['goat'], null)).reason).toBe('nothing')
    expect(no(judge(['goat'], make('flour'))).reason).toBe('dust')
    expect(no(judge(['goat'], bake(make('flour')))).reason).toBe('dust')
    expect(no(judge(['goat'], make('water'))).reason).toBe('wet')
    expect(no(judge(['goat'], make('seeds'))).reason).toBe('loose-seeds')
    expect(no(judge(['goat'], worked(make('flour', 'water')))).reason).toBe('raw')
    expect(no(judge(['duck'], make('flour', 'water', 'water'))).reason).toBe('raw')
    const dough = worked(make('flour', 'water')), before = JSON.stringify(dough)
    judge(['bear'], dough)
    expect(JSON.stringify(dough)).toBe(before)
  })

  it('keeps two secrets that work every time, for the one animal alone', () => {
    expect(judge(['hen'], make('seeds'))).toEqual({ wanted: true, secret: true })
    expect(judge(['hen'], bake(make('seeds')))).toEqual({ wanted: true, secret: true })
    expect(judge(['duck'], make('water'))).toEqual({ wanted: true, secret: true })
    expect(judge(['hen', 'goat'], make('seeds')).wanted).toBe(false)
    expect(judge(['crow'], make('water')).wanted).toBe(false)
  })

  it('shows one reason, the most basic first, by the animal whose want it is', () => {
    expect(judge(['dachshund', 'bear'], brick)).toEqual({ wanted: false, reason: 'crumb', by: 'bear', hated: true })
    expect(judge(['bear', 'dachshund'], airy)).toEqual({ wanted: false, reason: 'shape', by: 'dachshund', hated: true })
    expect(judge(['goat', 'crow', 'hen'], brick)).toEqual({ wanted: false, reason: 'crust', by: 'crow', hated: true })
    expect(judge(['goat', 'crow', 'hen'], darker(brick))).toEqual({ wanted: false, reason: 'seeds', by: 'hen', hated: true })
    expect(judge(['goat', 'crow', 'hen'], seeded(darker(brick)))).toEqual({ wanted: true, secret: false })
  })
})

describe('who comes with whom', () => {
  it('has a pool for every position of the designed order and for nothing else', () => {
    expect(Object.keys(POOLS).sort()).toEqual([...LADDER].sort())
    for (const id of LADDER) expect(POOLS[id].length, id).toBeGreaterThan(0)
  })

  it('never asks for more than three things at once, and always for something that can be baked', () => {
    const breads = reachableBreads()
    for (const id of LADDER) for (const group of POOLS[id]) {
      expect(wantsOf(group).length, group.join('+')).toBeLessThanOrEqual(MOST_WANTS)
      expect(breads.some((bread) => judge(group, bread).wanted), group.join('+')).toBe(true)
    }
  })

  it('adds one want at a time along the order: one, then two, then three', () => {
    for (const id of LADDER.slice(0, 6)) for (const group of POOLS[id]) expect(wantsOf(group).length, id).toBe(1)
    for (const group of POOLS.pairs) { expect(group.length).toBe(2); expect(wantsOf(group).length).toBe(2) }
    for (const group of POOLS.trios) expect(wantsOf(group).length).toBe(3)
  })

  it('brings the first six ideas in order, one new idea a position', () => {
    IDEAS.forEach((idea, at) => {
      expect(LADDER[at]).toBe(idea)
      for (const group of POOLS[idea]) expect(ideasOf(group).every((needed) => IDEAS.indexOf(needed) <= at), group.join('+')).toBe(true)
      expect(POOLS[idea].some((group) => ideasOf(group).includes(idea)), idea).toBe(true)
    })
  })

  it('keeps apart those whose wants cannot meet in one bread', () => {
    expect(canShare(['goat', 'bear']), 'two crumbs').toBe(false)
    expect(canShare(['duck', 'dachshund']), 'batter cannot be pulled long').toBe(false)
    expect(canShare(['sparrows', 'dachshund']), 'rough dough rips short').toBe(false)
    expect(canShare(['mole', 'hen']), 'four wants').toBe(false)
    expect(canShare(['dachshund', 'hen'])).toBe(true)
    expect(POOLS.pairs.length).toBeGreaterThanOrEqual(10)
    expect(POOLS.trios.length).toBeGreaterThanOrEqual(6)
  })

  it('gives every animal a taste, a least-wanted bread and an idea', () => {
    for (const animal of ANIMALS as readonly Animal[]) {
      const taste = TASTES[animal]
      expect(taste.wants.length).toBeGreaterThan(0)
      expect(IDEAS).toContain(taste.idea)
      const hated = reachableBreads().filter((bread) => { const verdict = judge([animal], bread); return !verdict.wanted && verdict.hated })
      expect(hated.length, `${animal} has a bread it wants least`).toBeGreaterThan(0)
    }
  })
})
