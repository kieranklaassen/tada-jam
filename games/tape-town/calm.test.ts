import { describe, expect, it } from 'vitest'
import { DT, OUT_PLACE, carry, drag, nudge, run, strip, townWith, type Heard } from './bench'
import { offTape } from './floor'
import { ROLLS, TOY_IDS, TOY_SIZE, type ToyId } from './layout'
import { freshTown } from './save'
import { Town } from './town'

// A town at rest is calm: as it opens nobody stands stopped by anybody, nobody is sent hopping by the same toy
// again and again, and the dog that has been hopped out of the way twice lies down and watches.

const loud = (log: Heard[]): string[] => log.map((heard) => heard.name).filter((name) => /toot|honk|parp|quack|whine/.test(name))

/** Runs a town and counts each toy's hops, and the frames in which somebody stood stopped by a toy that only stands there. */
function watch(town: Town, seconds: number, log: Heard[] = []): { hops: Partial<Record<ToyId, number>>; all: number; stopped: number } {
  const hops: Partial<Record<ToyId, number>> = {}, flying: Partial<Record<ToyId, boolean>> = {}
  let all = 0, stopped = 0
  for (const id of TOY_IDS) flying[id] = town.bodies[id].flight !== null
  run(town, seconds, log, () => {
    for (const id of TOY_IDS) {
      const now = town.bodies[id].flight !== null
      if (now && !flying[id]) { hops[id] = (hops[id] ?? 0) + 1; all++ }
      flying[id] = now
    }
    for (const blockers of town.waiting.values()) if (blockers.size === 0) stopped++
  })
  return { hops, all, stopped }
}

describe('the town as it opens, with nothing touched but the rug', () => {
  for (const age of [3, null]) {
    it(`with its first road down for a child of ${age ?? 'no known age'}, the bus honks once at the dog in its way and is over it and on the road within a second and a half; after that nobody stands stopped and nothing honks or hops`, () => {
      for (const seed of [1, 2, 3]) {
        const town = new Town(freshTown(age), seed), bus = town.bodies.bus
        nudge(town)
        const log: Heard[] = []
        const first = watch(town, 1.5, log)
        expect(loud(log)).toEqual(['honk-low'])
        expect(first.hops.bus).toBe(1)
        expect(bus.doing).toMatchObject({ is: 'ride', kind: 0 })
        // It stood there for less than half a second.
        expect(first.stopped * DT).toBeLessThan(0.5)
        nudge(town)
        const rest: Heard[] = []
        const after = watch(town, 40, rest)
        expect(loud(rest)).toEqual([])
        expect(after.all).toBe(0)
        expect(after.stopped).toBe(0)
      }
    })
  }

  it('with no tape down nobody goes anywhere: every toy is where it landed, nobody is in anybody\'s way, and nothing honks or hops', () => {
    for (const age of [6, 9]) {
      const town = new Town(freshTown(age), 1)
      nudge(town)
      const log: Heard[] = []
      const got = watch(town, 30, log)
      expect(loud(log)).toEqual([])
      expect(got.all).toBe(0)
      expect(got.stopped).toBe(0)
      expect(town.waiting.size).toBe(0)
      for (const id of TOY_IDS) expect(town.bodies[id].at, id).toMatchObject({ x: OUT_PLACE[id].x, y: OUT_PLACE[id].y })
    }
  })
})

