import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { CHARACTERS, CUSTOMERS } from './customers'
import { IdleLadder } from './guidance'
import { Kitchen, POKES_FOR, SHOW_OVEN_AFTER, SHOW_TAP_AFTER } from './kitchen'
import type { Kind } from './kinds'
import { bird, clouds } from './ambient'
import { CARD, COUNTER_Y, CUSTOMER, DOOR, OVEN, PIZZA, tubPlace } from './layout'
import { matches } from './order'
import { handOnStage } from './pose'
import { pictureTurn } from './view'
import { deserialize, freshSave, serialize, type Save } from './save'
import { doorSpot } from './staging'
import { STREET, STREET_ANSWER, streetAt, type StreetThing } from './street'
import { APART } from './table'
import { LIMITS, babble, seconds } from './voices'

function play(kitchen: Kitchen, secs: number): void {
  for (let i = 0; i < Math.round(secs * 60); i++) kitchen.step(1 / 60)
  kitchen.sounds.length = 0
}

/** A child who has been shown everything, so no showing plays unless a test asks for it. */
function shownAll(position = LADDER[0], childAge: number | null = null): Save {
  return { ...freshSave(childAge), position, shown: ['tap-a-tub', 'to-the-oven'] }
}

const tubOf = (kitchen: Kitchen, kind: Kind) => {
  const tubs = kitchen.toSave().tubs
  return tubPlace(tubs.indexOf(kind), tubs.length)
}

function tapTub(kitchen: Kitchen, kind: Kind, times = 1): void {
  for (let i = 0; i < times; i++) {
    const at = tubOf(kitchen, kind)
    kitchen.press(at.x, at.y)
    kitchen.tap()
    play(kitchen, 0.6)
  }
}

/** Lays exactly what the card asks for. */
function topRight(kitchen: Kitchen): void {
  for (const want of kitchen.toSave().order!.wanted) tapTub(kitchen, want.kind, want.count)
}

/** Slides the pizza by its crust, where no piece lies. */
function slide(kitchen: Kitchen, dx: number, dy: number): void {
  kitchen.press(PIZZA.x, PIZZA.y + PIZZA.r * 0.95)
  kitchen.dragMove(PIZZA.x + dx, PIZZA.y + PIZZA.r * 0.95 + dy)
  kitchen.dragEnd()
}
const toOven = (kitchen: Kitchen) => slide(kitchen, 100, 10)
const toCustomer = (kitchen: Kitchen) => slide(kitchen, 0, -60)

function serveRight(kitchen: Kitchen): void {
  topRight(kitchen)
  toOven(kitchen)
  play(kitchen, 3.2)
  toCustomer(kitchen)
  play(kitchen, 9)
}

describe('the job', () => {
  it('opens with a customer at the counter who wants something, and two more at the door', () => {
    const kitchen = new Kitchen(freshSave(null), 1)
    const save = kitchen.toSave()
    expect(CUSTOMERS).toContain(save.customer)
    expect(save.order!.wanted[0].kind).toBe(CHARACTERS[save.customer!].loves)
    expect(save.waiting!.small).not.toBe(save.waiting!.big)
    expect([save.waiting!.small, save.waiting!.big]).not.toContain(save.customer)
    // The first frame is saved at once, so a put-away before any touch finds the same customer again.
    expect(kitchen.dirty).toBe('now')
    const again = new Kitchen(deserialize(JSON.parse(JSON.stringify(serialize(save)))), 99)
    expect(again.toSave().customer).toBe(save.customer)
    expect(again.toSave().order).toEqual(save.order)
  })

  it('goes top, bake, serve: a pizza that matches the card is eaten and the cycle is finished', () => {
    const kitchen = new Kitchen(shownAll(), 2)
    topRight(kitchen)
    expect(matches(kitchen.toSave().order!.wanted, kitchen.pieces())).toBe(true)
    toOven(kitchen)
    // Saved as baked the moment it goes in.
    expect(kitchen.toSave().pizza.baked).toBe(true)
    expect(kitchen.dirty).toBe('now')
    play(kitchen, 3.2)
    expect(kitchen.busy).toBe(false)
    toCustomer(kitchen)
    // The ending is saved when it starts: finished, the position moved, the board bare.
    const save = kitchen.toSave()
    expect(save.finished).toBe(true)
    expect(save.position).toBe(LADDER[1])
    expect(save.pizza.pieces).toEqual([])
    play(kitchen, 9)
    expect(kitchen.busy).toBe(false)
    expect(kitchen.table.pieces.length).toBe(0)
  })

  it('tastes a wrong pizza and pushes it back exactly as it was, for the child to change one thing', () => {
    const kitchen = new Kitchen(shownAll(), 3)
    const order = kitchen.toSave().order!
    topRight(kitchen)
    tapTub(kitchen, order.wanted[0].kind)
    const before = kitchen.pieces()
    toOven(kitchen)
    play(kitchen, 3.2)
    toCustomer(kitchen)
    expect(kitchen.busy).toBe(true)
    expect(kitchen.toSave().pushedBack).toBe(1)
    expect(kitchen.toSave().finished).toBe(false)
    play(kitchen, 8.2)
    expect(kitchen.busy).toBe(false)
    // Nothing eaten, lost or reset: baked, every piece where it lay.
    expect(kitchen.pieces()).toEqual(before)
    expect(kitchen.toSave().pizza.baked).toBe(true)
    // One piece off, and served again: eaten. One pizza pushed back is a mixed cycle, so the position stays.
    const extra = kitchen.table.pieces[kitchen.table.pieces.length - 1]
    const at = { x: PIZZA.x + extra.x * PIZZA.r, y: PIZZA.y + extra.y * PIZZA.r }
    kitchen.press(at.x, at.y)
    kitchen.tap()
    play(kitchen, 0.6)
    toCustomer(kitchen)
    expect(kitchen.toSave().finished).toBe(true)
    expect(kitchen.toSave().position).toBe(LADDER[0])
  })

  it('moves the position down after two pizzas pushed back, and never inside a cycle', () => {
    const kitchen = new Kitchen(shownAll(LADDER[2]), 4)
    toOven(kitchen)
    play(kitchen, 4.2)
    // An empty base puffs up and comes out as it went in: not baked, and nothing to judge.
    expect(kitchen.toSave().pizza.baked).toBe(false)
    const loved = kitchen.toSave().order!.wanted[0].kind
    tapTub(kitchen, loved, 6)
    toOven(kitchen)
    play(kitchen, 3.2)
    for (let i = 0; i < 2; i++) {
      toCustomer(kitchen)
      expect(kitchen.toSave().position).toBe(LADDER[2])
      play(kitchen, 8.2)
    }
    expect(kitchen.toSave().pushedBack).toBe(2)
    // Now take pieces off until it matches.
    const want = kitchen.toSave().order!.wanted[0].count
    while (kitchen.table.pieces.length > want) {
      const piece = kitchen.table.pieces[0]
      kitchen.press(PIZZA.x + piece.x * PIZZA.r, PIZZA.y + piece.y * PIZZA.r)
      kitchen.tap()
      play(kitchen, 0.6)
    }
    toCustomer(kitchen)
    expect(kitchen.toSave().finished).toBe(true)
    expect(kitchen.toSave().position).toBe(LADDER[1])
  })

  it('tastes a raw pizza as raw dough and counts nothing', () => {
    const kitchen = new Kitchen(shownAll(), 5)
    topRight(kitchen)
    const before = kitchen.pieces()
    toCustomer(kitchen)
    expect(kitchen.busy).toBe(true)
    play(kitchen, 4.5)
    expect(kitchen.busy).toBe(false)
    expect(kitchen.toSave().pushedBack).toBe(0)
    expect(kitchen.toSave().pizza.baked).toBe(false)
    expect(kitchen.pieces()).toEqual(before)
  })

  it('hands a baked pizza straight back from the oven, unchanged', () => {
    const kitchen = new Kitchen(shownAll(), 6)
    topRight(kitchen)
    toOven(kitchen)
    play(kitchen, 3.2)
    const before = kitchen.toSave()
    toOven(kitchen)
    play(kitchen, 1.2)
    expect(kitchen.busy).toBe(false)
    expect(kitchen.toSave().pizza).toEqual(before.pizza)
  })

  it('works with taps alone: a tap on the oven bakes and a tap on the customer serves', () => {
    const kitchen = new Kitchen(shownAll(), 7)
    topRight(kitchen)
    kitchen.press(OVEN.x, OVEN.y)
    kitchen.tap()
    expect(kitchen.toSave().pizza.baked).toBe(true)
    play(kitchen, 3.2)
    kitchen.press(CUSTOMER.x, CUSTOMER.y - 100)
    kitchen.tap()
    expect(kitchen.toSave().finished).toBe(true)
  })

  it('starts nothing by itself after the eating: the next customer comes in on the child\'s touch', () => {
    const kitchen = new Kitchen(shownAll(), 8)
    serveRight(kitchen)
    const fed = kitchen.toSave()
    play(kitchen, 60)
    expect(kitchen.busy).toBe(false)
    expect(kitchen.toSave()).toEqual(fed)
    // A touch on the one with the small roll calls it in: its order is laid out now, from the position as it stands.
    const called = fed.waiting!.small
    const spot = doorSpot('small')
    kitchen.press(spot.x, spot.y - 50)
    kitchen.tap()
    const next = kitchen.toSave()
    expect(next.finished).toBe(false)
    expect(next.customer).toBe(called)
    expect(next.bigRoll).toBe(false)
    expect(next.pushedBack).toBe(0)
    expect(next.pizza).toEqual({ pieces: [], baked: false })
    expect(next.waiting!.big).toBe(fed.waiting!.big)
    expect([next.waiting!.small, next.waiting!.big]).not.toContain(called)
    expect(next.order!.wanted.reduce((n, w) => n + w.count, 0)).toBeGreaterThanOrEqual(2)
    play(kitchen, 5)
    expect(kitchen.busy).toBe(false)
  })

  it('lets the child pick the bigger order: the big roll is one place higher, and moves the position up only when it goes well', () => {
    const kitchen = new Kitchen(shownAll(LADDER[1]), 9)
    serveRight(kitchen)
    expect(kitchen.toSave().position).toBe(LADDER[2])
    const spot = doorSpot('big')
    kitchen.press(spot.x, spot.y - 50)
    kitchen.tap()
    expect(kitchen.toSave().bigRoll).toBe(true)
    // An order from the place above: two kinds, where the stored place has one.
    expect(kitchen.toSave().order!.wanted.length).toBe(2)
    play(kitchen, 5)
    serveRight(kitchen)
    expect(kitchen.toSave().position).toBe(LADDER[3])
  })

  it('does not call anyone in while a customer is still waiting for its pizza', () => {
    const kitchen = new Kitchen(shownAll(), 10)
    const before = kitchen.toSave()
    const spot = doorSpot('small')
    kitchen.press(spot.x, spot.y - 50)
    kitchen.tap()
    play(kitchen, 1)
    expect(kitchen.toSave().customer).toBe(before.customer)
    expect(kitchen.toSave().waiting).toEqual(before.waiting)
  })
})

