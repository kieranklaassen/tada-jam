import { describe, expect, it } from 'vitest'
import { FLIGHT_SECONDS, FLING_SPEED, drop, fling, grab, landing, rollOver, type Held } from './carry'
import { call, freshGame, type Game } from './cycle'
import { WHOLE, giveOf } from './measure'
import { land, newStroke, poke, slice, tinAt, type GameEvent } from './moves'
import { tinParts } from './orders'
import { COUNTER, CRATE, DOG, LANE_H, PX, QUEUE, ROLLER, SHELF_BOX, TIN, WINDOW, X0, laneTop, type Box, type Point } from './stage'
import { SHELF, eaten, inTin, marksOf, onLane, onShelf, pieceOf, setOnShelf } from './world'

const fresh = freshGame(null)
const start = call(fresh, 0).game
const ORDERED = tinParts(start.window!)[0]
const NEAR = laneTop(0) + LANE_H / 2, FAR = laneTop(1) + LANE_H / 2
const mid = (box: Box): Point => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })
const kinds = (events: GameEvent[]) => events.map((event) => event.kind)
const total = (game: Game) => game.world.pieces.reduce((sum, piece) => sum + piece.length, 0)
/** The fruit on the near lane cut at `points`; returns the game and the two parts' ids. */
function cutAt(game: Game, points: number) {
  const x = X0 + points * PX
  const result = slice(game, { x, y: NEAR - 50 }, { x, y: NEAR + 50 }, newStroke())
  const event = result.events.find((one) => one.kind === 'cut')
  if (!event || event.kind !== 'cut') throw new Error('no cut')
  return { game: result.game, left: event.left, right: event.right }
}
/** Takes hold of a piece by a point `along` its length, 0 to 1. */
function hold(game: Game, id: number, along = 0.25): Held {
  const piece = pieceOf(game.world, id)!
  const x = piece.place.on === 'board' ? X0 + (piece.place.x + piece.length * along) * PX : X0 + piece.length * along * PX
  const y = piece.place.on === 'board' ? laneTop(piece.place.lane) + LANE_H / 2 : piece.place.on === 'tin' ? TIN.bodyY + TIN.bodyH / 2 : SHELF_BOX.y + 30
  const held = grab(game, { x, y })
  if (!held) throw new Error('nothing to hold')
  return held
}
const tinPoint: Point = { x: X0 + 30, y: TIN.bodyY + TIN.bodyH / 2 }

describe('taking hold', () => {
  it('takes the piece the finger lands on, and nothing when it lands on bare wood', () => {
    const made = cutAt(start, ORDERED)
    expect(hold(made.game, made.left).ids).toEqual([made.left])
    expect(grab(made.game, { x: X0 + 2800 * PX, y: NEAR })).toBeNull()
    expect(grab(made.game, mid(CRATE))).toBeNull()
  })

  it('leaves the piece where it was in the world until it is let go', () => {
    const made = cutAt(start, ORDERED)
    const before = JSON.stringify(made.game)
    hold(made.game, made.left)
    expect(JSON.stringify(made.game)).toBe(before)
  })

  it('takes two parts of a cut one at a time, since they hopped apart', () => {
    const made = cutAt(start, ORDERED)
    expect(hold(made.game, made.left, 0.9).ids).toEqual([made.left])
    expect(hold(made.game, made.right, 0.1).ids).toEqual([made.right])
  })
})

