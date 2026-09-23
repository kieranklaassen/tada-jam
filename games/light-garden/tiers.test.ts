import { describe, expect, it } from 'vitest'
import { DROP_AFTER_MS, parseTierOverride, QualityGovernor, RAISE_AFTER_MS, RETRY_AFTER_MS, TIERS, TOP_TIER, wantsPerfOverlay } from './tiers'

function feed(governor: QualityGovernor, frameMs: number, totalMs: number): void {
  for (let t = 0; t < totalMs; t += frameMs) governor.sample(frameMs)
}

describe('quality tiers', () => {
  it('tiers step DPR down from 2 to 1 and only the top tier runs the glow pass', () => {
    expect(TIERS.map((t) => t.dpr)).toEqual([1, 1.25, 1.5, 2])
    expect(TIERS.filter((t) => t.glowPass)).toHaveLength(1)
    expect(TIERS[TOP_TIER].glowPass).toBe(true)
    expect(TIERS[0].motes).toBe(0)
  })

  it('holds the top tier at a steady 60 fps', () => {
    const governor = new QualityGovernor()
    feed(governor, 16.7, 60000)
    expect(governor.tier).toBe(TOP_TIER)
  })

  it('steps down after sustained slow frames, one tier at a time', () => {
    const governor = new QualityGovernor()
    feed(governor, 40, 2000 + DROP_AFTER_MS + 600)
    expect(governor.tier).toBe(TOP_TIER - 1)
    feed(governor, 40, 30000)
    expect(governor.tier).toBe(0)
  })

  it('ignores a single hitch', () => {
    const governor = new QualityGovernor()
    feed(governor, 16.7, 3000)
    governor.sample(250)
    feed(governor, 16.7, 3000)
    expect(governor.tier).toBe(TOP_TIER)
  })

  it('climbs back once frames are fast again, but not straight into a tier that just failed', () => {
    const governor = new QualityGovernor()
    feed(governor, 40, 5000)
    const dropped = governor.tier
    expect(dropped).toBeLessThan(TOP_TIER)
    feed(governor, 16.7, RAISE_AFTER_MS + 3000)
    expect(governor.tier).toBe(dropped)
    feed(governor, 16.7, RETRY_AFTER_MS + RAISE_AFTER_MS)
    expect(governor.tier).toBeGreaterThan(dropped)
  })

  it('a pinned tier never moves', () => {
    const governor = new QualityGovernor(1, true)
    feed(governor, 80, 20000)
    expect(governor.tier).toBe(1)
  })

  it('reads ?tier= and ?fps= from the query or the hash', () => {
    expect(parseTierOverride('http://localhost:4173/?chrome=0&tier=2#/play/light-garden')).toBe(2)
    expect(parseTierOverride('http://localhost:4173/#/play/light-garden?tier=0')).toBe(0)
    expect(parseTierOverride('http://localhost:4173/?tier=9')).toBeNull()
    expect(parseTierOverride('http://localhost:4173/')).toBeNull()
    expect(wantsPerfOverlay('http://localhost:4173/?fps=1')).toBe(true)
    expect(wantsPerfOverlay('http://localhost:4173/?fps=10')).toBe(false)
  })
})
