import { describe, expect, it, vi } from 'vitest'
import { WorkshopController, type Projector } from './controller'
import { onTurntable, TURNTABLE } from './layout'
import type { Part, PartKind } from './parts'
import { deserialize } from './state'

// Feet stay on what a critter stands on: a lump asleep on the turntable with
// its legs splayed, and critters walking, greeting, and winding up on the
// bench, never push a foot through the turntable or the bench.

const topDown: Projector = {
  toScreen(x, _y, z, out) {
    out.x = x * 10 + 600
    out.y = z * 10 + 400
    return true
  },
  toPlane(screen, _height, out) {
    out.x = (screen.x - 600) / 10
    out.z = (screen.y - 400) / 10
    return true
  },
  scaleAt: () => 10,
}

const parts = (...kinds: PartKind[]): Part[] => kinds.map((kind) => ({ kind, hue: 0 }))
const six = (kind: PartKind) => parts(kind, kind, kind, kind, kind, kind)

function lowestFootGap(workshop: WorkshopController): number {
  let worst = Infinity
  for (const critter of workshop.critters) {
    if (critter.gone || critter.mode === 'carried') continue
    const floor = onTurntable(critter.mover, 1) ? TURNTABLE.height : 0
    for (let i = 0; i < critter.world.feetCount; i++) worst = Math.min(worst, critter.world.feet[i * 3 + 1] - floor)
  }
  return worst
}

describe('feet', () => {
  it.each(['legStub', 'legLong'] as const)('a lump asleep on six %s legs rests them on the turntable, not through it', (kind) => {
    const state = deserialize({ v: 1, sleeper: { id: 1, hue: 1, parts: [...six(kind), ...parts('eye')], x: 0, z: 0, heading: 0, seed: 5 }, awake: [], tray: {}, nextHue: 2, nextId: 2 })
    const workshop = new WorkshopController(state, { save: vi.fn() })
    workshop.setProjector(topDown)
    let worst = Infinity
    for (let t = 0; t < 12; t += 1 / 60) {
      workshop.step(1 / 60)
      worst = Math.min(worst, lowestFootGap(workshop))
    }
    expect(worst).toBeGreaterThan(-0.05)
  })

  it('walking critters of every build keep their feet on the bench', () => {
    const state = deserialize({
      v: 1,
      sleeper: null,
      awake: [
        { id: 1, hue: 0, parts: [...six('legStub'), ...parts('eye', 'eye')], x: -30, z: 14, heading: 0.6, seed: 17 },
        { id: 2, hue: 2, parts: parts('legLong', 'legLong', 'tailCurl', 'earFlop', 'earFlop', 'eye'), x: 6, z: 14, heading: -1.2, seed: 29 },
        { id: 3, hue: 1, parts: parts('legLong', 'legLong', 'legLong', 'legLong', 'head', 'horn', 'horn', 'tailLong'), x: -36, z: -14, heading: 2.2, seed: 43 },
        { id: 4, hue: 0, parts: parts('legLong', 'eye', 'eye', 'eye'), x: 6, z: -14, heading: 1, seed: 61 },
      ],
      tray: {},
      nextHue: 2,
      nextId: 5,
    })
    const workshop = new WorkshopController(state, { save: vi.fn() })
    workshop.setProjector(topDown)
    let worst = Infinity
    for (let t = 0; t < 40; t += 1 / 60) {
      workshop.step(1 / 60)
      worst = Math.min(worst, lowestFootGap(workshop))
    }
    expect(worst).toBeGreaterThan(-0.05)
  })
})
