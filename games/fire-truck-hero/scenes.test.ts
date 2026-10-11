import { describe, expect, it } from 'vitest'
import { GATE, SPOTS, TRUCK, YARD_PITCH } from './layout'
import { Scene, sceneLength, type Beat } from './scene'
import { CHANNELS, GATE_FRONT_Z, driveScene, ease, endedChannels, endingOf, laneClearance, onTheWay, restChannels, wormScene, type Channel, type Channels, type Directions, type Mark } from './scenes'
import { KINDS, THINGS, WANTING, type Kind } from './things'

const FRAME = 1 / 60

/** Directions that keep what they are told: the channels as they stand, every value each was given, and every mark in order. */
function spy() {
  const channels = restChannels()
  const values: Partial<Record<Channel, number[]>> = {}
  const marks: { mark: Mark; n?: number }[] = []
  const directions: Directions = {
    set(channel, value) {
      channels[channel] = value
      ;(values[channel] ??= []).push(value)
    },
    mark(mark, n) {
      marks.push(n === undefined ? { mark } : { mark, n })
    },
  }
  return { channels, values, marks, directions, moved: () => Object.keys(values) as Channel[] }
}

/** Plays a scene in frames of 1/60 s from its start. It stops at `until` seconds, or when the scene is over. */
function play(scene: Scene, until = Infinity, each?: (now: number) => void): number {
  scene.start(0, () => {})
  let frame = 0
  while (scene.running && (frame + 1) * FRAME <= until && frame < 60 * 30) {
    frame++
    scene.update(frame * FRAME)
    each?.(frame * FRAME)
  }
  return frame * FRAME
}

type Maker = (directions: Directions) => Beat[]

const ENDINGS: readonly Kind[] = ['fire', 'pool', 'seed', 'patch']
const SCENES: Record<string, Maker> = {
  ...Object.fromEntries(ENDINGS.map((kind) => [`the ending of the ${kind}`, (directions: Directions) => endingOf(kind, directions)])),
  'the worm': wormScene,
  'driving on': driveScene,
}

/** Marks as plain words, so that two lists can be compared whatever their order. */
const named = (marks: { mark: Mark; n?: number }[]) => marks.map(({ mark, n }) => (n === undefined ? mark : `${mark} ${n}`))

describe('how long the scenes are', () => {
  it.each(ENDINGS)('the ending of the %s lasts between four and ten seconds', (kind) => {
    const length = sceneLength(endingOf(kind, spy().directions))
    expect(length).toBeGreaterThanOrEqual(4)
    expect(length).toBeLessThanOrEqual(10)
  })

  it('driving on lasts between four and five seconds, and the worm about four', () => {
    const drive = sceneLength(driveScene(spy().directions))
    expect(drive).toBeGreaterThanOrEqual(4)
    expect(drive).toBeLessThanOrEqual(5)
    expect(sceneLength(wormScene(spy().directions))).toBeCloseTo(4, 0)
  })

  it('every scene plays out in the time it says, and is then over', () => {
    for (const [name, make] of Object.entries(SCENES)) {
      const scene = new Scene(make(spy().directions))
      const over = play(scene)
      expect(scene.running, name).toBe(false)
      expect(over, name).toBeGreaterThanOrEqual(sceneLength(make(spy().directions)) - 1e-9)
      expect(over, name).toBeLessThan(sceneLength(make(spy().directions)) + 2 * FRAME)
    }
  })
})

