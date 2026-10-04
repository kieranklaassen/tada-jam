// The promises of the design sheet (ART.md, above "The look") that the game
// was found short of and now keeps, each checked against the rules or against
// the game as it is played. A test's name is the promise.

import { describe, expect, it } from 'vitest'
import { DROPS_PER_GULP, Drops, SPLASH_PER_LANDING } from './drops'
import { FLOWER_COLOURS, PETAL_COUNT, PETAL_SHUT, flowerOf, leafDrop, petalOpen } from './flower'
import { CUP_TIPS_AT, Game, QUACK_AFTER_S, WORM_CLEAR, WORM_CLEAR_OF_SNAIL } from './game'
import { cellOf } from './grid'
import { cellAt, levelAt } from './ground'
import { arcTo } from './jet'
import { NOZZLE, distance, type Place } from './layout'
import { lowSideOf, placeOf, targetAt } from './places'
import { NOSE_ROUND, SOAK_S } from './thingMotion'
import { KINDS, type Kind } from './things'
import { Toy } from './toy'
import type { VoiceSpec } from './voices'
import { CREEP_REACH, SPRAY_REACH, gulpOn, gulpOnGround, type Step, type Yard, type YardEvent } from './world'
import { ARRANGEMENTS, layOut } from './yards'
import { boatScrapes, catPaws, cellVoice, delayed, duckQuack, slowSizzle } from './yardVoices'

const FRAME = 1 / 60

/** A saved game at a place of the order, with every kind already met, so that nothing is shown unless a test asks. */
function saved(place: string, arrangement = 0, more: Record<string, unknown> = {}): unknown {
  return { v: 1, position: place, finished: false, yard: { place, arrangement }, seen: [...KINDS], ...more }
}

type Drop = { x: number; y: number; z: number; brown: boolean }

class Table {
  readonly heard: VoiceSpec[] = []
  readonly game: Game
  now = 0

  constructor(raw: unknown = saved('one-thing'), childAge: number | null = null) {
    this.game = new Game((voice) => this.heard.push(voice), raw, childAge, 7)
  }

  /** Plays frames for `seconds`. */
  play(seconds: number, each?: () => void): this {
    for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
      this.now += FRAME
      this.game.step(FRAME, this.now)
      each?.()
    }
    return this
  }

  /** One tap at a place: the water is in the air. */
  tap(at: Place): this {
    this.game.press({ truck: false, point: at }, this.now)
    this.game.lift()
    return this
  }

  /** One tap at a place, and long enough for the water to land. */
  gulp(at: Place): this {
    return this.tap(at).play(0.5)
  }

  gulps(at: Place, count: number): this {
    for (let i = 0; i < count; i++) this.gulp(at)
    return this
  }

  /** A finger held still at a place for `seconds`, and then long enough for the last of its water to land. */
  stream(at: Place, seconds: number): this {
    this.game.press({ truck: false, point: at }, this.now)
    this.play(seconds)
    this.game.lift()
    return this.play(0.5)
  }

  /** A fast stream drawn from one place to another, and long enough for the last of its water to land. */
  sweep(from: Place, to: Place, frames = 30): this {
    this.game.press({ truck: false, point: from }, this.now)
    for (let frame = 1; frame <= frames; frame++) {
      this.game.move({ x: from.x + ((to.x - from.x) * frame) / frames, z: from.z + ((to.z - from.z) * frame) / frames })
      this.play(FRAME)
    }
    this.game.lift()
    return this.play(0.5)
  }

  /** The thing of the yard at an index: where it is. */
  at(index: number): Place {
    return placeOf(this.game.yard, index)
  }

  /** The index of the thing of a kind. */
  the(kind: Kind): number {
    return this.game.yard.things.findIndex((thing) => thing.kind === kind)
  }

  /** The drops in the air now. */
  drops(): Drop[] {
    const drops: Drop[] = []
    this.game.drops.each((x, y, z, _vx, _vy, _vz, _size, brown) => drops.push({ x, y, z, brown }))
    return drops
  }

  /** What storage would hold now, read back as a game would read it. */
  reload(childAge: number | null = null): Table {
    return new Table(JSON.parse(JSON.stringify(this.game.snapshot())), childAge)
  }
}

// --- Listening ---------------------------------------------------------------

const VARIANTS = [0, 1, 2]

const same = (a: VoiceSpec, b: VoiceSpec) => JSON.stringify(a) === JSON.stringify(b)
/** The voices among `heard` that are one of `voices`. */
const those = (heard: readonly VoiceSpec[], voices: readonly VoiceSpec[]) => heard.filter((voice) => voices.some((one) => same(voice, one)))
/** A cell's sound in each of its variants, at a fullness. */
const cellVoices = (kind: Kind, action: Parameters<typeof cellOf>[1], fullness = 0) => VARIANTS.map((variant) => cellVoice(cellOf(kind, action).voice, fullness, variant))
/** The duck's quack as a splash sets it off, in each of its variants. */
const QUACKS = VARIANTS.map((variant) => delayed(duckQuack(variant), QUACK_AFTER_S))

// --- The rules ---------------------------------------------------------------

type Result = Extract<YardEvent, { type: 'result' }>
type Moved = Extract<YardEvent, { type: 'moved' }>
type Worm = Extract<YardEvent, { type: 'secret'; id: 'worm' }>

const results = (events: readonly YardEvent[]) => events.filter((event): event is Result => event.type === 'result')
const moves = (events: readonly YardEvent[]) => events.filter((event): event is Moved => event.type === 'moved')
const worms = (events: readonly YardEvent[]) => events.filter((event): event is Worm => event.type === 'secret' && event.id === 'worm')
const indexOf = (yard: Yard, kind: Kind) => yard.things.findIndex((thing) => thing.kind === kind)

/** Gulps on one thing, one after another: every step, so a test can read the one it asks about. */
function pours(start: Yard, index: number, count: number): Step[] {
  const steps: Step[] = []
  let yard = start
  for (let i = 0; i < count; i++) {
    const step = gulpOn(yard, index)
    steps.push(step)
    yard = step.yard
  }
  return steps
}

/** Every arrangement of every place, laid out fresh. */
function everyYard(): Yard[] {
  return Object.entries(ARRANGEMENTS).flatMap(([place, plans]) => plans.map((_, number) => layOut(place, number)))
}

