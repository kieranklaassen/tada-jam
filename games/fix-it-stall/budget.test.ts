import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Bench } from './bench'
import { BenchView } from './benchView'
import { boardOf } from './board'
import { Cast } from './cast'
import { ODD_KINDS, removeLead } from './circuit'
import { LADDER } from './config'
import { asBuilt } from './gadgets'
import { IdleLadder } from './guidance'
import { layOut } from './jobs'
import { DOORSTEP, passing, sag, WASHING } from './lane'
import { suggest } from './ladder'
import { freshStall, type Stall } from './save'
import { WORK } from './solve'
import { HUNG, oddPlace, OWNER, OWNER_HANDS, padAt, PRACTICE, RADIO, TOASTER, TRAY_KINDS, trayPlace, WAITING, type P } from './stage'

// The frame budget, counted and not timed, so it holds on a busy runner. Two
// things cost: solving the circuit, and drawing. A frame that only draws
// solves nothing; a touch solves a bounded number of times; and a frame draws
// a bounded number of figures with one full-surface stamp and no more.

/** A 2D context that only counts what is asked of it. */
function recorder(counts: { calls: number; whole: number }, surface: { w: number; h: number }) {
  const gradient = { addColorStop() {} }
  const target: Record<string, unknown> = {}
  return new Proxy(target, {
    get(_t, name: string) {
      if (name in target) return target[name]
      if (name === 'createRadialGradient' || name === 'createLinearGradient') return () => gradient
      if (name === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
      if (name === 'measureText') return () => ({ width: 12 })
      return (...args: unknown[]) => {
        if (name === 'fill' || name === 'stroke' || name === 'fillRect' || name === 'strokeRect' || name === 'drawImage' || name === 'fillText') counts.calls++
        if (name === 'drawImage') {
          const image = args[0] as { width: number; height: number }
          // The whole of a surface-sized image, drawn whole: three arguments, or a destination as large as the surface.
          if (image.width >= surface.w && image.height >= surface.h && (args.length === 3 || (args.length === 9 && (args[4] as number) >= surface.h))) counts.whole++
        }
      }
    },
    set(_t, name: string, value) { target[name] = value; return true },
  }) as unknown as CanvasRenderingContext2D
}

const WIDTH = 1180, HEIGHT = 820, DPR = 2
const counts = { calls: 0, whole: 0 }
const real = (globalThis as { document?: unknown }).document

beforeAll(() => {
  const off = { calls: 0, whole: 0 }
  ;(globalThis as { document?: unknown }).document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => recorder(off, { w: WIDTH * DPR, h: HEIGHT * DPR }) }),
  }
})
afterAll(() => { (globalThis as { document?: unknown }).document = real })

const mid = (box: { x: number; y: number; w: number; h: number }): P => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })
const tap = (bench: Bench, at: P) => { bench.press(at); bench.lift(at, 'tap') }
const drag = (bench: Bench, from: P, to: P) => { bench.press(from); bench.move({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }); bench.move(to); bench.lift(to, 'end') }

/** The busiest board a gadget can be: a robot with all three of its parts running, extra lamps on, and leads everywhere. */
function busy(): Bench {
  const fresh = freshStall(null)
  const stall: Stall = { ...fresh, job: { ...fresh.job, who: 'magpie', circuit: removeLead(asBuilt('robot'), 0), open: false, ticket: { part: 'lamp', count: 3 } } }
  const bench = new Bench(stall)
  tap(bench, mid(OWNER))
  const board = boardOf('robot'), pad = (i: number) => padAt(bench.live, i)
  drag(bench, pad(board.linkSocket[0]), pad(board.linkSocket[1]))
  // Leads between every pair of rail pads, as a child who clips everything to everything would leave it.
  const rails = board.pads.flatMap((p, i) => (p.y === 0 && p.x >= 4 ? [i] : []))
  for (let i = 0; i + 1 < rails.length; i++) for (let n = 0; n < 4; n++) drag(bench, pad(rails[i]), pad(rails[i + 1]))
  drag(bench, mid(trayPlace(1)), { x: 725, y: 642 })
  drag(bench, mid(trayPlace(3)), { x: 635, y: 713 })
  return bench
}

