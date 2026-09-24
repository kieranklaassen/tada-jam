// Proof that the loop's characteristic moment happens when played: a dip ABOVE
// a fork paints a plain marble so the fork sends it a different way, and the
// same two pieces the other way round do nothing of the kind. Same for a
// shrinker and a sieve. The shared suite (lab/kit/contract.test.ts) covers
// determinism, fuzz, affordances, and hygiene without any of this.

import { describe, expect, it } from 'vitest'
import type { Sim } from '../../kit/sim.ts'
import { meta } from './meta.ts'
import { BOARD_X, COLS, KINDS, PAINTS, ROWS, cellRect, createSim, matches, route, traceType, trayRect } from './sim.ts'
import type { DipSnapshot, Grid, Kind, MarbleType, Piece, Rect } from './sim.ts'

type S = Sim<DipSnapshot>

function start(o: { seed?: number; hooks?: readonly string[]; hints?: boolean } = {}): S {
  return createSim({ seed: o.seed ?? 3, hooks: o.hooks ?? meta.hooks, hints: o.hints ?? true })
}

const centre = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

function run(sim: S, ticks: number): void {
  for (let i = 0; i < ticks; i++) sim.step()
}

// Runs and returns every event name seen, in order.
function collect(sim: S, ticks: number): string[] {
  const names: string[] = []
  for (let i = 0; i < ticks; i++) {
    sim.step()
    for (const e of sim.observe().events) names.push(e.kind === 'hook' ? `hook:${e.name}` : e.name)
  }
  return names
}

function tap(sim: S, x: number, y: number, id = 1): void {
  sim.pointer({ id, phase: 'down', x, y })
  sim.step()
  sim.pointer({ id, phase: 'up', x, y })
}

function drag(sim: S, from: { x: number; y: number }, to: { x: number; y: number }, id = 1): void {
  sim.pointer({ id, phase: 'down', x: from.x, y: from.y })
  for (let s = 1; s <= 6; s++) {
    sim.pointer({ id, phase: 'move', x: from.x + ((to.x - from.x) * s) / 6, y: from.y + ((to.y - from.y) * s) / 6 })
    sim.step()
  }
  sim.pointer({ id, phase: 'up', x: to.x, y: to.y })
}

function place(sim: S, kind: Kind, row: number, col: number): void {
  drag(sim, centre(trayRect(KINDS.indexOf(kind))), centre(cellRect(row, col)))
}

// Taps a placed piece `times` times (each tap steps its setting once).
function tapPiece(sim: S, row: number, col: number, times = 1): void {
  for (let i = 0; i < times; i++) tap(sim, centre(cellRect(row, col)).x, centre(cellRect(row, col)).y)
}

function piece(sim: S, row: number, col: number): Piece | null {
  return sim.snapshot().cells[row]![col]!
}

function hold(sim: S, row: number, col: number, ticks = 14): void {
  const c = centre(cellRect(row, col))
  sim.pointer({ id: 2, phase: 'down', x: c.x, y: c.y })
  run(sim, ticks)
  sim.pointer({ id: 2, phase: 'up', x: c.x, y: c.y })
}

