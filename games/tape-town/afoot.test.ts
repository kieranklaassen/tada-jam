import { describe, expect, it } from 'vitest'
import { DT, OUT_PLACE, drag, leastRoom, nudge, run, strip, townWith, type Heard } from './bench'
import { answer } from './going'
import { ROLLS, STARTER } from './layout'
import { freshTown } from './save'
import { Town } from './town'
import { hopTo } from './way'

// A toy on foot across the boards gets to its tape: past the edge of the boards, after it has hopped out of
// somebody's way, and round whoever cannot step aside.

const afloat = (town: Town): boolean => { const doing = town.bodies.duck.doing; return doing.is === 'ride' && doing.kind === 1 }
/** Runs until the duck is in the water, and says how many seconds that took; Infinity when it never was. */
const untilAfloat = (town: Town, most: number, each?: () => void): number => {
  for (let k = 0; k < most / DT; k++) { if (afloat(town)) return k * DT; run(town, DT); each?.() }
  return afloat(town) ? most : Infinity
}

describe('a river laid along the edge of the boards, as near it as tape goes', () => {
  it('is one the duck walks into: kept on the boards half a duck short of where it was going, it is on its tape and takes to it', () => {
    const town = townWith([strip(1, 400, 112, 900, 112)], { duck: { x: 450, y: 300, a: 0 } })
    nudge(town)
    // On its own feet all the way: it is in the water before a toy that could not get there would hop the rest.
    let hops = 0
    expect(untilAfloat(town, 5.5, () => { if (town.bodies.duck.flight) hops++ })).toBeLessThan(5.5)
    expect(hops).toBe(0)
  })
})

describe('a duck hopped aside on its way to the river', () => {
  // The river lies beyond a road the bus is driving along.
  const start = (): Town => {
    const town = townWith([strip(0, 330, 300, 900, 300), strip(1, 400, 150, 900, 150)], { duck: { x: 450, y: 480, a: -Math.PI / 2 }, bus: { x: 700, y: 300, a: Math.PI } })
    nudge(town)
    return town
  }

  it('stands aside for the bus and, when the bus has gone, sets off again and gets there', () => {
    const town = start(), duck = town.bodies.duck, bus = town.bodies.bus
    const aside = (): boolean => duck.doing.is === 'stand' && duck.doing.aside === 'bus'
    for (let k = 0; k < 300 && !aside(); k++) run(town, DT)
    expect(aside()).toBe(true)
    // The bus is taken off the road and left standing far away: nobody is on the road any more.
    bus.at.x = 880; bus.at.y = 440; bus.at.a = 0
    bus.doing = { is: 'stand', as: 'bath', since: 0 }
    let least = Infinity
    expect(untilAfloat(town, 20, () => { least = Math.min(least, leastRoom(town).room) })).toBeLessThan(20)
    expect(least).toBeGreaterThanOrEqual(0)
  })

  it('hopped again while it stands aside, by whoever lands beside it, is still on its way: it does not stand there for good', () => {
    const town = start(), duck = town.bodies.duck
    duck.doing = { is: 'stand', as: 'parked', since: town.time, aside: 'bus' }
    hopTo(town, 'duck', { x: 420, y: 520, a: 0 })
    expect(duck.doing).toMatchObject({ is: 'stand', aside: 'bus' })
    expect(duck.asides).toBe(1)
  })

  it('hopped aside twice, it goes the rest of its way in one hop, over the road and whoever is on it: nobody is batted to and fro', () => {
    const town = start(), duck = town.bodies.duck
    // The duck has been hopped out of the way of the bus twice already, and the bus is still coming and going.
    duck.at.y = 520
    duck.doing = { is: 'stand', as: 'parked', since: town.time, aside: 'bus' }
    duck.asides = 2
    let least = Infinity, hops = 0, flying = false
    const took = untilAfloat(town, 3, () => { least = Math.min(least, leastRoom(town).room); if (duck.flight && !flying) hops++; flying = duck.flight !== null })
    expect(took).toBeLessThan(3)
    expect(hops).toBe(1)
    expect(least).toBeGreaterThanOrEqual(0)
  })

  it('hopped aside once, it does not hop there yet: it waits for the bus to go by and walks', () => {
    const town = start(), duck = town.bodies.duck
    duck.at.y = 520
    duck.doing = { is: 'stand', as: 'parked', since: town.time, aside: 'bus' }
    duck.asides = 1
    run(town, 1.2)
    expect(duck.flight).toBe(null)
    expect(duck.doing.is).toBe('stand')
  })

  it('where its river is full it stays on its feet, hops nobody about, and is in the water as soon as there is room', () => {
    // A river one duck long, and the car in the middle of a turn on it: nobody in the middle of something is hopped away.
    const town = townWith([strip(1, 600, 300, 700, 300)], { duck: { x: 420, y: 480, a: 0 }, car: { x: 650, y: 300, a: 0 } })
    nudge(town)
    const duck = town.bodies.duck, car = town.bodies.car
    car.doing = { is: 'stand', as: 'dazed', since: Infinity }
    duck.doing = { is: 'stand', as: 'parked', since: town.time, aside: 'car' }
    duck.asides = 2
    let hops = 0
    run(town, 4, [], () => { if (duck.flight || car.flight) hops++ })
    expect(hops).toBe(0)
    expect(afloat(town)).toBe(false)
    // The car is done: it stands there like anybody, and makes way for the duck whose river it is.
    car.doing = { is: 'stand', as: 'parked', since: town.time }
    // It looks every half second: it is in the air at its next look, and swimming when its hop and its bottom-up are done.
    let inAir = Infinity
    const freed = town.time
    expect(untilAfloat(town, 2.5, () => { if (duck.flight) inAir = Math.min(inAir, town.time - freed) })).toBeLessThan(2.5)
    expect(inAir).toBeLessThanOrEqual(0.5 + DT + 1e-9)
    expect(Math.hypot(car.at.x - 650, car.at.y - 300)).toBeGreaterThan(60)
  })
})

