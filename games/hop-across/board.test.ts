import { describe, expect, it } from 'vitest'
import { CLOTH_COL, COLS, LENGTH, LOOP, ROWS, SHOVED_STEPS, SPEED, faults, hopToward, moverOn, partAt, step, type Board, type BoardEvent, type Hop, type Lane, type Pawn } from './board'
import { LADDER } from './config'
import { LAYOUTS, layout } from './crossing'
import { below, makeRng } from './rng'
import { boardLanes } from './solver'

const STAY: Hop = { dc: 0, dr: 0 }
const RIGHT: Hop = { dc: 1, dr: 0 }
const LEFT: Hop = { dc: -1, dr: 0 }
const UP: Hop = { dc: 0, dr: -1 }
const DOWN: Hop = { dc: 0, dr: 1 }
const HOPS = [STAY, RIGHT, LEFT, UP, DOWN]

const pawn = (c: number, r: number, more: Partial<Pawn> = {}): Pawn => ({ c, r, flat: false, on: null, dry: { c: 0, r }, ...more })
const lane = (kind: Lane['kind'], ...movers: Lane['movers']): Lane => ({ kind, movers })
/** A small board: a bank, then the lanes given, with grass after them, and the family where the test puts it. */
function boardOf(lanes: Lane[], family: Pawn[]): Board {
  const all = [lane('bank'), ...lanes]
  while (all.length < COLS) all.push(lane('grass'))
  return { lanes: all, family }
}
/** Two roads, grass, two rivers that run opposite ways, grass, a road, the cloth and a road beyond it, with the family in a line on the bank. */
function toyBoard(): Board {
  return {
    lanes: [
      lane('bank'),
      lane('road', { kind: 'car', at: 0, dir: 1 }),
      lane('road', { kind: 'lorry', at: 3, dir: -1 }),
      lane('grass'),
      lane('river', { kind: 'log', at: 3, dir: 1 }, { kind: 'log', at: 7, dir: 1 }),
      lane('river', { kind: 'log', at: 2, dir: -1 }, { kind: 'log', at: 6, dir: -1 }),
      lane('grass'),
      lane('road', { kind: 'car', at: 4, dir: -1 }, { kind: 'car', at: 0, dir: -1 }),
      lane('cloth'),
      lane('road', { kind: 'car', at: 1, dir: 1 }),
    ],
    family: [2, 3, 4, 5].map((r) => pawn(0, r)),
  }
}
const of = <T extends BoardEvent['type']>(events: BoardEvent[], type: T) => events.filter((e): e is Extract<BoardEvent, { type: T }> => e.type === type)

describe('the toy board', () => {
  it('opens with the family in a line on the home bank and nothing amiss', () => {
    const board = toyBoard()
    expect(board.lanes).toHaveLength(COLS)
    expect(board.family.map((p) => [p.c, p.r])).toEqual([[0, 2], [0, 3], [0, 4], [0, 5]])
    expect(faults(board)).toEqual([])
  })

  it('keeps every mover of a lane off every other at every step of the loop', () => {
    let board = toyBoard()
    for (let n = 0; n < LOOP * 2; n++) {
      for (const l of board.lanes) {
        const taken = l.movers.flatMap((m) => Array.from({ length: LENGTH[m.kind] }, (_, part) => partAt(m, part)))
        expect(new Set(taken).size).toBe(taken.length)
      }
      board = step(board, STAY).board
    }
  })
})

describe('a tap asks for one hop', () => {
  const board = toyBoard()
  it('goes one square towards the tap, along the longer way', () => {
    expect(hopToward(board, 5, 2)).toEqual(RIGHT)
    expect(hopToward(board, 1, 5)).toEqual(DOWN)
    expect(hopToward(board, 0, 0)).toEqual(UP)
  })
  it('goes across the lanes when both ways are as long', () => {
    expect(hopToward(board, 2, 4)).toEqual(RIGHT)
  })
  it('is a hop on the spot for a tap on the rabbit', () => {
    expect(hopToward(board, 0, 2)).toEqual(STAY)
  })
  it('is a hop off the board for a tap past the rim from her own edge row, in any column, and that hop is a thunk on the spot', () => {
    for (const [r, past, off] of [[0, -1, UP], [ROWS - 1, ROWS, DOWN]] as const) {
      const edge = boardOf([lane('grass'), lane('grass'), lane('grass')], [pawn(1, r)])
      for (const c of [0, 1, 3]) expect(hopToward(edge, c, past)).toEqual(off)
      const result = step(edge, hopToward(edge, 3, past))
      expect(of(result.events, 'spot')[0]).toMatchObject({ who: 0, why: 'rim', at: { c: 1, r } })
      expect(result.board.family[0]).toMatchObject({ c: 1, r })
    }
    // From any other row, a tap past the rim is a tap on the edge row.
    expect(hopToward(board, 0, -1)).toEqual(UP)
    expect(hopToward(board, 0, ROWS)).toEqual(DOWN)
    expect(hopToward(board, 4, -1)).toEqual(RIGHT)
  })
})

