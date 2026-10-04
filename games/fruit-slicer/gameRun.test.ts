import { describe, expect, it } from 'vitest'
import { FLIGHT_SECONDS } from './carry'
import { freshGame } from './cycle'
import { CURL_FLIGHT, CURL_LIFE } from './fx'
import { GameRun, RUN_GAP, RUN_STEP, SNACK_SECONDS, SWING } from './gameRun'
import { CAST } from './orders'
import { IdleLadder } from './guidance'
import { WHOLE } from './measure'
import { tinParts } from './orders'
import { deserialize, serialize } from './save'
import { servedShow } from './scenes'
import { headOf } from './seats'
import { tinAt } from './moves'
import { BOARD, CRATE, DOG, LANE_H, PX, QUEUE, ROLLER, SHELF_BOX, TIN, WINDOW, X0, laneTop, shown, type Box, type Point } from './stage'
import { eaten, inTin, marksOf, onLane } from './world'

const NEAR = laneTop(0) + LANE_H / 2
const fresh = () => new GameRun(freshGame(null), 11)
const BUSY = { glow: 0, demo: null, demoIndex: -1 }
const mid = (box: Box): Point => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })
const TIN_AT: Point = { x: X0 + 40, y: TIN.bodyY + TIN.bodyH / 2 }
/** A finger down at `from`, across to `to` in steps over `seconds`, and up. */
function drag(run: GameRun, from: Point, to: Point, seconds = 0.5, steps = 6): void {
  run.press(from, 0)
  for (let i = 1; i <= steps; i++) run.move({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }, (seconds * i) / steps)
  run.lift()
}
const ids = (run: GameRun) => run.takeSounds().map((sound) => sound.id)
const stored = (run: GameRun) => JSON.parse(JSON.stringify(serialize(run.game)))
/** A run with a customer at the window and the fruit on the near lane cut `off` points from its order. */
function withCut(off = 0): { run: GameRun; ordered: number } {
  const run = fresh()
  run.tap(mid(QUEUE[0]))
  const ordered = tinParts(run.game.window!)[0]
  const x = X0 + (ordered + off) * PX
  drag(run, { x, y: BOARD.y - 30 }, { x, y: NEAR + 40 })
  run.takeSounds()
  run.dirty = run.urgent = false
  return { run, ordered }
}
/** Carries the first piece on the near lane to the tin, slowly. */
const serve = (run: GameRun) => drag(run, { x: X0 + 30, y: NEAR }, TIN_AT, 1.5)
const play = (run: GameRun, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) run.step(1 / 60)
}