describe('a duck whose river stays full', () => {
  it('waits longer each time it has been hopped aside before it sets off on its feet again: twice hopped, twice as long', () => {
    const town = townWith([strip(1, 600, 300, 700, 300)], { duck: { x: 420, y: 480, a: 0 }, car: { x: 650, y: 300, a: 0 } })
    nudge(town)
    const duck = town.bodies.duck
    town.bodies.car.doing = { is: 'stand', as: 'dazed', since: Infinity }
    duck.doing = { is: 'stand', as: 'parked', since: town.time, aside: 'car' }
    duck.asides = 2
    let hops = 0
    const log = run(town, 20, [], () => { if (duck.flight) hops++ })
    expect(duck.doing.is).toBe('stand')
    run(town, 6, log)
    expect(duck.doing.is).toBe('walk')
    expect(hops).toBe(0)
    // It said that it was setting off when it first did, and not again now: one quack in all.
    expect(log.filter((heard) => heard.name === 'quack').length).toBe(1)
  })
})

describe('the duck stopped on its way by a dog that has nowhere to go', () => {
  // The town as it opens, built: the river lies below the road, and the dog stands between the duck and it with the
  // bus, the box and a peg round it.
  const start = (): Town => {
    const town = townWith([strip(0, STARTER.ax, STARTER.ay, STARTER.bx, STARTER.by), strip(1, 560, 560, 952, 560)], { duck: OUT_PLACE.duck, dog: OUT_PLACE.dog, bus: OUT_PLACE.bus, pegA: OUT_PLACE.pegA, pegB: { x: 560, y: 506, a: -0.4 }, pegC: OUT_PLACE.pegC, train: OUT_PLACE.train, car: { x: 800, y: 320, a: 0.164 } })
    // The bus stays where it landed.
    town.bodies.bus.doing = { is: 'stand', as: 'bath', since: 0 }
    nudge(town)
    return town
  }
  const stood = OUT_PLACE.duck
  const gone = (town: Town): number => Math.hypot(town.bodies.duck.at.x - stood.x, town.bodies.duck.at.y - stood.y)

  it('goes round on its own feet, straight after its quack: a few steps to one side to a place it can walk straight to, and on from there', () => {
    const town = start(), duck = town.bodies.duck
    let hops = 0, least = Infinity
    const log = run(town, 1, [], () => { if (duck.flight) hops++; least = Math.min(least, leastRoom(town).room) })
    // It has not stood and waited for the dog: within a second it is on its way round.
    expect(duck.rounds).toBe(1)
    expect(log.filter((heard) => heard.name === 'quack').length).toBe(1)
    run(town, 4, [], () => { if (duck.flight) hops++; least = Math.min(least, leastRoom(town).room) })
    expect(gone(town)).toBeGreaterThan(80)
    expect(hops).toBe(0)
    expect(least).toBeGreaterThanOrEqual(0)
  })

  it('that has had enough of going round goes over instead: one hop onto its river, and no second quack', () => {
    const town = start(), duck = town.bodies.duck
    duck.roundAt = town.time
    let least = Infinity
    const log: Heard[] = []
    expect(untilAfloat(town, 2, () => { least = Math.min(least, leastRoom(town).room) })).toBeLessThan(2)
    run(town, 0.5, log)
    expect(log.filter((heard) => heard.name === 'quack').length).toBe(0)
    expect(duck.rounds).toBe(0)
    expect(least).toBeGreaterThanOrEqual(0)
  })

  it('six seconds on its way and not there, it goes the rest in one hop', () => {
    const town = start(), duck = town.bodies.duck
    run(town, 5.5)
    expect(duck.doing.is).toBe('walk')
    expect(untilAfloat(town, 1.5)).toBeLessThan(1.5)
  })
})