describe('the characteristic moment: order decides what a fork or a sieve sees', () => {
  it('a dip above a fork paints a plain marble so the fork turns it left', () => {
    const sim = start()
    place(sim, 'dip', 0, 2)
    place(sim, 'fork', 1, 2)
    const names = collect(sim, 600)
    expect(names).toContain('painted')
    expect(names).toContain('chain-color')
    expect(names).toContain('fork-left')
    expect(sim.observe().signature.startsWith('painted/')).toBe(true)
    expect(sim.observe().features.chains).toBe(1)
  })

  it('the same two pieces the other way round never make that chain', () => {
    const sim = start()
    place(sim, 'fork', 0, 2)
    // The dips sit below the fork, on both of its exits.
    place(sim, 'dip', 1, 1)
    place(sim, 'dip', 1, 3)
    const names = collect(sim, 600)
    expect(names).toContain('painted')
    expect(names).toContain('late-paint')
    expect(names).not.toContain('chain-color')
    expect(sim.observe().signature.startsWith('none/')).toBe(true)
    expect(sim.observe().features.chains).toBe(0)
  })

  it('a shrinker above a sieve lets a medium marble drop through as a small one', () => {
    const sim = start()
    place(sim, 'shrinker', 0, 2)
    place(sim, 'sieve', 1, 2)
    const names = collect(sim, 600)
    expect(names).toContain('shrunk')
    expect(names).toContain('chain-size')
    expect(names).toContain('sieve-through')
    expect(names).toContain('sieve-aside')
    expect(sim.observe().signature.startsWith('shrunk/')).toBe(true)
  })

  it('a sieve above the shrinker sifts by the size it started with, so nothing chains', () => {
    const sim = start()
    place(sim, 'sieve', 0, 2)
    place(sim, 'shrinker', 1, 2)
    place(sim, 'shrinker', 1, 3)
    const names = collect(sim, 600)
    expect(names).toContain('late-shrink')
    expect(names).not.toContain('chain-size')
    expect(sim.observe().signature.startsWith('none/')).toBe(true)
  })

  it('both chains together make the machine a "both"', () => {
    const sim = start()
    place(sim, 'dip', 0, 2)
    place(sim, 'shrinker', 1, 2)
    place(sim, 'fork', 2, 2)
    place(sim, 'sieve', 3, 1)
    place(sim, 'sieve', 3, 3)
    run(sim, 30)
    expect(sim.observe().signature.startsWith('both/')).toBe(true)
    expect(sim.observe().features.chains).toBe(2)
  })

  it('the rules are one pure function: the dip only takes on a plain marble', () => {
    const dip: Piece = { kind: 'dip', setting: 1, flip: false }
    expect(route(dip, { color: 'gray', size: 2 }, 2).type).toEqual({ color: 'blue', size: 2 })
    expect(route(dip, { color: 'red', size: 2 }, 2).type).toEqual({ color: 'red', size: 2 })
    const shrinker: Piece = { kind: 'shrinker', setting: 0, flip: false }
    expect(route(shrinker, { color: 'red', size: 3 }, 0).type.size).toBe(2)
    expect(route(shrinker, { color: 'red', size: 1 }, 0).type.size).toBe(1)
  })

  it('a dry run through the machine reports the same chain the live marbles make', () => {
    const cells: Grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null as Piece | null))
    cells[0]![2] = { kind: 'dip', setting: 0, flip: false }
    cells[1]![2] = { kind: 'fork', setting: 0, flip: false }
    const gray: MarbleType = { color: 'gray', size: 2 }
    const blue: MarbleType = { color: 'blue', size: 2 }
    const painted = traceType(cells, gray)
    expect(painted.col).toBe(1)
    expect(painted.chainColor).toBe(true)
    expect(traceType(cells, blue).col).toBe(3)
    expect(traceType(cells, blue).chainColor).toBe(false)
  })
})