describe('found as left', () => {
  const reopen = (kitchen: Kitchen, seed = 77) => new Kitchen(deserialize(JSON.parse(JSON.stringify(serialize(kitchen.toSave())))), seed)

  it('comes back mid-order with the same customer, card, tubs and pieces', () => {
    const kitchen = new Kitchen(shownAll(LADDER[3]), 11)
    const order = kitchen.toSave().order!
    tapTub(kitchen, order.wanted[0].kind, 2)
    const again = reopen(kitchen)
    expect(again.toSave()).toEqual(deserialize(JSON.parse(JSON.stringify(serialize(kitchen.toSave())))))
    expect(again.pieces().length).toBe(2)
    expect(again.busy).toBe(false)
  })

  it('loses nothing when put away in the middle of baking, a tasting or the eating, and replays none of them', () => {
    const kitchen = new Kitchen(shownAll(), 12)
    topRight(kitchen)
    tapTub(kitchen, kitchen.toSave().order!.wanted[0].kind)
    toOven(kitchen)
    play(kitchen, 1)
    let again = reopen(kitchen)
    expect(again.toSave().pizza.baked).toBe(true)
    expect(again.busy).toBe(false)
    play(kitchen, 2.5)
    toCustomer(kitchen)
    play(kitchen, 2)
    again = reopen(kitchen)
    expect(again.toSave().pushedBack).toBe(1)
    expect(again.pieces().length).toBe(kitchen.pieces().length)
    expect(again.busy).toBe(false)
    play(kitchen, 7)
    const extra = kitchen.table.pieces[kitchen.table.pieces.length - 1]
    kitchen.press(PIZZA.x + extra.x * PIZZA.r, PIZZA.y + extra.y * PIZZA.r)
    kitchen.tap()
    play(kitchen, 0.6)
    toCustomer(kitchen)
    play(kitchen, 1.5)
    again = reopen(kitchen)
    expect(again.toSave().finished).toBe(true)
    expect(again.pieces()).toEqual([])
    expect(again.busy).toBe(false)
    // And the world waits there: a minute later nothing has started.
    play(again, 60)
    expect(again.busy).toBe(false)
    expect(again.toSave().finished).toBe(true)
  })

  it('ends a scene at any touch, with everything where the scene was taking it', () => {
    const kitchen = new Kitchen(shownAll(), 13)
    topRight(kitchen)
    toOven(kitchen)
    play(kitchen, 0.8)
    expect(kitchen.busy).toBe(true)
    // The touch ends the baking and is then an ordinary touch: here, a tap on the pizza.
    kitchen.press(PIZZA.x, PIZZA.y + PIZZA.r * 0.95)
    kitchen.tap()
    expect(kitchen.busy).toBe(false)
    const show = kitchen.show(new IdleLadder(0).update(0))
    expect(show.baked).toBe(true)
    expect(show.pizza.hidden).toBe(false)
    expect([show.pizza.x, show.pizza.y, show.pizza.size]).toEqual([PIZZA.x, PIZZA.y, 1])
  })
})

describe('what each scene saves when it starts', () => {
  // The sheet lists this for every scene. Each is read from the save in the same step that starts the scene.
  const cycle = (seed: number, place = LADDER[0]) => new Kitchen(shownAll(place), seed)

  it('stepping up: the new customer, its order, the tubs, an empty unbaked pizza, bigRoll, pushedBack at none, finished cleared, and the next two at the door', () => {
    for (const which of ['small', 'big'] as const) {
      const kitchen = cycle(41, LADDER[1])
      // One pizza pushed back first, so that pushedBack has something to be cleared from.
      topRight(kitchen)
      tapTub(kitchen, kitchen.toSave().order!.wanted[0].kind)
      toOven(kitchen)
      play(kitchen, 3.2)
      toCustomer(kitchen)
      play(kitchen, 8.2)
      const extra = kitchen.table.pieces[kitchen.table.pieces.length - 1]
      kitchen.press(PIZZA.x + extra.x * PIZZA.r, PIZZA.y + extra.y * PIZZA.r)
      kitchen.tap()
      play(kitchen, 0.6)
      toCustomer(kitchen)
      play(kitchen, 9)
      const before = kitchen.toSave()
      expect([before.finished, before.pushedBack]).toEqual([true, 1])
      kitchen.dirty = 'no'
      const spot = doorSpot(which)
      kitchen.press(spot.x, spot.y - 50)
      kitchen.tap()
      // Saved at the start: asked for at once, before a frame of the scene has played.
      expect(kitchen.dirty).toBe('now')
      expect(kitchen.busy).toBe(true)
      const save = kitchen.toSave()
      expect(save.customer).toBe(before.waiting![which])
      expect(save.order!.wanted.length).toBeGreaterThan(0)
      for (const want of save.order!.wanted) expect(save.tubs).toContain(want.kind)
      expect(save.pizza).toEqual({ pieces: [], baked: false })
      expect(save.bigRoll).toBe(which === 'big')
      expect(save.pushedBack).toBe(0)
      expect(save.finished).toBe(false)
      expect([save.waiting!.small, save.waiting!.big]).not.toContain(save.customer)
      expect(save.waiting![which === 'big' ? 'small' : 'big']).toBe(before.waiting![which === 'big' ? 'small' : 'big'])
      // A put-away now and a return: the new customer is at the counter, and the scene does not play again.
      const again = new Kitchen(deserialize(JSON.parse(JSON.stringify(serialize(save)))), 5)
      expect(again.toSave()).toEqual(deserialize(JSON.parse(JSON.stringify(serialize(save)))))
      expect(again.busy).toBe(false)
    }
  })

  it('baking: the pizza as baked', () => {
    const kitchen = cycle(42)
    topRight(kitchen)
    kitchen.dirty = 'no'
    toOven(kitchen)
    expect(kitchen.dirty).toBe('now')
    expect(kitchen.toSave().pizza.baked).toBe(true)
    expect(kitchen.busy).toBe(true)
  })

  it('the tasting: one more pizza pushed back, and nothing else', () => {
    const kitchen = cycle(43)
    topRight(kitchen)
    tapTub(kitchen, kitchen.toSave().order!.wanted[0].kind)
    toOven(kitchen)
    play(kitchen, 3.2)
    const before = kitchen.toSave()
    kitchen.dirty = 'no'
    toCustomer(kitchen)
    expect(kitchen.dirty).toBe('now')
    expect(kitchen.toSave()).toEqual({ ...before, pushedBack: 1 })
  })

  it('the eating: finished, and the position moved as the cycle went', () => {
    const kitchen = cycle(44, LADDER[2])
    topRight(kitchen)
    toOven(kitchen)
    play(kitchen, 3.2)
    kitchen.dirty = 'no'
    toCustomer(kitchen)
    expect(kitchen.dirty).toBe('now')
    const save = kitchen.toSave()
    expect([save.finished, save.position]).toEqual([true, LADDER[3]])
    expect(save.pizza).toEqual({ pieces: [], baked: false })
  })

  it('the two showings: the idea as shown, and for the first one the piece on its spot', () => {
    const first = new Kitchen(freshSave(null), 45)
    first.dirty = 'no'
    play(first, SHOW_TAP_AFTER + 0.05)
    expect(first.busy).toBe(true)
    expect(first.dirty).toBe('now')
    expect(first.toSave().shown).toEqual(['tap-a-tub'])
    expect(first.toSave().pizza.pieces.length).toBe(1)
    // The piece is in the save before it is in the air.
    expect(first.table.pieces.length + first.table.flights.length).toBe(0)
    const second = new Kitchen({ ...freshSave(null), shown: ['tap-a-tub'] }, 46)
    tapTub(second, second.toSave().order!.wanted[0].kind)
    second.dirty = 'no'
    play(second, SHOW_OVEN_AFTER - 0.5)
    expect(second.busy).toBe(true)
    expect(second.dirty).toBe('now')
    expect(second.toSave().shown).toEqual(['tap-a-tub', 'to-the-oven'])
  })

  it('the raw tasting, a pizza handed back and a piece fed by hand: nothing', () => {
    const kitchen = cycle(47)
    topRight(kitchen)
    const before = kitchen.toSave()
    toCustomer(kitchen)
    expect(kitchen.busy).toBe(true)
    expect(kitchen.toSave()).toEqual(before)
    play(kitchen, 4.5)
    toOven(kitchen)
    play(kitchen, 3.2)
    const baked = kitchen.toSave()
    toOven(kitchen)
    expect(kitchen.busy).toBe(true)
    expect(kitchen.toSave()).toEqual(baked)
    play(kitchen, 1.2)
    const at = tubOf(kitchen, baked.tubs[0])
    kitchen.press(at.x, at.y)
    kitchen.dragMove(CUSTOMER.x, CUSTOMER.y - 120)
    kitchen.dragEnd()
    play(kitchen, 0.5)
    expect(kitchen.busy).toBe(true)
    expect(kitchen.toSave()).toEqual(baked)
  })
})

describe('what is shown once', () => {
  it('shows a first-time child the tap on a tub once, with one piece, and never completes the order', () => {
    const kitchen = new Kitchen(freshSave(null), 14)
    play(kitchen, SHOW_TAP_AFTER - 0.2)
    expect(kitchen.busy).toBe(false)
    kitchen.step(0.3)
    expect(kitchen.busy).toBe(true)
    // Saved at the start: the idea as shown, and the piece on its spot.
    expect(kitchen.toSave().shown).toEqual(['tap-a-tub'])
    expect(kitchen.pieces().length).toBe(1)
    play(kitchen, 3)
    expect(kitchen.busy).toBe(false)
    expect(kitchen.pieces().length).toBe(1)
    expect(matches(kitchen.toSave().order!.wanted, kitchen.pieces())).toBe(false)
    play(kitchen, 2)
    expect(kitchen.pieces().length).toBe(1)
    // A child who only watches is not shown the way to the oven: that waits for a piece laid by its own finger.
    play(kitchen, SHOW_OVEN_AFTER + 20)
    expect(kitchen.toSave().shown).toEqual(['tap-a-tub'])
  })

  it('shows the way to the oven once, to a child who has paused with something on the pizza', () => {
    const kitchen = new Kitchen({ ...freshSave(null), shown: ['tap-a-tub'] }, 15)
    play(kitchen, SHOW_OVEN_AFTER + 1)
    // Nothing on the pizza: nothing to show yet.
    expect(kitchen.toSave().shown).toEqual(['tap-a-tub'])
    tapTub(kitchen, kitchen.toSave().order!.wanted[0].kind)
    play(kitchen, SHOW_OVEN_AFTER)
    expect(kitchen.toSave().shown).toEqual(['tap-a-tub', 'to-the-oven'])
    play(kitchen, 3)
    expect(kitchen.busy).toBe(false)
    // (The board itself is what the customer nudges; the next test follows it.)
    // The pizza is where it was, and not baked: the showing says where a pizza goes, not that this one is ready.
    expect(kitchen.toSave().pizza.baked).toBe(false)
    play(kitchen, 30)
    expect(kitchen.busy).toBe(false)
  })

  it('does not show the oven to a child who has found it', () => {
    const kitchen = new Kitchen({ ...freshSave(null), shown: ['tap-a-tub'] }, 16)
    topRight(kitchen)
    toOven(kitchen)
    expect(kitchen.toSave().shown).toContain('to-the-oven')
  })

  it('lets a touch end the showing, and the piece still lands', () => {
    const kitchen = new Kitchen(freshSave(null), 17)
    play(kitchen, SHOW_TAP_AFTER + 0.3)
    expect(kitchen.busy).toBe(true)
    kitchen.press(CARD.x + 20, CARD.y + 20)
    kitchen.tap()
    expect(kitchen.busy).toBe(false)
    play(kitchen, 1)
    expect(kitchen.table.pieces.length).toBe(1)
  })
})

