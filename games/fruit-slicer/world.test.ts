import { describe, expect, it } from 'vitest'
import { RAIL, WHOLE, giveOf, shareLength } from './measure'
import { draw } from './stream'
import { HOP_PARTS, LANES, SHELF, clearTin, cut, eat, eaten, emptyWorld, giveToTin, marksOf, rowOf, setRowOnBoard, inTin, isWhole, landFruit, onLane, onShelf, pieceAt, pieceOf, remove, roll, setOnBoard, setOnShelf, tinTotal, type World } from './world'

const withFruit = (fruit: 'long' | 'middle' | 'short' = 'long') => landFruit(emptyWorld(), fruit)
const total = (world: World) => world.pieces.reduce((sum, piece) => sum + piece.length, 0)

/** No two pieces of a lane overlap, and every one lies whole on the board. */
function expectBoardSound(world: World) {
  for (let lane = 0; lane < LANES; lane++) {
    let end = 0
    for (const piece of onLane(world, lane)) {
      const x = piece.place.on === 'board' ? piece.place.x : -1
      expect(x).toBeGreaterThanOrEqual(end)
      end = x + piece.length
    }
    expect(end).toBeLessThanOrEqual(RAIL)
  }
  expect(onShelf(world).map((piece) => (piece.place.on === 'shelf' ? piece.place.slot : -1))).toEqual(onShelf(world).map((_, slot) => slot))
  expect(onShelf(world).length).toBeLessThanOrEqual(SHELF)
}

describe('a fresh fruit', () => {
  it('lands whole at the left end of the first empty lane', () => {
    const { world, id } = withFruit('middle')
    expect(pieceOf(world, id)).toMatchObject({ fruit: 'middle', length: WHOLE.middle, place: { on: 'board', lane: 0, x: 0 }, blind: true, ruled: 0, mark: 0 })
    expect(isWhole(pieceOf(world, id)!)).toBe(true)
    const second = landFruit(world, 'short')
    expect(pieceOf(second.world, second.id)!.place).toEqual({ on: 'board', lane: 1, x: 0 })
  })

  it('never refuses: with both lanes in use it shoves the far lane onto the shelf', () => {
    let world = withFruit('long').world
    const far = landFruit(world, 'short')
    world = cut(far.world, far.id, 720).world
    const third = landFruit(world, 'middle')
    expect(third.swept).toHaveLength(2)
    expect(onShelf(third.world).map((piece) => piece.id)).toEqual(third.swept)
    expect(pieceOf(third.world, third.id)!.place).toEqual({ on: 'board', lane: 1, x: 0 })
    expectBoardSound(third.world)
  })
})

