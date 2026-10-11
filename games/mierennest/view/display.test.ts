import { describe, expect, it } from 'vitest'
import { campers } from '../camp'
import { LADDER } from '../config'
import { CELL, EARTH, MOUTH, OPEN, STONE, at, put, settle } from '../ground'
import type { Guidance } from '../guidance'
import type { InvaderKind } from '../habits'
import { ROUND } from '../order'
import { freshGame, type Game } from '../save'
import { Kingdom } from '../kingdom'
import { DRAWS, LADDER_BEAT, LADDER_SWAY, MOST_CRUMBS, QUEEN_WEDGED, ROOTS_SWING, SPOIL_TROT, ToyDisplay, drawsOf, type Item } from './display'
import { GRASS_Y, GROUND } from './layout'
import { BELL } from './props'

/** The most draws a frame may make. */
const DRAW_BUDGET = 80
const sprites = (items: Item[], who: string) => items.filter((item): item is Extract<Item, { is: 'sprite' }> => item.is === 'sprite' && item.who === who)
const fresh = () => {
  const k = new Kingdom(freshGame(null, 1))
  // The first showing of a first visit is owed at the first touch; these tests look at the frame before any touch.
  return { toy: k.toy, k, display: new ToyDisplay(k, 1) }
}

/** A nest with eight rooms off two halls, so the kingdom has its full crowd of workers. */
function crowded(): Game {
  const game = freshGame(null, 1)
  const g = game.ground
  for (let y = 1; y < g.rows - 1; y++) for (let x = 0; x < g.cols; x++) put(g, x, y, EARTH)
  for (let y = 1; y <= 15; y++) for (const x of MOUTH) put(g, x, y, OPEN)
  for (const [row, hall] of [[5, 8], [12, 15]]) {
    for (let x = 1; x < g.cols - 1; x++) for (const y of [hall, hall + 1]) put(g, x, y, OPEN)
    for (const left of [1, 9, 23, 31]) for (let y = row; y < row + 3; y++) for (let x = left; x < left + 7; x++) put(g, x, y, OPEN)
  }
  put(g, 16, 9, STONE)
  settle(g)
  game.ant = { x: 17, y: 9 }
  return game
}