describe('nobody is sent hopping by the same toy again and again', () => {
  const road = strip(0, 330, 300, 900, 300)
  const inTheWay = { x: 640, y: 300, a: 0 }
  /** The car drives at a peg in the road, which hops; `times` more times the peg is stood back where it was. */
  const start = (): Town => {
    const town = townWith([road], { car: { x: 420, y: 300, a: 0 }, pegB: { ...inTheWay } })
    nudge(town)
    return town
  }
  const untilHop = (town: Town, most: number, log: Heard[] = []): boolean => {
    for (let k = 0; k < most / DT; k++) { run(town, DT, log); if (town.bodies.pegB.flight) return true }
    return false
  }
  const putBack = (town: Town): void => {
    const peg = town.bodies.pegB, car = town.bodies.car
    run(town, 0.5)
    // Back in the road, a little way ahead of the car, wherever it has got to.
    peg.at = { x: car.at.x + (car.doing.is === 'ride' && car.doing.rider.dir === -1 ? -200 : 200), y: 300, a: 0 }
    peg.flight = null
  }

  it('the second time, it lands well clear of every tape, where nobody will ask it to move again', () => {
    const town = start(), peg = town.bodies.pegB
    expect(untilHop(town, 5)).toBe(true)
    // The first hop is the short one to the nearest free floor beside the road.
    expect(offTape(road, peg.at, TOY_SIZE.pegB)).toBeLessThan(40)
    expect(peg.hopped.car).toBe(1)
    putBack(town)
    expect(untilHop(town, 8)).toBe(true)
    expect(peg.hopped.car).toBe(2)
    expect(offTape(road, peg.at, TOY_SIZE.pegB)).toBeGreaterThanOrEqual(60)
  })

  it('the third time it stays: the car stops short of it without a sound, and turns back', () => {
    const town = start(), peg = town.bodies.pegB, car = town.bodies.car
    expect(untilHop(town, 5)).toBe(true)
    putBack(town)
    expect(untilHop(town, 8)).toBe(true)
    putBack(town)
    const stood = { ...peg.at }, way = car.doing.is === 'ride' ? car.doing.rider.dir : 0
    const log: Heard[] = []
    expect(untilHop(town, 12, log)).toBe(false)
    expect(peg.at).toMatchObject(stood)
    expect(loud(log)).toEqual([])
    // It did not stand there for good: it has turned and gone the other way.
    expect(car.doing.is === 'ride' ? car.doing.rider.dir : 0).toBe(-way)
    expect(Math.abs(car.at.x - stood.x)).toBeGreaterThan(150)
  })

  it('a finger starts the count again: picked up and set down in the road, the peg hops for the car as it did at first', () => {
    const town = start(), peg = town.bodies.pegB
    expect(untilHop(town, 5)).toBe(true)
    putBack(town)
    expect(untilHop(town, 8)).toBe(true)
    run(town, 0.5)
    carry(town, 'pegB', { x: town.bodies.car.at.x < 600 ? 760 : 460, y: 300 })
    expect(peg.hopped).toEqual({})
    expect(untilHop(town, 12)).toBe(true)
    expect(peg.hopped.car).toBe(1)
  })

  it('and so does a tap on the one that was sent', () => {
    const town = start(), peg = town.bodies.pegB
    expect(untilHop(town, 5)).toBe(true)
    run(town, 0.5)
    expect(peg.hopped.car).toBe(1)
    town.press({ x: peg.at.x, y: peg.at.y }); town.lift()
    expect(peg.hopped).toEqual({})
  })

  it('and so does a strip laid or peeled: whoever was sent hopping may be again', () => {
    const town = start(), peg = town.bodies.pegB
    expect(untilHop(town, 5)).toBe(true)
    run(town, 0.5)
    expect(peg.hopped.car).toBe(1)
    town.press(ROLLS[2]); town.lift()
    drag(town, { x: 400, y: 150 }, { x: 700, y: 150 })
    run(town, 1)
    expect(peg.hopped).toEqual({})
  })

  it('the duck set on the first road with the car and the bus on it: no toy hops more than twice in two minutes, and none after the first half minute', () => {
    for (const seed of [1, 2]) {
      const town = new Town(freshTown(3), seed)
      run(town, 4)
      carry(town, 'duck', { x: 700, y: 303 })
      const early = watch(town, 30)
      for (const id of TOY_IDS) expect(early.hops[id] ?? 0, id).toBeLessThanOrEqual(2)
      nudge(town)
      const log: Heard[] = []
      const late = watch(town, 90, log)
      expect(late.all).toBe(0)
      expect(loud(log)).toEqual([])
    }
  })
})

