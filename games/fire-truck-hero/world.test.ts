import { describe, expect, it } from 'vitest'
import { CELLS, cellOf } from './grid'
import { COLS, MOST, ROWS, cellAt, dry, dryGround, levelAt, pour } from './ground'
import { SPOTS } from './layout'
import { KINDS, THINGS, type Kind } from './things'
import { layOut } from './yards'
import { FLOATS_AT, RUN_OFF_REACH, afloat, driestFreeSpot, gulpOn, gulpOnGround, honk, rest, sweepOver, thingsAt, wantMet, type Spot, type Step, type Thing, type Yard, type YardEvent } from './world'

const at = (kind: Kind, spot: Spot, more: Partial<Thing> = {}): Thing => ({ kind, spot, gulps: 0, ...more })
const yardOf = (things: Thing[], more: Partial<Yard> = {}): Yard => ({ place: 'test', arrangement: 0, things, want: 0, ground: dryGround(), met: false, ...more })

/** Plays moves one after another and gathers every event. */
function play(start: Yard, ...moves: ((yard: Yard) => Step)[]): Step {
  const events: YardEvent[] = []
  let yard = start
  for (const move of moves) {
    const step = move(yard)
    yard = step.yard
    events.push(...step.events)
  }
  return { yard, events }
}
const times = (count: number, move: (yard: Yard) => Step) => new Array<(yard: Yard) => Step>(count).fill(move)
const gulp = (index: number) => (yard: Yard) => gulpOn(yard, index)
const ids = (events: YardEvent[]) => events.flatMap((event) => (event.type === 'result' ? [event.id] : []))
const secrets = (events: YardEvent[]) => events.flatMap((event) => (event.type === 'secret' ? [event.id] : []))
const met = (events: YardEvent[]) => events.filter((event) => event.type === 'want-met').length

function freeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(freeze)
  }
  return value
}

/** A yard with every idea in it: the cat naps in the boat in the pool, above the seed, with the wheel beside. */
const garden = () => yardOf([at('seed', 3), at('pool', 1), at('boat', 1, { in: 1 }), at('cat', 1, { in: 2 }), at('wheel', 2)], { runsTo: 0, flingsTo: [0, 1, 3] })

describe('the grid, reached through the yard', () => {
  it('produces every one of the 35 results by some sequence of calls on a small yard', () => {
    const seen = new Set<string>()
    for (const kind of KINDS) {
      // Aimed at alone, swept, below a pool that runs over, and beside a wheel that spins.
      const alone = play(yardOf([at(kind, 0)]), ...times(THINGS[kind].most + 1, gulp(0)), (yard) => sweepOver(yard, 0))
      const below = play(yardOf([at(kind, 3), at('pool', 1)], { runsTo: 0 }), ...times(5, gulp(1)))
      const beside = play(yardOf([at(kind, 3), at('wheel', 2)], { flingsTo: [0] }), ...times(4, gulp(1)))
      for (const id of [...ids(alone.events), ...ids(below.events), ...ids(beside.events)]) seen.add(id)
    }
    for (const cell of CELLS) expect(seen, `${cell.kind} / ${cell.action}`).toContain(cell.id)
    expect(seen.size).toBe(35)
  })

  it('names a gulp below the fill, at the fill and past it, and the water stays', () => {
    const fire = play(yardOf([at('fire', 0)]), ...times(5, gulp(0)))
    expect(ids(fire.events)).toEqual(['fire-ducks', 'fire-ducks', 'fire-out', 'fire-logs-float', 'fire-logs-float'])
    expect(fire.yard.things[0].gulps).toBe(4)
    const pool = play(yardOf([at('pool', 1)]), ...times(4, gulp(0)))
    expect(ids(pool.events)).toEqual(['pool-bonk', 'pool-bonk', 'pool-bonk', 'pool-full'])
    // Nothing takes water away again: not a sweep, a honk, a rest, or water on the sand.
    const later = play(pool.yard, (yard) => sweepOver(yard, 0), honk, rest, (yard) => gulpOnGround(yard, 1.5, 8.5))
    expect(later.yard.things[0].gulps).toBe(4)
  })

  it('answers open ground with the patch row for the level the sand is now at, and sends up the worm once', () => {
    const { yard, events } = play(yardOf([at('fire', 0)]), ...times(6, (yard) => gulpOnGround(yard, 9.5, 8.5)))
    expect(ids(events)).toEqual(['patch-blot', 'patch-blot', 'patch-puddle', 'patch-mud', 'patch-mud', 'patch-mud'])
    expect(secrets(events)).toEqual(['worm'])
    expect(events[0]).toEqual({ type: 'result', thing: -1, kind: 'patch', action: 'gulp', id: 'patch-blot', cell: cellAt(9.5, 8.5) })
    expect(levelAt(yard.ground, 9.5, 8.5)).toBe('mud')
    expect(gulpOnGround(yard, -1, 2)).toEqual({ yard, events: [] })
    expect(gulpOn(yard, 7)).toEqual({ yard, events: [] })
    expect(sweepOver(yard, -1)).toEqual({ yard, events: [] })
  })
})

