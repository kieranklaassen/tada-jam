import { bellyLayout } from './belly'
import type { PositionId } from './config'
import { crewGoesBy, shapeOf, snackOf, takes, type GobblerId } from './gobblers'
import { layCycle, nextUp } from './order'
import { PLACES } from './places'
import { rng, shuffled } from './rng'
import { STATE_VERSION, beginCycle, finishCycle, firstPosition, type CycleOutcome } from './state'
import type { Attribute, Toy } from './toys'
import { emptyTray, type Tray } from './tray'

// The world of the game as the rules see it: a load of toys, each on the tray
// or in a belly, the crews that sort it in turn, and the child's place in the
// designed order. No renderer, no clock and nothing in the air: a toy in the
// jaws still belongs to the place it was taken from until it is put down.

export type Where =
  /** On the tray: its place, and how many toys are under it. */
  | { at: 'tray'; place: number; level: number }
  /** In the belly of the gobbler at this slot of the crew, the nth toy of the load to go in. */
  | { at: 'belly'; slot: number; nth: number }

export type Cycle = {
  /** The position this cycle was laid out from, and whether it came from the taller crate. */
  from: PositionId
  harder: boolean
  /** The crews in turn, and which of them is at the tray. */
  crews: GobblerId[][]
  sort: number
  toys: Toy[]
  where: Where[]
  /** For each toy, whether its first try of this sort has been made; and how many first tries of the cycle were spat back. */
  tried: boolean[]
  misses: number
}

export type Crate = { from: PositionId; seed: number }

export type World = {
  /** The stored position: where the next cycle is laid out from. */
  position: PositionId
  /** The cycle on screen has ended and its ending stays. */
  finished: boolean
  cycle: Cycle
  /** For each attribute, whether its first showing has played. */
  shown: Record<Attribute, boolean>
  /** When the cycle has ended: the crate for the stored position and, unless that is the top, a taller one for the step above. */
  crates: Crate[]
}

