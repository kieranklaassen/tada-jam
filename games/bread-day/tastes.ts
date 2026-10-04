// The customers and their fixed tastes (ART.md, "The characters and their
// fixed tastes"). A taste never changes, so a child can learn it and test it
// on purpose. Pure rules: who wants what, what a customer makes of the exact
// thing it is handed, and who can stand at the hatch together.

import { CRUSTS, EMPTY, MOST, RISE_FULL, WORK_SHAGGY, WORK_SMOOTH, bakedFrom, darker, kindOf, type Bread, type Crumb, type Crust, type Load, type Shape, type Stuff } from './stuff'

export type Animal = 'goat' | 'sparrows' | 'dachshund' | 'bear' | 'crow' | 'hen' | 'duck' | 'mole'
export const ANIMALS: readonly Animal[] = ['goat', 'sparrows', 'dachshund', 'bear', 'crow', 'hen', 'duck', 'mole']

/** The four things a bread has. A want is about exactly one of them. */
export type Property = 'crumb' | 'shape' | 'crust' | 'seeds'
/** The order in which wants are checked, so a bread that misses several shows one reason, the most basic first. */
export const PROPERTIES: readonly Property[] = ['crumb', 'shape', 'crust', 'seeds']

export type Want =
  | { property: 'crumb'; any: readonly Crumb[] }
  | { property: 'shape'; any: readonly Shape[] }
  | { property: 'crust'; any: readonly Crust[] }
  | { property: 'seeds' }

/** One of the six things the badger shows once. Each is also the id of the position that brings it. */
export type Idea = 'dough' | 'shapes' | 'rising' | 'crust' | 'seeds' | 'batter'
export const IDEAS: readonly Idea[] = ['dough', 'shapes', 'rising', 'crust', 'seeds', 'batter']

export type Taste = {
  /** What the bread must be. One want for most, three for the mole. */
  wants: readonly Want[]
  /** The bread it wants least, which gets its own reaction. A taste too, so it never changes. */
  hates: Want | { property: 'seeds'; none: true }
  /** Something that is no bread at all and still sends it off happy, when it is alone at the hatch. */
  alsoLoves?: 'loose-seeds' | 'puddle'
  /** The idea its want rests on, beyond making dough. */
  idea: Idea
}

export const TASTES: Record<Animal, Taste> = {
  goat: { wants: [{ property: 'crumb', any: ['dense'] }], hates: { property: 'crumb', any: ['airy'] }, idea: 'dough' },
  sparrows: { wants: [{ property: 'crumb', any: ['crumbly'] }], hates: { property: 'crumb', any: ['dense'] }, idea: 'dough' },
  dachshund: { wants: [{ property: 'shape', any: ['long'] }], hates: { property: 'shape', any: ['round'] }, idea: 'shapes' },
  bear: { wants: [{ property: 'crumb', any: ['airy'] }], hates: { property: 'crumb', any: ['dense'] }, idea: 'rising' },
  crow: { wants: [{ property: 'crust', any: ['dark', 'black'] }], hates: { property: 'crust', any: ['gold'] }, idea: 'crust' },
  hen: { wants: [{ property: 'seeds' }], hates: { property: 'seeds', none: true }, alsoLoves: 'loose-seeds', idea: 'seeds' },
  duck: { wants: [{ property: 'crumb', any: ['pancake'] }], hates: { property: 'shape', any: ['round', 'long'] }, alsoLoves: 'puddle', idea: 'batter' },
  mole: {
    wants: [{ property: 'crumb', any: ['airy'] }, { property: 'shape', any: ['round'] }, { property: 'crust', any: ['gold'] }],
    hates: { property: 'crust', any: ['black'] },
    idea: 'rising',
  },
}

/** Those at the hatch together: one, two or three animals. */
export type Group = readonly Animal[]

/** The most wants a group may bring: the number comes from the Limits of a record (ART.md, "The records"). */
export const MOST_WANTS = 3

function meets(bread: Bread, want: Taste['hates']): boolean {
  if (want.property === 'seeds') return 'none' in want ? !bread.seeds : bread.seeds
  if (want.property === 'crumb') return want.any.includes(bread.crumb)
  if (want.property === 'shape') return want.any.includes(bread.shape)
  return want.any.includes(bread.crust)
}

/** Every want of the group with its owner, in the order they are checked. */
export function wantsOf(group: Group): { by: Animal; want: Want }[] {
  const all = group.flatMap((by) => TASTES[by].wants.map((want) => ({ by, want })))
  return all.sort((a, b) => PROPERTIES.indexOf(a.want.property) - PROPERTIES.indexOf(b.want.property))
}

