import { describe, expect, it } from 'vitest'
import { DT, carry, drag, leastRoom, loaded, names, nudge, run, strip, townWith, type Heard } from './bench'
import { gateOf, gateShut } from './gates'
import { revShows, startAct, walkTo, watching } from './going'
import { CROSS, type Mover } from './habits'
import { ROLLS, TAPE_WIDTH, type Kind, type ToyId } from './layout'
import { freshTown } from './save'
import { lengthOf, type Strip } from './tape'
import { Town } from './town'
import { gazeOf, paintToy, type Pen } from './toyView'
import { hoot, rev } from './voices'
import { leapOnto } from './leap'
import { hopTo } from './way'

// What the third reader found, each held by a test: a toy at home on a stub is called by a longer strip and
// settles when its stub is peeled; the dog that lay down watches; no rev without a shake; seconds are seconds
// at any length of step; the train is called whenever a rail it could be on is there for it; a finger stops a
// moving toy where it is; and a train saved on a level crossing is found with the gates shut.

/** Whether a toy is travelling this strip. */
const ridesOn = (town: Town, id: Mover, on: Strip): boolean => {
  const body = town.bodies[id], doing = body.doing
  return !body.flight && doing.is === 'ride' && town.nets[doing.kind].strips[doing.rider.s] === on
}
const pick = (town: Town, kind: Kind): void => { town.press(ROLLS[kind]); town.lift() }
const last = (town: Town): Strip => town.state.strips[town.state.strips.length - 1]
const until = (town: Town, most: number, done: () => boolean, each?: () => void): number => {
  for (let k = 0; k < most / DT; k++) { if (done()) return k * DT; run(town, DT); each?.() }
  return done() ? most : Infinity
}
/** Steps a town at another length of step. `each` is called after every step. */
const stepAt = (town: Town, hz: number, seconds: number, each?: () => void): void => {
  for (let k = Math.round(seconds * hz); k > 0; k--) { town.step(1 / hz); each?.() }
}
/** A stub peeled by a finger that lands just beyond its far end, clear of the toy that sits at its near end, and pulls on along it. */
function peelStub(town: Town, stub: Strip): string[] {
  const length = lengthOf(stub), ux = (stub.bx - stub.ax) / length, uy = (stub.by - stub.ay) / length
  const from = { x: stub.bx + ux * 30, y: stub.by + uy * 30 }, far = Math.max(TAPE_WIDTH, length) * 1.2
  town.press(from)
  for (let k = 1; k <= 8; k++) town.move({ x: from.x + (ux * far * k) / 8, y: from.y + (uy * far * k) / 8 })
  town.lift()
  return town.takeSounds().map((sound) => sound.name)
}

