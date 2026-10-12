import { describe, expect, it } from 'vitest'
import { DT, carry, drag, leastRoom, loaded, nudge, run, storm, strip, townWith, type Heard } from './bench'
import { armRoom, armsOf, gateOf, gateShut, railsEdge, shutGate, stopShort } from './gates'
import { OUT_PLACE, ROLLS, TOY_IDS, TOY_SIZE } from './layout'
import { freshTown } from './save'
import { rideOn } from './going'
import { Town } from './town'
import { TOOT } from './voices'

// The level crossing is a place: its gates shut as the train comes and open
// after it, whoever travels the road waits at them, and the train says
// clack-clack over the road. The dog howls at the hoot and watches the
// train by.

/** A long rail across the floor and a road down it: the train has room to come from far off and to run well past. */
const rail = () => strip(3, 300, 400, 950, 400)
const road = () => strip(0, 700, 112, 700, 520)
const far = { x: 450, y: 400, a: 0 }
/** A road nearer the start of the rail, so that the train has a long way to run on past it, and the train at the start. It runs on past the rails far enough for a car to stand on clear of them. */
const early = () => strip(0, 520, 112, 520, 580)
/** The bus, off the shelf and well away: whoever comes to the crossing looks right across it and on down the road. */
const busAway = { bus: { x: 820, y: 240, a: 0 } }
const start = { x: 392, y: 400, a: 0 }
/** The dog, further from the rail and the road than it follows anybody from: it howls where it sits and comes into no test but its own. */
const aside = { dog: { x: 340, y: 110, a: 0 } }

function crossingOf(town: Town) {
  const crossing = town.crossings.find((one) => one.kind === 'level')
  if (!crossing) throw new Error('no level crossing')
  return crossing
}

/** Runs until a sound is heard, and says the frame it was queued in. */
function until(town: Town, name: string, most = 8): number {
  const log: Heard[] = []
  for (let i = Math.round(most / DT); i > 0; i--) {
    run(town, DT, log)
    const heard = log.find((one) => one.name === name)
    if (heard) return heard.frame
  }
  throw new Error(`no ${name} in ${most} s`)
}

