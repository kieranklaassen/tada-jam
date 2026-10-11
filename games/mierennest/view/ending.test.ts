import { describe, expect, it } from 'vitest'
import { boxOf, campers } from '../camp'
import { LADDER } from '../config'
import { EARTH, MOUTH, MUD, OPEN, STONE, clone, equal, put, settle } from '../ground'
import { Kingdom, SCENE_SECONDS } from '../kingdom'
import { PARTY, ROUND, partyAt } from '../order'
import { deserialize, freshGame, serialize, type Game } from '../save'
import { POSES } from './creatures'
import { DRAWS, ENDING, LEAF_AT, ToyDisplay, drawsOf, type Item } from './display'
import { GRASS_Y, MOUTH_X } from './layout'
import { BELL, LIP, STALK, hillShape } from './props'
import { lightingOrder } from './raidShow'
import { THING_SIZE } from './things'

const DRAW_BUDGET = 80

/** A kingdom of eight rooms off two halls, with both machines loaded, where the great raid waits at the log. */
function fullKingdom(): Game {
  const game = freshGame(null, 1), g = game.ground
  for (let y = 1; y < g.rows - 1; y++) for (let x = 0; x < g.cols; x++) put(g, x, y, EARTH)
  for (let y = 1; y <= 15; y++) for (const x of MOUTH) put(g, x, y, OPEN)
  for (const [row, hall] of [[5, 8], [12, 15]]) {
    for (let x = 1; x < g.cols - 1; x++) for (const y of [hall, hall + 1]) put(g, x, y, OPEN)
    for (const left of [1, 9, 23, 31]) for (let y = row; y < row + 3; y++) for (let x = left; x < left + 7; x++) put(g, x, y, OPEN)
  }
  settle(g)
  game.ant = { x: 17, y: 9 }
  game.position = 'great-raid'
  game.shown.push('ant', 'beetle', 'fly', 'dungBeetle', 'dungFly', 'catapult', 'cannon')
  game.machines.push({ kind: 'cannon', x: 30, y: 9, facing: -1, load: 'stone' }, { kind: 'catapult', x: 12, y: 9, facing: 1, load: 'mud' })
  return game
}

/**
 * A nest that turns back the great raid with no machine: tunnels two cells high, so the dung fly does not get in,
 * and in each a pit two cells deep in plain earth, which holds every beetle with or without its ball. Two rooms.
 */
function fort(): Game {
  const game = freshGame(null, 1), g = game.ground
  for (let y = 1; y < g.rows - 1; y++) for (let x = 0; x < g.cols; x++) put(g, x, y, EARTH)
  for (let y = 1; y <= 5; y++) for (const x of MOUTH) put(g, x, y, OPEN)
  for (const y of [4, 5]) for (let x = 22; x <= 29; x++) put(g, x, y, OPEN)
  for (let y = 3; y <= 5; y++) for (let x = 30; x <= 37; x++) put(g, x, y, OPEN)
  for (const y of [4, 5]) for (let x = 12; x <= 18; x++) put(g, x, y, OPEN)
  for (let y = 3; y <= 5; y++) for (let x = 4; x <= 11; x++) put(g, x, y, OPEN)
  for (const x of [24, 25, 26]) put(g, x, 6, MUD)
  put(g, 24, 3, STONE)
  for (const x of [27, 28]) for (const y of [6, 7]) put(g, x, y, OPEN)
  for (const x of [15, 16]) for (const y of [6, 7]) put(g, x, y, OPEN)
  settle(g)
  game.position = 'great-raid'
  game.ant = { x: 20, y: 5 }
  game.shown.push('ant', 'beetle', 'fly', 'dungBeetle', 'dungFly', 'catapult', 'cannon')
  return game
}

/** Plays the kingdom and its display a frame at a time, as the Mount does, until `until` says so. Gives every frame's items. */
function play(k: Kingdom, display: ToyDisplay, until: () => boolean, most = 12000, look?: (items: Item[]) => void): void {
  for (let n = 0; n < most && !until(); n++) {
    k.step(1 / 30)
    display.see(k.toy.drainEvents())
    display.seeGame(k.drainEvents(), k.drainRaidEvents())
    display.advance(1 / 30)
    if (look) look(display.items(null))
  }
}