describe('a toy at home on a stub of its own tape', () => {
  const HOME: Record<'car' | 'duck' | 'train', Kind> = { car: 0, duck: 1, train: 3 }

  it('is called by a longer strip of that tape laid later, like anyone on the bare floor: the road gets its car, the river its duck and the rail its train', () => {
    for (const id of ['car', 'duck', 'train'] as const) {
      const town = townWith([strip(HOME[id], 400, 200, 440, 200)], { [id]: { x: 420, y: 200, a: 0 } })
      nudge(town)
      run(town, 0.5)
      expect(town.bodies[id].doing.is, id).toBe('stand')
      expect(town.bodies[id].at, id).toMatchObject({ x: 420, y: 200 })
      pick(town, HOME[id])
      drag(town, { x: 420, y: 450 }, { x: 820, y: 450 })
      const long = last(town)
      expect(lengthOf(long)).toBeGreaterThan(300)
      let least = Infinity
      expect(until(town, 10, () => ridesOn(town, id, long), () => { least = Math.min(least, leastRoom(town).room) }), id).toBeLessThan(10)
      expect(least, id).toBeGreaterThanOrEqual(0)
    }
  })

  it('is not called off it by another stub: a stub is a home, and it has one', () => {
    for (const id of ['car', 'duck', 'train'] as const) {
      const town = townWith([strip(HOME[id], 400, 200, 440, 200)], { [id]: { x: 420, y: 200, a: 0 } })
      nudge(town)
      pick(town, HOME[id])
      town.press({ x: 700, y: 450 }); town.lift()
      expect(town.state.strips).toHaveLength(2)
      let left = false
      run(town, 4, [], () => { if (town.bodies[id].flight || town.bodies[id].doing.is === 'walk') left = true })
      expect(left, id).toBe(false)
      expect(town.bodies[id].at, id).toMatchObject({ x: 420, y: 200 })
    }
  })

  it('its stub peeled from under it, it is on the bare floor as a load would find it: with a road on the floor the car sets off for it without a sound, and is driving it soon', () => {
    const road = strip(0, 330, 470, 800, 470)
    const town = townWith([strip(0, 400, 200, 478, 200), road], { car: { x: 400, y: 200, a: 0 } })
    const car = town.bodies.car
    nudge(town)
    run(town, 0.5)
    expect(car.doing).toMatchObject({ is: 'stand', as: 'parked' })
    const heard = peelStub(town, town.state.strips[0])
    expect(heard).toContain('peel-off')
    expect(town.state.strips).toHaveLength(1)
    // Settled in that call: it is already on its way, and it has not said so.
    expect(car.doing.is).toBe('walk')
    expect(heard).not.toContain(CROSS.car.off.name)
    expect(until(town, 10, () => ridesOn(town, 'car', town.state.strips[0]))).toBeLessThan(10)
  })

  it('its stub peeled with no other road, river or rail on the floor, it stands on the boards where it stood, and the duck is out of its bath', () => {
    for (const id of ['car', 'duck', 'train'] as const) {
      const town = townWith([strip(HOME[id], 400, 200, 478, 200)], { [id]: { x: 400, y: 200, a: 0 } })
      const body = town.bodies[id]
      nudge(town)
      run(town, 0.5)
      expect(peelStub(town, town.state.strips[0]), id).toContain('peel-off')
      expect(body.doing.is, id).toBe('stand')
      expect(body.doing.is === 'stand' && body.doing.as, id).not.toBe('bath')
      expect(body.at, id).toMatchObject({ x: 400, y: 200 })
      // As a load finds it: the same toy in a town loaded from this one stands the same way.
      const again = loaded(town).bodies[id].doing
      expect(again.is === 'stand' && again.as, id).toBe(body.doing.is === 'stand' && body.doing.as)
    }
  })
})

describe('seconds are seconds, whatever the length of a step', () => {
  const RATES = [30, 60, 120]

  it('the town as it opens, stepped at thirty, sixty and a hundred and twenty steps a second: the bus hops onto the road, a first river is pressed flat and the duck hops into it at the same times, within a step', () => {
    const times = RATES.map((hz) => {
      const town = new Town(freshTown(3), 1)
      let bus = -1, flat = -1, duck = -1, afloat = -1
      const watch = (): void => {
        if (bus < 0 && town.bodies.bus.flight) bus = town.time
        if (flat < 0 && town.state.strips.length > 1 && town.pressings.length === 0) flat = town.time
        if (flat >= 0 && duck < 0 && town.bodies.duck.flight) duck = town.time
        const doing = town.bodies.duck.doing
        if (afloat < 0 && doing.is === 'ride' && doing.kind === 1) afloat = town.time
      }
      stepAt(town, hz, 2, watch)
      pick(town, 1)
      stepAt(town, hz, 0.2, watch)
      town.press({ x: 560, y: 560 })
      for (let k = 1; k <= 8; k++) town.move({ x: 560 + 50 * k, y: 560 })
      town.lift()
      stepAt(town, hz, 12, watch)
      return { bus, flat, duck, afloat }
    })
    const step = 1 / 30 + 1e-6
    for (const at of times) {
      expect(at.bus).toBeGreaterThan(0)
      expect(Math.abs(at.bus - times[1].bus)).toBeLessThanOrEqual(step)
      expect(Math.abs(at.flat - times[1].flat)).toBeLessThanOrEqual(step)
      expect(at.duck).toBeGreaterThan(at.flat)
      expect(Math.abs(at.duck - times[1].duck)).toBeLessThanOrEqual(step)
      // In the water after the hop: two steps, one for the hop's start and one for its end.
      expect(Math.abs(at.afloat - times[1].afloat)).toBeLessThanOrEqual(2 * step)
    }
  })

  it('six seconds on its way are six seconds: a duck with a long walk to its river hops the rest at six seconds, within a step, at each rate', () => {
    for (const hz of RATES) {
      const town = townWith([strip(1, 940, 150, 940, 650)], { duck: { x: 300, y: 400, a: 0 } })
      let hop = -1
      stepAt(town, hz, 8, () => { if (hop < 0 && town.bodies.duck.flight) hop = town.time })
      expect(hop, `${hz}`).toBeGreaterThanOrEqual(6)
      expect(hop, `${hz}`).toBeLessThanOrEqual(6 + 1 / hz + 1e-6)
    }
  })

  it('the look for room on a full tape comes every half second and keeps time: six looks in three seconds, each within a step of its half second, at each rate', () => {
    // Also at rates whose step does not go into half a second.
    for (const hz of [...RATES, 45, 75]) {
      const town = townWith([strip(3, 450, 200, 700, 200)], { train: { x: 560, y: 400, a: 0 }, bus: { x: 575, y: 200, a: 0 } })
      const train = town.bodies.train
      town.bodies.bus.doing = { is: 'stand', as: 'dazed', since: Infinity }
      const looks: number[] = []
      let was = train.lookIn
      stepAt(town, hz, 3.2, () => { if (train.lookIn > was) looks.push(town.time); was = train.lookIn })
      expect(looks.length, `${hz}`).toBe(7)
      looks.slice(1).forEach((at, k) => expect(Math.abs(at - (k + 1) * 0.5), `${hz}`).toBeLessThanOrEqual(1 / hz + 1e-6))
    }
  })
})

