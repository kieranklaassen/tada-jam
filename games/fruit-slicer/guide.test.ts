import { describe, expect, it } from 'vitest'
import { freshGame } from './cycle'
import { STROKE_AT, guideOf } from './guide'
import { GIVE_PARTS } from './measure'
import { CRATE, COUNTER, boxOf } from './stage'
import { newStroke, poke, slice } from './moves'
import { emptyWorld, onLane } from './world'

const game = freshGame(null)

describe('what the idle ladder shows', () => {
  it('glows on the fruit on the board, and the hand strokes straight down across it', () => {
    const guide = guideOf(game.world)
    const fruit = boxOf(onLane(game.world, 0)[0])!
    expect(guide.on).toBe('fruit')
    expect(guide.glow).toEqual(fruit)
    expect(guide.hand.drag).toBe(true)
    expect(guide.hand.from.x).toBe(guide.hand.to.x)
    expect(guide.hand.from.y).toBeLessThan(fruit.y)
    expect(guide.hand.to.y).toBeGreaterThan(fruit.y + fruit.h)
    expect(guide.hand.from.y).toBeGreaterThan(COUNTER.y)
    // The stroke it shows is one that really cuts.
    expect(slice(game, guide.hand.from, guide.hand.to, newStroke()).stroke.cuts).toBe(1)
  })

  it('shows how, never where: a different place each time, and none that would pass for a half, a third or a quarter', () => {
    const fruit = boxOf(onLane(game.world, 0)[0])!
    const places = [0, 1, 2, 3].map((showing) => (guideOf(game.world, showing).hand.from.x - fruit.x) / fruit.w)
    expect(new Set(places.map((place) => place.toFixed(2))).size).toBe(4)
    for (const place of STROKE_AT) for (const share of [1 / 2, 1 / 3, 2 / 3, 1 / 4, 3 / 4]) expect(Math.abs(place - share), `${place} against ${share}`).toBeGreaterThan(1 / GIVE_PARTS)
    expect(guideOf(game.world, 4)).toEqual(guideOf(game.world, 0))
    expect(guideOf(game.world, -1)).toEqual(guideOf(game.world, 3))
  })

  it('moves to the longest piece once the fruit is cut', () => {
    const cut = slice(game, { x: 300, y: 300 }, { x: 300, y: 470 }, newStroke()).game
    const pieces = onLane(cut.world, 0).map((piece) => boxOf(piece)!)
    const longest = pieces.reduce((a, b) => (b.w > a.w ? b : a))
    expect(guideOf(cut.world).glow).toEqual(longest)
  })

  it('glows on the crate, with a tap, when the board is bare: a tap that brings a fruit', () => {
    const guide = guideOf(emptyWorld())
    expect(guide).toMatchObject({ on: 'crate', glow: CRATE, hand: { drag: false } })
    expect(guide.hand.from).toEqual(guide.hand.to)
    expect(poke({ ...game, world: emptyWorld() }, guide.hand.from).events.some((event) => event.kind === 'land')).toBe(true)
  })
})
