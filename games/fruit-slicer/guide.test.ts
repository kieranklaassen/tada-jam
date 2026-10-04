import { describe, expect, it } from 'vitest'
import { drop, grab } from './carry'
import { call, freshGame, type Game } from './cycle'
import { LADDER } from './config'
import { guideOf, strokePlaces, usefulPieces } from './guide'
import { GIVE_PARTS, WHOLE, fitOf, giveOf } from './measure'
import { newStroke, poke, slice, tinAt } from './moves'
import { layOut, tinParts, wanted } from './orders'
import { CRATE, COUNTER, LANE_H, PX, QUEUE, WINDOW, X0, boxOf, laneTop } from './stage'
import { onLane, remove } from './world'

const fresh = freshGame(null)
const start = call(fresh, 0).game
const NEAR = laneTop(0) + LANE_H / 2
const cutAt = (game: Game, points: number): Game => slice(game, { x: X0 + points * PX, y: NEAR - 50 }, { x: X0 + points * PX, y: NEAR + 50 }, newStroke()).game

describe('with nobody to serve', () => {
  it('glows on the two who wait, and the hand taps one of them: a tap that calls it', () => {
    const guide = guideOf(fresh)
    expect(guide).toMatchObject({ on: 'waiting', glow: [QUEUE[0], QUEUE[1]], hand: { drag: false } })
    expect(poke(fresh, guide.hand.from).game.window).toEqual(fresh.queue[0])
    expect(poke(fresh, guideOf(fresh, 1).hand.from).game.window).toEqual(fresh.queue[1])
  })

  it('does the same once the customer at the window has been served', () => {
    const ordered = tinParts(start.window!)[0]
    const made = cutAt(start, ordered)
    const piece = onLane(made.world, 0)[0]
    const served = drop(made, grab(made, { x: X0 + 30, y: NEAR })!, { x: X0 + 30, y: tinAt(made)!.body.y + 20 }).game
    expect(piece.length).toBe(ordered)
    expect(served.finished).toBe(true)
    expect(guideOf(served).on).toBe('waiting')
  })
})

describe('with a customer to serve', () => {
  it('glows on its fruit, and the hand strokes straight down across it: a stroke that really cuts', () => {
    const guide = guideOf(start)
    const fruit = boxOf(onLane(start.world, 0)[0])!
    expect(guide).toMatchObject({ on: 'fruit', glow: [fruit], hand: { drag: true } })
    expect(guide.hand.from.x).toBe(guide.hand.to.x)
    expect(guide.hand.from.y).toBeLessThan(fruit.y)
    expect(guide.hand.from.y).toBeGreaterThan(COUNTER.y)
    expect(slice(start, guide.hand.from, guide.hand.to, newStroke()).stroke.cuts).toBe(1)
  })

  it('shows how, never where: the stroke is never at the share on the ticket, nor anywhere near it', () => {
    const share = wanted(start.window!)
    const fruit = boxOf(onLane(start.world, 0)[0])!
    const places = [0, 1, 2, 3, 4, 5].map((showing) => (guideOf(start, showing).hand.from.x - fruit.x) / fruit.w)
    for (const place of places) expect(Math.abs(place - share.num / share.den)).toBeGreaterThan(2 / GIVE_PARTS)
    expect(new Set(places.map((place) => place.toFixed(2))).size).toBeGreaterThan(1)
  })

  it('never shows a stroke that leaves a piece the customer could use, on either side of it, for any order there is', () => {
    let orders = 0
    for (const position of LADDER) {
      for (let seed = 1; seed <= 80; seed++) {
        for (const role of ['new', 'known'] as const) {
          const customer = layOut(position, role, seed).customer
          const whole = WHOLE[customer.fruit], give = giveOf(customer.fruit)
          const places = strokePlaces(customer)
          expect(places.length, JSON.stringify(customer)).toBeGreaterThan(0)
          for (const at of places) {
            for (const part of [at * whole, (1 - at) * whole]) {
              // Neither part fills a compartment of the tin, or what an order longer than a fruit still needs, or is one ant's piece.
              for (const useful of usefulPieces(customer)) expect(fitOf(part, useful * whole, give).kind, `${JSON.stringify(customer.shares)} ${customer.who} at ${at}`).not.toBe('fit')
            }
          }
          orders++
        }
      }
    }
    expect(orders).toBeGreaterThan(1500)
    // What each compartment takes is among the useful pieces, and for the twins that is half the order each.
    const twins = { who: 'twins' as const, fruit: 'long' as const, shares: [{ num: 3, den: 4 }], carries: null, written: true, lined: true }
    expect(usefulPieces(twins)).toEqual([3 / 8, 3 / 8])
    for (const at of strokePlaces(twins)) expect(Math.min(Math.abs(at - 3 / 8), Math.abs(1 - at - 3 / 8))).toBeGreaterThan(2 / GIVE_PARTS)
  })

  it('glows on the crate, with a tap, when none of its fruit lies on the board', () => {
    const bare = { ...start, world: remove(start.world, onLane(start.world, 0)[0].id) }
    const guide = guideOf(bare)
    expect(guide).toMatchObject({ on: 'crate', glow: [CRATE], hand: { drag: false } })
    expect(poke(bare, guide.hand.from).events.some((event) => event.kind === 'land')).toBe(true)
  })

  it('glows on the tin once a piece has been cut, and the hand carries a piece to it: a carry that really lays it in', () => {
    const made = cutAt(start, 700)
    const guide = guideOf(made)
    expect(guide).toMatchObject({ on: 'tin', glow: [tinAt(made)!.body], hand: { drag: true } })
    const held = grab(made, guide.hand.from)
    expect(held).not.toBeNull()
    expect(drop(made, held!, guide.hand.to).events[0].kind).toBe('given')
  })

  it('glows on the customer when what lies in its tin sticks out: a tap sends it off as it is', () => {
    const ordered = tinParts(start.window!)[0]
    const made = cutAt(start, ordered + 400)
    const over = drop(made, grab(made, { x: X0 + 30, y: NEAR })!, { x: X0 + 30, y: tinAt(made)!.body.y + 20 }).game
    const guide = guideOf(over)
    expect(guide).toMatchObject({ on: 'customer', glow: [WINDOW], hand: { drag: false } })
    expect(poke(over, guide.hand.from).game.finished).toBe(true)
  })
})
