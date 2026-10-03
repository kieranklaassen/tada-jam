import { describe, expect, it } from 'vitest'
import type { Target } from './deeds'
import type { GameEvent } from './events'
import type { Game } from './game'
import { newGame } from './gameScenes'
import { crewSpot } from './layout'
import { aimOn, tap } from './play'
import { placeAt } from './places'
import { STACK_MOST } from './tray'
import { homeOf, newWorld, startCycle, trayOf, type World } from './world'

const types = (events: GameEvent[]) => new Set(events.map((event) => event.type))
const begun = (position: Parameters<typeof startCycle>[0], seed = 11): Game => newGame({ ...newWorld(null), position, finished: false, crates: [], cycle: startCycle(position, seed, false) } as World)
const sized = (game: Game, size: 'small' | 'big') => game.world.cycle.toys.map((toy, i) => ({ toy, i })).filter(({ toy }) => toy.size === size).map(({ i }) => i)
const placeOf = (game: Game, toy: number) => (game.world.cycle.where[toy] as { place: number }).place
const pick = (game: Game, toy: number) => tap(game, { on: 'place', place: placeOf(game, toy) }, 2.2)
const bare = (game: Game) => trayOf(game.world.cycle).findIndex((stack) => stack.length === 0)
/** The finger comes down on a thing and stays there. */
const hold = (game: Game, target: Target, seconds = 2.2) => { game.point(aimOn(game, target), true); game.advance(seconds); return game.takeEvents() }
/** Every toy is where the rules have it, at rest, and none is lost. */
function atRest(game: Game): void {
  game.advance(3)
  game.bodies.forEach((body, toy) => {
    if (toy === game.held) return
    expect(body.mode, `toy ${toy}`).toBe('resting')
    const spot = game.spotOf(toy)
    expect([body.x, body.z]).toEqual([spot.x, spot.z])
    expect(body.y).toBeCloseTo(spot.y, 5)
  })
  const tray = trayOf(game.world.cycle)
  for (const stack of tray) expect(stack.length).toBeLessThanOrEqual(STACK_MOST)
  expect(game.world.cycle.where.length).toBe(game.bodies.length)
}