describe('the wheel, water from a neighbour', () => {
  it('is turned from below by run-off that passes under it, in the whole garden where it stands on the way, and keeps no water', () => {
    for (const number of [1]) {
      const start = layOut('whole-garden', number)
      const pool = indexOf(start, 'pool'), wheel = indexOf(start, 'wheel')
      expect(start.runsPast).toBe(wheel)
      const steps = pours(start, pool, 5)
      for (const step of steps.slice(0, 4)) expect(results(step.events).some((event) => event.kind === 'wheel')).toBe(false)
      const over = results(steps[4].events)
      const turned = over.findIndex((event) => event.thing === wheel && event.action === 'neighbour' && event.by === 'run-off')
      const reached = over.findIndex((event) => event.thing === start.runsTo && event.action === 'neighbour' && event.by === 'run-off')
      expect(turned).toBeGreaterThanOrEqual(0)
      // The tongue passes the wheel on its way, before it reaches what it runs to.
      expect(reached).toBeGreaterThan(turned)
      expect(steps[4].yard.things[wheel].gulps).toBe(0)
    }
  })

  it('happens in no yard where no wheel stands on the way down', () => {
    for (const start of everyYard()) {
      const pool = indexOf(start, 'pool')
      if (pool < 0 || start.runsPast !== undefined) continue
      for (const step of pours(start, pool, 7)) expect(results(step.events).some((event) => event.kind === 'wheel' && event.by === 'run-off')).toBe(false)
    }
  })

  it('creaks and turns slowly in the game, and the tongue shows on the sand on both sides of it', () => {
    const t = new Table(saved('whole-garden', 1))
    const pool = t.at(t.the('pool')), wheel = t.at(t.the('wheel')), fire = t.at(t.the('fire'))
    t.gulps(pool, 4)
    expect(t.game.motion.wheel.pose.speed).toBe(0)
    const before = t.heard.length
    t.gulp(pool)
    expect(those(t.heard.slice(before), cellVoices('wheel', 'neighbour'))).toHaveLength(1)
    expect(t.game.motion.wheel.pose.speed).toBeGreaterThan(0.3)
    expect(t.game.motion.wheel.pose.speed).toBeLessThan(1.2)
    const half = (a: Place, b: Place) => ({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 })
    expect(t.game.paint.at(half(pool, wheel).x, half(pool, wheel).z).damp).toBeGreaterThan(0)
    expect(t.game.paint.at(half(wheel, fire).x, half(wheel, fire).z).damp).toBeGreaterThan(0)
  })
})

describe('the cat, water from a neighbour', () => {
  it('has run-off creep toward her when she sits near a pool that runs over: she keeps dry and moves over, out of its way', () => {
    for (const number of [0, 1]) {
      const start = layOut('whole-garden', number)
      const pool = indexOf(start, 'pool'), cat = indexOf(start, 'cat')
      expect(distance(placeOf(start, cat), placeOf(start, pool))).toBeLessThanOrEqual(CREEP_REACH)
      const steps = pours(start, pool, 6)
      for (const step of steps.slice(0, 4)) expect(results(step.events).some((event) => event.kind === 'cat')).toBe(false)
      const crept = results(steps[4].events).filter((event) => event.thing === cat)
      expect(crept).toHaveLength(1)
      expect(crept[0].action).toBe('neighbour')
      expect(crept[0].by).toBe('run-off')
      expect(steps[4].yard.things[cat].gulps).toBe(0)
      expect(moves(steps[4].events).filter((event) => event.thing === cat)).toHaveLength(1)
      expect(distance(placeOf(steps[4].yard, cat), placeOf(steps[4].yard, pool))).toBeGreaterThan(CREEP_REACH)
      // Out of its way, the next run-off does not reach her.
      expect(results(steps[5].events).some((event) => event.thing === cat)).toBe(false)
    }
  })

  it('is left alone by run-off when she sits far from the pool, naps in the boat, or sits on the truck', () => {
    const far = layOut('afloat', 1)
    for (const step of pours(far, indexOf(far, 'pool'), 7)) expect(results(step.events).some((event) => event.kind === 'cat' && event.by === 'run-off')).toBe(false)
    const napping = layOut('afloat', 2)
    for (const step of pours(napping, indexOf(napping, 'pool'), 7)) expect(results(step.events).some((event) => event.kind === 'cat' && event.by === 'run-off')).toBe(false)
    const garden = layOut('whole-garden', 1)
    const onTruck: Yard = { ...garden, things: garden.things.map((thing) => (thing.kind === 'cat' ? { ...thing, spot: 'roof' as const } : thing)) }
    for (const step of pours(onTruck, indexOf(onTruck, 'pool'), 7)) expect(results(step.events).some((event) => event.kind === 'cat')).toBe(false)
  })

  it('lifts her paws to the sound of paws, not a sneeze, and then walks off, in the game', () => {
    const t = new Table(saved('whole-garden', 1))
    const pool = t.at(t.the('pool')), cat = t.the('cat')
    const sat = { ...t.at(cat) }
    t.gulps(pool, 4)
    const before = t.heard.length
    let near = 0, far = 0
    t.tap(pool).play(1.4, () => {
      near = Math.max(near, t.game.motion.cat.pose.paw)
      far = Math.max(far, t.game.motion.cat.pose.pawFar)
    })
    expect(those(t.heard.slice(before), [catPaws()])).toHaveLength(1)
    expect(those(t.heard.slice(before), cellVoices('cat', 'neighbour'))).toHaveLength(0)
    expect(near).toBeGreaterThan(0.9)
    expect(far).toBeGreaterThan(0.9)
    t.play(6)
    expect(distance(t.game.motion.cat.pose, sat)).toBeGreaterThan(3)
    expect(distance(t.game.motion.cat.pose, t.at(cat))).toBeLessThan(0.01)
    // The tongue crept toward where she sat, and stopped short of it.
    expect(t.game.paint.at(pool.x + (sat.x - pool.x) * 0.5, pool.z + (sat.z - pool.z) * 0.5).damp).toBeGreaterThan(0)
    expect(t.game.paint.at(sat.x, sat.z).damp).toBe(0)
  })

  it('sneezes at drops flung from the wheel, and lifts no paw', () => {
    const t = new Table(saved('round-and-round', 0))
    let far = 0
    t.stream(t.at(t.the('wheel')), 1.5)
    t.play(0.5, () => { far = Math.max(far, t.game.motion.cat.pose.pawFar) })
    expect(those(t.heard, cellVoices('cat', 'neighbour')).length).toBeGreaterThan(0)
    expect(those(t.heard, [catPaws()])).toHaveLength(0)
    expect(far).toBe(0)
  })
})