describe('the touch', () => {
  it('is answered when the finger lands: the blade with its ring on bare wood, a piece taken hold of with its own pop', () => {
    const run = fresh()
    run.press({ x: 300, y: BOARD.y - 30 })
    expect(run.blade).toEqual({ x: 300, y: BOARD.y - 30 })
    expect(ids(run)).toEqual(['ring'])
    run.end()
    run.press({ x: X0 + 100, y: NEAR })
    expect(run.blade).toBeNull()
    expect(ids(run)).toEqual(['pick'])
    expect(run.frame(0, BUSY).carried).toMatchObject({ dx: 0, dy: 0 })
    expect(run.dirty).toBe(false)
  })

  it('cuts where the stroke crosses, at once, and sounds the cuts of one stroke one after another', () => {
    const run = fresh()
    run.tap(mid(CRATE))
    run.takeSounds()
    const x = X0 + 300 * PX
    run.press({ x, y: BOARD.y - 20 })
    run.move({ x, y: SHELF_BOX.y - 5 })
    const cuts = run.takeSounds().filter((sound) => sound.id === 'thwack' || sound.id === 'snick')
    expect(cuts.map((sound) => sound.delay)).toEqual([0, RUN_GAP])
    // One stroke is a run of rising notes: the second cut is of a piece no shorter, and still sounds a step higher.
    expect(cuts[1].length).toBeCloseTo(cuts[0].length! * RUN_STEP)
    // The next stroke starts again at the pitch of its own piece.
    run.end()
    run.press({ x: x + 200, y: BOARD.y - 20 })
    run.move({ x: x + 200, y: NEAR - 10 })
    const again = run.takeSounds().filter((sound) => sound.id === 'thwack' || sound.id === 'snick')
    expect(again).toHaveLength(1)
    // It is the right-hand part of the first cut, whichever fruit lay there: its whole length less the 300 points cut off.
    expect(Object.values(WHOLE).map((whole) => whole - 300)).toContain(again[0].length)
    expect(run.dirty).toBe(true)
    expect(run.fx.shakes.length).toBeGreaterThanOrEqual(2)
  })

  it('whistles and flaps the awning when a swing crosses nothing, and ticks as the hairline passes a piece end', () => {
    const run = fresh()
    drag(run, { x: 300, y: BOARD.y - 30 }, { x: 300 + SWING + 40, y: BOARD.y - 24 })
    expect(ids(run)).toEqual(['ring', 'whistle'])
    expect(run.fx.flapSpeed).toBeGreaterThan(0)
    // However short the stroke: one that crosses nothing whistles.
    run.fx = { ...run.fx, flapSpeed: 0 }
    drag(run, { x: 300, y: BOARD.y - 30 }, { x: 314, y: BOARD.y - 28 })
    expect(ids(run)).toEqual(['ring', 'whistle'])
    expect(run.fx.flapSpeed).toBeGreaterThan(0)
    const end = X0 + WHOLE.long * PX
    run.press({ x: end - 30, y: BOARD.y - 30 })
    run.move({ x: end + 30, y: BOARD.y - 30 })
    expect(ids(run)).toEqual(['ring', 'tickEnd'])
  })

  it('pokes on a tap: a fruit that was only held, the crate, the dog, the roller on its hook', () => {
    const run = fresh()
    run.press({ x: X0 + 50, y: NEAR })
    run.tap({ x: X0 + 50, y: NEAR })
    expect(ids(run)).toEqual(['pick', 'quiver'])
    run.tap(mid(CRATE))
    expect(ids(run)).toEqual(['thump'])
    run.tap(mid(DOG))
    expect(ids(run)).toEqual(['bark'])
    expect(run.dog.react).toBe('bark')
    run.press(mid(ROLLER))
    run.tap(mid(ROLLER))
    expect(ids(run)).toEqual(['tickEnd', 'tickEnd'])
  })
})

describe('carrying', () => {
  it('leaves the piece where it was in the game until it is let go: a put-away in the middle of a carry loses nothing', () => {
    const { run } = withCut()
    const before = stored(run)
    run.press({ x: X0 + 30, y: NEAR }, 0)
    run.move({ x: X0 + 200, y: 300 }, 0.3)
    expect(stored(run)).toEqual(before)
    expect(run.frame(0, BUSY).carried).toMatchObject({ dx: 170, dy: 300 - NEAR })
    run.end()
    expect(stored(run)).toEqual(before)
    expect(run.dirty).toBe(false)
  })

  it('lays a piece in the tin when it is let go there: the tin springs open and the first showing starts, once', () => {
    const { run } = withCut(-400)
    serve(run)
    expect(ids(run)).toEqual(['pick', 'spring', 'slide'])
    expect(run.game.world.tinOpen).toBe(true)
    expect(run.playing).toBe(true)
    expect(run.frame(0, BUSY).show).toMatchObject({ kind: 'showing' })
    expect(run.urgent).toBe(true)
    expect(run.game.shown).toEqual(['half'])
  })

  it('flings a piece that is let go at speed, and the dog catches it', () => {
    const { run } = withCut(-400)
    const from = { x: X0 + 30, y: NEAR }, to = mid(DOG)
    run.press(from, 0)
    const lift = { x: 500, y: NEAR }
    run.move(lift, 0.1)
    // The last stretch of the carry is fast and aimed so that the throw comes down on the dog.
    const v = { x: (to.x - 600) / FLIGHT_SECONDS, y: (to.y - 620) / FLIGHT_SECONDS }
    run.move({ x: 600 - v.x * 0.02, y: 620 - v.y * 0.02 }, 0.5)
    run.move({ x: 600, y: 620 }, 0.52)
    run.move({ x: 600, y: 620 }, 0.52)
    const piecesBefore = run.game.world.pieces.length
    run.lift()
    expect(run.game.world.pieces.length).toBe(piecesBefore - 1)
    expect(ids(run)).toContain('catch')
  })

  it('gives a piece to the thing it is let go over, however fast the hand was going: a child who hurries to the tin has reached the tin', () => {
    const { run } = withCut(-400)
    run.press({ x: X0 + 30, y: NEAR }, 0)
    run.move({ x: TIN_AT.x, y: TIN_AT.y + 80 }, 0.2)
    run.move(TIN_AT, 0.22)
    run.lift()
    expect(inTin(run.game.world, 0)).toHaveLength(1)
    expect(ids(run)).toContain('spring')
  })

  it('carries the roller and rolls what it is let go over: parts into a fruit when an order is waiting', () => {
    const run = fresh()
    run.tap(mid(QUEUE[0]))
    run.takeSounds()
    drag(run, mid(ROLLER), { x: X0 + 100, y: NEAR })
    expect(ids(run)).toEqual(['tickEnd', 'ticks'])
    expect(marksOf(onLane(run.game.world, 0)[0])).toHaveLength(run.game.window!.shares[0].den - 1)
    expect(run.frame(0, BUSY).roller).toBeNull()
  })
})

