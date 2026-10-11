import { describe, expect, it } from 'vitest'
import { partyFile } from '../camp'
import { CELL, EARTH, MOUTH, OPEN, STONE, at, put, settle } from '../ground'
import type { Guidance } from '../guidance'
import { Kingdom } from '../kingdom'
import { partyAt } from '../order'
import { callRaid, playOut, stepRaid } from '../raid'
import { freshGame, type Game } from '../save'
import { POSES } from './creatures'
import { DRAWS, ToyDisplay, drawsOf, type Item } from './display'
import { GRASS_Y, GROUND } from './layout'
import { FURNISHED, MOUTH_STEP, PLAYED_BY, RAID_POSES, invaderPose, roomFloor, showFurnishings, showMachine, showRaid, showShot } from './raidShow'
import { THING_SIZE } from './things'

const DRAW_BUDGET = 80

/** A kingdom of eight rooms off two halls, with both machines, at the place of the largest party this build plays. */
function fullKingdom(): Game {
  const game = freshGame(null, 1), g = game.ground
  for (let y = 1; y < g.rows - 1; y++) for (let x = 0; x < g.cols; x++) put(g, x, y, EARTH)
  for (let y = 1; y <= 15; y++) for (const x of MOUTH) put(g, x, y, OPEN)
  for (const [row, hall] of [[5, 8], [12, 15]]) {
    for (let x = 1; x < g.cols - 1; x++) for (const y of [hall, hall + 1]) put(g, x, y, OPEN)
    for (const left of [1, 9, 23, 31]) for (let y = row; y < row + 3; y++) for (let x = left; x < left + 7; x++) put(g, x, y, OPEN)
  }
  put(g, 16, 9, STONE)
  put(g, 26, 9, 2)
  settle(g)
  game.ant = { x: 17, y: 9 }
  game.position = 'full-camp'
  game.shown.push('ant', 'beetle', 'fly', 'catapult', 'cannon')
  game.machines.push({ kind: 'cannon', x: 30, y: 9, facing: -1, load: 'stone' }, { kind: 'catapult', x: 12, y: 9, facing: 1, load: 'mud' })
  return game
}

describe('the poses of a raid', () => {
  it('every pose a raid can name is one the painters have', () => {
    for (const who of ['raider', 'beetle', 'fly'] as const) for (const pose of RAID_POSES[who]) expect(POSES[who], `${who}/${pose}`).toContain(pose)
  })

  it('names only poses from its list, in every state, of every kind, at every moment', () => {
    const raid = callRaid(fullKingdom().ground, partyAt('full-camp', 0))
    const named: Record<string, Set<string>> = { raider: new Set(), beetle: new Set(), fly: new Set() }
    for (let n = 0; !raid.over; n++) {
      stepRaid(raid)
      for (const invader of raid.invaders) named[PLAYED_BY[invader.kind]].add(invaderPose(invader, n / 20, raid.ground.cols))
    }
    for (const who of ['raider', 'beetle', 'fly'] as const) {
      for (const pose of named[who]) expect(RAID_POSES[who], `${who}/${pose}`).toContain(pose)
      expect(named[who].size, who).toBeGreaterThanOrEqual(3)
    }
  })

  it('gives each kind a pose of its own for its act, and another for the end of it', () => {
    const acting = (kind: 'ant' | 'beetle' | 'fly', wait: number) => invaderPose({ kind, state: 'acting', wait, cell: 100, from: 100, lastShot: null } as never, 0, 40)
    const during = (['ant', 'beetle', 'fly'] as const).map((kind) => acting(kind, 5)), ending = (['ant', 'beetle', 'fly'] as const).map((kind) => acting(kind, 0.5))
    expect(new Set([...during, ...ending]).size).toBe(6)
  })
})

describe('where a raid is shown', () => {
  it('walks each invader from its place in the file to the mouth, and shows it in the nest where the raid has it', () => {
    const party = partyAt('mixed-party', 0)
    const raid = callRaid(fullKingdom().ground, party), file = partyFile(party)
    const start = showRaid(raid, party, 0)
    start.forEach((one, n) => {
      expect(one.y).toBe(GRASS_Y)
      expect(one.x).toBeGreaterThanOrEqual(file[n].x - 0.001)
      expect(one.x).toBeLessThanOrEqual(MOUTH_STEP.x + 0.001)
    })
    for (let n = 0; n < 200; n++) stepRaid(raid)
    const later = showRaid(raid, party, 10)
    const inNest = later.filter((_, n) => raid.invaders[n].cell >= 0 && raid.invaders[n].state !== 'home')
    expect(inNest.length).toBeGreaterThan(0)
    for (const one of inNest) {
      expect(one.y).toBeGreaterThan(GRASS_Y - CELL)
      expect(one.x).toBeGreaterThan(GROUND.x)
      expect(one.x).toBeLessThan(GROUND.x + GROUND.width)
    }
    playOut(raid)
    showRaid(raid, party, 60).forEach((one, n) => {
      if (raid.invaders[n].state === 'home') expect([one.x, one.y]).toEqual([file[n].x, file[n].y])
    })
  })

  it('shows a machine empty in a raid until its own lump is back, and flung just after it fired', () => {
    const cannon = { kind: 'cannon', x: 30, y: 9, facing: -1, load: 'stone' } as const
    expect(showMachine(cannon, 0, 9)).toMatchObject({ load: 'stone', pose: 'ready', flip: true })
    expect(showMachine(cannon, 1.9, 0.1)).toMatchObject({ load: null, pose: 'fired' })
    expect(showMachine(cannon, 1, 1)).toMatchObject({ load: null, pose: 'ready' })
    expect(showMachine(cannon, 0, 0.1)).toMatchObject({ load: 'stone', pose: 'fired' })
  })

  it('flies a shot along its way from its first cell to its last', () => {
    const flying = { shot: 'mud', path: [100, 101, 102, 103], t: 0, length: 1, inRaid: true, machine: 0 } as const
    const a = showShot({ ...flying, path: [...flying.path] }, 40), b = showShot({ ...flying, path: [...flying.path], t: 1 }, 40)
    expect(b.x - a.x).toBe(3 * CELL)
    expect([a.effect, a.flip]).toEqual(['mudBall', false])
    expect(showShot({ ...flying, shot: 'sand', path: [103, 102, 101] }, 40)).toMatchObject({ effect: 'sandBlast', flip: true })
  })
})