/** The next seed after this one: a fixed walk, so no clock and no chance is read. */
export function seedAfter(seed: number): number {
  return (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0
}

/**
 * A number drawn from a finished cycle: its toys, where each ended and in
 * what order, and how it went. The next layouts are seeded from it, so what
 * comes next follows from what the child did and from nothing else, and
 * nothing more has to be stored to find it again.
 */
export function cycleNumber(cycle: Cycle): number {
  let h = 2166136261
  const mix = (n: number) => { h = Math.imul(h ^ (n & 0xffff), 16777619) >>> 0 }
  cycle.toys.forEach((toy, i) => {
    const where = cycle.where[i]
    mix(toy.colour.length * 31 + toy.kind.length * 7 + toy.size.length)
    mix(where.at === 'tray' ? where.place * 4 + where.level : 64 + where.slot * 16 + where.nth)
  })
  mix(cycle.misses); mix(cycle.sort); mix(cycle.from.length)
  return h
}

export function startCycle(from: PositionId, seed: number, harder: boolean): Cycle {
  const { toys, crews } = layCycle(from, seed)
  // Each toy stands alone on a place of its own, drawn from the same seed.
  const places = shuffled(rng(seed ^ 0x5bd1e995), Array.from({ length: PLACES }, (_, place) => place))
  return {
    from, harder, crews, sort: 0, toys,
    where: toys.map((_, i) => ({ at: 'tray', place: places[i], level: 0 })),
    tried: toys.map(() => false), misses: 0,
  }
}

export function newWorld(childAge: number | null, seed = 1): World {
  const position = firstPosition(childAge) as PositionId
  return { position, finished: false, cycle: startCycle(position, seed, false), shown: { colour: false, kind: false, size: false }, crates: [] }
}

/** The crew at the tray. */
export function crewNow(world: World): GobblerId[] {
  return world.cycle.crews[world.cycle.sort]
}

/** The tray as stacks of toy numbers, bottom first. A toy in the jaws is left out of it by naming it in `held`. */
export function trayOf(cycle: Cycle, held = -1): Tray {
  const tray = emptyTray()
  const standing = cycle.where.map((where, toy) => ({ where, toy })).filter(({ where, toy }) => where.at === 'tray' && toy !== held)
  standing.sort((a, b) => (a.where as { level: number }).level - (b.where as { level: number }).level)
  for (const { where, toy } of standing) if (where.at === 'tray') tray[where.place].push(toy)
  return tray
}

/** The toys of the load in a belly, in the order they went in. */
export function bellyOf(cycle: Cycle, slot: number): number[] {
  return cycle.where
    .map((where, toy) => ({ where, toy }))
    .filter(({ where }) => where.at === 'belly' && where.slot === slot)
    .sort((a, b) => (a.where as { nth: number }).nth - (b.where as { nth: number }).nth)
    .map(({ toy }) => toy)
}

/** Whether one more toy fits behind a gobbler's window with its snack and what it already holds. */
export function bellyHasRoom(cycle: Cycle, slot: number, toy: number): boolean {
  const id = cycle.crews[cycle.sort][slot]
  const group = [snackOf(id), ...bellyOf(cycle, slot).map((one) => cycle.toys[one]), cycle.toys[toy]]
  return bellyLayout(shapeOf(id), group) !== null
}

/** Whether every toy of the load is in a belly: the sort is done. */
export function trayIsClear(cycle: Cycle): boolean {
  return cycle.where.every((where) => where.at === 'belly')
}

/**
 * How a cycle went, from first tries only. With P first tries (toys times the
 * sorts made) and M of them spat back: well when 6M is at most P, badly when
 * 2M is at least P, mixed between. A cycle with no try made is mixed.
 */
export function judge(cycle: Cycle): CycleOutcome {
  const tries = cycle.toys.length * cycle.crews.length
  if (tries === 0) return 'mixed'
  if (6 * cycle.misses <= tries) return 'well'
  if (2 * cycle.misses >= tries) return 'badly'
  return 'mixed'
}

/**
 * The cycle ended: the last toy of its last sort was swallowed. The position
 * moves one step at most, by the rules of state.ts, and the crates are laid
 * out from where it now stands. A cycle from the taller crate moves the
 * position up when it went well and leaves it otherwise, so choosing the
 * harder load never costs a step.
 */
export function endCycle(world: World): CycleOutcome {
  const outcome = judge(world.cycle)
  if (world.finished) return outcome
  const counted: CycleOutcome = world.cycle.harder && outcome !== 'well' ? 'mixed' : outcome
  const moved = finishCycle({ v: STATE_VERSION, position: world.position, finished: false }, counted)
  world.position = moved.position as PositionId
  world.finished = true
  world.crates = cratesFor(world.position, world.cycle)
  return outcome
}

/** The crates that wait after a cycle: one for the stored position and, unless that is the top, a taller one for the step above. */
export function cratesFor(position: PositionId, ended: Cycle): Crate[] {
  const first = seedAfter(cycleNumber(ended)), second = seedAfter(first)
  const up = nextUp(position)
  return up ? [{ from: position, seed: first }, { from: up, seed: second }] : [{ from: position, seed: first }]
}

/** The child put the claw on a crate: its load comes in and its first crew lines up. Returns false when there is no such crate. */
export function takeCrate(world: World, which: number): boolean {
  const crate = world.finished ? world.crates[which] : undefined
  if (!crate) return false
  world.cycle = startCycle(crate.from, crate.seed, which > 0)
  world.finished = beginCycle({ v: STATE_VERSION, position: world.position, finished: true }).finished
  world.crates = []
  return true
}

/**
 * The next crew of the cycle comes to the tray: the crew that was there tips
 * every toy back out, in the order it went in, onto free places, and the
 * first tries start again. Returns the toys in the order they are tipped, or
 * null when the tray is not clear or no crew waits.
 */
export function nextCrew(world: World): number[] | null {
  const cycle = world.cycle
  if (world.finished || !trayIsClear(cycle) || cycle.sort + 1 >= cycle.crews.length) return null
  const order = cycle.crews[cycle.sort].flatMap((_, slot) => bellyOf(cycle, slot))
  // Tipped from left to right, each onto the next free place along the back row and then the front.
  order.forEach((toy, i) => { cycle.where[toy] = { at: 'tray', place: i, level: 0 } })
  cycle.sort++
  cycle.tried = cycle.toys.map(() => false)
  return order
}

/**
 * A crew has come to the tray. The first time a crew goes by an attribute,
 * its showing plays, once: the mark is set here, when the showing starts, so
 * a put-away in the middle of it never plays it again.
 */
export function crewArrives(world: World): { by: Attribute; showing: boolean } {
  const by = crewGoesBy(crewNow(world))
  const showing = !world.shown[by]
  world.shown[by] = true
  return { by, showing }
}

/** Which gobbler of the crew at the tray takes a toy. Every toy of a load has exactly one. */
export function homeOf(world: World, toy: number): number {
  return crewNow(world).findIndex((id) => takes(id, world.cycle.toys[toy]))
}