describe('water that goes on', () => {
  it('runs over the pool onto what is below, or onto the sand beside it', () => {
    const downhill = play(yardOf([at('seed', 3), at('pool', 1)], { runsTo: 0 }), ...times(6, gulp(1)))
    expect(ids(downhill.events).slice(4)).toEqual(['pool-runs-over', 'seed-soaks', 'pool-runs-over', 'seed-soaks'])
    expect(downhill.yard.things.map((thing) => thing.gulps)).toEqual([2, 5])
    const alone = play(yardOf([at('pool', 1)]), ...times(5, gulp(0)))
    const beside = cellAt(SPOTS[1].x, SPOTS[1].z + RUN_OFF_REACH)
    expect(alone.events.at(-1)).toEqual({ type: 'result', thing: -1, kind: 'patch', action: 'neighbour', id: 'patch-creeps', cell: beside })
    expect(alone.yard.ground[beside]).toBe(1)
  })

  it('floats the boat at three gulps, sinks it when it is full, and carries it out over the rim', () => {
    const start = yardOf([at('pool', 1), at('boat', 1, { in: 0 })])
    expect(afloat(start, 1)).toBe(false)
    const lifted = play(start, ...times(FLOATS_AT, gulp(0)))
    expect(ids(lifted.events)).toEqual(['pool-bonk', 'pool-bonk', 'pool-bonk', 'boat-lifts'])
    expect(afloat(lifted.yard, 1)).toBe(true)
    const sunk = play(lifted.yard, ...times(4, gulp(1)))
    expect(ids(sunk.events)).toEqual(['boat-rocks', 'boat-rocks', 'boat-brims', 'boat-sinks'])
    expect(sunk.yard.things[1].gulps).toBe(0)
    const over = play(sunk.yard, gulp(0), gulp(0))
    // The first of the two fills the pool, which holds the want here, and the second runs over.
    expect(over.events.slice(2)).toEqual([expect.objectContaining({ id: 'pool-runs-over' }), expect.objectContaining({ id: 'boat-lifts' }), { type: 'moved', thing: 1, to: 1 }, expect.objectContaining({ id: 'patch-creeps' })])
    expect(over.yard.things[1]).toEqual({ kind: 'boat', spot: 1, gulps: 0 })
    expect(thingsAt(over.yard, 1)).toEqual([0, 1])
    // On sand a full boat brims over and keeps its water.
    expect(play(over.yard, ...times(6, gulp(1))).yard.things[1].gulps).toBe(THINGS.boat.most)
  })

  it('spins the wheel on a stream: drops at its fill, a gulp for each neighbour past it, and nothing kept', () => {
    const start = yardOf([at('seed', 1), at('wheel', 0), at('cat', 2)], { flingsTo: [0, 2] })
    const spun = play(start, ...times(3, gulp(1)))
    expect(ids(spun.events)).toEqual(['wheel-ticks', 'wheel-ticks', 'wheel-spins', 'seed-soaks', 'cat-sneezes'])
    expect(spun.yard.things.map((thing) => thing.gulps)).toEqual([0, 3, 0])
    const blur = play(spun.yard, gulp(1), gulp(1))
    expect(ids(blur.events)).toEqual(['wheel-whistles', 'seed-soaks', 'cat-sneezes', 'wheel-whistles', 'seed-soaks', 'cat-sneezes'])
    expect(blur.yard.things.map((thing) => thing.gulps)).toEqual([2, 4, 2])
    expect(rest(blur.yard).yard.things.map((thing) => thing.gulps)).toEqual([2, 0, 2])
    expect(rest(start)).toEqual({ yard: start, events: [] })
    // A gulp anywhere else ends the row, so the next one on the wheel is the first again.
    expect(ids(play(spun.yard, (yard) => gulpOnGround(yard, 1.5, 8.5), gulp(1)).events).at(-1)).toBe('wheel-ticks')
    expect(ids(play(spun.yard, gulp(0), gulp(1)).events).at(-1)).toBe('wheel-ticks')
  })
})