describe('a frame of the toy', () => {
  it('opens on the queen wedged in the shaft, the ant sitting under her, and the whole camp', () => {
    const { display } = fresh()
    const items = display.items(null)
    const queen = sprites(items, 'queen')[0], ant = sprites(items, 'ant')[0]
    expect(queen.pose).toBe('wedged')
    // She fills the shaft from wall to wall and stands a cell above its foot.
    expect(56 * QUEEN_WEDGED.size).toBe(MOUTH.length * CELL)
    expect(queen.x).toBe(GROUND.x + ((MOUTH[0] + MOUTH[MOUTH.length - 1] + 1) / 2) * CELL)
    expect(queen.y).toBe(GROUND.y + 3 * CELL)
    expect(queen.y - 96 * QUEEN_WEDGED.size * QUEEN_WEDGED.tall).toBeLessThan(GRASS_Y)
    // The shaft is three cells wide and the ant is four long, so it sits, in the cell under her.
    expect(ant.pose).toBe('look')
    expect(ant.y).toBe(GROUND.y + 4 * CELL)
    expect(ant.y - CELL).toBeGreaterThanOrEqual(queen.y)
    // Six campers (the scout at the log is the raider ant, so its puddle is empty), the queen, the worker on the hill and the ant.
    expect(items.filter((item) => item.is === 'sprite').length).toBe(6 + 3)
    expect(items[0].is).toBe('drop')
  })

  it('stays under the draw budget at its fullest: a full kingdom, a lump in the jaws, crumbs of every colour and the hand', () => {
    const k = new Kingdom(crowded()), toy = k.toy
    const display = new ToyDisplay(k, 1)
    expect(toy.realm.workers).toBe(16)
    toy.press(16.5, 9.5, 0)
    expect(toy.carried).not.toBeNull()
    toy.drag(18.5, 9.5, 0.1)
    display.see([
      { type: 'dug', x: 5, y: 5, cells: 4, speed: 1 },
      { type: 'met', kind: STONE, x: 6, y: 5 },
      { type: 'met', kind: 2, x: 7, y: 5 },
      { type: 'met', kind: 3, x: 8, y: 5 },
      { type: 'landed', kind: STONE, cell: 300, fell: 5 },
      { type: 'dug', x: 9, y: 5, cells: 4, speed: 1 },
      { type: 'dug', x: 10, y: 5, cells: 4, speed: 1 },
    ])
    display.advance(1 / 60)
    const guidance: Guidance = { glow: 1, demo: 0.5, demoIndex: 0 }
    const items = display.items(guidance)
    for (const kind of ['sprite', 'lump', 'hole', 'target', 'crumbs', 'drop', 'glint', 'hand'] as const) expect(items.some((item) => item.is === kind), kind).toBe(true)
    expect(sprites(items, 'worker').length).toBeGreaterThanOrEqual(12)
    expect(items.filter((item) => item.is === 'crumbs').length).toBeGreaterThanOrEqual(4)
    expect(drawsOf(items)).toBeLessThanOrEqual(DRAW_BUDGET)
    expect(drawsOf(items)).toBeGreaterThan(30)
    expect(Object.values(DRAWS).every((n) => n >= 1)).toBe(true)
  })

  it('never has more crumbs in the air than its most, however fast the finger digs', () => {
    const { display } = fresh()
    for (let n = 0; n < 200; n++) {
      display.see([{ type: 'dug', x: 5 + (n % 9), y: 5, cells: 4, speed: 1 }])
      display.advance(1 / 240)
    }
    const crumbs = display.items(null).filter((item): item is Extract<Item, { is: 'crumbs' }> => item.is === 'crumbs')
    expect(crumbs.reduce((sum, group) => sum + group.at.length, 0)).toBeLessThanOrEqual(MOST_CRUMBS)
    display.advance(2)
    expect(display.items(null).some((item) => item.is === 'crumbs')).toBe(false)
  })

  it('shows a carried lump in the jaws and its cell empty, and neither once it is let go', () => {
    const k = new Kingdom(crowded()), toy = k.toy
    const display = new ToyDisplay(k, 1)
    toy.press(16.5, 9.5, 0)
    for (let n = 0; n < 30; n++) { toy.step(1 / 60); display.advance(1 / 60) }
    const items = display.items(null)
    const hole = items.find((item) => item.is === 'hole') as Extract<Item, { is: 'hole' }>
    const lump = items.find((item) => item.is === 'lump') as Extract<Item, { is: 'lump' }>
    expect([hole.x, hole.y]).toEqual([GROUND.x + 16.5 * CELL, GROUND.y + 9.5 * CELL])
    expect(lump.lump).toBe(STONE)
    const ant = sprites(items, 'ant')[0]
    expect(ant.pose).toBe('carry')
    expect(Math.hypot(lump.x - ant.x, lump.y - ant.y)).toBeLessThan(80)
    // The lump is still in its cell of the ground all the while.
    expect(at(toy.game.ground, 16, 9)).toBe(STONE)
    toy.cancel()
    display.advance(1 / 60)
    expect(display.items(null).some((item) => item.is === 'hole' || item.is === 'lump' || item.is === 'target')).toBe(false)
  })

  it('shows the idle ladder as a glint on what can be touched and one hand, and nothing of it without guidance', () => {
    const { display } = fresh()
    expect(display.items(null).some((item) => item.is === 'glint' || item.is === 'hand')).toBe(false)
    expect(display.items({ glow: 0, demo: null, demoIndex: -1 }).some((item) => item.is === 'glint' || item.is === 'hand')).toBe(false)
    const shown = display.items({ glow: 1, demo: 0.5, demoIndex: 0 })
    expect(shown.filter((item) => item.is === 'hand').length).toBe(1)
    expect(shown.filter((item) => item.is === 'glint').length).toBeGreaterThanOrEqual(1)
    const hand = shown.find((item) => item.is === 'hand') as Extract<Item, { is: 'hand' }>
    expect(hand.y).toBeGreaterThan(GRASS_Y + CELL)
  })

  it('lights the drop on the idle ladder once the kingdom has a chamber to raid, and not before or while a raid runs', () => {
    const dropOf = (display: ToyDisplay) => display.items({ glow: 1, demo: null, demoIndex: -1 })[0] as Extract<Item, { is: 'drop' }>
    expect(dropOf(fresh().display).glint).toBe(0)
    const k = new Kingdom(crowded())
    const display = new ToyDisplay(k, 1)
    expect(dropOf(display).glint).toBe(1)
    const glints = display.items({ glow: 1, demo: null, demoIndex: -1 }).filter((item) => item.is === 'glint') as Extract<Item, { is: 'glint' }>[]
    expect(glints.some((glint) => glint.y < GRASS_Y)).toBe(true)
    expect((display.items(null)[0] as Extract<Item, { is: 'drop' }>).glint).toBe(0)
    k.bell()
    expect(k.raid).not.toBeNull()
    expect(dropOf(display).glint).toBe(0)
  })
})