describe('touch', () => {
  it('answers a touch on a tub in the same frame, with a sound and a piece in the hand', () => {
    const kitchen = new Kitchen(shownAll(), 18)
    const kind = kitchen.toSave().tubs[0]
    kitchen.sounds.length = 0
    kitchen.press(tubOf(kitchen, kind).x, tubOf(kitchen, kind).y)
    kitchen.step(0)
    expect(kitchen.sounds.length).toBe(1)
    expect(kitchen.table.hand?.kind).toBe(kind)
  })

  it('answers everything that looks touchable: the pizza, the customer, the oven, the card and the two at the door', () => {
    const kitchen = new Kitchen(shownAll(), 19)
    const small = doorSpot('small'), big = doorSpot('big')
    for (const [x, y] of [[PIZZA.x, PIZZA.y], [CUSTOMER.x, CUSTOMER.y - 100], [OVEN.x, OVEN.y], [CARD.x + 150, CARD.y + 100], [small.x, small.y - 50], [big.x, big.y - 50]]) {
      kitchen.sounds.length = 0
      kitchen.press(x, y)
      kitchen.pressEnd()
      kitchen.step(1 / 60)
      expect(kitchen.sounds.length, `${x},${y}`).toBeGreaterThan(0)
      for (const spec of kitchen.sounds) expect(seconds(spec)).toBeLessThanOrEqual(LIMITS.maxSeconds)
      play(kitchen, 1)
    }
  })

  it('feeds a piece to the customer by hand when it is carried onto it, before the eating and after; tapped out with the board bare it rolls home', () => {
    const kitchen = new Kitchen(shownAll(), 20)
    const loved = kitchen.toSave().order!.wanted[0].kind
    const at = tubOf(kitchen, loved)
    kitchen.press(at.x, at.y)
    kitchen.dragMove(CUSTOMER.x, CUSTOMER.y - 120)
    kitchen.dragEnd()
    play(kitchen, 0.5)
    expect(kitchen.busy).toBe(true)
    expect(kitchen.pieces().length).toBe(0)
    play(kitchen, 3)
    expect(kitchen.busy).toBe(false)
    serveRight(kitchen)
    const crumbs = () => kitchen.show(new IdleLadder(0).update(0)).crumbs
    expect(crumbs()).toBe(true)
    // Tapped out with nowhere to lie: it drops by its tub, bounces and rolls back in, and nothing else happens.
    kitchen.press(at.x, at.y)
    kitchen.tap()
    expect(kitchen.table.flights[0].end.on).toBe('roll')
    play(kitchen, 1)
    expect(kitchen.busy).toBe(false)
    expect(kitchen.table.flights.length).toBe(0)
    // Carried to the customer it is still fed, and the crumbs stay on the board while that plays.
    kitchen.press(at.x, at.y)
    kitchen.dragMove(CUSTOMER.x, CUSTOMER.y - 120)
    kitchen.dragEnd()
    play(kitchen, 0.5)
    expect(kitchen.busy).toBe(true)
    expect(crumbs()).toBe(true)
    expect(kitchen.toSave().finished).toBe(true)
    // And they are there when the kitchen is opened again.
    expect(new Kitchen(deserialize(serialize(kitchen.toSave()), null), 3).show(new IdleLadder(0).update(0)).crumbs).toBe(true)
  })

  it('lets a customer wear a sock fed by hand until it next moves, and saves nothing of it', () => {
    // Mops loves socks, so a sock is always on her table.
    let kitchen = new Kitchen(shownAll(), 1)
    for (let seed = 2; kitchen.toSave().customer !== 'mops'; seed++) kitchen = new Kitchen(shownAll(), seed)
    const at = tubOf(kitchen, 'sock')
    kitchen.press(at.x, at.y)
    kitchen.dragMove(CUSTOMER.x, CUSTOMER.y - 120)
    kitchen.dragEnd()
    play(kitchen, 4)
    const ladder = new IdleLadder(0)
    expect(kitchen.show(ladder.update(0)).wearing).toBe(true)
    expect(JSON.stringify(serialize(kitchen.toSave()))).not.toContain('wearing')
    // The next touch, anywhere: the sock drops back into its tub.
    kitchen.press(CARD.x + 20, CARD.y + 20)
    kitchen.pressEnd()
    expect(kitchen.show(ladder.update(0)).wearing).toBe(false)
    expect(kitchen.table.flights.some((f) => f.kind === 'sock' && f.end.on === 'tub')).toBe(true)
    play(kitchen, 1)
    expect(kitchen.table.flights.length).toBe(0)
    expect(kitchen.pieces().length).toBe(0)
  })

  it('has the big roll held in both arms and the small one in one hand, whichever monster holds it', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const kitchen = new Kitchen(shownAll(), seed)
      kitchen.step(1 / 60)
      const waiting = kitchen.show(new IdleLadder(0).update(0)).waiting
      const big = waiting.find((w) => w.big)!, small = waiting.find((w) => !w.big)!
      expect(big.pose.handL).not.toBeNull()
      expect(big.pose.handR).not.toBeNull()
      expect(big.pose.handR!.x - big.pose.handL!.x).toBeGreaterThan(200)
      expect(small.pose.handL).toBeNull()
      expect(small.pose.handR).not.toBeNull()
    }
  })

  it('spits the kind it cannot stand neatly back into its tub', () => {
    const kitchen = new Kitchen(shownAll(LADDER[2]), 21)
    const who = kitchen.toSave().customer!
    const hated = CHARACTERS[who].cannotStand
    expect(kitchen.toSave().tubs).toContain(hated)
    const at = tubOf(kitchen, hated)
    kitchen.press(at.x, at.y)
    kitchen.dragMove(CUSTOMER.x, CUSTOMER.y - 120)
    kitchen.dragEnd()
    let home = 0
    for (let i = 0; i < 60 * 4; i++) {
      kitchen.step(1 / 60)
      // The piece comes back out and lands in its tub.
      if (kitchen.table.flights.some((f) => f.end.on === 'tub')) home++
    }
    expect(home).toBeGreaterThan(0)
    expect(kitchen.table.flights.length).toBe(0)
    expect(kitchen.pieces().length).toBe(0)
  })

  it('punishes nothing: random touches for minutes leave a legal kitchen and no error', () => {
    for (const seed of [1, 2, 3]) {
      const kitchen = new Kitchen(freshSave(seed + 3), seed)
      let s = seed * 7919
      const rnd = () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296)
      for (let i = 0; i < 700; i++) {
        kitchen.press(rnd() * 1180, rnd() * 820)
        const how = rnd()
        if (how < 0.5) kitchen.tap()
        else if (how < 0.85) {
          kitchen.dragMove(rnd() * 1180, rnd() * 820)
          if (rnd() < 0.3) kitchen.dragLift()
          kitchen.dragEnd()
        } else kitchen.pressEnd()
        play(kitchen, rnd() * 0.6)
      }
      play(kitchen, 12)
      const save = deserialize(JSON.parse(JSON.stringify(serialize(kitchen.toSave()))))
      expect(save.customer).not.toBeNull()
      expect(LADDER).toContain(save.position)
      const pieces = kitchen.pieces()
      expect(pieces.length).toBeLessThanOrEqual(12)
      for (let a = 0; a < pieces.length; a++) for (let b = a + 1; b < pieces.length; b++) expect(Math.hypot(pieces[a].x - pieces[b].x, pieces[a].y - pieces[b].y)).toBeGreaterThanOrEqual(APART - 1e-6)
      // What the save holds is what a reopened kitchen shows.
      expect(new Kitchen(save, 5).toSave()).toEqual(save)
    }
  })
})

describe('one obvious want', () => {
  const pose = (kitchen: Kitchen) => kitchen.show(new IdleLadder(0).update(0)).customer!.pose

  it('looks from the pizza to the card and back while the child is idle, and reaches for a baked pizza', () => {
    const kitchen = new Kitchen(shownAll(), 51)
    // The card is to its right and the pizza below it: both ways of looking turn up over a few idle seconds.
    let atCard = 0, atPizza = 0
    for (let i = 0; i < 60 * 9; i++) {
      kitchen.step(1 / 60)
      const p = pose(kitchen)
      if (p.lookX > 0.4 && p.lookY < 0) atCard += 1
      if (p.lookY > 0.4) atPizza += 1
      expect(p.handL).toBeNull()
    }
    expect(atCard).toBeGreaterThan(20)
    expect(atPizza).toBeGreaterThan(100)
    topRight(kitchen)
    toOven(kitchen)
    play(kitchen, 3.2)
    play(kitchen, 4)
    // Baked and waiting: its free hand has come down over the counter towards the pizza.
    expect(pose(kitchen).handL).not.toBeNull()
    expect(pose(kitchen).handL!.y).toBeGreaterThan(0)
    // And it drools, with a grin and wide eyes.
    expect(pose(kitchen).drool).toBeGreaterThan(0.8)
    expect(pose(kitchen).smile).toBeGreaterThan(0.6)
    // A touch, and the hand is on its way back: the want never crowds the child's own move.
    kitchen.press(CARD.x + 20, CARD.y + 20)
    kitchen.pressEnd()
    play(kitchen, 1.2)
    expect(pose(kitchen).handL).toBeNull()
    expect(pose(kitchen).drool).toBeLessThan(0.1)
  })

  it('wants nothing more once it has eaten: the two at the door are what there is to touch', () => {
    const kitchen = new Kitchen(shownAll(), 52)
    serveRight(kitchen)
    play(kitchen, 6)
    expect(pose(kitchen).handL).toBeNull()
    expect(kitchen.show(new IdleLadder(0).update(4.5)).glows.length).toBe(2)
  })
})

describe('a room that is alive', () => {
  const frame = (kitchen: Kitchen) => kitchen.show(new IdleLadder(0).update(0))

  it('has every eye follow the finger while it is down', () => {
    const kitchen = new Kitchen(shownAll(), 61)
    play(kitchen, 0.5)
    const at = tubPlace(0, kitchen.toSave().tubs.length)
    kitchen.press(at.x, at.y)
    for (let i = 0; i < 40; i++) kitchen.step(1 / 60)
    // The tub is down and to the left of the customer, and down and to the right of the door.
    const shown = frame(kitchen)
    expect(shown.customer!.pose.lookX).toBeLessThan(-0.4)
    expect(shown.customer!.pose.lookY).toBeGreaterThan(0.4)
    for (const w of shown.waiting) expect(w.pose.lookY).toBeGreaterThan(0.3)
    kitchen.dragMove(1100, 120)
    for (let i = 0; i < 60; i++) kitchen.step(1 / 60)
    expect(frame(kitchen).customer!.pose.lookX).toBeGreaterThan(0.4)
    for (const w of frame(kitchen).waiting) expect(w.pose.lookX).toBeGreaterThan(0.4)
    kitchen.dragEnd()
  })

  it('leaves a puff of flour where a piece lands, for a moment', () => {
    const kitchen = new Kitchen(shownAll(), 62)
    const at = tubPlace(0, kitchen.toSave().tubs.length)
    kitchen.press(at.x, at.y)
    kitchen.tap()
    let most = 0
    for (let i = 0; i < 40; i++) {
      kitchen.step(1 / 60)
      most = Math.max(most, frame(kitchen).puffs.length)
    }
    expect(most).toBe(1)
    play(kitchen, 1)
    expect(frame(kitchen).puffs.length).toBe(0)
    // A storm of taps never piles them up.
    for (let i = 0; i < 12; i++) {
      kitchen.press(at.x, at.y)
      kitchen.tap()
      kitchen.step(1 / 60)
    }
    for (let i = 0; i < 30; i++) {
      kitchen.step(1 / 60)
      expect(frame(kitchen).puffs.length).toBeLessThanOrEqual(6)
    }
  })

  it('makes the fire jump when the oven is poked, and stand tall while it bakes', () => {
    const kitchen = new Kitchen(shownAll(), 63)
    play(kitchen, 0.3)
    expect(frame(kitchen).ovenGlow).toBe(0)
    kitchen.press(OVEN.x, OVEN.y)
    kitchen.pressEnd()
    let most = 0
    for (let i = 0; i < 40; i++) {
      kitchen.step(1 / 60)
      most = Math.max(most, frame(kitchen).ovenGlow)
    }
    expect(most).toBeGreaterThan(0.3)
    play(kitchen, 3)
    expect(frame(kitchen).ovenGlow).toBeLessThan(0.02)
  })

  it('has the two at the door react to a pizza with too many, each in its own way', () => {
    const kitchen = new Kitchen(shownAll(), 64)
    topRight(kitchen)
    tapTub(kitchen, kitchen.toSave().order!.wanted[0].kind)
    toOven(kitchen)
    play(kitchen, 3.2)
    const before = frame(kitchen).waiting.map((w) => w.pose.sy)
    toCustomer(kitchen)
    let moved = [0, 0]
    for (let i = 0; i < 60 * 4; i++) {
      kitchen.step(1 / 60)
      frame(kitchen).waiting.forEach((w, k) => { moved[k] = Math.max(moved[k], Math.abs(w.pose.sy - before[k]) + w.pose.lift / 40) })
    }
    // More than breathing: each has moved by more than it ever does at rest.
    expect(moved[0]).toBeGreaterThan(0.045)
    expect(moved[1]).toBeGreaterThan(0.045)
    expect(moved[0]).not.toBeCloseTo(moved[1], 2)
  })
})

