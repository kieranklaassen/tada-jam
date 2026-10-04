import { describe, expect, it } from 'vitest'
import { BOWL, KINDS, LOOKS, SOCK_LEAN } from './kinds'
import { PIZZA, TUB, onPizza } from './layout'
import { landing, pizzaJiggle, tubSquash } from './pieceMotion'
import { APART, CAPACITY, REACH, ROLL_AT, carry, countOf, dropHand, flightAt, jigglePizza, makeTable, pressPiece, pressTub, releaseHand, restingPieces, stepTable, SOCK_LEANS, tapHand, tubAt, turnAt, waitHand, whatIsAt, type Table, type TableEvent } from './table'

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

  it('counts each landing, one higher every time', () => {
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

  it('counts what lies on the pizza, whatever the kinds: a second kind carries the note on', () => {
    const table = makeTable(['olive', 'sock'], 2)
    const counts: number[] = []
    for (const tub of [0, 0, 1, 0, 1]) {
      tapTub(table, tub)
      settle(table)
      for (const e of table.events) if (e.type === 'plop') counts.push(e.count)
      table.events.length = 0
    }
    expect(counts).toEqual([1, 2, 3, 4, 5])
    pressPiece(table, table.pieces[0].id)
    tapHand(table)
    expect(table.events).toContainEqual({ type: 'pip', kind: 'olive', count: 4 })
  })

  it('lays a piece on a spot the same way every time, so how it lies need not be kept', () => {
    expect(turnAt(0.31, -0.2)).toBe(turnAt(0.31, -0.2))
    expect(turnAt(0.3104, -0.2)).toBe(turnAt(0.31, -0.2))
    expect(turnAt(0.31, -0.2)).not.toBe(turnAt(-0.2, 0.31))
    const table = makeTable(['worm'], 11)
    tapTub(table, 0)
    settle(table)
    const piece = table.pieces[0]
    expect(piece.turn).toBe(turnAt(piece.x, piece.y, piece.kind))
    // A sock always lies down: with the tip of its own outline it is never turned far enough to stand on its toe or its heel.
    for (let i = 0; i < 400; i++) {
      const turn = turnAt(Math.cos(i) * 0.8, Math.sin(i * 1.7) * 0.8, 'sock')
      expect(turn).toBeGreaterThanOrEqual(SOCK_LEANS[0])
      expect(turn).toBeLessThanOrEqual(SOCK_LEANS[1])
      expect(Math.abs(SOCK_LEAN + turn)).toBeLessThan(0.7)
    }
    expect(Object.keys(restingPieces(table)[0]).sort()).toEqual(['kind', 'x', 'y'])
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
    // It is heard coming off the heap once, before it is heard going home.
    const heard = table.events.map((e) => e.type)
    expect(heard.filter((type) => type === 'boing').length).toBe(1)
    expect(heard.indexOf('boing')).toBeLessThan(heard.indexOf('home'))
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

  it('bounces a carried piece off a full pizza with a boing, as it does a tapped one', () => {
    const table = makeTable(['mushroom'], 3)
    for (let i = 0; i < CAPACITY; i++) tapTub(table, 0)
    settle(table)
    table.events.length = 0
    pressTub(table, 0)
    carry(table, PIZZA.x + 20, PIZZA.y - 10)
    dropHand(table)
    expect(table.flights[0].end.on).toBe('bounce')
    // Off the heap it goes home to its tub, and not back to where the finger let it go.
    const end = flightAt({ ...table.flights[0], t: 1 })
    expect(Math.hypot(end.x - tubAt(table, 0).x, end.y - tubAt(table, 0).y)).toBeLessThan(1)
    settle(table)
    expect(table.pieces.length).toBe(CAPACITY)
    expect(table.events.map((e) => e.type).filter((type) => type === 'boing').length).toBe(1)
  })

  it('has weight that can be seen: a pressed tub squashes, a landing squashes its piece, turns the pizza and bobs the others, and a tap on the pizza wobbles every piece', () => {
    const table = makeTable(['mushroom', 'cheese', 'olive'], 9)
    // A pressed tub: at least a twelfth shorter for a moment.
    pressTub(table, 0)
    let shortest = 0
    for (let i = 0; i < 30; i++) {
      stepTable(table, 1 / 60)
      shortest = Math.min(shortest, tubSquash(table.tubs[0].squash.x).tall)
    }
    expect(shortest).toBeLessThan(-0.08)
    tapHand(table)
    settle(table)
    for (const tub of [1, 2, 1]) {
      tapTub(table, tub)
      settle(table)
    }
    table.events.length = 0
    // One more lands: it squashes by a tenth or more, the pizza turns a degree or more, and each piece already there moves two units or more.
    tapTub(table, 2)
    const moved = new Map<number, number>()
    let turned = 0, squashed = 0
    for (let i = 0; i < 90; i++) {
      stepTable(table, 1 / 60)
      turned = Math.max(turned, Math.abs(pizzaJiggle(table.jiggle.x).turn))
      for (const piece of table.pieces) {
        const move = landing(piece.kind, piece.settle.x, piece.age)
        moved.set(piece.id, Math.max(moved.get(piece.id) ?? 0, Math.abs(move.hop) + Math.abs(move.wide) * PIZZA.r * 0.152))
        if (piece === table.pieces[table.pieces.length - 1]) squashed = Math.max(squashed, move.wide)
      }
    }
    expect(table.pieces.length).toBe(5)
    expect(turned).toBeGreaterThan(Math.PI / 180)
    expect(squashed).toBeGreaterThan(0.08)
    for (const [id, by] of moved) expect(by, `piece ${id}`).toBeGreaterThan(2)
    // A tap on the pizza: it turns two degrees or more, and every piece on it moves two units or more.
    for (let i = 0; i < 120; i++) stepTable(table, 1 / 60)
    jigglePizza(table)
    const wobbled = new Map<number, number>()
    let tapTurned = 0
    for (let i = 0; i < 90; i++) {
      stepTable(table, 1 / 60)
      tapTurned = Math.max(tapTurned, Math.abs(pizzaJiggle(table.jiggle.x).turn))
      for (const piece of table.pieces) {
        const move = landing(piece.kind, piece.settle.x, piece.age)
        wobbled.set(piece.id, Math.max(wobbled.get(piece.id) ?? 0, Math.abs(move.hop) + Math.abs(move.wide) * PIZZA.r * 0.152))
      }
    }
    expect(tapTurned).toBeGreaterThan((2 * Math.PI) / 180)
    for (const [id, by] of wobbled) expect(by, `piece ${id}`).toBeGreaterThan(2)
    // And none of it grows with the number of taps: a storm of them kicks no harder than one good knock.
    for (let i = 0; i < 20; i++) jigglePizza(table)
    let wildest = 0
    for (let i = 0; i < 60; i++) {
      stepTable(table, 1 / 60)
      wildest = Math.max(wildest, Math.abs(pizzaJiggle(table.jiggle.x).turn))
    }
    expect(wildest).toBeLessThan((5 * Math.PI) / 180)
  })

  it('always has room for twelve, however fast the taps come: no piece is turned away before the pizza is full', () => {
    for (let seed = 0; seed < 1500; seed++) {
      const table = makeTable(['mushroom', 'olive', 'sock'], seed)
      let turnedAway = 0
      for (let i = 0; i < CAPACITY; i++) {
        pressTub(table, i % 3)
        tapHand(table)
        if (table.flights[table.flights.length - 1].end.on !== 'pizza') turnedAway += 1
        // The next tap comes while this piece is still in the air.
        for (let f = 0; f < 3 + (seed % 5); f++) stepTable(table, 1 / 60)
      }
      settle(table)
      if (turnedAway !== 0 || table.pieces.length !== CAPACITY || overlaps(table) !== 0) throw new Error(`seed ${seed}: ${turnedAway} turned away, ${table.pieces.length} on the pizza, ${overlaps(table)} on each other`)
    }
  })

  it('gives no bowl the colour of a kind, its own or another\'s', () => {
    const fills = KINDS.map((kind) => LOOKS[kind].fill)
    for (const kind of KINDS) expect(fills, kind).not.toContain(LOOKS[kind].tub)
    // And no bowl colour is close to a kind's: every channel-wise distance is wide.
    const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    for (const bowl of Object.values(BOWL)) for (const fill of fills) {
      const [a, b] = [rgb(bowl), rgb(fill)]
      expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), `${bowl} beside ${fill}`).toBeGreaterThan(60)
    }
  })

  it('rolls a piece let go off the pizza back to its tub, at no cost', () => {
    const table = makeTable(['sock'], 6)
    pressTub(table, 0)
    carry(table, 1100, 200)
    dropHand(table)
    expect(table.flights[0].end).toEqual({ on: 'roll', tub: 0 })
    // It drops to the table under the finger, touches it once with a sound, and hops home.
    const flight = table.flights[0]
    const touch = flightAt({ ...flight, t: ROLL_AT })
    expect(touch.x).toBeCloseTo(flight.from.x, 5)
    expect(touch.y).toBeGreaterThan(flight.from.y + 30)
    // After the touch it leaves the table again before it is home.
    expect(flightAt({ ...flight, t: ROLL_AT + 0.2 }).y).toBeLessThan(touch.y + (flight.to.y - touch.y) * 0.3)
    const heard: TableEvent[] = []
    for (let i = 0; i < 80 && table.flights.length > 0; i++) {
      stepTable(table, 1 / 60)
      heard.push(...table.events)
      table.events.length = 0
    }
    expect(heard.filter((e) => e.type === 'bounce').length).toBe(1)
    expect(heard[heard.length - 1].type).toBe('home')
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
