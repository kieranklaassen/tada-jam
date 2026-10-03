import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { call, crate, freshGame, give, sendOff, type Game } from './cycle'
import { RAIL, giveOf } from './measure'
import { inRange, tinParts } from './orders'
import { MOST_PIECES, deserialize, serialize } from './save'
import { STATE_VERSION } from './state'
import { LANES, SHELF, cut, onLane, onShelf, setOnBoard, setOnShelf, type Piece } from './world'

/** What ctx.storage hands back on the next visit. */
const stored = (game: Game): unknown => JSON.parse(JSON.stringify(serialize(game)))
const reopened = (game: Game, age: number | null = null): Game => deserialize(stored(game), age)

/** A visit's worth of play, every state on the way: a call, a short cut laid in the tin, a trim, a send-off, the next call. */
function played(): Game[] {
  const states: Game[] = []
  let game = freshGame(null)
  states.push(game)
  for (let round = 0; round < 6; round++) {
    game = call(game, round % 2 ? 1 : 0).game
    states.push(game)
    const landed = crate(game)
    game = landed.game
    const ordered = tinParts(game.window!)[0]
    const first = cut(game.world, landed.id, ordered + (round % 3 === 0 ? 0 : 300))
    if (first.kind !== 'cut') continue
    game = { ...game, world: first.world }
    states.push(game)
    game = give(game, first.left, 0).game
    states.push(game)
    game = { ...game, world: setOnShelf(game.world, first.right).world }
    states.push(game)
    if (!game.finished) {
      game = sendOff(game).game
      states.push(game)
    }
  }
  return states
}

describe('found as left', () => {
  it('opens every state of a visit exactly as it was put away', () => {
    const states = played()
    expect(states.length).toBeGreaterThan(20)
    for (const game of states) expect(reopened(game)).toEqual(game)
  })

  it('replays nothing: a served customer is still at the window with its tin, and the two still wait', () => {
    const served = played().find((game) => game.finished)!
    const back = reopened(served)
    expect(back.finished).toBe(true)
    expect(back.window).toEqual(served.window)
    expect(back.queue).toEqual(served.queue)
    expect(back.world.pieces.filter((piece) => piece.place.on === 'tin')).toEqual(served.world.pieces.filter((piece) => piece.place.on === 'tin'))
    expect(back.position).toBe(served.position)
  })

  it('keeps the saved place whatever age the child now has, and uses the age only for a first visit', () => {
    const game = { ...freshGame(null), position: 'thirds' }
    expect(reopened(game, 9).position).toBe('thirds')
    expect(reopened(game, 12).position).toBe('thirds')
    expect(deserialize(undefined, 12).position).toBe('written')
    expect(deserialize(undefined, null).position).toBe(LADDER[0])
  })
})