describe('every mover takes one step of its own at each hop', () => {
  it('rolls a car one square, a lorry two and a log one, and nothing at all without a hop', () => {
    const board = boardOf([lane('road', { kind: 'car', at: 0, dir: 1 }), lane('road', { kind: 'lorry', at: 5, dir: -1 }), lane('river', { kind: 'log', at: 3, dir: 1 })], [pawn(0, 2)])
    const { board: after, events } = step(board, STAY)
    expect(after.lanes[1].movers[0].at).toBe(0 + SPEED.car)
    expect(after.lanes[2].movers[0].at).toBe(5 - SPEED.lorry)
    expect(after.lanes[3].movers[0].at).toBe(3 + SPEED.log)
    expect(of(events, 'roll')).toHaveLength(3)
    // The board handed in stands as it stood.
    expect(board.lanes[1].movers[0].at).toBe(0)
  })

  it('brings a mover round its loop of eight', () => {
    let board = boardOf([lane('road', { kind: 'car', at: 4, dir: 1 })], [pawn(0, 2)])
    const seen: number[] = []
    for (let n = 0; n < LOOP; n++) {
      board = step(board, STAY).board
      seen.push(board.lanes[1].movers[0].at)
    }
    expect(seen).toEqual([5, 6, 7, 0, 1, 2, 3, 4])
  })
})

describe('the hop', () => {
  it('lands on grass and remembers it as the last dry square', () => {
    const board = boardOf([lane('grass')], [pawn(0, 2)])
    const { board: after, events } = step(board, RIGHT)
    expect(after.family[0]).toMatchObject({ c: 1, r: 2, dry: { c: 1, r: 2 } })
    expect(of(events, 'hop')[0]).toMatchObject({ who: 0, from: { c: 0, r: 2 }, to: { c: 1, r: 2 }, landing: 'grass' })
  })

  it('is a hop on the spot at the rim and onto a seat, and the world still steps', () => {
    const road = lane('road', { kind: 'car', at: 5, dir: 1 })
    const rim = step(boardOf([road], [pawn(0, 2)]), LEFT)
    expect(of(rim.events, 'spot')[0]).toMatchObject({ who: 0, why: 'rim' })
    expect(rim.board.lanes[1].movers[0].at).toBe(6)
    const seat = step(boardOf([road], [pawn(0, 1)]), UP)
    // The seat of the first home bank is the burrow; the seat of a cloth is whoever sits there.
    expect(of(seat.events, 'spot')[0]).toMatchObject({ why: 'burrow' })
    const cloth = step({ lanes: [lane('cloth'), ...Array.from({ length: COLS - 1 }, () => lane('grass'))], family: [pawn(0, 1)] }, UP)
    expect(of(cloth.events, 'spot')[0]).toMatchObject({ why: 'seat' })
    expect(seat.board.family[0]).toMatchObject({ c: 0, r: 1 })
  })

  it('leapfrogs a small one: she takes its square and it takes hers', () => {
    for (const small of [1, 2, 3]) {
      const family = [pawn(0, 2), pawn(1, 4), pawn(1, 4), pawn(1, 4)]
      family[small] = pawn(0, 3)
      family.forEach((p, who) => { if (who !== 0 && who !== small) p.r = 2 + who })
      family.forEach((p, who) => { if (who !== 0 && who !== small) p.c = 3 })
      const { board: after, events } = step(boardOf([lane('grass'), lane('grass'), lane('grass')], family), DOWN)
      expect(after.family[0]).toMatchObject({ c: 0, r: 3 })
      expect(after.family[small]).toMatchObject({ c: 0, r: 2 })
      expect(of(events, 'hop').filter((e) => e.who === 0 || e.who === small)).toHaveLength(2)
      expect(faults(after)).toEqual([])
    }
  })

  it('leapfrogs onto a log a small one rides, and the small one takes the bank', () => {
    const board = boardOf([lane('river', { kind: 'log', at: 2, dir: 1 })], [pawn(0, 2), pawn(1, 2, { on: { index: 0, part: 0 } })])
    const { board: after } = step(board, RIGHT)
    expect(after.family[0]).toMatchObject({ c: 1, r: 3, on: { index: 0, part: 0 } })
    expect(after.family[1]).toMatchObject({ c: 0, r: 2, on: null, dry: { c: 0, r: 2 } })
  })
})

