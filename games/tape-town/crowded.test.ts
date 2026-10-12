import { describe, expect, it } from 'vitest'
import { DT, carry, drag, leastRoom, names, nudge, run, strip, townWith, type Heard } from './bench'
import { offTape } from './floor'
import { ROLLS, TOY_SIZE } from './layout'
import { turnBack } from './riding'
import { freshTown } from './save'
import { Town } from './town'
import { asMet, freePlace, laneOf } from './way'

// A floor too full for a toy to get where it wants is calm: each says so once, and nobody is sent where it cannot go.

const road = strip(0, 330, 300, 900, 300)
const count = (log: Heard[], name: string, from = 0): number => log.filter((heard) => heard.name === name && heard.frame >= from).length

describe('the town as it opens', () => {
  it('is quiet after its first honk: the dog, with the duck, the box and the bus round it, is not sent off through any of them', () => {
    const town = new Town(freshTown(3), 1)
    town.press(ROLLS[0]); town.lift()
    let walked = 0, least = Infinity
    const log = run(town, 60, [], () => { if (town.bodies.dog.doing.is !== 'stand') walked++; least = Math.min(least, leastRoom(town).room) })
    // The bus wants the road and the dog stands in its way with nowhere to go: one honk, and then it waits.
    expect(count(log, 'honk-low')).toBe(1)
    expect(count(log, 'whine')).toBe(0)
    expect(count(log, 'hmf')).toBe(0)
    expect(walked).toBe(0)
    expect(least).toBeGreaterThanOrEqual(0)
  })

  it('with a first river laid level under the road, the duck and the bus each say once where they are setting off for, and nobody toots on a timer', () => {
    const town = new Town(freshTown(3), 1)
    town.press(ROLLS[1]); town.lift()
    run(town, 0.3)
    drag(town, { x: 560, y: 560 }, { x: 960, y: 560 })
    const afoot = new Set<number>()
    const log = run(town, 34, [], () => { if (town.bodies.duck.doing.is !== 'ride' && town.bodies.duck.doing.is !== 'act') afoot.add(town.frames) })
    // The bus sets off for the road once, and stopped and setting off for the same place again says nothing.
    expect(count(log, 'drone-off')).toBeLessThanOrEqual(1)
    // On its feet the duck says that it is setting off for the river, and quacks once at whoever stops it on the way: never more.
    const onFoot = log.filter((heard) => heard.name === 'quack' && afoot.has(heard.frame)).length
    expect(onFoot).toBeGreaterThanOrEqual(1)
    expect(onFoot).toBeLessThanOrEqual(2)
    expect(count(log, 'honk-low')).toBeLessThanOrEqual(2)
    // Nobody's own two sounds come within a second of each other: the sound it set off with is its toot for that moment.
    for (const name of ['quack', 'honk-low']) {
      const own = log.filter((heard) => heard.name === name)
      for (let k = 1; k < own.length; k++) expect(own[k].frame - own[k - 1].frame, name).toBeGreaterThanOrEqual(60)
    }
  })
})

describe('the dog asked to make way where it cannot hop', () => {
  // Free floor lies below the last river, further off than a hop reaches.
  const crowd = [road, ...[-217, -155, -93, 93].map((dy) => strip(1, 330, 300 + dy, 900, 300 + dy))]
  const stood = { x: 640, y: 300, a: 0.2 }
  const start = (): Town => {
    const town = townWith(crowd, { car: { x: 420, y: 300, a: 0 }, dog: { ...stood } })
    town.bodies.dog.doing = { is: 'stand', as: 'plain', since: 0 }
    nudge(town)
    return town
  }
  const sentOff = (town: Town): Heard[] => {
    const log: Heard[] = []
    for (let k = 0; k < 600 && town.bodies.dog.doing.is !== 'walk'; k++) run(town, DT, log)
    return log
  }

  it('trots off nose first: the place it is sent to is one it faces as it goes', () => {
    const town = start()
    sentOff(town)
    const doing = town.bodies.dog.doing
    if (doing.is !== 'walk') throw new Error('the dog was not sent off')
    const to = doing.to as { x: number; y: number; a: number }
    expect(Math.hypot(to.x - stood.x, to.y - stood.y)).toBeGreaterThan(150)
    expect(to.a).toBeCloseTo(Math.atan2(to.y - stood.y, to.x - stood.x), 5)
  })

  it('back where it stood, it is not sent again until a long quiet while has gone by, and then without a whine', () => {
    // The dog stands across the road between rails, with no floor near to hop to, and the car drives up and down.
    const rails = [-155, -93, 93].map((dy) => strip(3, 330, 300 + dy, 700, 300 + dy))
    const across = { x: 560, y: 300, a: Math.PI / 2 }
    const town = townWith([road, ...rails], { car: { x: 420, y: 300, a: 0 }, dog: { ...across } })
    const dog = town.bodies.dog
    dog.doing = { is: 'stand', as: 'plain', since: 0 }
    nudge(town)
    const sent = (): boolean => dog.doing.is === 'walk' && !dog.doing.follow
    const log: Heard[] = []
    for (let k = 0; k < 600 && !sent(); k++) run(town, DT, log)
    expect(sent()).toBe(true)
    expect(count(log, 'whine')).toBe(1)
    // It could not get through and is back where it stood, and each time it sets off after the car it is put back.
    const back = (): void => { dog.at = { ...across }; dog.doing = { is: 'stand', as: 'plain', since: town.time }; town.leader = null }
    back()
    let sentAgain = 0
    run(town, 18, log, () => { if (sent()) sentAgain++; else if (dog.doing.is !== 'stand') back() })
    expect(sentAgain).toBe(0)
    let again = false
    run(town, 40, log, () => { if (sent()) again = true; else if (dog.doing.is !== 'stand') back() })
    expect(again).toBe(true)
    expect(count(log, 'whine')).toBe(1)
  })
})

