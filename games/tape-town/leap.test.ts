import { describe, expect, it } from 'vitest'
import { DT, drag, leastRoom, loaded, names, nudge, run, strip, townWith, type Heard } from './bench'
import { offTape } from './floor'
import { answer } from './going'
import { ROLLS, TAPE_WIDTH, TOY_SIZE } from './layout'
import { landingOn, leapOnto } from './leap'
import type { Town } from './town'
import { hopTo } from './way'

// A strip just pressed flat calls whoever wants that tape, and a toy that cannot get to its tape on its feet
// goes the rest of the way in one hop: who answers, where it lands, and who makes way for it.

/** Whether a toy is travelling the strip that lies along this line. */
const ridesAt = (town: Town, id: 'car' | 'bus' | 'duck' | 'train', y: number): boolean => {
  const body = town.bodies[id], doing = body.doing
  return !body.flight && doing.is === 'ride' && Math.abs(body.at.y - y) < 4
}
const until = (town: Town, most: number, done: () => boolean, each?: () => void): number => {
  for (let k = 0; k < most / DT; k++) { if (done()) return k * DT; run(town, DT); each?.() }
  return done() ? most : Infinity
}

describe('a new road', () => {
  const upper = strip(0, 330, 150, 800, 150), lower = strip(0, 330, 380, 800, 380)

  it('is the one the car takes at once: it leaves the road it is on with a brrm, and is driving the new one within ten seconds', () => {
    const town = townWith([upper, lower], { car: { x: 500, y: 150, a: 0 } })
    nudge(town)
    run(town, 0.5)
    expect(ridesAt(town, 'car', 150)).toBe(true)
    town.takeSounds()
    expect(answer(town, 'car', town.state.strips[1])).toBe(true)
    expect(town.bodies.car.doing.is).toBe('walk')
    expect(town.takeSounds().map((sound) => sound.name)).toEqual(['brrm'])
    let least = Infinity
    expect(until(town, 10, () => ridesAt(town, 'car', 380), () => { least = Math.min(least, leastRoom(town).room) })).toBeLessThan(10)
    expect(least).toBeGreaterThanOrEqual(0)
  })

  it('laid while the car is in the middle of its turn is answered when the turn is done, and not before', () => {
    const town = townWith([upper, lower], { car: { x: 700, y: 150, a: 0 } })
    nudge(town)
    const car = town.bodies.car
    expect(until(town, 15, () => car.doing.is === 'act')).toBeLessThan(15)
    expect(answer(town, 'car', town.state.strips[1])).toBe(false)
    expect(car.doing.is).toBe('act')
    expect(until(town, 4, () => car.doing.is !== 'act')).toBeLessThan(4)
    run(town, 2 * DT)
    expect(car.doing.is).toBe('walk')
    expect(until(town, 10, () => ridesAt(town, 'car', 380))).toBeLessThan(10)
  })

  it('does not call the bus off the road it is driving, nor a new river the duck out of the one it swims', () => {
    const town = townWith([upper, lower, strip(1, 330, 240, 800, 240), strip(1, 330, 470, 800, 470)], { bus: { x: 500, y: 150, a: 0 }, duck: { x: 500, y: 240, a: 0 } })
    nudge(town)
    run(town, 0.5)
    expect(answer(town, 'bus', town.state.strips[1])).toBe(false)
    expect(answer(town, 'duck', town.state.strips[3])).toBe(false)
    run(town, 3)
    expect(ridesAt(town, 'bus', 150)).toBe(true)
    expect(ridesAt(town, 'duck', 240)).toBe(true)
    expect(town.bodies.bus.calledTo).toBe(null)
  })

  it('calls nobody whose tape it is not, and nobody in the hand', () => {
    const town = townWith([lower, strip(1, 330, 240, 800, 240)], { duck: { x: 500, y: 150, a: 0 }, car: { x: 600, y: 150, a: 0 } })
    for (const id of ['duck', 'car'] as const) town.bodies[id].doing = { is: 'stand', as: 'parked', since: 0 }
    expect(answer(town, 'duck', town.state.strips[0])).toBe(false)
    expect(town.bodies.duck.doing.is).toBe('stand')
    const car = town.bodies.car
    car.doing = { is: 'held', before: car.doing, from: { ...car.at } }
    expect(answer(town, 'car', town.state.strips[0])).toBe(false)
    expect(car.calledTo).toBe(null)
  })
})

