import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { CHARACTERS, CUSTOMERS } from './customers'
import { IdleLadder } from './guidance'
import { Kitchen, SHOW_OVEN_AFTER, SHOW_TAP_AFTER } from './kitchen'
import type { Kind } from './kinds'
import { CARD, CUSTOMER, OVEN, PIZZA, tubPlace } from './layout'
import { matches } from './order'
import { deserialize, freshSave, serialize, type Save } from './save'
import { doorSpot } from './staging'
import { APART } from './table'
import { LIMITS, seconds } from './voices'

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
  play(kitchen, 7.5)
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
    play(kitchen, 7.5)
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

  it('feeds a piece to the customer by hand: carried onto it, or tapped out when the board is bare', () => {
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
    kitchen.press(at.x, at.y)
    kitchen.tap()
    play(kitchen, 0.5)
    expect(kitchen.busy).toBe(true)
    expect(kitchen.toSave().finished).toBe(true)
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
