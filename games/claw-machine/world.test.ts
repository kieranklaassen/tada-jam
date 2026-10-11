import { describe, expect, it } from 'vitest'
import { LADDER, type PositionId } from './config'
import { toyLetGo } from './deeds'
import { crewGoesBy } from './gobblers'
import { nextUp } from './order'
import { PLACES } from './places'
import { FIRST_SEED, bellyOf, cameFirst, crewNow, showingOwed, showingStarts, endCycle, homeOf, judge, newWorld, nextCrew, someoneWaits, startCycle, takeCrate, trayIsClear, trayOf, type World } from './world'

const at = (position: PositionId, seed = 7): World => ({ ...newWorld(null), position, finished: false, crates: [], cycle: startCycle(position, seed, false) })

/** Feeds every toy on the tray to a gobbler: its home, or for the first `wrong` toys another gobbler first. */
function sortAll(world: World, wrong = 0): void {
  const toys = world.cycle.toys.map((_, toy) => toy).filter((toy) => world.cycle.where[toy].at === 'tray')
  toys.forEach((toy, i) => {
    const home = homeOf(world, toy)
    if (i < wrong) expect(toyLetGo(world, toy, { on: 'gobbler', slot: (home + 1) % crewNow(world).length }).type).toBe('spit')
    expect(toyLetGo(world, toy, { on: 'gobbler', slot: home }).type).toBe('gulp')
  })
}
function playCycle(world: World, wrongEachSort = 0): void {
  for (;;) {
    sortAll(world, wrongEachSort)
    if (world.finished) return
    expect(nextCrew(world)).not.toBeNull()
  }
}

