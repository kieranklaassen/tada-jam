import { describe, expect, it } from 'vitest'
import { STEP } from './claw'
import type { Game } from './game'
import { gamePicture } from './gamePicture'
import { newGame } from './gameScenes'
import { drawsOf } from './picture'
import { sortAll, tap, watch } from './play'
import { newWorld, startCycle, type World } from './world'

// The frame budget, counted and not timed, so it holds on a busy runner
// (docs/solutions/test-failures/frame-budget-tests-that-hold-on-a-shared-ci-runner.md).
// A frame of the game is its fixed steps and the picture it hands the stage.
// The stage's cost is its draws, and the picture says how many those are.

const DRAW_BUDGET = 80
/** The most fixed steps one 60 Hz frame plays. */
const STEPS_A_FRAME = Math.ceil(1 / 60 / STEP)

type Count = { frames: number; mostDraws: number; mostToys: number; mostGobblers: number; scenes: number }

/** Plays frames at 60 a second, counting what each hands the stage. */
function play(game: Game, seconds: number, into: Count): void {
  const guidance = { glow: 1, demo: 0.5, demoIndex: 0 }
  for (let frame = 0; frame < Math.round(seconds * 60); frame++) {
    game.advance(1 / 60)
    const picture = gamePicture(game, guidance)
    into.frames++
    into.mostDraws = Math.max(into.mostDraws, drawsOf(picture))
    into.mostToys = Math.max(into.mostToys, picture.toys.length)
    into.mostGobblers = Math.max(into.mostGobblers, picture.gobblers.length)
    if (game.scene) into.scenes++
  }
}

describe('the frame budget', () => {
  it('plays at most two fixed steps in a frame', () => {
    expect(STEPS_A_FRAME).toBeLessThanOrEqual(2)
  })

  it('stays under the draw budget in the heaviest moments: the widest load, three crews, every scene', () => {
    const game = newGame({ ...newWorld(null), position: 'three-ways-wide', finished: false, crates: [], cycle: startCycle('three-ways-wide', 3, false) } as World)
    const count: Count = { frames: 0, mostDraws: 0, mostToys: 0, mostGobblers: 0, scenes: 0 }
    play(game, 2, count)
    for (let sort = 0; sort < 2; sort++) {
      sortAll(game)
      play(game, 1, count)
      // The tip-out: the crew that leaves, the crew that comes and the next one waiting are all on stage at once.
      game.point({ target: { on: 'ledge', which: 0 }, x: 0, z: -9 }, true); game.lift()
      play(game, 9, count)
    }
    sortAll(game)
    play(game, 9, count)
    // The ending, the crates, and the delivery of the next widest load with its crews hopping down.
    expect(game.world.finished).toBe(true)
    expect(game.crates.length).toBeGreaterThan(0)
    play(game, 2, count)
    tap(game, { on: 'ledge', which: 0 }, 0.3)
    play(game, 10, count)
    watch(game)

    // The heavy moments happened.
    expect(count.mostToys).toBeGreaterThanOrEqual(9 + 3)
    expect(count.mostGobblers).toBeGreaterThanOrEqual(6)
    expect(count.scenes).toBeGreaterThan(60 * 8)
    expect(count.mostDraws).toBeLessThan(DRAW_BUDGET)
  }, 60000)
})