/** A canvas that draws nothing and counts the lids drawn over eyes. */
function lidsOf(town: Town, id: ToyId): number {
  let lids = 0
  const g = new Proxy({} as Record<string | symbol, unknown>, {
    get: (held, name) => (name in held ? held[name] : name === 'ellipse' ? () => { lids++ } : () => {}),
    set: (held, name, value) => { held[name] = value; return true },
  }) as unknown as CanvasRenderingContext2D
  const pen: Pen = { g, n: 0, scale: 2, stamp: () => {}, sprite: () => ({}) as HTMLCanvasElement }
  paintToy(pen, town, id)
  return lids
}

describe('the dog that lay down beside the road', () => {
  /** The car on a road and the dog that followed it, hopped out of its way twice and lay down. */
  const lain = (): Town => {
    const town = townWith([strip(0, 400, 300, 800, 300)], { car: { x: 500, y: 300, a: 0 }, dog: { x: 650, y: 400, a: 0 } })
    town.bodies.dog.doing = { is: 'stand', as: 'plain', since: 0 }
    nudge(town)
    expect(until(town, 30, () => !town.bodies.dog.flight && watching(town))).toBeLessThan(30)
    return town
  }

  it('watches: its eyes are open and follow the car up and down the road, where a dog that lay down with nobody to follow is asleep', () => {
    const town = lain(), dog = town.bodies.dog
    let open = 0, shut = 0, onCar = 0
    for (let k = 0; k < 240; k++) {
      run(town, DT)
      const awake = lidsOf(town, 'dog')
      dog.asides = 0
      const asleep = lidsOf(town, 'dog')
      dog.asides = 2
      if (awake < asleep) open++
      if (asleep >= 2) shut++
      const look = gazeOf(town, 'dog'), car = town.poseOf('car')
      if (look.x === car.x && look.y === car.y) onCar++
    }
    expect(shut).toBe(240)
    expect(open).toBeGreaterThan(200)
    expect(onCar).toBe(240)
    expect(dog.doing).toMatchObject({ is: 'stand', as: 'lying' })
  })

  it('looks at whoever moves nearest: with the bus driving by nearer than the car, at the bus, and at nobody who stands', () => {
    const town = lain(), dog = town.bodies.dog.at
    town.bodies.bus.at = town.state.toys.bus = { x: dog.x + 10, y: dog.y + 200, a: 0 }
    town.bodies.bus.doing = { is: 'stand', as: 'plain', since: 0 }
    town.bodies.car.at = { ...town.bodies.car.at, x: dog.x - 300 }
    expect(gazeOf(town, 'dog')).toMatchObject({ x: town.poseOf('car').x })
    town.bodies.bus.doing = walkTo({ x: 900, y: dog.y + 200 }, 'lumber')
    expect(gazeOf(town, 'dog')).toMatchObject({ x: dog.x + 10, y: dog.y + 200 })
  })

  it('howls along with the train\'s hoot and lies down again where it is: it has not got up to follow, and two minutes on it has not moved', () => {
    const town = lain(), dog = town.bodies.dog, lay = { x: dog.at.x, y: dog.at.y }
    town.hum(hoot)
    town.takeSounds()
    expect(dog.doing).toMatchObject({ is: 'act', name: 'howl' })
    const heard: Heard[] = []
    expect(until(town, 6, () => dog.doing.is === 'stand')).toBeLessThan(6)
    expect(dog.doing).toMatchObject({ is: 'stand', as: 'lying' })
    expect(watching(town)).toBe(true)
    let followed = false, hops = 0, was = false
    run(town, 120, heard, () => {
      if (dog.doing.is === 'walk') followed = true
      if (dog.flight && !was) hops++
      was = dog.flight !== null
    })
    expect(followed).toBe(false)
    expect(hops).toBe(0)
    expect(dog.at).toMatchObject(lay)
    expect(names(heard).filter((name) => name.startsWith('hop-'))).toEqual([])
  })

  it('its count does not run out by itself: hopped once, and a second time a minute and a half later with a road come onto in between, it lies down and watches', () => {
    const town = townWith([strip(0, 400, 300, 800, 300)], { dog: { x: 600, y: 420, a: 0 } })
    const dog = town.bodies.dog
    dog.doing = { is: 'stand', as: 'plain', since: 0 }
    nudge(town)
    hopTo(town, 'dog', { x: 600, y: 300, a: 0 })
    run(town, 45)
    // Bumped where it stands on the road, it shakes itself and does what a dog does on a road: that is not a tap.
    dog.doing = { is: 'stand', as: 'dazed', since: town.time }
    run(town, 45)
    expect(dog.doing.is === 'stand' && dog.doing.as).not.toBe('dazed')
    expect(dog.asides).toBe(1)
    expect(watching(town)).toBe(false)
    hopTo(town, 'dog', { x: 600, y: 560, a: 0 })
    run(town, 1)
    expect(dog.doing).toMatchObject({ is: 'stand', as: 'lying' })
    expect(watching(town)).toBe(true)
  })
})