describe('the car', () => {
  it('rolls out from under a rabbit on its roof, and she sits in the gap it left', () => {
    const board = boardOf([lane('road', { kind: 'car', at: 2, dir: 1 })], [pawn(0, 2)])
    const { board: after, events } = step(board, RIGHT)
    expect(of(events, 'hop')[0]).toMatchObject({ landing: 'roof' })
    expect(of(events, 'slideOff')).toHaveLength(1)
    expect(after.family[0]).toMatchObject({ c: 1, r: 2, on: null, flat: false })
    expect(after.lanes[1].movers[0].at).toBe(3)
  })

  it('flattens whoever stands where it steps next, and she peels up once it has rolled off', () => {
    let board = boardOf([lane('road', { kind: 'car', at: 1, dir: 1 })], [pawn(0, 2)])
    let result = step(board, RIGHT)
    expect(of(result.events, 'flatten')[0]).toMatchObject({ who: 0, at: { c: 1, r: 2 }, kind: 'car' })
    expect(result.board.family[0]).toMatchObject({ c: 1, r: 2, flat: true })
    // Flat, she cannot hop; the tap still steps the world, the car rolls off and she peels up where she lay.
    result = step(result.board, RIGHT)
    expect(of(result.events, 'stuck')).toHaveLength(1)
    expect(of(result.events, 'peel')[0]).toMatchObject({ who: 0, at: { c: 1, r: 2 } })
    expect(result.board.family[0]).toMatchObject({ c: 1, r: 2, flat: false })
    board = step(result.board, RIGHT).board
    expect(board.family[0]).toMatchObject({ c: 2, r: 2 })
  })

  it('is flattened again by the car behind when two come in a row', () => {
    const board = boardOf([lane('road', { kind: 'car', at: 1, dir: 1 }, { kind: 'car', at: 0, dir: 1 })], [pawn(0, 2)])
    let result = step(board, RIGHT)
    result = step(result.board, STAY)
    expect(of(result.events, 'peel')).toHaveLength(0)
    expect(result.board.family[0].flat).toBe(true)
    result = step(result.board, STAY)
    expect(of(result.events, 'peel')).toHaveLength(1)
  })

  it('leapfrogs a small one that lies flat under it: she lands on the roof, and it shoots out to her square and is up again', () => {
    const board = boardOf([lane('road', { kind: 'car', at: 2, dir: 1 })], [pawn(0, 2), pawn(1, 2, { flat: true })])
    const { board: after, events } = step(board, RIGHT)
    expect(of(events, 'hop')[0]).toMatchObject({ who: 0, landing: 'roof', leap: true })
    expect(of(events, 'hop')[1]).toMatchObject({ who: 1, to: { c: 0, r: 2 }, leap: true })
    expect(of(events, 'peel')).toEqual([{ type: 'peel', who: 1, at: { c: 0, r: 2 } }])
    // The car has rolled out from under her, and she sits where the small one lay.
    expect(after.family.map((p) => [p.c, p.r, p.flat])).toEqual([[1, 2, false], [0, 2, false]])
    expect(faults(after)).toEqual([])
  })

  it('leapfrogs a small one the train has pressed flat, which is up again on the square she left', () => {
    const board = boardOf([lane('rails')], [pawn(0, 2), pawn(1, 2, { flat: true })])
    const { board: after, events } = step(board, RIGHT)
    expect(of(events, 'spot')).toHaveLength(0)
    expect(after.family.map((p) => [p.c, p.r, p.flat])).toEqual([[1, 2, false], [0, 2, false]])
    expect(of(events, 'peel')).toHaveLength(1)
  })
})