describe('the world', () => {
  it('starts a first visit by age, at the youngest default for no age, open-ended at both ends', () => {
    expect(newWorld(null).position).toBe('two-colours')
    expect(newWorld(3).position).toBe('two-colours')
    expect(newWorld(4).position).toBe('two-colours')
    expect(newWorld(5).position).toBe('colours-among-kinds')
    expect(newWorld(6).position).toBe('colours-then-kinds')
    expect(newWorld(11).position).toBe('colours-then-kinds')
  })

  it('opens a first visit as an ended cycle: a bare tray and one crate waiting, with nothing to replay', () => {
    const world = newWorld(5)
    expect(world.finished).toBe(true)
    expect(world.cycle.toys).toEqual([])
    // The crew the load is for is at the tray before the load: it is the first crew of what the crate holds,
    // and nothing of it is saved.
    expect(cameFirst(world)).toBe(true)
    expect(crewNow(world)).toEqual(startCycle('colours-among-kinds', FIRST_SEED, false).crews[0])
    expect(world.cycle.crews).toEqual([])
    expect(world.crates).toEqual([{ from: 'colours-among-kinds', seed: FIRST_SEED }])
    expect(someoneWaits(world)).toBe(true)
    // Nothing comes in until the child puts the claw on the crate; then the load and its first crew do.
    expect(takeCrate(world, 1)).toBe(false)
    expect(takeCrate(world, 0)).toBe(true)
    expect(world.finished).toBe(false)
    expect(world.cycle).toEqual(startCycle('colours-among-kinds', FIRST_SEED, false))
    expect(world.position).toBe('colours-among-kinds')
    expect(cameFirst(world)).toBe(false)
    expect(showingOwed(world)).toBe(true)
  })

  it('tells the taller crate apart at every step, by more to sort or by a crew that goes by something new', () => {
    for (const position of LADDER.slice(0, -1)) for (let seed = 1; seed <= 40; seed++) {
      // The two crates that wait when the stored position is this one: its own load, and the load of the step above.
      const plain = startCycle(position, seed, false), taller = startCycle(nextUp(position)!, seed * 31 + 7, true)
      const kinds = (cycle: typeof plain) => new Set(cycle.toys.map((toy) => toy.kind)).size
      const more = taller.toys.length > plain.toys.length || taller.crews.length > plain.crews.length || taller.crews[0].length > plain.crews[0].length || kinds(taller) > kinds(plain)
      const sortedBy = new Set(plain.crews.map(crewGoesBy))
      const somethingNew = taller.crews.some((crew) => !sortedBy.has(crewGoesBy(crew)))
      expect(more || somethingNew, position).toBe(true)
    }
    // The two steps that bring a new attribute and no more of anything.
    for (const position of ['colours-among-kinds', 'colours-then-kinds'] as const) {
      const up = startCycle(nextUp(position)!, 3, true), here = startCycle(position, 3, false)
      expect(up.toys.length).toBeLessThanOrEqual(here.toys.length)
      expect(here.crews.map(crewGoesBy)).not.toContain(crewGoesBy(up.crews[0]))
    }
  })

  it('stands every toy of a load alone on a place of its own, the same way for the same seed', () => {
    for (const position of LADDER) {
      const cycle = startCycle(position, 99, false)
      const tray = trayOf(cycle)
      expect(tray.filter((stack) => stack.length === 1).length).toBe(cycle.toys.length)
      expect(tray.length).toBe(PLACES)
      expect(startCycle(position, 99, false)).toEqual(cycle)
    }
  })

  it('judges a cycle on first tries alone: well, mixed or badly', () => {
    const outcome = (position: PositionId, misses: number) => judge({ ...startCycle(position, 1, false), misses })
    expect([0, 1, 2, 4].map((m) => outcome('two-colours', m))).toEqual(['well', 'mixed', 'badly', 'badly'])
    expect([0, 1, 2, 3].map((m) => outcome('three-colours', m))).toEqual(['well', 'well', 'mixed', 'badly'])
    expect([4, 5, 13, 14].map((m) => outcome('three-ways-wide', m))).toEqual(['well', 'mixed', 'mixed', 'badly'])
  })

  it('ends a cycle on the last gulp of its last sort, and not before', () => {
    const world = at('colours-then-kinds')
    sortAll(world)
    expect(trayIsClear(world.cycle)).toBe(true)
    expect(world.finished).toBe(false)
    const tipped = nextCrew(world)!
    expect(tipped.length).toBe(world.cycle.toys.length)
    expect(crewGoesBy(crewNow(world))).toBe('kind')
    expect(trayOf(world.cycle).filter((stack) => stack.length === 1).length).toBe(world.cycle.toys.length)
    sortAll(world)
    expect(world.finished).toBe(true)
  })

  it('moves the position one step up after a cycle that went well, and lays the crates out from the new one', () => {
    const world = at('two-colours')
    playCycle(world)
    expect(world.position).toBe('three-colours')
    expect(world.crates.map((crate) => crate.from)).toEqual(['three-colours', 'colours-among-kinds'])
    expect(world.crates[0].seed).not.toBe(world.crates[1].seed)
    // Judging the same cycle again moves nothing.
    endCycle(world)
    expect(world.position).toBe('three-colours')
  })

  it('moves one step down after a cycle that went badly, stays after a mixed one, and never leaves the order', () => {
    const badly = at('three-colours'); playCycle(badly, 3)
    expect(badly.position).toBe('two-colours')
    const mixed = at('three-colours'); playCycle(mixed, 2)
    expect(mixed.position).toBe('three-colours')
    const bottom = at('two-colours'); playCycle(bottom, 2)
    expect(bottom.position).toBe('two-colours')
    const top = at('three-ways-wide'); playCycle(top)
    expect(top.position).toBe('three-ways-wide')
    expect(top.crates.map((crate) => crate.from)).toEqual(['three-ways-wide'])
  })

  it('counts a miss once for a toy in a sort, however often it is spat back', () => {
    const world = at('three-colours')
    const toy = 0, home = homeOf(world, toy)
    for (let i = 0; i < 4; i++) toyLetGo(world, toy, { on: 'gobbler', slot: (home + 1) % 3 })
    expect(world.cycle.misses).toBe(1)
  })

  it('keeps the position where it is while a cycle is played', () => {
    const world = at('colours-then-kinds')
    sortAll(world, 3)
    expect(world.position).toBe('colours-then-kinds')
    nextCrew(world)
    expect(world.position).toBe('colours-then-kinds')
  })

  it('begins the next cycle only when the child takes a crate, from the crate taken', () => {
    const world = at('two-colours')
    playCycle(world)
    const [plain, taller] = world.crates
    expect(takeCrate(world, 5)).toBe(false)
    expect(world.finished).toBe(true)
    expect(takeCrate(world, 0)).toBe(true)
    expect(world.finished).toBe(false)
    expect(world.cycle).toEqual(startCycle(plain.from, plain.seed, false))
    expect(world.crates).toEqual([])
    expect(taller.from).toBe('colours-among-kinds')
    expect(takeCrate(world, 0)).toBe(false)
  })

  it('never takes a step away for choosing the taller crate, and gives one for doing it well', () => {
    const well = at('two-colours'); playCycle(well); takeCrate(well, 1)
    expect(well.cycle.harder).toBe(true)
    expect(well.cycle.from).toBe('colours-among-kinds')
    playCycle(well)
    expect(well.position).toBe('colours-among-kinds')
    const badly = at('two-colours'); playCycle(badly); takeCrate(badly, 1); playCycle(badly, 3)
    expect(badly.position).toBe('three-colours')
  })

  it('tips the toys back in the order they went in, and starts the first tries again', () => {
    const world = at('colours-then-kinds')
    sortAll(world, 1)
    const fed = crewNow(world).flatMap((_, slot) => bellyOf(world.cycle, slot))
    expect(nextCrew(world)).toEqual(fed)
    expect(world.cycle.tried.every((tried) => !tried)).toBe(true)
    expect(world.cycle.misses).toBe(1)
    expect(nextCrew(world)).toBeNull()
  })

  it('plays the first showing of an attribute once', () => {
    const world = at('colours-then-kinds')
    // It is owed from the moment the crew is at the tray until it starts, and never again after that.
    expect(showingOwed(world)).toBe(true)
    expect(world.shown.colour).toBe(false)
    showingStarts(world)
    expect(showingOwed(world)).toBe(false)
    sortAll(world); nextCrew(world)
    expect(showingOwed(world)).toBe(true)
    showingStarts(world)
    expect(world.shown).toEqual({ colour: true, kind: true, size: false })
    // No crew at the tray, nothing owed: a first visit, and an ended cycle.
    expect(showingOwed(newWorld(null))).toBe(false)
  })

  it('can be played through every position from the first to the last', () => {
    const world = newWorld(null)
    expect(takeCrate(world, 0)).toBe(true)
    for (let cycles = 0; cycles < LADDER.length - 1; cycles++) { playCycle(world); expect(takeCrate(world, 0)).toBe(true) }
    expect(world.position).toBe('three-ways-wide')
  })
})
