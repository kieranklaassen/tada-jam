import { describe, expect, it } from 'vitest'
import { Cat, type CatPose } from './cat'
import { CAT, POOL } from './layout'
import { makeRng } from './rng'

const STEP = 1 / 60
const play = (cat: Cat, seconds: number, finger: { x: number; y: number } | null = null, orange = 0, brown = 0): void => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) cat.step(STEP, finger, orange, brown)
}

describe('the cat', () => {
  it('follows a finger with its eyes, and its head comes after', () => {
    const cat = new Cat(makeRng(1))
    const right = { x: POOL.x + POOL.w - 20, y: POOL.y + POOL.h - 40 }
    play(cat, 0.15, right)
    expect(cat.pose.lookX).toBeGreaterThan(0.5)
    expect(cat.pose.turn).toBeLessThan(cat.pose.lookX)
    play(cat, 1.5, right)
    expect(cat.pose.turn).toBeGreaterThan(0.5)
    play(cat, 1, { x: POOL.x + 10, y: POOL.y + 300 })
    expect(cat.pose.lookX).toBeLessThan(-0.5)
  })

  it('goes wide-eyed at a bloom and calms down again by itself', () => {
    const cat = new Cat(makeRng(1))
    play(cat, 1)
    const calm = cat.pose.pupil
    cat.bloom(500, 600)
    play(cat, 0.2)
    expect(cat.pose.pupil).toBeGreaterThan(calm + 0.1)
    play(cat, 6)
    expect(cat.pose.pupil).toBeLessThan(calm + 0.05)
  })

  it('trills at the first bloom after a calm stretch and not at each of a run', () => {
    const cat = new Cat(makeRng(1))
    cat.bloom(500, 600)
    expect(cat.takeSounds()).toHaveLength(1)
    play(cat, 0.2)
    cat.bloom(520, 600)
    expect(cat.takeSounds()).toHaveLength(0)
  })

  it('starts at a drop under its nose: whiskers wide, ears back, tongue in, and the tongue creeps out again', () => {
    const cat = new Cat(makeRng(1))
    play(cat, 1)
    expect(cat.pose.tongue).toBeGreaterThan(0.15)
    cat.bloom(CAT.nose.x, CAT.nose.y + 90)
    let whiskers = 0, ears = 0
    for (let i = 0; i < 20; i++) {
      cat.step(STEP, null, 0, 0)
      whiskers = Math.max(whiskers, cat.pose.whiskers)
      ears = Math.max(ears, cat.pose.earLeft)
    }
    expect(whiskers).toBeGreaterThan(0.15)
    expect(ears).toBeGreaterThan(0.3)
    play(cat, 0.6)
    expect(cat.pose.tongue).toBeLessThan(0.08)
    play(cat, 5)
    expect(cat.pose.tongue).toBeGreaterThan(0.15)
  })

  it('squashes at a poke, springs back, and says something different each time', () => {
    const cat = new Cat(makeRng(1))
    cat.poke()
    const first = cat.takeSounds()
    play(cat, 0.08)
    expect(cat.pose.squash).toBeLessThan(-0.1)
    expect(cat.pose.mouth).toBeGreaterThan(0.2)
    play(cat, 3)
    expect(Math.abs(cat.pose.squash)).toBeLessThan(0.01)
    cat.poke()
    expect(cat.takeSounds()).not.toEqual(first)
  })

  it('leans in to orange and purrs, and leans away from brown with its nose wrinkled and its tongue out', () => {
    const fond = new Cat(makeRng(1)), sour = new Cat(makeRng(1))
    play(fond, 4, null, 0.4, 0)
    play(sour, 4, null, 0, 0.3)
    expect(fond.pose.lean).toBeGreaterThan(0.6)
    expect(fond.takeSounds().length).toBeGreaterThan(3)
    expect(sour.pose.lean).toBeLessThan(-0.6)
    expect(sour.pose.wrinkle).toBeGreaterThan(0.9)
    expect(sour.pose.tongue).toBeGreaterThan(0.8)
    expect(sour.takeSounds()).toHaveLength(0)
  })

  it('ruffles and purrs while it is stroked, and smooths down after', () => {
    const cat = new Cat(makeRng(1))
    for (let i = 0; i < 30; i++) {
      cat.stroke(12)
      cat.step(STEP, { x: 300, y: 150 }, 0, 0)
    }
    expect(cat.pose.ruffle).toBeGreaterThan(0.5)
    expect(cat.pose.lid).toBeGreaterThan(0.7)
    expect(cat.takeSounds().length).toBeGreaterThan(0)
    play(cat, 4)
    expect(cat.pose.ruffle).toBe(0)
    cat.takeSounds()
    play(cat, 3)
    expect(cat.takeSounds()).toHaveLength(0)
  })

  it('is alive with no touch, stays in range for a long sit, and is the same cat from the same seed', () => {
    const cat = new Cat(makeRng(4)), twin = new Cat(makeRng(4))
    const seen = { blink: false, ear: false, tail: 0, look: new Set<number>() }
    for (let i = 0; i < 60 * 40; i++) {
      cat.step(STEP, null, 0, 0)
      twin.step(STEP, null, 0, 0)
      const pose: CatPose = cat.pose
      for (const value of Object.values(pose)) expect(Number.isFinite(value)).toBe(true)
      expect(pose.pupil).toBeGreaterThanOrEqual(0.5)
      expect(pose.pupil).toBeLessThanOrEqual(1)
      expect(pose.lid).toBeGreaterThanOrEqual(0)
      expect(pose.lid).toBeLessThanOrEqual(1)
      if (pose.lid > 0.8) seen.blink = true
      if (Math.abs(pose.earLeft) > 0.05 || Math.abs(pose.earRight) > 0.05) seen.ear = true
      seen.tail = Math.max(seen.tail, Math.abs(pose.tail))
      seen.look.add(Math.round(pose.lookX * 4))
    }
    expect(seen.blink).toBe(true)
    expect(seen.ear).toBe(true)
    expect(seen.tail).toBeGreaterThan(0.2)
    expect(seen.look.size).toBeGreaterThan(2)
    expect(cat.pose).toEqual(twin.pose)
  })

  it('does not move on a step of no time', () => {
    const cat = new Cat(makeRng(1))
    play(cat, 1)
    const before = { ...cat.pose }
    cat.step(0, { x: 900, y: 700 }, 1, 0)
    expect(cat.pose).toEqual(before)
  })
})