describe('a strip pressed flat while the toy it calls is in the air', () => {
  it('is answered when the toy has landed: the duck hopped aside as its first river goes down sets off for it from where it lands', () => {
    const town = townWith([], { duck: { x: 500, y: 420, a: 0 } })
    nudge(town)
    const duck = town.bodies.duck
    town.press(ROLLS[1]); town.lift()
    drag(town, { x: 400, y: 200 }, { x: 600, y: 200 })
    hopTo(town, 'duck', { x: 560, y: 440, a: 0 })
    // The strip is pressed flat a quarter of a second after the finger lifts, and the hop lasts a third.
    run(town, 0.3)
    expect(town.flat.length).toBe(1)
    expect(duck.flight).not.toBe(null)
    expect(duck.calledTo).toBe(town.state.strips[0])
    run(town, 0.3)
    expect(duck.calledTo).toBe(null)
    expect(duck.doing.is).toBe('walk')
    expect(until(town, 10, () => ridesAt(town, 'duck', 200))).toBeLessThan(10)
  })
})

describe('the train, which will not cross the floor on its wheels', () => {
  it('called by a rail just laid, goes there in one hop and chuffs off along it', () => {
    const town = townWith([strip(3, 330, 200, 800, 200)], { train: { x: 560, y: 400, a: 0 } })
    nudge(town)
    const train = town.bodies.train
    // Set on the bare floor by the child: no rail has called it.
    train.onto = null
    run(town, 1)
    expect(train.doing).toMatchObject({ is: 'stand', as: 'plain' })
    expect(answer(town, 'train', town.state.strips[0])).toBe(true)
    expect(train.flight).not.toBe(null)
    let walked = false, least = Infinity
    expect(until(town, 2, () => ridesAt(town, 'train', 200), () => { if (train.doing.is === 'walk') walked = true; least = Math.min(least, leastRoom(town).room) })).toBeLessThan(2)
    expect(walked).toBe(false)
    expect(least).toBeGreaterThanOrEqual(0)
  })

  it('finds the car juddering along the only place on its rail: the car hops off for it, and goes about its own business when the train has gone by', () => {
    const town = townWith([strip(3, 450, 200, 700, 200)], { train: { x: 560, y: 400, a: 0 }, car: { x: 575, y: 200, a: 0 } })
    nudge(town)
    const train = town.bodies.train, car = town.bodies.car
    train.onto = null
    run(town, 0.3)
    expect(car.doing).toMatchObject({ is: 'ride', kind: 3 })
    expect(answer(town, 'train', town.state.strips[0])).toBe(true)
    expect(car.flight).not.toBe(null)
    expect(car.doing).toMatchObject({ is: 'stand', aside: 'train' })
    expect(car.hopped.train).toBe(1)
    let least = Infinity
    run(town, 1.5, [], () => { least = Math.min(least, leastRoom(town).room) })
    expect(Math.abs(train.at.y - 200)).toBeLessThan(4)
    expect(least).toBeGreaterThanOrEqual(0)
    // It does not stand aside for good.
    expect(until(town, 20, () => !(car.doing.is === 'stand' && car.doing.aside))).toBeLessThan(20)
  })

  it('whose rail is full waits where it is and looks again: as soon as the bus in its way has had its look and stands, the train is on', () => {
    const town = townWith([strip(3, 450, 200, 700, 200)], { train: { x: 560, y: 400, a: 0 }, bus: { x: 575, y: 200, a: 0 } })
    const train = town.bodies.train, bus = town.bodies.bus
    // The bus is in the middle of something on the rail.
    bus.doing = { is: 'stand', as: 'dazed', since: Infinity }
    expect(answer(town, 'train', town.state.strips[0])).toBe(false)
    let hops = 0
    run(town, 3, [], () => { if (train.flight || bus.flight) hops++ })
    expect(hops).toBe(0)
    expect(train.at).toMatchObject({ x: 560, y: 400 })
    bus.doing = { is: 'stand', as: 'parked', since: town.time }
    expect(until(town, 1, () => train.flight !== null)).toBeLessThan(1)
    expect(bus.flight).not.toBe(null)
  })
})