describe('the worm', () => {
  it('is sent up by ground brought to mud, whichever way the mud was made, once for each place, and says where', () => {
    // Aimed at open sand.
    let yard = layOut('one-thing', 3)
    const sand = { x: 12.5, z: 8.1 }
    const aimed: YardEvent[] = []
    for (let i = 0; i < 6; i++) {
      const step = gulpOnGround(yard, sand.x, sand.z)
      aimed.push(...step.events)
      yard = step.yard
    }
    expect(worms(aimed)).toHaveLength(1)
    expect(cellAt(worms(aimed)[0].at.x, worms(aimed)[0].at.z)).toBe(cellAt(sand.x, sand.z))
    // The dry patch itself, past its fill.
    const patch = layOut('one-thing', 3)
    const onPatch = pours(patch, 0, 5).flatMap((step) => step.events)
    expect(worms(onPatch)).toHaveLength(1)
    expect(distance(worms(onPatch)[0].at, placeOf(patch, 0))).toBeLessThan(0.01)
    // A pool that runs over with nothing below it.
    const pool = layOut('one-thing', 2)
    const over = pours(pool, 0, 12).flatMap((step) => step.events)
    expect(worms(over)).toHaveLength(1)
    expect(levelAt(pours(pool, 0, 12)[11].yard.ground, worms(over)[0].at.x, worms(over)[0].at.z)).toBe('mud')
  })

  /** Plays until a worm is up or `seconds` have gone, and says where it came up. */
  const wormWithin = (t: Table, seconds: number): Place | null => {
    let up: Place | null = null
    t.play(seconds, () => { if (!up && t.game.wormAt && t.game.channels.wormUp > 0.2) up = { ...t.game.wormAt } })
    return up
  }

  it('comes up out of mud on open sand, where the mud is', () => {
    const t = new Table(saved('one-thing', 3))
    const sand = { x: 12.5, z: 8.1 }
    t.gulps(sand, 3)
    expect(t.game.wormAt).toBeNull()
    t.tap(sand)
    const up = wormWithin(t, 1.5)
    expect(up).not.toBeNull()
    expect(distance(up!, sand)).toBeLessThan(0.01)
  })

  it('comes up in the dry patch when the patch is brought to mud, clear of the snail', () => {
    const t = new Table(saved('one-thing', 3))
    const home = t.at(0)
    t.gulps(home, 3).play(8)
    t.tap(home)
    const up = wormWithin(t, 1.5)
    expect(up).not.toBeNull()
    expect(distance(up!, home)).toBeLessThan(1.05)
    const snail = { x: home.x + t.game.motion.snail.pose.x, z: home.z + t.game.motion.snail.pose.z }
    expect(distance(up!, snail)).toBeGreaterThanOrEqual(WORM_CLEAR_OF_SNAIL)
  })

  it('comes up beside a pool whose overflow made mud, clear of the pool and of the boat that rode out', () => {
    for (const [place, number] of [['one-thing', 2], ['afloat', 0]] as const) {
      const t = new Table(saved(place, number))
      const pool = t.at(t.the('pool'))
      // Aimed at the duck's side, so a boat in the pool gets none of it.
      const aim = { x: pool.x - 0.5, z: pool.z }
      let up: Place | null = null
      for (let i = 0; i < 12 && !up; i++) up = wormWithin(t.tap(aim), 0.6)
      expect(up, `${place} ${number}`).not.toBeNull()
      expect(levelAt(t.game.yard.ground, pool.x, pool.z + 1.5)).toBe('mud')
      expect(distance(up!, { x: pool.x, z: pool.z + 1.5 })).toBeLessThan(2.4)
      t.game.yard.things.forEach((_, index) => expect(distance(up!, t.at(index)), `${place} ${number}`).toBeGreaterThanOrEqual(WORM_CLEAR))
      expect(targetAt(t.game.yard, up!.x, up!.z).on).toBe('ground')
    }
  })

  it('keeps clear of the snail where a touch cut the snail\'s glide short and put it at the end of its way', () => {
    const t = new Table(saved('one-thing', 3))
    const home = t.at(0)
    // A finger held on the patch in a dry yard: the ending starts, the stream goes on into mud, and the snail
    // sets out across its patch.
    t.game.press({ truck: false, point: home }, t.now)
    t.play(1.9)
    t.game.lift()
    expect(t.game.sceneRunning).toBe(true)
    // A tap elsewhere ends the scene: the snail is at the end of its way at once, and the owed worm comes up.
    t.tap({ x: 3.5, z: 8.5 })
    let nearest = Infinity, came = false
    t.play(3, () => {
      if (!t.game.wormAt || t.game.channels.wormUp === 0) return
      came = true
      const snail = { x: home.x + t.game.motion.snail.pose.x, z: home.z + t.game.motion.snail.pose.z }
      nearest = Math.min(nearest, distance(snail, t.game.wormAt))
    })
    expect(came).toBe(true)
    expect(nearest).toBeGreaterThanOrEqual(WORM_CLEAR_OF_SNAIL)
  })

  it('waits for a scene to be over when its mud was made while the scene played, and then comes up', () => {
    const t = new Table(saved('one-thing', 3))
    const home = t.at(0)
    // A finger held on the patch: the third gulp starts the snail's ending, and the stream goes on into mud.
    t.game.press({ truck: false, point: home }, t.now)
    let upDuringScene = false, sawScene = false
    t.play(1.9, () => {
      sawScene ||= t.game.sceneRunning
      if (t.game.sceneRunning && t.game.wormAt) upDuringScene = true
    })
    t.game.lift()
    expect(sawScene).toBe(true)
    expect(levelAt(t.game.yard.ground, home.x, home.z)).toBe('mud')
    t.play(1, () => { if (t.game.sceneRunning && t.game.wormAt && t.game.channels.wormUp === 0) upDuringScene = true })
    expect(upDuringScene).toBe(false)
    expect(t.game.channels.snailOut).toBeGreaterThan(0)
    // The ending plays out, and then the worm has its turn.
    const up = wormWithin(t, 9)
    expect(up).not.toBeNull()
    expect(t.game.channels.glide).toBe(1)
  })
})

describe('the fire, water from a neighbour', () => {
  const hiss = cellVoices('fire', 'fill', 1)

  it('is put out from below by run-off with a slow sizzle, never a crackle, and then gives the long falling hiss', () => {
    const t = new Table(saved('downhill', 2))
    const pool = t.at(t.the('pool')), fire = t.the('fire')
    t.gulps(pool, 4)
    expect(those(t.heard, [slowSizzle()])).toHaveLength(0)
    for (let over = 1; over <= 3; over++) {
      t.gulp(pool)
      expect(those(t.heard, [slowSizzle()])).toHaveLength(over)
      expect(t.game.yard.things[fire].gulps).toBe(over)
    }
    expect(t.game.yard.met).toBe(true)
    t.play(8)
    expect(those(t.heard, cellVoices('fire', 'neighbour'))).toHaveLength(0)
    expect(those(t.heard, hiss)).toHaveLength(1)
    expect(t.game.motion.fire.pose.flame).toBeLessThan(0.02)
    expect(t.game.motion.fire.pose.wet).toBe(true)
  })

  it('gives the long falling hiss exactly once when aimed gulps put it out', () => {
    const t = new Table(saved('one-thing', 0))
    t.gulps(t.at(0), 3).play(8)
    expect(those(t.heard, hiss)).toHaveLength(1)
  })

  it('still spits and crackles at drops flung from the wheel', () => {
    const t = new Table(saved('round-and-round', 1))
    t.stream(t.at(t.the('wheel')), 1.2)
    expect(those(t.heard, cellVoices('fire', 'neighbour')).length).toBeGreaterThan(0)
    expect(those(t.heard, [slowSizzle()])).toHaveLength(0)
  })
})