describe('the scenes', () => {
  it('the serve: everything it saves is in the game before its first beat, and is asked to be saved at once', () => {
    const { run } = withCut()
    serve(run)
    expect(run.game.finished).toBe(true)
    expect(run.game.position).toBe('quarter')
    expect(eaten(run.game.world)).toHaveLength(1)
    expect(inTin(run.game.world, 0)).toEqual([])
    expect(run.dirty && run.urgent).toBe(true)
    expect(run.playing).toBe(true)
    const atStart = stored(run)
    play(run, 12)
    expect(run.playing).toBe(false)
    expect(stored(run)).toEqual(atStart)
  })

  it('the serve: a touch ends it and is then an ordinary touch, and what is left is the pose a load finds', () => {
    const { run } = withCut()
    serve(run)
    // The first showing comes first, since this is the first order of its kind; the lid follows it.
    play(run, 3.5)
    const during = run.frame(0, BUSY)
    expect(during.show!.lid).toBeGreaterThan(0)
    expect(during.ending).not.toBeNull()
    run.takeSounds()
    run.press({ x: 700, y: BOARD.y - 30 })
    expect(run.playing).toBe(false)
    expect(ids(run)).toEqual(['ring'])
    expect(run.blade).not.toBeNull()
    const after = run.frame(0, BUSY)
    expect(after.show).toEqual(servedShow(1))
    expect(after.ending).toBeNull()
    // Opened again from what was saved, the same pose, and nothing playing.
    const back = new GameRun(deserialize(stored(run)), 5)
    expect(back.playing).toBe(false)
    expect(back.frame(0, BUSY).show).toEqual(servedShow(1))
    expect(back.takeSounds()).toEqual([])
  })

  it('the serve: makes its sounds as its beats start, and none it had not reached when a touch ends it', () => {
    const { run } = withCut()
    serve(run)
    run.takeSounds()
    play(run, 3.2)
    expect(ids(run)).toEqual(['rule', 'rule', 'click'])
    // The gulp, the taste and everything after are never heard: the touch came first.
    run.press({ x: 700, y: BOARD.y - 30 })
    expect(ids(run)).toEqual(['ring'])
  })

  it('the first showing: the idea is marked as shown before its first beat, and it plays once', () => {
    const { run } = withCut(-400)
    serve(run)
    const atStart = stored(run)
    expect(atStart.shown).toEqual(['half'])
    expect(atStart.tinOpen).toBe(true)
    play(run, 6)
    expect(run.playing).toBe(false)
    expect(stored(run)).toEqual(atStart)
    expect(run.frame(0, BUSY).show).toBeNull()
    const back = new GameRun(deserialize(atStart), 5)
    expect(back.playing).toBe(false)
    expect(back.game.shown).toEqual(['half'])
  })

  it('the first showing and the serve play as one scene when the first piece fits', () => {
    const { run } = withCut()
    serve(run)
    const first = run.frame(0, BUSY).show!
    expect(first.kind).toBe('serve')
    play(run, 0.3)
    expect(run.frame(0, BUSY).show!.drop).toBeGreaterThan(0)
    expect(run.frame(0, BUSY).show!.lid).toBe(0)
    play(run, 4)
    expect(run.frame(0, BUSY).show!.lid).toBeGreaterThan(0)
  })

  it('the glider: the fruit, the pelican and what it ate have left the game before its first beat, and the window is empty on load', () => {
    const run = fresh()
    run.tap(mid(QUEUE[0]))
    expect(run.game.window!.who).toBe('pelican')
    drag(run, { x: X0 + 100, y: NEAR }, mid(WINDOW), 1.5)
    expect(run.game).toMatchObject({ window: null, finished: false, world: { tinOpen: false } })
    expect(run.game.world.pieces).toEqual([])
    expect(run.playing).toBe(true)
    expect(run.dirty && run.urgent).toBe(true)
    const frame = run.frame(0, BUSY)
    expect(frame.show).toMatchObject({ kind: 'glider' })
    expect(frame.leaving).toMatchObject({ whom: 'window', customer: { who: 'pelican' } })
    // It leaves with the fruit it was fed across its beak, which was the long one that lay on the board, whatever is on its ticket.
    expect(frame.leaving!.fruit).toBe('long')
    expect(run.happened.map((event) => event.kind)).not.toContain('ate')
    const atStart = stored(run)
    play(run, 6)
    expect(stored(run)).toEqual(atStart)
    expect(run.frame(0, BUSY)).toMatchObject({ show: null, leaving: null, window: null })
    expect(new GameRun(deserialize(atStart), 5).frame(0, BUSY)).toMatchObject({ show: null, window: null })
  })
})