describe('the first rung of the idle ladder', () => {
  const glow: Guidance = { glow: 1, demo: null, demoIndex: -1 }

  it('has the ant look out of the screen and then scratch at the earth beside it, where the glint is', () => {
    const k = new Kingdom(crowded()), display = new ToyDisplay(k, 1)
    const poses = new Set<string>()
    let scratchedToward = false
    for (let n = 0; n < 4 * 30; n++) {
      display.advance(1 / 30)
      const items = display.items(glow)
      const ant = sprites(items, 'ant')[0]
      poses.add(ant.pose)
      const glint = items.find((item) => item.is === 'glint' && item.y > GRASS_Y) as Extract<Item, { is: 'glint' }> | undefined
      if (ant.pose === 'dig') {
        // It faces the earth that glints, and it moves as it scratches.
        expect(glint).toBeDefined()
        expect(ant.flip).toBe(glint!.x < ant.x)
        if (ant.move && ant.move.dy < 0) scratchedToward = true
      }
    }
    expect([...poses].sort()).toEqual(['dig', 'look'])
    expect(scratchedToward).toBe(true)
    // With no guidance it does neither by itself.
    const still = new Set<string>()
    for (let n = 0; n < 4 * 30; n++) { display.advance(1 / 30); still.add(sprites(display.items(null), 'ant')[0].pose) }
    expect(still.has('dig')).toBe(false)
    expect(LADDER_BEAT).toBeGreaterThan(0.5)
  })

  it('sways the bell of a kingdom that can be raided, and leaves the bell of one that cannot at rest', () => {
    const swing = (display: ToyDisplay) => {
      let most = 0
      for (let n = 0; n < 3 * 30; n++) {
        display.advance(1 / 30)
        most = Math.max(most, Math.abs((display.items(glow)[0] as Extract<Item, { is: 'drop' }>).sway))
      }
      return most
    }
    expect(swing(new ToyDisplay(new Kingdom(crowded()), 1))).toBeGreaterThan(LADDER_SWAY * 0.8)
    expect(swing(fresh().display)).toBeLessThan(0.05)
  })
})