describe('the paddling pool and the duck', () => {
  it('bonks when empty, and then each splash sounds deeper than the one before, up to its fill', () => {
    const t = new Table(saved('one-thing', 2))
    const pool = t.at(0)
    const pitches: number[] = []
    for (let gulp = 1; gulp <= 4; gulp++) {
      const before = t.heard.length
      t.gulp(pool)
      const heard = t.heard.slice(before)
      const bonks = those(heard, cellVoices('pool', 'gulp', gulp / 4))
      const splashes = those(heard, cellVoices('pool', 'fill', gulp / 4))
      expect(bonks, `gulp ${gulp}`).toHaveLength(gulp === 1 ? 1 : 0)
      expect(splashes, `gulp ${gulp}`).toHaveLength(gulp === 1 ? 0 : 1)
      if (splashes.length > 0) pitches.push(splashes[0][0].frequency)
    }
    expect(pitches).toHaveLength(3)
    expect(pitches[1]).toBeLessThan(pitches[0])
    expect(pitches[2]).toBeLessThan(pitches[1])
  })

  it('has the duck quack every time the hose reaches its pool: at each gulp, at too much, and at a sweep', () => {
    const t = new Table(saved('one-thing', 2))
    const pool = t.at(0)
    for (let gulp = 1; gulp <= 6; gulp++) {
      const before = t.heard.length
      t.gulp(pool)
      expect(those(t.heard.slice(before), QUACKS), `gulp ${gulp}`).toHaveLength(1)
    }
    // A fast stream across it.
    const before = t.heard.length
    t.game.press({ truck: false, point: { x: pool.x - 3, z: pool.z } }, t.now)
    for (let frame = 0; frame < 36; frame++) {
      t.game.move({ x: pool.x - 3 + (frame / 36) * 6, z: pool.z })
      t.play(FRAME)
    }
    t.game.lift()
    t.play(0.5)
    expect(those(t.heard.slice(before), cellVoices('pool', 'sweep', 1)).length).toBeGreaterThan(0)
    expect(those(t.heard.slice(before), QUACKS).length).toBeGreaterThan(0)
  })
})

describe('what was only heard and is now drawn', () => {
  const brown = (t: Table) => t.drops().filter((drop) => drop.brown).length

  it('throws brown blobs from a landing on mud, and none from damp sand or a puddle', () => {
    const t = new Table(saved('one-thing', 3))
    const sand = { x: 12.5, z: 8.1 }
    let blobs = 0
    for (let gulp = 0; gulp < 4; gulp++) t.tap(sand).play(0.5, () => { blobs = Math.max(blobs, brown(t)) })
    expect(levelAt(t.game.yard.ground, sand.x, sand.z)).toBe('mud')
    expect(blobs).toBe(0)
    t.tap(sand).play(0.5, () => { blobs = Math.max(blobs, brown(t)) })
    expect(blobs).toBeGreaterThanOrEqual(3)
    // They fall back and are gone.
    t.play(1.5)
    expect(brown(t)).toBe(0)
  })

  it('throws brown blobs when the dry patch is brought to mud', () => {
    const t = new Table(saved('one-thing', 3))
    let blobs = 0
    for (let gulp = 0; gulp < 3; gulp++) t.tap(t.at(0)).play(0.5, () => { blobs = Math.max(blobs, brown(t)) })
    expect(blobs).toBe(0)
    t.tap(t.at(0)).play(0.5, () => { blobs = Math.max(blobs, brown(t)) })
    expect(blobs).toBeGreaterThanOrEqual(3)
  })

  it('lets the wet logs drip twice as the fire\'s ending plays: two drops, one after the other', () => {
    const t = new Table(saved('one-thing', 0))
    const fire = t.at(0)
    t.gulps(fire, 3)
    // The splashes of the last gulp fall back first.
    t.play(0.6)
    const nearLogs = () => t.drops().filter((drop) => distance(drop, fire) < 1.2).length
    expect(nearLogs()).toBe(0)
    let rises = 0, was = 0
    t.play(2.4, () => {
      const now = nearLogs()
      if (was === 0 && now > 0) rises++
      was = now
    })
    expect(rises).toBe(2)
  })

  it('lets go of nothing when a touch ends the fire\'s ending early', () => {
    const t = new Table(saved('one-thing', 0))
    const fire = t.at(0)
    t.gulps(fire, 3)
    t.play(0.6)
    t.game.rest()
    expect(t.drops()).toHaveLength(0)
  })

  it('tips three drops out of the flower\'s cup as it nods over, and not before', () => {
    const t = new Table(saved('one-thing', 1))
    const seed = t.at(0)
    t.gulps(seed, 3).play(8)
    t.tap(seed).play(0.36)
    // Above the reach of any splash, and near the flower.
    const tipped = () => t.drops().filter((drop) => drop.y > 1.3 && distance(drop, seed) < 1.5).length
    expect(tipped()).toBe(0)
    let first = 0, nodThen = 0
    t.play(1.2, () => {
      if (first === 0 && tipped() > 0) {
        first = tipped()
        nodThen = t.game.motion.seed.pose.nod
      }
    })
    expect(first).toBe(3)
    expect(nodThen).toBeGreaterThanOrEqual(CUP_TIPS_AT)
    // One nod tips once.
    t.play(2)
    expect(tipped()).toBe(0)
  })

  it('leaves small dots where the splash drops of a tap fall back, beside the blot', () => {
    const tap = (share: number) => {
      const toy = new Toy(() => {})
      toy.dropsShare = share
      toy.press({ truck: false, point: { x: 9, z: 4 } }, 0)
      toy.lift()
      let now = 0
      for (let frame = 0; frame < 90; frame++) toy.step(FRAME, (now += FRAME))
      let damp = 0
      for (let x = 5; x < 13; x += 0.125) for (let z = 1; z < 8; z += 0.125) if (toy.paint.at(x, z).damp > 0) damp++
      return damp
    }
    // With no splash drops there are no dots: the blot alone is smaller.
    expect(tap(1)).toBeGreaterThan(tap(0) + 8)
  })

  it('counts a dot for every splash drop of a gulp, and none for the small spit of a first showing', () => {
    const arc = arcTo(NOZZLE, { x: 9, z: 4 })
    const run = (start: (drops: Drops) => void) => {
      const drops = new Drops()
      start(drops)
      let dots = 0, landings = 0
      for (let frame = 0; frame < 120; frame++) drops.step(FRAME, () => landings++, SPLASH_PER_LANDING, () => dots++)
      return { dots, landings, left: drops.alive }
    }
    expect(run((drops) => drops.gulp(arc))).toEqual({ dots: DROPS_PER_GULP * SPLASH_PER_LANDING, landings: DROPS_PER_GULP, left: 0 })
    expect(run((drops) => drops.spit(arc))).toEqual({ dots: 0, landings: 0, left: 0 })
    // Drops flung off a wheel or a wet cat leave theirs, and blobs of mud leave none.
    expect(run((drops) => drops.burst(9, 1, 4, 6, 2)).dots).toBe(6)
    expect(run((drops) => drops.blobs(9, 4)).dots).toBe(0)
  })
})

