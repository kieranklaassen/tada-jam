import { describe, expect, it } from 'vitest'
import { Bench, cellOffset, cellOnBiscuit, icingCell, onPiece, pullOff, ringPlace, ringPoint, type BenchEvent } from './benches'
import { BOARD, RING, STAR } from './places'
import { GRID, POINTS, RING_PLACES, fresh, icedCells, twigCount, type Biscuit, type Star, type Thing, type Wreath } from './things'

/** What the bench said since last asked, but for the finger landing, which every touch begins with. */
const types = (bench: Bench): BenchEvent['type'][] => { const out = bench.events.map((e) => e.type).filter((type) => type !== 'touch'); bench.events.length = 0; return out }
/** A tap: the finger lands on the piece and lifts where it landed. */
const tapOn = (bench: Bench, piece: Thing, x: number, y: number): boolean => { bench.touch(x, y); return bench.lift(piece, true) }

describe('the star: folding', () => {
  it('folds one more point at every press, each with its crease, until the sheet has no point left', () => {
    for (const size of [0, 1, 2]) {
      const bench = new Bench(), star = fresh('star', size) as Star
      for (let n = 1; n <= POINTS[size]; n++) {
        expect(tapOn(bench, star, STAR.x, STAR.y)).toBe(true)
        expect(star.points).toBe(n)
        expect(bench.made.index).toBe(n - 1)
        expect(types(bench)).toEqual(['fold'])
      }
      // Every point is folded: the paper only flutters, and nothing is taken back.
      expect(tapOn(bench, star, STAR.x, STAR.y)).toBe(false)
      expect(star.points).toBe(POINTS[size])
      expect(types(bench)).toEqual(['paper'])
    }
  })
})

describe('the wreath: binding', () => {
  it('binds a twig where the finger lands on the ring, and only brushes one that is there', () => {
    const bench = new Bench(), wreath = fresh('wreath') as Wreath
    const top = ringPoint(0)
    expect(tapOn(bench, wreath, top.x, top.y)).toBe(true)
    expect(wreath.twigs[0]).toBe(1)
    expect(types(bench)).toEqual(['bind'])
    expect(tapOn(bench, wreath, top.x, top.y)).toBe(false)
    expect(types(bench)).toEqual(['brush'])
    expect(twigCount(wreath)).toBe(1)
  })

  it('binds twig after twig as the finger goes round, one for each place it passes', () => {
    const bench = new Bench(), wreath = fresh('wreath') as Wreath
    for (let step = 0; step <= 120; step++) {
      const a = (step / 120) * Math.PI * 2
      bench.move(wreath, RING.x + Math.sin(a) * RING.r, RING.y - Math.cos(a) * RING.r)
    }
    expect(twigCount(wreath)).toBe(RING_PLACES)
    expect(types(bench).filter((t) => t === 'bind')).toHaveLength(RING_PLACES)
  })

  it('knows its twelve places, and answers the hole in the middle and the air outside with a swing and no twig', () => {
    for (let place = 0; place < RING_PLACES; place++) {
      const p = ringPoint(place)
      expect(ringPlace(p.x, p.y)).toBe(place)
    }
    expect(ringPlace(RING.x, RING.y)).toBe(-1)
    expect(ringPlace(RING.x + RING.r + RING.band + 20, RING.y)).toBe(-1)
    const bench = new Bench(), wreath = fresh('wreath') as Wreath
    expect(tapOn(bench, wreath, RING.x + 20, RING.y)).toBe(false)
    expect(bench.sway.v).not.toBe(0)
    expect(twigCount(wreath)).toBe(0)
  })
})