describe('a peg tooted at where no free floor is near', () => {
  // The peg stands on the road between rivers. Free floor lies below the last river, further off than a hop reaches.
  const crowd = [road, ...[-217, -155, -93, 93].map((dy) => strip(1, 330, 300 + dy, 900, 300 + dy))]
  const stood = { x: 640, y: 300, a: 0.2 }

  it('shuffles and stays; found there still when the car comes by again, it hops to free floor further off, well clear of every tape, without a second toot', () => {
    const town = townWith(crowd, { car: { x: 420, y: 300, a: 0 }, pegA: { ...stood } })
    const peg = town.bodies.pegA, car = town.bodies.car
    peg.doing = { is: 'stand', as: 'plain', since: 0 }
    nudge(town)
    const log: Heard[] = []
    // The car toots once, waits and turns back: the peg is where it stood.
    for (let k = 0; k < 600 && car.doing.is !== 'act'; k++) run(town, DT, log)
    expect(car.doing.is).toBe('act')
    expect(count(log, 'toot-car')).toBe(1)
    expect(count(log, 'scuff')).toBe(1)
    expect(peg.at).toMatchObject(stood)
    // It drives to the end of its road and back, and the peg hops as it comes.
    for (let k = 0; k < 900 && !peg.flight; k++) run(town, DT, log)
    expect(peg.flight).not.toBe(null)
    const far = Math.hypot(peg.at.x - stood.x, peg.at.y - stood.y)
    expect(far).toBeGreaterThan(150)
    expect(far).toBeLessThanOrEqual(300)
    for (const tape of town.state.strips) expect(offTape(tape, peg.at, TOY_SIZE.pegA)).toBeGreaterThanOrEqual(60)
    expect(peg.hopped.car).toBe(1)
    let least = Infinity, past = false
    run(town, 8, log, () => { least = Math.min(least, leastRoom(town).room); if (car.at.x > 700) past = true })
    expect(past).toBe(true)
    expect(least).toBeGreaterThanOrEqual(0)
    expect(count(log, 'toot-car')).toBe(1)
  })
})

describe('the dog and the one it makes way for', () => {
  it('is never sent off through them: where the only free floor lies straight beyond that toy, there is no place for it to trot to', () => {
    // A pocket of bare boards between two blocks of tape: the dog at the top of it, the duck coming up it, free floor below the duck only.
    const rows = Array.from({ length: 11 }, (_, k) => 95 + k * 60)
    const tape = [...rows.map((y) => strip(3, 250, y, 470, y)), ...rows.map((y) => strip(3, 650, y, 1000, y))]
    const town = townWith(tape, { dog: { x: 560, y: 150, a: Math.PI / 2 }, duck: { x: 560, y: 330, a: -Math.PI / 2 } })
    const dog = town.bodies.dog.at, duck = town.bodies.duck
    duck.doing = { is: 'walk', to: { x: 560, y: 150 }, gait: 'waddle', odo: 0, held: 0, toots: 0, tootAt: -Infinity, follow: false }
    const lane = laneOf(town, 'duck', 2)
    // Hopped through the air it could land beyond the duck; on its own legs it cannot get there.
    expect(freePlace(town, 'dog', dog, 420, Math.PI / 2, { id: 'duck', lane })).not.toBeNull()
    expect(freePlace(town, 'dog', dog, 420, Math.PI / 2, { id: 'duck', lane }, true, dog, true)).toBeNull()
  })
})