describe('the flower', () => {
  it('opens in the colour of its arrangement: always the same for one yard, and not one colour for all', () => {
    const seen = new Set<number>()
    for (const [place, plans] of Object.entries(ARRANGEMENTS)) {
      plans.forEach((plan, number) => {
        if (!plan.things.some((thing) => thing.kind === 'seed')) return
        const colour = flowerOf(place, number)
        expect(colour).toBe(flowerOf(place, number))
        expect(Number.isInteger(colour) && colour >= 0 && colour < FLOWER_COLOURS).toBe(true)
        seen.add(colour)
      })
    }
    expect(seen.size).toBe(FLOWER_COLOURS)
    for (const odd of [-1, 1.5, Number.NaN]) expect(flowerOf('no-such-place', odd)).toBe(0)
  })

  it('opens petal by petal: while one petal opens, every earlier one is open and every later one shut', () => {
    for (let step = 0; step <= 100; step++) {
      const open = step / 100
      const petals = Array.from({ length: PETAL_COUNT }, (_, index) => petalOpen(open, index))
      const opening = petals.findIndex((petal) => petal > PETAL_SHUT && petal < 1)
      petals.forEach((petal, index) => {
        expect(petal).toBeGreaterThanOrEqual(PETAL_SHUT)
        expect(petal).toBeLessThanOrEqual(1)
        if (opening >= 0 && index < opening) expect(petal).toBe(1)
        if (opening >= 0 && index > opening) expect(petal).toBe(PETAL_SHUT)
      })
    }
    for (let index = 0; index < PETAL_COUNT; index++) {
      expect(petalOpen(0, index)).toBe(PETAL_SHUT)
      expect(petalOpen(1, index)).toBe(1)
      expect(petalOpen(Number.NaN, index)).toBe(PETAL_SHUT)
      expect(petalOpen(7, index)).toBe(1)
      expect(petalOpen(-3, index)).toBe(PETAL_SHUT)
    }
  })

  it('has a drop hang from a leaf, let go, and fall faster as it goes; before its beat and after it there is none', () => {
    for (const out of [0, 1, -1, 2, Number.NaN]) expect(leafDrop(out)).toEqual({ size: 0, fallen: 0 })
    let size = 0, fallen = 0, lastStep = 0
    for (let step = 1; step < 100; step++) {
      const drop = leafDrop(step / 100)
      expect(drop.size).toBeGreaterThanOrEqual(size)
      expect(drop.fallen).toBeGreaterThanOrEqual(fallen)
      // It does not fall until it is full.
      if (drop.fallen > 0) {
        expect(drop.size).toBe(1)
        expect(drop.fallen - fallen).toBeGreaterThanOrEqual(lastStep - 1e-12)
        lastStep = drop.fallen - fallen
      }
      size = drop.size
      fallen = drop.fallen
    }
    expect(fallen).toBeGreaterThan(0.9)
  })

  it('opens petal by petal in the game, to five notes, each higher than the last', () => {
    const t = new Table(saved('one-thing', 1))
    t.gulps(t.at(0), 2)
    const before = t.heard.length
    const opened: number[] = []
    t.tap(t.at(0)).play(3.4, () => {
      const open = Array.from({ length: PETAL_COUNT }, (_, index) => petalOpen(t.game.channels.petals, index)).filter((petal) => petal === 1).length
      if (opened[opened.length - 1] !== open) opened.push(open)
    })
    expect(opened).toEqual([0, 1, 2, 3, 4, 5])
    expect(t.heard.length).toBeGreaterThan(before + PETAL_COUNT)
  })
})

describe('the snail', () => {
  it('glides along the line the child drew, the same shape, to the wettest place', () => {
    const t = new Table(saved('one-thing', 3))
    const home = t.at(0)
    // A line of water from just beside the patch, away from it and round a corner.
    const line = [{ x: 9.5, z: 6.5 }, { x: 10.5, z: 6.5 }, { x: 11.5, z: 6.5 }, { x: 11.5, z: 5.5 }]
    for (const at of line) t.gulp(at)
    t.gulps(home, 3)
    const passed: number[] = []
    t.play(8, () => {
      const at = { x: home.x + t.game.motion.snail.pose.x, z: home.z + t.game.motion.snail.pose.z }
      line.forEach((point, index) => { if (distance(at, point) < 0.3 && !passed.includes(index)) passed.push(index) })
    })
    expect(passed).toEqual([0, 1, 2, 3])
    const end = { x: home.x + t.game.motion.snail.pose.x, z: home.z + t.game.motion.snail.pose.z }
    expect(distance(end, line[3])).toBeLessThan(0.01)
  })

  it('stays on its patch when the sand round it is dry, and is found on its patch after the game was put away', () => {
    const dry = new Table(saved('one-thing', 3))
    const home = dry.at(0)
    dry.gulps(home, 3).play(8)
    expect(distance({ x: home.x + dry.game.motion.snail.pose.x, z: home.z + dry.game.motion.snail.pose.z }, home)).toBeLessThan(0.8)

    const t = new Table(saved('one-thing', 3))
    for (const at of [{ x: 9.5, z: 6.5 }, { x: 10.5, z: 6.5 }, { x: 11.5, z: 6.5 }]) t.gulp(at)
    t.gulps(home, 3).play(8)
    expect(Math.hypot(t.game.motion.snail.pose.x, t.game.motion.snail.pose.z)).toBeGreaterThan(2)
    // How far it had glided is short-lived: on load it is on its patch, out, and no scene replays.
    const again = t.reload()
    again.play(FRAME)
    expect(Math.hypot(again.game.motion.snail.pose.x, again.game.motion.snail.pose.z)).toBeLessThan(0.8)
    expect(again.game.sceneRunning).toBe(false)
    expect(again.game.motion.snail.pose.out).toBeGreaterThan(0.9)
  })
})

describe('the cat and a fire that has gone out', () => {
  it('turns her back with her tail up, and is found that way, with nothing easing in', () => {
    const t = new Table(saved('two-things', 2))
    const cat = t.the('cat')
    t.play(1)
    const faced = t.game.motion.cat.pose.turn
    t.gulps(t.at(t.the('fire')), 3).play(9)
    const pose = { ...t.game.motion.cat.pose }
    expect(Math.abs(Math.atan2(Math.sin(pose.turn - faced), Math.cos(pose.turn - faced)))).toBeGreaterThan(1.2)
    expect(pose.tailUp).toBeGreaterThan(0.95)
    // Her back is to the truck: the way she faces points away from it.
    const at = t.at(cat)
    const fromTruck = Math.atan2(at.z - 5.4, at.x - 2.6)
    expect(Math.cos(pose.turn - fromTruck)).toBeGreaterThan(0.98)
    const again = t.reload()
    again.play(FRAME)
    const found = again.game.motion.cat.pose
    expect(Math.abs(Math.atan2(Math.sin(found.turn - pose.turn), Math.cos(found.turn - pose.turn)))).toBeLessThan(0.02)
    expect(Math.abs(found.tailUp - pose.tailUp)).toBeLessThan(0.02)
    const first = found.turn
    again.play(2)
    expect(again.game.motion.cat.pose.turn).toBeCloseTo(first, 4)
  })
})

describe('the wheel, too much', () => {
  it('throws its ring so wide that every neighbour gets a gulp, where at its fill only those beside it get drops', () => {
    for (const start of everyYard()) {
      const wheel = indexOf(start, 'wheel')
      if (wheel < 0) continue
      const steps = pours(start, wheel, 4)
      const others = start.things.map((_, index) => index).filter((index) => index !== wheel)
      // At its fill: drops on what stands beside it, and no water kept by anything.
      const atFill = results(steps[2].events).filter((event) => event.thing !== wheel)
      expect(atFill.map((event) => event.thing).sort()).toEqual([...(start.flingsTo ?? [])].filter((index) => index !== wheel).sort())
      for (const index of others) expect(steps[2].yard.things[index].gulps).toBe(0)
      // Past it: every other thing of the yard, each a whole gulp.
      const wide = results(steps[3].events).filter((event) => event.by === 'drops').map((event) => event.thing)
      for (const index of others) {
        expect(wide, `${start.place} ${start.arrangement}, thing ${index}`).toContain(index)
        expect(steps[3].yard.things[index].gulps, `${start.place} ${start.arrangement}, thing ${index}`).toBe(1)
      }
    }
  })
})