describe('the gates of a level crossing', () => {
  it('stand open until the train hoots at the crossing, are shut on the frame of the hoot, and each arm comes down across the road', () => {
    const town = townWith([road(), rail()], { train: far, ...aside })
    nudge(town)
    const crossing = crossingOf(town)
    expect(town.gates).toEqual([])
    expect(gateOf(town, crossing)).toEqual([0, 0])
    const frame = until(town, 'hoot')
    expect(town.frames).toBe(frame)
    expect(gateShut(town, crossing)).toBe(true)
    expect(town.gates[0].shutAt).toBe(town.time)
    // Not down yet on that frame: they come down, and are down well before the train is on the road.
    expect(gateOf(town, crossing)[0]).toBeLessThan(0.2)
    run(town, 0.4)
    expect(gateOf(town, crossing)).toEqual([1, 1])
    expect(town.bodies.train.at.x).toBeLessThan(700 - 31 - TOY_SIZE.train.long / 2)
    // A down arm lies across the whole road, alongside the rails and clear of the train.
    for (const arm of armsOf(crossing)) {
      const tip = { x: arm.post.x + Math.cos(arm.a) * arm.long, y: arm.post.y + Math.sin(arm.a) * arm.long }
      expect(Math.abs(arm.post.x - 700)).toBeGreaterThan(TOY_SIZE.bus.wide / 2)
      expect((arm.post.x - 700) * (tip.x - 700)).toBeLessThan(0)
      expect(Math.abs(tip.x - 700)).toBeGreaterThanOrEqual(31)
      expect(Math.abs(arm.post.y - 400)).toBeGreaterThan(TOY_SIZE.train.wide / 2 + 4)
      expect(Math.abs(tip.y - arm.post.y)).toBeLessThan(0.001)
    }
  })

  it('the train says clack-clack over the road: a clack as its first wheels come onto it and a clack as its last leave it', () => {
    const town = townWith([road(), rail()], { train: far, ...aside })
    nudge(town)
    const at: number[] = [], heard: string[] = []
    for (let i = 0; i < Math.round(3.4 / DT); i++) {
      for (const sound of run(town, DT)) { heard.push(sound.name); if (sound.name === 'clatter') at.push(town.bodies.train.at.x) }
    }
    expect(heard.filter((name) => name === 'clatter')).toHaveLength(2)
    expect(heard.indexOf('hoot')).toBeLessThan(heard.indexOf('clatter'))
    // Its front wheels are 37 ahead of its middle and its last 63 behind; the road is 31 to each side of its own middle.
    expect(Math.abs(at[0] - (700 - 31 - 37))).toBeLessThan(3)
    expect(Math.abs(at[1] - (700 + 31 + 63))).toBeLessThan(3)
  })

  it('open on the frame of the second clack, and the arms go up', () => {
    const town = townWith([road(), rail()], { train: far, ...aside })
    nudge(town)
    const crossing = crossingOf(town)
    until(town, 'clatter')
    expect(gateShut(town, crossing)).toBe(true)
    const frame = until(town, 'clatter')
    expect(town.frames).toBe(frame)
    expect(gateShut(town, crossing)).toBe(false)
    expect(town.gates[0].openAt).toBe(town.time)
    run(town, 0.4)
    expect(town.gates).toEqual([])
    expect(gateOf(town, crossing)).toEqual([0, 0])
  })

  it('a car waits at a shut gate: it brakes with a squeak, rolls up to the arm, idles put-put, and drives on when the gate is opened', () => {
    const town = townWith([early(), rail()], { train: start, car: { x: 520, y: 190, a: Math.PI / 2 }, dog: { x: 880, y: 110, a: 0 }, ...busAway })
    town.bodies.bus.doing = { is: 'stand', as: 'bath', since: 0 }
    nudge(town)
    const crossing = crossingOf(town), stop = 400 - stopShort(crossing, 'car')
    const log: Heard[] = []
    let least = Infinity, furthest = 0
    const watch = (): void => { least = Math.min(least, leastRoom(town).room); furthest = Math.max(furthest, town.bodies.car.at.y) }
    run(town, 1.7, log, watch)
    const heard = log.map((one) => one.name)
    expect(heard.indexOf('brake')).toBeGreaterThan(heard.indexOf('hoot'))
    expect(heard.filter((name) => name === 'brake')).toHaveLength(1)
    expect(heard.filter((name) => name === 'put-put').length).toBeGreaterThanOrEqual(3)
    // It stands with its nose just short of the arm, and no nearer.
    expect(gateShut(town, crossing)).toBe(true)
    expect(town.bodies.car.at.y).toBeGreaterThan(stop - 3)
    expect(furthest).toBeLessThanOrEqual(stop)
    const arm = armsOf(crossing).find((one) => one.post.y < 400)!
    expect(armRoom(town, arm)).toBeGreaterThanOrEqual(3)
    expect(armRoom(town, arm)).toBeLessThan(12)
    expect(town.bodies.car.doing).toMatchObject({ is: 'ride', braked: true })
    // The gate opens behind the train, and the car drives on over the rails.
    run(town, 2.6, log, watch)
    expect(furthest).toBeGreaterThan(444)
    expect(least).toBeGreaterThanOrEqual(0)
  })

  it('a duck slapping along the road waits at a shut gate too, without a squeak or a put-put, and goes on when the gate is opened', () => {
    const town = townWith([early(), rail()], { train: start, duck: { x: 520, y: 190, a: Math.PI / 2 }, dog: { x: 880, y: 110, a: 0 }, bus: { x: 780, y: 250, a: 0 } })
    // The bus stands well away from the road: the duck looks right across the crossing before it walks onto it.
    town.bodies.bus.doing = { is: 'stand', as: 'plain', since: 0 }
    nudge(town)
    town.bodies.duck.doing = rideOn(0, { s: 0, d: 78, dir: 1, skip: -1 }, 'slap')
    const crossing = crossingOf(town), stop = 400 - stopShort(crossing, 'duck')
    const log: Heard[] = []
    let furthest = 0, shut = 0
    run(town, 2.4, log, () => { if (gateShut(town, crossing)) { shut++; furthest = Math.max(furthest, town.bodies.duck.at.y) } })
    expect(shut).toBeGreaterThan(60)
    expect(furthest).toBeGreaterThan(stop - 3)
    expect(furthest).toBeLessThanOrEqual(stop)
    const heard = log.map((one) => one.name)
    expect(heard).not.toContain('brake')
    expect(heard).not.toContain('put-put')
    // The gate opens behind the train, and the duck walks on to the rails.
    run(town, 3, [], () => { furthest = Math.max(furthest, town.bodies.duck.at.y) })
    expect(furthest).toBeGreaterThan(stop + 20)
  })

  it('a car whose nose is past the arm when the gate is shut is not stopped by it, and the arm waits for the car', () => {
    const town = townWith([road(), rail()], { train: far, car: { x: 700, y: 285, a: Math.PI / 2 }, ...aside })
    nudge(town)
    const crossing = crossingOf(town)
    let under = 0, least = Infinity
    const watch = (): void => {
      least = Math.min(least, leastRoom(town).room)
      const gate = town.gates[0]
      if (gate) armsOf(crossing).forEach((arm, k) => { if (gate.down[k] >= 1 && armRoom(town, arm) < 0) under++ })
    }
    until(town, 'hoot')
    const at = town.bodies.car.at.y
    run(town, 0.2, [], watch)
    expect(town.bodies.car.at.y).toBeGreaterThan(at + 20)
    expect(town.bodies.car.doing).toMatchObject({ is: 'ride', braked: false })
    const over = armsOf(crossing).findIndex((arm) => armRoom(town, arm) < 3)
    expect(gateOf(town, crossing)[over]).toBe(0)
    run(town, 4, [], watch)
    expect(under).toBe(0)
    expect(least).toBeGreaterThanOrEqual(0)
  })

  it('a car that is past the arm and short of the rails when the gate is shut waits where it is, the arm stays up over it, and the train goes by without waiting for it', () => {
    // The road runs on a little way past the rails: a car that has turned round at its end stands just past the arm.
    const town = townWith([strip(0, 700, 112, 700, 580), rail()], { train: far, car: { x: 700, y: 520, a: -Math.PI / 2 }, ...aside })
    nudge(town)
    const crossing = crossingOf(town)
    expect(400 + stopShort(crossing, 'car')).toBeGreaterThan(520)
    expect(400 + railsEdge(crossing, 'car')).toBeLessThan(520)
    shutGate(town, crossing)
    let least = Infinity, stood = 0, most = 0, was = town.bodies.train.at.x, moved = 0, armDown = 0
    const south = armsOf(crossing).findIndex((arm) => arm.post.y > 400)
    run(town, 2.6, [], () => {
      least = Math.min(least, leastRoom(town).room)
      const x = town.bodies.train.at.x
      stood = x === was ? stood + 1 : 0
      most = Math.max(most, stood)
      was = x
      if (gateShut(town, crossing)) { moved = Math.max(moved, Math.abs(town.bodies.car.at.y - 520)); armDown = Math.max(armDown, gateOf(town, crossing)[south]) }
    })
    expect(moved).toBe(0)
    expect(armDown).toBe(0)
    // The train never stood: it ran straight by, and nothing touched.
    expect(most).toBeLessThan(2)
    expect(town.bodies.train.at.x).toBeGreaterThan(700)
    expect(least).toBeGreaterThanOrEqual(0)
    // And with the train past and the gate open, the car drives over.
    run(town, 3)
    expect(town.bodies.car.at.y).toBeLessThan(400)
  })

  it('a road that ends just beyond the rails is driven by who can stand on its end clear of them: the car crosses, and the bus turns back at the arm', () => {
    // The road runs on 180 past the middle of the rails: room for the car beyond them, and not for the bus.
    const withCar = townWith([early(), rail()], { car: { x: 520, y: 190, a: Math.PI / 2 }, ...aside, ...busAway })
    withCar.bodies.bus.doing = { is: 'stand', as: 'bath', since: 0 }
    nudge(withCar)
    let furthest = 0
    run(withCar, 4, [], () => { furthest = Math.max(furthest, withCar.bodies.car.at.y) })
    expect(furthest).toBeGreaterThan(500)
    // A road along the floor with rails down across it, and 120 of road beyond them: the bus comes from the long end.
    const withBus = townWith([strip(0, 300, 300, 760, 300), strip(3, 640, 112, 640, 520)], { bus: { x: 420, y: 300, a: 0 }, dog: { x: 900, y: 110, a: 0 } })
    nudge(withBus)
    const crossing = crossingOf(withBus), log: Heard[] = []
    furthest = 0
    let since = Infinity, turns = 0, was = ''
    run(withBus, 9, log, () => {
      const x = withBus.bodies.bus.at.x, doing = withBus.bodies.bus.doing, now = doing.is === 'act' ? doing.name : doing.is
      if (x > furthest) { furthest = x; since = x }
      since = Math.min(since, x)
      if (now === 'busTurn' && was !== 'busTurn') turns++
      was = now
    })
    // It came up to the arm, and no nearer the rails than that; and then it went back up its road.
    expect(furthest).toBeGreaterThan(640 - stopShort(crossing, 'bus') - 14)
    expect(furthest).toBeLessThan(640 - railsEdge(crossing, 'bus'))
    expect(since).toBeLessThan(furthest - 40)
    // Back at the arm after that short way, it does not spin round and round: it stands a long while before it turns again.
    expect(turns).toBeLessThanOrEqual(3)
    expect(log.filter((one) => one.name === 'pssh').length).toBeLessThanOrEqual(3)
  })

  it('an arm never comes down on anybody: it stays up over a peg that stands under it, and comes down when the peg is taken away', () => {
    const town = townWith([road(), rail()], { train: { x: 400, y: 400, a: 0 }, pegA: { x: 700, y: 304, a: 0 }, ...aside })
    nudge(town)
    const crossing = crossingOf(town)
    until(town, 'hoot')
    run(town, 0.5)
    const arms = armsOf(crossing), over = arms.findIndex((arm) => armRoom(town, arm) < 3)
    expect(over).toBeGreaterThanOrEqual(0)
    expect(gateOf(town, crossing)[over]).toBe(0)
    expect(gateOf(town, crossing)[1 - over]).toBe(1)
    carry(town, 'pegA', { x: 420, y: 600 })
    run(town, 0.4)
    expect(gateOf(town, crossing)[over]).toBe(1)
  })

  it('through a long, random play no arm is ever down on a toy', () => {
    let down = 0
    for (const seed of [3, 5, 8]) {
      const town = townWith([road(), rail()], { train: far, ...aside })
      for (const id of TOY_IDS) if (id !== 'train') town.bodies[id].doing = { is: 'stand', as: 'plain', since: 0 }
      nudge(town)
      storm(town, seed, 40, () => {
        for (const gate of town.gates) {
          const crossing = town.crossings.find((one) => one.low === gate.low && one.high === gate.high)
          if (crossing) armsOf(crossing).forEach((arm, k) => { if (gate.down[k] >= 1 && armRoom(town, arm) < 0) down++ })
        }
      }, false)
    }
    expect(down).toBe(0)
  })

  it('are never saved: a town put away with its gates shut and the train not yet on the road is found with every gate open, and they shut again at the next hoot', () => {
    const town = townWith([road(), rail()], { train: far, ...aside })
    nudge(town)
    until(town, 'hoot')
    run(town, 0.4)
    expect(JSON.stringify(town.saved())).not.toContain('gate')
    const found = loaded(town)
    expect(found.gates).toEqual([])
    town.rest()
    expect(town.gates).toEqual([])
    // The train hoots again in its first step, heard or not, and the gates are shut before it is on the road.
    for (const one of [found, town]) { run(one, 2 * DT); expect(gateShut(one, crossingOf(one))).toBe(true) }
  })

  it('a train lifted off its rail lets the gates open', () => {
    const town = townWith([road(), rail()], { train: far, ...aside })
    nudge(town)
    const crossing = crossingOf(town)
    until(town, 'hoot')
    run(town, 0.4)
    carry(town, 'train', { x: 400, y: 600 })
    run(town, 0.5)
    expect(gateShut(town, crossing)).toBe(false)
    expect(gateOf(town, crossing)).toEqual([0, 0])
  })
})

