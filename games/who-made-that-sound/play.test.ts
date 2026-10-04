import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { FIRST_SEED, isOver, isSound, layClutch, stir } from './layout'
import { FORMS, ROW_MAX } from './places'
import { type Action, type Happening, HILL_MAX, type World, act, freshWorld, waitingOf } from './world'

// Whole games, played by three kinds of child: one who listens, one who opens hides blindly, and one who taps
// anywhere at all. They hold what the design sheet says of the order, of blind play and of dead ends.

const at = (position: string, seed: number, shown = true): World => {
  const laid = layClutch(position, seed)
  return { ...freshWorld(null), position, rng: laid.rng, next: laid.clutch, shown: shown ? [...FORMS] : [] }
}

/** The spot a listening child goes for: the one that sounds like whoever asks. */
function rightSpot(world: World): number {
  const cycle = world.cycle!
  if (cycle.asker === null) return cycle.slots.findIndex((slot) => slot !== 'done')
  return cycle.kinds.findIndex((kind, i) => kind === cycle.asker && cycle.slots[i] !== 'done')
}

/** One cycle played by a child who listens: no wrong attempt. Returns the taps it took. */
function listen(world: World): { world: World; taps: number } {
  let taps = 0
  const tap = (action: Action) => { world = act(world, action).world; taps++ }
  if (world.finished) tap({ type: 'edge' })
  while (!world.finished) {
    if (waitingOf(world) && world.cycle!.asker === null) { tap({ type: 'edge' }); continue }
    const spot = rightSpot(world)
    const before = world.cycle!.slots[spot]
    tap({ type: 'slot', slot: spot })
    if (before === 'fresh' && !world.finished) tap({ type: 'slot', slot: spot })
    expect(taps).toBeLessThan(60)
  }
  return { world, taps }
}

describe('a child who listens', () => {
  it('climbs one place a cycle to the last place and stays there', () => {
    let world = freshWorld(null)
    const places: string[] = []
    for (let cycle = 0; cycle < LADDER.length + 2; cycle++) {
      places.push(world.position)
      ;({ world } = listen(world))
    }
    expect(places).toEqual([...LADDER, LADDER[LADDER.length - 1], LADDER[LADDER.length - 1]])
    expect(world.shown).toEqual(['seek', 'who', 'alike'])
  })

  it('finishes any clutch of any place in a handful of taps', () => {
    for (const position of LADDER) for (let i = 0; i < 40; i++) {
      const { world, taps } = listen(at(position, stir(FIRST_SEED, i)))
      expect(world.cycle!.wrong).toBe(0)
      // Four spots at most, two taps each, and a tap to bring each asker in.
      expect(taps).toBeLessThanOrEqual(ROW_MAX * 3)
    }
  })
})

/**
 * Blind play, exactly: at every choice the child picks one of the spots still in the row with equal chance and
 * taps it until it has been tried. A grown one sent to the wrong egg comes back, so there the child tries each
 * one once before any twice. Returns the chance of each count of wrong attempts when the cycle ends.
 */
function blind(world: World, chance = 1, out: number[] = [0, 0, 0, 0], tried: number[] = []): number[] {
  if (world.finished && world.cycle) { out[world.cycle.wrong] += chance; return out }
  if (world.finished || (waitingOf(world) && world.cycle!.asker === null)) return blind(act(world, { type: 'edge' }).world, chance, out)
  const cycle = world.cycle!
  const open = cycle.slots.flatMap((slot, i) => (slot === 'done' || tried.includes(i) ? [] : [i]))
  for (const spot of open) {
    let next = world
    // Tap it until the attempt has been made: once to hear, once to try.
    for (let taps = 0; taps < 3; taps++) {
      const step = act(next, { type: 'slot', slot: spot })
      next = step.world
      if (step.happened.some((one) => one.type === 'meets' || one.type === 'stepsOut' || one.type === 'finds')) break
    }
    const sentBack = !next.finished && next.cycle!.slots[spot] !== 'done'
    blind(next, chance / open.length, out, sentBack ? [...tried, spot] : [])
  }
  return out
}

describe('a child who opens hides blindly', () => {
  it('has no wrong attempt one time in two with two eggs', () => {
    const [none, one, two, three] = blind(at('two-eggs', FIRST_SEED))
    expect(none).toBeCloseTo(1 / 2, 9)
    expect(one).toBeCloseTo(1 / 2, 9)
    expect(two + three).toBe(0)
  })

  it('has no wrong attempt one time in six with three eggs, and two wrong ones one time in three', () => {
    for (const position of ['three-eggs', 'near-voice', 'leaf-piles', 'near-in-leaves']) {
      const [none, one, two, three] = blind(at(position, stir(FIRST_SEED, 7)))
      expect(none).toBeCloseTo(1 / 6, 9)
      expect(one).toBeCloseTo(1 / 2, 9)
      expect(two + three).toBeCloseTo(1 / 3, 9)
    }
  })

  it('so drifts down from every place with three in the row, and up from none of them more often than down', () => {
    for (const position of LADDER.slice(1)) {
      const [none, , two, three] = blind(at(position, stir(FIRST_SEED, 3)))
      expect(none, position).toBeLessThanOrEqual(two + three + 1e-9)
    }
  })

  it('always gets everyone out: there is no dead end', () => {
    for (const position of LADDER) {
      const chances = blind(at(position, stir(FIRST_SEED, 11)))
      expect(chances.reduce((sum, chance) => sum + chance, 0)).toBeCloseTo(1, 9)
    }
  })
})

