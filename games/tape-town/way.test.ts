import { describe, expect, it } from 'vitest'
import { DT, carry, drag, leastRoom, names, nudge, run, storm, strip, townWith, type Heard } from './bench'
import { offTape, onFloor, stripUnder } from './floor'
import { WANT, type Mover } from './habits'
import { ROLLS, STARTER, TOY_IDS, TOY_SIZE } from './layout'
import type { PegId } from './save'
import { Town } from './town'
import { HOP_REACH } from './way'

// Nothing passes through anything, a hop out of the way is short, and the
// game never stands a toy on tape that is not its own want.

const road = strip(0, 330, 300, 900, 300)

describe('a toy in the way', () => {
  it('steps to the nearest free floor beside the road: a short hop, never a leap, and off every tape', () => {
    const town = townWith([road], { car: { x: 420, y: 300, a: 0 }, pegB: { x: 640, y: 300, a: 0 } })
    nudge(town)
    const heard = names(run(town, 2))
    expect(heard).toContain('hop-peg-b')
    expect(heard).toContain('land-peg-b')
    const at = town.bodies.pegB.at
    expect(Math.hypot(at.x - 640, at.y - 300)).toBeLessThanOrEqual(HOP_REACH)
    expect(Math.hypot(at.x - 640, at.y - 300)).toBeGreaterThan(40)
    expect(offTape(road, at, TOY_SIZE.pegB)).toBeGreaterThanOrEqual(4)
    expect(town.bodies.car.at.x).toBeGreaterThan(640)
  })

  it('keeps the child arrangement: toys that are not in the way do not move', () => {
    const town = townWith([road], { car: { x: 420, y: 300, a: 0 }, pegB: { x: 640, y: 300, a: 0 } })
    const before = TOY_IDS.filter((id) => id !== 'car' && id !== 'pegB').map((id) => ({ ...town.bodies[id].at }))
    nudge(town)
    run(town, 4)
    expect(TOY_IDS.filter((id) => id !== 'car' && id !== 'pegB').map((id) => ({ ...town.bodies[id].at }))).toEqual(before)
  })

  // Tape on every side of the road for further than a hop reaches: the peg has nowhere to go.
  const crowd = () => [road, ...[-217, -155, -93, 93, 155, 217].map((dy) => strip(1, 330, 300 + dy, 900, 300 + dy))]
  const toots = (heard: string[]): number => heard.filter((name) => name === 'toot-car').length

  it('on a crowded floor with no free floor near, the car waits and toots once and the toy shuffles; then the car turns back', () => {
    const town = townWith(crowd(), { car: { x: 420, y: 300, a: 0 }, pegB: { x: 640, y: 300, a: 0 } })
    nudge(town)
    let least = Infinity, shuffled = false
    const heard = names(run(town, 5, [], () => { least = Math.min(least, leastRoom(town).room); shuffled = shuffled || town.time - town.bodies.pegB.landedAt < 0.1 }))
    expect(toots(heard)).toBe(1)
    expect(heard.filter((name) => name === 'scuff').length).toBe(1)
    expect(shuffled).toBe(true)
    expect(town.bodies.pegB.at).toEqual({ x: 640, y: 300, a: 0 })
    expect(least).toBeGreaterThan(0)
    expect(heard).toContain('squeak-back')
    expect(town.bodies.car.at.x).toBeLessThan(560)
  })

  it('a full floor is a calm one: stopped again by the same toy in the same place, the car says nothing, waits long and tries again, however long it goes on', () => {
    const town = townWith(crowd(), { car: { x: 420, y: 300, a: 0 }, pegB: { x: 640, y: 300, a: 0 } })
    nudge(town)
    let stops = 0, was = false, least = Infinity
    const heard = names(run(town, 90, [], () => {
      const waits = town.waiting.has('car')
      if (waits && !was) stops++
      was = waits
      least = Math.min(least, leastRoom(town).room)
    }))
    // It came back to the peg several times and tooted the once.
    expect(stops).toBeGreaterThanOrEqual(3)
    expect(toots(heard)).toBe(1)
    expect(heard.filter((name) => name === 'scuff').length).toBe(1)
    expect(least).toBeGreaterThan(0)
  })

  it('a mover has one toot at a time: stopped within a second of its last toot, it says nothing more, and the toy in its way shuffles all the same', () => {
    const town = townWith(crowd(), { car: { x: 420, y: 300, a: 0 }, pegB: { x: 640, y: 300, a: 0 } })
    nudge(town)
    const car = town.bodies.car, log: Heard[] = []
    // It tooted at something else half a second before it gets to the peg.
    for (let k = 0; k < 600 && !town.waiting.has('car'); k++) { if (car.doing.is === 'ride') car.doing.tootAt = town.time - 0.5; run(town, DT, log) }
    expect(town.waiting.has('car')).toBe(true)
    run(town, 0.3, log)
    expect(toots(names(log))).toBe(0)
    expect(names(log).filter((name) => name === 'scuff').length).toBe(1)
  })

  it('it toots again when something there has changed: the toy in its way stands somewhere else, the child taps the car or the toy in its way, or a strip is laid', () => {
    const changes: [string, (town: Town) => void][] = [
      ['moved', (town) => carry(town, 'pegB', { x: 700, y: 300 })],
      ['tapped', (town) => { const at = town.bodies.car.at; town.press({ x: at.x, y: at.y }); town.lift() }],
      ['the toy in its way tapped', (town) => { const at = town.bodies.pegB.at; town.press({ x: at.x, y: at.y }); town.lift() }],
      // A hedge, far from the road: a new road would call the car away.
      ['laid', (town) => { town.press(ROLLS[2]); town.lift(); drag(town, { x: 400, y: 600 }, { x: 800, y: 600 }, 4) }],
    ]
    for (const [what, change] of changes) {
      const town = townWith(crowd(), { car: { x: 420, y: 300, a: 0 }, pegB: { x: 640, y: 300, a: 0 } })
      nudge(town)
      expect(toots(names(run(town, 5))), what).toBe(1)
      change(town)
      town.takeSounds()
      expect(toots(names(run(town, 30))), what).toBe(1)
    }
  })

  it('boxed in between two hedges, a car honks at each and then waits there quietly: it does not honk on and on', () => {
    const town = townWith([road, strip(2, 480, 200, 480, 400), strip(2, 760, 200, 760, 400)], { car: { x: 620, y: 300, a: 0 } })
    nudge(town)
    const first = names(run(town, 12)).filter((name) => name === 'honk').length
    expect(first).toBeGreaterThanOrEqual(3)
    expect(first).toBeLessThanOrEqual(6)
    expect(names(run(town, 60)).filter((name) => name === 'honk')).toEqual([])
    // A tap, and it honks again at the next hedge it comes to.
    const at = town.bodies.car.at
    town.press({ x: at.x, y: at.y })
    town.lift()
    expect(names(run(town, 20)).filter((name) => name === 'honk').length).toBeGreaterThanOrEqual(3)
  })

  it('on a road it can travel, a car honks at the hedge across it every time it comes to it', () => {
    const town = townWith([road, strip(2, 800, 200, 800, 400)], { car: { x: 420, y: 300, a: 0 } })
    nudge(town)
    const honks = names(run(town, 30)).filter((name) => name === 'honk').length
    expect(honks).toBeGreaterThanOrEqual(6)
    expect(honks % 3).toBe(0)
  })

  it('the dog, with no room to hop, does not stand in the road for ever: it whines, trots off to free floor further away, and the car goes by', () => {
    // Free floor lies below the last river, further off than a hop reaches.
    const crowd = [road, ...[-217, -155, -93, 93].map((dy) => strip(1, 330, 300 + dy, 900, 300 + dy))]
    const town = townWith(crowd, { car: { x: 420, y: 300, a: 0 }, dog: { x: 640, y: 300, a: 0.2 } })
    town.bodies.dog.doing = { is: 'stand', as: 'plain', since: 0 }
    nudge(town)
    let least = Infinity, furthest = 0
    const heard = names(run(town, 6, [], () => { least = Math.min(least, leastRoom(town).room); furthest = Math.max(furthest, town.bodies.car.at.x) }))
    expect(heard).toContain('whine')
    expect(least).toBeGreaterThan(0)
    expect(furthest).toBeGreaterThan(700)
  })
})

