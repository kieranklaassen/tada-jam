import { describe, expect, it } from 'vitest'
import { freshGame } from './cycle'
import { IdleLadder } from './guidance'
import { WHOLE } from './measure'
import { deserialize, serialize } from './save'
import { BOARD, CRATE, DOG, LANE_H, PX, SHELF_BOX, X0, laneTop, type Point } from './stage'
import { RUN_GAP, SWING, ToyRun } from './toyRun'
import { onLane } from './world'

const NEAR = laneTop(0) + LANE_H / 2
const fresh = () => new ToyRun(freshGame(null), 11)
const NO_GUIDANCE = { glow: 0, demo: null, demoIndex: -1 }
/** A finger down at `from`, across to `to` in steps, and up. */
function stroke(run: ToyRun, from: Point, to: Point, steps = 6): void {
  run.press(from)
  for (let i = 1; i <= steps; i++) run.move({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps })
  run.lift()
}
const ids = (run: ToyRun) => run.takeSounds().map((sound) => sound.id)
const stored = (run: ToyRun) => JSON.parse(JSON.stringify(serialize(run.game)))

describe('the touch', () => {
  it('is answered when the finger lands: the blade is there, with its ring, before anything moves', () => {
    const run = fresh()
    run.press({ x: 300, y: 250 })
    expect(run.blade).toEqual({ x: 300, y: 250 })
    expect(ids(run)).toEqual(['ring'])
    expect(run.frame(0, NO_GUIDANCE).blade).toEqual({ x: 300, y: 250 })
    expect(run.dirty).toBe(false)
  })

  it('cuts where the stroke crosses, at once: the game has changed before the pieces have finished hopping', () => {
    const run = fresh()
    const x = X0 + 900 * PX
    run.press({ x, y: NEAR - 80 })
    run.move({ x, y: NEAR + 80 })
    expect(onLane(run.game.world, 0).map((piece) => piece.length)).toEqual([900, 1500])
    expect(run.dirty).toBe(true)
    expect(run.fx.shakes).toHaveLength(2)
    expect(ids(run)).toEqual(['ring', 'thwack'])
    run.lift()
    expect(run.blade).toBeNull()
    expect(ids(run)).toEqual([])
  })

  it('sounds the cuts of one long stroke one after another, each higher than a whole fruit', () => {
    const run = fresh()
    run.tap({ x: CRATE.x + 70, y: CRATE.y + 70 })
    run.takeSounds()
    const x = X0 + 300 * PX
    run.press({ x, y: BOARD.y - 20 })
    run.move({ x, y: SHELF_BOX.y - 5 })
    const cuts = run.takeSounds().filter((sound) => sound.id === 'thwack' || sound.id === 'snick')
    expect(cuts).toHaveLength(2)
    expect(cuts.map((sound) => sound.delay)).toEqual([0, RUN_GAP])
  })

  it('whistles and flaps the awning when a swing crosses nothing, and not for a twitch', () => {
    const run = fresh()
    stroke(run, { x: 300, y: 230 }, { x: 300 + SWING + 40, y: 240 })
    expect(ids(run)).toEqual(['ring', 'whistle'])
    expect(run.fx.flapSpeed).toBeGreaterThan(0)
    const twitch = fresh()
    stroke(twitch, { x: 300, y: 230 }, { x: 320, y: 232 })
    expect(ids(twitch)).toEqual(['ring'])
    expect(twitch.dirty).toBe(false)
  })

  it('ticks as the hairline passes the end of a piece', () => {
    const run = fresh()
    const end = X0 + WHOLE.long * PX
    run.press({ x: end - 30, y: 240 })
    run.move({ x: end + 30, y: 240 })
    expect(ids(run)).toEqual(['ring', 'tickEnd'])
  })

  it('pokes on a tap: the fruit quivers, the crate drops a fruit, the dog barks, and bare wood knocks', () => {
    const run = fresh()
    run.press({ x: X0 + 50, y: NEAR })
    run.tap({ x: X0 + 50, y: NEAR })
    expect(ids(run)).toEqual(['ring', 'quiver'])
    expect(run.dirty).toBe(false)
    run.tap({ x: CRATE.x + 70, y: CRATE.y + 70 })
    expect(ids(run)).toEqual(['thump'])
    expect(run.dirty).toBe(true)
    run.tap({ x: DOG.x + 70, y: DOG.y + 70 })
    expect(ids(run)).toEqual(['bark'])
    expect(run.dog.react).toBe('bark')
    run.tap({ x: X0 + 2800 * PX, y: NEAR })
    expect(ids(run)).toEqual(['tickEnd'])
  })

  it('starts a new stroke where a finger comes back after a lift: nothing is cut along the jump', () => {
    const run = fresh()
    run.press({ x: X0 + 100, y: NEAR - 80 })
    run.lift()
    run.move({ x: X0 + 100, y: NEAR + 80 })
    expect(run.game.world.pieces).toHaveLength(1)
    run.move({ x: X0 + 100, y: NEAR - 80 })
    expect(run.game.world.pieces).toHaveLength(2)
  })
})

