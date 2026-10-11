import { describe, expect, it } from 'vitest'
import { drawn } from './fixtures'
import { Game, type Event, type EventType } from './game'
import type { Point } from './input'
import { BURROW_INDEX, CAGE, COLS, LIFT, MAMMOTH, centre, grassNode } from './layout'
import { toSave } from './save'
import { dwellersOf, layWorld, nextSeed, type World } from './world'

const FRAME = 1 / 60
const mid = (index: number): Point => centre(index % COLS, Math.floor(index / COLS))
type Log = { t: number; event: Event }[]
function play(game: Game, seconds: number, out: Log = []): Log {
  for (const event of game.drain()) out.push({ t: 0, event })
  for (let t = FRAME; t <= seconds + 1e-9; t += FRAME) {
    game.step(FRAME)
    for (const event of game.drain()) out.push({ t, event })
  }
  return out
}
const types = (log: Log): EventType[] => log.map((entry) => entry.event.type)
/** Plays until the scene that is running has ended, and says how long that took. */
function toEnd(game: Game, log: Log = []): number {
  let t = 0
  for (; game.sceneName !== null && t < 30; t += FRAME) {
    game.step(FRAME)
    for (const event of game.drain()) log.push({ t, event })
  }
  return t
}
/** Holds a finger on a block until a scene starts. */
function until(game: Game, at: number, name: string): Log {
  game.press(mid(at))
  const log: Log = []
  for (let t = 0; game.sceneName !== name && t < 10; t += FRAME) {
    game.step(FRAME)
    for (const event of game.drain()) log.push({ t, event })
  }
  expect(game.sceneName).toBe(name)
  return log
}
const lift = { x: LIFT.x + LIFT.w / 2, y: LIFT.y + 100 }

describe('the blast', () => {
  const cave = (): World => drawn('oee', 'oee', 'oee', '@ae')

  it('carries the mole up the dug space above him to the roof, singed, in about five seconds', () => {
    const game = new Game(cave())
    // The whoomph is in the step that starts the scene, with the pick's blow.
    const log = until(game, 40, 'blast')
    const length = toEnd(game, log)
    expect(length).toBeGreaterThan(4.5)
    expect(length).toBeLessThan(5.5)
    expect(types(log).filter((type) => ['whoomph', 'bump', 'grumble'].includes(type))).toEqual(['whoomph', 'bump', 'grumble'])
    expect(game.world.kinds[40]).toBe('open')
    expect(game.world.mole.at).toBe(0)
    expect(game.world.mole.sooty).toBe(true)
    expect(game.mole.hang).toBe(true)
  })

  it('presses him to the roof of his own block when rock is straight above him', () => {
    const game = new Game(drawn('@a'))
    until(game, 1, 'blast')
    toEnd(game)
    expect(game.world.mole.at).toBe(0)
    expect(game.world.mole.sooty).toBe(true)
  })

  it('saves its end when it starts, and arrives there whether it is watched or ended by a touch', () => {
    const watched = new Game(cave())
    until(watched, 40, 'blast')
    expect(watched.changed()).toBe('now')
    const atStart = toSave(watched.keeps)
    expect(atStart.mole).toMatchObject({ c: 0, r: 0, sooty: true })
    expect(atStart.cells[40]).toBe('o')
    toEnd(watched)
    expect(toSave(watched.keeps)).toEqual(atStart)

    const touched = new Game(cave())
    until(touched, 40, 'blast')
    play(touched, 0.5)
    touched.press({ x: 900, y: 60 })
    expect(touched.sceneName).toBeNull()
    // The touch that ended it is an ordinary touch, and nothing of the scene is heard after it.
    expect(types(touched.drain().map((event) => ({ t: 0, event })))).toEqual(['print'])
    expect(toSave(touched.keeps)).toEqual(atStart)
    expect(types(play(touched, 6))).toEqual([])
  })

  it('leaves the soot on him until water washes it off, and he comes down cross at the next touch', () => {
    const game = new Game(drawn('oooo', 'oee~', 'oeee', '@aee'))
    until(game, 40, 'blast')
    toEnd(game)
    expect(game.world.mole.sooty).toBe(true)
    game.press(mid(1))
    expect(game.mole.hang).toBe(false)
    expect(game.mole.cross).toBeGreaterThan(0)
    game.release('tap')
    game.press(mid(16))
    const log = play(game, 3)
    expect(types(log)).toContain('wash')
    expect(game.world.mole.sooty).toBe(false)
  })
})