describe('the cat', () => {
  it('stalks to the driest free spot when soaked, climbs the roof at too much, and jumps off at a honk', () => {
    const start = yardOf([at('fire', 0), at('cat', 1)], { ground: pour(pour(dryGround(), SPOTS[2].x, SPOTS[2].z, 1), SPOTS[3].x, SPOTS[3].z, 2) })
    const soaked = play(start, ...times(3, gulp(1)))
    // Soaked, she shakes herself, and the fire she sat by spits at the drops.
    expect(soaked.events.slice(2)).toEqual([expect.objectContaining({ id: 'cat-soaked' }), expect.objectContaining({ id: 'fire-spits', by: 'drops' }), { type: 'moved', thing: 1, to: 4 }])
    expect(soaked.yard.things[0].gulps).toBe(0)
    const roof = gulpOn(soaked.yard, 1)
    expect(roof.events).toEqual([expect.objectContaining({ id: 'cat-to-roof' }), { type: 'moved', thing: 1, to: 'roof' }, { type: 'secret', id: 'cat-on-roof' }])
    // The roof takes no water: she stays, and the secret is not given again until she climbs again.
    const again = gulpOn(roof.yard, 1)
    expect(again.events).toEqual([expect.objectContaining({ id: 'cat-to-roof' })])
    expect(again.yard.things[1]).toEqual({ kind: 'cat', spot: 'roof', gulps: 4 })
    const off = honk(again.yard)
    expect(off.events).toEqual([{ type: 'honk' }, { type: 'moved', thing: 1, to: 1 }])
    expect(honk(off.yard)).toEqual({ yard: off.yard, events: [{ type: 'honk' }] })
    expect(secrets(gulpOn(off.yard, 1).events)).toEqual(['cat-on-roof'])
  })

  it('stays where she is when no spot is free', () => {
    const full = yardOf([at('fire', 0), at('seed', 1), at('pool', 2), at('wheel', 3), at('cat', 4)])
    expect(driestFreeSpot(full)).toBeNull()
    const soaked = play(full, ...times(3, gulp(4)))
    expect(soaked.yard.things[4].spot).toBe(4)
    expect(soaked.events.some((event) => event.type === 'moved')).toBe(false)
  })

  it('is marooned once, when the pool under the boat she naps in reaches three gulps', () => {
    const filled = play(garden(), ...times(4, gulp(1)))
    expect(secrets(filled.events)).toEqual(['marooned-cat'])
    expect(filled.events.indexOf(filled.events.find((event) => event.type === 'secret')!)).toBe(4)
    // A soaked cat leaves the boat, and no pool maroons her after that.
    const left = play(garden(), ...times(3, gulp(3)), ...times(4, gulp(1)))
    expect(left.yard.things[3].in).toBeUndefined()
    expect(secrets(left.events)).toEqual([])
  })
})

describe('the want', () => {
  it('is met by aiming at it, said once, and by nothing aimed elsewhere', () => {
    for (const kind of ['fire', 'pool', 'seed', 'patch'] as const) {
      const { yard, events } = play(yardOf([at(kind, 2), at('cat', 0)]), gulp(1), ...times(THINGS[kind].most + 2, gulp(0)))
      expect(events.findIndex((event) => event.type === 'want-met')).toBe(events.findIndex((event) => event.type === 'result' && event.id === cellOf(kind, 'fill').id) + 1)
      expect(met(events)).toBe(1)
      expect(yard.met).toBe(true)
    }
    const elsewhere = play(yardOf([at('seed', 2), at('cat', 0)]), ...times(4, gulp(1)), honk, (yard) => sweepOver(yard, 0))
    expect(met(elsewhere.events)).toBe(0)
    expect(wantMet(elsewhere.yard)).toBe(false)
  })

  it('is met for the snail by a puddle under it as well', () => {
    const { yard, events } = play(yardOf([at('patch', 2)]), ...times(3, (yard) => gulpOnGround(yard, SPOTS[2].x, SPOTS[2].z)))
    expect(yard.things[0].gulps).toBe(0)
    expect(events.at(-1)).toEqual({ type: 'want-met', thing: 0 })
    // Water on the patch itself darkens the sand under it, and its fourth gulp is mud.
    const aimed = play(yardOf([at('patch', 2)]), ...times(4, gulp(0)))
    expect(levelAt(aimed.yard.ground, SPOTS[2].x, SPOTS[2].z)).toBe('mud')
    expect(secrets(aimed.events)).toEqual(['worm'])
  })

  it('is met at one remove: by overfilling the pool above it, and by spinning the wheel beside it', () => {
    for (const kind of ['seed', 'patch', 'fire'] as const) {
      const downhill = play(yardOf([at(kind, 3), at('pool', 1)], { runsTo: 0 }), ...times(7, gulp(1)))
      expect(downhill.events.at(-1)).toEqual({ type: 'want-met', thing: 0 })
      expect(met(downhill.events)).toBe(1)
      const round = play(yardOf([at(kind, 1), at('wheel', 0), at('cat', 2)], { flingsTo: [0, 2] }), ...times(6, gulp(1)))
      expect(round.events.findIndex((event) => event.type === 'want-met')).toBeGreaterThan(0)
      expect(round.yard.things[0].gulps).toBe(3)
      expect(met(play(round.yard, ...times(4, gulp(1))).events)).toBe(0)
    }
  })
})