describe('where a hop onto its tape lands', () => {
  const road = strip(0, 330, 300, 900, 300)
  const parked = (town: Town, id: 'car' | 'duck'): void => { town.bodies[id].doing = { is: 'stand', as: 'parked', since: 0 } }

  it('is the nearest place where nobody is: the bus driving the road just there is not sent off it', () => {
    const town = townWith([road], { bus: { x: 500, y: 300, a: 0 }, car: { x: 500, y: 430, a: 0 } })
    parked(town, 'car')
    const car = town.bodies.car, bus = town.bodies.bus
    expect(leapOnto(town, 'car', town.state.strips[0])).toBe(true)
    expect(bus.flight).toBe(null)
    expect(bus.doing.is).toBe('ride')
    expect(car.at.y).toBe(300)
    expect(Math.abs(car.at.x - bus.at.x)).toBeGreaterThan((TOY_SIZE.car.long + TOY_SIZE.bus.long) / 2 + 6)
    // Nearest: no further along the road than it has to be.
    expect(Math.abs(car.at.x - bus.at.x)).toBeLessThan((TOY_SIZE.car.long + TOY_SIZE.bus.long) / 2 + 6 + 20)
  })

  it('is beside whoever stands on the tape, where there is room beside them: the peg on a long river is not sent off it', () => {
    const town = townWith([strip(1, 330, 200, 800, 200)], { duck: { x: 520, y: 330, a: 0 }, pegA: { x: 520, y: 200, a: 0 } })
    parked(town, 'duck')
    expect(leapOnto(town, 'duck', town.state.strips[0])).toBe(true)
    expect(town.bodies.pegA.flight).toBe(null)
    expect(town.bodies.pegA.hopped).toEqual({})
    expect(Math.abs(town.bodies.duck.at.x - 520)).toBeGreaterThan(TOY_SIZE.duck.long / 2 + TOY_SIZE.pegA.long / 2)
  })

  it('is nowhere while the tape is full of its own: the car does not send the bus off a road one bus long, and nothing is changed', () => {
    const town = townWith([strip(0, 400, 300, 640, 300)], { bus: { x: 520, y: 300, a: 0 }, car: { x: 520, y: 430, a: 0 } })
    parked(town, 'car')
    const car = town.bodies.car, bus = town.bodies.bus, was = { ...car.at }
    expect(landingOn(town, 'car', town.state.strips[0])).toBe(null)
    expect(leapOnto(town, 'car', town.state.strips[0])).toBe(false)
    expect(bus.flight).toBe(null)
    expect(car.flight).toBe(null)
    expect(car.at).toMatchObject(was)
  })

  it('is never under a bridge: the duck beside the bridge lands a duck and a tape-width clear of it, up or down the river', () => {
    const town = townWith([road, strip(1, 600, 112, 600, 600)], { duck: { x: 720, y: 310, a: 0 } })
    parked(town, 'duck')
    const duck = town.bodies.duck
    expect(leapOnto(town, 'duck', town.state.strips[1])).toBe(true)
    expect(duck.at.x).toBe(600)
    expect(Math.abs(duck.at.y - 300)).toBeGreaterThanOrEqual(TOY_SIZE.duck.long / 2 + TAPE_WIDTH)
    expect(duck.hidden).toBe(false)
  })

  it('is made room for by whoever only stands there: the peg on a river one duck long hops off it, and stands where it lands', () => {
    const town = townWith([strip(1, 455, 200, 585, 200)], { duck: { x: 520, y: 330, a: 0 }, pegA: { x: 520, y: 200, a: 0 } })
    parked(town, 'duck')
    const duck = town.bodies.duck, peg = town.bodies.pegA
    expect(leapOnto(town, 'duck', town.state.strips[0])).toBe(true)
    expect(peg.flight).not.toBe(null)
    expect(peg.doing).toMatchObject({ is: 'stand', as: 'parked' })
    expect(peg.doing.is === 'stand' && peg.doing.aside).toBeFalsy()
    expect(peg.hopped.duck).toBe(1)
    let least = Infinity
    const log: Heard[] = []
    run(town, 2, log, () => { least = Math.min(least, leastRoom(town).room) })
    expect(least).toBeGreaterThanOrEqual(0)
    expect(duck.doing).toMatchObject({ is: 'ride', kind: 1 })
  })

  it('sends whoever hops out of it well clear of every tape, where there is such a place: the newcomer is about to travel this one', () => {
    const river = strip(1, 455, 200, 585, 200)
    const town = townWith([river], { duck: { x: 520, y: 330, a: 0 }, pegA: { x: 520, y: 200, a: 0 } })
    parked(town, 'duck')
    expect(leapOnto(town, 'duck', town.state.strips[0])).toBe(true)
    expect(offTape(town.state.strips[0], town.bodies.pegA.at, TOY_SIZE.pegA)).toBeGreaterThanOrEqual(60)
    // On a floor of tapes too close together for that, it lands on the nearest free floor all the same.
    const tight = townWith([river, ...[380, 560].map((y) => strip(2, 200, y, 1050, y)), strip(2, 200, 200, 380, 200), strip(2, 760, 200, 1050, 200)], { duck: { x: 660, y: 200, a: 0 }, pegA: { x: 520, y: 200, a: 0 } })
    parked(tight, 'duck')
    expect(leapOnto(tight, 'duck', tight.state.strips[0])).toBe(true)
    expect(tight.bodies.pegA.flight).not.toBe(null)
    const room = Math.min(...tight.state.strips.map((tape) => offTape(tape, tight.bodies.pegA.at, TOY_SIZE.pegA)))
    expect(room).toBeGreaterThanOrEqual(4)
    expect(room).toBeLessThan(60)
  })

  it('is not asked of the same toy a third time: sent off twice by the duck, the peg stays, and the duck stays on its feet', () => {
    const town = townWith([strip(1, 455, 200, 585, 200)], { duck: { x: 520, y: 330, a: 0 }, pegA: { x: 520, y: 200, a: 0 } })
    parked(town, 'duck')
    town.bodies.pegA.hopped.duck = 2
    expect(leapOnto(town, 'duck', town.state.strips[0])).toBe(false)
    expect(town.bodies.pegA.flight).toBe(null)
  })

  it('is on no strip that is not yet pressed flat', () => {
    const town = townWith([], { duck: { x: 520, y: 330, a: 0 } })
    nudge(town)
    town.press(ROLLS[1]); town.lift()
    drag(town, { x: 400, y: 200 }, { x: 700, y: 200 })
    expect(town.flat.length).toBe(0)
    expect(leapOnto(town, 'duck', town.state.strips[0])).toBe(false)
    expect(town.bodies.duck.flight).toBe(null)
  })
})

