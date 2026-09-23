import { describe, expect, it } from 'vitest'
import { GardenController, type Projector } from './controller'
import { WAKING_SECONDS } from './creatures'
import { defaultGarden } from './state'

// Frame-time budget for the CPU side of a frame. The heaviest garden is
// every piece on the panel, both lamps lit, beams bouncing between mirrors
// and fanning through the prism, pieces turning (so every frame re-traces a
// different path), and all four creatures awake and easing round each
// other. On an iPad the whole frame has about 12 ms and the GPU needs most
// of it, so the controller must stay a small slice even on a CI runner. The
// budget is loose enough not to flake on a busy runner and tight enough to
// catch a tracer or allocation regression, which cost several times this.

const FRAME = 1 / 60
const flat: Projector = {
  toPlane: (screen, _height, out = { x: 0, y: 0 }) => {
    out.x = screen.x
    out.y = screen.y
    return out
  },
  toScreen: (x, y) => ({ x, y }),
}

const BUSY: Record<string, [number, number, number]> = {
  lampA: [-50, 0, 0.1],
  lampB: [50, -24, 2.6],
  prism: [-26, 2, 0],
  mirror1: [0, -20, 0.8],
  mirror2: [14, 20, -0.7],
  filterR: [30, -4, 0.3],
  filterG: [-8, 12, 1.2],
  filterB: [-30, -22, 0.5],
}

function busyCost(frames: number): { average: number; worst: number; segments: number } {
  const state = defaultGarden(7)
  for (const piece of state.pieces) {
    const [x, y, angle] = BUSY[piece.id]
    Object.assign(piece, { x, y, angle, inTray: false })
  }
  const garden = new GardenController(state, { save: () => {} })
  garden.setProjector(flat)
  for (let i = 0; i < 30; i++) garden.step(FRAME)
  for (const creature of garden.creatures) {
    creature.c.phase = 'awake'
    creature.c.wokeAt = garden.t - WAKING_SECONDS[creature.c.kind] - 3
  }
  const times: number[] = []
  let segments = 0
  for (let i = 0; i < frames; i++) {
    for (const piece of garden.pieces) piece.pose.angle += 0.004
    const start = performance.now()
    garden.step(FRAME)
    times.push(performance.now() - start)
    segments = Math.max(segments, garden.beams.count)
  }
  return { average: times.reduce((a, b) => a + b, 0) / times.length, worst: Math.max(...times), segments }
}

describe('frame budget', () => {
  it('a full, busy garden costs the controller under 0.15 ms per frame on average', () => {
    busyCost(60)
    const runs = Array.from({ length: 5 }, () => busyCost(180))
    const best = Math.min(...runs.map((run) => run.average))
    console.log(`busy garden: best average ${best.toFixed(3)} ms, worst frame ${Math.max(...runs.map((run) => run.worst)).toFixed(2)} ms, up to ${runs[0].segments} beam segments`)
    expect(runs[0].segments).toBeGreaterThan(12)
    expect(best).toBeLessThan(0.15)
  })
})
