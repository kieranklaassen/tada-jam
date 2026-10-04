import { describe, expect, it } from 'vitest'
import { MINI } from './belly'
import { STEP } from './claw'
import type { GameEvent } from './events'
import { newGame } from './gameScenes'
import { feed, playCycle, sortAll, tap, watch } from './play'
import { CRATE, placeAt } from './places'
import { toySpan } from './builds'
import { shapeOf } from './gobblers'
import { deckTop, headTop } from './layout'
import { deserializeWorld, serializeWorld } from './save'
import { homeOf, newWorld, startCycle, trayIsClear, type World } from './world'

const types = (events: GameEvent[]) => new Set(events.map((event) => event.type))
const begun = (position: Parameters<typeof startCycle>[0], seed = 7) => newGame({ ...newWorld(null), position, finished: false, crates: [], cycle: startCycle(position, seed, false) } as World)
const snapshot = (world: World) => JSON.stringify(serializeWorld(world))

describe('the game', () => {
  it('opens a first visit on a bare tray with one crate waiting, and nothing starts by itself', () => {
    const game = newGame(newWorld(null, 5))
    game.advance(20)
    expect(game.scene).toBeNull()
    expect(game.bodies.length).toBe(0)
    expect(game.crew.length).toBe(0)
    expect(game.crates.length).toBe(1)
    expect(game.world.finished).toBe(true)
  })

  it('brings the load and its crew in when the claw is put on the crate', () => {
    const game = newGame(newWorld(null, 5))
    const events = [...tap(game, { on: 'ledge', which: 0 }, 1.2), ...watch(game)]
    expect(types(events)).toContain('clank')
    expect(types(events)).toContain('pour')
    expect(game.world.finished).toBe(false)
    expect(game.bodies.length).toBe(4)
    expect(game.crew.map((actor) => actor.id).length).toBe(2)
    expect(game.crates.length).toBe(0)
    for (const body of game.bodies) { expect(body.mode).toBe('resting'); expect(body.scale).toBe(1) }
    for (const actor of game.crew) expect(actor.scale).toBe(1)
    // The first showing of colour has played, once.
    expect(types(events)).toContain('show')
    expect(game.world.shown.colour).toBe(true)
  })

  it('carries a crate over the step only while no one stands there, and pours no toy through the crate', () => {
    for (const position of ['three-colours', 'three-ways-wide'] as const) {
      const game = begun(position)
      playCycle(game)
      // The taller crate where there is one: at the top of the order there is one crate only.
      const which = game.crates.length - 1
      game.point({ target: { on: 'ledge', which }, x: game.crates[which].x, z: -15.2 }, true); game.lift()
      let poured = 0
      for (let t = 0; t < 16; t += STEP * 4) {
        game.advance(STEP * 4)
        const crate = game.crates.find((one) => one.carried)
        if (!crate) continue
        // Over the step, the foot of the crate is lower than the heads of a crew: no one of full size is under it.
        if (crate.z - CRATE.depth / 2 < -1 && crate.z + CRATE.depth / 2 > -8) {
          for (const actor of [...game.crew, ...game.leaving]) {
            if (actor.scale < 0.9 || crate.y > actor.y + headTop(actor.id) + 0.2) continue
            expect(Math.abs(actor.x - crate.x)).toBeGreaterThan(CRATE.width / 2 + shapeOf(actor.id).width / 2)
          }
        }
        // A toy in the air is never inside the box of the crate: its base and its top are both outside.
        for (const body of game.bodies) {
          if (body.mode !== 'flying') continue
          poured++
          const span = toySpan(body.toy), half = (span.depth * body.scale) / 2
          for (const up of [0, span.height * body.scale]) {
            const y = body.y + up - crate.y
            const inside = Math.abs(body.x - crate.x) < CRATE.width / 2 && y > 0 && y < deckTop(crate.which) && body.z - half < crate.z + CRATE.depth / 2 && body.z + half > crate.z - CRATE.depth / 2
            expect(inside).toBe(false)
          }
        }
      }
      expect(poured).toBeGreaterThan(0)
      expect(game.scene).toBeNull()
      for (const body of game.bodies) { expect(body.mode).toBe('resting'); expect(body.scale).toBe(1) }
      for (const actor of game.crew) expect(actor.scale).toBe(1)
    }
  })

  it('always closes on the toy it is put on, and a gobbler swallows a toy of its sort', () => {
    const game = begun('three-colours')
    const where = game.world.cycle.where[0]
    const up = tap(game, { on: 'place', place: (where as { place: number }).place }, 2.2)
    expect(types(up)).toContain('pop')
    expect(game.held).toBe(0)
    const fed = tap(game, { on: 'gobbler', slot: homeOf(game.world, 0) }, 3.2)
    for (const heard of ['let-go', 'catch', 'chomp', 'gulp', 'plink']) expect(types(fed), heard).toContain(heard)
    expect(game.held).toBe(-1)
    expect(game.world.cycle.where[0].at).toBe('belly')
    expect(game.bodies[0].mode).toBe('resting')
    expect(game.bodies[0].scale).toBeCloseTo(MINI)
  })

  it('gives a toy that is not its sort back onto the tray, whole, in the gobbler\'s own way', () => {
    const game = begun('three-colours')
    const events = feed(game, 0, true)
    for (const heard of ['catch', 'chomp', 'hmm', 'wrong', 'click']) expect(types(events), heard).toContain(heard)
    const where = game.world.cycle.where[0]
    expect(where.at).toBe('tray')
    const at = game.spotOf(0), body = game.bodies[0]
    expect(body.mode).toBe('resting')
    expect([body.x, body.z, body.scale]).toEqual([at.x, at.z, 1])
    // On its place, a hair off the lines of the grid.
    const middle = placeAt((where as { place: number }).place)
    expect(Math.hypot(body.x - middle.x, body.z - middle.z)).toBeLessThan(0.05)
    expect(game.world.cycle.misses).toBe(1)
  })

  it('plays the ending on the last gulp, leaves it standing, and starts nothing more by itself', () => {
    const game = begun('two-colours')
    sortAll(game)
    const events = watch(game)
    expect(game.world.finished).toBe(true)
    expect(types(events)).toContain('ring')
    expect(types(events)).toContain('burp')
    expect(types(events)).toContain('slide-in')
    expect(game.crates.length).toBe(2)
    const before = snapshot(game.world)
    game.advance(30)
    expect(game.scene).toBeNull()
    expect(snapshot(game.world)).toBe(before)
    expect(game.crew.length).toBe(2)
    expect(game.takeEvents()).toEqual([])
  })

  it('tips the same toys back out for the next crew when the gate is hooked', () => {
    const game = begun('colours-then-kinds')
    sortAll(game)
    expect(trayIsClear(game.world.cycle)).toBe(true)
    expect(game.world.finished).toBe(false)
    const events = [...tap(game, { on: 'ledge', which: 0 }, 1.2), ...watch(game)]
    expect(types(events)).toContain('tip')
    expect(game.world.cycle.sort).toBe(1)
    expect(game.crew.map((actor) => actor.id)).toEqual(game.world.cycle.crews[1])
    expect(game.waiting).toEqual([])
    for (const body of game.bodies) { expect(body.mode).toBe('resting'); expect(body.scale).toBe(1) }
    // The first showing of kind played as the new crew lined up.
    expect(game.world.shown).toEqual({ colour: false, kind: true, size: false })
  })

  it('saves what a scene changes when the scene starts, and changes nothing more while it plays', () => {
    // The delivery, the tip-out and the ending: each asks for a save at once, with the world already as the scene leaves it.
    const cases: { game: ReturnType<typeof newGame>; cause: () => void }[] = []
    const first = newGame(newWorld(null, 3)); cases.push({ game: first, cause: () => { first.point({ target: { on: 'ledge', which: 0 }, x: 0, z: -12 }, true); first.lift() } })
    const two = begun('colours-then-kinds'); sortAll(two); cases.push({ game: two, cause: () => { two.point({ target: { on: 'ledge', which: 0 }, x: 0, z: -9 }, true); two.lift() } })
    const last = begun('two-colours'); for (const toy of [0, 1, 2]) feed(last, toy)
    cases.push({ game: last, cause: () => { feed(last, 3) } })
    for (const { game, cause } of cases) {
      game.save = 'none'
      cause()
      let atStart = ''
      for (let i = 0; i < 2000 && !game.scene; i++) game.advance(STEP)
      expect(game.scene).not.toBeNull()
      expect(game.save).toBe('now')
      atStart = snapshot(game.world)
      watch(game)
      expect(game.scene).toBeNull()
      expect(snapshot(game.world)).toBe(atStart)
    }
  })

  it('ends a scene on any touch with everything where the scene was taking it, and then answers the touch', () => {
    const game = begun('colours-then-kinds')
    sortAll(game)
    // The claw lifts over the crew, crosses to the gate and hooks it: the scene is then under way.
    tap(game, { on: 'ledge', which: 0 }, 1.6)
    expect(game.scene).not.toBeNull()
    const where = game.world.cycle.where[0] as { place: number }
    game.point({ target: { on: 'place', place: where.place }, ...placeAt(where.place) }, true)
    expect(game.scene).toBeNull()
    for (const body of game.bodies) { expect(body.mode).toBe('resting'); expect(body.scale).toBe(1) }
    for (const actor of game.crew) expect(actor.walk).toBeNull()
    expect(game.leaving).toEqual([])
    // The touch that ended it is an ordinary touch: it picks the toy up.
    game.lift(); game.advance(2.2)
    expect(game.held).toBe(0)
  })

  it('is found as left, whenever it is put away', () => {
    const game = newGame(newWorld(null, 9))
    let checks = 0
    const check = () => {
      // Put away now: what was saved opens as the same world, at rest, with no scene.
      const again = newGame(deserializeWorld(JSON.parse(snapshot(game.world)), null))
      expect(snapshot(again.world)).toBe(snapshot(game.world))
      expect(again.scene).toBeNull()
      expect(again.bodies.length).toBe(game.world.cycle.toys.length)
      again.advance(5)
      expect(snapshot(again.world)).toBe(snapshot(game.world))
      expect(again.takeEvents()).toEqual([])
      checks++
    }
    tap(game, { on: 'ledge', which: 0 }, 0.4); check()
    watch(game); check()
    for (let cycles = 0; cycles < 5; cycles++) {
      for (let guard = 0; guard < 4 && !game.world.finished; guard++) {
        for (;;) {
          const toy = game.world.cycle.where.findIndex((where) => where.at === 'tray')
          if (toy < 0) break
          const where = game.world.cycle.where[toy] as { place: number }
          tap(game, { on: 'place', place: where.place }, 0.5); check()
          game.advance(1.7)
          // Every third toy goes to the wrong gobbler first, once.
          const wrong = toy % 3 === 0 && !game.world.cycle.tried[toy]
          tap(game, { on: 'gobbler', slot: (homeOf(game.world, toy) + (wrong ? 1 : 0)) % game.crew.length }, 0.6); check()
          game.advance(4)
        }
        if (game.world.finished) break
        tap(game, { on: 'ledge', which: 0 }, 0.8); check()
        watch(game); check()
      }
      game.advance(0.5); check()
      watch(game); check()
      tap(game, { on: 'ledge', which: cycles % 2 }, 0.7); check()
      watch(game)
    }
    expect(checks).toBeGreaterThan(60)
  })

  it('can be played from the first position to the last', () => {
    const game = newGame(newWorld(null, 2))
    for (let cycles = 0; cycles < 9; cycles++) {
      tap(game, { on: 'ledge', which: 0 }, 1)
      watch(game)
      playCycle(game)
      expect(game.world.finished).toBe(true)
    }
    expect(game.world.position).toBe('three-ways-wide')
  }, 30000)

  it('lands where the finger was, whenever the finger lifts and however far the cable has swung', () => {
    const landing = (liftAfter: number) => {
      const game = begun('three-colours')
      const toy = 2, from = placeAt((game.world.cycle.where[toy] as { place: number }).place)
      // A fast slide from the far side of the tray to the toy, lifted early or late in the run.
      game.point({ target: { on: 'place', place: 0 }, x: from.x > 0 ? -14 : 14, z: 9 }, true)
      game.advance(0.5)
      game.point({ target: game.world.cycle.where[toy].at === 'tray' ? { on: 'place', place: (game.world.cycle.where[toy] as { place: number }).place } : { on: 'place', place: 0 }, x: from.x + 1.2, z: from.z - 0.8 }, false)
      game.advance(liftAfter)
      const swing = Math.abs(game.claw.swingX)
      game.lift()
      game.advance(3)
      return { held: game.held, swing }
    }
    const early = landing(0.02), mid = landing(0.2), late = landing(1.5)
    expect([early.held, mid.held, late.held]).toEqual([2, 2, 2])
    // The early lift really was made in mid-run, with the cable swung out.
    expect(early.swing + mid.swing).toBeGreaterThan(0.05)
  })

  it('plays the same touches the same way every time', () => {
    const play = () => {
      const game = begun('colours-then-kinds', 11)
      const events = [...feed(game, 0), ...feed(game, 1, true), ...tap(game, { on: 'gobbler', slot: 0 }, 2.5), ...tap(game, { on: 'rail-end', side: 1 }, 2)]
      return { events, world: snapshot(game.world), bodies: game.bodies.map((body) => [body.x, body.y, body.z, body.scale]), claw: game.claw }
    }
    expect(play()).toEqual(play())
  })
})