describe('a toy that is crossing a mover\'s way', () => {
  it('gets one toot: seen in the way without a break it has been tooted at already, wherever it has got to, and after a break it has not', () => {
    const seen = { x: 400, y: 300, a: 0, at: 10 }, now = { x: 430, y: 310, a: 0.4 }
    expect(asMet(seen, now, true, 10.3)).toBe(true)
    expect(asMet(seen, now, true, 10.6)).toBe(false)
    // One that stands has been tooted at only where it stood then.
    expect(asMet(seen, now, false, 10.3)).toBe(false)
    expect(asMet(seen, { x: 400, y: 300, a: 0 }, false, 99)).toBe(true)
    expect(asMet(undefined, now, true, 10.3)).toBe(false)
  })
})

describe('a toy backing off to the floor', () => {
  // The train stands with a road laid under it: it sniffs at the road and backs off to the nearest free floor.
  const sniffing = (): Town => {
    const town = townWith([road, strip(0, 848, 628, 894, 315)], { train: { x: 860, y: 540, a: 0 }, duck: { x: 630, y: 645, a: 0 } })
    town.bodies.duck.doing = { is: 'stand', as: 'plain', since: 0 }
    nudge(town)
    for (let k = 0; k < 300 && town.bodies.train.doing.is !== 'act'; k++) run(town, DT)
    return town
  }
  const goal = (town: Town): { x: number; y: number } => {
    const doing = town.bodies.train.doing
    if (doing.is !== 'act' || !doing.to) throw new Error('the train is not backing off')
    return doing.to
  }

  it('a toy the child sets down where it is going is set down beside its way, and nothing is hopped', () => {
    const town = sniffing(), to = goal(town)
    run(town, 0.4)
    carry(town, 'duck', { x: to.x - 17, y: to.y - 2 })
    let least = Infinity
    const heard = names(run(town, 4, [], () => { least = Math.min(least, leastRoom(town).room) }))
    expect(least).toBeGreaterThanOrEqual(0)
    expect(heard).not.toContain('hop-duck')
    expect(Math.hypot(town.bodies.train.at.x - to.x, town.bodies.train.at.y - to.y)).toBeLessThan(1)
  })

  it('whoever has come to stand in its way hops aside as it comes, and it never backs into anybody', () => {
    const town = sniffing(), to = goal(town)
    run(town, 0.4)
    // A peg that got there some other way: stood right where the train is going.
    town.bodies.pegA.at = town.state.toys.pegA = { x: to.x, y: to.y, a: 0 }
    let least = Infinity
    const heard = names(run(town, 4, [], () => { if (!town.bodies.pegA.flight) least = Math.min(least, leastRoom(town).room) }))
    expect(heard).toContain('hop-peg-a')
    expect(least).toBeGreaterThanOrEqual(0)
  })
})

describe('two who turn where they stand', () => {
  it('a bus that gives way does not make its turn into the dog that is turning round beside it: it backs away tail first and turns where there is room', () => {
    // The dog lies clear of the circle the bus sweeps as it turns, and the circle the dog sweeps as it turns round is not.
    const town = townWith([road], { bus: { x: 560, y: 300, a: 0 }, dog: { x: 700, y: 465, a: 0 }, train: { x: 420, y: 520, a: 0 } })
    const dog = town.bodies.dog, bus = town.bodies.bus
    dog.doing = { is: 'stand', as: 'lying', since: 0 }
    nudge(town)
    for (let k = 0; k < 600 && bus.at.x < 700; k++) run(town, DT)
    // The dog gets up and turns round three times, as it does before it lies down, and the bus is made to go back.
    dog.doing = { is: 'act', name: 'circle', t: 0, cue: 0, from: { ...dog.at }, to: null, after: null, flip: false, still: false }
    run(town, 0.2)
    if (bus.doing.is !== 'ride') throw new Error('the bus is not driving')
    turnBack(town, 'bus', bus.doing)
    let least = Infinity, turned = false
    run(town, 12, [], () => {
      least = Math.min(least, leastRoom(town).room)
      if (bus.doing.is === 'ride' && bus.doing.rider.dir === -1 && !bus.doing.back) turned = true
    })
    expect(least).toBeGreaterThanOrEqual(0)
    expect(turned).toBe(true)
  })
})