describe('the run', () => {
  const cave = (): World => drawn('@wee', 'oeee', 'ooee', 'eooe')

  it('runs the water down the dug space block by block, each glug lower, and rests it in the lowest place', () => {
    const game = new Game(cave())
    const before = until(game, 1, 'run')
    // The gush is in the step that starts the scene, with the pick's blow.
    expect(types(before)[before.length - 1]).toBe('gush')
    const log: Log = []
    const length = toEnd(game, log)
    expect(length).toBeGreaterThanOrEqual(4)
    expect(length).toBeLessThanOrEqual(8.2)
    const glugs = log.filter((entry) => entry.event.type === 'glug').map((entry) => (entry.event as { n: number }).n)
    expect(glugs.length).toBeGreaterThan(6)
    expect(glugs).toEqual(glugs.map((_, i) => i))
    expect(types(log).filter((type) => type === 'lap')).toHaveLength(4)
    expect(game.world.kinds[1]).toBe('open')
    // A pocket holds two blocks of water: both lie at the bottom.
    expect(game.world.water[40]).toBe(true)
    expect(game.world.water[41]).toBe(true)
    expect(game.world.water.filter(Boolean)).toHaveLength(2)
    for (const index of [1, 0, 13, 26, 27, 40, 41]) expect(game.world.wet[index]).toBe(true)
  })

  it('carries a mole in its way one block along, soaks him and washes the soot off', () => {
    const world = cave()
    world.mole.sooty = true
    const game = new Game(world)
    until(game, 1, 'run')
    const log: Log = []
    toEnd(game, log)
    expect(types(log)).toContain('soak')
    expect(types(log).filter((type) => type === 'flap')).toHaveLength(3)
    expect(game.world.mole.at).toBe(13)
    expect(game.world.mole.sooty).toBe(false)
  })

  it('saves its end when it starts: the pocket dug, the path wet, the water at rest, the mole where it ends', () => {
    const game = new Game(cave())
    until(game, 1, 'run')
    expect(game.changed()).toBe('now')
    const atStart = toSave(game.keeps)
    expect(atStart.cells[1]).toBe('o')
    expect(atStart.water[40] + atStart.water[41]).toBe('11')
    expect(atStart.wet[26]).toBe('1')
    expect(atStart.mole).toMatchObject({ c: 0, r: 1 })
    // Shown, the water has not got there yet.
    expect(game.world.water[40]).toBe(false)
    play(game, 0.6)
    game.press({ x: 900, y: 60 })
    expect(game.sceneName).toBeNull()
    expect(toSave(game.keeps)).toEqual(atStart)
    expect(game.world.water[40]).toBe(true)
    expect(types(play(game, 6))).toEqual(['print'])
  })

  it('changes who lives along the way only once the water has come to rest', () => {
    const world = drawn('@wee', 'eoee', 'eooo', 'eeee')
    const game = new Game(world)
    expect(game.dwellers.map((dweller) => dweller.kind)).toEqual(['bat'])
    until(game, 1, 'run')
    play(game, 1)
    expect(game.dwellers.map((dweller) => dweller.kind)).toEqual(['bat'])
    const log: Log = []
    toEnd(game, log)
    expect(types(log)).toContain('leave')
    expect(game.dwellers).toEqual(dwellersOf(game.world))
    expect(game.dwellers.every((dweller) => dweller.kind === 'newt')).toBe(true)
  })

  it('starts when a block under standing water is dug', () => {
    const game = new Game(drawn('o~e', '@ee'))
    until(game, 14, 'run')
    toEnd(game)
    expect(game.world.water[1]).toBe(false)
    expect(game.world.water[14]).toBe(true)
  })
})

