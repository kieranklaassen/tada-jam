import type Matter from 'matter-js'
import { describe, expect, it } from 'vitest'
import { Game, STEP } from './model'
import { TIERS } from './quality'

// Frame budget, counted rather than timed so it holds on a busy CI runner
// (docs/solutions/test-failures/frame-budget-tests-that-hold-on-a-shared-ci-runner.md).
// A frame's physics cost is its 120 Hz steps times the contact pairs and awake
// bodies each step solves. Secured foundations are what keep a tall tower
// cheap: settled buildings turn static, so the work stays flat as it grows.

type Counts = { frames: number; maxSteps: number; maxPairs: number; maxAwake: number }

function count(game: Game, frames: number, into: Counts, act: (frame: number) => void = () => {}): void {
  for (let frame = 0; frame < frames; frame++) {
    act(frame)
    game.advance(1000 / 60)
    into.frames += 1
    into.maxSteps = Math.max(into.maxSteps, game.lastSteps)
    into.maxPairs = Math.max(into.maxPairs, game.engine.pairs.list.filter((pair: Matter.Pair) => pair.isActive).length)
    into.maxAwake = Math.max(into.maxAwake, game.engine.world.bodies.filter((body) => !body.isStatic && !body.isSleeping).length)
  }
}

/** A child stacking fast: every delivery is aimed near the middle and dropped at once. */
function buildTower(seed: number) {
  const game = new Game(seed)
  const offsets = [0, 8, -8, 16, -16, 0, 24, -24]
  let delivered = 0
  game.onEvent = (event) => {
    if (event.type !== 'spawn') return
    delivered += 1
    game.aim(offsets[delivered % offsets.length])
    game.drop()
  }
  game.aim(0)
  game.drop()
  return game
}

describe('frame budget', () => {
  it('a twenty-storey tower and a collapse stay within a flat physics budget', () => {
    const game = buildTower(4)
    const build: Counts = { frames: 0, maxSteps: 0, maxPairs: 0, maxAwake: 0 }
    count(game, 60 * 80, build)
    // The heavy moment happened: a tall street, most of it locked into foundations.
    expect(game.placed, 'buildings settled on the tower').toBeGreaterThanOrEqual(16)
    expect(game.secured, 'buildings locked into foundations').toBeGreaterThanOrEqual(14)
    expect(game.maxHeight, 'tower height in cells').toBeGreaterThanOrEqual(20)

    // Then the worst of play: buildings thrown at the edges, knocked off, and braced with scaffolding.
    const collapse: Counts = { frames: 0, maxSteps: 0, maxPairs: 0, maxAwake: 0 }
    let lost = 0
    game.onEvent = (event) => {
      if (event.type === 'lost') lost += 1
      if (event.type === 'spawn') { game.aim(lost % 2 ? 176 : -176); game.drop() }
    }
    game.aim(176)
    game.drop()
    count(game, 60 * 20, collapse, (frame) => { if (frame % 45 === 0) game.glue() })
    expect(lost, 'buildings knocked off the street').toBeGreaterThanOrEqual(1)

    for (const counts of [build, collapse]) {
      expect(counts.maxSteps, 'fixed physics steps in one 60 Hz frame').toBe(2)
      expect(counts.maxPairs, 'most contact pairs solved in one step').toBeLessThanOrEqual(32)
      expect(counts.maxAwake, 'most moving bodies in one step').toBeLessThanOrEqual(10)
    }
    game.dispose()
  })

  it('a slow frame catches up at most the tier allows, so it never spirals', () => {
    for (const tier of TIERS) {
      const game = new Game(9)
      game.advance(6 * STEP, false, tier.maxSteps)
      expect(game.lastSteps, `steps for a 1/20 s frame at ${tier.maxSteps}`).toBe(Math.min(6, tier.maxSteps))
      game.advance(500, false, tier.maxSteps)
      expect(game.lastSteps, `steps for a 0.5 s frame at ${tier.maxSteps}`).toBe(tier.maxSteps)
      game.advance(1000 / 60, false, tier.maxSteps)
      expect(game.lastSteps, 'the next 60 Hz frame is back to normal').toBeLessThanOrEqual(3)
      game.dispose()
    }
  })
})