describe('letting go over the tin', () => {
  it('lays the piece in: the tin springs open, the idea is shown once, and a fit ends the cycle', () => {
    const made = cutAt(start, ORDERED)
    const result = drop(made.game, hold(made.game, made.left), tinPoint)
    expect(kinds(result.events)).toEqual(['given', 'ending'])
    expect(result.events[0]).toMatchObject({ opened: true, firstShowing: 'half', voice: 'spring' })
    expect(result.events[1]).toMatchObject({ how: 'shut', ending: { outcome: 'well' } })
    expect(result.game.finished).toBe(true)
    expect(eaten(result.game.world).map((piece) => piece.id)).toEqual([made.left])
  })

  it('says how a misfit sits: sticking out past the jaw, or leaving a gap, by exactly so much', () => {
    const long = cutAt(start, ORDERED + 300)
    expect(drop(long.game, hold(long.game, long.left), tinPoint).events[1]).toMatchObject({ kind: 'misfit', how: 'over', by: 300, voice: 'clang' })
    const short = cutAt(start, ORDERED - 300)
    const under = drop(short.game, hold(short.game, short.left), tinPoint)
    expect(under.events[1]).toMatchObject({ kind: 'misfit', how: 'under', by: -300, voice: 'slide' })
    expect(under.game.finished).toBe(false)
    expect(inTin(under.game.world, 0)).toHaveLength(1)
  })

  it('shuts the lid when the piece that made it too much is taken out again', () => {
    // A short piece is laid in first, then one of the ordered length: together they stick out. Taking the short one out leaves a fit.
    const short = cutAt(start, 500)
    const exact = cutAt(short.game, 500 + giveOf(start.window!.fruit) / 4 + ORDERED)
    let game = drop(exact.game, hold(exact.game, short.left), tinPoint).game
    game = drop(game, hold(game, exact.left), tinPoint).game
    expect(game.finished).toBe(false)
    expect(inTin(game.world, 0).map((piece) => piece.id)).toEqual([short.left, exact.left])
    const out = drop(game, hold(game, short.left, 0.5), { x: X0 + 2300 * PX, y: FAR })
    expect(kinds(out.events)).toEqual(['setDown', 'ending'])
    expect(out.events[1]).toMatchObject({ how: 'shut', ending: { outcome: 'well' } })
    expect(out.game.finished).toBe(true)
  })

  it('has no tin to lay a piece in once the customer has been served, or when nobody is there: the piece comes back to the board', () => {
    const made = cutAt(start, ORDERED)
    const served = drop(made.game, hold(made.game, made.left), tinPoint).game
    expect(tinAt(served)).toBeNull()
    const again = drop(served, hold(served, made.right), tinPoint)
    expect(kinds(again.events)).toEqual(['setDown'])
    expect(pieceOf(again.game.world, made.right)!.place.on).toBe('board')
    const alone = cutAt(fresh, 900)
    expect(tinAt(alone.game)).toBeNull()
    expect(kinds(drop(alone.game, hold(alone.game, alone.left), tinPoint).events)).toEqual(['setDown'])
  })
})

