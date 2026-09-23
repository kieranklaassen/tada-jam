import { describe, expect, it } from 'vitest'
import { WorkshopController, type Projector } from './controller'
import { traySlot } from './layout'
import { defaultWorkshop, MAX_AWAKE } from './state'

// Frame budget for the controller's CPU side. The busiest moment the workshop
// simulates is the most awake critters it allows, each with a full set of
// parts, wandering and greeting while the child carries a part over the
// sleepy lump. A busy CI runner stalls random frames, not the same frame in
// every replay, so each frame's minimum across replays is its real cost.

const FRAME = 1 / 60
const REPLAYS = 7
const FRAMES = 240
const PX = 10

const topDown: Projector = {
  toScreen(x, _y, z, out) {
    out.x = x * PX + 600
    out.y = z * PX + 400
    return true
  },
  toPlane(screen, _height, out) {
    out.x = (screen.x - 600) / PX
    out.z = (screen.y - 400) / PX
    return true
  },
  scaleAt: () => PX,
}

function busyFrames(): { times: number[]; awake: number; modes: Set<string> } {
  const state = defaultWorkshop()
  state.awake = Array.from({ length: MAX_AWAKE }, (_, i) => ({
    id: 100 + i,
    hue: i % 4,
    parts: Array.from({ length: 6 }, (_, k) => ({ kind: k % 2 ? 'legLong' : 'legStub', hue: (i + k) % 4 })),
    x: -30 + i * 14,
    z: 18 - (i % 2) * 30,
    heading: i,
    seed: i + 1,
  })) as typeof state.awake
  const workshop = new WorkshopController(state, { save: () => {}, childAge: 5 })
  workshop.setProjector(topDown)
  for (let i = 0; i < 60; i++) workshop.step(FRAME)
  const slot = traySlot('legStub')
  workshop.pointerDown(1, { x: slot.x * PX + 600, y: slot.z * PX + 400 }, 10)
  const times: number[] = []
  const modes = new Set<string>()
  for (let i = 0; i < FRAMES; i++) {
    workshop.pointerMove(1, { x: 460 + Math.cos(i / 20) * 60, y: 370 + Math.sin(i / 27) * 50 }, 20 + i * 16)
    const start = performance.now()
    workshop.step(FRAME)
    times.push(performance.now() - start)
    for (const critter of workshop.critters) if (critter.awake) modes.add(critter.mode)
  }
  return { times, awake: workshop.critters.filter((critter) => critter.awake).length, modes }
}

describe('frame budget', () => {
  it('a full bench of wandering critters and a part carried over the lump cost the controller under 0.2 ms a frame on average and never 1 ms', () => {
    busyFrames()
    const runs = Array.from({ length: REPLAYS }, busyFrames)
    for (const run of runs) {
      expect(run.times, 'replays line up frame for frame').toHaveLength(FRAMES)
      expect(run.awake, 'every critter the bench allows was awake').toBe(MAX_AWAKE)
      expect(run.modes.has('walking'), 'the critters were wandering').toBe(true)
    }
    const perFrame = runs[0].times.map((_, i) => Math.min(...runs.map((run) => run.times[i])))
    const average = perFrame.reduce((a, b) => a + b, 0) / perFrame.length
    const worst = Math.max(...perFrame)
    console.log(`busy bench: average of per-frame minimums ${average.toFixed(3)} ms, worst ${worst.toFixed(3)} ms`)
    expect(average).toBeLessThan(0.2)
    expect(worst).toBeLessThan(1)
  })
})
