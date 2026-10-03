import { describe, expect, it } from 'vitest'
import { bowlOf, dishOf } from './forms'
import { CLOTH, TRAY, placeSpot } from './layout'
import { CARRY_LIFT, HOP_LIFT, POUR, callTo, carryTo, clearOf, flowAfter, liftOf, press, release, restingPot, roomFor, setDown, spoutSpot, stationFor, step, thingUnder, type Pot } from './pour'
import { emptyWorld, puddled, teaOut, thingById, type Thing, type World } from './world'

const thing = (id: string, kind: Thing['kind'], over: Partial<Thing> = {}): Thing => ({ id, kind, size: 'house', ring: null, owner: null, x: 0, z: 0, on: null, heldBy: null, tea: 0, ...over })

/** The toy's table: one cup on its saucer, and the pot standing beside it with its spout over it. */
function toyTable(): { world: World; pot: Pot } {
  const world = emptyWorld()
  const place = placeSpot(1, 0)
  world.things.push(thing('saucer-0', 'saucer', place), thing('cup', 'cup', { ...place, on: 'saucer-0' }))
  const station = stationFor(place)
  const pot = restingPot(station, station.heading)
  pot.over = thingUnder(world, spoutSpot(pot))
  return { world, pot }
}

/** Holds the pot for `seconds` at `fps` frames a second, and returns every event. */
function hold(pot: Pot, world: World, seconds: number, fps = 60) {
  const events = [...press(pot, world)]
  const frames = Math.round(seconds * fps)
  for (let i = 0; i < frames; i++) events.push(...step(pot, world, 1 / fps))
  events.push(...release(pot))
  for (let i = 0; i < fps; i++) events.push(...step(pot, world, 1 / fps))
  return events
}

describe('the pot beside a cup', () => {
  it('stands with its spout over the cup, clear of it, on the cloth', () => {
    const { world, pot } = toyTable()
    expect(pot.over).toBe('cup')
    const cup = thingById(world, 'cup')!
    expect(Math.hypot(spoutSpot(pot).x - cup.x, spoutSpot(pot).z - cup.z)).toBeLessThan(0.02)
    // A pot is one unit across and a house cup 0.6 at the rim: they do not touch.
    expect(Math.hypot(pot.x - cup.x, pot.z - cup.z)).toBeGreaterThan(1.75)
    // It stands to the right and nearer the child, so the hand on it comes from below and covers nothing.
    expect(pot.x).toBeGreaterThan(cup.x + 1)
    expect(pot.z).toBeGreaterThan(cup.z + 0.5)
  })

  it('finds a station on the cloth for a cup anywhere on it', () => {
    for (const x of [CLOTH.minX + 0.8, -3, 0, 3, CLOTH.maxX - 0.8]) {
      for (const z of [CLOTH.minZ + 0.8, 0, CLOTH.maxZ - 0.8]) {
        const station = stationFor({ x, z })
        expect(station.x).toBeGreaterThan(CLOTH.minX)
        expect(station.x).toBeLessThan(CLOTH.maxX)
        expect(station.z).toBeGreaterThan(CLOTH.minZ)
        expect(station.z).toBeLessThan(CLOTH.maxZ)
        expect(station.x + Math.cos(station.heading) * POUR.reach).toBeCloseTo(x, 9)
        expect(station.z + Math.sin(station.heading) * POUR.reach).toBeCloseTo(z, 9)
      }
    }
  })
})

