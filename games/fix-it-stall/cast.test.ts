import { describe, expect, it } from 'vitest'
import { Bench } from './bench'
import { Cast, WINDOW_SIZE } from './cast'
import { asBuilt } from './gadgets'
import { freshStall } from './save'
import { AT_BENCH, AT_WINDOW, OWNER, STAGE, WAITING, type P } from './stage'

const mid = (box: { x: number; y: number; w: number; h: number }): P => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })
const tap = (bench: Bench, at: P) => { bench.press(at); bench.lift(at, 'tap') }
const run = (bench: Bench, cast: Cast, seconds: number) => { for (let i = 0; i < Math.round(seconds * 60); i++) { bench.step(1 / 60); cast.step(1 / 60, bench) } }

describe('the cast', () => {
  it('stands a customer at the bench and one at the window, further off', () => {
    const bench = new Bench(freshStall(null)), cast = new Cast(3, bench)
    const places = cast.places(1)
    expect(places.owner.at).toEqual(AT_BENCH)
    expect(places.waiting.at).toEqual(AT_WINDOW)
    expect(places.waiting.size).toBe(WINDOW_SIZE)
    expect(places.owner.size).toBe(1)
    expect(places.leaving).toBeNull()
    expect(cast.owner.who).toBe(bench.stall.job.who)
    expect(cast.waiting.who).toBe(bench.stall.next.who)
  })

  it('when the customers change over, each moves up one place and keeps its own rig', () => {
    const bench = new Bench(freshStall(null)), cast = new Cast(3, bench)
    run(bench, cast, 0.5)
    const owner = cast.owner, waiting = cast.waiting
    tap(bench, mid(WAITING))
    run(bench, cast, 0.2)
    expect(cast.leaving).toBe(owner)
    expect(cast.owner).toBe(waiting)
    expect(cast.waiting).not.toBe(waiting)
    expect(cast.waiting.who).toBe(bench.stall.next.who)
    // Half way: one is on its way off down the lane, one on its way to the bench, one stepping up from outside.
    const places = cast.places(0.5)
    expect(places.leaving!.at.x).toBeLessThan(AT_BENCH.x)
    expect(places.owner.at.x).toBeGreaterThan(AT_BENCH.x)
    expect(places.owner.at.x).toBeLessThan(AT_WINDOW.x)
    expect(places.waiting.at.x).toBeGreaterThan(AT_WINDOW.x)
    expect(cast.places(0).waiting.at.x).toBeGreaterThan(STAGE.w)
    run(bench, cast, 2)
    expect(cast.leaving).toBeNull()
    expect(cast.owner).toBe(waiting)
  })

  it('a pop startles everyone on screen, each in its own way; a poke only the one poked', () => {
    const bench = new Bench(freshStall(null)), cast = new Cast(3, bench)
    cast.mark([{ type: 'pop', at: { x: 0, y: 0 } }])
    run(bench, cast, 0.3)
    expect(cast.raccoon.whiskers.x).toBeGreaterThan(0.2)
    const moved = (c: typeof cast.owner) => Math.max(...Object.values(c.pose).map(Math.abs))
    expect(moved(cast.owner)).toBeGreaterThan(0.1)
    expect(moved(cast.waiting)).toBeGreaterThan(0.1)
    const quiet = new Cast(3, new Bench(freshStall(null)))
    quiet.mark([{ type: 'poke', who: 'oldHand' }])
    expect(quiet.raccoon.doing).not.toBeNull()
    expect(quiet.raccoon.whiskers.v).toBe(0)
  })

  it('on load a customer whose gadget was handed back stands as that reaction left it', () => {
    const fresh = freshStall(null)
    const bench = new Bench({ ...fresh, finished: true, job: { ...fresh.job, who: 'owl', circuit: asBuilt('lamp') }, next: { ...fresh.next, who: 'moth' } })
    const cast = new Cast(3, bench)
    expect(bench.show.act).not.toBeNull()
    expect(Math.max(...Object.values(cast.owner.pose).map(Math.abs))).toBeGreaterThan(0)
    expect(mid(OWNER).x).toBeCloseTo(AT_BENCH.x, 0)
  })
})