/** Everything that has to hold after any tap whatever. */
function holds(world: World, before: World, happened: Happening[]): void {
  expect(LADDER).toContain(world.position)
  expect(world.finished).toBe(world.next !== null)
  if (world.next) {
    expect(isSound(world.next)).toBe(true)
    expect(world.next.slots.every((slot) => slot === 'fresh')).toBe(true)
    expect(world.next.kinds).not.toContain(world.extra)
    expect(world.next.place).toBe(world.position)
  }
  if (world.cycle) {
    expect(isSound(world.cycle)).toBe(true)
    expect(isOver(world.cycle)).toBe(world.finished)
    // The egg in the basket is never of a kind in the row it could be tipped into.
    if (!world.finished) expect(world.cycle.kinds).not.toContain(world.extra)
    expect(world.cycle.kinds.length).toBeLessThanOrEqual(ROW_MAX)
  }
  expect(world.hill.length).toBeLessThanOrEqual(HILL_MAX)
  expect(new Set(world.hill.map((resident) => resident.kind)).size).toBe(world.hill.length)
  expect(new Set(world.hill.map((resident) => resident.place)).size).toBe(world.hill.length)
  // Nobody on the hill moves unless it leaves: whoever was there before and is there still stands in the same place.
  for (const resident of world.hill) {
    const was = before.hill.find((other) => other.kind === resident.kind)
    if (was && !happened.some((one) => one.type === 'leaves' && one.kind === resident.kind)) expect(resident.place).toBe(was.place)
  }
  // One alone on the hill is still waited for: its own is in the row, at the stone or still to come.
  for (const resident of world.hill) {
    if (resident.as !== 'single') continue
    const cycle = world.cycle!
    expect(world.finished).toBe(false)
    expect(cycle.form === 'alike' ? cycle.kinds.some((kind, i) => kind === resident.kind && cycle.slots[i] !== 'done') : cycle.queue.includes(resident.kind)).toBe(true)
  }
  // The place moves only when a cycle ends, and one step at most.
  const moved = LADDER.indexOf(world.position) - LADDER.indexOf(before.position)
  expect(Math.abs(moved)).toBeLessThanOrEqual(1)
  if (moved !== 0) expect(happened.some((one) => one.type === 'ends')).toBe(true)
  // Nothing a tap does is lost in the save: it is plain JSON and comes back the same.
  expect(JSON.parse(JSON.stringify(world))).toEqual(world)
  expect(happened.length).toBeGreaterThan(0)
}

describe('a child who taps anywhere at all', () => {
  it('never breaks the world, in two thousand taps from every place', () => {
    for (const [n, position] of LADDER.entries()) {
      let world = at(position, stir(FIRST_SEED, n), false)
      let rng = stir(FIRST_SEED, 100 + n)
      let cycles = 0
      for (let i = 0; i < 2000; i++) {
        rng = stir(rng, i)
        const roll = rng % 100, spot = (rng >>> 8) % 5
        const action: Action = roll < 55 ? { type: 'slot', slot: spot } : roll < 75 ? { type: 'edge' } : roll < 85 ? { type: 'asker' } : roll < 93 ? { type: 'basket' } : { type: 'resident', resident: spot }
        const step = act(world, action)
        holds(step.world, world, step.happened)
        if (step.happened.some((one) => one.type === 'ends')) cycles++
        world = step.world
      }
      // Random tapping keeps finishing cycles: it never gets stuck.
      expect(cycles, position).toBeGreaterThan(20)
    }
  })

  it('plays the same game again from the same save', () => {
    let a = freshWorld(null), b = JSON.parse(JSON.stringify(a)) as World
    let rng = FIRST_SEED
    for (let i = 0; i < 400; i++) {
      rng = stir(rng, i)
      const action: Action = rng % 3 === 0 ? { type: 'edge' } : { type: 'slot', slot: (rng >>> 4) % 4 }
      const one = act(a, action), two = act(b, action)
      expect(two).toEqual(one)
      a = one.world
      b = JSON.parse(JSON.stringify(two.world)) as World
    }
  })
})

describe('when someone new comes to ask', () => {
  it('every hide that was heard is as it was before, so the first tap is again for hearing', () => {
    let world = at('three-eggs', FIRST_SEED)
    world = act(world, { type: 'edge' }).world
    for (const slot of [0, 1, 2]) world = act(world, { type: 'slot', slot }).world
    expect(world.cycle!.slots).toEqual(['heard', 'heard', 'heard'])
    world = act(world, { type: 'slot', slot: rightSpot(world) }).world
    world = act(world, { type: 'edge' }).world
    expect(world.cycle!.slots.filter((slot) => slot === 'heard')).toEqual([])
    expect(world.cycle!.slots.filter((slot) => slot === 'fresh')).toHaveLength(2)
  })
})
