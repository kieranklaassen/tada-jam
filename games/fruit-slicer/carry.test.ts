import { describe, expect, it } from 'vitest'
import { FLIGHT_SECONDS, FLING_SPEED, drop, fling, grab, landing, rollOver, type Held } from './carry'
import { call, freshGame, type Game } from './cycle'
import { WHOLE, giveOf } from './measure'
import { newStroke, poke, slice, tinAt, type GameEvent } from './moves'
import { tinParts } from './orders'
import { COUNTER, CRATE, DOG, LANE_H, PX, QUEUE, ROLLER, SHELF_BOX, TIN, WINDOW, X0, laneTop, type Box, type Point } from './stage'
import { eaten, inTin, marksOf, onLane, onShelf, pieceOf } from './world'

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

  it('bongs a piece back onto the board when the customer has been served or nobody is there', () => {
    const made = cutAt(start, ORDERED)
    const served = drop(made.game, hold(made.game, made.left), tinPoint).game
    const again = drop(served, hold(served, made.right), tinPoint)
    expect(kinds(again.events)).toEqual(['bounce', 'setDown'])
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
    expect(result.events).toEqual([expect.objectContaining({ kind: 'ending', how: 'fed' })])
    expect(result.game).toMatchObject({ finished: true, position: start.position })
    const more = drop(result.game, hold(result.game, made.right), mid(WINDOW))
    expect(more.events).toEqual([expect.objectContaining({ kind: 'ate', whom: 'window', voice: 'gulp' })])
    expect(eaten(more.game.world)).toHaveLength(2)
  })

  it('lets one who waits eat it there and then, and a waiting pelican leave with a whole fruit', () => {
    const result = drop(made.game, hold(made.game, made.left), mid(QUEUE[1]))
    expect(result.events).toEqual([expect.objectContaining({ kind: 'ate', whom: 1 })])
    expect(result.game.world.pieces.some((piece) => piece.id === made.left)).toBe(false)
    expect(result.game.queue).toEqual(made.game.queue)
    const whole = poke(start, mid(CRATE)).game
    const fruit = whole.world.pieces.at(-1)!
    const gone = drop(whole, hold(whole, fruit.id), mid(QUEUE[1]))
    expect(kinds(gone.events)).toEqual(['ate', 'gliderAway'])
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