describe('the answer to a dig, beyond the mouthful', () => {
  it('is felt on the hill and by the camper right above a shallow tunnel, and by nobody over a deep one', () => {
    const hopOf = (display: ToyDisplay, who: string, n = 0) => sprites(display.items(null), who)[n].move!.dy
    const shallow = fresh().display
    shallow.advance(1)
    const beetle = shallow.camp.find((camper) => camper.id === 'beetle')!
    const rests = sprites(shallow.items(null), 'worker')[0]
    shallow.see([{ type: 'dug', x: (beetle.x - GROUND.x) / CELL, y: 2, cells: 4, speed: 0.5 }])
    shallow.advance(0.4)
    expect(hopOf(shallow, 'beetle')).toBeLessThan(-1)
    expect(hopOf(shallow, 'fly')).toBeGreaterThan(-1)
    // The worker has caught the spoil at the mouth and is trotting it up the hill: it is on the slope, below its place.
    const trotting = sprites(shallow.items(null), 'worker')[0]
    expect(trotting.x).toBeLessThan(rests.x)
    expect(trotting.y).toBeGreaterThan(rests.y)
    expect(['carry', 'walk2']).toContain(trotting.pose)
    shallow.advance(SPOIL_TROT)
    expect(sprites(shallow.items(null), 'worker')[0].x).toBe(rests.x)
    const deep = fresh().display
    deep.advance(1)
    deep.see([{ type: 'dug', x: (beetle.x - GROUND.x) / CELL, y: 9, cells: 4, speed: 0.5 }])
    deep.advance(0.4)
    expect(hopOf(deep, 'beetle')).toBeGreaterThan(-1)
    expect(sprites(deep.items(null), 'worker')[0].x).toBeLessThan(rests.x)
  })

  it('swings the roots that hang from the turf into a tunnel dug right under it, and lets them come to rest', () => {
    const game = freshGame(null, 1), g = game.ground
    for (let x = 23; x <= 28; x++) put(g, x, 1, OPEN)
    const display = new ToyDisplay(new Kingdom(game), 1)
    const rootsOf = () => (display.items(null).find((item) => item.is === 'roots') as Extract<Item, { is: 'roots' }>).at
    // Two roots a cell of open ground under the turf, and none in the mouth, which has no turf over it.
    expect(rootsOf().length).toBe(12)
    expect(rootsOf().every((root) => root.swing === 0)).toBe(true)
    display.see([{ type: 'dug', x: 25.5, y: 1.5, cells: 2, speed: 0.5 }])
    let most = 0
    for (let n = 0; n < 20; n++) { display.advance(1 / 30); most = Math.max(most, ...rootsOf().map((root) => Math.abs(root.swing))) }
    expect(most).toBeGreaterThan(0.2)
    display.advance(ROOTS_SWING.seconds)
    expect(rootsOf().every((root) => root.swing === 0)).toBe(true)
    expect(fresh().display.items(null).some((item) => item.is === 'roots')).toBe(false)
  })

  it('shows a carried lump by its kind: sand on the head, mud hanging from the jaws in a drip, a stone dragged behind', () => {
    const hold = (cell: [number, number], kind: 2 | 3 | 4) => {
      const game = crowded()
      put(game.ground, cell[0], cell[1], kind)
      const k = new Kingdom(game), display = new ToyDisplay(k, 1)
      k.toy.press(cell[0] + 0.5, cell[1] + 0.5, 0)
      expect(k.toy.carried?.kind).toBe(kind)
      for (let n = 0; n < 40; n++) { k.toy.step(1 / 60); display.advance(1 / 60) }
      const items = display.items(null)
      const lump = items.find((item) => item.is === 'lump') as Extract<Item, { is: 'lump' }>, ant = sprites(items, 'ant')[0]
      return { dx: (lump.x - ant.x) * (ant.flip ? -1 : 1), dy: lump.y - ant.y, drip: lump.drip }
    }
    const sand = hold([16, 9], 2), mud = hold([16, 9], 3), stone = hold([16, 9], STONE)
    // Sand rides high, over the head; mud hangs in front, lower, with a drip; a stone lies behind, on the floor.
    expect(sand.dy).toBeLessThan(mud.dy - 10)
    expect(mud.dx).toBeGreaterThan(sand.dx)
    expect(mud.drip).toBeGreaterThan(0)
    expect([sand.drip, stone.drip]).toEqual([0, 0])
    expect(stone.dx).toBeLessThan(-40)
    expect(stone.dy).toBeGreaterThan(mud.dy)
  })

  it('ends with the ant sitting back to look at what it made', () => {
    const k = new Kingdom(crowded()), toy = k.toy
    const display = new ToyDisplay(k, 1)
    toy.press(18.5, 8.5, 0)
    toy.step(1 / 60)
    display.advance(1 / 60)
    toy.release()
    for (let n = 0; n < 20; n++) { toy.step(1 / 60); display.advance(1 / 60) }
    expect(sprites(display.items(null), 'ant')[0].pose).toBe('look')
  })
})