describe('the lorry', () => {
  it('flattens what stands in either of the two squares it takes', () => {
    for (const r of [3, 2]) {
      const board = boardOf([lane('road', { kind: 'lorry', at: 5, dir: -1 })], [pawn(1, r)])
      // The lorry's front goes from row 5 to row 3; with a second step it reaches row 1.
      let result = step(board, STAY)
      if (r === 2) result = step(result.board, STAY)
      expect(of(result.events, 'flatten')[0]).toMatchObject({ who: 0, kind: 'lorry' })
    }
  })

  it('holds one on its bed: a landing on the cab of a lorry whose bed is taken slides back off to where it came from', () => {
    // The cab is on row 1 and the bed on row 0, where a small one rides. She is sent at the cab from the bank.
    const road = () => lane('road', { kind: 'lorry', at: 1, dir: 1 })
    const rider = pawn(1, 0, { on: { index: 0, part: 1 } })
    const hers = step(boardOf([road()], [pawn(0, 1), rider]), RIGHT)
    expect(of(hers.events, 'hop').filter((event) => event.who === 0)).toHaveLength(0)
    expect(of(hers.events, 'spot')[0]).toEqual({ type: 'spot', who: 0, at: { c: 0, r: 1 }, why: 'cab', off: { c: 1, r: 1, index: 0 } })
    // It is a hop on the spot: she is where she was, the world took its step, and the rider rode on alone.
    expect(hers.board.family[0]).toMatchObject({ c: 0, r: 1, on: null })
    expect(hers.board.family[1]).toMatchObject({ c: 1, r: 2, on: { index: 0, part: 1 } })
    expect(faults(hers.board)).toEqual([])
    // A small one sent at the cab while she rides the bed slides back off it too.
    const its = step(boardOf([road()], [pawn(1, 0, { on: { index: 0, part: 1 } }), pawn(0, 1)]), STAY)
    expect(of(its.events, 'spot').find((event) => event.who === 1)).toMatchObject({ why: 'cab', off: { c: 1, r: 1, index: 0 } })
    expect(its.board.family[1]).toMatchObject({ c: 0, r: 1, on: null })
    // One that lies flat under the bed does not take it: she slides back onto the bed above it.
    const over = step(boardOf([road()], [pawn(0, 1), pawn(1, 0, { flat: true })]), RIGHT)
    expect(of(over.events, 'hop')[0]).toMatchObject({ who: 0, cab: true, to: { c: 1, r: 0 } })
  })

  it('carries a rider two squares a hop, and the arch knocks her off onto the last square', () => {
    const board = boardOf([lane('road', { kind: 'lorry', at: 1, dir: 1 })], [pawn(0, 0, { dry: { c: 0, r: 1 } })])
    // The bed is on row 0.
    let result = step({ ...board, family: [pawn(0, 1), ...board.family.slice(1)] }, UP)
    result = step(boardOf([lane('road', { kind: 'lorry', at: 1, dir: 1 })], [pawn(0, 1)]), RIGHT)
    // She landed on the cab and slid back onto the bed, then rode two squares.
    expect(of(result.events, 'hop')[0]).toMatchObject({ landing: 'bed', to: { c: 1, r: 0 }, cab: true })
    // Straight onto the bed, nothing slides.
    const straight = step(boardOf([lane('road', { kind: 'lorry', at: 1, dir: 1 })], [pawn(0, 0)]), RIGHT)
    expect(of(straight.events, 'hop')[0]).toMatchObject({ landing: 'bed', to: { c: 1, r: 0 } })
    expect(of(straight.events, 'hop')[0]).not.toHaveProperty('cab')
    expect(result.board.family[0]).toMatchObject({ c: 1, r: 2, on: { index: 0, part: 1 } })
    result = step(result.board, STAY)
    expect(result.board.family[0]).toMatchObject({ r: 4 })
    result = step(result.board, STAY)
    expect(of(result.events, 'knock')[0]).toMatchObject({ who: 0, to: { c: 1, r: 5 } })
    expect(result.board.family[0]).toMatchObject({ c: 1, r: 5, on: null, flat: false })
  })
})

describe('the river', () => {
  it('carries a rider on a log with the current', () => {
    const board = boardOf([lane('river', { kind: 'log', at: 2, dir: 1 })], [pawn(0, 2)])
    const { board: after, events } = step(board, RIGHT)
    expect(of(events, 'hop')[0]).toMatchObject({ landing: 'log' })
    expect(of(events, 'carry')[0]).toMatchObject({ who: 0, to: { c: 1, r: 3 }, kind: 'log' })
    expect(after.family[0]).toMatchObject({ c: 1, r: 3, on: { index: 0, part: 0 }, dry: { c: 0, r: 2 } })
  })

  it('spits a rabbit that hops into open water back onto the square she came from', () => {
    const board = boardOf([lane('river', { kind: 'log', at: 5, dir: 1 })], [pawn(0, 2)])
    const { board: after, events } = step(board, RIGHT)
    expect(of(events, 'spit')[0]).toMatchObject({ who: 0, at: { c: 1, r: 2 }, to: { c: 0, r: 2 }, by: 'water' })
    expect(after.family[0]).toMatchObject({ c: 0, r: 2, on: null })
  })

  it('spits a rider that goes off the edge on a log back to the last dry square, or the free one nearest it', () => {
    const river = lane('river', { kind: 'log', at: 5, dir: 1 })
    const riding = pawn(1, 5, { on: { index: 0, part: 0 }, dry: { c: 0, r: 3 } })
    const alone = step(boardOf([river], [riding]), STAY)
    expect(of(alone.events, 'spit')[0]).toMatchObject({ who: 0, to: { c: 0, r: 3 }, by: 'edge' })
    // A small one hops towards her onto that square first, so she is put down on the free square nearest it.
    const crowded = step(boardOf([river], [riding, pawn(0, 2)]), STAY)
    expect(crowded.board.family[1]).toMatchObject({ c: 0, r: 3 })
    expect(crowded.board.family[0]).toMatchObject({ c: 0, r: 2 })
    expect(faults(crowded.board)).toEqual([])
  })
})