describe('a press on the pot', () => {
  it('is answered in the same step: one drop is in the cup before any time has passed', () => {
    const { world, pot } = toyTable()
    const events = press(pot, world)
    expect(events.map((event) => event.type)).toEqual(['drop'])
    expect(thingById(world, 'cup')!.tea).toBeCloseTo(POUR.drop, 12)
  })

  it('gives exactly one drop for a tap', () => {
    const { world, pot } = toyTable()
    const events = hold(pot, world, 0.05)
    expect(events.filter((event) => event.type === 'stream')).toHaveLength(0)
    expect(events.filter((event) => event.type === 'drop')).toHaveLength(1)
    expect(teaOut(world)).toBeCloseTo(POUR.drop, 12)
  })

  it('fills a house cup in about four seconds, and never faster as the hold goes on', () => {
    const { world, pot } = toyTable()
    press(pot, world)
    let seconds = 0, last = 0, lastFlow = 0
    while (thingById(world, 'cup')!.tea < 1 && seconds < 10) {
      step(pot, world, 1 / 60)
      seconds += 1 / 60
      const tea = thingById(world, 'cup')!.tea
      expect(tea).toBeGreaterThanOrEqual(last)
      expect(pot.flow).toBeGreaterThanOrEqual(lastFlow - 1e-12)
      expect(pot.flow).toBeLessThanOrEqual(POUR.steady + 1e-12)
      last = tea
      lastFlow = pot.flow
    }
    expect(seconds).toBeGreaterThan(3.5)
    expect(seconds).toBeLessThan(4.5)
  })

  it('pours the same tea for the same hold at any frame rate', () => {
    const amounts = [30, 60, 120].map((fps) => {
      const { world, pot } = toyTable()
      hold(pot, world, 2, fps)
      return teaOut(world)
    })
    expect(Math.abs(amounts[0] - amounts[1])).toBeLessThan(0.012)
    expect(Math.abs(amounts[2] - amounts[1])).toBeLessThan(0.012)
  })

  it('starts as a dribble: the first half second gives far less than the next', () => {
    expect(flowAfter(0)).toBe(POUR.dribble)
    expect(flowAfter(POUR.rampSeconds)).toBe(POUR.steady)
    expect(flowAfter(99)).toBe(POUR.steady)
    for (let t = 0; t < 1; t += 0.01) expect(flowAfter(t + 0.01)).toBeGreaterThanOrEqual(flowAfter(t))
  })

  it('stops with the lift, then lets one last drop fall and nothing more', () => {
    const { world, pot } = toyTable()
    const events = hold(pot, world, 1.5)
    const types = events.map((event) => event.type)
    expect(types.filter((type) => type === 'stream-start')).toHaveLength(1)
    expect(types.filter((type) => type === 'stream-stop')).toHaveLength(1)
    expect(types.indexOf('stream-stop')).toBeLessThan(types.lastIndexOf('drop'))
    expect(types.slice(types.indexOf('stream-stop')).filter((type) => type === 'stream')).toHaveLength(0)
    const settled = teaOut(world)
    for (let i = 0; i < 120; i++) step(pot, world, 1 / 60)
    expect(teaOut(world)).toBe(settled)
    expect(pot.tilt).toBe(0)
    expect(pot.flow).toBe(0)
  })

  it('accounts for every drop it reports', () => {
    const { world, pot } = toyTable()
    const events = hold(pot, world, 6)
    const reported = events.reduce((sum, event) => sum + (event.type === 'drop' || event.type === 'stream' ? event.amount : 0), 0)
    expect(teaOut(world)).toBeCloseTo(reported, 9)
  })

  it('runs over the rim into the saucer and then onto the cloth when it is held too long', () => {
    const { world, pot } = toyTable()
    hold(pot, world, 6)
    expect(thingById(world, 'cup')!.tea).toBeCloseTo(1, 9)
    expect(thingById(world, 'saucer-0')!.tea).toBeCloseTo(dishOf('house').holds, 9)
    expect(puddled(world)).toBeGreaterThan(0.1)
  })
})