describe('the ride', () => {
  function inCage(): Game {
    const world = layWorld(9, 'near')
    world.mole.at = CAGE
    world.mole.sooty = true
    world.mole.tool = 'bucket'
    world.mole.load = 'earth'
    world.kinds[BURROW_INDEX + COLS] = 'open'
    world.kinds[BURROW_INDEX + COLS + 1] = 'open'
    return new Game(world)
  }

  it('saves the fresh hillside when it starts: the position moved on, a new seed, the mole in the new burrow with only his pick', () => {
    const game = inCage()
    game.press(lift)
    game.release('tap', lift)
    expect(game.sceneName).toBe('ride')
    expect(game.changed()).toBe('now')
    const fresh = layWorld(nextSeed(9), 'wild')
    fresh.mole.sooty = true
    expect(toSave(game.keeps)).toEqual(toSave(fresh))
    expect(toSave(game.keeps)).toMatchObject({ position: 'wild', finished: false, mole: { c: 6, r: 0, cage: false, tool: 'none', bucket: 'nothing', sooty: true } })
  })

  it('takes about seven seconds, shows every lived-in place once from left to right, and sets him down in the burrow', () => {
    const game = inCage()
    const lived = game.dwellers.length
    expect(lived).toBeGreaterThan(0)
    game.press(lift)
    game.release('tap', lift)
    const atStart = toSave(game.keeps)
    const log: Log = []
    const length = toEnd(game, log)
    expect(length).toBeGreaterThan(6.5)
    expect(length).toBeLessThan(8)
    expect(types(log).filter((type) => type === 'show')).toHaveLength(lived)
    const order = types(log).filter((type) => ['clack', 'squeal', 'show', 'roll', 'unroll', 'step'].includes(type))
    expect(order.indexOf('squeal')).toBeGreaterThan(order.indexOf('clack'))
    // The crank squeals five times on the way up, before anyone shows, and twice more on the way down, after the fresh hill is laid.
    const squeals = order.map((type, i) => (type === 'squeal' ? i : -1)).filter((i) => i >= 0)
    expect(squeals).toHaveLength(7)
    expect(order.indexOf('show')).toBeGreaterThan(squeals[4])
    expect(squeals[5]).toBeGreaterThan(order.indexOf('unroll'))
    expect(order.indexOf('unroll')).toBeGreaterThan(order.indexOf('roll'))
    expect(order[order.length - 1]).toBe('step')
    expect(toSave(game.keeps)).toEqual(atStart)
    expect(game.world.mole.at).toBe(BURROW_INDEX)
    expect(game.staging.rise).toBe(0)
    expect(game.staging.roll).toBeNull()
  })

  it('is ended by a touch on the fresh hillside, and does not play again', () => {
    const game = inCage()
    game.press(lift)
    game.release('tap', lift)
    const atStart = toSave(game.keeps)
    play(game, 1)
    game.press({ x: 900, y: 60 })
    expect(game.sceneName).toBeNull()
    expect(toSave(game.keeps)).toEqual(atStart)
    expect(game.world.mole.at).toBe(BURROW_INDEX)
    expect(types(play(game, 9))).toEqual(['print'])
  })

  it('stays on the wild hillsides from then on', () => {
    const world = layWorld(4, 'wild')
    world.mole.at = CAGE
    const game = new Game(world)
    game.press(lift)
    game.release('tap', lift)
    expect(game.keeps.position).toBe('wild')
  })
})

describe('the mammoth and water', () => {
  it('drinks a bucket of water tipped at its feet and blows it back over the mole', () => {
    const world = layWorld(2, 'near')
    world.mole.at = grassNode(8)
    world.mole.tool = 'bucket'
    world.mole.load = 'water'
    world.mole.sooty = true
    const game = new Game(world)
    game.press({ x: MAMMOTH.x + 150, y: MAMMOTH.y + 90 })
    game.release('tap')
    const log = play(game, 6)
    expect(types(log).filter((type) => ['poke', 'tip', 'slurp', 'spray'].includes(type))).toEqual(['poke', 'tip', 'slurp', 'spray'])
    expect(game.world.mole.load).toBe('nothing')
    expect(game.world.mole.sooty).toBe(false)
    expect(game.world.mole.at).toBe(grassNode(5))
  })
})