describe('the dog in the toy', () => {
  it('watches the blade while a finger is down', () => {
    const run = fresh()
    run.press({ x: 200, y: 250 })
    const pose = run.frame(0, NO_GUIDANCE).dog
    expect(pose.eyeX).toBeLessThan(-0.5)
    run.lift()
    expect(run.frame(0, NO_GUIDANCE).dog.eyeX).toBeGreaterThan(-0.5)
  })

  it('snaps at a blade that passes, and eats what drops to it when it gets there, not before', () => {
    const run = fresh()
    stroke(run, { x: DOG.x - 30, y: DOG.y + 70 }, { x: DOG.x + 100, y: DOG.y + 80 })
    expect(run.dog.react).toBe('snap')
    // Fresh fruit until the shelf overflows: what drops off goes to the dog.
    const eater = fresh()
    for (let i = 0; i < 8 && !eater.fx.fx.some((one) => one.kind === 'fly'); i++) eater.tap({ x: CRATE.x + 70, y: CRATE.y + 70 })
    expect(eater.fx.fx.some((one) => one.kind === 'fly')).toBe(true)
    expect(eater.takeSounds().map((sound) => sound.id)).toContain('munch')
    expect(eater.dog.react).toBeNull()
    for (let i = 0; i < 30; i++) eater.step(1 / 60)
    expect(eater.dog.react).toBe('cheeks')
  })

  it('turns a circle for a curl of peel', () => {
    const run = fresh()
    stroke(run, { x: X0 + 10, y: NEAR - 80 }, { x: X0 + 10, y: NEAR + 80 })
    expect(run.game.world.pieces).toHaveLength(1)
    expect(ids(run)).toEqual(['ring', 'curl'])
    for (let i = 0; i < 40; i++) run.step(1 / 60)
    expect(run.dog.react).toBe('spin')
  })
})

describe('found as left', () => {
  it('can be put away at any instant of a stroke and opens exactly as it was: nothing is in the air', () => {
    const run = fresh()
    const x = X0 + 700 * PX
    run.press({ x, y: BOARD.y - 20 })
    const states = [stored(run)]
    for (let i = 1; i <= 10; i++) {
      run.move({ x: x + i * 4, y: BOARD.y - 20 + i * 30 })
      run.step(1 / 60)
      states.push(stored(run))
    }
    for (const state of states) expect(serialize(deserialize(state))).toEqual(state)
    // Time passing changes nothing that is saved: only the touch does.
    const before = stored(run)
    for (let i = 0; i < 120; i++) run.step(1 / 60)
    expect(stored(run)).toEqual(before)
  })

  it('replays nothing on load: a toy opened from a save has no effect running and no sound waiting', () => {
    const run = fresh()
    stroke(run, { x: X0 + 300, y: NEAR - 80 }, { x: X0 + 300, y: NEAR + 80 })
    const back = new ToyRun(deserialize(stored(run)), 5)
    expect(back.game.world).toEqual(run.game.world)
    expect(back.fx.fx).toEqual([])
    expect(back.fx.shakes).toEqual([])
    expect(back.takeSounds()).toEqual([])
    expect(back.dirty).toBe(false)
  })
})

describe('the idle ladder in the toy', () => {
  it('shows nothing while the child is busy, then a glow on the fruit, then the hand stroking across it', () => {
    const run = fresh()
    const ladder = new IdleLadder(0)
    expect(run.frame(1, ladder.update(1))).toMatchObject({ glow: 0, guide: null, hand: null })
    const glowing = run.frame(4.5, ladder.update(4.5))
    expect(glowing.glow).toBeGreaterThan(0.5)
    expect(glowing.guide).toMatchObject({ on: 'fruit' })
    expect(glowing.hand).toBeNull()
    const showing = run.frame(6.5, ladder.update(6.5))
    expect(showing.hand!.opacity).toBeGreaterThan(0.5)
    expect(showing.guide!.hand.drag).toBe(true)
    ladder.touch(7)
    expect(run.frame(7.1, ladder.update(7.1))).toMatchObject({ glow: 0, guide: null, hand: null })
  })
})
