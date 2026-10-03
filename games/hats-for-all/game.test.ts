import { appendFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { waitingCrew } from './cycle'
import { Game, waits, type LetGo, type Target } from './game'
import { ACTIONS, GRID, OBJECTS, type Action, type ObjectKind } from './grid'
import { placeOf, type World } from './rules'
import { worldOf, type Saved } from './save'
import { ROW_Z, spotX } from './stage'

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
  if (game.saved.finished) expected.push(waits(waitingCrew(game.saved).crew[0].kind))
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
