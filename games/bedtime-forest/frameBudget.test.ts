import { describe, expect, it } from 'vitest'
import { ForestController, type Projector } from './controller'
import { ANIMAL_KEYS } from './layout'
import { defaultForest } from './state'

// Frame budget for the controller's CPU side. The busiest moment the forest
// simulates is every animal awake and moving while the child carries one
// around. A busy CI runner stalls random frames, not the same frame in every
// replay, so each frame's minimum across seeded replays is its real cost.

const FRAME = 1 / 60
const REPLAYS = 7
const FRAMES = 240

const projector: Projector = {
  toScreen(x, y, z, out) {
    out.x = 600 + x * 4
    out.y = 400 + z * 4 - y * 4
    return true
  },
  toPlane(sx, sy, height, out) {
    out.x = (sx - 600) / 4
    out.z = (sy - 400) / 4 + height
    return true
  },
}

function carryFrames(): { times: number[]; heldFrames: number; modes: Set<string> } {
  const forest = new ForestController(defaultForest(), { save: () => {}, childAge: 5, seed: 7 })
  forest.setProjector(projector)
  for (let i = 0; i < 60; i++) forest.step(FRAME)
  const owl = forest.creatures[ANIMAL_KEYS.indexOf('owl')]
  const from = { x: 0, y: 0 }
  projector.toScreen(owl.x, owl.y + owl.spec.size * 0.45, owl.z, from)
  forest.pointerDown(1, from, 16)
  const times: number[] = []
  const modes = new Set<string>()
  let heldFrames = 0
  for (let i = 0; i < FRAMES; i++) {
    forest.pointerMove(1, { x: 600 + Math.cos(i / 25) * 180, y: 430 + Math.sin(i / 31) * 110 })
    const start = performance.now()
    forest.step(FRAME)
    times.push(performance.now() - start)
    if (owl.mode === 'held') heldFrames += 1
    for (const creature of forest.creatures) if (creature !== owl) modes.add(creature.mode)
  }
  forest.pointerUp(1, from, 5000)
  return { times, heldFrames, modes }
}

describe('frame budget', () => {
  it('carrying an animal while the others roam costs the controller under 0.1 ms a frame on average and never 1 ms', () => {
    carryFrames()
    const runs = Array.from({ length: REPLAYS }, carryFrames)
    for (const run of runs) {
      expect(run.times, 'replays line up frame for frame').toHaveLength(FRAMES)
      expect(run.heldFrames, 'the owl was carried the whole time').toBe(FRAMES)
      expect([...run.modes].some((mode) => mode !== 'asleep'), 'the others were awake').toBe(true)
    }
    const perFrame = runs[0].times.map((_, i) => Math.min(...runs.map((run) => run.times[i])))
    const average = perFrame.reduce((a, b) => a + b, 0) / perFrame.length
    const worst = Math.max(...perFrame)
    console.log(`carry: average of per-frame minimums ${average.toFixed(3)} ms, worst ${worst.toFixed(3)} ms`)
    expect(average).toBeLessThan(0.1)
    expect(worst).toBeLessThan(1)
  })
})