describe('the cat, her fill', () => {
  it('sprays her neighbours as she shakes herself: a fire near her spits at the drops and keeps no water', () => {
    const start = layOut('two-things', 2)
    const cat = indexOf(start, 'cat'), fire = indexOf(start, 'fire')
    expect(distance(placeOf(start, cat), placeOf(start, fire))).toBeLessThanOrEqual(SPRAY_REACH)
    const steps = pours(start, cat, 3)
    for (const step of steps.slice(0, 2)) expect(results(step.events).some((event) => event.thing === fire)).toBe(false)
    const sprayed = results(steps[2].events).filter((event) => event.thing === fire)
    expect(sprayed).toHaveLength(1)
    expect(sprayed[0]).toMatchObject({ action: 'neighbour', by: 'drops' })
    expect(steps[2].yard.things[fire].gulps).toBe(0)
    // And a pool near her patters.
    const garden = layOut('whole-garden', 1)
    const wet = pours(garden, indexOf(garden, 'cat'), 3)[2]
    expect(results(wet.events).some((event) => event.kind === 'pool' && event.action === 'neighbour' && event.by === 'drops')).toBe(true)
    expect(wet.yard.things[indexOf(garden, 'pool')].gulps).toBe(0)
  })
})

describe('the small fire, too much', () => {
  it('floats its wet logs on a puddle of their own, which is found there again after the game was put away', () => {
    const t = new Table(saved('one-thing', 0))
    const fire = t.at(0)
    t.gulps(fire, 3)
    expect(t.game.paint.at(fire.x, fire.z).puddle).toBe(0)
    t.gulp(fire).play(3)
    expect(t.game.paint.at(fire.x, fire.z).puddle).toBeGreaterThan(96)
    expect(Math.hypot(t.game.motion.fire.pose.logsX, t.game.motion.fire.pose.logsZ) + t.game.motion.fire.pose.logsY).toBeGreaterThan(0.01)
    const again = t.reload()
    expect(again.game.paint.at(fire.x, fire.z).puddle).toBeGreaterThan(96)
  })
})

describe('the seed in its pot', () => {
  it('shakes drops off its leaves when a stream sweeps past', () => {
    const t = new Table(saved('one-thing', 1))
    const seed = t.at(0)
    t.gulps(seed, 2).play(2)
    const high = () => t.drops().filter((drop) => drop.y > 1.2 && distance(drop, seed) < 1.2).length
    expect(high()).toBe(0)
    let shaken = 0
    t.game.press({ truck: false, point: { x: seed.x - 3, z: seed.z + 0.4 } }, t.now)
    for (let frame = 1; frame <= 30; frame++) {
      t.game.move({ x: seed.x - 3 + (frame / 30) * 6, z: seed.z + 0.4 })
      t.play(FRAME)
      shaken = Math.max(shaken, high())
    }
    t.game.lift()
    expect(shaken).toBeGreaterThanOrEqual(3)
    expect(t.game.yard.things[0].gulps).toBe(2)
  })

  it('shows the dark climb its wall when it drinks run-off from below, and not when it is watered from above', () => {
    const t = new Table(saved('downhill', 0))
    const pool = t.at(t.the('pool')), seed = t.the('seed')
    t.gulps(pool, 4)
    expect(t.game.motion.seed.pose.soak).toBe(0)
    let last = 0, fell = false
    t.tap(pool).play(2.2, () => {
      const soak = t.game.motion.seed.pose.soak
      if (soak < last - 1e-9) fell = true
      last = soak
    })
    expect(t.game.yard.things[seed].gulps).toBe(1)
    // It climbs and does not slip back while it climbs.
    expect(fell).toBe(false)
    expect(last).toBeGreaterThan(0.95)
    t.play(SOAK_S)
    expect(t.game.motion.seed.pose.soak).toBe(0)
    const above = new Table(saved('one-thing', 1))
    let soaked = 0
    above.tap(above.at(0)).play(2, () => { soaked = Math.max(soaked, above.game.motion.seed.pose.soak) })
    expect(soaked).toBe(0)
  })
})

describe('the boat', () => {
  it('rings hollow at its first gulp, and then drums deeper gulp by gulp until it is full', () => {
    const t = new Table(saved('afloat', 0))
    const boat = t.at(t.the('boat'))
    const pitches: number[] = []
    for (let gulp = 1; gulp <= 3; gulp++) {
      const before = t.heard.length
      t.gulp(boat)
      const heard = t.heard.slice(before)
      expect(t.game.yard.things[t.the('boat')].gulps).toBe(gulp)
      expect(those(heard, cellVoices('boat', 'gulp', gulp / 3)), `gulp ${gulp}`).toHaveLength(gulp === 1 ? 1 : 0)
      const drums = those(heard, cellVoices('boat', 'fill', gulp / 3))
      expect(drums, `gulp ${gulp}`).toHaveLength(gulp === 1 ? 0 : 1)
      if (drums.length > 0) pitches.push(drums[0][0].frequency)
    }
    expect(pitches[1]).toBeLessThan(pitches[0])
  })

  it('slides on sand with a scrape, nose first, when a stream sweeps past it; afloat it swings at its mooring and swings back', () => {
    const t = new Table(saved('afloat', 0))
    const pool = t.at(t.the('pool')), boat = t.the('boat')
    const duckSide = { x: pool.x - 0.5, z: pool.z }
    // Afloat.
    t.gulps(duckSide, 3).play(8)
    let before = t.heard.length
    let swung = 0
    const afloatAt = t.at(boat)
    t.sweep({ x: afloatAt.x, z: afloatAt.z - 3 }, { x: afloatAt.x, z: afloatAt.z + 3 })
    t.play(0.4, () => { swung = Math.max(swung, Math.abs(t.game.motion.boat.pose.yaw)) })
    expect(those(t.heard.slice(before), cellVoices('boat', 'sweep')).length).toBeGreaterThan(0)
    expect(those(t.heard.slice(before), [delayed(boatScrapes(), 0.05)])).toHaveLength(0)
    expect(swung).toBeGreaterThan(0.05)
    t.play(6)
    expect(Math.abs(t.game.motion.boat.pose.yaw)).toBeLessThan(0.01)
    // Carried over the rim, it lies aground on the sand.
    t.gulps(duckSide, 2).play(3)
    const aground = t.at(boat)
    expect(distance(aground, pool)).toBeGreaterThan(1.9)
    before = t.heard.length
    const slidFrom = { x: t.game.motion.boat.pose.pushX, z: t.game.motion.boat.pose.pushZ }
    t.sweep({ x: aground.x - 3, z: aground.z + 0.2 }, { x: aground.x + 3, z: aground.z + 0.2 })
    t.play(1.5)
    expect(those(t.heard.slice(before), [delayed(boatScrapes(), 0.05)]).length).toBeGreaterThan(0)
    const pose = t.game.motion.boat.pose
    expect(Math.hypot(pose.pushX - slidFrom.x, pose.pushZ - slidFrom.z)).toBeGreaterThan(0.1)
    // Its nose has come round toward the way it was pushed, and no further than there is room for.
    expect(Math.abs(pose.yaw)).toBeGreaterThan(0.05)
    expect(Math.abs(pose.yaw)).toBeLessThanOrEqual(NOSE_ROUND)
  })
})