describe('the train on the bare floor beside a rail it could be on', () => {
  const rail = (): Strip => strip(3, 450, 200, 800, 200)
  /** The train stood on the boards with no rail calling it. */
  const beside = (strips: Strip[], toys: Parameters<typeof townWith>[1] = {}): Town => {
    const town = townWith(strips, { train: { x: 560, y: 400, a: 0 }, ...toys })
    town.bodies.train.onto = null
    return town
  }
  const hopsOn = (town: Town, on: Strip, within = 1): void => {
    expect(until(town, within, () => town.bodies.train.flight !== null)).toBeLessThan(within)
    expect(until(town, 3, () => ridesOn(town, 'train', on))).toBeLessThan(3)
  }

  it('is called by it after a park: put away and opened again, it is on the rail in one hop, and a town loaded from that one does the same', () => {
    const town = beside([rail()])
    run(town, 2)
    expect(town.bodies.train.at).toMatchObject({ x: 560, y: 400 })
    town.rest()
    const found = loaded(town)
    for (const one of [town, found]) hopsOn(one, one.state.strips[0])
    expect(found.bodies.train.at).toEqual(town.bodies.train.at)
  })

  it('is called by the nearest rail it can travel: a stub of rail nearer by is passed over for the long one', () => {
    const town = beside([strip(3, 520, 330, 590, 330), rail()])
    town.rest()
    hopsOn(town, town.state.strips[1])
  })

  it('and that hop on a load is made in silence, as every habit is taken up until the first touch', () => {
    const town = beside([rail()])
    town.rest()
    const found = loaded(town)
    const heard = names(run(found, 3))
    expect(ridesOn(found, 'train', found.state.strips[0])).toBe(true)
    expect(heard).toEqual([])
  })

  it('is called by a rail that was still being pressed when the town was put away: it lies flat when the town is opened, and the train hops on', () => {
    const town = beside([])
    nudge(town)
    pick(town, 3)
    drag(town, { x: 450, y: 200 }, { x: 800, y: 200 })
    run(town, 2 * DT)
    expect(town.pressings.length).toBeGreaterThan(0)
    expect(town.bodies.train.flight).toBe(null)
    town.rest()
    expect(town.pressings).toEqual([])
    const found = loaded(town)
    for (const one of [town, found]) hopsOn(one, last(one))
  })

  it('is called by a rail that is full when the town is opened: it looks again every half second, and is on as soon as there is room', () => {
    const town = beside([strip(3, 450, 200, 700, 200)], { bus: { x: 575, y: 200, a: 0 } })
    town.rest()
    const found = loaded(town), train = found.bodies.train, bus = found.bodies.bus
    // The bus is in the middle of something on the rail, and cannot hop off it.
    bus.doing = { is: 'stand', as: 'dazed', since: Infinity }
    let hops = 0
    run(found, 3, [], () => { if (train.flight || bus.flight) hops++ })
    expect(hops).toBe(0)
    expect(train.at).toMatchObject({ x: 560, y: 400 })
    bus.doing = { is: 'stand', as: 'parked', since: found.time }
    hopsOn(found, found.state.strips[0])
  })

  it('set down by the child on a rail that is full stands beside it, and that rail calls it: it hops on as soon as there is room', () => {
    const town = townWith([strip(3, 450, 200, 700, 200)], { train: { x: 560, y: 520, a: 0 }, bus: { x: 575, y: 200, a: 0 } })
    const train = town.bodies.train, bus = town.bodies.bus
    train.onto = null
    nudge(town)
    bus.doing = { is: 'stand', as: 'dazed', since: Infinity }
    carry(town, 'train', { x: 575, y: 200 })
    expect(train.doing.is).toBe('stand')
    expect(leastRoom(town).room).toBeGreaterThanOrEqual(0)
    let hops = 0
    run(town, 3, [], () => { if (train.flight || bus.flight) hops++ })
    expect(hops).toBe(0)
    bus.doing = { is: 'stand', as: 'parked', since: town.time }
    hopsOn(town, town.state.strips[0])
  })
})

