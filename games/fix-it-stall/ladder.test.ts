import { describe, expect, it } from 'vitest'
import { Bench } from './bench'
import { boardOf } from './board'
import { removeLead } from './circuit'
import { asBuilt } from './gadgets'
import { suggest } from './ladder'
import { freshStall, type Stall } from './save'
import { HELD, HELD_AT_WINDOW, HUNG, inBox, lidBox, OWNER, padAt, probeGrip, WAITING, type P } from './stage'

const stallWith = (): Stall => {
  const fresh = freshStall(null)
  return { ...fresh, job: { ...fresh.job, who: 'owl', circuit: removeLead(asBuilt('lamp'), 0), open: false, missed: false, ticket: null } }
}
const tap = (bench: Bench, at: P) => { bench.press(at); bench.lift(at, 'tap') }
const drag = (bench: Bench, from: P, to: P) => { bench.press(from); bench.move({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }); bench.move(to); bench.lift(to, 'end') }
const [linkA, linkB] = boardOf('lamp').linkSocket

describe('one obvious want in every scene', () => {
  it('a gadget held out shut: the hand taps it, and that opens it', () => {
    const bench = new Bench(stallWith())
    const hint = suggest(bench)
    expect(hint.drag).toBe(false)
    expect(inBox(hint.from, HELD)).toBe(true)
    tap(bench, hint.from)
    expect(bench.stall.job.open).toBe(true)
  })

  it('a gadget open and not running: the test lamp is shown going to the cell, which mends nothing', () => {
    const bench = new Bench(stallWith())
    tap(bench, suggest(bench).from)
    const hint = suggest(bench)
    expect(hint.drag).toBe(true)
    expect(hint.from).toEqual(probeGrip(bench.live, 0))
    const cell = bench.live.parts.find((p) => p.kind === 'cell')!
    expect(hint.to).toEqual(padAt(bench.live, cell.b))
    // Doing what the hand showed changes nothing about whether the gadget runs.
    drag(bench, hint.from, hint.to)
    expect(bench.stall.job.circuit.probe[0]).toBe(cell.b)
    expect(bench.running).toBe(false)
    // Then the other clip, to the cell's other end; then no more is shown than what can be touched.
    const second = suggest(bench)
    expect(second.to).toEqual(padAt(bench.live, cell.a))
    drag(bench, second.from, second.to)
    expect(suggest(bench).drag).toBe(false)
  })

  it('a gadget that runs on the mat: the hand takes it by its lid to its owner, and that hands it back', () => {
    const bench = new Bench(stallWith())
    tap(bench, suggest(bench).from)
    drag(bench, padAt(bench.live, linkA), padAt(bench.live, linkB))
    const hint = suggest(bench)
    expect(hint.drag).toBe(true)
    expect(inBox(hint.from, lidBox(bench.live))).toBe(true)
    expect(inBox(hint.to, OWNER)).toBe(true)
    drag(bench, hint.from, hint.to)
    expect(bench.stall.finished).toBe(true)
  })

  it('a finished cycle: the hand taps the customer who waits, and that customer comes', () => {
    const bench = new Bench({ ...stallWith(), finished: true })
    const hint = suggest(bench)
    expect(inBox(hint.from, HELD_AT_WINDOW)).toBe(true)
    expect(inBox(hint.from, WAITING)).toBe(true)
    const waiting = bench.stall.next
    tap(bench, hint.from)
    expect(bench.stall.job).toEqual(waiting)
  })

  it('the sign on the mat: only the way back is marked', () => {
    const bench = new Bench({ ...stallWith(), onMat: 'sign' })
    const hint = suggest(bench)
    expect(inBox(hint.from, HUNG)).toBe(true)
    expect(hint.drag).toBe(false)
  })
})
