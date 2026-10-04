// What goes into ctx.storage for Bread Day, and how it is read back. It wraps
// state.ts as that file asks: `deserialize` there reads the version, the
// position and `finished`, and this module reads the same record again for the
// bakery's own fields, each repaired by itself, so an old or damaged slot never
// stops the game from opening and never opens on something the rules could not
// have made.
//
// Found as left (ART.md, "The designed order, and what is stored"): the save
// is the whole bakery. Nothing is in the air, no scene is in it, and rising and
// baking are two numbers that only attended time moves.

import { LADDER } from './config'
import { LANE_MOST, RACK_PLACES, fillLane, freshBakery, type Bakery, type Step, type Visitor } from './bakery'
import { STATE_VERSION, deserialize, type GameState } from './state'
import { CRUMBS, CRUSTS, MOST, PLACES, RISE_FULL, WORK_FULL, WORK_SMOOTH, kindOf, type Bread, type Load, type Place, type Stuff } from './stuff'
import { ANIMALS, IDEAS, canShare, ideasOf, type Animal, type Idea } from './tastes'

/** The saved record: the fields of state.ts and the bakery's own. Plain JSON. */
export type Saved = GameState & Pick<Bakery, 'shown' | 'tools' | 'peel' | 'rack' | 'hatch' | 'lane' | 'seed'>

const round = (value: number): number => Math.round(value * 100) / 100

export function serialize(bakery: Bakery): Saved {
  const load = bakery.peel.load
  return {
    v: STATE_VERSION, position: bakery.position, finished: bakery.finished,
    shown: [...bakery.shown], tools: { ...bakery.tools },
    peel: { at: bakery.peel.at, load: load && load.raw ? { ...load, rise: round(load.rise), bake: round(load.bake) } : load },
    rack: [...bakery.rack], hatch: bakery.hatch, lane: [...bakery.lane], seed: bakery.seed,
  }
}

// --- Reading back, field by field -------------------------------------------

type Loose = Record<string, unknown>
const record = (raw: unknown): Loose | null => (typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Loose) : null)
const list = (raw: unknown): unknown[] => (Array.isArray(raw) ? raw : [])
const whole = (raw: unknown, most: number): number => (typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.min(most, Math.round(raw))) : 0)
const amount = (raw: unknown, most: number): number => (typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.min(most, raw)) : 0)
const among = <T extends string>(raw: unknown, all: readonly T[]): T | null => (all.includes(raw as T) ? (raw as T) : null)

function bread(raw: unknown): Bread | null {
  const from = record(raw)
  if (!from || from.raw !== false) return null
  const crumb = among(from.crumb, CRUMBS), crust = among(from.crust, CRUSTS)
  if (!crumb || !crust) return null
  // The shape follows from the crumb wherever the rules leave no choice.
  const loose = crumb === 'dust' || crumb === 'seeds'
  const shape = loose ? 'heap' : crumb === 'pancake' ? 'flat' : from.shape === 'long' && crumb !== 'crumbly' ? 'long' : 'round'
  return { raw: false, crumb, shape, crust, seeds: crumb === 'seeds' || from.seeds === true }
}

function stuff(raw: unknown): Stuff | null {
  const from = record(raw)
  if (!from || from.raw !== true) return null
  const repaired: Stuff = {
    raw: true, flour: whole(from.flour, MOST), water: whole(from.water, MOST), bubbly: from.bubbly === true, seeds: from.seeds === true,
    work: whole(from.work, WORK_FULL), long: false, rise: amount(from.rise, RISE_FULL),
    // At 100 it would already be a bread: a raw thing is always short of it.
    bake: amount(from.bake, 99.99),
  }
  const kind = kindOf(repaired)
  if (kind === 'nothing') return null
  const dough = kind === 'dough'
  return { ...repaired, work: dough || kind === 'batter' ? repaired.work : 0, long: dough && from.long === true && repaired.work >= WORK_SMOOTH, rise: repaired.bubbly && (dough || kind === 'batter') ? repaired.rise : 0 }
}

const load = (raw: unknown): Load => bread(raw) ?? stuff(raw)

function visitor(raw: unknown, position: string, taken: Set<Animal>): Visitor | null {
  const from = record(raw)
  if (!from) return null
  const group = list(from.group).filter((animal): animal is Animal => ANIMALS.includes(animal as Animal))
  if (group.length === 0 || group.length !== list(from.group).length || group.some((animal) => taken.has(animal))) return null
  if (group.length > 1 && !canShare(group)) return null
  for (const animal of group) taken.add(animal)
  return { group, from: among(from.from, LADDER) ?? position, handedBack: whole(from.handedBack, 99) }
}

/** The bakery a saved record holds. Anything that is not this game's record, or is from a newer version, gives a first visit. */
export function restore(raw: unknown, childAge: number | null): Bakery | null {
  const from = record(raw)
  if (!from || from.v !== STATE_VERSION) return null
  const base = deserialize(raw, childAge)
  const taken = new Set<Animal>()
  const hatch = visitor(from.hatch, base.position, taken)
  const lane = list(from.lane).slice(0, LANE_MOST).map((waiting) => visitor(waiting, base.position, taken)).filter((waiting): waiting is Visitor => waiting !== null)
  const peelFrom = record(from.peel), tools = record(from.tools)
  const at: Place = among(peelFrom?.at, PLACES) ?? 'board'
  const rack = Array.from({ length: RACK_PLACES }, (_, place) => bread(list(from.rack)[place]))
  // Whoever is at the hatch has stepped up, so the tools its wants need are out. What has been shown is only what the
  // save says: an idea not yet shown is shown when someone who needs it next steps up.
  const needed = new Set<Idea>(hatch ? ideasOf(hatch.group) : [])
  const shown = IDEAS.filter((idea) => list(from.shown).includes(idea))
  const bakery: Bakery = {
    position: base.position,
    // Nobody is at the hatch exactly when a cycle has ended or the child sent someone back.
    finished: hatch === null,
    shown,
    tools: { jar: tools?.jar === true || needed.has('rising') || shown.includes('rising'), seeds: tools?.seeds === true || needed.has('seeds') || shown.includes('seeds') },
    peel: { at, load: load(peelFrom?.load) },
    rack, hatch, lane,
    seed: typeof from.seed === 'number' && Number.isFinite(from.seed) ? from.seed >>> 0 : 1,
  }
  // Found as left: the lane is filled here only when it is empty, which play never leaves it, so that someone can always be called in.
  return lane.length === 0 ? fillLane(bakery) : bakery
}

/**
 * Open the game. A saved bakery opens exactly as it was left and nothing has
 * happened, so no scene plays. Without one it is a first visit, and what
 * happened is the first customer stepping up; `seed` starts the lane's stream.
 */
export function open(raw: unknown, childAge: number | null, seed = 1): Step {
  const saved = restore(raw, childAge)
  return saved ? { bakery: saved, happened: [] } : freshBakery(childAge, seed)
}