/** Every call a toy's drawing makes, written down. */
function drawn(town: Town, id: ToyId): string {
  const said: string[] = []
  const g = new Proxy({} as Record<string | symbol, unknown>, {
    get: (held, name) => (name in held ? held[name] : (...args: unknown[]) => { said.push(`${String(name)}(${args.map((arg) => (typeof arg === 'number' ? arg.toFixed(3) : '')).join(',')})`) }),
    set: (held, name, value) => { held[name] = value; return true },
  }) as unknown as CanvasRenderingContext2D
  paintToy({ g, n: 0, scale: 2, stamp: () => {}, sprite: () => ({}) as HTMLCanvasElement }, town, id)
  return said.join(';')
}

describe('the rev at a grey strip being pulled', () => {
  const road = (): Strip => strip(0, 330, 300, 900, 300)
  /** The first zip of a grey pull, well away from the car. */
  const pull = (town: Town): string[] => {
    pick(town, 0)
    town.takeSounds()
    town.press({ x: 600, y: 480 })
    town.move({ x: 640, y: 480 })
    return town.takeSounds().map((sound) => sound.name)
  }

  it('is heard while the car drives, and shows on it: the car shakes on its road for as long as the grey tape is pulled', () => {
    const town = townWith([road()], { car: { x: 500, y: 300, a: 0 } })
    nudge(town)
    run(town, 1)
    expect(town.bodies.car.doing.is).toBe('ride')
    expect(pull(town)).toContain(rev.name)
    expect(revShows(town)).toBe(true)
    const pulled = town.pull
    for (let k = 0; k < 10; k++) {
      run(town, DT)
      expect(town.bodies.car.doing.is).toBe('ride')
      const shaking = drawn(town, 'car')
      town.pull = null
      expect(drawn(town, 'car')).not.toBe(shaking)
      town.pull = pulled
    }
  })

  it('is not made where it would not show: with the car in the middle of its spin, or in the air, there is no rev and the car is drawn as it was', () => {
    for (const where of ['spin', 'air'] as const) {
      const town = townWith([road()], { car: { x: 500, y: 300, a: 0 } })
      nudge(town)
      run(town, 1)
      if (where === 'spin') startAct(town, 'car', 'spin')
      else hopTo(town, 'car', { x: 500, y: 450, a: 0 })
      run(town, 2 * DT)
      expect(revShows(town), where).toBe(false)
      const heard = pull(town)
      expect(heard, where).toContain('zip')
      expect(heard, where).not.toContain(rev.name)
      const pulled = town.pull, as = drawn(town, 'car')
      town.pull = null
      expect(drawn(town, 'car'), where).toBe(as)
      town.pull = pulled
    }
  })
})