describe('a cut', () => {
  it('makes two pieces that add up to the fruit: the left one stays, and the right one hops a little way off it', () => {
    const { world, id } = withFruit()
    const result = cut(world, id, 1800)
    expect(result.kind).toBe('cut')
    if (result.kind !== 'cut') return
    expect(pieceOf(result.world, result.left)).toMatchObject({ length: 1800, place: { on: 'board', lane: 0, x: 0 } })
    expect(pieceOf(result.world, result.right)).toMatchObject({ length: 600, place: { on: 'board', lane: 0, x: 1800 + giveOf('long') / HOP_PARTS } })
    expect(total(result.world)).toBe(WHOLE.long)
    expectBoardSound(result.world)
  })

  it('is always at a whole point, and keeps the total however often it is repeated', () => {
    let { world } = withFruit('short')
    let state = 11
    for (let i = 0; i < 200; i++) {
      const pieces = onLane(world, 0)
      const a = draw(state), b = draw(a.state)
      state = b.state
      const piece = pieces[Math.floor(a.value * pieces.length)]
      world = cut(world, piece.id, b.value * piece.length).world
      for (const made of world.pieces) {
        expect(Number.isInteger(made.length)).toBe(true)
        expect(made.length).toBeGreaterThanOrEqual(giveOf('short'))
      }
    }
    expect(total(world)).toBe(WHOLE.short)
    expect(world.pieces.length).toBeLessThanOrEqual(24)
    expectBoardSound(world)
  })

  it('too near an end takes a curl of peel and changes nothing', () => {
    const { world, id } = withFruit()
    expect(cut(world, id, giveOf('long') - 1)).toEqual({ kind: 'curl', world, end: 'left' })
    expect(cut(world, id, WHOLE.long - giveOf('long') + 1)).toEqual({ kind: 'curl', world, end: 'right' })
    expect(cut(world, id, giveOf('long')).kind).toBe('cut')
    expect(cut(world, 999, 100)).toEqual({ kind: 'none', world })
  })

  it('finds the piece under a point of a lane', () => {
    const { world, id } = withFruit()
    const result = cut(world, id, 1000)
    expect(pieceAt(result.world, 0, 500)!.id).toBe(id)
    expect(pieceAt(result.world, 0, 1500)!.length).toBe(1400)
    expect(pieceAt(result.world, 0, 2500)).toBeUndefined()
    expect(pieceAt(result.world, 1, 500)).toBeUndefined()
  })

  it('in the tin leaves the left part there and puts the trimming on the shelf', () => {
    const { world, id } = withFruit()
    const inside = giveToTin(world, id, 0)
    const result = cut(inside, id, 1800)
    if (result.kind !== 'cut') throw new Error('no cut')
    expect(pieceOf(result.world, result.left)!.place).toEqual({ on: 'tin', part: 0, turn: 0 })
    expect(pieceOf(result.world, result.right)!.place).toEqual({ on: 'shelf', slot: 0 })
    expect(pieceOf(result.world, result.right)!.blind).toBe(false)
  })
})

describe('the hop of a cut', () => {
  it('leaves the two parts apart, so a cut is told from two pieces set end to end', () => {
    const { world, id } = withFruit()
    const result = cut(world, id, 1200)
    if (result.kind !== 'cut') throw new Error('no cut')
    expect(rowOf(result.world, result.left, 'right')).toEqual([result.left])
    expect(rowOf(result.world, result.right, 'left')).toEqual([result.right])
    expectBoardSound(result.world)
  })

  it('is as wide as there is room for, and nothing where a neighbour lies against the piece', () => {
    let world = withFruit('short').world
    const fruit = world.pieces[0]
    // A second fruit set hard against the end of the first, then the first is cut: its right part has nowhere to hop.
    const other = landFruit(world, 'short')
    world = setOnBoard(other.world, other.id, 0, fruit.length).world
    const result = cut(world, fruit.id, 700)
    if (result.kind !== 'cut') throw new Error('no cut')
    expect(pieceOf(result.world, result.right)!.place).toEqual({ on: 'board', lane: 0, x: 700 })
    expectBoardSound(result.world)
  })
})

describe('a row', () => {
  /** Three pieces of a long fruit set end to end on the far lane, in order. */
  function three() {
    let world = withFruit().world
    const first = cut(world, world.pieces[0].id, 600)
    if (first.kind !== 'cut') throw new Error('no cut')
    const second = cut(first.world, first.right, 600)
    if (second.kind !== 'cut') throw new Error('no cut')
    const ids = [first.left, first.right, second.right]
    world = setOnBoard(second.world, ids[0], 1, 0).world
    world = setOnBoard(world, ids[1], 1, 600).world
    world = setOnBoard(world, ids[2], 1, 1210).world
    return { world, ids }
  }

  it('is the pieces that lie exactly end to end, taken from the side the piece is held by', () => {
    const { world, ids } = three()
    expect(rowOf(world, ids[0], 'right')).toEqual(ids)
    expect(rowOf(world, ids[0], 'left')).toEqual([ids[0]])
    expect(rowOf(world, ids[1], 'left')).toEqual([ids[0], ids[1]])
    expect(rowOf(world, ids[1], 'right')).toEqual([ids[1], ids[2]])
    expect(rowOf(world, ids[2], 'right')).toEqual([ids[2]])
    expect(rowOf(world, 999, 'left')).toEqual([])
    expect(rowOf(setOnShelf(world, ids[1]).world, ids[1], 'left')).toEqual([ids[1]])
  })

  it('travels as one: set down again, its pieces still lie end to end in the same order and nothing overlaps', () => {
    const { world, ids } = three()
    const moved = setRowOnBoard(world, ids, 0, 400).world
    const lane = onLane(moved, 0)
    expect(lane.map((piece) => piece.id)).toEqual(ids)
    expect(lane.map((piece) => (piece.place.on === 'board' ? piece.place.x : -1))).toEqual([400, 1000, 1600])
    expect(rowOf(moved, ids[0], 'right')).toEqual(ids)
    expectBoardSound(moved)
  })

  it('goes to the shelf, piece by piece, when no lane has room for all of it', () => {
    const { world, ids } = three()
    const a = landFruit(world, 'long')
    const crowded = setRowOnBoard(setOnBoard(a.world, a.id, 0, 400).world, ids, 0, 0)
    expectBoardSound(crowded.world)
    expect(crowded.world.pieces.filter((piece) => ids.includes(piece.id)).every((piece) => piece.place.on === 'shelf' || piece.place.on === 'board')).toBe(true)
  })
})