describe('letting go over a customer, the dog or the crate', () => {
  const made = cutAt(start, ORDERED)

  it('feeds the customer at the window by hand, which ends the cycle as mixed', () => {
    const result = drop(made.game, hold(made.game, made.left), mid(WINDOW))
    // The piece goes from the hand to the mouth with a gulp, and that ends the cycle.
    expect(result.events).toEqual([expect.objectContaining({ kind: 'ate', whom: 'window', voice: 'gulp' }), expect.objectContaining({ kind: 'ending', how: 'fed' })])
    expect(result.game).toMatchObject({ finished: true, position: start.position })
    const more = drop(result.game, hold(result.game, made.right), mid(WINDOW))
    expect(more.events).toEqual([expect.objectContaining({ kind: 'ate', whom: 'window', voice: 'gulp' })])
    expect(eaten(more.game.world)).toHaveLength(2)
  })

  it('lets what is eaten fly from where it was let go, and from the top of the crate when the crate burps it across', () => {
    const fellFrom = (events: readonly GameEvent[]) => (events.find((event) => event.kind === 'fell') as Extract<GameEvent, { kind: 'fell' }>).from
    const toDog = fellFrom(drop(made.game, hold(made.game, made.left), mid(DOG)).events)
    expect(Math.abs(toDog.y + toDog.h / 2 - mid(DOG).y)).toBeLessThan(40)
    expect(toDog.x).toBeLessThan(mid(DOG).x)
    expect(toDog.x + toDog.w).toBeGreaterThan(mid(DOG).x)
    const fromCrate = fellFrom(drop(made.game, hold(made.game, made.left), mid(CRATE)).events)
    expect(fromCrate.x + fromCrate.w / 2).toBeCloseTo(mid(CRATE).x)
    expect(fromCrate.y).toBeLessThan(CRATE.y)
    const eatenFrom = (drop(made.game, hold(made.game, made.left), mid(QUEUE[1])).events[0] as Extract<GameEvent, { kind: 'ate' }>).from
    expect(Math.abs(eatenFrom.y + eatenFrom.h / 2 - mid(QUEUE[1]).y)).toBeLessThan(40)
  })

  it('brings the lid down on what is left when a piece taken out of the tin leaves a misfit, once', () => {
    const exact = cutAt(start, ORDERED)
    const rest = pieceOf(exact.game.world, exact.right)!
    const spare = cutAt(exact.game, (rest.place.on === 'board' ? rest.place.x : 0) + 300)
    let game = drop(spare.game, hold(spare.game, spare.left), tinPoint).game
    game = drop(game, hold(game, exact.left), { x: tinPoint.x + 200, y: tinPoint.y }).game
    // The exact piece is taken out and fed to one who waits: the spare alone is too short, and the jaw closes on air.
    const out = drop(game, hold(game, exact.left, 0.5), mid(QUEUE[1]))
    expect(kinds(out.events)).toEqual(['ate', 'misfit'])
    expect(out.events[1]).toMatchObject({ how: 'under', id: spare.left, voice: 'slide', gap: ORDERED - 300 })
    // A piece moved within the tin is laid in again: the lid comes down for that, and not a second time.
    const moved = drop(game, hold(game, spare.left, 0.5), { x: tinPoint.x + 300, y: tinPoint.y })
    expect(kinds(moved.events).filter((kind) => kind === 'misfit')).toHaveLength(1)
  })

  it('shuts the lid by itself when a piece taken out of the tin and given away leaves a fit', () => {
    // An exact piece and a spare lie in the tin together: too long. The spare is taken out and given to one who waits.
    const exact = cutAt(start, ORDERED)
    const rest = pieceOf(exact.game.world, exact.right)!
    const spare = cutAt(exact.game, (rest.place.on === 'board' ? rest.place.x : 0) + 300)
    // The spare goes in first, which is too short; then the exact piece beside it, which is too long.
    let game = drop(spare.game, hold(spare.game, spare.left), tinPoint).game
    game = drop(game, hold(game, exact.left), { x: tinPoint.x + 200, y: tinPoint.y }).game
    expect(game.finished).toBe(false)
    expect(inTin(game.world, 0).map((piece) => piece.id)).toEqual([spare.left, exact.left])
    const out = drop(game, hold(game, spare.left, 0.5), mid(QUEUE[1]))
    expect(kinds(out.events)).toEqual(['ate', 'ending'])
    expect(out.events[1]).toMatchObject({ how: 'shut' })
    expect(out.game.finished).toBe(true)
  })

  it('sends a piece of another fruit to the dog from the tin it was laid in, not from where it lay before', () => {
    const wrongFruit = start.window!.fruit === 'short' ? 'long' : 'short'
    const landed = land(start, wrongFruit)
    const id = landed.events.find((event) => event.kind === 'land')!
    const piece = pieceOf(landed.game.world, (id as Extract<GameEvent, { kind: 'land' }>).id)!
    const out = drop(landed.game, hold(landed.game, piece.id), tinPoint)
    const fell = out.events.find((event) => event.kind === 'fell') as Extract<GameEvent, { kind: 'fell' }>
    expect(fell.piece.id).toBe(piece.id)
    expect(fell.from.y).toBe(TIN.bodyY + (TIN.bodyH - TIN.pieceH) / 2)
    expect(kinds(out.events)).toContain('flinch')
  })

  it('lets one who waits eat it there and then, and a waiting pelican leave with a whole fruit', () => {
    const result = drop(made.game, hold(made.game, made.left), mid(QUEUE[1]))
    expect(result.events).toEqual([expect.objectContaining({ kind: 'ate', whom: 1 })])
    expect(result.game.world.pieces.some((piece) => piece.id === made.left)).toBe(false)
    expect(result.game.queue).toEqual(made.game.queue)
    const whole = poke(start, mid(CRATE)).game
    const fruit = whole.world.pieces.at(-1)!
    const gone = drop(whole, hold(whole, fruit.id), mid(QUEUE[1]))
    // The fruit is not swallowed: it goes across the beak, and the event says which fruit it is.
    expect(kinds(gone.events)).toEqual(['gliderAway'])
    expect(gone.events[0]).toMatchObject({ fruit: expect.any(String) })
    expect(gone.game.seed).not.toBe(whole.seed)
    expect(gone.game.world.pieces.some((piece) => piece.id === fruit.id)).toBe(false)
  })

  it('gives it to the dog, or to the crate, which burps it across to the dog: either way it is gone', () => {
    const toDog = drop(made.game, hold(made.game, made.left), mid(DOG))
    expect(toDog.events).toEqual([expect.objectContaining({ kind: 'fell', voice: 'munch' })])
    const toCrate = drop(made.game, hold(made.game, made.left), mid(CRATE))
    expect(kinds(toCrate.events)).toEqual(['burp', 'fell'])
    for (const result of [toDog, toCrate]) expect(total(result.game)).toBe(total(made.game) - ORDERED)
  })
})

