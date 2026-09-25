import { describe, expect, it } from 'vitest'
import { TableController, type Projector } from './controller'
import { BAG } from './layout'
import { LONGEST_FRAME, physicsReady, STEP, toWorld2 } from './physics3d'
import { QualityGovernor, TIERS } from './quality'
import { seededRandom } from './random'
import { defaultTable } from './state'

// The table plays the same under any clock: the same taps at the same moments
// fling, bounce and settle every stone the same way whether frames come at
// 120 Hz, 60 Hz, 30 Hz, jitter between, or a quality tier slows them. The
// intersection audit and a recorded walkthrough both rely on it.

await physicsReady()

const topDown: Projector = { toScreen: (v) => toWorld2(v), toPlane: (screen) => screen }

/** When the audit taps the bag in its opening moment, and how long it watches the spill after. */
const TAP_AT = 6.5
const WATCH = 2.6
const SETTLE = 3

type Frames = { name: string; next: () => number }

const steady = (name: string, dt: number): Frames => ({ name, next: () => dt })
const jitter = (name: string, seed: number, shortest: number, longest: number): Frames => {
  const random = seededRandom(seed)
  return { name, next: () => shortest + random() * (longest - shortest) }
}
const alternating = (name: string, lengths: number[]): Frames => {
  let i = 0
  return { name, next: () => lengths[i++ % lengths.length] }
}

const FRAMES: (() => Frames)[] = [
  () => steady('60 Hz', 1 / 60),
  () => steady('120 Hz', 1 / 120),
  () => steady('30 Hz', 1 / 30),
  () => jitter('4-33 ms', 11, 0.004, 0.033),
  // A step short of LONGEST_FRAME: the longest frame that never loses time, whatever was left over.
  () => jitter('10-41 ms', 12, 0.01, LONGEST_FRAME - STEP - 1e-4),
  () => alternating('a missed frame now and then', [1 / 60, 1 / 60, 1 / 30, 1 / 60, 0.021, 0.012]),
  // Playwright's paused clock runs animation frames on a 16 ms grid, every other one once the table rests.
  () => alternating('the audit clock', [0.016, 0.016, 0.016, 0.032]),
]

/** Where every body lies and how it turns, and what the table counts, after the opening spill under these frames. */
function openingSpill(frames: Frames, tier = 0) {
  const table = new TableController(defaultTable(4), { save: () => {}, random: seededRandom(2526) })
  table.setProjector(topDown)
  const governor = new QualityGovernor(tier)
  let elapsed = 0
  const playUntil = (moment: number) => {
    while (elapsed < moment - 1e-12) {
      const dt = Math.min(frames.next(), moment - elapsed)
      table.step(dt)
      governor.sample(dt * 1000, 1)
      elapsed += dt
    }
  }
  playUntil(TAP_AT)
  table.pointerDown(1, { x: BAG.x, y: BAG.y }, TAP_AT * 1000)
  table.pointerUp(1, { x: BAG.x, y: BAG.y }, TAP_AT * 1000 + 80)
  playUntil(TAP_AT + WATCH)
  const watched = { pieces: table.state.pieces.length, bag: table.state.bag }
  playUntil(TAP_AT + WATCH + SETTLE)
  const bodies = table.physics.poses()
  return { t: table.t, watched, pieces: table.state.pieces.length, bag: table.state.bag, spots: table.state.pieces.map((p) => [p.id, p.x, p.y]), bodies }
}

describe('the table plays the same under any clock', () => {
  const reference = openingSpill(FRAMES[0]())

  it('spills the opening story: stones out of the bag and on the table', () => {
    expect(reference.watched.pieces).toBeGreaterThan(0)
    expect(reference.pieces).toBe(reference.watched.pieces)
    expect(reference.t).toBeCloseTo(TAP_AT + WATCH + SETTLE, 9)
  })

  for (const make of FRAMES.slice(1)) {
    const frames = make()
    it(`lands every stone exactly where 60 Hz does with frames at ${frames.name}`, () => {
      expect(openingSpill(frames)).toEqual(reference)
    })
  }

  it('lands every stone exactly the same at every quality tier', () => {
    for (const [tier] of TIERS.entries()) {
      expect(openingSpill(jitter('4-33 ms', 11, 0.004, 0.033), tier), TIERS[tier].name).toEqual(reference)
    }
  })

  it('cuts short only a frame far longer than any display frame, which slows the table instead of spiralling', () => {
    const stalled = openingSpill(alternating('a stall now and then', [1 / 60, 1 / 60, 0.4, 1 / 60]))
    expect(stalled.t).toBeLessThan(reference.t)
  })
})
