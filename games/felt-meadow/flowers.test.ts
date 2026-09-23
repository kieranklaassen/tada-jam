import { describe, expect, it } from 'vitest'
import { YELLOW } from './colors'
import { BLOOM_AT, Flower, GROWN_AT, PLUCK_SECONDS } from './flowers'
import { plotTop, STEM_HEIGHT } from './layout'

const FRAME = 1 / 60

function grow(flower: Flower, seconds: number, from = 0): { t: number; bloomNotes: number } {
  let t = from
  let bloomNotes = 0
  for (let i = 0; i < Math.round(seconds / FRAME); i++) {
    t += FRAME
    if (flower.step(FRAME, t)) bloomNotes += 1
  }
  return { t, bloomNotes }
}

describe('Flower', () => {
  it('sprouts, opens with a single bloom note, and settles into bloom', () => {
    const flower = new Flower(1)
    flower.plant(YELLOW)
    expect(flower.bloomed()).toBe(false)
    const { bloomNotes } = grow(flower, GROWN_AT + 0.5)
    expect(bloomNotes).toBe(1)
    expect(flower.phase).toBe('bloom')
    expect(flower.bloomed()).toBe(true)
    grow(flower, 3)
    const head = flower.headAt({ x: 0, y: 0, z: 0 })
    expect(head.y).toBeGreaterThan(plotTop(1) + STEM_HEIGHT * 0.8)
  })

  it('overshoots its height on the way up (follow-through), then settles', () => {
    const flower = new Flower(0)
    flower.plant(YELLOW)
    let peak = 0
    let t = 0
    for (let i = 0; i < Math.round(BLOOM_AT / FRAME); i++) {
      t += FRAME
      flower.step(FRAME, t)
      peak = Math.max(peak, flower.stem.x)
    }
    expect(peak).toBeGreaterThan(1.03)
    grow(flower, 4, t)
    expect(flower.stem.x).toBeCloseTo(1, 1)
  })

  it('droops under the bee and springs back when it leaves', () => {
    const flower = new Flower(2)
    flower.grown(YELLOW)
    const head = { x: 0, y: 0, z: 0 }
    let t = grow(flower, 2).t
    const rest = flower.headAt(head).y
    flower.beeOn = true
    t = grow(flower, 1.5, t).t
    expect(flower.headAt(head).y).toBeLessThan(rest - 1)
    flower.beeOn = false
    grow(flower, 3, t)
    expect(flower.headAt(head).y).toBeCloseTo(rest, 0)
  })

  it('folds away when picked and leaves the molehill empty', () => {
    const flower = new Flower(0)
    flower.grown(YELLOW)
    flower.pluck(1, 20, 3)
    expect(flower.bloomed()).toBe(false)
    expect(flower.headAt({ x: 0, y: 0, z: 0 })).toEqual({ x: 1, y: 20, z: 3 })
    grow(flower, PLUCK_SECONDS + 0.05)
    expect(flower.phase).toBe('empty')
  })

  it('folds in order when picked: the stem slips out, the petals close around the seed, then the bud shrinks into it', () => {
    const flower = new Flower(0)
    flower.grown(YELLOW)
    flower.pluck(1, 20, 3)
    expect([flower.pluckStem(), flower.pluckClose(), flower.pluckKeep()]).toEqual([1, 0, 1])
    let stemGoneAt = -1
    let closedAt = -1
    let halfShrunkAt = -1
    for (let i = 0; flower.phase === 'plucked'; i++) {
      grow(flower, FRAME)
      if (stemGoneAt < 0 && flower.pluckStem() < 0.05) stemGoneAt = i
      if (closedAt < 0 && flower.pluckClose() > 0.95) closedAt = i
      if (halfShrunkAt < 0 && flower.pluckKeep() < 0.5) halfShrunkAt = i
    }
    expect(stemGoneAt).toBeGreaterThan(0)
    expect(stemGoneAt).toBeLessThan(halfShrunkAt)
    expect(closedAt).toBeLessThan(halfShrunkAt)
    // Long enough to watch at 30 fps.
    expect(PLUCK_SECONDS * 30).toBeGreaterThan(12)
  })
})