describe('a finger that lands on a moving toy', () => {
  const road = (): Strip => strip(0, 330, 300, 900, 300)
  const driving = (who: 'car' | 'bus'): Town => {
    const town = townWith([road()], { [who]: { x: 450, y: 300, a: 0 } })
    nudge(town)
    run(town, 1)
    expect(town.bodies[who].doing.is).toBe('ride')
    return town
  }

  it('stops it where it is on that frame, for as long as the finger rests on it; lifted, the tap lets it go on', () => {
    for (const who of ['car', 'bus'] as const) {
      const town = driving(who), body = town.bodies[who], at = { ...body.at }
      town.press({ x: at.x + 12, y: at.y + 8 })
      run(town, 1.5)
      expect(body.at, who).toEqual(at)
      expect(body.doing.is, who).toBe('ride')
      town.lift()
      run(town, 1.5)
      expect(Math.hypot(body.at.x - at.x, body.at.y - at.y), who).toBeGreaterThan(30)
    }
  })

  it('carries it from where it is: nothing jumps into the hand, and the toy goes as far as the finger goes', () => {
    const town = driving('car'), car = town.bodies.car, at = { ...car.at }
    const from = { x: at.x + 20, y: at.y + 10 }
    town.press(from)
    let jump = 0, was = { ...car.at }
    for (let k = 1; k <= 10; k++) {
      town.move({ x: from.x + 6 * k, y: from.y + 9 * k })
      run(town, DT)
      jump = Math.max(jump, Math.hypot(car.at.x - was.x, car.at.y - was.y))
      was = { ...car.at }
    }
    expect(car.doing.is).toBe('held')
    // Never further in a frame than the finger went since it was last where the toy is: the first carried step is the three moves up to it.
    expect(jump).toBeLessThanOrEqual(Math.hypot(6, 9) * 3 + 1e-6)
    expect(car.at.x).toBeCloseTo(at.x + 60, 6)
    expect(car.at.y).toBeCloseTo(at.y + 90, 6)
  })

  it('in the air catches it: a toy in the middle of a hop is in the hand at once, where it is, and let go it is set down on free floor there', () => {
    const town = driving('car'), car = town.bodies.car
    hopTo(town, 'car', { x: 450, y: 480, a: 0 })
    run(town, 0.15)
    expect(car.flight).not.toBe(null)
    const mid = town.poseOf('car')
    town.press({ x: mid.x + 10, y: mid.y })
    expect(car.doing.is).toBe('held')
    expect(car.flight).toBe(null)
    expect(car.at).toMatchObject({ x: mid.x, y: mid.y })
    run(town, 1)
    expect(car.at).toMatchObject({ x: mid.x, y: mid.y })
    town.lift()
    expect(car.doing.is).not.toBe('held')
    run(town, 1)
    expect(leastRoom(town).room).toBeGreaterThanOrEqual(0)
    expect(Math.hypot(car.at.x - mid.x, car.at.y - mid.y)).toBeLessThan(200)
  })

  it('keeps a toy under it from being sent hopping: the car toots and waits or turns back at the peg a finger rests on, and never drives through it', () => {
    const town = driving('car'), car = town.bodies.car, peg = town.bodies.pegA
    peg.at = town.state.toys.pegA = { x: 840, y: 300, a: 0 }
    peg.doing = { is: 'stand', as: 'plain', since: 0 }
    town.press({ x: 840, y: 300 })
    expect(town.hold?.id).toBe('pegA')
    let least = Infinity, hops = 0
    run(town, 8, [], () => { least = Math.min(least, leastRoom(town).room); if (peg.flight) hops++ })
    expect(hops).toBe(0)
    expect(peg.at).toMatchObject({ x: 840, y: 300 })
    expect(least).toBeGreaterThanOrEqual(0)
    expect(car.at.x).toBeLessThan(840)
    // Let go, it is a toy standing in the road like any other, and hops aside for the car.
    town.lift()
    expect(until(town, 20, () => peg.flight !== null)).toBeLessThan(20)
  })

  it('keeps it from making room for a hop onto a tape', () => {
    const town = townWith([strip(1, 455, 200, 585, 200)], { duck: { x: 520, y: 330, a: 0 }, pegA: { x: 520, y: 200, a: 0 } })
    town.bodies.duck.doing = { is: 'stand', as: 'parked', since: 0 }
    town.press({ x: 520, y: 200 })
    expect(town.hold?.id).toBe('pegA')
    expect(leapOnto(town, 'duck', town.state.strips[0])).toBe(false)
    expect(town.bodies.pegA.flight).toBe(null)
    town.lift()
    expect(leapOnto(town, 'duck', town.state.strips[0])).toBe(true)
  })

  it('keeps it from being called away: the train a finger rests on while a rail is pressed flat stays under the finger, and hops onto the rail when it is let go', () => {
    const town = townWith([], { train: { x: 560, y: 480, a: 0 } })
    const train = town.bodies.train
    nudge(town)
    pick(town, 3)
    drag(town, { x: 400, y: 250 }, { x: 800, y: 250 })
    const rail = last(town)
    town.press({ x: 560, y: 480 })
    expect(town.hold?.id).toBe('train')
    let flew = false
    run(town, 3, [], () => { if (train.flight) flew = true })
    expect(town.pressings).toEqual([])
    expect(flew).toBe(false)
    expect(train.at).toMatchObject({ x: 560, y: 480 })
    town.lift()
    expect(until(town, 3, () => ridesOn(town, 'train', rail))).toBeLessThan(3)
  })

  it('on a peg that rides the bus stops the bus under it', () => {
    const town = driving('bus'), bus = town.bodies.bus
    town.state.riding.pegA = true
    run(town, 0.2)
    const at = { ...bus.at }, peg = town.poseOf('pegA')
    town.press({ x: peg.x, y: peg.y })
    expect(town.hold?.id).toBe('pegA')
    run(town, 1.5)
    expect(bus.at).toEqual(at)
    expect(town.poseOf('pegA')).toMatchObject({ x: peg.x, y: peg.y })
    town.lift()
    run(town, 1.5)
    expect(Math.hypot(bus.at.x - at.x, bus.at.y - at.y)).toBeGreaterThan(30)
  })
})

