import { describe, expect, it } from 'vitest'
import { LADDER, type PositionId } from './config'
import { toyLetGo } from './deeds'
import { PLACES } from './places'
import { deserializeWorld, serializeWorld, type Saved } from './save'
import { STATE_VERSION } from './state'
import { STACK_MOST } from './tray'
import { bellyOf, crewNow, homeOf, newWorld, nextCrew, startCycle, trayOf, type World } from './world'

const at = (position: PositionId, seed = 5): World => ({ ...newWorld(null), position, cycle: startCycle(position, seed, false) })
const through = (world: World, childAge: number | null = null) => deserializeWorld(JSON.parse(JSON.stringify(serializeWorld(world))), childAge)
const feedAll = (world: World) => world.cycle.toys.forEach((_, toy) => { if (world.cycle.where[toy].at === 'tray') toyLetGo(world, toy, { on: 'gobbler', slot: homeOf(world, toy) }) })

/** Every toy of the load is somewhere it can be, once. */
function whole(world: World): void {
  const tray = trayOf(world.cycle)
  const everywhere = [...tray.flat(), ...crewNow(world).flatMap((_, slot) => bellyOf(world.cycle, slot))].sort((a, b) => a - b)
  expect(everywhere).toEqual(world.cycle.toys.map((_, toy) => toy))
  tray.forEach((stack, place) => {
    expect(stack.length).toBeLessThanOrEqual(STACK_MOST)
    stack.forEach((toy, level) => expect(world.cycle.where[toy]).toEqual({ at: 'tray', place, level }))
  })
}