describe('the glider from the queue', () => {
  it('plays all the same for a pelican that waits: the queue and the stream are in the game before its first beat, and the window is as it was', () => {
    const run = fresh()
    run.tap(mid(QUEUE[0]))
    expect(run.game.queue[1].who).toBe('pelican')
    const window = run.game.window
    const seed = run.game.seed
    drag(run, { x: X0 + 100, y: NEAR }, mid(QUEUE[1]), 1.5)
    expect(run.playing).toBe(true)
    expect(run.frame(0, BUSY)).toMatchObject({ show: { kind: 'glider' }, leaving: { whom: 1, customer: { who: 'pelican' } } })
    expect(run.game.window).toEqual(window)
    expect(run.game.seed).not.toBe(seed)
    expect(run.game.world.pieces).toEqual([])
    expect(run.dirty && run.urgent).toBe(true)
    const atStart = stored(run)
    play(run, 6)
    expect(stored(run)).toEqual(atStart)
    expect(run.frame(0, BUSY)).toMatchObject({ show: null, leaving: null })
    expect(run.window).not.toBeNull()
  })
})

describe('the cast in the run', () => {
  it('steps up when called, and the one who joins the queue arrives', () => {
    const run = fresh()
    expect(run.window).toBeNull()
    run.tap(mid(QUEUE[1]))
    expect(ids(run)).toEqual(['babble', 'step'])
    expect(run.window).toMatchObject({ react: 'step' })
    expect(run.queue[1]).toMatchObject({ react: 'step' })
    expect(run.queue[0].react).toBeNull()
    expect(run.urgent).toBe(true)
  })

  it('makes its own noise at a poke: the voice goes with its place in the cast', () => {
    const run = fresh()
    run.takeSounds()
    const who = run.game.queue[1].who
    run.tap(mid(QUEUE[1]))
    const noise = run.takeSounds().find((sound) => sound.id === 'babble')!
    expect(noise.count).toBe(CAST.indexOf(who))
  })

  it('flinches as a piece of another fruit is flicked out of its tin to the dog', () => {
    const run = fresh()
    run.tap(mid(QUEUE[0]))
    play(run, 2)
    // A slice through the crate tumbles out one fruit of each kind.
    drag(run, { x: CRATE.x - 20, y: CRATE.y + 60 }, { x: CRATE.x + CRATE.w + 10, y: CRATE.y + 60 }, 0.1)
    play(run, 2)
    const ordered = run.game.window!.fruit
    const wrong = shown(run.game.world, tinAt(run.game)).find(({ piece }) => piece.fruit !== ordered)!
    run.takeSounds()
    drag(run, { x: wrong.box.x + 12, y: wrong.box.y + wrong.box.h / 2 }, TIN_AT, 1.5)
    expect(run.game.world.pieces.some((piece) => piece.id === wrong.piece.id)).toBe(false)
    expect(run.window).toMatchObject({ react: 'flinch' })
    expect(ids(run)).toContain('babble')
    expect(run.fx.fx.some((one) => one.kind === 'fly')).toBe(true)
  })

  it('flinches at a poke, loses a tuft to the blade, and is rolled flat by the roller', () => {
    const run = fresh()
    run.tap(mid(QUEUE[0]))
    run.tap(mid(WINDOW))
    expect(run.window!.react).toBe('flinch')
    drag(run, { x: QUEUE[1].x + 10, y: QUEUE[1].y + 60 }, { x: QUEUE[1].x + 200, y: QUEUE[1].y + 70 })
    expect(run.queue[1].react).toBe('snip')
    drag(run, mid(ROLLER), mid(WINDOW))
    expect(run.window!.react).toBe('flat')
    drag(run, mid(ROLLER), mid(DOG))
    expect(run.dog.react).toBe('ironed')
  })

  it('has the dog watch whatever the finger holds, and eat what drops to it when it gets there', () => {
    const run = fresh()
    run.press({ x: 200, y: BOARD.y - 30 })
    expect(run.frame(0, BUSY).dog.eyeX).toBeLessThan(-0.5)
    run.end()
    for (let i = 0; i < 8 && !run.fx.fx.some((one) => one.kind === 'fly'); i++) run.tap(mid(CRATE))
    expect(run.dog.react).toBeNull()
    play(run, 0.5)
    expect(run.dog.react).toBe('cheeks')
  })
})