describe('a touch on the surface', () => {
  it('rings the bell, and the whole camp answers, each in its own way', () => {
    const { display } = fresh()
    display.advance(0.5)
    const before = sprites(display.items(null), 'beetle')[0].move!.dy
    expect(display.poke(BELL.x - 4, BELL.y)).toEqual({ on: 'bell' })
    display.advance(0.4)
    const items = display.items(null)
    const hops = items.filter((item): item is Extract<Item, { is: 'sprite' }> => item.is === 'sprite' && item.y <= GRASS_Y && item.who !== 'queen').map((item) => item.move!.dy)
    expect(hops.length).toBe(7)
    expect(new Set(hops.map((dy) => dy.toFixed(2))).size).toBeGreaterThanOrEqual(5)
    expect(hops.every((dy) => dy <= 0)).toBe(true)
    expect(sprites(items, 'beetle')[0].move!.dy).not.toBe(before)
    const drop = items[0] as Extract<Item, { is: 'drop' }>
    expect(Math.abs(drop.sway)).toBeGreaterThan(0.1)
  })

  it('pokes the camper under the finger and no other, and answers bare setting too', () => {
    const { display } = fresh()
    display.advance(0.5)
    const beetle = display.camp.find((camper) => camper.id === 'beetle')!
    expect(display.poke(beetle.x, beetle.y - 20)).toEqual({ on: 'camper', kind: 'beetle' })
    display.advance(0.4)
    const items = display.items(null)
    expect(sprites(items, 'beetle')[0].move!.dy).toBeLessThan(-1)
    expect(sprites(items, 'fly')[0].move!.dy).toBeGreaterThan(-1)
    expect(display.poke(600, 60)).toEqual({ on: 'setting' })
    expect(display.items(null).some((item) => item.is === 'crumbs')).toBe(true)
  })

  it('answers a press at the log during a raid by whoever sits there, and an empty place as bare setting', () => {
    const game = freshGame(null, 1), g = game.ground
    for (let y = 3; y <= 6; y++) for (const x of MOUTH) put(g, x, y, OPEN)
    for (let y = 4; y <= 6; y++) for (let x = 22; x <= 33; x++) put(g, x, y, OPEN)
    settle(g)
    game.ant = { x: 20, y: 6 }
    game.position = 'ant-file'
    game.shown.push('ant')
    const k = new Kingdom(game), display = new ToyDisplay(k, 1)
    const places = display.camp.filter((camper) => camper.id.startsWith('party'))
    expect(places.length).toBe(3)
    k.bell()
    // Until the first is well inside: it has left its place, and the last still sits at its own.
    for (let n = 0; n < 400 && k.raid && k.raid.invaders[0].state === 'coming'; n++) { k.step(1 / 30); display.seeGame(k.drainEvents(), k.drainRaidEvents()); display.advance(1 / 30) }
    expect(k.raid!.invaders[0].state).not.toBe('coming')
    expect(k.raid!.invaders[2].state).toBe('coming')
    const gone = places[0], sits = places[2]
    expect(display.poke(gone.x, gone.y - 12)).toEqual({ on: 'setting' })
    expect(display.poke(sits.x, sits.y - 12)).toEqual({ on: 'camper', kind: 'raider' })
    display.advance(0.2)
    // The one who sits there is the one drawn there, and it hops.
    const there = sprites(display.items(null), 'raider').filter((one) => Math.abs(one.x - sits.x) < 1 && one.y <= GRASS_Y)
    expect(there.length).toBe(1)
    expect(Math.abs(there[0].move!.dy) + Math.abs(there[0].move!.dx ?? 0) + Math.abs(there[0].move!.turn ?? 0)).toBeGreaterThan(0.5)
  })

  it('shows the queen once, still under the mouth, while her move waits for a showing to end', () => {
    const game = freshGame(null, 1), g = game.ground
    for (let y = 1; y < g.rows - 1; y++) for (let x = 0; x < g.cols; x++) put(g, x, y, MOUTH.includes(x) && y <= 6 ? OPEN : EARTH)
    for (const y of [4, 5]) for (let x = 22; x <= 27; x++) put(g, x, y, OPEN)
    settle(g)
    const k = new Kingdom(game), display = new ToyDisplay(k, 1)
    k.press(22.5, 6, 0)
    for (let n = 1; n <= 10; n++) { k.drag(22.5 + n * 0.5, 6, n * 0.05); k.step(0.05) }
    k.release()
    for (let n = 0; n < 40; n++) { k.step(1 / 30); display.see(k.toy.drainEvents()); display.seeGame(k.drainEvents(), k.drainRaidEvents()); display.advance(1 / 30) }
    expect(k.scene?.is).toBe('showing')
    expect(k.toy.realm.queenRoom).not.toBeNull()
    const queen = sprites(display.items(null), 'queen')
    expect(queen.length).toBe(1)
    expect(['wedged', 'wedged2']).toContain(queen[0].pose)
  })

  it('swings the bell back to rest', () => {
    const { display } = fresh()
    display.poke(BELL.x + 4, BELL.y)
    for (let n = 0; n < 600; n++) display.advance(1 / 60)
    expect(Math.abs((display.items(null)[0] as Extract<Item, { is: 'drop' }>).sway)).toBeLessThan(0.05)
  })
})

