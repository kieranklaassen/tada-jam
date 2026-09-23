import { describe, expect, it } from 'vitest'
import { jamPerf, PerfMonitor, Ring, RING_SIZE, startingTier, TierController, tierFeatures, tierOverride, TOP_TIER } from './perf'

function feed(controller: TierController, ms: number, seconds: number, workMs = 3): number {
  let changes = 0
  for (let t = 0; t < seconds * 1000; t += ms) if (controller.frame(ms, workMs)) changes++
  return changes
}

describe('tiers', () => {
  it('maps tiers to DPR 2, 1.5, 1.25, 1 and cuts effects on the way down', () => {
    expect([3, 2, 1, 0].map((t) => tierFeatures(t, 2).dpr)).toEqual([2, 1.5, 1.25, 1])
    expect(tierFeatures(3, 2)).toEqual({ dpr: 2, overlay: true, normalMap: true })
    expect(tierFeatures(1, 2)).toEqual({ dpr: 1.25, overlay: false, normalMap: true })
    expect(tierFeatures(0, 2)).toEqual({ dpr: 1, overlay: false, normalMap: false })
    expect(tierFeatures(3, 1).dpr).toBe(1)
    expect(tierFeatures(3, 3).dpr).toBe(2)
  })

  it('reads a ?tier=N override', () => {
    expect(tierOverride('?tier=1')).toBe(1)
    expect(tierOverride('?fps=1&tier=0')).toBe(0)
    expect(tierOverride('?tier=9')).toBeNull()
    expect(tierOverride('?tier=')).toBeNull()
    expect(tierOverride('')).toBeNull()
  })
})

describe('TierController', () => {
  it('holds the top tier at 60 fps', () => {
    const controller = new TierController()
    expect(feed(controller, 16.7, 20)).toBe(0)
    expect(controller.tier).toBe(TOP_TIER)
  })

  it('steps down on sustained slow frames, one tier at a time', () => {
    const controller = new TierController()
    feed(controller, 33, 3.2)
    expect(controller.tier).toBe(TOP_TIER - 1)
    feed(controller, 33, 20)
    expect(controller.tier).toBe(0)
  })

  it('ignores a short hitch', () => {
    const controller = new TierController()
    feed(controller, 16.7, 2)
    feed(controller, 50, 0.5)
    feed(controller, 16.7, 2)
    expect(controller.tier).toBe(TOP_TIER)
  })

  it('steps back up only after a long fast run, more patiently each time it fell', () => {
    const controller = new TierController()
    feed(controller, 33, 3.2)
    expect(controller.tier).toBe(2)
    feed(controller, 10, 11)
    expect(controller.tier).toBe(2)
    feed(controller, 10, 2)
    expect(controller.tier).toBe(3)
  })

  it('starts touch devices one tier down, and a 60 Hz display steps up when the work is light', () => {
    expect(startingTier(false)).toBe(TOP_TIER)
    const controller = new TierController(startingTier(true))
    expect(controller.tier).toBe(TOP_TIER - 1)
    feed(controller, 16.7, 8, 12)
    expect(controller.tier).toBe(TOP_TIER - 1)
    feed(controller, 16.7, 7)
    expect(controller.tier).toBe(TOP_TIER)
  })

  it('stays where a ?tier override pins it', () => {
    const controller = new TierController(1, true)
    feed(controller, 60, 10)
    feed(controller, 8, 60)
    expect(controller.tier).toBe(1)
  })
})

describe('Ring', () => {
  it('keeps the newest 600 values oldest first', () => {
    const ring = new Ring()
    for (let i = 0; i < RING_SIZE + 5; i++) ring.push(i)
    const values = ring.snapshot()
    expect(values).toHaveLength(RING_SIZE)
    expect(values[0]).toBe(5)
    expect(ring.last()).toBe(RING_SIZE + 4)
    ring.clear()
    expect(ring.length).toBe(0)
    expect(ring.last()).toBe(0)
  })
})

describe('jamPerf', () => {
  it('reads live values in the shape the probe expects, and resets the samples', () => {
    const monitor = new PerfMonitor(new TierController(2, true))
    const view = jamPerf(monitor)
    monitor.cpu.push(3)
    monitor.cpu.push(4)
    monitor.drawCalls = 21
    monitor.triangles = 9000
    expect({ cpuMs: [...view.cpuMs], tier: view.tier, drawCalls: view.drawCalls, triangles: view.triangles }).toEqual({ cpuMs: [3, 4], tier: 2, drawCalls: 21, triangles: 9000 })
    view.reset()
    expect(view.cpuMs).toEqual([])
  })
})