describe('the duck, the bee and the snail', () => {
  it('has the duck wriggle and quack in the puddle its ride over the rim leaves it in', () => {
    const t = new Table(saved('one-thing', 2))
    const pool = t.at(0)
    t.gulps(pool, 4).play(8)
    const before = t.heard.length
    let splashes = 0
    t.tap(pool).play(3.5, () => { if (t.game.motion.duck.splashed) splashes++ })
    expect(splashes).toBe(1)
    // One quack as the water reaches it, and one more, later, in the puddle.
    expect(those(t.heard.slice(before), QUACKS)).toHaveLength(1)
    expect(those(t.heard.slice(before), VARIANTS.map((variant) => duckQuack(variant)))).toHaveLength(1)
  })

  it('sends the bee up off her flower every time drops reach her wings, and she comes back down', () => {
    const t = new Table(saved('one-thing', 1))
    const seed = t.at(0)
    t.gulps(seed, 3).play(8)
    expect(t.game.motion.bee.pose.landed).toBeGreaterThan(0.95)
    for (let time = 0; time < 2; time++) {
      const sat = t.game.motion.bee.pose.y
      let least = 1, highest = 0
      t.tap(seed).play(1.4, () => {
        least = Math.min(least, t.game.motion.bee.pose.landed)
        highest = Math.max(highest, t.game.motion.bee.pose.y)
      })
      expect(least).toBeLessThan(0.2)
      expect(highest).toBeGreaterThan(sat + 0.8)
      t.play(2.5)
      expect(t.game.motion.bee.pose.landed).toBeGreaterThan(0.95)
    }
  })

  it('keeps the snail\'s feelers in from the heat for as long as a fire burns in its yard, and lets them out when the fire is out', () => {
    const start = layOut('whole-garden', 3)
    expect(indexOf(start, 'fire')).toBeGreaterThanOrEqual(0)
    expect(indexOf(start, 'patch')).toBe(start.want)
    const t = new Table(saved('whole-garden', 3))
    t.gulps(t.at(t.the('patch')), 2).play(4)
    expect(t.game.motion.snail.pose.feelers).toBeLessThan(0.02)
    t.gulps(t.at(t.the('fire')), 3).play(4)
    expect(t.game.motion.snail.pose.feelers).toBeGreaterThan(0.4)
  })
})

describe('the low side of the pool', () => {
  it('points at what the pool will run to, or at the wheel on the way, so the child can see where the water will go', () => {
    let pointed = 0
    for (const yard of everyYard()) {
      const pool = indexOf(yard, 'pool')
      if (pool < 0) continue
      const turn = lowSideOf(yard, pool)
      const first = yard.runsPast ?? yard.runsTo
      if (first === undefined) {
        // With nothing below it, it points at the near edge, where its overflow lands.
        expect(turn).toBe(0)
        continue
      }
      const from = placeOf(yard, pool), to = placeOf(yard, first)
      const far = distance(from, to)
      expect(Math.sin(turn)).toBeCloseTo((to.x - from.x) / far, 9)
      expect(Math.cos(turn)).toBeCloseTo((to.z - from.z) / far, 9)
      // Downhill is toward the child.
      expect(Math.cos(turn)).toBeGreaterThan(0.5)
      pointed++
    }
    expect(pointed).toBeGreaterThanOrEqual(6)
    expect(lowSideOf(layOut('one-thing', 0), 0)).toBe(0)
    expect(lowSideOf(layOut('one-thing', 2), 7)).toBe(0)
  })
})