describe('the fullest frame of the great raid', () => {
  it('stays under the draw budget: a full kingdom, the army and its fly inside, both machines firing, crumbs and the hand', () => {
    const k = new Kingdom(fullKingdom())
    const display = new ToyDisplay(k, 1)
    k.bell()
    let most = 0, mostItems: Item[] = []
    for (let n = 0; n < 4000 && k.raid; n++) {
      if (n % 70 === 20) { k.press(30.5, 9.5, n / 30); k.release() }
      if (n % 70 === 40) { k.press(12.5, 9.5, n / 30); k.release() }
      k.step(1 / 30)
      display.see([{ type: 'dug', x: 5, y: 5, cells: 4, speed: 1 }, { type: 'met', kind: STONE, x: 6, y: 5 }, { type: 'met', kind: 2, x: 7, y: 5 }, { type: 'met', kind: 3, x: 8, y: 5 }])
      display.seeGame(k.drainEvents(), k.drainRaidEvents())
      display.advance(1 / 30)
      const items = display.items({ glow: 1, demo: 0.5, demoIndex: 0 })
      if (drawsOf(items) > most) { most = drawsOf(items); mostItems = items.slice() }
    }
    expect(most).toBeLessThanOrEqual(DRAW_BUDGET)
    expect(most).toBeGreaterThan(45)
    const has = (who: string) => mostItems.filter((item) => item.is === 'sprite' && item.who === who).length
    // The five of the army: the one who is always at the camp polishing its ball is one of them.
    expect(has('dungBeetle')).toBe(5)
    expect(has('dungBall')).toBeGreaterThanOrEqual(5)
    expect(has('dungFly')).toBeGreaterThanOrEqual(1)
    expect(mostItems.filter((item) => item.is === 'machine').length).toBe(2)
  })
})

describe('the ending', () => {
  const ended = () => {
    const k = new Kingdom(fort()), display = new ToyDisplay(k, 1)
    k.bell()
    play(k, display, () => k.scene?.is === 'ending')
    return { k, display }
  }

  it('begins once the great raid is turned back and its put-back is over, with the kingdom already open in the save', () => {
    const { k } = ended()
    expect(k.scene?.is).toBe('ending')
    expect(k.game.position).toBe('open-kingdom')
    expect(k.game.ended).toBe(true)
  })

  it('draws no confetti, no star, no numeral and no letter in any frame: creatures, the things of the rooms, the bell and the dusk, and nothing else', () => {
    const { k, display } = ended()
    const rooms = k.toy.realm.chambers.length
    expect(rooms).toBe(2)
    const kinds = new Set<string>(), poses = new Set<string>()
    let litBefore = 0, dusk = 0, frames = 0
    play(k, display, () => false, Math.ceil((SCENE_SECONDS.ending + 4) * 30), (items) => {
      frames++
      expect(drawsOf(items)).toBeLessThanOrEqual(DRAW_BUDGET)
      for (const item of items) {
        kinds.add(item.is)
        if (item.is === 'sprite') {
          // Every pose is one the painters have, and their own tests hold each painting to shapes with no writing.
          expect(POSES[item.who], `${item.who}/${item.pose}`).toContain(item.pose)
          poses.add(`${item.who}/${item.pose}`)
        }
        // The only marks are the ones the raid left on a floor where the ground gave: dust and footprints.
        if (item.is === 'effect') expect(['scuff', 'prints']).toContain(item.effect)
        if (item.is === 'dusk') {
          expect(item.strength).toBeGreaterThanOrEqual(dusk)
          dusk = item.strength
        }
      }
      // The glow-worms come on one at a time and none goes out again.
      const lit = items.filter((item) => item.is === 'thing' && item.thing === 'lamp' && item.lit).length
      expect(lit).toBeGreaterThanOrEqual(litBefore)
      expect(lit - litBefore).toBeLessThanOrEqual(1)
      litBefore = lit
    })
    expect(frames).toBeGreaterThan(SCENE_SECONDS.ending * 30)
    // Nothing flies about and nothing points: no crumbs, no glint, no hand and no shot.
    expect([...kinds].sort()).toEqual(['drop', 'dusk', 'effect', 'sprite', 'thing'])
    expect(Object.keys(DRAWS)).toContain('dusk')
    expect(litBefore).toBe(rooms)
    expect(dusk).toBe(1)
    // The dung fly wipes its eyes on the hill, the queen puts her egg down, and the army sits on its balls at the log.
    for (const pose of ['dungFly/weep', 'dungFly/weep2', 'queen/eggDown', 'dungBeetle/sit', 'dungBall/plain']) expect([...poses], pose).toContain(pose)
    // It holds on its last beat.
    expect(k.scene).toEqual({ is: 'ending', t: SCENE_SECONDS.ending, length: SCENE_SECONDS.ending })
    expect(ENDING.duskTo).toBeLessThanOrEqual(SCENE_SECONDS.ending)
  })

  it('lights the glow-worms nearest the mouth first', () => {
    const { k } = ended()
    const order = lightingOrder(k.game.ground, k.toy.realm.chambers)
    const near = (n: number) => Math.abs((k.toy.realm.chambers[n].cells[0] % k.game.ground.cols) - MOUTH[1])
    expect(order.length).toBe(2)
    expect(near(order[0])).toBeLessThanOrEqual(near(order[1]))
  })

  it('leaves two marks when it is over: a glow-worm lit in every chamber and the leaf on its stalk, and the next party at the log', () => {
    const { k, display } = ended()
    const before = clone(k.game.ground)
    play(k, display, () => false, 60)
    // During the ending the leaf is in the dung fly's hand, not on the stalk.
    expect(display.items(null).some((item) => item.is === 'thing' && item.thing === 'leaf')).toBe(false)
    k.press(22.5, 4.5, 0)
    k.release()
    play(k, display, () => false, 30)
    expect(k.scene).toBeNull()
    const marks = (items: Item[]) => ({
      lit: items.filter((item) => item.is === 'thing' && item.thing === 'lamp' && item.lit).length,
      leaf: items.filter((item) => item.is === 'thing' && item.thing === 'leaf').length,
      dusk: items.filter((item) => item.is === 'dusk').length,
      army: items.filter((item) => item.is === 'sprite' && (item.who === 'dungBeetle' || item.who === 'dungFly')).length,
    })
    // The dung beetle and the dung fly are back at their own spots at the camp: the army has gone from the log.
    expect(marks(display.items(null))).toEqual({ lit: 2, leaf: 1, dusk: 0, army: 2 })
    expect(equal(k.game.ground, before)).toBe(true)
    // Found as left: opened again from the save, the same two marks and no scene.
    const again = new Kingdom(deserialize(JSON.parse(JSON.stringify(serialize(k.game))), null, 1)), shown = new ToyDisplay(again, 1)
    play(again, shown, () => false, 90)
    expect(again.scene).toBeNull()
    expect(marks(shown.items(null))).toEqual({ lit: 2, leaf: 1, dusk: 0, army: 2 })
    expect(again.party).toEqual(ROUND[0])
  })

  it('hangs the leaf where it covers nobody: clear of the bell, of its stalk, of the hill at its largest and of every camper', () => {
    const leaf = { left: LEAF_AT.x - THING_SIZE.leaf.width / 2, right: LEAF_AT.x + THING_SIZE.leaf.width / 2, top: LEAF_AT.y - THING_SIZE.leaf.height, bottom: LEAF_AT.y }
    expect(leaf.bottom).toBe(GRASS_Y)
    expect(leaf.left).toBeGreaterThan(MOUTH_X + LIP + hillShape(1).right.reach)
    expect(leaf.left).toBeGreaterThan(STALK.footX)
    expect(Math.hypot(Math.max(leaf.left - BELL.x, 0), Math.max(leaf.top - BELL.y, 0))).toBeGreaterThan(BELL.reach + 8)
    for (const party of [...LADDER.filter((place) => place !== 'open-kingdom').map((place) => partyAt(place, 0)), ...ROUND, PARTY['great-raid']]) {
      for (const camper of campers(party)) {
        const box = boxOf(camper)
        const over = Math.min(box.right, leaf.right) - Math.max(box.left, leaf.left) > 0 && Math.min(box.bottom, leaf.bottom) - Math.max(box.top, leaf.top) > 0
        expect(over, camper.id).toBe(false)
      }
    }
  })
})

