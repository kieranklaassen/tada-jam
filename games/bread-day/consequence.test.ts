import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { REACTIONS, canStillBecome, mendFor, reactionTo, type Occasion, type Tools } from './consequence'
import { BAKE_SECONDS, EMPTY, MOST, RISE_FULL, RISE_ROUGH_CAP, RISE_SECONDS, WORK_FULL, WORK_SHAGGY, canRise, darker, kindOf, push, rest, textureOf, tip, type Bread, type Ingredient, type Load, type Stuff } from './stuff'
import { ANIMALS, POOLS, ideasOf, judge, reachableBreads, type Group } from './tastes'

const make = (...what: Ingredient[]): Load => what.reduce<Load>((at, next) => tip(at, next).load, null)
const worked = (load: Load): Load => { for (let i = 0; i < WORK_FULL; i++) load = push(load).load; return load }
const bake = (load: Load): Bread => { const out = rest(load, 'oven', BAKE_SECONDS); if (!out || out.raw) throw new Error('not baked'); return out }
const allOut: Tools = { jar: true, seeds: true }
const groups: Group[] = [...LADDER.flatMap((id) => POOLS[id])]

/** Every raw thing that can lie on the peel with these tools out, on a grid coarse enough to run and fine enough to hold every stage. */
function rawStates(tools: Tools): Stuff[] {
  const states: Stuff[] = []
  for (let flour = 0; flour <= MOST; flour++) for (let water = 0; water <= MOST; water++)
    for (const bubbly of tools.jar ? [false, true] : [false]) for (const seeds of tools.seeds ? [false, true] : [false])
      for (const work of [0, WORK_SHAGGY, WORK_FULL]) for (const long of [false, true]) for (const rise of [0, RISE_ROUGH_CAP, RISE_FULL]) {
        const stuff: Stuff = { ...EMPTY, flour, water, bubbly, seeds, work, long, rise }
        const kind = kindOf(stuff)
        if (kind === 'nothing') continue
        if (work > 0 && kind !== 'dough' && kind !== 'batter') continue
        if (long && (kind !== 'dough' || textureOf(stuff) !== 'smooth')) continue
        if (rise > 0 && (!canRise(stuff) || (textureOf(stuff) !== 'smooth' && rise > RISE_ROUGH_CAP))) continue
        states.push(stuff)
      }
  return states
}

describe('what a customer does with a thing', () => {
  it('has a reaction of its own for every occasion a customer can meet', () => {
    const things: Load[] = [null, make('flour'), make('water'), make('seeds'), make('bubbly'), make('flour', 'water'), make('flour', 'water', 'water'), ...reachableBreads()]
    for (const group of [...ANIMALS.map((animal) => [animal]), ...groups]) for (const thing of things) {
      const verdict = judge(group, thing), { by } = reactionTo(group, verdict)
      const occasion: Occasion = verdict.wanted ? (verdict.secret ? 'secret' : 'wanted') : verdict.hated ? 'hated' : verdict.reason
      expect(REACTIONS[by][occasion], `${by} on ${occasion}`).toBeTruthy()
      expect(reactionTo(group, verdict).name).toBe(REACTIONS[by][occasion])
    }
  })

  it('shares no reaction between two characters, or between two occasions of one', () => {
    const names = ANIMALS.flatMap((animal) => Object.values(REACTIONS[animal]))
    expect(new Set(names).size).toBe(names.length)
    for (const animal of ANIMALS) for (const name of Object.values(REACTIONS[animal])) expect(name.startsWith(`${animal}-`), name).toBe(true)
  })

  it('makes a dislike as much of an event as a like: every customer has both', () => {
    for (const animal of ANIMALS) { expect(REACTIONS[animal].wanted).toBeTruthy(); expect(REACTIONS[animal].hated).toBeTruthy() }
  })
})

describe('where the mend lies', () => {
  it('lets every raw thing on the peel still become a bread the customer wants, whoever is at the hatch', () => {
    const everything = rawStates(allOut)
    expect(everything.length).toBeGreaterThan(100)
    const reach = new Map(everything.map((stuff) => [stuff, canStillBecome(stuff, allOut)]))
    for (const group of groups) for (const stuff of everything) {
      const breads = reach.get(stuff)!
      expect(breads.some((bread) => { const verdict = judge(group, bread); return verdict.wanted && !verdict.secret }), `${group.join('+')} from ${JSON.stringify(stuff)}`).toBe(true)
    }
  }, 30_000)

  it('holds that with only the tools the customer\'s own wants bring out', () => {
    for (const group of groups) {
      const ideas = ideasOf(group), tools: Tools = { jar: ideas.includes('rising'), seeds: ideas.includes('seeds') }
      for (const stuff of rawStates(tools)) expect(['wanted', 'in-place'], `${group.join('+')} from ${JSON.stringify(stuff)}`).toContain(mendFor(group, stuff, tools))
    }
  }, 30_000)

  it('names the one thing to change for the sheet\'s own cases', () => {
    const none: Tools = { jar: false, seeds: false }
    expect(mendFor(['goat'], make('flour'), none), 'dust takes water').toBe('in-place')
    expect(mendFor(['goat'], make('flour', 'water', 'water'), none), 'batter takes flour').toBe('in-place')
    expect(mendFor(['goat'], make('flour', 'water'), none), 'shaggy dough takes more pushing').toBe('in-place')
    expect(mendFor(['bear'], worked(make('flour', 'water', 'bubbly')), allOut), 'flat dough with the bubbly in it rises in the nook').toBe('in-place')
    const brick = bake(worked(make('flour', 'water')))
    expect(mendFor(['goat'], brick, none)).toBe('wanted')
    expect(mendFor(['crow'], brick, none), 'too pale goes back in the oven').toBe('oven-again')
    expect(mendFor(['bear'], brick, allOut), 'a brick stays a brick').toBe('anew')
    expect(mendFor(['hen'], brick, allOut), 'seeds roll off a baked crust').toBe('anew')
    const airy = bake(rest(worked(make('flour', 'water', 'bubbly')), 'nook', RISE_SECONDS))
    expect(mendFor(['mole'], darker(airy), allOut), 'a dark crust is never made pale again').toBe('anew')
    expect(mendFor(['goat'], null, none)).toBe('anew')
  })

  it('never undoes the oven: no bread can become dough again or lose its crust', () => {
    for (const bread of reachableBreads()) {
      for (const what of ['flour', 'water', 'bubbly', 'seeds'] as const) expect(tip(bread, what).load).toEqual(bread)
      expect(push(bread).load).toEqual(bread)
      for (const place of ['board', 'nook', 'sill'] as const) expect(rest(bread, place, 3600)).toEqual(bread)
    }
  })

  it('finds from raw stuff exactly the breads the rules can make', () => {
    const everything = new Set(reachableBreads().map((bread) => JSON.stringify(bread)))
    for (const bread of canStillBecome({ ...EMPTY, flour: 1 }, allOut)) expect(everything.has(JSON.stringify(bread)), JSON.stringify(bread)).toBe(true)
    expect(canStillBecome({ ...EMPTY, flour: 1 }, { jar: false, seeds: false }).some((bread) => bread.crumb === 'airy'), 'no jar, no airy loaf').toBe(false)
  })
})
