import { describe, expect, it } from 'vitest'
import { Bird } from './bird'
import { SILL } from './layout'
import { makeRng } from './rng'

const STEP = 1 / 60

describe('the bird at the window', () => {
  it('hops, pecks and turns by itself and never leaves the sill', () => {
    const bird = new Bird(makeRng(3))
    const seen = { hop: false, peck: false, left: false, right: false, places: new Set<number>() }
    for (let i = 0; i < 60 * 60; i++) {
      bird.step(STEP)
      expect(bird.pose.x).toBeGreaterThanOrEqual(SILL.from)
      expect(bird.pose.x).toBeLessThanOrEqual(SILL.to)
      expect(bird.pose.lift).toBeLessThanOrEqual(0)
      if (bird.pose.lift < -5) seen.hop = true
      if (bird.pose.peck > 0.5) seen.peck = true
      if (bird.pose.facing < 0) seen.left = true
      else seen.right = true
      seen.places.add(Math.round(bird.pose.x / 10))
    }
    expect(seen).toMatchObject({ hop: true, peck: true, left: true, right: true })
    expect(seen.places.size).toBeGreaterThan(3)
  })

  it('flutters up when it is tapped and lands somewhere else on the sill', () => {
    const bird = new Bird(makeRng(3))
    const from = bird.pose.x
    bird.startle()
    let highest = 0, flapped = false
    for (let i = 0; i < 70; i++) {
      bird.step(STEP)
      highest = Math.min(highest, bird.pose.lift)
      if (bird.pose.flap !== 0) flapped = true
    }
    expect(highest).toBeLessThan(-30)
    expect(flapped).toBe(true)
    expect(bird.pose.lift).toBe(0)
    expect(bird.pose.flap).toBe(0)
    expect(Math.abs(bird.pose.x - from)).toBeGreaterThan(30)
    expect(bird.pose.x).toBeGreaterThanOrEqual(SILL.from)
    expect(bird.pose.x).toBeLessThanOrEqual(SILL.to)
  })

  it('is the same bird from the same seed', () => {
    const a = new Bird(makeRng(8)), b = new Bird(makeRng(8))
    for (let i = 0; i < 600; i++) {
      a.step(STEP)
      b.step(STEP)
    }
    expect(a.pose).toEqual(b.pose)
  })
})