describe('the town as it opens, with its first river', () => {
  it('laid from the lower left up across the road, has the duck in it within half a minute, and a bridge for it to go under', () => {
    const town = new Town(freshTown(3), 1)
    run(town, 5)
    town.press(ROLLS[1]); town.lift(); run(town, 0.3)
    drag(town, { x: 300, y: 420 }, { x: 700, y: 120 })
    let least = Infinity
    expect(untilAfloat(town, 30, () => { least = Math.min(least, leastRoom(town).room) })).toBeLessThan(30)
    expect(town.crossings.some((crossing) => crossing.kind === 'bridge')).toBe(true)
    expect(least).toBeGreaterThanOrEqual(0)
  })

  it('laid down the right of the floor, has the duck in it within a quarter of a minute', () => {
    const town = new Town(freshTown(3), 1)
    run(town, 5)
    town.press(ROLLS[1]); town.lift(); run(town, 0.3)
    drag(town, { x: 600, y: 420 }, { x: 900, y: 660 })
    let least = Infinity
    expect(untilAfloat(town, 15, () => { least = Math.min(least, leastRoom(town).room) })).toBeLessThan(15)
    expect(least).toBeGreaterThanOrEqual(0)
  })
})

describe('a duck on foot that can go neither round nor over', () => {
  // A way one toy wide between hedges, a peg in it with nowhere to hop to, and beyond it a stub of river with a car
  // on it that cannot be cleared.
  const hedges = [-186, -124, -62, 62, 124, 186].map((dy) => strip(2, 330, 300 + dy, 800, 300 + dy))

  it('waits there after its quack, as long as it ever did, and then goes back the way it came', () => {
    const town = townWith([...hedges, strip(1, 829, 300, 891, 300)], { duck: { x: 340, y: 300, a: 0 }, pegB: { x: 640, y: 300, a: 0 }, car: { x: 860, y: 300, a: 0 } })
    town.bodies.car.doing = { is: 'stand', as: 'dazed', since: Infinity }
    nudge(town)
    const duck = town.bodies.duck
    for (let k = 0; k < 600 && !town.waiting.has('duck'); k++) run(town, DT)
    expect(town.waiting.has('duck')).toBe(true)
    const stopped = { ...duck.at }
    expect(stopped.x).toBeGreaterThan(440)
    let hops = 0
    run(town, 1.5, [], () => { if (duck.flight || town.bodies.car.flight || town.bodies.pegB.flight) hops++ })
    // No way round, and nowhere on its river to land: it has not turned back at once.
    expect(Math.hypot(duck.at.x - stopped.x, duck.at.y - stopped.y)).toBeLessThan(3)
    expect(hops).toBe(0)
    run(town, 2.5)
    expect(Math.hypot(duck.at.x - stopped.x, duck.at.y - stopped.y)).toBeGreaterThan(40)
  })
  const corridor = (peg: number): Town => {
    const town = townWith([...hedges, strip(1, 829, 300, 891, 300)], { duck: { x: 340, y: 300, a: 0 }, pegB: { x: peg, y: 300, a: 0 }, car: { x: 860, y: 300, a: 0 } })
    town.bodies.car.doing = { is: 'stand', as: 'dazed', since: Infinity }
    nudge(town)
    return town
  }
  const quacks = (log: Heard[]): number => log.filter((heard) => heard.name === 'quack').length

  it('back where it set off from, it sets off for the same place again without a second quack', () => {
    const town = corridor(640), log: Heard[] = []
    let turned = 0, last = 0
    run(town, 20, log, () => { const now = Math.sign(town.bodies.duck.at.x - last); if (now < 0) turned++; last = town.bodies.duck.at.x })
    // It has been stopped, gone back and set off again, and what was heard of it is the one quack at the peg.
    expect(turned).toBeGreaterThan(30)
    expect(quacks(log)).toBe(1)
  })

  it('stopped within a second of setting off, its quack as it set off is its toot: there is no second one', () => {
    const town = corridor(470), log: Heard[] = []
    // It stands, and is called by its river: it says so as it sets off, and the peg is in its way from its first step.
    town.bodies.duck.doing = { is: 'stand', as: 'plain', since: 0 }
    town.bodies.duck.offFor = null
    expect(answer(town, 'duck', town.state.strips[town.state.strips.length - 1])).toBe(true)
    run(town, 3, log)
    expect(town.bodies.duck.doing.is).toBe('walk')
    expect(quacks(log)).toBe(1)
    expect(log.filter((heard) => heard.name === 'scuff').length).toBe(1)
  })
})