describe('the pot anywhere else', () => {
  it('pours a puddle on the bare cloth under its spout', () => {
    const { world, pot } = toyTable()
    carryTo(pot, world, { x: -3, z: 2 })
    expect(pot.over).toBe(null)
    hold(pot, world, 1)
    expect(thingById(world, 'cup')!.tea).toBe(0)
    expect(puddled(world)).toBeCloseTo(teaOut(world), 12)
    expect(puddled(world)).toBeGreaterThan(0.1)
  })

  it('pours nothing while it is carried, and stays on the cloth', () => {
    const { world, pot } = toyTable()
    press(pot, world)
    const before = teaOut(world)
    carryTo(pot, world, { x: 99, z: -99 })
    for (let i = 0; i < 30; i++) step(pot, world, 1 / 60)
    expect(teaOut(world)).toBe(before)
    expect(pot.x).toBeLessThan(CLOTH.maxX)
    expect(pot.z).toBeGreaterThan(CLOTH.minZ)
  })

  it('hops to a cup that is tapped and lands with its spout over it', () => {
    const { world, pot } = toyTable()
    carryTo(pot, world, TRAY.pot)
    const cup = thingById(world, 'cup')!
    expect(callTo(pot, cup, 'cup').map((event) => event.type)).toEqual(['hop'])
    let landed = 0, highest = 0
    for (let i = 0; i < 60; i++) {
      landed += step(pot, world, 1 / 60).filter((event) => event.type === 'land').length
      highest = Math.max(highest, liftOf(pot))
    }
    expect(landed).toBe(1)
    expect(highest).toBeGreaterThan(0.5)
    expect(liftOf(pot)).toBe(0)
    expect(pot.over).toBe('cup')
    expect(Math.hypot(spoutSpot(pot).x - cup.x, spoutSpot(pot).z - cup.z)).toBeLessThan(1e-6)
  })

  it('does not pour in the middle of a hop', () => {
    const { world, pot } = toyTable()
    callTo(pot, { x: -2, z: 1 }, null)
    step(pot, world, 0.05)
    expect(press(pot, world)).toEqual([])
    expect(teaOut(world)).toBe(0)
  })

  it('prefers a cup to the saucer under it, and the bare cloth to a spoon', () => {
    const { world } = toyTable()
    world.things.push(thing('spoon-0', 'spoon', { x: 4, z: 2 }))
    expect(thingUnder(world, placeSpot(1, 0))).toBe('cup')
    expect(thingUnder(world, { x: placeSpot(1, 0).x + 0.85, z: placeSpot(1, 0).z })).toBe('saucer-0')
    expect(thingUnder(world, { x: 4, z: 2 })).toBe(null)
  })
})

describe('the pot among other things', () => {
  it('never takes a station in another thing, and still pours on the spot it was called to', () => {
    const { world } = toyTable()
    const cup = thingById(world, 'cup')!
    // Every spot round the cup, as a child tapping the cloth near it would call the pot to.
    for (let a = 0; a < 24; a++) {
      for (const far of [1.2, 2.1, 3.0]) {
        const target = { x: cup.x + Math.cos((a / 24) * Math.PI * 2) * far, z: cup.z + Math.sin((a / 24) * Math.PI * 2) * far }
        const station = stationFor(target, world)
        expect(clearOf(world, station, 1.0), `called to ${target.x.toFixed(2)}, ${target.z.toFixed(2)}`).toBe(true)
        expect(station.x + Math.cos(station.heading) * POUR.reach).toBeCloseTo(target.x, 9)
        expect(station.z + Math.sin(station.heading) * POUR.reach).toBeCloseTo(target.z, 9)
      }
    }
  })

  it('comes down beside whatever it was let go over, never in it', () => {
    const { world, pot } = toyTable()
    const cup = thingById(world, 'cup')!
    for (let a = 0; a < 16; a++) {
      for (const far of [0, 0.4, 0.9, 1.5, 2.2]) {
        carryTo(pot, world, { x: cup.x + Math.cos((a / 16) * Math.PI * 2) * far, z: cup.z + Math.sin((a / 16) * Math.PI * 2) * far })
        expect(liftOf(pot)).toBe(CARRY_LIFT)
        setDown(pot, world)
        for (let i = 0; i < 60; i++) step(pot, world, 1 / 60)
        expect(pot.hop).toBe(null)
        expect(liftOf(pot)).toBe(0)
        expect(clearOf(world, pot, 1.0), `let go ${far} from the cup at angle ${a}`).toBe(true)
      }
    }
  })

  it('clears every cup by a hand while it is carried or at the top of a hop', () => {
    expect(CARRY_LIFT).toBeGreaterThan(bowlOf('house').rimY + 0.035 + 0.3)
    expect(HOP_LIFT).toBeGreaterThan(CARRY_LIFT)
  })

  it('finds room for itself next to a crowd', () => {
    const { world } = toyTable()
    world.things.push(thing('bowl', 'bowl', { x: 2, z: 1 }), thing('saucer-1', 'saucer', { x: 0.6, z: 2.4 }))
    for (let x = -3; x <= 4; x += 0.5) for (let z = -1; z <= 3; z += 0.5) expect(clearOf(world, roomFor(world, { x, z }), 1.0), `${x}, ${z}`).toBe(true)
  })
})