describe('the queen moves in', () => {
  it('is carried by two workers through the open from under the mouth to her new room, tries each end of its floor, and sits', () => {
    const game = freshGame(null, 1), g = game.ground
    for (let y = 1; y < g.rows - 1; y++) for (let x = 0; x < g.cols; x++) put(g, x, y, MOUTH.includes(x) && y <= 2 ? OPEN : EARTH)
    game.shown.push('ant')
    const k = new Kingdom(game), display = new ToyDisplay(k, 1)
    const stroke = (from: [number, number], to: [number, number]) => {
      const steps = Math.ceil(Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1])) * 2)
      k.press(from[0], from[1], 0)
      for (let n = 1; n <= steps; n++) { k.drag(from[0] + ((to[0] - from[0]) * n) / steps, from[1] + ((to[1] - from[1]) * n) / steps, n * 0.05); k.step(0.05) }
      k.release()
    }
    stroke([20.5, 3.5], [20.5, 6.5])
    stroke([22.5, 5], [28.5, 5])
    stroke([22.5, 6], [28.5, 6])
    for (let n = 0; n < 40 && k.scene?.is !== 'moves'; n++) k.step(1 / 30)
    expect(k.scene?.is).toBe('moves')
    const poses: string[] = [], places = new Set<number>()
    for (let n = 0; n < 400 && k.scene?.is === 'moves'; n++) {
      k.step(1 / 30)
      display.see(k.toy.drainEvents())
      display.seeGame(k.drainEvents(), k.drainRaidEvents())
      display.advance(1 / 30)
      if (k.scene?.is !== 'moves') break
      const items = display.items(null)
      const queen = sprites(items, 'queen')
      // She is drawn once, wherever she is.
      expect(queen.length).toBe(1)
      poses.push(queen[0].pose)
      if (queen[0].pose.startsWith('carried')) {
        // Two workers carry her, one either side, and her middle is in the open.
        const carriers = sprites(items, 'worker').filter((worker) => Math.abs(worker.y - (queen[0].y + 12)) < 1 && Math.abs(worker.x - queen[0].x) < 60)
        expect(carriers.length).toBe(2)
        const cx = Math.floor((queen[0].x - GROUND.x) / CELL), cy = Math.floor((queen[0].y - CELL / 2 - GROUND.y) / CELL)
        expect(at(k.game.ground, cx, cy)).toBe(OPEN)
      } else places.add(Math.round(queen[0].x))
    }
    expect(poses[0]).toMatch(/^carried/)
    expect(new Set(poses.filter((pose) => pose.startsWith('carried'))).size).toBe(2)
    expect(poses[poses.length - 1]).toBe('sit')
    // Each end of the floor, and then her own place.
    expect(places.size).toBeGreaterThanOrEqual(2)
    expect(k.scene).toBeNull()
  })
})

describe('the queen and her guests', () => {
  it('gives an invader that does its act in her room her whole opinion for as long as it is at it, facing it, and nobody else', () => {
    const game = freshGame(null, 1), g = game.ground
    for (let y = 3; y <= 6; y++) for (const x of MOUTH) put(g, x, y, OPEN)
    for (let y = 4; y <= 6; y++) for (let x = 22; x <= 33; x++) put(g, x, y, OPEN)
    settle(g)
    game.ant = { x: 20, y: 6 }
    game.shown.push('ant')
    const k = new Kingdom(game), display = new ToyDisplay(k, 1)
    k.bell()
    const seen = { glaring: 0, sitting: 0, queens: 0 }
    for (let n = 0; n < 2000 && k.raid; n++) {
      k.step(1 / 30)
      const raidEvents = k.drainRaidEvents()
      seen.queens += raidEvents.filter((event) => event.type === 'acts' && event.queens).length
      display.seeGame(k.drainEvents(), raidEvents)
      display.advance(1 / 30)
      if (!k.raid) break
      const items = display.items(null)
      const queen = sprites(items, 'queen')[0], guest = sprites(items, 'raider')[0]
      const acting = k.raid.invaders[0].state === 'acting'
      if (acting) {
        expect(['glare', 'glare2']).toContain(queen.pose)
        expect(queen.flip).toBe(guest.x < queen.x)
        seen.glaring++
      } else {
        expect(['sit', 'sit2']).toContain(queen.pose)
        seen.sitting++
      }
    }
    expect(seen.glaring).toBeGreaterThan(60)
    expect(seen.sitting).toBeGreaterThan(10)
    expect(seen.queens).toBe(1)
  })
})