/** The ideas a group's wants rest on. Making dough is under all of them. */
export function ideasOf(group: Group): Idea[] {
  const ideas = new Set<Idea>(['dough'])
  for (const animal of group) ideas.add(TASTES[animal].idea)
  return IDEAS.filter((idea) => ideas.has(idea))
}

/**
 * Why a customer does not want what it was handed. One reason, the first that
 * applies, which the customer acts out at the thing itself: it is never about
 * the child.
 */
export type Reason =
  | 'nothing'      // an empty peel
  | 'dust'         // flour, raw or toasted: a sneeze
  | 'wet'          // a puddle: a splash
  | 'loose-seeds'  // seeds with nothing under them: one stuck in a tooth
  | 'raw'          // dough or batter that never saw the oven: gooey strings
  | Property       // a bread that is not the bread it wants

export type Verdict =
  /** It leaves happy. `secret` when what it took is no bread it came for. */
  | { wanted: true; secret: boolean }
  /** It hands the thing back, unharmed. `by` shows the reason; `hated` when the thing is what `by` wants least. */
  | { wanted: false; reason: Reason; by: Animal; hated: boolean }

/** What the group at the hatch makes of exactly this thing. */
export function judge(group: Group, load: Load): Verdict {
  const first = group[0], alone = group.length === 1 ? TASTES[first].alsoLoves : undefined
  const no = (reason: Reason, by: Animal = first, hated = false): Verdict => ({ wanted: false, reason, by, hated })
  if (!load) return no('nothing')
  if (load.raw) {
    const kind = kindOf(load)
    if (kind === 'nothing') return no('nothing')
    if (kind === 'seeds') return alone === 'loose-seeds' ? { wanted: true, secret: true } : no('loose-seeds')
    if (kind === 'puddle') return alone === 'puddle' ? { wanted: true, secret: true } : no('wet')
    return no(kind === 'dust' ? 'dust' : 'raw')
  }
  if (load.crumb === 'dust') return no('dust')
  if (load.crumb === 'seeds') return alone === 'loose-seeds' ? { wanted: true, secret: true } : no('loose-seeds')
  for (const { by, want } of wantsOf(group)) if (!meets(load, want)) return no(want.property, by, meets(load, TASTES[by].hates))
  return { wanted: true, secret: false }
}

/** Every bread the rules can make, each once: found by running the rules, so it cannot drift from them. */
export function reachableBreads(): Bread[] {
  const seen = new Map<string, Bread>()
  for (let flour = 0; flour <= MOST; flour++) for (let water = 0; water <= MOST; water++) for (const bubbly of [false, true]) for (const seeds of [false, true])
    for (const work of [0, WORK_SHAGGY, WORK_SMOOTH]) for (const long of [false, true]) for (const rise of [0, RISE_FULL]) {
      const stuff: Stuff = { ...EMPTY, flour, water, bubbly, seeds, work, long: long && work >= WORK_SMOOTH, rise: bubbly && work >= WORK_SHAGGY ? rise : 0 }
      let bread = bakedFrom(stuff)
      for (let bakes = 0; bread && bakes < CRUSTS.length; bakes++, bread = darker(bread)) seen.set(JSON.stringify(bread), bread)
    }
  return [...seen.values()]
}

/** Whether these animals can come together: a different property each, three wants at most, and a bread that pleases them all. */
export function canShare(group: Group, breads: readonly Bread[] = reachableBreads()): boolean {
  const wants = wantsOf(group)
  if (wants.length > MOST_WANTS || new Set(group).size !== group.length) return false
  if (new Set(wants.map(({ want }) => want.property)).size !== wants.length) return false
  return breads.some((bread) => wants.every(({ want }) => meets(bread, want)))
}

function groupsOf(size: number, from: readonly Animal[], breads: readonly Bread[]): Group[] {
  const found: Group[] = []
  const grow = (group: Animal[], start: number) => {
    if (group.length === size) { if (canShare(group, breads)) found.push(group); return }
    for (let i = start; i < from.length; i++) grow([...group, from[i]], i + 1)
  }
  grow([], 0)
  return found
}

function pools(): Record<string, readonly Group[]> {
  const breads = reachableBreads(), singles = ANIMALS.filter((animal) => TASTES[animal].wants.length === 1)
  return {
    dough: [['goat'], ['sparrows']],
    shapes: [['dachshund']],
    rising: [['bear']],
    crust: [['crow']],
    seeds: [['hen']],
    batter: [['duck']],
    pairs: groupsOf(2, singles, breads),
    trios: [['mole'], ...groupsOf(3, singles, breads)],
  }
}

/** Who each position of the designed order brings to the lane, keyed by the ids of `LADDER` in config.ts. */
export const POOLS: Record<string, readonly Group[]> = pools()
