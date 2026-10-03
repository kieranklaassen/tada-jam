import { GOBBLER, takes, type GobblerId, type LiftWay, type WrongWay } from './gobblers'
import { TRAY, placeAt, slotX } from './places'
import { STACK_MOST, nearestFree, nearestWithRoom, type Tray } from './tray'
import { bellyHasRoom, bellyOf, crewNow, endCycle, nextCrew, takeCrate, trayIsClear, trayOf, type World } from './world'

// The object-by-action grid as rules (ART.md, "The object-by-action grid"):
// what happens when the claw meets a thing, in each of five ways. Every deed
// works, none is refused, and no two cells of the grid answer alike. A deed
// changes where toys are; how it looks and sounds is the view's to play.

/** What the claw can be put on. */
export type Target =
  | { on: 'place'; place: number }
  | { on: 'gobbler'; slot: number }
  /** The ledge where the next ones wait; `which` names a crate once the cycle has ended. */
  | { on: 'ledge'; which: number }
  | { on: 'rail-end'; side: -1 | 1 }

export type Deed =
  // The empty claw lands on it.
  | { type: 'grab'; toy: number; place: number; left: number }
  | { type: 'bonk'; column: number }
  | { type: 'lift-gobbler'; gobbler: GobblerId; way: LiftWay }
  | { type: 'bonk-waiter' }
  | { type: 'next-crew'; tipped: number[] }
  | { type: 'take-crate'; which: number }
  | { type: 'bell' }
  // A toy is let go on it.
  | { type: 'click'; toy: number; place: number; level: number; heavy: boolean }
  | { type: 'bounce'; toy: number; off: number; place: number }
  | { type: 'topple'; moved: { toy: number; place: number }[] }
  | { type: 'gulp'; toy: number; slot: number; gobbler: GobblerId; nth: number; chomps: number; ends: 'sort' | 'cycle' | null }
  | { type: 'spit'; toy: number; slot: number; gobbler: GobblerId; way: WrongWay | 'full'; place: number; heavy: boolean }
  | { type: 'thrown-back'; toy: number; place: number; heavy: boolean }
  | { type: 'rim-slide'; toy: number; place: number; heavy: boolean }
  // The claw swings into it.
  | { type: 'knock'; toy: number; from: number; place: number }
  | { type: 'dominoes'; moved: { toy: number; place: number }[] }
  | { type: 'rattle' }
  | { type: 'duck'; gobbler: GobblerId }
  | { type: 'snap-miss'; gobbler: GobblerId }
  | { type: 'lean' }
  | { type: 'double-ding' }
  // The claw waits above it.
  | { type: 'spread-jaws' }
  | { type: 'breathe' }
  | { type: 'wind-up' }
  | { type: 'open-wide'; gobbler: GobblerId }
  | { type: 'stare' }
  | { type: 'hum' }

const isBig = (world: World, toy: number) => world.cycle.toys[toy].size === 'big'

/** The nearest free place. A load always leaves one; if a tray were ever full, the nearest stack with room, or the place itself. */
function freePlace(tray: Tray, x: number, z: number, skip = -1): number {
  const free = nearestFree(tray, x, z, skip)
  if (free >= 0) return free
  const room = nearestWithRoom(tray, x, z, skip)
  return room >= 0 ? room : Math.max(0, skip)
}

/** The empty claw lands on a thing. It always closes on what it is put on. */
export function clawLands(world: World, target: Target): Deed {
  if (target.on === 'place') {
    const stack = trayOf(world.cycle)[target.place]
    // The toy stays where it is for the rules until it is put down: nothing is kept in the air.
    if (stack.length > 0) return { type: 'grab', toy: stack[stack.length - 1], place: target.place, left: stack.length - 1 }
    return { type: 'bonk', column: target.place % TRAY.columns }
  }
  if (target.on === 'gobbler') {
    const gobbler = crewNow(world)[target.slot]
    return { type: 'lift-gobbler', gobbler, way: GOBBLER[gobbler].lifted }
  }
  if (target.on === 'rail-end') return { type: 'bell' }
  // The ledge: the ones who wait come in only on this touch, and only when the tray is clear.
  if (world.finished) return takeCrate(world, target.which) ? { type: 'take-crate', which: target.which } : { type: 'bonk-waiter' }
  const tipped = nextCrew(world)
  return tipped ? { type: 'next-crew', tipped } : { type: 'bonk-waiter' }
}