describe('the small ones', () => {
  it('hop into the square the one ahead has just left, one step late', () => {
    let board = boardOf([lane('grass'), lane('grass')], [pawn(0, 2), pawn(0, 3), pawn(0, 4), pawn(0, 5)])
    board = step(board, RIGHT).board
    expect(board.family.map((p) => [p.c, p.r])).toEqual([[1, 2], [0, 2], [0, 3], [0, 4]])
    board = step(board, RIGHT).board
    expect(board.family.map((p) => [p.c, p.r])).toEqual([[2, 2], [1, 2], [0, 2], [0, 3]])
  })

  it('hop on the spot when the one ahead did not leave its square', () => {
    const board = boardOf([lane('grass')], [pawn(0, 2), pawn(0, 3), pawn(0, 4), pawn(0, 5)])
    const { board: after, events } = step(board, STAY)
    expect(after.family.map((p) => p.r)).toEqual([2, 3, 4, 5])
    expect(of(events, 'spot').map((e) => e.why)).toEqual(['self', 'wait', 'wait', 'wait'])
  })

  it('follow her onto a log', () => {
    let board = boardOf([lane('river', { kind: 'log', at: 2, dir: 1 }), lane('grass')], [pawn(0, 2), pawn(0, 3)])
    board = step(board, RIGHT).board
    // She was carried to row 3; the small one took her square on the bank.
    expect(board.family.map((p) => [p.c, p.r])).toEqual([[1, 3], [0, 2]])
    board = step(board, RIGHT).board
    // She is across. The log had carried her out of line, so it hopped towards her onto the log's other square, and was carried one square.
    expect(board.family[0]).toMatchObject({ c: 2, r: 3 })
    expect(board.family[1]).toMatchObject({ c: 1, r: 3, on: { index: 0, part: 1 } })
    expect(faults(board)).toEqual([])
  })

  it('never jump into open water when they have fallen behind: they dither on the bank', () => {
    const board = boardOf([lane('river', { kind: 'log', at: 5, dir: 1 }), lane('grass')], [pawn(2, 2, { dry: { c: 2, r: 2 } }), pawn(0, 2)])
    const { board: after, events } = step(board, STAY)
    expect(of(events, 'spot').map((e) => e.why)).toEqual(['self', 'dither'])
    expect(after.family[1]).toMatchObject({ c: 0, r: 2 })
  })

  it('hop one square towards her when they have fallen behind, the longer way first', () => {
    const board = boardOf([lane('grass'), lane('grass'), lane('grass')], [pawn(3, 1, { dry: { c: 3, r: 1 } }), pawn(0, 2)])
    const { board: after } = step(board, STAY)
    expect(after.family[1]).toMatchObject({ c: 1, r: 2 })
  })

  it('are flattened on the way by a car they did not look for', () => {
    const board = boardOf([lane('road', { kind: 'car', at: 1, dir: 1 }), lane('grass')], [pawn(2, 2, { dry: { c: 2, r: 2 } }), pawn(0, 2)])
    const { events } = step(board, STAY)
    expect(of(events, 'flatten')[0]).toMatchObject({ who: 1, at: { c: 1, r: 2 } })
  })
})

describe('the turtle', () => {
  const turtle = (at: number, count: number) => ({ kind: 'turtle' as const, at, dir: 1 as const, count })

  it('stays where it is and counts to three: up, awash, under, and up again', () => {
    let board = boardOf([lane('river', turtle(2, 0))], [pawn(0, 4)])
    const seen: number[] = []
    for (let n = 0; n < 4; n++) {
      const result = step(board, STAY)
      board = result.board
      seen.push(of(result.events, 'turtle')[0].count)
      expect(board.lanes[1].movers[0].at).toBe(2)
    }
    expect(seen).toEqual([1, 2, 0, 1])
  })

  it('carries her nowhere, and goes down under her on its third step, when the fish brings her up', () => {
    let result = step(boardOf([lane('river', turtle(2, 2))], [pawn(0, 2)]), STAY)
    // It has just come up: head high.
    result = step(result.board, RIGHT)
    expect(of(result.events, 'hop')[0]).toMatchObject({ landing: 'shell' })
    expect(result.board.family[0]).toMatchObject({ c: 1, r: 2, on: { index: 0, part: 0 } })
    result = step(result.board, STAY)
    expect(of(result.events, 'spit')[0]).toMatchObject({ who: 0, by: 'turtle', to: { c: 0, r: 2 } })
    expect(result.board.family[0]).toMatchObject({ c: 0, r: 2, on: null })
  })

  it('is open water while it is under', () => {
    const result = step(boardOf([lane('river', turtle(2, 2))], [pawn(0, 2)]), RIGHT)
    expect(of(result.events, 'spit')[0]).toMatchObject({ by: 'water' })
  })

  it('is ridden over by a log, which scoops up whoever stands on it, and keeps its count underneath', () => {
    const river = lane('river', { kind: 'log', at: 1, dir: 1 }, turtle(2, 0))
    const result = step(boardOf([river], [pawn(1, 2, { on: { index: 1, part: 0 } })]), STAY)
    expect(of(result.events, 'over')[0]).toMatchObject({ col: 1, index: 0, turtle: 1 })
    expect(of(result.events, 'turtle')[0]).toMatchObject({ count: 1, under: true })
    expect(of(result.events, 'scoop')[0]).toMatchObject({ who: 0, index: 0 })
    expect(result.board.family[0]).toMatchObject({ c: 1, r: 2, on: { index: 0, part: 0 } })
    // The log carries her on.
    const on = step(result.board, STAY)
    expect(on.board.family[0]).toMatchObject({ r: 3 })
    expect(faults(on.board)).toEqual([])
  })
})

