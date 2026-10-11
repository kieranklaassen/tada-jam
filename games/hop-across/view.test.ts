import { describe, expect, it } from 'vitest'
import { CLOTH_COL, COLS, isSeat, moverOn, step, type Board, type Lane, type Pawn } from './board'
import { HOPS, LEFT, RIGHT, STAY, UP, visitAt } from './careful'
import { LADDER } from './config'
import { DUCK_POST, ENDS, FEET, LANES, SQUARE, centreX, centreY } from './layout'
import { CAB_SLIDE, ROLL_SECONDS, ROLL_UP_SECONDS, SPIT_SECONDS, UNDER_SECONDS, WORLD_AT, HOP_SECONDS, LEAP_LONGER, LEAP_UNDER, MARK_HOPS, hopArc, hopDelay } from './motion'
import { hop } from './play'
import { below, makeRng } from './rng'
import { boardOf } from './save'
import { sceneryOf } from './scenery'
import { BoardView, LONG_AGO } from './view'

// Nothing passes through anything. The board keeps two off one square (board.test.ts); this holds the view to the
// board: once a step has come to rest, everybody is drawn on the square the board has them on, and whoever shares
// a square with a car or a lorry is drawn flat under it or standing on top of it, never through it.

const REST = 3

describe('the view at rest is the board', () => {
  it('draws each of the family on its own square, flat under a wheel or up on what it rides, after every hop of a walk on every position', () => {
    let flat = 0, riding = 0
    for (const position of LADDER) {
      const rng = makeRng(13)
      let saved = visitAt(position, 2)
      const view = new BoardView()
      view.reset(boardOf(saved), sceneryOf(saved), false)
      let time = 1
      for (let n = 0; n < 200; n++) {
        const turn = hop(saved, below(rng, 3) === 0 ? RIGHT : HOPS[below(rng, HOPS.length)])
        if (turn.slide) break
        saved = turn.saved
        view.apply(turn.board, turn.events, time)
        time += REST
        const board = turn.board
        const drawn = board.family.map((_, who) => ({ ...view.where(who, time) }))
        board.family.forEach((pawn, who) => {
          const label = `${position}, hop ${n}, pawn ${who}`
          expect(drawn[who].x, label).toBeCloseTo(centreX(pawn.c), 3)
          expect(drawn[who].hidden, label).toBeFalsy()
          expect(isSeat(pawn.c, pawn.r) && board.lanes[pawn.c].kind === 'cloth', label).toBe(false)
          const under = moverOn(board.lanes[pawn.c], pawn.r)
          if (pawn.on) {
            riding++
            // Up on its mover, which is where the board has it.
            expect(under, label).not.toBeNull()
            expect(view.flatness(who, time), label).toBeLessThanOrEqual(0)
            expect(drawn[who].y, label).toBeCloseTo(centreY(pawn.r) + FEET, 3)
          } else {
            expect(drawn[who].y, label).toBeCloseTo(centreY(pawn.r) + FEET, 3)
            // Whatever stands on the square of one who rides nothing has rolled over it, and it lies flat.
            if (under) expect(pawn.flat, label).toBe(true)
          }
          expect(view.flatness(who, time) > 0.5, label).toBe(pawn.flat)
          if (pawn.flat) flat++
        })
        // No two are drawn in one place.
        expect(new Set(drawn.map((at) => `${Math.round(at.x)},${Math.round(at.y)}`)).size, `${position}, hop ${n}`).toBe(4)
        // Every mover stands where the board has it.
        board.lanes.forEach((lane, c) => lane.movers.forEach((_, index) => expect(view.shift(c, index, time), `${position}, hop ${n}, lane ${c}`).toBeCloseTo(0, 6)))
        expect(view.busy(time)).toBe(false)
      }
    }
    expect(flat).toBeGreaterThan(20)
    expect(riding).toBeGreaterThan(20)
  })

  it('keeps the duck\'s post off the board, where nothing rolls', () => {
    expect(DUCK_POST.y).toBeGreaterThan(LANES.y + LANES.h)
  })
})