describe('rooms that look lived in', () => {
  it('have two things each on their back wall, on or over their own floor, and no room more than two', () => {
    const game = fullKingdom()
    const k = new Kingdom(game)
    const rooms = k.toy.realm.chambers
    expect(rooms.length).toBeGreaterThanOrEqual(6)
    const things = showFurnishings(game.ground, rooms, false)
    // Two to a room, in the first rooms of the list; a room whose floor is too short for them has none.
    expect(things.length).toBeLessThanOrEqual(FURNISHED * 2)
    expect(things.length).toBeGreaterThanOrEqual((FURNISHED - 1) * 2)
    const floors = rooms.slice(0, FURNISHED).map((room) => roomFloor(game.ground, room))
    things.forEach((thing) => {
      const tx = (thing.x - GROUND.x) / CELL
      const floor = floors.find((f) => tx >= f.from && tx <= f.to + 1 && thing.y <= GROUND.y + (f.y + 1) * CELL && thing.y > GROUND.y + (f.y - 2) * CELL)!
      expect(floor, `${thing.thing} at ${tx}`).toBeDefined()
      const cx = (thing.x - GROUND.x) / CELL
      expect(cx).toBeGreaterThanOrEqual(floor.from)
      expect(cx).toBeLessThanOrEqual(floor.to + 1)
      // Its foot is at the floor, or it hangs over it, and it fits under the room's roof.
      expect(thing.y).toBeLessThanOrEqual(GROUND.y + (floor.y + 1) * CELL)
      expect(thing.y - THING_SIZE[thing.thing].height).toBeGreaterThanOrEqual(GROUND.y + (floor.y - 2) * CELL)
      expect(at(game.ground, Math.floor(cx), floor.y)).toBe(OPEN)
    })
    // Two rooms next to each other in the list are not furnished alike.
    expect(things[0].thing).not.toBe(things[2].thing)
    expect(showFurnishings(game.ground, rooms, true).some((thing) => thing.lit)).toBe(true)
    expect(things.some((thing) => thing.lit)).toBe(false)
  })

  it('are bare where there is no chamber', () => {
    const game = freshGame(null, 1)
    expect(showFurnishings(game.ground, new Kingdom(game).toy.realm.chambers, false)).toEqual([])
  })
})

describe('the fullest frame of a raid', () => {
  it('stays under the draw budget: a full kingdom, the largest party inside, both machines firing, marks, crumbs and the hand', () => {
    const k = new Kingdom(fullKingdom())
    const display = new ToyDisplay(k, 1)
    // A raid before this one left its marks.
    k.marks = [9 * 40 + 22, 9 * 40 + 23, 9 * 40 + 24, 9 * 40 + 25, 9 * 40 + 27, 9 * 40 + 28, 9 * 40 + 29]
    const withMarks = display.items(null)
    expect(withMarks.filter((item) => item.is === 'effect').length).toBe(6)
    k.bell()
    let most = 0, mostItems: Item[] = []
    const guidance: Guidance = { glow: 1, demo: 0.5, demoIndex: 0 }
    for (let n = 0; n < 2400 && k.raid; n++) {
      if (n % 70 === 20) { k.press(30.5, 9.5, n / 30); k.release() }
      if (n % 70 === 40) { k.press(12.5, 9.5, n / 30); k.release() }
      k.step(1 / 30)
      display.see([{ type: 'dug', x: 5, y: 5, cells: 4, speed: 1 }, { type: 'met', kind: STONE, x: 6, y: 5 }, { type: 'met', kind: 2, x: 7, y: 5 }, { type: 'met', kind: 3, x: 8, y: 5 }])
      display.seeGame(k.drainEvents(), k.drainRaidEvents())
      display.advance(1 / 30)
      const items = display.items(guidance)
      if (drawsOf(items) > most) { most = drawsOf(items); mostItems = items.slice() }
    }
    expect(most).toBeLessThanOrEqual(DRAW_BUDGET)
    expect(most).toBeGreaterThan(45)
    // Every kind was on screen in that frame, with machines, things on the walls and a shot or its landing.
    const has = (test: (item: Item) => boolean) => mostItems.some(test)
    for (const who of ['raider', 'beetle', 'fly', 'worker', 'queen', 'ant']) expect(has((item) => item.is === 'sprite' && item.who === who), who).toBe(true)
    expect(mostItems.filter((item) => item.is === 'machine').length).toBe(2)
    expect(mostItems.filter((item) => item.is === 'thing').length).toBeGreaterThanOrEqual((FURNISHED - 1) * 2)
    expect(Object.keys(DRAWS).length).toBe(12)
  })
})