describe('the dog that follows along a short road', () => {
  const start = (length: number, who: 'car' | 'bus'): Town => {
    const town = townWith([strip(0, 400, 300, 400 + length, 300)], { [who]: { x: 500, y: 300, a: 0 }, dog: { x: 650, y: 400, a: 0 } })
    town.bodies.dog.doing = { is: 'stand', as: 'plain', since: 0 }
    nudge(town)
    return town
  }

  it('hopped out of the way twice, lies down beside the road and watches: two hops in two minutes, and none after the first half minute', () => {
    for (const [length, who] of [[400, 'car'], [400, 'bus'], [300, 'car'], [560, 'bus']] as const) {
      const town = start(length, who), dog = town.bodies.dog
      const early = watch(town, 30)
      expect(early.hops.dog, `${who} on ${length}`).toBe(2)
      expect(dog.doing, `${who} on ${length}`).toMatchObject({ is: 'stand', as: 'lying' })
      const lay = { ...dog.at }
      const late = watch(town, 90)
      expect(late.hops.dog ?? 0, `${who} on ${length}`).toBe(0)
      expect(dog.at).toMatchObject(lay)
      expect(dog.doing).toMatchObject({ is: 'stand', as: 'lying' })
    }
  })

  it('a tap gets it up again: it follows whoever passes next', () => {
    const town = start(400, 'car'), dog = town.bodies.dog
    watch(town, 30)
    expect(dog.doing).toMatchObject({ is: 'stand', as: 'lying' })
    town.press({ x: dog.at.x, y: dog.at.y }); town.lift()
    let followed = false
    run(town, 12, [], () => { if (dog.doing.is === 'walk' && dog.doing.follow) followed = true })
    expect(followed).toBe(true)
  })

  it('and so does a road that changes: with one more strip on the end of it, the dog is after the car again', () => {
    const town = start(400, 'car'), dog = town.bodies.dog
    watch(town, 30)
    expect(dog.doing).toMatchObject({ is: 'stand', as: 'lying' })
    town.press(ROLLS[0]); town.lift()
    drag(town, { x: 800, y: 300 }, { x: 800, y: 520 })
    let followed = false
    run(town, 15, [], () => { if (dog.doing.is === 'walk' && dog.doing.follow) followed = true })
    expect(followed).toBe(true)
  })
})

describe('a toy that sits on a stub of its own tape', () => {
  const stub = strip(1, 620, 390, 682, 390)
  const inBath = (town: Town): boolean => { const doing = town.bodies.duck.doing; return doing.is === 'stand' && doing.as === 'bath' }

  it('is at home there: the bus that cannot get by the duck in its bath beside the road does not send it off, honks at nobody, and turns back', () => {
    const town = townWith([strip(0, 330, 300, 900, 300), stub], { bus: { x: 440, y: 300, a: 0 }, duck: { x: 651, y: 390, a: 0 } })
    nudge(town)
    const bus = town.bodies.bus, duck = town.bodies.duck
    expect(inBath(town)).toBe(true)
    const log: Heard[] = []
    let furthest = 0, back = false
    const got = watch(town, 30, log)
    run(town, 30, log, () => { furthest = Math.max(furthest, bus.at.x); if (bus.doing.is === 'ride' && bus.doing.rider.dir === -1) back = true })
    expect(got.hops.duck ?? 0).toBe(0)
    expect(inBath(town)).toBe(true)
    expect(duck.at).toMatchObject({ x: 651, y: 390 })
    expect(loud(log)).toEqual([])
    expect(back).toBe(true)
    // It never got past the duck.
    expect(furthest).toBeLessThan(651)
  })

  it('makes way for the train all the same, which gives way to nobody', () => {
    const town = townWith([strip(3, 330, 300, 900, 300), stub], { train: { x: 440, y: 300, a: 0 }, duck: { x: 651, y: 390, a: 0 } })
    nudge(town)
    expect(inBath(town)).toBe(true)
    const got = watch(town, 12)
    expect(got.hops.duck).toBe(1)
    expect(town.bodies.train.at.x).toBeGreaterThan(651)
  })
})
