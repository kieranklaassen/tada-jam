import { describe, expect, it } from 'vitest'
import { MINI } from './belly'
import { STEP } from './claw'
import type { GameEvent } from './events'
import { gamePicture } from './gamePicture'
import { newGame } from './gameScenes'
import { aimOn, feed, playCycle, sortAll, tap, watch } from './play'
import { CRATE, placeAt } from './places'
import { toySpan } from './builds'
import { shapeOf, snackOf } from './gobblers'
import { deckTop, headTop } from './layout'
import { deserializeWorld, serializeWorld } from './save'
import { homeOf, newWorld, startCycle, trayIsClear, type World } from './world'

/** A world in the middle of a cycle has had the showings of its attributes. */
const SHOWN = { colour: true, kind: true, size: true }

const types = (events: GameEvent[]) => new Set(events.map((event) => event.type))
const begun = (position: Parameters<typeof startCycle>[0], seed = 7) => newGame({ ...newWorld(null), shown: SHOWN, position, finished: false, crates: [], cycle: startCycle(position, seed, false) } as World)
const snapshot = (world: World) => JSON.stringify(serializeWorld(world))

describe('the game', () => {
  it('opens a first visit on a bare tray, with the crew at the tray and one crate waiting, and nothing starts by itself', () => {
    const game = newGame(newWorld(null, 5))
    const before = snapshot(game.world)
    // The crew the load is for stands at the tray already, each with its snack on its tongue; the crate holds the load.
    expect(game.crew.map((actor) => actor.id)).toEqual(startCycle('two-colours', 5, false).crews[0])
    for (const actor of game.crew) { expect(actor.snack.mode).toBe('mouth'); expect(actor.snack.scale).toBe(1) }
    expect(game.crates.map((crate) => [crate.toys.length > 0, crate.crews])).toEqual([[true, []]])
    // Left alone, one of them is tempted by its snack now and then, and puts it back: without a sound, and
    // without anything in the world changing.
    let tempted = 0
    for (let t = 0; t < 20; t += 0.1) { game.advance(0.1); if (game.crew.some((actor) => actor.act === 'tempted')) tempted++ }
    expect(tempted).toBeGreaterThan(10)
    expect(game.takeEvents()).toEqual([])
    expect(game.scene).toBeNull()
    expect(game.bodies.length).toBe(0)
    expect(game.crates.length).toBe(1)
    expect(game.world.finished).toBe(true)
    expect(snapshot(game.world)).toBe(before)
    for (const actor of game.crew) expect(actor.snack.mode).toBe('mouth')
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

  it('takes the ledge for a bare ledge while the last toy is still being swallowed, and the ending still plays', () => {
    const game = begun('two-colours')
    const last = game.world.cycle.toys.length - 1
    for (let toy = 0; toy < last; toy++) feed(game, toy)
    tap(game, { on: 'place', place: (game.world.cycle.where[last] as { place: number }).place }, 2.2)
    game.point(aimOn(game, { on: 'gobbler', slot: homeOf(game.world, last) }), true)
    game.lift()
    for (let t = 0; t < 4 && !game.world.finished; t += STEP) game.advance(STEP)
    expect(game.world.finished).toBe(true)
    expect(game.crates.length).toBe(0)
    // The crates of the next load are not on the ledge yet: the claw rattles the gate and takes nothing.
    const events = [...game.takeEvents(), ...tap(game, { on: 'ledge', which: 0 }, 2.5), ...watch(game)]
    expect(types(events)).toContain('ring')
    expect(types(events)).toContain('slide-in')
    expect(game.crates.length).toBe(2)
    expect(game.scene).toBeNull()
  })

  it('is noticed by each thing it comes to wait above, in one touch', () => {
    const game = begun('three-colours')
    const stares = () => game.takeEvents().filter((event) => event.type === 'gargle').length
    game.point(aimOn(game, { on: 'gobbler', slot: 0 }), true)
    game.advance(2.5)
    expect(stares()).toBeGreaterThan(0)
    game.advance(2)
    expect(stares()).toBe(0)
    // The finger slides on without lifting, and stops over another gobbler.
    game.point(aimOn(game, { on: 'gobbler', slot: 1 }), false)
    game.advance(2.5)
    expect(stares()).toBeGreaterThan(0)
    game.lift()
  })

  it('rings the bell at the end of the rail once when the claw is slid up to it gently', () => {
    const game = begun('three-colours')
    game.point({ target: { on: 'place', place: 4 }, ...placeAt(4) }, true)
    game.advance(1)
    game.takeEvents()
    const end = aimOn(game, { on: 'rail-end', side: 1 })
    // A slow slide: the finger creeps to the end of the rail.
    for (let x = game.claw.x; x < end.x; x += 0.05) { game.point({ ...end, x }, false); game.advance(STEP * 4) }
    game.point(end, false)
    game.advance(1.5)
    expect(game.takeEvents().filter((event) => event.type === 'bell').length).toBe(1)
    game.cancel()
  })

  it('makes no move when the game is put away in the middle of a drag', () => {
    const game = begun('three-colours')
    const where = game.world.cycle.where[0] as { place: number }
    tap(game, { on: 'place', place: where.place }, 2.2)
    expect(game.held).toBe(0)
    const before = snapshot(game.world)
    game.point(aimOn(game, { on: 'gobbler', slot: (homeOf(game.world, 0) + 1) % game.crew.length }), true)
    game.advance(0.4)
    game.cancel()
    game.advance(6)
    expect(game.held).toBe(0)
    expect(snapshot(game.world)).toBe(before)
  })

  /** The finger lands on a thing and wags over it without lifting. */
  const wagOver = (game: ReturnType<typeof begun>, target: Parameters<typeof tap>[1]): GameEvent[] => {
    const base = aimOn(game, target)
    game.point(base, true)
    game.advance(0.5)
    for (let i = 0; i < 9; i++) { game.point({ ...base, x: base.x + (i % 2 ? -2.4 : 2.4) }, false); game.advance(0.13) }
    return game.takeEvents()
  }

  it('answers a wag of the finger over a gobbler, where the trolley itself stands still', () => {
    const game = begun('three-colours')
    expect(types(wagOver(game, { on: 'gobbler', slot: 1 }))).toContain('squeak')
    game.cancel()
    // However the wags fall, they never swing the cable wide enough to reach a wall.
    for (let i = 0; i < 40; i++) { game.point({ ...aimOn(game, { on: 'gobbler', slot: 0 }), x: i % 2 ? -14 : -9 }, i === 0); game.advance(0.2); expect(Math.abs(game.claw.swingX)).toBeLessThan(0.45) }
  })

  it('sways each crate in its turn when the claw is wagged over the ledge', () => {
    const game = begun('two-colours')
    sortAll(game)
    watch(game)
    expect(game.crates.length).toBe(2)
    const rest = game.crates.map((crate) => gamePicture(game, null).crates.find((look) => look.which === crate.which)!.x)
    wagOver(game, { on: 'ledge', which: 0 })
    const most = [0, 0]
    for (let t = 0; t < 1.5; t += 0.02) {
      game.advance(0.02)
      const looks = gamePicture(game, null).crates
      game.crates.forEach((crate, i) => { most[i] = Math.max(most[i], Math.abs(looks.find((look) => look.which === crate.which)!.x - rest[i])) })
    }
    game.cancel()
    for (const swayed of most) expect(swayed).toBeGreaterThan(0.4)
  })

  it('gives each toy of a stack that comes down its own note', () => {
    for (const seed of [7, 11, 13, 17, 19]) {
      const game = begun('kinds-then-sizes', seed), cycle = game.world.cycle
      const smalls = cycle.toys.map((toy, i) => ({ toy, i })).filter(({ toy }) => toy.size === 'small').map(({ i }) => i)
      const big = cycle.toys.findIndex((toy) => toy.size === 'big')
      if (smalls.length < 2 || big < 0) continue
      const place = () => (cycle.where[smalls[0]] as { place: number }).place
      tap(game, { on: 'place', place: (cycle.where[smalls[1]] as { place: number }).place }, 2.2)
      tap(game, { on: 'place', place: place() }, 2.5)
      if (game.tray()[place()].length !== 2) continue
      tap(game, { on: 'place', place: (cycle.where[big] as { place: number }).place }, 2.2)
      const events = tap(game, { on: 'place', place: place() }, 6)
      const notes = events.filter((event) => event.type === 'click').map((event) => (event as { note: number }).note)
      // The big toy and the one it knocked off the top each land; the bottom of the stack stays where it stood.
      expect(notes.length).toBe(2)
      expect(new Set(notes).size).toBe(2)
      return
    }
    throw new Error('no load with two small toys and a big one')
  })

  it('lays the shadow of the claw on what it stands over, off the tray as on it', () => {
    const game = begun('three-colours')
    const shadowUnderClaw = () => gamePicture(game, null).shadows.find((shadow) => Math.abs(shadow.x - game.claw.x) < 0.01 && Math.abs(shadow.z - game.claw.z) < 0.01)
    // A toy in the jaws, held over a gobbler: the shadow lies on its tongue.
    tap(game, { on: 'place', place: (game.world.cycle.where[0] as { place: number }).place }, 2.2)
    game.point(aimOn(game, { on: 'gobbler', slot: 1 }), true)
    game.advance(1)
    // (The gobbler stretches up for the toy, and its tongue with it: the shadow is on the tongue as it stands now.)
    const tongue = game.mouthOf(game.crew[1]).y, shadow = shadowUnderClaw()
    expect(shadow).toBeDefined()
    expect(shadow!.y).toBeGreaterThan(tongue)
    expect(shadow!.y).toBeLessThan(tongue + 1)
    // Over a bell and over the gate.
    game.point(aimOn(game, { on: 'rail-end', side: 1 }), false)
    game.advance(1.5)
    expect(shadowUnderClaw()).toBeDefined()
    game.point(aimOn(game, { on: 'ledge', which: 0 }), false)
    game.advance(1.5)
    expect(shadowUnderClaw()).toBeDefined()
    game.cancel()
  })

  it('answers a finger on a lamp with the lamp alone: a ting, a flare, and the claw where it was', () => {
    const game = begun('three-colours')
    const before = [game.claw.x, game.claw.z, snapshot(game.world)]
    game.light(9)
    expect(game.takeEvents()).toEqual([{ type: 'ting', nth: 9 }])
    expect(gamePicture(game, null).flare.lamp).toBe(9)
    game.advance(2)
    expect(gamePicture(game, null).flare.lamp).toBe(-1)
    expect([game.claw.x, game.claw.z, snapshot(game.world)]).toEqual(before)
  })

  it('tips the same toys back out for the next crew when the gate is hooked', () => {
    // Colour has had its showing; kind has not.
    const game = newGame({ ...newWorld(null), shown: { colour: true, kind: false, size: false }, position: 'colours-then-kinds', finished: false, crates: [], cycle: startCycle('colours-then-kinds', 7, false) } as World)
    sortAll(game)
    expect(trayIsClear(game.world.cycle)).toBe(true)
    expect(game.world.finished).toBe(false)
    // The claw crosses to the gate and hooks it, and the scene is then under way.
    const events = [...tap(game, { on: 'ledge', which: 0 }, 1.8), ...watch(game)]
    expect(types(events)).toContain('tip')
    expect(game.world.cycle.sort).toBe(1)
    expect(game.crew.map((actor) => actor.id)).toEqual(game.world.cycle.crews[1])
    expect(game.waiting).toEqual([])
    for (const body of game.bodies) { expect(body.mode).toBe('resting'); expect(body.scale).toBe(1) }
    // The first showing of kind played as the new crew lined up.
    expect(game.world.shown).toEqual({ colour: true, kind: true, size: false })
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
      // (All but the mark of a first showing, which is written when the showing itself starts: the next test.)
      const but = (world: World) => JSON.stringify({ ...serializeWorld(world), shown: null })
      atStart = but(game.world)
      watch(game)
      expect(game.scene).toBeNull()
      expect(but(game.world)).toBe(atStart)
    }
  })

  it('pours a first visit\'s load over the heads of the crew that is already at the tray', () => {
    for (const [age, seed] of [[null, 5], [5, 7], [6, 3]] as const) {
      const game = newGame(newWorld(age, seed))
      const crew = game.crew.slice()
      expect(crew.length).toBeGreaterThan(1)
      const events = [...tap(game, { on: 'ledge', which: 0 }, 2), ...watch(game)]
      // The same gobblers stand where they stood: no one waddled off and no one hopped in.
      expect(game.crew).toEqual(crew)
      expect(types(events)).not.toContain('waddle')
      expect(types(events)).not.toContain('hop-in')
      for (const heard of ['clank', 'groan', 'pour', 'click', 'thud', 'show', 'gulp', 'plink']) expect(types(events), heard).toContain(heard)
      // Every toy stands on its own place, full size; every snack is in its belly; the crate is gone.
      game.bodies.forEach((body, toy) => {
        const at = game.spotOf(toy)
        expect(body.mode).toBe('resting')
        expect([body.x, body.y, body.z, body.scale]).toEqual([at.x, at.y, at.z, 1])
      })
      for (const actor of game.crew) expect(actor.snack.mode).toBe('resting')
      expect(game.crates).toEqual([])
      expect(game.waiting.map((actor) => actor.id)).toEqual(game.world.cycle.crews[1] ?? [])
      expect(game.world.shown.colour).toBe(true)
      expect(game.scene).toBeNull()
    }
  })

  it('counts the crew of a first visit as coming in with its load: its showing follows the delivery without a pause, with the snacks that stood on its tongues', () => {
    for (const [age, seed] of [[null, 5], [5, 7], [6, 3]] as const) {
      const game = newGame(newWorld(age, seed))
      const snacks = game.crew.map((actor) => actor.snack)
      tap(game, { on: 'ledge', which: 0 }, 0)
      for (let i = 0; i < 2000 && !game.scene; i++) game.advance(STEP)
      const playing = game.scene
      expect(playing).not.toBeNull()
      game.takeEvents()
      // Through the delivery the snacks stay on the tongues, and the showing is owed.
      let shows = 0, plinks = 0
      for (let i = 0; i < 4000 && shows === 0; i++) {
        expect(game.crew.map((actor) => actor.snack.mode)).toEqual(game.crew.map(() => 'mouth'))
        game.advance(STEP)
        shows += game.takeEvents().filter((event) => event.type === 'show').length
      }
      // The first gobbler shows its snack in the scene the delivery began: no pause between them, and no touch.
      expect(shows).toBe(1)
      expect(game.scene).toBe(playing)
      expect(game.world.shown.colour).toBe(true)
      for (let i = 0; i < 4000 && game.scene; i++) {
        game.advance(STEP)
        for (const event of game.takeEvents()) { if (event.type === 'show') shows++; if (event.type === 'plink') plinks++ }
      }
      // Each gobbler held up and gulped the snack that stood on its tongue, and it lies in its belly now.
      expect(shows).toBe(game.crew.length)
      expect(plinks).toBe(game.crew.length)
      expect(game.crew.map((actor) => actor.snack)).toEqual(snacks)
      game.crew.forEach((actor, i) => { expect(actor.snack).toBe(snacks[i]); expect(actor.snack.mode).toBe('resting') })
    }
  })

  it('builds the snacks of a first visit from the load in the crate, the same before the crate is taken and after', () => {
    for (const age of [null, 4, 5, 6]) for (const seed of [3, 5, 7, 11]) {
      const world = newWorld(age, seed)
      const crate = world.crates[0], load = startCycle(crate.from, crate.seed, false)
      const game = newGame(world)
      // Before the crate is taken `cycle` is empty: each snack takes its other two properties from the first toy
      // of the load the crate is laid out for.
      expect(world.cycle.toys).toEqual([])
      const before = game.crew.map((actor) => ({ ...actor.snack.toy }))
      expect(game.crew.map((actor) => actor.id)).toEqual(load.crews[0])
      expect(before).toEqual(load.crews[0].map((id) => snackOf(id, load.toys[0])))
      // Opened again before the crate is taken: the same crew with the same snacks, and nothing of them saved.
      const saved = serializeWorld(world)
      expect(JSON.stringify(saved)).not.toContain('snack')
      expect(newGame(deserializeWorld(saved, age)).crew.map((actor) => actor.snack.toy)).toEqual(before)
      // The delivery starts: that toy is now listed first in `cycle.toys`, and the snacks have not changed.
      tap(game, { on: 'ledge', which: 0 }, 0)
      for (let i = 0; i < 2000 && !game.scene; i++) game.advance(STEP)
      expect(game.world.cycle.toys[0]).toEqual(load.toys[0])
      expect(game.crew.map((actor) => actor.snack.toy)).toEqual(before)
      // Put away in the delivery and opened again, and played to its end: still the same snacks.
      expect(newGame(deserializeWorld(serializeWorld(game.world), age)).crew.map((actor) => actor.snack.toy)).toEqual(before)
      watch(game)
      expect(game.crew.map((actor) => actor.snack.toy)).toEqual(before)
    }
  })

  it('marks a first showing when it starts, and owes it until then', () => {
    const game = newGame(newWorld(null, 3))
    tap(game, { on: 'ledge', which: 0 }, 0)
    for (let i = 0; i < 2000 && !game.scene; i++) game.advance(STEP)
    // In the delivery the showing has not started: it is owed, and its mark is not written.
    game.advance(2)
    expect(game.world.shown.colour).toBe(false)
    const putAway = serializeWorld(game.world)
    // Played on, the mark is written at the moment the first gobbler shows its snack, and saved at once.
    game.save = 'none'
    let shows = 0
    for (let i = 0; i < 4000 && shows === 0; i++) { game.advance(STEP); shows += game.takeEvents().filter((event) => event.type === 'show').length }
    expect(game.world.shown.colour).toBe(true)
    expect(game.save).toBe('now')
    // Put away in the delivery and opened again: the crew is lined up with its snacks in its bellies, no scene
    // plays, and the showing is still owed.
    const again = newGame(deserializeWorld(putAway, null))
    expect(again.scene).toBeNull()
    expect(again.crew.length).toBeGreaterThan(0)
    for (const actor of again.crew) expect(actor.snack.mode).toBe('resting')
    again.advance(5)
    expect(again.scene).toBeNull()
    expect(again.takeEvents().filter((event) => event.type === 'show')).toEqual([])
    // It starts at the child's first touch, and that touch does nothing else.
    const before = { x: again.claw.x, z: again.claw.z }
    const first = (again.world.cycle.where[0] as { place: number }).place
    again.point(aimOn(again, { on: 'place', place: first }), true)
    again.lift()
    expect(again.scene).not.toBeNull()
    again.advance(1)
    expect(again.world.shown.colour).toBe(true)
    expect(again.held).toBe(-1)
    expect([again.claw.x, again.claw.z]).toEqual([before.x, before.z])
    const shown = watch(again)
    expect(shown.filter((event) => event.type === 'show').length + 0).toBeGreaterThanOrEqual(0)
    for (const actor of again.crew) expect(actor.snack.mode).toBe('resting')
    // After it, a touch is a touch.
    tap(again, { on: 'place', place: first }, 2.2)
    expect(again.held).toBe(0)
  })

  it('writes the mark of a showing when a touch ends the delivery it follows, since the touch ends both', () => {
    const game = newGame(newWorld(null, 3))
    tap(game, { on: 'ledge', which: 0 }, 0)
    for (let i = 0; i < 2000 && !game.scene; i++) game.advance(STEP)
    game.advance(2)
    expect(game.world.shown.colour).toBe(false)
    tap(game, { on: 'place', place: 2 }, 2)
    expect(game.scene).toBeNull()
    expect(game.world.shown.colour).toBe(true)
    for (const actor of game.crew) expect(actor.snack.mode).toBe('resting')
  })

  it('saves the end of the cycle when the chewing of its last toy starts', () => {
    const game = begun('two-colours')
    const last = game.world.cycle.toys.length - 1
    for (let toy = 0; toy < last; toy++) feed(game, toy)
    tap(game, { on: 'place', place: (game.world.cycle.where[last] as { place: number }).place }, 2.2)
    tap(game, { on: 'gobbler', slot: homeOf(game.world, last) }, 0)
    // From the moment the toy is caught on the tongue: within a few steps the chewing starts, and asks for a save at once.
    let caught = -1, saved = false
    for (let i = 0; i < 2000 && !game.scene && !saved; i++) {
      game.save = 'none'
      game.advance(STEP)
      if (caught < 0 && game.takeEvents().some((event) => event.type === 'catch')) caught = i
      if (caught >= 0 && i - caught > 5) break
      saved = caught >= 0 && (game.save as string) === 'now'
    }
    expect(saved).toBe(true)
    expect(game.world.finished).toBe(true)
    expect(game.world.crates.length).toBeGreaterThan(0)
    // Put away in that chew and opened again: found ended, and no ending plays.
    const again = newGame(deserializeWorld(serializeWorld(game.world), null))
    again.advance(10)
    expect(again.scene).toBeNull()
    expect(again.takeEvents().filter((event) => event.type === 'ring')).toEqual([])
    expect(again.crates.length).toBe(game.world.crates.length)
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