describe('any play at all', () => {
  it('never changes the yard it was given', () => {
    let yard = freeze(garden())
    const before = JSON.stringify(yard)
    for (const move of [...times(5, gulp(4)), ...times(6, gulp(1)), ...times(5, gulp(3)), ...times(5, gulp(2)), ...times(5, gulp(0)), honk, rest, (y: Yard) => sweepOver(y, 0), ...times(5, (y: Yard) => gulpOnGround(y, 5.5, 8.5))]) {
      const held = JSON.stringify(yard)
      const next = freeze(move(yard).yard)
      expect(JSON.stringify(yard)).toBe(held)
      yard = next
    }
    expect(JSON.stringify(garden())).toBe(before)
  })

  it('stays a legal yard of plain JSON through 200 calls picked by a seeded generator, for many seeds', () => {
    for (let seed = 1; seed <= 40; seed++) {
      let state = seed * 2654435761
      const pick = (below: number) => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) % below
      let yard = seed % 2 ? garden() : yardOf([at('fire', 0), at('cat', 4), at('wheel', 2), at('patch', 3), at('pool', 1)], { runsTo: 3, flingsTo: [0, 1, 3, 4], want: 3 })
      let wantsMet = 0
      for (let call = 0; call < 200; call++) {
        const index = pick(7) - 1
        const moves = [() => gulpOn(yard, index), () => gulpOn(yard, index), () => sweepOver(yard, index), () => gulpOnGround(yard, pick(COLS + 2) - 0.5, pick(ROWS + 2) - 0.5), () => honk(yard), () => rest(yard)]
        const step = moves[pick(moves.length)]()
        yard = step.yard
        wantsMet += met(step.events)
        expect(JSON.parse(JSON.stringify(yard))).toEqual(yard)
        expect(Math.max(...yard.ground)).toBeLessThanOrEqual(MOST)
        yard.things.forEach((thing) => {
          expect(Number.isInteger(thing.gulps) && thing.gulps >= 0 && thing.gulps <= THINGS[thing.kind].most).toBe(true)
          expect(thing.spot === 'roof' ? thing.kind === 'cat' : Number.isInteger(thing.spot) && thing.spot >= 0 && thing.spot < SPOTS.length).toBe(true)
          if ('in' in thing) expect(yard.things[thing.in!].spot).toBe(thing.spot)
          const standing = yard.things.filter((other) => other.spot === thing.spot && other.in === undefined && other.kind !== 'boat')
          expect(standing.length).toBeLessThanOrEqual(1)
        })
      }
      expect(wantsMet).toBeLessThanOrEqual(1)
      expect(yard.met).toBe(wantsMet === 1)
    }
  })
})

describe('what dries and what never does', () => {
  it('keeps the gulps a thing holds while the open sand round it dries', () => {
    // The dry patch with the snail on it, part-watered, and a mark on open sand beside it.
    let yard = layOut('one-thing', 3)
    yard = gulpOn(yard, 0).yard
    yard = gulpOnGround(yard, 13.5, 8.5).yard
    expect(levelAt(yard.ground, 13.5, 8.5)).toBe('damp')
    // A long while of play: only the grid dries.
    const later = { ...yard, ground: dry(yard.ground, 600) }
    expect(levelAt(later.ground, 13.5, 8.5)).toBe('dry')
    expect(later.things[0].gulps).toBe(1)
    // It waits as it was left: two more gulps meet the want, as if no time had passed.
    const met = gulpOn(gulpOn(later, 0).yard, 0)
    expect(met.events.some((event) => event.type === 'want-met')).toBe(true)
  })

  it('keeps a want met once it is met, however long the yard stays on screen', () => {
    let yard = layOut('one-thing', 3)
    for (let gulp = 0; gulp < 3; gulp++) yard = gulpOn(yard, 0).yard
    expect(yard.met).toBe(true)
    const later = { ...yard, ground: dry(yard.ground, 3600) }
    expect(later.met).toBe(true)
    expect(wantMet(later)).toBe(true)
  })

  it('keeps the water in every kind of thing, since nothing in the rules takes it out but the wheel coming to rest and the boat that sinks', () => {
    let yard = layOut('whole-garden', 0)
    yard.things.forEach((_, index) => { yard = gulpOn(yard, index).yard })
    const held = yard.things.map((thing) => thing.gulps)
    const later = { ...yard, ground: dry(yard.ground, 3600) }
    expect(later.things.map((thing) => thing.gulps)).toEqual(held)
  })
})
