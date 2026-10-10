import { describe, expect, it } from 'vitest'
import { CAPACITY, DROPS_PER_GULP, Drops, SPLASH_PER_LANDING } from './drops'
import { arcTo } from './jet'
import { NOZZLE } from './layout'

const FRAME = 1 / 60
const arc = arcTo(NOZZLE, { x: 9, z: 4 })

function play(drops: Drops, seconds: number, each?: () => void) {
  const marks: { x: number; z: number; gulps: number; radius: number }[] = []
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
    each?.()
    drops.step(FRAME, (x, z, gulps, radius) => marks.push({ x, z, gulps, radius }))
  }
  return marks
}

describe('the drops of a gulp', () => {
  it('are one fat blob and a few round it', () => {
    const drops = new Drops()
    drops.gulp(arc)
    expect(drops.alive).toBe(DROPS_PER_GULP)
    drops.step(0.1, () => {})
    const sizes: number[] = []
    drops.each((_x, _y, _z, _vx, _vy, _vz, size) => sizes.push(size))
    expect(Math.max(...sizes)).toBeGreaterThan(0.3)
    expect(sizes.filter((size) => size > 0.3)).toHaveLength(1)
  })

  it('all land near where the gulp was sent, and their water adds up to about a gulp', () => {
    const drops = new Drops()
    drops.gulp(arc)
    const marks = play(drops, 1)
    expect(marks).toHaveLength(DROPS_PER_GULP)
    for (const mark of marks) expect(Math.hypot(mark.x - 9, mark.z - 4)).toBeLessThan(0.7)
    const water = marks.reduce((sum, mark) => sum + mark.gulps, 0)
    expect(water).toBeGreaterThan(0.9)
    expect(water).toBeLessThanOrEqual(1.05)
  })

  it('lands its fat blob dead on, with the widest mark', () => {
    const drops = new Drops()
    drops.gulp(arc)
    const marks = play(drops, 1)
    const widest = marks.reduce((a, b) => (b.radius > a.radius ? b : a))
    expect(widest.x).toBeCloseTo(9, 6)
    expect(widest.z).toBeCloseTo(4, 6)
  })

  it('throws up a splash from every landing, which falls back and is gone', () => {
    const drops = new Drops()
    drops.gulp(arc)
    let most = 0
    play(drops, arc.seconds + 0.12, () => { most = Math.max(most, drops.alive) })
    expect(most).toBeGreaterThan(DROPS_PER_GULP)
    expect(most).toBeLessThanOrEqual(DROPS_PER_GULP * (1 + SPLASH_PER_LANDING))
    play(drops, 2)
    expect(drops.alive).toBe(0)
  })

  it('throws no splash on the lowest tier, and the water lands all the same', () => {
    const drops = new Drops()
    drops.gulp(arc)
    const marks: number[] = []
    for (let frame = 0; frame < 60; frame++) drops.step(FRAME, (_x, _z, gulps) => marks.push(gulps), 0)
    expect(marks).toHaveLength(DROPS_PER_GULP)
    expect(drops.alive).toBe(0)
  })

  it('stays above the ground and inside the arc while it flies', () => {
    const drops = new Drops()
    drops.gulp(arc)
    play(drops, 0.5, () => drops.each((_x, y) => expect(y).toBeGreaterThanOrEqual(0)))
  })
})

describe('the drops of a stream', () => {
  it('leave a small mark each and carry little water', () => {
    const drops = new Drops()
    drops.trickle(arc)
    const marks = play(drops, 1)
    expect(marks).toHaveLength(1)
    expect(marks[0].gulps).toBeLessThan(0.2)
  })

  it('are the same drops for the same play', () => {
    const a = new Drops(3), b = new Drops(3)
    for (const drops of [a, b]) {
      drops.gulp(arc)
      drops.trickle(arc)
    }
    expect(play(a, 1)).toEqual(play(b, 1))
  })
})

describe('the frame budget', () => {
  it('never has more drops in the air than it can draw, in the heaviest stream', () => {
    const drops = new Drops()
    let most = 0, frame = 0
    // Ten seconds of a held stream to the far corner: a gulp every third of a second and a trickle every frame.
    const far = arcTo(NOZZLE, { x: 15.7, z: 0.3 })
    play(drops, 10, () => {
      if (frame % 20 === 0) drops.gulp(far)
      drops.trickle(far)
      frame++
      most = Math.max(most, drops.alive)
      expect(drops.visited).toBeLessThanOrEqual(CAPACITY)
    })
    expect(most).toBeLessThan(CAPACITY * 0.75)
  })

  it('drops what it cannot draw and does not stall when taps come faster than any child taps', () => {
    const drops = new Drops()
    for (let tap = 0; tap < 200; tap++) drops.gulp(arc)
    expect(drops.alive).toBeLessThanOrEqual(CAPACITY)
    play(drops, 3)
    expect(drops.alive).toBe(0)
  })

  it('empties the air when the game goes to rest', () => {
    const drops = new Drops()
    drops.gulp(arc)
    drops.clear()
    expect(drops.alive).toBe(0)
    expect(play(drops, 1)).toHaveLength(0)
  })

  it('plays no time on a frame of no length', () => {
    const drops = new Drops()
    drops.gulp(arc)
    drops.step(0, () => { throw new Error('nothing lands in no time') })
    expect(drops.alive).toBe(DROPS_PER_GULP)
  })
})