describe('a lorry and a car in one lane', () => {
  it('shunts the car it catches up one square on, both ways along the lane', () => {
    for (const dir of [1, -1] as const) {
      const road = lane('road', { kind: 'lorry', at: 3, dir }, { kind: 'car', at: 3 + dir * 2, dir })
      // One step brings the lorry up behind the car; the next shunts it.
      let result = step(boardOf([road], [pawn(0, 0)]), STAY)
      expect(of(result.events, 'shunt')).toEqual([])
      expect(result.board.lanes[1].movers.map((m) => m.at)).toEqual([3 + dir * 2, 3 + dir * 3])
      // The car is pushed two squares in that step, and whatever it is pushed over is flat.
      result = step({ lanes: result.board.lanes, family: [pawn(1, (3 + dir * 5 + LOOP) % LOOP)] }, STAY)
      expect(of(result.events, 'shunt')).toEqual([{ type: 'shunt', col: 1, index: 1, by: 0 }])
      expect(result.board.lanes[1].movers.map((m) => m.at)).toEqual([(3 + dir * 4 + LOOP) % LOOP, (3 + dir * 5 + LOOP) % LOOP])
      expect(of(result.events, 'flatten')[0]).toMatchObject({ kind: 'car' })
    }
  })
})

describe('the train and its bell', () => {
  const rails = (awake = false): Lane => ({ kind: 'rails', movers: [], train: { arch: 'far', awake }, bell: { dc: -1, r: 2 } })

  it('sleeps and snores until its bell is stepped on, and bare rails only ring', () => {
    const board = boardOf([lane('grass'), rails()], [pawn(1, 3)])
    const quiet = step(board, RIGHT)
    expect(of(quiet.events, 'hop')[0]).toMatchObject({ landing: 'rails' })
    expect(of(quiet.events, 'snore')).toHaveLength(1)
    expect(of(quiet.events, 'bell')).toHaveLength(0)
    expect(quiet.board.family[0].flat).toBe(false)
  })

  it('wakes at the bell, takes the whole lane on the step after it, and goes to sleep in the other arch', () => {
    let result = step(boardOf([lane('grass'), rails()], [pawn(1, 3)]), UP)
    expect(of(result.events, 'bell')[0]).toMatchObject({ who: 0, at: { c: 1, r: 2 }, col: 2, nth: 1 })
    expect(of(result.events, 'wake')[0]).toMatchObject({ col: 2, arch: 'far' })
    expect(result.board.lanes[2].train).toEqual({ arch: 'far', awake: true })
    result = step(result.board, RIGHT)
    expect(of(result.events, 'train')[0]).toMatchObject({ col: 2, from: 'far' })
    expect(of(result.events, 'flatten')[0]).toMatchObject({ who: 0, kind: 'train', at: { c: 2, r: 2 } })
    expect(result.board.lanes[2].train).toEqual({ arch: 'near', awake: false })
    // The lane is clear again at the next step, and she peels up.
    result = step(result.board, STAY)
    expect(of(result.events, 'peel')).toHaveLength(1)
    expect(of(result.events, 'snore')).toHaveLength(1)
  })

  it('runs back and forth while small ones keep landing on the bell, each ring a note higher down the line', () => {
    let board = boardOf([lane('grass'), rails()], [pawn(1, 4), pawn(1, 5)])
    board = step(board, UP).board
    let result = step(board, UP)
    // She is on the plate, the small one behind her.
    expect(of(result.events, 'bell').map((e) => [e.who, e.nth])).toEqual([[0, 1]])
    result = step(result.board, UP)
    expect(of(result.events, 'train')).toHaveLength(1)
    expect(of(result.events, 'bell').map((e) => [e.who, e.nth])).toEqual([[1, 2]])
    expect(of(result.events, 'wake')[0]).toMatchObject({ arch: 'near' })
    result = step(result.board, UP)
    expect(of(result.events, 'train')[0]).toMatchObject({ from: 'near' })
  })

  it('shoves every car and lorry in sight out of a road with rails, and they come round again', () => {
    const road: Lane = { kind: 'railroad', movers: [{ kind: 'car', at: 1, dir: 1 }, { kind: 'car', at: 4, dir: 1 }], train: { arch: 'near', awake: true }, bell: { dc: -1, r: 0 } }
    let result = step(boardOf([lane('grass'), road], [pawn(0, 3)]), STAY)
    expect(of(result.events, 'train')[0].shoved).toEqual([0, 1])
    expect(result.board.lanes[2].movers.map((m) => m.at).sort()).toEqual([6, 7])
    let seen = false
    for (let n = 0; n < 3; n++) {
      result = step(result.board, STAY)
      if (result.board.lanes[2].movers.some((m) => m.at < ROWS)) seen = true
    }
    expect(seen).toBe(true)
    const lorry: Lane = { kind: 'railroad', movers: [{ kind: 'lorry', at: 2, dir: -1 }], train: { arch: 'far', awake: true }, bell: { dc: -1, r: 0 } }
    result = step(boardOf([lane('grass'), lorry], [pawn(2, 5, { on: null })]), STAY)
    expect(of(result.events, 'train')[0].shoved).toEqual([0])
    expect([partAt(result.board.lanes[2].movers[0], 0), partAt(result.board.lanes[2].movers[0], 1)].every((r) => r >= ROWS)).toBe(true)
    expect(result.board.family[0].flat).toBe(true)
  })

  it('keeps a shoved lorry in the tunnel for some steps and brings it out of the other arch, whichever way the train ran', () => {
    for (const arch of ['far', 'near'] as const) {
      for (const dir of [1, -1] as const) {
        const label = `train from the ${arch} arch, lorry going ${dir}`
        // The train runs away from the arch it sleeps in, into the other one, and the lorry goes in there ahead of it.
        const way = arch === 'far' ? 1 : -1
        const road: Lane = { kind: 'railroad', movers: [{ kind: 'lorry', at: 3, dir }], train: { arch, awake: true }, bell: { dc: -1, r: 0 } }
        let result = step(boardOf([lane('grass'), road], [pawn(0, 3)]), STAY)
        expect(of(result.events, 'train')[0], label).toMatchObject({ from: arch, shoved: [0] })
        const squares = () => { const lorry = result.board.lanes[2].movers[0]; return [partAt(lorry, 0), partAt(lorry, 1)] }
        expect(squares().every((r) => r >= ROWS), label).toBe(true)
        expect(result.board.lanes[2].movers[0], label).toMatchObject({ dir: way, count: SHOVED_STEPS })
        // Some steps out of sight, standing still and silent.
        for (let n = 0; n < SHOVED_STEPS; n++) {
          result = step(result.board, STAY)
          expect(squares().every((r) => r >= ROWS), `${label}, step ${n + 1}`).toBe(true)
          expect(of(result.events, 'roll'), `${label}, step ${n + 1}`).toEqual([])
        }
        expect(result.board.lanes[2].movers[0].count, label).toBeUndefined()
        // Then it trundles out at the end the train came from, which is the other arch from the one it went into.
        result = step(result.board, STAY)
        expect(of(result.events, 'roll'), label).toHaveLength(1)
        expect(squares().sort(), label).toEqual(way === 1 ? [0, 1] : [ROWS - 2, ROWS - 1])
        expect(partAt(result.board.lanes[2].movers[0], 0), label).toBe(way === 1 ? 1 : ROWS - 2)
        expect(faults(result.board), label).toEqual([])
      }
    }
    expect(SHOVED_STEPS).toBeGreaterThanOrEqual(2)
  })

  it('takes a rider with the lane', () => {
    const road: Lane = { kind: 'railroad', movers: [{ kind: 'lorry', at: 3, dir: 1 }], train: { arch: 'far', awake: true }, bell: { dc: -1, r: 0 } }
    const result = step(boardOf([lane('grass'), road], [pawn(2, 2, { on: { index: 0, part: 1 } })]), STAY)
    expect(result.board.family[0]).toMatchObject({ c: 2, r: 2, on: null, flat: true })
    expect(faults(result.board)).toEqual([])
  })
})

