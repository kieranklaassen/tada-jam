import { describe, expect, it } from 'vitest'
import { CAST, SPECIES, type Species } from './cast'
import { DELIGHTS, REST, add, beatSeconds, blinking, delightFor, ease, fixed, idle, idleWindow, jolt, lateness, type Pose } from './motion'

/** One animal's idle life sampled at 30 a second, as plain numbers. */
function sampled(species: Species, seconds: number, seed = 5, from = 0): number[][] {
  const rows: number[][] = []
  for (let frame = 0; frame < seconds * 30; frame++) {
    const pose = idle(species, from + frame / 30, seed)
    rows.push([pose.x, pose.y, pose.rot * 100, (pose.sx - 1) * 100, (pose.sy - 1) * 100])
  }
  return rows
}

/** How far apart two sampled motions are, on average for each frame. */
function apart(one: number[][], other: number[][]): number {
  let sum = 0
  for (let frame = 0; frame < one.length; frame++) for (let part = 0; part < 5; part++) sum += Math.abs(one[frame][part] - other[frame][part])
  return sum / one.length
}

describe('each animal\'s own timing', () => {
  it('gives the slow a long beat and the quick a short one, in the order of their tempo', () => {
    const byTempo = [...SPECIES].sort((a, b) => CAST[a].tempo - CAST[b].tempo)
    for (let index = 1; index < byTempo.length; index++) expect(beatSeconds(byTempo[index])).toBeLessThan(beatSeconds(byTempo[index - 1]))
    expect(beatSeconds('bear')).toBeGreaterThan(0.7)
    expect(beatSeconds('hedgehog')).toBeCloseTo(0.5)
  })

  it('starts every answer within a fifth of a second of the landing, the heavy ones last', () => {
    for (const species of SPECIES) {
      expect(lateness(species)).toBeGreaterThan(0)
      expect(lateness(species)).toBeLessThan(0.2)
    }
    expect(lateness('bear')).toBeGreaterThan(lateness('hedgehog'))
  })

  it('takes every animal from one pose to the next and no further in the end', () => {
    for (const species of SPECIES) {
      expect(ease(species, 0)).toBeCloseTo(0)
      expect(ease(species, 1)).toBeCloseTo(1)
      expect(ease(species, -1)).toBeCloseTo(0)
      expect(ease(species, 2)).toBeCloseTo(1)
    }
  })

  it('lets the exact cat never pass its mark and the bouncy dog shoot past it', () => {
    let catMost = 0, dogMost = 0
    for (let step = 0; step <= 100; step++) {
      catMost = Math.max(catMost, ease('cat', step / 100))
      dogMost = Math.max(dogMost, ease('dog', step / 100))
    }
    expect(catMost).toBeLessThanOrEqual(1.0001)
    expect(dogMost).toBeGreaterThan(1.05)
  })

  it('holds a heavy animal back at the start of a move', () => {
    expect(ease('bear', 0.25)).toBeLessThan(ease('hedgehog', 0.25))
  })
})

describe('the rock when a thing lands', () => {
  it('starts in the frame of the landing, squashed down and wide', () => {
    for (const species of SPECIES) {
      const first = jolt(species, 0)
      expect(first.sy).toBeLessThan(0.94)
      expect(first.sx).toBeGreaterThan(1.03)
    }
  })

  it('is deeper for a heavy animal, and has settled within a second and a half for all', () => {
    expect(jolt('bear', 0).sy).toBeLessThan(jolt('hedgehog', 0).sy)
    for (const species of SPECIES) {
      const late = jolt(species, 1.5)
      expect(Math.abs(late.sy - 1)).toBeLessThan(0.006)
      expect(Math.abs(late.rot)).toBeLessThan(0.002)
    }
  })

  it('does nothing before the landing', () => {
    expect(jolt('dog', -0.1)).toEqual({ sx: 1, sy: 1, rot: 0 })
  })
})