describe('the idle ladder', () => {
  const guided = (kitchen: Kitchen, idle: number) => {
    const ladder = new IdleLadder(0)
    return kitchen.show(ladder.update(idle))
  }

  it('shows what can be touched, then one move, and neither while a scene plays', () => {
    const kitchen = new Kitchen(shownAll(), 22)
    kitchen.step(1 / 60)
    expect(guided(kitchen, 1).glow).toBe(0)
    const glowing = guided(kitchen, 4.5)
    expect(glowing.glow).toBeGreaterThan(0.9)
    expect(glowing.glows.length).toBe(kitchen.toSave().tubs.length)
    const demo = guided(kitchen, 6.5)
    expect(demo.ghost).not.toBeNull()
    topRight(kitchen)
    toOven(kitchen)
    expect(guided(kitchen, 6.5).ghost).toBeNull()
    expect(guided(kitchen, 4.5).glow).toBe(0)
  })

  it('never gives the answer away: a pizza that matches and one that does not are shown the same moves', () => {
    const moves = (extra: number) => {
      const kitchen = new Kitchen(shownAll(), 23)
      topRight(kitchen)
      tapTub(kitchen, kitchen.toSave().order!.wanted[0].kind, extra)
      const seen: string[] = []
      for (const idle of [6.5, 19.5, 42.5, 85.5]) {
        const show = guided(kitchen, idle)
        // Which move is shown may depend on where things are, never on whether the count is right.
        seen.push(show.ghost ? 'hand' : 'none', String(show.glows.length))
      }
      return seen
    }
    expect(moves(0)).toEqual(moves(1))
    expect(moves(0)).toEqual(moves(2))
  })

  it('points at the door once the customer has eaten', () => {
    const kitchen = new Kitchen(shownAll(), 24)
    serveRight(kitchen)
    const show = guided(kitchen, 4.5)
    expect(show.glows.length).toBe(2)
    const demo = guided(kitchen, 6.5)
    expect(Math.abs(demo.ghost!.x - doorSpot('small').x)).toBeLessThan(40)
  })
})

describe('what the first reading found', () => {
  const frame = (kitchen: Kitchen) => kitchen.show(new IdleLadder(0).update(0))

  it('does not show the tap to a child who has laid a piece with its own finger, at this customer or a later one', () => {
    const kitchen = new Kitchen(freshSave(null), 31)
    tapTub(kitchen, kitchen.toSave().order!.wanted[0].kind)
    expect(kitchen.toSave().shown).toContain('tap-a-tub')
    // The piece goes home, and the child waits with a bare pizza: nothing hops onto it.
    const at = kitchen.pieces()[0]
    kitchen.press(PIZZA.x + at.x * PIZZA.r, PIZZA.y + at.y * PIZZA.r)
    kitchen.tap()
    play(kitchen, SHOW_TAP_AFTER + 6)
    expect(kitchen.pieces().length).toBe(0)
  })

  it('shows nothing from the second customer on: both ideas belong to the first cycle', () => {
    const kitchen = new Kitchen({ ...freshSave(null), shown: [] }, 32)
    // The first showing lays one piece; the rest is laid by the test without ever pausing long enough for the oven's.
    play(kitchen, SHOW_TAP_AFTER + 3)
    // The customer takes its shown piece back at the child's first tap, so one tap for each picture is right.
    const order = kitchen.toSave().order!
    for (const want of order.wanted) tapTub(kitchen, want.kind, want.count)
    toOven(kitchen)
    play(kitchen, 3.2)
    toCustomer(kitchen)
    play(kitchen, 9)
    expect(kitchen.toSave().finished).toBe(true)
    const door = doorSpot('small')
    kitchen.press(door.x, door.y - 60)
    kitchen.tap()
    expect(kitchen.toSave().shown).toEqual(['tap-a-tub', 'to-the-oven'])
    play(kitchen, 30)
    expect(kitchen.pieces().length).toBe(0)
  })

  it('bakes and serves nothing when put away with the pizza held past half way', () => {
    for (const [dx, dy] of [[100, 10], [0, -60]] as const) {
      const kitchen = new Kitchen(shownAll(), 33)
      topRight(kitchen)
      if (dy < 0) {
        toOven(kitchen)
        play(kitchen, 3.2)
      }
      const before = serialize(kitchen.toSave())
      kitchen.press(PIZZA.x, PIZZA.y + PIZZA.r * 0.95)
      kitchen.dragMove(PIZZA.x + dx, PIZZA.y + PIZZA.r * 0.95 + dy)
      kitchen.putAway()
      expect(kitchen.busy).toBe(false)
      expect(serialize(kitchen.toSave())).toEqual(before)
      // The pizza is back on its board at once: the surface rests on this frame.
      expect(frame(kitchen).pizza.x).toBe(PIZZA.x)
      expect(frame(kitchen).pizza.y).toBe(PIZZA.y)
      play(kitchen, 2)
      expect(kitchen.busy).toBe(false)
      expect(serialize(kitchen.toSave())).toEqual(before)
    }
  })

  it('lays and feeds nothing when put away with a piece in the hand: it is back where it came from', () => {
    const kitchen = new Kitchen(shownAll(), 34)
    const kind = kitchen.toSave().order!.wanted[0].kind
    tapTub(kitchen, kind)
    const before = serialize(kitchen.toSave())
    const tub = tubOf(kitchen, kind)
    // From the tub, held over the pizza.
    kitchen.press(tub.x, tub.y)
    kitchen.dragMove(PIZZA.x + 40, PIZZA.y + 40)
    kitchen.putAway()
    play(kitchen, 1.5)
    expect(serialize(kitchen.toSave())).toEqual(before)
    // From the tub, held over the customer's mouth.
    kitchen.press(tub.x, tub.y)
    kitchen.dragMove(CUSTOMER.x, CUSTOMER.y - 120)
    kitchen.putAway()
    expect(kitchen.busy).toBe(false)
    play(kitchen, 1.5)
    expect(kitchen.busy).toBe(false)
    expect(serialize(kitchen.toSave())).toEqual(before)
    // From the pizza, held over somewhere else on it.
    const at = kitchen.pieces()[0]
    kitchen.press(PIZZA.x + at.x * PIZZA.r, PIZZA.y + at.y * PIZZA.r)
    kitchen.dragMove(PIZZA.x - 60, PIZZA.y + 60)
    kitchen.putAway()
    play(kitchen, 1.5)
    expect(serialize(kitchen.toSave())).toEqual(before)
  })

  it('answers nothing in the corner the grown-up overlay listens in, and still lets that touch end a scene', () => {
    const kitchen = new Kitchen(shownAll(), 35)
    kitchen.sounds.length = 0
    kitchen.press(CARD.x + CARD.w - 10, CARD.y + 10, true)
    kitchen.tap()
    expect(kitchen.sounds.length).toBe(0)
    expect(frame(kitchen).card!.shake).toBe(0)
    // The same spot outside the corner is the card, and the customer asks for it.
    kitchen.press(CARD.x + CARD.w - 10, CARD.y + 10)
    kitchen.pressEnd()
    expect(kitchen.sounds.length).toBeGreaterThan(0)
    topRight(kitchen)
    toOven(kitchen)
    expect(kitchen.busy).toBe(true)
    kitchen.press(OVEN.x, OVEN.y, true)
    kitchen.pressEnd()
    expect(kitchen.busy).toBe(false)
    expect(kitchen.toSave().pizza.baked).toBe(true)
  })

  it('gives the two at the door the same roll at the last place, each held in one hand, and a fat one in both arms anywhere else', () => {
    const last = new Kitchen(shownAll(LADDER[LADDER.length - 1]), 36)
    play(last, 0.1)
    for (const w of frame(last).waiting) {
      expect(w.fat).toBe(false)
      expect(w.pose.handL).toBeNull()
      expect(w.pose.handR).not.toBeNull()
    }
    const [a, b] = frame(last).waiting
    expect(a.pose.handR).toEqual(b.pose.handR)
    const lower = new Kitchen(shownAll(LADDER[LADDER.length - 2]), 36)
    play(lower, 0.1)
    const big = frame(lower).waiting.find((w) => w.big)!
    expect(big.fat).toBe(true)
    expect(big.pose.handL).not.toBeNull()
  })
})

/** A kitchen with this customer at the counter, wanting two of the kind it loves and two of one more kind, with a tub of the kind it cannot stand. */
function seated(who: (typeof CUSTOMERS)[number], also: Kind): Kitchen {
  const c = CHARACTERS[who]
  const others = CUSTOMERS.filter((other) => other !== who)
  const save: Save = {
    ...shownAll(LADDER[6]),
    customer: who,
    order: { wanted: [{ kind: c.loves, count: 2 }, { kind: also, count: 2 }], picture: 'rows', seed: 3 },
    tubs: [c.loves, also, c.cannotStand],
    waiting: { small: others[0], big: others[1] },
  }
  return new Kitchen(deserialize(serialize(save), null), 41)
}