describe('the fish keeps beside her', () => {
  it('noses the log she rides while she hops on the spot, and sends up a bubble while she hops on the spot beside its river', () => {
    const river = lane('river', { kind: 'log', at: 2, dir: 1 })
    const riding = step(boardOf([river], [pawn(1, 2, { on: { index: 0, part: 0 } })]), STAY)
    expect(of(riding.events, 'nose')).toEqual([{ type: 'nose', col: 1, index: 0 }])
    const beside = step(boardOf([river], [pawn(0, 2)]), STAY)
    expect(of(beside.events, 'blip')).toEqual([{ type: 'blip', col: 1 }])
    const away = step(boardOf([lane('grass'), river], [pawn(0, 2)]), STAY)
    expect(of(away.events, 'blip')).toHaveLength(0)
  })
})

describe('the line on the cloth', () => {
  const cloth = (family: Pawn[]): Board => ({ lanes: [lane('bank'), ...Array.from({ length: 7 }, () => lane('grass')), lane('cloth'), lane('grass')], family })

  it('makes room: while she is on the cloth and one of them is not, a small one that would hop on the spot hops to a free square of the cloth next to it', () => {
    // She came on at the middle row and went down to the rim; the last one is still on the grass.
    let board = cloth([pawn(8, 5), pawn(8, 4), pawn(8, 3), pawn(7, 3)])
    const result = step(board, STAY)
    board = result.board
    expect(board.family.map((p) => [p.c, p.r])).toEqual([[8, 5], [8, 4], [8, 2], [8, 3]])
    expect(faults(board)).toEqual([])
    // All four are on it now, and nobody moves about any more.
    const still = step(board, STAY)
    expect(still.board.family.map((p) => [p.c, p.r])).toEqual([[8, 5], [8, 4], [8, 2], [8, 3]])
  })

  it('gets all four onto the cloth from any row she comes on at, by hops along it and then on the spot', () => {
    for (let row = 1; row < ROWS; row++) {
      let board = cloth([pawn(7, row), pawn(6, row), pawn(5, row), pawn(4, row)])
      board = step(board, RIGHT).board
      // Along the cloth towards the middle, as far as it goes, and then on the spot.
      const along = row >= 3 ? UP : DOWN
      for (let n = 0; n < 4 && !board.family.every((p) => p.c === CLOTH_COL); n++) {
        const to = board.family[0].r + along.dr
        if (to < 1 || to >= ROWS) break
        board = step(board, along).board
      }
      for (let n = 0; n < 6 && !board.family.every((p) => p.c === CLOTH_COL); n++) board = step(board, STAY).board
      expect(board.family.every((p) => p.c === CLOTH_COL), `row ${row}`).toBe(true)
      expect(faults(board)).toEqual([])
    }
  })
})