describe('the frame budget', () => {
  it('a frame that only draws solves nothing', () => {
    const bench = busy()
    expect(bench.running).toBe(true)
    expect(bench.live.leads.length).toBeGreaterThanOrEqual(8)
    const before = WORK.solves
    for (let frame = 0; frame < 600; frame++) bench.step(1 / 60)
    expect(WORK.solves - before).toBe(0)
  })

  it('a touch solves a bounded number of times: a lead, a lever, a part carried and put down', () => {
    const bench = busy()
    const board = boardOf('robot'), pad = (i: number) => padAt(bench.live, i)
    const cost = (act: () => void) => { const before = WORK.solves; act(); return WORK.solves - before }
    expect(cost(() => drag(bench, pad(board.rungs[0][0]), pad(board.rungs[2][0])))).toBeLessThanOrEqual(8)
    expect(cost(() => tap(bench, bench.midOf(bench.live.parts.findIndex((p) => p.kind === 'switch'))))).toBeLessThanOrEqual(8)
    expect(cost(() => drag(bench, bench.midOf(bench.live.parts.findIndex((p) => p.kind === 'buzzer')), mid(trayPlace(3))))).toBeLessThanOrEqual(10)
    // Handing back tries the gadget, and the customer who comes is laid out: both once, at a touch, never in a frame.
    expect(cost(() => tap(bench, mid(OWNER_HANDS)))).toBeLessThanOrEqual(40)
  })

  it('laying out a job is bounded at every position', () => {
    for (const position of LADDER) {
      let worst = 0
      for (let seed = 0; seed < 60; seed++) {
        const before = WORK.solves
        layOut(position, (seed * 2654435761) >>> 0)
        worst = Math.max(worst, WORK.solves - before)
      }
      // The last two positions try every lead and every swap on each pair of breaks they consider.
      expect(worst, position).toBeLessThanOrEqual(position === 'double' || position === 'ticket' ? 12000 : 40)
    }
  })

  it('a frame draws a bounded number of figures, with one full-surface stamp and no more', () => {
    const bench = busy(), cast = new Cast(5, bench), view = new BenchView()
    const ladder = new IdleLadder(0)
    const context = recorder(counts, { w: WIDTH * DPR, h: HEIGHT * DPR })
    // One frame to build the still layer and the sprites; they are not counted.
    view.draw(context, WIDTH, HEIGHT, DPR, bench, cast, null, null, 0)
    let worstCalls = 0, worstFigures = 0
    const frame = (seconds: number) => {
      counts.calls = counts.whole = 0
      bench.step(1 / 60)
      cast.step(1 / 60, bench)
      view.step(1 / 60)
      const guidance = ladder.update(seconds)
      const figures = view.draw(context, WIDTH, HEIGHT, DPR, bench, cast, guidance, suggest(bench), seconds)
      expect(counts.whole).toBe(1)
      worstCalls = Math.max(worstCalls, counts.calls)
      worstFigures = Math.max(worstFigures, figures)
    }
    // The busy board at rest, with the ladder's rings and hand coming up over it.
    for (let i = 0; i < 600; i++) frame(i / 60)
    // A short with every effect at once, then the hand-back and its scene, then the change of customers.
    const cell = bench.live.parts.find((p) => p.kind === 'cell')!
    drag(bench, padAt(bench.live, cell.a), padAt(bench.live, cell.b))
    view.show(bench.marks); cast.mark(bench.marks)
    for (let i = 0; i < 60; i++) frame(10 + i / 60)
    tap(bench, bench.midOf(bench.live.parts.findIndex((p) => p.kind === 'cell')))
    tap(bench, mid(OWNER_HANDS))
    for (let i = 0; i < 400; i++) frame(11 + i / 60)
    tap(bench, mid(WAITING))
    for (let i = 0; i < 120; i++) frame(18 + i / 60)
    tap(bench, mid(HUNG))
    for (let i = 0; i < 60; i++) frame(20 + i / 60)
    // The stall as it is first seen, with no board open and everything that only answers a flick flicked at once, again
    // and again: every place of the tray, every odd, her practice board, the toaster, the radio, the washing, the
    // pigeon, the bare wood and the wall; and whoever passes, touched as it goes by.
    const rest = new Bench(freshStall(null)), folk = new Cast(5, rest), other = new BenchView()
    other.draw(context, WIDTH, HEIGHT, DPR, rest, folk, null, null, 0)
    for (let i = 0; i < 60 * 100; i++) {
      if (i % 45 === 0) {
        for (let place = 0; place < TRAY_KINDS.length; place++) tap(rest, mid(trayPlace(place)))
        for (const what of ODD_KINDS) tap(rest, oddPlace(what))
        for (const box of [PRACTICE, TOASTER, RADIO]) tap(rest, mid(box))
        for (const item of WASHING) tap(rest, { x: item.x, y: sag(item.x) + item.drop / 2 })
        tap(rest, { x: DOORSTEP.x, y: DOORSTEP.y - 14 })
        tap(rest, { x: 400, y: 240 })
        tap(rest, { x: 470, y: 150 })
        const now = passing(rest.lane.seconds)
        if (now) rest.lane.touch({ on: 'passer', who: now.who })
        other.show(rest.marks); folk.mark(rest.marks)
        rest.marks.length = 0
      }
      counts.calls = counts.whole = 0
      rest.step(1 / 60)
      folk.step(1 / 60, rest)
      other.step(1 / 60)
      const figures = other.draw(context, WIDTH, HEIGHT, DPR, rest, folk, null, null, i / 60)
      expect(counts.whole).toBe(1)
      worstCalls = Math.max(worstCalls, counts.calls)
      worstFigures = Math.max(worstFigures, figures)
    }
    expect(rest.open).toBe(false)
    // Paint calls a frame, all told: fills, strokes and stamps. And the figures the view reports to the overlay.
    expect(worstCalls).toBeLessThanOrEqual(700)
    expect(worstFigures).toBeLessThanOrEqual(80)
    expect(worstFigures).toBeGreaterThan(20)
  })
})
