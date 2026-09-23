import { describe, expect, it } from 'vitest'
import { TableController } from './controller'
import { BAG } from './layout'
import { toWorld2 } from './physics3d'
import { defaultTable } from './state'

// Frame-time budget for the CPU side of a frame. The heaviest thing the
// game simulates is a spill: ten stones tumbling onto the table at once.
// On an iPad the whole frame has about 12 ms, and the GPU needs most of it,
// so the controller (physics, guidance, rules) must stay a small slice even
// on a CI runner. The budget is loose enough not to flake on a busy runner
// and tight enough to catch a collider or substep regression, which cost
// several times this.

const FRAME = 1 / 60

function spillFrameTimes(frames: number): number[] {
  const table = new TableController({ ...defaultTable(4), seats: [true, true, false, false, true] }, { save: () => {} })
  table.setProjector({ toScreen: (v) => toWorld2(v), toPlane: (screen) => screen })
  for (let i = 0; i < 30; i++) table.step(FRAME)
  table.pointerDown(1, { x: BAG.x, y: BAG.y }, 10)
  table.pointerUp(1, { x: BAG.x, y: BAG.y }, 90)
  const times: number[] = []
  for (let i = 0; i < frames; i++) {
    const start = performance.now()
    table.step(FRAME)
    times.push(performance.now() - start)
  }
  return times
}

describe('frame budget', () => {
  it('a ten-stone spill costs the controller under 0.75 ms per frame on average', () => {
    spillFrameTimes(60)
    // A busy runner stalls random frames, not the same frame in every run, so
    // each frame's minimum across runs is its real cost with the noise removed.
    const runs = Array.from({ length: 7 }, () => spillFrameTimes(180))
    const perFrame = runs[0].map((_, i) => Math.min(...runs.map((run) => run[i])))
    const average = perFrame.reduce((a, b) => a + b, 0) / perFrame.length
    console.log(`spill: average of per-frame minimums ${average.toFixed(3)} ms, worst frame ${Math.max(...perFrame).toFixed(2)} ms`)
    expect(average).toBeLessThan(0.75)
  })
})