describe('two who are in each other\'s way', () => {
  // A river hardly longer than the bus, a road over it, and the duck at the river's end with nowhere to go.
  const pond = () => [strip(0, 450, 262, 910, 338), strip(1, 560, 120, 600, 470)]
  const longestStill = (town: ReturnType<typeof townWith>, id: 'bus' | 'duck', seconds: number): number => {
    let longest = 0, still = 0, was = { ...town.bodies[id].at }
    run(town, seconds, [], () => {
      const at = town.bodies[id].at
      still = at.x === was.x && at.y === was.y && at.a === was.a ? still + 1 : 0
      longest = Math.max(longest, still)
      was = { ...at }
    })
    return longest / 60
  }

  it('the bus that sails down on a duck at the end of a short river does not wait there for ever: it gives way itself, and neither stands still for long', () => {
    for (const at of [{ x: 566, y: 170 }, { x: 590, y: 380 }]) {
      const town = townWith(pond(), { bus: { x: 366, y: 612, a: 0 }, duck: { x: 590, y: 420, a: Math.PI / 2 } })
      nudge(town)
      carry(town, 'bus', at)
      expect(longestStill(town, 'bus', 40)).toBeLessThan(12)
      const again = townWith(pond(), { bus: { x: 366, y: 612, a: 0 }, duck: { x: 590, y: 420, a: Math.PI / 2 } })
      nudge(again)
      carry(again, 'bus', at)
      expect(longestStill(again, 'duck', 40)).toBeLessThan(12)
    }
  })

  it('a bus on its way to the road that waits for a duck turning and turning at the river\'s end stops waiting and parks', () => {
    const town = townWith([...pond(), strip(2, 490, 185, 655, 185)], { bus: { x: 388, y: 166, a: 0.2 }, duck: { x: 590, y: 420, a: Math.PI / 2 } })
    nudge(town)
    let walking = 0
    run(town, 40, [], () => { if (town.bodies.bus.doing.is === 'walk' && town.waiting.has('bus')) walking++; else walking = 0; expect(walking / 60).toBeLessThan(12) })
  })

  it('behind somebody going the same way it queues for as long as it takes, and the one in front does not take the one behind for a reason to wait', () => {
    const town = townWith([road], { duck: { x: 560, y: 300, a: 0 }, car: { x: 420, y: 300, a: 0 } })
    nudge(town)
    let backed = false
    run(town, 5, [], () => { const car = town.bodies.car.doing; if (car.is === 'ride' && car.back) backed = true; expect(town.waiting.has('duck')).toBe(false) })
    expect(backed).toBe(false)
    expect(town.bodies.duck.at.x).toBeGreaterThan(town.bodies.car.at.x)
  })
})

