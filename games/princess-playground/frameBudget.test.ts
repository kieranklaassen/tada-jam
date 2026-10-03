import { describe, expect, it } from 'vitest'
import { LONGEST_FRAME_S } from './config'
import { AFTER, forecast } from './forecast'
import { Game, type Cue } from './game'
import { MAX_GRAINS } from './grains'
import type { Guidance } from './guidance'
import { STEP, seeded } from './motion'
import { layout, rideOf } from './rides'
import { freshWorld } from './save'
import { NEXT_AT, endingBeats } from './scenes'
import { FRIEND_IDS } from './world'

// The frame budget, counted and never timed raw: how much work one frame may
// ask of the game, in the heaviest play a child can make. A count holds on
// any machine; a raw timing fails whenever a shared runner is preempted.

const IDLE: Guidance = { glow: 1, demo: 0.5, demoIndex: 0 }

describe('the work of one frame', () => {
  it('never plays more fixed steps than the longest frame holds, however long the display took', () => {
    const game = new Game({ ...freshWorld(null), shown: ['little-asks'] }, 1)
    const most = Math.ceil(LONGEST_FRAME_S / STEP) + 1
    for (const dt of [1 / 120, 1 / 60, 1 / 30, LONGEST_FRAME_S]) {
      for (let i = 0; i < 60; i++) {
        const before = game.play.time
        game.step(dt, IDLE)
        const steps = Math.round((game.play.time - before) / STEP)
        expect(steps).toBeLessThanOrEqual(most)
      }
    }
  })

  it('in the heaviest play (everyone tapped and carried as fast as a hand can, slams and tosses) stays inside its counts', () => {
    const random = seeded(99)
    const game = new Game(freshWorld(5), 3)
    let knocks = 0, tosses = 0, mostCues = 0, mostGrains = 0, mostRiders = 0, sandCues = 0, frames = 0
    for (let t = 0; t < 90; t += 1 / 60) {
      // A touch every tenth of a second: faster than any child.
      // Hands off for six seconds in every fifteen, so that a ride can end and its scene play.
      if (Math.round(t * 60) % 6 === 0 && t % 15 <= 9) {
        const id = FRIEND_IDS[Math.floor(random() * 4)], roll = random()
        if (game.play.held) game.dragEnd()
        else if (roll < 0.7) {
          game.press({ kind: 'friend', id })
          game.tap()
        } else if (roll < 0.85) {
          game.press({ kind: 'friend', id })
          game.dragStart()
          game.dragTo({ x: (random() - 0.5) * 8, z: -1 }, null)
        } else game.press({ kind: 'sand', x: (random() - 0.5) * 10, z: 2.2 })
      }
      if (t % 15 > 9 && game.play.held) game.dragEnd()
      game.step(1 / 60, IDLE)
      frames += 1
      const cues: Cue[] = game.takeCues()
      mostCues = Math.max(mostCues, cues.length)
      sandCues += cues.filter((cue) => cue.type !== 'voice').length
      mostGrains = Math.max(mostGrains, game.grains.flying)
      mostRiders = Math.max(mostRiders, game.play.arrangement.left.length + game.play.arrangement.right.length)
      for (const cue of cues) if (cue.type === 'bite') knocks += 1
      if (game.play.bodies.pim.mode === 'air' || game.play.bodies.mog.mode === 'air') tosses += 1
    }
    // The heavy moments did happen.
    expect(knocks).toBeGreaterThan(20)
    expect(tosses).toBeGreaterThan(20)
    expect(mostRiders).toBeGreaterThanOrEqual(3)
    // And they stayed inside the counts: a handful of sounds and marks a frame, a fixed pool of grains.
    expect(mostCues).toBeLessThanOrEqual(24)
    expect(mostGrains).toBeLessThanOrEqual(MAX_GRAINS)
    // The sand's canvas is sent to the card at most once a frame, and only in a frame that marked it.
    expect(sandCues / frames).toBeLessThan(1)
  }, 30_000)

  it('a showing, a ride and its ending stay inside the same counts, the frame a scene starts included', () => {
    const game = new Game(freshWorld(null), 1)
    let mostCues = 0, scenes = 0, wasScene = false
    const play = (seconds: number) => {
      for (let t = 0; t < seconds; t += 1 / 60) {
        game.step(1 / 60, IDLE)
        mostCues = Math.max(mostCues, game.takeCues().length)
        if (game.sceneRunning && !wasScene) scenes += 1
        wasScene = game.sceneRunning
      }
    }
    play(5)
    game.press({ kind: 'friend', id: 'bo' })
    game.tap()
    play(12)
    // Both scenes played: the first showing, and the ending of the ride Bo ended.
    expect(scenes).toBe(2)
    expect(game.world.state.finished).toBe(true)
    expect(mostCues).toBeLessThanOrEqual(24)
  })

  it('reading a scene ahead is a bounded piece of work, done once when the scene starts', () => {
    const game = new Game({ ...freshWorld(null), shown: ['little-asks'], arrangement: layout(rideOf('big-asks', 0)) }, 1)
    game.play.settleTo(layout(rideOf('big-asks', 0)))
    const before = game.play.time
    const ops = forecast(game.play, game.world.arrangement, (director) => endingBeats(director, 'bo', []))
    // The twin was played, not the playground itself.
    expect(game.play.time).toBe(before)
    // It plays the scene and then at most a few seconds more: about ten seconds of game time at the very most.
    expect(NEXT_AT + AFTER).toBeLessThanOrEqual(10)
    expect(ops.length).toBeLessThanOrEqual(24)
    // Its quickest of five replays is far inside one frame's budget; the quickest, because a shared runner stalls the others.
    let quickest = Infinity
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now()
      forecast(game.play, game.world.arrangement, (director) => endingBeats(director, 'bo', []))
      quickest = Math.min(quickest, performance.now() - t0)
    }
    expect(quickest).toBeLessThan(12)
  })
})