describe('the grid, played', () => {
  it('stands toys on each other, bounces a fourth off, and takes the top one back', () => {
    const game = begun('three-ways')
    const [a, b, c, d] = sized(game, 'small')
    pick(game, a); expect(types(tap(game, { on: 'place', place: placeOf(game, b) }))).toContain('click')
    pick(game, c); tap(game, { on: 'place', place: placeOf(game, b) })
    expect(trayOf(game.world.cycle)[placeOf(game, b)]).toEqual([b, a, c])
    pick(game, d)
    const events = tap(game, { on: 'place', place: placeOf(game, b) })
    expect(types(events)).toContain('boing')
    expect(placeOf(game, d)).not.toBe(placeOf(game, b))
    atRest(game)
    const off = pick(game, c)
    expect(off.find((event) => event.type === 'pop')).toEqual({ type: 'pop', heavy: 1, level: 2 })
    expect(types(off)).toContain('settle')
    expect(game.held).toBe(c)
  })

  it('brings a stack down toy by toy under a big toy', () => {
    const game = begun('three-ways')
    const [a, b] = sized(game, 'small'), big = sized(game, 'big')[0]
    pick(game, a); tap(game, { on: 'place', place: placeOf(game, b) })
    pick(game, big)
    const events = tap(game, { on: 'place', place: placeOf(game, b) })
    expect(types(events)).toContain('teeter')
    expect(events.filter((event) => event.type === 'click').length).toBe(2)
    expect(trayOf(game.world.cycle).every((stack) => stack.length <= 1)).toBe(true)
    atRest(game)
  })

  it('lifts a gobbler by its knob, each in its own way, and lets it drop back into its place', () => {
    const game = begun('three-ways')
    const events = tap(game, { on: 'gobbler', slot: 0 }, 1.6)
    expect(types(events)).toContain('groan')
    expect(types(events)).toContain('lifted')
    const actor = game.crew[0], home = crewSpot(0, game.crew.length)
    expect(game.lifted).toBe(0)
    expect(actor.y).toBeGreaterThan(home.y + (actor.id === 'big' ? 0.2 : 1.5))
    game.advance(3)
    expect(types(game.takeEvents())).toContain('thud')
    expect(game.lifted).toBe(-1)
    expect([actor.x, actor.z]).toEqual([home.x, home.z])
    expect(actor.y).toBeCloseTo(home.y, 9)
    expect(game.claw.load).toBe(0)
  })

  it('lets a lifted gobbler go the moment the finger lands anywhere', () => {
    const game = begun('three-ways')
    tap(game, { on: 'gobbler', slot: 1 }, 1.6)
    expect(game.lifted).toBe(1)
    game.point(aimOn(game, { on: 'place', place: bare(game) }), true)
    expect(game.lifted).toBe(-1)
    game.advance(1.5)
    const home = crewSpot(1, game.crew.length)
    expect(game.crew[1].y).toBeCloseTo(home.y, 5)
  })

  it('rings the bell at the end of the rail, and slides a toy let go there down the rim onto the tray', () => {
    const game = begun('three-ways')
    expect(types(tap(game, { on: 'rail-end', side: 1 }))).toContain('bell')
    const small = sized(game, 'small')[0]
    pick(game, small)
    const events = tap(game, { on: 'rail-end', side: -1 })
    expect(types(events)).toContain('zip')
    expect(placeOf(game, small) % 5).toBeLessThanOrEqual(1)
    atRest(game)
    pick(game, sized(game, 'big')[0])
    expect(types(tap(game, { on: 'rail-end', side: 1 }))).toContain('rim-thud')
    atRest(game)
  })

  it('has the ones who wait duck, catch and heave, and brings every toy back to the tray', () => {
    const game = begun('three-ways')
    expect(game.waiting.length).toBe(2)
    const bonk = tap(game, { on: 'ledge', which: 0 })
    expect(types(bonk)).toContain('cork')
    expect(types(bonk)).toContain('squeak')
    const small = sized(game, 'small')[0], big = sized(game, 'big')[0]
    pick(game, small)
    const lob = tap(game, { on: 'ledge', which: 0 }, 4)
    expect(types(lob)).toContain('slap'); expect(types(lob)).toContain('whistle'); expect(types(lob)).toContain('click')
    pick(game, big)
    const heave = tap(game, { on: 'ledge', which: 1 }, 4)
    expect(types(heave)).toContain('grunt'); expect(types(heave)).toContain('huff')
    atRest(game)
    expect(trayOf(game.world.cycle).flat().length).toBe(game.bodies.length)
  })

  it('has the ledge answer by itself when no one waits on it', () => {
    const game = begun('two-sizes')
    expect(game.waiting.length).toBe(0)
    expect(types(tap(game, { on: 'ledge', which: 0 }))).toContain('gate-rattle')
    pick(game, sized(game, 'small')[0])
    expect(types(tap(game, { on: 'ledge', which: 0 }, 4))).toContain('ping')
    pick(game, sized(game, 'big')[0])
    expect(types(tap(game, { on: 'ledge', which: 0 }, 4))).toContain('scrape')
    atRest(game)
    expect(types(hold(game, { on: 'ledge', which: 0 }))).toContain('gate-creak')
  })

  it('is noticed by whatever the claw waits above, once for each wait', () => {
    const game = begun('three-ways')
    const small = sized(game, 'small')
    expect(types(hold(game, { on: 'place', place: placeOf(game, small[0]) }))).toContain('jaw-hum')
    expect(types(hold(game, { on: 'place', place: bare(game) }))).toContain('jaw-click')
    const gargle = hold(game, { on: 'gobbler', slot: 0 }, 4)
    expect(gargle.filter((event) => event.type === 'gargle').length).toBe(1)
    expect(game.crew[0].openT).toBeGreaterThan(0)
    expect(types(hold(game, { on: 'ledge', which: 0 }))).toContain('stare')
    expect(types(hold(game, { on: 'rail-end', side: 1 }, 3))).toContain('bell-hum')
    game.cancel()
    pick(game, small[1]); tap(game, { on: 'place', place: placeOf(game, small[0]) })
    expect(types(hold(game, { on: 'place', place: placeOf(game, small[0]) }))).toContain('wind')
    // Waiting changes nothing.
    game.cancel(); atRest(game)
  })

  it('swings into the thing the finger wags over: a toy is knocked one place along', () => {
    const game = begun('three-ways')
    const toy = sized(game, 'small')[0], from = placeOf(game, toy), at = placeAt(from)
    game.point({ target: { on: 'place', place: from }, x: at.x, z: at.z }, true)
    game.advance(0.6)
    const heard: GameEvent[] = []
    for (let i = 0; i < 8 && !types(heard).has('knock'); i++) {
      game.point({ target: { on: 'place', place: from }, x: at.x + (i % 2 ? -2.2 : 2.2), z: at.z }, false)
      game.advance(0.12)
      heard.push(...game.takeEvents())
    }
    expect(types(heard)).toContain('knock')
    game.cancel(); game.advance(2)
    expect(placeOf(game, toy)).not.toBe(from)
    atRest(game)
  })

  it('double-dings when the trolley is run hard into the end of the rail', () => {
    const game = begun('three-ways')
    game.point(aimOn(game, { on: 'place', place: 5 }), true); game.advance(1)
    game.takeEvents()
    game.point({ target: { on: 'rail-end', side: 1 }, x: 40, z: 6 }, false); game.advance(1)
    expect(types(game.takeEvents())).toContain('double-ding')
  })

  it('never loses a toy, whatever a small hand does and whenever it does it', () => {
    for (const position of ['three-ways', 'colours-then-kinds', 'two-sizes'] as const) {
      const game = begun(position, 5)
      let s = 77
      const next = (n: number) => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s % n }
      for (let i = 0; i < 160; i++) {
        const targets: Target[] = [{ on: 'place', place: next(10) }, { on: 'place', place: next(10) }, { on: 'gobbler', slot: next(3) }, { on: 'ledge', which: next(2) }, { on: 'rail-end', side: next(2) ? 1 : -1 }]
        // Some taps land long before the last thing has finished.
        tap(game, targets[next(targets.length)], 0.15 + next(20) / 10)
      }
      const toys = game.bodies.length
      expect(toys).toBeGreaterThan(0)
      expect(game.world.cycle.where.length).toBe(toys)
      atRest(game)
      for (const body of game.bodies) expect(Number.isFinite(body.x + body.y + body.z + body.scale)).toBe(true)
      for (const actor of game.crew) expect(Number.isFinite(actor.x + actor.y + actor.z)).toBe(true)
      expect(homeOf(game.world, 0)).toBeGreaterThanOrEqual(0)
    }
  }, 30000)
})