describe('letting go over the board and the shelf', () => {
  const made = cutAt(start, 600)

  it('lays a piece alongside a whole fruit from the same left end even when the other lane is in use there: what is in the way goes to the shelf', () => {
    // A whole fruit on each lane, and a piece cut from a third that has been set on the shelf.
    const two = land(start).game
    const fruits = [onLane(two.world, 0)[0], onLane(two.world, 1)[0]]
    expect(fruits.every((fruit) => fruit && fruit.length === WHOLE[fruit.fruit])).toBe(true)
    const made = cutAt(two, 600)
    // The right part of the near fruit, laid alongside the far fruit: the other lane is the near one, where the left part lies in the way.
    const far = onLane(made.game.world, 1)[0]
    const out = drop(made.game, hold(made.game, made.right), { x: X0 + 1200 * PX, y: FAR })
    expect(kinds(out.events).slice(0, 2)).toEqual(['swept', 'setDown'])
    expect(out.events.find((event) => event.kind === 'setDown')).toMatchObject({ how: 'beside' })
    const laid = pieceOf(out.game.world, made.right)!
    expect(laid.place).toEqual({ on: 'board', lane: 0, x: far.place.on === 'board' ? far.place.x : -1 })
    expect(pieceOf(out.game.world, made.left)!.place.on).toBe('shelf')
  })

  it('lays a piece taken from the oldest row of a full shelf, and does not push that very piece off the shelf with what it sweeps there', () => {
    const two = land(start).game
    const made = cutAt(two, 600)
    // The right part goes to the shelf first of all, and three small pieces after it fill the shelf.
    let world = setOnShelf(made.game.world, made.right).world
    for (let slot = 1; slot < SHELF; slot++) world = { ...world, pieces: [...world.pieces, { id: world.nextId, fruit: 'long', length: 200, place: { on: 'shelf', slot }, blind: true, ruled: 0, mark: 0 }], nextId: world.nextId + 1 }
    const game: Game = { ...made.game, world }
    expect(onShelf(game.world).map((piece) => piece.id)[0]).toBe(made.right)
    const held = grab(game, { x: X0 + 40, y: SHELF_BOX.y + 30 })!
    expect(held.ids).toEqual([made.right])
    // Laid alongside the far fruit, where the left part lies in the way: the left part goes to the shelf, and the piece in the hand is laid.
    const out = drop(game, held, { x: X0 + 1200 * PX, y: FAR })
    expect(kinds(out.events)).toEqual(['swept', 'setDown'])
    expect(pieceOf(out.game.world, made.right)!.place).toMatchObject({ on: 'board', lane: 0 })
    expect(pieceOf(out.game.world, made.left)!.place.on).toBe('shelf')
    expect(onShelf(out.game.world)).toHaveLength(SHELF)
    expect(total(out.game)).toBe(total(game))
  })

  it('butts a piece end to end against another even when something lies there: what is in the way goes to the shelf, and the two travel as a row', () => {
    // A fruit cut in two on the near lane, and a whole fruit on the far lane to take a piece from.
    const two = land(start).game
    const near = cutAt(two, 600)
    const farFruit = onLane(near.game.world, 1)[0]
    const farCut = slice(near.game, { x: X0 + 300 * PX, y: FAR - 40 }, { x: X0 + 300 * PX, y: FAR + 40 }, newStroke())
    const piece = farCut.events.find((event) => event.kind === 'cut') as Extract<GameEvent, { kind: 'cut' }>
    expect(piece.left).toBe(farFruit.id)
    // The far lane's 300 is let go on the right half of the near lane's 600: where the rest of that fruit lies in the way.
    const leftPart = pieceOf(farCut.game.world, near.left)!
    const out = drop(farCut.game, hold(farCut.game, piece.left), { x: X0 + 500 * PX, y: NEAR })
    expect(kinds(out.events).slice(0, 2)).toEqual(['swept', 'setDown'])
    expect(out.events.find((event) => event.kind === 'setDown')).toMatchObject({ how: 'butted' })
    expect(pieceOf(out.game.world, piece.left)!.place).toEqual({ on: 'board', lane: 0, x: leftPart.length })
    expect(pieceOf(out.game.world, near.right)!.place.on).toBe('shelf')
    // Taken by its left half, the 600 now travels with the piece butted against it.
    expect(grab(out.game, { x: X0 + 100 * PX, y: NEAR })!.ids).toEqual([near.left])
    expect(grab(out.game, { x: X0 + 500 * PX, y: NEAR })!.ids).toEqual([near.left, piece.left])
  })

  it('lays a piece alongside a whole fruit, from the same left end, on the other lane', () => {
    // The piece goes to the shelf first, a fresh fruit lands on the far lane, and the piece is let go on that fruit.
    const shelved = drop(made.game, hold(made.game, made.left), mid(SHELF_BOX)).game
    const other = poke(shelved, mid(CRATE)).game
    const fruit = onLane(other.world, 1)[0]
    expect(fruit.length).toBe(WHOLE[fruit.fruit])
    const result = drop(other, hold(other, made.left), { x: X0 + fruit.length * 0.7 * PX, y: FAR })
    expect(result.events[0]).toMatchObject({ kind: 'setDown', how: 'beside', voice: 'lay' })
    expect(pieceOf(result.game.world, made.left)!.place).toEqual({ on: 'board', lane: 0, x: 0 })
  })

  it('butts a piece end to end against another, on the side the finger is nearer, and the two are then a row', () => {
    // Two cuts make three parts; the third goes to the dog, which leaves room at the end of the second.
    const more = cutAt(made.game, 600 + giveOf('long') / 4 + 600)
    const cleared = drop(more.game, hold(more.game, more.right), mid(DOG)).game
    const second = pieceOf(cleared.world, more.left)!
    const secondX = second.place.on === 'board' ? second.place.x : -1
    const result = drop(cleared, hold(cleared, made.left, 0.5), { x: X0 + (secondX + second.length * 0.9) * PX, y: NEAR })
    expect(result.events[0]).toMatchObject({ kind: 'setDown', how: 'butted', voice: 'butt' })
    expect(pieceOf(result.game.world, made.left)!.place).toEqual({ on: 'board', lane: 0, x: secondX + second.length })
    // Taken by its inner half, the row travels as one; by its outer half, the end piece comes away alone.
    expect(hold(result.game, made.left, 0.2).ids).toEqual([more.left, made.left])
    expect(hold(result.game, made.left, 0.8).ids).toEqual([made.left])
    expect(hold(result.game, more.left, 0.8).ids).toEqual([more.left, made.left])
    expect(total(result.game)).toBe(total(cleared))
  })

  it('sets a piece down from the hand that let it go, not from where it lay before it was carried', () => {
    const made = cutAt(start, 600)
    const letGo = { x: X0 + 1900 * PX, y: SHELF_BOX.y + 40 }
    const out = drop(made.game, hold(made.game, made.left), letGo)
    const down = out.events.find((event) => event.kind === 'setDown') as Extract<GameEvent, { kind: 'setDown' }>
    // The box it starts from is under the finger: far from where it lay on the board.
    expect(down.from[0].x + down.from[0].w).toBeGreaterThan(letGo.x - 10)
    expect(Math.abs(down.from[0].y + down.from[0].h / 2 - letGo.y)).toBeLessThan(40)
    // Laid in the tin, it comes from the hand too.
    const given = drop(made.game, hold(made.game, made.left), tinPoint).events.find((event) => event.kind === 'given') as Extract<GameEvent, { kind: 'given' }>
    expect(Math.abs(given.from.y + given.from.h / 2 - tinPoint.y)).toBeLessThan(40)
  })

  it('puts a piece where it is let go on the board, on the shelf, and back on the board from anywhere else', () => {
    const onFar = drop(made.game, hold(made.game, made.left), { x: X0 + 1000 * PX, y: FAR })
    expect(pieceOf(onFar.game.world, made.left)!.place).toMatchObject({ on: 'board', lane: 1 })
    const shelved = drop(made.game, hold(made.game, made.left), mid(SHELF_BOX))
    expect(onShelf(shelved.game.world).map((piece) => piece.id)).toEqual([made.left])
    for (const point of [{ x: 648, y: 100 }, { x: COUNTER.x + 10, y: COUNTER.y + COUNTER.h - 6 }, mid(ROLLER), { x: -40, y: -40 }]) {
      const back = drop(made.game, hold(made.game, made.left), point)
      expect(pieceOf(back.game.world, made.left)!.place.on, JSON.stringify(point)).toBe('board')
      expect(total(back.game)).toBe(total(made.game))
    }
  })
})