describe('a mover that stands against a toy', () => {
  it('is not held there for ever: it may always leave, backs away from the one it would otherwise stand against, and drives on', () => {
    // The first road with a rail down across it; the train is stood beside the crossing, against the car as it comes.
    const first = strip(0, STARTER.ax, STARTER.ay, STARTER.bx, STARTER.by), slope = Math.atan2(first.by - first.ay, first.bx - first.ax)
    const town = townWith([first, strip(3, 625, 130, 625, 560)], { car: { x: 720, y: first.ay + Math.tan(slope) * (720 - first.ax), a: slope + Math.PI }, train: { x: 860, y: 540, a: 0 } })
    nudge(town)
    // The train is one the child stood on the floor: no rail has called it.
    town.bodies.train.onto = null
    const car = town.bodies.car
    for (let k = 0; k < 600; k++) { run(town, DT); if (car.doing.is === 'ride' && car.doing.rider.dir === -1 && car.at.x < 694 && car.at.x > 686) break }
    expect(Math.abs(car.at.x - 690)).toBeLessThan(4)
    town.bodies.train.at = { x: 560, y: 372, a: 0 }
    town.bodies.train.doing = { is: 'stand', as: 'plain', since: town.time }
    // The car has sent it off twice already, so it stays where it is put.
    town.bodies.train.hopped.car = 2
    expect(leastRoom(town).room).toBeLessThan(0)
    const from = { ...car.at }
    let furthest = 0, least = Infinity
    const log = run(town, 6, [], () => { furthest = Math.max(furthest, Math.hypot(car.at.x - from.x, car.at.y - from.y)); if (furthest > 60) least = Math.min(least, leastRoom(town).room) })
    expect(furthest).toBeGreaterThan(100)
    expect(least).toBeGreaterThanOrEqual(0)
    // The train has not moved for it, and nobody stands and toots at a toy it is leaving.
    expect(town.bodies.train.at).toMatchObject({ x: 560, y: 372 })
    expect(names(log).filter((name) => name === 'toot-car')).toHaveLength(0)
  })
})

