import { describe, expect, it } from 'vitest'
import { DT, carry, leastRoom, loaded, names, nudge, run, strip, townWith, type Heard } from './bench'
import { SPRITE_SIZE, paintSprite } from './art'
import { shutGate } from './gates'
import { REV_SECONDS, revShows, watching } from './going'
import type { Mover } from './habits'
import { ROLLS, type Kind, type ToyId } from './layout'
import { leapOnto } from './leap'
import { lengthOf, type Strip } from './tape'
import type { Town } from './town'
import { paintToy } from './toyView'
import { TOOT, bom, bomLow, boo, hoot, rev } from './voices'

// What the fourth and last reader found, each held by a test: a toy a finger rests on is left alone, every toy,
// and is tooted at once; a tap on the box is a fresh start for the dog; a toy travelling tail first is found
// going the way it was going; and the flags and clocks of the close.

const ridesOn = (town: Town, id: Mover, on: Strip): boolean => {
  const body = town.bodies[id], doing = body.doing
  return !body.flight && doing.is === 'ride' && town.nets[doing.kind].strips[doing.rider.s] === on
}
const pick = (town: Town, kind: Kind): void => { town.press(ROLLS[kind]); town.lift() }
const until = (town: Town, most: number, done: () => boolean, each?: () => void): number => {
  for (let k = 0; k < most / DT; k++) { if (done()) return k * DT; run(town, DT); each?.() }
  return done() ? most : Infinity
}
const road = (): Strip => strip(0, 330, 300, 900, 300)
const count = (log: Heard[], name: string): number => names(log).filter((heard) => heard === name).length

describe('a toy a finger rests on is left alone, every toy', () => {
  it('the dog in the road under a finger is not sent walking: the car toots at it once and waits or turns back, and the dog has not moved and has not whined', () => {
    const town = townWith([road()], { car: { x: 450, y: 300, a: 0 }, dog: { x: 760, y: 300, a: 0 } })
    const dog = town.bodies.dog
    dog.doing = { is: 'stand', as: 'plain', since: 0 }
    nudge(town)
    town.press({ x: 760, y: 300 })
    expect(town.hold?.id).toBe('dog')
    town.takeSounds()
    const log: Heard[] = []
    let least = Infinity, walked = false
    run(town, 12, log, () => { least = Math.min(least, leastRoom(town).room); if (dog.doing.is !== 'stand' || dog.flight) walked = true })
    expect(walked).toBe(false)
    expect(dog.at).toMatchObject({ x: 760, y: 300 })
    expect(count(log, TOOT.dog.name)).toBe(0)
    expect(count(log, TOOT.car.name)).toBe(1)
    expect(least).toBeGreaterThanOrEqual(0)
  })

  it('a peg beside the road under a finger does not board the bus: the bus drives by, and with no finger on it the same peg is aboard', () => {
    for (const rested of [true, false]) {
      const town = townWith([road()], { bus: { x: 480, y: 300, a: 0 }, pegA: { x: 700, y: 425, a: 0 } })
      town.bodies.pegA.doing = { is: 'stand', as: 'plain', since: 0 }
      nudge(town)
      if (rested) { town.press({ x: 700, y: 425 }); expect(town.hold?.id).toBe('pegA') }
      let aboard = false, stopped = false, passed = false
      run(town, 8, [], () => { if (town.state.riding.pegA) aboard = true; const bus = town.bodies.bus.doing; if (bus.is === 'act' && bus.name === 'stop') stopped = true; if (town.bodies.bus.at.x > 760) passed = true })
      expect(aboard, `${rested}`).toBe(!rested)
      expect(stopped, `${rested}`).toBe(!rested)
      if (rested) expect(town.bodies.pegA.at).toMatchObject({ x: 700, y: 425 })
      // Clear of the bus's way: it is not tooted at, and the bus has gone by.
      if (rested) expect(passed).toBe(true)
    }
  })

  it('the dog under a finger does not sit and howl at the train\'s hoot', () => {
    const town = townWith([], { dog: { x: 600, y: 400, a: 0 } })
    town.bodies.dog.doing = { is: 'stand', as: 'plain', since: 0 }
    nudge(town)
    town.press({ x: 600, y: 400 })
    town.hum(hoot)
    expect(town.bodies.dog.doing.is).toBe('stand')
    town.lift()
    town.hum(hoot)
    expect(town.bodies.dog.doing).toMatchObject({ is: 'act', name: 'howl' })
  })
})

