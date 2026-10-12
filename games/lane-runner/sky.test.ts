import { describe, expect, it } from 'vitest'
import { beadCount } from './beads'
import { TIERS } from './config'
import { CLOUD_WIDTHS, SKY_NEAREST, SUN_RAYS, cloudAt, cloudPlaque, handPlaque, sunAt, sunPlaque } from './sky'

const TAU = Math.PI * 2
const between = (a: number, b: number): number => {
  const d = Math.abs(a - b) % TAU
  return Math.min(d, TAU - d)
}

describe('the sun', () => {
  it('has rays of uneven lengths at uneven angles, so that it never reads as a plus or a cross', () => {
    const angles = SUN_RAYS.map(([angle]) => angle), lengths = SUN_RAYS.map(([, long]) => long)
    // An odd number of rays: no ray can have one opposite it all the way round.
    expect(SUN_RAYS.length % 2).toBe(1)
    for (let i = 0; i < angles.length; i++) {
      for (let j = i + 1; j < angles.length; j++) {
        // No two opposite each other (a bar), and no two at a right angle with both of their opposites present (a cross).
        expect(Math.abs(between(angles[i], angles[j]) - Math.PI), `rays ${i} and ${j}`).toBeGreaterThan(0.2)
      }
    }
    // No four rays stand at right angles to each other.
    for (const first of angles) {
      const square = [1, 2, 3].every((quarter) => angles.some((other) => between(other, first + (quarter * Math.PI) / 2) < 0.15))
      expect(square).toBe(false)
    }
    // The gaps between neighbours are not all alike, and neither are the lengths.
    const gaps = angles.map((angle, i) => between(angle, angles[(i + 1) % angles.length]))
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeGreaterThan(0.2)
    expect(new Set(lengths).size).toBeGreaterThanOrEqual(3)
    for (let i = 0; i < lengths.length; i++) expect(lengths[i], `ray ${i} and the next`).not.toBe(lengths[(i + 1) % lengths.length])
  })

  it('is a round of beads with the rays outside it', () => {
    const sun = sunPlaque()
    expect(sun.w).toBe(sun.h)
    expect(beadCount(sun)).toBeGreaterThan(220)
  })
})

describe('the sky', () => {
  it('hangs beyond everything any tier draws on the board, each thing in a plane of its own', () => {
    const reach = Math.max(...TIERS.map((tier) => tier.reach))
    expect(SKY_NEAREST).toBeGreaterThan(reach + 60)
    const depths = [sunAt().z, ...CLOUD_WIDTHS.map((_, i) => cloudAt(i, 0).z)]
    for (const depth of depths) expect(-depth).toBeGreaterThanOrEqual(SKY_NEAREST)
    for (let i = 0; i < depths.length; i++) for (let j = i + 1; j < depths.length; j++) expect(Math.abs(depths[i] - depths[j])).toBeGreaterThanOrEqual(20)
    // The sun is behind every cloud.
    expect(Math.min(...depths)).toBe(sunAt().z)
  })

  it('drifts each cloud at its own pace and never moves one in depth', () => {
    CLOUD_WIDTHS.forEach((wide, i) => {
      expect(beadCount(cloudPlaque(wide))).toBeGreaterThan(100)
      expect(cloudAt(i, 10).z).toBe(cloudAt(i, 0).z)
      expect(cloudAt(i, 10).x).not.toBe(cloudAt(i, 0).x)
    })
    expect(cloudAt(0, 10).x - cloudAt(0, 0).x).not.toBeCloseTo(cloudAt(1, 10).x - cloudAt(1, 0).x, 3)
  })

  it('makes the ghost hand of beads, with one finger out', () => {
    const hand = handPlaque()
    expect(beadCount(hand)).toBeGreaterThan(60)
    expect(hand.h).toBeGreaterThan(hand.w)
  })
})