describe('handling the pieces', () => {
  it('starts bare, with a tray, and two bins that want something', () => {
    const sim = start()
    const snap = sim.snapshot()
    expect(snap.cells.flat().every((c) => c === null)).toBe(true)
    expect(snap.bins.filter((b) => b.want).length).toBe(2)
    expect(sim.observe().signature).toBe('none/1/0')
    expect(sim.affordances().filter((a) => a.x < BOARD_X)).toHaveLength(KINDS.length)
  })

  it('dragging from the tray onto a cell places the piece and makes it the brush; a tap on an empty cell stamps the brush', () => {
    const sim = start()
    expect(sim.snapshot().brush).toBe('dip')
    place(sim, 'fork', 1, 2)
    expect(piece(sim, 1, 2)?.kind).toBe('fork')
    expect(sim.snapshot().brush).toBe('fork')
    const c = centre(trayRect(KINDS.indexOf('bell')))
    tap(sim, c.x, c.y)
    expect(sim.snapshot().brush).toBe('bell')
    tap(sim, centre(cellRect(3, 0)).x, centre(cellRect(3, 0)).y)
    tap(sim, centre(cellRect(4, 0)).x, centre(cellRect(4, 0)).y)
    expect(piece(sim, 3, 0)?.kind).toBe('bell')
    expect(piece(sim, 4, 0)?.kind).toBe('bell')
    // A tap on a piece changes the piece; it does not stamp over it.
    const before = piece(sim, 1, 2)!.setting
    tapPiece(sim, 1, 2)
    expect(piece(sim, 1, 2)?.kind).toBe('fork')
    expect(piece(sim, 1, 2)?.setting).toBe((before + 1) % 3)
  })

  it('a tap steps a placed piece through its settings, a hold flips a fork or a sieve', () => {
    const sim = start()
    place(sim, 'fork', 1, 2)
    place(sim, 'sieve', 2, 2)
    place(sim, 'slope', 3, 2)
    const first = piece(sim, 1, 2)!.setting
    tapPiece(sim, 1, 2)
    expect(piece(sim, 1, 2)?.setting).toBe((first + 1) % 3)
    tapPiece(sim, 1, 2, 2)
    expect(piece(sim, 1, 2)?.setting).toBe(first)
    tapPiece(sim, 2, 2)
    expect(piece(sim, 2, 2)?.setting).toBe(1)
    tapPiece(sim, 3, 2)
    expect(piece(sim, 3, 2)?.setting).toBe(1)
    hold(sim, 1, 2)
    expect(piece(sim, 1, 2)?.flip).toBe(true)
    hold(sim, 2, 2)
    expect(piece(sim, 2, 2)?.flip).toBe(true)
  })

  it('a new dip or fork comes set to the first colour the order asks for', () => {
    const sim = start({ seed: 77 })
    const wanted = sim.snapshot().bins.find((b) => b.want?.color)!.want!.color!
    place(sim, 'dip', 0, 2)
    place(sim, 'fork', 1, 2)
    place(sim, 'shrinker', 2, 2)
    expect(PAINTS[piece(sim, 0, 2)!.setting]).toBe(wanted)
    expect(PAINTS[piece(sim, 1, 2)!.setting]).toBe(wanted)
    expect(piece(sim, 2, 2)!.setting).toBe(0)
  })

  it('dragging a placed piece moves it, swaps it, or takes it off the board', () => {
    const sim = start()
    place(sim, 'dip', 0, 2)
    place(sim, 'fork', 1, 2)
    drag(sim, centre(cellRect(0, 2)), centre(cellRect(4, 4)))
    expect(piece(sim, 0, 2)).toBeNull()
    expect(piece(sim, 4, 4)?.kind).toBe('dip')
    drag(sim, centre(cellRect(4, 4)), centre(cellRect(1, 2)))
    expect(piece(sim, 1, 2)?.kind).toBe('dip')
    expect(piece(sim, 4, 4)?.kind).toBe('fork')
    drag(sim, centre(cellRect(4, 4)), { x: 100, y: 760 })
    expect(piece(sim, 4, 4)).toBeNull()
    expect(sim.observe().features.pieces).toBe(1)
  })

  it('ignores non-finite coordinates, an up with no down, and a touch on nothing', () => {
    const sim = start()
    const before = JSON.stringify(sim.snapshot())
    sim.pointer({ id: 1, phase: 'down', x: Number.NaN, y: 10 })
    sim.pointer({ id: 1, phase: 'move', x: 10, y: Number.POSITIVE_INFINITY })
    sim.pointer({ id: 9, phase: 'up', x: 500, y: 500 })
    sim.pointer({ id: 3, phase: 'down', x: 1e12, y: -1e12 })
    sim.pointer({ id: 3, phase: 'up', x: 1e12, y: -1e12 })
    expect(JSON.stringify(sim.snapshot())).toBe(before)
  })

  it('keeps a bounded event queue when nobody calls observe()', () => {
    const sim = start()
    place(sim, 'bell', 0, 2)
    run(sim, 3000)
    expect(sim.observe().events.length).toBeLessThanOrEqual(64)
    expect(sim.observe().events).toHaveLength(0)
  })
})

// Finds a seed whose first order has the wants the scripted machine needs.
function findSeed(ok: (snap: DipSnapshot) => boolean): number {
  for (let seed = 1; seed < 5000; seed++) if (ok(createSim({ seed, hooks: meta.hooks, hints: false }).snapshot())) return seed
  throw new Error('no seed found')
}

const colorOnly = (w: DipSnapshot['bins'][number]['want']) => (w && w.color && w.size === undefined ? w.color : null)

// The right-hand bin can only be fed by a small marble that arrives with a colour
// of its own (a plain one is painted the fork's colour and goes left), so the
// bag must hold one, or the script proves nothing.
const smallNonPaint = (bag: MarbleType[], paint: string) => bag.some((t) => t.size === 1 && t.color !== 'gray' && t.color !== paint)