describe('the comedy', () => {
  it('has every eye in the stall follow the finger while it is down', () => {
    const run = fresh()
    expect(run.frame(0, BUSY).finger).toBeNull()
    run.press({ x: 300, y: BOARD.y - 30 })
    expect(run.frame(0, BUSY).finger).toEqual({ x: 300, y: BOARD.y - 30 })
    run.end()
    expect(run.frame(0, BUSY).finger).toBeNull()
  })

  it('has everyone else stare when something absurd happens to one of them, with the marks a comic puts round a head', () => {
    const run = fresh()
    run.tap(mid(QUEUE[0]))
    play(run, 2.5)
    // A swipe across the one at the window: it loses its tuft and sweats, and the two who wait stare.
    drag(run, { x: WINDOW.x + 40, y: WINDOW.y + 20 }, { x: WINDOW.x + 260, y: WINDOW.y + 220 }, 0.1)
    expect(run.window).toMatchObject({ react: 'snip' })
    expect(run.queue.map((actor) => actor.react)).toEqual(['gawp', 'gawp'])
    const marks = run.fx.fx.map((one) => one.kind)
    expect(marks).toContain('sweat')
    expect(marks.filter((kind) => kind === 'shock')).toHaveLength(2)
    // Nothing of it is in the game.
    expect(run.dirty && !run.game.finished).toBe(true)
    // One who is in the middle of something of its own goes on with that.
    play(run, 3)
    run.tap(mid(QUEUE[1]))
    expect(run.window).toMatchObject({ react: 'step' })
    drag(run, { x: QUEUE[0].x + 10, y: QUEUE[0].y + 20 }, { x: QUEUE[0].x + 200, y: QUEUE[0].y + 220 }, 0.1)
    expect(run.window).toMatchObject({ react: 'step' })
  })

  it('has a customer lick off juice that comes down on its face, in its own way, and only when it is doing nothing else', () => {
    const run = fresh()
    play(run, 0.2)
    const head = headOf(run.game.queue[0], 0)
    const drops = Array.from({ length: 40 }, (_, k) => ({ kind: 'drop' as const, x: head.x, y: head.y + k * 4, vx: 0, vy: -10, r: 5, fruit: 'long' as const, wall: true, age: 0, life: 0.5 }))
    run.queue = [{ ...run.queue[0], react: null, idle: null }, { ...run.queue[1], react: null, idle: null }]
    run.fx = { ...run.fx, fx: drops }
    run.step(1 / 60)
    expect(run.queue[0]).toMatchObject({ react: 'lick' })
    expect(run.queue[1].react).toBeNull()
  })

  it('lands a curl of peel on the dog, which looks up at it and only then turns its circle', () => {
    const run = fresh()
    // A stroke right at the end of the fruit takes off a curl.
    drag(run, { x: X0 + 6, y: BOARD.y - 20 }, { x: X0 + 6, y: NEAR + 40 }, 0.1)
    expect(run.fx.fx.some((one) => one.kind === 'curl')).toBe(true)
    play(run, CURL_FLIGHT + 0.1)
    expect(run.frame(0, BUSY).dog).toMatchObject({ eyeY: -1, spin: 0 })
    play(run, CURL_LIFE - CURL_FLIGHT + 0.2)
    expect(run.dog.react).toBe('spin')
    expect(run.fx.fx.some((one) => one.kind === 'curl')).toBe(false)
  })
})