describe('the saved state', () => {
  it('comes back as it was left: at the start, in the middle of a sort, between crews and after the ending', () => {
    for (const position of LADDER) {
      const world = at(position)
      expect(through(world)).toEqual(world)
      toyLetGo(world, 0, { on: 'gobbler', slot: (homeOf(world, 0) + 1) % crewNow(world).length })
      toyLetGo(world, 1, { on: 'gobbler', slot: homeOf(world, 1) })
      toyLetGo(world, 2, { on: 'place', place: (world.cycle.where[3] as { place: number }).place })
      world.shown.colour = true
      expect(through(world)).toEqual(world)
      feedAll(world)
      expect(through(world)).toEqual(world)
      while (nextCrew(world)) { expect(through(world)).toEqual(world); feedAll(world) }
      expect(world.finished).toBe(true)
      expect(through(world)).toEqual(world)
    }
  })

  it('opens a fresh game for anything that is not its record, at the place the age gives', () => {
    for (const junk of [undefined, null, 7, 'x', [], {}, { v: STATE_VERSION + 1, position: 'three-ways' }, { position: 'three-ways' }]) {
      expect(deserializeWorld(junk, null)).toEqual(newWorld(null))
      expect(deserializeWorld(junk, 6).position).toBe('colours-then-kinds')
    }
  })

  it('keeps the position when the cycle cannot be read, and lays a fresh load out there', () => {
    for (const cycle of [undefined, 5, {}, { from: 'two-kinds', crews: [], toys: [] }, { from: 'nowhere', crews: [['red', 'blue']], toys: [{ colour: 'red', kind: 'duck', size: 'small', place: 0, level: 0 }] }]) {
      const world = deserializeWorld({ v: STATE_VERSION, position: 'two-kinds', finished: true, cycle }, null)
      expect(world.position).toBe('two-kinds')
      expect(world.finished).toBe(false)
      expect(world.cycle).toEqual(startCycle('two-kinds', 1, false))
    }
  })

  it('takes the default position for one it does not know, and keeps the rest', () => {
    const saved = { ...serializeWorld(at('three-colours')), position: 'grade-one' }
    const world = deserializeWorld(saved, 5)
    expect(world.position).toBe('colours-among-kinds')
    expect(world.cycle.toys.length).toBe(6)
  })

  it('repairs where a toy is, toy by toy, and never drops one from the load', () => {
    const saved = JSON.parse(JSON.stringify(serializeWorld(at('three-ways-wide')))) as Saved
    const toys = saved.cycle.toys as unknown as Record<string, unknown>[]
    toys[0].place = 99 // off the tray
    delete toys[1].place // nowhere
    toys[2].place = toys[3].place; toys[2].level = 0 // two on the same studs
    Object.assign(toys[4], { place: undefined, slot: 0, nth: 0 }); Object.assign(toys[5], { place: undefined, slot: 1, nth: 7 }) // in bellies, right or wrong
    toys[6].level = 2 // in the air over its place
    const world = deserializeWorld(saved, null)
    expect(world.cycle.toys.length).toBe(9)
    whole(world)
    const stacked = trayOf(world.cycle)[toys[3].place as number]
    expect(stacked.sort()).toEqual([2, 3])
    expect((world.cycle.where[6] as { level: number }).level).toBe(0)
    for (const toy of [4, 5]) {
      const where = world.cycle.where[toy]
      if (where.at === 'belly') expect(homeOf(world, toy)).toBe(where.slot)
    }
  })

  it('repairs each small field by itself', () => {
    const saved = JSON.parse(JSON.stringify(serializeWorld(at('colours-then-kinds')))) as Record<string, Record<string, unknown>>
    saved.cycle.tried = 'yes'; saved.cycle.misses = -3; saved.cycle.sort = 9; saved.cycle.harder = 1
    saved.shown = { colour: 'true', kind: true } as Record<string, unknown>
    ;(saved as Record<string, unknown>).crates = 'none'
    const world = deserializeWorld(saved, null)
    expect(world.cycle.tried).toEqual(world.cycle.toys.map(() => false))
    expect(world.cycle.misses).toBe(0)
    expect(world.cycle.sort).toBe(0)
    expect(world.cycle.harder).toBe(false)
    expect(world.shown).toEqual({ colour: false, kind: true, size: false })
    expect(world.crates).toEqual([])
  })

  it('never shows an ending over a tray that still holds toys, and never leaves a finished load with no crate', () => {
    const early = { ...serializeWorld(at('two-colours')), finished: true }
    expect(deserializeWorld(early, null).finished).toBe(false)
    const done = at('two-colours'); feedAll(done)
    const lost = { ...serializeWorld(done), finished: false, crates: [{ from: 'two-kinds', seed: 3 }] }
    const world = deserializeWorld(lost, null)
    expect(world.finished).toBe(true)
    expect(world.crates).toEqual(done.crates)
    expect(world.position).toBe(done.position)
  })

  it('reads any damaged record without throwing and without losing a toy', () => {
    const good = JSON.stringify(serializeWorld((() => { const world = at('three-ways'); toyLetGo(world, 0, { on: 'gobbler', slot: homeOf(world, 0) }); return world })()))
    const junk = [null, -1, 3.5, 99, 'x', true, [], {}, [[]], { place: 1 }]
    let s = 4242
    const next = (n: number) => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s % n }
    const damage = (value: unknown, depth: number): unknown => {
      if (next(7) === 0) return junk[next(junk.length)]
      if (Array.isArray(value)) return value.map((one) => damage(one, depth + 1))
      if (typeof value === 'object' && value !== null) return Object.fromEntries(Object.entries(value).map(([key, one]) => [key, depth === 0 && key === 'v' ? one : damage(one, depth + 1)]))
      return value
    }
    for (let i = 0; i < 400; i++) {
      const world = deserializeWorld(damage(JSON.parse(good), 0), null)
      expect(LADDER).toContain(world.position)
      whole(world)
      expect(through(world)).toEqual(world)
    }
  })

  it('stays small: the largest legal state is far under half the 64 KB cap', () => {
    let largest = 0
    for (const position of LADDER) for (let seed = 1; seed <= 40; seed++) {
      const world = at(position, seed)
      world.cycle.harder = true; world.cycle.misses = world.cycle.toys.length * world.cycle.crews.length
      world.cycle.tried = world.cycle.toys.map(() => true)
      world.shown = { colour: true, kind: true, size: true }
      feedAll(world)
      while (nextCrew(world)) feedAll(world)
      // Ended, with both crates waiting: nothing more can be stored than this.
      largest = Math.max(largest, JSON.stringify(serializeWorld(world)).length)
      expect(world.cycle.toys.length).toBeLessThan(PLACES)
    }
    expect(largest).toBeLessThan(1024)
    expect(largest).toBeLessThan(32 * 1024)
  })
})