describe('the bins and the orders', () => {
  const seed = findSeed((s) => colorOnly(s.bins[1]!.want) !== null && s.bins[3]!.want?.size === 1 && smallNonPaint(s.bag, colorOnly(s.bins[1]!.want)!))

  function build(hooks: readonly string[]): S {
    const sim = start({ seed, hooks })
    const paint = colorOnly(sim.snapshot().bins[1]!.want)!
    const at = PAINTS.indexOf(paint)
    place(sim, 'dip', 0, 2)
    place(sim, 'fork', 1, 2)
    // New pieces come set to the first colour asked for; step them if this order asks for another first.
    while (piece(sim, 0, 2)!.setting !== at) tapPiece(sim, 0, 2)
    while (piece(sim, 1, 2)!.setting !== at) tapPiece(sim, 1, 2)
    // Everything the fork turns right meets a sieve that lets only small ones on.
    place(sim, 'sieve', 2, 3)
    return sim
  }

  it('a bin that wants a colour is content once the machine gives it only that colour', () => {
    const sim = build([])
    let contentSeen = false
    const names: string[] = []
    for (let i = 0; i < 900; i++) {
      sim.step()
      for (const e of sim.observe().events) names.push(e.name)
      if (sim.snapshot().bins[1]!.content) contentSeen = true
    }
    expect(names).toContain('bin-right')
    expect(contentSeen).toBe(true)
  })

  it('finishing the order fires the orders hook, and the next order is harder', () => {
    const sim = build(['orders'])
    const names: string[] = []
    for (let i = 0; i < 1800 && !names.includes('hook:orders'); i++) {
      sim.step()
      for (const e of sim.observe().events) names.push(e.kind === 'hook' ? `hook:${e.name}` : e.name)
    }
    expect(names).toContain('order-met')
    expect(names).toContain('hook:orders')
    const snap = sim.snapshot()
    expect(snap.level).toBe(2)
    expect(snap.orders).toBe(1)
    expect(snap.bins.filter((b) => b.want).length).toBe(3)
    // A fresh order starts with empty windows, so nothing is content yet.
    expect(snap.bins.every((b) => b.recent.length === 0 && !b.content)).toBe(true)
    expect(sim.observe().signature.endsWith('/0')).toBe(true)
  })

  it('without the hook the same machine meets the order once and nothing follows', () => {
    const sim = build([])
    const names = collect(sim, 1800)
    expect(names).toContain('order-met')
    expect(names.filter((n) => n.startsWith('hook:'))).toEqual([])
    expect(names.filter((n) => n === 'order-met')).toHaveLength(1)
    expect(sim.snapshot().level).toBe(1)
    expect(sim.snapshot().orders).toBeNull()
    expect(sim.observe().features.order).toBe(1)
  })

  it('a bin only counts marbles that match what it wants', () => {
    expect(matches({ color: 'red' }, { color: 'red', size: 3 })).toBe(true)
    expect(matches({ color: 'red', size: 1 }, { color: 'red', size: 3 })).toBe(false)
    expect(matches({ size: 3 }, { color: 'blue', size: 3 })).toBe(true)
  })
})

describe('seeds, hints, and the hooks list', () => {
  it('the same seed and script give the same signature; different seeds lay out different bags', () => {
    const script = (seedValue: number) => {
      const sim = start({ seed: seedValue })
      place(sim, 'dip', 0, 2)
      place(sim, 'fork', 1, 2)
      run(sim, 500)
      return sim
    }
    expect(script(5).observe().signature).toBe(script(5).observe().signature)
    expect(JSON.stringify(script(5).snapshot())).toBe(JSON.stringify(script(5).snapshot()))
    const bags = new Set(Array.from({ length: 12 }, (_, i) => JSON.stringify(start({ seed: i + 1 }).snapshot().bag)))
    expect(bags.size).toBeGreaterThan(6)
  })

  it('an empty hooks list means no hook events and no hook behaviour', () => {
    const sim = start({ hooks: [] })
    place(sim, 'dip', 0, 2)
    place(sim, 'fork', 1, 2)
    const names = collect(sim, 1500)
    expect(names.filter((n) => n.startsWith('hook:'))).toEqual([])
    expect(sim.snapshot().orders).toBeNull()
    expect(sim.snapshot().level).toBe(1)
  })

  it('shows a hint after a quiet spell only when hints are on, and a touch clears it', () => {
    const on = start({ hints: true })
    const off = start({ hints: false })
    run(on, 20)
    expect(on.snapshot().hint).toBeNull()
    run(on, 200)
    run(off, 220)
    expect(on.snapshot().hint).not.toBeNull()
    expect(off.snapshot().hint).toBeNull()
    on.pointer({ id: 1, phase: 'up', x: 0, y: 0 })
    expect(on.snapshot().hint).toBeNull()
  })

  it('reports affordances as top-left rectangles that centre on the tray slots and pieces', () => {
    const sim = start()
    place(sim, 'bell', 2, 2)
    const list = sim.affordances()
    const slot = centre(trayRect(0))
    expect(list.some((a) => Math.abs(a.x + a.w / 2 - slot.x) < 1e-9 && Math.abs(a.y + a.h / 2 - slot.y) < 1e-9)).toBe(true)
    const cell = cellRect(2, 2)
    expect(list.some((a) => a.kind === 'tap' && a.x === cell.x && a.y === cell.y)).toBe(true)
  })
})

describe('the meta', () => {
  it('declares an honest signature bound', () => {
    // 4 chain classes x 3 spreads x 3 content counts.
    expect(meta.signatureBound).toBe(4 * 3 * 3)
  })

  it('names its objective features, and every feature is observed', () => {
    expect(meta.features.filter((f) => f.objective).map((f) => f.name)).toEqual(['purity', 'content'])
    const observed = Object.keys(start().observe().features)
    for (const f of meta.features) expect(observed).toContain(f.name)
  })
})