describe('a toy backing off to the floor', () => {
  /** The train with a road laid under it sniffs at the road and backs off to the nearest free floor; a peg stands where it is going. */
  const backing = (): { town: Town; to: { x: number; y: number } } => {
    const town = townWith([strip(0, 330, 300, 900, 300), strip(0, 848, 628, 894, 315)], { train: { x: 860, y: 540, a: 0 }, duck: { x: 630, y: 645, a: 0 } })
    town.bodies.duck.doing = { is: 'stand', as: 'plain', since: 0 }
    nudge(town)
    for (let k = 0; k < 300 && town.bodies.train.doing.is !== 'act'; k++) run(town, DT)
    const doing = town.bodies.train.doing
    if (doing.is !== 'act' || !doing.to) throw new Error('the train is not backing off')
    run(town, 0.4)
    town.bodies.pegA.at = town.state.toys.pegA = { x: doing.to.x, y: doing.to.y, a: 0 }
    return { town, to: doing.to }
  }

  it('counts the hop it asks for towards the two: the peg it sends hopping has been sent once by the train', () => {
    const { town } = backing()
    expect(names(run(town, 4))).toContain('hop-peg-a')
    expect(town.bodies.pegA.hopped.train).toBe(1)
  })

  it('does not send a peg a finger rests on: it stops short of it', () => {
    const { town, to } = backing()
    town.press({ x: to.x, y: to.y })
    expect(town.hold?.id).toBe('pegA')
    let least = Infinity
    const heard = names(run(town, 4, [], () => { least = Math.min(least, leastRoom(town).room) }))
    expect(heard).not.toContain('hop-peg-a')
    expect(least).toBeGreaterThanOrEqual(0)
    expect(town.bodies.pegA.at).toMatchObject({ x: to.x, y: to.y })
  })

  it('does not ask a third time: a peg the train has sent hopping twice stays, and the train stops short of it where it is', () => {
    const { town, to } = backing()
    town.bodies.pegA.hopped = { train: 2 }
    let least = Infinity
    const heard = names(run(town, 4, [], () => { least = Math.min(least, leastRoom(town).room) }))
    expect(heard).not.toContain('hop-peg-a')
    expect(least).toBeGreaterThanOrEqual(0)
    expect(town.bodies.pegA.at).toMatchObject({ x: to.x, y: to.y })
    expect(Math.hypot(town.bodies.train.at.x - to.x, town.bodies.train.at.y - to.y)).toBeGreaterThan(20)
  })
})