describe('setting a piece down', () => {
  it('butts it against a neighbour when it is within the give, so the lengths add exactly', () => {
    const { world, id } = withFruit()
    const quarter = shareLength('long', { num: 1, den: 4 })
    const first = cut(world, id, quarter)
    if (first.kind !== 'cut') throw new Error('no cut')
    const second = cut(first.world, first.right, quarter)
    if (second.kind !== 'cut') throw new Error('no cut')
    // Two quarter pieces carried to the far lane, the second let go a little off the end of the first.
    let next = setOnBoard(second.world, first.left, 1, 30).world
    next = setOnBoard(next, second.left, 1, quarter + giveOf('long') - 5).world
    const lane = onLane(next, 1)
    expect(lane.map((piece) => (piece.place.on === 'board' ? piece.place.x : -1))).toEqual([0, quarter])
    expect(lane[0].length + lane[1].length).toBe(shareLength('long', { num: 1, den: 2 }))
    expectBoardSound(next)
  })

  it('never lays one piece over another, wherever it is let go', () => {
    let world = withFruit('short').world
    let state = 5
    for (let i = 0; i < 12; i++) {
      const pieces = onLane(world, 0)
      const a = draw(state)
      state = a.state
      world = cut(world, pieces[Math.floor(a.value * pieces.length)].id, 200 + a.value * 300).world
    }
    for (let i = 0; i < 300; i++) {
      const a = draw(state), b = draw(a.state), c = draw(b.state)
      state = c.state
      const piece = world.pieces[Math.floor(a.value * world.pieces.length)]
      world = setOnBoard(world, piece.id, b.value < 0.5 ? 0 : 1, c.value * RAIL * 1.2 - 200).world
      expectBoardSound(world)
    }
    expect(total(world)).toBe(WHOLE.short)
  })

  it('goes to the shelf when the board has no room, and the shelf drops its oldest when full', () => {
    let world = emptyWorld()
    const ids: number[] = []
    for (let i = 0; i < SHELF + 2; i++) {
      const landed = landFruit(world, 'long')
      ids.push(landed.id)
      world = setOnShelf(landed.world, landed.id).world
    }
    expect(onShelf(world).map((piece) => piece.id)).toEqual(ids.slice(2))
    expect(world.pieces).toHaveLength(SHELF)
    const a = landFruit(world, 'long'), b = landFruit(a.world, 'long')
    // Both lanes hold a long fruit: a third long piece set on the board has nowhere to lie.
    const crowded = setOnBoard(b.world, ids[5], 0, 100)
    expect(pieceOf(crowded.world, ids[5])!.place.on).toBe('shelf')
    expectBoardSound(crowded.world)
  })
})

