import { describe, expect, it } from 'vitest'
import { FLIGHT_SECONDS } from './carry'
import { freshGame } from './cycle'
import { GameRun, RUN_GAP, SWING } from './gameRun'
import { IdleLadder } from './guidance'
import { WHOLE } from './measure'
import { tinParts } from './orders'
import { deserialize, serialize } from './save'
import { servedShow } from './scenes'
import { BOARD, CRATE, DOG, LANE_H, PX, QUEUE, ROLLER, SHELF_BOX, TIN, WINDOW, X0, laneTop, type Box, type Point } from './stage'
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
    expect(run.dirty).toBe(true)
    expect(run.fx.shakes.length).toBeGreaterThanOrEqual(2)
  })

  it('whistles and flaps the awning when a swing crosses nothing, and ticks as the hairline passes a piece end', () => {
    const run = fresh()
    drag(run, { x: 300, y: BOARD.y - 30 }, { x: 300 + SWING + 40, y: BOARD.y - 24 })
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
    expect(frame.leaving).toMatchObject({ who: 'pelican' })
    const atStart = stored(run)
    play(run, 6)
    expect(stored(run)).toEqual(atStart)
    expect(run.frame(0, BUSY)).toMatchObject({ show: null, leaving: null, window: null })
    expect(new GameRun(deserialize(atStart), 5).frame(0, BUSY)).toMatchObject({ show: null, window: null })
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