describe('what a raid shows besides the invaders', () => {
  it('holds the lump a worker carries back over its head, where it is seen', () => {
    const game = freshGame(null, 1), g = game.ground
    for (let y = 1; y < g.rows - 1; y++) for (let x = 0; x < g.cols; x++) put(g, x, y, EARTH)
    for (let y = 1; y <= 5; y++) for (const x of MOUTH) put(g, x, y, OPEN)
    for (const y of [4, 5]) for (let x = 22; x <= 29; x++) put(g, x, y, OPEN)
    for (let y = 3; y <= 5; y++) for (let x = 30; x <= 35; x++) put(g, x, y, OPEN)
    put(g, 24, 5, MUD)
    settle(g)
    game.position = 'beetle-pair'
    game.shown.push('ant', 'beetle')
    const k = new Kingdom(game), display = new ToyDisplay(k, 1)
    k.bell()
    let carried = 0
    play(k, display, () => k.raid === null && k.scene === null, 9000, (items) => {
      if (k.scene?.is !== 'putBack') return
      const lumps = items.filter((item): item is Extract<Item, { is: 'lump' }> => item.is === 'lump')
      const workers = items.filter((item): item is Extract<Item, { is: 'sprite' }> => item.is === 'sprite' && item.who === 'worker' && (item.pose === 'carry' || item.pose === 'walk2'))
      for (const lump of lumps) {
        expect(lump.lump).toBe(MUD)
        // Over the head of a worker who stands under it.
        const under = workers.find((worker) => Math.abs(worker.x - lump.x) < 1)
        expect(under).toBeDefined()
        expect(lump.y).toBeLessThan(under!.y - 24)
        carried++
      }
    })
    expect(carried).toBeGreaterThan(5)
    expect(k.marks.length).toBeGreaterThan(0)
  })

  it('answers a shot with smoke at the cannon and a twang at the catapult, and a puff or a splat where it lands', () => {
    const game = fullKingdom()
    game.position = 'full-camp'
    const k = new Kingdom(game), display = new ToyDisplay(k, 1)
    const seen = new Set<string>()
    const look = (items: Item[]) => { for (const item of items) if (item.is === 'effect') seen.add(item.effect) }
    k.press(30.5, 9.5, 0)
    k.release()
    play(k, display, () => false, 40, look)
    k.press(12.5, 9.5, 2)
    k.release()
    play(k, display, () => false, 60, look)
    for (const effect of ['smoke', 'twang', 'stoneShot', 'mudBall', 'puff', 'splat']) expect([...seen], effect).toContain(effect)
  })
})