describe('alive at idle', () => {
  it('keeps every animal moving while the child just watches', () => {
    for (const species of SPECIES) {
      const rows = sampled(species, 12)
      const still = rows.filter((row, index) => index > 0 && row.every((value, part) => Math.abs(value - rows[index - 1][part]) < 1e-9))
      expect(still.length, species).toBeLessThan(rows.length * 0.02)
    }
  })

  it('never lets an idle move grow into something that asks, flashes or leaves its place', () => {
    for (const species of SPECIES) {
      for (let frame = 0; frame < 60 * 40; frame++) {
        const pose = idle(species, frame / 60, 9)
        expect(Math.abs(pose.x)).toBeLessThanOrEqual(12)
        expect(Math.abs(pose.y)).toBeLessThanOrEqual(24)
        expect(Math.abs(pose.rot)).toBeLessThanOrEqual(0.24)
        for (const squash of [pose.sx, pose.sy]) {
          expect(squash).toBeGreaterThan(0.9)
          expect(squash).toBeLessThan(1.12)
        }
        for (const value of [pose.x, pose.y, pose.rot, pose.sx, pose.sy]) expect(Number.isFinite(value)).toBe(true)
      }
    }
  })

  it('shares no idle life between two animals: each pair moves clearly differently, whatever the phase', () => {
    for (let a = 0; a < SPECIES.length; a++) {
      for (let b = a + 1; b < SPECIES.length; b++) {
        // The same seed for both, and then the second shifted in time: a copy with another phase would come close in one of them.
        const one = sampled(SPECIES[a], 24)
        let nearest = Infinity
        for (let shift = 0; shift < 8; shift++) nearest = Math.min(nearest, apart(one, sampled(SPECIES[b], 24, 5, shift * 0.37)))
        expect(nearest, `${SPECIES[a]} and ${SPECIES[b]}`).toBeGreaterThan(0.8)
      }
    }
  })

  it('gives each animal three delights that differ from one another', () => {
    for (const species of SPECIES) {
      const span = idleWindow(species)
      const byDelight = new Map<number, number[][]>()
      for (let n = 0; n < 40 && byDelight.size < DELIGHTS; n++) {
        const which = delightFor(n, 5)
        if (!byDelight.has(which)) byDelight.set(which, sampled(species, Math.min(3, span), 5, n * span))
      }
      expect(byDelight.size, species).toBe(DELIGHTS)
      const all = [...byDelight.values()]
      // Breathing runs under every delight, so the windows are compared against the animal's own breath as well.
      for (let a = 0; a < all.length; a++) for (let b = a + 1; b < all.length; b++) expect(apart(all[a], all[b]), `${species} ${a} and ${b}`).toBeGreaterThan(0.25)
    }
  })

  it('never plays the same delight twice running, and is the same every time for the same seed', () => {
    for (const seed of [1, 2, 3]) {
      for (let n = 1; n < 200; n++) {
        expect(delightFor(n, seed)).not.toBe(delightFor(n - 1, seed))
        expect(delightFor(n, seed)).toBe(delightFor(n, seed))
        expect(delightFor(n, seed)).toBeLessThan(DELIGHTS)
      }
    }
  })

  it('blinks briefly, each animal at its own moments', () => {
    const shut = (species: Species) => Array.from({ length: 1800 }, (_, frame) => blinking(species, frame / 60, 3))
    for (const species of SPECIES) {
      const share = shut(species).filter(Boolean).length / 1800
      expect(share).toBeGreaterThan(0.01)
      expect(share).toBeLessThan(0.08)
    }
    expect(shut('bear')).not.toEqual(shut('rabbit'))
  })
})

describe('small helpers', () => {
  it('gives a fixed number from 0 to 1 for a number and a salt', () => {
    for (let n = 0; n < 200; n++) {
      const value = fixed(n, 3)
      expect(value).toBe(fixed(n, 3))
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
    expect(fixed(1, 3)).not.toBe(fixed(1, 4))
  })

  it('lays one pose over another', () => {
    const under: Pose = { x: 2, y: -3, rot: 0.1, sx: 1.1, sy: 0.9, face: 'glad' }
    expect(add(under, REST)).toEqual(under)
    expect(add(under, { x: 1, y: 1, rot: 0.1, sx: 2, sy: 2, face: 'wow' })).toEqual({ x: 3, y: -2, rot: 0.2, sx: 2.2, sy: 1.8, face: 'wow' })
  })
})