describe('an ending', () => {
  it('belongs to each kind of thing that can hold the want, and to no other', () => {
    expect([...WANTING].sort()).toEqual([...ENDINGS].sort())
    for (const kind of KINDS) {
      const beats = endingOf(kind, spy().directions)
      if (THINGS[kind].with === null) {
        expect(beats, kind).toEqual([])
        expect(endedChannels(kind), kind).toEqual([])
      } else {
        expect(beats.length, kind).toBeGreaterThan(2)
      }
    }
  })

  it.each(ENDINGS)('of the %s takes every channel it moves from 0 to exactly 1, and never outside', (kind) => {
    const told = spy()
    play(new Scene(endingOf(kind, told.directions)))
    expect(told.moved().length).toBeGreaterThanOrEqual(2)
    for (const channel of told.moved()) {
      const values = told.values[channel]!
      expect(told.channels[channel], channel).toBe(1)
      expect(Math.min(...values), channel).toBeGreaterThanOrEqual(0)
      expect(Math.max(...values), channel).toBeLessThanOrEqual(1)
      // It starts low and only climbs: nothing in an ending goes back.
      expect(values[0], channel).toBeLessThan(0.2)
      for (let i = 1; i < values.length; i++) expect(values[i], channel).toBeGreaterThanOrEqual(values[i - 1])
    }
    // A channel the ending does not move is left alone.
    for (const channel of CHANNELS.filter((each) => !told.moved().includes(each))) expect(told.channels[channel], channel).toBe(0)
  })

  it.each(ENDINGS)('of the %s names exactly the channels it moves, for a yard that is found already ended', (kind) => {
    const told = spy()
    play(new Scene(endingOf(kind, told.directions)))
    expect([...endedChannels(kind)].sort()).toEqual([...told.moved()].sort())
    expect(new Set(endedChannels(kind)).size).toBe(endedChannels(kind).length)
  })

  it('moves channels of its own: no two endings share one, and none touches the way on or the worm', () => {
    const seen = new Map<Channel, Kind>()
    for (const kind of ENDINGS) {
      for (const channel of endedChannels(kind)) {
        expect(seen.get(channel), channel).toBeUndefined()
        seen.set(channel, kind)
      }
    }
    for (const make of [driveScene, wormScene]) {
      const told = spy()
      play(new Scene(make(told.directions)))
      for (const channel of told.moved()) expect(seen.has(channel), channel).toBe(false)
    }
  })

  it('opens the flower petal by petal: five petals, one after another', () => {
    const told = spy()
    const times: number[] = []
    let counted = 0
    play(new Scene(endingOf('seed', told.directions)), Infinity, (now) => {
      const petals = told.marks.filter(({ mark }) => mark === 'petal').length
      for (; counted < petals; counted++) times.push(now)
    })
    expect(told.marks.filter(({ mark }) => mark === 'petal')).toEqual([0, 1, 2, 3, 4].map((n) => ({ mark: 'petal', n })))
    for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeGreaterThan(0.2)
    // The bee lands when the last petal is open, and not before.
    const order = named(told.marks)
    expect(order.indexOf('bee-lands')).toBeGreaterThan(order.indexOf('petal 4'))
  })
})

describe('a touch in the middle of a scene', () => {
  const MOMENTS = [0, 0.05, 0.4, 0.9, 1.5, 2.2, 3.1, 4.2, 5.5, 6.5]

  it.each(Object.keys(SCENES))('%s: lands every channel at 1 and loses no mark, and none comes twice', (name) => {
    const whole = spy()
    play(new Scene(SCENES[name](whole.directions)))
    expect(whole.marks.length).toBeGreaterThanOrEqual(2)
    for (const moment of MOMENTS) {
      const told = spy()
      const scene = new Scene(SCENES[name](told.directions))
      play(scene, moment)
      const before = told.marks.length
      scene.finish()
      expect(scene.running).toBe(false)
      for (const channel of whole.moved()) expect(told.channels[channel], `${channel} after a touch at ${moment}`).toBe(1)
      expect(named(told.marks).sort(), `touched at ${moment}`).toEqual(named(whole.marks).sort())
      // What had come before the touch came as it does in a scene left alone, and a second touch brings nothing.
      expect(named(told.marks.slice(0, before))).toEqual(named(whole.marks.slice(0, before)))
      scene.finish()
      scene.update(100)
      expect(told.marks.length).toBe(whole.marks.length)
    }
  })

  it('at the very start still gives every mark once', () => {
    for (const [name, make] of Object.entries(SCENES)) {
      const whole = spy(), told = spy()
      play(new Scene(make(whole.directions)))
      const scene = new Scene(make(told.directions))
      scene.start(0, () => {})
      scene.finish()
      expect(named(told.marks).sort(), name).toEqual(named(whole.marks).sort())
    }
  })
})

describe('driving on', () => {
  it('arrives exactly once, last of all, when it is played out', () => {
    const told = spy()
    play(new Scene(driveScene(told.directions)))
    expect(told.marks.filter(({ mark }) => mark === 'arrived')).toHaveLength(1)
    expect(told.marks.at(-1)).toEqual({ mark: 'arrived' })
    expect(told.marks[0]).toEqual({ mark: 'gate-swings' })
  })

  it('arrives exactly once, last of all, when a touch ends it at any moment', () => {
    for (let moment = 0; moment <= 4.5; moment += 0.25) {
      const told = spy()
      const scene = new Scene(driveScene(told.directions))
      play(scene, moment)
      scene.finish()
      expect(told.marks.filter(({ mark }) => mark === 'arrived'), `touched at ${moment}`).toHaveLength(1)
      expect(told.marks.at(-1), `touched at ${moment}`).toEqual({ mark: 'arrived' })
    }
  })

  it('putts along the way, each putt once and in order', () => {
    const told = spy()
    play(new Scene(driveScene(told.directions)))
    const putts = told.marks.filter(({ mark }) => mark === 'putt').map(({ n }) => n)
    expect(putts.length).toBeGreaterThanOrEqual(4)
    expect(putts).toEqual(putts.map((_, index) => index))
  })
})