describe('a town at play round a level crossing', () => {
  /** The toys as the box tips them out, a rail, a road down over it and another road that runs into that one: the car, the bus, the dog and the pegs all come to the crossing. */
  const play = (trainAt: number): Town => {
    const town = townWith([strip(3, 440, 420, 960, 420), strip(0, 840, 120, 840, 600), strip(0, 352, 196, 840, 200)], { ...OUT_PLACE })
    nudge(town)
    carry(town, 'train', { x: trainAt, y: 420 })
    return town
  }

  it('nobody stops on the rails: a car with somebody in its way beyond the crossing waits at the arm, and drives onto the crossing only when it can drive off it', () => {
    let longest = 0, waited = 0
    for (const trainAt of [500, 820]) {
      const town = play(trainAt), car = town.bodies.car
      let still = 0, was = { ...car.at }
      run(town, 40, [], () => {
        const moved = Math.hypot(car.at.x - was.x, car.at.y - was.y) > 0.01
        was = { ...car.at }
        // Any of it on the rails: within half the train's width and half its own length of their middle.
        const onRails = car.doing.is === 'ride' && Math.abs(car.at.x - 840) < 1 && Math.abs(car.at.y - 420) < TOY_SIZE.train.wide / 2 + TOY_SIZE.car.long / 2
        still = !moved && onRails ? still + 1 : 0
        longest = Math.max(longest, still)
        // Waiting at the arm with the gates open: it has looked across.
        if (!moved && car.doing.is === 'ride' && town.gates.length === 0 && Math.abs(Math.abs(car.at.y - 420) - stopShort(crossingOf(town), 'car')) < 14) waited++
      })
    }
    // A frame or two as it turns onto the road at most; never a wait.
    expect(longest).toBeLessThan(6)
    expect(waited).toBeGreaterThan(30)
  })

  it('in the town as it opens, with a rail and a road laid and the train set down, the car never turns round on the rails and the train is never kept standing by it', () => {
    const town = new Town(freshTown(null), 1)
    run(town, 1.5)
    town.press(ROLLS[3]); town.lift(); run(town, 0.2)
    drag(town, { x: 440, y: 420 }, { x: 960, y: 420 }); run(town, 0.7)
    town.press(ROLLS[0]); town.lift(); run(town, 0.2)
    drag(town, { x: 840, y: 120 }, { x: 840, y: 600 }); run(town, 0.7)
    carry(town, 'train', { x: 500, y: 420 })
    const car = town.bodies.car, log: Heard[] = []
    let turns = 0, kept = 0, longest = 0, least = Infinity
    run(town, 40, log, () => {
      // On the road that crosses the rails, with any of it over them as it drives: it turns round at the end of that road, a little further on, and never here.
      const onRails = Math.abs(car.at.x - 840) < 1 && Math.abs(car.at.y - 420) < TOY_SIZE.train.wide / 2 + TOY_SIZE.car.long / 2
      if (onRails && car.doing.is === 'act') turns++
      kept = town.waiting.get('train')?.has('car') ? kept + 1 : 0
      longest = Math.max(longest, kept)
      least = Math.min(least, leastRoom(town).room)
    })
    expect(turns).toBe(0)
    // While the car turns round at the end of its road, close by, and no longer.
    expect(longest).toBeLessThan(120)
    // The train goes on running through it all.
    expect(log.filter((one) => one.name === 'clatter').length).toBeGreaterThanOrEqual(6)
    expect(least).toBeGreaterThanOrEqual(0)
  })

  it('no toy toots on and on at one that is crossing its way: a second toot of its own comes no sooner than a second after the first', () => {
    const toots = new Map(Object.entries(TOOT).map(([id, sound]) => [sound.name, id]))
    let soonest = Infinity, heard = 0
    for (const trainAt of [500, 820]) {
      const town = play(trainAt), last = new Map<string, number>()
      const log: Heard[] = []
      run(town, 40, log)
      for (const one of log) {
        if (!toots.has(one.name)) continue
        heard++
        const before = last.get(one.name)
        if (before !== undefined) soonest = Math.min(soonest, one.frame - before)
        last.set(one.name, one.frame)
      }
    }
    expect(heard).toBeGreaterThan(0)
    expect(soonest).toBeGreaterThanOrEqual(60)
  })
})