describe('the tin', () => {
  it('opens on the first piece, keeps the pieces in the order they came, and adds their lengths', () => {
    const { world, id } = withFruit()
    const result = cut(world, id, 600)
    if (result.kind !== 'cut') throw new Error('no cut')
    expect(result.world.tinOpen).toBe(false)
    let next = giveToTin(result.world, result.right, 0)
    expect(next.tinOpen).toBe(true)
    next = giveToTin(next, result.left, 0)
    expect(inTin(next, 0).map((piece) => piece.id)).toEqual([result.right, result.left])
    expect(tinTotal(next, 0)).toBe(WHOLE.long)
    expect(tinTotal(next, 1)).toBe(0)
    // Taking the first one out closes the row up.
    next = setOnBoard(next, result.right, 0, 0).world
    expect(inTin(next, 0).map((piece) => (piece.place.on === 'tin' ? piece.place.turn : -1))).toEqual([0])
  })

  it('marks a piece cut while it stood open, and the mark stays when the next tin is shut', () => {
    const { world, id } = withFruit()
    const first = cut(world, id, 1200)
    if (first.kind !== 'cut') throw new Error('no cut')
    expect(pieceOf(first.world, first.left)!.blind).toBe(true)
    const open = giveToTin(first.world, first.left, 0)
    const second = cut(open, first.right, 300)
    if (second.kind !== 'cut') throw new Error('no cut')
    expect(pieceOf(second.world, second.left)!.blind).toBe(false)
    expect(pieceOf(second.world, second.right)!.blind).toBe(false)
    // A fruit that has not been cut carries no mark, whenever it landed.
    expect(landFruit(open, 'short').world.pieces.at(-1)!.blind).toBe(true)
    const cleared = clearTin(second.world)
    expect(cleared.tinOpen).toBe(false)
    expect(cleared.pieces.map((piece) => piece.id).sort()).toEqual([second.left, second.right].sort())
    expect(cleared.pieces.every((piece) => !piece.blind)).toBe(true)
    // Cut again with every tin shut, it is still not a piece cut by eye: one of its ends was cut against an open tin, and stays so.
    const again = cut(cleared, second.left, 150)
    if (again.kind !== 'cut') throw new Error('no cut')
    expect(pieceOf(again.world, again.left)!.blind).toBe(false)
    expect(pieceOf(again.world, again.right)!.blind).toBe(false)
  })

  it('moves what a customer eats to inside the customer, in order, and takes it away with the customer', () => {
    const { world, id } = withFruit()
    const result = cut(world, id, 600)
    if (result.kind !== 'cut') throw new Error('no cut')
    const tinned = giveToTin(giveToTin(result.world, result.left, 0), result.right, 0)
    const ate = eat(tinned, [result.left, result.right])
    expect(eaten(ate).map((piece) => piece.id)).toEqual([result.left, result.right])
    expect(inTin(ate, 0)).toEqual([])
    expect(ate.tinOpen).toBe(true)
    expect(clearTin(ate).pieces).toEqual([])
  })

  it('keeps the roller marks on every piece cut from a marked fruit', () => {
    const { world, id } = withFruit()
    const marked = roll(world, id, 4)
    expect(marksOf(pieceOf(marked, id)!)).toEqual([600, 1200, 1800])
    const result = cut(marked, id, 900)
    if (result.kind !== 'cut') throw new Error('no cut')
    expect(result.world.pieces.map((piece) => piece.ruled)).toEqual([600, 600])
    // The marks stay where they were pressed: one on the left part, and two on the right part, measured from its own left end.
    expect(marksOf(pieceOf(result.world, result.left)!)).toEqual([600])
    expect(marksOf(pieceOf(result.world, result.right)!)).toEqual([300, 900])
    // On a piece, the roller presses the parts of the piece itself, as if it were a whole.
    const again = roll(result.world, result.left, 3)
    expect(marksOf(pieceOf(again, result.left)!)).toEqual([300, 600])
    expect(roll(marked, id, 1)).toBe(marked)
    expect(marksOf(pieceOf(world, id)!)).toEqual([])
  })

  it('lets a piece leave the counter for good', () => {
    const { world, id } = withFruit()
    expect(remove(world, id).pieces).toEqual([])
    expect(remove(world, 42)).toEqual(world)
  })
})