describe('a grey strip laid onto the end of the road the car is driving', () => {
  it('is one road with it, and the car comes all the same: it is driving the new strip within ten seconds, and nobody is touched', () => {
    const town = townWith([strip(0, 400, 300, 800, 300)], { car: { x: 500, y: 300, a: 0 } })
    nudge(town)
    run(town, 1)
    expect(town.bodies.car.doing.is).toBe('ride')
    pick(town, 0)
    drag(town, { x: 800, y: 300 }, { x: 800, y: 560 })
    const joined = last(town)
    expect(town.state.strips).toHaveLength(2)
    let least = Infinity
    expect(until(town, 10, () => ridesOn(town, 'car', joined), () => { least = Math.min(least, leastRoom(town).room) })).toBeLessThan(10)
    expect(least).toBeGreaterThanOrEqual(0)
  })
})

describe('a town put away with the train on a level crossing', () => {
  const crossed = (): Town => {
    const town = townWith([strip(0, 700, 112, 700, 520), strip(3, 300, 400, 950, 400)], { train: { x: 450, y: 400, a: 0 }, dog: { x: 340, y: 110, a: 0 } })
    nudge(town)
    const log: Heard[] = []
    for (let k = 0; k < 600 && !names(log).includes('clatter'); k++) run(town, DT, log)
    expect(names(log)).toContain('clatter')
    return town
  }

  it('is found with the gates shut and both arms down, in the town opened again and in a town loaded from it', () => {
    const town = crossed()
    const found = loaded(town)
    town.rest()
    for (const one of [town, found]) {
      const crossing = one.crossings.find((at) => at.kind === 'level')!
      expect(gateShut(one, crossing)).toBe(true)
      expect(gateOf(one, crossing)).toEqual([1, 1])
    }
  })

  it('and they open as they would have, when the train is over: at its second clack, with no second hoot', () => {
    const found = loaded(crossed())
    nudge(found)
    const crossing = found.crossings.find((at) => at.kind === 'level')!
    const log: Heard[] = []
    let openAt = -1
    for (let k = 0; k < 240 && openAt < 0; k++) { run(found, DT, log); if (!gateShut(found, crossing)) openAt = found.frames }
    expect(openAt).toBeGreaterThan(0)
    expect(log.filter((heard) => heard.name === 'clatter').map((heard) => heard.frame)).toEqual([openAt])
    run(found, 1, log)
    expect(names(log)).not.toContain('hoot')
    expect(gateOf(found, crossing)).toEqual([0, 0])
  })
})

describe('whoever makes room for a hop onto its tape', () => {
  it('leaves the floor in the same moment as the newcomer and is down no later: from near by they land together, from across the floor it is down first', () => {
    for (const from of [{ x: 520, y: 330 }, { x: 900, y: 600 }]) {
      const town = townWith([strip(1, 455, 200, 585, 200)], { duck: { ...from, a: 0 }, pegA: { x: 520, y: 200, a: 0 } })
      const duck = town.bodies.duck, peg = town.bodies.pegA
      duck.doing = { is: 'stand', as: 'parked', since: 0 }
      expect(leapOnto(town, 'duck', town.state.strips[0])).toBe(true)
      expect(duck.flight).not.toBe(null)
      expect(peg.flight).not.toBe(null)
      let pegDown = -1, duckDown = -1
      for (let k = 1; k <= 120; k++) {
        run(town, DT)
        if (pegDown < 0 && !peg.flight) pegDown = k
        if (duckDown < 0 && !duck.flight) duckDown = k
      }
      expect(pegDown).toBeGreaterThan(0)
      expect(pegDown).toBeLessThanOrEqual(duckDown)
      if (from.x === 900) expect(pegDown).toBeLessThan(duckDown)
    }
  })
})
