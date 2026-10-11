import { describe, expect, it } from 'vitest'
import { CELL, EARTH, MOUTH, OPEN, STONE, at, put, settle } from '../ground'
import type { Guidance } from '../guidance'
import { freshGame, type Game } from '../save'
import { Toy } from '../toy'
import { DRAWS, MOST_CRUMBS, QUEEN_WEDGED, ToyDisplay, drawsOf, type Item } from './display'
import { GRASS_Y, GROUND } from './layout'
import { BELL } from './props'

/** The most draws a frame may make. */
const DRAW_BUDGET = 80
const sprites = (items: Item[], who: string) => items.filter((item): item is Extract<Item, { is: 'sprite' }> => item.is === 'sprite' && item.who === who)
const fresh = () => {
  const toy = new Toy(freshGame(null, 1))
  return { toy, display: new ToyDisplay(toy, ['ant'], 1) }
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
    // Seven campers, the queen, the worker on the hill and the ant.
    expect(items.filter((item) => item.is === 'sprite').length).toBe(7 + 3)
    expect(items[0].is).toBe('drop')
  })

  it('stays under the draw budget at its fullest: a full kingdom, a lump in the jaws, crumbs of every colour and the hand', () => {
    const toy = new Toy(crowded())
    const display = new ToyDisplay(toy, ['ant'], 1)
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
    const toy = new Toy(crowded())
    const display = new ToyDisplay(toy, ['ant'], 1)
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
})

describe('the answer to a dig, beyond the mouthful', () => {
  it('is felt on the hill and by the camper right above a shallow tunnel, and by nobody over a deep one', () => {
    const hopOf = (display: ToyDisplay, who: string, n = 0) => sprites(display.items(null), who)[n].move!.dy
    const shallow = fresh().display
    shallow.advance(1)
    const beetle = shallow.camp.find((camper) => camper.id === 'beetle')!
    shallow.see([{ type: 'dug', x: (beetle.x - GROUND.x) / CELL, y: 2, cells: 4, speed: 0.5 }])
    shallow.advance(0.4)
    expect(hopOf(shallow, 'beetle')).toBeLessThan(-1)
    expect(hopOf(shallow, 'worker')).toBeLessThan(-1)
    expect(hopOf(shallow, 'fly')).toBeGreaterThan(-1)
    const deep = fresh().display
    deep.advance(1)
    deep.see([{ type: 'dug', x: (beetle.x - GROUND.x) / CELL, y: 9, cells: 4, speed: 0.5 }])
    deep.advance(0.4)
    expect(hopOf(deep, 'beetle')).toBeGreaterThan(-1)
    expect(hopOf(deep, 'worker')).toBeLessThan(-1)
  })

  it('ends with the ant sitting back to look at what it made', () => {
    const toy = new Toy(crowded())
    const display = new ToyDisplay(toy, ['ant'], 1)
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
    expect(hops.length).toBe(8)
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

  it('swings the bell back to rest', () => {
    const { display } = fresh()
    display.poke(BELL.x + 4, BELL.y)
    for (let n = 0; n < 600; n++) display.advance(1 / 60)
    expect(Math.abs((display.items(null)[0] as Extract<Item, { is: 'drop' }>).sway)).toBeLessThan(0.05)
  })
})