describe('a creature is in one place', () => {
  const KIND_OF: Record<string, InvaderKind> = { raider: 'ant', beetle: 'beetle', fly: 'fly', dungBeetle: 'dungBeetle', dungFly: 'dungFly' }
  /** The game's own ground with a hall off the shaft. */
  const hallGame = (seed: number) => {
    const game = freshGame(null, seed), g = game.ground
    for (let y = 3; y <= 6; y++) for (const x of MOUTH) put(g, x, y, OPEN)
    for (let y = 4; y <= 6; y++) for (let x = 22; x <= 33; x++) put(g, x, y, OPEN)
    settle(g)
    game.ant = { x: 30, y: 6 }
    return game
  }

  it('at the camp: one whose kind is in the party at the log is not also at its own spot', () => {
    expect(campers(['beetle']).map((c) => c.id)).toEqual(['stuck', 'fly', 'party0', 'leader', 'ball', 'polisher'])
    expect(campers(['dungFly', 'dungBeetle']).filter((c) => c.kind === 'dungFly').length).toBe(1)
    expect(campers(['dungFly', 'dungBeetle']).filter((c) => c.kind === 'dungBeetle').length).toBe(1)
    expect(campers(['dungFly', 'dungBeetle']).filter((c) => c.kind === 'dungBall').length).toBe(1)
  })

  it('in every frame, for every party of the order and of the round, through the first showing, the raid and the put-back: nobody is drawn twice', () => {
    const laid: { position: string; muster: number }[] = [
      ...LADDER.filter((place) => place !== 'open-kingdom').map((position) => ({ position: position as string, muster: 0 })),
      ...ROUND.map((_, muster) => ({ position: 'open-kingdom', muster })),
    ]
    let frames = 0
    for (const seed of [1, 2]) for (const { position, muster } of laid) {
      const game = hallGame(seed)
      game.position = position
      game.muster = muster
      game.ended = position === 'open-kingdom'
      // The machines have been shown; the kinds have not, so each first showing plays.
      game.shown.push('catapult', 'cannon')
      const k = new Kingdom(game), display = new ToyDisplay(k, seed)
      const party = k.party
      const most = (who: string) => {
        if (who === 'dungBall') return Math.max(1, party.filter((kind) => kind === 'dungBeetle').length)
        const kind = KIND_OF[who]
        // As many as the party has of the kind; with none in the party, the one who is always at the camp.
        return Math.max(1, party.filter((member) => member === kind).length)
      }
      const look = () => {
        frames++
        const count = new Map<string, number>()
        for (const item of display.items(null)) {
          if (item.is !== 'sprite' || (KIND_OF[item.who] === undefined && item.who !== 'dungBall')) continue
          count.set(item.who, (count.get(item.who) ?? 0) + 1)
        }
        for (const [who, n] of count) expect(n, `${seed} ${position} ${muster} at ${display.seconds.toFixed(2)}: ${who}`).toBeLessThanOrEqual(most(who))
      }
      const play = (until: () => boolean, most = 6000) => {
        for (let n = 0; n < most && !until(); n++) {
          k.step(1 / 30)
          display.see(k.toy.drainEvents())
          display.seeGame(k.drainEvents(), k.drainRaidEvents())
          display.advance(1 / 30)
          look()
        }
      }
      look()
      // The first touch starts the first showing that is owed; then the bell.
      k.press(24.5, 5.5, 0)
      k.release()
      play(() => k.scene === null, 600)
      k.bell()
      play(() => k.raid === null && (k.scene === null || k.scene.is === 'ending'))
    }
    expect(frames).toBeGreaterThan(5000)
  })
})