describe('the truck on its way to the next yard', () => {
  const withAll = (value: number): Channels => Object.fromEntries(CHANNELS.map((channel) => [channel, value])) as Channels

  it('stands in its place, not turned, before the scene', () => {
    const way = onTheWay(restChannels())
    expect(way.at).toEqual(TRUCK)
    expect(way.turned).toBe(0)
    expect(way.slid).toBe(0)
    expect(way.rolled).toBe(0)
  })

  it('has rolled up to the front of the gate, turned to it, before the yard slides', () => {
    const way = onTheWay({ ...restChannels(), gate: 1, turnOut: 1, roll: 1 })
    expect(way.at.z).toBeCloseTo(GATE_FRONT_Z, 9)
    expect(way.at.x).toBe(TRUCK.x)
    expect(way.turned).toBe(1)
    expect(way.slid).toBe(0)
    // It stops short of the gate, on the sand.
    expect(GATE_FRONT_Z).toBeGreaterThan(GATE.z)
    expect(GATE_FRONT_Z).toBeLessThan(TRUCK.z)
  })

  it('stands in its place again, not turned, when the scene is over, and the yard has slid exactly one pitch', () => {
    const way = onTheWay(withAll(1))
    expect(way.at.x).toBe(TRUCK.x)
    expect(way.at.z).toBeCloseTo(TRUCK.z, 9)
    expect(way.turned).toBe(0)
    expect(way.slid).toBe(YARD_PITCH)
  })

  it('keeps to its lane the whole way: it never moves sideways, its wheels only roll on, and the yard only slides away', () => {
    const told = spy()
    let before = onTheWay(told.channels), mostTurned = 0, furthestUp = TRUCK.z
    play(new Scene(driveScene(told.directions)), Infinity, () => {
      const way = onTheWay(told.channels)
      expect(way.at.x).toBe(TRUCK.x)
      expect(way.rolled).toBeGreaterThanOrEqual(before.rolled)
      expect(way.slid).toBeGreaterThanOrEqual(before.slid)
      expect(way.turned).toBeGreaterThanOrEqual(0)
      expect(way.turned).toBeLessThanOrEqual(1)
      // It never drives past the front of the gate, nor back behind its place.
      expect(way.at.z).toBeGreaterThanOrEqual(GATE_FRONT_Z - 1e-9)
      expect(way.at.z).toBeLessThanOrEqual(TRUCK.z + 1e-9)
      mostTurned = Math.max(mostTurned, way.turned)
      furthestUp = Math.min(furthestUp, way.at.z)
      before = way
    })
    expect(mostTurned).toBe(1)
    expect(furthestUp).toBeLessThan(GATE_FRONT_Z + 0.5)
    expect(before.rolled).toBeGreaterThan(YARD_PITCH)
    expect(before.at.z).toBeCloseTo(TRUCK.z, 9)
    expect(before.turned).toBe(0)
    expect(before.slid).toBe(YARD_PITCH)
  })

  it('is in its place in the new yard when a touch ends the drive at any moment', () => {
    for (const moment of [0, 0.3, 1, 2, 3, 4]) {
      const told = spy()
      const scene = new Scene(driveScene(told.directions))
      play(scene, moment)
      scene.finish()
      const way = onTheWay(told.channels)
      expect(way.at.z, `touched at ${moment}`).toBeCloseTo(TRUCK.z, 9)
      expect(way.turned).toBe(0)
      expect(way.slid).toBe(YARD_PITCH)
    }
  })

  it('crosses no spot: its lane is well clear of every place a thing can stand', () => {
    expect(laneClearance()).toBeGreaterThan(2.8)
    for (const spot of SPOTS) expect(Math.abs(spot.x - GATE.x)).toBeGreaterThanOrEqual(laneClearance())
    expect(GATE.x).toBe(TRUCK.x)
  })
})

describe('easing', () => {
  it('goes from 0 to 1, never back, gently at both ends, and stays put outside', () => {
    expect(ease(0)).toBe(0)
    expect(ease(1)).toBe(1)
    expect(ease(0.5)).toBeCloseTo(0.5, 9)
    expect(ease(-2)).toBe(0)
    expect(ease(3)).toBe(1)
    for (let step = 0; step < 100; step++) expect(ease((step + 1) / 100)).toBeGreaterThanOrEqual(ease(step / 100))
    // Gentle at the start and at the landing: it moves less there than in the middle.
    expect(ease(0.1)).toBeLessThan(0.05)
    expect(1 - ease(0.9)).toBeLessThan(0.05)
  })
})

describe('the channels at rest', () => {
  it('are all at 0, one for every channel, and a fresh set each time', () => {
    const rest = restChannels()
    expect(Object.keys(rest).sort()).toEqual([...CHANNELS].sort())
    expect(new Set(CHANNELS).size).toBe(CHANNELS.length)
    for (const channel of CHANNELS) expect(rest[channel]).toBe(0)
    rest.lap = 1
    expect(restChannels().lap).toBe(0)
  })
})