describe('a toy held still on its road', () => {
  /** The car stopped under a finger as it drives, and the bus behind it or coming towards it. */
  const held = (busAt: number, busFaces: number): Town => {
    const town = townWith([road()], { car: { x: 560, y: 300, a: 0 }, bus: { x: busAt, y: 300, a: busFaces } })
    nudge(town)
    run(town, 0.3)
    expect(town.bodies.car.doing.is).toBe('ride')
    const at = town.bodies.car.at
    town.press({ x: at.x, y: at.y })
    expect(town.hold?.id).toBe('car')
    town.takeSounds()
    return town
  }

  it('is tooted at once by the one that comes up behind it, and once by the one that comes towards it, and never again while it is held', () => {
    for (const [where, busAt, busFaces] of [['behind', 380, 0], ['towards', 800, Math.PI]] as const) {
      const town = held(busAt, busFaces), at = { ...town.bodies.car.at }
      const log: Heard[] = []
      let least = Infinity
      run(town, 30, log, () => { least = Math.min(least, leastRoom(town).room) })
      expect(count(log, TOOT.bus.name), where).toBe(1)
      expect(count(log, TOOT.car.name), where).toBe(0)
      expect(town.bodies.car.at, where).toEqual(at)
      expect(least, where).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('the dog that lay down', () => {
  const lain = (): Town => {
    const town = townWith([strip(0, 400, 300, 800, 300), strip(2, 560, 540, 638, 540)], { car: { x: 500, y: 300, a: 0 }, dog: { x: 650, y: 400, a: 0 } })
    town.bodies.dog.doing = { is: 'stand', as: 'plain', since: 0 }
    nudge(town)
    expect(until(town, 30, () => !town.bodies.dog.flight && watching(town))).toBeLessThan(30)
    return town
  }
  const follows = (town: Town, within: number): boolean => {
    const dog = town.bodies.dog
    let followed = false
    run(town, within, [], () => { if (dog.doing.is === 'walk' && dog.doing.follow) followed = true })
    return followed
  }

  it('follows again after the box is tapped twice: home and out again is a fresh start', () => {
    const town = lain()
    town.callHome()
    run(town, 4)
    town.tipOut()
    run(town, 4)
    expect(town.bodies.dog.asides).toBe(0)
    expect(watching(town)).toBe(false)
    expect(follows(town, 20)).toBe(true)
  })

  it('follows again after a strip is peeled: a stub of hedge pulled off far from it gets it up', () => {
    const town = lain(), stub = town.state.strips[1], length = lengthOf(stub)
    town.press({ x: stub.bx + 30, y: stub.by })
    for (let k = 1; k <= 8; k++) town.move({ x: stub.bx + 30 + (length * 1.2 * k) / 8, y: stub.by })
    town.lift()
    expect(town.state.strips).toHaveLength(1)
    expect(town.bodies.dog.asides).toBe(0)
    expect(follows(town, 20)).toBe(true)
  })
})

describe('a toy travelling its tape tail first', () => {
  /** A town put away and one played on, a second later: each mover where the other has it, going the same way. */
  const sameAsPlayedOn = (town: Town, id: Mover): void => {
    const found = loaded(town), doing = town.bodies[id].doing
    if (doing.is !== 'ride') throw new Error('not travelling')
    const was = { ...town.bodies[id].at }, dir = doing.rider.dir, back = doing.back
    const then = found.bodies[id].doing
    expect(then).toMatchObject({ is: 'ride', back })
    expect(then.is === 'ride' && then.rider.dir).toBe(dir)
    run(town, 1)
    run(found, 1)
    const a = town.bodies[id].at, b = found.bodies[id].at
    // Saved in whole units and whole degrees: within a unit and a half of each other after a second.
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(1.5)
    expect(Math.hypot(a.x - was.x, a.y - was.y)).toBeGreaterThan(10)
    expect(Math.cos(a.a - b.a)).toBeGreaterThan(0.99)
  }

  it('the train on its run back is found running back: put away in the middle of it, it goes on as the town played on does', () => {
    const town = townWith([strip(3, 300, 400, 900, 400)], { train: { x: 700, y: 400, a: 0 } })
    nudge(town)
    const train = town.bodies.train
    // It runs to the end of the line, rings its buffers and runs back as it stands.
    expect(until(town, 30, () => train.doing.is === 'ride' && train.doing.rider.dir === -1 && train.at.x < 760 && Math.cos(train.at.a) > 0)).toBeLessThan(30)
    sameAsPlayedOn(town, 'train')
    // And parked, as loaded.
    const found = loaded(town)
    town.rest()
    expect(town.bodies.train.doing).toMatchObject({ is: 'ride' })
    expect(town.bodies.train.doing.is === 'ride' && town.bodies.train.doing.rider.dir).toBe(-1)
    run(town, 1); run(found, 1)
    expect(found.bodies.train.at).toEqual(town.bodies.train.at)
  })

  it('is only how it was found: set on its rail by the child after a load, or after a save, the train runs the way its nose points', () => {
    for (const how of ['loaded', 'saved'] as const) {
      const town = townWith([strip(3, 300, 400, 900, 400)], { train: { x: 700, y: 400, a: 0 } })
      nudge(town)
      const train = town.bodies.train
      expect(until(town, 30, () => train.doing.is === 'ride' && train.doing.rider.dir === -1 && train.at.x < 760 && Math.cos(train.at.a) > 0)).toBeLessThan(30)
      const one = how === 'loaded' ? loaded(town) : town
      if (how === 'saved') town.saved()
      nudge(one)
      carry(one, 'train', { x: 500, y: 400 })
      run(one, 0.5)
      const doing = one.bodies.train.doing
      expect(doing.is, how).toBe('ride')
      expect(doing.is === 'ride' && doing.rider.dir * Math.sign(Math.cos(one.bodies.train.at.a)), how).toBe(1)
    }
  })

  it('a car backing away tail first is found backing: it goes on the way it was going, tail first', () => {
    // A road along the top edge of the boards, where a car has no room to turn.
    const town = townWith([strip(0, 330, 112, 900, 112)], { car: { x: 600, y: 112, a: 0 } })
    nudge(town)
    run(town, 0.5)
    const car = town.bodies.car
    if (car.doing.is !== 'ride') throw new Error('the car is not driving')
    // Made to go back with no room to turn: it backs away, tail first.
    car.doing.rider = { ...car.doing.rider, dir: -1 }
    car.doing.back = true
    run(town, 2 * DT)
    expect(car.doing).toMatchObject({ is: 'ride', back: true })
    sameAsPlayedOn(town, 'car')
  })
})

describe('the last flags and clocks', () => {
  it('the train does not wait for a car short of the rails at any length of step: stepped ten times a second it runs straight by', () => {
    const town = townWith([strip(0, 700, 112, 700, 580), strip(3, 300, 400, 950, 400)], { train: { x: 450, y: 400, a: 0 }, car: { x: 700, y: 520, a: -Math.PI / 2 }, dog: { x: 340, y: 110, a: 0 } })
    nudge(town)
    const crossing = town.crossings.find((one) => one.kind === 'level')!
    shutGate(town, crossing)
    let stood = 0, most = 0, was = town.bodies.train.at.x
    for (let k = 0; k < 26; k++) {
      town.step(0.1)
      const x = town.bodies.train.at.x
      stood = x === was ? stood + 1 : 0
      most = Math.max(most, stood)
      was = x
    }
    expect(most).toBeLessThan(2)
    expect(town.bodies.train.at.x).toBeGreaterThan(700)
  })

  it('a toy caught in the air on its way onto its tape, and then let go of by the browser and not the child, is where it was going and takes its tape up like any other', () => {
    const town = townWith([strip(1, 400, 200, 800, 200)], { duck: { x: 520, y: 420, a: 0 } })
    const duck = town.bodies.duck
    duck.doing = { is: 'stand', as: 'parked', since: 0 }
    nudge(town)
    expect(leapOnto(town, 'duck', town.state.strips[0])).toBe(true)
    run(town, 0.1)
    const mid = town.poseOf('duck')
    town.press({ x: mid.x, y: mid.y })
    expect(duck.doing.is).toBe('held')
    town.cancel()
    expect(duck.doing.is).not.toBe('held')
    expect(until(town, 3, () => ridesOn(town, 'duck', town.state.strips[0]))).toBeLessThan(3)
  })
})

/** Every call a drawing makes, written down, and the sprites it stamps. */
function recorder(): { g: CanvasRenderingContext2D; said: string[] } {
  const said: string[] = []
  const g = new Proxy({} as Record<string | symbol, unknown>, {
    get: (held, name) => (name in held ? held[name] : (...args: unknown[]) => { said.push(`${String(name)}(${args.map((arg) => (typeof arg === 'number' ? arg.toFixed(3) : '')).join(',')})`) }),
    set: (held, name, value) => { held[name] = value; return true },
  }) as unknown as CanvasRenderingContext2D
  return { g, said }
}
function drawn(town: Town, id: ToyId): { said: string; stamps: string[]; n: number } {
  const { g, said } = recorder(), stamps: string[] = []
  const pen = { g, n: 0, scale: 2, stamp: (name: string) => { stamps.push(name) }, sprite: () => ({}) as HTMLCanvasElement }
  paintToy(pen, town, id)
  return { said: said.join(';'), stamps, n: pen.n }
}

describe('the dog that has lain down, from above', () => {
  it('is another drawing than the standing dog: its own sprite, flat and wider, with no wagging tail drawn behind it, and its eyes still drawn over it', () => {
    const town = townWith([], { dog: { x: 600, y: 400, a: 0 } })
    const dog = town.bodies.dog
    dog.doing = { is: 'stand', as: 'plain', since: 0 }
    const standing = drawn(town, 'dog')
    dog.doing = { is: 'stand', as: 'lying', since: 0 }
    dog.asides = 2
    const lying = drawn(town, 'dog')
    expect(standing.stamps).toEqual(['dog'])
    expect(lying.stamps).toEqual(['dogLying'])
    // The standing dog's tail is two strokes of the view; the lying dog's is in its sprite.
    expect(standing.said).toContain('quadraticCurveTo')
    expect(lying.said).not.toContain('quadraticCurveTo')
    expect(lying.said).toContain('arc(')
    const sprite = (name: string): string[] => { const { g, said } = recorder(); paintSprite(g, name); return said }
    const up = sprite('dog'), down = sprite('dogLying')
    expect(down.join(';')).not.toBe(up.join(';'))
    // Inside the room its sprite is given.
    const reach = (calls: string[]): { across: number; along: number } => {
      let across = 0, along = 0
      for (const call of calls) {
        const [name, rest] = call.split('('), n = rest.slice(0, -1).split(',').map(Number)
        if (name === 'ellipse') { across = Math.max(across, Math.abs(n[1]) + Math.max(n[2], n[3])); along = Math.max(along, Math.abs(n[0]) + Math.max(n[2], n[3])) }
        if (name === 'roundRect') { across = Math.max(across, Math.abs(n[1]), Math.abs(n[1] + n[3])); along = Math.max(along, Math.abs(n[0]), Math.abs(n[0] + n[2])) }
        if (name === 'bezierCurveTo') { across = Math.max(across, Math.abs(n[1]), Math.abs(n[3]), Math.abs(n[5])); along = Math.max(along, Math.abs(n[0]), Math.abs(n[2]), Math.abs(n[4])) }
      }
      return { across, along }
    }
    // Its body is the wider one by a quarter, and its ears and paws reach hardly further across than the standing
    // dog's ears, so lain down it is no more in anybody's way.
    const body = (calls: string[]): number => Math.max(...calls.filter((call) => call.startsWith('roundRect(')).map((call) => Number(call.slice(10, -1).split(',')[3])))
    expect(body(down)).toBeGreaterThanOrEqual(body(up) * 1.25)
    expect(reach(down).across).toBeGreaterThan(reach(up).across)
    expect(reach(down).across).toBeLessThanOrEqual(reach(up).across + 6)
    expect(reach(down).across + 4).toBeLessThanOrEqual(SPRITE_SIZE.dogLying.h / 2)
    expect(reach(down).along + 4).toBeLessThanOrEqual(SPRITE_SIZE.dogLying.w / 2)
  })
})

describe('no sound without sight, and no shake without its sound', () => {
  const pupils = (town: Town): string => drawn(town, 'car').said.split(';').filter((call) => call.startsWith('arc(')).join(';')
  /** The car standing on the boards and the first zip of a grey pull well away from it. */
  const revved = (): Town => {
    const town = townWith([], { car: { x: 420, y: 300, a: 0 } })
    town.bodies.car.doing = { is: 'stand', as: 'plain', since: 0 }
    nudge(town)
    pick(town, 0)
    town.takeSounds()
    town.press({ x: 600, y: 480 })
    town.move({ x: 640, y: 480 })
    expect(town.takeSounds().map((sound) => sound.name)).toContain(rev.name)
    return town
  }

  it('the car\'s eyes jiggle while it revs: its pupils are somewhere else from frame to frame, with the finger held still', () => {
    const town = revved()
    const seen = new Set<string>()
    for (let k = 0; k < 8; k++) { run(town, DT); seen.add(pupils(town)) }
    expect(seen.size).toBeGreaterThanOrEqual(6)
  })

  it('the shake is seen for as long as the rev sounds and no longer: the strip still in the hand a moment later, the car is drawn as with no strip pulled', () => {
    const town = revved(), pulled = town.pull
    const shakes = (): boolean => { const as = drawn(town, 'car').said; town.pull = null; const plain = drawn(town, 'car').said; town.pull = pulled; return as !== plain }
    run(town, DT)
    expect(shakes()).toBe(true)
    run(town, REV_SECONDS - 3 * DT)
    expect(shakes()).toBe(true)
    run(town, 4 * DT)
    expect(shakes()).toBe(false)
    // And it does not rev again for the same strip.
    town.move({ x: 760, y: 480 })
    expect(town.takeSounds().map((sound) => sound.name)).not.toContain(rev.name)
    expect(shakes()).toBe(false)
  })

  it('there is no rev from under a hedge: the car on a rail in a tunnel, with the hedge laid over it, says nothing, and clear of the hedge it revs', () => {
    for (const [x, heard] of [[600, false], [420, true]] as const) {
      const town = townWith([strip(3, 300, 400, 900, 400), strip(2, 600, 250, 600, 550)], { car: { x: 380, y: 400, a: 0 } })
      nudge(town)
      // It judders along the rail and into the tunnel.
      expect(until(town, 20, () => Math.abs(town.bodies.car.at.x - x) < 6)).toBeLessThan(20)
      expect(town.bodies.car.doing).toMatchObject({ is: 'ride', kind: 3 })
      expect(revShows(town), `${x}`).toBe(heard)
      pick(town, 0)
      town.takeSounds()
      town.press({ x: 500, y: 600 })
      town.move({ x: 540, y: 600 })
      const names = town.takeSounds().map((sound) => sound.name)
      expect(names, `${x}`).toContain('zip')
      expect(names.includes(rev.name), `${x}`).toBe(heard)
    }
  })

  it('the hoot before a tunnel and before a trestle, the drum of a bridge and the horn of the bus afloat each move the toy that makes them, from the step they sound in', () => {
    const cases: [string, Strip[], Mover, { x: number; y: number; a: number }, string][] = [
      ['hoot before a tunnel', [strip(3, 300, 400, 900, 400), strip(2, 650, 250, 650, 550)], 'train', { x: 400, y: 400, a: 0 }, hoot.name],
      ['hoot before a trestle', [strip(1, 650, 250, 650, 550), strip(3, 300, 400, 900, 400)], 'train', { x: 400, y: 400, a: 0 }, hoot.name],
      ['the car on a bridge', [strip(0, 300, 300, 900, 300), strip(1, 650, 150, 650, 500)], 'car', { x: 420, y: 300, a: 0 }, bom.name],
      ['the bus on a bridge', [strip(0, 300, 300, 900, 300), strip(1, 650, 150, 650, 500)], 'bus', { x: 420, y: 300, a: 0 }, bomLow.name],
      ['the bus afloat', [strip(1, 300, 400, 900, 400)], 'bus', { x: 420, y: 400, a: 0 }, boo.name],
    ]
    for (const [what, strips, id, at, sound] of cases) {
      const town = townWith(strips, { [id]: at }), body = town.bodies[id]
      nudge(town)
      // Every time it sounds, for a quarter of a minute: the second drum of the bridge and the hoot that blows the leaves off as well.
      let at0 = -1, times = 0
      for (let k = 0; k < 900; k++) {
        if (!names(run(town, DT)).includes(sound)) continue
        times++
        expect(body.soundedAt, what).toBe(town.time)
        if (at0 < 0) at0 = town.time
      }
      expect(times, what).toBeGreaterThanOrEqual(what === 'hoot before a trestle' || what === 'the bus afloat' ? 1 : 2)
      expect(at0, what).toBeGreaterThan(0)
      // Seen from the next step, for a few steps, in the same town played again up to its first sound.
      const again = townWith(strips, { [id]: at }), theirs = again.bodies[id]
      nudge(again)
      for (let k = 0; k < 900 && theirs.soundedAt === -Infinity; k++) run(again, DT)
      let moved = 0
      for (let k = 0; k < 12; k++) {
        run(again, DT)
        const when = theirs.soundedAt, as = drawn(again, id).said
        theirs.soundedAt = -Infinity
        if (drawn(again, id).said !== as) moved++
        theirs.soundedAt = when
      }
      expect(moved, what).toBeGreaterThanOrEqual(10)
    }
  })
})
