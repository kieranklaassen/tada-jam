import { describe, expect, it } from 'vitest'
import { Bench } from './bench'
import { Cast, REACH, STAND, WINDOW_SIZE } from './cast'
import { asBuilt } from './gadgets'
import { freshStall } from './save'
import { AT_BENCH, AT_WINDOW, HUNG, matAt, OWNER, padAt, STAGE, trayPlace, WAITING, type P } from './stage'

const mid = (box: { x: number; y: number; w: number; h: number }): P => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })
const tap = (bench: Bench, at: P) => { bench.press(at); bench.lift(at, 'tap') }
const run = (bench: Bench, cast: Cast, seconds: number) => { for (let i = 0; i < Math.round(seconds * 60); i++) { bench.step(1 / 60); cast.step(1 / 60, bench) } }

describe('the cast', () => {
  it('stands a customer at the bench and one at the window, further off', () => {
    const bench = new Bench(freshStall(null)), cast = new Cast(3, bench)
    const places = cast.places(1)
    // Each at its own height: a small customer stands lower, and lower still in proportion where it is drawn smaller.
    expect(places.owner.at).toEqual({ x: AT_BENCH.x, y: AT_BENCH.y + STAND[cast.owner.who] })
    expect(places.waiting.at).toEqual({ x: AT_WINDOW.x, y: AT_WINDOW.y + STAND[cast.waiting.who] * WINDOW_SIZE })
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

  it('the owner has opinions while its gadget lies open: a clip, a short, a part taken out', () => {
    const fresh = freshStall(null)
    const bench = new Bench({ ...fresh, job: { ...fresh.job, who: 'owl' }, next: { ...fresh.next, who: 'yak' } }), cast = new Cast(3, bench)
    tap(bench, mid(OWNER))
    run(bench, cast, 1)
    // A clip bites: it starts, and looks where it bit.
    cast.mark([{ type: 'bite', at: { x: 400, y: 500 } }])
    expect(cast.owner.watched).toBe('flinch')
    run(bench, cast, 0.3)
    expect(cast.owner.gaze.x).toBeLessThan(-0.3)
    cast.mark([{ type: 'lit' }])
    expect(cast.owner.watched).toBe('delight')
    cast.mark([{ type: 'out' }])
    expect(cast.owner.watched).toBe('droop')
    cast.mark([{ type: 'blow', at: { x: 400, y: 500 } }])
    expect(cast.owner.watched).toBe('wince')
    // The one who waits minds its own business, and has no opinion of somebody else's gadget.
    expect(cast.waiting.watched).toBeNull()
    // Its eyes follow the finger while it is down.
    bench.press({ x: 1000, y: 700 })
    run(bench, cast, 0.3)
    expect(cast.owner.gaze.x).toBeGreaterThan(0.3)
    bench.lift({ x: 1000, y: 700 }, 'tap')
  })

  it('the sign is nobody\'s: with it on the mat the owner has no opinion of what is clipped there', () => {
    const bench = new Bench(freshStall(null)), cast = new Cast(3, bench)
    tap(bench, mid(HUNG))
    expect(bench.stall.onMat).toBe('sign')
    run(bench, cast, 0.5)
    cast.mark([{ type: 'bite', at: { x: 400, y: 500 } }, { type: 'lit' }, { type: 'out' }])
    expect(cast.owner.watched).toBeNull()
    // A pop still makes everybody jump.
    cast.mark([{ type: 'pop', at: { x: 400, y: 500 } }])
    expect(cast.owner.fright).toBe(1)
  })

  it('the owner\'s spirits follow its gadget: down at a popped flag, up while it runs', () => {
    const fresh = freshStall(null)
    const bench = new Bench({ ...fresh, job: { ...fresh.job, who: 'cockatoo', circuit: asBuilt('lamp') }, next: { ...fresh.next, who: 'yak' } }), cast = new Cast(3, bench)
    tap(bench, mid(OWNER))
    run(bench, cast, 3)
    expect(bench.running).toBe(true)
    expect(cast.owner.mood).toBeGreaterThan(0.5)
    const cell = bench.live.parts.find((part) => part.kind === 'cell')!
    bench.press(padAt(bench.live, cell.a)); bench.move(padAt(bench.live, cell.b)); bench.lift(padAt(bench.live, cell.b), 'end')
    cast.mark(bench.marks)
    expect(bench.live.parts.some((part) => part.kind === 'cell' && part.popped)).toBe(true)
    expect(cast.owner.fright).toBe(1)
    expect(cast.raccoon.fur.x).toBe(1)
    run(bench, cast, 3)
    expect(cast.owner.mood).toBeLessThan(-0.5)
  })

  it('the old hand picks up a part laid at her side to look at it, and lets go when the finger comes for it', () => {
    const bench = new Bench(freshStall(null)), cast = new Cast(3, bench)
    tap(bench, mid(OWNER))
    // A lamp from the tray, laid in the nearest place to her.
    const place = matAt(REACH[0])
    bench.press(mid(trayPlace(1))); bench.move(place); bench.lift(place, 'end')
    expect(bench.live.loose.map((part) => part.at)).toEqual([REACH[0]])
    let seconds = 0
    while (cast.inspecting === null && seconds < 240) { run(bench, cast, 0.1); seconds += 0.1 }
    expect(cast.inspecting).toBe(REACH[0])
    // Nothing about the circuit has changed while she has it.
    expect(bench.live.loose.map((part) => part.at)).toEqual([REACH[0]])
    bench.press({ x: place.x + 30, y: place.y })
    run(bench, cast, 0.05)
    expect(cast.inspecting).toBeNull()
    expect(cast.raccoon.holds).toBeNull()
  })

  it('a customer sent away with a gadget that has not run droops in its own way as it goes', () => {
    const bench = new Bench(freshStall(null)), cast = new Cast(3, bench)
    tap(bench, mid(OWNER))
    run(bench, cast, 0.5)
    const owner = cast.owner
    tap(bench, mid(WAITING))
    expect(bench.sentAway).toBe(true)
    run(bench, cast, 0.1)
    expect(cast.leaving).toBe(owner)
    expect(owner.watched).toBe('droop')
    // One whose gadget ran walks off as its reaction left it.
    const fresh = freshStall(null)
    const done = new Bench({ ...fresh, finished: true, job: { ...fresh.job, circuit: asBuilt('lamp') } }), second = new Cast(3, done)
    tap(done, mid(WAITING))
    expect(done.sentAway).toBe(false)
    run(done, second, 0.1)
    expect(second.leaving!.watched).toBeNull()
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