describe('the dog at the level crossing', () => {
  it('sits and howls along with the hoot, then watches the train by, its nose turning after it, and only then goes about its business', () => {
    const town = townWith([early(), rail()], { train: start, dog: { x: 360, y: 220, a: 0 } })
    town.bodies.dog.doing = { is: 'stand', as: 'plain', since: 0 }
    nudge(town)
    const log: Heard[] = []
    until(town, 'hoot')
    expect(town.bodies.dog.doing).toMatchObject({ is: 'act', name: 'howl' })
    run(town, 2.2, log)
    expect(log.map((one) => one.name)).toContain('howl')
    expect(town.bodies.dog.doing).toMatchObject({ is: 'act', name: 'watch' })
    const facing = (): number => {
      const dog = town.bodies.dog.at, train = town.bodies.train.at, way = Math.atan2(train.y - dog.y, train.x - dog.x) - dog.a
      return Math.abs(Math.atan2(Math.sin(way), Math.cos(way)))
    }
    expect(facing()).toBeLessThan(0.1)
    const before = town.bodies.dog.at.a
    run(town, 0.4)
    expect(facing()).toBeLessThan(0.1)
    expect(town.bodies.dog.at.a).not.toBe(before)
    // All this time it has sat where it howled.
    expect(town.bodies.dog.at).toMatchObject({ x: 360, y: 220 })
    // The gates are open and the train is two lengths past: it stops watching.
    run(town, 1.2)
    expect(town.bodies.dog.doing.is).not.toBe('act')
  })
})