describe('what a customer cannot stand, and what it misses', () => {
  const frame = (kitchen: Kitchen) => kitchen.show(new IdleLadder(0).update(0))
  const also = (who: (typeof CUSTOMERS)[number]): Kind => (['mushroom', 'worm', 'olive', 'pepper'] as const).find((kind) => kind !== CHARACTERS[who].loves && kind !== CHARACTERS[who].cannotStand)!

  it('gets its own answer every time the kind it cannot stand is on its pizza, whatever else is off', () => {
    for (const who of CUSTOMERS) {
      const kitchen = seated(who, also(who))
      // Nothing it wanted, and two of the kind it cannot stand: three kinds are off, and that one is still played.
      tapTub(kitchen, CHARACTERS[who].cannotStand, 2)
      toOven(kitchen)
      play(kitchen, 3.2)
      toCustomer(kitchen)
      expect(kitchen.busy, who).toBe(true)
      let upset = 0, lasted = 0
      for (let i = 0; i < 9 * 60 && kitchen.busy; i++) {
        kitchen.step(1 / 60)
        const pose = frame(kitchen).customer!.pose
        upset = Math.max(upset, pose.upset)
        if (pose.upset > 0) lasted += 1
      }
      expect(upset, who).toBeGreaterThan(0.95)
      // It is over before the tasting is: nothing a reaction did to a customer is left on it.
      expect(lasted, who).toBeGreaterThan(20)
      expect(frame(kitchen).customer!.pose.upset, who).toBe(0)
      // A touch in the middle of it ends it at once.
      toCustomer(kitchen)
      play(kitchen, 2.4)
      kitchen.press(CARD.x + 20, CARD.y + 20)
      kitchen.pressEnd()
      kitchen.step(1 / 60)
      expect(frame(kitchen).customer!.pose.upset, who).toBe(0)
    }
  })

  it('never shows that answer for a pizza without that kind on it', () => {
    for (const who of CUSTOMERS) {
      const kitchen = seated(who, also(who))
      tapTub(kitchen, CHARACTERS[who].loves, 4)
      toOven(kitchen)
      play(kitchen, 3.2)
      toCustomer(kitchen)
      let upset = 0
      for (let i = 0; i < 9 * 60 && kitchen.busy; i++) {
        kitchen.step(1 / 60)
        upset = Math.max(upset, frame(kitchen).customer!.pose.upset)
      }
      expect(upset, who).toBe(0)
    }
  })

  it('pinches its nose at a stink cloud, and lets go when the cloud has gone', () => {
    const kitchen = seated('grum', 'sock')
    tapTub(kitchen, 'cheese', 2)
    tapTub(kitchen, 'sock', 4)
    toOven(kitchen)
    play(kitchen, 3.2)
    toCustomer(kitchen)
    const c = CHARACTERS.grum
    let pinched = 0
    for (let i = 0; i < 9 * 60 && kitchen.busy; i++) {
      kitchen.step(1 / 60)
      const show = frame(kitchen), hand = show.customer!.pose.handL
      if (show.effect?.way === 'many' && show.effect.kind === 'sock') {
        expect(hand).not.toBeNull()
        // The hand is on its face, just over its mouth, wherever its body has swayed to.
        const on = handOnStage(show.customer!.pose, hand!)
        expect(Math.abs(on.x)).toBeLessThan(30)
        expect(Math.abs(on.y + c.mouthAt * c.height + 20)).toBeLessThan(1)
        pinched += 1
      }
    }
    expect(pinched).toBeGreaterThan(30)
  })

  it('pats its belly before it leaves, with a hand that shows over the counter', () => {
    const kitchen = new Kitchen(shownAll(), 42)
    serveRight(kitchen)
    const eaten = kitchen.toSave().customer!
    const door = doorSpot('small')
    kitchen.press(door.x, door.y - 60)
    kitchen.tap()
    kitchen.sounds.length = 0
    let pats = 0, lowest = -Infinity, highest = Infinity
    for (let i = 0; i < 30; i++) {
      kitchen.step(1 / 60)
      const leaving = frame(kitchen).leaving
      if (!leaving || !leaving.pose.handL) continue
      expect(leaving.who).toBe(eaten)
      // Still at the counter while it pats.
      expect(leaving.x).toBe(CUSTOMER.x)
      pats += 1
      lowest = Math.max(lowest, leaving.pose.handL.y)
      highest = Math.min(highest, leaving.pose.handL.y)
      expect(CUSTOMER.y + leaving.pose.handL.y).toBeLessThan(CUSTOMER.y - 50 - 20)
    }
    expect(pats).toBeGreaterThan(20)
    // The hand goes down onto the belly and comes off it again.
    expect(lowest - highest).toBeGreaterThan(15)
    // Then it walks out, and its hand hangs.
    play(kitchen, 0.5)
    const walking = frame(kitchen).leaving
    expect(walking).not.toBeNull()
    expect(walking!.x).toBeGreaterThan(CUSTOMER.x)
    expect(walking!.pose.handL).toBeNull()
  })

  it('hiccups a baked pizza straight back out of the oven with a puff', () => {
    const kitchen = new Kitchen(shownAll(), 43)
    topRight(kitchen)
    toOven(kitchen)
    play(kitchen, 3.5)
    expect(frame(kitchen).puffs.length).toBe(0)
    toOven(kitchen)
    play(kitchen, 0.5)
    const puffs = frame(kitchen).puffs
    expect(puffs.length).toBe(1)
    // Out of the oven's mouth, not off the board.
    expect(puffs[0].x).toBeGreaterThan(PIZZA.x + PIZZA.r)
    expect(Math.abs(puffs[0].x - OVEN.x)).toBeLessThan(OVEN.w / 2)
  })
})

describe('what the second reading found', () => {
  it('serves a raw pizza on a tap of the customer too: the dough is tasted and nothing is counted', () => {
    const kitchen = new Kitchen(shownAll(), 51)
    topRight(kitchen)
    kitchen.press(CUSTOMER.x, CUSTOMER.y - 150)
    kitchen.tap()
    expect(kitchen.busy).toBe(true)
    play(kitchen, 5)
    expect(kitchen.busy).toBe(false)
    expect(kitchen.toSave().pushedBack).toBe(0)
    expect(kitchen.toSave().pizza.baked).toBe(false)
  })

  it('does not serve the same pizza twice on a double tap: the tap that ends a scene is only a poke', () => {
    const kitchen = new Kitchen(shownAll(), 52)
    topRight(kitchen)
    tapTub(kitchen, kitchen.toSave().order!.wanted[0].kind)
    toOven(kitchen)
    play(kitchen, 3.2)
    for (let i = 0; i < 2; i++) {
      kitchen.press(CUSTOMER.x, CUSTOMER.y - 150)
      kitchen.tap()
      kitchen.step(1 / 60)
    }
    expect(kitchen.toSave().pushedBack).toBe(1)
    expect(kitchen.busy).toBe(false)
    // Nor does a child who goes on drumming on the customer: every tap within a second of the last such poke is a poke.
    for (let i = 0; i < 12; i++) {
      play(kitchen, 0.25)
      kitchen.press(CUSTOMER.x, CUSTOMER.y - 150)
      kitchen.tap()
    }
    expect(kitchen.toSave().pushedBack).toBe(1)
    expect(kitchen.busy).toBe(false)
    // A tap after a pause is an ordinary one, and serves.
    play(kitchen, POKES_FOR + 0.2)
    kitchen.press(CUSTOMER.x, CUSTOMER.y - 150)
    kitchen.tap()
    expect(kitchen.busy).toBe(true)
    expect(kitchen.toSave().pushedBack).toBe(2)
  })

  it('pushes a pizza back with the board\'s own sound and no voice', () => {
    const kitchen = new Kitchen(shownAll(), 53)
    topRight(kitchen)
    tapTub(kitchen, kitchen.toSave().order!.wanted[0].kind)
    toOven(kitchen)
    play(kitchen, 3.2)
    toCustomer(kitchen)
    const voice = CHARACTERS[kitchen.toSave().customer!].voice
    const grumble = JSON.stringify(babble(voice, 'grumble'))
    const heard: string[] = []
    for (let i = 0; i < 9 * 60 && kitchen.busy; i++) {
      kitchen.step(1 / 60)
      heard.push(...kitchen.sounds.map((spec) => JSON.stringify(spec)))
      kitchen.sounds.length = 0
    }
    expect(heard.length).toBeGreaterThan(2)
    expect(heard).not.toContain(grumble)
  })

  it('lays a piece the finger had already let go of when the game is put away', () => {
    const kitchen = new Kitchen(shownAll(), 54)
    const kind = kitchen.toSave().order!.wanted[0].kind
    const tub = tubOf(kitchen, kind)
    kitchen.press(tub.x, tub.y)
    kitchen.dragMove(PIZZA.x + 30, PIZZA.y - 20)
    kitchen.dragLift()
    kitchen.putAway()
    expect(kitchen.toSave().pizza.pieces.length).toBe(1)
    expect(kitchen.toSave().pizza.pieces[0].kind).toBe(kind)
  })
})

describe('what the third reading found', () => {
  const frame = (kitchen: Kitchen, idle = 0) => kitchen.show(new IdleLadder(0).update(idle))
  const also = (who: (typeof CUSTOMERS)[number]): Kind => (['mushroom', 'worm', 'olive', 'pepper'] as const).find((kind) => kind !== CHARACTERS[who].loves && kind !== CHARACTERS[who].cannotStand)!

  it('never counts a tasting or an eating it does not show: a tap on the customer waits for a piece that is on its way to its mouth', () => {
    for (const right of [false, true]) {
      const kitchen = new Kitchen(shownAll(), 61)
      topRight(kitchen)
      const kind = kitchen.toSave().order!.wanted[0].kind
      if (!right) tapTub(kitchen, kind)
      toOven(kitchen)
      play(kitchen, 3.2)
      // A piece is fed by hand, and while it is still in the air the customer is tapped.
      const tub = tubOf(kitchen, kind)
      kitchen.press(tub.x, tub.y)
      kitchen.dragMove(CUSTOMER.x, CUSTOMER.y - 120)
      kitchen.dragEnd()
      kitchen.step(1 / 60)
      kitchen.press(CUSTOMER.x, CUSTOMER.y - 150)
      kitchen.tap()
      expect(kitchen.toSave().pushedBack).toBe(0)
      expect(kitchen.toSave().finished).toBe(false)
      // The fed piece gets its own scene; after it a tap serves, and what is counted is shown.
      play(kitchen, 4)
      expect(kitchen.busy).toBe(false)
      kitchen.press(CUSTOMER.x, CUSTOMER.y - 150)
      kitchen.tap()
      expect(kitchen.busy).toBe(true)
      expect(right ? kitchen.toSave().finished : kitchen.toSave().pushedBack === 1).toBe(true)
      kitchen.step(1 / 60)
      expect(kitchen.busy).toBe(true)
    }
  })

  it('drops a carried piece where it was let go when the board is bare after the eating, and rolls it home from there', () => {
    const kitchen = new Kitchen(shownAll(), 62)
    serveRight(kitchen)
    const kind = kitchen.toSave().tubs[0], tub = tubOf(kitchen, kind)
    kitchen.press(tub.x, tub.y)
    kitchen.dragMove(PIZZA.x + 40, PIZZA.y + 20)
    kitchen.dragEnd()
    const flight = kitchen.table.flights[0]
    expect(flight.end.on).toBe('roll')
    expect(flight.from).toEqual({ x: PIZZA.x + 40, y: PIZZA.y + 20 })
    play(kitchen, 1)
    expect(kitchen.table.flights.length).toBe(0)
    expect(kitchen.pieces().length).toBe(0)
  })

  it('waves the roll of one at the door when it is touched, and lets it come to rest', () => {
    const kitchen = new Kitchen(shownAll(), 63)
    play(kitchen, 0.2)
    expect(frame(kitchen).waiting.every((w) => w.wave === 0)).toBe(true)
    const door = doorSpot('big')
    kitchen.press(door.x, door.y - 60)
    kitchen.pressEnd()
    let most = 0
    for (let i = 0; i < 40; i++) {
      kitchen.step(1 / 60)
      most = Math.max(most, Math.abs(frame(kitchen).waiting.find((w) => w.big)!.wave))
      expect(frame(kitchen).waiting.find((w) => !w.big)!.wave).toBe(0)
    }
    expect(most).toBeGreaterThan(0.3)
    play(kitchen, 4)
    expect(Math.abs(frame(kitchen).waiting.find((w) => w.big)!.wave)).toBeLessThan(0.01)
    // Nothing else changed: the customer at the counter has not eaten, so nobody was called in.
    expect(kitchen.toSave().finished).toBe(false)
  })

  it('starts the first reaction as the tongue touches the pizza', () => {
    const kitchen = new Kitchen(shownAll(), 64)
    topRight(kitchen)
    tapTub(kitchen, kitchen.toSave().order!.wanted[0].kind)
    toOven(kitchen)
    play(kitchen, 3.2)
    toCustomer(kitchen)
    let lickAtStart = -1
    for (let i = 0; i < 9 * 60 && kitchen.busy && lickAtStart < 0; i++) {
      kitchen.step(1 / 60)
      const show = frame(kitchen)
      if (show.effect) lickAtStart = show.lick
    }
    expect(lickAtStart).toBeGreaterThan(0.9)
  })

  it('answers the kind it cannot stand on a raw pizza too, and no raw pizza without it', () => {
    for (const who of CUSTOMERS) {
      for (const hated of [true, false]) {
        const kitchen = seated(who, also(who))
        tapTub(kitchen, hated ? CHARACTERS[who].cannotStand : CHARACTERS[who].loves, 1)
        toCustomer(kitchen)
        expect(kitchen.busy).toBe(true)
        let upset = 0
        for (let i = 0; i < 6 * 60 && kitchen.busy; i++) {
          kitchen.step(1 / 60)
          upset = Math.max(upset, frame(kitchen).customer!.pose.upset)
        }
        if (hated) expect(upset, who).toBeGreaterThan(0.95)
        else expect(upset, who).toBe(0)
        expect(frame(kitchen).customer!.pose.upset).toBe(0)
        expect(kitchen.toSave().pushedBack).toBe(0)
      }
    }
  })

  it('drops a worn sock when the customer next moves by itself, with no touch', () => {
    let kitchen = new Kitchen(shownAll(), 1)
    for (let seed = 2; kitchen.toSave().customer !== 'mops'; seed++) kitchen = new Kitchen(shownAll(), seed)
    const at = tubOf(kitchen, 'sock')
    kitchen.press(at.x, at.y)
    kitchen.dragMove(CUSTOMER.x, CUSTOMER.y - 120)
    kitchen.dragEnd()
    play(kitchen, 3)
    expect(frame(kitchen).wearing).toBe(true)
    let worn = 0
    for (let i = 0; i < 40 * 60 && frame(kitchen).wearing; i++) {
      kitchen.step(1 / 60)
      worn += 1
    }
    expect(frame(kitchen).wearing).toBe(false)
    expect(worn).toBeGreaterThan(10)
    expect(kitchen.table.flights.some((f) => f.kind === 'sock' && f.end.on === 'tub')).toBe(true)
  })

  it('sends a pizza the finger had let go of past half way where it was going when the game is put away', () => {
    const kitchen = new Kitchen(shownAll(), 65)
    topRight(kitchen)
    kitchen.press(PIZZA.x, PIZZA.y + PIZZA.r * 0.95)
    kitchen.dragMove(PIZZA.x + 100, PIZZA.y + PIZZA.r * 0.95 + 10)
    kitchen.dragLift()
    kitchen.putAway()
    expect(kitchen.toSave().pizza.baked).toBe(true)
    // Held still under the finger it goes back, as before.
    const other = new Kitchen(shownAll(), 65)
    topRight(other)
    other.press(PIZZA.x, PIZZA.y + PIZZA.r * 0.95)
    other.dragMove(PIZZA.x + 100, PIZZA.y + PIZZA.r * 0.95 + 10)
    other.putAway()
    expect(other.toSave().pizza.baked).toBe(false)
  })

  it('never shows the hand at the spare tub: it taps the tub of the kind the customer loves, whatever the card holds', () => {
    for (const who of CUSTOMERS) {
      const kitchen = seated(who, also(who))
      kitchen.step(1 / 60)
      const loved = tubPlace(0, 3), spare = tubPlace(2, 3)
      let seen = 0
      for (let idle = 5.2; idle < 80; idle += 0.37) {
        const ghost = frame(kitchen, idle).ghost
        if (!ghost || ghost.opacity < 0.5) continue
        seen += 1
        expect(Math.hypot(ghost.x - spare.x, ghost.y - spare.y), `${who} at ${idle}`).toBeGreaterThan(60)
        expect(Math.hypot(ghost.x - loved.x, ghost.y - loved.y), `${who} at ${idle}`).toBeLessThan(60)
      }
      expect(seen, who).toBeGreaterThan(3)
      // Every tub still has the ring: what can be touched is one thing, what is shown another.
      expect(frame(kitchen, 4.5).glows.length).toBe(3)
    }
  })
})