/** A toy in the jaws is let go over a thing. `toy` is still where it was taken from until this is called. */
export function toyLetGo(world: World, toy: number, target: Target): Deed {
  const cycle = world.cycle, heavy = isBig(world, toy)
  const tray = trayOf(cycle, toy)
  const stand = (place: number) => { const level = tray[place].length; cycle.where[toy] = { at: 'tray', place, level }; return level }
  if (target.on === 'place') {
    const stack = tray[target.place], at = placeAt(target.place)
    if (stack.length >= STACK_MOST) {
      // A stack of three takes no more: the toy bounces off its top onto the nearest place with room.
      const room = nearestWithRoom(tray, at.x, at.z, target.place)
      const place = room >= 0 ? room : freePlace(tray, at.x, at.z, target.place)
      stand(place)
      return { type: 'bounce', toy, off: target.place, place }
    }
    if (heavy && stack.length >= 2) {
      // Too heavy on top: the stack comes down toy by toy, top first, each onto its own free place.
      const moved: { toy: number; place: number }[] = []
      // The toy from the jaws has no place of its own until it is set down.
      let unplaced = toy
      for (const one of [toy, ...stack.slice(1).reverse()]) {
        const place = freePlace(trayOf(cycle, unplaced), at.x, at.z, target.place)
        cycle.where[one] = { at: 'tray', place, level: 0 }
        if (one === toy) unplaced = -1
        moved.push({ toy: one, place })
      }
      return { type: 'topple', moved }
    }
    return { type: 'click', toy, place: target.place, level: stand(target.place), heavy }
  }
  if (target.on === 'gobbler') {
    const slot = target.slot, gobbler = crewNow(world)[slot]
    const first = !cycle.tried[toy]
    cycle.tried[toy] = true
    const fits = takes(gobbler, cycle.toys[toy])
    if (fits && bellyHasRoom(cycle, slot, toy)) {
      const nth = bellyOf(cycle, slot).length
      cycle.where[toy] = { at: 'belly', slot, nth }
      let ends: 'sort' | 'cycle' | null = null
      if (trayIsClear(cycle)) {
        ends = cycle.sort + 1 >= cycle.crews.length ? 'cycle' : 'sort'
        if (ends === 'cycle') endCycle(world)
      }
      return { type: 'gulp', toy, slot, gobbler, nth, chomps: heavy ? 3 : 1, ends }
    }
    // Not its sort: the toy comes back onto the nearest free studs in front of the gobbler, and the state stays.
    if (first && !fits) cycle.misses++
    const place = freePlace(tray, slotX(slot, crewNow(world).length), TRAY.z)
    stand(place)
    return { type: 'spit', toy, slot, gobbler, way: fits ? 'full' : GOBBLER[gobbler].wrong, place, heavy }
  }
  // Over the ledge or the end of the rail the toy comes back to the tray: thrown back by the ones who wait, or
  // down the sloped rim onto the edge.
  const where = cycle.where[toy]
  const from = where.at === 'tray' ? placeAt(where.place) : { x: 0, z: TRAY.z }
  if (target.on === 'ledge') {
    const place = freePlace(tray, from.x, TRAY.z)
    stand(place)
    return { type: 'thrown-back', toy, place, heavy }
  }
  const place = freePlace(tray, target.side * 100, from.z)
  stand(place)
  return { type: 'rim-slide', toy, place, heavy }
}

/** The claw, bare or with a toy in its jaws, swings into a thing. `direction` is -1 toward the left, 1 toward the right. */
export function clawSwingsInto(world: World, target: Target, direction: -1 | 1, carrying: boolean): Deed {
  if (target.on === 'gobbler') {
    const gobbler = crewNow(world)[target.slot]
    return carrying ? { type: 'snap-miss', gobbler } : { type: 'duck', gobbler }
  }
  if (target.on === 'ledge') return { type: 'lean' }
  if (target.on === 'rail-end') return { type: 'double-ding' }
  const cycle = world.cycle, tray = trayOf(cycle), stack = tray[target.place]
  if (stack.length === 0) return { type: 'rattle' }
  const at = placeAt(target.place)
  if (stack.length === 1) {
    // Knocked one place over, the way the swing was going, or to the nearest free place if that one is taken.
    const toy = stack[0]
    const place = freePlace(tray, at.x + direction * TRAY.cell, at.z, target.place)
    cycle.where[toy] = { at: 'tray', place, level: 0 }
    return { type: 'knock', toy, from: target.place, place }
  }
  // A stack goes down like dominoes: the top lands furthest along, the bottom stays.
  const moved: { toy: number; place: number }[] = []
  stack.slice(1).forEach((toy, i) => {
    const place = freePlace(trayOf(cycle), at.x + direction * TRAY.cell * (i + 1), at.z, target.place)
    cycle.where[toy] = { at: 'tray', place, level: 0 }
    moved.push({ toy, place })
  })
  return { type: 'dominoes', moved }
}

/** The claw waits above a thing. Nothing changes; the thing shows that it has noticed. */
export function clawWaitsAbove(world: World, target: Target): Deed {
  if (target.on === 'gobbler') return { type: 'open-wide', gobbler: crewNow(world)[target.slot] }
  if (target.on === 'ledge') return { type: 'stare' }
  if (target.on === 'rail-end') return { type: 'hum' }
  const height = trayOf(world.cycle)[target.place].length
  return height === 0 ? { type: 'breathe' } : height === 1 ? { type: 'spread-jaws' } : { type: 'wind-up' }
}