describe('a piece let go at speed', () => {
  const made = cutAt(start, 600)
  const from: Point = { x: 700, y: COUNTER.y + COUNTER.h - 30 }
  /** The speed that makes a piece let go at `from` come down on `to`. */
  const towards = (to: Point): Point => ({ x: (to.x - from.x) / FLIGHT_SECONDS, y: (to.y - from.y) / FLIGHT_SECONDS })
  const flung = (game: Game, id: number, to: Point) => fling(game, hold(game, id), from, towards(to))

  it('comes down further off the faster it is thrown, over whatever lies between, and always on the page', () => {
    expect(landing(from, towards(mid(WINDOW))).x).toBeCloseTo(mid(WINDOW).x)
    expect(landing(from, towards(mid(WINDOW))).y).toBeCloseTo(mid(WINDOW).y)
    expect(landing(from, { x: 0, y: -99999 }).y).toBeGreaterThan(0)
    expect(landing(from, { x: 99999, y: 0 }).x).toBeLessThan(1180)
    expect(landing(from, { x: 0, y: 0 })).toEqual(from)
    // The gentlest throw that counts as one still carries a piece a fair way.
    expect(landing(from, { x: 0, y: -FLING_SPEED }).y).toBeLessThan(from.y - 200)
  })

  it('splats on a customer and is licked off, and the dog catches one in the air: both are gone', () => {
    expect(flung(made.game, made.left, mid(WINDOW)).events).toEqual([expect.objectContaining({ kind: 'splat', whom: 'window', voice: 'splat' })])
    expect(flung(made.game, made.left, mid(QUEUE[0])).events).toEqual([expect.objectContaining({ kind: 'splat', whom: 0 })])
    const caught = flung(made.game, made.left, mid(DOG))
    expect(caught.events).toEqual([expect.objectContaining({ kind: 'fell', voice: 'catch' })])
    expect(total(caught.game)).toBe(total(made.game) - 600)
  })

  it('bongs off the tin and boings off a whole fruit, back onto the board', () => {
    const off = flung(made.game, made.left, tinPoint)
    expect(off.events[0]).toMatchObject({ kind: 'bounce', off: 'tin', voice: 'bong' })
    expect(pieceOf(off.game.world, made.left)!.place.on).toBe('board')
    const other = poke(made.game, mid(CRATE)).game
    const fruit = onLane(other.world, 1)[0]
    const hit = flung(other, made.left, { x: X0 + fruit.length * 0.5 * PX, y: FAR })
    expect(hit.events[0]).toMatchObject({ kind: 'bounce', off: 'fruit', voice: 'boing' })
    expect(total(hit.game)).toBe(total(other))
  })

  it('rocks the crate, and a fruit jumps out by itself', () => {
    const result = flung(made.game, made.left, mid(CRATE))
    expect(kinds(result.events)).toContain('land')
    expect(result.events.find((event) => event.kind === 'bounce')).toMatchObject({ off: 'crate', voice: 'rock' })
    expect(result.game.world.pieces.length).toBe(made.game.world.pieces.length + 1)
  })

  it('knocks a piece along its lane until it meets the next thing, and lands where that piece was', () => {
    const shelved = drop(made.game, hold(made.game, made.left), mid(SHELF_BOX)).game
    const target = pieceOf(shelved.world, made.right)!
    const wasAt = target.place.on === 'board' ? target.place.x : -1
    const aim = { x: X0 + (wasAt + 200) * PX, y: NEAR }
    const result = fling(shelved, hold(shelved, made.left), { x: aim.x - 400, y: NEAR }, { x: 400 / FLIGHT_SECONDS, y: 0 })
    expect(kinds(result.events)).toEqual(['knocked', 'setDown'])
    const moved = pieceOf(result.game.world, made.right)!.place
    expect(moved.on === 'board' ? moved.x : -1).toBeGreaterThan(wasAt)
    expect(moved.on === 'board' ? moved.x + target.length : 9999).toBeLessThanOrEqual(2880)
    expect(pieceOf(result.game.world, made.left)!.place.on).toBe('board')
    expect(total(result.game)).toBe(total(shelved))
  })

  it('is set down where it comes down on anything bare, and is only set down when it has no speed', () => {
    const away = flung(made.game, made.left, { x: 648, y: 100 })
    expect(kinds(away.events)).toEqual(['setDown'])
    expect(pieceOf(away.game.world, made.left)!.place.on).toBe('board')
    const still = fling(made.game, hold(made.game, made.left), { x: X0 + 900 * PX, y: FAR }, { x: 0, y: 0 })
    expect(kinds(still.events)).toEqual(['setDown'])
  })
})