describe('what the fourth reading found', () => {
  const frame = (kitchen: Kitchen) => kitchen.show(new IdleLadder(0).update(0))

  it('shows every piece with its partner on the card, pair by pair, before the leftovers are played', () => {
    const kitchen = new Kitchen(shownAll(LADDER[3]), 71)
    const wanted = kitchen.toSave().order!.wanted
    // One too many of the first kind, and one too few of the second.
    tapTub(kitchen, wanted[0].kind, wanted[0].count + 1)
    if (wanted[1].count > 1) tapTub(kitchen, wanted[1].kind, wanted[1].count - 1)
    toOven(kitchen)
    play(kitchen, 3.2)
    const partners = wanted[0].count + (wanted[1].count - 1)
    toCustomer(kitchen)
    const paired = new Map<number, number>(), order: number[] = []
    let leftover = new Set<number>(), ticks = 0
    for (let i = 0; i < 9 * 60 && kitchen.busy; i++) {
      kitchen.step(1 / 60)
      ticks += kitchen.sounds.length
      const show = frame(kitchen)
      if (show.pairing) {
        // One piece and one picture at a time, together, and before any reaction.
        expect(show.sizzling.length).toBe(1)
        expect(show.card!.patted.length).toBe(1)
        expect(show.effect).toBeNull()
        if (!paired.has(show.sizzling[0])) order.push(show.card!.patted[0])
        paired.set(show.sizzling[0], show.card!.patted[0])
      } else for (const id of show.sizzling) leftover.add(id)
    }
    expect(paired.size).toBe(partners)
    // Each picture pairs with one piece, and they go along the card in its order.
    expect(new Set(paired.values()).size).toBe(partners)
    expect(order).toEqual([...order].sort((a, b) => a - b))
    // The piece that then sizzles is one that was never shown with a partner.
    expect(leftover.size).toBe(1)
    for (const id of leftover) expect(paired.has(id)).toBe(false)
    expect(ticks).toBeGreaterThan(partners)
  })

  it('pairs every piece off before a right pizza is eaten, and still ends inside nine seconds', () => {
    const kitchen = new Kitchen(shownAll(LADDER[6]), 72)
    topRight(kitchen)
    const pieces = kitchen.pieces().length
    toOven(kitchen)
    play(kitchen, 3.2)
    toCustomer(kitchen)
    // Saved when it starts, as before.
    expect(kitchen.toSave().finished).toBe(true)
    const paired = new Set<number>()
    let frames = 0, firstBite = -1
    for (let i = 0; i < 10 * 60 && kitchen.busy; i++) {
      kitchen.step(1 / 60)
      frames += 1
      const show = frame(kitchen)
      if (show.pairing) {
        for (const id of show.sizzling) paired.add(id)
        expect(show.pizza.bites).toBe(0)
      }
      if (firstBite < 0 && show.pizza.bites > 0) firstBite = i
    }
    expect(paired.size).toBe(pieces)
    expect(firstBite).toBeGreaterThan(30)
    expect(frames / 60).toBeLessThanOrEqual(9)
    expect(frames / 60).toBeGreaterThanOrEqual(6)
  })

  it('shuts the oven\'s door on the pizza and opens it before the pizza slides out', () => {
    const kitchen = new Kitchen(shownAll(), 73)
    topRight(kitchen)
    expect(frame(kitchen).door).toBe(0)
    toOven(kitchen)
    let shut = 0
    for (let i = 0; i < 4 * 60 && kitchen.busy; i++) {
      kitchen.step(1 / 60)
      const show = frame(kitchen)
      if (show.door > 0.99) {
        shut += 1
        expect(show.pizza.hidden).toBe(true)
      }
      // While any of the door is across the mouth, the pizza is inside.
      if (show.door > 0.3) expect(show.pizza.hidden).toBe(true)
    }
    expect(shut).toBeGreaterThan(60)
    expect(frame(kitchen).door).toBe(0)
    // A touch in the middle leaves no door across the mouth.
    const other = new Kitchen(shownAll(), 73)
    topRight(other)
    toOven(other)
    play(other, 1.2)
    expect(frame(other).door).toBe(1)
    other.press(CARD.x + 20, CARD.y + 20)
    other.pressEnd()
    expect(frame(other).door).toBe(0)
  })

  it('pulls cheese fed by hand out into a string with one hand and plucks it with the other', () => {
    const kitchen = seated('bim', 'cheese')
    const tub = tubPlace(1, 3)
    kitchen.press(tub.x, tub.y)
    kitchen.dragMove(CUSTOMER.x, CUSTOMER.y - 120)
    kitchen.dragEnd()
    let farthest = 0, lowest = -Infinity, highest = Infinity, frames = 0
    for (let i = 0; i < 4 * 60; i++) {
      kitchen.step(1 / 60)
      const show = frame(kitchen)
      if (show.effect?.way !== 'fed') continue
      const pose = show.customer!.pose
      if (!pose.handL || !pose.handR) continue
      frames += 1
      farthest = Math.min(farthest, pose.handL.x)
      lowest = Math.max(lowest, pose.handR.y)
      highest = Math.min(highest, pose.handR.y)
    }
    // Bim is quick: the whole of it is over in two thirds of a second.
    expect(frames).toBeGreaterThan(25)
    // Pulled out past its own side, on the tubs' side.
    expect(farthest).toBeLessThan(-CHARACTERS.bim.halfWidth)
    // The plucking hand dips and comes back.
    expect(lowest - highest).toBeGreaterThan(15)
    play(kitchen, 2)
    expect(frame(kitchen).customer!.pose.handL).toBeNull()
  })

  it('lets Ooze drip, and nobody else', () => {
    for (const who of CUSTOMERS) {
      const kitchen = seated(who, who === 'ooze' ? 'mushroom' : 'worm')
      const seen = new Set<number>()
      for (let i = 0; i < 6 * 60; i++) {
        kitchen.step(1 / 60)
        seen.add(Math.round(frame(kitchen).customer!.pose.drip * 20))
      }
      if (who === 'ooze') expect(seen.size).toBeGreaterThan(15)
      else expect([...seen]).toEqual([0])
    }
  })
})

describe('one eye, one hand', () => {
  const frame = (kitchen: Kitchen) => kitchen.show(new IdleLadder(0).update(0))

  it('rolls one eye right round for an extra olive and leaves the look of the other alone', () => {
    const kitchen = seated('grum', 'olive')
    tapTub(kitchen, 'cheese', 2)
    tapTub(kitchen, 'olive', 3)
    toOven(kitchen)
    play(kitchen, 3.2)
    toCustomer(kitchen)
    const quarters = new Set<string>()
    let most = 0
    for (let i = 0; i < 9 * 60 && kitchen.busy; i++) {
      kitchen.step(1 / 60)
      const show = frame(kitchen), pose = show.customer!.pose
      if (show.effect?.way === 'many' && show.effect.kind === 'olive') {
        most = Math.max(most, Math.hypot(pose.rollX, pose.rollY))
        if (Math.hypot(pose.rollX, pose.rollY) > 0.5) quarters.add(`${Math.sign(pose.rollX)},${Math.sign(pose.rollY)}`)
      } else expect(Math.hypot(pose.rollX, pose.rollY)).toBeLessThan(1e-9)
    }
    // Right round: through all four quarters.
    expect(quarters.size).toBe(4)
    expect(most).toBeGreaterThan(1)
  })

  it('pulls a sock on with its free hand', () => {
    const kitchen = seated('grum', 'sock')
    const tub = tubPlace(1, 3)
    kitchen.press(tub.x, tub.y)
    kitchen.dragMove(CUSTOMER.x, CUSTOMER.y - 120)
    kitchen.dragEnd()
    let highest = Infinity, frames = 0
    for (let i = 0; i < 3 * 60; i++) {
      kitchen.step(1 / 60)
      const hand = frame(kitchen).customer!.pose.handL
      if (frame(kitchen).effect?.way === 'fed' && hand) {
        frames += 1
        const on = handOnStage(frame(kitchen).customer!.pose, hand)
        highest = Math.min(highest, on.y)
        // Up the tubs' side of its head, never across its face.
        expect(on.x).toBeLessThan(-CHARACTERS.grum.halfWidth * 0.6)
      }
    }
    expect(frames).toBeGreaterThan(20)
    // Up to where the sock is worn, high on the side of its head.
    expect(highest).toBeLessThan(-CHARACTERS.grum.height * 0.7)
    expect(frame(kitchen).wearing).toBe(true)
  })
})