describe('a record that cannot be trusted', () => {
  const good = stored(played()[8]) as Record<string, unknown>

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'fruit'],
    ['an array', [1, 2]],
    ['a version above this one', { ...good, v: STATE_VERSION + 1 }],
    ['no version', { ...good, v: undefined }],
  ])('gives a first visit for %s', (_, raw) => {
    expect(deserialize(raw, null)).toEqual(freshGame(null))
  })

  it('repairs each field by itself and keeps the rest', () => {
    const whole = deserialize(good)
    expect(deserialize({ ...good, position: 'grade-4' })).toEqual({ ...whole, position: LADDER[0] })
    expect(deserialize({ ...good, seed: 'x' }).world).toEqual(whole.world)
    expect(deserialize({ ...good, shown: ['half', 'half', 'nowhere', 7] }).shown).toEqual(['half'])
    expect(deserialize({ ...good, nextId: -4 }).world.nextId).toBeGreaterThan(Math.max(...whole.world.pieces.map((piece) => piece.id)))
    expect(deserialize({ ...good, pieces: 'none' })).toMatchObject({ position: whole.position, window: whole.window, world: { pieces: [] } })
  })

  it('lays out a new customer where a saved one is not an order the rules allow', () => {
    const bad = [{ who: 'pelican', fruit: 'long', shares: [{ num: 1, den: 7 }], step: true, written: false, lined: true }, 'nobody']
    const back = deserialize({ ...good, queue: bad })
    for (const customer of back.queue) expect(inRange(customer)).toEqual([])
    expect(deserialize({ ...good, window: { who: 'wolf' } }).window).toBeNull()
    expect(deserialize({ ...good, window: { who: 'wolf' }, finished: true }).finished).toBe(false)
  })

  it('drops what no cut could have made, and never opens with one piece lying over another', () => {
    const a: Piece = { id: 1, fruit: 'long', length: 1200, place: { on: 'board', lane: 0, x: 0 }, blind: true, ruled: 0 }
    const pieces = [
      a,
      { ...a, id: 2, place: { on: 'board', lane: 0, x: 600 } },
      { ...a, id: 3, place: { on: 'board', lane: 0, x: RAIL } },
      { ...a, id: 4, length: 10 },
      { ...a, id: 5, length: 99999 },
      { ...a, id: 1 },
      { ...a, id: 6, fruit: 'pear' },
      { ...a, id: 7, place: { on: 'roof' } },
      { ...a, id: 8, place: { on: 'tin', part: 9, turn: 0 }, blind: 'yes', ruled: -1 },
      'crumb',
    ]
    const back = deserialize({ ...good, pieces })
    expect(back.world.pieces.map((piece) => piece.id).sort()).toEqual([1, 2, 3, 8])
    for (let lane = 0; lane < LANES; lane++) {
      let end = 0
      for (const piece of onLane(back.world, lane)) {
        const x = piece.place.on === 'board' ? piece.place.x : -1
        expect(x).toBeGreaterThanOrEqual(end)
        end = x + piece.length
        expect(end).toBeLessThanOrEqual(RAIL)
      }
    }
    expect(back.world.pieces.find((piece) => piece.id === 8)).toMatchObject({ place: { on: 'shelf' }, blind: false, ruled: 0 })
    expect(onShelf(back.world).length).toBeLessThanOrEqual(SHELF)
  })

  it('puts pieces saved in a tin on the shelf when nobody is at the window', () => {
    const tinned = stored(played().find((game) => game.world.pieces.some((piece) => piece.place.on === 'tin'))!) as Record<string, unknown>
    const back = deserialize({ ...tinned, window: null })
    expect(back.world.pieces.some((piece) => piece.place.on === 'tin')).toBe(false)
    expect(back.world.tinOpen).toBe(false)
  })
})

describe('the size of a save', () => {
  it('stays under half of the 64 KB cap for the largest state the rules allow', () => {
    // Both lanes, both compartments of the twins' tin and the shelf, full of the shortest pieces there are.
    const least = giveOf('short')
    const pieces: Piece[] = []
    let id = 100000
    for (let lane = 0; lane < LANES; lane++) for (let x = 0; x + least <= RAIL; x += least) pieces.push({ id: id++, fruit: 'middle', length: least, place: { on: 'board', lane, x }, blind: false, ruled: 12 })
    for (let part = 0; part < 2; part++) for (let turn = 0; turn < RAIL / least; turn++) pieces.push({ id: id++, fruit: 'middle', length: least, place: { on: 'tin', part, turn }, blind: false, ruled: 12 })
    for (let slot = 0; slot < SHELF; slot++) pieces.push({ id: id++, fruit: 'middle', length: least, place: { on: 'shelf', slot }, blind: false, ruled: 12 })
    expect(pieces).toHaveLength(MOST_PIECES)
    const cat = { who: 'cat' as const, fruit: 'middle' as const, shares: [{ num: 11, den: 12 }, { num: 9, den: 10 }], step: false, written: false, lined: false }
    const largest: Game = { v: STATE_VERSION, position: 'twelfths', finished: false, seed: 4294967295, window: { ...cat, who: 'twins', shares: [{ num: 12, den: 12 }] }, queue: [cat, cat], world: { pieces, nextId: id, tinOpen: false }, shown: [...LADDER] }
    const size = JSON.stringify(serialize(largest)).length
    expect(size).toBeLessThan(32 * 1024)
    expect(size).toBeGreaterThan(8 * 1024)
  })

  it('cannot be passed by play: a lane holds no more pieces than its length in shortest pieces', () => {
    let world = freshGame(null).world
    const fruit = world.pieces[0]
    for (let i = 0; i < 200; i++) for (const piece of [...world.pieces]) world = cut(world, piece.id, piece.length / 2).world
    expect(world.pieces.length).toBeLessThanOrEqual(fruit.length / giveOf(fruit.fruit))
    world = setOnBoard(world, world.pieces[0].id, 1, 0).world
    for (let lane = 0; lane < LANES; lane++) expect(onLane(world, lane).length).toBeLessThanOrEqual(RAIL / giveOf('short'))
  })
})