describe('a toy that set off for a strip', () => {
  it('goes on to that one after it has stood aside, and not back to a nearer one: the car that left its road for a new one is not back on the old', () => {
    const town = townWith([strip(0, 330, 150, 800, 150), strip(0, 330, 380, 800, 380)], { car: { x: 500, y: 150, a: 0 } })
    nudge(town)
    run(town, 0.5)
    const car = town.bodies.car
    expect(answer(town, 'car', town.state.strips[1])).toBe(true)
    // Hopped aside at once, it stands nearer the road it left than the one it is going to.
    hopTo(town, 'car', { x: 560, y: 215, a: 0 }, 'bus')
    expect(car.onto).toBe(town.state.strips[1])
    expect(until(town, 12, () => ridesAt(town, 'car', 380))).toBeLessThan(12)
    let backOnTheOld = false
    run(town, 5, [], () => { if (ridesAt(town, 'car', 150)) backOnTheOld = true })
    expect(backOnTheOld).toBe(false)
  })

  it('forgets it when it is on a tape, and when a finger picks it up', () => {
    const town = townWith([strip(1, 330, 200, 800, 200)], { duck: { x: 520, y: 400, a: 0 } })
    nudge(town)
    const duck = town.bodies.duck
    expect(duck.onto).toBe(town.state.strips[0])
    town.press({ x: duck.at.x, y: duck.at.y }); town.move({ x: 700, y: 480 })
    expect(duck.onto).toBe(null)
    town.lift()
    expect(until(town, 12, () => ridesAt(town, 'duck', 200))).toBeLessThan(12)
    expect(duck.onto).toBe(null)
    expect(duck.asides).toBe(0)
  })
})

describe('put away in the middle of a hop onto its tape', () => {
  it('a toy is found on its tape, where it was going, and a town loaded from that goes on as the one put away does', () => {
    const town = townWith([strip(1, 330, 200, 800, 200)], { duck: { x: 520, y: 330, a: 0 } })
    town.bodies.duck.doing = { is: 'stand', as: 'parked', since: 0 }
    expect(leapOnto(town, 'duck', town.state.strips[0])).toBe(true)
    run(town, 0.1)
    expect(town.bodies.duck.flight).not.toBe(null)
    const to = { ...town.bodies.duck.at }
    town.rest()
    expect(town.bodies.duck.flight).toBe(null)
    expect(town.poseOf('duck')).toMatchObject({ x: Math.round(to.x), y: Math.round(to.y), lift: 0 })
    const twin = loaded(town)
    expect(twin.saved().toys).toEqual(town.saved().toys)
    nudge(town)
    nudge(twin)
    expect(names(run(town, 3))).toEqual(names(run(twin, 3)))
    // Both ducks are in the river, swimming or tipping bottom-up at its end.
    for (const one of [town, twin]) expect(Math.abs(one.bodies.duck.at.y - 200)).toBeLessThan(4)
    expect(twin.bodies.duck.at).toMatchObject({ x: town.bodies.duck.at.x })
  })
})
