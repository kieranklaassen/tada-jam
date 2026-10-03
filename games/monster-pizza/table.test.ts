import { describe, expect, it } from 'vitest'
import { PIZZA, TUB, onPizza } from './layout'
import { APART, CAPACITY, REACH, carry, countOf, dropHand, flightAt, makeTable, pressPiece, pressTub, releaseHand, restingPieces, stepTable, tapHand, tubAt, waitHand, whatIsAt, type Table } from './table'

/** Plays game time until nothing is in the air. */
function settle(table: Table, seconds = 1): void {
  for (let i = 0; i < seconds * 60; i++) stepTable(table, 1 / 60)
}

function tapTub(table: Table, index: number): void {
  pressTub(table, index)
  tapHand(table)
}

function overlaps(table: Table): number {
  let n = 0
  for (let i = 0; i < table.pieces.length; i++) for (let j = i + 1; j < table.pieces.length; j++) if (Math.hypot(table.pieces[i].x - table.pieces[j].x, table.pieces[i].y - table.pieces[j].y) < APART - 1e-9) n++
  return n
}

describe('the table', () => {
  it('puts out exactly one piece for one tap on a tub, and answers on touch-down', () => {
    const table = makeTable(['pepper', 'cheese'], 1)
    pressTub(table, 0)
    // The answer starts when the finger lands: a squash, a piece in the hand and a pop.
    expect(table.hand?.kind).toBe('pepper')
    expect(table.tubs[0].squash.v).not.toBe(0)
    expect(table.events).toEqual([{ type: 'pop', kind: 'pepper' }])
    tapHand(table)
    settle(table)
    expect(table.pieces.map((p) => p.kind)).toEqual(['pepper'])
    for (let i = 0; i < 4; i++) tapTub(table, 1)
    settle(table)
    expect(countOf(table, 'cheese')).toBe(4)
    expect(countOf(table, 'pepper')).toBe(1)
  })

  it('counts each landing by its kind, one higher every time', () => {
    const table = makeTable(['olive'], 2)
    const counts: number[] = []
    for (let i = 0; i < 5; i++) {
      tapTub(table, 0)
      settle(table)
      for (const e of table.events) if (e.type === 'plop') counts.push(e.count)
      table.events.length = 0
    }
    expect(counts).toEqual([1, 2, 3, 4, 5])
  })

  it('never lays two pieces on each other and keeps every piece on the pizza, however fast the taps come', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const table = makeTable(['pepper', 'sock', 'worm'], seed)
      for (let i = 0; i < CAPACITY; i++) {
        tapTub(table, i % 3)
        stepTable(table, 1 / 60)
      }
      settle(table)
      expect(table.pieces.length).toBe(CAPACITY)
      expect(overlaps(table)).toBe(0)
      for (const p of table.pieces) expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(REACH + 1e-9)
    }
  })

  it('always has room for twelve, even when a hand has laid pieces so that no gap is left: the pieces shuffle up', () => {
    const table = makeTable(['pepper', 'cheese'], 11)
    // Seven pieces laid by hand, spread so that no eighth fits between them.
    const spread = [[0, 0], [0.55, 0], [-0.55, 0], [0.27, 0.48], [-0.27, 0.48], [0.27, -0.48], [-0.27, -0.48]]
    for (const [sx, sy] of spread) {
      pressTub(table, 0)
      const at = onPizza(sx, sy)
      carry(table, at.x, at.y)
      dropHand(table)
      settle(table)
    }
    expect(table.pieces.length).toBe(7)
    for (let i = 0; i < 5; i++) {
      tapTub(table, 1)
      settle(table)
    }
    expect(table.pieces.length).toBe(CAPACITY)
    expect(overlaps(table)).toBe(0)
    for (const p of table.pieces) expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(REACH + 1e-9)
  })

  it('turns nothing away in silence when the pizza is full: the extra piece bounces off and goes home', () => {
    const table = makeTable(['mushroom'], 3)
    for (let i = 0; i < CAPACITY; i++) tapTub(table, 0)
    settle(table)
    table.events.length = 0
    tapTub(table, 0)
    expect(table.flights[0].end.on).toBe('bounce')
    const mid = flightAt({ ...table.flights[0], t: 0.45 })
    expect(Math.hypot(mid.x - PIZZA.x, mid.y - (PIZZA.y - PIZZA.r * 0.3))).toBeLessThan(1)
    settle(table)
    expect(table.pieces.length).toBe(CAPACITY)
    expect(table.events.some((e) => e.type === 'home')).toBe(true)
  })

  it('sends a tapped piece home, one step down', () => {
    const table = makeTable(['cheese'], 4)
    for (let i = 0; i < 3; i++) tapTub(table, 0)
    settle(table)
    table.events.length = 0
    pressPiece(table, table.pieces[0].id)
    tapHand(table)
    expect(table.events).toContainEqual({ type: 'pip', kind: 'cheese', count: 2 })
    settle(table)
    expect(countOf(table, 'cheese')).toBe(2)
  })

  it('lays a carried piece where it is let go, or as near as there is room', () => {
    const table = makeTable(['cheese'], 5)
    tapTub(table, 0)
    settle(table)
    const first = table.pieces[0]
    pressTub(table, 0)
    const at = onPizza(first.x, first.y)
    carry(table, at.x, at.y)
    dropHand(table)
    settle(table)
    expect(table.pieces.length).toBe(2)
    expect(overlaps(table)).toBe(0)
    const laid = table.pieces[1]
    expect(Math.hypot(laid.x - first.x, laid.y - first.y)).toBeLessThan(APART + 0.11)
  })

  it('rolls a piece let go off the pizza back to its tub, at no cost', () => {
    const table = makeTable(['sock'], 6)
    pressTub(table, 0)
    carry(table, 1100, 200)
    dropHand(table)
    expect(table.flights[0].end).toEqual({ on: 'tub', tub: 0 })
    settle(table)
    expect(table.pieces.length).toBe(0)
  })

  it('puts a piece back where it came from when the press ends without a tap', () => {
    const table = makeTable(['worm'], 7)
    tapTub(table, 0)
    settle(table)
    const { x, y } = table.pieces[0]
    pressPiece(table, table.pieces[0].id)
    expect(table.pieces.length).toBe(0)
    releaseHand(table)
    expect(table.pieces.map((p) => [p.x, p.y])).toEqual([[x, y]])
    pressTub(table, 0)
    releaseHand(table)
    expect(table.pieces.length).toBe(1)
  })

  it('finds what a touch lands on: a tub, a piece, the pizza, or nothing', () => {
    const table = makeTable(['pepper', 'cheese'], 8)
    tapTub(table, 0)
    settle(table)
    const tub = tubAt(table, 1)
    expect(whatIsAt(table, tub.x + TUB.r * 0.5, tub.y)).toEqual({ what: 'tub', index: 1 })
    const piece = onPizza(table.pieces[0].x, table.pieces[0].y)
    expect(whatIsAt(table, piece.x + 4, piece.y - 4)).toEqual({ what: 'piece', id: table.pieces[0].id })
    const bare = onPizza(-table.pieces[0].x, -table.pieces[0].y)
    expect(Math.hypot(table.pieces[0].x, table.pieces[0].y) > 0.3 ? whatIsAt(table, bare.x, bare.y) : { what: 'pizza' }).toEqual({ what: 'pizza' })
    expect(whatIsAt(table, 1150, 790)).toBeNull()
  })

  it('saves nothing in the air: a flying piece where it will land, a held piece where it came from', () => {
    const table = makeTable(['olive', 'cheese'], 9)
    tapTub(table, 0)
    settle(table)
    tapTub(table, 1)
    stepTable(table, 1 / 60)
    expect(table.flights.length).toBe(1)
    const target = table.flights[0].end
    expect(restingPieces(table).length).toBe(2)
    if (target.on === 'pizza') expect(restingPieces(table)[1]).toMatchObject({ kind: 'cheese', x: target.x, y: target.y })
    settle(table)
    // Held from the pizza: saved on its own spot. Held from a tub: not saved at all.
    const spot = { x: table.pieces[0].x, y: table.pieces[0].y }
    pressPiece(table, table.pieces[0].id)
    carry(table, 30, 30)
    waitHand(table)
    expect(restingPieces(table)).toContainEqual(expect.objectContaining({ kind: 'olive', x: spot.x, y: spot.y }))
    dropHand(table)
    settle(table)
    pressTub(table, 0)
    expect(restingPieces(table).length).toBe(table.pieces.length)
  })

  it('plays the same from the same seed', () => {
    const run = (): number[][] => {
      const table = makeTable(['pepper', 'cheese'], 42)
      for (let i = 0; i < 9; i++) {
        tapTub(table, i % 2)
        stepTable(table, 1 / 60)
      }
      settle(table)
      return table.pieces.map((p) => [p.x, p.y, p.turn])
    }
    expect(run()).toEqual(run())
  })
})