describe('whatever is tapped, the board is left in a state it can stand in', () => {
  const check = (name: string, board: Board, events: BoardEvent[]) => {
    const found = faults(board)
    if (found.length) throw new Error(`${name}: ${found.join('; ')}`)
    for (const p of board.family) {
      expect(p.r).toBeLessThan(ROWS)
      if (p.on) expect(moverOn(board.lanes[p.c], p.r)).toEqual(p.on)
    }
    // Every pawn is answered at every hop: it hopped, hopped on the spot, lay stuck, or was spat.
    for (let who = 0; who < board.family.length; who++) {
      expect(events.some((e) => 'who' in e && e.who === who && (e.type === 'hop' || e.type === 'spot' || e.type === 'stuck' || e.type === 'spit')), name).toBe(true)
    }
    // No two movers of a lane on one square, but for a log over a turtle.
    for (const l of board.lanes) {
      for (const turtles of [true, false]) {
        const taken = l.movers.filter((m) => (m.kind === 'turtle') === turtles).flatMap((m) => Array.from({ length: LENGTH[m.kind] }, (_, part) => partAt(m, part)))
        expect(new Set(taken).size, name).toBe(taken.length)
      }
    }
  }

  it('holds over many seeded runs of random hops on the toy board', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = makeRng(seed)
      let board = toyBoard()
      for (let n = 0; n < 300; n++) {
        const result = step(board, HOPS[below(rng, HOPS.length)])
        board = result.board
        check(`seed ${seed}, hop ${n}`, board, result.events)
      }
    }
  })

  it('holds on every layout of every position, with the whole family, and meets every kind of event', () => {
    const met = new Set<string>()
    for (const position of LADDER) {
      for (let which = 0; which < LAYOUTS; which++) {
        const rng = makeRng(which * 31 + position.length)
        let board: Board = { lanes: boardLanes(layout(position, which)), family: [2, 3, 4, 5].map((r) => pawn(0, r)) }
        for (let n = 0; n < 120; n++) {
          // Mostly towards the far side, and back again from the lane beyond the cloth.
          const hop = board.family[0].c === COLS - 1 ? LEFT : below(rng, 3) === 0 ? HOPS[below(rng, HOPS.length)] : RIGHT
          const result = step(board, hop)
          board = result.board
          for (const event of result.events) met.add(event.type)
          check(`${position} ${which}, hop ${n}`, board, result.events)
        }
      }
    }
    expect([...met].sort()).toEqual(['bell', 'blip', 'carry', 'flatten', 'hop', 'knock', 'nose', 'over', 'peel', 'roll', 'scoop', 'shunt', 'slideOff', 'snore', 'spit', 'spot', 'stuck', 'train', 'turtle', 'wake'])
  }, 60000)

  it('never boxes the rabbit in: a random walk always reaches the lane beyond the cloth', () => {
    let reached = 0
    for (let seed = 1; seed <= 40; seed++) {
      const rng = makeRng(seed)
      let board = toyBoard()
      for (let n = 0; n < 400; n++) {
        // Mostly towards the far side.
        board = step(board, below(rng, 3) === 0 ? HOPS[below(rng, HOPS.length)] : RIGHT).board
        if (board.family[0].c === COLS - 1) { reached++; break }
      }
    }
    expect(reached).toBe(40)
  })
})
