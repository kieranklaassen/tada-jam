// template: cartridge/quality.test.ts v3
import { describe, expect, it } from 'vitest'
import { GOVERNOR, TIERS } from './config'
import { LOWEST_TIER, PERF_FRAMES, PerfRing, TierGovernor, startingTier, tierOverride } from './quality'

// Every test feeds the governor counted frames with made-up intervals: nothing
// here waits on a clock, so it holds on a busy runner
// (docs/solutions/test-failures/frame-budget-tests-that-hold-on-a-shared-ci-runner.md).

const FRAME = 1000 / 60
const WINDOW = GOVERNOR.windowFrames
const GOOD = GOVERNOR.goodWindowsToRaise
const LIGHT = GOVERNOR.workBudgetMs / 4
const HEAVY = GOVERNOR.workBudgetMs * 1.5

/** Feed `frames` frames of one interval and one amount of work. */
function feed(governor: TierGovernor, frames: number, intervalMs: number, workMs = LIGHT): void {
  for (let i = 0; i < frames; i++) governor.sample(intervalMs, workMs)
}

describe('tiers', () => {
  it('come from the config module, counted from 0 as full quality', () => {
    expect(TIERS.length).toBeGreaterThanOrEqual(2)
    expect(LOWEST_TIER).toBe(TIERS.length - 1)
    expect(new TierGovernor(0).settings).toBe(TIERS[0])
    expect(new TierGovernor(LOWEST_TIER).settings).toBe(TIERS[LOWEST_TIER])
    expect(new TierGovernor(99).tier).toBe(LOWEST_TIER)
    expect(TIERS[0].dpr).toBeLessThanOrEqual(2)
    for (let i = 1; i < TIERS.length; i++) expect(TIERS[i].dpr).toBeLessThanOrEqual(TIERS[i - 1].dpr)
  })

  it('?tier=N pins a tier, anything else is automatic', () => {
    expect(tierOverride('?tier=1')).toBe(1)
    expect(tierOverride('?chrome=0&tier=99')).toBe(LOWEST_TIER)
    expect(tierOverride('?tier=')).toBeNull()
    expect(tierOverride('?tier=abc')).toBeNull()
    expect(tierOverride('')).toBeNull()
  })

  it('touch devices start one tier down', () => {
    expect(startingTier(true)).toBe(1)
    expect(startingTier(false)).toBe(0)
  })
})

describe('TierGovernor', () => {
  it('steps down on sustained slow frames: steady judder, one frame in five missed', () => {
    const governor = new TierGovernor(0)
    for (let i = 0; i < WINDOW * 4; i++) governor.sample(i % 5 === 4 ? FRAME * 2 : FRAME, LIGHT)
    expect(governor.tier).toBe(1)
    expect(governor.settings).toBe(TIERS[1])
  })

  it('a single long frame changes nothing', () => {
    const governor = new TierGovernor(0)
    feed(governor, WINDOW * 2, FRAME)
    governor.sample(300, 250)
    feed(governor, WINDOW * 4, FRAME)
    expect(governor.tier).toBe(0)
  })

  it('steps up only after sustained fast frames with light work', () => {
    const governor = new TierGovernor(1)
    feed(governor, WINDOW * (GOOD - 1), FRAME)
    expect(governor.tier, 'not before the clean stretch is complete').toBe(1)
    feed(governor, WINDOW * 2, FRAME)
    expect(governor.tier).toBe(0)
  })

  it('does not step up while the work is heavy, however even the frames', () => {
    const heavy = new TierGovernor(1)
    feed(heavy, WINDOW * 60, FRAME, HEAVY)
    expect(heavy.tier).toBe(1)
    // A few heavy frames in every window block the climb too, even when the average is light.
    const spiky = new TierGovernor(1)
    for (let i = 0; i < WINDOW * 40; i++) spiky.sample(FRAME, i % 5 === 4 ? HEAVY : LIGHT)
    expect(spiky.tier).toBe(1)
  })

  it('a window far off the pace drops two tiers at once', () => {
    const governor = new TierGovernor(0)
    let changes = 0
    for (let i = 0; i < WINDOW * 2 && governor.tier === 0; i++) if (governor.sample(GOVERNOR.farOffAverageMs + 11, 20)) changes += 1
    expect(governor.tier).toBe(Math.min(2, LOWEST_TIER))
    expect(changes).toBe(1)
  })

  it('very slow frames reach the lowest tier within seconds of game time', () => {
    const governor = new TierGovernor(0)
    let seconds = 0
    while (governor.tier < LOWEST_TIER && seconds < 30) {
      governor.sample(400, 380)
      seconds += 0.4
    }
    expect(governor.tier).toBe(LOWEST_TIER)
    expect(seconds).toBeLessThan(8)
  })

  it('an upgrade that fails is taken back at once and becomes a ceiling for the session', () => {
    const governor = new TierGovernor(1)
    let frames = 0
    while (governor.tier === 1 && frames < WINDOW * 20) {
      governor.sample(FRAME, LIGHT)
      frames += 1
    }
    expect(governor.tier).toBe(0)
    let slow = 0
    while (governor.tier === 0 && slow < 200) {
      governor.sample(GOVERNOR.droppedFrameMs + 2, LIGHT)
      slow += 1
    }
    expect(governor.tier).toBe(1)
    expect(slow, 'frames spent at the failed tier').toBeLessThanOrEqual(GOVERNOR.probationSettleFrames + GOVERNOR.probationWindowFrames + 1)
    expect(governor.ceiling).toBe(1)
    feed(governor, WINDOW * 60, FRAME)
    expect(governor.tier).toBe(1)
  })

  it('a starting ceiling is never climbed past, and a pin ignores it', () => {
    const capped = new TierGovernor(1, false, 1)
    feed(capped, WINDOW * 40, FRAME)
    expect(capped.tier).toBe(1)
    expect(new TierGovernor(0, true, 1).tier).toBe(0)
  })

  it('ignores stalls, and a pinned tier holds until released', () => {
    const governor = new TierGovernor(0)
    expect(governor.sample(GOVERNOR.stallMs + 1, 1)).toBe(false)
    feed(governor, WINDOW * 4, GOVERNOR.stallMs + 1)
    expect(governor.tier).toBe(0)
    governor.force(LOWEST_TIER)
    feed(governor, WINDOW * 20, FRAME)
    expect(governor.tier).toBe(LOWEST_TIER)
    governor.force(null)
    feed(governor, WINDOW * (GOOD + 2), FRAME)
    expect(governor.tier).toBe(LOWEST_TIER - 1)
  })
})

describe('PerfRing', () => {
  it('keeps the last 600 samples in order', () => {
    const ring = new PerfRing()
    for (let i = 0; i < PERF_FRAMES + 25; i++) ring.push(i)
    const ordered = ring.ordered()
    expect(ordered).toHaveLength(PERF_FRAMES)
    expect(ordered[0]).toBe(25)
    expect(ordered.at(-1)).toBe(PERF_FRAMES + 24)
    ring.reset()
    expect(ring.ordered()).toEqual([])
  })
})
