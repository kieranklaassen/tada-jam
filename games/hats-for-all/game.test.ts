import { appendFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { waitingLead } from './cycle'
import { Game, waits, type LetGo, type Target } from './game'
import { ACTIONS, GRID, OBJECTS, type Action, type ObjectKind } from './grid'
import { placeOf, type World } from './rules'
import { worldOf, type Saved } from './save'
import { ROW_Z, spotX } from './stage'

import { LEFT_ALONE_S, beginNext } from './cycle'
import { LADDER } from './config'
import { layCrew } from './layout'
import { bareSpots, hatsInTile, ready } from './rules'
import { deserialize, freshSave, serialize } from './save'
import { sceneLength } from './scene'
import { changeShow, firstShowing, nextCrewShow, paradeShow } from './shows'
import { ARCH, BODY, CREATURE_DEPTH, HAND, TILE_DEPTH } from './sizes'
import { ARCH_X, ARCH_Z, TILE_Z } from './stage'
import { tileWidth } from './tile'
import { MOST } from './kinds'
const FRAME = 1 / 60

/** A save around a world, in the middle of a cycle. */
function saveOf(world: World, position = 'spare-hat'): Saved {
  return { v: 1, position, finished: false, seed: 5, shown: true, ...world }
}

/**
 * One world that holds every object of the grid at once: two bare creatures (Bop on spot 0, Wig on spot 3), one with
 * one hat (Lanky, hat 0), one with a tower of two (Flop, hats 1 and 2), a loose hat (hat 3) and a hat in the tile (hat 4).
 */
function everything(): World {
  return {
    crew: [{ kind: 'bop', spot: 0, hats: [] }, { kind: 'lanky', spot: 1, hats: [0] }, { kind: 'flop', spot: 2, hats: [1, 2] }, { kind: 'wig', spot: 3, hats: [] }],
    tile: ['cone', 'dome', 'brim', 'cone', 'dome'], loose: [{ hat: 3, spot: 4 }], changes: [], guest: null, leaver: null, slips: 0,
  }
}

/** The same with no tower: Flop wears one hat, so a hat can be put on a head that has exactly one. */
function noTower(): World {
  return { ...everything(), crew: [{ kind: 'bop', spot: 0, hats: [] }, { kind: 'lanky', spot: 1, hats: [0] }, { kind: 'flop', spot: 2, hats: [1] }, { kind: 'wig', spot: 3, hats: [] }] }
}

const worldFor = (object: ObjectKind, action: Action): World => (object === 'hat-on-head' && action === 'to-hatted-head' ? noTower() : everything())

const SUBJECT: Record<ObjectKind, Target> = {
  'hat-in-tile': { type: 'hat', hat: 4 }, 'hat-on-head': { type: 'hat', hat: 0 }, 'loose-hat': { type: 'hat', hat: 3 }, 'tower-top': { type: 'hat', hat: 2 },
  'bare-creature': { type: 'creature', who: 'bop' }, 'hatted-creature': { type: 'creature', who: 'lanky' },
}

function letGoFor(object: ObjectKind, action: Action): LetGo {
  if (action === 'to-bare-head') return { on: 'creature', who: object === 'bare-creature' ? 'wig' : 'bop' }
  if (action === 'to-hatted-head') return { on: 'creature', who: object === 'hat-on-head' || object === 'hatted-creature' ? 'flop' : 'lanky' }
  if (action === 'to-tile') return { on: 'tile' }
  return { on: 'floor', x: spotX(object === 'loose-hat' ? 2 : 4), z: 1 }
}

/** Steps the game and gathers the names of the voices in the order they sound. */
function run(game: Game, seconds: number, heard: { at: number; name: string }[] = [], each?: () => void): string[] {
  for (let frame = 0; frame < Math.round(seconds * 60); frame++) {
    game.step(FRAME)
    for (const cue of game.play.cues) heard.push({ at: game.play.time + cue.delay, name: cue.name })
    game.play.cues.length = 0
    each?.()
  }
  return heard.sort((a, b) => a.at - b.at).map((cue) => cue.name)
}

function playCell(object: ObjectKind, action: Action): { game: Game; heard: string[] } {
  const game = new Game(saveOf(worldFor(object, action))), heard: { at: number; name: string }[] = []
  game.press(SUBJECT[object])
  run(game, 0.1, heard)
  if (action === 'tap') game.tap()
  else {
    game.dragStart()
    game.dragTo(0, 2, 1, 0.5, 0.2)
    run(game, 0.2, heard)
    game.letGo(letGoFor(object, action))
  }
  return { game, heard: run(game, 3.5, heard) }
}

/** The stage shows what the save holds: every hat where the world has it, and exactly the crew on the mat, plus whoever waits. */
function expectStageIsWorld(game: Game): void {
  const world = worldOf(game.saved), expected = world.crew.map((creature) => creature.kind as string)
  if (game.saved.finished) expected.push(waits(waitingLead(game.saved)))
  expect([...game.play.cast].sort()).toEqual(expected.sort())
  expect(game.play.hatCount).toBe(world.tile.length)
  world.tile.forEach((_, hat) => {
    const place = placeOf(world, hat), seen = game.play.seen(hat)
    expect(seen.at).toBe(place.at)
    if (place.at === 'head' && seen.at === 'head') expect([seen.who, seen.level]).toEqual([world.crew.find((creature) => creature.spot === place.spot)!.kind, place.level])
    if (place.at === 'loose' && seen.at === 'loose') expect(seen.spot).toBe(place.spot)
  })
  for (const creature of world.crew) {
    const pose = game.play.actorPose(creature.kind, {} as never)
    expect(pose.x).toBeCloseTo(spotX(creature.spot), 6)
    expect(pose.z).toBeCloseTo(ROW_Z, 6)
  }
}

describe('every cell of the grid', () => {
  it.each(OBJECTS.flatMap((object) => ACTIONS.map((action) => [object, action] as const)))('%s, %s: is seen and heard as the grid has it', (object, action) => {
    const { game, heard } = playCell(object, action)
    expect(game.seen).toContain(GRID[object][action].seen)
    if (process.env.DUMP_GRID) appendFileSync(process.env.DUMP_GRID, JSON.stringify([object, action, heard]) + '\n')
    expect(heard).toEqual(GRID[object][action].heard)
    // The world moved, or did not, as the cell says; and nothing is left in the air.
    const moved = JSON.stringify(worldOf(game.saved)) !== JSON.stringify(worldFor(object, action))
    expect(moved).toBe(GRID[object][action].moves)
    expectStageIsWorld(game)
  })
})

// --- Scenes and whole cycles -------------------------------------------------


const ALONE = LEFT_ALONE_S + 0.1
const putAway = (saved: Saved): Saved => deserialize(JSON.parse(JSON.stringify(serialize(saved))))

/** A cycle about to begin at a position: its crew laid out, bare. */
function at(position: string, seed = 77): Saved {
  return { v: 1, position, finished: false, seed, shown: true, ...layCrew(position, seed).world }
}

function tap(game: Game, target: Target): void {
  game.press(target)
  game.tap()
}

/** One tap of a child who looks: a tower's top, a loose hat, or a bare creature while the tile has a hat. */
function carefulTap(game: Game): boolean {
  const world = worldOf(game.saved), tower = world.crew.find((creature) => creature.hats.length > 1), bare = bareSpots(world)
  if (tower) tap(game, { type: 'hat', hat: tower.hats[tower.hats.length - 1] })
  else if (world.loose.length > 0) tap(game, { type: 'hat', hat: world.loose[0].hat })
  else if (bare.length > 0 && hatsInTile(world).length > 0) tap(game, { type: 'creature', who: world.crew.find((creature) => creature.spot === bare[0])!.kind })
  else return false
  return true
}

/** Plays a cycle to its parade as a child who looks would, letting each scene play out. `each` runs every frame. */
function playToParade(game: Game, each?: () => void): void {
  for (let guard = 0; guard < 40 && !game.saved.finished; guard++) {
    if (!carefulTap(game)) run(game, ALONE, [], each)
    run(game, 0.7, [], each)
    while (game.sceneRunning) run(game, 0.5, [], each)
  }
  while (game.sceneRunning) run(game, 0.5, [], each)
}

describe('the first showing', () => {
  it('plays once, saves its mark and its outcome when it starts, and shows the hat going from the tile to the leader', () => {
    const game = new Game(freshSave(null)), lead = game.saved.crew[0].kind
    expect(game.sceneRunning).toBe(false)
    game.begin()
    expect(game.saved.shown).toBe(true)
    expect(game.dirty).toBe('now')
    expect(game.saved.crew[0].hats).toEqual([0])
    run(game, 0.3)
    expect(game.play.seen(0)).toEqual({ at: 'tile' })
    expect(game.sceneRunning).toBe(true)
    let walked = false
    run(game, 9.7, [], () => { walked ||= game.play.walking(lead) })
    expect(walked).toBe(true)
    expect(game.sceneRunning).toBe(false)
    expect(game.play.seen(0)).toEqual({ at: 'head', who: lead, level: 0 })
    expectStageIsWorld(game)
    expect(game.seen.filter((name) => name === 'the-first-showing').length).toBe(1)
  })

  it('never plays again: not on the next load, and not when the game is put away in the middle of it', () => {
    const game = new Game(freshSave(null))
    game.begin()
    run(game, 1.5)
    const back = new Game(putAway(game.saved))
    back.begin()
    expect(back.sceneRunning).toBe(false)
    expect(back.seen).toEqual([])
    expectStageIsWorld(back)
  })

  it('gives way to a touch, which is then an ordinary touch', () => {
    const game = new Game(freshSave(null))
    game.begin()
    run(game, 1.2)
    const bare = game.saved.crew[1].kind
    tap(game, { type: 'creature', who: bare })
    expect(game.sceneRunning).toBe(false)
    expect(game.saved.crew[1].hats.length).toBe(1)
    run(game, 2)
    expectStageIsWorld(game)
  })
})

describe('every scene', () => {
  it('lasts between 4 and 10 seconds', () => {
    expect(sceneLength(firstShowing(new Game(freshSave(null))).beats)).toBeGreaterThanOrEqual(4)
    expect(sceneLength(firstShowing(new Game(freshSave(4))).beats)).toBeLessThanOrEqual(10)
    for (const position of LADDER) for (const seed of [3, 77, 1234, 99999]) {
      const game = new Game(at(position, seed)), lengths: [string, number][] = []
      for (let guard = 0; guard < 40 && !game.saved.finished; guard++) {
        if (!carefulTap(game)) {
          // Nothing to tap: whatever falls due after the wait is a scene. Measure it before it starts.
          const world = worldOf(game.saved)
          if (world.changes.length > 0) lengths.push([`${position} change`, sceneLength(changeShow(game).beats)])
          else if (ready(world)) lengths.push([`${position} parade`, sceneLength(paradeShow(game).beats)])
          run(game, ALONE)
        }
        run(game, 0.7)
        while (game.sceneRunning) run(game, 0.5)
      }
      lengths.push([`${position} next crew`, sceneLength(nextCrewShow(game).beats)])
      expect(lengths.length).toBeGreaterThanOrEqual(2)
      for (const [name, length] of lengths) {
        expect(length, name).toBeGreaterThanOrEqual(4)
        expect(length, name).toBeLessThanOrEqual(10)
      }
    }
  })

  it('saves its outcome when it starts: a put-away at any frame of it finds the world as the scene leaves it, and nothing replays', () => {
    for (const position of ['one-leaves', 'one-comes', 'one-short', 'comes-and-goes']) {
      const game = new Game(at(position))
      let checked = 0
      playToParade(game, () => {
        if (!game.sceneRunning) return
        // In the middle of a scene: what is saved is already the end of it.
        const back = new Game(putAway(game.saved))
        back.begin()
        expect(back.sceneRunning).toBe(false)
        expect(back.seen).toEqual([])
        expectStageIsWorld(back)
        checked++
      })
      expect(checked).toBeGreaterThan(100)
      expect(game.saved.finished).toBe(true)
      expect(game.seen).toContain('the-parade')
      expect(game.seen.some((name) => name === 'one-comes' || name === 'one-leaves')).toBe(true)
      run(game, 1)
      expectStageIsWorld(game)
    }
  })

  it('is saved at once and not at the throttle', () => {
    const game = new Game(at('one-comes'))
    while (carefulTap(game)) run(game, 0.7)
    game.dirty = null
    run(game, ALONE)
    expect(game.seen).toContain('one-comes')
    expect(game.dirty).toBe('now')
    expect(game.saved.changes).toEqual([])
  })

  it('gives way to a touch at any moment and leaves the stage as the save has it', () => {
    for (const position of ['one-leaves', 'one-comes']) for (const when of [0.1, 0.6, 1.3, 2.5, 4]) {
      const game = new Game(at(position))
      while (carefulTap(game)) run(game, 0.7)
      run(game, ALONE + when)
      expect(game.sceneRunning).toBe(true)
      game.press({ type: 'floor', x: 0, z: 6 })
      expect(game.sceneRunning).toBe(false)
      expectStageIsWorld(game)
      game.pressEnd()
    }
  })
})

describe('the parade', () => {
  it('starts only after the crew has been left alone, judges the cycle once, and ends with the next crew\'s first in the arch', () => {
    const game = new Game(at('three-heads'))
    while (carefulTap(game)) run(game, 0.5)
    expect(ready(worldOf(game.saved))).toBe(true)
    expect(game.saved.finished).toBe(false)
    run(game, ALONE)
    expect(game.saved.finished).toBe(true)
    expect(game.saved.position).toBe('one-leaves')
    expect(game.dirty).toBe('now')
    let marched = false
    run(game, 10, [], () => { marched ||= game.saved.crew.every((creature) => game.play.walking(creature.kind)) })
    expect(marched).toBe(true)
    expect(game.sceneRunning).toBe(false)
    expectStageIsWorld(game)
    // Left alone, nothing new starts.
    run(game, 20)
    expect(game.seen.filter((name) => name === 'the-parade').length).toBe(1)
    expect(game.saved.finished).toBe(true)
  })

  it('plays again each time a finished crew is unsettled and set right, and the position does not move twice', () => {
    const game = new Game(at('two-heads'))
    playToParade(game)
    const position = game.saved.position
    tap(game, { type: 'hat', hat: game.saved.crew[0].hats[0] })
    run(game, 5)
    expect(game.seen.filter((name) => name === 'the-parade').length).toBe(1)
    carefulTap(game)
    run(game, ALONE + 0.5)
    expect(game.seen.filter((name) => name === 'the-parade').length).toBe(2)
    expect(game.saved.position).toBe(position)
    while (game.sceneRunning) run(game, 0.5)
    expectStageIsWorld(game)
  })

  it('does not replay on load', () => {
    const game = new Game(at('two-heads'))
    playToParade(game)
    const back = new Game(putAway(game.saved))
    back.begin()
    run(back, 12)
    expect(back.seen).toEqual([])
    expectStageIsWorld(back)
  })
})

describe('the next crew', () => {
  it('waits in the arch and comes in on the child\'s touch, on the arch or on the one who waits', () => {
    for (const how of ['arch', 'creature'] as const) {
      const game = new Game(at('three-heads'))
      playToParade(game)
      const lead = waitingLead(game.saved), expected = worldOf(beginNext(game.saved))
      tap(game, how === 'arch' ? { type: 'arch' } : { type: 'creature', who: waits(lead) })
      expect(game.saved.finished).toBe(false)
      expect(worldOf(game.saved)).toEqual(expected)
      expect(game.dirty).toBe('now')
      expect(game.sceneRunning).toBe(true)
      while (game.sceneRunning) run(game, 0.5)
      expectStageIsWorld(game)
      expect(game.play.cast.some((who) => who.endsWith('~') || who.endsWith('+'))).toBe(false)
    }
  })

  it('walks whole visits through the designed order, cycle after cycle', () => {
    let game = new Game(freshSave(null))
    game.begin()
    const places = [game.saved.position]
    for (let cycle = 0; cycle < LADDER.length; cycle++) {
      playToParade(game)
      places.push(game.saved.position)
      // Put away and opened again between cycles: found as left.
      game = new Game(putAway(game.saved))
      expectStageIsWorld(game)
      tap(game, { type: 'arch' })
      while (game.sceneRunning) run(game, 0.5)
    }
    expect(places.slice(0, LADDER.length)).toEqual([...LADDER])
  })
})

describe('nothing passes through anything', () => {
  /** Whether two things overlap, each a box about a point: half its width across and half its depth to and fro. */
  const overlap = (a: { x: number; z: number; w: number; d: number }, b: { x: number; z: number; w: number; d: number }): boolean => Math.abs(a.x - b.x) < a.w + b.w - 0.01 && Math.abs(a.z - b.z) < a.d + b.d - 0.01

  function expectApart(game: Game, label: string): void {
    const play = game.play, pose = {} as Parameters<typeof play.actorPose>[1]
    const bodies = play.cast.map((who) => {
      const p = play.actorPose(who, pose)
      return { who, x: p.x, z: p.z, w: BODY[play.kindOf(who)].reach + HAND.radius, d: CREATURE_DEPTH / 2 }
    })
    for (const a of bodies) {
      for (const b of bodies) if (a.who < b.who) expect(overlap(a, b), `${label}: ${a.who} and ${b.who} at ${play.time.toFixed(2)} s`).toBe(false)
      // The tile, where it lies; and the two legs of the arch.
      expect(overlap(a, { x: 0, z: play.tileZ, w: tileWidth(play.hatCount) / 2, d: TILE_DEPTH / 2 }), `${label}: ${a.who} and the tile`).toBe(false)
      for (const side of [-1, 1]) expect(overlap(a, { x: ARCH_X + side * (ARCH.inner + ARCH.outer) / 2, z: ARCH_Z, w: (ARCH.outer - ARCH.inner) / 2, d: ARCH.depth / 2 }), `${label}: ${a.who} and the arch`).toBe(false)
      for (let hat = 0; hat < play.hatCount; hat++) {
        if (play.seen(hat).at !== 'loose' || play.flying(hat)) continue
        const h = play.hatPose(hat)
        expect(overlap(a, { x: h.x, z: h.z, w: 1, d: 0.25 }), `${label}: ${a.who} and a loose hat`).toBe(false)
      }
    }
    for (let hat = 0; hat < play.hatCount; hat++) expect(play.hatPose(hat).y, `${label}: a hat under the floor`).toBeGreaterThanOrEqual(0)
    expect(Math.abs(play.tileZ - TILE_Z) < 1e-9 || play.tileZ > TILE_Z).toBe(true)
  }

  it('in any scene of any position: no creature walks through another, the tile, the arch or a loose hat', () => {
    for (const position of LADDER) for (const seed of [5, 4242]) {
      const game = new Game(at(position, seed))
      playToParade(game, () => expectApart(game, position))
      tap(game, { type: 'arch' })
      while (game.sceneRunning) run(game, 0.25, [], () => expectApart(game, `${position}, the next crew`))
    }
  }, 30000)

  it('and through anything a small hand does, every number stays finite and above the floor', () => {
    const game = new Game(at('comes-and-goes', 9))
    const pick = (n: number, of: number): number => Math.floor(((Math.sin(n * 127.1) * 43758.5453) % 1 + 1) % 1 * of)
    for (let i = 0; i < 300; i++) {
      const hats = game.saved.tile.length, cast = game.play.cast
      const target: Target = [{ type: 'hat', hat: pick(i, hats) } as Target, { type: 'creature', who: cast[pick(i + 0.3, cast.length)] } as Target, { type: 'arch' } as Target, { type: 'floor', x: pick(i, 12) - 6, z: 1 } as Target][pick(i + 0.7, 4)]
      game.press(target)
      const kind = pick(i + 0.11, 4)
      if (kind === 0) game.tap()
      else if (kind === 1) game.pressEnd()
      else {
        game.dragStart()
        game.dragTo(pick(i, 10) - 5, 2, 0.8, 0.4, -0.3)
        run(game, 0.1)
        const crew = game.saved.crew
        game.letGo([{ on: 'creature', who: crew[pick(i + 0.5, crew.length)].kind } as LetGo, { on: 'tile' } as LetGo, { on: 'floor', x: pick(i + 0.2, 12) - 6, z: 1 } as LetGo][pick(i + 0.9, 3)])
      }
      run(game, 0.05 + pick(i + 0.4, 10) * 0.25, [], () => {
        for (let hat = 0; hat < game.play.hatCount; hat++) {
          const p = game.play.hatPose(hat)
          expect(Number.isFinite(p.x + p.y + p.z + p.up + p.flip + p.tilt + p.turn + p.squash)).toBe(true)
          expect(p.y).toBeGreaterThanOrEqual(0)
        }
        for (const who of game.play.cast) {
          const p = game.play.actorPose(who, {} as never)
          expect(Number.isFinite(p.x + p.y + p.z + p.squash + p.lean + p.turn + p.gazeX + p.gazeY + p.pat + p.mouth + p.ears + p.cross)).toBe(true)
          expect(p.y).toBeGreaterThanOrEqual(0)
          expect(p.squash).toBeGreaterThan(0.3)
        }
      })
      // The save can be put away at any instant and reads back whole.
      expect(putAway(game.saved)).toEqual(JSON.parse(JSON.stringify(serialize(game.saved))))
      expect(game.saved.crew.length).toBeLessThanOrEqual(MOST)
    }
  }, 30000)
})


describe('a tower of three', () => {
  it('sways, salutes and topples with a falling whistle, every time, and every hat of it goes home', () => {
    for (let again = 0; again < 2; again++) {
      const game = new Game(saveOf(everything())), heard: { at: number; name: string }[] = []
      // Flop already wears two; the hat from the tile is the third.
      game.press({ type: 'hat', hat: 4 })
      game.dragStart()
      game.dragTo(0, 3, 1, 0, 0)
      game.letGo({ on: 'creature', who: 'flop' })
      const names = run(game, 3, heard)
      expect(game.seen).toContain('the-tower-falls')
      expect(names).toContain('whistle')
      expect(names.filter((name) => name === 'fwump').length).toBe(3)
      expect(game.saved.crew.find((creature) => creature.kind === 'flop')!.hats).toEqual([])
      for (const hat of [1, 2, 4]) expect(game.play.seen(hat)).toEqual({ at: 'tile' })
      expectStageIsWorld(game)
    }
  })
})

describe('a hat on a head', () => {
  it('rests on the top of the head and not in it, whatever the creature is doing', () => {
    for (const kind of ['bop', 'lanky', 'flop', 'wig', 'pip'] as const) for (const hat of ['cone', 'dome', 'brim'] as const) {
      const game = new Game(saveOf({ crew: [{ kind, spot: 2, hats: [] }], tile: [hat], loose: [], changes: ['leave'], guest: null, leaver: 2, slips: 0 }))
      tap(game, { type: 'hat', hat: 0 })
      run(game, 0.9)
      // Through its act and for a while after, the hat's base is never below the top of the head as it stands that instant, unless it has come forward of the face first.
      run(game, 1.05, [], () => {
        const body = game.play.actorPose(kind, {} as never), worn = game.play.hatPose(0)
        if (game.play.flying(0)) return
        const forward = worn.z - body.z > 0.9
        if (!forward) expect(worn.y - body.y, `${kind} under the ${hat}`).toBeGreaterThanOrEqual(BODY[kind].top * body.squash - 1e-6)
        expect(worn.y).toBeGreaterThan(0.4)
      })
    }
  })
})

describe('a loose hat that is tapped', () => {
  it('hops home with a double bounce, "bom-bom", when no head is bare', () => {
    const world: World = { crew: [{ kind: 'bop', spot: 2, hats: [0] }], tile: ['cone', 'dome'], loose: [{ hat: 1, spot: 3 }], changes: ['leave'], guest: null, leaver: 2, slips: 0 }
    const game = new Game(saveOf(world)), heard: { at: number; name: string }[] = []
    game.press({ type: 'hat', hat: 1 })
    game.tap()
    expect(run(game, 1.5, heard)).toEqual(['creak', 'bom-bom', 'fwump'])
    expect(game.play.seen(1)).toEqual({ at: 'tile' })
  })
})