describe('the roller', () => {
  const made = cutAt(start, ORDERED - 300)
  const parts = start.window!.shares[0].den

  it('presses the parts of the ticket into a fruit, one tick a part, and into a piece as if it were a whole', () => {
    const other = poke(start, mid(CRATE)).game
    const fruit = onLane(other.world, 1)[0]
    const onFruit = rollOver(other, { x: X0 + 100, y: FAR })
    expect(onFruit.events).toEqual([{ kind: 'pressed', id: fruit.id, parts, length: fruit.length, voice: 'ticks' }])
    expect(marksOf(pieceOf(onFruit.game.world, fruit.id)!)).toHaveLength(parts - 1)
    const onPiece = rollOver(made.game, { x: X0 + 60, y: NEAR })
    expect(onPiece.events[0]).toMatchObject({ kind: 'pressed', id: made.left, voice: 'press' })
    expect(pieceOf(onPiece.game.world, made.left)!.ruled).toBe((ORDERED - 300) / parts)
  })

  it('only drums on a fruit when no order is waiting to be filled, and leaves no mark', () => {
    const result = rollOver(fresh, { x: X0 + 100, y: NEAR })
    expect(result.events).toEqual([expect.objectContaining({ kind: 'rolled', on: 'bare', voice: 'drum' })])
    expect(result.game).toEqual(fresh)
  })

  it('drums on a shut tin, and on an open one the ruled parts answer one by one', () => {
    expect(rollOver(start, tinPoint).events[0]).toMatchObject({ kind: 'rolled', on: 'tin', voice: 'drum', parts: 0 })
    const open = drop(made.game, hold(made.game, made.left), tinPoint).game
    expect(rollOver(open, { x: X0 + ORDERED * PX - 10, y: tinPoint.y }).events[0]).toMatchObject({ kind: 'rolled', on: 'tin', voice: 'rule', parts })
  })

  it('rolls a customer flat, rattles the crate, irons the dog, and changes none of them', () => {
    expect(rollOver(start, mid(WINDOW))).toEqual({ game: start, events: [expect.objectContaining({ on: 'customer', whom: 'window', voice: 'honk' })] })
    expect(rollOver(start, mid(QUEUE[1])).events[0]).toMatchObject({ on: 'customer', whom: 1, voice: 'honk' })
    expect(rollOver(start, mid(CRATE)).events[0]).toMatchObject({ on: 'crate', voice: 'washboard' })
    expect(rollOver(start, mid(DOG)).events[0]).toMatchObject({ on: 'dog', voice: 'sproing' })
  })
})