describe('what the fifth reading found', () => {
  const frame = (kitchen: Kitchen) => kitchen.show(new IdleLadder(0).update(0))

  it('plays the whole of a customer\'s answer on a raw pizza: Ooze melts, Mops\'s ears go up, Bim unpicks its knot', () => {
    const raw = (who: (typeof CUSTOMERS)[number]) => {
      const kitchen = seated(who, 'mushroom' === CHARACTERS[who].loves || 'mushroom' === CHARACTERS[who].cannotStand ? 'worm' : 'mushroom')
      tapTub(kitchen, CHARACTERS[who].cannotStand, 1)
      toCustomer(kitchen)
      let flattest = 1, ears = 0, atKnot = 0
      for (let i = 0; i < 6 * 60 && kitchen.busy; i++) {
        kitchen.step(1 / 60)
        const pose = frame(kitchen).customer!.pose
        if (pose.upset <= 0) continue
        flattest = Math.min(flattest, pose.sy)
        ears = Math.max(ears, pose.part)
        if (pose.handR && Math.abs(handOnStage(pose, pose.handR).y + CHARACTERS[who].height + 44) < 1) atKnot += 1
      }
      return { flattest, ears, atKnot }
    }
    // Ooze runs down flat, which is how its answer shows at all.
    expect(raw('ooze').flattest).toBeLessThan(0.7)
    expect(raw('mops').ears).toBeGreaterThan(1.2)
    expect(raw('bim').atKnot).toBeGreaterThan(10)
    expect(raw('grum').atKnot).toBe(0)
  })

  it('puts out one piece for the touch on a tub that ends the first showing early: the shown piece, and no second one', () => {
    const kitchen = new Kitchen(freshSave(null), 81)
    play(kitchen, SHOW_TAP_AFTER + 0.3)
    expect(kitchen.busy).toBe(true)
    // The customer's hand has not reached the tub yet.
    expect(kitchen.table.pieces.length + kitchen.table.flights.length).toBe(0)
    const tub = tubPlace(0, kitchen.toSave().tubs.length)
    kitchen.press(tub.x, tub.y)
    kitchen.tap()
    play(kitchen, 1)
    expect(kitchen.pieces().length).toBe(1)
    // The next touch on the tub is an ordinary one.
    kitchen.press(tub.x, tub.y)
    kitchen.tap()
    play(kitchen, 1)
    expect(kitchen.pieces().length).toBe(2)
  })

  it('takes the shown piece back as the child takes its own first piece, so a child who taps once for each picture makes the first pizza right', () => {
    const kitchen = new Kitchen(freshSave(null), 81)
    play(kitchen, SHOW_TAP_AFTER + 3)
    expect(kitchen.busy).toBe(false)
    expect(kitchen.pieces().length).toBe(1)
    const wanted = kitchen.toSave().order!.wanted
    const tub = tubPlace(0, kitchen.toSave().tubs.length)
    kitchen.sounds.length = 0
    kitchen.press(tub.x, tub.y)
    // The customer's piece is on its way home at once, and the pizza is the child's to fill.
    expect(kitchen.table.flights.some((f) => f.end.on === 'tub')).toBe(true)
    expect(kitchen.pieces().length).toBe(0)
    kitchen.tap()
    play(kitchen, 1)
    expect(kitchen.pieces().length).toBe(1)
    // One tap for each picture, the plain thing, and the first pizza a child ever serves is eaten.
    tapTub(kitchen, wanted[0].kind, wanted[0].count - 1)
    expect(kitchen.pieces().length).toBe(wanted[0].count)
    toOven(kitchen)
    play(kitchen, 3.2)
    toCustomer(kitchen)
    expect(kitchen.toSave().finished).toBe(true)
    expect(kitchen.toSave().pushedBack).toBe(0)
  })

  it('takes the shown piece back while it is still in the air, when the child is that quick', () => {
    const kitchen = new Kitchen(freshSave(null), 81)
    play(kitchen, SHOW_TAP_AFTER + 0.9)
    expect(kitchen.table.flights.length).toBe(1)
    const tub = tubPlace(0, kitchen.toSave().tubs.length)
    kitchen.press(tub.x, tub.y)
    kitchen.tap()
    play(kitchen, 1)
    expect(kitchen.pieces().length).toBe(1)
  })
})

describe('what the sixth reading found', () => {
  const frame = (kitchen: Kitchen) => kitchen.show(new IdleLadder(0).update(0))

  it('takes a tap on a tub that slid a little for a tap: its piece hops on, and the next touch is its own', () => {
    const kitchen = new Kitchen(shownAll(LADDER[1]), 91)
    const kind = kitchen.toSave().order!.wanted[0].kind, tub = tubOf(kitchen, kind)
    kitchen.press(tub.x, tub.y)
    kitchen.dragMove(tub.x + 18, tub.y + 6)
    kitchen.dragLift()
    // The Mount ends a drag that is waiting out its grace before it hands on the next touch-down.
    kitchen.dragEnd()
    kitchen.press(tub.x - 10, tub.y + 4)
    kitchen.tap()
    play(kitchen, 1)
    expect(kitchen.pieces().length).toBe(2)
    // A real carry, let go beside the pizza, still rolls home.
    kitchen.press(tub.x, tub.y)
    kitchen.dragMove(PIZZA.x - PIZZA.r - 80, PIZZA.y - PIZZA.r - 20)
    kitchen.dragLift()
    kitchen.dragEnd()
    play(kitchen, 1)
    expect(kitchen.pieces().length).toBe(2)
  })

  it('has the customer who is called carry its roll to the counter, where the card opens out of it', () => {
    const kitchen = new Kitchen(shownAll(), 92)
    serveRight(kitchen)
    const door = doorSpot('big')
    kitchen.press(door.x, door.y - 60)
    kitchen.tap()
    let carried = 0, opened = 0, start: { x: number; y: number } | null = null, last = 1
    for (let i = 0; i < 5 * 60 && kitchen.busy; i++) {
      kitchen.step(1 / 60)
      const show = frame(kitchen)
      if (!show.roll) continue
      start ??= { x: show.roll.x, y: show.roll.y }
      expect(show.roll.fat).toBe(true)
      if (show.card && show.card.open > 0.02) {
        opened += 1
        // As the card widens the roll is used up, at the card's near edge.
        expect(show.roll.left).toBeLessThanOrEqual(last + 1e-9)
        last = show.roll.left
        expect(Math.abs(show.roll.x - CARD.x)).toBeLessThan(20)
      } else {
        // In its hand all the way; on the one frame between the walk and the card, the hand is on its way to the card.
        const c = show.customer!, hand = c.pose.handR
        if (!hand) continue
        carried += 1
        const on = handOnStage(c.pose, hand)
        expect(Math.hypot(c.x + on.x * c.size - show.roll.x, c.y + on.y * c.size - show.roll.y)).toBeLessThan(1)
      }
    }
    expect(carried).toBeGreaterThan(60)
    expect(opened).toBeGreaterThan(10)
    // It set out from where it was held at the door.
    expect(Math.abs(start!.x - door.x)).toBeLessThan(40)
    expect(frame(kitchen).roll).toBeNull()
    expect(frame(kitchen).card!.open).toBe(1)
  })
})

describe('the board, nudged', () => {
  it('moves the board a hand\'s width towards the oven with the pizza on it, and lets both slide back', () => {
    const kitchen = new Kitchen({ ...freshSave(null), shown: ['tap-a-tub'] }, 15)
    tapTub(kitchen, kitchen.toSave().order!.wanted[0].kind)
    let far = 0
    for (let i = 0; i < (SHOW_OVEN_AFTER + 3) * 60; i++) {
      kitchen.step(1 / 60)
      const show = kitchen.show(new IdleLadder(0).update(0))
      if (!kitchen.busy) continue
      // The pizza lies on the board all the way.
      expect(Math.abs(show.pizza.x - PIZZA.x - show.boardX)).toBeLessThan(1e-9)
      far = Math.max(far, show.boardX)
    }
    expect(far).toBeGreaterThan(40)
    expect(far).toBeLessThan(60)
    expect(kitchen.show(new IdleLadder(0).update(0)).boardX).toBe(0)
    expect(kitchen.toSave().shown).toContain('to-the-oven')
  })
})

describe('what the eighth reading found', () => {
  it('calls in the one at the door on a touch that slid, and bakes on a touch on the oven that slid', () => {
    const kitchen = new Kitchen(shownAll(), 101)
    topRight(kitchen)
    // The oven, with a finger that slips.
    kitchen.press(OVEN.x, OVEN.y)
    kitchen.dragMove(OVEN.x + 20, OVEN.y + 12)
    kitchen.dragEnd()
    expect(kitchen.toSave().pizza.baked).toBe(true)
    play(kitchen, 3.2)
    toCustomer(kitchen)
    play(kitchen, 9)
    expect(kitchen.toSave().finished).toBe(true)
    const before = kitchen.toSave().customer
    const door = doorSpot('small')
    kitchen.press(door.x, door.y - 60)
    kitchen.dragMove(door.x + 24, door.y - 50)
    kitchen.dragLift()
    kitchen.dragEnd()
    expect(kitchen.toSave().finished).toBe(false)
    expect(kitchen.toSave().customer).not.toBe(before)
    expect(kitchen.busy).toBe(true)
  })

  it('sounds the pop in the handler of the touch that caused it, before any step', () => {
    const kitchen = new Kitchen(shownAll(), 102)
    kitchen.sounds.length = 0
    const tub = tubPlace(0, kitchen.toSave().tubs.length)
    kitchen.press(tub.x, tub.y)
    expect(kitchen.sounds.length).toBe(1)
    kitchen.sounds.length = 0
    kitchen.tap()
    play(kitchen, 1)
    // And the pip of a piece tapped off, the same way.
    const at = kitchen.pieces()[0]
    kitchen.press(PIZZA.x + at.x * PIZZA.r, PIZZA.y + at.y * PIZZA.r)
    kitchen.sounds.length = 0
    kitchen.tap()
    expect(kitchen.sounds.length).toBe(1)
  })
})

describe('what the eleventh reading found', () => {
  it('counts a piece carried to the customer as a piece the child moved itself: the tap is not shown after it', () => {
    const kitchen = new Kitchen(freshSave(null), 111)
    const tub = tubPlace(0, kitchen.toSave().tubs.length)
    kitchen.press(tub.x, tub.y)
    kitchen.dragMove(CUSTOMER.x, CUSTOMER.y - 120)
    kitchen.dragEnd()
    expect(kitchen.toSave().shown).toContain('tap-a-tub')
    play(kitchen, 4)
    // The pizza is still bare and the child waits: nothing hops onto it by itself.
    play(kitchen, SHOW_TAP_AFTER + 4)
    expect(kitchen.pieces().length).toBe(0)
  })
})

describe('what the thirteenth reading found', () => {
  const frame = (kitchen: Kitchen) => kitchen.show(new IdleLadder(0).update(0))

  it('keeps every customer\'s eyes open for the look at the tub of a missing kind, the sleepy one too', () => {
    for (const who of CUSTOMERS) {
      const kitchen = seated(who, 'mushroom' === CHARACTERS[who].loves || 'mushroom' === CHARACTERS[who].cannotStand ? 'worm' : 'mushroom')
      tapTub(kitchen, CHARACTERS[who].loves, 1)
      toOven(kitchen)
      play(kitchen, 3.2)
      toCustomer(kitchen)
      let frames = 0, shut = 0
      for (let i = 0; i < 9 * 60 && kitchen.busy; i++) {
        kitchen.step(1 / 60)
        const show = frame(kitchen)
        if (show.effect?.way !== 'few') continue
        frames += 1
        if (show.customer!.pose.blink > 0.6) shut += 1
      }
      expect(frames, who).toBeGreaterThan(60)
      expect(shut, who).toBe(0)
    }
  })
})