describe('what the reading found', () => {
  it('treats a finger that comes back with no press as a finger that has landed: on a piece it takes hold, on bare wood it is the blade with its ring, and it cuts nothing on the way', () => {
    const run = fresh()
    const pieces = stored(run)
    run.takeSounds()
    // A move with no press before it, on the fruit: the fruit is taken hold of, not cut.
    run.move({ x: X0 + 200, y: NEAR }, 1)
    expect(run.blade).toBeNull()
    expect(ids(run)).toEqual(['pick'])
    expect(run.frame(0, BUSY).carried).not.toBeNull()
    run.end()
    expect(stored(run)).toEqual(pieces)
    // The same on bare wood: the blade, and its ring.
    run.move({ x: 300, y: BOARD.y - 30 }, 2)
    expect(run.blade).toEqual({ x: 300, y: BOARD.y - 30 })
    expect(ids(run)).toEqual(['ring'])
  })

  it('shows what one who waits was given in its body for a few seconds, in no state, and takes it away with whoever leaves that place', () => {
    const { run } = withCut(-300)
    const before = run.game.world.pieces.length
    drag(run, { x: X0 + 30, y: NEAR }, mid(QUEUE[1]), 1.5)
    expect(run.game.world.pieces.length).toBe(before - 1)
    const given = run.frame(0, BUSY).snacks
    expect(given).toHaveLength(1)
    expect(given[0]).toMatchObject({ whom: 1, age: 0 })
    expect(JSON.stringify(serialize(run.game))).not.toContain('snack')
    play(run, 2)
    expect(run.frame(0, BUSY).snacks).toHaveLength(1)
    play(run, SNACK_SECONDS)
    expect(run.frame(0, BUSY).snacks).toHaveLength(0)
  })

  it('feeds the one at the window past its tin: the piece flies to its mouth with a gulp, there is no lid, and what lay in the tin goes to the shelf', () => {
    const { run } = withCut(-300)
    serve(run)
    play(run, 6)
    expect(run.game.finished).toBe(false)
    const inTinBefore = inTin(run.game.world, 0).map((piece) => piece.id)
    expect(inTinBefore).toHaveLength(1)
    run.takeSounds()
    // The rest of the fruit, carried to the customer itself.
    const rest = onLane(run.game.world, 0)[0]
    drag(run, { x: X0 + rest.length * PX * 0.5 + (rest.place.on === 'board' ? rest.place.x * PX : 0), y: NEAR }, { x: WINDOW.x + 120, y: WINDOW.y + 120 }, 1.5)
    expect(run.game.finished).toBe(true)
    const heard = ids(run)
    expect(heard).toContain('gulp')
    for (const lid of ['click', 'clang', 'slide']) expect(heard).not.toContain(lid)
    expect(run.fx.fx.some((one) => one.kind === 'fly')).toBe(true)
    expect(inTin(run.game.world, 0)).toEqual([])
    expect(run.game.world.pieces.find((piece) => piece.id === inTinBefore[0])!.place.on).toBe('shelf')
    expect(run.frame(0, BUSY).ending).toMatchObject({ fed: true })
    // It lasts about three seconds, and ends in the pose a load finds.
    play(run, 3.6)
    expect(run.playing).toBe(false)
    expect(run.frame(0, BUSY).show).toEqual(servedShow(1))
  })
})

describe('after the serve', () => {
  it('counts a piece cut then as cut by eye: the tin has gone with its customer and no tin stands open', () => {
    const { run } = withCut(0)
    serve(run)
    play(run, 9)
    expect(run.game).toMatchObject({ finished: true, world: { tinOpen: true } })
    // A fresh fruit lands on the far lane, and a stroke cuts it for whoever is called next.
    run.tap(mid(CRATE))
    const far = laneTop(1) + LANE_H / 2
    drag(run, { x: X0 + 150, y: far - 60 }, { x: X0 + 150, y: far + 20 }, 0.2)
    const made = onLane(run.game.world, 1)
    expect(made).toHaveLength(2)
    for (const piece of made) expect(piece.blind).toBe(true)
  })

  it('counts a piece cut while the tin stands open and its customer waits as not cut by eye', () => {
    const { run } = withCut(-300)
    serve(run)
    play(run, 6)
    expect(run.game).toMatchObject({ finished: false, world: { tinOpen: true } })
    const before = onLane(run.game.world, 0).length
    const rest = onLane(run.game.world, 0)[0]
    const x = X0 + ((rest.place.on === 'board' ? rest.place.x : 0) + rest.length / 2) * PX
    drag(run, { x, y: NEAR - 40 }, { x, y: NEAR + 40 }, 0.2)
    const after = onLane(run.game.world, 0)
    expect(after.length).toBe(before + 1)
    expect(after.filter((piece) => !piece.blind).length).toBeGreaterThanOrEqual(2)
  })
})