describe('what a reader of the folder found', () => {
  it('meets the duck\'s want when it floats, at the pool\'s third gulp, and lifts it off the floor as its ending begins', () => {
    const t = new Table(saved('one-thing', 2))
    const pool = t.at(0)
    t.gulps(pool, 2)
    expect(t.game.yard.met).toBe(false)
    expect(t.game.motion.duck.pose.y).toBe(0)
    let rose = true, last = 0
    t.tap(pool).play(1.2, () => {
      if (t.game.motion.duck.pose.y < last - 0.03) rose = false
      last = t.game.motion.duck.pose.y
    })
    expect(t.game.yard.met).toBe(true)
    expect(t.game.yard.things[0].gulps).toBe(3)
    expect(rose).toBe(true)
    expect(last).toBeGreaterThan(0.15)
    // Found afloat, with nothing easing in and no ending replayed.
    t.play(8)
    const again = t.reload()
    again.play(FRAME)
    expect(again.game.sceneRunning).toBe(false)
    expect(again.game.motion.duck.pose.y).toBeCloseTo(t.game.motion.duck.pose.y, 1)
  })

  it('sends the bee up at drops flung from the wheel, and does not darken the pot or slurp at them', () => {
    const t = new Table(saved('round-and-round', 0))
    const wheel = t.at(t.the('wheel'))
    let highest = 0, soaked = 0
    const sat = t.play(1).game.motion.bee.pose.y
    t.game.press({ truck: false, point: wheel }, t.now)
    t.play(1.2, () => {
      highest = Math.max(highest, t.game.motion.bee.pose.y)
      soaked = Math.max(soaked, t.game.motion.seed.pose.soak)
    })
    t.game.lift()
    expect(highest).toBeGreaterThan(sat + 0.8)
    expect(soaked).toBe(0)
    expect(those(t.heard, cellVoices('seed', 'neighbour'))).toHaveLength(0)
    expect(those(t.heard, cellVoices('seed', 'sweep')).length).toBeGreaterThan(0)
  })

  it('has a cat whom the wheel\'s ring soaks shake herself and stalk off, and one it soaks again take the truck: not a sneeze', () => {
    const start = layOut('round-and-round', 0)
    const wheel = indexOf(start, 'wheel'), cat = indexOf(start, 'cat')
    const steps = pours(start, wheel, 8)
    const hers = steps.flatMap((step) => results(step.events).filter((event) => event.thing === cat).map((event) => event.id))
    // Drops at the wheel's fill and the first two gulps of its wide ring are drops on her nose; the third soaks her.
    expect(hers.slice(0, 3)).toEqual(['cat-sneezes', 'cat-sneezes', 'cat-sneezes'])
    expect(hers).toContain('cat-soaked')
    expect(hers).toContain('cat-to-roof')
    expect(hers.indexOf('cat-to-roof')).toBeGreaterThan(hers.indexOf('cat-soaked'))
    // In the game she is heard to rattle and grumble, and then to scrabble up.
    const t = new Table(saved('round-and-round', 0))
    t.stream(t.at(t.the('wheel')), 2.8)
    expect(those(t.heard, cellVoices('cat', 'fill', 1)).length).toBeGreaterThan(0)
    expect(those(t.heard, cellVoices('cat', 'too-much', 1)).length).toBeGreaterThan(0)
    expect(t.game.yard.things[t.the('cat')].spot).toBe('roof')
  })

  it('lets a fire that holds no want drip twice when it goes out, and gives it the falling hiss when a neighbour put it out', () => {
    // The whole garden with the snail and a fire: the snail holds the want.
    const aimed = new Table(saved('whole-garden', 3))
    const fire = aimed.at(aimed.the('fire'))
    expect(aimed.game.yard.want).not.toBe(aimed.the('fire'))
    aimed.gulps(fire, 3).play(0.4)
    const hiss = cellVoices('fire', 'fill', 1)
    expect(those(aimed.heard, hiss)).toHaveLength(1)
    const near = () => aimed.drops().filter((drop) => distance(drop, fire) < 1.2).length
    expect(near()).toBe(0)
    let rises = 0, was = 0
    aimed.play(2.6, () => {
      const now = near()
      if (was === 0 && now > 0) rises++
      was = now
    })
    expect(rises).toBe(2)
    // Put out by the wheel's wide ring: the hiss is given all the same, once.
    const flung = new Table(saved('whole-garden', 3))
    flung.stream(flung.at(flung.the('wheel')), 2.4)
    expect(flung.game.yard.things[flung.the('fire')].gulps).toBeGreaterThanOrEqual(3)
    expect(those(flung.heard, hiss)).toHaveLength(1)
  })

  it('trickles faintly when run-off creeps along the ground, to open sand and to a thing', () => {
    const trickle = cellVoices('patch', 'neighbour')
    const alone = new Table(saved('one-thing', 2))
    alone.gulps(alone.at(0), 4)
    expect(those(alone.heard, trickle)).toHaveLength(0)
    alone.gulp(alone.at(0))
    expect(those(alone.heard, trickle)).toHaveLength(1)
    const downhill = new Table(saved('downhill', 0))
    downhill.gulps(downhill.at(downhill.the('pool')), 5)
    expect(those(downhill.heard, trickle)).toHaveLength(1)
  })

  it('draws the water that crosses the rim as the pool runs over, and bobs the boat with the duck when a stream sweeps the pool', () => {
    const t = new Table(saved('afloat', 0))
    const pool = t.at(t.the('pool'))
    const duckSide = { x: pool.x - 0.5, z: pool.z }
    t.gulps(duckSide, 4).play(8)
    expect(t.game.motion.pool.pose.spill).toBeLessThan(1e-9)
    let bobbed = 0
    const rest = t.game.motion.boat.pose.bob
    t.game.press({ truck: false, point: { x: pool.x - 0.6, z: pool.z - 3 } }, t.now)
    for (let frame = 1; frame <= 45; frame++) {
      if (frame <= 30) t.game.move({ x: pool.x - 0.6, z: pool.z - 3 + (frame / 30) * 6 })
      t.play(FRAME)
      bobbed = Math.max(bobbed, Math.abs(t.game.motion.boat.pose.bob - rest))
    }
    t.game.lift()
    t.play(0.5)
    expect(bobbed).toBeGreaterThan(0.05)
    let spilled = 0
    t.tap(duckSide).play(1.6, () => { spilled = Math.max(spilled, t.game.motion.pool.pose.spill) })
    expect(spilled).toBeGreaterThan(0.9)
    t.play(1)
    expect(t.game.motion.pool.pose.spill).toBeLessThan(1e-9)
  })

  it('creaks on its springs every time the truck rocks: at a tap and at each gulp of a stream', () => {
    const heard: VoiceSpec[] = []
    const toy = new Toy((voice) => heard.push(voice))
    const creaky = (voice: VoiceSpec) => voice.some((partial) => partial.kind === 'tone' && partial.wave === 'triangle' && partial.frequency < 400) || voice.length <= 2
    toy.press({ truck: false, point: { x: 9, z: 4 } }, 0)
    // The press is one voice: the hose, its pop and the creak, a moment after.
    expect(heard).toHaveLength(1)
    expect(heard[0].length).toBeGreaterThan(3)
    expect(Math.max(...heard[0].map((partial) => partial.at))).toBeGreaterThan(0.05)
    let now = 0, gulps = 0, creaks = 0
    const before = heard.length
    for (let frame = 0; frame < 120; frame++) {
      const flying = toy.hose.flying.length
      toy.step(FRAME, (now += FRAME))
      if (toy.hose.flying.length > flying) gulps++
    }
    toy.lift()
    // Each gulp of the stream is heard twice over: the hose, and the springs.
    creaks = heard.slice(before).filter(creaky).length
    expect(gulps).toBeGreaterThanOrEqual(5)
    expect(creaks).toBeGreaterThanOrEqual(gulps)
  })

  it('judges a yard mixed when the child spun the wheel to its fill or sank the boat, though neither holds water after', () => {
    // The wheel: spun steadily, run down again, and then the bell.
    const spun = new Table(saved('two-things', 1))
    const position = spun.game.save.position
    spun.stream(spun.at(spun.the('wheel')), 1.4).play(2)
    expect(spun.game.yard.things[spun.the('wheel')].gulps).toBe(0)
    expect(spun.game.yard.met).toBe(false)
    for (let ring = 0; ring < 3; ring++) spun.gulp({ x: 4.6, z: 0.6 })
    spun.play(6)
    expect(spun.game.save.position).toBe(position)
    // Nothing done at all, and then the bell: badly, a step down (or the first place stays the first).
    const idle = new Table(saved('two-things', 1))
    for (let ring = 0; ring < 3; ring++) idle.gulp({ x: 4.6, z: 0.6 })
    idle.play(6)
    expect(idle.game.save.position).toBe('one-thing')
  })

  it('lets water that rings the gate open while the game goes to rest take nothing with it into the next yard', () => {
    const t = new Table(saved('one-thing', 0))
    const bell = { x: 4.6, z: 0.6 }
    t.gulp(bell).gulp(bell)
    // A held stream on the bell, and the game is put away with water in the air.
    t.game.press({ truck: false, point: bell }, t.now)
    t.play(0.2)
    const left = t.game.yard
    t.game.rest()
    expect(t.game.yard).not.toBe(left)
    // The drive is over, the truck stands in the new yard, and the new yard is as it was laid out: dry, and nothing rung.
    expect(t.game.sceneRunning).toBe(false)
    expect(t.game.way).toBeNull()
    expect(t.game.latch).toBe(0)
    expect(t.game.yard.things.every((thing) => thing.gulps === 0)).toBe(true)
    expect(t.game.yard.ground.every((gulps) => gulps === 0)).toBe(true)
    const found = t.reload()
    expect(found.game.yard).toEqual(t.game.yard)
  })

  it('lays the fire\'s logs in a heap that no line of three crosses through one middle', async () => {
    const { buildFire } = await import('./thingModels')
    const THREE = await import('three')
    const fire = buildFire(new THREE.MeshBasicMaterial(), new THREE.MeshBasicMaterial())
    // The three logs' middles, from the vertices of each third of the mesh: no two share a middle, as the spokes of a star would.
    const position = fire.wetLogs.geometry.getAttribute('position')
    const each = position.count / 3
    const middles = [0, 1, 2].map((log) => {
      let x = 0, z = 0
      for (let i = log * each; i < (log + 1) * each; i++) { x += position.getX(i); z += position.getZ(i) }
      return { x: x / each, z: z / each }
    })
    for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) expect(distance(middles[a], middles[b])).toBeGreaterThan(0.15)
  })
})