describe('what the fifteenth reading found', () => {
  const frame = (kitchen: Kitchen) => kitchen.show(new IdleLadder(0).update(0))

  it('never lets a try be quicker than its tasting: a customer that has pushed a pizza back takes no other until that tasting would have ended', () => {
    const kitchen = new Kitchen(shownAll(LADDER[1]), 151)
    const kind = kitchen.toSave().order!.wanted[0].kind
    topRight(kitchen)
    tapTub(kitchen, kind, 2)
    toOven(kitchen)
    play(kitchen, 3.2)
    toCustomer(kitchen)
    expect(kitchen.toSave().pushedBack).toBe(1)
    // A touch ends the show of the tasting at once: a piece comes off, and the pizza is served again straight away.
    const at = kitchen.pieces()[0]
    kitchen.press(PIZZA.x + at.x * PIZZA.r, PIZZA.y + at.y * PIZZA.r)
    kitchen.tap()
    play(kitchen, 0.6)
    toCustomer(kitchen)
    expect(kitchen.busy).toBe(false)
    expect(kitchen.toSave().pushedBack).toBe(1)
    // Nothing points at the customer while it will take no pizza: no ring round its mouth, and the hand shows no slide up to it.
    for (const idle of [4.5, 6.5, 19.5, 42.5]) {
      const hinted = kitchen.show(new IdleLadder(0).update(idle))
      for (const glow of hinted.glows) expect(glow.y).toBeGreaterThan(COUNTER_Y)
      if (hinted.ghost) expect(hinted.ghost.y).toBeGreaterThan(COUNTER_Y)
    }
    // It is still tasting the last one, and shows it: lips working, eyes up.
    kitchen.step(1 / 60)
    expect(frame(kitchen).customer!.pose.pucker).toBeGreaterThan(0.15)
    // When that tasting would have ended, the next serving is tasted.
    play(kitchen, 5)
    expect(frame(kitchen).customer!.pose.pucker).toBe(0)
    toCustomer(kitchen)
    expect(kitchen.busy).toBe(true)
    expect(kitchen.toSave().pushedBack).toBe(2)
  })

  it('turns the pictures on a card a little, and no two neighbours the same way', () => {
    for (let i = 0; i < 10; i++) {
      expect(Math.abs(pictureTurn(i))).toBeLessThan(0.4)
      expect(pictureTurn(i)).not.toBe(pictureTurn(i + 1))
    }
  })
})

describe('what the sixteenth reading found', () => {
  const frame = (kitchen: Kitchen) => kitchen.show(new IdleLadder(0).update(0))

  it('keeps Bim\'s free hand on its nose through every stink cloud, and unpicks the knot with its other hand', () => {
    const kitchen = seated('bim', 'mushroom')
    tapTub(kitchen, 'olive', 2)
    tapTub(kitchen, 'mushroom', 2)
    tapTub(kitchen, 'sock', 3)
    toOven(kitchen)
    play(kitchen, 3.2)
    toCustomer(kitchen)
    const c = CHARACTERS.bim
    let clouds = 0, atKnot = 0
    for (let i = 0; i < 9 * 60 && kitchen.busy; i++) {
      kitchen.step(1 / 60)
      const show = frame(kitchen), pose = show.customer!.pose
      if (show.effect?.way === 'many' && show.effect.kind === 'sock') {
        clouds += 1
        const on = handOnStage(pose, pose.handL!)
        expect(Math.abs(on.y + c.mouthAt * c.height + 20), `frame ${i}`).toBeLessThan(1)
      }
      if (pose.handR && Math.abs(handOnStage(pose, pose.handR).y + c.height + 44) < 1) atKnot += 1
    }
    expect(clouds).toBeGreaterThan(60)
    expect(atKnot).toBeGreaterThan(10)
  })

  it('stands the roll upright along the card\'s edge before the card opens out of it', () => {
    const kitchen = new Kitchen(shownAll(), 161)
    serveRight(kitchen)
    const door = doorSpot('big')
    kitchen.press(door.x, door.y - 60)
    kitchen.tap()
    let opening = 0
    for (let i = 0; i < 5 * 60 && kitchen.busy; i++) {
      kitchen.step(1 / 60)
      const show = frame(kitchen)
      if (!show.roll || !show.card || show.card.open <= 0.02) continue
      opening += 1
      // Upright, so the widening card is beside it and never across it.
      expect(Math.abs(show.roll.turn - Math.PI / 2)).toBeLessThan(1e-6)
    }
    expect(opening).toBeGreaterThan(10)
  })
})

describe('what the nineteenth reading found', () => {
  it('lets a touch where the card hung go unanswered once the card has been rolled away', () => {
    const kitchen = new Kitchen(shownAll(), 191)
    serveRight(kitchen)
    kitchen.sounds.length = 0
    kitchen.press(CARD.x + CARD.w / 2, CARD.y + CARD.h / 2)
    kitchen.pressEnd()
    expect(kitchen.sounds.length).toBe(0)
  })
})

describe('the street through the doorway', () => {
  const frame = (kitchen: Kitchen) => kitchen.show(new IdleLadder(0).update(0))
  const touch = (kitchen: Kitchen, x: number, y: number) => {
    kitchen.sounds.length = 0
    kitchen.press(x, y)
    kitchen.pressEnd()
  }

  it('answers a touch on the sun, the tree, the house, a cloud and the bird, each with its own sound and its own small show, and changes nothing', () => {
    const kitchen = new Kitchen(shownAll(), 201)
    play(kitchen, 1)
    const before = JSON.stringify(serialize(kitchen.toSave()))
    const heard = new Set<string>()
    const spots: [StreetThing, () => { x: number; y: number }][] = [
      ['sun', () => ({ x: STREET.sun.x + STREET.sun.r + 24, y: STREET.sun.y + 6 })],
      ['tree', () => ({ x: STREET.tree.x + 10, y: STREET.tree.y - 10 })],
      ['house', () => ({ x: STREET.house.x + 70, y: STREET.house.y + 30 })],
    ]
    for (const [what, at] of spots) {
      play(kitchen, 1)
      // Keep clear of what drifts in front: try again when a cloud or the bird is over the spot.
      for (let tries = 0; tries < 400 && streetAt(at().x, at().y, kitchen.show(new IdleLadder(0).update(0)).time)?.what !== what; tries++) play(kitchen, 0.1)
      touch(kitchen, at().x, at().y)
      expect(frame(kitchen).street?.what, what).toBe(what)
      expect(kitchen.sounds.length, what).toBe(1)
      heard.add(JSON.stringify(kitchen.sounds[0]))
      // Its show is over in under a second, by itself.
      play(kitchen, STREET_ANSWER + 0.1)
      expect(frame(kitchen).street, what).toBeNull()
    }
    // A cloud, wherever it has drifted to, and the bird when it is over the street.
    play(kitchen, 0.3)
    const cloud = clouds(frame(kitchen).time).find((c) => c.x > DOOR.x - DOOR.w / 2 + 60 && c.x < DOOR.x + DOOR.w / 2 - 60)
    if (cloud) {
      touch(kitchen, cloud.x, cloud.y - 8)
      expect(frame(kitchen).street?.what).toBe('cloud')
      heard.add(JSON.stringify(kitchen.sounds[0]))
    }
    for (let i = 0; i < 14 * 60 && !bird(frame(kitchen).time); i++) kitchen.step(1 / 60)
    for (let i = 0; i < 4 * 60; i++) {
      const flying = bird(frame(kitchen).time)
      if (flying && flying.x > DOOR.x - DOOR.w / 2 + 40 && flying.x < DOOR.x + DOOR.w / 2 - 40) break
      kitchen.step(1 / 60)
    }
    const flying = bird(frame(kitchen).time)!
    touch(kitchen, flying.x, flying.y)
    expect(frame(kitchen).street?.what).toBe('bird')
    heard.add(JSON.stringify(kitchen.sounds[0]))
    expect(heard.size).toBe(cloud ? 5 : 4)
    expect(JSON.stringify(serialize(kitchen.toSave()))).toBe(before)
    expect(kitchen.busy).toBe(false)
  })

  it('still answers a touch on one at the door as that one, and not as the street behind it', () => {
    const kitchen = new Kitchen(shownAll(), 202)
    play(kitchen, 0.5)
    for (const which of ['small', 'big'] as const) {
      const spot = doorSpot(which)
      touch(kitchen, spot.x, spot.y - 60)
      expect(frame(kitchen).street).toBeNull()
      expect(kitchen.sounds.length).toBe(1)
    }
  })
})

describe('round 4 of the sheet, and what the lead\'s reader saw beside it', () => {
  const frame = (kitchen: Kitchen) => kitchen.show(new IdleLadder(0).update(0))

  it('has the first kitchen ready to be saved as the game opens, before any touch, and finds the same customer and card again', () => {
    const kitchen = new Kitchen(freshSave(null), 211)
    // The Mount hands the kitchen's change to storage straight after it is made: the change is there at once.
    expect(kitchen.dirty).toBe('now')
    const first = kitchen.toSave()
    expect(first.customer).not.toBeNull()
    expect(first.order).not.toBeNull()
    expect(first.tubs.length).toBeGreaterThan(0)
    expect(first.pizza).toEqual({ pieces: [], baked: false })
    expect(first.waiting).not.toBeNull()
    // Put away at once and opened again, with another seed: the same customer, the same card, the same two at the door.
    const again = new Kitchen(deserialize(serialize(first), null), 999).toSave()
    expect(again.customer).toBe(first.customer)
    expect(again.order).toEqual(first.order)
    expect(again.tubs).toEqual(first.tubs)
    expect(again.waiting).toEqual(first.waiting)
  })

  it('answers a pizza served during the wait as a poke that shows why: it turns away with shut eyes and a hand up, and the pizza is back on the board as it was', () => {
    const kitchen = new Kitchen(shownAll(LADDER[1]), 212)
    const kind = kitchen.toSave().order!.wanted[0].kind
    topRight(kitchen)
    tapTub(kitchen, kind, 1)
    toOven(kitchen)
    play(kitchen, 3.2)
    toCustomer(kitchen)
    // The child takes the extra piece off: the pizza is right now, and is served again at once.
    const at = kitchen.pieces()[0]
    kitchen.press(PIZZA.x + at.x * PIZZA.r, PIZZA.y + at.y * PIZZA.r)
    kitchen.tap()
    play(kitchen, 0.6)
    const before = JSON.stringify(serialize(kitchen.toSave()))
    kitchen.sounds.length = 0
    toCustomer(kitchen)
    expect(kitchen.busy).toBe(false)
    expect(kitchen.sounds.length).toBeGreaterThan(0)
    let shut = 0, away = 0, handUp = 0
    for (let i = 0; i < 50; i++) {
      kitchen.step(1 / 60)
      const pose = frame(kitchen).customer!.pose
      if (pose.blink > 0.8) shut += 1
      if (pose.lean < -0.04) away += 1
      if (pose.handL && pose.handL.y < -100) handUp += 1
    }
    expect(shut).toBeGreaterThan(10)
    expect(away).toBeGreaterThan(10)
    expect(handUp).toBeGreaterThan(10)
    // Back on the board as it was, and nothing counted.
    play(kitchen, 0.5)
    expect(frame(kitchen).pizza.y).toBeCloseTo(PIZZA.y, 0)
    expect(JSON.stringify(serialize(kitchen.toSave()))).toBe(before)
    // The wait is not saved: opened again, the customer is ready, and the right pizza is eaten.
    const again = new Kitchen(deserialize(serialize(kitchen.toSave()), null), 5)
    toCustomer(again)
    expect(again.toSave().finished).toBe(true)
  })

  it('draws a piece lifted off a baked pizza as toasted, in the hand and in the air', () => {
    const kitchen = new Kitchen(shownAll(), 213)
    topRight(kitchen)
    toOven(kitchen)
    play(kitchen, 3.2)
    const at = kitchen.pieces()[0]
    kitchen.press(PIZZA.x + at.x * PIZZA.r, PIZZA.y + at.y * PIZZA.r)
    // In the hand it remembers the spot it came from, which is how the view knows to toast it.
    expect(kitchen.table.hand!.from).not.toBeNull()
    kitchen.tap()
    expect(kitchen.table.flights[0].lifted).toBe(true)
    // One from a tub is not toasted until it lands.
    const tub = tubOf(kitchen, kitchen.toSave().order!.wanted[0].kind)
    kitchen.press(tub.x, tub.y)
    expect(kitchen.table.hand!.from).toBeNull()
    kitchen.tap()
    expect(kitchen.table.flights[kitchen.table.flights.length - 1].lifted).toBe(false)
  })
})