describe('the biscuit: cutting and icing', () => {
  it('cuts the dough at the first press, with the tin that is out, and pipes icing from then on', () => {
    const bench = new Bench(), biscuit = fresh('biscuit', 1) as Biscuit
    expect(tapOn(bench, biscuit, BOARD.x, BOARD.y)).toBe(true)
    expect(biscuit.cut).toBe(true)
    expect(icedCells(biscuit)).toBe(0)
    expect(types(bench)).toEqual(['cut'])
    expect(tapOn(bench, biscuit, BOARD.x, BOARD.y)).toBe(true)
    expect(icedCells(biscuit)).toBe(1)
    expect(types(bench)).toEqual(['pipe'])
    expect(tapOn(bench, biscuit, BOARD.x, BOARD.y)).toBe(false)
    expect(types(bench)).toEqual(['pat'])
  })

  it('pipes a line as the finger moves, cell by cell, with a squeak for each stretch and not one for every cell at once', () => {
    const bench = new Bench(), biscuit = { ...(fresh('biscuit', 2) as Biscuit), cut: true }
    for (let x = -90; x <= 90; x += 6) { bench.move(biscuit, BOARD.x + x, BOARD.y); bench.step(1 / 60) }
    expect(icedCells(biscuit)).toBe(GRID)
    const squeaks = types(bench).filter((t) => t === 'pipe').length
    expect(squeaks).toBeGreaterThanOrEqual(2)
    expect(squeaks).toBeLessThanOrEqual(GRID)
  })

  it('pipes only on the biscuit: a smaller tin has fewer cells', () => {
    const cells = [0, 1, 2].map((tin) => { let n = 0; for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (cellOnBiscuit(tin, r, c)) n += 1; return n })
    expect(cells[0]).toBeGreaterThanOrEqual(5)
    expect(cells[0]).toBeLessThan(cells[1])
    expect(cells[1]).toBeLessThan(cells[2])
    const small = { ...(fresh('biscuit', 0) as Biscuit), cut: true }
    expect(icingCell(small, BOARD.x + 95, BOARD.y)).toBeNull()
    expect(icingCell(small, BOARD.x, BOARD.y)).toEqual({ row: 3, col: 3 })
    expect(cellOffset(3, 3)).toEqual({ x: 0, y: 0 })
  })
})

describe('every bench', () => {
  it('gives under the finger and springs back, and stands still once settled', () => {
    const bench = new Bench(), star = fresh('star') as Star
    tapOn(bench, star, STAR.x, STAR.y)
    bench.step(1 / 60)
    expect(bench.give.x).toBeGreaterThan(0)
    for (let i = 0; i < 240; i++) bench.step(1 / 60)
    expect(Math.abs(bench.give.x)).toBeLessThan(0.01)
    tapOn(bench, star, STAR.x, STAR.y)
    bench.settle()
    expect([bench.give, bench.sway, bench.made, bench.events]).toEqual([{ x: 0, v: 0 }, { x: 0, v: 0 }, { index: -1, age: 9 }, []])
  })

  it('works on the piece where it is, and lets it be pulled off only well beyond it', () => {
    for (const craft of ['star', 'wreath', 'biscuit'] as const) {
      const piece = fresh(craft), off = pullOff(piece)
      expect(onPiece(piece, off.x, off.y) || craft === 'wreath').toBe(true)
      expect(onPiece(piece, off.x + off.r, off.y)).toBe(false)
      expect(off.r).toBeGreaterThan(110)
    }
  })

  it('makes nothing when the finger lands: the piece gives, and the work comes from the tap or the rub that makes it', () => {
    const made = (piece: Thing): string => JSON.stringify(piece)
    for (const piece of [fresh('star') as Thing, fresh('wreath'), { ...(fresh('biscuit') as Biscuit), cut: true }]) {
      const bench = new Bench(), before = made(piece), at = piece.craft === 'wreath' ? ringPoint(3) : piece.craft === 'star' ? STAR : BOARD
      bench.touch(at.x, at.y)
      expect(bench.events.map((e) => e.type)).toEqual(['touch'])
      expect(bench.give.v).toBeGreaterThan(0)
      // A wobble of the finger where it landed is no rub.
      expect(bench.move(piece, at.x + 3, at.y + 2)).toBe(false)
      expect(made(piece)).toBe(before)
      // A touch the browser took away makes nothing either.
      expect(bench.lift(piece, false)).toBe(false)
      expect(made(piece)).toBe(before)
      // And a tap makes one piece of work.
      bench.touch(at.x, at.y)
      expect(bench.lift(piece, true)).toBe(true)
      expect(made(piece)).not.toBe(before)
    }
  })

  it('begins a rub when the finger has gone from one place to the next, and then the place it landed on is made too', () => {
    const bench = new Bench(), wreath = fresh('wreath') as Wreath
    const a = ringPoint(2), b = ringPoint(3)
    bench.touch(a.x, a.y)
    expect(bench.move(wreath, b.x, b.y)).toBe(true)
    expect([wreath.twigs[2], wreath.twigs[3], twigCount(wreath)]).toEqual([1, 1, 2])
    // The lift after a rub adds nothing.
    expect(bench.lift(wreath, true)).toBe(false)
    expect(twigCount(wreath)).toBe(2)
    const biscuit = { ...(fresh('biscuit') as Biscuit), cut: true }
    bench.touch(BOARD.x, BOARD.y)
    expect(bench.move(biscuit, BOARD.x + BOARD.cell, BOARD.y)).toBe(true)
    expect(icedCells(biscuit)).toBe(2)
    expect(bench.lift(biscuit, true)).toBe(false)
  })
})