describe('the leaving', () => {
  it('shows the served customer going as the next one steps up, for a second at most, and no touch waits for it', () => {
    const { run } = withCut(0)
    serve(run)
    play(run, 9)
    const served = run.game.window!
    expect(run.game.finished).toBe(true)
    expect(run.frame(0, BUSY).departing).toBeNull()
    run.tap(mid(QUEUE[1]))
    // The game has moved on at the touch: the called one is at the window, and what the served one ate is gone with it.
    const after = stored(run)
    expect(run.game.finished).toBe(false)
    expect(eaten(run.game.world)).toEqual([])
    const going = run.frame(0, BUSY).departing!
    expect(going.customer).toEqual(served)
    expect(going.actor).toMatchObject({ who: served.who, react: 'leave' })
    expect(going.lengths.length).toBeGreaterThan(0)
    // A touch in the middle of it is an ordinary touch, and the leaving goes on behind it.
    play(run, 0.2)
    run.press({ x: 300, y: BOARD.y - 30 })
    expect(run.blade).not.toBeNull()
    run.end()
    expect(run.frame(0, BUSY).departing).not.toBeNull()
    play(run, 0.85)
    expect(run.frame(0, BUSY).departing).toBeNull()
    // Nothing of it is in the game: a put-away in the middle of it loses nothing and replays nothing.
    expect(stored(run)).toEqual(after)
    expect(new GameRun(deserialize(after, null, 11), 11).frame(0, BUSY).departing).toBeNull()
  })

  it('is only for one who was served: the first to step up, and two who change places, leave nobody going', () => {
    const run = fresh()
    run.tap(mid(QUEUE[0]))
    expect(run.frame(0, BUSY).departing).toBeNull()
    run.tap(mid(QUEUE[1]))
    expect(run.happened).toContainEqual({ kind: 'called', index: 1, did: 'swapped' })
    expect(run.frame(0, BUSY).departing).toBeNull()
  })
})

describe('found as left', () => {
  it('can be put away at any instant of a stroke, a carry or a scene, and opens exactly as it was', () => {
    const { run } = withCut(-400)
    const states = [stored(run)]
    run.press({ x: X0 + 30, y: NEAR }, 0)
    for (let i = 1; i <= 6; i++) {
      run.move({ x: X0 + 30 + i * 3, y: NEAR - i * 30 }, i * 0.2)
      states.push(stored(run))
    }
    run.lift()
    for (let i = 0; i < 30; i++) {
      run.step(1 / 10)
      states.push(stored(run))
    }
    for (const state of states) expect(serialize(deserialize(state))).toEqual(state)
    expect(new Set(states.map((state) => JSON.stringify(state))).size).toBe(2)
  })

  it('replays nothing on load: no effect running, no scene, no sound waiting', () => {
    const { run } = withCut()
    serve(run)
    const back = new GameRun(deserialize(stored(run)), 5)
    expect(back.game.world).toEqual(run.game.world)
    expect(back.fx.fx).toEqual([])
    expect(back.playing).toBe(false)
    expect(back.takeSounds()).toEqual([])
    expect(back.dirty).toBe(false)
  })
})

describe('the idle ladder', () => {
  it('shows nothing while the child is busy or a scene plays, then a glow, then the hand', () => {
    const run = fresh()
    const ladder = new IdleLadder(0)
    expect(run.frame(1, ladder.update(1))).toMatchObject({ glow: 0, guide: null, hand: null })
    const glowing = run.frame(4.5, ladder.update(4.5))
    expect(glowing.glow).toBeGreaterThan(0.5)
    expect(glowing.guide).toMatchObject({ on: 'waiting' })
    expect(glowing.hand).toBeNull()
    const showing = run.frame(6.5, ladder.update(6.5))
    expect(showing.hand!.opacity).toBeGreaterThan(0.5)
    const { run: served } = withCut()
    serve(served)
    expect(served.playing).toBe(true)
    expect(served.frame(6.5, ladder.update(6.5))).toMatchObject({ glow: 0, guide: null, hand: null })
  })
})