describe('where the game sets a toy down', () => {
  it('tipped out onto a floor with tape under their usual places, the toys land beside the tape and on nobody', () => {
    const town = townWith([strip(0, 300, 196, 760, 166), strip(1, 322, 300, 340, 600), strip(2, 366, 612, 800, 640)])
    town.press({ x: 120, y: 220 })
    town.lift()
    town.press({ x: 120, y: 220 })
    town.lift()
    expect(town.state.out).toBe(true)
    for (const id of TOY_IDS) for (const laid of town.state.strips) expect(offTape(laid, town.bodies[id].at, TOY_SIZE[id]), id).toBeGreaterThanOrEqual(4)
    run(town, 4)
    expect(leastRoom(town).room).toBeGreaterThan(0)
  })

  it('a peg that gets off the bus stands on bare floor beside the road', () => {
    const town = townWith([road], { bus: { x: 420, y: 300, a: 0 }, pegA: { x: 560, y: 400, a: 0 }, pegB: { x: 780, y: 400, a: 0 } })
    nudge(town)
    town.served.clear()
    run(town, 9)
    for (const peg of ['pegA', 'pegB'] as const) if (!town.state.riding[peg]) expect(offTape(road, town.bodies[peg].at, TOY_SIZE[peg])).toBeGreaterThanOrEqual(4)
    expect(town.state.riding.pegA || town.state.riding.pegB).toBe(true)
  })
})

describe('the intersection audit of the model', () => {
  it('through a long, random play nothing overlaps anything, and no toy the game sets down lands on tape', () => {
    const worst: { room: number; pair: string; seed: number; at: number }[] = []
    let onTape = 0, offFloor = 0, brushes = 0, leaps = 0
    const seen = new WeakSet<object>(), notes: string[] = []
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const town = townWith([road])
      for (const id of TOY_IDS) town.bodies[id].doing = { is: 'stand', as: 'plain', since: 0 }
      nudge(town)
      storm(town, seed, 60, () => {
        const least = leastRoom(town)
        if (!town.state.out) return
        // Allowed, with a cap: a corner that brushes a neighbour by under four units while a toy turns to set off.
        if (least.room < -4) worst.push({ ...least, seed, at: town.time })
        else if (least.room < -1) brushes++
        for (const id of TOY_IDS) {
          const body = town.bodies[id]
          if (town.state.riding[id as PegId] || body.doing.is === 'held') continue
          // A flight the game started ends on bare floor, off every tape.
          if (body.flight && !body.flight.scene && !seen.has(body.flight)) {
            // Judged as the flight starts: a strip the child lays under a toy in the air is the child's doing.
            seen.add(body.flight)
            // The one hop that ends on tape is the rest of a toy's way to its own: that ends on a strip of the tape it wants.
            const leapt = body.flight.then === 'decide' && !body.flight.loud
            const ok = leapt ? town.state.strips.some((laid) => id in WANT && laid.kind === WANT[id as Mover] && stripUnder([laid], body.at) === 0) : town.state.strips.every((laid) => offTape(laid, body.at, TOY_SIZE[id]) >= 4)
            if (leapt) leaps++
            if (!ok) { onTape++; notes.push(`${seed} ${town.time.toFixed(2)} ${id} lands on tape, ${body.flight.off.name}`) }
          }
          if (!body.flight && !onFloor(town.field, town.poseOf(id), { long: TOY_SIZE[id].long - 8, wide: TOY_SIZE[id].wide - 8 }) && body.doing.is === 'stand') { offFloor++; notes.push(`${seed} ${town.time.toFixed(2)} ${id} off the floor ${JSON.stringify(town.poseOf(id))}`) }
        }
      })
    }
    expect(worst.slice(0, 5)).toEqual([])
    expect(notes.slice(0, 4)).toEqual([])
    expect(brushes).toBeLessThanOrEqual(12)
    expect(onTape).toBe(0)
    expect(offFloor).toBe(0)
    // The storm has toys go the rest of their way in one hop, so that is audited too.
    expect(leaps).toBeGreaterThan(8)
  }, 120_000)
})