const pawn = (c: number, r: number, more: Partial<Pawn> = {}): Pawn => ({ c, r, flat: false, on: null, dry: { c, r }, ...more })
const lane = (kind: Lane['kind'], more: Partial<Lane> = {}): Lane => ({ kind, movers: [], ...more })
/** A bank, the lanes given, and grass after them. */
function boardWith(lanes: Lane[], family: Pawn[], home: Lane = lane('bank')): Board {
  const all = [home, ...lanes]
  while (all.length < COLS) all.push(lane(all.length === CLOTH_COL ? 'cloth' : 'grass'))
  return { lanes: all, family }
}
function viewOf(board: Board): BoardView {
  const view = new BoardView()
  view.reset(board, null, false)
  return view
}

describe('what a step sets off in the view', () => {
  it('shows a hop back onto the small one behind as a leapfrog: she goes high over it, and it ducks and goes under her along the ground', () => {
    const board = boardWith([lane('grass'), lane('grass')], [pawn(2, 2), pawn(1, 2)])
    const view = viewOf(board)
    const result = step(board, LEFT)
    view.apply(result.board, result.events, 1)
    const arc = { along: 0, lift: 0, tip: 0, stretch: 1 }
    const hop = hopArc(0, 0.5, arc).lift * SQUARE.h
    const over = { ...view.where(0, 1 + HOP_SECONDS[0] * LEAP_LONGER * 0.5) }
    expect(over.lift).toBeGreaterThan(hop * 1.9)
    const under = { ...view.where(1, 1 + LEAP_UNDER + HOP_SECONDS[1] * 0.5) }
    expect(under.lift).toBe(0)
    expect(under.stretch).toBe(0.5)
    expect(under.x).toBeGreaterThan(centreX(1))
    expect(under.x).toBeLessThan(centreX(2))
    // And they have changed places.
    expect(view.where(0, 4).x).toBeCloseTo(centreX(1))
    expect(view.where(1, 4).x).toBeCloseTo(centreX(2))
  })

  it('brings a pawn down on the lorry\'s cab and slides it back onto the bed', () => {
    // The lorry's cab is on row 1 and its bed on row 0; it rolls two squares down the board at the hop.
    const board = boardWith([lane('road', { movers: [{ kind: 'lorry', at: 1, dir: 1 }] })], [pawn(0, 1)])
    const view = viewOf(board)
    const result = step(board, RIGHT)
    expect(result.events.find((event) => event.type === 'hop')).toMatchObject({ cab: true, to: { c: 1, r: 0 } })
    view.apply(result.board, result.events, 1)
    const landed = 1 + hopDelay(0) + HOP_SECONDS[0]
    // Down on the cab, one square ahead of the bed, and then back onto the bed, where the board has her.
    const bedAt = (time: number) => view.placeY({ c: 1, r: result.board.family[0].r, index: 0 }, time)
    const onCab = landed + 0.01, onBed = landed + 0.05 + CAB_SLIDE + 0.01
    expect(view.where(0, onCab).x).toBeCloseTo(centreX(1))
    expect(view.where(0, onCab).y - bedAt(onCab)).toBeCloseTo(SQUARE.h)
    expect(view.where(0, onBed).y - bedAt(onBed)).toBeCloseTo(0)
    expect(view.where(0, 9).y).toBeCloseTo(centreY(result.board.family[0].r) + FEET)
  })

  it('brings a pawn down on the cab of a lorry whose bed is taken and slides it back off to its own square', () => {
    const board = boardWith([lane('road', { movers: [{ kind: 'lorry', at: 1, dir: 1 }] })], [pawn(0, 1), pawn(1, 0, { on: { index: 0, part: 1 } })])
    const view = viewOf(board)
    const result = step(board, RIGHT)
    expect(result.events.find((event) => event.type === 'spot' && event.who === 0)).toMatchObject({ why: 'cab' })
    view.apply(result.board, result.events, 1)
    const landed = 1 + hopDelay(0) + HOP_SECONDS[0]
    // Down on the cab, wherever the lorry's roll has brought it by then: one square ahead of the bed and its rider.
    const bedAt = (time: number) => view.placeY({ c: 1, r: result.board.family[1].r, index: 0 }, time)
    const onCab = landed + 0.01
    expect(view.where(0, onCab).x).toBeCloseTo(centreX(1))
    expect(view.where(0, onCab).y - bedAt(onCab)).toBeCloseTo(SQUARE.h)
    // Then back off it, to the square she never left.
    const back = landed + 0.05 + CAB_SLIDE + 0.01
    expect(view.where(0, back).x).toBeCloseTo(centreX(0))
    expect(view.where(0, back).y).toBeCloseTo(centreY(1) + FEET)
    expect(view.where(0, 9).x).toBeCloseTo(centreX(0))
  })

  it('has the fish up at the edge with its mouth open before a rider is carried off the board on a log, and nowhere before a hop into the water', () => {
    const river = lane('river', { movers: [{ kind: 'log', at: 5, dir: 1 }] })
    const riding = boardWith([river], [pawn(1, 5, { on: { index: 0, part: 0 }, dry: { c: 0, r: 3 } })])
    const view = viewOf(riding)
    const off = step(riding, STAY)
    expect(off.events.find((event) => event.type === 'spit')).toMatchObject({ by: 'edge' })
    view.apply(off.board, off.events, 1)
    const fish = view.effects.find((effect) => effect.kind === 'fish')!
    expect(fish.early).toBeGreaterThan(0.2)
    expect(fish.start - fish.early!).toBeCloseTo(1)
    const wet = boardWith([lane('river')], [pawn(0, 2)])
    const other = viewOf(wet)
    const dunk = step(wet, RIGHT)
    other.apply(dunk.board, dunk.events, 1)
    expect(other.effects.find((effect) => effect.kind === 'fish')!.early).toBeUndefined()
  })

  it('spits a small one out onto its head and rolls it upright, and has the rabbit tread water on a sinking turtle before the fish has her', () => {
    // A small one on a log that is carried off the board.
    const river = lane('river', { movers: [{ kind: 'log', at: 5, dir: 1 }] })
    const board = boardWith([river, lane('grass')], [pawn(2, 5), pawn(1, 5, { on: { index: 0, part: 0 }, dry: { c: 0, r: 4 } })])
    const view = viewOf(board)
    const result = step(board, STAY)
    expect(result.events.find((event) => event.type === 'spit')).toMatchObject({ who: 1, by: 'edge' })
    view.apply(result.board, result.events, 1)
    const landed = 1 + WORLD_AT + ROLL_SECONDS.log * 0.8 + UNDER_SECONDS + SPIT_SECONDS
    // As it lands it is upside down, with its head on the ground and not its feet under it.
    const down = { ...view.where(1, landed + 0.001) }
    expect(Math.cos(down.spin)).toBeCloseTo(-1, 1)
    expect(down.lift).toBeGreaterThan(60)
    const up = { ...view.where(1, landed + ROLL_UP_SECONDS[1] + 0.01) }
    expect(up.spin).toBe(0)
    expect(up.lift).toBe(0)

    // The rabbit on a turtle at its third step.
    const pond = lane('river', { movers: [{ kind: 'turtle', at: 2, dir: 1, count: 1 }] })
    const riding = boardWith([pond], [pawn(1, 2, { on: { index: 0, part: 0 }, dry: { c: 0, r: 2 } })])
    const other = viewOf(riding)
    const sunk = step(riding, STAY)
    expect(sunk.events.find((event) => event.type === 'spit')).toMatchObject({ who: 0, by: 'turtle' })
    other.apply(sunk.board, sunk.events, 1)
    const under = other.pawns[0].segs.find((seg) => seg.kind === 'under')!.start
    expect(other.pawns[0].wiggleAt).toBeLessThan(under)
    expect(other.pawns[0].wiggleAt).toBeGreaterThan(1)
    expect(other.pawns[0].millAt).toBeLessThan(under)
    expect(other.where(0, under - 0.1).hidden).toBe(false)
  })

  it('brings the fish\'s shadow near when she hops on the spot beside its river, and keeps it there until she moves', () => {
    const board = boardWith([lane('grass'), lane('river')], [pawn(1, 2)])
    const view = viewOf(board)
    expect(view.fishAt.near).toBe(false)
    let result = step(board, STAY)
    expect(result.events.some((event) => event.type === 'blip')).toBe(true)
    view.apply(result.board, result.events, 1)
    expect(view.fishAt.near).toBe(true)
    // However long she waits, and at another hop on the spot, it stays.
    result = step(result.board, STAY)
    view.apply(result.board, result.events, 9)
    expect(view.fishAt.near).toBe(true)
    result = step(result.board, UP)
    view.apply(result.board, result.events, 10)
    expect(view.fishAt.near).toBe(false)
  })

  it('goes on drawing a lorry the train shoved, tail first when it met the train head on, and rolls it the way it now goes', () => {
    const road: Lane = { kind: 'railroad', movers: [{ kind: 'lorry', at: 3, dir: -1 }], train: { arch: 'far', awake: true }, bell: { dc: -1, r: 0 } }
    const board = boardWith([lane('grass'), road], [pawn(0, 3)])
    const view = viewOf(board)
    let result = step(board, STAY)
    view.apply(result.board, result.events, 1)
    expect(view.movers[2][0]).toMatchObject({ mode: 'shove', faced: -1, dir: 1 })
    for (let n = 0; n < 4; n++) {
      result = step(result.board, STAY)
      view.apply(result.board, result.events, 2 + n)
    }
    expect(view.movers[2][0]).toMatchObject({ mode: 'roll', dir: 1, dist: 2 })
    expect(view.shift(2, 0, 20)).toBeCloseTo(0)
  })

  it('keeps her wet for a few hops of the line, however long she waits, and dry after them', () => {
    const board = boardWith([lane('river')], [pawn(0, 2)])
    const view = viewOf(board)
    let result = step(board, RIGHT)
    view.apply(result.board, result.events, 1)
    expect(view.arrival(0)).toBe('wet')
    // A long wait dries nothing.
    let time = 600
    for (let n = 1; n <= MARK_HOPS; n++) {
      expect(view.arrival(0)).toBe('wet')
      result = step(result.board, STAY)
      view.apply(result.board, result.events, time)
      time += 600
    }
    expect(view.arrival(0)).toBe('dry')
    expect(view.pawns[0].wetOff).toBeGreaterThan(LONG_AGO)
  })

  it('keeps her tyre track for a few hops of the line after she peels up, and not for any length of time', () => {
    const board = boardWith([{ kind: 'road', movers: [{ kind: 'car', at: 1, dir: 1 }] }], [pawn(1, 2)])
    const view = viewOf(board)
    let result = step(board, STAY)
    view.apply(result.board, result.events, 1)
    expect(result.board.family[0].flat).toBe(true)
    result = step(result.board, STAY)
    view.apply(result.board, result.events, 5)
    expect(result.events.some((event) => event.type === 'peel')).toBe(true)
    let time = 600
    for (let n = 1; n <= MARK_HOPS; n++) {
      expect(view.arrival(0)).toBe('tracked')
      result = step(result.board, UP)
      view.apply(result.board, result.events, time)
      time += 600
    }
    expect(view.arrival(0)).toBe('dry')
  })

  it('starts her ears windmilling as she lands on a log, and lays ears over as a train runs its lane', () => {
    const river: Lane = { kind: 'river', movers: [{ kind: 'log', at: 2, dir: 1 }] }
    const board = boardWith([river], [pawn(0, 2)])
    const view = viewOf(board)
    expect(view.pawns[0].millAt).toBe(LONG_AGO)
    const result = step(board, RIGHT)
    view.apply(result.board, result.events, 1)
    expect(view.pawns[0].millAt).toBeCloseTo(1 + HOP_SECONDS[0])

    const rails: Lane = { kind: 'rails', movers: [], train: { arch: 'far', awake: true } }
    const beside = boardWith([lane('grass'), rails], [pawn(1, 3)])
    const watching = viewOf(beside)
    const ran = step(beside, STAY)
    watching.apply(ran.board, ran.events, 1)
    expect(ran.events.some((event) => event.type === 'train')).toBe(true)
    expect(watching.wind.col).toBe(2)
    expect(watching.wind.at).toBeGreaterThan(1)
    expect(watching.wind.at).toBeLessThan(2)
  })

  it('rings the tummy of whoever sits on the seat she was sent at, and nobody\'s at the burrow', () => {
    // The far cloth: the old rabbit with the cake.
    const far = boardWith([], [pawn(CLOTH_COL, 1)])
    let view = viewOf(far)
    let result = step(far, UP)
    view.apply(result.board, result.events, 1)
    expect(view.old.tummyAt).toBeGreaterThan(1)
    expect(view.old.nearTummyAt).toBe(LONG_AGO)
    // The home cloth: the one asleep there.
    const near = boardWith([], [pawn(0, 1)], lane('cloth'))
    view = viewOf(near)
    result = step(near, UP)
    view.apply(result.board, result.events, 1)
    expect(view.old.nearTummyAt).toBeGreaterThan(1)
    expect(view.old.tummyAt).toBe(LONG_AGO)
    // The burrow of the first home bank.
    const first = boardWith([], [pawn(0, 1)])
    view = viewOf(first)
    result = step(first, UP)
    view.apply(result.board, result.events, 1)
    expect(view.old.tummyAt).toBe(LONG_AGO)
    expect(view.old.nearTummyAt).toBe(LONG_AGO)
  })

  it('opens the hamper that was touched, behind the home cloth or the far one, and wakes the one asleep at home', () => {
    // Where each thing is drawn is read off the context: the hamper's flap turns about its own left end.
    const flapsAt = (view: BoardView, time: number): number[] => {
      const turned: number[] = []
      let last = NaN, above = false
      const ctx = new Proxy({} as Record<string, unknown>, {
        get: (target, name: string) => name in target ? target[name] : name === 'createRadialGradient' || name === 'createLinearGradient' ? () => ({ addColorStop() {} }) : (...args: number[]) => {
          if (name === 'translate') { last = args[0]; above = args[1] === ENDS.far - 51 }
          // Only the flap is turned about its own left end: 50 left of the middle of a cloth's column, 51 above the far ends.
          if (name === 'rotate' && above && [0, CLOTH_COL].some((c) => Math.abs(last - (centreX(c) - 50)) < 1e-6)) turned.push(last + 50)
        },
        set: (target, name: string, value) => { target[name] = value; return true },
      }) as unknown as CanvasRenderingContext2D
      view.draw(ctx, time, 1 / 60, null, true)
      return turned
    }
    const saved = visitAt('cars', 2)
    const after = { ...saved, crossing: { ...saved.crossing, home: 'cloth' as const } }
    const view = new BoardView()
    view.reset(boardOf(after), sceneryOf(after), false)
    expect(flapsAt(view, 10)).toEqual([])
    view.poke({ who: 'hamper', c: 0 }, 10)
    expect(flapsAt(view, 10.3)).toEqual([centreX(0)])
    expect(flapsAt(view, 11)).toEqual([])
    view.poke({ who: 'hamper', c: CLOTH_COL }, 12)
    expect(flapsAt(view, 12.3)).toEqual([centreX(CLOTH_COL)])
    // The one asleep on the home cloth is the one a touch there wakes; the far one does not bob.
    view.poke({ who: 'sleeper' }, 13)
    expect(view.old.snortAt).toBe(13)
    expect(view.old.helloAt).toBe(LONG_AGO)
  })

  it('has each touched bystander answer with a move of its own, which the idle hand waits for', () => {
    const view = viewOf(boardWith([], [pawn(0, 2)]))
    expect(view.busy(10)).toBe(false)
    view.poke({ who: 'duck' }, 10)
    expect(view.duck.quackAt).toBe(10)
    expect(view.duck.shakeAt).toBeGreaterThan(10)
    view.poke({ who: 'hamper', c: CLOTH_COL }, 11)
    expect(view.hamper).toEqual({ at: 11, c: CLOTH_COL })
    view.poke({ who: 'old' }, 12)
    expect(view.old.helloAt).toBe(12)
    view.poke({ who: 'sleeper' }, 13)
    expect(view.old.snortAt).toBe(13)
    view.poke({ who: 'onlooker', c: 3, what: 'robot' }, 14)
    expect(view.poked).toEqual({ c: 3, what: 'robot', at: 14 })
    expect(view.busy(14.5)).toBe(true)
    expect(view.busy(16)).toBe(false)
  })
})
